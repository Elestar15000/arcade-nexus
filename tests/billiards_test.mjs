// Billar (bola 8): física, reglas y CPU.  node tests/billiards_test.mjs
import fs from 'node:fs'; import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;
const ctx = { Nexus: { games: {} }, Math, JSON, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'src/games/billiards/logic.js', 'utf8'), ctx);
const L = ctx.Nexus.games.billiardsLogic;
let bad = 0; const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };

// Rack
const st0 = L.newGame(42, 0, 2);
const ns = st0.balls.map(b => b.n);
check(ns.length === 16 && new Set(ns).size === 16, 'rack: blanca + 15 bolas distintas');
const apex = st0.balls.reduce((a, b) => b.n && b.x < a.x ? b : a, { x: 1e9 });
check(apex.n === 1, 'rack: la 1 en el vértice');
const cx = st0.balls.filter(b => b.n).reduce((s, b) => s + b.x, 0) / 15;
check(Math.abs(st0.balls[8].y - L.MID_Y) < 0.01 && Math.abs(st0.balls[8].x - (L.FOOT_X + 2 * (2 * L.R + 0.15) * Math.sqrt(3) / 2)) < 0.01, 'rack: la 8 en el centro');
check(JSON.stringify(L.rack(7)) === JSON.stringify(L.rack(7)), 'rack determinista con la misma semilla (online)');

