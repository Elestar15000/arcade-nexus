// Valida todas las salas del Escape Room: node tests/escape_rooms_test.mjs
// · referencias correctas (objetos, cosas, candados, pistas)
// · cada sala tiene una ruta completa hasta la salida
// · las salas diarias se generan y se pueden resolver durante un año entero
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { Nexus: { games: {} }, console }; ctx.window = ctx;
for (const f of ['engine', 'rooms-medio', 'rooms-dificil', 'rooms-imposible', 'daily'])
    vm.runInNewContext(readFileSync(new URL(`../src/games/escape/${f}.js`, import.meta.url), 'utf8'), ctx);
const E = ctx.Nexus.games.escapeEngine, R = ctx.Nexus.games.escapeRooms, D = ctx.Nexus.games.escapeDaily;
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const ids = new Set();
for (const lv of ['medio', 'dificil', 'imposible']) {
    if (R[lv].length !== 10) fail(`${lv}: ${R[lv].length} salas (se esperaban 10)`);
    let steps = 0;
    for (const room of R[lv]) {
        if (ids.has(room.id)) fail('id repetido ' + room.id); ids.add(room.id);
        for (const e of E.lint(room)) fail(`${room.id}: ${e}`);
        const s = E.solve(room);
        if (!s.ok) fail(`${room.id}: no se puede escapar (${s.reason})`);
        else steps += s.path.length;
        const locks = room.objs.filter(o => o.lock).length;
        if (locks < 1) fail(`${room.id}: sin candados`);
    }
    console.log(`${lv}: 10 salas OK · ${(steps / 10).toFixed(1)} acciones mínimas de media`);
}
// Ejemplo de ruta
console.log('  ruta i8: ' + E.solve(R.imposible[7]).path.join(' → '));
// Diarias: las 10 plantillas, 365 días
const tpls = new Set();
for (let d = 0; d < 365; d++) {
    const dt = new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10);
    const room = D.build(dt);
    tpls.add(room.tpl);
    for (const e of E.lint(room)) { fail(`diaria ${dt}: ${e}`); break; }
    const s = E.solve(room);
    if (!s.ok) fail(`diaria ${dt} (plantilla ${room.tpl}): sin salida (${s.reason})`);
    const again = D.build(dt);
    if (JSON.stringify(again.objs.map(o => o.lock && o.lock.ans)) !== JSON.stringify(room.objs.map(o => o.lock && o.lock.ans))) fail(`diaria ${dt}: no es determinista`);
}
if (tpls.size !== 10) fail(`plantillas diarias usadas: ${tpls.size}`);
const a = D.build('2026-11-09'), b = D.build('2026-11-19');
if (a.tpl !== b.tpl || JSON.stringify(a.objs.map(o => o.lock && o.lock.ans)) === JSON.stringify(b.objs.map(o => o.lock && o.lock.ans))) fail('la misma plantilla en días distintos debería cambiar sus códigos');
console.log(`diarias: 365 días OK · ${tpls.size} plantillas`);
// Reglas del motor
const r = R.medio[0], st = E.newState(r);
if (E.tryLock(r, st, 'escritorio', '000').ok) fail('motor: un código erróneo abre');
if (!E.tryLock(r, st, 'escritorio', '945').ok || !st.inv.includes('lupa')) fail('motor: el código correcto no da la lupa');
if (E.useItem(r, st, 'puerta', 'lupa').ok) fail('motor: la lupa no debería abrir la puerta');
if (!E.checkAnswer({ k: 'word', ans: 'Kukulkán' }, ' kukulkan ')) fail('motor: normalización de palabras');
if (!E.checkAnswer({ k: 'dirs', ans: ['U', 'L'] }, ['U', 'L']) || E.checkAnswer({ k: 'dirs', ans: ['U', 'L'] }, ['L', 'U'])) fail('motor: flechas');
console.log(bad ? `\nRESULT: ${bad} FALLOS` : '\nRESULT: OK'); process.exit(bad ? 1 : 0);
