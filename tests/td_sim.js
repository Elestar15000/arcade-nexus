/* Simulación headless del Tower Defense con un bot (calibración de equilibrio).
   El juego es infinito: se mide hasta qué ronda aguanta el bot.
   Uso: node tests/td_sim.js [K] [bonusK]   (K = TD.BUDGET_K, bonusK = TD.ROUND_BONUS_K) */
global.window = global; global.Nexus = { games: {} };
const path = require('path'); const base = path.join(__dirname, '../src/games/towerdefense');
require(path.join(base, 'data.js')); require(path.join(base, 'engine.js'));
const TD = Nexus.games.td;

function candidates(e) {
    const pts = []; const samp = [];
    for (let d = 0; d < e.path.total; d += 12) samp.push(TD.posAt(e.path, d, 0));
    for (let x = 30; x < TD.W - 20; x += 20) for (let y = 30; y < TD.H - 20; y += 20) {
        if (!e.canPlace('python', x, y, true).ok) continue;
        pts.push({ x, y, s: samp.filter(p => Math.hypot(p.x - x, p.y - y) < 125).length });
    }
    return pts.sort((a, b) => b.s - a.s);
}
function bestSpot(e, type, cands) {
    for (const c of cands) if (e.canPlace(type, c.x, c.y, true).ok) return c;
    return null;
}
// Opción preferida del bot por nivel (0 = A, 1 = B, 2 = híbrida)
const PICKS = { python: [2, 1, 2, 0], java: [0, 2, 1, 2], cpp: [2, 0, 1, 0], rust: [0, 2, 0, 2] };
const ORDER = ['python', 'python', 'cpp', 'java', 'rust', 'cpp', 'python', 'java', 'rust', 'cpp', 'python', 'java', 'cpp', 'python', 'java', 'cpp'];

function run(opts = {}) {
    const e = new TD.Engine({ noFx: true });
    const cands = candidates(e);
    const order = opts.order || ORDER;
    const maxRound = opts.maxRound || 200;
    let placed = 0;
    function nextAction() {
        const want = Math.min(order.length, 3 + Math.floor(e.round / 3));
        if (placed < want) return { k: 'place', type: order[placed] };
        const ts = e.towers.slice().sort((a, b) => a.picks.length - b.picks.length);
        for (const t of ts) if (t.picks.length < TD.MAX_LEVEL) return { k: 'up', t, p: PICKS[t.type][t.picks.length] };
        if (placed < order.length) return { k: 'place', type: order[placed] };
        return null;
    }
    let safety = 0;
    while (!e.over && e.round < maxRound && safety++ < 100000) {
        for (let g = 0; g < 20; g++) {
            const a = nextAction(); if (!a) break;
            if (a.k === 'place') {
                const spot = bestSpot(e, a.type, cands); if (!spot) { placed++; continue; }
                if (e.cash < e.towerCost(a.type)) break;
                e.place(a.type, spot.x, spot.y); placed++;
            } else { if (!e.upgrade(a.t, a.p)) break; }
        }
        if (!e.roundActive) e.startRound();
        for (let i = 0; i < 60 * 5; i++) { e.update(1 / 60); if (e.over) break; }
    }
    return { round: e.round, over: e.over, lives: e.lives, cash: e.cash, towers: e.towers.length, pops: e.stats.pops };
}
module.exports = { run };
if (require.main === module) {
    const [, , K, B] = process.argv;
    if (K) TD.BUDGET_K = parseFloat(K);
    if (B) TD.ROUND_BONUS_K = parseFloat(B);
    const t0 = Date.now(); const r = run();
    console.log(`K=${TD.BUDGET_K} bonusK=${TD.ROUND_BONUS_K} → el bot ${r.over ? 'cae' : 'sigue vivo'} en la ronda ${r.round} · integridad=${r.lives} créditos=${r.cash} torres=${r.towers} amenazas=${r.pops} (${Date.now() - t0}ms)`);
}