// Física: conservación aproximada y que todo se pare
{
    const sim = L.run(L.createSim(st0.balls, { a: 0, p: 1 }));
    check(sim.done && sim.t < 15 && sim.balls.every(b => b.vx === 0 && b.vy === 0), `saque: todo se para (${sim.t.toFixed(1)} s)`);
    check(sim.balls.every(b => b.in || (b.x >= L.R - 0.5 && b.x <= L.W - L.R + 0.5 && b.y >= L.R - 0.5 && b.y <= L.H - L.R + 0.5)), 'saque: ninguna bola fuera de la mesa');
    let overlap = false;
    for (let i = 0; i < 16; i++) for (let k = i + 1; k < 16; k++) { const a = sim.balls[i], b = sim.balls[k]; if (!a.in && !b.in && Math.hypot(a.x - b.x, a.y - b.y) < 2 * L.R - 0.3) overlap = true; }
    check(!overlap, 'saque: ninguna bola solapada al acabar');
    const s2 = L.run(L.createSim(st0.balls, { a: 0, p: 1 }));
    check(JSON.stringify(s2.balls) === JSON.stringify(sim.balls), 'física determinista (mismo tiro → mismo resultado)');
}
const setup = (list, cue, extra = {}) => {
    const st = L.newGame(1, 0, 2);
    st.balls.forEach(b => { b.in = b.n !== 0; });
    for (const [n, x, y] of list) { const b = st.balls[n]; b.in = false; b.x = x; b.y = y; }
    st.balls[0].x = cue[0]; st.balls[0].y = cue[1];
    return Object.assign(st, { breakShot: false, ballInHand: false, kitchen: false }, extra);
};
const shootAt = (st, n, p = 0.35, pocket) => {
    const c = st.balls[0], t = st.balls[n];
    let a = Math.atan2(t.y - c.y, t.x - c.x);
    if (pocket !== undefined) { const P = L.POCKETS[pocket]; const d = Math.hypot(P.ax - t.x, P.ay - t.y); const gx = t.x - (P.ax - t.x) / d * 2 * L.R, gy = t.y - (P.ay - t.y) / d * 2 * L.R; a = Math.atan2(gy - c.y, gx - c.x); }
    const sim = L.run(L.createSim(st.balls, { a, p }));
    return { sim, res: L.judge(st, sim) };
};
// Tiro recto a tronera de esquina: entra
{
    const st = setup([[3, 900, 400], [12, 300, 100]], [700, 200]);
    const { res } = shootAt(st, 3, 0.4, 5);
    check(res.potted.includes(3) && !res.foul && res.assigned === 'solids' && res.keep && st.groups[0] === 'solids' && st.groups[1] === 'stripes' && st.turn === 0, 'tiro a tronera: entra, asigna lisas y sigue tirando');
}
// Falta: tocar primero una del rival
{
    const st = setup([[3, 500, 100], [12, 500, 250]], [200, 250], { groups: ['solids', 'stripes'] });
    const { res } = shootAt(st, 12, 0.4);
    check(res.foul === 'wrong' && st.turn === 1 && st.ballInHand, 'falta: primero bola rival → bola en mano para el rival');
}
// Falta: no tocar nada
{
    const st = setup([[3, 500, 100]], [200, 250], { groups: ['solids', 'stripes'] });
    const sim = L.run(L.createSim(st.balls, { a: Math.PI / 2 + 0.3, p: 0.3 }));
    const res = L.judge(st, sim);
    check(res.foul === 'nohit' && st.turn === 1, 'falta: la blanca no toca ninguna bola');
}
// Falta: blanca dentro
{
    const st = setup([[3, 500, 100]], [60, 60], { groups: ['solids', 'stripes'] });
    const sim = L.run(L.createSim(st.balls, { a: Math.atan2(-60, -60), p: 0.3 }));
    const res = L.judge(st, sim);
    check(res.foul === 'scratch' && st.ballInHand && !st.balls[0].in, 'falta: blanca dentro → vuelve a la mesa y bola en mano');
}
// Falta: ninguna banda
{
    const st = setup([[3, 500, 250]], [400, 250], { groups: ['solids', 'stripes'] });
    const { res } = shootAt(st, 3, 0.12);
    check(res.foul === 'norail', 'falta: ninguna bola toca banda tras el golpe');
}
// La 8: ganar y perder
{
    const st = setup([[8, 900, 400]], [700, 200], { groups: ['solids', 'stripes'] });
    const { res } = shootAt(st, 8, 0.4, 5);
    check(res.win && st.over && st.winner === 0 && st.reason === 'eight', 'meter la 8 con el grupo limpio: gana');
    const st2 = setup([[8, 900, 400], [2, 300, 300]], [700, 200], { groups: ['solids', 'stripes'] });
    const r2 = shootAt(st2, 8, 0.4, 5).res;
    check(r2.lose && st2.winner === 1 && ['eightEarly', 'eightFoul'].includes(st2.reason), 'meter la 8 antes de tiempo: pierde');
    check(L.legalTargets(setup([[8, 900, 400]], [0, 0], { groups: ['solids', 'stripes'] })).join() === '8', 'sin bolas propias, la objetivo es la 8');
}
// Saque: la 8 vuelve a su sitio
{
    const st = setup([[8, 900, 400]], [700, 200], { breakShot: true });
    const { res } = shootAt(st, 8, 0.4, 5);
    check(res.eightBreak && !st.over && !st.balls[8].in, 'la 8 en el saque vuelve a la mesa');
}
// Práctica
{
    const st = L.newGame(3, 0, 1); st.balls.forEach(b => { b.in = b.n !== 0 && b.n !== 4; });
    st.balls[4].x = 900; st.balls[4].y = 400; st.balls[0].x = 700; st.balls[0].y = 200; st.breakShot = false;
    const { res } = shootAt(st, 4, 0.4, 5);
    check(res.win && st.over && st.reason === 'cleared', 'práctica: mesa limpia al meter la última');
}
// CPU: partidas completas entre niveles (terminan y los niveles altos son mejores)
const play = (la, lb, seed) => {
    const st = L.newGame(seed, seed % 2, 2), r = L.rng(seed * 7 + 1); let n = 0;
    while (!st.over && n < 300) {
        const sh = L.aiShot(st, st.turn === 0 ? la : lb, r);
        if (sh.place) { const c = st.balls[0]; c.in = false; c.x = sh.place.x; c.y = sh.place.y; }
        L.judge(st, L.run(L.createSim(st.balls, sh))); n++;
    }
    return { st, n };
};
let ok = 0, mw = 0;
for (let s = 1; s <= 8; s++) { const { st } = play('master', 'easy', s); if (st.over) ok++; if (st.winner === 0) mw++; }
check(ok === 8, 'CPU contra CPU: todas las partidas terminan');
check(mw >= 6, `Maestro gana a Fácil casi siempre (${mw}/8)`);
{
    const st = setup([[3, 900, 400]], [700, 200], { groups: ['solids', 'stripes'] });
    const sh = L.aiShot(st, 'master', L.rng(3));
    const r = L.tryShot(st, sh);
    check(r.ok, 'CPU Maestro mete un tiro sencillo');
    const bih = setup([[3, 600, 300], [12, 300, 120]], [100, 100], { groups: ['solids', 'stripes'], ballInHand: true });
    const s2 = L.aiShot(bih, 'hard', L.rng(5));
    check(s2.place && L.freeSpot(bih.balls, s2.place.x, s2.place.y, false), 'CPU con bola en mano coloca la blanca en un sitio libre');
}
console.log(bad ? `\nFALLOS: ${bad}` : '\nRESULT: OK'); process.exit(bad ? 1 : 0);
