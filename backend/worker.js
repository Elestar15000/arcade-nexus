/* ============================================================
   NEXUS ARCADE · backend/worker.js
   API de cuentas y rankings para Cloudflare Workers.
   Persiste en un repo PRIVADO de GitHub (Contents API):
     users/<nombre-minúsculas>.json   cuenta + datos de juego
     leaderboard.json                 resumen público de cada jugador
   Sólo WebCrypto + fetch, sin dependencias.
   Variables: GITHUB_REPO ("owner/repo"), GITHUB_BRANCH, ALLOWED_ORIGIN
   Secrets:   GITHUB_TOKEN, SESSION_SECRET
   ============================================================ */

const PBKDF2_ITER = 100000;          // máximo permitido en Workers
const TOKEN_TTL = 30 * 24 * 3600 * 1000;
const MAX_DATA_BYTES = 256 * 1024;
const LB_TTL = 20000;
const RESERVED = ['admin', 'root', 'nexus', 'system', 'invitado', 'guest', 'null', 'undefined'];
const NAME_RE = /^[A-Za-z0-9_-]{3,16}$/;
const KEY_RE = /^[a-z0-9_-]{1,24}$/;
const enc = new TextEncoder(), dec = new TextDecoder();

class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
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
async function signToken(env, rec) {
    const payload = b64url(enc.encode(JSON.stringify({ u: rec.id, n: rec.name.toLowerCase(), v: rec.tokenVersion, exp: Date.now() + TOKEN_TTL })));
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
/** Crea (sha=null) o actualiza. Lanza Conflict si el sha no coincide / ya existe. */
async function putFile(env, path, obj, sha, message) {
    const body = { message, content: toB64(enc.encode(JSON.stringify(obj))), branch: env.GITHUB_BRANCH || 'main' };
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
    for (const g of Object.keys(d.stats).filter((k) => KEY_RE.test(k) && isObj(d.stats[k])).slice(0, 12)) {
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
const userPath = (name) => `users/${name.toLowerCase()}.json`;
const publicUser = (r) => ({ id: r.id, name: r.name, avatar: r.avatar, color: r.color, createdAt: r.createdAt });
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

/** Lee el usuario del token, aplica fn(rec) y guarda con reintento si hay conflicto de escritura. */
async function mutateUser(env, tok, fn, label) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const f = await getFile(env, userPath(tok.n));
        if (!f || f.json.id !== tok.u || f.json.tokenVersion !== tok.v) throw new HttpError(401, 'Sesión no válida o caducada.');
        const rec = f.json;
        const out = await fn(rec);
        try {
            if (out && out.remove) await deleteFile(env, userPath(tok.n), f.sha, `cuenta eliminada: ${tok.n}`);
            else await putFile(env, userPath(tok.n), rec, f.sha, `${label}: ${rec.name}`);
            return { rec, out };
        } catch (e) {
            if (!(e instanceof Conflict)) throw e;
            await sleep(20 + Math.random() * 60);
        }
    }
    throw new HttpError(409, 'Conflicto al guardar. Inténtalo de nuevo.');
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
        validateName(body.name); validatePassword(body.password);
        const now = Date.now();
        const rec = {
            id: crypto.randomUUID(), name: body.name, ...cleanProfile(body.avatar, body.color), ...(await newCredentials(body.password)),
            tokenVersion: 1, createdAt: now, lastLoginAt: now, updatedAt: now, data: newData()
        };
        try { await putFile(env, userPath(rec.name), rec, null, `cuenta nueva: ${rec.name}`); }
        catch (e) { throw e instanceof Conflict ? new HttpError(409, 'Ese nombre de usuario ya está en uso.') : e; }
        await updateLeaderboard(env, rec.id, summarize(rec), `alta ${rec.name}`);
        return [201, { token: await signToken(env, rec), user: publicUser(rec), data: rec.data, updatedAt: rec.updatedAt }];
    }

    if (pathname === '/api/login' && method === 'POST') {
        const name = typeof body.name === 'string' ? body.name : '';
        rateLimit(`login:${ip}:${name.toLowerCase()}`, 10);
        const generic = new HttpError(401, 'Usuario o contraseña incorrectos.');
        const f = NAME_RE.test(name) ? await getFile(env, userPath(name)) : null;
        if (!(await checkPassword(f && f.json, body.password))) throw generic;
        const rec = f.json;
        rec.lastLoginAt = Date.now();
        try { await putFile(env, userPath(name), rec, f.sha, `login: ${rec.name}`); } catch (e) { /* no crítico */ }
        return [200, { token: await signToken(env, rec), user: publicUser(rec), data: rec.data, updatedAt: rec.updatedAt }];
    }

    // A partir de aquí se exige sesión
    const tok = await readToken(env, request);

    if (pathname === '/api/session' && method === 'GET') {
        const f = await getFile(env, userPath(tok.n));
        if (!f || f.json.id !== tok.u || f.json.tokenVersion !== tok.v) throw new HttpError(401, 'Sesión no válida o caducada.');
        return [200, { user: publicUser(f.json), data: f.json.data, updatedAt: f.json.updatedAt }];
    }

    if (pathname === '/api/data' && method === 'PUT') {
        if (JSON.stringify(body.data === undefined ? null : body.data).length > MAX_DATA_BYTES) throw new HttpError(413, 'Los datos superan el tamaño máximo (256 KB).');
        const data = sanitizeData(body.data);
        const { rec } = await mutateUser(env, tok, (r) => { r.data = data; r.updatedAt = Date.now(); }, 'datos');
        await updateLeaderboard(env, rec.id, summarize(rec), rec.name);
        return [200, { updatedAt: rec.updatedAt }];
    }

    if (pathname === '/api/profile' && method === 'PATCH') {
        const { rec } = await mutateUser(env, tok, (r) => Object.assign(r, cleanProfile(body.avatar === undefined ? r.avatar : body.avatar, body.color === undefined ? r.color : body.color)), 'perfil');
        await updateLeaderboard(env, rec.id, summarize(rec), rec.name);
        return [200, { user: publicUser(rec) }];
    }

    if (pathname === '/api/password' && method === 'POST') {
        rateLimit(`pw:${ip}:${tok.n}`, 10);
        validatePassword(body.next);
        const creds = await newCredentials(body.next);
        const { rec } = await mutateUser(env, tok, async (r) => {
            if (!(await checkPassword(r, body.current))) throw new HttpError(401, 'La contraseña actual no es correcta.');
            Object.assign(r, creds); r.tokenVersion++;
        }, 'contraseña');
        return [200, { token: await signToken(env, rec) }];
    }

    if (pathname === '/api/account' && method === 'DELETE') {
        rateLimit(`del:${ip}:${tok.n}`, 10);
        const { rec } = await mutateUser(env, tok, async (r) => {
            if (!(await checkPassword(r, body.password))) throw new HttpError(401, 'La contraseña no es correcta.');
            return { remove: true };
        }, 'baja');
        await updateLeaderboard(env, rec.id, null, `baja ${rec.name}`);
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
            if (e instanceof HttpError) return reply(e.status, { error: e.message });
            console.error(e);
            return reply(500, { error: 'Error interno del servidor.' });
        }
    }
};
