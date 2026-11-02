// Valida el banco del Pasapalabra: node tests/pasapalabra_bank_test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { Nexus: { games: {} } }; ctx.window = ctx;
vm.runInNewContext(readFileSync(new URL('../src/games/pasapalabra/bank.js', import.meta.url), 'utf8'), ctx);
const B = ctx.Nexus.games.pasapalabraBank;
let bad = 0; const seen = new Set();
const fail = (m) => { console.log('FAIL ' + m); bad++; };
for (const [lv, list] of Object.entries(B.LEVELS)) {
    const per = {};
    for (const q of list) {
        per[q.l] = (per[q.l] || 0) + 1;
        const n = B.norm(q.a), L = B.norm(q.l);
        if (!(q.c ? n.includes(L) : n.startsWith(L))) fail(`${lv} ${q.l}: «${q.a}» no ${q.c ? 'contiene' : 'empieza por'} la letra`);
        if (n.length < 2) fail(`${lv} ${q.a}: demasiado corta`);
        if (seen.has(n)) fail(`respuesta repetida: ${q.a}`); seen.add(n);
        if (!q.d || q.d.length < 12) fail(`${lv} ${q.a}: definición vacía`);
        if (B.norm(q.d).includes(n)) fail(`${lv} ${q.a}: la definición contiene la respuesta`);
    }
    for (const l of B.LETTERS) if (per[l] !== 4) fail(`${lv} ${l}: ${per[l] || 0} definiciones (se esperaban 4)`);
    console.log(`${lv}: ${list.length} definiciones`);
}
console.log(bad ? `\nRESULT: ${bad} FALLOS` : '\nRESULT: OK'); process.exit(bad ? 1 : 0);
