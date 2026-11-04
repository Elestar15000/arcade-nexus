// Prueba del motor de ajedrez: perft (conteos de referencia), reglas especiales, SAN, FEN y búsqueda.
// node tests/chess_engine_test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;
const ctx = { Nexus: { games: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'src/games/chess/engine.js', 'utf8'), ctx);
const C = ctx.Nexus.games.ChessCore();
let bad = 0;
const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
function perft(pos, d) {
    if (d === 0) return 1;
    let n = 0;
    for (const m of pos.gen(false)) { if (!pos.make(m)) continue; n += perft(pos, d - 1); pos.unmake(); }
    return n;
}
const cases = [
    [C.START, 4, 197281],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],   // Kiwipete
    ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
    ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
    ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379]
];
for (const [fen, d, want] of cases) {
    const pos = C.Position.fromFen(fen);
    const t = Date.now(), got = perft(pos, d);
    check(got === want, `perft(${d}) ${fen.split(' ')[0].slice(0, 22)}… = ${got} (esperado ${want}, ${Date.now() - t} ms)`);
    check(pos.fen() === C.Position.fromFen(fen).fen() && pos.key() === C.Position.fromFen(fen).key(), '  deshacer deja la posición y el hash intactos');
}
// FEN ida y vuelta
check(C.Position.fromFen(C.START).fen() === C.START, 'FEN inicial ida y vuelta');
// Mate del pastor
let pos = C.replay(C.START, ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6']);
const mate = pos.fromUci('h5f7');
check(pos.san(mate) === 'Dxf7#', 'SAN en español: Dxf7#');
pos.make(mate);
const st = pos.status();
check(st.over && st.result === '1-0' && st.reason === 'mate', 'detecta jaque mate');
// Ahogado
pos = C.Position.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
check(pos.status().reason === 'stalemate', 'detecta ahogado');
// Material insuficiente
check(C.Position.fromFen('8/8/4k3/8/8/2B5/4K3/8 w - - 0 1').status().reason === 'material', 'rey y alfil contra rey: tablas');
// Triple repetición
pos = C.replay(C.START, ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
check(pos.status().reason === 'repetition', 'triple repetición');
// Enroque y al paso en SAN
pos = C.replay(C.START, ['e2e4', 'a7a6', 'e4e5', 'd7d5']);
check(pos.san(pos.fromUci('e5d6')) === 'exd6', 'captura al paso: exd6');
pos = C.replay(C.START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6']);
check(pos.san(pos.fromUci('e1g1')) === 'O-O', 'enroque corto: O-O');
// Desambiguación
pos = C.Position.fromFen('4k3/8/8/8/8/8/4K3/R6R w - - 0 1');
check(pos.san(pos.fromUci('a1d1')) === 'Tad1', 'desambiguación por columna: Tad1');
// Búsqueda: encuentra el mate en 1 y en 2
pos = C.Position.fromFen('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
check(C.search(pos, { depth: 3, time: 2000 }).move === 'd1d8', 'IA: mate del pasillo en 1');
pos = C.Position.fromFen('r1b1kb1r/pppp1ppp/5q2/4n3/3KP3/2N3PN/PPP4P/R1BQ1B1R b kq - 0 1');
const r = C.search(pos, { depth: 5, time: 3000 });
check(r.score > 25000, `IA: ve un mate forzado (${r.move}, ${r.score})`);
pos = C.Position.fromFen('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1');
const t = Date.now(); const r2 = C.search(pos, { depth: 10, time: 1500 });
check(Date.now() - t < 2500 && r2.depth >= 4, `IA: respeta el tiempo (${Date.now() - t} ms, profundidad ${r2.depth}, ${r2.nodes} nodos)`);
console.log(bad ? `RESULT: ${bad} FALLOS` : 'RESULT: OK');
process.exit(bad ? 1 : 0);
