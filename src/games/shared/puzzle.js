/* ============================================================
   NEXUS ARCADE · games/shared/puzzle.js
   Base común de los juegos de puzle (Sudoku, Crucigrama, Sopa de
   letras, Conexiones y 2048):
     · Nexus.games.seed.rng(texto): azar con semilla (retos diarios
       iguales para todos ese día).
     · PuzzleGame: cabecera, menú de modos con reto diario, reloj,
       pausa, partida guardada para continuar, registro del
       resultado y ventana de fin. Cada juego implementa:
         layout() → { main, side }   HTML propio
         newGame(mode, rng, daily)   prepara la partida
         serialize() / restore(o)    partida guardada
         render()                    pinta
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatTime, formatNumber, dayKey } = Nexus.util;
    const Kit = Nexus.games.kit;

    // ── Azar con semilla ────────────────────────────────────
    function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) {
        let a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
        const r = () => {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
        r.pick = (arr) => arr[Math.floor(r() * arr.length)];
        r.shuffle = (arr) => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
        r.sample = (arr, n) => r.shuffle(arr).slice(0, n);
        return r;
    }
    const EPOCH = Date.UTC(2026, 0, 1);
    const dayNumber = (key = dayKey()) => Math.round((Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) - EPOCH) / 864e5) + 1;
    /** Mayúsculas sin tildes (la Ñ se conserva). */
    const up = (s) => String(s).toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ');
    Nexus.games.seed = { rng, hash, dayNumber, up };

    // ── Carcasa de juego de puzle ───────────────────────────
    class PuzzleGame {
        /**
         * cfg: { id, name, emoji, accent, modes: [{ id, label, emoji, desc, daily? }], pills: [{id, icon, title}],
         *        help: [html], tagline, timer: true }
         */
        constructor(root, cfg) {
            this.root = root; this.cfg = cfg; this.destroyed = false; this.timers = new Set();
            this.state = 'menu'; this.elapsed = 0; this.mode = null; this.daily = null;
            const s = this.saves();
            this.modeId = s.lastMode && cfg.modes.some(m => m.id === s.lastMode) ? s.lastMode : cfg.modes[0].id;
            this.build();
            this.onVis = () => { if (document.hidden) this.saveRun(); };
            document.addEventListener('visibilitychange', this.onVis);
        }
        saves() {
            const d = Nexus.services.users.data();
            const s = d.saves[this.cfg.id] || (d.saves[this.cfg.id] = {});
            if (!s.daily) s.daily = {};
            return s;
        }
        persist() { Nexus.services.users.saveData(); }
        later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms); this.timers.add(id); return id; }

        build() {
            const c = this.cfg, L = this.layout();
            this.root.innerHTML = `
            <div class="game ax-game pz pz-${c.id}" style="--ax-accent:${c.accent}">
                ${Kit.header({ emoji: c.emoji, title: c.name, pills: [{ id: 'time', icon: '⏱️', init: '0:00', title: 'Tiempo' }, ...(c.pills || [])] })}
                <div class="pz-body">
                    <div class="pz-main">${L.main}</div>
                    <aside class="pz-side">
                        ${L.side || ''}
                        <div class="ax-card pz-side-btns">
                            <button class="btn btn-ghost" data-pz="pause" type="button">⏸ Pausa</button>
                            <button class="btn btn-ghost" data-pz="menu" type="button">☰ Menú</button>
                        </div>
                    </aside>
                    <div class="ax-overlay pz-overlay"></div>
                    <div class="ax-toast pz-toast"></div>
                </div>
            </div>`;
            this.$ = (q) => this.root.querySelector(q);
            this.$$ = (q) => Array.from(this.root.querySelectorAll(q));
            this.overlay = this.$('.pz-overlay');
            this.root.querySelector('.pz-side').addEventListener('click', (e) => {
                const b = e.target.closest('[data-pz]'); if (!b) return;
                if (b.dataset.pz === 'pause') this.pause(); else if (b.dataset.pz === 'menu') this.pause(true);
            });
            this.overlay.addEventListener('click', (e) => this.onOverlay(e));
        }

        pill(id, v) { const el = this.root.querySelector(`[data-pill="${id}"]`); if (el && el.textContent !== String(v)) el.textContent = v; }
        toast(text, ms = 1800) {
            const t = this.$('.pz-toast'); t.textContent = text; t.classList.add('show');
            clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('show'), ms);
        }

        // ── Menú ────────────────────────────────────────────
        savedRun() {
            const r = this.saves().run;
            if (!r || !r.data) return null;
            if (r.daily && r.daily !== dayKey()) return null;
            return r;
        }
        showMenu() {
            this.stopTimer();
            const c = this.cfg, s = this.saves(), run = this.savedRun(), today = dayKey();
            const dm = c.modes.find(m => m.daily);
            const drec = s.daily[today];
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pz-menu">
                <div class="pz-logo">${esc(c.emoji)} ${esc(c.name.toUpperCase())}</div>
                <p class="ax-sub">${esc(c.tagline)}</p>
                ${run ? `<div class="pz-resume"><span>⏯ Partida a medias: <b>${esc((c.modes.find(m => m.id === run.mode) || {}).label || '')}</b> · ${formatTime(run.elapsed || 0)}</span>
                    <button class="btn btn-primary btn-glow" data-do="resume" type="button">Continuar</button></div>` : ''}
                ${Kit.modeCards(c.modes.map(m => Object.assign({}, m, { desc: m.daily ? `${m.desc} · #${dayNumber(today)}${drec && drec.won ? ' · ✅ ' + (drec.label || 'resuelto') : ''}` : m.desc })), this.modeId)}
                ${dm && this.modeId === dm.id && drec && drec.won ? `<p class="pz-note">Ya has resuelto el reto de hoy${drec.label ? ` (${esc(drec.label)})` : ''}. Puedes repetirlo, pero cuenta tu primer resultado. Racha: 🔥 ${this.dailyStreak()}</p>` : ''}
                <div class="ax-play-row"><button class="btn btn-primary btn-glow" data-do="new" type="button">▶ ${run ? 'Nueva partida' : 'Jugar'}</button></div>
                <details class="ax-help"><summary>📖 Cómo se juega</summary><ul>${c.help.map(h => `<li>${h}</li>`).join('')}</ul></details>
                ${this.menuExtra ? this.menuExtra() : ''}
            </div>`;
        }
        dailyStreak() {
            const d = this.saves().daily; let n = 0; let k = dayKey();
            const prev = (key) => { const t = new Date(key + 'T12:00:00'); t.setDate(t.getDate() - 1); return dayKey(t); };
            if (!(d[k] && d[k].won)) k = prev(k);
            while (d[k] && d[k].won) { n++; k = prev(k); }
            return n;
        }
        onOverlay(e) {
            const m = e.target.closest('[data-mode]');
            if (m) { Nexus.audio.play('click'); this.modeId = m.dataset.mode; this.saves().lastMode = this.modeId; this.showMenu(); return; }
            const b = e.target.closest('[data-do]'); if (!b) return;
            Nexus.audio.play('click');
            const d = b.dataset.do;
            if (d === 'new') this.start(this.modeId);
            else if (d === 'resume') this.resume();
            else if (d === 'unpause') { this.overlay.hidden = true; this.state = 'playing'; this.startTimer(); this.onResume && this.onResume(); }
            else if (d === 'giveup') this.giveUp();
            else if (d === 'menu') this.showMenu();
            else if (this.onOverlayAction) this.onOverlayAction(d, b);
        }

        // ── Partida ─────────────────────────────────────────
        start(modeId) {
            const mode = this.cfg.modes.find(m => m.id === modeId);
            this.mode = mode; this.daily = mode.daily ? dayKey() : null;
            const r = rng(this.daily ? `${this.cfg.id}:${this.daily}` : (Date.now() ^ Math.floor(Math.random() * 1e9)));
            this.elapsed = 0; this.state = 'playing'; this.result = null;
            this.newGame(mode, r, !!this.daily);
            this.overlay.hidden = true;
            this.saveRun();
            this.render();
            this.startTimer();
            Nexus.audio.play('tdRound');
        }
        resume() {
            const run = this.savedRun(); if (!run) { this.showMenu(); return; }
            this.mode = this.cfg.modes.find(m => m.id === run.mode); this.daily = run.daily || null;
            this.elapsed = run.elapsed || 0; this.state = 'playing';
            this.restore(run.data);
            this.overlay.hidden = true;
            this.render(); this.startTimer();
        }
        saveRun() {
            if (this.destroyed || this.state !== 'playing' || !this.mode) return;
            this.saves().run = { mode: this.mode.id, daily: this.daily, elapsed: this.elapsed, data: this.serialize() };
            this.persist();
        }
        clearRun() { this.saves().run = null; this.persist(); }

        startTimer() {
            this.stopTimer();
            this.tick = setInterval(() => {
                if (this.destroyed || this.state !== 'playing' || document.hidden) return;
                this.elapsed++;
                this.pill('time', formatTime(this.elapsed));
                if (this.onTick) this.onTick();
                if (this.elapsed % 15 === 0) this.saveRun();
            }, 1000);
            this.pill('time', formatTime(this.elapsed));
        }
        stopTimer() { clearInterval(this.tick); this.tick = 0; }

        pause(toMenu) {
            if (this.state !== 'playing') { this.showMenu(); return; }
            this.saveRun(); this.stopTimer();
            if (toMenu) { this.state = 'menu'; this.showMenu(); return; }
            this.state = 'paused';
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel"><h2 class="ax-big">⏸ PAUSA</h2><p class="ax-sub">${esc(this.mode.label)} · ${formatTime(this.elapsed)}</p>
                <div class="ax-play-row"><button class="btn btn-primary btn-glow" data-do="unpause" type="button">▶ Seguir</button>
                ${this.cfg.noGiveUp ? '' : '<button class="btn btn-ghost" data-do="giveup" type="button">🏳️ Rendirse</button>'}</div></div>`;
        }
        giveUp() {
            Nexus.ui.modal.confirm({ title: 'Rendirse', icon: '🏳️', danger: true, confirmLabel: 'Rendirse', message: 'La partida contará como no superada.' })
                .then(ok => { if (ok && !this.destroyed) { this.state = 'playing'; this.onGiveUp ? this.onGiveUp() : this.finish({ won: false, score: 0, title: 'TE HAS RENDIDO' }); } });
        }

        /**
         * Fin de partida. o: { won, score, endless, title, subtitle, stats, extra, updateExtra, label, html, xp }
         */
        finish(o) {
            if (this.state === 'over') return;
            this.state = 'over'; this.stopTimer(); this.clearRun();
            const s = this.saves();
            const first = this.daily && !(s.daily[this.daily] && s.daily[this.daily].won);
            if (this.daily && (o.won || o.endless) && first) s.daily[this.daily] = { won: true, time: this.elapsed, score: o.score, label: o.label || formatTime(this.elapsed) };
            const result = Nexus.services.progress.recordGame({
                game: this.cfg.id, mode: this.mode.id, won: !!o.won, endless: !!o.endless, score: Math.max(0, Math.round(o.score || 0)), time: this.elapsed,
                xp: o.xp !== undefined ? o.xp : (o.won || o.endless ? Math.round(30 + (o.score || 0) / 60) : 8),
                extra: Object.assign({ daily: !!this.daily, firstDaily: !!first }, o.extra || {}),
                updateExtra: (x) => {
                    if (this.daily && first && (o.won || o.endless)) x.dailies = (x.dailies || 0) + 1;
                    if (o.updateExtra) o.updateExtra(x);
                }
            });
            this.persist();
            Nexus.audio.play(o.won || o.endless ? 'win' : 'lose');
            this.later(() => {
                if (this.destroyed) return;
                Nexus.ui.modal.resultModal({
                    emoji: o.emoji || (o.won ? '🏆' : o.endless ? '🎯' : '💥'), kind: o.won || o.endless ? 'win' : 'lose',
                    title: o.title || (o.won ? '¡RESUELTO!' : 'FIN DE LA PARTIDA'), subtitle: o.subtitle || this.mode.label + (this.daily ? ` · Reto #${dayNumber(this.daily)}` : ''),
                    extraHtml: o.html || '',
                    stats: o.stats || [{ label: 'Tiempo', value: formatTime(this.elapsed) }, { label: 'Puntos', value: formatNumber(Math.round(o.score || 0)) }],
                    result,
                    actions: [
                        ...(this.mode.daily ? [] : [{ label: '🔄 Otra partida', kind: 'primary', onClick: () => this.later(() => this.start(this.mode.id), 50) }]),
                        { label: '☰ Menú', kind: this.mode.daily ? 'primary' : 'ghost', onClick: () => this.later(() => this.showMenu(), 50) }
                    ]
                });
            }, o.delay !== undefined ? o.delay : 700);
        }

        destroy() {
            this.saveRun();
            this.destroyed = true; this.stopTimer();
            this.timers.forEach(clearTimeout); this.timers.clear();
            clearTimeout(this.toastT);
            document.removeEventListener('visibilitychange', this.onVis);
            if (this.onDestroy) this.onDestroy();
        }
    }

    Nexus.games.PuzzleGame = PuzzleGame;
})();
