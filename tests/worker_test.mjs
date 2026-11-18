// Prueba de punta a punta del Worker con un GitHub falso en memoria.  node tests/worker_test.mjs
import worker from '../backend/worker.js';

import { createHash, createHmac } from 'node:crypto';
// Código TOTP como Google Authenticator (RFC 6238)
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function totp(secret, at = Date.now(), skew = 0) {
    let bits = 0, val = 0; const key = [];
    for (const ch of secret) { val = (val << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { key.push((val >>> (bits - 8)) & 255); bits -= 8; } }
    const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(at / 30000) + skew));
    const h = createHmac('sha1', Buffer.from(key)).update(ctr).digest(), o = h[19] & 15;
    return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, '0');
}
const files = new Map();            // path -> {content(b64), sha}  (sha = sha de blob de Git, como GitHub)
let forceConflicts = 0, puts = [];
// Como el GitHub real: tras escribir, las lecturas de /contents pueden devolver la versión anterior un rato
// (réplicas). staleMs > 0 lo simula. Los blobs por sha (/git/blobs/<sha>) son inmutables y siempre exactos.
let staleMs = 0;
const lagged = new Map();           // path -> { old: {content, sha}|null, until }
const blobs = new Map();            // sha -> content(b64)
const view = (path) => { const l = lagged.get(path); if (l && Date.now() < l.until) return l.old; return files.get(path) || null; };
const gitSha = (b64) => { const buf = Buffer.from(b64, 'base64'); return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex'); };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    if (u.hostname !== 'api.github.com') return realFetch(url, init);
    const json = (status, obj) => new Response(JSON.stringify(obj), { status });
    const bm = u.pathname.match(/^\/repos\/[^/]+\/[^/]+\/git\/blobs\/([0-9a-f]{40})$/);
    if (bm) return blobs.has(bm[1]) ? json(200, { sha: bm[1], content: blobs.get(bm[1]), encoding: 'base64' }) : json(404, { message: 'Not Found' });
    const path = decodeURIComponent(u.pathname.replace(/^\/repos\/[^/]+\/[^/]+\/contents\//, ''));
    const method = init.method || 'GET';
    if (method === 'GET') {
        const f = view(path);
        if (f) return json(200, { type: 'file', content: f.content, sha: f.sha });
        const keys = new Set([...files.keys(), ...lagged.keys()]);
        const list = [...keys].map(k => [k, view(k)]).filter(([k, v]) => v && k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/'))
            .map(([k, v]) => ({ type: 'file', name: k.slice(path.length + 1), path: k, sha: v.sha }));
        const dirs = new Set([...files.keys()].filter(k => k.startsWith(path + '/') && k.slice(path.length + 1).includes('/')).map(k => k.slice(path.length + 1).split('/')[0]));
        for (const d of dirs) list.push({ type: 'dir', name: d, path: path + '/' + d });
        return list.length ? json(200, list) : json(404, {});     // las carpetas vacías no existen en Git
    }
    const body = JSON.parse(init.body);
    const cur = files.get(path);
    if (method === 'PUT') {
        if (forceConflicts > 0 && path === 'leaderboard.json') { forceConflicts--; return json(409, {}); }
        if (cur && body.sha !== cur.sha) return body.sha ? json(409, { message: `is at ${cur.sha} but expected ${body.sha}` }) : json(422, { message: 'Invalid request.\n\n"sha" wasn\'t supplied.' });
        if (!cur && body.sha) return json(404, {});
        const sha = gitSha(body.content);
        if (staleMs) lagged.set(path, { old: cur || null, until: Date.now() + staleMs });
        files.set(path, { content: body.content, sha }); blobs.set(sha, body.content); puts.push(path);
        return json(200, { content: { sha } });
    }
    if (method === 'DELETE') { if (!cur) return json(404, {}); if (body.sha !== cur.sha) return json(409, {}); files.delete(path); return json(200, {}); }
    return json(405, {});
};
const readJson = (path) => JSON.parse(Buffer.from(files.get(path).content, 'base64').toString('utf8'));

const env = { GITHUB_TOKEN: 't', GITHUB_REPO: 'o/r', GITHUB_BRANCH: 'main', SESSION_SECRET: 'secreto-de-prueba', ALLOWED_ORIGIN: 'https://yo.github.io', ADMIN_USERS: 'Jefe', ADMIN_KEY: 'llave-maestra' };
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
ok(r.json.user.avatar === 'fa-fox', 'registro: el emoji 🦊 de un cliente antiguo se guarda como fa-fox');
const ana = r.json.token;
ok(files.has('users/ana_01/account.json') && files.has('users/ana_01/progress.json') && files.has('leaderboard.json'), 'se crea la carpeta users/ana_01/ y leaderboard.json en el repo');
ok(!files.has('users/ana_01.json'), 'ya no hay un único archivo por usuario');
ok(!JSON.stringify(r.json).includes('hash'), 'la respuesta no filtra hash ni sal');
r = await call('POST', '/api/register', { name: 'ANA_01', password: 'otra-clave' }); ok(r.status === 409, 'nombre duplicado (sin distinguir mayúsculas) → 409');
r = await call('POST', '/api/register', { name: 'a b', password: 'secreta1' }); ok(r.status === 400, 'nombre inválido → 400');
r = await call('POST', '/api/register', { name: 'admin', password: 'secreta1' }); ok(r.status === 400, 'nombre reservado → 400');
r = await call('POST', '/api/register', { name: 'Pepe', password: '123' }); ok(r.status === 400, 'contraseña corta → 400');
r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' }); ok(r.status === 200 && r.json.token, 'login correcto (otra capitalización)');
const e1 = (await call('POST', '/api/login', { name: 'ana_01', password: 'mal' }));
const e2 = (await call('POST', '/api/login', { name: 'noexiste', password: 'mal' }));
ok(e1.status === 401 && e1.json.error === 'Contraseña incorrecta.', 'contraseña errónea → 401');
ok(e2.status === 404 && /No existe ninguna cuenta/.test(e2.json.error), 'login con cuenta inexistente → 404 «no existe en el servidor»');
r = await call('POST', '/api/login', { name: 'a b', password: 'mal' }); ok(r.status === 404, 'nombre con formato inválido tampoco existe → 404');
ok(!files.has('users/noexiste/account.json'), 'un login fallido no crea nada en el repo');
r = await call('GET', '/api/session', null, ana); ok(r.status === 200 && r.json.user.name === 'Ana_01', 'session con token válido');
r = await call('GET', '/api/session', null, ana.slice(0, -3) + 'AAA'); ok(r.status === 401, 'token manipulado → 401');
r = await call('GET', '/api/session'); ok(r.status === 401, 'sin token → 401');
const [pl] = ana.split('.'); const forged = Buffer.from(JSON.stringify({ u: 'x', n: 'ana_01', v: 1, exp: Date.now() + 1e6 })).toString('base64url');
r = await call('GET', '/api/session', null, forged + '.' + ana.split('.')[1]); ok(r.status === 401, 'payload falsificado con firma ajena → 401');
const exp = Buffer.from(JSON.stringify({ u: 'x', n: 'ana_01', v: 1, exp: Date.now() - 1 })).toString('base64url');
r = await call('GET', '/api/session', null, exp + '.zzz'); ok(r.status === 401, 'token caducado → 401');

r = await call('PUT', '/api/data', { data: data(1234) }, ana); ok(r.status === 200 && r.json.updatedAt > 0, 'PUT data');
{ // estructura de carpetas
    const names = [...files.keys()].filter(k => k.startsWith('users/ana_01/')).map(k => k.split('/')[2]).sort();
    ok(JSON.stringify(names) === JSON.stringify(['account.json', 'achievements.json', 'history.json', 'progress.json', 'saves.json', 'settings.json', 'stats.json']), 'carpeta de usuario con account/progress/stats/achievements/history/settings/saves: ' + names.join(','));
    ok(readJson('users/ana_01/stats.json').snake.bestScore === 1234, 'stats.json contiene las estadísticas');
    ok(JSON.stringify(readJson('users/ana_01/achievements.json')) === JSON.stringify({ a: 1, b: 2 }), 'achievements.json contiene los logros');
    ok(readJson('users/ana_01/progress.json').xp.level === 3 && readJson('users/ana_01/progress.json').updatedAt > 0, 'progress.json contiene XP/nivel y updatedAt');
    const acc = readJson('users/ana_01/account.json');
    ok(acc.name === 'Ana_01' && acc.hash && acc.salt && !acc.xp && !acc.stats && !acc.data, 'account.json sólo tiene perfil y credenciales');
    puts = []; await call('PUT', '/api/data', { data: { ...data(1234), history: [{ game: 'snake', at: 1 }] } }, ana);
    ok(puts.filter(p => p.startsWith('users/')).sort().join() === 'users/ana_01/history.json,users/ana_01/progress.json', 'un guardado sólo reescribe los archivos que cambian: ' + puts.join(','));
    r = await call('GET', '/api/session', null, ana); ok(r.json.data.history.length === 1 && r.json.data.stats.snake.bestScore === 1234 && r.json.data.achievements.b === 2, 'session reconstruye los datos desde los archivos');
    r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' }); ok(r.json.data.xp.level === 3 && r.json.data.history.length === 1, 'login devuelve los datos reconstruidos');
}
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
{ // Pasapalabra: las marcas por dificultad de cada jugador llegan al ranking global
    const d = data(50, 9); d.stats.pasapalabra = { played: 3, wins: 2, bestScore: 4100, bestTime: 90, bestStreak: 2, extra: { perfects: 1 },
        byMode: { daily: { played: 1, wins: 1, bestScore: 2500, bestTime: 120 }, pro: { played: 2, wins: 1, bestScore: 4100, bestTime: 90 } } };
    await call('PUT', '/api/data', { data: d }, b);
    r = await call('GET', '/api/leaderboard');
    const bp = r.json.players.find(p => p.name === 'Beto');
    ok(bp.stats.pasapalabra && bp.stats.pasapalabra.byMode.pro.bestScore === 4100 && bp.stats.pasapalabra.byMode.daily.wins === 1, 'ranking global incluye Pasapalabra por modo');
    ok(!r.json.players.find(p => p.name === 'Ana_01').stats.pasapalabra, 'quien no ha jugado no aparece en el ranking de ese juego');
}

forceConflicts = 2; r = await call('PUT', '/api/data', { data: data(77, 4) }, b);
ok(r.status === 200, 'conflicto de escritura en ranking reintentado');
r = await call('GET', '/api/leaderboard'); ok(r.json.players.find(p => p.name === 'Beto').level === 4, 'tras el reintento el ranking está actualizado');

r = await call('PATCH', '/api/profile', { avatar: 'es-knight', color: '#4b8dff' }, b); ok(r.status === 200 && r.json.user.avatar === 'es-knight', 'PATCH profile con id de avatar');
r = await call('PATCH', '/api/profile', { avatar: '🐼' }, b); ok(r.status === 200 && r.json.user.avatar === 'fa-panda', 'avatar emoji antiguo → id equivalente');
r = await call('PATCH', '/api/profile', { avatar: '../../etc/passwd' }, b); ok(r.status === 200 && r.json.user.avatar === 'nx-nexo', 'avatar desconocido → avatar por defecto');

r = await call('POST', '/api/password', { current: 'mal', next: 'nueva-clave' }, b); ok(r.status === 401, 'cambio de contraseña con actual errónea → 401');
r = await call('POST', '/api/password', { current: 'secreta2', next: 'nueva-clave' }, b); ok(r.status === 200 && r.json.token, 'cambio de contraseña');
const b2 = r.json.token;
r = await call('GET', '/api/session', null, b); ok(r.status === 401, 'token antiguo invalidado tras cambiar contraseña');
r = await call('GET', '/api/session', null, b2); ok(r.status === 200, 'token nuevo válido');
r = await call('POST', '/api/login', { name: 'beto', password: 'nueva-clave' }); ok(r.status === 200, 'login con la contraseña nueva');

r = await call('DELETE', '/api/account', { password: 'mal' }, b2); ok(r.status === 401, 'borrar cuenta con contraseña errónea → 401');
r = await call('DELETE', '/api/account', { password: 'nueva-clave' }, b2); ok(r.status === 200 && ![...files.keys()].some(k => k.startsWith('users/beto/')), 'borrar cuenta elimina TODA su carpeta');
r = await call('GET', '/api/leaderboard'); ok(r.json.players.length === 1, 'la cuenta borrada desaparece del ranking');
r = await call('GET', '/api/session', null, b2); ok(r.status === 401, 'token de cuenta borrada → 401');

r = await call('OPTIONS', '/api/login'); ok(r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === O, 'preflight CORS permitido');
r = await call('POST', '/api/login', { name: 'x', password: 'y' }, null, 'https://malo.example'); ok(r.status === 403, 'origen no permitido → 403');
r = await call('GET', '/api/nada'); ok(r.status === 401 || r.status === 404, 'ruta desconocida');
r = await call('GET', '/api/leaderboard'); ok(r.headers.get('Access-Control-Allow-Origin') === O, 'CORS en respuestas normales');

// ── Lecturas desfasadas de GitHub (réplicas): login seguido de guardar al momento no debe dar 409 ──
{
    staleMs = 1500;
    r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' });
    const t = r.json.token;
    r = await call('PUT', '/api/data', { data: data(4321) }, t);
    ok(r.status === 200, `con lecturas desfasadas, guardar justo tras el login no da 409 (${r.status})`);
    r = await call('PUT', '/api/data', { data: data(5555) }, t);
    ok(r.status === 200, `dos guardados seguidos con lecturas desfasadas no dan 409 (${r.status})`);
    r = await call('PUT', '/api/data', { data: data(6666) }, t);
    ok(r.status === 200 && readJson('users/ana_01/stats.json').snake.bestScore === 6666, 'el último guardado es el que queda');
    r = await call('GET', '/api/session', null, t);
    ok(r.status === 200 && r.json.data.stats.snake.bestScore === 6666, 'la sesión devuelve los datos recién guardados aunque GitHub lea desfasado');
    // Otra instancia del Worker escribió stats.json hace un momento (esta no conoce el sha nuevo y GitHub aún lee el viejo)
    const pth = 'users/ana_01/stats.json', old = files.get(pth);
    const other = Buffer.from(JSON.stringify({ snake: { played: 9, wins: 9, bestScore: 1, bestTime: null, bestStreak: 0, byMode: {} } }, null, 2) + '\n').toString('base64');
    const osha = gitSha(other); files.set(pth, { content: other, sha: osha }); blobs.set(osha, other);
    lagged.set(pth, { old, until: Date.now() + 1500 });
    const t0 = Date.now();
    r = await call('PUT', '/api/data', { data: data(7777) }, t);
    ok(r.status === 200 && readJson(pth).snake.bestScore === 7777, `un cambio hecho por otra instancia tampoco da 409: se usa el sha real que indica GitHub (${r.status}, ${Date.now() - t0} ms)`);
    await new Promise(res => setTimeout(res, 1600));
    staleMs = 0;
}

// ── Administración ──
{
    const jefe = (await call('POST', '/api/register', { name: 'Jefe', password: 'clave-jefe' })).json;
    ok(jefe.user.admin === true, 'la cuenta de ADMIN_USERS se marca como administradora');
    r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' }); ok(!r.json.user.admin, 'una cuenta normal no es administradora');
    const anaTok = r.json.token;
    r = await call('POST', '/api/admin/login', { name: 'Jefe', password: 'clave-jefe', code: '123456' });
    ok(r.status === 403 && r.json.code === 'totp_setup', 'admin: sin Google Authenticator vinculado no se puede entrar');
    r = await call('POST', '/api/admin/totp/setup', { name: 'jefe', password: 'clave-jefe', key: 'otra' }); ok(r.status === 401, 'authenticator: vincular exige la clave de alta');
    r = await call('POST', '/api/admin/totp/setup', { name: 'jefe', password: 'mal', key: 'llave-maestra' }); ok(r.status === 401, 'authenticator: vincular exige la contraseña');
    r = await call('POST', '/api/admin/totp/setup', { name: 'ana_01', password: 'secreta1', key: 'llave-maestra' }); ok(r.status === 401, 'authenticator: una cuenta normal no puede vincularlo');
    r = await call('POST', '/api/admin/totp/setup', { name: 'Jefe', password: 'clave-jefe', key: 'llave-maestra' });
    ok(r.status === 200 && /^[A-Z2-7]{32}$/.test(r.json.secret) && r.json.uri.startsWith('otpauth://totp/Nexus%20Arcade%3AJefe?secret=' + r.json.secret), 'authenticator: genera un secreto y el enlace otpauth para el QR');
    const sec = r.json.secret, setupToken = r.json.setupToken;
    ok(!JSON.stringify(readJson('users/jefe/account.json')).includes('totp'), 'authenticator: nada se guarda hasta confirmar con un código');
    r = await call('POST', '/api/admin/totp/enable', { setupToken, code: '000000' === totp(sec) ? '111111' : '000000' }); ok(r.status === 400, 'authenticator: confirmar con un código erróneo falla');
    r = await call('POST', '/api/admin/totp/enable', { setupToken: setupToken.replace(/.$/, 'A'), code: totp(sec) }); ok(r.status === 400, 'authenticator: token de alta manipulado → rechazado');
    const enableCode = totp(sec);
    r = await call('POST', '/api/admin/totp/enable', { setupToken, code: enableCode }); ok(r.status === 200, 'authenticator: vinculado con el primer código');
    const acc = readJson('users/jefe/account.json');
    ok(acc.totp && acc.totp.ct && !JSON.stringify(acc).includes(sec), 'authenticator: el secreto se guarda cifrado (no en claro)');
    r = await call('POST', '/api/admin/login', { name: 'jefe', password: 'mal', code: totp(sec) }); ok(r.status === 401, 'admin: contraseña errónea → 401');
    r = await call('POST', '/api/admin/login', { name: 'jefe', password: 'clave-jefe', code: '12345' }); ok(r.status === 401 && r.json.code === 'totp_bad', 'admin: código mal formado → 401');
    r = await call('POST', '/api/admin/login', { name: 'jefe', password: 'clave-jefe', code: totp(sec, Date.now(), -3) }); ok(r.status === 401, 'admin: un código de hace minuto y medio ya no vale');
    r = await call('POST', '/api/admin/login', { name: 'ana_01', password: 'secreta1', code: totp(sec) }); ok(r.status === 401, 'admin: una cuenta no administradora no entra aunque tenga un código');
    r = await call('GET', '/api/admin/overview', null, anaTok); ok(r.status === 403, 'admin: un token normal no abre el panel');
    r = await call('POST', '/api/admin/login', { name: 'Jefe', password: 'clave-jefe', code: enableCode });
    ok(r.status === 401, 'admin: el código usado para vincular no sirve para entrar');
    r = await call('POST', '/api/admin/login', { name: 'Jefe', password: 'clave-jefe', code: totp(sec, Date.now(), 1) });
    const firstAdm = r.json.token;
    ok(r.status === 200 && r.json.token && r.json.expiresAt - Date.now() <= 30 * 60000 + 1000, 'admin: acceso con contraseña + código de Google Authenticator (sesión de 30 min)');
    r = await call('POST', '/api/admin/login', { name: 'Jefe', password: 'clave-jefe', code: totp(sec, Date.now(), 1) }); ok(r.status === 401, `admin: el mismo código no se puede usar dos veces (${r.status} ${r.json.error})`);
    r = await call('POST', '/api/admin/login', { name: 'Jefe', password: 'clave-jefe', key: 'llave-maestra' }); ok(r.status === 401, 'admin: la clave de alta ya no sirve para entrar');
    const adm = firstAdm;
    r = await call('GET', '/api/session', null, adm); ok(r.status === 401, 'admin: el token de administrador no sirve como sesión de juego');
    r = await call('GET', '/api/admin/overview', null, adm);
    ok(r.status === 200 && r.json.users.length === 2 && r.json.users.find(u => u.lname === 'ana_01').level === 3 && r.json.users.find(u => u.lname === 'jefe').admin, 'admin: lista de cuentas con estadísticas');
    ok(!JSON.stringify(r.json).includes('"hash"') && !JSON.stringify(r.json).includes('salt'), 'admin: la lista no expone credenciales');
    r = await call('GET', '/api/admin/user?name=ana_01', null, adm);
    ok(r.status === 200 && r.json.account.lastLoginAt > 0 && r.json.data.stats.snake && !JSON.stringify(r.json).includes('salt'), 'admin: ficha de una cuenta con sus estadísticas');
    // Pop-ups
    r = await call('POST', '/api/admin/message', { to: ['ana_01', 'nadie'], title: 'Hola', body: 'x' }, adm); ok(r.status === 400, 'admin: pop-up a una cuenta inexistente → 400');
    r = await call('POST', '/api/admin/message', { to: ['Ana_01'], title: 'Aviso', body: 'Mañana hay torneo', kind: 'warn' }, adm); ok(r.status === 200 && r.json.sent === 1, 'admin: envía un pop-up');
    r = await call('GET', '/api/notices', null, anaTok); ok(r.status === 200 && r.json.messages.length === 1 && r.json.messages[0].title === 'Aviso' && !r.json.maintenance.on, 'el jugador recibe el pop-up');
    const mid = r.json.messages[0].id;
    r = await call('POST', '/api/notices/ack', { ids: [mid] }, anaTok); ok(r.status === 200, 'el jugador marca el pop-up como leído');
    r = await call('GET', '/api/notices', null, anaTok); ok(r.json.messages.length === 0, 'un pop-up leído no se repite');
    r = await call('GET', '/api/admin/overview', null, adm); ok(r.json.messages[0].readAt > 0, 'admin: ve que el pop-up se leyó');
    ok(readJson('admin.json').messages.ana_01.length === 1, 'los pop-ups se guardan en admin.json');
    // Mantenimiento
    r = await call('POST', '/api/admin/maintenance', { on: true, message: 'Volvemos a las 18:00' }, adm); ok(r.status === 200 && r.json.maintenance.on, 'admin: activa el mantenimiento');
    r = await call('GET', '/api/status'); ok(r.json.maintenance.on && r.json.maintenance.message === 'Volvemos a las 18:00' && !r.json.maintenance.by, 'estado público: mantenimiento activo (sin datos del admin)');
    r = await call('GET', '/api/notices', null, anaTok); ok(r.json.maintenance.on, 'los jugadores conectados reciben el mantenimiento');
    r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' }); ok(r.status === 503 && r.json.code === 'maintenance', 'en mantenimiento un jugador no puede entrar');
    r = await call('POST', '/api/register', { name: 'Nuevo', password: 'secreta1' }); ok(r.status === 503, 'en mantenimiento no se pueden crear cuentas');
    r = await call('POST', '/api/login', { name: 'jefe', password: 'clave-jefe' }); ok(r.status === 200, 'en mantenimiento el administrador sí entra');
    r = await call('POST', '/api/admin/maintenance', { on: false }, adm); r = await call('GET', '/api/status'); ok(!r.json.maintenance.on, 'admin: desactiva el mantenimiento');
    // Suspensión
    r = await call('POST', '/api/admin/suspend', { name: 'jefe', reason: 'x' }, adm); ok(r.status === 403, 'admin: no se puede suspender a un administrador');
    r = await call('POST', '/api/admin/suspend', { name: 'ana_01', reason: 'Trampas', days: 7 }, adm); ok(r.status === 200 && r.json.suspended.until > Date.now(), 'admin: suspende 7 días');
    r = await call('GET', '/api/session', null, anaTok); ok(r.status === 403 && r.json.code === 'suspended' && r.json.reason === 'Trampas', 'la sesión abierta de una cuenta suspendida se corta (403 suspended)');
    r = await call('PUT', '/api/data', { data: data(1) }, anaTok); ok(r.status === 403, 'una cuenta suspendida no puede guardar');
    r = await call('GET', '/api/notices', null, anaTok); ok(r.json.suspended && r.json.suspended.reason === 'Trampas', 'los avisos informan de la suspensión');
    r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' }); ok(r.status === 403 && /suspendida/.test(r.json.error) && /Trampas/.test(r.json.error), 'una cuenta suspendida no puede iniciar sesión');
    r = await call('GET', '/api/admin/overview', null, adm); ok(r.json.users.find(u => u.lname === 'ana_01').suspended.reason === 'Trampas', 'admin: la lista marca la cuenta suspendida');
    r = await call('POST', '/api/admin/unsuspend', { name: 'ana_01' }, adm); ok(r.status === 200, 'admin: reactiva la cuenta');
    r = await call('POST', '/api/login', { name: 'ana_01', password: 'secreta1' }); ok(r.status === 200, 'la cuenta reactivada vuelve a entrar');
    r = await call('GET', '/api/session', null, anaTok); ok(r.status === 401, 'las sesiones de antes de suspender siguen cerradas');
    // Eliminación
    await call('POST', '/api/register', { name: 'Borrable', password: 'secreta1' });
    r = await call('POST', '/api/admin/delete', { name: 'borrable', confirm: 'otro' }, adm); ok(r.status === 400, 'admin: borrar exige confirmar con el nombre');
    r = await call('POST', '/api/admin/delete', { name: 'jefe', confirm: 'jefe' }, adm); ok(r.status === 403, 'admin: no se puede borrar a un administrador');
    r = await call('POST', '/api/admin/delete', { name: 'borrable', confirm: 'Borrable' }, adm);
    ok(r.status === 200 && ![...files.keys()].some(k => k.startsWith('users/borrable/')), 'admin: elimina la cuenta y su carpeta');
    r = await call('GET', '/api/leaderboard'); ok(!r.json.players.some(p => p.name === 'Borrable'), 'admin: la cuenta eliminada sale del ranking');
    r = await call('GET', '/api/admin/overview', null, adm);
    const acts = r.json.log.map(l => l.action);
    ok(['login', 'message', 'maintenance-on', 'maintenance-off', 'suspend', 'unsuspend', 'delete'].every(a => acts.includes(a)), 'admin: registro de acciones');
    const fake = Buffer.from(JSON.stringify({ u: 'x', n: 'jefe', v: 1, adm: 1, exp: Date.now() + 1e6 })).toString('base64url');
    r = await call('GET', '/api/admin/overview', null, fake + '.' + adm.split('.')[1]); ok(r.status === 401, 'admin: token de administrador falsificado → 401');
}

let n429 = 0; for (let i = 0; i < 14; i++) { const x = await worker.fetch(new Request('https://api.test/api/login', { method: 'POST', headers: { 'CF-Connecting-IP': '9.9.9.9', Origin: O }, body: JSON.stringify({ name: 'ana_01', password: 'mal' }) }), env); if (x.status === 429) n429++; }
ok(n429 > 0, 'limitador de intentos de login → 429');

console.log(bad ? `\nFALLOS: ${bad}` : '\nRESULT: OK'); process.exit(bad ? 1 : 0);
