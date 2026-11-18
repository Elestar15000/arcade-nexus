/* ============================================================
   NEXUS ARCADE · core/backend.js
   Capa de cuentas y datos con dos implementaciones intercambiables:
     · remote → API del Worker (cuentas y ranking globales, guardados
                en un repo privado de GitHub; ver /backend).
     · local  → localStorage de este navegador (sin servidor; modo
                de desarrollo cuando config.js no tiene API_URL).
   Todas las llamadas devuelven promesas y rechazan con Error que lleva
   `status` (HTTP) y `offline: true` si no hubo conexión.
   ============================================================ */
(function () {
    'use strict';

    const cfg = window.NEXUS_CONFIG || {};
    const API = String(cfg.API_URL || '').trim().replace(/\/+$/, '');
    const store = Nexus.storage;
    const NAME_RE = /^[A-Za-z0-9_-]{3,16}$/;
    const RESERVED = ['admin', 'root', 'nexus', 'system', 'invitado', 'guest', 'null', 'undefined'];

    const fail = (status, message, extra) => Object.assign(new Error(message), { status }, extra);
    const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

    /** Resumen público de un jugador para el ranking (mismo formato que el Worker). */
    function summarize(user, data) {
        const stats = {};
        let played = 0, wins = 0;
        for (const [g, gs] of Object.entries(data.stats || {})) {
            if (!isObj(gs)) continue;
            const m = (x) => ({ played: x.played | 0, wins: x.wins | 0, bestScore: x.bestScore | 0, bestTime: x.bestTime === null || x.bestTime === undefined ? null : x.bestTime });
            const byMode = {};
            for (const [k, ms] of Object.entries(gs.byMode || {})) byMode[k] = m(ms);
            stats[g] = Object.assign(m(gs), { bestStreak: gs.bestStreak | 0, byMode });
            played += stats[g].played; wins += stats[g].wins;
        }
        return {
            id: user.id, name: user.name, avatar: user.avatar, color: user.color,
            level: data.xp.level, totalXP: data.xp.total, played, wins,
            achievements: Object.keys(data.achievements || {}).length, stats
        };
    }

    // ── Remoto ──────────────────────────────────────────────
    async function http(method, path, { token, body, keepalive } = {}) {
        let res;
        try {
            res = await fetch(API + path, {
                method, keepalive: !!keepalive,
                headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (e) { throw fail(0, 'No se pudo conectar con el servidor.', { offline: true }); }
        let json = null;
        try { json = await res.json(); } catch (e) { /* sin cuerpo */ }
        if (!res.ok) {
            const extra = { offline: res.status >= 502 && !(json && json.code) };
            if (json && json.code) Object.assign(extra, { code: json.code, reason: json.reason, until: json.until });
            throw fail(res.status, (json && json.error) || `Error del servidor (${res.status}).`, extra);
        }
        return json;
    }

    const Remote = {
        kind: 'remote',
        label: 'Servidor global',
        register: (p) => http('POST', '/api/register', { body: p }),
        login: (p) => http('POST', '/api/login', { body: p }),
        session: (token) => http('GET', '/api/session', { token }),
        saveData: (token, data, keepalive) => http('PUT', '/api/data', { token, body: { data }, keepalive }),
        profile: (token, patch) => http('PATCH', '/api/profile', { token, body: patch }),
        password: (token, p) => http('POST', '/api/password', { token, body: p }),
        deleteAccount: (token, password) => http('DELETE', '/api/account', { token, body: { password } }),
        leaderboard: () => http('GET', '/api/leaderboard'),
        ping: () => http('GET', '/api/health'),
        status: () => http('GET', '/api/status'),
        notices: (token) => http('GET', '/api/notices', { token }),
        ackNotices: (token, ids) => http('POST', '/api/notices/ack', { token, body: { ids } }),
        admin: {
            login: (p) => http('POST', '/api/admin/login', { body: p }),
            totpSetup: (p) => http('POST', '/api/admin/totp/setup', { body: p }),
            totpEnable: (p) => http('POST', '/api/admin/totp/enable', { body: p }),
            overview: (t) => http('GET', '/api/admin/overview', { token: t }),
            user: (t, name) => http('GET', '/api/admin/user?name=' + encodeURIComponent(name), { token: t }),
            suspend: (t, p) => http('POST', '/api/admin/suspend', { token: t, body: p }),
            unsuspend: (t, name) => http('POST', '/api/admin/unsuspend', { token: t, body: { name } }),
            remove: (t, p) => http('POST', '/api/admin/delete', { token: t, body: p }),
            message: (t, p) => http('POST', '/api/admin/message', { token: t, body: p }),
            cancelMessage: (t, p) => http('POST', '/api/admin/message/cancel', { token: t, body: p }),
            maintenance: (t, p) => http('POST', '/api/admin/maintenance', { token: t, body: p })
        }
    };

    // ── Local (sin servidor) ────────────────────────────────
    const hash = Nexus.core.hash;
    const db = () => store.get('ldb', { users: [] });
    const saveDb = (d) => store.set('ldb', d);
    // Avatar: id del catálogo PNG; las cuentas locales antiguas guardan un emoji y se traducen al leerlas o guardarlas
    const avId = (v) => Nexus.services.avatars ? Nexus.services.avatars.resolve(v) : v;
    const pub = (r) => Object.assign({ id: r.id, name: r.name, avatar: avId(r.avatar), color: r.color, createdAt: r.createdAt }, isLocalAdmin(r.name) ? { admin: true } : {});
    // Administración en modo local: config.js → LOCAL_ADMIN: { users: ['Ana'], key: 'clave' } (sólo para desarrollo)
    const localAdminCfg = () => window.NEXUS_LOCAL_ADMIN || (window.NEXUS_CONFIG || {}).LOCAL_ADMIN || null;
    const isLocalAdmin = (name) => { const c = localAdminCfg(); return !!(c && Array.isArray(c.users) && c.users.some(u => String(u).toLowerCase() === String(name).toLowerCase())); };
    const ADMIN_TTL = 30 * 60 * 1000;
    const pendingTotp = {};
    // TOTP (RFC 6238) con WebCrypto, igual que Google Authenticator
    const TOTP = {
        B32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
        newSecret() { const b = crypto.getRandomValues(new Uint8Array(20)); let bits = 0, val = 0, out = ''; for (const x of b) { val = (val << 8) | x; bits += 8; while (bits >= 5) { out += this.B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } return out; },
        uri: (name, secret) => `otpauth://totp/${encodeURIComponent('Nexus Arcade:' + name)}?secret=${secret}&issuer=${encodeURIComponent('Nexus Arcade')}&algorithm=SHA1&digits=6&period=30`,
        async code(secret, counter) {
            let bits = 0, val = 0; const key = [];
            for (const ch of secret) { val = (val << 5) | this.B32.indexOf(ch); bits += 5; if (bits >= 8) { key.push((val >>> (bits - 8)) & 255); bits -= 8; } }
            const k = await crypto.subtle.importKey('raw', new Uint8Array(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
            const msg = new Uint8Array(8); let c = counter; for (let i = 7; i >= 0; i--) { msg[i] = c & 255; c = Math.floor(c / 256); }
            const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, msg)), o = h[19] & 15;
            return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000).padStart(6, '0');
        },
        async check(secret, code) {
            code = String(code || '').replace(/\s/g, '');
            if (!/^\d{6}$/.test(code)) return -1;
            const t = Math.floor(Date.now() / 30000);
            for (const d of [0, -1, 1]) if ((await this.code(secret, t + d)) === code) return t + d;
            return -1;
        }
    };
    const adminState = (d) => (d.admin = Object.assign({ maintenance: { on: false, message: '', since: 0, by: '' }, suspended: {}, messages: {}, log: [] }, d.admin || {}));
    const activeSusp = (s) => (s && (!s.until || s.until > Date.now()) ? s : null);
    const suspendedFail = (s) => fail(403, `Tu cuenta está suspendida${s.until ? ' hasta el ' + new Date(s.until).toLocaleString('es-ES') : ''}${s.reason ? ': ' + s.reason : '.'}`, { code: 'suspended', reason: s.reason || '', until: s.until || null });
    const maintFail = (m) => fail(503, m.message ? `Página en mantenimiento: ${m.message}` : 'La página está en mantenimiento. Vuelve en un rato.', { code: 'maintenance' });
    const pubMaint = (m) => ({ on: !!m.on, message: m.message || '', since: m.since || 0 });
    const logAction = (A, by, action, target, detail) => { A.log.unshift({ at: Date.now(), by, action, target: target || '', detail: detail || '' }); A.log = A.log.slice(0, 200); };
    const clean = (v, max) => String(typeof v === 'string' ? v : '').trim().slice(0, max);
    const tokenFor = (r) => `local.${r.id}.${r.tokenVersion}`;
    function authed(token) {
        const [kind, id, v] = String(token || '').split('.');
        const d = db(), rec = d.users.find(u => u.id === id);
        if (kind !== 'local' || !rec) throw fail(401, 'Sesión no válida o caducada.');
        const s = activeSusp(rec.suspended); if (s) throw suspendedFail(s);
        if (String(rec.tokenVersion) !== v) throw fail(401, 'Sesión no válida o caducada.');
        return { d, rec };
    }
    function adminAuthed(token) {
        const [kind, id, v, exp] = String(token || '').split('.');
        const d = db(), rec = d.users.find(u => u.id === id);
        if (kind !== 'ladm') throw fail(403, 'Hace falta una sesión de administrador.', { code: 'admin_required' });
        if (!rec || String(rec.tokenVersion) !== v || !(Number(exp) > Date.now()) || !isLocalAdmin(rec.name)) throw fail(401, 'Sesión de administrador no válida.');
        return { d, A: adminState(d), by: rec.name };
    }
    function target(d, name, allowAdmin) {
        const rec = d.users.find(u => u.name.toLowerCase() === String(name || '').toLowerCase());
        if (!rec) throw fail(404, 'No existe esa cuenta.');
        if (!allowAdmin && isLocalAdmin(rec.name)) throw fail(403, 'No se puede aplicar a una cuenta administradora.');
        return rec;
    }
    const nextTick = (v) => new Promise(r => setTimeout(() => r(v), 40));
    const run = (fn) => new Promise((res, rej) => setTimeout(() => {
        if (UNAVAILABLE) return rej(fail(0, 'El servidor de cuentas no está configurado: no se puede iniciar sesión.', { offline: true }));
        try { res(fn()); } catch (e) { rej(e); }
    }, 40));

    // Sin API_URL sólo se permite el modo local en desarrollo (file:// o localhost). En un sitio publicado
    // (p. ej. GitHub Pages) no se puede iniciar sesión sin servidor: las cuentas viven únicamente en el repositorio de datos.
    const DEV = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const UNAVAILABLE = !API && !DEV;

    const Local = {
        kind: 'local',
        label: 'Modo local',
        register: ({ name, password, avatar, color }) => run(() => {
            const d = db();
            { const m = adminState(d).maintenance; if (m.on) throw maintFail(m); }
            if (d.users.some(u => u.name.toLowerCase() === String(name).toLowerCase())) throw fail(409, 'Ese nombre de usuario ya está en uso.');
            const salt = hash.randomSalt(), now = Date.now();
            const rec = { id: Nexus.util.uid(), name, avatar: avId(avatar), color, salt, hash: hash.hashPassword(password, salt),
                tokenVersion: 1, createdAt: now, updatedAt: now, data: Nexus.schema.userData() };
            d.users.push(rec); saveDb(d);
            return { token: tokenFor(rec), user: pub(rec), data: rec.data, updatedAt: rec.updatedAt };
        }),
        login: ({ name, password }) => run(() => {
            const d = db();
            { const m = adminState(d).maintenance; if (m.on && !isLocalAdmin(name)) throw maintFail(m); }
            const rec = d.users.find(u => u.name.toLowerCase() === String(name).toLowerCase());
            if (!rec) throw fail(404, 'No existe ninguna cuenta con ese usuario.');
            if (hash.hashPassword(password || '', rec.salt) !== rec.hash) throw fail(401, 'Contraseña incorrecta.');
            { const s = activeSusp(rec.suspended); if (s) throw suspendedFail(s); }
            rec.lastLoginAt = Date.now(); saveDb(d);
            return { token: tokenFor(rec), user: pub(rec), data: rec.data, updatedAt: rec.updatedAt };
        }),
        session: (token) => run(() => { const { rec } = authed(token); return { user: pub(rec), data: rec.data, updatedAt: rec.updatedAt }; }),
        saveData: (token, data) => run(() => {
            const { d, rec } = authed(token);
            rec.data = JSON.parse(JSON.stringify(data)); rec.updatedAt = Date.now(); saveDb(d);
            return { updatedAt: rec.updatedAt };
        }),
        profile: (token, patch) => run(() => {
            const { d, rec } = authed(token);
            if (patch.avatar) rec.avatar = avId(patch.avatar);
            if (patch.color) rec.color = patch.color;
            saveDb(d); return { user: pub(rec) };
        }),
        password: (token, { current, next }) => run(() => {
            const { d, rec } = authed(token);
            if (hash.hashPassword(current || '', rec.salt) !== rec.hash) throw fail(401, 'La contraseña actual no es correcta.');
            rec.salt = hash.randomSalt(); rec.hash = hash.hashPassword(next, rec.salt); rec.tokenVersion++;
            saveDb(d); return { token: tokenFor(rec) };
        }),
        deleteAccount: (token, password) => run(() => {
            const { d, rec } = authed(token);
            if (hash.hashPassword(password || '', rec.salt) !== rec.hash) throw fail(401, 'La contraseña no es correcta.');
            d.users = d.users.filter(u => u.id !== rec.id); saveDb(d);
            return { ok: true };
        }),
        leaderboard: () => run(() => ({
            updatedAt: Date.now(),
            players: db().users.map(r => summarize(pub(r), Nexus.schema.normalize(JSON.parse(JSON.stringify(r.data)))))
        })),
        ping: () => (UNAVAILABLE ? Promise.reject(fail(0, 'Servidor no configurado', { offline: true })) : nextTick({ ok: true })),
        status: () => run(() => ({ maintenance: pubMaint(adminState(db()).maintenance) })),
        notices: (token) => run(() => {
            const [, id] = String(token || '').split('.');
            const d = db(), A = adminState(d), rec = d.users.find(u => u.id === id);
            if (!rec) throw fail(401, 'Sesión no válida o caducada.');
            const ln = rec.name.toLowerCase(), s = activeSusp(A.suspended[ln]);
            return { maintenance: pubMaint(A.maintenance), messages: (A.messages[ln] || []).filter(m => !m.readAt).map(({ id: i, title, body, kind, at }) => ({ id: i, title, body, kind, at })),
                suspended: s ? { reason: s.reason || '', until: s.until || null } : null };
        }),
        ackNotices: (token, ids) => run(() => {
            const [, id] = String(token || '').split('.');
            const d = db(), A = adminState(d), rec = d.users.find(u => u.id === id);
            if (!rec) throw fail(401, 'Sesión no válida o caducada.');
            for (const m of A.messages[rec.name.toLowerCase()] || []) if (ids.includes(m.id) && !m.readAt) m.readAt = Date.now();
            saveDb(d); return { ok: true };
        }),
        admin: {
            // Igual que el servidor: contraseña + código de Google Authenticator; la clave de LOCAL_ADMIN sólo sirve para vincularlo
            login: ({ name, password, code }) => run(async () => {
                const c = localAdminCfg();
                if (!c) throw fail(503, 'El panel de administración no está configurado (LOCAL_ADMIN en config.js).');
                const d = db(), rec = d.users.find(u => u.name.toLowerCase() === String(name || '').toLowerCase());
                if (!rec || !isLocalAdmin(rec.name) || hash.hashPassword(password || '', rec.salt) !== rec.hash) throw fail(401, 'Credenciales de administrador no válidas.');
                if (!rec.totp) throw fail(403, 'Esta cuenta aún no tiene Google Authenticator. Configúralo primero.', { code: 'totp_setup' });
                const step = await TOTP.check(rec.totp, code);
                if (step < 0) throw fail(401, 'Código de Google Authenticator incorrecto o caducado.', { code: 'totp_bad' });
                const A = adminState(d); A.totpLast = A.totpLast || {};
                if ((A.totpLast[rec.name.toLowerCase()] || 0) >= step) throw fail(401, 'Ese código ya se ha usado. Espera al siguiente.', { code: 'totp_bad' });
                A.totpLast[rec.name.toLowerCase()] = step;
                logAction(A, rec.name, 'login'); saveDb(d);
                const expiresAt = Date.now() + ADMIN_TTL;
                return { token: `ladm.${rec.id}.${rec.tokenVersion}.${expiresAt}`, admin: { name: rec.name, avatar: rec.avatar }, expiresAt };
            }),
            totpSetup: ({ name, password, key }) => run(() => {
                const c = localAdminCfg();
                if (!c || !c.key) throw fail(503, 'Falta la clave de alta (LOCAL_ADMIN.key en config.js) para vincular Google Authenticator.');
                const d = db(), rec = d.users.find(u => u.name.toLowerCase() === String(name || '').toLowerCase());
                if (!rec || !isLocalAdmin(rec.name) || key !== c.key || hash.hashPassword(password || '', rec.salt) !== rec.hash) throw fail(401, 'Cuenta, contraseña o clave de alta no válidas.');
                const secret = TOTP.newSecret();
                pendingTotp[rec.id] = { secret, exp: Date.now() + 10 * 60 * 1000 };
                return { secret, uri: TOTP.uri(rec.name, secret), setupToken: `lset.${rec.id}`, replaces: !!rec.totp };
            }),
            totpEnable: ({ setupToken, code }) => run(async () => {
                const id = String(setupToken || '').split('.')[1], p = pendingTotp[id];
                if (!p || p.exp < Date.now()) throw fail(400, 'La configuración ha caducado. Vuelve a empezar.');
                const step = await TOTP.check(p.secret, code);
                if (step < 0) throw fail(400, 'El código no coincide. Comprueba la hora del móvil y escribe el código que se ve ahora.', { code: 'totp_bad' });
                const d = db(), rec = d.users.find(u => u.id === id);
                rec.totp = p.secret; delete pendingTotp[id];
                const A = adminState(d); A.totpLast = A.totpLast || {}; A.totpLast[rec.name.toLowerCase()] = step;
                logAction(A, rec.name, 'totp-setup'); saveDb(d);
                return { ok: true };
            }),
            overview: (t) => run(() => {
                const { d, A } = adminAuthed(t);
                const users = d.users.map(r => {
                    const ln = r.name.toLowerCase(), p = summarize(pub(r), Nexus.schema.normalize(JSON.parse(JSON.stringify(r.data))));
                    return Object.assign(p, { lname: ln, admin: isLocalAdmin(r.name), suspended: activeSusp(A.suspended[ln]), unread: (A.messages[ln] || []).filter(m => !m.readAt).length });
                });
                const messages = [];
                for (const [to, list] of Object.entries(A.messages)) for (const m of list) messages.push(Object.assign({ to }, m));
                messages.sort((a, b) => b.at - a.at);
                return { users, maintenance: A.maintenance, messages, log: A.log.slice(0, 120), now: Date.now() };
            }),
            user: (t, name) => run(() => {
                const { d, A } = adminAuthed(t);
                const r = target(d, name, true), data = Nexus.schema.normalize(JSON.parse(JSON.stringify(r.data)));
                return { account: { id: r.id, name: r.name, avatar: r.avatar, color: r.color, createdAt: r.createdAt, lastLoginAt: r.lastLoginAt || null, admin: isLocalAdmin(r.name), totp: !!r.totp, suspended: activeSusp(r.suspended) },
                    updatedAt: r.updatedAt, data: { xp: data.xp, meta: data.meta, stats: data.stats, achievements: data.achievements, history: data.history.slice(0, 40) },
                    summary: summarize(pub(r), data), messages: A.messages[r.name.toLowerCase()] || [] };
            }),
            suspend: (t, { name, reason, days }) => run(() => {
                const { d, A, by } = adminAuthed(t), r = target(d, name);
                days = Math.max(0, Math.min(3650, Number(days) || 0));
                const s = { at: Date.now(), until: days ? Date.now() + days * 86400000 : null, reason: clean(reason, 200), by };
                r.suspended = s; r.tokenVersion++;
                A.suspended[r.name.toLowerCase()] = Object.assign({ name: r.name }, s);
                logAction(A, by, 'suspend', r.name, (days ? days + ' días' : 'indefinida') + (s.reason ? ' · ' + s.reason : ''));
                saveDb(d); return { ok: true, suspended: s };
            }),
            unsuspend: (t, name) => run(() => {
                const { d, A, by } = adminAuthed(t), r = target(d, name);
                delete r.suspended; delete A.suspended[r.name.toLowerCase()];
                logAction(A, by, 'unsuspend', r.name); saveDb(d); return { ok: true };
            }),
            remove: (t, { name, confirm }) => run(() => {
                const { d, A, by } = adminAuthed(t), r = target(d, name);
                if (String(confirm || '').toLowerCase() !== r.name.toLowerCase()) throw fail(400, 'Escribe el nombre de la cuenta para confirmar.');
                d.users = d.users.filter(u => u !== r);
                delete A.suspended[r.name.toLowerCase()]; delete A.messages[r.name.toLowerCase()];
                logAction(A, by, 'delete', r.name); saveDb(d); return { ok: true };
            }),
            message: (t, { to, title, body, kind }) => run(() => {
                const { d, A, by } = adminAuthed(t);
                title = clean(title, 80); body = clean(body, 1000);
                if (!title || !body) throw fail(400, 'Escribe un título y un mensaje.');
                const names = [...new Set((to || []).map(n => String(n).toLowerCase()))];
                if (!names.length) throw fail(400, 'Elige al menos una cuenta.');
                const missing = names.filter(n => !d.users.some(u => u.name.toLowerCase() === n));
                if (missing.length) throw fail(400, 'No existen estas cuentas: ' + missing.join(', '));
                const msg = { id: Nexus.util.uid(), title, body, kind: ['info', 'warn', 'alert'].includes(kind) ? kind : 'info', at: Date.now(), by, readAt: null };
                for (const n of names) A.messages[n] = (A.messages[n] || []).concat([Object.assign({}, msg)]).slice(-30);
                logAction(A, by, 'message', names.length === 1 ? names[0] : `${names.length} cuentas`, title);
                saveDb(d); return { ok: true, id: msg.id, sent: names.length };
            }),
            cancelMessage: (t, { to, id }) => run(() => {
                const { d, A, by } = adminAuthed(t), n = String(to || '').toLowerCase();
                const list = (A.messages[n] || []).filter(m => m.id !== id);
                if (list.length) A.messages[n] = list; else delete A.messages[n];
                logAction(A, by, 'cancel', n); saveDb(d); return { ok: true };
            }),
            maintenance: (t, { on, message }) => run(() => {
                const { d, A, by } = adminAuthed(t);
                A.maintenance = { on: !!on, message: clean(message, 300), since: on ? (A.maintenance.on ? A.maintenance.since : Date.now()) : 0, by };
                logAction(A, by, on ? 'maintenance-on' : 'maintenance-off', '', A.maintenance.message);
                saveDb(d); return { maintenance: A.maintenance };
            })
        }
    };

    Nexus.backend = API ? Remote : Local;
    Nexus.backend.unavailable = UNAVAILABLE;
    Nexus.backend.NAME_RE = NAME_RE;
    Nexus.backend.RESERVED = RESERVED;
    if (Nexus.backend.kind === 'local') Nexus.backend.totpNow = (secret, skew = 0) => TOTP.code(secret, Math.floor(Date.now() / 30000) + skew);   // pruebas en modo local
    Nexus.core.summarize = summarize;
})();
