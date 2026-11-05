// Reglas de Brisca, Guiñote y Chinchón: cientos de partidas bot contra bot (terminan, conservan las 40 cartas,
// los bots sólo hacen jugadas legales, obligaciones del arrastre, cantes, cierre y combinaciones).
// node tests/cardgames_rules_test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname;
const ctx = { Nexus: { games: {} }, Math };
vm.createContext(ctx);
for (const f of ['core', 'rules-tricks', 'rules-chinchon']) vm.runInContext(fs.readFileSync(`${root}src/games/cardgames/${f}.js`, 'utf8'), ctx);
const R = ctx.Nexus.games.cardRules, K = ctx.Nexus.games.cardCore;
let bad = 0; const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };

function play(rules, n, inspect) {
    const st = rules.setup(n);
    let guard = 0;
    while (!st.over && guard++ < 80000) {
        if (st.pause) { rules.step(st); continue; }
        const s = rules.turn(st);
        if (s === null || s === undefined) throw new Error('sin turno en fase ' + st.phase);
        const a = rules.bot(st, s);
        if (!rules.validate(st, s, a)) throw new Error(`${rules.id}: jugada ilegal del bot ${JSON.stringify(a)} en ${st.phase}`);
        if (inspect) inspect(st, s, a);
        rules.apply(st, s, a);
    }
    if (!st.over) throw new Error(rules.id + ': la partida no termina');
    return st;
}
const conserve = (st) => {
    const all = [...st.hands.flat(), ...st.deck, ...(st.muestra ? [st.muestra] : []), ...st.trick.map(t => t.c)];
    return all;
};

// ── Brisca ──
let wins = [0, 0], draws = 0, err = null, ptsOk = true;
try {
    for (let g = 0; g < 400; g++) {
        const st = play(R.brisca, 2, (st) => {
            if (st.phase === 'play' && !st.trick.length) {
                const seen = conserve(st).length + st.tricks.reduce((a, b) => a + b, 0) * 2;
                if (seen !== 40) throw new Error('brisca: no se conservan las cartas (' + seen + ')');
            }
        });
        if (st.pts[0] + st.pts[1] !== 120) ptsOk = false;
        if (st.over.draw) draws++; else wins[st.over.winners[0]]++;
    }
} catch (e) { err = e.message; }
check(!err, 'Brisca: 400 partidas completas sin jugadas ilegales' + (err ? ': ' + err : ''));
check(ptsOk, 'Brisca: siempre se reparten exactamente 120 puntos');
console.log(`  victorias ${wins.join(' / ')}, empates ${draws}`);
// Cambio del 7 / 2 de triunfo
let st = R.brisca.setup(2);
st.muestra = 'o12'; st.trump = 'o'; st.hands[st.turnSeat] = ['o7', 'c1', 'e3']; st.trick = [];
check(R.brisca.swapCard(st, st.turnSeat) === 'o7', 'Brisca: el 7 de triunfo cambia una muestra figura');
st.muestra = 'o5'; st.hands[st.turnSeat] = ['o2', 'c1', 'e3'];
check(R.brisca.swapCard(st, st.turnSeat) === 'o2', 'Brisca: el 2 de triunfo cambia una muestra baja');
check(R.brisca.winning([{ s: 0, c: 'c3' }, { s: 1, c: 'c1' }], 'o').s === 1 && R.brisca.winning([{ s: 0, c: 'c1' }, { s: 1, c: 'o2' }], 'o').s === 1
    && R.brisca.winning([{ s: 0, c: 'c11' }, { s: 1, c: 'c10' }], 'o').s === 0, 'Brisca: as > tres, triunfo gana, caballo > sota');

