/* ============================================================
   NEXUS ARCADE · backend/worker.js
   API de cuentas y rankings para Cloudflare Workers.
   Persiste en un repo PRIVADO de GitHub (Contents API):
     users/<nombre-minúsculas>/       UNA CARPETA POR USUARIO:
         account.json                 perfil + credenciales (hash PBKDF2, sal, versión de token)
         progress.json                XP, nivel, racha de días, tiempo jugado, última modificación
         stats.json                   estadísticas por juego y modo
         achievements.json            logros desbloqueados (id → fecha)
         history.json                 últimas partidas
         settings.json                ajustes del usuario
         saves.json                   partidas en curso (Wordle, Pasapalabra…)
     leaderboard.json                 resumen público de cada jugador
     admin.json                       estado de administración: mantenimiento, cuentas
                                      suspendidas, pop-ups enviados y registro de acciones
   Sólo se reescriben los archivos que cambian (se compara el sha de Git).
   Sólo WebCrypto + fetch, sin dependencias.
   Variables: GITHUB_REPO ("owner/repo"), GITHUB_BRANCH, ALLOWED_ORIGIN,
              ADMIN_USERS (cuentas administradoras, separadas por comas)
   Secrets:   GITHUB_TOKEN, SESSION_SECRET, ADMIN_KEY (clave extra del panel)
   ============================================================ */

const PBKDF2_ITER = 100000;          // máximo permitido en Workers
const TOKEN_TTL = 30 * 24 * 3600 * 1000;
const MAX_DATA_BYTES = 256 * 1024;
const LB_TTL = 20000;
const ADMIN_TTL = 30 * 60 * 1000;   // sesión de administrador: 30 minutos
const ADMIN_FILE = 'admin.json';
const ADMIN_CACHE_MS = 15000;
const MSG_KINDS = ['info', 'warn', 'alert'];
const RESERVED = ['admin', 'root', 'nexus', 'system', 'invitado', 'guest', 'null', 'undefined'];
const NAME_RE = /^[A-Za-z0-9_-]{3,16}$/;
const KEY_RE = /^[a-z0-9_-]{1,24}$/;
const enc = new TextEncoder(), dec = new TextDecoder();

class HttpError extends Error {
    constructor(status, message, extra) { super(message); this.status = status; this.extra = extra || null; }
}
class Conflict extends Error {}

// ── Utilidades ──────────────────────────────────────────────
const toB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const b64url = (bytes) => toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => fromB64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clampInt = (v, max) => { v = Math.floor(Number(v)); return Number.isFinite(v) && v > 0 ? Math.min(v, max) : 0; };

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
    return d === 0;
}

async function pbkdf2(password, saltBytes) {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITER }, key, 256));
}
const FAKE_SALT = new Uint8Array(16);
async function checkPassword(rec, password) {
    const salt = rec ? unhex(rec.salt) : FAKE_SALT;    // hashea igualmente si el usuario no existe
    const got = await pbkdf2(String(password || ''), salt);
    return !!rec && timingSafeEqual(got, unhex(rec.hash));
}
const unhex = (h) => Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16));
async function newCredentials(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return { salt: hex(salt), hash: hex(await pbkdf2(password, salt)) };
}

// ── Tokens (HMAC-SHA256) ────────────────────────────────────
async function hmacKey(env) {
    if (!env.SESSION_SECRET) throw new HttpError(500, 'Servidor mal configurado.');
    return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function signToken(env, rec, admin = false) {
    const body = { u: rec.id, n: rec.name.toLowerCase(), v: rec.tokenVersion, exp: Date.now() + (admin ? ADMIN_TTL : TOKEN_TTL) };
    if (admin) body.adm = 1;
    const payload = b64url(enc.encode(JSON.stringify(body)));
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload)));
    return payload + '.' + b64url(sig);
}
async function readToken(env, request) {
    const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
    const bad = new HttpError(401, 'Sesión no válida o caducada.');
    if (!m) throw bad;
    const [payload, sig] = m[1].split('.');
    if (!payload || !sig) throw bad;
    try {
        const expect = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload)));
        if (!timingSafeEqual(expect, unb64url(sig))) throw bad;
        const p = JSON.parse(dec.decode(unb64url(payload)));
        if (!p || typeof p.n !== 'string' || !(p.exp > Date.now())) throw bad;
        return p;
    } catch (e) { throw e instanceof HttpError ? e : bad; }
}

