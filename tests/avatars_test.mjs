// Catálogo de avatares PNG: manifiesto, equivalencias, Worker e imágenes.
//   node tests/avatars_test.mjs            → las imágenes que falten sólo se avisan
//   node tests/avatars_test.mjs --strict   → exige los dos PNG de cada avatar (para publicar)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--strict');
let bad = 0;
const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/avatars/manifest.js'), 'utf8'), ctx);
const M = ctx.window.Nexus.data.avatars;

// Servicio real, con el manifiesto cargado
ctx.window.Nexus.services = {};
vm.runInContext('var Nexus = window.Nexus;' + fs.readFileSync(path.join(ROOT, 'src/services/avatars.js'), 'utf8'), ctx);
const S = ctx.window.Nexus.services.avatars;

const ids = M.avatars.map(a => a.id);
const cols = new Map(M.collections.map(c => [c.id, c]));
check(new Set(ids).size === ids.length, `ids únicos (${ids.length})`);
check(ids.every(id => S.ID_RE.test(id)), 'ids con el formato <prefijo>-<nombre>');
check(M.avatars.every(a => cols.has(a.collection)), 'cada avatar pertenece a una colección existente');
check(M.avatars.every(a => a.id.startsWith(cols.get(a.collection).prefix + '-')), 'el prefijo del id coincide con el de su colección');
check(M.collections.every(c => /^#[0-9A-Fa-f]{6}$/.test(c.accent)), 'colores de acento válidos');
check(M.collections.every(c => fs.existsSync(path.join(ROOT, 'assets/avatars', c.id))), 'existe una carpeta por colección');
check(ids.includes(M.default), `el avatar por defecto (${M.default}) existe`);
check(Object.values(M.legacy).every(v => ids.includes(v)), 'cada emoji antiguo apunta a un avatar existente');
check(Object.keys(M.legacy).length === 20, 'los 20 emojis de la versión anterior tienen equivalente');
check(new Set(Object.values(M.legacy)).size === 20, 'cada emoji antiguo va a un avatar distinto');

// Servicio
check(S.resolve('fa-fox') === 'fa-fox' && S.resolve('🐼') === 'fa-panda' && S.resolve('🕹') === 'ar-joystick' && S.resolve('🕹️') === 'ar-joystick', 'resolve: ids y emojis (con y sin U+FE0F)');
check(S.resolve(undefined) === M.default && S.resolve('<script>') === M.default, 'resolve: valores desconocidos → por defecto');
check(S.url('es-knight', 512) === 'assets/avatars/estrategia/es-knight-512.png' && S.url('🦊', 100) === 'assets/avatars/fauna/fa-fox-256.png', 'url por tamaño');
check(S.collections().reduce((n, c) => n + c.avatars.length, 0) === ids.length, 'collections() reparte todos los avatares');

// Worker: misma lista y mismas equivalencias
const w = fs.readFileSync(path.join(ROOT, 'backend/worker.js'), 'utf8');
const wIds = (w.match(/const AVATAR_IDS = new Set\(\[([^\]]*)\]\)/) || [, ''])[1].match(/'[^']+'/g)?.map(s => s.slice(1, -1)) || [];
check(wIds.join() === ids.join(), 'el Worker tiene la misma lista de ids (si no: node tools/avatars/export.mjs --sync)');
const wLegacy = JSON.parse((w.match(/const AVATAR_LEGACY = (\{[^\n]*\});/) || [, '{}'])[1]);
check(Object.entries(M.legacy).every(([k, v]) => wLegacy[k.replace(/️/g, '')] === v), 'el Worker tiene las mismas equivalencias de emojis');

// Imágenes: ningún PNG huérfano; los que falten, aviso (o fallo con --strict)
const expected = new Set(M.avatars.flatMap(a => [256, 512].map(s => `${a.collection}/${a.id}-${s}.png`)));
const found = [];
for (const c of M.collections) {
    const dir = path.join(ROOT, 'assets/avatars', c.id);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) found.push(`${c.id}/${f}`);
}
const orphans = found.filter(f => !expected.has(f));
check(!orphans.length, 'sin archivos que no estén en el manifiesto' + (orphans.length ? ': ' + orphans.join(', ') : ''));
const ready = M.avatars.filter(a => [256, 512].every(s => found.includes(`${a.collection}/${a.id}-${s}.png`)));
const half = M.avatars.filter(a => !ready.includes(a) && [256, 512].some(s => found.includes(`${a.collection}/${a.id}-${s}.png`)));
check(!half.length, 'ningún avatar con sólo uno de sus dos tamaños' + (half.length ? ': ' + half.map(a => a.id).join(', ') : ''));
if (STRICT) check(ready.length === ids.length, `todas las imágenes generadas (${ready.length}/${ids.length})`);
else console.log(`INFO imágenes generadas: ${ready.length}/${ids.length} (el resto se ve con el rombo de reserva)`);

console.log(bad ? `\nRESULT: ${bad} FALLO(S)` : '\nRESULT: OK');
process.exit(bad ? 1 : 0);
