/* ============================================================
   NEXUS ARCADE · games/cardgames/table.js
   Mesa común de los juegos de cartas (Brisca, Guiñote, Chinchón):
     · Cartas de baraja española dibujadas en SVG propio.
     · TableSession: el anfitrión (o tu navegador, contra la
       máquina) lleva el estado completo y manda a cada jugador sólo
       su vista (nunca las cartas de los demás). Los asientos vacíos
       o de quien se va los juegan bots.
     · TableLobby: vestíbulo online multiasiento (2 a 4 jugadores)
       sobre src/core/net.js: crear sala, código, enlace, buscador.
     · CardTableGame: interfaz (asientos alrededor de la mesa, tu
       mano, centro propio de cada juego, marcador y registro).
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber } = Nexus.util;
    const Kit = Nexus.games.kit;
    const K = Nexus.games.cardCore;
    const { suitOf, rankOf } = K;

    // ── Cartas ──────────────────────────────────────────────
    const SUIT_SVG = {
        o: '<circle cx="12" cy="12" r="10" fill="#fbbf24" stroke="#92400e" stroke-width="1.4"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#b45309" stroke-width="1.3"/><circle cx="12" cy="12" r="2.4" fill="#b45309"/>',
        c: '<path d="M4.5 3.5h15c0 5.4-2.8 8.6-6.3 9.5v4.2h3.3v2.6H7.5v-2.6h3.3V13C7.3 12.1 4.5 8.9 4.5 3.5z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 5.5h10" stroke="#fde68a" stroke-width="1.2"/>',
        e: '<path d="M12 1.5l2.3 3.2v11h-4.6v-11z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="1.1" stroke-linejoin="round"/><rect x="6" y="15.5" width="12" height="2.4" rx="1.1" fill="#f59e0b" stroke="#78350f" stroke-width=".9"/><rect x="10.9" y="17.9" width="2.2" height="4.6" rx=".8" fill="#92400e"/>',
        b: '<path d="M9.6 22.5l1.6-14.2C9 7.4 8.6 4.1 11.4 2.2c3.1-.6 4.6 2.6 2.6 5.6l.9 14.7z" fill="#22c55e" stroke="#14532d" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12.4" cy="11" r="1" fill="#14532d"/><circle cx="12.6" cy="15.5" r="1" fill="#14532d"/>'
    };
    const suitSvg = (s, cls = '') => `<svg class="pc-suit ${cls}" viewBox="0 0 24 24" aria-hidden="true">${SUIT_SVG[s]}</svg>`;
    const FIG = { 10: 'S', 11: 'C', 12: 'R' };

    function cardHtml(c, o = {}) {
        if (!c || o.back) return `<span class="pc back ${o.cls || ''}" ${o.attrs || ''}><i></i></span>`;
        const s = suitOf(c), r = rankOf(c), fig = r >= 10;
        const pips = fig ? `<span class="pc-fig">${FIG[r]}</span>${suitSvg(s, 'mid')}` : (r === 1 ? suitSvg(s, 'ace') : suitSvg(s, 'mid'));
        return `<span class="pc s-${s}${fig ? ' fig' : ''} ${o.cls || ''}" data-card="${esc(c)}" title="${esc(K.cardName(c))}" ${o.attrs || ''}>
            <b class="pc-n tl">${r}</b>${pips}<b class="pc-n br">${r}</b></span>`;
    }

    // ── Sesión autoritativa ─────────────────────────────────
    class TableSession {
        /** seats: [{ kind: 'me'|'remote'|'bot', name, avatar, guestId }] */
        constructor(rules, seats, { onView, send, botDelay = [650, 1150] }) {
            this.rules = rules; this.seats = seats; this.onView = onView; this.send = send; this.botDelay = botDelay;
            this.state = rules.setup(seats.length, seats.map(s => s.name));
            this.seq = 0; this.timer = 0; this.destroyed = false;
        }
        start() { this.broadcast(); this.schedule(); }
        act(seat, a) {
            if (this.destroyed || this.state.over || this.state.pause) return false;
            if (!this.rules.validate(this.state, seat, a)) return false;
            this.rules.apply(this.state, seat, a);
            this.seq++;
            this.broadcast(); this.schedule();
            return true;
        }
        schedule() {
            clearTimeout(this.timer);
            if (this.destroyed || this.state.over) return;
            if (this.state.pause) {
                this.timer = setTimeout(() => { this.rules.step(this.state); this.seq++; this.broadcast(); this.schedule(); }, this.state.pause * TableSession.speed);
                return;
            }
            const t = this.rules.turn(this.state);
            if (t === null || t === undefined || this.seats[t].kind !== 'bot') return;
            const [a, b] = this.botDelay;
            this.timer = setTimeout(() => {
                if (this.destroyed) return;
                const act = this.rules.bot(this.state, t);
                if (!this.act(t, act)) console.warn('[cartas] jugada de bot no válida', act);
            }, (a + Math.random() * (b - a)) * TableSession.speed);
        }
        broadcast() {
            this.seats.forEach((s, i) => {
                if (s.kind === 'me') this.onView(this.rules.view(this.state, i));
                else if (s.kind === 'remote' && this.send) this.send(s.guestId, { t: 'tb', k: 'view', v: this.rules.view(this.state, i), s: this.seq });
            });
        }
        toBot(seat) { const s = this.seats[seat]; if (!s) return; s.kind = 'bot'; s.name += ' 🤖'; this.state.names[seat] = s.name; this.schedule(); }
        destroy() { this.destroyed = true; clearTimeout(this.timer); }
    }

    /** Factor de tiempo de pausas y bots (las pruebas lo bajan). */
    TableSession.speed = 1;

    // ── Vestíbulo online multiasiento ───────────────────────
    const ERRORS = { notfound: 'No hay ninguna sala abierta con ese código.', full: 'Esa mesa está llena o la partida ya ha empezado.', version: 'El anfitrión usa otra versión del juego. Recargad la página.' };

    class TableLobby {
        constructor(o) {
            this.o = o; this.el = o.el; this.game = o.game;
            this.net = null; this.lobby = null; this.view = 'off'; this.playing = false; this.destroyed = false;
            this.n = o.seats.default;
            this.onClick = (e) => this.click(e);
            this.onSubmit = (e) => { if (e.target.closest('.ol-join-form')) { e.preventDefault(); const i = this.el.querySelector('.ol-code-input'); this.join(i ? i.value : ''); } };
            this.onInput = (e) => { if (e.target.classList.contains('ol-code-input')) { const v = Nexus.net.normalizeCode(e.target.value); if (v !== e.target.value) e.target.value = v; } };
            this.el.addEventListener('click', this.onClick);
            this.el.addEventListener('submit', this.onSubmit);
            this.el.addEventListener('input', this.onInput);
        }
        get role() { return this.net ? this.net.role : null; }
        get rtt() { return this.net ? this.net.conn.rtt : null; }
        get mode() { return this.net ? this.net.conn.mode : null; }
        get active() { return this.view !== 'off'; }
        hide() { this.view = 'off'; this.el.hidden = true; }

        ensureLobby() {
            if (this.lobby) return this.lobby;
            const hub = new Nexus.net.Hub();
            const browser = new Nexus.net.RoomBrowser({ game: this.game, hub });
            const lb = this.lobby = { hub, browser, rooms: [], status: 'connecting' };
            browser.on('rooms', (l) => { lb.rooms = l; if (this.view === 'home') this.renderRooms(); });
            browser.on('status', (n) => { lb.status = n > 0 ? 'online' : 'offline'; if (this.view === 'home') this.renderStatus(); });
            browser.start().then(() => { lb.status = 'online'; if (this.view === 'home') this.renderStatus(); })
                .catch(() => { lb.status = 'error'; if (this.view === 'home') this.renderStatus(); });
            return lb;
        }
        closeLobby() { if (!this.lobby) return; try { this.lobby.browser.stop(); } catch (_) { /* noop */ } this.lobby.hub.close(); this.lobby = null; }

        show(errorMsg) {
            this.view = 'home'; this.ensureLobby();
            const pub = Nexus.services.settings.get('online.publicRooms') !== false;
            this.el.hidden = false;
            this.el.innerHTML = `<div class="ol-panel">
                <h2 class="ol-title">${esc(this.o.title)}</h2>
                <div class="ol-status" data-ol="status"></div>
                ${errorMsg ? `<div class="ol-error" role="alert">${esc(errorMsg)}</div>` : ''}
                <div class="ol-grid">
                    <div class="ol-box">
                        <h3>🏠 Crear mesa</h3>
                        <p class="ol-hint">Tu navegador hace de servidor y reparte las cartas. ${esc(this.o.seatsText)}</p>
                        <label class="ol-check"><input type="checkbox" data-ol="public" ${pub ? 'checked' : ''}> Pública (aparece en el buscador)</label>
                        <button class="btn btn-primary btn-glow" data-ol-do="create" type="button">＋ Crear mesa</button>
                    </div>
                    <form class="ol-box ol-join-form" autocomplete="off">
                        <h3>🔑 Unirse con código</h3>
                        <p class="ol-hint">5 caracteres, sin I, O, 0 ni 1.</p>
                        <input class="ol-code-input" maxlength="5" placeholder="ABCDE" aria-label="Código de sala" autocapitalize="characters" spellcheck="false">
                        <button class="btn btn-ghost" type="submit">Entrar →</button>
                    </form>
                </div>
                <div class="ol-box"><h3>🔎 Mesas abiertas</h3><div class="ol-rooms" data-ol="rooms"></div></div>
                <div class="ol-row"><button class="btn btn-ghost" data-ol-do="exit" type="button">← Volver</button></div>
            </div>`;
            this.el.querySelector('[data-ol="public"]').addEventListener('change', (e) => Nexus.services.settings.set('online.publicRooms', e.target.checked));
            this.renderStatus(); this.renderRooms();
        }
        renderStatus() {
            const el = this.el.querySelector('[data-ol="status"]'); if (!el || !this.lobby) return;
            const st = this.lobby.status, hub = this.lobby.hub;
            el.dataset.state = st;
            el.innerHTML = st === 'online' ? `<i></i> Conectado a la red de partidas · ${hub.online}/${hub.total} servidores`
                : st === 'error' ? '<i></i> No se pudo conectar con la red de partidas. <button class="ol-link" data-ol-do="retry" type="button">Reintentar</button>'
                    : st === 'offline' ? '<i></i> Conexión perdida, reintentando…' : '<i></i> Conectando con la red de partidas…';
        }
        renderRooms() {
            const el = this.el.querySelector('[data-ol="rooms"]'); if (!el || !this.lobby) return;
            const rooms = this.lobby.rooms;
            el.innerHTML = rooms.length ? rooms.map(r => `
                <div class="ol-room">
                    <span class="ol-room-av" style="--c:${esc(r.host.color)}">${esc(r.host.avatar)}</span>
                    <span class="ol-room-info"><b>${esc(r.host.name)}</b><small>${r.n}/${r.max} jugadores · sala ${esc(r.code)}</small></span>
                    <button class="btn btn-primary" data-ol-do="join" data-code="${esc(r.code)}" type="button">Unirse</button>
                </div>`).join('') : `<p class="ol-empty">${this.lobby.status === 'online' ? 'No hay mesas públicas abiertas ahora mismo. ¡Crea una!' : 'Buscando mesas…'}</p>`;
        }

        click(e) {
            const b = e.target.closest('[data-ol-do]'); if (!b || !this.el.contains(b)) return;
            Nexus.audio.play('click');
            const d = b.dataset.olDo;
            if (d === 'create') this.create();
            else if (d === 'join') this.join(b.dataset.code);
            else if (d === 'retry') { this.closeLobby(); this.show(); }
            else if (d === 'exit') { this.leave(); this.closeLobby(); this.hide(); if (this.o.onExit) this.o.onExit(); }
            else if (d === 'cancel') { this.leave(); this.show(); }
            else if (d === 'copy-code') this.copy(this.net.code, 'Código copiado');
            else if (d === 'copy-link') this.copy(location.href.split('#')[0] + `#/game/${this.game}/${this.net.code}`, 'Enlace copiado');
            else if (d === 'start') this.startGame();
            else if (d === 'seats') { this.n = Number(b.dataset.n); this.net.conn.maxPlayers = this.n; this.net.conn._list(); this.sendRoom(); this.showRoom(); }
            else if (d === 'kick') { this.net.conn.kick(b.dataset.id); this.sendRoom(); this.showRoom(); }
        }
        copy(text, ok) {
            const done = () => Nexus.ui.toast(ok, { icon: '📋' });
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => Nexus.ui.toast(text, { icon: '🔗', duration: 8000 }));
            else Nexus.ui.toast(text, { icon: '🔗', duration: 8000 });
        }

        // Anfitrión
        async create() {
            if (this.net) return;
            const cb = this.el.querySelector('[data-ol="public"]');
            this.n = this.o.seats.default;
            const host = new Nexus.net.RoomHost({ game: this.game, info: Nexus.games.OnlineLobby.myInfo(), isPublic: cb ? cb.checked : true, maxPlayers: this.n });
            this.net = { role: 'host', conn: host, code: host.code };
            this.view = 'opening';
            this.el.innerHTML = '<div class="ol-panel"><div class="ol-spinner"></div><p class="ol-hint">Abriendo mesa…</p></div>';
            host.on('guest', (g, mode) => {
                Nexus.audio.play('orbCollect');
                Nexus.ui.toast(`${g.info.name} se sienta a la mesa (${mode === 'p2p' ? 'directa' : 'retransmitida'})`, { icon: '🤝' });
                if (this.playing) { host.kick(g.id); return; }
                this.sendRoom(); this.showRoom();
            });
            host.on('joining', () => { if (!this.playing) this.showRoom(); });
            host.on('message', (m, gid) => this.message(m, gid));
            host.on('guestLeft', (g, reason) => this.guestLeft(g, reason));
            host.on('rtt', () => this.o.onStatus && this.o.onStatus());
            try {
                await host.open();
                if (this.destroyed || !this.net || this.net.conn !== host) { host.close(); return; }
                this.showRoom();
            } catch (err) { host.close(); this.net = null; this.show('No se pudo abrir la mesa: ' + err.message); }
        }

        /** Asientos actuales: anfitrión, invitados por orden de llegada y bots en los huecos. */
        seatList() {
            const n = this.net;
            if (n.role === 'guest') return n.seats || [];
            const me = Nexus.games.OnlineLobby.myInfo();
            const out = [{ kind: 'host', name: me.name, avatar: me.avatar }];
            for (const g of n.conn.guestList()) if (out.length < this.n) out.push({ kind: g.ready ? 'guest' : 'joining', name: g.info.name, avatar: g.info.avatar, id: g.id });
            while (out.length < this.n) out.push({ kind: 'bot', name: 'Bot', avatar: '🤖' });
            return out;
        }
        sendRoom() { if (this.net && this.net.role === 'host') { const seats = this.seatList(); this.net.conn.send({ t: 'tb', k: 'room', seats, n: this.n }, true); } }

        showRoom() {
            const n = this.net; if (!n) { this.show(); return; }
            this.view = 'room';
            const host = n.role === 'host';
            const seats = this.seatList();
            const teamOf = (i) => (this.o.teams ? (i % 2 === 0 ? 'A' : 'B') : null);
            this.el.hidden = false;
            this.el.innerHTML = `<div class="ol-panel">
                <h2 class="ol-title">MESA ${esc(n.code)}</h2>
                ${host ? `<div class="ol-code-big" aria-label="Código de sala">${esc(n.code).split('').map(ch => `<span>${ch}</span>`).join('')}</div>
                <div class="ol-row"><button class="btn btn-ghost" data-ol-do="copy-code" type="button">📋 Copiar código</button><button class="btn btn-ghost" data-ol-do="copy-link" type="button">🔗 Copiar enlace</button></div>` : ''}
                ${host && this.o.seats.min !== this.o.seats.max ? `<div class="segmented ol-seg" role="radiogroup" aria-label="Jugadores">${Array.from({ length: this.o.seats.max - this.o.seats.min + 1 }, (_, k) => this.o.seats.min + k)
                    .map(v => `<button type="button" class="${v === this.n ? 'active' : ''}" data-ol-do="seats" data-n="${v}" ${v < 1 + n.conn.guests.size ? 'disabled' : ''}>${v} jugadores</button>`).join('')}</div>` : ''}
                <div class="cg-seats-list">${seats.map((s, i) => `
                    <div class="cg-seat-item ${s.kind}">
                        <span class="cg-seat-n">${i + 1}</span><span class="ol-seat-av">${esc(s.avatar)}</span>
                        <span class="cg-seat-name"><b>${esc(s.name)}</b><small>${s.kind === 'host' ? 'Anfitrión' : s.kind === 'bot' ? 'Hueco libre: lo jugará un bot' : s.kind === 'joining' ? 'Conectando…' : 'Jugador'}${teamOf(i) ? ` · Pareja ${teamOf(i)}` : ''}</small></span>
                        ${host && (s.kind === 'guest' || s.kind === 'joining') ? `<button class="btn btn-ghost btn-sm" data-ol-do="kick" data-id="${esc(s.id)}" type="button">Echar</button>` : ''}
                    </div>`).join('')}</div>
                ${this.o.teams ? '<p class="ol-hint">Las parejas: asientos 1 y 3 (Pareja A) contra 2 y 4 (Pareja B).</p>' : ''}
                <p class="ol-hint">${host ? 'Comparte el código. Los huecos libres los juegan bots; empieza cuando quieras.' : 'Esperando a que el anfitrión empiece la partida…'}</p>
                <div class="ol-row">
                    ${host ? `<button class="btn btn-primary btn-glow" data-ol-do="start" type="button">▶ Empezar partida</button>` : '<div class="ol-spinner"></div>'}
                    <button class="btn btn-ghost" data-ol-do="cancel" type="button">🚪 ${host ? 'Cerrar mesa' : 'Salir de la mesa'}</button>
                </div>
            </div>`;
        }

        startGame() {
            const n = this.net; if (!n || n.role !== 'host') return;
            const seats = this.seatList();
            n.conn.lock(true);
            const seatSpec = seats.map(s => ({ kind: s.kind === 'host' ? 'me' : (s.kind === 'guest' ? 'remote' : 'bot'), name: s.name, avatar: s.avatar, guestId: s.id }));
            const pub = seats.map(s => ({ name: s.name, avatar: s.avatar, bot: s.kind !== 'host' && s.kind !== 'guest' }));
            seatSpec.forEach((s, i) => { if (s.kind === 'remote') n.conn.send({ t: 'tb', k: 'start', seats: pub, you: i }, true, s.guestId); });
            this.playing = true; this.hide();
            this.o.onStart({ role: 'host', seats: seatSpec, pub, you: 0, send: (gid, msg) => n.conn.send(msg, true, gid) });
        }

        // Invitado
        join(raw) {
            const code = Nexus.net.normalizeCode(raw);
            if (code.length !== 5) { this.show('El código debe tener 5 caracteres.'); return; }
            if (this.net) return;
            const lb = this.ensureLobby();
            const guest = new Nexus.net.RoomGuest({ game: this.game, code, info: Nexus.games.OnlineLobby.myInfo(), hub: lb.hub });
            this.net = { role: 'guest', conn: guest, code, seats: [] };
            this.view = 'joining'; this.el.hidden = false;
            this.el.innerHTML = `<div class="ol-panel"><h2 class="ol-title">MESA ${esc(code)}</h2>
                <div class="ol-waiting"><div class="ol-spinner"></div><span>Buscando la mesa…</span></div>
                <div class="ol-row"><button class="btn btn-ghost" data-ol-do="cancel" type="button">✕ Cancelar</button></div></div>`;
            guest.on('ready', () => { if (this.net && this.net.conn === guest) { Nexus.audio.play('orbCollect'); this.showRoom(); } });
            guest.on('error', (e) => { if (!this.net || this.net.conn !== guest) return; this.net = null; this.show(ERRORS[e] || 'No se pudo entrar en la mesa.'); });
            guest.on('lost', (reason) => this.hostLost(reason));
            guest.on('message', (m) => this.message(m));
            guest.on('rtt', () => this.o.onStatus && this.o.onStatus());
            guest.join().catch(() => { if (this.net && this.net.conn === guest) { this.net = null; this.show('No se pudo conectar con la red de partidas.'); } });
        }

        message(m, gid) {
            if (!m || m.t !== 'tb' || !this.net) return;
            if (this.net.role === 'host') {
                if (m.k === 'act' && this.playing) this.o.onRemoteAction(gid, m.a);
                return;
            }
            if (m.k === 'room') { this.net.seats = Array.isArray(m.seats) ? m.seats.slice(0, 8) : []; if (!this.playing && (this.view === 'room' || this.view === 'joining')) this.showRoom(); }
            else if (m.k === 'start') { this.playing = true; this.hide(); this.o.onStart({ role: 'guest', pub: m.seats, you: m.you | 0, send: null }); }
            else if (m.k === 'view') this.o.onView(m.v, m.s);
            else if (m.k === 'reopen') { this.playing = false; }
        }
        send(a) { if (this.net && this.net.role === 'guest') this.net.conn.send({ t: 'tb', k: 'act', a }, true); }

        guestLeft(g, reason) {
            Nexus.ui.toast(`${(g && g.info && g.info.name) || 'Un jugador'} ${reason === 'left' ? 'se ha ido' : 'ha perdido la conexión'}`, { icon: '📴' });
            if (this.playing) this.o.onGuestLeft(g.id);
            else { this.sendRoom(); if (this.view === 'room') this.showRoom(); }
        }
        hostLost(reason) {
            const wasPlaying = this.playing;
            this.net = null; this.playing = false;
            const msg = reason === 'left' ? 'El anfitrión ha cerrado la mesa' : 'Se perdió la conexión con el anfitrión';
            Nexus.ui.toast(msg, { icon: '📴' });
            this.o.onHostLost(wasPlaying);
            if (!wasPlaying) this.show(msg + '.');
        }

        /** Tras una partida: el anfitrión reabre la mesa; todos vuelven a la sala. */
        afterGame() {
            this.playing = false;
            if (!this.net) { this.show(); return; }
            if (this.net.role === 'host') { this.net.conn.lock(false); this.net.conn.send({ t: 'tb', k: 'reopen' }, true); this.sendRoom(); }
            this.showRoom();
        }
        leave() {
            const n = this.net; if (!n) return;
            this.net = null; this.playing = false;
            try { n.conn.close(); } catch (_) { /* noop */ }
        }
        destroy() {
            this.destroyed = true; this.leave(); this.closeLobby();
            this.el.removeEventListener('click', this.onClick);
            this.el.removeEventListener('submit', this.onSubmit);
            this.el.removeEventListener('input', this.onInput);
        }
    }

    // ── Juego de mesa (interfaz) ────────────────────────────
    const BOT_NAMES = ['Lola', 'Paco', 'Pepa', 'Manolo', 'Carmen', 'Antonio'];
    const POS = { 2: ['bottom', 'top'], 3: ['bottom', 'right', 'left'], 4: ['bottom', 'right', 'top', 'left'] };

    class CardTableGame {
        /**
         * spec: { id, name, emoji, accent, rules, seats:{min,max,default}, teams, title, seatsText,
         *         center(view, game) → html, seatBadge(view, i) → html, scoreHtml(view, game) → html,
         *         handHtml?(view, game) → html, onCard?(view, card, game) → action, extraButtons?(view, game) → [{label, onClick}],
         *         result(view) → { won, draw, score, extra }, help }
         */
        constructor(root, spec) {
            this.root = root; this.spec = spec; this.rules = spec.rules;
            this.destroyed = false; this.timers = new Set();
            this.kind = 'cpu'; this.state = 'menu'; this.v = null; this.session = null; this.nPlayers = spec.seats.default;
            this.build(); this.bind();
            this.lobby = new TableLobby({
                game: spec.id, el: this.$('#cg-online'), title: spec.title + ' ONLINE', seats: spec.seats, teams: spec.teams, seatsText: spec.seatsText,
                onStart: (ctx) => this.startOnline(ctx), onView: (v) => this.onView(v), onRemoteAction: (gid, a) => this.remoteAction(gid, a),
                onGuestLeft: (gid) => this.guestLeft(gid), onHostLost: (was) => this.hostLost(was), onExit: () => this.showHome(), onStatus: () => this.updateHud()
            });
            const code = Nexus.games.OnlineLobby.inviteCode(spec.id);
            if (code) { this.overlay.hidden = true; this.lobby.show(); this.lobby.join(code); } else this.showHome();
        }

        build() {
            const s = this.spec;
            this.root.innerHTML = `
            <div class="game ax-game cg cg-${s.id}" style="--ax-accent:${s.accent};--ol-a:${s.accent};--ol-b:#fbbf24">
                ${Kit.header({ emoji: s.emoji, title: s.name, pills: [
                    { id: 'turn', icon: '🎯', init: '–', title: 'Turno' },
                    { id: 'score', icon: '🏆', init: '–', title: 'Marcador' },
                    { id: 'ping', icon: '📶', init: '–', title: 'Latencia' }] })}
                <div class="cg-body" id="cg-body">
                    <div class="cg-main">
                        <div class="cg-table" id="cg-table">
                            <div class="cg-seat" data-pos="top"></div><div class="cg-seat" data-pos="left"></div><div class="cg-seat" data-pos="right"></div>
                            <div class="cg-center" id="cg-center"></div>
                            <div class="cg-bubble" id="cg-bubble" hidden></div>
                        </div>
                        <div class="cg-mine">
                            <div class="cg-seat cg-me" data-pos="bottom"></div>
                            <div class="cg-hand" id="cg-hand" role="group" aria-label="Tu mano"></div>
                            <div class="cg-actions" id="cg-actions"></div>
                        </div>
                    </div>
                    <aside class="cg-side">
                        <div class="ax-card"><h3>🏆 Marcador</h3><div id="cg-score"></div></div>
                        <div class="ax-card cg-log-card"><h3>📜 Partida</h3><ol class="cg-log" id="cg-log"></ol></div>
                        <div class="ax-card"><div class="cg-side-btns"><button class="btn btn-ghost" id="cg-menu" type="button">☰ Menú</button><button class="btn btn-ghost" id="cg-leave" type="button">🚪 Abandonar</button></div></div>
                    </aside>
                    <div class="ax-overlay cg-overlay" id="cg-overlay"></div>
                    <div class="ol-overlay" id="cg-online" hidden></div>
                </div>
            </div>`;
            this.$ = (q) => this.root.querySelector(q);
            this.overlay = this.$('#cg-overlay');
        }

        bind() {
            this.$('#cg-hand').addEventListener('click', (e) => {
                const c = e.target.closest('[data-card]'); if (!c || !this.v) return;
                this.clickCard(c.dataset.card);
            });
            this.$('#cg-table').addEventListener('click', (e) => {
                const b = e.target.closest('[data-act]'); if (!b || !this.v) return;
                try { this.act(JSON.parse(b.dataset.act)); } catch (_) { /* noop */ }
            });
            this.$('#cg-actions').addEventListener('click', (e) => {
                const b = e.target.closest('[data-act],[data-ui]'); if (!b || !this.v) return;
                if (b.dataset.ui) { this.ui[b.dataset.ui] = !this.ui[b.dataset.ui]; this.render(); return; }
                try { this.act(JSON.parse(b.dataset.act)); } catch (_) { /* noop */ }
            });
            this.$('#cg-menu').addEventListener('click', () => this.openMenu());
            this.$('#cg-leave').addEventListener('click', () => this.abandon());
            this.overlay.addEventListener('click', (e) => this.onOverlay(e));
            this.ui = {};
        }

        clickCard(card) {
            const v = this.v;
            const a = this.spec.onCard ? this.spec.onCard(v, card, this) : (v.legal.includes(card) ? { type: 'play', card } : null);
            if (a) this.act(a);
            else if (v.turn === v.me && v.phase === 'play') { Nexus.audio.play('error'); this.bubble('Esa carta no se puede jugar ahora'); }
        }

        act(a) {
            if (!this.v || this.state !== 'playing') return;
            if (this.session) {
                if (!this.session.act(this.mySeat, a)) Nexus.audio.play('error');
            } else this.lobby.send(a);
            this.ui = {};
        }

        // ── Partidas ────────────────────────────────────────
        startCpu() {
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            const me = Nexus.games.OnlineLobby.myInfo();
            const names = Nexus.util.shuffle(BOT_NAMES.slice());
            const n = this.spec.seats.min === this.spec.seats.max ? this.spec.seats.min : this.nPlayers;
            const seats = [{ kind: 'me', name: me.name, avatar: me.avatar }];
            for (let i = 1; i < n; i++) seats.push({ kind: 'bot', name: names[i - 1], avatar: '🤖' });
            this.begin('cpu', seats.map(s => ({ name: s.name, avatar: s.avatar, bot: s.kind === 'bot' })), 0);
            this.session = new TableSession(this.rules, seats, { onView: (v) => this.onView(v) });
            this.session.start();
        }

        begin(kind, pub, you) {
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            if (this.session) { this.session.destroy(); this.session = null; }
            this.kind = kind; this.pub = pub; this.mySeat = you; this.state = 'playing';
            this.v = null; this.recorded = false; this.ui = {}; this.prevTrick = [];
            this.overlay.hidden = true;
            this.t0 = Date.now();
            Nexus.audio.play('tdRound');
        }

        startOnline(ctx) {
            this.begin('online', ctx.pub, ctx.you);
            if (ctx.role === 'host') {
                this.session = new TableSession(this.rules, ctx.seats, { onView: (v) => this.onView(v), send: ctx.send });
                this.session.start();
            }
        }

        remoteAction(gid, a) {
            if (!this.session) return;
            const seat = this.session.seats.findIndex(s => s.kind === 'remote' && s.guestId === gid);
            if (seat >= 0) this.session.act(seat, a);
        }
        guestLeft(gid) {
            if (!this.session) return;
            const seat = this.session.seats.findIndex(s => s.kind === 'remote' && s.guestId === gid);
            if (seat >= 0) { this.session.toBot(seat); this.pub[seat].bot = true; this.bubble(`${this.pub[seat].name} se fue: le sustituye un bot`); }
        }
        hostLost(wasPlaying) {
            if (!wasPlaying || this.state !== 'playing') return;
            this.state = 'over';
            Nexus.ui.modal.resultModal({ emoji: '📴', kind: 'lose', title: 'MESA CERRADA', subtitle: 'El anfitrión se ha ido y la partida no puede seguir.', stats: [], result: { xp: 0, unlocked: [], records: {} },
                actions: [{ label: 'Volver al vestíbulo', kind: 'primary', onClick: () => this.later(() => this.lobby.show(), 50) }] });
        }

        onView(v) {
            if (this.destroyed || !v) return;
            const prev = this.v;
            this.v = v;
            this.sounds(prev, v);
            this.render();
            if (v.over && this.state === 'playing') this.finish();
        }

        sounds(p, v) {
            if (!p) return;
            if ((v.trick || []).length > (p.trick || []).length) Nexus.audio.play('chessMove');
            if (v.trickWinner !== null && v.trickWinner !== undefined && p.trickWinner !== v.trickWinner) Nexus.audio.play(v.players[v.trickWinner] && (v.teams ? v.trickWinner % 2 === v.me % 2 : v.trickWinner === v.me) ? 'orbCollect' : 'flip');
            if (v.lastCante && (!p.lastCante || p.lastCante.at !== v.lastCante.at)) { Nexus.audio.play('achievement'); this.bubble(`🎵 ${this.pub[v.lastCante.seat].name}: ¡las ${v.lastCante.v}!`, v.lastCante.seat); }
            if (v.turn === v.me && p.turn !== v.me) Nexus.audio.play('click');
            if (v.roundResult && !p.roundResult) Nexus.audio.play('achievement');
        }

        bubble(text, seat) {
            const el = this.$('#cg-bubble');
            el.textContent = text; el.hidden = false;
            el.dataset.pos = seat === undefined ? 'center' : this.posOf(seat);
            el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
            clearTimeout(this.bubbleT); this.bubbleT = setTimeout(() => { el.hidden = true; }, 2200);
        }

        posOf(seat) { const v = this.v; const n = v ? v.n : this.pub.length; return POS[n][(seat - this.mySeat + n) % n]; }

        // ── Pintado ─────────────────────────────────────────
        render() {
            const v = this.v; if (!v) return;
            const n = v.n;
            // Asientos
            this.root.querySelectorAll('.cg-seat').forEach(el => { el.hidden = true; el.innerHTML = ''; });
            for (let i = 0; i < n; i++) {
                const pos = this.posOf(i), el = this.root.querySelector(`.cg-seat[data-pos="${pos}"]`);
                const p = this.pub[i] || { name: '?', avatar: '❔' }, pl = v.players[i];
                el.hidden = false;
                el.classList.toggle('turn', v.turn === i);
                el.classList.toggle('out', pl.active === false);
                el.classList.toggle('mate', !!v.teams && i !== v.me && i % 2 === v.me % 2);
                const backs = pos === 'bottom' ? '' : `<span class="cg-backs">${Array.from({ length: Math.min(pl.count, 8) }, () => '<i></i>').join('')}</span>`;
                el.innerHTML = `<span class="cg-av">${esc(p.avatar)}</span>
                    <span class="cg-name"><b>${esc(p.name)}${i === v.me ? ' <small>(tú)</small>' : ''}</b><small>${this.spec.seatBadge(v, i)}</small></span>${backs}`;
            }
            // Centro
            this.$('#cg-center').innerHTML = this.spec.center(v, this);
            this.animateTrick(v);
            // Mano
            const myTurn = v.turn === v.me;
            this.$('#cg-hand').innerHTML = this.spec.handHtml ? this.spec.handHtml(v, this)
                : v.hand.map(c => cardHtml(c, { cls: v.legal.includes(c) ? 'playable' : (myTurn && v.phase === 'play' ? 'dim' : '') })).join('');
            this.$('#cg-hand').classList.toggle('my-turn', myTurn);
            // Botones
            const btns = (v.buttons || []).map(b => `<button class="btn ${b.kind === 'primary' ? 'btn-primary' : 'btn-ghost'}" type="button" data-act='${esc(JSON.stringify(b.action))}'>${esc(b.label)}</button>`);
            if (this.spec.extraButtons) btns.push(...this.spec.extraButtons(v, this));
            this.$('#cg-actions').innerHTML = btns.join('');
            // Marcador y registro
            this.$('#cg-score').innerHTML = this.spec.scoreHtml(v, this);
            this.$('#cg-log').innerHTML = v.log.map(l => `<li>${esc(l)}</li>`).join('');
            this.$('#cg-log').scrollTop = 1e6;
            this.updateHud();
        }

        animateTrick(v) {
            const prev = this.prevTrick || [];
            const cur = v.trick || [];
            this.$('#cg-center').querySelectorAll('[data-trick-seat]').forEach(el => {
                const s = Number(el.dataset.trickSeat), c = el.dataset.card;
                if (!prev.some(t => t.s === s && t.c === c)) el.classList.add('fly-' + this.posOf(s));
                if (v.trickWinner !== null && v.trickWinner !== undefined) {
                    const tw = v.trickWinner;
                    this.later(() => { const e2 = this.$(`#cg-center [data-trick-seat="${s}"]`); if (e2) e2.classList.add('sweep-' + this.posOf(tw)); }, 800);
                }
            });
            this.prevTrick = cur.slice();
        }

        updateHud() {
            const v = this.v;
            const set = (sel, t) => { const el = this.root.querySelector(sel); if (el && el.textContent !== t) el.textContent = t; };
            if (v) {
                set('[data-pill="turn"]', v.over ? 'Fin' : v.turn === v.me ? 'Tu turno' : (v.turn !== null && v.turn !== undefined ? this.pub[v.turn].name : '…'));
                set('[data-pill="score"]', this.spec.pill(v));
            }
            set('[data-pill="ping"]', this.kind === 'online' && this.lobby.rtt != null ? Math.round(this.lobby.rtt) + ' ms' : '–');
        }

        // ── Fin ─────────────────────────────────────────────
        finish() {
            this.state = 'over';
            const v = this.v, r = this.spec.result(v);
            const online = this.kind === 'online';
            const result = Nexus.services.progress.recordGame({
                game: this.spec.id, mode: online ? 'online' : 'cpu', won: r.won, score: Math.max(0, Math.round(r.score)), time: Math.round((Date.now() - this.t0) / 1000),
                xp: r.won ? (online ? 60 : 40) : 12, extra: Object.assign({ online, draw: !!r.draw, players: v.n }, v.stats || {}, r.extra || {}),
                updateExtra: r.updateExtra
            });
            Nexus.audio.play(r.won ? 'win' : r.draw ? 'achievement' : 'lose');
            const actions = online ? [
                { label: '↩ Volver a la mesa', kind: 'primary', onClick: () => this.later(() => this.lobby.afterGame(), 50) },
                { label: '🚪 Salir', kind: 'ghost', onClick: () => this.later(() => { this.lobby.leave(); this.lobby.show(); }, 50) }
            ] : [
                { label: '🔄 Otra partida', kind: 'primary', onClick: () => this.later(() => this.startCpu(), 50) },
                { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
            ];
            this.later(() => {
                if (this.destroyed) return;
                const rm = this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: r.won ? '🏆' : r.draw ? '🤝' : '🃏', kind: r.won ? 'win' : r.draw ? '' : 'lose',
                    title: r.won ? '¡VICTORIA!' : r.draw ? 'EMPATE' : 'DERROTA', subtitle: v.over.text,
                    extraHtml: r.html || '', stats: r.stats || [], result, actions
                });
                if (online && rm && rm.closed) rm.closed.then(() => { if (this.resultModal === rm) this.resultModal = null; if (!this.destroyed && this.state === 'over' && !this.lobby.active && this.lobby.net) this.lobby.afterGame(); });
            }, 1300);
        }

        abandon() {
            if (this.state !== 'playing') { this.openMenu(); return; }
            Nexus.ui.modal.confirm({ title: 'Abandonar', icon: '🚪', danger: true, confirmLabel: 'Abandonar', message: this.kind === 'online' ? 'Si sales, un bot ocupará tu sitio y la partida contará como derrota.' : 'La partida contará como derrota.' })
                .then(ok => { if (ok && !this.destroyed) this.quit(); });
        }
        quit() {
            if (this.state === 'playing') {
                Nexus.services.progress.recordGame({ game: this.spec.id, mode: this.kind === 'online' ? 'online' : 'cpu', won: false, score: 0, time: 0, xp: 3, extra: { online: this.kind === 'online', abandoned: true } });
            }
            this.state = 'menu';
            if (this.session) { this.session.destroy(); this.session = null; }
            if (this.kind === 'online') { this.lobby.leave(); this.lobby.show(); } else this.showHome();
        }

        // ── Menús ───────────────────────────────────────────
        showHome() {
            if (this.state !== 'playing') this.state = 'menu';
            const s = this.spec;
            const resumable = this.state === 'playing' && this.kind === 'cpu';
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <div class="cg-logo">${esc(s.emoji)} ${esc(s.title)}</div>
                <p class="ax-sub">${esc(s.tagline)}</p>
                <div class="ch-choices">
                    <button type="button" class="ch-choice cg-choice" data-do="go-cpu"><span>🤖</span><strong>Contra la máquina</strong><small>${esc(s.cpuText)}</small></button>
                    <button type="button" class="ch-choice cg-choice" data-do="go-online"><span>🌐</span><strong>Online</strong><small>${esc(s.seatsText)}</small></button>
                </div>
                <details class="ax-help"><summary>📖 Cómo se juega</summary><ul>${s.help.map(h => `<li>${h}</li>`).join('')}</ul></details>
                ${resumable ? '<div class="ax-play-row"><button class="btn btn-ghost" data-do="close" type="button">▶ Volver a la partida</button></div>' : ''}
            </div>`;
        }
        showCpu() {
            const s = this.spec;
            if (s.seats.min === s.seats.max) { this.startCpu(); return; }
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">CONTRA LA MÁQUINA</h2>
                <p class="ax-sub">¿Cuántos jugadores en la mesa? Los demás asientos los ocupan bots.</p>
                <div class="segmented cg-seg" role="radiogroup">${Array.from({ length: s.seats.max - s.seats.min + 1 }, (_, k) => s.seats.min + k)
                    .map(n => `<button type="button" class="${n === this.nPlayers ? 'active' : ''}" data-players="${n}">${n} jugadores</button>`).join('')}</div>
                <div class="ax-play-row"><button class="btn btn-ghost" data-do="home" type="button">← Volver</button>
                    <button class="btn btn-primary btn-glow" data-do="start" type="button">▶ Repartir</button></div>
            </div>`;
        }
        openMenu() {
            if (this.kind === 'online' && this.state === 'playing') { this.abandon(); return; }
            if (this.kind === 'online' && this.lobby.net) { this.lobby.showRoom(); return; }
            this.showHome();
        }
        onOverlay(e) {
            const p = e.target.closest('[data-players]');
            if (p) { this.nPlayers = Number(p.dataset.players); Nexus.audio.play('click'); this.showCpu(); return; }
            const b = e.target.closest('[data-do]'); if (!b) return;
            Nexus.audio.play('click');
            const d = b.dataset.do;
            if (d === 'go-cpu') this.showCpu();
            else if (d === 'go-online') {
                if (this.state === 'playing' && this.kind === 'cpu') { if (this.session) this.session.destroy(); this.session = null; this.state = 'menu'; }
                this.overlay.hidden = true; this.lobby.show();
            } else if (d === 'home') this.showHome();
            else if (d === 'start') this.startCpu();
            else if (d === 'close') this.overlay.hidden = true;
        }

        later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms); this.timers.add(id); return id; }

        destroy() {
            if (this.state === 'playing' && this.kind === 'online') this.quit();
            this.destroyed = true;
            if (this.session) this.session.destroy();
            this.timers.forEach(clearTimeout); this.timers.clear();
            clearTimeout(this.bubbleT);
            if (this.resultModal) this.resultModal.close();
            this.lobby.destroy();
        }
    }

    Nexus.games.cards = { cardHtml, suitSvg, TableSession, TableLobby, CardTableGame };
})();
