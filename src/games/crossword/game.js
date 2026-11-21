/* ============================================================
   NEXUS ARCADE · games/crossword/game.js
   Crucigramas generados al momento con las 1.200 definiciones del
   banco del Pasapalabra: fácil, medio, difícil y crucigrama diario.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatTime, formatNumber } = Nexus.util;
    const up = (s) => Nexus.games.seed.up(s);

    // ── Generador ───────────────────────────────────────────
    const LV = {
        facil: { banks: ['basic'], count: 9, size: 13 },
        medio: { banks: ['medium'], count: 11, size: 14 },
        dificil: { banks: ['hard', 'pro'], count: 13, size: 15 },
        diario: { banks: ['medium', 'hard'], count: 12, size: 15 }
    };

    function candidates(level) {
        const B = Nexus.games.pasapalabraBank.LEVELS;
        const out = [], seen = new Set();
        for (const k of LV[level].banks) for (const q of B[k]) {
            const w = up(q.a);
            if (!/^[A-ZÑ]{3,11}$/.test(w) || seen.has(w)) continue;
            seen.add(w);
            out.push({ w, clue: q.d, label: q.a });
        }
        return out;
    }

    /** Intenta construir un crucigrama: { w, h, words: [{w, clue, r, c, dir: 'A'|'D', n}] } */
    function build(r, level) {
        const { count, size } = LV[level];
        const pool = candidates(level);
        let best = null;
        for (let attempt = 0; attempt < 24; attempt++) {
            const words = r.shuffle(pool);
            const grid = new Map();             // "r,c" → letra
            const dirs = new Map();             // "r,c" → direcciones de las palabras que pasan por ahí
            const placed = [];
            const at = (y, x) => grid.get(y + ',' + x);
            const fits = (w, y, x, dir) => {
                const dy = dir === 'D' ? 1 : 0, dx = dir === 'A' ? 1 : 0;
                if (at(y - dy, x - dx) || at(y + dy * w.length, x + dx * w.length)) return -1;
                let cross = 0;
                for (let k = 0; k < w.length; k++) {
                    const yy = y + dy * k, xx = x + dx * k, ch = at(yy, xx);
                    if (ch) { if (ch !== w[k] || (dirs.get(yy + ',' + xx) || '').includes(dir)) return -1; cross++; continue; }
                    // las casillas nuevas no pueden tocar letras por los lados
                    if (at(yy + dx, xx + dy) || at(yy - dx, xx - dy)) return -1;
                }
                return cross === w.length ? -1 : cross;
            };
            const bounds = () => {
                let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
                for (const k of grid.keys()) { const [y, x] = k.split(',').map(Number); y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
                return { y0, y1, x0, x1 };
            };
            const put = (o, y, x, dir) => {
                for (let k = 0; k < o.w.length; k++) { const key = dir === 'D' ? `${y + k},${x}` : `${y},${x + k}`; grid.set(key, o.w[k]); dirs.set(key, (dirs.get(key) || '') + dir); }
                placed.push(Object.assign({}, o, { r: y, c: x, dir }));
            };
            const first = words.find(o => o.w.length >= 6 && o.w.length <= 9) || words[0];
            put(first, 0, 0, r() < 0.5 ? 'A' : 'D');
            for (const o of words) {
                if (placed.length >= count) break;
                if (placed.some(p => p.w === o.w)) continue;
                const opts = [];
                for (const [key, ch] of grid) {
                    const [y, x] = key.split(',').map(Number);
                    for (let k = 0; k < o.w.length; k++) {
                        if (o.w[k] !== ch) continue;
                        for (const dir of ['A', 'D']) {
                            const sy = dir === 'D' ? y - k : y, sx = dir === 'A' ? x - k : x;
                            const cr = fits(o.w, sy, sx, dir);
                            if (cr < 1) continue;
                            // Tamaño máximo
                            const b = bounds();
                            const ey = dir === 'D' ? sy + o.w.length - 1 : sy, ex = dir === 'A' ? sx + o.w.length - 1 : sx;
                            if (Math.max(b.y1, ey) - Math.min(b.y0, sy) >= size || Math.max(b.x1, ex) - Math.min(b.x0, sx) >= size) continue;
                            opts.push({ y: sy, x: sx, dir, cr });
                        }
                    }
                }
                if (!opts.length) continue;
                const maxCr = Math.max(...opts.map(p => p.cr));
                const o2 = r.pick(opts.filter(p => p.cr === maxCr));
                put(o, o2.y, o2.x, o2.dir);
            }
            const b = bounds();
            const area = (b.y1 - b.y0 + 1) * (b.x1 - b.x0 + 1);
            const scoreL = placed.length * 1000 - area;
            if (!best || scoreL > best.scoreL) best = { placed, b, scoreL };
            if (placed.length >= count && attempt >= 3) break;
        }
        const { placed, b } = best;
        const words = placed.map(p => ({ w: p.w, clue: p.clue, label: p.label, r: p.r - b.y0, c: p.c - b.x0, dir: p.dir }));
        // Numeración: de arriba abajo y de izquierda a derecha
        const starts = new Map();
        words.slice().sort((a, z) => a.r - z.r || a.c - z.c).forEach(wd => { const k = wd.r + ',' + wd.c; if (!starts.has(k)) starts.set(k, starts.size + 1); wd.n = starts.get(k); });
        words.forEach(wd => { wd.n = starts.get(wd.r + ',' + wd.c); });
        return { w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1, words: words.sort((a, z) => a.n - z.n) };
    }
    function cellsOf(wd) { return Array.from({ length: wd.w.length }, (_, k) => wd.dir === 'A' ? [wd.r, wd.c + k] : [wd.r + k, wd.c]); }
    /** Solución: mapa "r,c" → letra (comprueba que los cruces coinciden). */
    function solutionMap(cw) {
        const m = new Map();
        for (const wd of cw.words) cellsOf(wd).forEach(([y, x], k) => {
            const key = y + ',' + x;
            if (m.has(key) && m.get(key) !== wd.w[k]) throw new Error('cruce incorrecto');
            m.set(key, wd.w[k]);
        });
        return m;
    }
    Nexus.games.crosswordLogic = { build, cellsOf, solutionMap, candidates, LV };

    // ── Juego ───────────────────────────────────────────────
    const MODES = [
        { id: 'facil', label: 'Fácil', emoji: '🟢', desc: '9 palabras sencillas' },
        { id: 'medio', label: 'Medio', emoji: '🟡', desc: '11 palabras de cultura general' },
        { id: 'dificil', label: 'Difícil', emoji: '🔴', desc: '13 palabras cultas y raras' },
        { id: 'diario', label: 'Crucigrama diario', emoji: '📅', desc: 'El mismo para todos hoy', daily: true }
    ];
    const KEYS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];

    class Crossword extends Nexus.games.PuzzleGame {
        constructor(root) {
            super(root, {
                id: 'crossword', name: 'Crucigrama', emoji: '✏️', accent: '#a78bfa', modes: MODES,
                tagline: 'Rellena la cuadrícula a partir de las definiciones.',
                pills: [{ id: 'done', icon: '🧩', init: '0/0', title: 'Palabras completas' }],
                help: ['Toca una casilla para elegir la palabra; tócala otra vez para cambiar entre horizontal y vertical. También puedes tocar una definición.',
                    'Escribe con el teclado (o el de la pantalla). Las palabras van sin tildes; la Ñ cuenta como letra.',
                    '<b>Comprobar</b> marca en rojo las letras incorrectas. <b>Letra</b> y <b>Palabra</b> te dan la solución, pero restan puntos.',
                    'Las definiciones salen del banco de 1.200 preguntas del Pasapalabra.']
            });
            this.bindGame();
            this.showMenu();
        }
        layout() {
            return {
                main: `<div class="cw-cluebar"><button type="button" class="cw-nav" data-nav="-1" aria-label="Definición anterior">‹</button><div class="cw-clue" id="cw-clue">–</div><button type="button" class="cw-nav" data-nav="1" aria-label="Definición siguiente">›</button></div>
                    <div class="cw-wrap"><div class="cw-grid" id="cw-grid"></div></div>
                    <div class="cw-kbd" id="cw-kbd">${KEYS.map(row => `<div>${row.split('').map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}${row === 'ZXCVBNM' ? '<button type="button" data-k="DEL" class="wide">⌫</button>' : ''}</div>`).join('')}</div>`,
                side: `<div class="ax-card cw-tools"><button type="button" class="btn btn-ghost" data-t="check">✔️ Comprobar</button><button type="button" class="btn btn-ghost" data-t="letter">🔡 Letra</button><button type="button" class="btn btn-ghost" data-t="word">🧾 Palabra</button></div>
                    <div class="ax-card cw-clues-card"><h3>Horizontales</h3><ol class="cw-clues" id="cw-across"></ol><h3>Verticales</h3><ol class="cw-clues" id="cw-down"></ol></div>`
            };
        }
        bindGame() {
            this.$('#cw-grid').addEventListener('click', (e) => {
                const c = e.target.closest('[data-rc]'); if (!c || this.state !== 'playing') return;
                const [y, x] = c.dataset.rc.split(',').map(Number);
                if (this.cur && this.cur[0] === y && this.cur[1] === x) this.dir = this.dir === 'A' ? 'D' : 'A';
                this.cur = [y, x]; this.fixDir(); this.render();
            });
            const clueClick = (e) => { const li = e.target.closest('[data-w]'); if (!li || this.state !== 'playing') return; const wd = this.cw.words[+li.dataset.w]; this.cur = [wd.r, wd.c]; this.dir = wd.dir; this.render(); };
            this.$('#cw-across').addEventListener('click', clueClick);
            this.$('#cw-down').addEventListener('click', clueClick);
            this.$('#cw-kbd').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) this.key(b.dataset.k); });
            this.root.querySelectorAll('.cw-nav').forEach(b => b.addEventListener('click', () => this.nextWord(+b.dataset.nav)));
            this.$('.cw-tools').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) this.tool(b.dataset.t); });
            this.onKey = (e) => {
                if (this.state !== 'playing' || !this.overlay.hidden || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea')) return;
                const k = e.key;
                if (/^[a-zA-ZñÑ]$/.test(k)) { e.preventDefault(); this.key(k.toUpperCase()); }
                else if (k === 'Backspace') { e.preventDefault(); this.key('DEL'); }
                else if (k.startsWith('Arrow')) {
                    e.preventDefault();
                    const d = { ArrowUp: [-1, 0, 'D'], ArrowDown: [1, 0, 'D'], ArrowLeft: [0, -1, 'A'], ArrowRight: [0, 1, 'A'] }[k];
                    if (this.dir !== d[2] && this.wordAt(this.cur, d[2])) { this.dir = d[2]; this.render(); return; }
                    this.step(d[0], d[1]);
                } else if (k === 'Tab' || k === 'Enter') { e.preventDefault(); this.nextWord(e.shiftKey ? -1 : 1); }
            };
            document.addEventListener('keydown', this.onKey);
        }
        onDestroy() { document.removeEventListener('keydown', this.onKey); }

        newGame(mode, r) {
            this.cw = build(r, mode.id);
            this.sol = solutionMap(this.cw);
            this.fill = {}; this.bad = []; this.revealed = []; this.checks = 0; this.reveals = 0;
            const w0 = this.cw.words[0]; this.cur = [w0.r, w0.c]; this.dir = w0.dir;
        }
        serialize() { return { cw: this.cw, f: this.fill, rv: this.revealed, ch: this.checks, rc: this.reveals, cur: this.cur, dir: this.dir }; }
        restore(d) { this.cw = d.cw; this.sol = solutionMap(this.cw); this.fill = d.f; this.revealed = d.rv || []; this.bad = []; this.checks = d.ch; this.reveals = d.rc; this.cur = d.cur; this.dir = d.dir; }

        wordAt(rc, dir) {
            if (!rc) return null;
            return this.cw.words.find(wd => wd.dir === dir && cellsOf(wd).some(([y, x]) => y === rc[0] && x === rc[1])) || null;
        }
        fixDir() { if (!this.wordAt(this.cur, this.dir)) this.dir = this.dir === 'A' ? 'D' : 'A'; }
        curWord() { return this.wordAt(this.cur, this.dir); }
        step(dy, dx) {
            let [y, x] = this.cur;
            for (let k = 0; k < Math.max(this.cw.w, this.cw.h); k++) {
                y += dy; x += dx;
                if (y < 0 || x < 0 || y >= this.cw.h || x >= this.cw.w) return;
                if (this.sol.has(y + ',' + x)) { this.cur = [y, x]; this.fixDir(); this.render(); return; }
            }
        }
        nextWord(d) {
            const ws = this.cw.words, i = ws.indexOf(this.curWord());
            const wd = ws[(i + d + ws.length) % ws.length];
            this.cur = [wd.r, wd.c]; this.dir = wd.dir; this.render();
        }
        key(k) {
            if (this.state !== 'playing' || !this.cur) return;
            const wd = this.curWord(); if (!wd) return;
            const cells = cellsOf(wd);
            const idx = cells.findIndex(([y, x]) => y === this.cur[0] && x === this.cur[1]);
            const keyOf = (c) => c[0] + ',' + c[1];
            if (k === 'DEL') {
                const here = keyOf(this.cur);
                if (this.fill[here] && !this.revealed.includes(here)) delete this.fill[here];
                else if (idx > 0) { this.cur = cells[idx - 1]; const kk = keyOf(this.cur); if (!this.revealed.includes(kk)) delete this.fill[kk]; }
                this.bad = this.bad.filter(b => this.fill[b]);
                this.render(); return;
            }
            const here = keyOf(this.cur);
            if (!this.revealed.includes(here)) { this.fill[here] = k; this.bad = this.bad.filter(b => b !== here); }
            Nexus.audio.play('click');
            // Avanza a la siguiente casilla vacía de la palabra (o la siguiente)
            let next = null;
            for (let j = idx + 1; j < cells.length; j++) if (!this.fill[keyOf(cells[j])]) { next = cells[j]; break; }
            if (!next && idx + 1 < cells.length) next = cells[idx + 1];
            if (next) this.cur = next;
            this.render();
            this.checkDone();
        }
        tool(t) {
            if (this.state !== 'playing') return;
            if (t === 'check') {
                this.checks++;
                this.bad = Object.keys(this.fill).filter(k => this.fill[k] !== this.sol.get(k));
                Nexus.audio.play(this.bad.length ? 'error' : 'correct');
                this.toast(this.bad.length ? `${this.bad.length} letra${this.bad.length === 1 ? '' : 's'} mal` : '¡Todo lo escrito es correcto!');
                this.render(); return;
            }
            const wd = this.curWord(); if (!wd) return;
            const cells = t === 'letter' ? [this.cur] : cellsOf(wd);
            let n = 0;
            for (const c of cells) {
                const k = c[0] + ',' + c[1];
                if (this.fill[k] === this.sol.get(k) && this.revealed.includes(k)) continue;
                if (this.fill[k] !== this.sol.get(k)) n++;
                this.fill[k] = this.sol.get(k); if (!this.revealed.includes(k)) this.revealed.push(k);
            }
            this.reveals += Math.max(1, n);
            this.bad = this.bad.filter(b => this.fill[b] !== this.sol.get(b));
            Nexus.audio.play('powerActivate');
            this.render(); this.checkDone();
        }
        checkDone() {
            for (const [k, ch] of this.sol) if (this.fill[k] !== ch) { this.saveRun(); return; }
            const score = Math.max(100, { facil: 700, medio: 1300, dificil: 2200, diario: 1800 }[this.mode.id] + Math.max(0, 1200 - this.elapsed) - this.reveals * 60 - this.checks * 30);
            this.finish({ won: true, score, label: formatTime(this.elapsed), stats: [{ label: 'Tiempo', value: formatTime(this.elapsed) }, { label: 'Palabras', value: String(this.cw.words.length) }, { label: 'Letras reveladas', value: String(this.reveals) }, { label: 'Puntos', value: formatNumber(score) }],
                extra: { reveals: this.reveals, checks: this.checks, level: this.mode.id }, updateExtra: (x) => { x.words = (x.words || 0) + this.cw.words.length; } });
        }

        render() {
            if (!this.cw) return;
            const { w, h } = this.cw;
            const wd = this.curWord();
            const inWord = new Set(wd ? cellsOf(wd).map(c => c[0] + ',' + c[1]) : []);
            const nums = new Map(this.cw.words.map(x => [x.r + ',' + x.c, x.n]));
            const bad = new Set(this.bad), rev = new Set(this.revealed);
            const grid = this.$('#cw-grid');
            grid.style.setProperty('--w', w); grid.style.setProperty('--h', h);
            let html = '';
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const k = y + ',' + x;
                if (!this.sol.has(k)) { html += '<i class="cw-x"></i>'; continue; }
                const cls = ['cw-c'];
                if (this.cur && this.cur[0] === y && this.cur[1] === x) cls.push('cur'); else if (inWord.has(k)) cls.push('word');
                if (bad.has(k)) cls.push('bad'); if (rev.has(k)) cls.push('rev');
                html += `<button type="button" class="${cls.join(' ')}" data-rc="${k}">${nums.has(k) ? `<sup>${nums.get(k)}</sup>` : ''}<b>${esc(this.fill[k] || '')}</b></button>`;
            }
            grid.innerHTML = html;
            const done = (x) => cellsOf(x).every(([yy, xx]) => this.fill[yy + ',' + xx] === this.sol.get(yy + ',' + xx));
            const li = (x, i) => `<li data-w="${i}" class="${x === wd ? 'on' : ''} ${done(x) ? 'done' : ''}"><b>${x.n}</b> ${esc(x.clue)} <small>(${x.w.length})</small></li>`;
            this.$('#cw-across').innerHTML = this.cw.words.map((x, i) => x.dir === 'A' ? li(x, i) : '').join('');
            this.$('#cw-down').innerHTML = this.cw.words.map((x, i) => x.dir === 'D' ? li(x, i) : '').join('');
            const on = this.root.querySelector('.cw-clues li.on'); if (on && on.scrollIntoView && !matchMedia('(max-width: 900px)').matches) on.scrollIntoView({ block: 'nearest' });
            this.$('#cw-clue').innerHTML = wd ? `<b>${wd.n} ${wd.dir === 'A' ? '→' : '↓'}</b> ${esc(wd.clue)} <small>(${wd.w.length} letras)</small>` : '–';
            const nd = this.cw.words.filter(done).length;
            this.pill('done', `${nd}/${this.cw.words.length}`);
        }
    }

    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'crossword' ? c.event : null);
    A.register([
        { id: 'cw_first', game: 'crossword', name: 'Primer crucigrama', desc: 'Completa un crucigrama.', icon: '✏️', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won; } },
        { id: 'cw_clean', game: 'crossword', name: 'Sin chuleta', desc: 'Completa un crucigrama difícil sin revelar ninguna letra.', icon: '🧠', rarity: 'epic', test: (c) => { const e = ev(c); return !!e && e.won && e.mode === 'dificil' && !e.extra.reveals; } },
        { id: 'cw_fast', game: 'crossword', name: 'Pluma veloz', desc: 'Completa un crucigrama medio en menos de 5 minutos.', icon: '⚡', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.mode === 'medio' && e.time < 300; } },
        { id: 'cw_100', game: 'crossword', name: 'Diccionario andante', desc: 'Resuelve 100 palabras de crucigrama.', icon: '📚', rarity: 'epic', ...A.counter((c) => c.stats('crossword').extra.words || 0, 100) },
        { id: 'cw_daily7', game: 'crossword', name: 'El crucigrama del periódico', desc: 'Completa 7 crucigramas diarios.', icon: '📰', rarity: 'rare', ...A.counter((c) => c.stats('crossword').extra.dailies || 0, 7) }
    ]);
    Nexus.games.registry.register({
        id: 'crossword', name: 'Crucigrama', emoji: '✏️', accent: '#a78bfa',
        tagline: 'Definiciones del Pasapalabra · 3 niveles · diario',
        description: 'Crucigramas nuevos en cada partida, creados con las 1.200 definiciones del Pasapalabra. Tres niveles, crucigrama diario, comprobación y ayudas por letra o palabra.',
        tags: ['Puzzle', 'Palabras'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'wins', label: 'Completados' }, { id: 'time', label: 'Mejor tiempo' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new Crossword(root)
    });
})();
