/* ============================================================
   NEXUS ARCADE · games/cardgames/rules-poker.js
   Reglas (puras, sin DOM) del Póker Texas Hold'em sin límite,
   de 2 a 4 jugadores, con baraja francesa:
     · Todos empiezan con 1000 fichas. Ciegas 10/20 que suben cada
       6 manos. Botón rotatorio; en mano a mano el botón pone la
       ciega pequeña y habla primero antes del flop.
     · 2 cartas por jugador; rondas de apuestas: preflop, flop (3),
       turn (1) y river (1). Pasar, igualar, subir (mínimo: la
       última subida) o ir all-in; retirarse.
     · Botes secundarios con all-in; reparto a partes iguales en
       empates. Se enseñan las cartas en el showdown.
     · Quien se queda sin fichas queda eliminado. Gana quien se
       queda con todas (o el que más tenga si ya no queda ninguna
       persona en la mesa, contra la máquina).
   ============================================================ */
(function () {
    'use strict';

    const F = Nexus.games.frenchCards;
    const START = 1000;
    /** Estructura de ciegas: torneo rápido (sube cada 6 manos), lento (cada 12) o ciegas fijas (partida «cash»). */
    const STRUCTURES = { fast: 6, slow: 12, fixed: Infinity };
    const setting = (k) => { try { return Nexus.services.settings.get(k); } catch (_) { return undefined; } };
    const BLINDS = [[10, 20], [15, 30], [25, 50], [40, 80], [60, 120], [100, 200], [150, 300], [250, 500], [400, 800], [600, 1200], [1000, 2000]];

    // ── Evaluación de manos ─────────────────────────────────
    const pr = (c) => { const r = F.rankOf(c); return r === 1 ? 14 : r; };       // As alto (14)
    const CAT = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color'];
    const RN = { 14: 'ases', 13: 'reyes', 12: 'reinas', 11: 'jotas', 10: 'dieces', 9: 'nueves', 8: 'ochos', 7: 'sietes', 6: 'seises', 5: 'cincos', 4: 'cuatros', 3: 'treses', 2: 'doses' };
    const RS = { 14: 'as', 13: 'rey', 12: 'reina', 11: 'jota', 10: 'diez', 9: 'nueve', 8: 'ocho', 7: 'siete', 6: 'seis', 5: 'cinco', 4: 'cuatro', 3: 'tres', 2: 'dos' };
    const code = (cat, ks) => { let v = cat; for (let i = 0; i < 5; i++) v = v * 15 + (ks[i] || 0); return v; };
    /** Escalera más alta entre rangos únicos (con el As como 1). → carta alta o 0. */
    function straightHigh(ranks) {
        const set = new Set(ranks); if (set.has(14)) set.add(1);
        for (let h = 14; h >= 5; h--) { let ok = true; for (let k = 0; k < 5; k++) if (!set.has(h - k)) { ok = false; break; } if (ok) return h; }
        return 0;
    }
    /**
     * Mejor mano de 5 entre 5–7 cartas.
     * → { v: número comparable, cat: 0–8, name, ks: rangos decisivos }
     */
    function evaluate(cards) {
        const rs = cards.map(pr), bySuit = {}, cnt = {};
        cards.forEach((c, i) => { (bySuit[F.suitOf(c)] = bySuit[F.suitOf(c)] || []).push(rs[i]); cnt[rs[i]] = (cnt[rs[i]] || 0) + 1; });
        const flushS = Object.keys(bySuit).find(s => bySuit[s].length >= 5);
        if (flushS) {
            const sh = straightHigh(bySuit[flushS]);
            if (sh) return { v: code(8, [sh]), cat: 8, ks: [sh], name: sh === 14 ? 'Escalera real' : `Escalera de color al ${RS[sh]}` };
        }
        const groups = Object.entries(cnt).map(([r, n]) => [Number(r), n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
        const desc = [...new Set(rs)].sort((a, b) => b - a);
        const kick = (ex, n) => desc.filter(r => !ex.includes(r)).slice(0, n);
        if (groups[0][1] === 4) { const q = groups[0][0]; const ks = [q, ...kick([q], 1)]; return { v: code(7, ks), cat: 7, ks, name: `Póker de ${RN[q]}` }; }
        if (groups[0][1] === 3 && groups.length > 1 && groups[1][1] >= 2) {
            const t = groups[0][0], p = groups.slice(1).filter(g => g[1] >= 2).map(g => g[0]).sort((a, b) => b - a)[0];
            return { v: code(6, [t, p]), cat: 6, ks: [t, p], name: `Full de ${RN[t]} y ${RN[p]}` };
        }
        if (flushS) { const ks = bySuit[flushS].sort((a, b) => b - a).slice(0, 5); return { v: code(5, ks), cat: 5, ks, name: `Color al ${RS[ks[0]]}` }; }
        const sh = straightHigh(rs);
        if (sh) return { v: code(4, [sh]), cat: 4, ks: [sh], name: `Escalera al ${RS[sh]}` };
        if (groups[0][1] === 3) { const t = groups[0][0]; const ks = [t, ...kick([t], 2)]; return { v: code(3, ks), cat: 3, ks, name: `Trío de ${RN[t]}` }; }
        if (groups[0][1] === 2 && groups[1] && groups[1][1] === 2) {
            const a = groups[0][0], b = groups[1][0]; const ks = [a, b, ...kick([a, b], 1)];
            return { v: code(2, ks), cat: 2, ks, name: `Doble pareja de ${RN[a]} y ${RN[b]}` };
        }
        if (groups[0][1] === 2) { const p = groups[0][0]; const ks = [p, ...kick([p], 3)]; return { v: code(1, ks), cat: 1, ks, name: `Pareja de ${RN[p]}` }; }
        const ks = desc.slice(0, 5);
        return { v: code(0, ks), cat: 0, ks, name: `Carta alta: ${RS[ks[0]]}` };
    }

    // ── Estado ──────────────────────────────────────────────
    const who = (st, s) => (st.names ? st.names[s] : `Jugador ${s + 1}`);
    function log(st, t) { st.log.push(t); if (st.log.length > 10) st.log.shift(); }
    const inHand = (st, s) => st.dealt[s] && !st.folded[s];
    const canAct = (st, s) => inHand(st, s) && !st.allin[s];
    const nextFrom = (st, s, pred) => { for (let k = 1; k <= st.n; k++) { const t = (s + k) % st.n; if (pred(t)) return t; } return -1; };
    const potTotal = (st) => st.total.reduce((a, b) => a + b, 0);

    function setup(n, names, kinds) {
        const st = {
            game: 'poker', n, names: names || null, humans: (kinds || []).map(k => k !== 'bot'),
            chips: new Array(n).fill(START), out: new Array(n).fill(false), bustOrder: [],
            dealer: Math.floor(Math.random() * n), handNo: 0, level: 0, log: [], pause: 0, over: null, phase: 'bet',
            perLevel: STRUCTURES[setting('poker.blinds')] || STRUCTURES.fast, autoMuck: setting('poker.autoMuck') !== false,
            stats: Array.from({ length: n }, () => ({ handsWon: 0, biggestPot: 0, bestCat: -1, allinWins: 0, bluffWins: 0 }))
        };
        startHand(st);
        return st;
    }

    function put(st, s, amt) {
        amt = Math.max(0, Math.min(amt, st.chips[s]));
        st.chips[s] -= amt; st.bet[s] += amt; st.total[s] += amt;
        if (st.chips[s] === 0) st.allin[s] = true;
        return amt;
    }

    function startHand(st) {
        st.handNo++;
        st.level = st.perLevel === Infinity ? 0 : Math.min(BLINDS.length - 1, Math.floor((st.handNo - 1) / st.perLevel));
        st.streetLog = [];
        const [sb, bb] = BLINDS[st.level];
        st.sb = sb; st.bb = bb;
        const alive = (s) => !st.out[s];
        st.dealer = nextFrom(st, st.dealer, alive);
        const d = F.deck52();
        for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
        st.deck = d;
        st.dealt = st.out.map(o => !o);
        st.hands = st.dealt.map(x => (x ? [st.deck.pop(), st.deck.pop()] : []));
        st.board = []; st.street = 'preflop';
        st.folded = new Array(st.n).fill(false); st.allin = new Array(st.n).fill(false);
        st.bet = new Array(st.n).fill(0); st.total = new Array(st.n).fill(0); st.acted = new Array(st.n).fill(false);
        st.showdown = null; st.revealed = new Array(st.n).fill(false); st.phase = 'bet';
        const heads = st.dealt.filter(Boolean).length === 2;
        const sbSeat = heads ? st.dealer : nextFrom(st, st.dealer, alive);
        const bbSeat = nextFrom(st, sbSeat, alive);
        st.sbSeat = sbSeat; st.bbSeat = bbSeat;
        put(st, sbSeat, sb); put(st, bbSeat, bb);
        st.curBet = bb; st.minRaise = bb; st.lastAggressor = bbSeat;
        log(st, `Mano ${st.handNo} · ciegas ${sb}/${bb}. Reparte ${who(st, st.dealer)}.`);
        st.toAct = nextFrom(st, bbSeat, (s) => canAct(st, s));
        if (st.toAct < 0 || !needsAction(st)) endStreet(st);
    }

    /** ¿Queda alguien que tenga que hablar en esta ronda? */
    function needsAction(st) {
        const able = [...Array(st.n).keys()].filter(s => canAct(st, s));
        if (!able.length) return false;
        if (able.length === 1 && st.bet[able[0]] >= Math.max(...st.bet.map((b, s) => (inHand(st, s) ? b : 0)))) return false;   // único con fichas y ya iguala
        return able.some(s => !st.acted[s] || st.bet[s] < st.curBet);
    }

    function toCall(st, s) { return Math.max(0, Math.min(st.curBet - st.bet[s], st.chips[s])); }
    function raiseBounds(st, s) {
        const max = st.bet[s] + st.chips[s];
        const min = Math.min(max, st.curBet + st.minRaise);
        const can = !st.acted[s] && max > st.curBet && [...Array(st.n).keys()].some(o => o !== s && canAct(st, o));
        return { min, max, can };
    }

    function validate(st, seat, a) {
        if (!a || st.over || st.phase !== 'bet' || st.toAct !== seat) return false;
        if (a.type === 'fold') return true;
        if (a.type === 'check') return st.bet[seat] >= st.curBet;
        if (a.type === 'call') return st.curBet > st.bet[seat];
        if (a.type === 'raise') {
            const to = Math.floor(Number(a.to)), b = raiseBounds(st, seat);
            return b.can && Number.isFinite(to) && to <= b.max && (to >= b.min || to === b.max) && to > st.curBet;
        }
        return false;
    }

    function apply(st, seat, a) {
        const name = who(st, seat);
        if (a.type === 'fold') { st.folded[seat] = true; log(st, `${name} se retira.`); }
        else if (a.type === 'check') { log(st, `${name} pasa.`); }
        else if (a.type === 'call') { const x = put(st, seat, st.curBet - st.bet[seat]); log(st, `${name} iguala ${x}${st.allin[seat] ? ' (all-in)' : ''}.`); }
        else if (a.type === 'raise') {
            const to = Math.floor(Number(a.to)), inc = to - st.curBet;
            put(st, seat, to - st.bet[seat]);
            if (inc >= st.minRaise) { st.minRaise = inc; for (let s = 0; s < st.n; s++) if (s !== seat) st.acted[s] = false; }
            st.curBet = to; st.lastAggressor = seat;
            log(st, `${name} ${st.allin[seat] ? 'va all-in' : 'sube'} a ${to}.`);
        }
        st.acted[seat] = true;
        // Historial de la calle en curso (fichas delante de cada asiento y resumen «Ana sube a 60 · Bot iguala»)
        st.streetLog.push({ s: seat, t: a.type, to: a.type === 'raise' ? Math.floor(Number(a.to)) : a.type === 'call' ? st.bet[seat] : 0, allin: st.allin[seat] });
        const live = [...Array(st.n).keys()].filter(s => inHand(st, s));
        if (live.length === 1) { winUncontested(st, live[0]); return; }
        if (needsAction(st)) {
            st.toAct = nextFrom(st, seat, (s) => canAct(st, s) && (!st.acted[s] || st.bet[s] < st.curBet));
            if (st.toAct >= 0) return;
        }
        endStreet(st);
    }

    function endStreet(st) {
        st.prevStreet = { street: st.street, log: st.streetLog.slice() }; st.streetLog = [];
        st.bet = new Array(st.n).fill(0); st.acted = new Array(st.n).fill(false);
        st.curBet = 0; st.minRaise = st.bb; st.toAct = -1;
        if (st.street === 'river') { showdown(st); return; }
        // Siguiente calle: se reparte tras una pausa corta (más larga si ya no se puede apostar)
        st.phase = 'deal';
        st.pause = needsActionNext(st) ? 650 : 1300;
    }
    const needsActionNext = (st) => [...Array(st.n).keys()].filter(s => canAct(st, s)).length >= 2;

    function dealStreet(st) {
        if (st.street === 'preflop') { st.deck.pop(); st.board.push(st.deck.pop(), st.deck.pop(), st.deck.pop()); st.street = 'flop'; }
        else if (st.street === 'flop') { st.deck.pop(); st.board.push(st.deck.pop()); st.street = 'turn'; }
        else if (st.street === 'turn') { st.deck.pop(); st.board.push(st.deck.pop()); st.street = 'river'; }
        log(st, `${({ flop: 'Flop', turn: 'Turn', river: 'River' })[st.street]}: ${st.board.map(F.label).join(' ')}`);
        st.phase = 'bet';
        if (needsActionNext(st)) {
            st.toAct = nextFrom(st, st.dealer, (s) => canAct(st, s));     // tras el flop habla primero quien va después del botón
            return;
        }
        // Todos all-in (o sólo uno con fichas): se sigue repartiendo sin apuestas
        if (st.street === 'river') showdown(st);
        else { st.phase = 'deal'; st.pause = 1300; }
    }

    /** Botes (principal y secundarios) a partir de lo que ha puesto cada uno. */
    function pots(st) {
        const levels = [...new Set(st.total.filter(t => t > 0))].sort((a, b) => a - b);
        const out = []; let prev = 0;
        for (const L of levels) {
            let amount = 0;
            for (let s = 0; s < st.n; s++) amount += Math.max(0, Math.min(st.total[s], L) - prev);
            const elig = [...Array(st.n).keys()].filter(s => inHand(st, s) && st.total[s] >= L);
            if (amount > 0) {
                if (elig.length) { const last = out[out.length - 1]; if (last && last.elig.join() === elig.join()) last.amount += amount; else out.push({ amount, elig }); }
                else if (out.length) out[out.length - 1].amount += amount;
            }
            prev = L;
        }
        return out;
    }

    function award(st, amounts) {
        for (let s = 0; s < st.n; s++) if (amounts[s] > 0) {
            st.chips[s] += amounts[s];
            st.stats[s].handsWon++;
            st.stats[s].biggestPot = Math.max(st.stats[s].biggestPot, amounts[s]);
        }
    }

    function winUncontested(st, s) {
        const amt = potTotal(st);
        const amounts = new Array(st.n).fill(0); amounts[s] = amt;
        award(st, amounts);
        // Gana sin enseñar: si su mano no era al menos pareja con lo que hay en mesa, cuenta como farol ganado
        const ev = evaluate(st.hands[s].concat(st.board));
        if (ev.cat === 0 && st.lastAggressor === s) st.stats[s].bluffWins++;
        log(st, `${who(st, s)} se lleva ${amt} sin enseñar las cartas.`);
        st.showdown = { uncontested: true, winners: [s], amounts, results: [] };
        endHand(st, 2600);
    }

    function showdown(st) {
        st.street = 'showdown';
        const live = [...Array(st.n).keys()].filter(s => inHand(st, s));
        const ev = {};
        for (const s of live) { ev[s] = evaluate(st.hands[s].concat(st.board)); st.stats[s].bestCat = Math.max(st.stats[s].bestCat, ev[s].cat); }
        // Orden de muestra: primero el último agresor (o el primero tras el botón) y en sentido horario. Quien no puede
        // ganar a lo ya enseñado tira sus cartas sin mostrarlas (bots siempre; personas con «tirar la mano perdedora»).
        const first = live.includes(st.lastAggressor) && st.street === 'showdown' ? st.lastAggressor : nextFrom(st, st.dealer, (s) => live.includes(s));
        const order = []; for (let k = 0; k < st.n; k++) { const s = (first + k) % st.n; if (live.includes(s)) order.push(s); }
        let bestShown = -1; const mucked = [];
        for (const s of order) {
            const allin = st.allin[s];
            const muck = bestShown >= 0 && ev[s].v < bestShown && !allin && (!st.humans[s] || st.autoMuck);
            if (muck) { mucked.push(s); continue; }
            st.revealed[s] = true; bestShown = Math.max(bestShown, ev[s].v);
        }
        const amounts = new Array(st.n).fill(0), potList = [];
        for (const p of pots(st)) {
            const best = Math.max(...p.elig.map(s => ev[s].v));
            const win = p.elig.filter(s => ev[s].v === best);
            const share = Math.floor(p.amount / win.length);
            let rest = p.amount - share * win.length;
            // El resto indivisible, al primero tras el botón
            const order = win.slice().sort((a, b) => ((a - st.dealer - 1 + st.n) % st.n) - ((b - st.dealer - 1 + st.n) % st.n));
            for (const s of order) { amounts[s] += share + (rest > 0 ? 1 : 0); rest--; }
            potList.push({ amount: p.amount, winners: win, name: ev[win[0]].name });
        }
        for (const s of live) if (amounts[s] > 0 && st.allin[s]) st.stats[s].allinWins++;
        award(st, amounts);
        const winners = [...Array(st.n).keys()].filter(s => amounts[s] > 0);
        st.showdown = { uncontested: false, winners, amounts, pots: potList, order, mucked,
            results: order.filter(s => st.revealed[s]).map(s => ({ seat: s, cards: st.hands[s].slice(), name: ev[s].name, cat: ev[s].cat, won: amounts[s] })) };
        if (mucked.length) log(st, `${mucked.map(s => who(st, s)).join(', ')} tira${mucked.length > 1 ? 'n' : ''} sus cartas sin enseñarlas.`);
        log(st, potList.map((p, i) => `${potList.length > 1 ? (i === 0 ? 'Bote principal' : 'Bote secundario') + ': ' : ''}${p.winners.map(s => who(st, s)).join(' y ')} gana${p.winners.length > 1 ? 'n' : ''} ${p.amount} con ${p.name.toLowerCase()}`).join('. ') + '.');
        endHand(st, 5200);
    }

    function endHand(st, ms) {
        st.phase = 'handEnd'; st.toAct = -1; st.pause = ms;
        for (let s = 0; s < st.n; s++) if (!st.out[s] && st.chips[s] === 0) { st.out[s] = true; st.bustOrder.push(s); log(st, `${who(st, s)} se queda sin fichas.`); }
        const alive = [...Array(st.n).keys()].filter(s => !st.out[s]);
        const humansLeft = st.humans.length ? alive.some(s => st.humans[s]) : true;
        if (alive.length <= 1 || !humansLeft) {
            const ranking = alive.sort((a, b) => st.chips[b] - st.chips[a]).concat(st.bustOrder.slice().reverse());
            const w = ranking[0];
            st.over = { winners: [w], draw: false, ranking, chips: st.chips.slice(),
                text: alive.length <= 1 ? `${who(st, w)} se queda con todas las fichas` : `${who(st, w)} gana la mesa con ${st.chips[w]} fichas` };
            st.phase = 'over'; st.pause = 0;
            log(st, st.over.text + '.');
        }
    }

    function step(st) {
        st.pause = 0;
        if (st.phase === 'deal') dealStreet(st);
        else if (st.phase === 'handEnd') startHand(st);
    }

    const turn = (st) => (st.phase === 'bet' && st.toAct >= 0 ? st.toAct : null);

    function view(st, seat) {
        const my = st.toAct === seat && st.phase === 'bet';
        const buttons = [];
        if (my) {
            const tc = toCall(st, seat), rb = raiseBounds(st, seat), pot = potTotal(st);
            if (tc > 0) buttons.push({ label: '✋ Retirarse', action: { type: 'fold' } });
            buttons.push(tc > 0 ? { label: `📞 Igualar ${tc}${tc >= st.chips[seat] ? ' (all-in)' : ''}`, action: { type: 'call' }, kind: 'primary' } : { label: '✔️ Pasar', action: { type: 'check' }, kind: 'primary' });
            if (rb.can) {
                const opts = new Map();
                const add = (to, lbl) => { to = Math.min(rb.max, Math.max(rb.min, Math.round(to / st.sb) * st.sb)); if (to > st.curBet && !opts.has(to)) opts.set(to, lbl); };
                add(rb.min, st.curBet ? 'Subir a' : 'Apostar');
                add(st.curBet + Math.max(st.minRaise, Math.round((pot + tc) / 2)), '½ bote:');
                add(st.curBet + Math.max(st.minRaise, pot + tc), 'Bote:');
                opts.set(rb.max, 'All-in');
                for (const [to, lbl] of [...opts].sort((a, b) => a[0] - b[0])) buttons.push({ label: lbl === 'All-in' ? `💥 All-in (${to})` : `⬆️ ${lbl} ${to}`, action: { type: 'raise', to }, quick: true });
            }
        }
        return {
            game: 'poker', n: st.n, me: seat, phase: st.phase, street: st.street, turn: turn(st), handNo: st.handNo,
            hand: st.hands[seat] ? st.hands[seat].slice() : [], legal: [], board: st.board.slice(), pot: potTotal(st),
            toCall: toCall(st, seat), curBet: st.curBet, sb: st.sb, bb: st.bb, level: st.level,
            nextLevelIn: st.perLevel === Infinity ? null : st.perLevel - ((st.handNo - 1) % st.perLevel), fixedBlinds: st.perLevel === Infinity,
            raise: my && raiseBounds(st, seat).can ? { min: raiseBounds(st, seat).min, max: raiseBounds(st, seat).max, step: st.sb, cur: st.curBet } : null,
            streetLog: st.streetLog.slice(), prevStreet: st.prevStreet || null,
            dealer: st.dealer, sbSeat: st.sbSeat, bbSeat: st.bbSeat,
            players: [...Array(st.n).keys()].map(s => ({
                count: inHand(st, s) && !st.revealed[s] && !st.over ? 2 : 0, active: !st.out[s], chips: st.chips[s], bet: st.bet[s], total: st.total[s],
                folded: st.folded[s], allin: st.allin[s], inHand: inHand(st, s),
                cards: st.revealed[s] ? st.hands[s].slice() : null
            })),
            myHand: st.hands[seat] && st.hands[seat].length ? evaluate(st.hands[seat].concat(st.board)).name : '',
            showdown: st.showdown, buttons, log: st.log.slice(), over: st.over, stats: st.stats[seat]
        };
    }

    // ── Bot ─────────────────────────────────────────────────
    /** Probabilidad de ganar (Monte Carlo) contra `opp` rivales con cartas desconocidas. */
    function equity(hand, board, opp, sims = 260) {
        const known = new Set(hand.concat(board));
        const rest = F.deck52().filter(c => !known.has(c));
        let score = 0;
        for (let k = 0; k < sims; k++) {
            const d = rest.slice();
            const draw = () => { const i = Math.floor(Math.random() * d.length); const c = d[i]; d[i] = d[d.length - 1]; d.pop(); return c; };
            const b = board.slice(); while (b.length < 5) b.push(draw());
            const me = evaluate(hand.concat(b)).v;
            let best = 0, ties = 0;
            for (let o = 0; o < opp; o++) { const v = evaluate([draw(), draw()].concat(b)).v; if (v > best) { best = v; ties = 0; } if (v === best) ties++; }
            if (me > best) score += 1; else if (me === best) score += 1 / (ties + 1);
        }
        return score / sims;
    }

    function bot(st, seat) {
        const opp = [...Array(st.n).keys()].filter(s => s !== seat && inHand(st, s)).length;
        const e = equity(st.hands[seat], st.board, Math.max(1, opp));
        const tc = toCall(st, seat), pot = potTotal(st), rb = raiseBounds(st, seat), chips = st.chips[seat];
        const odds = tc / (pot + tc || 1);
        const rnd = Math.random();
        const strong = 1 / (opp + 1);                 // equidad «neutral» con ese número de rivales
        const raiseTo = (frac) => {
            let to = st.curBet + Math.max(st.minRaise, Math.round((pot + tc) * frac / st.sb) * st.sb);
            to = Math.max(rb.min, Math.min(rb.max, to));
            return { type: 'raise', to };
        };
        // Poco fondo comparado con la ciega grande: o todo o nada
        if (chips <= st.bb * 6 && e > strong + 0.12 && rb.can) return { type: 'raise', to: rb.max };
        if (tc === 0) {
            if (rb.can && (e > strong + 0.28 || (e > strong + 0.12 && rnd < 0.55))) return raiseTo(e > 0.8 ? 0.9 : 0.6);
            if (rb.can && rnd < 0.09) return raiseTo(0.5);                                  // farol
            return { type: 'check' };
        }
        if (rb.can && e > strong + 0.33 && rnd < 0.7) return raiseTo(e > 0.85 ? 1 : 0.7);
        if (e >= odds + 0.04 || (tc <= st.bb && e > strong * 0.7)) return { type: 'call' };
        if (e >= odds - 0.06 && rnd < 0.25) return { type: 'call' };
        if (rb.can && rnd < 0.03 && st.street !== 'river') return raiseTo(0.8);               // farol de vez en cuando
        return { type: 'fold' };
    }

    Nexus.games.cardRules = Nexus.games.cardRules || {};
    /** Tiempo agotado online: pasa si se puede; si hay que pagar, se retira. */
    function autoAction(st, seat) { return st.bet[seat] >= st.curBet ? { type: 'check' } : { type: 'fold' }; }

    Nexus.games.cardRules.poker = { id: 'poker', autoAction, turnTime: 25, STRUCTURES, setup, validate, apply, step, view, bot, turn, evaluate, equity, pots, START, BLINDS, CAT, _startHand: startHand };
})();
