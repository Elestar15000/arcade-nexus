// Generadores de Sudoku, 2048, Sopa de letras, Crucigrama y Conexiones: node tests/puzzles_logic_test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = {
    console, Math, Date, Set, Map,
    Nexus: {
        util: { esc: (s) => String(s), formatTime: (s) => String(s), formatNumber: (n) => String(n), dayKey: () => '2026-11-09', shuffle: (a) => a },
        games: { kit: {}, registry: { register() {} } },
        services: { achievements: { register() {}, counter: () => ({}) } }
    }
};
ctx.window = ctx;
const load = (f) => vm.runInNewContext(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), ctx, { filename: f });
for (const f of ['src/games/shared/puzzle.js', 'src/games/pasapalabra/bank.js', 'src/games/sudoku/game.js', 'src/games/g2048/game.js',
    'src/games/wordsearch/game.js', 'src/games/crossword/game.js', 'src/games/connections/bank.js', 'src/games/connections/game.js']) load(f);
const G = ctx.Nexus.games, rng = G.seed.rng;
let bad = 0; const fail = (m) => { console.log('FAIL ' + m); bad++; };
const ok = (c, m) => { if (!c) fail(m); };

// ── Sudoku ──
{
    const S = G.sudokuLogic; let t = Date.now(); const clues = {};
    for (const lv of ['facil', 'medio', 'dificil', 'experto', 'diario']) {
        for (let k = 0; k < 4; k++) {
            const g = S.generate(rng(`sd${lv}${k}`), S.LEVELS[lv]);
            ok(S.countSolutions(g.puzzle, 2) === 1, `sudoku ${lv}: solución única`);
            ok(g.puzzle.every((v, i) => !v || v === g.solution[i]), `sudoku ${lv}: pistas coherentes`);
            for (let i = 0; i < 81; i++) ok(!S.PEERS[i].some(p => g.solution[p] === g.solution[i]), 'sudoku: solución válida');
            clues[lv] = (clues[lv] || 0) + g.clues / 4;
        }
    }
    const a = S.generate(rng('dia'), 28), b = S.generate(rng('dia'), 28);
    ok(a.puzzle.join() === b.puzzle.join(), 'sudoku: misma semilla, mismo sudoku');
    console.log('sudoku: pistas medias', Object.entries(clues).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '), `· ${Date.now() - t} ms`);
}
// ── 2048 ──
{
    const L = G.g2048Logic; let id = 100; const nid = () => id++;
    const T = (rows) => rows.flatMap((row, r) => row.map((v, c) => v ? { id: nid(), v, r, c } : null).filter(Boolean));
    let res = L.slide(T([[2, 2, 2, 2], [0, 0, 0, 0], [4, 0, 4, 8], [0, 0, 0, 0]]), 4, 'left', nid);
    const at = (ts, r, c) => (ts.find(t => t.r === r && t.c === c) || {}).v || 0;
    ok(at(res.tiles, 0, 0) === 4 && at(res.tiles, 0, 1) === 4 && at(res.tiles, 0, 2) === 0, '2048: 2 2 2 2 → 4 4');
    ok(at(res.tiles, 2, 0) === 8 && at(res.tiles, 2, 1) === 8 && res.gained === 16, '2048: 4 _ 4 8 → 8 8 (+16)');
    res = L.slide(T([[2, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0]]), 4, 'down', nid);
    ok(at(res.tiles, 3, 0) === 8 && at(res.tiles, 2, 0) === 4, '2048: hacia abajo');
    res = L.slide(T([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 4, 'left', nid);
    ok(!res.moved, '2048: sin movimiento');
    ok(!L.canMove(T([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]), 4), '2048: tablero bloqueado');
    ok(L.canMove(T([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 4]]), 4), '2048: aún se puede mover');
    console.log('2048: OK');
}
// ── Sopa de letras ──
{
    const W = G.wordsearchLogic; let n = 0;
    for (const theme of W.THEMES) for (const lv of Object.keys(W.LV)) {
        const g = W.generate(rng(theme.name + lv), lv, theme); n++;
        ok(g.words.length === W.LV[lv].count, `sopa ${theme.name}/${lv}: ${g.words.length} palabras`);
        for (const p of g.words) {
            const str = Array.from({ length: p.w.length }, (_, k) => g.grid[p.r + p.dr * k][p.c + p.dc * k]).join('');
            ok(str === p.w, `sopa: ${p.w} bien colocada`);
            ok(W.LV[lv].dirs.some(([a, b]) => a === p.dr && b === p.dc), `sopa ${lv}: dirección permitida`);
            ok(W.occurrences(g.grid, p.w) === 1, `sopa: ${p.w} aparece una vez`);
        }
    }
    console.log(`sopa: ${n} sopas OK (${W.THEMES.length} temas × 4 niveles)`);
}
// ── Crucigrama ──
{
    const C = G.crosswordLogic; const sizes = {}; let t = Date.now();
    for (const lv of Object.keys(C.LV)) for (let k = 0; k < 12; k++) {
        const cw = C.build(rng(`cw${lv}${k}`), lv);
        let m; try { m = C.solutionMap(cw); } catch (e) { fail(`crucigrama ${lv}: ${e.message}`); continue; }
        ok(cw.words.length >= C.LV[lv].count - 2, `crucigrama ${lv}: pocas palabras (${cw.words.length})`);
        ok(cw.w <= C.LV[lv].size && cw.h <= C.LV[lv].size, `crucigrama ${lv}: tamaño ${cw.w}×${cw.h}`);
        // Toda secuencia de 2+ letras en la cuadrícula debe ser exactamente una palabra
        const runs = [];
        for (const dir of ['A', 'D']) for (let a = 0; a < (dir === 'A' ? cw.h : cw.w); a++) {
            let run = [];
            const len = dir === 'A' ? cw.w : cw.h;
            for (let b = 0; b <= len; b++) {
                const [y, x] = dir === 'A' ? [a, b] : [b, a];
                if (b < len && m.has(y + ',' + x)) run.push([y, x]);
                else { if (run.length >= 2) runs.push({ dir, r: run[0][0], c: run[0][1], len: run.length }); run = []; }
            }
        }
        const keyOf = (x) => `${x.dir}${x.r},${x.c}:${x.len || x.w.length}`;
        const wordsK = new Set(cw.words.map(keyOf));
        ok(runs.length === cw.words.length && runs.every(x => wordsK.has(keyOf(x))), `crucigrama ${lv}: hay letras sueltas que forman palabras no definidas`);
        // Conectado
        const seen = new Set(), all = [...m.keys()], stack = [all[0]];
        while (stack.length) { const k = stack.pop(); if (seen.has(k)) continue; seen.add(k); const [y, x] = k.split(',').map(Number); for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.has(`${y + dy},${x + dx}`)) stack.push(`${y + dy},${x + dx}`); }
        ok(seen.size === all.length, `crucigrama ${lv}: no está todo conectado`);
        ok(new Set(cw.words.map(w => w.w)).size === cw.words.length, 'crucigrama: palabra repetida');
        ok(cw.words.every(w => w.clue && !G.seed.up(w.clue).replace(/[^A-ZÑ]/g, '').includes(w.w)), 'crucigrama: la definición contiene la respuesta');
        sizes[lv] = (sizes[lv] || 0) + cw.words.length / 12;
    }
    console.log('crucigrama: palabras medias', Object.entries(sizes).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '), `· ${Date.now() - t} ms`);
}
// ── Conexiones ──
{
    const X = G.connectionsLogic, B = G.connectionsBank;
    for (let lv = 0; lv < 4; lv++) ok(B.CATS.filter(c => c.lv === lv).length >= 10, `conexiones: pocas categorías de nivel ${lv}`);
    for (const c of B.CATS) {
        ok(c.words.length >= 4, `conexiones: «${c.name}» tiene menos de 4 palabras`);
        ok(new Set(c.keys).size === c.keys.length, `conexiones: «${c.name}» repite palabra`);
        if (c.hides) ok(c.keys.every(k => c.hides.some(h => k.includes(h))), `conexiones: en «${c.name}» alguna palabra no esconde nada`);
        if (c.palindrome) ok(c.keys.every(k => k === k.split('').reverse().join('')), `conexiones: «${c.name}» no son palíndromos`);
        if (c.anagram) ok(c.keys.every(k => k.split('').sort().join('') === c.anagram.split('').sort().join('')), `conexiones: «${c.name}» no son anagramas`);
    }
    const seen = new Set();
    for (let k = 0; k < 300; k++) {
        const p = X.generate(rng('cx' + k));
        ok(p.tiles.length === 16 && p.groups.length === 4, 'conexiones: 16 palabras en 4 grupos');
        ok(p.groups.map(g => g.lv).join() === '0,1,2,3', 'conexiones: un grupo de cada color');
        seen.add(p.groups.map(g => g.cat).join('-'));
    }
    console.log(`conexiones: ${B.CATS.length} categorías · 300 tableros, ${seen.size} combinaciones distintas`);
}
console.log(bad ? `\nRESULT: ${bad} FALLOS` : '\nRESULT: OK'); process.exit(bad ? 1 : 0);
