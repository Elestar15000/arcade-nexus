/* ============================================================
   NEXUS ARCADE · games/tetris/game.js
   Tetris Fusion: tetris moderno (SRS, hold, fantasma, T-spin) con
   mecánicas propias:
     · Bloques de poder 💥 ⚡ ❄️ ⭐ que se activan al limpiar su línea
       (y pueden encadenarse entre sí).
     · Energía que se carga limpiando líneas → ⏪ Rebobinar (deshace la
       última pieza) y 🧹 Purga (borra las 3 filas de abajo).
     · Modo Cascada: tras limpiar, cada bloque cae por su cuenta y las
       reacciones en cadena multiplican la puntuación.
     · Modo Caos: eventos aleatorios (marea, espejo, prisa, lluvia…).
     · Modo Sprint: 40 líneas contra el reloj.
   ============================================================ */
(function () {
    'use strict';

    const { esc, clamp, formatNumber } = Nexus.util;
    const Kit = Nexus.games.kit;

    // ── Datos ───────────────────────────────────────────────
    const COLS = 10, ROWS = 22, HIDDEN = 2, VIS = ROWS - HIDDEN, CELL = 32;
    const SPRINT_LINES = 40;

    const BASE = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        O: [[1, 1], [1, 1]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
    };
    const COLORS = { I: '#22d3ee', O: '#fbbf24', T: '#a855f7', S: '#4ade80', Z: '#f87171', J: '#60a5fa', L: '#fb923c' };
    const GARBAGE = '#5b5b7a';
    const TYPES = Object.keys(BASE);

    const rotCW = (m) => { const n = m.length; return m.map((_, r) => m.map((__, c) => m[n - 1 - c][r])); };
    const SHAPES = {};
    for (const t of TYPES) {
        const rots = [BASE[t]];
        for (let i = 1; i < 4; i++) rots.push(rotCW(rots[i - 1]));
        SHAPES[t] = rots;
    }

    // Kicks SRS (x, y con y hacia ARRIBA en la tabla original → se invierte al usar)
    const KICKS_JLSTZ = {
        '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],     '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],    '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
    };
    const KICKS_I = {
        '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
    };

    const POWERS = {
        bomb:  { icon: '💥', name: 'Bomba',  weight: 30, desc: 'Destruye un área de 5×5 a su alrededor.' },
        bolt:  { icon: '⚡', name: 'Rayo',   weight: 25, desc: 'Destruye toda su columna.' },
        ice:   { icon: '❄️', name: 'Hielo',  weight: 20, desc: 'Congela la caída durante 6 s.' },
        star:  { icon: '⭐', name: 'Estrella', weight: 25, desc: 'Duplica los puntos de las 3 próximas limpiezas.' }
    };

    const MODES = [
        { id: 'fusion',  emoji: '🔮', label: 'Fusión',  desc: 'Bloques de poder, energía y habilidades. Sin fin.', powerChance: 0.20 },
        { id: 'cascade', emoji: '🌊', label: 'Cascada', desc: 'Tras limpiar, cada bloque cae solo: encadena reacciones.', powerChance: 0.16, cascade: true },
        { id: 'chaos',   emoji: '🌪️', label: 'Caos',    desc: 'Cada 18 piezas ocurre un evento: marea, espejo, prisa…', powerChance: 0.28, events: true },
        { id: 'sprint',  emoji: '🏁', label: 'Sprint',  desc: `Limpia ${SPRINT_LINES} líneas lo más rápido posible.`, powerChance: 0.16, sprint: true }
    ];

    const EVENTS = [
        { id: 'tide',  icon: '🌊', name: 'Marea',  text: 'Sube una fila de basura' },
        { id: 'mirror', icon: '🪞', name: 'Espejo', text: 'Izquierda y derecha invertidas (10 s)', dur: 10 },
        { id: 'rush',  icon: '🐇', name: 'Prisa',  text: 'Las piezas caen el doble de rápido (10 s)', dur: 10 },
        { id: 'calm',  icon: '🐢', name: 'Calma',  text: 'Las piezas caen más despacio (12 s)', dur: 12 },
        { id: 'rain',  icon: '🎁', name: 'Lluvia', text: 'Las próximas 5 piezas traen un poder' }
    ];

    const DAS = 0.16, ARR = 0.04, LOCK_DELAY = 0.5, MAX_RESETS = 15;
    const ENERGY_REWIND = 35, ENERGY_PURGE = 100;

    const clonePiece = (p) => p && { type: p.type, pw: p.pw ? { ...p.pw } : null };

    class TetrisGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.mode = MODES.find(m => m.id === Nexus.services.settings.get('tetris.defaultMode')) || MODES[0];
            this.state = 'menu';
            this.keys = {};
            this.particles = [];
            this.floaters = [];
            this.shake = 0;
            this.t = 0;
            this.build();
            this.resetGame();
            this.bind();
            this.loop = Kit.loop((dt) => this.update(dt), () => this.draw(), () => { if (this.state === 'playing') this.pause(); });
            this.loop.start();
            this.showMenu();
            this.unsubProgress = Nexus.bus.on('progress:update', () => this.updateRecords());
            this.updateRecords();
            this.run = Kit.autosave(this, { id: 'tetris', exclude: ['mode'] });
            this.resumeSaved();
        }

        /** Restaura una partida interrumpida (recarga o cierre) en pausa. */
        resumeSaved() {
            const saved = this.run.load();
            if (!saved || !saved.snap.board || !saved.snap.piece) return;
            this.mode = MODES.find(m => m.id === saved.mode) || this.mode;
            this.run.apply(saved.snap);
            this.state = 'playing';
            this.pause();
            this.updatePills(); this.updateSide();
            this.toast && this.toast('Partida recuperada');
        }

        // ── Plantilla ───────────────────────────────────────
        build() {
            this.root.innerHTML = `
            <div class="game ax-game tetris" style="--ax-accent:#a855f7">
                ${Kit.header({ emoji: '🧩', title: 'Tetris Fusion', pills: [
                    { id: 'score', icon: '💎', init: '0', title: 'Puntos' },
                    { id: 'lines', icon: '📏', init: '0', title: 'Líneas' },
                    { id: 'time', icon: '⏱️', init: '00:00', title: 'Tiempo' }] })}
                <div class="ax-body">
                    <div class="ax-stage-wrap" id="tt-wrap">
                        <div class="ax-stage" id="tt-stage">
                            <canvas id="tt-canvas" aria-label="Tablero de Tetris Fusion"></canvas>
                            <div class="ax-toast" id="tt-toast" role="status"></div>
                        </div>
                        <div class="ax-overlay" id="tt-overlay"></div>
                    </div>
                    <aside class="ax-side">
                        <div class="tt-pair">
                            <div class="tt-col">
                                <div class="ax-card"><h3>Reserva · C</h3><canvas id="tt-hold" class="ax-mini" width="160" height="120"></canvas></div>
                                <div class="ax-card">
                                    <h3>Partida</h3>
                                    <div class="ax-rows">
                                        <div class="ax-row"><span>Nivel</span><b id="tt-level">1</b></div>
                                        <div class="ax-row"><span>Combo</span><b id="tt-combo">–</b></div>
                                        <div class="ax-row"><span>B2B</span><b id="tt-b2b">–</b></div>
                                        <div class="ax-row"><span>Mejor</span><b id="tt-best">0</b></div>
                                    </div>
                                </div>
                            </div>
                            <div class="ax-card"><h3>Siguientes</h3><canvas id="tt-next" class="ax-mini" width="160" height="432"></canvas></div>
                        </div>
                        <div class="ax-card">
                            <h3>⚡ Energía</h3>
                            <div class="ax-bar"><i id="tt-energy"></i></div>
                            <div class="ax-btn-row">
                                <button class="btn btn-ghost" id="tt-btn-rewind" type="button" title="Deshace la última pieza (Q)">⏪ Rebobinar · ${ENERGY_REWIND}</button>
                                <button class="btn btn-ghost" id="tt-btn-purge" type="button" title="Borra las 3 filas de abajo (E)">🧹 Purga · ${ENERGY_PURGE}</button>
                            </div>
                            <div class="ax-chips" id="tt-effects"></div>
                        </div>
                    </aside>
                </div>
                <div class="ax-touch tt-touch" id="tt-touch">
                    <button type="button" data-act="left" aria-label="Izquierda">◀</button>
                    <button type="button" data-act="right" aria-label="Derecha">▶</button>
                    <button type="button" data-act="down" aria-label="Bajar">▼</button>
                    <button type="button" data-act="drop" aria-label="Caída directa">⏬</button>
                    <button type="button" data-act="cw" aria-label="Girar">⟳</button>
                    <button type="button" data-act="hold" aria-label="Reserva">📥</button>
                    <button type="button" data-act="rewind" aria-label="Rebobinar">⏪</button>
                    <button type="button" data-act="purge" aria-label="Purga">🧹</button>
                </div>
            </div>`;
            this.$ = (s) => this.root.querySelector(s);
            this.canvas = this.$('#tt-canvas');
            this.stage = this.$('#tt-stage');
            this.overlay = this.$('#tt-overlay');
            this.fit = Kit.canvas(this.canvas, this.$('#tt-wrap'), this.stage, COLS * CELL, VIS * CELL);
            this.ctx = this.fit.ctx;
            this.holdCtx = this.$('#tt-hold').getContext('2d');
            this.nextCtx = this.$('#tt-next').getContext('2d');
        }

        // ── Estado de partida ───────────────────────────────
        resetGame() {
            this.board = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
            this.queue = [];
            this.bag = [];
            this.hold = null;
            this.canHold = true;
            this.piece = null;
            this.score = 0; this.lines = 0; this.level = 1; this.time = 0;
            this.combo = -1; this.b2b = false;
            this.energy = 0;
            this.star = 0;
            this.fx = { freeze: 0, mirror: 0, rush: 0, calm: 0 };
            this.rainLeft = 0;
            this.piecesLocked = 0;
            this.fall = 0; this.lockT = 0; this.resets = 0; this.lowest = 0;
            this.lastRot = false;
            this.snap = null;
            this.softDrop = false;
            this.dir = 0; this.dasT = 0; this.arrT = 0;
            this.clearT = 0; this.pending = null; this.flash = null;
            this.stats = { maxLines: 0, tspins: 0, bombs: 0, bolts: 0, rewinds: 0, purges: 0, maxChain: 0, events: 0, perfect: 0, powers: 0 };
            this.particles = []; this.floaters = [];
            this.updatePills(); this.updateSide();
        }

        newGame(modeId) {
            if (modeId) this.mode = MODES.find(m => m.id === modeId) || this.mode;
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.resetGame();
            for (let i = 0; i < 6; i++) this.queue.push(this.makeItem());
            this.state = 'playing';
            this.overlay.hidden = true;
            this.spawn();
            this.updateSide();
        }

        // ── Piezas ──────────────────────────────────────────
        nextType() {
            if (!this.bag.length) this.bag = Nexus.util.shuffle(TYPES.slice());
            return this.bag.pop();
        }

        makeItem() {
            const type = this.nextType();
            const force = this.rainLeft > 0;
            if (force) this.rainLeft--;
            if (force || (this.piecesLocked + this.queue.length > 3 && Math.random() < this.mode.powerChance)) return this.withPower(type);
            return { type, pw: null };
        }

        pickPower() {
            const total = Object.values(POWERS).reduce((s, p) => s + p.weight, 0);
            let x = Math.random() * total;
            for (const [k, p] of Object.entries(POWERS)) { if ((x -= p.weight) < 0) return k; }
            return 'bomb';
        }

        spawn(item) {
            item = item || this.queue.shift();
            while (this.queue.length < 6) this.queue.push(this.makeItem());
            const size = SHAPES[item.type][0].length;
            this.piece = { type: item.type, pw: item.pw, rot: 0, x: Math.floor((COLS - size) / 2), y: 0 };
            this.canHold = true;
            this.fall = 0; this.lockT = 0; this.resets = 0; this.lastRot = false;
            if (this.collides(this.piece)) { this.gameOver(false, 'Las piezas llegan hasta arriba…'); return; }
            if (!this.collides(this.piece, 0, 1)) this.piece.y++;
            this.lowest = this.piece.y;
            this.drawNext();
        }

        cellsOf(p, rot = p.rot) {
            const out = [];
            const m = SHAPES[p.type][rot];
            for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) out.push([p.y + r, p.x + c, r, c]);
            return out;
        }

        collides(p, dx = 0, dy = 0, rot = p.rot, px = p.x, py = p.y) {
            const m = SHAPES[p.type][rot];
            for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const x = px + c + dx, y = py + r + dy;
                if (x < 0 || x >= COLS || y >= ROWS) return true;
                if (y >= 0 && this.board[y][x]) return true;
            }
            return false;
        }

        // ── Movimiento ──────────────────────────────────────
        move(dx, dy) {
            if (!this.piece || this.collides(this.piece, dx, dy)) return false;
            this.piece.x += dx; this.piece.y += dy;
            if (dx) { this.lastRot = false; Nexus.audio.play('axMove'); }
            if (dy) this.lastRot = false;
            this.afterMove();
            return true;
        }

        afterMove() {
            if (this.piece.y > this.lowest) { this.lowest = this.piece.y; this.resets = 0; }
            if (this.collides(this.piece, 0, 1)) {
                if (this.resets < MAX_RESETS) { this.lockT = 0; this.resets++; }
            } else this.lockT = 0;
        }

        rotate(dir) {
            const p = this.piece;
            if (!p || p.type === 'O') return;
            const from = p.rot, to = (from + dir + 4) % 4;
            const table = p.type === 'I' ? KICKS_I : KICKS_JLSTZ;
            const kicks = table[`${from}>${to}`] || [[0, 0]];
            for (const [kx, ky] of kicks) {
                if (!this.collides(p, 0, 0, to, p.x + kx, p.y - ky)) {
                    p.x += kx; p.y -= ky; p.rot = to;
                    this.lastRot = true;
                    Nexus.audio.play('axRot');
                    this.afterMove();
                    return;
                }
            }
        }

        hardDrop() {
            if (!this.piece) return;
            let d = 0;
            while (!this.collides(this.piece, 0, 1)) { this.piece.y++; d++; }
            if (d) this.lastRot = false;
            this.score += d * 2;
            this.shake = Math.min(1, 0.25 + d * 0.03);
            Nexus.audio.play('axDrop');
            this.lock();
        }

        doHold() {
            if (!this.piece || !this.canHold) return;
            const cur = { type: this.piece.type, pw: this.piece.pw };
            const incoming = this.hold;
            this.hold = cur;
            if (incoming) this.spawn(incoming); else this.spawn();
            if (this.state === 'playing') this.canHold = false;
            this.drawHold();
            Nexus.audio.play('click');
        }

        ghostY() {
            let y = this.piece.y;
            while (!this.collides(this.piece, 0, y - this.piece.y + 1)) y++;
            return y;
        }

        // ── Bloqueo y limpieza ──────────────────────────────
        lock() {
            const p = this.piece;
            if (!p) return;
            // Instantánea para Rebobinar (estado justo antes de fijar esta pieza)
            this.snap = {
                board: this.board.map(r => r.map(c => c && { ...c })),
                item: { type: p.type, pw: p.pw ? { ...p.pw } : null },
                score: this.score, lines: this.lines, level: this.level, combo: this.combo, b2b: this.b2b,
                star: this.star, piecesLocked: this.piecesLocked, stats: { ...this.stats }
            };
            const tspin = p.type === 'T' && this.lastRot && this.isTSpin(p);
            let allHidden = true;
            for (const [y, x, r, c] of this.cellsOf(p)) {
                if (y >= HIDDEN) allHidden = false;
                if (y < 0) continue;
                const pw = p.pw && p.pw.r === r && p.pw.c === c ? p.pw.kind : null;
                this.board[y][x] = { t: p.type, p: pw };
            }
            this.piece = null;
            this.piecesLocked++;
            Nexus.audio.play('axLock');
            if (allHidden) { this.gameOver(false, 'Bloqueo por encima del tablero'); return; }
            this.resolve(0, tspin);
        }

        isTSpin(p) {
            const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
            let n = 0;
            for (const [r, c] of corners) {
                const y = p.y + r, x = p.x + c;
                if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x])) n++;
            }
            return n >= 3;
        }

        fullRows() {
            const rows = [];
            for (let r = 0; r < ROWS; r++) if (this.board[r].every(Boolean)) rows.push(r);
            return rows;
        }

        /** Detecta líneas, calcula los efectos de los poderes y programa la animación de limpieza. */
        resolve(chain, tspin) {
            const full = this.fullRows();
            if (!full.length) {
                if (chain === 0) {
                    this.combo = -1;
                    if (tspin) { this.addScore(400 * this.level); this.pop('T-SPIN', '#a855f7'); }
                }
                this.endResolve();
                return;
            }
            const destroy = new Set();     // celdas destruidas por poderes ("r,c")
            const trig = [];
            const queue = [];
            const seen = new Set();
            const rowSet = new Set(full);
            for (const r of full) for (let c = 0; c < COLS; c++) {
                if (this.board[r][c].p) { queue.push([r, c]); seen.add(r + ',' + c); }
            }
            let freeze = 0, star = 0;
            while (queue.length) {
                const [r, c] = queue.shift();
                const cell = this.board[r][c];
                if (!cell || !cell.p) continue;
                trig.push([r, c, cell.p]);
                const hit = (rr, cc) => {
                    if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
                    const k = rr + ',' + cc;
                    if (!this.board[rr][cc]) return;
                    destroy.add(k);
                    if (this.board[rr][cc].p && !seen.has(k)) { seen.add(k); queue.push([rr, cc]); }
                };
                if (cell.p === 'bomb') { this.stats.bombs++; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) hit(r + dr, c + dc); }
                else if (cell.p === 'bolt') { this.stats.bolts++; for (let rr = HIDDEN; rr < ROWS; rr++) hit(rr, c); }
                else if (cell.p === 'ice') freeze = 6;
                else if (cell.p === 'star') star = 3;
            }
            this.flash = { rows: full, cells: Array.from(destroy).map(k => k.split(',').map(Number)), trig, t: 0 };
            this.state = 'clearing';
            this.clearT = trig.length ? 0.42 : 0.26;
            this.pending = () => this.finishClear(full, destroy, freeze, star, chain, tspin, rowSet);
            if (trig.length) Nexus.audio.play('axPower');
            Nexus.audio.play('axClear', full.length);
            for (const [r, c, k] of trig) this.burst(c, r - HIDDEN, k === 'ice' ? '#7dd3fc' : k === 'star' ? '#fde047' : k === 'bolt' ? '#facc15' : '#fb923c', k === 'bomb' ? 36 : 22);
            for (const r of full) for (let c = 0; c < COLS; c++) this.burst(c, r - HIDDEN, COLORS[this.board[r][c].t] || '#fff', 1);
        }

        finishClear(full, destroy, freeze, star, chain, tspin) {
            const n = full.length;
            // Puntuación
            const qualifies = n === 4 || (tspin && n > 0);
            const wasB2B = this.b2b;
            let base = tspin ? [0, 800, 1200, 1600, 1600][n] : [0, 100, 300, 500, 800][n];
            if (qualifies && wasB2B) base = Math.round(base * 1.5);
            this.b2b = qualifies ? true : (n > 0 ? false : this.b2b);
            let mult = 1 + 0.5 * chain;
            if (this.star > 0) { mult *= 2; this.star--; }
            let pts = Math.round(base * this.level * mult);
            if (chain === 0) { this.combo++; if (this.combo > 0) pts += 50 * this.combo * this.level; }
            pts += destroy.size * 15 * this.level;
            this.addScore(pts);
            this.lines += n;
            this.stats.maxLines = Math.max(this.stats.maxLines, n);
            this.stats.maxChain = Math.max(this.stats.maxChain, chain + 1);
            if (tspin) this.stats.tspins++;
            this.energy = clamp(this.energy + n * 12 + (n === 4 ? 10 : 0) + chain * 5, 0, 100);
            if (freeze) { this.fx.freeze = freeze; this.pop('❄️ Congelado', '#7dd3fc'); }
            if (star) { this.star = Math.min(6, this.star + star); this.pop('⭐ ×2 · ' + this.star, '#fde047'); }
            // Texto flotante
            const label = tspin ? `T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][n] || ''}` : ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][n];
            this.pop(`${label}${wasB2B && qualifies ? ' · B2B' : ''}${chain ? ` · CADENA ×${chain + 1}` : ''}`, tspin || n === 4 ? '#fbbf24' : '#fff');
            if (this.combo > 0 && chain === 0) this.floatText(`COMBO ×${this.combo}`, '#f472b6');

            // Aplicar: borrar celdas destruidas y luego las filas llenas
            for (const k of destroy) { const [r, c] = k.split(',').map(Number); this.board[r][c] = null; }
            const fullSet = new Set(full);
            const kept = this.board.filter((_, r) => !fullSet.has(r));
            while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(null));
            this.board = kept;
            if (this.mode.cascade) this.cellGravity();

            // Nivel
            this.level = 1 + Math.floor(this.lines / 10);
            this.flash = null;
            this.updatePills(); this.updateSide();

            if (this.mode.sprint && this.lines >= SPRINT_LINES) { this.gameOver(true, `¡${SPRINT_LINES} líneas!`); return; }
            this.state = 'playing';
            if (this.mode.cascade) {
                // ¿Provoca nuevas líneas la gravedad por celdas?
                if (this.fullRows().length) { this.resolve(chain + 1, false); return; }
            }
            this.endResolve();
        }

        cellGravity() {
            for (let c = 0; c < COLS; c++) {
                let w = ROWS - 1;
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (this.board[r][c]) { const cell = this.board[r][c]; this.board[r][c] = null; this.board[w][c] = cell; w--; }
                }
            }
        }

        endResolve() {
            if (this.state === 'over') return;
            this.state = 'playing';
            // ¿Tablero vacío?
            if (this.board.every(row => row.every(c => !c)) && this.piecesLocked > 0) {
                this.stats.perfect++;
                this.addScore(2000 * this.level);
                this.pop('✨ TABLERO LIMPIO +2000', '#34d399');
            }
            if (this.mode.events && this.piecesLocked > 0 && this.piecesLocked % 18 === 0) this.triggerEvent();
            this.spawn();
            this.updatePills(); this.updateSide();
        }

        addScore(n) { this.score += Math.max(0, Math.round(n)); }

        // ── Habilidades ─────────────────────────────────────
        rewind() {
            if (this.state !== 'playing') return;
            if (!this.snap) return this.toast('Nada que rebobinar todavía');
            if (this.energy < ENERGY_REWIND) return this.toast(`Energía insuficiente (${ENERGY_REWIND})`);
            const s = this.snap;
            const current = this.piece ? { type: this.piece.type, pw: this.piece.pw ? { ...this.piece.pw } : null } : null;
            const gained = this.energy;
            this.board = s.board;
            this.score = s.score; this.lines = s.lines; this.level = s.level; this.combo = s.combo; this.b2b = s.b2b;
            this.star = s.star; this.piecesLocked = s.piecesLocked;
            const keepRewinds = this.stats.rewinds + 1;
            this.stats = { ...s.stats, rewinds: keepRewinds };
            this.energy = gained - ENERGY_REWIND;
            if (current) this.queue.unshift(current);
            this.snap = null;
            this.spawn(clonePiece(s.item));
            this.floatText('⏪ REBOBINADO', '#7dd3fc');
            Nexus.audio.play('axRewind');
            this.updatePills(); this.updateSide();
        }

        purge() {
            if (this.state !== 'playing') return;
            if (this.energy < ENERGY_PURGE) return this.toast(`Energía insuficiente (${ENERGY_PURGE})`);
            this.energy -= ENERGY_PURGE;
            this.stats.purges++;
            for (let r = ROWS - 3; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
                if (this.board[r][c]) this.burst(c, r - HIDDEN, COLORS[this.board[r][c].t] || '#9ca3af', 2);
            }
            const kept = this.board.slice(0, ROWS - 3);
            this.board = Array.from({ length: 3 }, () => new Array(COLS).fill(null)).concat(kept);
            this.addScore(150 * this.level);
            this.floatText('🧹 PURGA', '#34d399');
            Nexus.audio.play('axPower');
            this.updatePills(); this.updateSide();
        }

        triggerEvent() {
            const ev = Nexus.util.pick(EVENTS);
            this.stats.events++;
            this.pop(`${ev.icon} ${ev.name}: ${ev.text}`, '#f472b6');
            Nexus.audio.play('axWarn');
            if (ev.id === 'tide') this.addGarbage();
            else if (ev.id === 'rain') {
                let n = 0;
                this.queue = this.queue.map((it) => (n < 5 && ++n && !it.pw) ? this.withPower(it.type) : it);
                this.rainLeft = 3;
            } else this.fx[ev.id] = ev.dur;
        }

        withPower(type) {
            const cells = [];
            SHAPES[type][0].forEach((row, r) => row.forEach((v, c) => { if (v) cells.push([r, c]); }));
            const [r, c] = Nexus.util.pick(cells);
            return { type, pw: { r, c, kind: this.pickPower() } };
        }

        addGarbage() {
            if (this.board[0].some(Boolean) || this.board[1].some(Boolean)) { this.gameOver(false, 'La marea te sepultó'); return; }
            const hole = Nexus.util.randInt(0, COLS - 1);
            this.board.shift();
            this.board.push(Array.from({ length: COLS }, (_, c) => c === hole ? null : { t: 'G', p: null }));
            this.shake = 1;
        }

        // ── Bucle ───────────────────────────────────────────
        gravityInterval() {
            let g = Math.pow(0.8 - (this.level - 1) * 0.007, this.level - 1);
            g = Math.max(g, 0.02);
            if (this.fx.rush > 0) g /= 2;
            if (this.fx.calm > 0) g *= 2;
            return g;
        }

        update(dt) {
            this.t += dt;
            for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.life -= dt; }
            this.particles = this.particles.filter(p => p.life > 0);
            for (const f of this.floaters) { f.y -= 26 * dt; f.life -= dt; }
            this.floaters = this.floaters.filter(f => f.life > 0);
            this.shake = Math.max(0, this.shake - dt * 3);
            if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.$('#tt-toast').classList.remove('show');

            if (this.state === 'clearing') {
                this.time += dt;
                if (this.flash) this.flash.t += dt;
                if ((this.clearT -= dt) <= 0 && this.pending) { const f = this.pending; this.pending = null; f(); }
                this.tickPills(dt);
                return;
            }
            if (this.state !== 'playing' || !this.piece) return;

            this.time += dt;
            for (const k of Object.keys(this.fx)) if (this.fx[k] > 0) this.fx[k] = Math.max(0, this.fx[k] - dt);
            this.tickPills(dt);

            // Desplazamiento lateral automático (DAS / ARR)
            if (this.dir) {
                this.dasT += dt;
                if (this.dasT >= DAS) {
                    this.arrT += dt;
                    while (this.arrT >= ARR) { this.arrT -= ARR; if (!this.move(this.dir, 0)) break; }
                }
            }

            // Gravedad
            let interval = this.gravityInterval();
            if (this.softDrop) interval = Math.max(0.02, Math.min(interval, interval / 12));
            const frozen = this.fx.freeze > 0 && !this.softDrop;
            if (!frozen) {
                this.fall += dt;
                while (this.fall >= interval) {
                    this.fall -= interval;
                    if (!this.collides(this.piece, 0, 1)) {
                        this.piece.y++; this.lastRot = false;
                        if (this.softDrop) this.score += 1;
                        this.afterMove();
                    } else { this.fall = 0; break; }
                }
            } else this.fall = 0;

            // Retardo de bloqueo
            if (this.collides(this.piece, 0, 1)) {
                this.lockT += dt;
                if (this.lockT >= LOCK_DELAY) this.lock();
            }
        }

        tickPills(dt) {
            this._pt = (this._pt || 0) + dt;
            if (this._pt > 0.2) { this._pt = 0; this.updatePills(); this.updateEffects(); }
        }

        // ── Entrada ─────────────────────────────────────────
        bind() {
            const blocked = () => this.destroyed || !!document.querySelector('.modal-overlay.active');
            this.onKeyDown = (e) => {
                if (blocked()) return;
                if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
                if (this.handleKey(e.key, true, e.repeat)) e.preventDefault();
            };
            this.onKeyUp = (e) => this.handleKey(e.key, false, false);
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup', this.onKeyUp);

            Kit.touchButtons(this.$('#tt-touch'), (a) => this.act(a, true), (a) => this.act(a, false));
            this.$('#tt-btn-rewind').addEventListener('click', () => this.rewind());
            this.$('#tt-btn-purge').addEventListener('click', () => this.purge());
            this.overlay.addEventListener('click', (e) => {
                const m = e.target.closest('[data-mode]');
                if (m) { this.mode = MODES.find(x => x.id === m.dataset.mode); this.showMenu(); Nexus.audio.play('click'); return; }
                const b = e.target.closest('[data-do]');
                if (!b) return;
                const d = b.dataset.do;
                if (d === 'start') this.newGame();
                else if (d === 'resume') this.resume();
                else if (d === 'restart') this.newGame();
                else if (d === 'menu') { this.state = 'menu'; this.showMenu(); }
            });
        }

        handleKey(k, down, repeat) {
            const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'cw', ' ': 'drop',
                a: 'left', d: 'right', s: 'down', w: 'cw', A: 'left', D: 'right', S: 'down', W: 'cw',
                x: 'cw', X: 'cw', z: 'ccw', Z: 'ccw', c: 'hold', C: 'hold', Shift: 'hold',
                q: 'rewind', Q: 'rewind', e: 'purge', E: 'purge' };
            if (down && (k === 'p' || k === 'P' || k === 'Escape')) {
                if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume();
                return true;
            }
            if (down && k === 'Enter' && (this.state === 'menu')) { this.newGame(); return true; }
            const a = map[k];
            if (!a) return false;
            if (a === 'drop' && down && repeat) return true;
            this.act(a, down, repeat);
            return true;
        }

        act(a, down, repeat) {
            if (this.state !== 'playing' || !this.piece) {
                if (a === 'left' || a === 'right') this.dir = 0;
                if (a === 'down') this.softDrop = false;
                return;
            }
            const mirror = this.fx.mirror > 0;
            if (a === 'left' || a === 'right') {
                let d = a === 'left' ? -1 : 1;
                if (mirror) d = -d;
                if (down) { if (repeat) return; this.dir = d; this.dasT = 0; this.arrT = 0; this.move(d, 0); }
                else if (this.dir === d) this.dir = 0;
                return;
            }
            if (a === 'down') { this.softDrop = down; return; }
            if (!down || repeat) return;
            if (a === 'cw') this.rotate(1);
            else if (a === 'ccw') this.rotate(-1);
            else if (a === 'drop') this.hardDrop();
            else if (a === 'hold') this.doHold();
            else if (a === 'rewind') this.rewind();
            else if (a === 'purge') this.purge();
        }

        // ── Pausa / fin ─────────────────────────────────────
        pause() {
            if (this.state !== 'playing') return;
            this.state = 'paused';
            this.dir = 0; this.softDrop = false;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">PAUSA</h2>
                <div class="ax-play-row">
                    <button class="btn btn-primary" data-do="resume" type="button">▶ Continuar</button>
                    <button class="btn btn-ghost" data-do="restart" type="button">🔄 Reiniciar</button>
                    <button class="btn btn-ghost" data-do="menu" type="button">☰ Menú</button>
                </div></div>`;
        }
        resume() {
            if (this.state !== 'paused') return;
            this.state = 'playing';
            this.overlay.hidden = true;
        }

        showMenu() {
            this.overlay.hidden = false;
            const gs = Nexus.services.progress.stats('tetris');
            const ms = gs.byMode[this.mode.id];
            const best = ms ? (this.mode.sprint && ms.bestTime !== null ? `Mejor: <b>${Nexus.util.formatTime(ms.bestTime)}</b>` : `Mejor: <b>${formatNumber(ms.bestScore)}</b> pts`) : 'Aún sin récord';
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">TETRIS FUSION</h2>
                <p class="ax-sub">Tetris moderno con bloques de poder, energía y habilidades</p>
                ${Kit.modeCards(MODES, this.mode.id)}
                <details class="ax-help"><summary>📖 Cómo se juega</summary><ul>
                    <li><kbd>←</kbd><kbd>→</kbd> mover · <kbd>↑</kbd>/<kbd>X</kbd> girar · <kbd>Z</kbd> girar al revés · <kbd>↓</kbd> bajar · <kbd>Espacio</kbd> caída directa · <kbd>C</kbd> reserva · <kbd>P</kbd> pausa.</li>
                    <li><b>Bloques de poder</b>: un cuadro de la pieza trae 💥 Bomba (área 5×5), ⚡ Rayo (columna entera), ❄️ Hielo (congela la caída 6 s) o ⭐ Estrella (×2 en 3 limpiezas). Se activan <i>al limpiar su línea</i> y pueden encadenarse. Los ves venir en «Siguientes».</li>
                    <li><b>Energía</b>: cada línea la carga. <kbd>Q</kbd> ⏪ Rebobinar (${ENERGY_REWIND}) deshace la última pieza y su puntuación; <kbd>E</kbd> 🧹 Purga (${ENERGY_PURGE}) borra las 3 filas de abajo.</li>
                    <li><b>Cascada</b>: tras limpiar, los bloques caen individualmente y cada reacción en cadena suma +50 % de puntos. <b>Caos</b>: cada 18 piezas, un evento aleatorio.</li>
                    <li>T-Spin y Tetris dan back-to-back ×1,5. Limpiar todo el tablero suma 2.000.</li>
                </ul></details>
                <div class="ax-best">${best}</div>
                <div class="ax-play-row"><button class="btn btn-primary btn-glow" data-do="start" type="button">▶ Jugar · ${esc(this.mode.label)}</button></div>
            </div>`;
        }

        gameOver(won, reason) {
            if (this.state === 'over') return;
            this.state = 'over';
            if (this.run) this.run.clear();
            this.dir = 0; this.softDrop = false; this.pending = null; this.flash = null;
            this.piece = this.piece && won ? null : this.piece;
            Nexus.audio.play(won ? 'win' : 'lose');
            const endless = !this.mode.sprint;
            const xp = Math.min(500, Math.round(this.score / 25) + this.lines * 2 + (won ? 100 : 0));
            const result = Nexus.services.progress.recordGame({
                game: 'tetris', mode: this.mode.id, won, endless, score: this.score, time: Math.round(this.time), xp,
                extra: { ...this.stats, lines: this.lines, level: this.level, mode: this.mode.id },
                updateExtra: (x) => { x.totalLines = (x.totalLines || 0) + this.lines; }
            });
            this.updatePills(); this.updateSide();
            const open = () => {
                if (this.destroyed) return;
                this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: won ? '🏆' : '🧩', kind: won ? 'win' : 'lose',
                    title: won ? '¡SPRINT COMPLETADO!' : 'FIN DE LA PARTIDA',
                    subtitle: reason,
                    stats: [
                        { label: 'Puntuación', value: formatNumber(this.score) },
                        { label: 'Líneas', value: String(this.lines) },
                        { label: 'Tiempo', value: Nexus.util.formatTime(this.time) },
                        { label: 'Nivel', value: String(this.level) }
                    ],
                    result,
                    actions: [
                        { label: '🔄 Otra partida', kind: 'primary', onClick: () => { this.later(() => this.newGame(), 50); } },
                        { label: '☰ Cambiar modo', kind: 'ghost', onClick: () => { this.later(() => { this.state = 'menu'; this.showMenu(); }, 50); } },
                        { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
                    ]
                });
            };
            this.later(open, 650);
        }

        // ── Efectos visuales ────────────────────────────────
        burst(c, r, color, n) {
            const cx = (c + 0.5) * CELL, cy = (r + 0.5) * CELL;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 220;
                this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.5 + Math.random() * 0.5, max: 1, color, s: 2 + Math.random() * 3 });
            }
        }
        floatText(text, color) {
            this.floaters.push({ text, color, x: COLS * CELL / 2, y: VIS * CELL * 0.42 + this.floaters.length * 26, life: 1.4 });
        }
        pop(text, color) { this.floatText(text, color); this.toast(text); }
        toast(text) {
            const el = this.$('#tt-toast');
            el.textContent = text; el.classList.add('show'); this.toastT = 1.8;
        }

        // ── Dibujo ──────────────────────────────────────────
        cellColor(t) { return t === 'G' ? GARBAGE : COLORS[t]; }

        drawCell(ctx, x, y, s, color, power, alpha = 1) {
            ctx.globalAlpha = alpha;
            const pad = Math.max(1, s * 0.05);
            Kit.roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, s * 0.16);
            const g = ctx.createLinearGradient(x, y, x, y + s);
            g.addColorStop(0, Kit.mix(color, '#ffffff', 0.28));
            g.addColorStop(0.55, color);
            g.addColorStop(1, Kit.mix(color, '#000000', 0.35));
            ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();
            if (power) {
                const pulse = 0.55 + 0.45 * Math.sin(this.t * 6);
                ctx.strokeStyle = `rgba(255,255,255,${0.55 + pulse * 0.4})`; ctx.lineWidth = Math.max(1.5, s * 0.07);
                Kit.roundRect(ctx, x + pad * 2, y + pad * 2, s - pad * 4, s - pad * 4, s * 0.12); ctx.stroke();
                ctx.font = `${Math.floor(s * 0.6)}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(POWERS[power].icon, x + s / 2, y + s / 2 + s * 0.04);
            }
            ctx.globalAlpha = 1;
        }

        draw() {
            const ctx = this.ctx, W = COLS * CELL, H = VIS * CELL;
            ctx.save();
            ctx.clearRect(0, 0, W, H);
            if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 7, (Math.random() - 0.5) * this.shake * 7);
            // Fondo
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0b0b1c'); bg.addColorStop(1, '#10102a');
            ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
            ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
            ctx.beginPath();
            for (let c = 1; c < COLS; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); }
            for (let r = 1; r < VIS; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); }
            ctx.stroke();

            // Bloques fijados
            for (let r = HIDDEN; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
                const cell = this.board[r][c];
                if (cell) this.drawCell(ctx, c * CELL, (r - HIDDEN) * CELL, CELL, this.cellColor(cell.t), cell.p);
            }

            if (this.state !== 'menu') {
                // Fantasma
                if (this.piece && Nexus.services.settings.get('tetris.ghost')) {
                    const gy = this.ghostY();
                    for (const [, x, r, c] of this.cellsOf(this.piece)) {
                        const y = gy + r;
                        if (y < HIDDEN) continue;
                        Kit.roundRect(ctx, x * CELL + 3, (y - HIDDEN) * CELL + 3, CELL - 6, CELL - 6, 5);
                        ctx.strokeStyle = Kit.rgba(COLORS[this.piece.type], 0.55); ctx.lineWidth = 2; ctx.stroke();
                        ctx.fillStyle = Kit.rgba(COLORS[this.piece.type], 0.08); ctx.fill();
                    }
                }
                // Pieza activa
                if (this.piece) {
                    for (const [y, x, r, c] of this.cellsOf(this.piece)) {
                        if (y < HIDDEN) continue;
                        const pw = this.piece.pw && this.piece.pw.r === r && this.piece.pw.c === c ? this.piece.pw.kind : null;
                        this.drawCell(ctx, x * CELL, (y - HIDDEN) * CELL, CELL, COLORS[this.piece.type], pw);
                    }
                }
            }

            // Limpieza en curso
            if (this.flash) {
                const k = Math.min(1, this.flash.t / 0.26);
                for (const r of this.flash.rows) {
                    ctx.fillStyle = `rgba(255,255,255,${0.85 - k * 0.6})`;
                    ctx.fillRect(0, (r - HIDDEN) * CELL, W, CELL);
                }
                for (const [r, c] of this.flash.cells) {
                    ctx.fillStyle = `rgba(251,146,60,${0.7 - k * 0.5})`;
                    ctx.fillRect(c * CELL, (r - HIDDEN) * CELL, CELL, CELL);
                }
                for (const [r, c, kind] of this.flash.trig) {
                    ctx.strokeStyle = kind === 'ice' ? '#7dd3fc' : kind === 'star' ? '#fde047' : '#fb923c';
                    ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc((c + 0.5) * CELL, (r - HIDDEN + 0.5) * CELL, 10 + k * 90, 0, Math.PI * 2); ctx.stroke();
                    if (kind === 'bolt') { ctx.fillStyle = `rgba(250,204,21,${0.5 - k * 0.4})`; ctx.fillRect(c * CELL, 0, CELL, H); }
                }
            }

            // Efectos de estado
            if (this.fx.freeze > 0) { ctx.fillStyle = 'rgba(125,211,252,.10)'; ctx.fillRect(0, 0, W, H); }
            if (this.fx.mirror > 0) { ctx.strokeStyle = 'rgba(244,114,182,.7)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4); }
            if (this.fx.rush > 0) { ctx.strokeStyle = 'rgba(248,113,113,.6)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4); }

            // Partículas
            for (const p of this.particles) {
                ctx.globalAlpha = Math.max(0, p.life / p.max);
                ctx.fillStyle = p.color; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
            }
            ctx.globalAlpha = 1;
            // Textos flotantes
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '800 20px Orbitron, system-ui, sans-serif';
            for (const f of this.floaters) {
                ctx.globalAlpha = Math.min(1, f.life * 1.4);
                ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(f.text, f.x, f.y);
                ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        drawMini(ctx, items, cell, startY, step, w) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            items.forEach((it, i) => {
                if (!it) return;
                const m = SHAPES[it.type][0];
                let minC = 9, maxC = 0, minR = 9, maxR = 0;
                m.forEach((row, r) => row.forEach((v, c) => { if (v) { minC = Math.min(minC, c); maxC = Math.max(maxC, c); minR = Math.min(minR, r); maxR = Math.max(maxR, r); } }));
                const ox = (w - (maxC - minC + 1) * cell) / 2 - minC * cell;
                const oy = startY + i * step + (step - (maxR - minR + 1) * cell) / 2 - minR * cell;
                m.forEach((row, r) => row.forEach((v, c) => {
                    if (!v) return;
                    const pw = it.pw && it.pw.r === r && it.pw.c === c ? it.pw.kind : null;
                    this.drawCell(ctx, ox + c * cell, oy + r * cell, cell, COLORS[it.type], pw);
                }));
            });
        }
        drawHold() { this.drawMini(this.holdCtx, [this.hold], 30, 0, 120, 160); }
        drawNext() { this.drawMini(this.nextCtx, this.queue.slice(0, 4), 24, 0, 108, 160); this.drawHold(); }

        // ── Panel / píldoras ────────────────────────────────
        updatePills() {
            const set = (id, v) => { const el = this.root.querySelector(`[data-pill="${id}"]`); if (el) el.textContent = v; };
            set('score', formatNumber(this.score));
            set('lines', this.mode.sprint ? `${this.lines}/${SPRINT_LINES}` : String(this.lines));
            set('time', Nexus.util.formatTime(this.time));
        }
        updateSide() {
            const set = (id, v) => { const el = this.$('#' + id); if (el) el.textContent = v; };
            set('tt-level', this.level);
            set('tt-combo', this.combo > 0 ? `×${this.combo}` : '–');
            set('tt-b2b', this.b2b ? '✔ ×1,5' : '–');
            this.$('#tt-energy').style.width = this.energy + '%';
            this.$('#tt-btn-rewind').disabled = this.energy < ENERGY_REWIND || !this.snap;
            this.$('#tt-btn-purge').disabled = this.energy < ENERGY_PURGE;
            this.$('#tt-btn-rewind').classList.toggle('ready', !this.$('#tt-btn-rewind').disabled);
            this.$('#tt-btn-purge').classList.toggle('ready', !this.$('#tt-btn-purge').disabled);
            this.updateEffects();
            this.drawNext();
        }
        updateEffects() {
            const chips = [];
            if (this.star > 0) chips.push(`<span class="ax-chip hot">⭐ ×2 · ${this.star}</span>`);
            if (this.fx.freeze > 0) chips.push(`<span class="ax-chip">❄️ ${Math.ceil(this.fx.freeze)} s</span>`);
            if (this.fx.mirror > 0) chips.push(`<span class="ax-chip hot">🪞 ${Math.ceil(this.fx.mirror)} s</span>`);
            if (this.fx.rush > 0) chips.push(`<span class="ax-chip hot">🐇 ${Math.ceil(this.fx.rush)} s</span>`);
            if (this.fx.calm > 0) chips.push(`<span class="ax-chip">🐢 ${Math.ceil(this.fx.calm)} s</span>`);
            if (this.rainLeft > 0) chips.push(`<span class="ax-chip">🎁 ${this.rainLeft}</span>`);
            const html = chips.join('') || '<span class="ax-hint">Sin efectos activos</span>';
            const el = this.$('#tt-effects');
            if (el.innerHTML !== html) el.innerHTML = html;
        }
        updateRecords() {
            const gs = Nexus.services.progress.stats('tetris');
            const ms = gs.byMode[this.mode.id];
            const el = this.$('#tt-best');
            if (el) el.textContent = ms ? (this.mode.sprint && ms.bestTime !== null ? Nexus.util.formatTime(ms.bestTime) : formatNumber(ms.bestScore)) : '0';
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id);
            return id;
        }

        destroy() {
            if (this.run) this.run.stop();
            this.destroyed = true;
            this.loop.destroy();
            this.fit.destroy();
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            if (this.unsubProgress) this.unsubProgress();
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
        }
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'tetris') ? c.event : null;
    const tt = (c) => c.stats('tetris');
    A.register([
        { id: 'tt_sprint', game: 'tetris', name: 'Línea de meta', desc: 'Completa un Sprint de 40 líneas.', icon: '🏁', rarity: 'common',
            test: (c) => (tt(c).byMode.sprint || {}).wins > 0 },
        { id: 'tt_sprint_fast', game: 'tetris', name: 'Velocista', desc: 'Completa un Sprint en menos de 2 min 30 s.', icon: '⚡', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.mode === 'sprint' && e.won && e.time < 150; } },
        { id: 'tt_tetris', game: 'tetris', name: '¡Tetris!', desc: 'Limpia 4 líneas a la vez.', icon: '🧱', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxLines >= 4; } },
        { id: 'tt_tspin', game: 'tetris', name: 'Giro maestro', desc: 'Haz un T-Spin con limpieza de líneas.', icon: '🌀', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.tspins >= 1; } },
        { id: 'tt_bombs', game: 'tetris', name: 'Demolición', desc: 'Detona 3 bombas 💥 en una partida.', icon: '💥', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.bombs >= 3; } },
        { id: 'tt_rewind', game: 'tetris', name: 'Viajero del tiempo', desc: 'Usa Rebobinar ⏪ para deshacer una pieza.', icon: '⏪', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.rewinds >= 1; } },
        { id: 'tt_purge', game: 'tetris', name: 'Limpieza a fondo', desc: 'Usa la Purga 🧹 en una partida.', icon: '🧹', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.purges >= 1; } },
        { id: 'tt_chain', game: 'tetris', name: 'Reacción en cadena', desc: 'Encadena 4 limpiezas seguidas en Cascada.', icon: '🌊', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.mode === 'cascade' && e.extra.maxChain >= 4; } },
        { id: 'tt_perfect', game: 'tetris', name: 'Tablero impecable', desc: 'Deja el tablero completamente vacío.', icon: '✨', rarity: 'legendary',
            test: (c) => { const e = ev(c); return !!e && e.extra.perfect >= 1; } },
        { id: 'tt_chaos', game: 'tetris', name: 'Domador del caos', desc: 'Supera 5 eventos en el modo Caos.', icon: '🌪️', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.mode === 'chaos' && e.extra.events >= 5; } },
        { id: 'tt_score20k', game: 'tetris', name: 'Fusión total', desc: 'Consigue 20.000 puntos en una partida.', icon: '💎', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.score >= 20000; } },
        { id: 'tt_level10', game: 'tetris', name: 'Velocidad de vértigo', desc: 'Alcanza el nivel 10.', icon: '🚀', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.extra.level >= 10; } },
        { id: 'tt_lines500', game: 'tetris', name: 'Constructor', desc: 'Limpia 500 líneas en total.', icon: '🏗️', rarity: 'rare',
            ...A.counter((c) => (tt(c).extra.totalLines || 0), 500) }
    ]);

    Nexus.games.registry.register({
        id: 'tetris', name: 'Tetris Fusion', emoji: '🧩', accent: '#a855f7',
        tagline: 'Poderes · Rebobinar · Cascadas',
        description: 'Tetris moderno con bloques de poder que explotan, congelan o fulminan columnas, energía para rebobinar el tiempo, reacciones en cadena y un modo Caos.',
        tags: ['Puzzle', 'Arcade'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'score', label: 'Puntuación' }, { id: 'time', label: 'Tiempo (Sprint)' }, { id: 'wins', label: 'Victorias' }],
        mount: (root) => new TetrisGame(root)
    });
})();
