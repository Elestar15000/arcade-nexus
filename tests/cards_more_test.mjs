// Póker, Mentiroso y Solitario: reglas puras, botes, partidas completas entre bots e invariantes.
// node tests/cards_more_test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;
const reg = [];
const ctx = {
    Nexus: { util: { esc: String, formatNumber: String, formatTime: String }, games: { registry: { register: (d) => reg.push(d) }, PuzzleGame: class {} },
        services: { achievements: { register() {}, counter: () => ({}) } } },
    Math, Set, Map, JSON, Array, Object, Number, String, console
};
vm.createContext(ctx);
for (const f of ['cardgames/core.js', 'cardgames/french.js', 'cardgames/rules-poker.js', 'cardgames/rules-mentiroso.js', 'solitaire/game.js'])
    vm.runInContext(fs.readFileSync(root + 'src/games/' + f, 'utf8'), ctx, { filename: f });
const { poker: P, mentiroso: M } = ctx.Nexus.games.cardRules;
const S = ctx.Nexus.games.solitaireLogic;
let bad = 0; const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };

// ── Póker: evaluación ──
const E = (cs) => P.evaluate(cs.split(' '));
check(E('S1 S13 S12 S11 S10 H2 D3').name === 'Escalera real', 'escalera real');
check(E('H5 H4 H3 H2 H1 C9 D9').cat === 8 && E('H5 H4 H3 H2 H1 C9 D9').ks[0] === 5, 'escalera de color con As bajo (al cinco)');
check(E('S9 H9 D9 C9 S2 H3 D4').name === 'Póker de nueves', 'póker');
check(E('S9 H9 D9 C4 S4 H4 D2').name === 'Full de nueves y cuatros', 'full (con dos tríos elige el mejor)');
check(E('S2 S7 S9 S11 S13 H13 D13').cat === 5, 'color gana al trío');
check(E('S1 H2 D3 C4 S5 H9 D11').name === 'Escalera al cinco', 'escalera As-5');
check(E('S10 H11 D12 C13 S1 H2 D2').name === 'Escalera al as', 'escalera al as');
check(E('S2 H2 D5 C5 S9 H9 D13').name === 'Doble pareja de nueves y cincos', 'de tres parejas elige las dos mejores');
check(E('S1 H1 D13 C12 S9 H4 D3').v > E('S1 H1 D13 C11 S9 H4 D3').v, 'el kicker decide entre parejas iguales');
check(E('S1 H13 D9 C7 S5 H3 D2').v === E('C1 D13 S9 H7 C5 H3 D2').v, 'manos equivalentes empatan');
const order = ['S2 H5 D7 C9 S11 H3 D4', 'S2 H2 D7 C9 S11 H3 D4', 'S2 H2 D7 C7 S11 H3 D4', 'S2 H2 D2 C9 S11 H3 D4', 'S2 H3 D4 C5 S6 H11 D13', 'S2 S5 S7 S9 S11 H3 D4', 'S2 H2 D2 C9 S9 H3 D4', 'S2 H2 D2 C2 S11 H3 D4', 'S2 S3 S4 S5 S6 H11 D13'];
check(order.every((h, i) => i === 0 || E(h).v > E(order[i - 1]).v), 'orden de las 9 categorías');

// ── Póker: botes secundarios ──
{
    const st = { n: 3, total: [100, 300, 300], dealt: [true, true, true], folded: [false, false, false] };
    const pots = P.pots(st);
    check(pots.length === 2 && pots[0].amount === 300 && pots[0].elig.length === 3 && pots[1].amount === 400 && pots[1].elig.join() === '1,2', 'bote principal y secundario con un all-in corto');
    const st2 = { n: 3, total: [50, 300, 200], dealt: [true, true, true], folded: [true, false, false] };
    const p2 = P.pots(st2);
    check(p2.reduce((a, p) => a + p.amount, 0) === 550 && p2[p2.length - 1].elig.join() === '1' && p2[p2.length - 1].amount === 100, 'lo que nadie cubre vuelve a quien lo apostó; el retirado no opta');
}

