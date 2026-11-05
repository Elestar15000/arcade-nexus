/* ============================================================
   NEXUS ARCADE · games/cardgames/rules-tricks.js
   Reglas (puras, sin DOM) de los juegos de bazas con baraja
   española: Brisca (1 contra 1) y Guiñote (4 jugadores, por
   parejas 2 contra 2). Comparten el motor de bazas:
     · Se reparte, se vuelve una carta («muestra») que marca el
       triunfo y queda bajo el mazo; tras cada baza se roba
       empezando por quien la gana.
     · Gana la baza el triunfo más alto o, si no hay, la carta más
       alta del palo de salida.
   Brisca: 3 cartas, sin obligación de asistir; el 7 de triunfo se
     cambia por la muestra si es as, tres o figura, y el 2 si es
     4, 5, 6 o 7. 120 puntos: gana quien pasa de 60.
   Guiñote: 6 cartas; orden As, 3, Rey, Sota, Caballo, 7…2; cantes
     (Rey + Sota: 20, o 40 en triunfo) y cambio del 7 tras ganar
     una baza mientras queda mazo; en el arrastre hay que asistir,
     montar y fallar; 10 de últimas. Se juegan manos (las vueltas)
     sumando puntos hasta que una pareja pasa de 100.
   ============================================================ */