// ── Guiñote ──
err = null; let sang = 0, hands = 0, arrOk = true;
try {
    for (let g = 0; g < 200; g++) {
        const st = play(R.guinote, 4, (st, s, a) => {
            if (a.type === 'cante') sang++;
            if (a.type === 'play' && st.deck.length === 0 && !st.muestra && st.trick.length) {
                const led = K.suitOf(st.trick[0].c), hand = st.hands[s];
                if (hand.some(c => K.suitOf(c) === led) && K.suitOf(a.card) !== led) arrOk = false;
            }
        });
        hands += st.handNo;
        if (!st.over.winners.length || st.over.winners.some(w => w % 2 !== st.over.winners[0] % 2)) throw new Error('ganadores no son una pareja');
    }
} catch (e) { err = e.message; }
check(!err, 'Guiñote: 200 partidas completas (con vueltas) sin jugadas ilegales' + (err ? ': ' + err : ''));
check(arrOk, 'Guiñote: en el arrastre siempre se asiste al palo');
check(sang > 0, `Guiñote: los bots cantan (${sang} cantes)`);
console.log(`  manos por partida: ${(hands / 200).toFixed(2)}`);
st = R.guinote.setup(4);
st.deck = []; st.muestra = null; st.trump = 'o'; st.phase = 'play';
st.trick = [{ s: 0, c: 'c4' }]; st.turnSeat = 1; st.hands[1] = ['c2', 'c7', 'o3', 'e1'];
check(JSON.stringify(R.guinote.legalCards(st, 1)) === '["c7"]', 'Guiñote arrastre: asistir y montar (sólo el 7 de copas)');
st.hands[1] = ['e2', 'o3', 'o5', 'b1'];
check(JSON.stringify(R.guinote.legalCards(st, 1).sort()) === '["o3","o5"]', 'Guiñote arrastre: sin palo, hay que fallar');
st.trick = [{ s: 0, c: 'c1' }, { s: 1, c: 'c4' }]; st.turnSeat = 2; st.hands[2] = ['e2', 'o3'];
check(R.guinote.legalCards(st, 2).length === 2 && JSON.stringify(R.guinote.legalCards({ ...st, hands: [[], [], ['c2', 'o3'], []] }, 2)) === '["c2"]', 'Guiñote arrastre: si gana el compañero, basta con asistir');
check(R.guinote.winning([{ s: 0, c: 'c11' }, { s: 1, c: 'c10' }], 'o').s === 1 && R.guinote.pts('c10') === 3 && R.guinote.pts('c11') === 2, 'Guiñote: la sota supera al caballo y vale 3');
st = R.guinote.setup(4); st.lastWinner = st.turnSeat; st.trick = []; st.trump = 'o';
st.hands[st.turnSeat] = ['o12', 'o10', 'c12', 'c10', 'e1', 'b2'];
check(JSON.stringify(R.guinote.canteSuits(st, st.turnSeat)) === '["o","c"]', 'Guiñote: cantes de 40 (triunfo) y 20 con rey y sota');

// ── Chinchón ──
const C = R.chinchon;
check(C.best(['o1', 'o2', 'o3', 'c5', 'e5', 'b5', 'c12']).dead === 10, 'Chinchón: escalera + trío, queda un rey (10)');
check(C.best(['o6', 'o7', 'o10', 'o11', 'c1', 'e1', 'b1']).dead === 0, 'Chinchón: el 7 enlaza con la sota');
check(C.isChinchon(['b4', 'b5', 'b6', 'b7', 'b10', 'b11', 'b12']), 'Chinchón: escalera de 7 del mismo palo');
check(C.best(['o1', 'c1', 'e1', 'b1', 'o2', 'o3', 'e7']).dead === 7 || C.best(['o1', 'c1', 'e1', 'b1', 'o2', 'o3', 'e7']).dead === 7, 'Chinchón: elige la mejor combinación (cuarteto vs escalera)');
for (const n of [2, 3, 4]) {
    err = null; let rounds = 0;
    try {
        for (let g = 0; g < 120; g++) {
            const st = play(C, n, (st) => {
                const total = st.hands.flat().length + st.deck.length + st.discard.length;
                if (total !== 40) throw new Error('no se conservan las cartas: ' + total);
            });
            rounds += st.round;
        }
    } catch (e) { err = e.message; }
    check(!err, `Chinchón ${n} jugadores: 120 partidas completas` + (err ? ': ' + err : ''));
    console.log(`  rondas por partida: ${(rounds / 120).toFixed(1)}`);
}
console.log(bad ? `RESULT: ${bad} FALLOS` : 'RESULT: OK');
process.exit(bad ? 1 : 0);