// ── Póker: partidas completas entre bots ──
function runPoker(n, maxActions = 20000) {
    const st = P.setup(n, Array.from({ length: n }, (_, i) => 'B' + i), new Array(n).fill('me'));
    let acts = 0, ok = true, illegal = 0;
    while (!st.over && acts < maxActions) {
        if (st.pause) { P.step(st); continue; }
        const t = P.turn(st);
        if (t === null) { ok = false; break; }
        const a = P.bot(st, t);
        if (!P.validate(st, t, a)) { illegal++; break; }
        P.apply(st, t, a); acts++;
        const chips = st.chips.reduce((a, b) => a + b, 0) + st.total.reduce((a, b) => a + b, 0) - (st.phase === 'handEnd' || st.phase === 'over' ? st.total.reduce((a, b) => a + b, 0) : 0);
        if (chips !== P.START * n) { ok = false; console.log('fichas', chips, st.phase); break; }
    }
    return { st, ok: ok && !illegal && !!st.over, acts };
}
for (const n of [2, 3, 4]) {
    let good = 0, hands = 0;
    for (let g = 0; g < 6; g++) { const r = runPoker(n); if (r.ok) good++; hands += r.st.handNo; }
    check(good === 6, `póker ${n} jugadores: 6 partidas de bots terminan sin jugadas ilegales y sin perder fichas (${(hands / 6).toFixed(0)} manos de media)`);
}
{
    // Vista: nadie ve las cartas de otro salvo en el showdown
    const st = P.setup(3, ['A', 'B', 'C']);
    const v = P.view(st, 0);
    check(v.hand.length === 2 && v.players[1].cards === null && v.players[2].cards === null && !JSON.stringify(v).includes(st.hands[1][0] + '","' + st.hands[1][1]), 'vista de póker sin cartas ajenas');
    const t = P.turn(st);
    check(!P.validate(st, (t + 1) % 3, { type: 'call' }), 'no se puede jugar fuera de turno');
    check(!P.validate(st, t, { type: 'raise', to: st.curBet + 1 }), 'no se puede subir menos del mínimo');
    check(P.validate(st, t, { type: 'raise', to: st.chips[t] + st.bet[t] }), 'all-in siempre es válido');
}
{
    // Sin personas en la mesa (sólo bots + una persona que se arruina) la partida termina
    const st = P.setup(3, ['Yo', 'B1', 'B2'], ['me', 'bot', 'bot']);
    st.chips[0] = 0; st.out[0] = true; st.bustOrder.push(0);
    st.phase = 'bet'; st.toAct = 1; st.folded = [true, false, false];
    P.apply(st, 1, { type: 'fold' });
    check(!!st.over && st.over.ranking[st.over.ranking.length - 1] === 0, 'si la persona se queda sin fichas, se acaba la partida (contra la máquina)');
}

// ── Mentiroso ──
function runMent(n) {
    const st = M.setup(n, Array.from({ length: n }, (_, i) => 'B' + i));
    let acts = 0, illegal = 0, cardsOk = true;
    while (!st.over && acts < 6000) {
        if (st.pause) { M.step(st); continue; }
        const t = M.turn(st);
        const a = M.bot(st, t);
        if (!M.validate(st, t, a)) { illegal++; console.log('ilegal', JSON.stringify(a)); break; }
        M.apply(st, t, a); acts++;
        const inHands = st.hands.reduce((x, h) => x + h.length, 0), inPile = st.pile.reduce((x, p) => x + p.cards.length, 0);
        if (inHands + inPile + st.discarded + st.dead.length * 4 !== 40) { cardsOk = false; break; }
    }
    return { st, ok: !!st.over && !illegal && cardsOk, acts };
}
for (const n of [2, 3, 4]) {
    let good = 0, acts = 0;
    for (let g = 0; g < 40; g++) { const r = runMent(n); if (r.ok) good++; acts += r.acts; }
    check(good === 40, `mentiroso ${n} jugadores: 40 partidas de bots terminan, sin jugadas ilegales y sin perder cartas (${(acts / 40).toFixed(0)} jugadas de media)`);
}
{
    const st = M.setup(3, ['A', 'B', 'C']);
    st.hands = [['o1', 'c1', 'e5'], ['b7', 'o7'], ['c3', 'c4']]; st.turnSeat = 0; st.rank = null; st.last = null; st.pile = []; st.dead = []; st.discarded = 40 - 7;
    check(!M.validate(st, 0, { type: 'play', cards: ['o1'] }), 'al abrir hay que decir un número');
    check(!M.validate(st, 0, { type: 'pass' }), 'quien abre no puede pasar');
    M.apply(st, 0, { type: 'play', cards: ['o1', 'e5'], rank: 1 });
    const v = M.view(st, 1);
    check(v.last.count === 2 && v.last.rank === 1 && !JSON.stringify(v).includes('e5'), 'los demás ven cuántas cartas y qué se dice, no cuáles');
    check(M.validate(st, 1, { type: 'call' }) && !M.validate(st, 0, { type: 'call' }), 'sólo los demás pueden acusar');
    M.apply(st, 1, { type: 'call' });
    check(st.reveal.lie && st.hands[0].length === 3 && st.reveal.taker === 0, '¡Mentiroso! acertado: el mentiroso se lleva el montón');
    M.step(st);
    check(st.turnSeat === 1 && st.rank === null, 'abre quien acusó bien');
    M.apply(st, 1, { type: 'play', cards: ['b7'], rank: 7 });
    M.apply(st, 2, { type: 'call' });
    check(!st.reveal.lie && st.hands[2].length === 3, 'acusación falsa: se lo lleva quien acusa');
    M.step(st);
    check(st.turnSeat === 1, 'abre quien decía la verdad');
    M.apply(st, 1, { type: 'play', cards: ['o7'], rank: 7 });
    check(st.pendingWin === 1, 'quien se queda sin cartas está a punto de ganar');
    M.apply(st, 2, { type: 'pass' });
    check(st.over && st.over.winners[0] === 1, 'si el siguiente no acusa, gana');
}
{
    const st = M.setup(2, ['A', 'B']);
    st.dead = [];
    st.hands = [['o2', 'c2', 'e2'], ['b2', 'o3']]; st.turnSeat = 0; st.rank = null; st.last = null; st.pile = [];
    M.apply(st, 0, { type: 'play', cards: ['o2', 'c2'], rank: 2 });
    M.apply(st, 1, { type: 'call' });                         // verdad: B se lleva o2 c2 y junta los cuatro doses con b2… le falta e2
    check(st.hands[1].length === 4 && !st.reveal.lie, 'recoger el montón');
    M.step(st);
    M.apply(st, 0, { type: 'play', cards: ['e2'], rank: 2 });
    M.apply(st, 1, { type: 'call' });                         // verdad otra vez: B se lleva e2 y ya tiene los cuatro doses
    check(st.dead.includes(2) && !st.hands[1].some(c => c.endsWith('2') && c.length === 2), 'al juntar los cuatro iguales se descartan');
}