(function () {
    'use strict';

    const K = Nexus.games.cardCore;
    const { suitOf, rankOf } = K;

    const CFG = {
        brisca: {
            id: 'brisca', handSize: 3, teams: false, cantes: false, arrastre: false, lastBonus: 0, target: 0,
            order: [1, 3, 12, 11, 10, 7, 6, 5, 4, 2], pts: { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 }
        },
        guinote: {
            id: 'guinote', handSize: 6, teams: true, cantes: true, arrastre: true, lastBonus: 10, target: 101,
            order: [1, 3, 12, 10, 11, 7, 6, 5, 4, 2], pts: { 1: 11, 3: 10, 12: 4, 10: 3, 11: 2 }
        }
    };
    const SUITW = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };

    function make(cfg) {
        const strength = (c) => 10 - cfg.order.indexOf(rankOf(c));
        const pts = (c) => cfg.pts[rankOf(c)] || 0;
        const side = (st, s) => (cfg.teams ? s % 2 : s);
        const sides = (n) => (cfg.teams ? 2 : n);

        /** Carta (y asiento) que gana ahora mismo la baza. */
        function winning(trick, trump) {
            let best = trick[0];
            for (const t of trick.slice(1)) {
                const bs = suitOf(best.c), ts = suitOf(t.c);
                if (ts === bs && strength(t.c) > strength(best.c)) best = t;
                else if (ts === trump && bs !== trump) best = t;
            }
            return best;
        }
        const beats = (card, cur, trump) => winning([cur, { s: -1, c: card }], trump).s === -1;

        function log(st, text) { st.log.push(text); if (st.log.length > 8) st.log.shift(); }

        function deal(st) {
            const d = K.shuffle(K.deck40());
            st.hands = Array.from({ length: st.n }, () => []);
            for (let k = 0; k < cfg.handSize; k++) for (let i = 0; i < st.n; i++) st.hands[(st.dealer + 1 + i) % st.n].push(d.pop());
            st.muestra = d.shift();                  // boca arriba, debajo del mazo: se roba la última
            st.trump = suitOf(st.muestra);
            st.deck = d;
            st.trick = []; st.lastTrick = null; st.trickWinner = null; st.lastWinner = null;
            st.pts = new Array(sides(st.n)).fill(0);
            st.cantePts = new Array(sides(st.n)).fill(0);
            st.sung = {};
            st.tricks = new Array(sides(st.n)).fill(0);
            st.turnSeat = (st.dealer + 1) % st.n;
            st.phase = 'play';
            log(st, `Mano ${st.handNo}: triunfo de ${SUITW[st.trump]} (${K.cardName(st.muestra)}).`);
        }

        function setup(n, names) {
            const st = { game: cfg.id, n, names: names || null, dealer: Math.floor(Math.random() * n), handNo: 1, log: [], pause: 0, over: null,
                totals: new Array(sides(n)).fill(0), stats: Array.from({ length: n }, () => ({ cantes: 0, sang40: false, swaps: 0, tricks: 0 })) };
            deal(st);
            return st;
        }

        const inArrastre = (st) => cfg.arrastre && st.deck.length === 0 && !st.muestra;

        function legalCards(st, seat) {
            const hand = st.hands[seat];
            if (st.phase !== 'play' || st.turnSeat !== seat) return [];
            if (!st.trick.length || !inArrastre(st)) return hand.slice();
            const led = suitOf(st.trick[0].c), cur = winning(st.trick, st.trump);
            const partner = cfg.teams && side(st, cur.s) === side(st, seat);
            const same = hand.filter(c => suitOf(c) === led);
            if (same.length) {
                if (partner) return same;
                const higher = same.filter(c => beats(c, cur, st.trump));
                return higher.length ? higher : same;
            }
            if (partner) return hand.slice();
            const winTrumps = hand.filter(c => suitOf(c) === st.trump && beats(c, cur, st.trump));
            return winTrumps.length ? winTrumps : hand.slice();
        }

        /** ¿Puede cambiar el 7 (o el 2 en la Brisca) de triunfo por la muestra? Devuelve la carta o null. */
        function swapCard(st, seat) {
            if (st.phase !== 'play' || st.turnSeat !== seat || st.trick.length || !st.muestra || !st.deck.length) return null;
            if (cfg.id === 'guinote' && st.lastWinner !== seat) return null;
            const m = rankOf(st.muestra);
            const need = [1, 3, 10, 11, 12].includes(m) ? 7 : (cfg.id === 'brisca' && [4, 5, 6, 7].includes(m) ? 2 : 0);
            const c = st.trump + need;
            return need && st.hands[seat].includes(c) ? c : null;
        }

        /** Palos que puede cantar (Rey + Sota en la mano) tras ganar la baza anterior. */
        function canteSuits(st, seat) {
            if (!cfg.cantes || st.phase !== 'play' || st.turnSeat !== seat || st.trick.length || st.lastWinner !== seat || !st.deck.length) return [];
            if (st.cantedThisTrick) return [];
            const h = st.hands[seat], sd = side(st, seat);
            return K.SUITS.filter(s => h.includes(s + 12) && h.includes(s + 10) && !st.sung[sd + s])
                .sort((a, b) => (b === st.trump) - (a === st.trump));
        }

        function validate(st, seat, a) {
            if (!a || st.over) return false;
            if (a.type === 'play') return legalCards(st, seat).includes(a.card);
            if (a.type === 'swap') return !!swapCard(st, seat);
            if (a.type === 'cante') return canteSuits(st, seat).includes(a.suit);
            return false;
        }

        const who = (st, seat) => (st.names ? st.names[seat] : `Jugador ${seat + 1}`);

        function apply(st, seat, a) {
            if (a.type === 'swap') {
                const c = swapCard(st, seat);
                K.removeCard(st.hands[seat], c);
                st.hands[seat].push(st.muestra);
                log(st, `${who(st, seat)} cambia el ${K.cardName(c)} por la muestra.`);
                st.muestra = c; st.stats[seat].swaps++;
                return;
            }
            if (a.type === 'cante') {
                const sd = side(st, seat), v = a.suit === st.trump ? 40 : 20;
                st.sung[sd + a.suit] = true; st.cantedThisTrick = true;
                st.cantePts[sd] += v; st.stats[seat].cantes++; if (v === 40) st.stats[seat].sang40 = true;
                st.lastCante = { seat, suit: a.suit, v, at: Date.now() };
                log(st, `🎵 ${who(st, seat)} canta las ${v} en ${SUITW[a.suit]}.`);
                return;
            }
            K.removeCard(st.hands[seat], a.card);
            st.trick.push({ s: seat, c: a.card });
            if (st.trick.length < st.n) { st.turnSeat = (seat + 1) % st.n; return; }
            const w = winning(st.trick, st.trump).s;
            st.trickWinner = w; st.phase = 'trickEnd'; st.turnSeat = null; st.pause = 1250;
        }

        function draw(st) {
            if (st.deck.length) return st.deck.pop();
            if (st.muestra) { const m = st.muestra; st.muestra = null; return m; }
            return null;
        }

        function step(st) {
            st.pause = 0;
            if (st.phase === 'trickEnd') {
                const w = st.trickWinner, sd = side(st, w);
                const p = st.trick.reduce((s, t) => s + pts(t.c), 0);
                st.pts[sd] += p; st.tricks[sd]++; st.stats[w].tricks++;
                st.lastTrick = st.trick; st.trick = []; st.trickWinner = null; st.cantedThisTrick = false;
                const last = st.hands.every(h => !h.length) && !st.deck.length && !st.muestra;
                if (last && cfg.lastBonus) { st.pts[sd] += cfg.lastBonus; log(st, `${who(st, w)} se lleva las últimas (+${cfg.lastBonus}).`); }
                else if (p >= 10) log(st, `${who(st, w)} gana la baza (${p} puntos).`);
                if (!last) for (let k = 0; k < st.n; k++) { const c = draw(st); if (c) st.hands[(w + k) % st.n].push(c); }
                if (last) { endHand(st); return; }
                if (inArrastre(st) && !st.arrastreLogged) { st.arrastreLogged = true; if (cfg.arrastre) log(st, '⚠️ Se acabó el mazo: arrastre (hay que asistir, montar y fallar).'); }
                st.lastWinner = w; st.turnSeat = w; st.phase = 'play';
                return;
            }
            if (st.phase === 'handEnd') {
                st.handNo++; st.dealer = (st.dealer + 1) % st.n; st.arrastreLogged = false;
                deal(st);
            }
        }

        function endHand(st) {
            const S = sides(st.n);
            const hand = st.pts.map((p, i) => p + st.cantePts[i]);
            if (!cfg.target) {
                // Brisca: una mano, gana quien pasa de 60
                st.phase = 'over'; st.turnSeat = null;
                const best = Math.max(...st.pts);
                const draw_ = st.pts.filter(p => p === best).length > 1;
                const winners = draw_ ? [] : [st.pts.indexOf(best)];
                st.over = { winners, draw: draw_, scores: st.pts.slice(), text: draw_ ? `Empate a ${best} puntos` : `${who(st, winners[0])} gana con ${best} puntos` };
                log(st, st.over.text + '.');
                return;
            }
            for (let i = 0; i < S; i++) st.totals[i] += hand[i];
            st.lastHand = { pts: st.pts.slice(), cantes: st.cantePts.slice(), hand };
            const over = st.totals.map((t, i) => [t, i]).filter(([t]) => t >= cfg.target);
            if (over.length) {
                const win = st.totals[0] === st.totals[1] ? (st.tricks[0] ? 0 : 1) : (st.totals[0] > st.totals[1] ? 0 : 1);
                st.phase = 'over'; st.turnSeat = null;
                const seats = []; for (let s = 0; s < st.n; s++) if (side(st, s) === win) seats.push(s);
                st.over = { winners: seats, draw: false, scores: st.totals.slice(), text: `Gana la pareja ${win === 0 ? 'A' : 'B'} (${st.totals[win]} a ${st.totals[1 - win]})` };
                log(st, st.over.text + '.');
            } else {
                st.phase = 'handEnd'; st.turnSeat = null; st.pause = 4200;
                log(st, `Fin de la mano: ${st.totals[0]} – ${st.totals[1]}. Nadie pasa de 100: ¡de vueltas!`);
            }
        }

        function view(st, seat) {
            const legal = legalCards(st, seat);
            const buttons = [];
            const sw = swapCard(st, seat);
            if (sw) buttons.push({ label: `🔄 Cambiar ${K.cardName(sw)} por la muestra`, action: { type: 'swap' } });
            for (const s of canteSuits(st, seat)) buttons.push({ label: `🎵 Cantar las ${s === st.trump ? 40 : 20} (${SUITW[s]})`, action: { type: 'cante', suit: s }, kind: 'primary' });
            return {
                game: cfg.id, n: st.n, me: seat, teams: cfg.teams, phase: st.phase, turn: st.turnSeat, handNo: st.handNo,
                hand: K.sortHand(st.hands[seat], st.trump), legal, buttons,
                trump: st.trump, muestra: st.muestra, deck: st.deck.length + (st.muestra ? 1 : 0),
                trick: st.trick.slice(), trickWinner: st.trickWinner, lastTrick: st.lastTrick,
                players: st.hands.map((h, i) => ({ count: h.length, side: side(st, i) })),
                pts: st.pts.slice(), cantes: st.cantePts.slice(), totals: st.totals.slice(), target: cfg.target, tricks: st.tricks.slice(),
                lastCante: st.lastCante || null, lastHand: st.lastHand || null, arrastre: inArrastre(st),
                log: st.log.slice(), over: st.over, stats: st.stats[seat], mySide: side(st, seat)
            };
        }

        // ── Bot ─────────────────────────────────────────────
        function bot(st, seat) {
            const cs = canteSuits(st, seat);
            if (cs.length) return { type: 'cante', suit: cs[0] };
            if (swapCard(st, seat)) return { type: 'swap' };
            const legal = legalCards(st, seat), trump = st.trump;
            const cost = (c) => pts(c) * 10 + (suitOf(c) === trump ? 45 + strength(c) : strength(c));
            const cheapest = (list) => list.slice().sort((a, b) => cost(a) - cost(b))[0];
            if (!st.trick.length) {
                // Salida: la carta que menos duele perder (evita triunfos y ases)
                return { type: 'play', card: cheapest(legal) };
            }
            const cur = winning(st.trick, trump);
            const trickPts = st.trick.reduce((s, t) => s + pts(t.c), 0);
            const lastToPlay = st.trick.length === st.n - 1;
            const partner = cfg.teams && side(st, cur.s) === side(st, seat);
            if (partner) {
                // Si mi compañero gana y es seguro, cargo puntos sin gastar triunfos
                const safe = lastToPlay || suitOf(cur.c) === trump || strength(cur.c) >= 9;
                const loads = legal.filter(c => suitOf(c) !== trump && pts(c) > 0);
                if (safe && loads.length) return { type: 'play', card: loads.sort((a, b) => pts(b) - pts(a))[0] };
                return { type: 'play', card: cheapest(legal) };
            }
            const winners = legal.filter(c => beats(c, cur, trump));
            if (winners.length) {
                const w = cheapest(winners);
                const usesTrump = suitOf(w) === trump && suitOf(cur.c) !== trump;
                if (!usesTrump || trickPts >= 10 || (lastToPlay && trickPts >= 4) || st.deck.length < 4) return { type: 'play', card: w };
            }
            return { type: 'play', card: cheapest(legal) };
        }

        const turn = (st) => (st.phase === 'play' ? st.turnSeat : null);

        return { id: cfg.id, cfg, setup, validate, apply, step, view, bot, turn, legalCards, winning, pts, strength, swapCard, canteSuits };
    }

    Nexus.games.cardRules = Nexus.games.cardRules || {};
    Nexus.games.cardRules.brisca = make(CFG.brisca);
    Nexus.games.cardRules.guinote = make(CFG.guinote);
})();
