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
check(valid, '300 flotas aleatorias válidas (sin tocarse)');
check(!L.validFleet([{ id: 'carrier', cells: [0, 1, 2, 3, 4] }, { id: 'battleship', cells: [10, 11, 12, 13] }, { id: 'cruiser', cells: [30, 31, 32] }, { id: 'submarine', cells: [50, 51, 52] }, { id: 'destroyer', cells: [70, 71] }]), 'detecta barcos que se tocan');
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
check(avg.easy > avg.normal && avg.normal > avg.hard && avg.hard > avg.master, 'cada nivel necesita menos disparos que el anterior');
console.log(bad ? `RESULT: ${bad} FALLOS` : 'RESULT: OK');
process.exit(bad ? 1 : 0);
