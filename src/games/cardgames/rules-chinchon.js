/* ============================================================
   NEXUS ARCADE · games/cardgames/rules-chinchon.js
   Reglas (puras, sin DOM) del Chinchón, de 2 a 4 jugadores:
     · Dos barajas españolas de 40 cartas más 2 comodines (82
       cartas): cada carta sale exactamente 2 veces (8 por número,
       2 de cada palo). La segunda copia lleva el sufijo «z»
       (o5 y o5z son los dos cincos de oros); comodines j1 y j2.
     · 7 cartas por jugador. En tu turno robas (del mazo o la carta
       de arriba del montón) y descartas una.
     · Combinaciones: grupos de 3 o 4 cartas del mismo número (de
       palos distintos) y escaleras de 3 o más del mismo palo
       (… 6, 7, sota, caballo, rey). El comodín sustituye a
       cualquier carta y vale 25 si queda suelto.
     · Cierres:
         – normal: te queda UNA carta suelta de 5 o menos (suma su
           valor). Los demás pueden «ligar» sus sueltas en las
           combinaciones de los otros jugadores para no contarlas.
         – menos 10: las 7 cartas combinadas (descartas la 8.ª).
         – menos 25: chinchón con comodines (7 cartas seguidas del
           mismo palo en las que algún comodín ocupa un hueco).
         – ¡Chinchón! 7 cartas seguidas del mismo palo sin
           comodines: ganas la partida al momento.
       En los cierres de −10, −25 y chinchón no se puede ligar.
     · Los demás suman lo que no combinan (figuras 10, el resto su
       número, comodín 25). Se juega a 100 o a 50: quien LLEGA al
       límite queda eliminado (se juega hasta límite − 1). Gana el
       último que queda.
     · Si se acaba el mazo, el montón (menos la carta de arriba) se
       vuelve a poner boca abajo sin barajar: se roba primero la
       primera carta que se tiró.
   ============================================================ */
