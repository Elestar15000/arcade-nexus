/* ============================================================
   NEXUS ARCADE · games/shared/online.js
   Vestíbulo online reutilizable para juegos de 2 jugadores por
   turnos (Ajedrez, Hundir la flota…), sobre src/core/net.js:
     · Pantalla «Online»: crear sala (pública/privada), unirse con
       código o desde el buscador de salas abiertas.
     · Sala: los dos jugadores, «¡Listo!» y arranque sincronizado;
       revancha volviendo a la sala.
     · Mensajes fiables entre jugadores (send) y aviso si el otro
       se va o se pierde la conexión.

   Uso:
     const lobby = new Nexus.games.OnlineLobby({
       game: 'chess', el: overlayElement, title: 'AJEDREZ ONLINE',
       startOptions: (round) => ({ ... }),      // lo decide el anfitrión al empezar
       onStart: ({ role, opts, round, peer }) => {},
       onMessage: (msg) => {},
       onLost: ({ reason, peer, wasPlaying }) => {},
       onExit: () => {}                          // «Volver» desde el vestíbulo
     });
     lobby.show();            lobby.send(obj);   lobby.gameOver();   lobby.afterGame();
   ============================================================ */
(function () {
    'use strict';

    const { esc } = Nexus.util;
    const ERRORS = {
        notfound: 'No hay ninguna sala abierta con ese código.',
        full: 'Esa sala ya tiene dos jugadores.',
        version: 'El anfitrión usa otra versión del juego. Recargad la página los dos.'
    };

    function myInfo() {
        const u = Nexus.services.users.current() || {};
        return { name: u.name || 'Jugador', avatar: u.avatar || '🎮', color: u.color || '#8b5cf6', level: Nexus.services.progress.level().level };
    }

    function copy(text, ok) {
        const done = () => Nexus.ui.toast(ok, { icon: '📋' });
        const fallback = () => {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); } catch (_) { Nexus.ui.toast(text, { icon: '🔗', duration: 8000 }); }
            ta.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
    }

    class OnlineLobby {
        constructor(o) {
            this.o = o;
            this.game = o.game;
            this.el = o.el;
            this.net = null;          // { role, conn, peer, ready:[h,g], code, isPublic, linking }
            this.lobby = null;        // { hub, browser, rooms, status }
            this.playing = false;
            this.round = 0;
            this.view = 'off';
            this.destroyed = false;
            this.onClick = (e) => this.click(e);
            this.onSubmit = (e) => { if (e.target.closest('.ol-join-form')) { e.preventDefault(); const i = this.el.querySelector('.ol-code-input'); this.join(i ? i.value : ''); } };
            this.onInput = (e) => {
                if (e.target.classList.contains('ol-code-input')) { const v = Nexus.net.normalizeCode(e.target.value); if (v !== e.target.value) e.target.value = v; }
            };
            this.el.addEventListener('click', this.onClick);
            this.el.addEventListener('submit', this.onSubmit);
            this.el.addEventListener('input', this.onInput);
        }

        // ── Estado público ──────────────────────────────────
        get role() { return this.net ? this.net.role : null; }
        get peer() { return this.net ? this.net.peer : null; }
        get code() { return this.net ? this.net.code : null; }
        get inRoom() { return !!(this.net && (this.net.role === 'guest' || this.net.conn.guest)); }
        get mode() { return this.net ? this.net.conn.mode : null; }
        get rtt() { return this.net ? this.net.conn.rtt : null; }
        get active() { return this.view !== 'off'; }

        send(obj) { if (this.net) this.net.conn.send(obj, true); }

        /** El juego avisa de que la partida terminó (sin salir de la sala). */
        gameOver() { this.playing = false; }

        /** Tras ver el resultado: vuelve a la sala (o al vestíbulo si ya no hay rival). */
        afterGame() {
            this.playing = false;
            if (!this.net) this.show();
            else this.showRoom();
        }

        hide() { this.view = 'off'; this.el.hidden = true; }

        // ── Vestíbulo ───────────────────────────────────────
        ensureLobby() {
            if (this.lobby) return this.lobby;
            const hub = new Nexus.net.Hub();
            const browser = new Nexus.net.RoomBrowser({ game: this.game, hub });
            const lb = this.lobby = { hub, browser, rooms: [], status: 'connecting' };
            browser.on('rooms', (list) => { lb.rooms = list; if (this.view === 'home') this.renderRooms(); });
            browser.on('status', (n) => { lb.status = n > 0 ? 'online' : 'offline'; if (this.view === 'home') this.renderStatus(); });
            browser.start().then(() => { lb.status = 'online'; if (this.view === 'home') this.renderStatus(); })
                .catch(() => { lb.status = 'error'; if (this.view === 'home') this.renderStatus(); });
            return lb;
        }

        closeLobby() {
            if (!this.lobby) return;
            try { this.lobby.browser.stop(); } catch (_) { /* noop */ }
            this.lobby.hub.close();
            this.lobby = null;
        }

        show(errorMsg) {
            this.view = 'home';
            this.ensureLobby();
            const pub = Nexus.services.settings.get('online.publicRooms') !== false;
            this.el.hidden = false;
            this.el.innerHTML = `<div class="ol-panel">
                <h2 class="ol-title">${esc(this.o.title || 'ONLINE 1 CONTRA 1')}</h2>
                <div class="ol-status" data-ol="status"></div>
                ${errorMsg ? `<div class="ol-error" role="alert">${esc(errorMsg)}</div>` : ''}
                <div class="ol-grid">
                    <div class="ol-box">
                        <h3>🏠 Crear sala</h3>
                        <p class="ol-hint">Tu navegador hará de servidor. Comparte el código con tu rival.</p>
                        <label class="ol-check"><input type="checkbox" data-ol="public" ${pub ? 'checked' : ''}> Pública (aparece en el buscador)</label>
                        <button class="btn btn-primary btn-glow" data-ol-do="create" type="button">＋ Crear sala</button>
                    </div>
                    <form class="ol-box ol-join-form" autocomplete="off">
                        <h3>🔑 Unirse con código</h3>
                        <p class="ol-hint">5 caracteres, sin I, O, 0 ni 1.</p>
                        <input class="ol-code-input" maxlength="5" placeholder="ABCDE" aria-label="Código de sala" autocapitalize="characters" spellcheck="false">
                        <button class="btn btn-ghost" type="submit">Entrar →</button>
                    </form>
                </div>
                <div class="ol-box">
                    <h3>🔎 Salas abiertas</h3>
                    <div class="ol-rooms" data-ol="rooms"></div>
                </div>
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
            if (!rooms.length) {
                el.innerHTML = `<p class="ol-empty">${this.lobby.status === 'online' ? 'No hay salas públicas abiertas ahora mismo. ¡Crea una!' : 'Buscando salas…'}</p>`;
                return;
            }
            el.innerHTML = rooms.map(r => `
                <div class="ol-room">
                    <span class="ol-room-av" style="--c:${esc(r.host.color)}">${esc(r.host.avatar)}</span>
                    <span class="ol-room-info"><b>${esc(r.host.name)}</b><small>Nivel ${r.host.level} · sala ${esc(r.code)}</small></span>
                    <button class="btn btn-primary" data-ol-do="join" data-code="${esc(r.code)}" type="button">Unirse</button>
                </div>`).join('');
        }

        click(e) {
            const b = e.target.closest('[data-ol-do]');
            if (!b || !this.el.contains(b)) return;
            Nexus.audio.play('click');
            switch (b.dataset.olDo) {
                case 'create': this.create(); break;
                case 'join': this.join(b.dataset.code); break;
                case 'retry': this.closeLobby(); this.show(); break;
                case 'exit': this.leave(); this.closeLobby(); this.hide(); if (this.o.onExit) this.o.onExit(); break;
                case 'cancel': this.leave(); this.show(); break;
                case 'copy-code': copy(this.net.code, 'Código copiado'); break;
                case 'copy-link': copy(location.href.split('#')[0] + `#/game/${this.game}/${this.net.code}`, 'Enlace copiado'); break;
                case 'ready': this.toggleReady(); break;
                default: break;
            }
        }

        // ── Anfitrión ───────────────────────────────────────
        async create() {
            if (this.net) return;
            const cb = this.el.querySelector('[data-ol="public"]');
            const isPublic = cb ? cb.checked : true;
            const host = new Nexus.net.RoomHost({ game: this.game, info: myInfo(), isPublic });
            this.net = { role: 'host', conn: host, peer: null, ready: [false, false], code: host.code, isPublic, linking: false };
            this.view = 'opening';
            this.el.innerHTML = '<div class="ol-panel"><div class="ol-spinner"></div><p class="ol-hint">Abriendo sala…</p></div>';
            host.on('joining', (g) => { if (this.net && this.net.conn === host) { this.net.peer = g.info; this.net.linking = true; if (!this.playing) this.showWait(); } });
            host.on('guest', (g, mode) => {
                if (!this.net || this.net.conn !== host) return;
                this.net.peer = g.info; this.net.linking = false; this.net.ready = [false, false];
                Nexus.audio.play('orbCollect');
                Nexus.ui.toast(`${g.info.name} se ha unido (${mode === 'p2p' ? 'conexión directa' : 'retransmitida'})`, { icon: '🤝' });
                this.sendRoom();
                this.showRoom();
            });
            host.on('message', (m) => this.message(m));
            host.on('guestLeft', (g, reason) => this.lost(reason, g && g.info));
            host.on('rtt', () => { if (this.o.onStatus) this.o.onStatus(); });
            host.on('mode', () => { if (this.o.onStatus) this.o.onStatus(); });
            try {
                await host.open();
                if (this.destroyed || !this.net || this.net.conn !== host) { host.close(); return; }
                this.showWait();
            } catch (err) {
                host.close(); this.net = null;
                this.show('No se pudo abrir la sala: ' + err.message);
            }
        }

        showWait() {
            this.view = 'wait';
            const n = this.net;
            this.el.hidden = false;
            this.el.innerHTML = `<div class="ol-panel">
                <h2 class="ol-title">TU SALA</h2>
                <p class="ol-hint">${n.isPublic ? 'Sala pública: aparece en el buscador.' : 'Sala privada: sólo se entra con el código o el enlace.'}</p>
                <div class="ol-code-big" aria-label="Código de sala">${esc(n.code).split('').map(ch => `<span>${ch}</span>`).join('')}</div>
                <div class="ol-row">
                    <button class="btn btn-ghost" data-ol-do="copy-code" type="button">📋 Copiar código</button>
                    <button class="btn btn-ghost" data-ol-do="copy-link" type="button">🔗 Copiar enlace</button>
                </div>
                <div class="ol-waiting"><div class="ol-spinner"></div>
                    <span>${n.linking && n.peer ? `Conectando con <b>${esc(n.peer.name)}</b>…` : 'Esperando a un rival…'}</span></div>
                <div class="ol-row"><button class="btn btn-ghost" data-ol-do="cancel" type="button">✕ Cerrar sala</button></div>
            </div>`;
        }

        sendRoom() { if (this.net && this.net.role === 'host') this.net.conn.send({ t: 'lb', k: 'room', ready: this.net.ready }, true); }

        // ── Invitado ────────────────────────────────────────
        join(raw) {
            const code = Nexus.net.normalizeCode(raw);
            if (code.length !== 5) { this.show('El código debe tener 5 caracteres.'); return; }
            if (this.net) return;
            const lb = this.ensureLobby();
            const guest = new Nexus.net.RoomGuest({ game: this.game, code, info: myInfo(), hub: lb.hub });
            this.net = { role: 'guest', conn: guest, peer: null, ready: [false, false], code };
            this.view = 'joining';
            this.el.hidden = false;
            this.el.innerHTML = `<div class="ol-panel">
                <h2 class="ol-title">SALA ${esc(code)}</h2>
                <div class="ol-waiting"><div class="ol-spinner"></div><span data-ol="joinmsg">Buscando la sala…</span></div>
                <div class="ol-row"><button class="btn btn-ghost" data-ol-do="cancel" type="button">✕ Cancelar</button></div>
            </div>`;
            guest.on('welcome', (h) => {
                if (!this.net || this.net.conn !== guest) return;
                this.net.peer = h;
                const el = this.el.querySelector('[data-ol="joinmsg"]');
                if (el) el.innerHTML = `Sala de <b>${esc(h.name)}</b> encontrada. Estableciendo conexión…`;
            });
            guest.on('ready', (h, mode) => {
                if (!this.net || this.net.conn !== guest) return;
                this.net.peer = h;
                Nexus.audio.play('orbCollect');
                Nexus.ui.toast(`Conectado con ${h.name} (${mode === 'p2p' ? 'directa' : 'retransmitida'})`, { icon: '🤝' });
                this.showRoom();
            });
            guest.on('error', (e) => {
                if (!this.net || this.net.conn !== guest) return;
                this.net = null;
                this.show(ERRORS[e] || 'No se pudo entrar en la sala.');
            });
            guest.on('lost', (reason) => this.lost(reason, this.net && this.net.peer));
            guest.on('message', (m) => this.message(m));
            guest.on('rtt', () => { if (this.o.onStatus) this.o.onStatus(); });
            guest.on('mode', () => { if (this.o.onStatus) this.o.onStatus(); });
            guest.join().catch(() => {
                if (this.net && this.net.conn === guest) { this.net = null; this.show('No se pudo conectar con la red de partidas.'); }
            });
        }

        // ── Sala ────────────────────────────────────────────
        showRoom() {
            const n = this.net;
            if (!n) { this.show(); return; }
            if (n.role === 'host' && !n.conn.guest) { this.showWait(); return; }
            this.view = 'room';
            const me = n.role === 'host' ? 0 : 1;
            const mine = myInfo(), peer = n.peer || { name: 'Rival', avatar: '❔', level: 1 };
            const seat = (info, isMe, rdy, isHost) => `
                <div class="ol-seat ${isMe ? 'me' : 'foe'}${rdy ? ' ready' : ''}">
                    <span class="ol-seat-av">${esc(info.avatar)}</span>
                    <b>${esc(info.name)}${isMe ? ' <small>(tú)</small>' : ''}</b>
                    <small>Nivel ${info.level || 1}${isHost ? ' · anfitrión' : ''}</small>
                    <span class="ol-seat-state">${rdy ? '✅ Listo' : '⏳ No listo'}</span>
                </div>`;
            const mode = n.conn.mode, rtt = n.conn.rtt;
            this.el.hidden = false;
            this.el.innerHTML = `<div class="ol-panel">
                <h2 class="ol-title">SALA ${esc(n.code)}</h2>
                <p class="ol-hint">${mode === 'p2p' ? '⚡ Conexión directa entre navegadores' : '📡 Conexión retransmitida'}${rtt != null ? ` · ${Math.round(rtt)} ms` : ''}</p>
                <div class="ol-seats">${seat(mine, true, n.ready[me], n.role === 'host')}<span class="ol-vs">VS</span>${seat(peer, false, n.ready[1 - me], n.role !== 'host')}</div>
                ${this.o.roomNote ? `<p class="ol-hint">${this.o.roomNote}</p>` : ''}
                <div class="ol-row">
                    <button class="btn ${n.ready[me] ? 'btn-ghost' : 'btn-primary btn-glow'}" data-ol-do="ready" type="button">${n.ready[me] ? '✋ No estoy listo' : (this.round ? '🔄 ¡Revancha!' : '✅ ¡Listo!')}</button>
                    <button class="btn btn-ghost" data-ol-do="cancel" type="button">🚪 Salir de la sala</button>
                </div>
            </div>`;
        }

        toggleReady() {
            const n = this.net; if (!n) return;
            const me = n.role === 'host' ? 0 : 1;
            n.ready[me] = !n.ready[me];
            if (n.role === 'host') { this.sendRoom(); this.maybeStart(); }
            else n.conn.send({ t: 'lb', k: 'ready', v: n.ready[1] }, true);
            if (!this.playing) this.showRoom();
        }

        /** Marca «listo» desde fuera (p. ej. botón de revancha del modal). */
        ready() {
            const n = this.net; if (!n) { this.show(); return; }
            const me = n.role === 'host' ? 0 : 1;
            if (!n.ready[me]) this.toggleReady(); else this.showRoom();
        }

        maybeStart() {
            const n = this.net;
            if (!n || n.role !== 'host' || !n.conn.guest || !n.ready[0] || !n.ready[1]) return;
            n.ready = [false, false];
            this.round++;
            const opts = this.o.startOptions ? this.o.startOptions(this.round) : {};
            n.conn.send({ t: 'lb', k: 'start', opts, round: this.round }, true);
            this.begin(opts, this.round);
        }

        begin(opts, round) {
            this.round = round;
            this.playing = true;
            this.hide();
            this.o.onStart({ role: this.net.role, opts, round, peer: this.net.peer });
        }

        message(m) {
            const n = this.net; if (!n || !m || typeof m.t !== 'string') return;
            if (m.t === 'lb') {
                if (n.role === 'host' && m.k === 'ready') {
                    n.ready[1] = !!m.v; this.sendRoom();
                    if (!this.playing && this.view === 'room') this.showRoom();
                    this.maybeStart();
                } else if (n.role === 'guest' && m.k === 'room' && Array.isArray(m.ready)) {
                    n.ready = [!!m.ready[0], !!m.ready[1]];
                    if (!this.playing && this.view === 'room') this.showRoom();
                } else if (n.role === 'guest' && m.k === 'start') {
                    n.ready = [false, false];
                    this.begin(m.opts || {}, m.round | 0);
                }
                return;
            }
            this.o.onMessage(m);
        }

        lost(reason, peer) {
            const n = this.net; if (!n) return;
            const wasPlaying = this.playing;
            this.playing = false;
            const who = (peer && peer.name) || 'Tu rival';
            const msg = reason === 'left' ? `${who} ha salido de la sala` : `Se perdió la conexión con ${who}`;
            Nexus.ui.toast(msg, { icon: '📴' });
            if (n.role === 'host') { n.peer = null; n.ready = [false, false]; n.linking = false; }
            else this.net = null;
            this.o.onLost({ reason, peer, wasPlaying, message: msg });
            if (!wasPlaying) {
                if (this.net) this.showWait(); else this.show(msg + '.');
            }
        }

        leave() {
            const n = this.net; if (!n) return;
            this.net = null; this.playing = false; this.round = 0;
            try { n.conn.close(); } catch (_) { /* noop */ }
        }

        destroy() {
            this.destroyed = true;
            this.leave();
            this.closeLobby();
            this.el.removeEventListener('click', this.onClick);
            this.el.removeEventListener('submit', this.onSubmit);
            this.el.removeEventListener('input', this.onInput);
        }
    }

    /** Lee un código de invitación del enlace (#/game/<juego>/<CÓDIGO>) y lo limpia de la barra de direcciones. */
    OnlineLobby.inviteCode = (game) => {
        const m = location.hash.match(new RegExp(`^#/game/${game}/([A-Za-z0-9]{5})$`));
        if (!m) return null;
        history.replaceState(null, '', location.href.split('#')[0] + `#/game/${game}`);
        return m[1];
    };
    OnlineLobby.myInfo = myInfo;

    Nexus.games.OnlineLobby = OnlineLobby;
})();
