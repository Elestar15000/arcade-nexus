/* ============================================================
   NEXUS ARCADE · games/escape/game.js
   Escape Room: salas con objetos, inventario, candados (cifras,
   letras, colores y flechas), acertijos, cuaderno de pistas y
   ayudas. 10 salas por nivel (medio, difícil, imposible) y una
   sala diaria (10 diseños que rotan con códigos nuevos cada día).
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatTime, formatNumber, dayKey } = Nexus.util;
    const Kit = Nexus.games.kit;
    const E = () => Nexus.games.escapeEngine;
    const ROOMS = () => Nexus.games.escapeRooms;
    const DAILY = () => Nexus.games.escapeDaily;

    const LV = {
        medio: { label: 'Medio', emoji: '🟢', time: 20 * 60, hintCost: 30, maxHints: 99, wrongCost: 0, base: 1000, desc: '20 minutos · pistas ilimitadas (−30 s cada una).' },
        dificil: { label: 'Difícil', emoji: '🟠', time: 15 * 60, hintCost: 60, maxHints: 3, wrongCost: 0, base: 2000, desc: '15 minutos · 3 pistas (−1 min cada una).' },
        imposible: { label: 'Imposible', emoji: '🔴', time: 12 * 60, hintCost: 90, maxHints: 2, wrongCost: 10, base: 3500, desc: '12 minutos · 2 pistas (−90 s) · cada intento fallido resta 10 s.' },
        diaria: { label: 'Diaria', emoji: '📅', time: 15 * 60, hintCost: 60, maxHints: 2, wrongCost: 5, base: 2500, desc: '15 minutos · 2 pistas (−1 min) · cada intento fallido resta 5 s.' }
    };
    const LEVELS = ['medio', 'dificil', 'imposible'];
    const LOCK_LABEL = { digits: 'Candado numérico', word: 'Cerradura de letras', colors: 'Cerradura de colores', dirs: 'Cerradura de flechas' };
    const COLOR_ORDER = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'morado', 'rosa', 'blanco', 'negro', 'gris'];

    // ── Persistencia ────────────────────────────────────────
    const saves = () => {
        const d = Nexus.services.users.data();
        if (!d.saves.escape) d.saves.escape = { done: {}, daily: {}, run: null };
        const s = d.saves.escape;
        if (!s.done) s.done = {}; if (!s.daily) s.daily = {};
        return s;
    };
    const persist = () => Nexus.services.users.saveData();

    function roomById(id) {
        if (id.startsWith('daily-')) return DAILY().build(id.slice(6));
        for (const lv of LEVELS) { const r = ROOMS()[lv].find(x => x.id === id); if (r) return Object.assign({ level: lv }, r); }
        return null;
    }
    const levelOf = (id) => (id.startsWith('daily-') ? 'diaria' : LEVELS.find(lv => ROOMS()[lv].some(r => r.id === id)));
    const isUnlocked = (lv, i) => i === 0 || !!saves().done[ROOMS()[lv][i - 1].id];

    /** Texto con marcas: {{espejo:TEXTO}} se ve reflejado. */
    const fmt = (t) => esc(t || '').replace(/\{\{espejo:([^}]+)\}\}/g, (_, w) => `<span class="er-mirror" aria-label="Texto reflejado">${w}</span>`);

    function starsFor(lv, left, hints) {
        const T = LV[lv].time;
        if (hints === 0 && left >= T * 0.5) return 3;
        if (hints <= 1 && left >= T * 0.25) return 2;
        return 1;
    }
    const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

    // ── Juego ───────────────────────────────────────────────
    class EscapeGame {
        constructor(root) {
            this.root = root; this.destroyed = false; this.timers = new Set();
            this.tab = 'medio'; this.run = null; this.room = null; this.open = null; this.sel = null; this.itemOpen = null; this.seq = [];
            this.build(); this.bind();
            const s = saves();
            if (s.run && s.run.st && !s.run.st.won && roomById(s.run.roomId) && (!s.run.date || s.run.date === dayKey())) this.tab = s.run.level;
            this.showMenu();
        }
        later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms); this.timers.add(id); return id; }

        build() {
            this.root.innerHTML = `
            <div class="game ax-game er" style="--ax-accent:#f59e0b">
                ${Kit.header({ emoji: '🗝️', title: 'Escape Room', pills: [
                    { id: 'time', icon: '⏳', init: '–', title: 'Tiempo restante' },
                    { id: 'hints', icon: '💡', init: '–', title: 'Pistas usadas' },
                    { id: 'room', icon: '🚪', init: '–', title: 'Sala' }] })}
                <div class="er-body">
                    <div class="er-main">
                        <div class="er-scene" id="er-scene">
                            <div class="er-objs" id="er-objs"></div>
                        </div>
                        <div class="er-detail" id="er-detail" hidden></div>
                        <div class="er-msg" id="er-msg" role="status" aria-live="polite"></div>
                    </div>
                    <aside class="er-side">
                        <div class="ax-card er-timer-card"><div class="er-timer" id="er-timer">--:--</div><div class="er-room-name" id="er-room-name"></div></div>
                        <div class="ax-card"><h3>🎒 Inventario</h3><div class="er-inv" id="er-inv"></div><div class="er-item" id="er-item" hidden></div></div>
                        <div class="ax-card er-notes-card"><h3>📒 Cuaderno</h3><ol class="er-notes" id="er-notes"></ol></div>
                        <div class="ax-card er-side-btns">
                            <button class="btn btn-primary" id="er-hint" type="button">💡 Pista</button>
                            <button class="btn btn-ghost" id="er-pause" type="button">⏸ Pausa</button>
                            <button class="btn btn-ghost" id="er-menu" type="button">☰ Salas</button>
                        </div>
                    </aside>
                    <div class="ax-overlay er-overlay" id="er-overlay"></div>
                </div>
            </div>`;
            this.$ = (q) => this.root.querySelector(q);
            this.overlay = this.$('#er-overlay');
        }

        bind() {
            this.$('#er-objs').addEventListener('click', (e) => { const b = e.target.closest('[data-obj]'); if (b) this.openObj(b.dataset.obj); });
            this.$('#er-detail').addEventListener('click', (e) => this.onDetail(e));
            this.$('#er-detail').addEventListener('submit', (e) => { e.preventDefault(); const i = this.$('#er-detail input'); if (i) this.tryLock(i.value); });
            this.$('#er-inv').addEventListener('click', (e) => { const b = e.target.closest('[data-item]'); if (b) this.clickItem(b.dataset.item); });
            this.$('#er-item').addEventListener('click', (e) => {
                const b = e.target.closest('[data-combine],[data-deselect]'); if (!b) return;
                if (b.dataset.deselect !== undefined) { this.sel = null; this.itemOpen = null; this.renderSide(); this.renderDetail(); return; }
                this.combine(this.itemOpen, b.dataset.combine);
            });
            this.$('#er-hint').addEventListener('click', () => this.hint());
            this.$('#er-pause').addEventListener('click', () => this.pause());
            this.$('#er-menu').addEventListener('click', () => this.pause(true));
            this.overlay.addEventListener('click', (e) => this.onOverlay(e));
            this.onKey = (e) => {
                if (!this.run || this.overlay.hidden === false) return;
                if (e.key === 'Escape') { if (this.open) { this.open = null; this.renderDetail(); } else if (this.sel) { this.sel = null; this.itemOpen = null; this.renderSide(); } }
            };
            document.addEventListener('keydown', this.onKey);
        }

        // ── Menú de salas ───────────────────────────────────
        showMenu() {
            this.stopTimer();
            const s = saves();
            const tab = this.tab;
            const tabs = [...LEVELS, 'diaria'].map(lv => `<button type="button" class="${lv === tab ? 'active' : ''}" data-tab="${lv}">${LV[lv].emoji} ${LV[lv].label}</button>`).join('');
            let list = '';
            if (tab === 'diaria') {
                const today = dayKey(), room = DAILY().build(today), rec = s.daily[today];
                const streak = this.dailyStreak();
                list = `<div class="er-daily">
                    <div class="er-card er-daily-card ${rec && rec.won ? 'done' : ''}" data-room="${esc(room.id)}" role="button" tabindex="0">
                        <span class="er-card-emo">${esc(room.emoji)}</span>
                        <span class="er-card-txt"><small>Sala diaria #${room.number}</small><b>${esc(room.name)}</b>
                        <em>${rec && rec.won ? `${starStr(rec.stars)} · ${formatTime(rec.time)}` : 'Sin resolver'}</em></span>
                    </div>
                    <p class="ax-sub">Cada día una sala nueva: hay 10 diseños que van rotando y sus códigos, palabras y colores cambian cada día. Es la misma para todos los jugadores.</p>
                    <p class="er-streak">🔥 Racha diaria: <b>${streak}</b> · Salas diarias resueltas: <b>${Object.values(s.daily).filter(d => d.won).length}</b></p>
                </div>`;
            } else {
                list = `<div class="er-grid">${ROOMS()[tab].map((r, i) => {
                    const done = s.done[r.id], open = isUnlocked(tab, i);
                    return `<div class="er-card ${done ? 'done' : ''} ${open ? '' : 'locked'}" ${open ? `data-room="${esc(r.id)}" role="button" tabindex="0"` : 'aria-disabled="true"'}>
                        <span class="er-card-emo">${open ? esc(r.emoji) : '🔒'}</span>
                        <span class="er-card-txt"><small>Sala ${i + 1}</small><b>${esc(open ? r.name : 'Bloqueada')}</b>
                        <em>${done ? `${starStr(done.stars)} · ${formatTime(done.time)}` : open ? 'Sin resolver' : 'Resuelve la anterior'}</em></span>
                    </div>`;
                }).join('')}</div>`;
            }
            const run = s.run && s.run.st && !s.run.st.won && roomById(s.run.roomId) && (!s.run.date || s.run.date === dayKey()) ? s.run : null;
            const solved = LEVELS.reduce((n, lv) => n + ROOMS()[lv].filter(r => s.done[r.id]).length, 0);
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel er-menu">
                <div class="er-logo">🗝️ ESCAPE ROOM</div>
                <p class="ax-sub">Explora cada sala, recoge objetos, combina, descifra y abre candados antes de que se acabe el tiempo. Salas resueltas: <b>${solved}/30</b>.</p>
                ${run ? `<div class="er-resume"><span>⏯ Tienes a medias <b>${esc(roomById(run.roomId).name)}</b> (${formatTime(run.left)})</span><button class="btn btn-primary btn-glow" data-do="resume" type="button">Continuar</button></div>` : ''}
                <div class="segmented er-tabs" role="tablist">${tabs}</div>
                <p class="er-lvdesc">${esc(LV[tab].desc)}</p>
                ${list}
                <details class="ax-help"><summary>📖 Cómo se juega</summary><ul>
                    <li>Toca los objetos de la sala para examinarlos. Lo importante se apunta solo en el <b>cuaderno</b>.</li>
                    <li>Lo que coges va al <b>inventario</b>. Toca un objeto del inventario para seleccionarlo y después toca algo de la sala para usarlo allí. Desde el inventario también puedes <b>combinar</b> dos cosas.</li>
                    <li>Los candados pueden ser de <b>cifras</b>, <b>letras</b>, <b>colores</b> o <b>flechas</b>.</li>
                    <li>Las <b>pistas</b> te orientan según por dónde vayas, pero restan tiempo.</li>
                    <li>Escapa con más tiempo y menos pistas para conseguir <b>★★★</b>.</li>
                </ul></details>
            </div>`;
        }

        dailyStreak() {
            const d = saves().daily; let n = 0, day = dayKey();
            const prev = (k) => { const t = new Date(k + 'T12:00:00'); t.setDate(t.getDate() - 1); return dayKey(t); };
            if (!(d[day] && d[day].won)) day = prev(day);
            while (d[day] && d[day].won) { n++; day = prev(day); }
            return n;
        }

        showIntro(id) {
            const room = roomById(id), lv = levelOf(id);
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel er-intro">
                <div class="er-intro-emo">${esc(room.emoji)}</div>
                <h2 class="ax-big">${esc(room.name)}</h2>
                <p class="er-chip">${LV[lv].emoji} ${LV[lv].label}${lv === 'diaria' ? ` · #${room.number}` : ''}</p>
                <p class="er-intro-txt">${esc(room.intro)}</p>
                <p class="ax-sub">${esc(LV[lv].desc)}</p>
                <div class="ax-play-row"><button class="btn btn-ghost" data-do="menu" type="button">← Salas</button>
                <button class="btn btn-primary btn-glow" data-do="start" data-room="${esc(id)}" type="button">▶ Entrar en la sala</button></div>
            </div>`;
        }

        onOverlay(e) {
            const t = e.target.closest('[data-tab]');
            if (t) { Nexus.audio.play('click'); this.tab = t.dataset.tab; this.showMenu(); return; }
            const b = e.target.closest('[data-do]');
            if (b) {
                Nexus.audio.play('click');
                const d = b.dataset.do;
                if (d === 'menu') this.showMenu();
                else if (d === 'start') this.start(b.dataset.room);
                else if (d === 'resume') this.resume();
                else if (d === 'unpause') { this.overlay.hidden = true; this.startTimer(); }
                else if (d === 'abandon') this.abandon();
                return;
            }
            const c = e.target.closest('[data-room]');
            if (c) { Nexus.audio.play('click'); this.showIntro(c.dataset.room); }
        }

        // ── Partida ─────────────────────────────────────────
        start(id) {
            const room = roomById(id), lv = levelOf(id);
            const run = { roomId: id, level: lv, date: lv === 'diaria' ? id.slice(6) : null, st: E().newState(room), left: LV[lv].time, hints: 0, shown: [], wrong: 0, t0: Date.now() };
            saves().run = run; persist();
            this.enter(run, room);
            this.msg(room.intro);
            Nexus.audio.play('tdRound');
        }
        resume() {
            const run = saves().run; if (!run) { this.showMenu(); return; }
            this.enter(run, roomById(run.roomId));
            this.msg('Continúas donde lo dejaste.');
        }
        enter(run, room) {
            this.run = run; this.room = room; this.open = null; this.sel = null; this.itemOpen = null; this.seq = [];
            const bg = room.bg || ['#2a2a3a', '#101018'];
            this.$('#er-scene').style.setProperty('--er-a', bg[0]); this.$('#er-scene').style.setProperty('--er-b', bg[1]);
            this.overlay.hidden = true;
            this.render();
            this.startTimer();
        }
        save() { if (this.run) { saves().run = this.run; persist(); } }

        startTimer() {
            this.stopTimer();
            if (!this.run || this.run.st.won) return;
            this.tick = setInterval(() => {
                if (this.destroyed || !this.run) return;
                if (document.hidden) return;
                this.run.left = Math.max(0, this.run.left - 1);
                this.updateTimer();
                if (this.run.left % 10 === 0) this.save();
                if (this.run.left <= 0) this.timeUp();
            }, 1000);
        }
        stopTimer() { clearInterval(this.tick); this.tick = 0; }
        penalty(s) {
            if (!s || !this.run) return;
            this.run.left = Math.max(0, this.run.left - s);
            this.updateTimer();
            const el = this.$('#er-timer'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
            if (this.run.left <= 0) this.timeUp();
        }
        pause(toMenu) {
            if (!this.run) { this.showMenu(); return; }
            this.stopTimer(); this.save();
            if (toMenu) { this.run = null; this.showMenu(); return; }
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel"><h2 class="ax-big">⏸ PAUSA</h2><p class="ax-sub">${esc(this.room.name)} · quedan ${formatTime(this.run.left)}</p>
                <div class="ax-play-row"><button class="btn btn-primary btn-glow" data-do="unpause" type="button">▶ Seguir</button>
                <button class="btn btn-ghost" data-do="abandon" type="button">🏳️ Rendirse</button></div></div>`;
        }
        abandon() {
            if (!this.run) return;
            Nexus.ui.modal.confirm({ title: 'Rendirse', icon: '🏳️', danger: true, confirmLabel: 'Rendirse', message: 'La sala contará como no superada.' }).then(ok => {
                if (!ok || this.destroyed || !this.run) return;
                this.finish(false, 'giveup');
            });
        }
        timeUp() { if (this.run && !this.run.st.won) this.finish(false, 'time'); }

        msg(t, kind) {
            const el = this.$('#er-msg');
            el.innerHTML = fmt(t); el.dataset.kind = kind || '';
            el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
        }

        // ── Interacción ─────────────────────────────────────
        openObj(id) {
            if (!this.run) return;
            const st = this.run.st, notesBefore = st.notes.length;
            if (this.sel) {
                const o = this.room.objs.find(x => x.id === id);
                // Con un objeto seleccionado, tocar algo de la sala intenta usarlo ahí
                if (o && (o.use || []).some(u => u.item === this.sel)) { this.open = id; this.use(this.sel); return; }
            }
            E().look(this.room, st, id);
            this.open = id; this.seq = [];
            Nexus.audio.play('click');
            if (st.notes.length > notesBefore) this.noteFlash();
            this.save();
            this.render();
        }
        onDetail(e) {
            if (!this.run) return;
            const b = e.target.closest('button'); if (!b) return;
            const d = b.dataset;
            if (d.close !== undefined) { this.open = null; this.renderDetail(); return; }
            if (d.take !== undefined) return this.take();
            if (d.use) return this.use(d.use);
            if (d.col) { const L = this.curLock(); if (this.seq.length < L.len) { this.seq.push(d.col); Nexus.audio.play('click'); } this.renderDetail(); if (this.seq.length === L.len) this.later(() => this.tryLock(this.seq.slice()), 220); return; }
            if (d.dir) { const L = this.curLock(); if (this.seq.length < L.len) { this.seq.push(d.dir); Nexus.audio.play('click'); } this.renderDetail(); if (this.seq.length === L.len) this.later(() => this.tryLock(this.seq.slice()), 220); return; }
            if (d.clear !== undefined) { this.seq = []; this.renderDetail(); }
        }
        curLock() { const o = this.room.objs.find(x => x.id === this.open); return o && o.lock; }

        take() {
            const r = E().take(this.room, this.run.st, this.open);
            if (r.ok) { Nexus.audio.play('orbCollect'); this.msg(r.t, 'good'); this.after(); }
        }
        use(item) {
            const st = this.run.st, notesBefore = st.notes.length;
            const r = E().useItem(this.room, st, this.open, item);
            if (r.ok) {
                Nexus.audio.play('achievement'); this.msg(r.t, 'good');
                if (!st.inv.includes(item)) { this.sel = null; this.itemOpen = null; }
                if (st.notes.length > notesBefore) this.noteFlash();
                this.after();
            } else { Nexus.audio.play('error'); this.msg(r.t || 'No parece servir aquí.', 'bad'); this.render(); }
        }
        tryLock(value) {
            const st = this.run.st, notesBefore = st.notes.length;
            const r = E().tryLock(this.room, st, this.open, value);
            this.seq = [];
            if (r.ok) {
                Nexus.audio.play('achievement'); this.msg(r.t, 'good');
                if (st.notes.length > notesBefore) this.noteFlash();
                this.after();
            } else if (r.wrong) {
                Nexus.audio.play('error'); this.run.wrong++;
                const lv = LV[this.run.level];
                this.msg(r.t + (lv.wrongCost ? ` (−${lv.wrongCost} s)` : ''), 'bad');
                const box = this.$('#er-detail .er-lock'); if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
                this.penalty(lv.wrongCost);
                if (!this.run) return;
                const inp = this.$('#er-detail input'); if (inp) { inp.value = ''; inp.focus(); }
                this.renderSeq();
                this.save();
            }
        }
        clickItem(it) {
            if (!this.run) return;
            Nexus.audio.play('click');
            if (this.sel === it) { this.sel = null; this.itemOpen = null; }
            else { this.sel = it; this.itemOpen = it; }
            this.renderScene(); this.renderSide(); this.renderDetail();
        }
        combine(a, b) {
            const r = E().combine(this.room, this.run.st, a, b);
            if (r.ok) { Nexus.audio.play('achievement'); this.msg(r.t, 'good'); this.sel = null; this.itemOpen = null; this.after(); }
            else { Nexus.audio.play('error'); this.msg(r.t, 'bad'); }
        }
        after() {
            this.save();
            if (this.run.st.won) { this.render(); this.finish(true); return; }
            this.render();
        }
        noteFlash() { const c = this.$('.er-notes-card'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }

        hint() {
            if (!this.run || this.run.st.won) return;
            const lv = LV[this.run.level];
            const i = E().hintIndex(this.room, this.run.st);
            const h = this.room.hints[i];
            if (this.run.shown.includes(i)) { this.msg('💡 ' + h.t, 'hint'); return; }
            if (this.run.hints >= lv.maxHints) { Nexus.audio.play('error'); this.msg(`No te quedan pistas en el nivel ${lv.label.toLowerCase()}.`, 'bad'); return; }
            this.run.hints++; this.run.shown.push(i);
            this.penalty(lv.hintCost);
            if (!this.run) return;
            Nexus.audio.play('powerActivate');
            this.msg(`💡 ${h.t} (−${lv.hintCost} s)`, 'hint');
            this.save(); this.renderSide();
        }

        // ── Pintado ─────────────────────────────────────────
        render() { this.renderScene(); this.renderDetail(); this.renderSide(); this.updateTimer(); }

        renderScene() {
            const st = this.run.st, Eg = E();
            this.$('#er-objs').innerHTML = this.room.objs.filter(o => Eg.visible(o, st)).map(o => {
                const done = (o.lock && Eg.lockOpen(o, st)) || (o.take && st.flags['got:' + o.take.item] && !o.lock && !o.use);
                const usable = this.sel && (o.use || []).some(u => u.item === this.sel);
                const seen = st.flags['seen:' + o.id];
                return `<button type="button" class="er-obj ${done ? 'done' : ''} ${this.open === o.id ? 'on' : ''} ${seen ? 'seen' : 'new'} ${usable ? 'usable' : ''}" data-obj="${esc(o.id)}" style="left:${o.x}%;top:${o.y}%" aria-label="${esc(o.n)}">
                    <span class="er-emo">${esc(o.e)}</span><span class="er-lbl">${esc(o.n)}</span>${done ? '<i class="er-check">✓</i>' : ''}</button>`;
            }).join('');
            this.$('#er-scene').classList.toggle('selecting', !!this.sel);
        }

        renderDetail() {
            const el = this.$('#er-detail');
            const o = this.open && this.room.objs.find(x => x.id === this.open);
            if (!o || !E().visible(o, this.run.st)) { el.hidden = true; el.innerHTML = ''; return; }
            const st = this.run.st, Eg = E();
            const parts = [`<button type="button" class="er-x" data-close aria-label="Cerrar">✕</button>
                <div class="er-d-head"><span class="er-d-emo">${esc(o.e)}</span><b>${esc(o.n)}</b></div>
                <p class="er-d-txt">${fmt(Eg.lookText(o, st))}</p>`];
            if (o.pre) parts.push(`<pre class="er-pre">${esc(o.pre)}</pre>`);
            const btns = [];
            if (Eg.canTake(o, st)) btns.push(`<button type="button" class="btn btn-primary" data-take>✋ Coger</button>`);
            if (this.sel) btns.push(`<button type="button" class="btn btn-ghost" data-use="${esc(this.sel)}">${esc(this.room.items[this.sel].e)} Usar ${esc(this.room.items[this.sel].n)}</button>`);
            if (btns.length) parts.push(`<div class="er-d-btns">${btns.join('')}</div>`);
            if (o.lock) {
                const L = o.lock;
                if (Eg.lockOpen(o, st)) parts.push(`<div class="er-lock open">🔓 ${LOCK_LABEL[L.k]}: abierto</div>`);
                else if (!Eg.test(L.if, st)) parts.push(`<div class="er-lock off">🔒 ${LOCK_LABEL[L.k]}. Aún no tienes lo necesario para resolverlo.</div>`);
                else parts.push(`<div class="er-lock" data-kind="${L.k}"><div class="er-lock-q">🔒 ${esc(L.q)}</div>${this.lockInput(L)}</div>`);
            }
            const wasHidden = el.hidden;
            el.innerHTML = parts.join('');
            el.hidden = false;
            if (wasHidden && matchMedia('(max-width: 900px)').matches && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            const inp = el.querySelector('input');
            if (inp && !matchMedia('(pointer: coarse)').matches) inp.focus();
        }
        lockInput(L) {
            if (L.k === 'digits') return `<form class="er-form"><input class="er-input digits" inputmode="numeric" pattern="[0-9]*" maxlength="${L.len}" placeholder="${'•'.repeat(L.len)}" autocomplete="off" aria-label="Código"><button class="btn btn-primary" type="submit">Probar</button></form>`;
            if (L.k === 'word') return `<form class="er-form"><input class="er-input word" maxlength="24" placeholder="Respuesta" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Respuesta"><button class="btn btn-primary" type="submit">Probar</button></form>`;
            const slots = `<div class="er-slots" id="er-slots">${this.slotsHtml(L)}</div>`;
            if (L.k === 'colors') {
                const pal = COLOR_ORDER.filter(c => c !== 'rosa' && c !== 'gris');
                return slots + `<div class="er-pal">${pal.map(c => `<button type="button" class="er-col" data-col="${c}" style="--c:${E().COLORS[c]}" title="${c}" aria-label="${c}"></button>`).join('')}</div>
                    <button type="button" class="btn btn-ghost btn-sm" data-clear>⌫ Borrar</button>`;
            }
            return slots + `<div class="er-pad"><span></span><button type="button" data-dir="U" aria-label="Arriba">↑</button><span></span>
                <button type="button" data-dir="L" aria-label="Izquierda">←</button><button type="button" data-dir="D" aria-label="Abajo">↓</button><button type="button" data-dir="R" aria-label="Derecha">→</button></div>
                <button type="button" class="btn btn-ghost btn-sm" data-clear>⌫ Borrar</button>`;
        }
        slotsHtml(L) {
            return Array.from({ length: L.len }, (_, i) => {
                const v = this.seq[i];
                if (!v) return '<i class="er-slot"></i>';
                return L.k === 'colors' ? `<i class="er-slot full" style="--c:${E().COLORS[v]}" title="${v}"></i>` : `<i class="er-slot full">${E().DIRS[v]}</i>`;
            }).join('');
        }
        renderSeq() { const L = this.curLock(), s = this.$('#er-slots'); if (L && s) s.innerHTML = this.slotsHtml(L); }

        renderSide() {
            const st = this.run.st, items = this.room.items;
            this.$('#er-inv').innerHTML = st.inv.length ? st.inv.map(it => `<button type="button" class="er-inv-it ${this.sel === it ? 'sel' : ''}" data-item="${esc(it)}" title="${esc(items[it].n)}"><span>${esc(items[it].e)}</span><small>${esc(items[it].n)}</small></button>`).join('')
                : '<p class="er-empty">Vacío. Busca objetos por la sala.</p>';
            const box = this.$('#er-item');
            if (this.itemOpen && st.inv.includes(this.itemOpen)) {
                const it = items[this.itemOpen];
                const others = st.inv.filter(x => x !== this.itemOpen);
                box.hidden = false;
                box.innerHTML = `<p><b>${esc(it.e)} ${esc(it.n)}</b> — ${fmt(it.d)}</p>${it.pre ? `<pre class="er-pre">${esc(it.pre)}</pre>` : ''}
                    <p class="er-sel-tip">✋ Seleccionado: toca algo de la sala para usarlo allí.</p>
                    ${others.length ? `<div class="er-comb"><span>🔗 Combinar con:</span>${others.map(x => `<button type="button" class="btn btn-ghost btn-sm" data-combine="${esc(x)}">${esc(items[x].e)} ${esc(items[x].n)}</button>`).join('')}</div>` : ''}
                    <button type="button" class="btn btn-ghost btn-sm" data-deselect>Soltar</button>`;
            } else { box.hidden = true; box.innerHTML = ''; }
            this.$('#er-notes').innerHTML = st.notes.length ? st.notes.map(n => `<li>${fmt(n)}</li>`).join('') : '<li class="er-empty">Aún no has apuntado nada.</li>';
            const lv = LV[this.run.level];
            const left = lv.maxHints >= 99 ? '∞' : Math.max(0, lv.maxHints - this.run.hints);
            this.$('#er-hint').textContent = `💡 Pista (${left})`;
            this.$('#er-room-name').textContent = `${LV[this.run.level].emoji} ${this.room.name}`;
            const set = (sel, t) => { const e = this.root.querySelector(sel); if (e) e.textContent = t; };
            set('[data-pill="hints"]', String(this.run.hints));
            set('[data-pill="room"]', this.run.level === 'diaria' ? `Diaria #${this.room.number}` : `${LV[this.run.level].label} ${ROOMS()[this.run.level].findIndex(r => r.id === this.room.id) + 1}`);
        }
        updateTimer() {
            if (!this.run) return;
            const t = formatTime(this.run.left);
            this.$('#er-timer').textContent = t;
            this.$('#er-timer').classList.toggle('low', this.run.left <= 60);
            const p = this.root.querySelector('[data-pill="time"]'); if (p) p.textContent = t;
        }

        // ── Fin ─────────────────────────────────────────────
        finish(won, reason) {
            this.stopTimer();
            const run = this.run, lv = run.level, L = LV[lv], room = this.room;
            const used = L.time - run.left;
            const stars = won ? starsFor(lv, run.left, run.hints) : 0;
            const score = won ? Math.max(100, L.base + run.left * 3 - run.hints * 200 - run.wrong * 20 + (stars === 3 ? 500 : 0)) : 0;
            const s = saves();
            s.run = null;
            if (won) {
                if (lv === 'diaria') {
                    const prev = s.daily[run.date];
                    if (!prev || !prev.won || used < prev.time) s.daily[run.date] = { won: true, time: used, stars: Math.max(stars, prev && prev.stars || 0) };
                } else {
                    const prev = s.done[room.id];
                    s.done[room.id] = { time: prev ? Math.min(prev.time, used) : used, stars: Math.max(stars, prev ? prev.stars : 0), score: Math.max(score, prev ? prev.score : 0) };
                }
            }
            const result = Nexus.services.progress.recordGame({
                game: 'escape', mode: lv, won, score, time: used, xp: won ? Math.round(L.base / 25 + stars * 15) : 8,
                extra: { room: room.id, level: lv, stars, hints: run.hints, wrong: run.wrong, daily: lv === 'diaria', reason: reason || 'win', used },
                updateExtra: (x) => {
                    if (!won) return;
                    x.rooms = Array.from(new Set((x.rooms || []).concat(lv === 'diaria' ? [] : [room.id])));
                    if (stars === 3 && lv !== 'diaria') x.three = Array.from(new Set((x.three || []).concat([room.id])));
                    if (lv === 'diaria') x.dailies = Array.from(new Set((x.dailies || []).concat([run.date])));
                }
            });
            persist();
            Nexus.audio.play(won ? 'win' : 'lose');
            const next = won && lv !== 'diaria' ? ROOMS()[lv][ROOMS()[lv].findIndex(r => r.id === room.id) + 1] : null;
            this.run = null;
            this.later(() => {
                if (this.destroyed) return;
                Nexus.ui.modal.resultModal({
                    emoji: won ? '🗝️' : reason === 'time' ? '⌛' : '🏳️', kind: won ? 'win' : 'lose',
                    title: won ? '¡HAS ESCAPADO!' : reason === 'time' ? 'SE ACABÓ EL TIEMPO' : 'TE HAS RENDIDO',
                    subtitle: won ? room.name : `${room.name}: la puerta sigue cerrada.`,
                    extraHtml: won ? `<div class="er-stars">${starStr(stars)}</div>` : '',
                    stats: won ? [{ label: 'Tiempo', value: formatTime(used) }, { label: 'Pistas', value: String(run.hints) }, { label: 'Puntos', value: formatNumber(score) }] : [{ label: 'Pistas', value: String(run.hints) }],
                    result,
                    actions: [
                        ...(next ? [{ label: '▶ Siguiente sala', kind: 'primary', onClick: () => this.later(() => this.showIntro(next.id), 50) }] : []),
                        ...(!won ? [{ label: '🔄 Reintentar', kind: 'primary', onClick: () => this.later(() => this.start(room.id), 50) }] : []),
                        { label: '🚪 Salas', kind: next || !won ? 'ghost' : 'primary', onClick: () => this.later(() => this.showMenu(), 50) }
                    ]
                });
                this.showMenu();
            }, won ? 900 : 400);
        }

        destroy() {
            this.destroyed = true;
            this.stopTimer();
            if (this.run) this.save();
            this.timers.forEach(clearTimeout); this.timers.clear();
            document.removeEventListener('keydown', this.onKey);
        }
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'escape' ? c.event : null);
    const roomsOf = (prefix) => (c) => (c.stats('escape').extra.rooms || []).filter(r => r.startsWith(prefix)).length;
    A.register([
        { id: 'er_first', game: 'escape', name: '¡Fuera!', desc: 'Escapa de tu primera sala.', icon: '🗝️', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won; } },
        { id: 'er_medio', game: 'escape', name: 'Escapista', desc: 'Resuelve las 10 salas de nivel medio.', icon: '🟢', rarity: 'rare', ...A.counter(roomsOf('m'), 10) },
        { id: 'er_dificil', game: 'escape', name: 'Houdini', desc: 'Resuelve las 10 salas de nivel difícil.', icon: '🟠', rarity: 'epic', ...A.counter(roomsOf('d'), 10) },
        { id: 'er_imposible', game: 'escape', name: 'Nada es imposible', desc: 'Resuelve las 10 salas de nivel imposible.', icon: '🔴', rarity: 'legendary', ...A.counter(roomsOf('i'), 10) },
        { id: 'er_nohint', game: 'escape', name: 'Mente maestra', desc: 'Escapa de una sala imposible sin pistas.', icon: '🧠', rarity: 'epic', test: (c) => { const e = ev(c); return !!e && e.won && e.mode === 'imposible' && e.extra.hints === 0; } },
        { id: 'er_fast', game: 'escape', name: 'Contrarreloj', desc: 'Escapa de una sala en menos de 2 minutos.', icon: '⚡', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.extra.used < 120; } },
        { id: 'er_three', game: 'escape', name: 'Coleccionista de estrellas', desc: 'Consigue ★★★ en 10 salas.', icon: '⭐', rarity: 'epic', ...A.counter((c) => (c.stats('escape').extra.three || []).length, 10) },
        { id: 'er_daily', game: 'escape', name: 'Sala del día', desc: 'Resuelve una sala diaria.', icon: '📅', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won && e.extra.daily; } },
        { id: 'er_daily7', game: 'escape', name: 'Fiel al reto', desc: 'Resuelve 7 salas diarias.', icon: '🔥', rarity: 'rare', ...A.counter((c) => (c.stats('escape').extra.dailies || []).length, 7) },
        { id: 'er_last', game: 'escape', name: 'Socio de honor', desc: 'Escapa de «La última sala».', icon: '🏅', rarity: 'legendary', test: (c) => { const e = ev(c); return !!e && e.won && e.extra.room === 'i10'; } }
    ]);

    function statsExtra(gs) {
        const ex = gs.extra || {};
        const n = (p) => (ex.rooms || []).filter(r => r.startsWith(p)).length;
        return `<h3 class="subhead">Salas</h3>
            <p class="muted small">Medio: <b>${n('m')}/10</b> · Difícil: <b>${n('d')}/10</b> · Imposible: <b>${n('i')}/10</b> · Con ★★★: <b>${(ex.three || []).length}</b> · Diarias resueltas: <b>${(ex.dailies || []).length}</b></p>`;
    }

    Nexus.games.registry.register({
        id: 'escape', name: 'Escape Room', emoji: '🗝️', accent: '#f59e0b',
        tagline: '30 salas · 3 niveles · sala diaria',
        description: 'Escapa antes de que se acabe el tiempo: examina objetos, combina lo que encuentres, resuelve acertijos y abre candados de cifras, letras, colores y flechas. 10 salas de nivel medio, 10 difíciles, 10 imposibles y una sala nueva cada día.',
        tags: ['Puzzle', 'Lógica'],
        modes: [...LEVELS, 'diaria'].map(m => ({ id: m, label: LV[m].label })),
        metrics: [{ id: 'wins', label: 'Salas superadas' }, { id: 'score', label: 'Puntuación' }, { id: 'time', label: 'Mejor tiempo' }],
        statsExtra,
        mount: (root) => new EscapeGame(root)
    });

    Nexus.games.escapeLogic = { LV, starsFor, roomById, levelOf };
})();
