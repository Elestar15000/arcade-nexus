/* ============================================================
   NEXUS ARCADE · games/cardgames/rules-mentiroso.js
   Reglas (puras, sin DOM) del Mentiroso con baraja española de
   40 cartas, de 2 a 4 jugadores:
     · Se reparten todas las cartas. Quien tenga las 4 de un mismo
       número las descarta al momento (ese número queda fuera).
     · Quien abre la ronda pone de 1 a 4 cartas boca abajo y dice
       un número («tres sietes»). Los siguientes, por turno, tienen
       que poner cartas diciendo ese MISMO número… sean verdad o no.
     · En tu turno, antes de jugar, puedes gritar «¡Mentiroso!» a
       la última jugada: se levantan sus cartas. Si alguna no era
       del número dicho, el mentiroso se lleva todo el montón; si
       eran todas verdad, se lo lleva quien acusó. Empieza la ronda
       siguiente quien no se llevó el montón.
     · También puedes pasar. Si todos pasan hasta volver a quien
       jugó lo último, el montón se retira y éste abre otra ronda.
     · Gana el primero que se queda sin cartas… siempre que nadie le
       pille la última mentira: si el siguiente juega o pasa sin
       acusarle, ha ganado.
   ============================================================ */
(function () {
    'use strict';

    const K = Nexus.games.cardCore;
    const { rankOf } = K;
    const PLURAL = { 1: 'ases', 2: 'doses', 3: 'treses', 4: 'cuatros', 5: 'cincos', 6: 'seises', 7: 'sietes', 10: 'sotas', 11: 'caballos', 12: 'reyes' };
    const SING = { 1: 'as', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 10: 'sota', 11: 'caballo', 12: 'rey' };
    const claimText = (count, r) => `${count === 1 ? 'un' : ['', '', 'dos', 'tres', 'cuatro'][count]} ${count === 1 ? SING[r] : PLURAL[r]}`;

    const who = (st, s) => (st.names ? st.names[s] : `Jugador ${s + 1}`);
    function log(st, t) { st.log.push(t); if (st.log.length > 10) st.log.shift(); }
    const next = (st, s) => (s + 1) % st.n;

    /** Descarta los grupos de 4 iguales de una mano. → números descartados. */
    function dropQuads(st, s) {
        const by = {};
        for (const c of st.hands[s]) (by[rankOf(c)] = by[rankOf(c)] || []).push(c);
        const out = [];
        for (const [r, cs] of Object.entries(by)) if (cs.length === 4) { st.hands[s] = st.hands[s].filter(c => rankOf(c) !== Number(r)); st.dead.push(Number(r)); out.push(Number(r)); }
        for (const r of out) log(st, `${who(st, s)} junta los cuatro ${PLURAL[r]} y los descarta.`);
        return out;
    }

    function setup(n, names) {
        const st = { game: 'mentiroso', n, names: names || null, hands: Array.from({ length: n }, () => []), dead: [],
            pile: [], rank: null, last: null, passes: 0, pendingWin: null, reveal: null, discarded: 0,
            phase: 'turn', log: [], pause: 0, over: null, round: 1,
            stats: Array.from({ length: n }, () => ({ calls: 0, goodCalls: 0, lies: 0, caught: 0, picked: 0, bluffWin: false })) };
        const d = K.shuffle(K.deck40());
        let i = 0; while (d.length) { st.hands[i].push(d.pop()); i = next(st, i); }
        for (let s = 0; s < n; s++) dropQuads(st, s);
        st.turnSeat = Math.floor(Math.random() * n);
        log(st, `Se reparten todas las cartas. Abre ${who(st, st.turnSeat)}.`);
        return st;
    }

    const pileCards = (st) => st.pile.reduce((a, p) => a.concat(p.cards), []);

    function validate(st, seat, a) {
        if (!a || st.over || st.phase !== 'turn' || st.turnSeat !== seat) return false;
        if (a.type === 'play') {
            if (!Array.isArray(a.cards) || a.cards.length < 1 || a.cards.length > 4 || new Set(a.cards).size !== a.cards.length) return false;
            if (!a.cards.every(c => st.hands[seat].includes(c))) return false;
            if (st.rank === null) return K.RANKS.includes(Number(a.rank));
            return true;
        }
        if (a.type === 'call') return !!st.last && st.last.seat !== seat;
        if (a.type === 'pass') return st.rank !== null && !!st.last;
        return false;
    }

    function win(st, s, how) {
        st.phase = 'over'; st.turnSeat = null;
        const ranking = [...Array(st.n).keys()].sort((a, b) => (a === s ? -1 : b === s ? 1 : st.hands[a].length - st.hands[b].length));
        st.over = { winners: [s], draw: false, ranking, text: `${who(st, s)} se queda sin cartas y gana${how ? ' ' + how : ''}` };
        log(st, st.over.text + '.');
    }

    function apply(st, seat, a) {
        // Si el anterior se quedó sin cartas y este jugador no le acusa, aquél gana
        if (a.type !== 'call' && st.pendingWin !== null && st.pendingWin !== seat) {
            const p = st.pendingWin, lastLie = st.last && st.last.lie;
            if (lastLie) st.stats[p].bluffWin = true;
            win(st, p, lastLie ? 'con un farol que nadie pilló' : '');
            return;
        }
        if (a.type === 'play') {
            const r = st.rank === null ? Number(a.rank) : st.rank;
            for (const c of a.cards) K.removeCard(st.hands[seat], c);
            const lie = a.cards.some(c => rankOf(c) !== r);
            if (lie) st.stats[seat].lies++;
            if (st.rank === null) { st.rank = r; log(st, `${who(st, seat)} abre ronda con ${claimText(a.cards.length, r)}.`); }
            else log(st, `${who(st, seat)} pone ${claimText(a.cards.length, r)}.`);
            st.pile.push({ seat, cards: a.cards.slice(), count: a.cards.length });
            st.last = { seat, count: a.cards.length, rank: r, lie };
            st.passes = 0;
            if (!st.hands[seat].length) { st.pendingWin = seat; log(st, `¡${who(st, seat)} se ha quedado sin cartas! Si nadie le acusa, gana.`); }
            st.turnSeat = next(st, seat);
            return;
        }
        if (a.type === 'pass') {
            st.passes++;
            log(st, `${who(st, seat)} pasa.`);
            st.turnSeat = next(st, seat);
            if (st.turnSeat === st.last.seat) {
                // Todos han pasado: el montón se retira y abre quien jugó lo último
                st.discarded += pileCards(st).length;
                log(st, `Todos pasan: se retiran ${pileCards(st).length} cartas. Abre ${who(st, st.last.seat)}.`);
                newRound(st, st.last.seat);
            }
            return;
        }
        // ¡Mentiroso!
        const L = st.last, cards = st.pile[st.pile.length - 1].cards.slice();
        const taker = L.lie ? L.seat : seat;
        const all = pileCards(st);
        st.stats[seat].calls++;
        if (L.lie) { st.stats[seat].goodCalls++; st.stats[L.seat].caught++; }
        st.stats[taker].picked += all.length;
        st.hands[taker].push(...all);
        st.pile = [];                                    // el montón pasa entero a la mano de quien lo recoge
        log(st, `${who(st, seat)}: «¡Mentiroso!» · ${L.lie ? `¡Pillado! ${who(st, L.seat)} mentía` : `${who(st, L.seat)} decía la verdad`} y ${who(st, taker)} se lleva ${all.length} carta${all.length === 1 ? '' : 's'}.`);
        const dropped = dropQuads(st, taker);
        st.reveal = { seat: L.seat, caller: seat, cards, rank: L.rank, lie: L.lie, taker, count: all.length, dropped };
        st.phase = 'reveal'; st.turnSeat = null; st.pause = 3000;
        const starter = L.lie ? seat : L.seat;
        st.nextStarter = starter;
        if (!L.lie && st.pendingWin === L.seat) { st.pause = 0; st.phase = 'reveal'; win(st, L.seat, 'tras una acusación falsa'); return; }
        st.pendingWin = null;
    }

    function newRound(st, starter) {
        st.pile = []; st.rank = null; st.last = null; st.passes = 0; st.pendingWin = null; st.round++;
        st.turnSeat = starter; st.phase = 'turn';
        // Si alguien se quedó sin cartas por descartar cuatro iguales al recoger, gana
        const empty = [...Array(st.n).keys()].find(s => !st.hands[s].length);
        if (empty !== undefined) win(st, empty, '');
    }

    function step(st) {
        st.pause = 0;
        if (st.phase !== 'reveal' || st.over) return;
        st.reveal = null;
        newRound(st, st.nextStarter);
    }

    const turn = (st) => (st.phase === 'turn' ? st.turnSeat : null);

    function view(st, seat) {
        const hand = st.hands[seat].slice().sort((a, b) => K.RANKS.indexOf(rankOf(a)) - K.RANKS.indexOf(rankOf(b)) || K.SUITS.indexOf(a[0]) - K.SUITS.indexOf(b[0]));
        const my = st.phase === 'turn' && st.turnSeat === seat;
        return {
            game: 'mentiroso', n: st.n, me: seat, phase: st.phase, turn: turn(st), round: st.round,
            hand, legal: my ? hand : [], rank: st.rank, last: st.last ? { seat: st.last.seat, count: st.last.count, rank: st.last.rank } : null,
            pileCount: pileCards(st).length, plays: st.pile.map(p => ({ seat: p.seat, count: p.count })), dead: st.dead.slice(), discarded: st.discarded,
            canCall: my && !!st.last && st.last.seat !== seat, canPass: my && st.rank !== null && !!st.last, mustOpen: my && st.rank === null,
            pendingWin: st.pendingWin, reveal: st.reveal,
            players: st.hands.map(h => ({ count: h.length, active: true })),
            log: st.log.slice(), over: st.over, stats: st.stats[seat], buttons: []
        };
    }

    // ── Bot ─────────────────────────────────────────────────
    function bot(st, seat) {
        const hand = st.hands[seat];
        const by = {};
        for (const c of hand) (by[rankOf(c)] = by[rankOf(c)] || []).push(c);
        const rnd = Math.random();
        // ¿Acusar?
        if (st.last && st.last.seat !== seat) {
            const L = st.last;
            if (st.pendingWin === L.seat) return { type: 'call' };                     // o acusa o pierde
            const mine = (by[L.rank] || []).length;
            const myPile = st.pile.filter(p => p.seat === seat).reduce((n, p) => n + p.cards.filter(c => rankOf(c) === L.rank).length, 0);
            if (st.dead.includes(L.rank) || L.count + mine + myPile > 4) return { type: 'call' };   // imposible: seguro que miente
            const claimedRound = st.pile.reduce((n, p) => n + p.count, 0);
            let pLie = 0.12 + 0.12 * (L.count - 1) + 0.13 * (mine + myPile) + Math.max(0, claimedRound - 4) * 0.08;
            if (st.hands[L.seat].length <= 2) pLie += 0.2;
            pLie *= st.pile.length > 3 ? 0.75 : 1;                                       // montón grande: más prudente
            const have = (by[st.rank] || []).length;
            if (have) pLie *= 0.6;                                                       // puede seguir sin mentir
            if (rnd < Math.min(0.9, pLie)) return { type: 'call' };
        }
        // Abrir ronda: con el número del que más tiene (verdad)
        if (st.rank === null) {
            const best = Object.entries(by).sort((a, b) => b[1].length - a[1].length || Math.random() - 0.5)[0];
            const cards = best[1].slice(0, 4);
            // Alguna vez cuela una carta de más para soltar
            if (cards.length < 3 && Math.random() < 0.25) { const extra = hand.find(c => !cards.includes(c)); if (extra) cards.push(extra); }
            return { type: 'play', cards, rank: Number(best[0]) };
        }
        const real = by[st.rank] || [];
        if (real.length) {
            const cards = real.slice(0, 4);
            if (cards.length < 4 && hand.length > cards.length && Math.random() < 0.22) { const extra = hand.find(c => rankOf(c) !== st.rank); if (extra) cards.push(extra); }
            return { type: 'play', cards };
        }
        // No tiene ese número: farol o pasar
        const claimedRound = st.pile.reduce((n, p) => n + p.count, 0);
        if (st.last && (claimedRound >= 4 || Math.random() < 0.28)) return { type: 'pass' };
        const singles = Object.values(by).sort((a, b) => a.length - b.length);
        const cards = singles[0].slice(0, Math.random() < 0.3 && singles[0].length > 1 ? 2 : 1);
        return { type: 'play', cards };
    }

    Nexus.games.cardRules = Nexus.games.cardRules || {};
    Nexus.games.cardRules.mentiroso = { id: 'mentiroso', setup, validate, apply, step, view, bot, turn, claimText, PLURAL, SING };
})();
