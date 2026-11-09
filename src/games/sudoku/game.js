/* ============================================================
   NEXUS ARCADE · games/sudoku/game.js
   Sudoku 9×9 con solución única: fácil, medio, difícil, experto y
   sudoku diario. Notas, deshacer, pistas, resaltado y 3 errores.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatTime, formatNumber } = Nexus.util;

    // ── Lógica pura ─────────────────────────────────────────
    const ROW = (i) => Math.floor(i / 9), COL = (i) => i % 9, BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
    const PEERS = Array.from({ length: 81 }, (_, i) => {
        const s = new Set();
        for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) s.add(j);
        return [...s];
    });

    /** Cuenta soluciones (hasta `limit`). grid: array de 81 (0 = vacío). */
    function countSolutions(grid, limit = 2) {
        const g = grid.slice();
        const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
        for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; if ((rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & b) return 0; rows[ROW(i)] |= b; cols[COL(i)] |= b; boxes[BOX(i)] |= b; }
        let count = 0;
        const solve = () => {
            let best = -1, bestMask = 0, bestN = 10;
            for (let i = 0; i < 81; i++) {
                if (g[i]) continue;
                const used = rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)];
                let n = 0; for (let v = 1; v <= 9; v++) if (!(used & (1 << v))) n++;
                if (n < bestN) { bestN = n; best = i; bestMask = used; if (n <= 1) break; }
            }
            if (best < 0) { count++; return count >= limit; }
            if (bestN === 0) return false;
            for (let v = 1; v <= 9; v++) {
                const b = 1 << v; if (bestMask & b) continue;
                g[best] = v; rows[ROW(best)] |= b; cols[COL(best)] |= b; boxes[BOX(best)] |= b;
                if (solve()) return true;
                g[best] = 0; rows[ROW(best)] &= ~b; cols[COL(best)] &= ~b; boxes[BOX(best)] &= ~b;
            }
            return false;
        };
        solve();
        return count;
    }

    function fullGrid(r) {
        const g = new Array(81).fill(0);
        const fill = (i) => {
            if (i === 81) return true;
            for (const v of r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
                if (PEERS[i].some(p => g[p] === v)) continue;
                g[i] = v; if (fill(i + 1)) return true;
            }
            g[i] = 0; return false;
        };
        fill(0);
        return g;
    }

    const LEVELS = { facil: 40, medio: 32, dificil: 27, experto: 23, diario: 28 };
    /** Genera { puzzle, solution } con solución única y unas `clues` pistas (o las mínimas que se consigan). */
    function generate(r, clues) {
        const solution = fullGrid(r);
        const puzzle = solution.slice();
        let filled = 81;
        // Quita por parejas simétricas mientras haya solución única
        for (const i of r.shuffle(Array.from({ length: 41 }, (_, k) => k))) {
            if (filled <= clues) break;
            const j = 80 - i, cells = i === j ? [i] : [i, j];
            if (filled - cells.length < clues - 1) continue;
            const keep = cells.map(c => puzzle[c]);
            cells.forEach(c => { puzzle[c] = 0; });
            if (countSolutions(puzzle, 2) !== 1) cells.forEach((c, k) => { puzzle[c] = keep[k]; });
            else filled -= cells.length;
        }
        // Segunda pasada, casilla a casilla, para los niveles más exigentes
        for (const i of r.shuffle(Array.from({ length: 81 }, (_, k) => k))) {
            if (filled <= clues) break;
            if (!puzzle[i]) continue;
            const keep = puzzle[i]; puzzle[i] = 0;
            if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep; else filled--;
        }
        return { puzzle, solution, clues: filled };
    }

    Nexus.games.sudokuLogic = { generate, countSolutions, PEERS, ROW, COL, BOX, LEVELS };

    // ── Juego ───────────────────────────────────────────────
    const MODES = [
        { id: 'facil', label: 'Fácil', emoji: '🟢', desc: '40 números de partida' },
        { id: 'medio', label: 'Medio', emoji: '🟡', desc: '32 números de partida' },
        { id: 'dificil', label: 'Difícil', emoji: '🟠', desc: '27 números de partida' },
        { id: 'experto', label: 'Experto', emoji: '🔴', desc: 'Lo mínimo posible (~23)' },
        { id: 'diario', label: 'Sudoku diario', emoji: '📅', desc: 'El mismo para todos hoy', daily: true }
    ];
    const BASE = { facil: 800, medio: 1500, dificil: 2500, experto: 4000, diario: 2500 };
    const MAX_ERR = 3;

    class Sudoku extends Nexus.games.PuzzleGame {
        constructor(root) {
            super(root, {
                id: 'sudoku', name: 'Sudoku', emoji: '🔢', accent: '#38bdf8', modes: MODES,
                tagline: 'Rellena la cuadrícula: cada fila, columna y caja de 3×3 lleva del 1 al 9 sin repetir.',
                pills: [{ id: 'err', icon: '❌', init: '0/3', title: 'Errores' }, { id: 'lvl', icon: '🎚️', init: '–', title: 'Nivel' }],
                help: ['Cada fila, cada columna y cada caja de 3×3 deben contener los números del 1 al 9 una sola vez.',
                    'Toca una casilla y después un número (o usa el teclado: 1–9, flechas, <kbd>Retroceso</kbd>, <kbd>N</kbd> para notas).',
                    'Con <b>Notas</b> activadas apuntas candidatos pequeños. Al colocar un número se borran las notas de sus vecinas.',
                    'Con 3 errores pierdes la partida. Las pistas rellenan una casilla pero restan puntos.',
                    'Todos los sudokus tienen una única solución.']
            });
            this.bindGame();
            this.showMenu();
        }
        layout() {
            return {
                main: `<div class="sd-wrap"><div class="sd-grid" id="sd-grid" role="grid" aria-label="Sudoku"></div></div>
                    <div class="sd-pad" id="sd-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-n="${n}"><b>${n}</b><small></small></button>`).join('')}</div>
                    <div class="sd-tools">
                        <button type="button" class="btn btn-ghost" data-t="undo">↶ Deshacer</button>
                        <button type="button" class="btn btn-ghost" data-t="erase">⌫ Borrar</button>
                        <button type="button" class="btn btn-ghost" data-t="notes" aria-pressed="false">✏️ Notas</button>
                        <button type="button" class="btn btn-ghost" data-t="hint">💡 Pista</button>
                    </div>`,
                side: `<div class="ax-card"><h3>Partida</h3><div class="ax-rows">
                    <div class="ax-row"><span>Nivel</span><b data-s="lvl">–</b></div>
                    <div class="ax-row"><span>Casillas por rellenar</span><b data-s="left">–</b></div>
                    <div class="ax-row"><span>Errores</span><b data-s="err">0/3</b></div>
                    <div class="ax-row"><span>Pistas usadas</span><b data-s="hints">0</b></div></div></div>
                    <div class="ax-card"><h3>Atajos</h3><p class="ax-hint"><kbd>1</kbd>–<kbd>9</kbd> número · <kbd>N</kbd> notas · <kbd>⌫</kbd> borrar · <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshacer · flechas para moverte.</p></div>`
            };
        }
        bindGame() {
            this.$('#sd-grid').addEventListener('click', (e) => { const c = e.target.closest('[data-i]'); if (c && this.state === 'playing') { this.sel = +c.dataset.i; this.render(); } });
            this.$('#sd-pad').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) this.input(+b.dataset.n); });
            this.$('.sd-tools').addEventListener('click', (e) => {
                const b = e.target.closest('[data-t]'); if (!b || this.state !== 'playing') return;
                const t = b.dataset.t;
                if (t === 'undo') this.undo(); else if (t === 'erase') this.erase(); else if (t === 'hint') this.hint();
                else if (t === 'notes') { this.notesOn = !this.notesOn; this.render(); }
            });
            this.onKey = (e) => {
                if (this.state !== 'playing' || e.target.closest('input,textarea') || !this.overlay.hidden) return;
                const k = e.key;
                if (/^[1-9]$/.test(k)) { this.input(+k); e.preventDefault(); }
                else if (k === 'Backspace' || k === 'Delete' || k === '0') { this.erase(); e.preventDefault(); }
                else if (k === 'n' || k === 'N') { this.notesOn = !this.notesOn; this.render(); }
                else if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey)) { this.undo(); e.preventDefault(); }
                else if (k.startsWith('Arrow')) {
                    const s = this.sel < 0 ? 40 : this.sel, r = Math.floor(s / 9), c = s % 9;
                    const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
                    this.sel = ((r + d[0] + 9) % 9) * 9 + ((c + d[1] + 9) % 9); this.render(); e.preventDefault();
                }
            };
            document.addEventListener('keydown', this.onKey);
        }
        onDestroy() { document.removeEventListener('keydown', this.onKey); }

        newGame(mode, r) {
            const g = generate(r, LEVELS[mode.id]);
            this.puzzle = g.puzzle; this.solution = g.solution;
            this.board = g.puzzle.slice();
            this.notes = new Array(81).fill(0);
            this.errors = 0; this.hints = 0; this.history = []; this.sel = -1; this.notesOn = false; this.wrong = [];
        }
        serialize() { return { p: this.puzzle, s: this.solution, b: this.board, n: this.notes, e: this.errors, h: this.hints, w: this.wrong }; }
        restore(d) { this.puzzle = d.p; this.solution = d.s; this.board = d.b; this.notes = d.n; this.errors = d.e; this.hints = d.h; this.wrong = d.w || []; this.history = []; this.sel = -1; this.notesOn = false; }

        push() { this.history.push({ b: this.board.slice(), n: this.notes.slice(), w: this.wrong.slice() }); if (this.history.length > 200) this.history.shift(); }
        input(n) {
            if (this.state !== 'playing' || this.sel < 0 || this.puzzle[this.sel]) return;
            const i = this.sel;
            if (this.notesOn) {
                if (this.board[i]) return;
                this.push(); this.notes[i] ^= (1 << n); Nexus.audio.play('click'); this.render(); return;
            }
            if (this.board[i] === n) return;
            this.push();
            this.board[i] = n; this.notes[i] = 0;
            if (n !== this.solution[i]) {
                this.errors++; this.wrong = this.wrong.filter(x => x !== i).concat([i]);
                Nexus.audio.play('error');
                this.render();
                if (this.errors >= MAX_ERR) this.lose();
                return;
            }
            this.wrong = this.wrong.filter(x => x !== i);
            for (const p of PEERS[i]) this.notes[p] &= ~(1 << n);
            Nexus.audio.play('correct');
            this.render();
            this.flashUnits(i);
            this.check();
        }
        erase() {
            const i = this.sel; if (i < 0 || this.puzzle[i] || (!this.board[i] && !this.notes[i])) return;
            this.push(); this.board[i] = 0; this.notes[i] = 0; this.wrong = this.wrong.filter(x => x !== i); this.render();
        }
        undo() {
            const h = this.history.pop(); if (!h) return;
            this.board = h.b; this.notes = h.n; this.wrong = h.w; Nexus.audio.play('click'); this.render();
        }
        hint() {
            let i = this.sel;
            if (i < 0 || this.puzzle[i] || this.board[i] === this.solution[i]) {
                const empty = []; for (let k = 0; k < 81; k++) if (this.board[k] !== this.solution[k]) empty.push(k);
                if (!empty.length) return;
                i = empty[Math.floor(Math.random() * empty.length)];
            }
            this.push();
            this.board[i] = this.solution[i]; this.notes[i] = 0; this.wrong = this.wrong.filter(x => x !== i);
            for (const p of PEERS[i]) this.notes[p] &= ~(1 << this.solution[i]);
            this.hints++; this.sel = i;
            Nexus.audio.play('powerActivate');
            this.toast(`Pista: ${this.solution[i]} en fila ${Math.floor(i / 9) + 1}, columna ${i % 9 + 1}`);
            this.render(); this.check();
        }
        flashUnits(i) {
            const units = [];
            const r = Math.floor(i / 9), c = i % 9, b = BOX(i);
            const full = (f) => { for (let k = 0; k < 81; k++) if (f(k) && this.board[k] !== this.solution[k]) return false; return true; };
            if (full(k => Math.floor(k / 9) === r)) units.push(k => Math.floor(k / 9) === r);
            if (full(k => k % 9 === c)) units.push(k => k % 9 === c);
            if (full(k => BOX(k) === b)) units.push(k => BOX(k) === b);
            if (!units.length) return;
            this.$$('.sd-cell').forEach((el, k) => { if (units.some(f => f(k))) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } });
        }
        check() {
            for (let i = 0; i < 81; i++) if (this.board[i] !== this.solution[i]) return;
            const score = Math.max(100, BASE[this.mode.id] + Math.max(0, 1800 - this.elapsed) - this.errors * 150 - this.hints * 250);
            this.finish({
                won: true, score, label: formatTime(this.elapsed),
                stats: [{ label: 'Tiempo', value: formatTime(this.elapsed) }, { label: 'Errores', value: `${this.errors}/${MAX_ERR}` }, { label: 'Pistas', value: String(this.hints) }, { label: 'Puntos', value: formatNumber(score) }],
                extra: { errors: this.errors, hints: this.hints, level: this.mode.id },
                updateExtra: (x) => { x.byLevel = x.byLevel || {}; x.byLevel[this.mode.id] = (x.byLevel[this.mode.id] || 0) + 1; }
            });
        }
        lose() { this.finish({ won: false, score: 0, title: 'DEMASIADOS ERRORES', emoji: '❌', extra: { errors: this.errors, level: this.mode.id } }); }

        render() {
            if (!this.board) return;
            const sel = this.sel, sv = sel >= 0 ? this.board[sel] : 0;
            const wrong = new Set(this.wrong);
            this.$('#sd-grid').innerHTML = this.board.map((v, i) => {
                const cls = ['sd-cell'];
                if (this.puzzle[i]) cls.push('given');
                if (i === sel) cls.push('sel');
                else if (sel >= 0 && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel))) cls.push('peer');
                if (sv && v === sv) cls.push('same');
                if (wrong.has(i) && v) cls.push('bad');
                if (COL(i) % 3 === 2 && COL(i) < 8) cls.push('br');
                if (ROW(i) % 3 === 2 && ROW(i) < 8) cls.push('bb');
                const inner = v ? `<b>${v}</b>` : this.notes[i] ? `<span class="sd-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<i>${this.notes[i] & (1 << n) ? n : ''}</i>`).join('')}</span>` : '';
                return `<button type="button" class="${cls.join(' ')}" data-i="${i}" aria-label="Fila ${ROW(i) + 1}, columna ${COL(i) + 1}${v ? ': ' + v : ''}">${inner}</button>`;
            }).join('');
            const counts = new Array(10).fill(0);
            this.board.forEach((v, i) => { if (v && v === this.solution[i]) counts[v]++; });
            this.$$('#sd-pad [data-n]').forEach(b => { const n = +b.dataset.n; b.querySelector('small').textContent = 9 - counts[n] || ''; b.classList.toggle('done', counts[n] >= 9); });
            const nb = this.$('[data-t="notes"]'); nb.classList.toggle('on', !!this.notesOn); nb.setAttribute('aria-pressed', String(!!this.notesOn));
            this.$('#sd-pad').classList.toggle('notes', !!this.notesOn);
            const left = this.board.filter((v, i) => v !== this.solution[i]).length;
            const set = (k, v) => { const e = this.$(`[data-s="${k}"]`); if (e) e.textContent = v; };
            set('lvl', this.mode.label); set('left', left); set('err', `${this.errors}/${MAX_ERR}`); set('hints', this.hints);
            this.pill('err', `${this.errors}/${MAX_ERR}`); this.pill('lvl', this.mode.label);
        }
    }

    // ── Logros y registro ───────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'sudoku' ? c.event : null);
    const lvl = (k) => (c) => ((c.stats('sudoku').extra.byLevel || {})[k] || 0);
    A.register([
        { id: 'sd_first', game: 'sudoku', name: 'Primer sudoku', desc: 'Resuelve un sudoku.', icon: '🔢', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won; } },
        { id: 'sd_clean', game: 'sudoku', name: 'Sin borrones', desc: 'Resuelve un sudoku difícil o experto sin errores ni pistas.', icon: '✨', rarity: 'epic', test: (c) => { const e = ev(c); return !!e && e.won && ['dificil', 'experto'].includes(e.mode) && !e.extra.errors && !e.extra.hints; } },
        { id: 'sd_expert', game: 'sudoku', name: 'Experto', desc: 'Resuelve un sudoku experto.', icon: '🧠', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.mode === 'experto'; } },
        { id: 'sd_fast', game: 'sudoku', name: 'Relámpago', desc: 'Resuelve un sudoku medio o más difícil en menos de 6 minutos.', icon: '⚡', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.mode !== 'facil' && e.time < 360; } },
        { id: 'sd_10', game: 'sudoku', name: 'Cuadriculado', desc: 'Resuelve 10 sudokus difíciles.', icon: '🟠', rarity: 'epic', ...A.counter(lvl('dificil'), 10) },
        { id: 'sd_daily7', game: 'sudoku', name: 'Sudoku cada día', desc: 'Resuelve 7 sudokus diarios.', icon: '📅', rarity: 'rare', ...A.counter((c) => c.stats('sudoku').extra.dailies || 0, 7) }
    ]);
    Nexus.games.registry.register({
        id: 'sudoku', name: 'Sudoku', emoji: '🔢', accent: '#38bdf8',
        tagline: '4 niveles · sudoku diario · notas',
        description: 'El clásico de lógica japonés, generado al momento y siempre con solución única. Cuatro niveles, sudoku diario, notas, deshacer y pistas.',
        tags: ['Puzzle', 'Lógica'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'wins', label: 'Resueltos' }, { id: 'time', label: 'Mejor tiempo' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new Sudoku(root)
    });
})();
