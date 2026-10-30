// Prueba de punta a punta del Worker con un GitHub falso en memoria.  node tests/worker_test.mjs
import worker from '../backend/worker.js';

const files = new Map();            // path -> {content(b64), sha}
let shaN = 0, forceConflicts = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    if (u.hostname !== 'api.github.com') return realFetch(url, init);
    const path = decodeURIComponent(u.pathname.replace(/^\/repos\/[^/]+\/[^/]+\/contents\//, ''));
    const json = (status, obj) => new Response(JSON.stringify(obj), { status });
    const method = init.method || 'GET';
    if (method === 'GET') { const f = files.get(path); return f ? json(200, { content: f.content, sha: f.sha }) : json(404, {}); }
    const body = JSON.parse(init.body);
    const cur = files.get(path);
    if (method === 'PUT') {
        if (forceConflicts > 0 && path === 'leaderboard.json') { forceConflicts--; return json(409, {}); }
        if (cur && body.sha !== cur.sha) return json(body.sha ? 409 : 422, {});
        if (!cur && body.sha) return json(404, {});
        const sha = 's' + (++shaN); files.set(path, { content: body.content, sha });
        return json(200, { content: { sha } });
    }
    if (method === 'DELETE') { if (!cur) return json(404, {}); if (body.sha !== cur.sha) return json(409, {}); files.delete(path); return json(200, {}); }
    return json(405, {});
};

const env = { GITHUB_TOKEN: 't', GITHUB_REPO: 'o/r', GITHUB_BRANCH: 'main', SESSION_SECRET: 'secreto-de-prueba', ALLOWED_ORIGIN: 'https://yo.github.io' };
const O = 'https://yo.github.io';
const call = async (method, path, body, token, origin = O) => {
    const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.1.1.' + Math.floor(Math.random() * 250) };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (origin) headers.Origin = origin;
    const res = await worker.fetch(new Request('https://api.test' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
    let json = null; try { json = await res.json(); } catch (e) {}
    return { status: res.status, json, headers: res.headers };
};
let bad = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
const data = (score, level = 3) => ({ v: 2, xp: { level, xp: 5, total: 900 }, history: [], achievements: { a: 1, b: 2 }, settings: {}, meta: { playTime: 10 }, saves: {},
    stats: { snake: { played: 2, wins: 0, bestScore: score, bestTime: null, bestStreak: 0, byMode: { evolve: { played: 2, wins: 0, bestScore: score, bestTime: null } } } } });

let r = await call('GET', '/api/health'); ok(r.status === 200 && r.json.ok, 'health');
r = await call('POST', '/api/register', { name: 'Ana_01', password: 'secreta1', avatar: '🦊', color: '#00b894' });
ok(r.status === 201 && r.json.token && r.json.user.name === 'Ana_01' && r.json.data.xp.level === 1, 'registro correcto');
const ana = r.json.token;
ok(files.has('users/ana_01.json') && files.has('leaderboard.json'), 'se crean users/ y leaderboard.json en el repo');
ok(!JSON.stringify(r.json).includes('hash'), 'la respuesta no filtra hash ni sal');
r = await call('POST', '/api/register', { name: 'ANA_01', password: 'otra-clave' }); ok(r.status === 409, 'nombre duplicado (sin distinguir mayúsculas) → 409');
r = await call('POST', '/api/register', { name: 'a b', password: 'secreta1' }); ok(r.status === 400, 'nombre inválido → 400');
r = await call('POST', '/api/register', { name: 'admin', password: 'secreta1' }); ok(r.status === 400, 'nombre reservado → 400');
r = await call('POST', '/api/register', { name: 'Pepe', password: '123' }); ok(r.status === 400, 'contraseña corta → 400');
r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' }); ok(r.status === 200 && r.json.token, 'login correcto (otra capitalización)');
const e1 = (await call('POST', '/api/login', { name: 'ana_01', password: 'mal' }));
const e2 = (await call('POST', '/api/login', { name: 'noexiste', password: 'mal' }));
ok(e1.status === 401 && e2.status === 401 && e1.json.error === e2.json.error, 'login erróneo → 401 con mensaje idéntico (no revela si existe)');
r = await call('GET', '/api/session', null, ana); ok(r.status === 200 && r.json.user.name === 'Ana_01', 'session con token válido');
r = await call('GET', '/api/session', null, ana.slice(0, -3) + 'AAA'); ok(r.status === 401, 'token manipulado → 401');
r = await call('GET', '/api/session'); ok(r.status === 401, 'sin token → 401');
const [pl] = ana.split('.'); const forged = Buffer.from(JSON.stringify({ u: 'x', n: 'ana_01', v: 1, exp: Date.now() + 1e6 })).toString('base64url');
r = await call('GET', '/api/session', null, forged + '.' + ana.split('.')[1]); ok(r.status === 401, 'payload falsificado con firma ajena → 401');
const exp = Buffer.from(JSON.stringify({ u: 'x', n: 'ana_01', v: 1, exp: Date.now() - 1 })).toString('base64url');
r = await call('GET', '/api/session', null, exp + '.zzz'); ok(r.status === 401, 'token caducado → 401');

r = await call('PUT', '/api/data', { data: data(1234) }, ana); ok(r.status === 200 && r.json.updatedAt > 0, 'PUT data');
r = await call('GET', '/api/leaderboard'); ok(r.status === 200 && r.json.players.length === 1 && r.json.players[0].stats.snake.bestScore === 1234 && r.json.players[0].level === 3, 'leaderboard refleja los datos');
ok(r.headers.get('Cache-Control').includes('max-age'), 'leaderboard con Cache-Control');
ok(!JSON.stringify(r.json).includes('hash') && !JSON.stringify(r.json).includes('history'), 'leaderboard sin datos privados');
r = await call('PUT', '/api/data', { data: { nada: 1 } }, ana); ok(r.status === 400, 'data inválido → 400');
r = await call('PUT', '/api/data', { data: { ...data(1), settings: { big: 'x'.repeat(300000) } } }, ana); ok(r.status === 413, 'data demasiado grande → 413');
r = await call('PUT', '/api/data', { data: data(999999999999) }, ana); r = await call('GET', '/api/leaderboard');
// la caché pública de 20 s se invalida al escribir
ok(r.json.players[0].stats.snake.bestScore === 1e9, 'bestScore saneado al tope 1e9');

const b = (await call('POST', '/api/register', { name: 'Beto', password: 'secreta2' })).json.token;
await call('PUT', '/api/data', { data: data(50, 9) }, b);
r = await call('GET', '/api/leaderboard'); ok(r.json.players.length === 2 && r.json.players[0].name === 'Beto' || r.json.players[0].name === 'Ana_01', 'dos jugadores en el ranking');

forceConflicts = 2; r = await call('PUT', '/api/data', { data: data(77, 4) }, b);
ok(r.status === 200, 'conflicto de escritura en ranking reintentado');
r = await call('GET', '/api/leaderboard'); ok(r.json.players.find(p => p.name === 'Beto').level === 4, 'tras el reintento el ranking está actualizado');

r = await call('PATCH', '/api/profile', { avatar: '🐼', color: '#d63031' }, b); ok(r.status === 200 && r.json.user.avatar === '🐼', 'PATCH profile');

r = await call('POST', '/api/password', { current: 'mal', next: 'nueva-clave' }, b); ok(r.status === 401, 'cambio de contraseña con actual errónea → 401');
r = await call('POST', '/api/password', { current: 'secreta2', next: 'nueva-clave' }, b); ok(r.status === 200 && r.json.token, 'cambio de contraseña');
const b2 = r.json.token;
r = await call('GET', '/api/session', null, b); ok(r.status === 401, 'token antiguo invalidado tras cambiar contraseña');
r = await call('GET', '/api/session', null, b2); ok(r.status === 200, 'token nuevo válido');
r = await call('POST', '/api/login', { name: 'beto', password: 'nueva-clave' }); ok(r.status === 200, 'login con la contraseña nueva');

r = await call('DELETE', '/api/account', { password: 'mal' }, b2); ok(r.status === 401, 'borrar cuenta con contraseña errónea → 401');
r = await call('DELETE', '/api/account', { password: 'nueva-clave' }, b2); ok(r.status === 200 && !files.has('users/beto.json'), 'borrar cuenta elimina el fichero');
r = await call('GET', '/api/leaderboard'); ok(r.json.players.length === 1, 'la cuenta borrada desaparece del ranking');
r = await call('GET', '/api/session', null, b2); ok(r.status === 401, 'token de cuenta borrada → 401');

r = await call('OPTIONS', '/api/login'); ok(r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === O, 'preflight CORS permitido');
r = await call('POST', '/api/login', { name: 'x', password: 'y' }, null, 'https://malo.example'); ok(r.status === 403, 'origen no permitido → 403');
r = await call('GET', '/api/nada'); ok(r.status === 401 || r.status === 404, 'ruta desconocida');
r = await call('GET', '/api/leaderboard'); ok(r.headers.get('Access-Control-Allow-Origin') === O, 'CORS en respuestas normales');

let n429 = 0; for (let i = 0; i < 14; i++) { const x = await worker.fetch(new Request('https://api.test/api/login', { method: 'POST', headers: { 'CF-Connecting-IP': '9.9.9.9', Origin: O }, body: JSON.stringify({ name: 'ana_01', password: 'mal' }) }), env); if (x.status === 429) n429++; }
ok(n429 > 0, 'limitador de intentos de login → 429');

console.log(bad ? `\nFALLOS: ${bad}` : '\nRESULT: OK'); process.exit(bad ? 1 : 0);