// ── GitHub Contents API ─────────────────────────────────────
function ghUrl(env, path) {
    return `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
}
async function gh(env, method, path, body) {
    let res;
    try {
        res = await fetch(ghUrl(env, path) + (method === 'GET' ? `?ref=${encodeURIComponent(env.GITHUB_BRANCH || 'main')}` : ''), {
            method,
            headers: {
                Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
                'User-Agent': 'nexus-arcade-api', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });
    } catch (e) { throw new HttpError(502, 'No se pudo contactar con el almacenamiento.'); }
    return res;
}
const storageError = () => new HttpError(502, 'El almacenamiento no responde correctamente. Inténtalo de nuevo.');

/** @returns {{json:any, sha:string}|null} */
async function getFile(env, path) {
    const res = await gh(env, 'GET', path);
    if (res.status === 404) return null;
    if (!res.ok) throw storageError();
    try {
        const f = await res.json();
        return { json: JSON.parse(dec.decode(fromB64(String(f.content).replace(/\s/g, '')))), sha: f.sha };
    } catch (e) { throw storageError(); }
}
/** Lista los archivos de una carpeta del repo → [{name, sha}] o null si no existe. */
async function listDir(env, path) {
    const res = await gh(env, 'GET', path);
    if (res.status === 404) return null;
    if (!res.ok) throw storageError();
    try {
        const arr = await res.json();
        return Array.isArray(arr) ? arr.filter((x) => x.type === 'file').map((x) => ({ name: x.name, sha: x.sha })) : null;
    } catch (e) { throw storageError(); }
}
/** Subcarpetas de una carpeta del repo → [nombre] ([] si no existe). */
async function listDirs(env, path) {
    const res = await gh(env, 'GET', path);
    if (res.status === 404) return [];
    if (!res.ok) throw storageError();
    try { const arr = await res.json(); return Array.isArray(arr) ? arr.filter((x) => x.type === 'dir').map((x) => x.name) : []; }
    catch (e) { throw storageError(); }
}
/** Crea (sha=null) o actualiza. Lanza Conflict si el sha no coincide / ya existe. */
const serialize = (obj) => JSON.stringify(obj, null, 2) + '\n';
/** sha de blob de Git (el que devuelve GitHub) de un texto: permite saber si un archivo cambió sin leerlo. */
async function blobSha(text) {
    const body = enc.encode(text), head = enc.encode(`blob ${body.length}\0`);
    const all = new Uint8Array(head.length + body.length); all.set(head); all.set(body, head.length);
    return hex(new Uint8Array(await crypto.subtle.digest('SHA-1', all)));
}
async function putFile(env, path, obj, sha, message) {
    const body = { message, content: toB64(enc.encode(serialize(obj))), branch: env.GITHUB_BRANCH || 'main' };
    if (sha) body.sha = sha;
    const res = await gh(env, 'PUT', path, body);
    if (res.status === 409 || res.status === 422 || (sha && res.status === 404)) throw new Conflict();
    if (!res.ok) throw storageError();
    try { return (await res.json()).content.sha; } catch (e) { throw storageError(); }
}
async function deleteFile(env, path, sha, message) {
    const res = await gh(env, 'DELETE', path, { message, sha, branch: env.GITHUB_BRANCH || 'main' });
    if (res.status === 409 || res.status === 422) throw new Conflict();
    if (!res.ok && res.status !== 404) throw storageError();
}

// ── Saneado de datos y resumen del ranking ──────────────────
/** Copia JSON plano: sólo tipos primitivos/arrays/objetos, con límites de profundidad y longitud. */
function plain(v, depth = 0) {
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') return v.slice(0, 2000);
    if (depth > 8) return null;
    if (Array.isArray(v)) return v.slice(0, 1000).map((x) => plain(x, depth + 1));
    if (typeof v === 'object') {
        const out = {};
        for (const k of Object.keys(v).slice(0, 500)) {
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            out[k.slice(0, 200)] = plain(v[k], depth + 1);
        }
        return out;
    }
    return null;
}
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

function sanitizeData(d) {
    if (!isObj(d) || !isObj(d.xp) || !isObj(d.stats)) throw new HttpError(400, 'Datos de juego no válidos.');
    return {
        v: clampInt(d.v, 99) || 2,
        xp: { level: clampInt(d.xp.level, 999) || 1, xp: clampInt(d.xp.xp, 1e12), total: clampInt(d.xp.total, 1e12) },
        stats: plain(d.stats),
        history: Array.isArray(d.history) ? plain(d.history.slice(0, 100)) : [],
        achievements: isObj(d.achievements) ? plain(d.achievements) : {},
        settings: isObj(d.settings) ? plain(d.settings) : {},
        meta: isObj(d.meta) ? plain(d.meta) : {},
        saves: isObj(d.saves) ? plain(d.saves) : {}
    };
}
const bestTime = (t) => (t === null || t === undefined || !Number.isFinite(Number(t)) || Number(t) < 0 ? null : Math.floor(Number(t)));
const modeStats = (m) => ({ played: clampInt(m && m.played, 1e9), wins: clampInt(m && m.wins, 1e9), bestScore: clampInt(m && m.bestScore, 1e9), bestTime: bestTime(m && m.bestTime) });

function summarize(rec) {
    const d = rec.data, stats = {};
    let played = 0, wins = 0;
    for (const g of Object.keys(d.stats).filter((k) => KEY_RE.test(k) && isObj(d.stats[k])).slice(0, 48)) {
        const gs = d.stats[g], byMode = {};
        for (const m of Object.keys(isObj(gs.byMode) ? gs.byMode : {}).filter((k) => KEY_RE.test(k)).slice(0, 12)) byMode[m] = modeStats(gs.byMode[m]);
        stats[g] = { ...modeStats(gs), bestStreak: clampInt(gs.bestStreak, 1e9), byMode };
        played += stats[g].played; wins += stats[g].wins;
    }
    return {
        id: rec.id, name: rec.name, avatar: rec.avatar, color: rec.color,
        level: d.xp.level, totalXP: d.xp.total, played, wins,
        achievements: Object.keys(d.achievements).length, stats
    };
}

// ── Ranking (leaderboard.json) ──────────────────────────────
let lbCache = null;       // { json, sha } última versión conocida (se valida con el sha al escribir)
let lbPublic = null;      // { at, json } caché de lectura pública

async function updateLeaderboard(env, id, summary, label) {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            if (!lbCache) lbCache = (await getFile(env, 'leaderboard.json')) || { json: { updatedAt: 0, players: {} }, sha: null };
            const players = { ...lbCache.json.players };
            if (summary) players[id] = summary; else delete players[id];
            if (JSON.stringify(players[id] || null) === JSON.stringify(lbCache.json.players[id] || null)) return;   // sin cambios
            const json = { updatedAt: Date.now(), players };
            const sha = await putFile(env, 'leaderboard.json', json, lbCache.sha, `ranking: ${label}`);
            lbCache = { json, sha }; lbPublic = null;
            return;
        } catch (e) {
            if (!(e instanceof Conflict)) { lbCache = null; console.warn('ranking:', e.message); return; }
            lbCache = null;
            await sleep(20 + Math.random() * 60);
        }
    }
    console.warn('ranking: demasiados conflictos');
}

// ── Cuentas ─────────────────────────────────────────────────
const publicUser = (r, env) => ({ id: r.id, name: r.name, avatar: r.avatar, color: r.color, createdAt: r.createdAt, ...(env && isAdminName(env, r.name) ? { admin: true } : {}) });
const newData = () => ({ v: 2, xp: { level: 1, xp: 0, total: 0 }, stats: {}, history: [], achievements: {}, settings: {},
    meta: { playTime: 0, daysPlayed: 0, dayStreak: 0, bestDayStreak: 0, lastDay: null }, saves: {} });

function cleanProfile(avatar, color) {
    return {
        avatar: typeof avatar === 'string' && avatar.length > 0 && avatar.length <= 8 ? avatar : '🎮',
        color: typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : '#6c5ce7'
    };
}
function validateName(name) {
    if (typeof name !== 'string' || !NAME_RE.test(name)) throw new HttpError(400, 'El usuario debe tener 3–16 caracteres: letras, números, guion o guion bajo.');
    if (RESERVED.includes(name.toLowerCase())) throw new HttpError(400, 'Ese nombre está reservado.');
}
function validatePassword(pw) {
    if (typeof pw !== 'string' || pw.length < 6 || pw.length > 64) throw new HttpError(400, 'La contraseña debe tener entre 6 y 64 caracteres.');
}

// ── Carpeta de usuario: users/<nombre>/{account,progress,stats,…}.json ──
const DATA_FILES = ['progress', 'stats', 'achievements', 'history', 'settings', 'saves'];
const userDir = (lname) => `users/${lname}`;
const filePath = (lname, f) => `${userDir(lname)}/${f}.json`;
const userCache = new Map();     // lname → { archivo: { sha, json } } (se valida con el sha del listado)

function splitData(d, updatedAt) {
    return { progress: { v: d.v, xp: d.xp, meta: d.meta, updatedAt }, stats: d.stats, achievements: d.achievements,
        history: d.history, settings: d.settings, saves: d.saves };
}
function joinData(f) {
    const base = newData(), g = (k) => (f[k] ? f[k].json : undefined), p = isObj(g('progress')) ? g('progress') : {};
    return {
        v: p.v || 2, xp: isObj(p.xp) ? p.xp : base.xp, meta: isObj(p.meta) ? p.meta : base.meta,
        stats: isObj(g('stats')) ? g('stats') : {}, achievements: isObj(g('achievements')) ? g('achievements') : {},
        history: Array.isArray(g('history')) ? g('history') : [], settings: isObj(g('settings')) ? g('settings') : {},
        saves: isObj(g('saves')) ? g('saves') : {}
    };
}

/** Abre la carpeta del usuario (sólo el listado). null si la cuenta no existe. */
async function openUser(env, name) {
    const lname = String(name).toLowerCase();
    if (!NAME_RE.test(lname)) return null;
    const listing = await listDir(env, userDir(lname));
    if (!listing || !listing.some((x) => x.name === 'account.json')) return null;
    const shas = {};
    for (const x of listing) shas[x.name.replace(/\.json$/, '')] = x.sha;
    return { lname, shas, account: null, data: null, updatedAt: 0 };
}
async function readFiles(env, u, names) {
    const cache = userCache.get(u.lname) || {}, out = {};
    await Promise.all(names.map(async (f) => {
        const sha = u.shas[f];
        if (!sha) return;
        if (cache[f] && cache[f].sha === sha) { out[f] = cache[f]; return; }
        const got = await getFile(env, filePath(u.lname, f));
        if (got) out[f] = { sha: got.sha, json: got.json };
    }));
    userCache.set(u.lname, { ...cache, ...out });
    if (userCache.size > 300) userCache.delete(userCache.keys().next().value);
    return out;
}
async function loadAccount(env, u) {
    const f = await readFiles(env, u, ['account']);
    if (!f.account) throw storageError();
    u.account = f.account.json; return u;
}
async function loadData(env, u) {
    const f = await readFiles(env, u, ['account', ...DATA_FILES]);
    if (!f.account) throw storageError();
    u.account = f.account.json;
    u.data = joinData(f);
    u.updatedAt = (f.progress && f.progress.json.updatedAt) || u.account.createdAt || 0;
    return u;
}
/** Escribe un archivo sólo si su contenido cambió. Lanza Conflict si alguien lo modificó antes. */
async function writeFile(env, u, name, obj, label) {
    const text = serialize(obj);
    if (u.shas[name] && u.shas[name] === (await blobSha(text))) return false;
    const sha = await putFile(env, filePath(u.lname, name), obj, u.shas[name] || null, label);
    u.shas[name] = sha;
    const c = userCache.get(u.lname) || {}; c[name] = { sha, json: obj }; userCache.set(u.lname, c);
    return true;
}
async function saveUser(env, u, label) {
    const parts = { account: u.account, ...splitData(u.data, u.updatedAt) };
    for (const name of ['account', ...DATA_FILES]) await writeFile(env, u, name, parts[name], `${label}: ${u.account.name} (${name})`);
}
async function deleteUser(env, u) {
    // account.json se borra el último: si algo falla a medias, la cuenta sigue existiendo y se puede reintentar
    const order = [...DATA_FILES, 'account'].filter((f) => u.shas[f]);
    for (const f of order) await deleteFile(env, filePath(u.lname, f), u.shas[f], `cuenta eliminada: ${u.lname}/${f}`);
    userCache.delete(u.lname);
}

/** Abre la cuenta del token, aplica fn(u) y guarda los archivos que cambien (reintenta si hay conflicto). */
async function mutateUser(env, tok, fn, label) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const u = await openUser(env, tok.n);
        if (!u) throw new HttpError(401, 'Sesión no válida o caducada.');
        await loadData(env, u);
        checkSession(u, tok);
        const out = await fn(u);
        try {
            if (out && out.remove) await deleteUser(env, u); else await saveUser(env, u, label);
            return { u, out };
        } catch (e) {
            if (!(e instanceof Conflict)) throw e;
            userCache.delete(u.lname);
            await sleep(20 + Math.random() * 60);
        }
    }
    throw new HttpError(409, 'Conflicto al guardar. Inténtalo de nuevo.');
}
/** La cuenta del token sigue siendo la misma, no está suspendida y no se cerraron sus sesiones. */
function checkSession(u, tok) {
    if (u.account.id !== tok.u) throw new HttpError(401, 'Sesión no válida o caducada.');
    const s = activeSusp(u.account.suspended);
    if (s) throw suspendedError(s);
    if (u.account.tokenVersion !== tok.v) throw new HttpError(401, 'Sesión no válida o caducada.');
}
const summaryOf = (u) => summarize({ ...u.account, data: u.data });

// ── Administración (admin.json) ─────────────────────────────
const adminNames = (env) => String(env.ADMIN_USERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const isAdminName = (env, n) => adminNames(env).includes(String(n || '').toLowerCase());
/** Suspensión vigente (las temporales caducan solas). */
const activeSusp = (s) => (isObj(s) && (!s.until || s.until > Date.now()) ? s : null);
const suspendedError = (s) => new HttpError(403, `Tu cuenta está suspendida${s.until ? ' hasta el ' + new Date(s.until).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : ''}${s.reason ? ': ' + s.reason : '.'}`,
    { code: 'suspended', reason: s.reason || '', until: s.until || null });
const maintenanceError = (m) => new HttpError(503, m.message ? `Página en mantenimiento: ${m.message}` : 'La página está en mantenimiento. Vuelve en un rato.', { code: 'maintenance' });
const publicMaint = (m) => ({ on: !!m.on, message: m.message || '', since: m.since || 0 });

function normalizeAdmin(j) {
    j = isObj(j) ? j : {};
    return {
        maintenance: isObj(j.maintenance) ? j.maintenance : { on: false, message: '', since: 0, by: '' },
        suspended: isObj(j.suspended) ? j.suspended : {},
        messages: isObj(j.messages) ? j.messages : {},
        log: Array.isArray(j.log) ? j.log : []
    };
}
let adminCache = null;     // { json, sha, at }
async function readAdmin(env, fresh = false) {
    if (!fresh && adminCache && Date.now() - adminCache.at < ADMIN_CACHE_MS) return adminCache;
    const f = await getFile(env, ADMIN_FILE);
    adminCache = { json: normalizeAdmin(f && f.json), sha: f ? f.sha : null, at: Date.now() };
    return adminCache;
}
/** Lee admin.json, aplica fn(json) y lo guarda (reintenta si alguien lo cambió a la vez). fn → false = sin cambios. */
async function mutateAdmin(env, fn, label) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const st = await readAdmin(env, true);
        const json = JSON.parse(JSON.stringify(st.json));
        const out = await fn(json);
        if (out === false) return st.json;
        try {
            const sha = await putFile(env, ADMIN_FILE, json, st.sha, `admin: ${label}`);
            adminCache = { json, sha, at: Date.now() };
            return json;
        } catch (e) {
            if (!(e instanceof Conflict)) throw e;
            adminCache = null;
            await sleep(20 + Math.random() * 60);
        }
    }
    throw new HttpError(409, 'Conflicto al guardar. Inténtalo de nuevo.');
}
const logAction = (json, by, action, target, detail) => {
    json.log.unshift({ at: Date.now(), by, action, target: target || '', detail: detail ? String(detail).slice(0, 300) : '' });
    json.log = json.log.slice(0, 200);
};
async function adminKeyOk(env, key) {
    const a = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(env.ADMIN_KEY || ''))));
    const b = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(key || ''))));
    return timingSafeEqual(a, b) && !!env.ADMIN_KEY;
}
/** Comprueba que el token es de administrador y que la cuenta sigue siéndolo. Devuelve su nombre. */
async function requireAdmin(env, tok) {
    if (!tok.adm || !isAdminName(env, tok.n)) throw new HttpError(403, 'Hace falta una sesión de administrador.', { code: 'admin_required' });
    const u = await openUser(env, tok.n);
    if (!u) throw new HttpError(401, 'Sesión de administrador no válida.');
    await loadAccount(env, u);
    if (u.account.id !== tok.u || u.account.tokenVersion !== tok.v) throw new HttpError(401, 'Sesión de administrador no válida.');
    return u.account.name;
}
/** Abre la cuenta objetivo de una acción de administración (nunca otra cuenta administradora). */
async function targetUser(env, name, allowAdmin = false) {
    const u = await openUser(env, String(name || ''));
    if (!u) throw new HttpError(404, 'No existe esa cuenta.');
    await loadAccount(env, u);
    if (!allowAdmin && isAdminName(env, u.lname)) throw new HttpError(403, 'No se puede aplicar a una cuenta administradora.');
    return u;
}
/** Cambia account.json de una cuenta con reintentos. */
async function mutateAccount(env, name, fn, label) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const u = await targetUser(env, name);
        fn(u.account);
        try { await writeFile(env, u, 'account', u.account, `${label}: ${u.account.name}`); return u; }
        catch (e) { if (!(e instanceof Conflict)) throw e; userCache.delete(u.lname); await sleep(20 + Math.random() * 60); }
    }
    throw new HttpError(409, 'Conflicto al guardar. Inténtalo de nuevo.');
}
const cleanText = (v, max) => String(typeof v === 'string' ? v : '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

async function adminRoute(env, tok, pathname, method, body, url) {
    const by = await requireAdmin(env, tok);

    if (pathname === '/api/admin/overview' && method === 'GET') {
        const [dirs, lb, st] = await Promise.all([listDirs(env, 'users'), getFile(env, 'leaderboard.json'), readAdmin(env, true)]);
        const byName = {};
        for (const p of Object.values((lb && lb.json.players) || {})) if (p && p.name) byName[String(p.name).toLowerCase()] = p;
        const msgs = st.json.messages;
        const users = dirs.filter((d) => NAME_RE.test(d)).map((lname) => {
            const p = byName[lname] || {}, list = Array.isArray(msgs[lname]) ? msgs[lname] : [];
            return { lname, name: p.name || lname, avatar: p.avatar || '🎮', color: p.color || '#6c5ce7', level: p.level || 1, totalXP: p.totalXP || 0,
                played: p.played || 0, wins: p.wins || 0, achievements: p.achievements || 0, stats: p.stats || {},
                admin: isAdminName(env, lname), suspended: activeSusp(st.json.suspended[lname]), unread: list.filter((m) => !m.readAt).length };
        });
        const messages = [];
        for (const [to, list] of Object.entries(msgs)) for (const m of Array.isArray(list) ? list : []) messages.push({ to, ...m });
        messages.sort((a, b) => b.at - a.at);
        return [200, { users, maintenance: st.json.maintenance, messages: messages.slice(0, 300), log: st.json.log.slice(0, 120), now: Date.now() }];
    }

    if (pathname === '/api/admin/user' && method === 'GET') {
        const u = await openUser(env, url.searchParams.get('name') || '');
        if (!u) throw new HttpError(404, 'No existe esa cuenta.');
        await loadData(env, u);
        const a = u.account, d = u.data, st = await readAdmin(env);
        return [200, {
            account: { id: a.id, name: a.name, avatar: a.avatar, color: a.color, createdAt: a.createdAt, lastLoginAt: a.lastLoginAt || null,
                admin: isAdminName(env, a.name), suspended: activeSusp(a.suspended) },
            updatedAt: u.updatedAt,
            data: { xp: d.xp, meta: d.meta, stats: d.stats, achievements: d.achievements, history: d.history.slice(0, 40) },
            summary: summaryOf(u),
            messages: Array.isArray(st.json.messages[u.lname]) ? st.json.messages[u.lname] : []
        }];
    }

    if (pathname === '/api/admin/suspend' && method === 'POST') {
        const days = Math.max(0, Math.min(3650, Number(body.days) || 0));
        const reason = cleanText(body.reason, 200);
        const susp = { at: Date.now(), until: days ? Date.now() + days * 86400000 : null, reason, by };
        // tokenVersion++ cierra al instante todas sus sesiones abiertas
        const u = await mutateAccount(env, body.name, (a) => { a.suspended = susp; a.tokenVersion++; }, 'suspensión');
        await mutateAdmin(env, (j) => { j.suspended[u.lname] = { ...susp, name: u.account.name }; logAction(j, by, 'suspend', u.account.name, (days ? days + ' días' : 'indefinida') + (reason ? ' · ' + reason : '')); }, `suspende ${u.lname}`);
        return [200, { ok: true, suspended: susp }];
    }

    if (pathname === '/api/admin/unsuspend' && method === 'POST') {
        const u = await mutateAccount(env, body.name, (a) => { delete a.suspended; }, 'reactivación');
        await mutateAdmin(env, (j) => { delete j.suspended[u.lname]; logAction(j, by, 'unsuspend', u.account.name); }, `reactiva ${u.lname}`);
        return [200, { ok: true }];
    }

    if (pathname === '/api/admin/delete' && method === 'POST') {
        const u = await targetUser(env, body.name);
        if (String(body.confirm || '').toLowerCase() !== u.lname) throw new HttpError(400, 'Escribe el nombre de la cuenta para confirmar.');
        await deleteUser(env, u);
        await updateLeaderboard(env, u.account.id, null, `baja (admin) ${u.account.name}`);
        await mutateAdmin(env, (j) => { delete j.suspended[u.lname]; delete j.messages[u.lname]; logAction(j, by, 'delete', u.account.name); }, `elimina ${u.lname}`);
        return [200, { ok: true }];
    }

    if (pathname === '/api/admin/message' && method === 'POST') {
        const title = cleanText(body.title, 80), text = cleanText(body.body, 1000);
        const kind = MSG_KINDS.includes(body.kind) ? body.kind : 'info';
        if (!title || !text) throw new HttpError(400, 'Escribe un título y un mensaje.');
        const to = [...new Set((Array.isArray(body.to) ? body.to : []).map((n) => String(n).toLowerCase()))].slice(0, 500);
        if (!to.length) throw new HttpError(400, 'Elige al menos una cuenta.');
        const dirs = new Set(await listDirs(env, 'users'));
        const missing = to.filter((n) => !dirs.has(n));
        if (missing.length) throw new HttpError(400, 'No existen estas cuentas: ' + missing.slice(0, 10).join(', '));
        const msg = { id: crypto.randomUUID(), title, body: text, kind, at: Date.now(), by, readAt: null };
        await mutateAdmin(env, (j) => {
            for (const n of to) j.messages[n] = [...(Array.isArray(j.messages[n]) ? j.messages[n] : []), msg].slice(-30);
            logAction(j, by, 'message', to.length === 1 ? to[0] : `${to.length} cuentas`, title);
        }, `pop-up a ${to.length}`);
        return [200, { ok: true, id: msg.id, sent: to.length }];
    }

    if (pathname === '/api/admin/message/cancel' && method === 'POST') {
        const n = String(body.to || '').toLowerCase();
        await mutateAdmin(env, (j) => {
            const list = Array.isArray(j.messages[n]) ? j.messages[n] : [];
            const next = list.filter((m) => m.id !== body.id);
            if (next.length === list.length) return false;
            if (next.length) j.messages[n] = next; else delete j.messages[n];
            logAction(j, by, 'cancel', n);
        }, `retira pop-up de ${n}`);
        return [200, { ok: true }];
    }

    if (pathname === '/api/admin/maintenance' && method === 'POST') {
        const on = !!body.on, message = cleanText(body.message, 300);
        const j = await mutateAdmin(env, (x) => {
            x.maintenance = { on, message, since: on ? (x.maintenance.on ? x.maintenance.since : Date.now()) : 0, by };
            logAction(x, by, on ? 'maintenance-on' : 'maintenance-off', '', message);
        }, on ? 'mantenimiento activado' : 'mantenimiento desactivado');
        return [200, { maintenance: j.maintenance }];
    }

    throw new HttpError(404, 'Ruta no encontrada.');
}

// ── Limitador sencillo en memoria (por instancia; ver README) ──
const hits = new Map();
function rateLimit(key, max, windowMs = 60000) {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) throw new HttpError(429, 'Demasiados intentos. Espera un minuto.');
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
}

// ── Rutas ───────────────────────────────────────────────────
async function route(request, env, url, body) {
    const { pathname } = url, method = request.method;
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) throw new HttpError(500, 'Servidor mal configurado.');

    if (pathname === '/api/health' && method === 'GET') return [200, { ok: true }];

    if (pathname === '/api/status' && method === 'GET') {
        const st = await readAdmin(env);
        return [200, { maintenance: publicMaint(st.json.maintenance) }, { 'Cache-Control': 'no-store' }];
    }

    if (pathname === '/api/admin/login' && method === 'POST') {
        rateLimit('adm:' + ip, 5);
        if (!env.ADMIN_KEY || !adminNames(env).length) throw new HttpError(503, 'El panel de administración no está configurado en el servidor.');
        const denied = new HttpError(401, 'Credenciales de administrador no válidas.');
        const name = typeof body.name === 'string' ? body.name : '';
        const u = isAdminName(env, name) ? await openUser(env, name) : null;
        if (u) await loadAccount(env, u);
        const pwOk = await checkPassword(u && u.account, body.password);     // hashea siempre (mismo tiempo)
        if (!(await adminKeyOk(env, body.key)) || !pwOk || !u) throw denied;
        await mutateAdmin(env, (j) => logAction(j, u.account.name, 'login'), `acceso de ${u.lname}`).catch(() => {});
        return [200, { token: await signToken(env, u.account, true), admin: { name: u.account.name, avatar: u.account.avatar }, expiresAt: Date.now() + ADMIN_TTL }];
    }

    if (pathname === '/api/leaderboard' && method === 'GET') {
        if (!lbPublic || Date.now() - lbPublic.at > LB_TTL) {
            const f = lbCache && Date.now() - (lbCache.at || 0) < 0 ? lbCache : await getFile(env, 'leaderboard.json');
            const json = f ? f.json : { updatedAt: 0, players: {} };
            if (f) lbCache = { ...f, at: Date.now() };
            lbPublic = { at: Date.now(), json: { updatedAt: json.updatedAt, players: Object.values(json.players).sort((a, b) => b.totalXP - a.totalXP) } };
        }
        return [200, lbPublic.json, { 'Cache-Control': 'public, max-age=20' }];
    }

    if (pathname === '/api/register' && method === 'POST') {
        rateLimit('reg:' + ip, 10);
        { const m = (await readAdmin(env)).json.maintenance; if (m.on) throw maintenanceError(m); }
        validateName(body.name); validatePassword(body.password);
        const now = Date.now();
        const account = {
            id: crypto.randomUUID(), name: body.name, ...cleanProfile(body.avatar, body.color), ...(await newCredentials(body.password)),
            tokenVersion: 1, createdAt: now, lastLoginAt: now
        };
        const u = { lname: body.name.toLowerCase(), shas: {}, account, data: newData(), updatedAt: now };
        // account.json se crea sin sha: si el nombre ya existe, GitHub lo rechaza (unicidad atómica)
        try { await writeFile(env, u, 'account', account, `cuenta nueva: ${account.name}`); }
        catch (e) { throw e instanceof Conflict ? new HttpError(409, 'Ese nombre de usuario ya está en uso.') : e; }
        try { await writeFile(env, u, 'progress', splitData(u.data, now).progress, `cuenta nueva: ${account.name} (progress)`); } catch (e) { /* se creará en el primer guardado */ }
        await updateLeaderboard(env, account.id, summaryOf(u), `alta ${account.name}`);
        return [201, { token: await signToken(env, account), user: publicUser(account, env), data: u.data, updatedAt: now }];
    }

    if (pathname === '/api/login' && method === 'POST') {
        const name = typeof body.name === 'string' ? body.name : '';
        rateLimit(`login:${ip}:${name.toLowerCase()}`, 10);
        { const m = (await readAdmin(env)).json.maintenance; if (m.on && !isAdminName(env, name)) throw maintenanceError(m); }
        const u = await openUser(env, name);
        if (!u) { await checkPassword(null, body.password); throw new HttpError(404, 'No existe ninguna cuenta con ese usuario en el servidor.'); }
        await loadAccount(env, u);
        if (!(await checkPassword(u.account, body.password))) throw new HttpError(401, 'Contraseña incorrecta.');
        { const s = activeSusp(u.account.suspended); if (s) throw suspendedError(s); }
        await loadData(env, u);
        u.account.lastLoginAt = Date.now();
        try { await writeFile(env, u, 'account', u.account, `login: ${u.account.name}`); } catch (e) { /* no crítico */ }
        return [200, { token: await signToken(env, u.account), user: publicUser(u.account, env), data: u.data, updatedAt: u.updatedAt }];
    }

    // A partir de aquí se exige sesión
    const tok = await readToken(env, request);
    if (pathname.startsWith('/api/admin/')) return adminRoute(env, tok, pathname, method, body, url);
    if (tok.adm) throw new HttpError(401, 'Sesión no válida o caducada.');     // un token de administrador no sirve como sesión de juego

    // Avisos para el jugador: mantenimiento, pop-ups pendientes y suspensión (sólo lee admin.json, en caché)
    if (pathname === '/api/notices' && method === 'GET') {
        const st = await readAdmin(env), j = st.json;
        const list = Array.isArray(j.messages[tok.n]) ? j.messages[tok.n] : [];
        const s = activeSusp(j.suspended[tok.n]);
        return [200, { maintenance: publicMaint(j.maintenance), messages: list.filter((m) => !m.readAt).map(({ id, title, body: b, kind, at }) => ({ id, title, body: b, kind, at })),
            suspended: s ? { reason: s.reason || '', until: s.until || null } : null }];
    }
    if (pathname === '/api/notices/ack' && method === 'POST') {
        rateLimit(`ack:${ip}:${tok.n}`, 30);
        const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 50));
        await mutateAdmin(env, (j) => {
            const list = Array.isArray(j.messages[tok.n]) ? j.messages[tok.n] : [];
            let changed = false;
            for (const m of list) if (ids.has(m.id) && !m.readAt) { m.readAt = Date.now(); changed = true; }
            return changed ? undefined : false;
        }, `${tok.n} leyó pop-ups`);
        return [200, { ok: true }];
    }

    if (pathname === '/api/session' && method === 'GET') {
        const u = await openUser(env, tok.n);
        if (!u) throw new HttpError(401, 'Sesión no válida o caducada.');
        await loadData(env, u);
        checkSession(u, tok);
        return [200, { user: publicUser(u.account, env), data: u.data, updatedAt: u.updatedAt }];
    }

    if (pathname === '/api/data' && method === 'PUT') {
        if (JSON.stringify(body.data === undefined ? null : body.data).length > MAX_DATA_BYTES) throw new HttpError(413, 'Los datos superan el tamaño máximo (256 KB).');
        const data = sanitizeData(body.data);
        const { u } = await mutateUser(env, tok, (x) => { x.data = data; x.updatedAt = Date.now(); }, 'datos');
        await updateLeaderboard(env, u.account.id, summaryOf(u), u.account.name);
        return [200, { updatedAt: u.updatedAt }];
    }

    if (pathname === '/api/profile' && method === 'PATCH') {
        const { u } = await mutateUser(env, tok, (x) => Object.assign(x.account, cleanProfile(body.avatar === undefined ? x.account.avatar : body.avatar, body.color === undefined ? x.account.color : body.color)), 'perfil');
        await updateLeaderboard(env, u.account.id, summaryOf(u), u.account.name);
        return [200, { user: publicUser(u.account, env) }];
    }

    if (pathname === '/api/password' && method === 'POST') {
        rateLimit(`pw:${ip}:${tok.n}`, 10);
        validatePassword(body.next);
        const creds = await newCredentials(body.next);
        const { u } = await mutateUser(env, tok, async (x) => {
            if (!(await checkPassword(x.account, body.current))) throw new HttpError(401, 'La contraseña actual no es correcta.');
            Object.assign(x.account, creds); x.account.tokenVersion++;
        }, 'contraseña');
        return [200, { token: await signToken(env, u.account) }];
    }

    if (pathname === '/api/account' && method === 'DELETE') {
        rateLimit(`del:${ip}:${tok.n}`, 10);
        const { u } = await mutateUser(env, tok, async (x) => {
            if (!(await checkPassword(x.account, body.password))) throw new HttpError(401, 'La contraseña no es correcta.');
            return { remove: true };
        }, 'baja');
        await updateLeaderboard(env, u.account.id, null, `baja ${u.account.name}`);
        return [200, { ok: true }];
    }

    throw new HttpError(404, 'Ruta no encontrada.');
}

// ── Entrada ─────────────────────────────────────────────────
function allowedOrigin(env, origin) {
    const list = String(env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes('*')) return '*';
    return list.includes(origin) ? origin : null;
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin');
        const allow = origin ? allowedOrigin(env, origin) : null;
        const cors = allow ? { 'Access-Control-Allow-Origin': allow, Vary: 'Origin' } : {};
        const reply = (status, obj, extra = {}) => new Response(JSON.stringify(obj), {
            status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...extra }
        });
        try {
            if (origin && !allow) return reply(403, { error: 'Origen no permitido.' });
            if (request.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: { ...cors,
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
                    'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400' } });
            }
            const url = new URL(request.url);
            let body = {};
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                const text = await request.text();
                if (text.length > MAX_DATA_BYTES + 4096) throw new HttpError(413, 'La petición es demasiado grande.');
                if (text) { try { body = JSON.parse(text); } catch (e) { throw new HttpError(400, 'JSON no válido.'); } }
                if (!isObj(body)) throw new HttpError(400, 'JSON no válido.');
            }
            const [status, obj, extra] = await route(request, env, url, body);
            return reply(status, obj, extra);
        } catch (e) {
            if (e instanceof HttpError) return reply(e.status, { error: e.message, ...(e.extra || {}) });
            console.error(e);
            return reply(500, { error: 'Error interno del servidor.' });
        }
    }
};