(function () {
    'use strict';

    const K = Nexus.games.cardCore;
    const { suitOf, rankOf, RANKS } = K;
    const CLOSE_MAX = 5, NULL_TURNS = 200, JOKER = 25, LIMITS = [50, 100];
    const isJ = K.isJoker;
    const value = (c) => (isJ(c) ? JOKER : rankOf(c) <= 7 ? rankOf(c) : 10);
    const idx = (c) => RANKS.indexOf(rankOf(c));

    /** Mazo doble: 2 × 40 cartas + 2 comodines. */
    function deck82() { return K.deck40().concat(K.deck40().map(c => c + 'z'), ['j1', 'j2']); }

    /** Mejor combinación con comodines: cada comodín se prueba como las cartas que encajan con la mano (mismo número o
     *  vecinas del mismo palo). Un comodín suelto vale 25. → { melds, dead, loose } */
    function best(cards) {
        const jk = cards.filter(isJ);
        if (!jk.length) return bestPlain(cards);
        const rest = cards.filter(c => !isJ(c));
        let bestR = bestPlain(rest); bestR = { melds: bestR.melds, dead: bestR.dead + JOKER * jk.length, loose: bestR.loose.concat(jk) };
        const cand = new Set();
        for (const c of rest) {
            for (const s of K.SUITS) cand.add(s + rankOf(c) + 'w');
            const i = idx(c);
            for (const d of [-2, -1, 1, 2]) if (RANKS[i + d]) cand.add(suitOf(c) + RANKS[i + d] + 'w');
        }
        const opts = [...cand].slice(0, 30);
        const tryAssign = (subs) => {
            const b = bestPlain(rest.concat(subs));
            const map = new Map(subs.map((s, i) => [s, jk[i]]));
            const looseSubs = b.loose.filter(x => map.has(x));
            const dead = b.dead - looseSubs.reduce((s, x) => s + value(x), 0) + JOKER * looseSubs.length;
            if (dead < bestR.dead) bestR = { melds: b.melds.map(m => m.map(x => map.get(x) || x)), dead, loose: b.loose.map(x => map.get(x) || x) };
        };
        if (jk.length === 1) opts.forEach(o => tryAssign([o]));
        else for (let a = 0; a < opts.length; a++) for (let b = a + 1; b < opts.length; b++) tryAssign([opts[a], opts[b]]);
        return bestR;
    }

    /** Combinaciones posibles de una mano sin comodines (grupos de palos distintos y escaleras de una copia por número). */
    function candidates(cards) {
        const cand = [];
        const byRank = {};
        for (const c of cards) (byRank[rankOf(c)] = byRank[rankOf(c)] || []).push(c);
        for (const g of Object.values(byRank)) {
            // Subconjuntos de 3 o 4 cartas con palos distintos
            const n = g.length;
            for (let mask = 0; mask < (1 << n); mask++) {
                const sub = g.filter((_, i) => mask & (1 << i));
                if (sub.length >= 3 && sub.length <= 4 && new Set(sub.map(suitOf)).size === sub.length) cand.push(sub);
            }
        }
        for (const s of K.SUITS) {
            const at = new Map();
            for (const c of cards) if (suitOf(c) === s) { const i = idx(c); if (!at.has(i)) at.set(i, []); at.get(i).push(c); }
            const ids = [...at.keys()].sort((a, b) => a - b);
            for (let i = 0; i < ids.length; i++) {
                let j = i;
                while (j + 1 < ids.length && ids[j + 1] === ids[j] + 1) j++;
                for (let a = i; a <= j; a++) for (let b = a + 2; b <= j; b++) {
                    const range = ids.slice(a, b + 1);
                    cand.push(range.map(k => at.get(k)[0]));
                    if (range.every(k => at.get(k).length > 1)) cand.push(range.map(k => at.get(k)[1]));   // escalera gemela
                }
                i = j;
            }
        }
        return cand;
    }

    /** Mejor forma de combinar una mano sin comodines: { melds: [[cartas]], dead: puntos sueltos, loose: [cartas] }. */
    function bestPlain(cards) {
        const cand = candidates(cards);
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

    /** ¡Chinchón! 7 (u 8) cartas seguidas del mismo palo, sin comodines. */
    function isChinchon(cards) {
        if (cards.length < 7 || cards.some(isJ)) return false;
        for (const s of K.SUITS) {
            const ids = [...new Set(cards.filter(c => suitOf(c) === s).map(idx))].sort((a, b) => a - b);
            let run = 1;
            for (let i = 1; i < ids.length; i++) { run = ids[i] === ids[i - 1] + 1 ? run + 1 : 1; if (run >= 7) return true; }
        }
        return false;
    }

    /** Chinchón con comodines (cierre de −25): 7 cartas, alguna comodín, el resto del mismo palo y sin repetir número,
     *  y los comodines bastan para completar 7 seguidas. */
    function isWildChinchon(cards) {
        if (cards.length !== 7) return false;
        const real = cards.filter(c => !isJ(c));
        if (real.length === 7 || !real.length) return false;
        if (!real.every(c => suitOf(c) === suitOf(real[0]))) return false;
        const ids = real.map(idx);
        if (new Set(ids).size !== ids.length) return false;
        return Math.max(...ids) - Math.min(...ids) + 1 <= 7;
    }

    /** ¿Cabe la carta c en la combinación m? (grupo de 3 → 4 con palo nuevo, o escalera por un extremo) */
    function fits(m, c) {
        if (isJ(c)) return false;
        const real = m.filter(x => !isJ(x)), j = m.length - real.length;
        if (!real.length) return false;
        const sameRank = real.every(x => rankOf(x) === rankOf(real[0]));
        const sameSuit = real.every(x => suitOf(x) === suitOf(real[0]));
        if (sameRank && !(sameSuit && real.length > 1)) {
            return m.length < 4 && rankOf(c) === rankOf(real[0]) && !real.some(x => suitOf(x) === suitOf(c));
        }
        if (!sameSuit || suitOf(c) !== suitOf(real[0])) return false;
        const ids = real.map(idx), lo = Math.min(...ids), hi = Math.max(...ids), free = j - (hi - lo + 1 - real.length);
        const i = idx(c);
        return (i < lo && lo - i <= 1 + free) || (i > hi && i - hi <= 1 + free);
    }
    /** Liga automáticamente todo lo posible (usado por bots y por «Ligar todo»). melds: [{ cards }] → cartas ligadas */
    function autoLigar(melds, loose) {
        const tied = []; let left = loose.slice(), changed = true;
        while (changed) {
            changed = false;
            for (const c of left.slice()) {
                const m = melds.find(x => fits(x.cards, c));
                if (m) { m.cards.push(c); tied.push(c); left = left.filter(x => x !== c); changed = true; }
            }
        }
        return { loose: left, tied };
    }

    function log(st, text) { st.log.push(text); if (st.log.length > 8) st.log.shift(); }
    const who = (st, s) => (st.names ? st.names[s] : `Jugador ${s + 1}`);
    const nextActive = (st, s) => { for (let k = 1; k <= st.n; k++) { const t = (s + k) % st.n; if (st.active[t]) return t; } return s; };

    function deal(st) {
        const d = K.shuffle(deck82());
        st.hands = Array.from({ length: st.n }, () => []);
        for (let k = 0; k < 7; k++) for (let i = 0; i < st.n; i++) if (st.active[i]) st.hands[i].push(d.pop());
        st.discard = [d.pop()];
        st.deck = d;
        st.turnSeat = nextActive(st, st.dealer);
        st.phase = 'draw'; st.took = null; st.drawn = null; st.turns = 0; st.lastDraw = null;
        st.roundResult = null; st.lig = null;
        log(st, `Ronda ${st.round}: reparte ${who(st, st.dealer)}.`);
    }

    /** opts.limit: 50 o 100 (lo elige quien crea la mesa). */
    function setup(n, names, kinds, opts) {
        const lim = Number(opts && opts.limit);
        const st = { game: 'chinchon', n, names: names || null, kinds: kinds || Array.from({ length: n }, (_, i) => (i ? 'bot' : 'me')),
            limit: LIMITS.includes(lim) ? lim : 100,
            active: new Array(n).fill(true), scores: new Array(n).fill(0), history: [], dealer: Math.floor(Math.random() * n),
            round: 1, log: [], pause: 0, over: null, stats: Array.from({ length: n }, () => ({ closes: 0, minus10: 0, minus25: 0, chinchon: false })) };
        deal(st);
        return st;
    }

    /** Tipo de cierre que da la mano tras descartar `card`: chinchón, −25 (chinchón con comodines), −10 o normal. */
    function closeKind(st, seat, card) {
        if (st.phase !== 'discard' || st.turnSeat !== seat) return null;
        const hand = st.hands[seat];
        if (card === null || card === undefined) return null;
        if (!hand.includes(card) || card === st.took) return null;
        const rest = hand.filter(c => c !== card);
        if (rest.length !== 7) return null;
        if (isChinchon(rest)) return 'chinchon';
        if (isWildChinchon(rest)) return 'minus25';
        const b = best(rest);
        if (b.dead === 0) return 'minus10';
        if (b.loose.length === 1 && b.dead <= CLOSE_MAX) return 'normal';
        return null;
    }
    const canClose = (st, seat, card) => !!closeKind(st, seat, card);
    const closeOptions = (st, seat) => st.hands[seat].filter(c => canClose(st, seat, c));

    function validate(st, seat, a) {
        if (!a || st.over) return false;
        if (st.phase === 'ligar') {
            const L = st.lig; if (!L || L.done[seat] !== false) return false;
            if (a.type === 'ligarDone' || a.type === 'ligarAuto') return true;
            if (a.type === 'ligar') return L.loose[seat].includes(a.card) && !!L.melds[a.meld] && L.melds[a.meld].owner !== seat && fits(L.melds[a.meld].cards, a.card);
            return false;
        }
        if (st.turnSeat !== seat) return false;
        if (a.type === 'draw') return st.phase === 'draw' && (a.from === 'deck' || (a.from === 'discard' && st.discard.length > 0));
        if (a.type === 'close25') return closeKind(st, seat, null) !== null;
        if (a.type === 'discard') {
            if (st.phase !== 'discard' || !st.hands[seat].includes(a.card) || a.card === st.took) return false;
            return !a.close || canClose(st, seat, a.card);
        }
        return false;
    }

    function apply(st, seat, a) {
        if (st.phase === 'ligar') { applyLigar(st, seat, a); return; }
        if (a.type === 'draw') {
            let c;
            if (a.from === 'discard') {
                c = st.discard.pop(); st.took = c;
                log(st, `${who(st, seat)} coge el ${K.cardName(c)} del montón.`);
            } else {
                if (!st.deck.length) {
                    // Sin mazo: el montón (menos la de arriba) se da la vuelta sin barajar; se roba primero la primera que se tiró
                    const top = st.discard.pop();
                    st.deck = st.discard.slice().reverse(); st.discard = [top];
                    log(st, 'Se acaba el mazo: se da la vuelta al montón.');
                }
                c = st.deck.pop(); st.took = null;
                log(st, `${who(st, seat)} roba del mazo.`);
            }
            st.hands[seat].push(c);
            st.drawn = c;
            st.lastDraw = { seat, from: a.from, card: a.from === 'discard' ? c : null };
            st.phase = 'discard';
            return;
        }
        if (a.type === 'close25') { closeRound(st, seat, closeKind(st, seat, null)); return; }
        const kind = a.close ? closeKind(st, seat, a.card) : null;
        K.removeCard(st.hands[seat], a.card);
        st.discard.push(a.card);
        st.turns++; st.drawn = null;
        if (kind) { closeRound(st, seat, kind); return; }
        if (st.turns >= NULL_TURNS * st.active.filter(Boolean).length) {
            // Seguridad: ronda atascada (no ocurre en partidas normales)
            log(st, 'Nadie consigue cerrar: ronda nula, se vuelve a repartir.');
            st.roundResult = { closer: null, nulled: true, results: [] };
            st.phase = 'roundEnd'; st.turnSeat = null; st.pause = 3000;
            return;
        }
        st.turnSeat = nextActive(st, seat); st.phase = 'draw'; st.took = null;
    }

    function closeRound(st, closer, kind) {
        st.stats[closer].closes++;
        st.turnSeat = null; st.drawn = null;
        if (kind === 'chinchon') {
            st.stats[closer].chinchon = true;
            const results = [];
            for (let s = 0; s < st.n; s++) if (st.active[s]) { const b = best(st.hands[s]); results.push({ seat: s, hand: st.hands[s].slice(), melds: s === closer ? [st.hands[s].slice()] : b.melds, loose: s === closer ? [] : b.loose, tied: [], pts: 0 }); }
            st.roundResult = { closer, kind, chinchon: true, results };
            st.phase = 'over';
            st.over = { winners: [closer], draw: false, scores: st.scores.slice(), text: `¡${who(st, closer)} hace CHINCHÓN y gana la partida!` };
            log(st, st.over.text);
            return;
        }
        // Combinaciones de todos (se enseñan las manos)
        const arr = {};
        for (let s = 0; s < st.n; s++) if (st.active[s]) arr[s] = best(st.hands[s]);
        if (kind === 'minus10') st.stats[closer].minus10++;
        if (kind === 'minus25') st.stats[closer].minus25++;
        st.lig = {
            closer, kind,
            melds: [], loose: {}, tied: {}, done: {}
        };
        for (const s of Object.keys(arr).map(Number)) {
            arr[s].melds.forEach(m => st.lig.melds.push({ owner: s, cards: m.slice() }));
            st.lig.loose[s] = arr[s].loose.slice(); st.lig.tied[s] = [];
        }
        log(st, `${who(st, closer)} cierra${kind === 'minus10' ? ' con −10' : kind === 'minus25' ? ' con −25' : ''}.`);
        if (kind !== 'normal') { finishRound(st); return; }       // en −10 y −25 no se liga
        // Cierre normal: los demás pueden ligar. Los bots lo hacen al momento; las personas eligen (o «Ligar todo»).
        for (const s of Object.keys(arr).map(Number)) {
            if (s === closer || !st.lig.loose[s].length) { st.lig.done[s] = true; continue; }
            if (st.kinds[s] === 'bot') { ligarAll(st, s); st.lig.done[s] = true; }
            else st.lig.done[s] = false;
        }
        st.phase = 'ligar';
        maybeFinishLigar(st);
    }

    function ligarAll(st, s) {
        const L = st.lig, others = L.melds.filter(m => m.owner !== s);
        const r = autoLigar(others, L.loose[s].filter(c => !isJ(c)));
        L.tied[s].push(...r.tied);
        L.loose[s] = L.loose[s].filter(c => !r.tied.includes(c));
    }
    function applyLigar(st, seat, a) {
        const L = st.lig;
        if (a.type === 'ligar') {
            L.melds[a.meld].cards.push(a.card);
            L.loose[seat] = L.loose[seat].filter(c => c !== a.card);
            L.tied[seat].push(a.card);
            log(st, `${who(st, seat)} liga el ${K.cardName(a.card)}.`);
            if (!L.loose[seat].some(c => L.melds.some(m => m.owner !== seat && fits(m.cards, c)))) L.done[seat] = true;
        } else if (a.type === 'ligarAuto') { ligarAll(st, seat); L.done[seat] = true; }
        else if (a.type === 'ligarDone') L.done[seat] = true;
        maybeFinishLigar(st);
    }
    function maybeFinishLigar(st) {
        if (Object.values(st.lig.done).every(Boolean)) finishRound(st);
    }

    function finishRound(st) {
        const L = st.lig, closer = L.closer, results = [];
        const ptsRow = new Array(st.n).fill(null);
        for (let s = 0; s < st.n; s++) {
            if (!st.active[s]) continue;
            let pts = L.loose[s].reduce((t, c) => t + value(c), 0);
            if (s === closer) pts = L.kind === 'minus10' ? -10 : L.kind === 'minus25' ? -25 : pts;
            st.scores[s] += pts; ptsRow[s] = pts;
            results.push({ seat: s, hand: st.hands[s].slice(), melds: L.melds.filter(m => m.owner === s).map(m => m.cards.filter(c => st.hands[s].includes(c))),
                loose: L.loose[s].slice(), tied: L.tied[s].slice(), pts });
        }
        st.history.push({ round: st.round, pts: ptsRow, closer, kind: L.kind });
        st.roundResult = { closer, kind: L.kind, results, melds: L.melds.map(m => ({ owner: m.owner, cards: m.cards.slice() })) };
        st.lig = null;
        // Eliminados: quien llega al límite (se juega hasta límite − 1)
        for (let s = 0; s < st.n; s++) if (st.active[s] && st.scores[s] >= st.limit) { st.active[s] = false; log(st, `${who(st, s)} llega a ${st.limit} y queda eliminado.`); }
        const alive = st.active.map((x, s) => (x ? s : -1)).filter(s => s >= 0);
        if (alive.length <= 1) {
            const winner = alive.length ? alive[0] : st.scores.indexOf(Math.min(...st.scores));
            st.phase = 'over'; st.turnSeat = null;
            st.over = { winners: [winner], draw: false, scores: st.scores.slice(), text: `${who(st, winner)} gana la partida (${st.scores[winner]} puntos)` };
            log(st, st.over.text + '.');
            return;
        }
        st.phase = 'roundEnd'; st.turnSeat = null; st.pause = 6500;
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
        const myTurn = st.turnSeat === seat;
        const legal = st.phase === 'discard' && myTurn ? hand.filter(c => c !== st.took) : [];
        const L = st.lig;
        return {
            game: 'chinchon', n: st.n, me: seat, phase: st.phase, turn: turn(st), round: st.round,
            hand: hand.slice(), dead: b.dead, loose: b.loose, legal,
            canDraw: st.phase === 'draw' && myTurn,
            closeWith: st.phase === 'discard' && myTurn ? closeOptions(st, seat) : [],
            closeKinds: st.phase === 'discard' && myTurn ? Object.fromEntries(closeOptions(st, seat).map(c => [c, closeKind(st, seat, c)])) : {},
            can25: st.phase === 'discard' && myTurn ? closeKind(st, seat, null) : null,
            took: st.took, drawn: myTurn ? st.drawn : null, lastDraw: st.lastDraw,
            discardTop: st.discard[st.discard.length - 1] || null, discardLast: st.discard.slice(-3), deck: st.deck.length,
            lig: L ? { closer: L.closer, kind: L.kind, melds: L.melds.map(m => ({ owner: m.owner, cards: m.cards.slice() })),
                myLoose: (L.loose[seat] || []).slice(), myTied: (L.tied[seat] || []).slice(), done: L.done[seat] !== false,
                pending: Object.keys(L.done).filter(s => !L.done[s]).map(Number) } : null,
            players: st.hands.map((h, i) => ({ count: st.active[i] ? h.length : 0, active: st.active[i], score: st.scores[i] })),
            scores: st.scores.slice(), active: st.active.slice(), limit: st.limit, history: st.history.slice(),
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
        if (st.phase === 'ligar') return { type: 'ligarAuto' };      // también la jugada automática de una persona sin tiempo
        const hand = st.hands[seat];
        if (st.phase === 'draw') {
            const top = st.discard[st.discard.length - 1];
            if (top) {
                const now = best(hand).dead;
                const withTop = bestDiscard(hand.concat(top), top).dead;
                if (isJ(top) || withTop <= now - 2 || (withTop <= CLOSE_MAX && now > CLOSE_MAX)) return { type: 'draw', from: 'discard' };
            }
            return { type: 'draw', from: 'deck' };
        }
        const ch = closeOptions(st, seat).find(x => closeKind(st, seat, x) === 'chinchon')
            || closeOptions(st, seat).find(x => closeKind(st, seat, x) === 'minus25')
            || closeOptions(st, seat).find(x => closeKind(st, seat, x) === 'minus10');
        if (ch) return { type: 'discard', card: ch, close: true };
        const bd = bestDiscard(hand, st.took);
        if (st.turns > st.n * 10 && Math.random() < 0.3 && !canClose(st, seat, bd.card)) {
            const loose = best(hand).loose.filter(c => c !== st.took);
            if (loose.length) return { type: 'discard', card: loose[Math.floor(Math.random() * loose.length)] };
        }
        if (canClose(st, seat, bd.card) && (bd.dead <= 2 || st.turns >= st.n * 6 || Math.random() < 0.45)) return { type: 'discard', card: bd.card, close: true };
        return { type: 'discard', card: bd.card };
    }

    /** Turno: en la fase de ligar, la primera persona que aún no ha terminado (para el tiempo de turno online). */
    function turn(st) {
        if (st.phase === 'draw' || st.phase === 'discard') return st.turnSeat;
        if (st.phase === 'ligar' && st.lig) { const p = Object.keys(st.lig.done).find(s => !st.lig.done[s]); return p === undefined ? null : Number(p); }
        return null;
    }

    Nexus.games.cardRules = Nexus.games.cardRules || {};
    Nexus.games.cardRules.chinchon = { id: 'chinchon', setup, validate, apply, step, view, bot, turn, best, isChinchon, isWildChinchon, value, canClose, closeKind, fits, autoLigar, deck82, LIMITS,
        options: [{ key: 'limit', label: 'Se juega a', choices: [{ id: '100', label: '100 puntos' }, { id: '50', label: '50 puntos' }], def: '100' }] };
})();
