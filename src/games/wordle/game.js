/* ============================================================
   NEXUS ARCADE · games/wordle/game.js
   Wordle en español.
   - Palabras de 5 letras; la Ñ es una letra más. Las tildes se
     ignoran al escribir (se muestran en la solución final).
   - Cada intento debe ser una palabra real (diccionario).
   - Modos: Aleatoria (infinita, sin repetir las últimas), Diaria
     (una palabra por día, igual para todos) y Frase del día (una
     frase entera oculta: cada intento de 5 letras revela en la frase
     todas las apariciones de sus letras; hay que descubrirlas todas
     en 6 intentos).
   - Modo difícil, alto contraste, teclado en pantalla y físico.
   - La partida en curso se guarda en el perfil del usuario.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatTime, dayKey, daysBetween } = Nexus.util;
    const D = () => Nexus.games.wordleDict;
    const MAX_TRIES = 6, LEN = 5, RECENT_MAX = 40;
    const KB_ROWS = ['qwertyuiop', 'asdfghjklñ', '⏎zxcvbnm⌫'];
    const RANK = { absent: 1, present: 2, correct: 3 };
    const EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' };
    const EMOJI_CB = { correct: '🟧', present: '🟦', absent: '⬛' };
    /** Frase del día: palabras con sus letras (para mostrar y normalizadas) y el conjunto de letras a descubrir. */
    function parsePhrase(text) {
        const words = String(text).trim().split(/\s+/)
            .map(w => Array.from(w).filter(ch => /[a-záéíóúüñ]/i.test(ch)).map(ch => ({ d: ch.toUpperCase(), n: D().normalize(ch) })))
            .filter(w => w.length);
        return { text, words, letters: new Set(words.flat().map(c => c.n)) };
    }

    /** Colorea un intento de la Frase del día: verde = letra de la frase descubierta con este intento,
        'known' = de la frase pero ya descubierta antes, gris = no está en la frase. */
    function evaluatePhrase(guess, letters, known) {
        return Array.from(guess).map(ch => !letters.has(ch) ? 'absent' : known.has(ch) ? 'known' : 'correct');
    }

    let phraseOrder = null;
    /** Índice de la frase de un día: orden barajado con semilla fija, igual para todos. */
    function phraseIndexFor(date) {
        const list = Nexus.games.wordlePhrases || [];
        if (!phraseOrder || phraseOrder.length !== list.length) {
            let a = 90210;
            const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
            phraseOrder = list.map((_, i) => i);
            for (let i = phraseOrder.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [phraseOrder[i], phraseOrder[j]] = [phraseOrder[j], phraseOrder[i]]; }
        }
        const n = D().dailyNumber(date);
        return phraseOrder[((n % list.length) + list.length) % list.length];
    }

    // ── Lógica pura ─────────────────────────────────────────
    /** Evalúa un intento (maneja letras repetidas en dos pasadas). */
    function evaluate(guess, target) {
        const res = new Array(LEN).fill('absent');
        const left = {};
        for (let i = 0; i < LEN; i++) {
            if (guess[i] === target[i]) res[i] = 'correct';
            else left[target[i]] = (left[target[i]] || 0) + 1;
        }
        for (let i = 0; i < LEN; i++) {
            if (res[i] === 'correct') continue;
            if (left[guess[i]] > 0) { res[i] = 'present'; left[guess[i]]--; }
        }
        return res;
    }

    /** Modo difícil: devuelve el mensaje de error o null si el intento es válido. */
    function hardViolation(guess, previous, target) {
        for (const prev of previous) {
            const ev = evaluate(prev, target);
            for (let i = 0; i < LEN; i++) {
                if (ev[i] === 'correct' && guess[i] !== prev[i]) {
                    return `La letra ${i + 1} debe ser ${prev[i].toUpperCase()}`;
                }
            }
            for (let i = 0; i < LEN; i++) {
                if (ev[i] === 'present' && !guess.includes(prev[i])) {
                    return `El intento debe contener la ${prev[i].toUpperCase()}`;
                }
            }
        }
        return null;
    }

    const saves = () => {
        const d = Nexus.services.users.data();
        if (!d.saves.wordle) d.saves.wordle = { current: null, daily: null, recent: [] };
        return d.saves.wordle;
    };
    const persist = () => Nexus.services.users.saveData();
    const setting = (k) => Nexus.services.settings.get(k);

    // ── Juego ───────────────────────────────────────────────
    class Wordle {
        constructor(root) {
            this.root = root;
            this.timers = new Set();
            this.busy = false;
            this.cur = '';
            this.shown = 0;          // filas ya reveladas (para el teclado)
            this.startTs = null;     // instante del primer toque (para el cronómetro)
            this.tickId = null;
            this.destroyed = false;

            this.build();
            this.bind();
            if (/^#\/game\/wordle\/frase$/.test(location.hash)) {
                history.replaceState(null, '', location.href.split('#')[0] + '#/game/wordle');
                this.loadMode('phrase');
            } else this.loadMode('random');
        }

        // ── Estructura ──────────────────────────────────────
        build() {
            this.root.innerHTML = `
                <div class="game wordle">
                    <header class="game-header">
                        <a class="btn-back" href="#/library"><span class="back-arrow">←</span><span>Biblioteca</span></a>
                        <div class="game-title"><span>🔤</span> Wordle ES</div>
                        <div class="game-header-stats">
                            <div class="pill"><span aria-hidden="true">⏱️</span><span class="pill-value" data-el="timer">00:00</span></div>
                            <div class="pill"><span class="pill-label">Intento</span><span class="pill-value" data-el="attempt">1/${MAX_TRIES}</span></div>
                        </div>
                    </header>

                    <div class="wordle-body">
                        <div class="wordle-toolbar">
                            <div class="segmented" role="radiogroup" aria-label="Modo de juego" data-el="modes">
                                <button type="button" role="radio" data-mode="random">🎲 Aleatoria</button>
                                <button type="button" role="radio" data-mode="daily">📅 Diaria</button>
                                <button type="button" role="radio" data-mode="phrase">🧩 Frase del día</button>
                            </div>
                            <button type="button" class="chip-btn" data-el="hard" title="Debes reutilizar las pistas reveladas">🔥 Modo difícil</button>
                            <button type="button" class="btn btn-ghost btn-sm" data-el="new">🔄 Nueva palabra</button>
                            <button type="button" class="icon-btn" data-el="help" aria-label="Cómo se juega" title="Cómo se juega">?</button>
                        </div>

                        <div class="wordle-message" data-el="msg" role="status" aria-live="polite"></div>
                        <div class="wordle-board" data-el="board" role="grid" aria-label="Tablero de Wordle">
                            ${Array.from({ length: MAX_TRIES }, (_, r) => `
                                <div class="wordle-row" role="row">${Array.from({ length: LEN }, (_, c) =>
                                    `<div class="tile" role="gridcell" data-r="${r}" data-c="${c}"></div>`).join('')}</div>`).join('')}
                        </div>

                        <div class="wp" data-el="phrase" hidden></div>
                        <div class="wordle-end" data-el="end" hidden></div>

                        <div class="wordle-keyboard" data-el="kb" aria-label="Teclado">
                            ${KB_ROWS.map(row => `<div class="kb-row">${Array.from(row).map(k => {
                                const wide = k === '⏎' || k === '⌫';
                                const label = k === '⏎' ? 'Enter' : k === '⌫' ? 'Borrar' : k.toUpperCase();
                                return `<button type="button" tabindex="-1" class="key${wide ? ' key-wide' : ''}" data-key="${k}" aria-label="${label}">${k === '⏎' ? 'ENTER' : k === '⌫' ? '⌫' : k.toUpperCase()}</button>`;
                            }).join('')}</div>`).join('')}
                        </div>
                    </div>
                </div>`;
            this.el = (n) => this.root.querySelector(`[data-el="${n}"]`);
            this.tile = (r, c) => this.root.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
            this.row = (r) => this.el('board').children[r];
        }

        bind() {
            this.onKey = (e) => {
                if (e.ctrlKey || e.metaKey || e.altKey) return;
                const t = e.target;
                if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
                if (document.querySelector('.modal-overlay.active')) return;
                if (e.key === 'Enter') {
                    if (t && t.closest && t.closest('a,button,[role="button"]')) return; // deja activar el control enfocado
                    e.preventDefault(); this.submit();
                } else if (e.key === 'Backspace') {
                    e.preventDefault(); this.backspace();
                } else if (e.key.length === 1) {
                    const ch = D().normalize(e.key);
                    if (/^[a-zñ]$/.test(ch)) { e.preventDefault(); this.typeLetter(ch); }
                }
            };
            document.addEventListener('keydown', this.onKey);

            const kb = this.el('kb');
            kb.addEventListener('pointerdown', (e) => { if (e.target.closest('.key')) e.preventDefault(); }); // sin robar el foco
            kb.addEventListener('click', (e) => {
                const k = e.target.closest('.key');
                if (!k) return;
                const v = k.dataset.key;
                if (v === '⏎') this.submit(); else if (v === '⌫') this.backspace(); else this.typeLetter(v);
            });

            this.el('modes').addEventListener('click', (e) => {
                const b = e.target.closest('[data-mode]');
                if (b && b.dataset.mode !== this.mode) { b.blur(); this.switchMode(b.dataset.mode); }
            });
            this.el('hard').addEventListener('click', (e) => { e.currentTarget.blur(); this.toggleHard(); });
            this.el('new').addEventListener('click', (e) => { e.currentTarget.blur(); this.newWord(); });
            this.el('help').addEventListener('click', (e) => { e.currentTarget.blur(); this.showHelp(); });

            this.unsubSettings = Nexus.bus.on('settings:change', () => this.drawToolbar());
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id);
            return id;
        }

        // ── Estado / persistencia ───────────────────────────
        loadMode(mode) {
            const sv = saves();
            const today = dayKey();
            this.mode = mode;
            this.cur = '';
            this.busy = false;

            this.ph = null;
            if (mode === 'phrase') {
                let st = sv.phrase && sv.phrase.date === today ? sv.phrase : null;
                const idx = phraseIndexFor(today);
                if (!st || st.idx !== idx || st.v !== 2 || st.guesses.some(g => typeof g !== 'string')) {
                    st = { v: 2, mode: 'phrase', date: today, idx, guesses: [], status: 'playing', elapsed: 0, hard: false };
                    sv.phrase = st;
                }
                this.ph = parsePhrase(Nexus.games.wordlePhrases[idx]);
                this.st = st;
            } else if (mode === 'daily') {
                let st = sv.daily && sv.daily.date === today ? sv.daily : null;
                if (!st) {
                    st = { mode: 'daily', date: today, guesses: [], status: 'playing', elapsed: 0, hard: !!setting('wordle.hardMode') };
                    sv.daily = st;
                }
                st.target = D().daily(today);
                this.st = st;
            } else {
                if (!sv.current || !sv.current.target) this.createRandom();
                this.st = sv.current;
            }
            this.shown = this.st.guesses.length;
            this.stopTimer();
            this.startTs = null;
            this.hideMessage();
            this.drawAll();
            persist();
        }

        createRandom() {
            const sv = saves();
            const target = D().random(sv.recent);
            sv.recent = sv.recent.concat(target).slice(-RECENT_MAX);
            sv.current = { mode: 'random', target, guesses: [], status: 'playing', elapsed: 0, hard: !!setting('wordle.hardMode') };
        }

        switchMode(mode) {
            this.commitElapsed(); persist();
            this.loadMode(mode);
        }

        toggleHard() {
            const st = this.st;
            if (this.mode === 'phrase') { Nexus.ui.toast('La Frase del día no tiene modo difícil.', { icon: '🧩' }); return; }
            if (st.status !== 'playing' || st.guesses.length > 0) {
                Nexus.ui.toast('El modo difícil sólo puede cambiarse antes del primer intento.', { icon: '🔥' });
                return;
            }
            st.hard = !st.hard;
            Nexus.services.settings.set('wordle.hardMode', st.hard);
            persist(); this.drawToolbar();
        }

        elapsedNow() {
            return this.st.elapsed + (this.startTs ? (Date.now() - this.startTs) / 1000 : 0);
        }
        commitElapsed() {
            if (this.startTs) { this.st.elapsed += (Date.now() - this.startTs) / 1000; this.startTs = Date.now(); }
        }
        ensureTimer() {
            if (this.startTs || this.st.status !== 'playing') return;
            this.startTs = Date.now();
            this.tickId = setInterval(() => this.drawTimer(), 1000);
        }
        stopTimer() {
            clearInterval(this.tickId); this.tickId = null;
            this.commitElapsed(); this.startTs = null;
        }

        // ── Entrada ─────────────────────────────────────────
        canInput() { return !this.busy && this.st.status === 'playing' && !this.destroyed; }

        typeLetter(ch) {
            if (!this.canInput() || this.cur.length >= LEN) return;
            this.ensureTimer();
            const c = this.cur.length;
            this.cur += ch;
            const t = this.curTile(c);
            t.textContent = ch.toUpperCase();
            t.classList.add('filled', 'pop');
            this.later(() => t.classList.remove('pop'), 120);
            Nexus.audio.play('key');
        }

        backspace() {
            if (!this.canInput() || !this.cur.length) return;
            const c = this.cur.length - 1;
            this.cur = this.cur.slice(0, -1);
            const t = this.curTile(c);
            t.textContent = ''; t.classList.remove('filled');
        }

        curTile(c) { return this.tile(this.st.guesses.length, c); }

        reject(text) {
            const row = this.row(this.st.guesses.length);
            row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
            this.later(() => row.classList.remove('shake'), 500);
            this.message(text);
            Nexus.audio.play('error');
        }

        submit() {
            if (!this.canInput()) return;
            if (this.mode === 'phrase') return this.submitPhrase();
            const st = this.st, guess = this.cur;
            if (guess.length < LEN) return this.reject('Faltan letras');
            if (!D().isValid(guess)) return this.reject('No está en el diccionario');
            if (st.guesses.includes(guess)) return this.reject('Ya has probado esa palabra');
            if (st.hard) {
                const v = hardViolation(guess, st.guesses, st.target);
                if (v) return this.reject(v);
            }

            this.ensureTimer();
            this.commitElapsed();
            const rowIdx = st.guesses.length;
            const res = evaluate(guess, st.target);
            st.guesses.push(guess);
            this.cur = '';
            this.busy = true;

            const won = guess === st.target;
            const lost = !won && st.guesses.length >= MAX_TRIES;
            let result = null;
            if (won || lost) {
                st.status = won ? 'won' : 'lost';
                this.stopTimer();
                // Se registra al momento (no tras la animación) para no perder la partida si el usuario sale
                result = this.record(won);
            }
            persist();
            this.drawAttempt();

            this.revealRow(rowIdx, res, () => {
                this.shown = st.guesses.length;
                this.drawKeyboard();
                this.busy = false;
                if (won || lost) this.finish(won, result, rowIdx);
            });
        }

        // ── Frase del día ───────────────────────────────────
        /** Letras de la frase ya descubiertas con los primeros `upto` intentos. */
        knownLetters(upto) {
            const s = new Set();
            this.st.guesses.slice(0, upto === undefined ? this.st.guesses.length : upto)
                .forEach(g => { for (const ch of g) if (this.ph.letters.has(ch)) s.add(ch); });
            return s;
        }
        phraseRes(r) { return evaluatePhrase(this.st.guesses[r], this.ph.letters, this.knownLetters(r)); }
        phraseComplete(known) { for (const l of this.ph.letters) if (!known.has(l)) return false; return true; }

        submitPhrase() {
            const st = this.st, guess = this.cur;
            if (guess.length < LEN) return this.reject('Faltan letras');
            if (!D().isValid(guess)) return this.reject('No está en el diccionario');
            if (st.guesses.includes(guess)) return this.reject('Ya has probado esa palabra');
            this.ensureTimer(); this.commitElapsed();
            const rowIdx = st.guesses.length;
            const before = this.knownLetters();
            const res = evaluatePhrase(guess, this.ph.letters, before);
            st.guesses.push(guess);
            this.cur = '';
            this.busy = true;
            const known = this.knownLetters();
            const won = this.phraseComplete(known);
            const lost = !won && st.guesses.length >= MAX_TRIES;
            let result = null;
            if (won || lost) { st.status = won ? 'won' : 'lost'; this.stopTimer(); result = this.recordPhrase(won); }
            persist();
            this.drawAttempt();
            this.revealRow(rowIdx, res, () => {
                this.shown = st.guesses.length;
                this.busy = false;
                const fresh = [...known].filter(l => !before.has(l));
                this.drawPhrase(fresh); this.drawKeyboard();
                if (fresh.length && !won) { Nexus.audio.play('correct'); this.message(fresh.length === 1 ? `¡La ${fresh[0].toUpperCase()} está en la frase!` : `¡${fresh.length} letras nuevas en la frase!`); }
                else if (!won && !lost) this.message('Ninguna letra nueva');
                if (won || lost) this.later(() => this.finish(won, result, -1), fresh.length ? 450 : 0);
            });
        }

        recordPhrase(won) {
            const st = this.st, used = st.guesses.length, time = Math.round(st.elapsed);
            const known = this.knownLetters(), total = this.ph.letters.size;
            const found = [...this.ph.letters].filter(l => known.has(l)).length;
            const score = won ? (MAX_TRIES + 1 - used) * 120 + total * 15 + Math.max(0, 240 - time) : found * 20;
            const xp = won ? 30 + (MAX_TRIES + 1 - used) * 10 : 5 + found;
            st.score = score;
            return Nexus.services.progress.recordGame({
                game: 'wordle', mode: 'phrase', won, score, time, xp,
                extra: { phrase: true, used, letters: total, found, hard: false, daily: false, target: '' },
                updateExtra: (extra) => {
                    if (won) {
                        extra.phraseWins = (extra.phraseWins || 0) + 1;
                        const prev = extra.lastPhraseWin;
                        extra.phraseStreak = (prev && daysBetween(prev, st.date) === 1) ? (extra.phraseStreak || 0) + 1 : 1;
                        extra.phraseBest = Math.max(extra.phraseBest || 0, extra.phraseStreak);
                        extra.lastPhraseWin = st.date;
                    } else extra.phraseStreak = 0;
                }
            });
        }

        /** Frase con las letras descubiertas; `full` la muestra entera (en gris las que faltaban). */
        phraseHtml(full, fresh) {
            const known = this.knownLetters(), fr = new Set(fresh || []);
            return this.ph.words.map(w => `<span class="wp-word">${w.map(c => {
                const on = known.has(c.n);
                if (!on && !full) return '<span class="tile mini wp-blank"></span>';
                return `<span class="tile mini${on && fr.has(c.n) ? ' flip' : ''}" data-state="${on ? 'correct' : 'absent'}">${esc(c.d)}</span>`;
            }).join('')}</span>`).join('');
        }

        drawPhrase(fresh) {
            const st = this.st, known = this.knownLetters(), total = this.ph.letters.size;
            const found = [...this.ph.letters].filter(l => known.has(l)).length;
            this.el('phrase').innerHTML = `
                <div class="wp-card">
                    <div class="wp-tag">🧩 Frase del día #${D().dailyNumber(st.date)} · ${found}/${total} letras · ${this.ph.words.length} ${this.ph.words.length === 1 ? 'palabra' : 'palabras'}</div>
                    <div class="wp-phrase">${this.phraseHtml(st.status === 'lost', fresh)}</div>
                </div>`;
        }

        revealRow(r, res, done) {
            const fast = Nexus.ui.fx.reduced();
            const step = fast ? 0 : 280;
            for (let c = 0; c < LEN; c++) {
                const t = this.tile(r, c);
                this.later(() => { t.classList.add('flip'); Nexus.audio.play('flip'); }, c * step);
                this.later(() => { t.dataset.state = res[c]; t.classList.remove('filled'); t.setAttribute('aria-label', `${t.textContent}, ${({ correct: 'correcta', present: 'en otra posición', absent: 'no está', known: 'ya descubierta' })[res[c]]}`); }, c * step + (fast ? 0 : 230));
            }
            this.later(done, (LEN - 1) * step + (fast ? 0 : 520));
        }

        // ── Fin de partida ──────────────────────────────────
        record(won) {
            const st = this.st;
            const attempts = st.guesses.length, time = Math.round(st.elapsed), daily = st.mode === 'daily';
            const score = won ? (MAX_TRIES + 1 - attempts) * 100 + Math.max(0, 180 - time) + (st.hard ? 150 : 0) + (daily ? 100 : 0) : 0;
            const xp = won ? Math.round((20 + (MAX_TRIES + 1 - attempts) * 10) * (st.hard ? 1.5 : 1)) + (daily ? 25 : 0) : 5;
            st.score = score;
            return Nexus.services.progress.recordGame({
                game: 'wordle', mode: st.mode, won, score, time, xp,
                extra: { attempts, hard: !!st.hard, daily, target: st.target },
                updateExtra: (extra) => {
                    extra.dist = extra.dist || new Array(MAX_TRIES).fill(0);
                    if (won) extra.dist[attempts - 1]++;
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

        finish(won, result, rowIdx) {
            const st = this.st;
            if (won && rowIdx >= 0) {
                for (let c = 0; c < LEN; c++) {
                    const t = this.tile(rowIdx, c);
                    t.style.animationDelay = `${c * 90}ms`;
                    t.classList.add('bounce');
                }
            }
            if (won) {
                Nexus.audio.play('win');
                Nexus.ui.fx.confetti({ count: 120 });
            } else Nexus.audio.play('lose');
            this.drawEnd();
            this.later(() => this.showResult(won, result), won ? 1100 : 500);
        }

        answerHtml() {
            if (this.mode === 'phrase') return `<div class="wp-phrase wp-answer">${this.phraseHtml(true)}</div>`;
            const word = D().display(this.st.target).toUpperCase();
            return `<div class="answer-tiles" aria-label="La palabra era ${esc(word)}">${Array.from(word).map(l => `<span class="tile mini" data-state="correct">${esc(l)}</span>`).join('')}</div>`;
        }

        showResult(won, result) {
            const st = this.st;
            if (this.mode === 'phrase') {
                const used = st.guesses.length, known = this.knownLetters();
                const found = [...this.ph.letters].filter(l => known.has(l)).length;
                Nexus.ui.modal.resultModal({
                    emoji: won ? '🧩' : '😵', kind: won ? 'win' : 'lose',
                    title: won ? '¡Frase completa!' : '¡Se acabaron los intentos!',
                    subtitle: won ? `Has descubierto la frase en ${used} ${used === 1 ? 'intento' : 'intentos'}.` : 'La frase era:',
                    extraHtml: this.answerHtml(),
                    stats: [
                        { label: 'Puntuación', value: Nexus.util.formatNumber(st.score || 0) },
                        { label: 'Tiempo', value: formatTime(st.elapsed) },
                        { label: 'Intentos', value: `${used}/${MAX_TRIES}` },
                        { label: 'Letras', value: `${found}/${this.ph.letters.size}` }
                    ],
                    result,
                    actions: [
                        { label: '📋 Compartir', kind: 'ghost', keepOpen: true, onClick: () => this.share() },
                        { label: '🎲 Aleatoria', kind: 'primary', onClick: () => { this.later(() => this.switchMode('random'), 50); } },
                        { label: 'Cerrar', kind: 'ghost' }
                    ]
                });
                return;
            }
            const n = st.guesses.length;
            const daily = st.mode === 'daily';
            Nexus.ui.modal.resultModal({
                emoji: won ? '🏆' : '😵', kind: won ? 'win' : 'lose',
                title: won ? '¡Palabra acertada!' : '¡Se acabaron los intentos!',
                subtitle: won ? `La has encontrado en ${n} ${n === 1 ? 'intento' : 'intentos'}.` : 'La palabra era:',
                extraHtml: this.answerHtml(),
                stats: [
                    { label: 'Puntuación', value: Nexus.util.formatNumber(st.score || 0) },
                    { label: 'Tiempo', value: formatTime(st.elapsed) },
                    { label: 'Intentos', value: `${n}/${MAX_TRIES}` },
                    { label: 'Modo', value: (daily ? 'Diaria' : 'Aleatoria') + (st.hard ? ' · difícil' : '') }
                ],
                result,
                actions: [
                    { label: '📋 Compartir', kind: 'ghost', keepOpen: true, onClick: () => this.share() },
                    { label: daily ? '🎲 Aleatoria' : '🔄 Otra palabra', kind: 'primary', onClick: () => { this.later(() => this.newWord(true), 50); } },
                    { label: 'Cerrar', kind: 'ghost' }
                ]
            });
        }

        shareText() {
            const st = this.st;
            const em = setting('wordle.colorblind') ? EMOJI_CB : EMOJI;
            if (this.mode === 'phrase') {
                const pem = { correct: em.correct, known: '🟢', absent: em.absent };
                const grid = st.guesses.map((g, r) => this.phraseRes(r).map(x => pem[x]).join('')).join('\n');
                return `Nexus Wordle ES · Frase del día #${D().dailyNumber(st.date)} ${st.status === 'won' ? st.guesses.length : 'X'}/${MAX_TRIES}\n\n${grid}`;
            }
            const tag = st.mode === 'daily' ? `Diaria #${D().dailyNumber(st.date)}` : 'Aleatoria';
            const score = st.status === 'won' ? st.guesses.length : 'X';
            const grid = st.guesses.map(g => evaluate(g, st.target).map(s => em[s]).join('')).join('\n');
            return `Nexus Wordle ES · ${tag} ${score}/${MAX_TRIES}${st.hard ? '*' : ''}\n\n${grid}`;
        }

        async share() {
            const ok = await Nexus.util.copyText(this.shareText());
            Nexus.ui.toast(ok ? 'Resultado copiado al portapapeles' : 'No se pudo copiar', { type: ok ? 'success' : 'error', icon: ok ? '📋' : undefined });
            return false; // mantener el modal abierto
        }

        newWord(force) {
            this.root.querySelector('[data-el="new"]').blur();
            if (this.mode === 'daily' || this.mode === 'phrase') return this.switchMode('random');
            const st = this.st;
            const go = () => {
                this.stopTimer();
                this.createRandom();
                this.loadMode('random');
            };
            if (st.status === 'playing' && st.guesses.length > 0 && !force) {
                Nexus.ui.modal.confirm({
                    title: 'Abandonar la partida', icon: '🏳️', danger: true, confirmLabel: 'Abandonar',
                    message: 'Si pides otra palabra ahora, esta partida contará como derrota.'
                }).then(ok => {
                    if (!ok || this.destroyed) return;
                    st.status = 'lost'; this.stopTimer();
                    this.record(false);
                    Nexus.ui.toast(`La palabra era ${D().display(st.target).toUpperCase()}`, { icon: '🏳️', duration: 4000 });
                    go();
                });
            } else go();
        }

        showHelp() {
            const ex = (letters, states) => `<div class="help-word">${Array.from(letters).map((l, i) =>
                `<span class="tile mini" data-state="${states[i]}">${l}</span>`).join('')}</div>`;
            Nexus.ui.modal.open({
                title: 'Cómo se juega', icon: '🔤', className: 'modal-help',
                body: `
                    <p class="modal-text left">Adivina la palabra oculta en <b>${MAX_TRIES} intentos</b>. Cada intento debe ser una <b>palabra real de ${LEN} letras</b> (sin importar las tildes).</p>
                    <div class="help-example">${ex('GATOS', ['correct', 'absent', 'absent', 'absent', 'absent'])}<p><b>G</b> está en la palabra y en su sitio.</p></div>
                    <div class="help-example">${ex('PLAYA', ['absent', 'present', 'absent', 'absent', 'absent'])}<p><b>L</b> está en la palabra pero en otra posición.</p></div>
                    <div class="help-example">${ex('NUBES', ['absent', 'absent', 'absent', 'absent', 'absent'])}<p>Ninguna letra está en la palabra.</p></div>
                    <ul class="help-list">
                        <li>La <b>Ñ</b> es una letra distinta de la N.</li>
                        <li><b>Aleatoria</b>: palabras ilimitadas. <b>Diaria</b>: una al día, igual para todos.</li>
                        <li><b>🧩 Frase del día</b>: debajo del tablero hay una frase oculta. Cada palabra que pruebas descubre en la frase <b>todas</b> las apariciones de sus letras: 🟩 letra nueva de la frase, 🟢 de la frase pero ya descubierta, ⬛ no está. Descubre la frase entera en ${MAX_TRIES} intentos.</li>
                        <li><b>Modo difícil</b>: debes reutilizar las pistas que ya has descubierto.</li>
                    </ul>`,
                actions: [{ label: '¡A jugar!', kind: 'primary' }]
            });
        }

        // ── Pintado ─────────────────────────────────────────
        drawAll() {
            const st = this.st;
            const phrase = this.mode === 'phrase';
            this.el('phrase').hidden = !phrase;
            for (let r = 0; r < MAX_TRIES; r++) {
                for (let c = 0; c < LEN; c++) {
                    const t = this.tile(r, c);
                    t.className = 'tile'; t.removeAttribute('data-state'); t.removeAttribute('style'); t.removeAttribute('aria-label');
                    t.textContent = '';
                    const g = st.guesses[r];
                    if (g) {
                        const res = phrase ? this.phraseRes(r) : evaluate(g, st.target);
                        t.textContent = g[c].toUpperCase();
                        t.dataset.state = res[c];
                        t.setAttribute('aria-label', `${g[c].toUpperCase()}, ${({ correct: 'correcta', present: 'en otra posición', absent: 'no está', known: 'ya descubierta' })[res[c]]}`);
                    }
                }
            }
            if (phrase) this.drawPhrase();
            this.drawToolbar(); this.drawAttempt(); this.drawTimer(); this.drawKeyboard(); this.drawEnd();
        }

        drawToolbar() {
            const st = this.st;
            $$('[data-mode]', this.el('modes')).forEach(b => {
                const on = b.dataset.mode === this.mode;
                b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on));
            });
            const hard = this.el('hard');
            hard.hidden = this.mode === 'phrase';
            hard.classList.toggle('active', !!st.hard);
            hard.setAttribute('aria-pressed', String(!!st.hard));
            this.el('new').textContent = this.mode === 'random' ? '🔄 Nueva palabra' : '🎲 Probar aleatoria';
            this.root.querySelector('.wordle').dataset.cb = setting('wordle.colorblind') ? 'on' : 'off';
        }

        drawAttempt() {
            const st = this.st;
            const max = MAX_TRIES;
            const n = st.status === 'playing' ? Math.min(max, st.guesses.length + 1) : st.guesses.length;
            this.el('attempt').textContent = `${n}/${max}`;
        }

        drawTimer() { this.el('timer').textContent = formatTime(this.elapsedNow()); }

        drawKeyboard() {
            const best = {};
            const phrase = this.mode === 'phrase';
            for (let r = 0; r < this.shown; r++) {
                const g = this.st.guesses[r];
                const ev = phrase ? Array.from(g).map(ch => this.ph.letters.has(ch) ? 'correct' : 'absent') : evaluate(g, this.st.target);
                for (let i = 0; i < LEN; i++) if (!best[g[i]] || RANK[ev[i]] > RANK[best[g[i]]]) best[g[i]] = ev[i];
            }
            $$('.key', this.el('kb')).forEach(k => {
                const s = best[k.dataset.key];
                if (s) k.dataset.state = s; else k.removeAttribute('data-state');
            });
        }

        /** Banda inferior con el resultado (también al volver a una partida terminada). */
        drawEnd() {
            const st = this.st, box = this.el('end');
            if (st.status === 'playing') { box.hidden = true; box.innerHTML = ''; return; }
            const won = st.status === 'won', n = st.guesses.length;
            const daily = st.mode === 'daily';
            box.hidden = false;
            box.className = 'wordle-end ' + (won ? 'won' : 'lost');
            if (this.mode === 'phrase') {
                box.innerHTML = `
                    <div class="wordle-end-text">
                        <strong>${won ? `¡Frase descubierta en ${n} ${n === 1 ? 'intento' : 'intentos'}!` : 'La frase era:'}</strong>
                        ${won ? '' : this.answerHtml()}
                        <small>Vuelve mañana para la frase #${D().dailyNumber(st.date) + 1}.</small>
                    </div>
                    <div class="wordle-end-actions">
                        <button class="btn btn-ghost btn-sm" data-act="share">📋 Compartir</button>
                        <button class="btn btn-primary btn-sm" data-act="new">🎲 Probar aleatoria</button>
                    </div>`;
                box.querySelector('[data-act="share"]').onclick = () => this.share();
                box.querySelector('[data-act="new"]').onclick = () => this.switchMode('random');
                return;
            }
            box.innerHTML = `
                <div class="wordle-end-text">
                    <strong>${won ? `¡Acertada en ${n} ${n === 1 ? 'intento' : 'intentos'}!` : 'La palabra era:'}</strong>
                    ${won ? '' : this.answerHtml()}
                    ${daily ? `<small>Vuelve mañana para el reto #${D().dailyNumber(st.date) + 1}.</small>` : ''}
                </div>
                <div class="wordle-end-actions">
                    <button class="btn btn-ghost btn-sm" data-act="share">📋 Compartir</button>
                    <button class="btn btn-primary btn-sm" data-act="new">${daily ? '🎲 Probar aleatoria' : '🔄 Nueva palabra'}</button>
                </div>`;
            box.querySelector('[data-act="share"]').onclick = () => this.share();
            box.querySelector('[data-act="new"]').onclick = () => this.newWord(true);
        }

        message(text, ms = 1600) {
            const el = this.el('msg');
            el.textContent = text; el.classList.add('show');
            clearTimeout(this.msgTimer);
            this.msgTimer = setTimeout(() => this.hideMessage(), ms);
        }
        hideMessage() { const el = this.el('msg'); if (el) { el.classList.remove('show'); } }

        destroy() {
            this.destroyed = true;
            this.stopTimer();
            try { persist(); } catch (e) { /* noop */ }
            document.removeEventListener('keydown', this.onKey);
            if (this.unsubSettings) this.unsubSettings();
            this.timers.forEach(clearTimeout); this.timers.clear();
            clearTimeout(this.msgTimer);
        }
    }

    // ── Estadísticas extra (histograma de intentos) ─────────
    function statsExtra(gs) {
        const dist = (gs.extra && gs.extra.dist) || new Array(MAX_TRIES).fill(0);
        const max = Math.max(1, ...dist);
        const lost = gs.losses;
        const rows = dist.map((n, i) => `
            <div class="dist-row"><span class="dist-n">${i + 1}</span>
                <div class="dist-bar"><div class="dist-fill" style="width:${Math.max(n ? 8 : 0, (n / max) * 100)}%">${n}</div></div></div>`).join('');
        const ex = gs.extra || {};
        return `
            <h3 class="subhead">Distribución de intentos</h3>
            <div class="dist">${rows}
                <div class="dist-row"><span class="dist-n">✗</span><div class="dist-bar"><div class="dist-fill lost" style="width:${Math.max(lost ? 8 : 0, (lost / max) * 100)}%">${lost}</div></div></div>
            </div>
            <p class="muted small">Racha diaria: <b>${ex.dailyStreak || 0}</b> · Mejor racha diaria: <b>${ex.dailyBest || 0}</b></p>`;
    }

    // ── Logros de Wordle ────────────────────────────────────
    const A = Nexus.services.achievements;
    const wd = (c) => c.stats('wordle');
    const won = (c, fn) => !!c.event && c.event.game === 'wordle' && c.event.won && (!fn || fn(c.event));
    A.register([
        { id: 'wd_win_1', game: 'wordle', name: 'Primera palabra', desc: 'Acierta tu primera palabra.', icon: '🔤', rarity: 'common',
            ...A.counter((c) => wd(c).wins, 1) },
        { id: 'wd_win_10', game: 'wordle', name: 'Lingüista', desc: 'Acierta 10 palabras.', icon: '📖', rarity: 'rare',
            ...A.counter((c) => wd(c).wins, 10) },
        { id: 'wd_win_50', game: 'wordle', name: 'Académico de la lengua', desc: 'Acierta 50 palabras.', icon: '🎓', rarity: 'epic',
            ...A.counter((c) => wd(c).wins, 50) },
        { id: 'wd_last', game: 'wordle', name: 'Por los pelos', desc: 'Acierta en el último intento.', icon: '😅', rarity: 'common',
            test: (c) => won(c, e => e.extra.attempts === MAX_TRIES) },
        { id: 'wd_fast3', game: 'wordle', name: 'Intuición', desc: 'Acierta en 3 intentos o menos.', icon: '🧠', rarity: 'rare',
            test: (c) => won(c, e => e.extra.attempts <= 3) },
        { id: 'wd_first_try', game: 'wordle', name: 'Vidente', desc: 'Acierta a la primera.', icon: '🔮', rarity: 'legendary',
            test: (c) => won(c, e => e.extra.attempts === 1) },
        { id: 'wd_speed', game: 'wordle', name: 'Relámpago', desc: 'Acierta en menos de 60 segundos.', icon: '⚡', rarity: 'rare',
            test: (c) => won(c, e => e.time < 60) },
        { id: 'wd_hard', game: 'wordle', name: 'Sin red', desc: 'Gana una partida en modo difícil.', icon: '🔥', rarity: 'rare',
            test: (c) => won(c, e => e.extra.hard) },
        { id: 'wd_enye', game: 'wordle', name: '¡Viva la Ñ!', desc: 'Acierta una palabra que contenga Ñ.', icon: '🇪🇸', rarity: 'rare',
            test: (c) => won(c, e => e.extra.target.includes('ñ')) },
        { id: 'wd_streak5', game: 'wordle', name: 'En racha', desc: 'Encadena 5 victorias seguidas.', icon: '🔥', rarity: 'epic',
            ...A.counter((c) => wd(c).bestStreak, 5) },
        { id: 'wd_daily', game: 'wordle', name: 'Al día', desc: 'Gana el reto diario.', icon: '📅', rarity: 'common',
            test: (c) => won(c, e => e.extra.daily) },
        { id: 'wd_daily7', game: 'wordle', name: 'Hábito diario', desc: 'Gana 7 retos diarios seguidos.', icon: '🗓️', rarity: 'legendary',
            ...A.counter((c) => (wd(c).extra.dailyBest || 0), 7) },
        { id: 'wd_phrase', game: 'wordle', name: 'Refranero', desc: 'Descubre una Frase del día.', icon: '🧩', rarity: 'common',
            test: (c) => won(c, e => e.extra.phrase) },
        { id: 'wd_phrase_sharp', game: 'wordle', name: 'Sabiduría popular', desc: 'Descubre la Frase del día en 3 intentos o menos.', icon: '🦉', rarity: 'epic',
            test: (c) => won(c, e => e.extra.phrase && e.extra.used <= 3) },
        { id: 'wd_phrase7', game: 'wordle', name: 'Libro de refranes', desc: 'Descubre 7 Frases del día.', icon: '📜', rarity: 'rare',
            ...A.counter((c) => (wd(c).extra.phraseWins || 0), 7) }
    ]);

    // ── Registro ────────────────────────────────────────────
    Nexus.games.registry.register({
        id: 'wordle', name: 'Wordle ES', emoji: '🔤', accent: '#00b894',
        tagline: 'Palabra de 5 letras · Diaria · Frase del día',
        description: 'El clásico juego de palabras en español: 6 intentos para descubrir la palabra oculta. Palabras aleatorias, reto diario y la Frase del día: descubre una frase oculta letra a letra con tus intentos.',
        tags: ['Palabras', 'Puzzle'],
        modes: [{ id: 'random', label: 'Aleatoria' }, { id: 'daily', label: 'Diaria' }, { id: 'phrase', label: 'Frase del día' }],
        metrics: [{ id: 'score', label: 'Puntuación' }, { id: 'time', label: 'Tiempo' }, { id: 'wins', label: 'Victorias' }],
        statsExtra,
        mount: (root) => new Wordle(root)
    });

    // Expuesto para pruebas
    Nexus.games.wordleLogic = { evaluate, hardViolation, parsePhrase, evaluatePhrase, phraseIndexFor };
})();
