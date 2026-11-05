/* ============================================================
   NEXUS ARCADE · games/cardgames/rules-chinchon.js
   Reglas (puras, sin DOM) del Chinchón, de 2 a 4 jugadores, con
   baraja española de 40 cartas (sin comodines):
     · 7 cartas por jugador. En tu turno robas (del mazo o la carta
       de arriba del descarte) y descartas una.
     · Combinaciones: grupos de 3 o 4 cartas del mismo número y
       escaleras de 3 o más del mismo palo (… 6, 7, sota, caballo,
       rey: el 7 enlaza con la sota).
     · Puedes cerrar al descartar si lo que no combina suma 5 o
       menos. Cerrar con todo combinado: −10. Siete cartas en
       escalera del mismo palo: ¡Chinchón! y ganas la partida.
     · Los demás suman lo que no combinan (figuras 10, el resto su
       número). Quien pasa de 100 queda eliminado; gana el último.
     · Si en 40 turnos por jugador nadie cierra, la ronda es nula.
   ============================================================ */
(function () {
    'use strict';

    const K = Nexus.games.cardCore;
    const { suitOf, rankOf, RANKS } = K;
    const LIMIT = 100, CLOSE_MAX = 5, NULL_TURNS = 40;
    const value = (c) => (rankOf(c) <= 7 ? rankOf(c) : 10);
    const idx = (c) => RANKS.indexOf(rankOf(c));

    /** Mejor forma de combinar una mano: { melds: [[cartas]], dead: puntos sueltos, loose: [cartas] }. */
    function best(cards) {
        const cand = [];
        const byRank = {};
        for (const c of cards) (byRank[rankOf(c)] = byRank[rankOf(c)] || []).push(c);
        for (const g of Object.values(byRank)) {
            if (g.length >= 3) {
                if (g.length === 4) { cand.push(g.slice()); for (let k = 0; k < 4; k++) cand.push(g.filter((_, i) => i !== k)); }
                else cand.push(g.slice());
            }
        }
        for (const s of K.SUITS) {
            const run = cards.filter(c => suitOf(c) === s).sort((a, b) => idx(a) - idx(b));
            for (let i = 0; i < run.length; i++) {
                let j = i;
                while (j + 1 < run.length && idx(run[j + 1]) === idx(run[j]) + 1) j++;
                for (let a = i; a <= j; a++) for (let b = a + 2; b <= j; b++) cand.push(run.slice(a, b + 1));
                i = j;
            }
        }
        let bestR = { melds: [], dead: cards.reduce((s, c) => s + value(c), 0), loose: cards.slice() };
        const order = cards.slice();
        const go = (i, used, melds, dead) => {
            if (dead >= bestR.dead) return;
            while (i < order.length && used.has(order[i])) i++;
            if (i >= order.length) { bestR = { melds: melds.map(m => m.slice()), dead, loose: order.filter(c => !melds.some(m => m.includes(c))) }; return; }
            const c = order[i];
            for (const m of cand) {
                if (!m.includes(c) || m.some(x => used.has(x))) continue;
                m.forEach(x => used.add(x)); melds.push(m);
                go(i + 1, used, melds, dead);
                melds.pop(); m.forEach(x => used.delete(x));
            }
            used.add(c); go(i + 1, used, melds, dead + value(c)); used.delete(c);
        };
        go(0, new Set(), [], 0);
        return bestR;
    }

    const isChinchon = (cards) => cards.length === 7 && cards.every(c => suitOf(c) === suitOf(cards[0])) &&
        cards.map(idx).sort((a, b) => a - b).every((v, i, a) => i === 0 || v === a[i - 1] + 1);

    function log(st, text) { st.log.push(text); if (st.log.length > 8) st.log.shift(); }
    const who = (st, s) => (st.names ? st.names[s] : `Jugador ${s + 1}`);
    const nextActive = (st, s) => { for (let k = 1; k <= st.n; k++) { const t = (s + k) % st.n; if (st.active[t]) return t; } return s; };

    function deal(st) {
        const d = K.shuffle(K.deck40());
        st.hands = Array.from({ length: st.n }, () => []);
        for (let k = 0; k < 7; k++) for (let i = 0; i < st.n; i++) if (st.active[i]) st.hands[i].push(d.pop());
        st.discard = [d.pop()];
        st.deck = d;
        st.turnSeat = nextActive(st, st.dealer);
        st.phase = 'draw'; st.took = null; st.turns = 0;
        st.roundResult = null;
        log(st, `Ronda ${st.round}: reparte ${who(st, st.dealer)}.`);
    }

    function setup(n, names) {
        const st = { game: 'chinchon', n, names: names || null, active: new Array(n).fill(true), scores: new Array(n).fill(0), dealer: Math.floor(Math.random() * n),
            round: 1, log: [], pause: 0, over: null, stats: Array.from({ length: n }, () => ({ closes: 0, minus10: 0, chinchon: false })) };
        deal(st);
        return st;
    }

    function canClose(st, seat, card) {
        if (st.phase !== 'discard' || st.turnSeat !== seat) return false;
        const rest = st.hands[seat].filter(c => c !== card);
        return rest.length === 7 && (isChinchon(rest) || best(rest).dead <= CLOSE_MAX);
    }
    const closeOptions = (st, seat) => st.hands[seat].filter(c => c !== st.took && canClose(st, seat, c));

    function validate(st, seat, a) {
        if (!a || st.over || st.turnSeat !== seat) return false;
        if (a.type === 'draw') return st.phase === 'draw' && (a.from === 'deck' || (a.from === 'discard' && st.discard.length > 0));
        if (a.type === 'discard') {
            if (st.phase !== 'discard' || !st.hands[seat].includes(a.card) || a.card === st.took) return false;
            return !a.close || canClose(st, seat, a.card);
        }
        return false;
    }

    function apply(st, seat, a) {
        if (a.type === 'draw') {
            let c;
            if (a.from === 'discard') { c = st.discard.pop(); st.took = c; log(st, `${who(st, seat)} roba el ${K.cardName(c)} del descarte.`); }
            else {
                if (!st.deck.length) { const top = st.discard.pop(); st.deck = K.shuffle(st.discard); st.discard = [top]; log(st, 'Se baraja de nuevo el descarte.'); }
                c = st.deck.pop(); st.took = null;
            }
            st.hands[seat].push(c);
            st.phase = 'discard';
            return;
        }
        K.removeCard(st.hands[seat], a.card);
        st.discard.push(a.card);
        st.turns++;
        if (a.close) { closeRound(st, seat); return; }
        if (st.turns >= NULL_TURNS * st.active.filter(Boolean).length) {
            // Nadie consigue cerrar: ronda nula, se reparte de nuevo sin sumar puntos
            log(st, 'Nadie consigue cerrar: ronda nula, se vuelve a repartir.');
            st.roundResult = { closer: null, nulled: true, results: [] };
            st.phase = 'roundEnd'; st.turnSeat = null; st.pause = 3000;
            return;
        }
        st.turnSeat = nextActive(st, seat); st.phase = 'draw'; st.took = null;
    }

    function closeRound(st, closer) {
        const hand = st.hands[closer];
        const results = [];
        st.stats[closer].closes++;
        if (isChinchon(hand)) {
            st.stats[closer].chinchon = true;
            for (let s = 0; s < st.n; s++) if (st.active[s]) { const b = best(st.hands[s]); results.push({ seat: s, hand: st.hands[s].slice(), melds: s === closer ? [hand.slice()] : b.melds, pts: 0 }); }
            st.roundResult = { closer, chinchon: true, results };
            st.phase = 'over'; st.turnSeat = null;
            st.over = { winners: [closer], draw: false, scores: st.scores.slice(), text: `¡${who(st, closer)} hace CHINCHÓN y gana la partida!` };
            log(st, st.over.text);
            return;
        }
        for (let s = 0; s < st.n; s++) {
            if (!st.active[s]) continue;
            const b = best(st.hands[s]);
            let pts = b.dead;
            if (s === closer && b.dead === 0) { pts = -10; st.stats[closer].minus10++; }
            st.scores[s] += pts;
            results.push({ seat: s, hand: st.hands[s].slice(), melds: b.melds, pts });
        }
        st.roundResult = { closer, results };
        log(st, `${who(st, closer)} cierra${results.find(r => r.seat === closer).pts === -10 ? ' con −10' : ''}.`);
        for (let s = 0; s < st.n; s++) if (st.active[s] && st.scores[s] > LIMIT) { st.active[s] = false; log(st, `${who(st, s)} pasa de ${LIMIT} y queda eliminado.`); }
        const alive = st.active.map((a, s) => (a ? s : -1)).filter(s => s >= 0);
        if (alive.length <= 1) {
            const winner = alive.length ? alive[0] : st.scores.indexOf(Math.min(...st.scores));
            st.phase = 'over'; st.turnSeat = null;
            st.over = { winners: [winner], draw: false, scores: st.scores.slice(), text: `${who(st, winner)} gana la partida (${st.scores[winner]} puntos)` };
            log(st, st.over.text + '.');
            return;
        }
        st.phase = 'roundEnd'; st.turnSeat = null; st.pause = 5200;
    }

    function step(st) {
        st.pause = 0;
        if (st.phase !== 'roundEnd') return;
        st.round++;
        st.dealer = nextActive(st, st.dealer);
        deal(st);
    }

    function view(st, seat) {
        const hand = st.hands[seat];
        const b = best(hand);
        const legal = st.phase === 'discard' && st.turnSeat === seat ? hand.filter(c => c !== st.took) : [];
        return {
            game: 'chinchon', n: st.n, me: seat, phase: st.phase, turn: st.turnSeat, round: st.round,
            hand: hand.slice(), melds: b.melds, dead: b.dead, legal,
            canDraw: st.phase === 'draw' && st.turnSeat === seat,
            closeWith: closeOptions(st, seat),
            took: st.took, discardTop: st.discard[st.discard.length - 1] || null, deck: st.deck.length,
            players: st.hands.map((h, i) => ({ count: st.active[i] ? h.length : 0, active: st.active[i], score: st.scores[i] })),
            scores: st.scores.slice(), active: st.active.slice(), limit: LIMIT,
            roundResult: st.roundResult, log: st.log.slice(), over: st.over, stats: st.stats[seat], buttons: []
        };
    }

    // ── Bot ─────────────────────────────────────────────────
    function bestDiscard(cards, forbid) {
        let bestC = null, bestD = Infinity;
        for (const c of cards) {
            if (c === forbid) continue;
            const d = best(cards.filter(x => x !== c)).dead;
            if (d < bestD || (d === bestD && value(c) > value(bestC))) { bestD = d; bestC = c; }
        }
        return { card: bestC, dead: bestD };
    }

    function bot(st, seat) {
        const hand = st.hands[seat];
        if (st.phase === 'draw') {
            const top = st.discard[st.discard.length - 1];
            if (top) {
                const now = best(hand).dead;
                const withTop = bestDiscard(hand.concat(top), top).dead;
                if (withTop <= now - 2 || (withTop <= CLOSE_MAX && now > CLOSE_MAX)) return { type: 'draw', from: 'discard' };
            }
            return { type: 'draw', from: 'deck' };
        }
        const bd = bestDiscard(hand, st.took);
        // Ronda atascada: a veces suelta otra carta suelta para buscar combinaciones distintas
        if (st.turns > st.n * 10 && Math.random() < 0.3 && !canClose(st, seat, bd.card)) {
            const loose = best(hand).loose.filter(c => c !== st.took);
            if (loose.length) return { type: 'discard', card: loose[Math.floor(Math.random() * loose.length)] };
        }
        if (canClose(st, seat, bd.card) && (bd.dead <= 2 || st.turns >= st.n * 6 || Math.random() < 0.45)) return { type: 'discard', card: bd.card, close: true };
        const c = closeOptions(st, seat).find(x => isChinchon(hand.filter(y => y !== x)));
        if (c) return { type: 'discard', card: c, close: true };
        return { type: 'discard', card: bd.card };
    }

    const turn = (st) => ((st.phase === 'draw' || st.phase === 'discard') ? st.turnSeat : null);

    Nexus.games.cardRules = Nexus.games.cardRules || {};
    Nexus.games.cardRules.chinchon = { id: 'chinchon', setup, validate, apply, step, view, bot, turn, best, isChinchon, value, canClose };
})();
