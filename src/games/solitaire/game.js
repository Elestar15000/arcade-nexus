/* ============================================================
   NEXUS ARCADE · games/solitaire/game.js
   Solitario Klondike con baraja francesa: robar 1, robar 3 y
   solitario diario (mismo reparto para todos). Arrastrar y soltar
   o tocar para mover solo, deshacer, pista, autocompletar y
   puntuación clásica (con bonus de tiempo al ganar).
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber, formatTime } = Nexus.util;
    const F = Nexus.games.frenchCards;

    // ── Lógica pura ─────────────────────────────────────────
    const SUITS = F.SUITS;
    const rank = F.rankOf, suit = F.suitOf, red = F.isRed;
    // Puntuación de Windows: robar 1 resta 100 por vuelta; robar 3, 20 por vuelta a partir de la cuarta; −2 cada 10 s; deshacer −15
    const PTS = { wasteTab: 5, toFound: 10, flip: 5, fromFound: -15, recycle1: -100, recycle3: -20, time10: -2, undo: -15 };
    /** Vegas: se paga 52 al empezar y cada carta en la fundación vale 5; 1 vuelta al mazo (robar 1) o 3 (robar 3). */
    const VEGAS = { cost: 52, perCard: 5 };

    /** Reparto: 7 columnas (1…7 cartas, sólo la última boca arriba) y el resto al mazo. */
    function deal(r) {
        const d = r.shuffle(F.deck52());
        const tab = [];
        for (let c = 0; c < 7; c++) { tab.push([]); for (let k = 0; k <= c; k++) tab[c].push({ c: d.pop(), up: k === c }); }
        return { stock: d, waste: [], found: { S: [], H: [], D: [], C: [] }, tab, score: 0, moves: 0, recycles: 0, vegas: false };
    }
    const top = (a) => a[a.length - 1];
    const canFound = (st, c) => { const f = st.found[suit(c)]; return f.length ? rank(top(f)) === rank(c) - 1 : rank(c) === 1; };
    const canTab = (st, c, col) => {
        const t = top(st.tab[col]);
        if (!t) return rank(c) === 13;
        return t.up && red(t.c) !== red(c) && rank(t.c) === rank(c) + 1;
    };
    /** Cartas que se mueven desde un origen. src: {from:'waste'} | {from:'tab', col, idx} | {from:'found', suit} */
    function cardsOf(st, src) {
        if (src.from === 'waste') return st.waste.length ? [top(st.waste)] : [];
        if (src.from === 'found') { const f = st.found[src.suit]; return f.length ? [top(f)] : []; }
        const col = st.tab[src.col]; if (!col || src.idx < 0 || src.idx >= col.length || !col[src.idx].up) return [];
        const seq = col.slice(src.idx).map(x => x.c);
        for (let i = 1; i < seq.length; i++) if (red(seq[i]) === red(seq[i - 1]) || rank(seq[i]) !== rank(seq[i - 1]) - 1) return [];
        return seq;
    }
    function canMove(st, src, dst) {
        const cs = cardsOf(st, src); if (!cs.length) return false;
        if (dst.to === 'found') return cs.length === 1 && src.from !== 'found' && canFound(st, cs[0]);
        if (dst.to === 'tab') return !(src.from === 'tab' && src.col === dst.col) && canTab(st, cs[0], dst.col);
        return false;
    }
    /** Aplica un movimiento válido (muta st). → { flipped } */
    function move(st, src, dst) {
        const cs = cardsOf(st, src);
        let moved;
        if (src.from === 'waste') moved = [st.waste.pop()].map(c => ({ c, up: true }));
        else if (src.from === 'found') moved = [st.found[src.suit].pop()].map(c => ({ c, up: true }));
        else moved = st.tab[src.col].splice(src.idx);
        if (st.vegas) {
            // Vegas: sólo cuentan las cartas en la fundación (5 cada una)
            if (dst.to === 'found') { st.found[suit(cs[0])].push(cs[0]); st.score += VEGAS.perCard; }
            else { st.tab[dst.col].push(...moved); if (src.from === 'found') st.score -= VEGAS.perCard; }
            let flipped = false;
            if (src.from === 'tab') { const t = top(st.tab[src.col]); if (t && !t.up) { t.up = true; flipped = true; } }
            st.moves++;
            return { flipped };
        }
        if (dst.to === 'found') { st.found[suit(cs[0])].push(cs[0]); st.score += src.from === 'found' ? 0 : PTS.toFound; }
        else { st.tab[dst.col].push(...moved); if (src.from === 'waste') st.score += PTS.wasteTab; if (src.from === 'found') st.score += PTS.fromFound; }
        let flipped = false;
        if (src.from === 'tab') { const t = top(st.tab[src.col]); if (t && !t.up) { t.up = true; flipped = true; st.score += PTS.flip; } }
        st.score = Math.max(0, st.score); st.moves++;
        return { flipped };
    }
    /** Robar del mazo (o darle la vuelta al descarte). */
    function draw(st, n) {
        if (!st.stock.length) {
            if (!st.waste.length) return false;
            if (st.vegas && st.recycles >= (n === 1 ? 0 : 2)) return 'limit';           // Vegas: 1 pasada (robar 1) o 3 (robar 3)
            st.stock = st.waste.reverse(); st.waste = []; st.recycles++;
            if (!st.vegas) {
                if (n === 1) st.score = Math.max(0, st.score + PTS.recycle1);
                else if (st.recycles >= 4) st.score = Math.max(0, st.score + PTS.recycle3);
            }
            st.moves++; return 'recycle';
        }
        for (let k = 0; k < n && st.stock.length; k++) st.waste.push(st.stock.pop());
        st.moves++; return 'draw';
    }
    const won = (st) => SUITS.every(s => st.found[s].length === 13);
    /** Ya está resuelto si no quedan cartas boca abajo (el mazo se puede recorrer): «Terminar» aparece antes. */
    const canAutoFinish = (st) => st.tab.every(col => col.every(x => x.up)) && (!st.vegas || (!st.stock.length && !st.waste.length));
    /** Carta segura para subir sola a la fundación: ases, doses o si las dos fundaciones del color contrario ya llegan a r − 1. */
    function safeFound(st, c) {
        if (!canFound(st, c)) return false;
        const r = rank(c); if (r <= 2) return true;
        const red = suit(c) === 'H' || suit(c) === 'D';
        const opp = red ? ['S', 'C'] : ['H', 'D'];
        return opp.every(s => st.found[s].length >= r - 1);
    }
    /** Mejor destino para una carta/pila tocada: fundación, luego una columna con carta, luego una vacía. */
    function bestTarget(st, src, preferTab) {
        const cs = cardsOf(st, src); if (!cs.length) return null;
        if (!preferTab && cs.length === 1 && src.from !== 'found' && canFound(st, cs[0])) return { to: 'found' };
        const cols = [...Array(7).keys()].filter(c => canMove(st, src, { to: 'tab', col: c }));
        const full = cols.find(c => st.tab[c].length);
        if (full !== undefined) return { to: 'tab', col: full };
        // A una columna vacía sólo si sirve de algo (no mover un rey que ya está al fondo)
        if (cols.length && !(src.from === 'tab' && src.idx === 0)) return { to: 'tab', col: cols[0] };
        if (preferTab && cs.length === 1 && src.from !== 'found' && canFound(st, cs[0])) return { to: 'found' };
        return null;
    }
    /** Pista: un movimiento útil (o robar). */
    function hint(st, noDraw) {
        const srcs = [];
        if (st.waste.length) srcs.push({ from: 'waste' });
        st.tab.forEach((col, c) => { for (let i = 0; i < col.length; i++) if (col[i].up) srcs.push({ from: 'tab', col: c, idx: i }); });
        // 1) a la fundación
        for (const s of srcs) { const cs = cardsOf(st, s); if (cs.length === 1 && canFound(st, cs[0]) && (s.from === 'waste' || s.idx === st.tab[s.col].length - 1)) return { src: s, dst: { to: 'found' } }; }
        // 2) mover una pila que destapa una carta (o deja hueco a un rey)
        for (const s of srcs) {
            if (s.from !== 'tab') continue;
            const col = st.tab[s.col]; if (s.idx > 0 && col[s.idx - 1].up) continue;     // sólo pilas enteras boca arriba
            if (s.idx === 0 && rank(col[0].c) === 13) continue;
            for (let c = 0; c < 7; c++) if (canMove(st, s, { to: 'tab', col: c }) && (st.tab[c].length || s.idx > 0)) return { src: s, dst: { to: 'tab', col: c } };
        }
        // 3) del descarte a una columna
        if (st.waste.length) for (let c = 0; c < 7; c++) if (canMove(st, { from: 'waste' }, { to: 'tab', col: c })) return { src: { from: 'waste' }, dst: { to: 'tab', col: c } };
        if (!noDraw && (st.stock.length || st.waste.length)) return { draw: true };
        return null;
    }
    const clone = (st) => JSON.parse(JSON.stringify(st));

    /**
     * Resolvedor de Klondike (robar 1, vueltas ilimitadas). Con vueltas ilimitadas cualquier carta del
     * mazo + descarte se puede alcanzar sin cambiar su orden, así que el «talón» se trata como un conjunto
     * ordenado del que se puede sacar cualquier carta. Búsqueda en profundidad con memoria de estados y
     * presupuesto de nodos. → true (tiene solución) | false (no tiene) | null (no se pudo decidir a tiempo).
     */
    function solvable(st0, budget = 150000) {
        const tab = st0.tab.map(col => ({ down: col.filter(x => !x.up).map(x => x.c), up: col.filter(x => x.up).map(x => x.c) }));
        const talon = st0.stock.slice().reverse().concat(st0.waste.slice().reverse());
        const fnd = { S: 0, H: 0, D: 0, C: 0 };
        for (const s of SUITS) fnd[s] = st0.found[s].length;
        const seen = new Set();
        let nodes = 0, out = false;
        const key = () => SUITS.map(s => fnd[s]).join('') + '|' + talon.join('') + '|' + tab.map(c => c.down.length + ':' + c.up.join('')).sort().join('/');
        const fit = (c, s) => fnd[suit(c)] === rank(c) - 1;
        const onto = (c, dst) => { const t = dst.up[dst.up.length - 1]; return t ? (red(t) !== red(c) && rank(t) === rank(c) + 1) : (dst.down.length === 0 && rank(c) === 13); };
        const minF = (isRed) => Math.min(...SUITS.filter(s => (s === 'H' || s === 'D') !== isRed).map(s => fnd[s]));
        const safe = (c) => rank(c) <= 2 || minF(red(c)) >= rank(c) - 1;      // nadie la necesitará en el tablero
        function dfs() {
            if (out || ++nodes > budget) return null;
            if (SUITS.every(s => fnd[s] === 13)) return true;
            const k = key(); if (seen.has(k)) return false; seen.add(k);
            // 1) Subidas seguras a la fundación (sin bifurcar)
            for (const col of tab) {
                const c = col.up[col.up.length - 1];
                if (c && fit(c) && safe(c)) {
                    col.up.pop(); fnd[suit(c)]++; let fl = false;
                    if (!col.up.length && col.down.length) { col.up.push(col.down.pop()); fl = true; }
                    const r = dfs();
                    if (fl) col.down.push(col.up.pop()); col.up.push(c); fnd[suit(c)]--;
                    return r;
                }
            }
            const moves = [];
            // 2) Del tablero a la fundación
            tab.forEach((col, i) => { const c = col.up[col.up.length - 1]; if (c && fit(c)) moves.push(['tf', i]); });
            // 3) Pilas del tablero que destapan una carta o vacían la columna para un rey
            tab.forEach((col, i) => {
                for (let j = 0; j < col.up.length; j++) {
                    const c = col.up[j];
                    if (j > 0) continue;               // sólo la pila entera boca arriba (lo demás no destapa nada)
                    if (!col.down.length && rank(c) === 13) continue;
                    tab.forEach((dst, d) => { if (d !== i && onto(c, dst)) moves.push(['tt', i, d]); });
                }
            });
            // 4) Del talón a la fundación o al tablero
            talon.forEach((c, j) => {
                if (fit(c)) moves.push(['lf', j]);
                tab.forEach((dst, d) => { if (onto(c, dst)) moves.push(['lt', j, d]); });
            });
            for (const m of moves) {
                let r;
                if (m[0] === 'tf') {
                    const col = tab[m[1]], c = col.up.pop(); fnd[suit(c)]++; let fl = false;
                    if (!col.up.length && col.down.length) { col.up.push(col.down.pop()); fl = true; }
                    r = dfs(); if (fl) col.down.push(col.up.pop()); col.up.push(c); fnd[suit(c)]--;
                } else if (m[0] === 'tt') {
                    const src = tab[m[1]], dst = tab[m[2]], seq = src.up.splice(0); dst.up.push(...seq); let fl = false;
                    if (src.down.length) { src.up.push(src.down.pop()); fl = true; }
                    r = dfs(); if (fl) src.down.push(src.up.pop()); dst.up.splice(dst.up.length - seq.length); src.up.push(...seq);
                } else if (m[0] === 'lf') {
                    const c = talon.splice(m[1], 1)[0]; fnd[suit(c)]++; r = dfs(); fnd[suit(c)]--; talon.splice(m[1], 0, c);
                } else {
                    const c = talon.splice(m[1], 1)[0]; tab[m[2]].up.push(c); r = dfs(); tab[m[2]].up.pop(); talon.splice(m[1], 0, c);
                }
                if (r === true) return true;
                if (r === null) return null;
            }
            return false;
        }
        const r = dfs();
        return r;
    }
    /** Reparto del solitario diario: se prueba la semilla del día y las siguientes hasta dar con uno con solución. */
    function dailyDeal(day) {
        const S = Nexus.games.seed, seedOf = (k) => `solitaire:${day}${k ? ':' + k : ''}`;
        let cached = null;
        try { cached = JSON.parse(localStorage.getItem('nexus.solitaireDaily') || 'null'); } catch (e) { /* sin almacenamiento */ }
        if (cached && cached.day === day) return deal(S.rng(seedOf(cached.k)));
        for (let k = 0; k < 40; k++) {
            const st = deal(S.rng(seedOf(k)));
            if (solvable(clone(st), 80000) === true) {
                try { localStorage.setItem('nexus.solitaireDaily', JSON.stringify({ day, k })); } catch (e) { /* noop */ }
                return st;
            }
        }
        return deal(S.rng(seedOf(0)));
    }
    Nexus.games.solitaireLogic = { deal, canFound, canTab, cardsOf, canMove, move, draw, won, canAutoFinish, bestTarget, hint, PTS, solvable, dailyDeal };

    // ── Juego ───────────────────────────────────────────────
    const MODES = [
        { id: 'robar1', label: 'Robar 1', emoji: '🂡', desc: 'El clásico: robas de una en una', n: 1 },
        { id: 'robar3', label: 'Robar 3', emoji: '🃏', desc: 'Más difícil: robas de tres en tres', n: 3 },
        { id: 'diario', label: 'Solitario diario', emoji: '📅', desc: 'El mismo reparto para todos · robar 1', n: 1, daily: true },
        { id: 'vegas1', label: 'Vegas · robar 1', emoji: '🎰', desc: 'Pagas 52, ganas 5 por carta subida. Una sola pasada al mazo y sin deshacer', n: 1, vegas: true },
        { id: 'vegas3', label: 'Vegas · robar 3', emoji: '🎲', desc: 'Pagas 52, ganas 5 por carta subida. Tres pasadas al mazo y sin deshacer', n: 3, vegas: true }
    ];

    class Solitaire extends Nexus.games.PuzzleGame {
        constructor(root) {
            super(root, {
                id: 'solitaire', name: 'Solitario', emoji: '🂡', accent: '#22c55e', modes: MODES,
                tagline: 'El Klondike de siempre: sube las cuatro escaleras de As a Rey.',
                pills: [{ id: 'score', icon: '⭐', init: '0', title: 'Puntos' }, { id: 'moves', icon: '👣', init: '0', title: 'Movimientos' }],
                help: ['Objetivo: llevar las 52 cartas a las <b>cuatro fundaciones</b> (arriba a la derecha), una por palo, del <b>As al Rey</b>.',
                    'En las 7 columnas se apilan cartas <b>de una en una hacia abajo y alternando color</b> (un 7 negro sobre un 8 rojo). Puedes mover una pila entera ordenada.',
                    'En un hueco vacío sólo cabe un <b>Rey</b> (o una pila que empiece por Rey). Al destapar una carta boca abajo, se da la vuelta sola.',
                    'Toca el <b>mazo</b> para robar (1 o 3 cartas según el modo). Cuando se acaba, tócalo otra vez para darle la vuelta al descarte.',
                    '<b>Toca</b> una carta para mandarla a su mejor sitio del tablero (si no hay, a la fundación); <b>doble toque</b> la sube a la fundación; o <b>arrástrala</b> donde quieras. <b>Ctrl+Z</b> deshace, <b>H</b> da una pista y <b>Espacio</b> roba.',
                    'Puntos (como en Windows): +5 descarte→columna, +10 a la fundación, +5 al destapar, −15 al bajar de la fundación, −100 por vuelta al mazo en robar 1 (−20 desde la cuarta en robar 3), −2 cada 10 s y −15 por deshacer. Al ganar, bonus por rapidez.',
                    '<b>Vegas</b>: pagas 52 y ganas 5 por cada carta que subes; una pasada al mazo (robar 1) o tres (robar 3) y sin deshacer.',
                    'Con todo boca arriba aparece <b>Terminar</b>. Si recorres el mazo entero sin cambios, te avisa de que no quedan movimientos. ⚙️ «Subida automática segura» sube sola las cartas que ya no hacen falta.'],
                timer: true
            });
            this.bindGame();
            this.showMenu();
        }

        layout() {
            return {
                main: `<div class="sol-bar">
                        <button type="button" class="btn btn-ghost btn-sm" id="sol-undo">↶ Deshacer</button>
                        <button type="button" class="btn btn-ghost btn-sm" id="sol-hint">💡 Pista</button>
                        <button type="button" class="btn btn-primary btn-sm" id="sol-auto" hidden>⚡ Terminar</button>
                    </div>
                    <div class="sol" id="sol" aria-label="Mesa de solitario">
                        <div class="sol-top">
                            <div class="sol-slot sol-stock" id="sol-stock" role="button" tabindex="0" aria-label="Mazo"></div>
                            <div class="sol-slot sol-waste" id="sol-waste"></div>
                            <span class="sol-gap"></span>
                            ${SUITS.map(s => `<div class="sol-slot sol-found" data-found="${s}" aria-label="Fundación de ${F.SUIT_NAME[s]}"><span class="sol-ghost">${F.SYM[s]}</span></div>`).join('')}
                        </div>
                        <div class="sol-tab">${[...Array(7).keys()].map(c => `<div class="sol-col" data-col="${c}"></div>`).join('')}</div>
                    </div>`,
                side: `<div class="ax-card"><h3>Partida</h3><div class="ax-rows">
                    <div class="ax-row"><span>Modo</span><b data-s="mode">–</b></div>
                    <div class="ax-row"><span>En fundaciones</span><b data-s="found">0 / 52</b></div>
                    <div class="ax-row"><span>Mazo</span><b data-s="stock">–</b></div>
                    <div class="ax-row"><span>Vueltas al mazo</span><b data-s="rec">0</b></div>
                    <div class="ax-row"><span>Récord del modo</span><b data-s="best">–</b></div></div></div>`
            };
        }

        bindGame() {
            const board = this.$('#sol');
            this.$('#sol-stock').addEventListener('click', () => this.drawCard());
            this.$('#sol-stock').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.drawCard(); } });
            this.$('#sol-undo').addEventListener('click', () => this.undo());
            this.$('#sol-hint').addEventListener('click', () => this.showHint());
            this.$('#sol-auto').addEventListener('click', () => this.autoFinish());
            this.onKey = (e) => {
                if (this.state !== 'playing' || !this.overlay.hidden || e.target.closest('input,textarea')) return;
                if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undo(); }
                else if (e.key === 'h' || e.key === 'H') this.showHint();
                else if (e.key === ' ' && !e.target.closest('button,[role=button]')) { e.preventDefault(); this.drawCard(); }
            };
            document.addEventListener('keydown', this.onKey);
            // Arrastrar y soltar (o tocar) con eventos de puntero
            board.addEventListener('pointerdown', (e) => this.down(e));
            this.onMove = (e) => this.dragMove(e);
            this.onUp = (e) => this.up(e);
            window.addEventListener('pointermove', this.onMove);
            window.addEventListener('pointerup', this.onUp);
            window.addEventListener('pointercancel', this.onUp);
            board.addEventListener('dblclick', (e) => e.preventDefault());
            this.ro = new ResizeObserver(() => this.fit());
            this.ro.observe(board);
        }
        onDestroy() {
            document.removeEventListener('keydown', this.onKey);
            window.removeEventListener('pointermove', this.onMove); window.removeEventListener('pointerup', this.onUp); window.removeEventListener('pointercancel', this.onUp);
            if (this.ro) this.ro.disconnect();
        }

        // El diario siempre tiene solución: se valida con el resolvedor (antes ~1 de cada 5 días nadie podía ganar)
        newGame(mode, r) {
            this.st = this.daily ? dailyDeal(this.daily) : deal(r); this.hist = []; this.hintAt = null; this.lastTick = 0; this.idleCycle = null;
            if (mode && mode.vegas) { this.st.vegas = true; this.st.score = -VEGAS.cost; }
        }
        serialize() { return this.st; }
        restore(d) { this.st = d; this.hist = []; }

        /** Ancho de carta según el espacio disponible. */
        fit() {
            const b = this.$('#sol'); if (!b) return;
            const cs = getComputedStyle(b), gap = parseFloat(cs.getPropertyValue('--gap')) || 8;
            const w = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            const cw = Math.max(34, Math.min(92, Math.floor((w - 6 * gap) / 7)));
            b.style.setProperty('--cw', cw + 'px');
        }

        // ── Acciones ────────────────────────────────────────
        push() { this.hist.push(clone(this.st)); if (this.hist.length > 120) this.hist.shift(); }
        after(sound) {
            this.hintAt = null;
            if (sound) Nexus.audio.play(sound);
            this.render();
            if (won(this.st)) { this.win(); return; }
            this.saveRunSoon();
        }
        saveRunSoon() { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.saveRun(), 600); }

        drawCard() {
            if (this.state !== 'playing') return;
            this.push();
            const r = draw(this.st, this.mode.n);
            if (!r || r === 'limit') { this.hist.pop(); this.toast(r === 'limit' ? 'En Vegas no quedan más pasadas al mazo' : 'El mazo está vacío'); return; }
            // ¿Se ha recorrido el mazo entero sin hacer nada útil? → aviso de «no hay más movimientos»
            if (r === 'recycle') {
                const sig = this.sig();
                if (this.idleCycle && this.idleCycle === sig && !hint(this.st, true)) this.noMoves();
                this.idleCycle = sig;
            }
            this.after(r === 'recycle' ? 'flip' : 'click');
        }
        tryMove(src, dst) {
            if (!canMove(this.st, src, dst)) return false;
            this.push();
            const res = move(this.st, src, dst);
            this.idleCycle = null;
            this.autoSafe();
            this.after(dst.to === 'found' ? 'orbCollect' : res.flipped ? 'flip' : 'chessMove');
            return true;
        }
        /** Subida automática de cartas seguras a la fundación (ajuste solitaire.autoFound). */
        autoSafe() {
            if (!Nexus.services.settings.get('solitaire.autoFound')) return;
            for (let guard = 0; guard < 52; guard++) {
                let done = false;
                for (let c = 0; c < 7 && !done; c++) {
                    const col = this.st.tab[c], t = col[col.length - 1];
                    if (t && t.up && safeFound(this.st, t.c)) { move(this.st, { from: 'tab', col: c, idx: col.length - 1 }, { to: 'found' }); done = true; }
                }
                const w = this.st.waste[this.st.waste.length - 1];
                if (!done && w && safeFound(this.st, w)) { move(this.st, { from: 'waste' }, { to: 'found' }); done = true; }
                if (!done) break;
            }
        }
        sig() { return JSON.stringify([this.st.tab.map(c => c.length), SUITS.map(s => this.st.found[s].length), this.st.waste.length + this.st.stock.length]); }
        noMoves() {
            Nexus.ui.modal.confirm({ title: 'No hay más movimientos', message: 'Has recorrido el mazo entero sin cambios. ¿Te rindes? (o cancela para deshacer jugadas)', confirmLabel: '🏳️ Rendirse', cancelLabel: '↶ Seguir', icon: '🂠' })
                .then(ok => { if (ok && !this.destroyed && this.state === 'playing') this.onGiveUp(); });
        }
        undo() {
            if (this.state !== 'playing' || !this.hist.length) { if (this.state === 'playing') this.toast('Nada que deshacer'); return; }
            if (this.st.vegas) { this.toast('En Vegas no se puede deshacer'); return; }
            const before = this.st.score;
            this.st = this.hist.pop(); this.st.moves++;
            // Deshacer cuesta 15 puntos (antes era gratis, incluso tras ver la carta robada)
            this.st.score = Math.max(0, Math.min(before, this.st.score) + PTS.undo);
            this.undos = (this.undos || 0) + 1;
            Nexus.audio.play('click'); this.render(); this.saveRunSoon();
        }
        onTick() {
            // −2 puntos cada 10 s (puntuación estándar; no en Vegas)
            if (this.state !== 'playing' || this.st.vegas) return;
            const k = Math.floor(this.elapsed / 10);
            if (k > (this.lastTick || 0)) { this.st.score = Math.max(0, this.st.score + PTS.time10 * (k - (this.lastTick || 0))); this.lastTick = k; this.pill('score', formatNumber(this.st.score)); }
        }
        showHint() {
            if (this.state !== 'playing') return;
            const h = hint(this.st);
            if (!h) { this.toast('No quedan movimientos: prueba a deshacer'); return; }
            this.hintAt = h; this.render();
            if (h.draw) this.toast(this.st.stock.length ? 'Roba del mazo' : 'Dale la vuelta al mazo');
            this.later(() => { if (this.hintAt === h) { this.hintAt = null; this.render(); } }, 2200);
        }
        autoFinish() {
            if (this.state !== 'playing' || !canAutoFinish(this.st)) return;
            this.auto = true; this.$('#sol-auto').hidden = true; this.$('#sol-auto').style.display = 'none';
            const stepF = () => {
                if (this.destroyed || this.state !== 'playing') return;
                // Con todo boca arriba, el descarte y el mazo también se suben (robando lo que haga falta)
                const w = this.st.waste[this.st.waste.length - 1];
                if (w && canFound(this.st, w)) { move(this.st, { from: 'waste' }, { to: 'found' }); Nexus.audio.play('orbCollect'); this.render(); if (won(this.st)) { this.win(); return; } this.later(stepF, 90); return; }
                for (let c = 0; c < 7; c++) {
                    const col = this.st.tab[c]; if (!col.length) continue;
                    const src = { from: 'tab', col: c, idx: col.length - 1 };
                    if (canMove(this.st, src, { to: 'found' })) {
                        // Prioriza la carta más baja
                        let best = c, low = rank(col[col.length - 1].c);
                        for (let k = 0; k < 7; k++) { const o = this.st.tab[k]; if (o.length && rank(o[o.length - 1].c) < low && canMove(this.st, { from: 'tab', col: k, idx: o.length - 1 }, { to: 'found' })) { best = k; low = rank(o[o.length - 1].c); } }
                        move(this.st, { from: 'tab', col: best, idx: this.st.tab[best].length - 1 }, { to: 'found' });
                        Nexus.audio.play('orbCollect'); this.render();
                        if (won(this.st)) { this.win(); return; }
                        this.later(stepF, 90); return;
                    }
                }
                if (this.st.stock.length || this.st.waste.length) { draw(this.st, 1); this.render(); this.later(stepF, 60); }
            };
            stepF();
        }

        win() {
            const t = Math.max(1, this.elapsed);
            const bonus = t >= 30 && !this.st.vegas ? Math.round(700000 / t) : 0;
            const total = this.st.score + bonus;
            this.celebrate();
            this.finish({
                won: true, score: total, emoji: '🂡', title: '¡SOLITARIO RESUELTO!', label: `${formatTime(this.elapsed)} · ${this.st.moves} mov.`,
                extra: { moves: this.st.moves, draw: this.mode.n, recycles: this.st.recycles },
                updateExtra: (x) => { x.solved = (x.solved || 0) + 1; },
                stats: [{ label: 'Tiempo', value: formatTime(this.elapsed) }, { label: 'Movimientos', value: this.st.moves }, { label: 'Puntos', value: formatNumber(this.st.score) }, { label: 'Bonus de tiempo', value: '+' + formatNumber(bonus) }],
                delay: 1400
            });
        }
        celebrate() { this.$('#sol').classList.add('won'); }
        onGiveUp() {
            const n = SUITS.reduce((a, s) => a + this.st.found[s].length, 0);
            this.finish({ won: false, score: this.st.score, title: 'TE HAS RENDIDO', extra: { moves: this.st.moves, draw: this.mode.n, foundCards: n },
                stats: [{ label: 'En fundaciones', value: `${n} / 52` }, { label: 'Movimientos', value: this.st.moves }, { label: 'Tiempo', value: formatTime(this.elapsed) }] });
        }

        // ── Puntero: tocar o arrastrar ──────────────────────
        srcFromEl(el) {
            const card = el.closest('.sol-card'); if (!card || card.classList.contains('down')) return null;
            if (card.closest('#sol-waste')) return card === this.$('#sol-waste .sol-card:last-child') ? { from: 'waste' } : null;
            const f = card.closest('[data-found]'); if (f) return { from: 'found', suit: f.dataset.found };
            const col = card.closest('[data-col]'); if (col) return { from: 'tab', col: +col.dataset.col, idx: +card.dataset.idx };
            return null;
        }
        down(e) {
            if (this.state !== 'playing' || this.auto || this.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
            const card = e.target.closest('.sol-card');
            if (!card || card.closest('#sol-stock')) return;
            const src = this.srcFromEl(card); if (!src) return;
            const cs = cardsOf(this.st, src); if (!cs.length) return;
            const r = card.getBoundingClientRect();
            this.drag = { src, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, on: false, id: e.pointerId, el: card };
        }
        dragMove(e) {
            const d = this.drag; if (!d || e.pointerId !== d.id) return;
            if (!d.on) {
                if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 7) return;
                d.on = true;
                // Fantasma con las cartas que se mueven
                const ghost = document.createElement('div');
                ghost.className = 'sol-ghostpile';
                ghost.style.setProperty('--cw', getComputedStyle(this.$('#sol')).getPropertyValue('--cw'));
                ghost.innerHTML = cardsOf(this.st, d.src).map((c, i) => this.cardHtml(c, true, { style: `top:calc(var(--cw) * ${i * 0.34})` })).join('');
                document.body.appendChild(ghost);
                d.ghost = ghost;
                this.hideDragged(d.src, true);
            }
            e.preventDefault();
            d.ghost.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px)`;
            const t = this.dropTarget(e.clientX - d.dx + d.el.offsetWidth / 2, e.clientY - d.dy + 12);
            this.$$('.sol-drop').forEach(x => x.classList.remove('sol-drop'));
            if (t && canMove(this.st, d.src, t.dst)) t.el.classList.add('sol-drop');
        }
        up(e) {
            const d = this.drag; if (!d || e.pointerId !== d.id) return;
            this.drag = null;
            this.$$('.sol-drop').forEach(x => x.classList.remove('sol-drop'));
            if (!d.on) {
                // Un toque: a su mejor sitio en el tablero; doble toque: a la fundación (antes un toque la mandaba siempre arriba)
                const key = JSON.stringify(d.src), now = performance.now();
                if (this.tapWait && this.tapWait.key === key && now - this.tapWait.t < 330) {
                    clearTimeout(this.tapWait.timer); this.tapWait = null;
                    const cs = cardsOf(this.st, d.src);
                    if (cs.length === 1 && d.src.from !== 'found' && canFound(this.st, cs[0])) { this.tryMove(d.src, { to: 'found' }); return; }
                }
                const tab = bestTarget(this.st, d.src, true), cs = cardsOf(this.st, d.src);
                const found = cs.length === 1 && d.src.from !== 'found' && canFound(this.st, cs[0]);
                const fail = () => { Nexus.audio.play('error'); d.el.classList.remove('shake'); void d.el.offsetWidth; d.el.classList.add('shake'); };
                if (tab && tab.to === 'tab' && found) {
                    // Puede ir a los dos sitios: se espera un instante por si es un doble toque
                    const src = d.src;
                    if (this.tapWait) clearTimeout(this.tapWait.timer);
                    this.tapWait = { key, t: now, timer: setTimeout(() => { this.tapWait = null; if (!this.destroyed && this.state === 'playing') this.tryMove(src, tab); }, 330) };
                    return;
                }
                if (tab) this.tryMove(d.src, tab); else fail();
                return;
            }
            d.ghost.remove(); this.hideDragged(d.src, false);
            const t = this.dropTarget(e.clientX - d.dx + d.el.offsetWidth / 2, e.clientY - d.dy + 12);
            if (!t || !this.tryMove(d.src, t.dst)) { if (t) Nexus.audio.play('error'); this.render(); }
        }
        hideDragged(src, on) {
            const els = src.from === 'tab' ? this.$$(`[data-col="${src.col}"] .sol-card`).filter(x => +x.dataset.idx >= src.idx)
                : src.from === 'waste' ? [this.$('#sol-waste .sol-card:last-child')] : [this.$(`[data-found="${src.suit}"] .sol-card:last-child`)];
            els.forEach(x => x && x.classList.toggle('lifted', on));
        }
        /** Columna o fundación bajo un punto (usa la caja de la columna entera). */
        dropTarget(x, y) {
            for (const f of this.$$('[data-found]')) { const r = f.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top - 10 && y <= r.bottom + 10) return { el: f, dst: { to: 'found' } }; }
            let best = null, bd = Infinity;
            for (const c of this.$$('[data-col]')) {
                const r = c.getBoundingClientRect(), last = c.lastElementChild, bottom = last ? last.getBoundingClientRect().bottom : r.top + r.width * 1.4;
                if (y < r.top - 20 || y > bottom + 40) continue;
                const dist = Math.abs(x - (r.left + r.width / 2));
                if (dist < bd && dist < r.width) { bd = dist; best = { el: c, dst: { to: 'tab', col: +c.dataset.col } }; }
            }
            return best;
        }

        // ── Pintado ─────────────────────────────────────────
        cardHtml(c, up, o = {}) {
            if (!up) return `<span class="sol-card down" ${o.attrs || ''} style="${o.style || ''}"><i></i></span>`;
            const s = suit(c), sym = F.SYM[s], lab = F.label(c), r = rank(c);
            return `<span class="sol-card ${red(c) ? 'red' : 'black'}${r >= 11 ? ' fig' : ''} ${o.cls || ''}" data-card="${c}" title="${esc(F.cardName(c))}" ${o.attrs || ''} style="${o.style || ''}">
                <b class="sc-c">${lab}<i>${sym}</i></b><span class="sc-mid">${r >= 11 ? lab : sym}</span><b class="sc-c br">${lab}<i>${sym}</i></b></span>`;
        }
        render() {
            if (!this.st) return;
            this.fit();
            const st = this.st, h = this.hintAt;
            const isHint = (src) => h && h.src && JSON.stringify(h.src) === JSON.stringify(src);
            // Mazo
            const stock = this.$('#sol-stock');
            stock.innerHTML = st.stock.length ? `<span class="sol-card down${h && h.draw ? ' hint' : ''}"><i></i><b>${st.stock.length}</b></span>` : `<span class="sol-recycle${h && h.draw ? ' hint' : ''}" title="Dar la vuelta">${st.waste.length ? '↻' : ''}</span>`;
            // Descarte (en robar 3 se ven las 3 últimas abiertas)
            const show = st.waste.slice(-(this.mode.n === 3 ? 3 : 1));
            this.$('#sol-waste').innerHTML = show.map((c, i) => this.cardHtml(c, true, { cls: (i === show.length - 1 && isHint({ from: 'waste' }) ? 'hint' : ''), style: `left:calc(var(--cw) * ${i * 0.3})` })).join('');
            // Fundaciones
            for (const s of SUITS) {
                const f = this.$(`[data-found="${s}"]`), pile = st.found[s];
                f.innerHTML = `<span class="sol-ghost">${F.SYM[s]}</span>` + (pile.length ? this.cardHtml(top(pile), true, { cls: h && h.dst && h.dst.to === 'found' && h.src && cardsOf(st, h.src)[0] && suit(cardsOf(st, h.src)[0]) === s ? 'target' : '' }) : '');
                f.classList.toggle('target', !!(h && h.dst && h.dst.to === 'found' && h.src && cardsOf(st, h.src)[0] && suit(cardsOf(st, h.src)[0]) === s && !pile.length));
            }
            // Columnas: separación más corta si la columna es larga
            st.tab.forEach((col, c) => {
                const el = this.$(`[data-col="${c}"]`);
                const ups = col.filter(x => x.up).length, downs = col.length - ups;
                let upGap = ups > 12 ? 0.22 : ups > 8 ? 0.27 : 0.34, downGap = 0.14;
                // Se comprime el solape para que la columna quepa en el alto visible (en móvil se alargaba bajo la pantalla)
                const cw = parseFloat(getComputedStyle(this.$('#sol')).getPropertyValue('--cw')) || 60;
                const room = (window.innerHeight - el.getBoundingClientRect().top - 16) / cw - 1.45;
                if (room > 0 && ups > 1 && downs * downGap + (ups - 1) * upGap > room) {
                    downGap = Math.max(0.07, Math.min(downGap, room * 0.25 / Math.max(1, downs)));
                    upGap = Math.max(0.17, (room - downs * downGap) / (ups - 1));
                }
                let y = 0;
                el.innerHTML = col.map((x, i) => {
                    const html = this.cardHtml(x.c, x.up, { attrs: `data-idx="${i}"`, cls: (h && h.src && h.src.from === 'tab' && h.src.col === c && i >= h.src.idx ? 'hint' : ''), style: `top:calc(var(--cw) * ${y.toFixed(3)})` });
                    y += x.up ? upGap : downGap;
                    return html;
                }).join('');
                el.style.setProperty('--h', (y + 1.45).toFixed(3));
                el.classList.toggle('target', !!(h && h.dst && h.dst.to === 'tab' && h.dst.col === c));
            });
            const autoOk = !this.auto && canAutoFinish(st) && !won(st);
            this.$('#sol-auto').hidden = !autoOk; this.$('#sol-auto').style.display = autoOk ? '' : 'none';     // .btn ignora [hidden]
            this.$('#sol-undo').disabled = !this.hist.length;
            // Lateral y pastillas
            const nf = SUITS.reduce((a, s) => a + st.found[s].length, 0);
            this.pill('score', formatNumber(st.score)); this.pill('moves', st.moves);
            const set = (k, v) => { const e = this.root.querySelector(`[data-s="${k}"]`); if (e) e.textContent = v; };
            set('mode', this.mode ? this.mode.label : '–'); set('found', `${nf} / 52`); set('stock', `${st.stock.length} · descarte ${st.waste.length}`); set('rec', st.recycles);
            const ms = Nexus.services.progress.stats('solitaire').byMode[this.mode && this.mode.id] || {};
            set('best', ms.bestTime !== null && ms.bestTime !== undefined ? formatTime(ms.bestTime) : '–');
        }
        onResume() { this.render(); }
        start(id) { this.auto = false; const b = this.$('#sol'); if (b) b.classList.remove('won'); super.start(id); }
        resume() { this.auto = false; super.resume(); }
    }

    // ── Logros y registro ───────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'solitaire' ? c.event : null);
    A.register([
        { id: 'sol_first', game: 'solitaire', name: 'Paciencia', desc: 'Resuelve un solitario.', icon: '🂡', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won; } },
        { id: 'sol_draw3', game: 'solitaire', name: 'De tres en tres', desc: 'Resuelve un solitario robando 3.', icon: '🃏', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.extra.draw === 3; } },
        { id: 'sol_fast', game: 'solitaire', name: 'Manos rápidas', desc: 'Resuelve un solitario en menos de 3 minutos.', icon: '⚡', rarity: 'epic', test: (c) => { const e = ev(c); return !!e && e.won && e.time < 180; } },
        { id: 'sol_norecycle', game: 'solitaire', name: 'A la primera', desc: 'Resuelve un solitario sin darle la vuelta al mazo.', icon: '🎯', rarity: 'epic', test: (c) => { const e = ev(c); return !!e && e.won && e.extra.recycles === 0; } },
        { id: 'sol_daily', game: 'solitaire', name: 'Solitario del día', desc: 'Resuelve el solitario diario.', icon: '📅', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won && e.extra.daily; } },
        { id: 'sol_10', game: 'solitaire', name: 'Maestro de la paciencia', desc: 'Resuelve 10 solitarios.', icon: '🏆', rarity: 'rare', ...A.counter((c) => c.stats('solitaire').extra.solved || 0, 10) }
    ]);

    Nexus.games.registry.register({
        id: 'solitaire', name: 'Solitario', emoji: '🂡', accent: '#22c55e',
        tagline: 'Klondike · robar 1, robar 3 y reto diario', tags: ['Cartas', 'Un jugador', 'Reto diario'],
        description: 'El solitario de siempre con baraja francesa: arrastra o toca las cartas, deshaz, pide pistas y termina solo cuando todo está a la vista. Con modo robar 3 y un reparto diario igual para todos.',
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'wins', label: 'Resueltos' }, { id: 'time', label: 'Mejor tiempo' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new Solitaire(root)
    });
})();
