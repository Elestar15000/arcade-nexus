/* ============================================================
   NEXUS ARCADE · games/g2048/game.js
   2048: clásico 4×4, grande 5×5, contrarreloj (3 min) y reto
   diario (misma secuencia de fichas para todos, 150 movimientos).
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber, formatTime } = Nexus.util;
    const Kit = Nexus.games.kit;

    // ── Lógica pura ─────────────────────────────────────────
    /**
     * Desliza el tablero. tiles: [{id, v, r, c}]. dir: up|down|left|right.
     * Devuelve { tiles, moved, gained, merges: [{into, from:[id,id], v}] } (no muta la entrada).
     */
    function slide(tiles, n, dir, nextId) {
        const grid = Array.from({ length: n }, () => new Array(n).fill(null));
        for (const t of tiles) grid[t.r][t.c] = t;
        const out = []; let moved = false, gained = 0; const merges = [];
        for (let line = 0; line < n; line++) {
            const cells = [];
            for (let k = 0; k < n; k++) {
                const [r, c] = dir === 'left' ? [line, k] : dir === 'right' ? [line, n - 1 - k] : dir === 'up' ? [k, line] : [n - 1 - k, line];
                cells.push([r, c]);
            }
            const items = cells.map(([r, c]) => grid[r][c]).filter(Boolean);
            let pos = 0;
            for (let i = 0; i < items.length; i++) {
                const a = items[i], b = items[i + 1];
                const [r, c] = cells[pos];
                if (b && b.v === a.v) {
                    const id = nextId();
                    out.push({ id, v: a.v * 2, r, c, merged: true, from: [a.id, b.id] });
                    merges.push({ into: id, from: [{ id: a.id, r, c }, { id: b.id, r, c }], v: a.v * 2 });
                    gained += a.v * 2;
                    if (a.r !== r || a.c !== c || b.r !== r || b.c !== c) moved = true;
                    moved = true;
                    i++;
                } else {
                    if (a.r !== r || a.c !== c) moved = true;
                    out.push({ id: a.id, v: a.v, r, c });
                }
                pos++;
            }
        }
        return { tiles: out, moved, gained, merges };
    }
    function canMove(tiles, n) {
        if (tiles.length < n * n) return true;
        const g = Array.from({ length: n }, () => new Array(n).fill(0));
        for (const t of tiles) g[t.r][t.c] = t.v;
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((c + 1 < n && g[r][c] === g[r][c + 1]) || (r + 1 < n && g[r][c] === g[r + 1][c])) return true;
        return false;
    }
    function spawn(tiles, n, r, id) {
        const free = [];
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!tiles.some(t => t.r === y && t.c === x)) free.push([y, x]);
        if (!free.length) return null;
        const [y, x] = free[Math.floor(r() * free.length)];
        return { id, v: r() < 0.9 ? 2 : 4, r: y, c: x, fresh: true };
    }
    Nexus.games.g2048Logic = { slide, canMove, spawn };

    // ── Juego ───────────────────────────────────────────────
    const MODES = [
        { id: 'clasico', label: 'Clásico 4×4', emoji: '🟧', desc: 'Llega a 2048 (y sigue si quieres)', n: 4, target: 2048, undo: 3 },
        { id: 'grande', label: 'Grande 5×5', emoji: '🟪', desc: 'Más espacio: llega a 4096', n: 5, target: 4096, undo: 3 },
        { id: 'contrarreloj', label: 'Contrarreloj', emoji: '⏱️', desc: '3 minutos para sumar todo lo posible', n: 4, limit: 180, undo: 0 },
        { id: 'diario', label: '2048 diario', emoji: '📅', desc: 'Mismos valores de ficha para todos · 150 movimientos', n: 4, moves: 150, undo: 0, daily: true }
    ];

    class G2048 extends Nexus.games.PuzzleGame {
        constructor(root) {
            super(root, {
                id: 'g2048', name: '2048', emoji: '🟧', accent: '#f59e0b', modes: MODES, noGiveUp: false,
                tagline: 'Desliza las fichas: las iguales se suman. ¿Llegarás a 2048?',
                pills: [{ id: 'score', icon: '⭐', init: '0', title: 'Puntos' }, { id: 'best', icon: '🏆', init: '0', title: 'Mejor ficha' }],
                help: ['Desliza (o usa las flechas / WASD) para mover todas las fichas en esa dirección.',
                    'Dos fichas iguales que chocan se fusionan en una con su suma, y sumas esos puntos.',
                    'Tras cada movimiento aparece un 2 (o, a veces, un 4). Si el tablero se llena y no puedes mover, se acaba.',
                    'En clásico y grande tienes 3 deshacer por partida. En contrarreloj y en el reto diario, ninguno.',
                    'El reto diario reparte a todos los mismos valores de ficha nueva (2 o 4) en el mismo orden; dónde aparece cada una depende de tu tablero. Haz la máxima puntuación en 150 movimientos.']
            });
            this.bindGame();
            this.showMenu();
        }
        layout() {
            return {
                main: `<div class="g2-top"><div class="g2-box"><small>Puntos</small><b id="g2-score">0</b></div><div class="g2-box"><small id="g2-sublbl">Récord</small><b id="g2-rec">0</b></div>
                        <button type="button" class="btn btn-ghost" id="g2-undo">↶ Deshacer <span id="g2-undo-n"></span></button></div>
                    <div class="g2-wrap"><div class="g2-board" id="g2-board"><div class="g2-bg" id="g2-bg"></div><div class="g2-tiles" id="g2-tiles"></div></div></div>
                    <p class="ax-hint g2-tip">Desliza en el tablero o usa las flechas del teclado.</p>`,
                side: `<div class="ax-card"><h3>Partida</h3><div class="ax-rows">
                    <div class="ax-row"><span>Modo</span><b data-s="mode">–</b></div>
                    <div class="ax-row"><span>Movimientos</span><b data-s="moves">0</b></div>
                    <div class="ax-row"><span>Mejor ficha</span><b data-s="max">–</b></div>
                    <div class="ax-row"><span>Récord del modo</span><b data-s="rec">–</b></div></div></div>`
            };
        }
        bindGame() {
            this.onKey = (e) => {
                if (this.state !== 'playing' || !this.overlay.hidden || e.target.closest('input,textarea')) return;
                const d = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }[e.key];
                if (d) { e.preventDefault(); this.move(d); }
                else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undo(); }
            };
            document.addEventListener('keydown', this.onKey);
            Kit.swipe(this.$('#g2-board'), (d) => { if (d !== 'tap' && this.state === 'playing') this.move(d); }, { threshold: 26, chain: false });
            this.$('#g2-undo').addEventListener('click', () => this.undo());
        }
        onDestroy() { document.removeEventListener('keydown', this.onKey); }

        newGame(mode, r) {
            this.n = mode.n; this.seed = Math.floor(r() * 2 ** 31); this.spawns = 0;
            this.tiles = []; this.score = 0; this.moves = 0; this.idc = 1; this.reached = false; this.undos = mode.undo; this.hist = [];
            this.add(); this.add();
            this.buildBg();
        }
        /** Las fichas nuevas salen de una secuencia con semilla (en el diario, la misma para todos). */
        add() {
            const r = Nexus.games.seed.rng(`${this.seed}:${this.spawns++}`);
            const t = spawn(this.tiles, this.n, r, this.idc++);
            if (t) this.tiles.push(t);
        }
        serialize() { return { n: this.n, seed: this.seed, sp: this.spawns, t: this.tiles.map(({ id, v, r, c }) => ({ id, v, r, c })), sc: this.score, m: this.moves, id: this.idc, re: this.reached, u: this.undos }; }
        restore(d) { this.n = d.n; this.seed = d.seed; this.spawns = d.sp; this.tiles = d.t; this.score = d.sc; this.moves = d.m; this.idc = d.id; this.reached = d.re; this.undos = d.u; this.hist = []; this.buildBg(); this.dom = null; }

        buildBg() {
            this.$('#g2-board').style.setProperty('--n', this.n);
            this.$('#g2-bg').innerHTML = '<i></i>'.repeat(this.n * this.n);
            this.$('#g2-tiles').innerHTML = ''; this.dom = new Map();
        }
        move(dir) {
            const res = slide(this.tiles, this.n, dir, () => this.idc++);
            if (!res.moved) { this.$('#g2-board').classList.remove('bump'); void this.$('#g2-board').offsetWidth; this.$('#g2-board').classList.add('bump'); return; }
            this.hist.push({ t: this.tiles.map(({ id, v, r, c }) => ({ id, v, r, c })), sc: this.score, m: this.moves, sp: this.spawns, id: this.idc, re: this.reached });
            if (this.hist.length > 10) this.hist.shift();
            this.tiles = res.tiles; this.score += res.gained; this.moves++;
            this.lastMerges = res.merges;
            this.add();
            Nexus.audio.play(res.gained >= 128 ? 'combo' : res.gained ? 'flip' : 'click');
            this.render();
            const max = Math.max(...this.tiles.map(t => t.v));
            if (this.mode.target && !this.reached && max >= this.mode.target) {
                this.reached = true; Nexus.audio.play('achievement');
                this.toast(`¡${this.mode.target}! Puedes seguir para mejorar tu puntuación`, 3200);
            }
            if (this.mode.moves && this.moves >= this.mode.moves) { this.end('moves'); return; }
            if (!canMove(this.tiles, this.n)) this.end('stuck');
            this.saveRun();
        }
        undo() {
            if (this.state !== 'playing' || !this.undos || !this.hist.length) { if (this.mode && !this.mode.undo) this.toast('En este modo no se puede deshacer'); return; }
            const h = this.hist.pop();
            this.tiles = h.t; this.score = h.sc; this.moves = h.m; this.spawns = h.sp; this.idc = h.id; this.undos--;
            this.reached = !!h.re;                      // si se deshace la fusión que llegó al objetivo, se volverá a celebrar
            this.buildBg(); this.render(); Nexus.audio.play('click');
            this.saveRun();                             // recargar la página ya no devuelve el estado anterior al deshacer
        }
        onTick() {
            if (this.mode.limit) {
                const left = this.mode.limit - this.elapsed;
                this.$('#g2-rec').textContent = formatTime(Math.max(0, left));
                if (left <= 0) this.end('time');
            }
        }
        end(why) {
            const max = Math.max(...this.tiles.map(t => t.v));
            const won = !!this.mode.target && max >= this.mode.target;
            const endless = !this.mode.target;
            this.finish({
                won, endless, score: this.score, label: `${formatNumber(this.score)} pts`,
                emoji: won ? '🏆' : endless ? '🎯' : '🧱',
                title: why === 'time' ? '¡TIEMPO!' : why === 'moves' ? 'FIN DEL RETO' : won ? `¡${max}!` : 'SIN MOVIMIENTOS',
                stats: [{ label: 'Puntos', value: formatNumber(this.score) }, { label: 'Mejor ficha', value: String(max) }, { label: 'Movimientos', value: String(this.moves) }],
                extra: { maxTile: max, n: this.n },
                updateExtra: (x) => { x.maxTile = Math.max(x.maxTile || 0, max); }
            });
        }
        onGiveUp() { this.end('stuck'); }

        render() {
            if (!this.tiles) return;
            const box = this.$('#g2-tiles');
            if (!this.dom) this.dom = new Map();
            const alive = new Set(this.tiles.map(t => t.id));
            // Las fichas que se fusionan viajan a su destino y desaparecen
            for (const m of this.lastMerges || []) for (const f of m.from) {
                const el = this.dom.get(f.id); if (!el) continue;
                el.style.setProperty('--r', f.r); el.style.setProperty('--c', f.c); el.classList.add('gone');
                this.dom.delete(f.id);
                setTimeout(() => el.remove(), 130);
            }
            this.lastMerges = null;
            for (const [id, el] of this.dom) if (!alive.has(id)) { el.remove(); this.dom.delete(id); }
            for (const t of this.tiles) {
                let el = this.dom.get(t.id);
                if (!el) {
                    el = document.createElement('div');
                    el.className = 'g2-tile' + (t.fresh ? ' fresh' : '') + (t.merged ? ' merged' : '');
                    this.dom.set(t.id, el); box.appendChild(el);
                }
                el.dataset.v = t.v > 4096 ? 'big' : t.v;
                el.style.setProperty('--r', t.r); el.style.setProperty('--c', t.c);
                el.innerHTML = `<span>${t.v}</span>`;
                el.classList.toggle('long', t.v >= 1024);
                delete t.fresh; delete t.merged; delete t.from;
            }
            const max = Math.max(0, ...this.tiles.map(t => t.v));
            const rec = Nexus.services.progress.modeStats ? Nexus.services.progress.modeStats('g2048', this.mode.id).bestScore : 0;
            this.$('#g2-score').textContent = formatNumber(this.score);
            if (!this.mode.limit) { this.$('#g2-sublbl').textContent = this.mode.moves ? 'Movimientos' : 'Récord'; this.$('#g2-rec').textContent = this.mode.moves ? `${this.moves}/${this.mode.moves}` : formatNumber(Math.max(rec, this.score)); }
            else { this.$('#g2-sublbl').textContent = 'Tiempo'; this.$('#g2-rec').textContent = formatTime(Math.max(0, this.mode.limit - this.elapsed)); }
            this.$('#g2-undo').hidden = !this.mode.undo;
            this.$('#g2-undo-n').textContent = this.mode.undo ? `(${this.undos})` : '';
            this.pill('score', formatNumber(this.score)); this.pill('best', String(max));
            const set = (k, v) => { const e = this.$(`[data-s="${k}"]`); if (e) e.textContent = v; };
            set('mode', this.mode.label); set('moves', this.moves); set('max', max); set('rec', formatNumber(rec));
        }
    }

    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'g2048' ? c.event : null);
    const maxT = (c) => c.stats('g2048').extra.maxTile || 0;
    A.register([
        { id: 'g2_512', game: 'g2048', name: 'Calentando', desc: 'Consigue una ficha de 512.', icon: '🟨', rarity: 'common', test: (c) => maxT(c) >= 512 },
        { id: 'g2_2048', game: 'g2048', name: '¡2048!', desc: 'Consigue la ficha de 2048.', icon: '🟧', rarity: 'epic', test: (c) => maxT(c) >= 2048 },
        { id: 'g2_4096', game: 'g2048', name: 'Más allá', desc: 'Consigue una ficha de 4096.', icon: '🟥', rarity: 'legendary', test: (c) => maxT(c) >= 4096 },
        { id: 'g2_rush', game: 'g2048', name: 'Contra el reloj', desc: 'Haz 5000 puntos en contrarreloj.', icon: '⏱️', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.mode === 'contrarreloj' && e.score >= 5000; } },
        { id: 'g2_daily', game: 'g2048', name: 'Fichas del día', desc: 'Completa 5 retos diarios de 2048.', icon: '📅', rarity: 'rare', ...A.counter((c) => c.stats('g2048').extra.dailies || 0, 5) }
    ]);
    Nexus.games.registry.register({
        id: 'g2048', name: '2048', emoji: '🟧', accent: '#f59e0b',
        tagline: '4×4 · 5×5 · contrarreloj · reto diario',
        description: 'Desliza y fusiona fichas iguales hasta llegar a 2048. Con tablero grande, contrarreloj de 3 minutos y un reto diario con los mismos valores de ficha para todos.',
        tags: ['Puzzle', 'Números'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'score', label: 'Puntuación' }, { id: 'wins', label: 'Victorias' }],
        mount: (root) => new G2048(root)
    });
})();
