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

// Malas y buenas (a 101): marcador en vivo, idas enteras y vueltas con victoria inmediata
{
    const G = R.guinote;
    const bots = ['bot', 'bot', 'bot', 'bot'];
    let st = G.setup(4, null, bots); st.trump = 'o';
    st.totals = [95, 40]; st.cardTotals = [40, 20]; st.handNo = 2; st.phase = 'trickEnd'; st.trickWinner = 0; st.turnSeat = null;
    st.trick = [{ s: 0, c: 'c1' }, { s: 1, c: 'c4' }, { s: 2, c: 'c5' }, { s: 3, c: 'c6' }];
    G.step(st);
    check(st.phase === 'gameEnd' && st.games[0] === 1 && st.lastGame.win === 0 && G.view(st, 0).score[0] === 106, 'Guiñote vueltas: una pareja de bots que pasa de 50 buenas (con 30 de cartas) gana la partida al instante');
    G.step(st);
    check(st.phase === 'play' && st.handNo === 1 && st.totals.join() === '0,0' && st.gameNo === 2, 'Guiñote: tras ganar una partida empieza la siguiente del coto');
    // Sin 30 de cartas no se sale
    st = G.setup(4, null, bots); st.trump = 'o'; st.totals = [95, 40]; st.cardTotals = [5, 20]; st.handNo = 2; st.phase = 'trickEnd'; st.trickWinner = 0; st.turnSeat = null;
    st.trick = [{ s: 0, c: 'c4' }, { s: 1, c: 'c5' }, { s: 2, c: 'c6' }, { s: 3, c: 'c7' }]; st.pts = [0, 0]; st.cantePts = [12, 0];
    G.step(st);
    check(st.phase === 'play' && st.games[0] === 0, 'Guiñote: sin 30 de cartas no se puede salir aunque se pase de 50 buenas');
    // Pareja con persona: hay que declarar «¡Fuera!»; mal declarado se pierde
    st = G.setup(4, null, ['me', 'bot', 'bot', 'bot']); st.trump = 'o'; st.totals = [95, 40]; st.cardTotals = [40, 20]; st.handNo = 2;
    st.phase = 'trickEnd'; st.trickWinner = 0; st.turnSeat = null; st.trick = [{ s: 0, c: 'c1' }, { s: 1, c: 'c4' }, { s: 2, c: 'c5' }, { s: 3, c: 'c6' }];
    G.step(st);
    check(st.phase === 'play' && st.canFuera === 0 && G.view(st, 0).buttons.some(b => b.action.type === 'fuera'), 'Guiñote vueltas: con una persona en la pareja aparece el botón «¡Fuera!»');
    G.apply(st, 0, { type: 'fuera' });
    check(st.phase === 'gameEnd' && st.lastGame.win === 0, 'Guiñote: «¡Fuera!» bien declarado gana la partida');
    st = G.setup(4, null, ['me', 'bot', 'bot', 'bot']); st.trump = 'o'; st.totals = [60, 40]; st.cardTotals = [40, 20]; st.handNo = 2;
    st.phase = 'trickEnd'; st.trickWinner = 0; st.turnSeat = null; st.trick = [{ s: 0, c: 'c4' }, { s: 1, c: 'c5' }, { s: 2, c: 'c6' }, { s: 3, c: 'c7' }];
    G.step(st); G.apply(st, 0, { type: 'fuera' });
    check(st.phase === 'gameEnd' && st.lastGame.win === 1, 'Guiñote: «¡Fuera!» con la cuenta mal hace perder la partida');
    // Coto: la tercera partida da el coto
    st = G.setup(4, null, bots); st.games = [2, 1]; st.totals = [95, 40]; st.cardTotals = [40, 20]; st.handNo = 2; st.phase = 'trickEnd'; st.trickWinner = 0; st.turnSeat = null;
    st.trick = [{ s: 0, c: 'c1' }, { s: 1, c: 'c4' }, { s: 2, c: 'c5' }, { s: 3, c: 'c6' }]; st.trump = 'o';
    G.step(st);
    check(st.over && JSON.stringify(st.over.winners) === '[0,2]' && st.over.games.join() === '3,1', 'Guiñote: 3 partidas ganan el coto');
    st = G.setup(4); st.trump = 'o';
    st.totals = [0, 0]; st.handNo = 1; st.pts = [95, 0]; st.phase = 'trickEnd'; st.trickWinner = 0; st.turnSeat = null;
    st.trick = [{ s: 0, c: 'c1' }, { s: 1, c: 'c4' }, { s: 2, c: 'c5' }, { s: 3, c: 'c6' }];
    G.step(st);
    check(!st.over && G.view(st, 0).score[0] === 106, 'Guiñote idas: se ve en vivo, pero la mano se juega entera');
    st = G.setup(4, null, bots); st.trump = 'o'; st.handNo = 3; st.totals = [70, 85]; st.pts = [0, 0]; st.cardTotals = [35, 35];
    const s1 = st.turnSeat; st.lastWinner = s1; st.trick = []; st.phase = 'play';
    st.hands[s1] = ['o12', 'o10', 'e2', 'b2', 'c4', 'c5'];
    const sd = s1 % 2; st.totals[sd] = 65;
    G.apply(st, s1, { type: 'cante', suit: 'o' });
    check(st.phase === 'gameEnd' && st.lastGame.win === sd, 'Guiñote vueltas: cantar las 40 para pasar el límite da la partida');
    st = G.setup(4); st.trump = 'o'; st.deck = []; st.muestra = null; st.phase = 'play';
    const s2 = st.turnSeat; st.lastWinner = s2; st.trick = [];
    st.hands[s2] = ['c12', 'c10', 'e2'];
    check(JSON.stringify(G.canteSuits(st, s2)) === '["c"]', 'Guiñote: también se canta en el arrastre');
}

