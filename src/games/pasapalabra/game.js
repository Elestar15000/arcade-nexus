/* ============================================================
   NEXUS ARCADE · games/pasapalabra/game.js
   Pasapalabra: un rosco de 25 letras, sin reloj a la vista.
   - Rosco diario (igual para todos los jugadores cada día) y
     roscos aleatorios en 4 dificultades: básico, medio,
     difícil y profesional.
   - Acierta, falla o di «pasapalabra» para dejar la letra para
     la siguiente vuelta. No hay cuenta atrás: al terminar se
     muestra tu marca (el tiempo que has tardado).
   - La partida se guarda en la cuenta (por modo) con la hora de
     inicio absoluta: salir de la página no congela la marca.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $$, formatTime, formatNumber, dayKey, daysBetween } = Nexus.util;
    const B = () => Nexus.games.pasapalabraBank;
    const WIN_OK = 18;                    // aciertos para contar como victoria
    const EPOCH = '2026-01-01';

    // par = tiempo de referencia (s): terminar antes da puntos extra. penalty = segundos que suma cada fallo.
    const DIFF = {
        daily:  { label: 'Diaria',      emoji: '📅', par: 240, hints: 0, showLen: true,  penalty: 0,  tol: false, mult: 1.5, desc: 'El mismo rosco para todos, un intento al día. Mezcla definiciones de nivel medio y difícil.' },
        basic:  { label: 'Básico',      emoji: '🌱', par: 360, hints: 3, showLen: true,  penalty: 0,  tol: true,  mult: 1,   desc: 'Palabras cotidianas. 3 pistas y se perdonan pequeñas erratas.' },
        medium: { label: 'Medio',       emoji: '⚔️', par: 300, hints: 1, showLen: true,  penalty: 0,  tol: true,  mult: 1.25, desc: 'Vocabulario general y cultura. 1 pista y se perdonan pequeñas erratas.' },
        hard:   { label: 'Difícil',     emoji: '🔥', par: 270, hints: 0, showLen: true,  penalty: 0,  tol: false, mult: 1.5, desc: 'Palabras poco comunes. Sin pistas y la ortografía debe ser exacta.' },
        pro:    { label: 'Profesional', emoji: '💀', par: 240, hints: 0, showLen: false, penalty: 10, tol: false, mult: 2,   desc: 'Léxico culto y raro. No sabes cuántas letras tiene y cada fallo suma 10 s a tu marca.' }
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
        // Rapidez: sólo si se supera el rosco; cada segundo por debajo del tiempo de referencia suma
        const speed = ok >= WIN_OK ? Math.max(0, Math.round((d.par - (st.time || 0)) * 1.5)) : 0;
        let s = ok * 100 + speed - fails * 25 - st.hintsUsed * 20;
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
            this.build();
            this.bind();
            this.loadMode('daily');
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
                            <div class="pill" title="Aciertos"><span aria-hidden="true">✅</span><span class="pill-value" data-el="hOk">0</span></div>
                            <div class="pill" title="Fallos"><span aria-hidden="true">❌</span><span class="pill-value" data-el="hBad">0</span></div>
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
                status: 'ready', startAt: 0, penaltyS: 0, time: 0, hintsLeft: d.hints, hintsUsed: 0, hints: qs.map(() => 0),
                score: 0, fails: 0, ok: 0, recorded: false
            };
        }

        loadMode(mode) {
            const s = saves();
            let st = s.runs[mode];
            if (mode === 'daily' && (!st || st.date !== this.today)) st = null;
            if (!st || !Array.isArray(st.qs) || st.qs.length !== B().LETTERS.length) { st = this.newRun(mode); }
            // Partidas guardadas con la versión con cuenta atrás (endAt): se convierten a hora de inicio
            if (st.startAt === undefined) {
                st.startAt = st.endAt ? st.endAt - (st.total || 150) * 1000 : 0;
                st.penaltyS = 0;
                st.time = st.status === 'over' ? Math.round((st.total || 0) - (st.left || 0)) : 0;
                delete st.endAt; delete st.total; delete st.left;
            }
            s.runs[mode] = st;
            this.mode = mode; this.st = st;
            persist();
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
            st.startAt = Date.now();
            st.penaltyS = 0;
            st.idx = 0;
            persist();
            this.render();
        }

        /** Segundos de la marca (tiempo real + penalizaciones). */
        elapsed() {
            const st = this.st;
            if (st.status === 'playing') return Math.max(0, (Date.now() - st.startAt) / 1000) + (st.penaltyS || 0);
            return st.status === 'over' ? (st.time || 0) : 0;
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
                if (pen) { st.penaltyS = (st.penaltyS || 0) + pen; this.flash(`❌ Era «${q.a}» · +${pen} s a tu marca`, true); }
                else this.flash(`❌ Era «${q.a}»`, true);
                this.shakeCur();
            } else this.flash('✅ ¡Correcto!', false, true);
            this.advance();
        }

        pass() {
            const st = this.st;
            if (st.status !== 'playing') return;
            const nxt = nextIndex(st.res.map((r, i) => i === st.idx ? RESULT.PASSED : r), st.idx);
            if (nxt === -1 || nxt === st.idx) { this.flash('Es la última letra que queda: respóndela o ríndete.'); return; }
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
            persist(); this.render();
        }

        // ── Fin de partida ──────────────────────────────────
        finish(reason) {
            const st = this.st;
            if (st.status === 'over') return;
            st.time = Math.round(this.elapsed() * 10) / 10;
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
            const used = Math.max(1, Math.round(st.time));
            const xp = Math.round((10 + st.ok * 3 + (perfect ? 60 : 0)) * (DIFF[st.mode].mult)) + (daily && won ? 25 : 0);
            return Nexus.services.progress.recordGame({
                game: 'pasapalabra', mode: st.mode, won, score: st.score, time: used, xp,
                extra: { ok: st.ok, fails: st.fails, hints: st.hintsUsed, time: used, penalty: st.penaltyS || 0, perfect, daily, difficulty: st.mode, reason: st.reason },
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
                title: perfect ? '¡Rosco perfecto!' : won ? '¡Buen rosco!' : 'Rosco terminado',
                subtitle: won ? `${st.ok} de ${st.qs.length} letras acertadas.` : `Necesitas ${WIN_OK} aciertos para ganar. Has hecho ${st.ok}.`,
                extraHtml: this.markHtml() + this.missedHtml(),
                stats: [
                    { label: 'Puntuación', value: formatNumber(st.score) },
                    { label: 'Aciertos', value: `${st.ok}/${st.qs.length}` },
                    { label: 'Fallos', value: String(st.fails) + (st.penaltyS ? ` (+${st.penaltyS} s)` : '') },
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

        /** Marca de tiempo grande + mejor marca del modo (sólo cuentan los roscos superados). */
        markHtml() {
            const st = this.st;
            const ms = Nexus.services.progress.stats('pasapalabra').byMode[st.mode];
            const best = ms && ms.bestTime != null ? ms.bestTime : null;
            const isBest = st.ok >= WIN_OK && best != null && Math.round(st.time) <= best;
            return `<div class="pp-mark"><span>⏱️ Tu marca</span><b>${formatTime(st.time)}</b>
                ${st.penaltyS ? `<small>incluye +${st.penaltyS} s por fallos</small>` : ''}
                ${best != null ? `<small>${isBest ? '🏅 ¡Es tu mejor marca en este modo!' : `Tu mejor marca en ${esc(DIFF[st.mode].label)}: ${formatTime(best)}`}</small>`
                    : st.ok >= WIN_OK ? '' : '<small>Supera el rosco para que la marca cuente como récord.</small>'}</div>`;
        }

        shareText() {
            const st = this.st, d = DIFF[st.mode];
            const tag = st.mode === 'daily' ? `Diaria #${daysBetween(EPOCH, st.date) + 1}` : d.label;
            const cell = (r) => r === RESULT.OK ? '🟩' : r === RESULT.FAIL ? '🟥' : '⬛';
            const rows = [];
            for (let i = 0; i < st.res.length; i += 5) rows.push(st.res.slice(i, i + 5).map(cell).join(''));
            return `Nexus Pasapalabra · ${tag} · ${st.ok}/${st.qs.length}${st.ok === st.qs.length ? ' 🏆' : ''} · ⏱️ ${formatTime(st.time)}\n\n${rows.join('\n')}`;
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
                    <p class="modal-text left">Completa el <b>rosco de ${B().LETTERS.length} letras</b> lo más rápido que puedas. Cada letra tiene una definición: la respuesta <b>empieza por</b> esa letra (o <b>contiene</b> la Ñ o la X).</p>
                    <ul class="help-list">
                        <li>Escribe la respuesta y pulsa <b>Enter</b>. Las tildes no importan; la <b>Ñ</b> sí es una letra distinta.</li>
                        <li>🟩 acierto · 🟥 fallo (no se puede repetir) · 🟦 pasada. Escribe <b>pasapalabra</b> o pulsa el botón para dejarla para la siguiente vuelta.</li>
                        <li>Ganas con <b>${WIN_OK} aciertos</b> o más. Acertar las 25 es un <b>rosco perfecto</b> (+500 puntos).</li>
                        <li><b>Diaria</b>: el mismo rosco para todos, una vez al día. <b>Aleatorios</b>: ilimitados, en 4 dificultades (más difícil = menos ayudas y más puntos).</li>
                        <li><b>No hay cuenta atrás</b>: juega a tu ritmo. Al terminar verás tu <b>marca</b> (lo que has tardado) y si es tu récord. Terminar rápido da puntos extra.</li>
                        <li>En <b>Profesional</b>, cada fallo suma 10 s a tu marca. Si sales de la página, el tiempo sigue contando.</li>
                    </ul>`,
                actions: [{ label: '¡A jugar!', kind: 'primary' }]
            });
        }

        // ── Pintado ─────────────────────────────────────────
        render() {
            this.drawToolbar(); this.drawRing(); this.drawPanel(); this.drawCounters();
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
                        ${st.status === 'over'
                            ? `<div class="pp-time" title="Tu marca">${formatTime(st.time)}</div>`
                            : `<div class="pp-time pp-cur-letter">${st.status === 'playing' ? esc(st.qs[st.idx].l) : '🎡'}</div>`}
                        <div class="pp-score"><span class="ok">✔ ${ok}</span><span class="bad">✖ ${bad}</span><span class="pend">… ${pend}</span></div>
                    </div>
                </div>`;
        }

        drawCounters() {
            const o = this.el('hOk'), b = this.el('hBad');
            if (o) o.textContent = String(this.st.res.filter(r => r === RESULT.OK).length);
            if (b) b.textContent = String(this.st.res.filter(r => r === RESULT.FAIL).length);
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
                            <li>⏱️ <b>Sin cuenta atrás</b></li>
                            <li>💡 <b>${d.hints}</b> ${d.hints === 1 ? 'pista' : 'pistas'}</li>
                            <li>✨ Puntos ×<b>${d.mult}</b></li>
                        </ul>
                        <button type="button" class="btn btn-primary btn-glow btn-lg" data-act="start">▶ Empezar</button>
                        <small class="muted">Juega a tu ritmo: al terminar verás tu marca de tiempo${d.penalty ? ` (cada fallo suma ${d.penalty} s)` : ''}.</small>
                    </div>`;
                return;
            }
            if (st.status === 'over') {
                const perfect = st.ok === st.qs.length;
                el.innerHTML = `
                    <div class="pp-card pp-end">
                        <h2>${perfect ? '🏆 Rosco perfecto' : st.ok >= WIN_OK ? '🎉 Rosco superado' : 'Rosco terminado'}</h2>
                        ${this.markHtml()}
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
        { id: 'pp_fast', game: 'pasapalabra', name: 'Contrarreloj', desc: 'Supera un rosco con una marca de menos de 3 minutos.', icon: '⚡', rarity: 'rare',
            test: (c) => ev(c, e => e.won && e.time < 180) },
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
        tagline: 'Rosco diario · 4 dificultades · tu marca',
        description: 'El rosco de 25 letras a tu ritmo: acierta, falla o pasa palabra y, al terminar, mira tu marca de tiempo. Un rosco diario igual para todos y roscos aleatorios en dificultad básica, media, difícil y profesional.',
        tags: ['Palabras', 'Puzzle'],
        modes: MODE_ORDER.map(m => ({ id: m, label: DIFF[m].label })),
        metrics: [{ id: 'score', label: 'Puntuación' }, { id: 'time', label: 'Mejor marca' }, { id: 'wins', label: 'Victorias' }],
        statsExtra,
        mount: (root) => new Pasapalabra(root)
    });

    Nexus.games.pasapalabraLogic = { isCorrect, buildDaily, buildRandom, nextIndex, computeScore, DIFF };
})();