// ── Solitario ──
const rng = (seed) => { let a = seed >>> 0; const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.shuffle = (arr) => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }; return r; };
{
    const st = S.deal(rng(7));
    check(st.tab.map(c => c.length).join() === '1,2,3,4,5,6,7' && st.stock.length === 24 && st.tab.every(c => c.filter(x => x.up).length === 1 && c[c.length - 1].up), 'reparto de Klondike (28 en mesa, 24 en el mazo)');
    const all = new Set([...st.stock, ...st.tab.flat().map(x => x.c)]);
    check(all.size === 52, '52 cartas distintas');
    const a = JSON.stringify(S.deal(rng(99))), b = JSON.stringify(S.deal(rng(99)));
    check(a === b, 'mismo reparto con la misma semilla (solitario diario)');
}
{
    const st = { stock: [], waste: [], found: { S: [], H: [], D: [], C: [] }, tab: [[{ c: 'S13', up: true }, { c: 'H12', up: true }], [], [{ c: 'C3', up: false }, { c: 'D11', up: true }], [{ c: 'H1', up: true }], [], [], []], score: 0, moves: 0, recycles: 0 };
    check(S.canMove(st, { from: 'tab', col: 2, idx: 1 }, { to: 'tab', col: 0 }) === false, 'no se puede poner rojo sobre rojo');
    check(S.canMove(st, { from: 'tab', col: 0, idx: 0 }, { to: 'tab', col: 1 }), 'una pila que empieza por rey va a un hueco');
    check(!S.canMove(st, { from: 'tab', col: 2, idx: 1 }, { to: 'tab', col: 1 }), 'en un hueco sólo cabe un rey');
    check(S.canMove(st, { from: 'tab', col: 3, idx: 0 }, { to: 'found' }), 'el as sube a la fundación');
    S.move(st, { from: 'tab', col: 3, idx: 0 }, { to: 'found' });
    check(st.found.H.length === 1 && st.score === 10, '+10 por subir a la fundación');
    st.tab[2][1] = { c: 'S11', up: true };
    S.move(st, { from: 'tab', col: 2, idx: 1 }, { to: 'tab', col: 0 });
    check(st.tab[2][0].up && st.score === 15 && st.tab[0].length === 3, 'al destapar una carta se da la vuelta sola (+5)');
    check(S.bestTarget(st, { from: 'tab', col: 0, idx: 0 }) === null, 'tocar un rey que ya está al fondo no lo mueve a otro hueco');
}
{
    // Juego automático con pistas: invariante de 52 cartas y algunas partidas resueltas
    let solved = 0, ok = true;
    for (let g = 0; g < 60 && ok; g++) {
        const st = S.deal(rng(1000 + g));
        let guard = 0, idle = 0;
        while (!S.won(st) && guard++ < 3000) {
            const h = S.hint(st);
            if (!h) break;
            if (h.draw) { S.draw(st, 1); if (++idle > 60) break; continue; }
            idle = 0; S.move(st, h.src, h.dst);
            const n = st.stock.length + st.waste.length + Object.values(st.found).reduce((a, f) => a + f.length, 0) + st.tab.reduce((a, c) => a + c.length, 0);
            if (n !== 52) { ok = false; break; }
        }
        if (S.won(st)) solved++;
    }
    check(ok, 'el juego automático nunca pierde ni duplica cartas');
    check(solved > 0, `las pistas resuelven algunos repartos sin ayuda (${solved}/60)`);
}

check(reg.some(g => g.id === 'solitaire'), 'el solitario se registra');
console.log(bad ? `\nFALLOS: ${bad}` : '\nRESULT: OK');
process.exit(bad ? 1 : 0);