// ── Chinchón ──
const C = R.chinchon;
check(C.best(['o1', 'o2', 'o3', 'c5', 'e5', 'b5', 'c12']).dead === 10, 'Chinchón: escalera + trío, queda un rey (10)');
check(C.best(['o6', 'o7', 'o10', 'o11', 'c1', 'e1', 'b1']).dead === 0, 'Chinchón: el 7 enlaza con la sota');
check(C.isChinchon(['b4', 'b5', 'b6', 'b7', 'b10', 'b11', 'b12']), 'Chinchón: escalera de 7 del mismo palo');
check(C.deck82().length === 82 && new Set(C.deck82()).size === 82, 'Chinchón: mazo doble con 2 comodines (82 cartas distintas)');
check(C.best(['o5', 'o5z', 'c5', 'e7', 'e10', 'e11', 'b1']).melds.every(m => new Set(m.map(c => c[0])).size === m.length || m.every(c => c[0] === m[0][0])), 'Chinchón: los grupos no repiten palo');
{
    const st = C.setup(2, null, ['me', 'me'], { limit: '50' });
    check(st.limit === 50, 'Chinchón: se puede jugar a 50');
    st.phase = 'discard'; st.turnSeat = 0; st.took = null;
    st.hands[0] = ['o1', 'o2', 'o3', 'c5', 'e5', 'b5', 'o4', 'c11'];
    check(C.closeKind(st, 0, 'c11') === 'minus10', 'Chinchón: cierre de −10 con las 7 combinadas');
    st.hands[0] = ['o1', 'o2', 'o3', 'o4', 'c5', 'e5', 'b5', 'o5'];
    check(C.closeKind(st, 0, null) === 'minus25', 'Chinchón: cierre de −25 con las 8 combinadas');
    st.hands[0] = ['o1', 'o2', 'o3', 'c5', 'e5', 'b5', 'c4', 'e6'];
    check(C.closeKind(st, 0, 'c4') === null && C.closeKind(st, 0, 'e6') === 'normal', 'Chinchón: cierre normal sólo con una carta suelta de 5 o menos');
    st.hands[0] = ['o1', 'o2', 'o3', 'c5', 'e5', 'b5', 'o12', 'c2']; st.hands[1] = ['o4', 'e5z', 'b10', 'b11', 'c1', 'e2', 'e3'];
    C.apply(st, 0, { type: 'discard', card: 'o12', close: true });
    check(st.phase === 'ligar' && st.lig.done[1] === false, 'Chinchón: tras un cierre normal se puede ligar');
    const mi = st.lig.melds.findIndex(m => m.cards.includes('o1'));
    C.apply(st, 1, { type: 'ligar', card: 'o4', meld: mi });
    if (st.lig) C.apply(st, 1, { type: 'ligarDone' });
    check(st.scores[1] === 31 && st.scores[0] === 2, 'Chinchón: la carta ligada no suma');
    const s2 = C.setup(2, null, ['bot', 'bot'], {}); s2.deck = []; s2.discard = ['o1', 'c2', 'e3']; s2.phase = 'draw'; s2.turnSeat = 0;
    C.apply(s2, 0, { type: 'draw', from: 'deck' });
    check(s2.drawn === 'o1' && s2.discard.join() === 'e3', 'Chinchón: sin mazo se da la vuelta al montón empezando por la primera que se tiró');
}
check(C.best(['o1', 'c1', 'e1', 'b1', 'o2', 'o3', 'e7']).dead === 7 || C.best(['o1', 'c1', 'e1', 'b1', 'o2', 'o3', 'e7']).dead === 7, 'Chinchón: elige la mejor combinación (cuarteto vs escalera)');
for (const n of [2, 3, 4]) {
    err = null; let rounds = 0;
    try {
        for (let g = 0; g < 120; g++) {
            const st = play(C, n, (st) => {
                // Mazo doble + 2 comodines: 82 cartas y cada una, como mucho, dos veces
                const all = st.hands.filter((h, i) => st.active[i] || st.phase === 'over').flat().concat(st.deck, st.discard);
                const inPlay = st.hands.flat().length + st.deck.length + st.discard.length;
                if (inPlay !== 82) throw new Error('no se conservan las cartas: ' + inPlay);
                const cnt = {}; for (const c of all) { const k = c.replace(/z$/, ''); cnt[k] = (cnt[k] || 0) + 1; if (cnt[k] > 2) throw new Error('carta repetida más de 2 veces: ' + k); }
                st.active.forEach((a, i) => { if (!a && st.scores[i] < st.limit) throw new Error('eliminado sin llegar al límite'); if (a && st.scores[i] >= st.limit) throw new Error('sigue jugando con ' + st.scores[i]); });
            });
            rounds += st.round;
        }
    } catch (e) { err = e.message; }
    check(!err, `Chinchón ${n} jugadores: 120 partidas completas` + (err ? ': ' + err : ''));
    console.log(`  rondas por partida: ${(rounds / 120).toFixed(1)}`);
}
console.log(bad ? `RESULT: ${bad} FALLOS` : 'RESULT: OK');
process.exit(bad ? 1 : 0);
