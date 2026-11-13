// Hundir la flota: flotas aleatorias válidas y fuerza relativa de los 4 niveles de IA (disparos medios para hundir una flota).
// node tests/battleship_ai_test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;
const reg = [];
const ctx = { Nexus: { util: { esc: String, formatNumber: String }, games: { kit: {}, registry: { register: (d) => reg.push(d) } },
    services: { achievements: { register() {}, counter: () => ({}) } } }, Math, Set, Int8Array, Float64Array };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'src/games/battleship/game.js', 'utf8'), ctx);
const L = ctx.Nexus.games.battleshipLogic;
let bad = 0; const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
let valid = true;
for (let i = 0; i < 300; i++) if (!L.validFleet(L.randomFleet())) valid = false;
check(valid, '300 flotas aleatorias válidas');
check(L.validFleet([{ id: 'carrier', cells: [0, 1, 2, 3, 4] }, { id: 'battleship', cells: [10, 11, 12, 13] }, { id: 'cruiser', cells: [30, 31, 32] }, { id: 'submarine', cells: [50, 51, 52] }, { id: 'destroyer', cells: [70, 71] }]), 'admite barcos pegados');
check(!L.validFleet([{ id: 'carrier', cells: [0, 1, 2, 3, 4] }, { id: 'battleship', cells: [3, 13, 23, 33] }, { id: 'cruiser', cells: [30, 31, 32] }, { id: 'submarine', cells: [50, 51, 52] }, { id: 'destroyer', cells: [70, 71] }]), 'detecta barcos solapados');
let fvalid = true, comps = new Set();
for (let i = 0; i < 300; i++) { const f = L.randomFleet('libre'); if (!L.validFleet(f, 'libre')) fvalid = false; comps.add(f.map(s => s.cells.length).join('-')); }
check(fvalid && comps.size > 20, `libre: 300 flotas válidas de 18 casillas (${comps.size} composiciones distintas)`);
check(L.validFleet([{ id: 's1', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }, { id: 's2', cells: [10, 11, 12, 13, 14, 15, 16, 17] }], 'libre'), 'libre: 10 + 8 casillas pegadas es válido');
check(!L.validFleet([{ id: 's1', cells: [0, 1, 2] }], 'libre'), 'libre: menos de 18 casillas no vale');
check(!L.validFleet([{ id: 's1', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }, { id: 's2', cells: [20, 21, 22, 23, 24, 25, 26, 28] }], 'libre'), 'libre: un barco no recto no vale');
{ const v = new L.View(); v.apply(0, { r: 'sunk', ship: { id: 'destroyer', cells: [0, 1] } }); check(v.k[2] === 0 && v.k[10] === 0 && v.k[11] === 0, 'al hundir no se revela el alrededor'); }
const N = 120, avg = {};
for (const lv of ['easy', 'normal', 'hard', 'master']) {
    let total = 0;
    for (let g = 0; g < N; g++) {
        const b = new L.Board(L.randomFleet()), v = new L.View();
        let shots = 0, over = false;
        while (!over && shots < 100) {
            const i = L.aiPick(v, lv);
            const r = b.receive(i);
            if (!r) throw new Error(`${lv}: disparo repetido o inválido en ${i}`);
            v.apply(i, r); shots++; over = !!r.over;
        }
        total += shots;
    }
    avg[lv] = total / N;
    console.log(`  ${lv}: ${avg[lv].toFixed(1)} disparos de media`);
}
for (const lv of ['easy', 'master']) {
    let total = 0;
    for (let g = 0; g < 60; g++) {
        const b = new L.Board(L.randomFleet('libre')), v = new L.View('libre');
        let shots = 0, over = false;
        while (!over && shots < 100) { const i = L.aiPick(v, lv); const r = b.receive(i); if (!r) throw new Error(`libre ${lv}: disparo repetido en ${i}`); v.apply(i, r); shots++; over = !!r.over; }
        if (!over) throw new Error('libre: la IA no termina');
        total += shots;
    }
    console.log(`  libre ${lv}: ${(total / 60).toFixed(1)} disparos de media`);
}
check(avg.easy > avg.normal && avg.normal > avg.hard && avg.hard > avg.master, 'cada nivel necesita menos disparos que el anterior');
console.log(bad ? `RESULT: ${bad} FALLOS` : 'RESULT: OK');
process.exit(bad ? 1 : 0);
