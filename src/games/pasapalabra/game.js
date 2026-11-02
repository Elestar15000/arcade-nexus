/* ============================================================
   NEXUS ARCADE · games/pasapalabra/game.js
   Pasapalabra: un rosco de 25 letras contra el reloj.
   - Rosco diario (igual para todos los jugadores cada día) y
     roscos aleatorios en 4 dificultades: básico, medio,
     difícil y profesional.
   - Acierta, falla o di «pasapalabra» para dejar la letra para
     la siguiente vuelta. El reloj no se detiene.
   - La partida se guarda en la cuenta (por modo) con la hora de
     fin absoluta: salir de la página no congela el tiempo.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $$, formatTime, formatNumber, dayKey, daysBetween } = Nexus.util;
    const B = () => Nexus.games.pasapalabraBank;
    const WIN_OK = 18;                    // aciertos para contar como victoria
    const EPOCH = '2026-01-01';

    const DIFF = {
        daily:  { label: 'Diaria',      emoji: '📅', time: 150, hints: 0, showLen: true,  penalty: 0,  tol: false, mult: 1.5, desc: 'El mismo rosco para todos, un intento al día. Mezcla definiciones de nivel medio y difícil.' },
        basic:  { label: 'Básico',      emoji: '🌱', time: 240, hints: 3, showLen: true,  penalty: 0,  tol: true,  mult: 1,   desc: 'Palabras cotidianas. 4 min, 3 pistas y se perdonan pequeñas erratas.' },
        medium: { label: 'Medio',       emoji: '⚔️', time: 180, hints: 1, showLen: true,  penalty: 0,  tol: true,  mult: 1.25, desc: 'Vocabulario general y cultura. 3 min, 1 pista y se perdonan pequeñas erratas.' },
        hard:   { label: 'Difícil',     emoji: '🔥', time: 150, hints: 0, showLen: true,  penalty: 0,  tol: false, mult: 1.5, desc: 'Palabras poco comunes. 2:30, sin pistas y la ortografía debe ser exacta.' },
        pro:    { label: 'Profesional', emoji: '💀', time: 120, hints: 0, showLen: false, penalty: 10, tol: false, mult: 2,   desc: 'Léxico culto y raro. 2 min, no sabes cuántas letras tiene y cada fallo resta 10 s.' }
    };
    const MODE_ORDER = ['daily', 'basic', 'medium', 'hard', 'pro'];
    const RESULT = { PENDING: 0, OK: 1, FAIL: 2, PASSED: 3 };

    // ── Lógica pura ─────────────────────────────────────────
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function seedOf(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

    function lev(a, b) {
        const m = a.length, n = b.length;
        if (!m) return n; if (!n) return m;
        let prev = Array.from({ length: n + 1 }, (_, j) => j);
        for (let i = 1; i <= m; i++) {
            const cur = [i];
            for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = cur;
        }
        return prev[n];
    }

    /** ¿Es correcta la respuesta escrita? */
    function isCorrect(q, input, tol) {
        const n = B().norm(input);
        if (!n) return false;
        const fold = (s) => s.replace(/ñ/g, 'n');
        const answers = [q.a, ...q.x].map(B().norm);
        if (answers.includes(n)) return true;
        if (q.l === 'Ñ' && answers.some(a => fold(a) === fold(n))) return true;   // teclados sin Ñ
        if (tol) return answers.some(a => a.length >= 6 && lev(fold(a), fold(n)) <= 1);
        return false;
    }

    const slim = (q) => ({ id: q.id, l: q.l, c: q.c, d: q.d, a: q.a, x: q.x });

    /** Rosco diario: determinista por fecha. */
    function buildDaily(date) {
        const rnd = mulberry32(seedOf('pasapalabra:' + date));
        return B().LETTERS.map(l => {
            const pool = ['medium', 'hard'].flatMap(lv => B().LEVELS[lv].filter(q => q.l === l));
            return slim(pool[Math.floor(rnd() * pool.length)]);
        });
    }
    /** Rosco aleatorio de una dificultad, evitando las últimas definiciones vistas. */
    function buildRandom(level, recent) {
        const seen = new Set(recent || []);
        return B().LETTERS.map(l => {
            const pool = B().LEVELS[level].filter(q => q.l === l);
            const fresh = pool.filter(q => !seen.has(q.id));
            const from = fresh.length ? fresh : pool;
            return slim(from[Math.floor(Math.random() * from.length)]);
        });
    }

    function nextIndex(res, from) {
        const n = res.length;
        for (let k = 1; k <= n; k++) {
            const i = (from + k) % n;
            if (res[i] === RESULT.PENDING || res[i] === RESULT.PASSED) return i;
        }
        return -1;
    }

    function computeScore(st) {
        const d = DIFF[st.mode];
        const ok = st.res.filter(r => r === RESULT.OK).length;
        const fails = st.res.filter(r => r === RESULT.FAIL).length;
        let s = ok * 100 + Math.floor(st.left) * 2 - fails * 25 - st.hintsUsed * 20;
        if (ok === st.res.length) s += 500;
        return Math.max(0, Math.round(s * d.mult));
    }

    // ── Persistencia ────────────────────────────────────────
    const saves = () => {
        const d = Nexus.services.users.data();
        if (!d.saves.pasapalabra) d.saves.pasapalabra = { runs: {}, recent: {} };
        const s = d.saves.pasapalabra;
        if (!s.runs) s.runs = {}; if (!s.recent) s.recent = {};
        return s;
    };
    const persist = () => Nexus.services.users.saveData();

    // ── Juego ───────────────────────────────────────────────
    class Pasapalabra {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.tick = null;
            this.build();
            this.bind();
            const dm = Nexus.services.settings.get('pasapalabra.defaultMode');
            this.loadMode(MODE_ORDER.includes(dm) ? dm : 'daily');
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id); return id;
        }

        // ── Estructura ──────────────────────────────────────
        build() {
            this.root.innerHTML = `
                <div class="game pasapalabra">
                    <header class="game-header">
                        <a class="btn-back" href="#/library"><span class="back-arrow">←</span><span>Biblioteca</span></a>
                        <div class="game-title"><span>🎡</span> Pasapalabra</div>
                        <div class="game-header-stats">
                            <div class="pill"><span aria-hidden="true">⏱️</span><span class="pill-value" data-el="hTimer">00:00</span></div>
                            <div class="pill"><span aria-hidden="true">✅</span><span class="pill-value" data-el="hOk">0</span></div>
                        </div>
                    </header>
                    <div class="pp-body">
                        <div class="pp-toolbar">
                            <div class="segmented" role="radiogroup" aria-label="Modo de juego" data-el="modes">
                                ${MODE_ORDER.map(m => `<button type="button" role="radio" data-mode="${m}">${DIFF[m].emoji} ${DIFF[m].label}</button>`).join('')}
                            </div>
                            <button type="button" class="btn btn-ghost btn-sm" data-el="new">🔄 Nuevo rosco</button>
                            <button type="button" class="icon-btn" data-el="help" aria-label="Cómo se juega" title="Cómo se juega">?</button>
                        </div>
                        <div class="pp-main">
                            <div class="pp-ring-wrap" data-el="ring"></div>
                            <div class="pp-side" data-el="panel"></div>
                        </div>
                    </div>
                </div>`;
            this.el = (n) => this.root.querySelector(`[data-el="${n}"]`);
        }

        bind() {
            this.root.addEventListener('click', (e) => {
                const b = e.target.closest('[data-mode],[data-act],[data-el="new"],[data-el="help"]');
                if (!b || !this.root.contains(b)) return;
                if (b.dataset.mode) return this.switchMode(b.dataset.mode);
                if (b.dataset.el === 'new') return this.newRosco();
                if (b.dataset.el === 'help') return this.showHelp();
                const a = b.dataset.act;
                if (a === 'start') this.start();
                else if (a === 'pass') this.pass();
                else if (a === 'hint') this.hint();
                else if (a === 'giveup') this.giveUp();
                else if (a === 'again') this.newRosco(true);
                else if (a === 'share') this.share();
            });
            this.root.addEventListener('submit', (e) => {
                if (!e.target.matches('[data-el="form"]')) return;
                e.preventDefault();
                const input = e.target.querySelector('input');
                this.answer(input.value); input.value = '';
            });
            this.onKey = (e) => {
                if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
                if (document.querySelector('.modal-overlay.active')) return;
                const t = e.target;
                if (t && t.closest && t.closest('a,button,input,textarea,select')) return;
                if (this.st && this.st.status === 'ready') { e.preventDefault(); this.start(); }
            };
            document.addEventListener('keydown', this.onKey);
        }

        // ── Modos y estado ──────────────────────────────────
        get today() { return dayKey(); }

        newRun(mode) {
            const s = saves();
            let qs;
            if (mode === 'daily') qs = buildDaily(this.today);
            else {
                qs = buildRandom(mode, s.recent[mode]);
                s.recent[mode] = ((s.recent[mode] || []).concat(qs.map(q => q.id))).slice(-75);
            }
            const d = DIFF[mode];
            return {
                mode, date: mode === 'daily' ? this.today : null, qs, res: qs.map(() => 0), idx: 0,
                status: 'ready', endAt: 0, total: d.time, hintsLeft: d.hints, hintsUsed: 0, hints: qs.map(() => 0),
                left: d.time, score: 0, fails: 0, ok: 0, recorded: false
            };
        }

        loadMode(mode) {
            const s = saves();
            let st = s.runs[mode];
            if (mode === 'daily' && (!st || st.date !== this.today)) st = null;
            if (!st || !Array.isArray(st.qs) || st.qs.length !== B().LETTERS.length) { st = this.newRun(mode); }
            s.runs[mode] = st;
            this.mode = mode; this.st = st;
            if (st.status === 'playing' && Date.now() >= st.endAt) this.finish('time');
            else persist();
            this.startTick();
            this.render();
        }

        switchMode(mode) {
            if (mode === this.mode || !DIFF[mode]) return;
            this.loadMode(mode);
        }

        newRosco(skipConfirm) {
            if (this.mode === 'daily') return this.switchMode('basic');
            const st = this.st;
            const go = () => {
                saves().runs[this.mode] = this.newRun(this.mode);
                this.loadMode(this.mode);
            };
            if (st.status === 'playing' && !skipConfirm) {
                Nexus.ui.modal.confirm({
                    title: 'Abandonar el rosco', icon: '🏳️', danger: true, confirmLabel: 'Abandonar',
                    message: 'Si empiezas otro rosco ahora, este contará como derrota.'
                }).then(ok => { if (ok && !this.destroyed) { this.finish('giveup'); go(); } });
            } else go();
        }

        // ── Flujo de partida ────────────────────────────────
        start() {
            const st = this.st;
            if (st.status !== 'ready') return;
            st.status = 'playing';
            st.endAt = Date.now() + st.total * 1000;
            st.idx = 0;
            persist();
            this.render();
        }

        remaining() { const st = this.st; return st.status === 'playing' ? Math.max(0, (st.endAt - Date.now()) / 1000) : (st.status === 'ready' ? st.total : st.left); }

        startTick() {
            clearInterval(this.tick);
            this.tick = setInterval(() => {
                if (this.destroyed) return;
                const st = this.st;
                if (st.status === 'playing' && Date.now() >= st.endAt) { this.finish('time'); this.render(); return; }
                this.drawTimer();
            }, 250);
        }

        answer(text) {
            const st = this.st;
            if (st.status !== 'playing') return;
            const raw = String(text || '').trim();
            if (!raw) { this.flash('Escribe una respuesta o pulsa «Pasapalabra».'); return; }
            if (B().norm(raw) === 'pasapalabra') return this.pass();
            const q = st.qs[st.idx];
            const good = isCorrect(q, raw, DIFF[st.mode].tol);
            st.res[st.idx] = good ? RESULT.OK : RESULT.FAIL;
            Nexus.audio.play(good ? 'win' : 'lose');
            if (!good) {
                const pen = DIFF[st.mode].penalty;
                if (pen) { st.endAt -= pen * 1000; this.flash(`❌ Era «${q.a}» · −${pen} s`, true); }
                else this.flash(`❌ Era «${q.a}»`, true);
                this.shakeCur();
            } else this.flash('✅ ¡Correcto!', false, true);
            this.advance();
        }

        pass() {
            const st = this.st;
            if (st.status !== 'playing') return;
            const nxt = nextIndex(st.res.map((r, i) => i === st.idx ? RESULT.PASSED : r), st.idx);
            if (nxt === -1 || nxt === st.idx) { this.flash('Es la última letra: ¡responde o se acaba el tiempo!'); return; }
            st.res[st.idx] = RESULT.PASSED;
            st.idx = nxt;
            persist(); this.render();
        }

        hint() {
            const st = this.st;
            if (st.status !== 'playing' || st.hintsLeft <= 0) return;
            const q = st.qs[st.idx];
            if (st.hints[st.idx] >= B().norm(q.a).length - 1) return;
            st.hintsLeft--; st.hintsUsed++; st.hints[st.idx]++;
            persist(); this.render();
        }

        giveUp() {
            if (this.st.status !== 'playing') return;
            Nexus.ui.modal.confirm({
                title: 'Rendirse', icon: '🏳️', danger: true, confirmLabel: 'Rendirme',
                message: 'Terminarás el rosco ahora con las letras que lleves.'
            }).then(ok => { if (ok && !this.destroyed && this.st.status === 'playing') { this.finish('giveup'); this.render(); } });
        }

        advance() {
            const st = this.st;
            const nxt = nextIndex(st.res, st.idx);
            if (nxt === -1) { this.finish('done'); this.render(); return; }
            st.idx = nxt;
            if (Date.now() >= st.endAt) { this.finish('time'); this.render(); return; }
            persist(); this.render();
        }

        // ── Fin de partida ──────────────────────────────────
        finish(reason) {
            const st = this.st;
            if (st.status === 'over') return;
            st.left = Math.max(0, (st.endAt - Date.now()) / 1000);
            if (reason === 'time') st.left = 0;
            st.status = 'over'; st.reason = reason;
            st.ok = st.res.filter(r => r === RESULT.OK).length;
            st.fails = st.res.filter(r => r === RESULT.FAIL).length;
            st.score = computeScore(st);
            const result = this.record();
            persist();
            if (reason !== 'giveup' || this.st === st) this.later(() => this.showResult(result), reason === 'done' ? 700 : 400);
        }

        record() {
            const st = this.st;
            if (st.recorded) return null;
            st.recorded = true;
            const daily = st.mode === 'daily';
            const total = st.qs.length;
            const won = st.ok >= WIN_OK;
            const perfect = st.ok === total;
            const used = Math.max(1, Math.round(st.total - st.left));
            const xp = Math.round((10 + st.ok * 3 + (perfect ? 60 : 0)) * (DIFF[st.mode].mult)) + (daily && won ? 25 : 0);
            return Nexus.services.progress.recordGame({
                game: 'pasapalabra', mode: st.mode, won, score: st.score, time: used, xp,
                extra: { ok: st.ok, fails: st.fails, hints: st.hintsUsed, left: Math.round(st.left), perfect, daily, difficulty: st.mode, reason: st.reason },
                updateExtra: (extra) => {
                    extra.totalOk = (extra.totalOk || 0) + st.ok;
                    extra.bestOk = Math.max(extra.bestOk || 0, st.ok);
                    if (perfect) extra.perfects = (extra.perfects || 0) + 1;
                    if (daily) {
                        if (won) {
                            const prev = extra.lastDailyWin;
                            extra.dailyStreak = (prev && daysBetween(prev, st.date) === 1) ? (extra.dailyStreak || 0) + 1 : 1;
                            extra.dailyBest = Math.max(extra.dailyBest || 0, extra.dailyStreak);
                            extra.lastDailyWin = st.date;
                        } else extra.dailyStreak = 0;
                    }
                }
            });
        }

        missedHtml() {
            const st = this.st;
            const miss = st.qs.map((q, i) => ({ q, r: st.res[i] })).filter(x => x.r !== RESULT.OK);
            if (!miss.length) return '<p class="muted small" style="text-align:center">¡Rosco perfecto! 🎉</p>';
            return `<div class="pp-missed"><strong>Para repasar</strong>${miss.map(({ q, r }) =>
                `<span class="pp-miss ${r === RESULT.FAIL ? 'f' : ''}"><b>${esc(q.l)}</b> ${esc(q.a)}</span>`).join('')}</div>`;
        }

        showResult(result) {
            const st = this.st;
            if (!result || st.status !== 'over') return;
            const perfect = st.ok === st.qs.length, won = st.ok >= WIN_OK;
            const d = DIFF[st.mode];
            Nexus.ui.fx && won && Nexus.ui.fx.confetti({ count: perfect ? 220 : 100 });
            Nexus.ui.modal.resultModal({
                emoji: perfect ? '🏆' : won ? '🎉' : '😵', kind: won ? 'win' : 'lose',
                title: perfect ? '¡Rosco perfecto!' : won ? '¡Buen rosco!' : st.reason === 'time' ? '¡Se acabó el tiempo!' : 'Rosco terminado',
                subtitle: won ? `${st.ok} de ${st.qs.length} letras acertadas.` : `Necesitas ${WIN_OK} aciertos para ganar. Has hecho ${st.ok}.`,
                extraHtml: this.missedHtml(),
                stats: [
                    { label: 'Puntuación', value: formatNumber(st.score) },
                    { label: 'Aciertos', value: `${st.ok}/${st.qs.length}` },
                    { label: 'Fallos', value: String(st.fails) },
                    { label: 'Modo', value: d.label }
                ],
                result,
                actions: [
                    { label: '📋 Compartir', kind: 'ghost', keepOpen: true, onClick: () => this.share() },
                    { label: this.mode === 'daily' ? '🎲 Rosco aleatorio' : '🔄 Otro rosco', kind: 'primary', onClick: () => { this.later(() => this.newRosco(true), 50); } },
                    { label: 'Cerrar', kind: 'ghost' }
                ]
            });
        }

        shareText() {
            const st = this.st, d = DIFF[st.mode];
            const tag = st.mode === 'daily' ? `Diaria #${daysBetween(EPOCH, st.date) + 1}` : d.label;
            const cell = (r) => r === RESULT.OK ? '🟩' : r === RESULT.FAIL ? '🟥' : '⬛';
            const rows = [];
            for (let i = 0; i < st.res.length; i += 5) rows.push(st.res.slice(i, i + 5).map(cell).join(''));
            return `Nexus Pasapalabra · ${tag} · ${st.ok}/${st.qs.length}${st.ok === st.qs.length ? ' 🏆' : ''}\n\n${rows.join('\n')}`;
        }

        async share() {
            const ok = await Nexus.util.copyText(this.shareText());
            Nexus.ui.toast(ok ? 'Resultado copiado al portapapeles' : 'No se pudo copiar', { type: ok ? 'success' : 'error', icon: ok ? '📋' : undefined });
            return false;
        }

        showHelp() {
            Nexus.ui.modal.open({
                title: 'Cómo se juega', icon: '🎡', className: 'modal-help',
                body: `
                    <p class="modal-text left">Completa el <b>rosco de ${B().LETTERS.length} letras</b> antes de que se acabe el tiempo. Cada letra tiene una definición: la respuesta <b>empieza por</b> esa letra (o <b>contiene</b> la Ñ o la X).</p>
                    <ul class="help-list">
                        <li>Escribe la respuesta y pulsa <b>Enter</b>. Las tildes no importan; la <b>Ñ</b> sí es una letra distinta.</li>
                        <li>🟩 acierto · 🟥 fallo (no se puede repetir) · 🟦 pasada. Escribe <b>pasapalabra</b> o pulsa el botón para dejarla para la siguiente vuelta.</li>
                        <li>Ganas con <b>${WIN_OK} aciertos</b> o más. Acertar las 25 es un <b>rosco perfecto</b> (+500 puntos).</li>
                        <li><b>Diaria</b>: el mismo rosco para todos, una vez al día. <b>Aleatorios</b>: ilimitados, en 4 dificultades (más difícil = menos tiempo, menos ayudas y más puntos).</li>
                        <li>Si sales de la página, <b>el reloj sigue corriendo</b>.</li>
                    </ul>`,
                actions: [{ label: '¡A jugar!', kind: 'primary' }]
            });
        }

        // ── Pintado ─────────────────────────────────────────
        render() {
            this.drawToolbar(); this.drawRing(); this.drawPanel(); this.drawTimer();
            const input = this.root.querySelector('[data-el="form"] input');
            if (input && window.matchMedia && matchMedia('(pointer: fine)').matches) input.focus({ preventScroll: true });   // en táctil no se abre el teclado solo
        }

        drawToolbar() {
            $$('[data-mode]', this.el('modes')).forEach(b => {
                const on = b.dataset.mode === this.mode;
                b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on));
            });
            const nb = this.el('new');
            nb.hidden = false;
            nb.textContent = this.mode === 'daily' ? '🎲 Roscos aleatorios' : '🔄 Nuevo rosco';
        }

        drawRing() {
            const st = this.st, n = st.qs.length;
            const ok = st.res.filter(r => r === RESULT.OK).length, bad = st.res.filter(r => r === RESULT.FAIL).length;
            const pend = st.res.filter(r => r === RESULT.PENDING || r === RESULT.PASSED).length;
            this.el('ring').innerHTML = `
                <div class="pp-ring" role="img" aria-label="Rosco: ${ok} aciertos, ${bad} fallos, ${pend} pendientes">
                    ${st.qs.map((q, i) => `<div class="pp-l" data-s="${st.res[i]}"${st.status === 'playing' && i === st.idx ? ' data-cur' : ''}${st.status === 'over' && st.res[i] !== RESULT.OK && st.res[i] !== RESULT.FAIL ? ' data-miss' : ''} style="--a:${(i * 360 / n - 90).toFixed(3)}deg"><span>${esc(q.l)}</span></div>`).join('')}
                    <div class="pp-core">
                        <div class="pp-time" data-el="time">${formatTime(this.remaining())}</div>
                        <div class="pp-score"><span class="ok">✔ ${ok}</span><span class="bad">✖ ${bad}</span><span class="pend">… ${pend}</span></div>
                    </div>
                </div>`;
        }

        drawTimer() {
            const t = formatTime(this.remaining());
            const a = this.el('time'), h = this.el('hTimer');
            if (a) { a.textContent = t; a.classList.toggle('low', this.st.status === 'playing' && this.remaining() <= 20); }
            if (h) h.textContent = t;
            const o = this.el('hOk');
            if (o) o.textContent = String(this.st.res.filter(r => r === RESULT.OK).length);
        }

        patternHtml(q) {
            const st = this.st, d = DIFF[st.mode];
            if (!d.showLen) return '<span class="pp-pattern muted">Longitud oculta</span>';
            const word = B().norm(q.a);
            const shown = (q.c ? 0 : 1) + (st.hints[st.idx] || 0);
            const chars = Array.from(word).map((ch, i) => i < shown ? ch.toUpperCase() : '_');
            return `<span class="pp-pattern" aria-label="${word.length} letras">${chars.join(' ')} <small>(${word.length} letras)</small></span>`;
        }

        drawPanel() {
            const st = this.st, d = DIFF[st.mode], el = this.el('panel');
            if (st.status === 'ready') {
                el.innerHTML = `
                    <div class="pp-card pp-intro">
                        <div class="pp-intro-emoji">${d.emoji}</div>
                        <h2>${esc(st.mode === 'daily' ? 'Rosco diario' : 'Rosco ' + d.label.toLowerCase())}</h2>
                        <p>${esc(d.desc)}</p>
                        <ul class="pp-rules">
                            <li>⏱️ <b>${formatTime(d.time)}</b></li>
                            <li>💡 <b>${d.hints}</b> ${d.hints === 1 ? 'pista' : 'pistas'}</li>
                            <li>✨ Puntos ×<b>${d.mult}</b></li>
                        </ul>
                        <button type="button" class="btn btn-primary btn-glow btn-lg" data-act="start">▶ Empezar</button>
                        <small class="muted">El reloj arranca al pulsar y no se detiene.</small>
                    </div>`;
                return;
            }
            if (st.status === 'over') {
                const perfect = st.ok === st.qs.length;
                el.innerHTML = `
                    <div class="pp-card pp-end">
                        <h2>${perfect ? '🏆 Rosco perfecto' : st.ok >= WIN_OK ? '🎉 Rosco superado' : 'Rosco terminado'}</h2>
                        <div class="pp-end-stats">
                            <div><span>Aciertos</span><b>${st.ok}/${st.qs.length}</b></div>
                            <div><span>Fallos</span><b>${st.fails}</b></div>
                            <div><span>Puntos</span><b>${formatNumber(st.score)}</b></div>
                        </div>
                        <div class="pp-end-actions">
                            <button type="button" class="btn btn-ghost" data-act="share">📋 Compartir</button>
                            ${st.mode === 'daily'
                                ? `<span class="muted small">Vuelve mañana para un rosco nuevo, o prueba un aleatorio.</span>`
                                : `<button type="button" class="btn btn-primary" data-act="again">🔄 Otro rosco</button>`}
                        </div>
                        <details class="pp-review"><summary>📖 Ver respuestas</summary>
                            <ol>${st.qs.map((q, i) => `<li data-s="${st.res[i]}"><b>${esc(q.l)}</b> <span>${esc(q.d)}</span> <em>${esc(q.a)}</em></li>`).join('')}</ol>
                        </details>
                    </div>`;
                return;
            }
            const q = st.qs[st.idx];
            const maxHint = B().norm(q.a).length - 1;
            const canHint = st.hintsLeft > 0 && st.hints[st.idx] < maxHint && d.showLen;
            el.innerHTML = `
                <div class="pp-card pp-play">
                    <div class="pp-qhead">
                        <span class="pp-qletter">${esc(q.l)}</span>
                        <span class="pp-qtype">${q.c ? 'Contiene la' : 'Empieza por'} <b>${esc(q.l)}</b></span>
                    </div>
                    <p class="pp-def" data-el="def">${esc(q.d)}</p>
                    ${this.patternHtml(q)}
                    <form class="pp-form" data-el="form" autocomplete="off">
                        <input type="text" name="a" inputmode="text" enterkeyhint="send" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Tu respuesta…" aria-label="Respuesta">
                        <button type="submit" class="btn btn-primary">Responder</button>
                    </form>
                    <div class="pp-msg" data-el="msg" role="status" aria-live="polite"></div>
                    <div class="pp-actions">
                        <button type="button" class="btn btn-ghost" data-act="pass">⏭ Pasapalabra</button>
                        ${d.hints ? `<button type="button" class="btn btn-ghost" data-act="hint" ${canHint ? '' : 'disabled'}>💡 Pista (${st.hintsLeft})</button>` : ''}
                        <button type="button" class="btn btn-ghost" data-act="giveup">🏳️ Rendirse</button>
                    </div>
                </div>`;
        }

        flash(text, bad, good) {
            const m = this.el('msg');
            if (!m) return;
            m.textContent = text; m.className = 'pp-msg show' + (bad ? ' bad' : good ? ' good' : '');
            clearTimeout(this.msgT);
            this.msgT = setTimeout(() => { const x = this.el('msg'); if (x) x.className = 'pp-msg'; }, 2200);
        }
        shakeCur() {
            const c = this.root.querySelector('.pp-l[data-cur]');
            if (c && !Nexus.ui.fx.reduced()) { c.classList.add('shake'); }
        }

        destroy() {
            this.destroyed = true;
            clearInterval(this.tick);
            clearTimeout(this.msgT);
            try { persist(); } catch (e) { /* noop */ }
            document.removeEventListener('keydown', this.onKey);
            this.timers.forEach(clearTimeout); this.timers.clear();
        }
    }

    // ── Estadísticas extra ──────────────────────────────────
    function statsExtra(gs) {
        const ex = gs.extra || {};
        return `
            <h3 class="subhead">Roscos</h3>
            <p class="muted small">Mejor rosco: <b>${ex.bestOk || 0}/${B().LETTERS.length}</b> · Roscos perfectos: <b>${ex.perfects || 0}</b> · Letras acertadas en total: <b>${formatNumber(ex.totalOk || 0)}</b></p>
            <p class="muted small">Racha diaria: <b>${ex.dailyStreak || 0}</b> · Mejor racha diaria: <b>${ex.dailyBest || 0}</b></p>`;
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const pp = (c) => c.stats('pasapalabra');
    const ev = (c, fn) => !!c.event && c.event.game === 'pasapalabra' && (!fn || fn(c.event));
    A.register([
        { id: 'pp_win_1', game: 'pasapalabra', name: 'Primer rosco', desc: 'Supera tu primer rosco (18 aciertos).', icon: '🎡', rarity: 'common',
            ...A.counter((c) => pp(c).wins, 1) },
        { id: 'pp_win_10', game: 'pasapalabra', name: 'Concursante', desc: 'Supera 10 roscos.', icon: '🎤', rarity: 'rare',
            ...A.counter((c) => pp(c).wins, 10) },
        { id: 'pp_win_40', game: 'pasapalabra', name: 'Veterano del plató', desc: 'Supera 40 roscos.', icon: '📺', rarity: 'epic',
            ...A.counter((c) => pp(c).wins, 40) },
        { id: 'pp_perfect', game: 'pasapalabra', name: 'Rosco perfecto', desc: 'Acierta las 25 letras.', icon: '🏆', rarity: 'legendary',
            test: (c) => ev(c, e => e.extra.perfect) },
        { id: 'pp_nofail', game: 'pasapalabra', name: 'Pulso firme', desc: 'Supera un rosco sin ningún fallo.', icon: '🎯', rarity: 'epic',
            test: (c) => ev(c, e => e.won && e.extra.fails === 0) },
        { id: 'pp_fast', game: 'pasapalabra', name: 'Sobrado de tiempo', desc: 'Supera un rosco con más de 45 segundos de sobra.', icon: '⚡', rarity: 'rare',
            test: (c) => ev(c, e => e.won && e.extra.left >= 45) },
        { id: 'pp_pro', game: 'pasapalabra', name: 'Profesional', desc: 'Supera un rosco en dificultad Profesional.', icon: '💀', rarity: 'epic',
            test: (c) => ev(c, e => e.won && e.extra.difficulty === 'pro') },
        { id: 'pp_nohint', game: 'pasapalabra', name: 'Sin pistas', desc: 'Supera un rosco Básico sin usar pistas.', icon: '🧠', rarity: 'common',
            test: (c) => ev(c, e => e.won && e.extra.difficulty === 'basic' && e.extra.hints === 0) },
        { id: 'pp_daily', game: 'pasapalabra', name: 'Rosco del día', desc: 'Supera el rosco diario.', icon: '📅', rarity: 'common',
            test: (c) => ev(c, e => e.won && e.extra.daily) },
        { id: 'pp_daily7', game: 'pasapalabra', name: 'Fiel a la cita', desc: 'Supera 7 roscos diarios seguidos.', icon: '🗓️', rarity: 'legendary',
            ...A.counter((c) => (pp(c).extra.dailyBest || 0), 7) },
        { id: 'pp_letters', game: 'pasapalabra', name: 'Letraherido', desc: 'Acierta 250 letras en total.', icon: '🔤', rarity: 'rare',
            ...A.counter((c) => (pp(c).extra.totalOk || 0), 250) }
    ]);

    // ── Registro ────────────────────────────────────────────
    Nexus.games.registry.register({
        id: 'pasapalabra', name: 'Pasapalabra', emoji: '🎡', accent: '#f59e0b',
        tagline: 'Rosco diario · 4 dificultades',
        description: 'El rosco de 25 letras contra el reloj: acierta, falla o pasa palabra. Un rosco diario igual para todos y roscos aleatorios en dificultad básica, media, difícil y profesional.',
        tags: ['Palabras', 'Puzzle'],
        modes: MODE_ORDER.map(m => ({ id: m, label: DIFF[m].label })),
        metrics: [{ id: 'score', label: 'Puntuación' }, { id: 'wins', label: 'Victorias' }],
        statsExtra,
        mount: (root) => new Pasapalabra(root)
    });

    Nexus.games.pasapalabraLogic = { isCorrect, buildDaily, buildRandom, nextIndex, computeScore, DIFF };
})();
