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
        if (!res.ok) throw fail(res.status, (json && json.error) || `Error del servidor (${res.status}).`, { offline: res.status >= 502 });
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
        ping: () => http('GET', '/api/health')
    };

    // ── Local (sin servidor) ────────────────────────────────
    const hash = Nexus.core.hash;
    const db = () => store.get('ldb', { users: [] });
    const saveDb = (d) => store.set('ldb', d);
    const pub = (r) => ({ id: r.id, name: r.name, avatar: r.avatar, color: r.color, createdAt: r.createdAt });
    const tokenFor = (r) => `local.${r.id}.${r.tokenVersion}`;
    function authed(token) {
        const [, id, v] = String(token || '').split('.');
        const d = db(), rec = d.users.find(u => u.id === id);
        if (!rec || String(rec.tokenVersion) !== v) throw fail(401, 'Sesión no válida o caducada.');
        return { d, rec };
    }
    const nextTick = (v) => new Promise(r => setTimeout(() => r(v), 40));
    const run = (fn) => new Promise((res, rej) => setTimeout(() => { try { res(fn()); } catch (e) { rej(e); } }, 40));

    const Local = {
        kind: 'local',
        label: 'Modo local',
        register: ({ name, password, avatar, color }) => run(() => {
            const d = db();
            if (d.users.some(u => u.name.toLowerCase() === String(name).toLowerCase())) throw fail(409, 'Ese nombre de usuario ya está en uso.');
            const salt = hash.randomSalt(), now = Date.now();
            const rec = { id: Nexus.util.uid(), name, avatar, color, salt, hash: hash.hashPassword(password, salt),
                tokenVersion: 1, createdAt: now, updatedAt: now, data: Nexus.schema.userData() };
            d.users.push(rec); saveDb(d);
            return { token: tokenFor(rec), user: pub(rec), data: rec.data, updatedAt: rec.updatedAt };
        }),
        login: ({ name, password }) => run(() => {
            const rec = db().users.find(u => u.name.toLowerCase() === String(name).toLowerCase());
            if (!rec || hash.hashPassword(password || '', rec.salt) !== rec.hash) throw fail(401, 'Usuario o contraseña incorrectos.');
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
            if (patch.avatar) rec.avatar = patch.avatar;
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
        ping: () => nextTick({ ok: true })
    };

    Nexus.backend = API ? Remote : Local;
    Nexus.backend.NAME_RE = NAME_RE;
    Nexus.backend.RESERVED = RESERVED;
    Nexus.core.summarize = summarize;
})();
