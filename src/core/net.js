/* ============================================================
   NEXUS ARCADE · core/net.js
   Multijugador sin servidor propio (apto para GitHub Pages).

   · Señalización y listado de salas: brokers MQTT públicos por
     WebSocket seguro (wss). Se usan varios a la vez y se ignoran
     los mensajes duplicados, así basta con que funcione uno.
       - Cada sala pública es un mensaje *retenido* en
         `<raíz>/<juego>/v1/rooms/<CÓDIGO>`; quien abre el buscador
         recibe al instante todas las salas abiertas.
       - El "último deseo" (LWT) del anfitrión borra su sala si
         cierra la pestaña o pierde la conexión.
   · Partida: el anfitrión "abre el servidor" en su navegador y se
     conecta con el invitado por WebRTC (DataChannel P2P). Si el P2P
     no es posible (NAT estricta, sin TURN…), los mensajes de juego
     se retransmiten por el propio broker (más latencia, pero juega).

   API (genérica, para cualquier juego):
     new Nexus.net.RoomHost({ game, info, isPublic })   → .open() .send() .close()
     new Nexus.net.RoomGuest({ game, code, info, hub })  → .join() .send() .close()
     new Nexus.net.RoomBrowser({ game, hub })            → .start() .stop()  evento 'rooms'
     new Nexus.net.Hub()                                 → conexión a los brokers

   Configuración opcional en config.js:
     window.NEXUS_CONFIG.P2P = { BROKERS: ['wss://…'], ICE_SERVERS: [{ urls: 'stun:…' }], FORCE_RELAY: false }
   ============================================================ */
(function () {
    'use strict';

    const PROTO = 1;
    const DEFAULTS = {
        TOPIC_ROOT: 'nexusarcade',
        BROKERS: [
            'wss://broker.emqx.io:8084/mqtt',
            'wss://broker.hivemq.com:8884/mqtt'
        ],
        ICE_SERVERS: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        FORCE_RELAY: false,       // true = no intenta P2P (pruebas)
        P2P_TIMEOUT: 9000,        // ms antes de pasar a retransmisión
        ROOM_TTL: 90000           // una sala sin refrescar en este tiempo se da por muerta
    };

    function config() {
        const site = (window.NEXUS_CONFIG && window.NEXUS_CONFIG.P2P) || {};
        return Object.assign({}, DEFAULTS, site, window.NEXUS_P2P_OVERRIDE || {});
    }

    // ── Utilidades ───────────────────────────────────────────
    const enc = new TextEncoder(), dec = new TextDecoder();
    const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    function rid(n) {
        const a = new Uint8Array(n);
        crypto.getRandomValues(a);
        return Array.from(a, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
    }
    function genCode() {
        const a = new Uint8Array(5);
        crypto.getRandomValues(a);
        return Array.from(a, b => CODE_ABC[b % CODE_ABC.length]).join('');
    }
    /** Normaliza un código escrito por el usuario (mayúsculas, sin espacios ni caracteres ambiguos). */
    function normalizeCode(s) {
        return String(s || '').toUpperCase().split('').filter(ch => CODE_ABC.includes(ch)).join('').slice(0, 5);
    }
    function sanitizeInfo(i) {
        i = (i && typeof i === 'object') ? i : {};
        return {
            name: String(i.name || 'Jugador').slice(0, 16),
            avatar: String(i.avatar || '🎮').slice(0, 8),
            color: /^#[0-9a-f]{6}$/i.test(i.color || '') ? i.color : '#8b5cf6',
            level: Math.max(1, Math.min(999, i.level | 0 || 1))
        };
    }
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    class Emitter {
        constructor() { this._ev = {}; }
        on(ev, fn) { (this._ev[ev] = this._ev[ev] || []).push(fn); return () => this.off(ev, fn); }
        off(ev, fn) { const l = this._ev[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
        emit(ev, ...args) {
            const l = this._ev[ev]; if (!l) return;
            for (const fn of l.slice()) { try { fn(...args); } catch (e) { console.error('[net]', ev, e); } }
        }
    }

    // ── MQTT 3.1.1 mínimo sobre WebSocket (QoS 0) ───────────
    const u8 = (arr) => (arr instanceof Uint8Array ? arr : new Uint8Array(arr));
    function concat(parts) {
        parts = parts.map(u8);
        const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
        let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
        return out;
    }
    function mstr(s) { const b = enc.encode(s); return concat([[b.length >> 8, b.length & 255], b]); }
    function packet(type, body) {
        const len = []; let n = body.length;
        do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
        return concat([[type], len, body]);
    }

    class MqttClient extends Emitter {
        constructor(url, opts) {
            super();
            this.url = url; this.opts = opts;
            this.ws = null; this.buf = new Uint8Array(0);
            this.connected = false; this.pid = 1; this.subs = new Set();
            this.lastRx = 0; this.pingT = 0;
        }

        connect() {
            if (this.connected) return Promise.resolve();
            return new Promise((resolve, reject) => {
                let settled = false;
                const fail = (e) => { if (!settled) { settled = true; clearTimeout(to); reject(e); } };
                let ws;
                try { ws = new WebSocket(this.url, ['mqtt']); } catch (e) { fail(e); return; }
                this.ws = ws; this.buf = new Uint8Array(0);
                ws.binaryType = 'arraybuffer';
                const to = setTimeout(() => { fail(new Error('timeout')); try { ws.close(); } catch (_) { /* noop */ } }, this.opts.timeout || 8000);
                ws.onopen = () => ws.send(this._connectPacket());
                ws.onmessage = (e) => { if (this.ws === ws) this._data(new Uint8Array(e.data)); };
                ws.onerror = () => fail(new Error('ws'));
                ws.onclose = () => {
                    if (this.ws !== ws) return;
                    const was = this.connected;
                    this.connected = false; this._stopPing();
                    fail(new Error('closed'));
                    if (was) this.emit('close');
                };
                this._onConnack = (rc) => {
                    if (rc !== 0) { fail(new Error('rc ' + rc)); try { ws.close(); } catch (_) { /* noop */ } return; }
                    settled = true; clearTimeout(to);
                    this.connected = true; this.lastRx = Date.now();
                    this._startPing();
                    for (const s of this.subs) this._sendSub(s);
                    resolve();
                };
            });
        }

        _connectPacket() {
            const o = this.opts, w = o.will;
            let flags = 0x02;                                    // clean session
            if (w) flags |= 0x04 | (w.retain ? 0x20 : 0);        // will (QoS 0)
            const ka = o.keepalive || 30;
            const parts = [mstr('MQTT'), [4, flags, ka >> 8, ka & 255], mstr(o.clientId)];
            if (w) { const p = enc.encode(w.payload || ''); parts.push(mstr(w.topic), [p.length >> 8, p.length & 255], p); }
            return packet(0x10, concat(parts));
        }

        _send(bytes) { if (this.ws && this.ws.readyState === 1) { try { this.ws.send(bytes); } catch (_) { /* noop */ } } }

        _data(chunk) {
            this.lastRx = Date.now();
            this.buf = this.buf.length ? concat([this.buf, chunk]) : chunk;
            for (;;) {
                const b = this.buf;
                if (b.length < 2) return;
                let mult = 1, len = 0, i = 1, byte;
                do {
                    if (i >= b.length) return;
                    byte = b[i++]; len += (byte & 127) * mult; mult *= 128;
                } while ((byte & 128) && i < 5);
                if (b.length < i + len) return;
                const type = b[0], body = b.subarray(i, i + len);
                this.buf = b.slice(i + len);
                this._packet(type, body);
            }
        }

        _packet(type, body) {
            switch (type >> 4) {
                case 2: if (this._onConnack) this._onConnack(body[1]); break;          // CONNACK
                case 3: {                                                               // PUBLISH
                    const qos = (type >> 1) & 3, retain = !!(type & 1);
                    const tl = (body[0] << 8) | body[1];
                    const topic = dec.decode(body.subarray(2, 2 + tl));
                    let p = 2 + tl;
                    if (qos > 0) {
                        const id = (body[p] << 8) | body[p + 1]; p += 2;
                        if (qos === 1) this._send(new Uint8Array([0x40, 2, id >> 8, id & 255]));
                    }
                    this.emit('message', topic, dec.decode(body.subarray(p)), retain);
                    break;
                }
                default: break;                                                         // SUBACK, PINGRESP…
            }
        }

        _nextId() { this.pid = (this.pid % 65535) + 1; return this.pid; }
        _sendSub(f) { const id = this._nextId(); this._send(packet(0x82, concat([[id >> 8, id & 255], mstr(f), [0]]))); }
        subscribe(f) { if (this.subs.has(f)) return; this.subs.add(f); if (this.connected) this._sendSub(f); }
        unsubscribe(f) {
            if (!this.subs.delete(f) || !this.connected) return;
            const id = this._nextId(); this._send(packet(0xA2, concat([[id >> 8, id & 255], mstr(f)])));
        }
        publish(topic, payload, retain) {
            if (!this.connected) return false;
            this._send(packet(0x30 | (retain ? 1 : 0), concat([mstr(topic), enc.encode(payload)])));
            return true;
        }

        _startPing() {
            const ka = (this.opts.keepalive || 30) * 1000;
            this._stopPing();
            this.pingT = setInterval(() => {
                if (Date.now() - this.lastRx > ka * 1.6) { try { this.ws.close(); } catch (_) { /* noop */ } return; }
                this._send(new Uint8Array([0xC0, 0]));
            }, ka / 2);
        }
        _stopPing() { clearInterval(this.pingT); }

        close() {
            this._stopPing();
            const ws = this.ws;
            if (this.connected && ws && ws.readyState === 1) { try { ws.send(new Uint8Array([0xE0, 0])); } catch (_) { /* noop */ } }   // DISCONNECT (sin LWT)
            this.connected = false; this.ws = null;
            if (ws) { try { ws.close(); } catch (_) { /* noop */ } }
        }
    }

    // ── Hub: varios brokers a la vez, mensajes JSON sin duplicados ──
    class Hub extends Emitter {
        constructor(opts = {}) {
            super();
            this.cfg = config();
            this.id = rid(10);
            this.seq = 0;
            this.closed = false;
            this.seen = new Map();
            this.clients = this.cfg.BROKERS.map(url => {
                const c = new MqttClient(url, { clientId: 'nx' + rid(16), will: opts.will || null, keepalive: 30 });
                c.on('message', (t, p, r) => this._msg(t, p, r));
                c.on('close', () => { this.emit('status'); this._retry(c); });
                return c;
            });
            this._start = null;
        }

        /** Conecta con todos los brokers; resuelve en cuanto uno responde. Idempotente. */
        start() {
            if (this._start) return this._start;
            if (!this.clients.length) return (this._start = Promise.reject(new Error('Sin brokers configurados')));
            this._start = new Promise((resolve, reject) => {
                let failed = 0, ok = false;
                for (const c of this.clients) {
                    c.connect().then(() => {
                        c._backoff = 0;
                        this.emit('status');
                        if (!ok) { ok = true; resolve(this); }
                    }).catch(() => {
                        if (++failed === this.clients.length && !ok) {
                            this._start = null;      // permite reintentar más tarde
                            reject(new Error('No se pudo conectar con ningún servidor de señalización'));
                        }
                        if (!this.closed) this._retry(c);
                    });
                }
            });
            return this._start;
        }

        _retry(c) {
            if (this.closed || c._retryT) return;
            c._backoff = Math.min(30000, (c._backoff || 1500) * 2);
            c._retryT = setTimeout(() => {
                c._retryT = 0;
                if (this.closed) return;
                c.connect().then(() => { c._backoff = 0; this.emit('status'); }).catch(() => this._retry(c));
            }, c._backoff);
        }

        get online() { return this.clients.filter(c => c.connected).length; }
        get total() { return this.clients.length; }

        subscribe(f) { for (const c of this.clients) c.subscribe(f); }
        unsubscribe(f) { for (const c of this.clients) c.unsubscribe(f); }

        /** Publica un objeto (o null = borrar mensaje retenido) en todos los brokers conectados. */
        publish(topic, obj, retain = false) {
            const payload = obj == null ? '' : JSON.stringify(Object.assign({ _m: this.id + '.' + (++this.seq) }, obj));
            let sent = 0;
            for (const c of this.clients) if (c.publish(topic, payload, retain)) sent++;
            return sent > 0;
        }

        _msg(topic, payload, retained) {
            let obj = null;
            if (payload) {
                try { obj = JSON.parse(payload); } catch (_) { return; }
                if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
                // Los retenidos se vuelven a entregar en cada suscripción: no se filtran
                if (!retained && obj._m) {
                    if (this.seen.has(obj._m)) return;
                    this.seen.set(obj._m, 1);
                    if (this.seen.size > 1000) { let n = 300; for (const k of this.seen.keys()) { this.seen.delete(k); if (!--n) break; } }
                }
            }
            this.emit('message', topic, obj, retained);
        }

        close() {
            this.closed = true;
            for (const c of this.clients) { clearTimeout(c._retryT); c.close(); }
            this._ev = {};
        }
    }

    const topics = (game) => {
        const base = `${config().TOPIC_ROOT}/${game}/v${PROTO}`;
        return {
            base,
            rooms: base + '/rooms/+',
            room: (code) => `${base}/rooms/${code}`,
            host: (code) => `${base}/h/${code}`,
            guest: (id) => `${base}/g/${id}`
        };
    };

    // ── Enlace con el otro jugador (WebRTC + retransmisión) ──
    class Link extends Emitter {
        constructor({ hub, me, peerTopic, initiator }) {
            super();
            this.hub = hub; this.me = me; this.peerTopic = peerTopic; this.initiator = initiator;
            this.cfg = config();
            this.mode = 'connecting';      // connecting | p2p | relay | closed
            this.ch = {};
            this.pc = null; this.pending = [];
            this.rtt = null;
            this.lastSeen = Date.now();
            this.timers = [];
        }

        start() {
            const useRtc = !this.cfg.FORCE_RELAY && typeof RTCPeerConnection === 'function';
            if (useRtc) {
                try { this._rtc(); } catch (e) { console.warn('[net] WebRTC no disponible', e); }
            }
            if (!this.pc && this.initiator) { this._useRelay(); }
            // Si el P2P no abre a tiempo, se pasa a retransmisión
            this.timers.push(setTimeout(() => { if (this.mode === 'connecting' && this.initiator) this._useRelay(); }, this.cfg.P2P_TIMEOUT));
            this.timers.push(setTimeout(() => { if (this.mode === 'connecting') this._useRelay(); }, this.cfg.P2P_TIMEOUT + 6000));
            this.timers.push(setInterval(() => this._beat(), 1000));
        }

        _rtc() {
            const pc = this.pc = new RTCPeerConnection({ iceServers: this.cfg.ICE_SERVERS });
            pc.onicecandidate = (e) => { if (e.candidate) this._sig({ t: 'ice', c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed' && this.mode === 'connecting' && this.initiator) this._useRelay();
            };
            if (this.initiator) {
                this._channel(pc.createDataChannel('r', { ordered: true }));
                this._channel(pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 }));
                pc.createOffer()
                    .then(o => pc.setLocalDescription(o))
                    .then(() => this._sig({ t: 'sdp', d: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } }))
                    .catch(e => { console.warn('[net] oferta', e); this._useRelay(); });
            } else {
                pc.ondatachannel = (e) => this._channel(e.channel);
            }
        }

        _channel(ch) {
            this.ch[ch.label] = ch;
            ch.onopen = () => this._checkOpen();
            ch.onmessage = (e) => { let o; try { o = JSON.parse(e.data); } catch (_) { return; } this._recv(o); };
            ch.onclose = () => { if (this.mode === 'p2p') this._useRelay(); };
        }

        _checkOpen() {
            const r = this.ch.r, u = this.ch.u;
            if (this.mode === 'connecting' && r && u && r.readyState === 'open' && u.readyState === 'open') {
                this.mode = 'p2p'; this.lastSeen = Date.now();
                this.emit('ready', 'p2p');
            }
        }

        _useRelay() {
            if (this.mode === 'closed' || this.mode === 'relay') return;
            const was = this.mode;
            this.mode = 'relay'; this.lastSeen = Date.now();
            if (this.initiator) this._sig({ t: 'relay' });
            if (was === 'connecting') this.emit('ready', 'relay'); else this.emit('mode', 'relay');
        }

        /** Mensajes de señalización recibidos por el broker. */
        async onSignal(m) {
            if (this.mode === 'closed') return;
            this.lastSeen = Date.now();
            try {
                if (m.t === 'd') { this._recv(m.d); return; }
                if (m.t === 'relay') { this._useRelay(); return; }
                if (!this.pc) return;
                if (m.t === 'sdp' && m.d) {
                    await this.pc.setRemoteDescription(m.d);
                    if (m.d.type === 'offer') {
                        const a = await this.pc.createAnswer();
                        await this.pc.setLocalDescription(a);
                        this._sig({ t: 'sdp', d: { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp } });
                    }
                    for (const c of this.pending.splice(0)) await this.pc.addIceCandidate(c).catch(() => {});
                } else if (m.t === 'ice' && m.c) {
                    if (this.pc.remoteDescription) await this.pc.addIceCandidate(m.c).catch(() => {});
                    else this.pending.push(m.c);
                }
            } catch (e) { console.warn('[net] señal', e); }
        }

        _sig(m) { m.from = this.me; this.hub.publish(this.peerTopic, m); }

        /** Envía un objeto al otro jugador. reliable = no se puede perder (eventos); si no, se descarta si se pierde (estado). */
        send(obj, reliable = false) {
            if (this.mode === 'closed') return;
            if (this.mode === 'p2p') {
                const ch = this.ch[reliable ? 'r' : 'u'];
                if (ch && ch.readyState === 'open') { try { ch.send(JSON.stringify(obj)); return; } catch (_) { /* cae a relay */ } }
            }
            if (this.mode === 'relay' || reliable) this._sig({ t: 'd', d: obj });
        }

        _recv(o) {
            if (!o || typeof o !== 'object' || this.mode === 'closed') return;
            this.lastSeen = Date.now();
            if (o.t === '_p') { this.send({ t: '_q', ts: o.ts }); return; }
            if (o.t === '_q') {
                const r = performance.now() - o.ts;
                if (r >= 0 && r < 10000) this.rtt = this.rtt == null ? r : this.rtt * 0.75 + r * 0.25;
                this.emit('rtt', this.rtt);
                return;
            }
            if (o.t === '_bye') { this._lost('left'); return; }
            this.emit('message', o);
        }

        _beat() {
            if (this.mode !== 'p2p' && this.mode !== 'relay') return;
            this.send({ t: '_p', ts: performance.now() });
            if (Date.now() - this.lastSeen > 10000) this._lost('timeout');
        }

        _lost(reason) {
            if (this.mode === 'closed') return;
            this.close(false);
            this.emit('lost', reason);
        }

        close(bye = true) {
            if (this.mode === 'closed') return;
            if (bye) { this.send({ t: '_bye' }, true); if (this.mode === 'p2p') this._sig({ t: 'd', d: { t: '_bye' } }); }
            this.mode = 'closed';
            this.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
            setTimeout(() => { try { this.pc && this.pc.close(); } catch (_) { /* noop */ } }, 120);
        }
    }

    // ── Anfitrión: "abre el servidor" en su navegador ────────
    class RoomHost extends Emitter {
        /** maxPlayers incluye al anfitrión (2 = un invitado; hasta 4 para juegos de mesa). */
        constructor({ game, info, isPublic = true, maxPlayers = 2 }) {
            super();
            this.game = game; this.T = topics(game);
            this.info = sanitizeInfo(info);
            this.isPublic = isPublic; this.maxPlayers = Math.max(2, Math.min(8, maxPlayers | 0 || 2));
            this.code = genCode();
            this.guests = new Map();          // id → { id, info, link, ready }
            this.locked = false;              // partida empezada: no entra nadie más
            this.closed = false;
            this.hub = new Hub({ will: isPublic ? { topic: this.T.room(this.code), payload: '', retain: true } : null });
        }

        async open() {
            await this.hub.start();
            this.hub.subscribe(this.T.host(this.code));
            this.hub.on('message', (t, m) => this._onMsg(t, m));
            this.hub.on('status', () => { this.emit('status', this.hub.online); this._list(); });
            this._list();
            this.listT = setInterval(() => this._list(), 20000);
            return this.code;
        }

        get full() { return this.guests.size >= this.maxPlayers - 1; }
        /** Primer invitado (compatibilidad con los juegos de 2 jugadores). */
        get guest() { const g = this.guests.values().next().value; return g ? { id: g.id, info: g.info } : null; }
        get link() { const g = this.guests.values().next().value; return g ? g.link : null; }
        get players() { return 1 + this.guests.size; }
        guestList() { return Array.from(this.guests.values()).map(g => ({ id: g.id, info: g.info, ready: !!g.ready })); }

        _list() {
            if (!this.isPublic || this.closed) return;
            if (this.full || this.locked) this.hub.publish(this.T.room(this.code), null, true);
            else this.hub.publish(this.T.room(this.code), { code: this.code, host: this.info, ts: Date.now(), v: PROTO, max: this.maxPlayers, n: this.players }, true);
        }

        /** Cierra (o reabre) la sala a nuevos jugadores, p. ej. al empezar la partida. */
        lock(on = true) { this.locked = !!on; this._list(); }

        _reply(id, m) { this.hub.publish(this.T.guest(id), Object.assign({ from: 'host' }, m)); }

        _onMsg(topic, m) {
            if (this.closed || topic !== this.T.host(this.code) || !m || typeof m.from !== 'string') return;
            if (m.t === 'hello') {
                if (m.v !== PROTO) { this._reply(m.from, { t: 'reject', reason: 'version' }); return; }
                if (this.guests.has(m.from)) { this._reply(m.from, { t: 'welcome', host: this.info, code: this.code }); return; }
                if (this.full || this.locked) { this._reply(m.from, { t: 'full' }); return; }
                const g = { id: m.from, info: sanitizeInfo(m.info), link: null, ready: false };
                this.guests.set(g.id, g);
                this._list();
                this._reply(m.from, { t: 'welcome', host: this.info, code: this.code });
                const link = g.link = new Link({ hub: this.hub, me: 'host', peerTopic: this.T.guest(m.from), initiator: true });
                const pub = { id: g.id, info: g.info };
                link.on('ready', (mode) => { g.ready = true; this.emit('guest', pub, mode); });
                link.on('mode', (mode) => this.emit('mode', mode, g.id));
                link.on('rtt', (r) => this.emit('rtt', r, g.id));
                link.on('message', (o) => this.emit('message', o, g.id));
                link.on('lost', (reason) => {
                    if (this.guests.get(g.id) !== g) return;
                    this.guests.delete(g.id);
                    this._list();
                    this.emit('guestLeft', pub, reason);
                });
                this.emit('joining', pub);
                link.start();
                return;
            }
            const g = this.guests.get(m.from);
            if (g && g.link) g.link.onSignal(m);
        }

        get mode() { const l = this.link; return l ? l.mode : 'waiting'; }
        get rtt() { const l = this.link; return l ? l.rtt : null; }
        /** Envía a un invitado (to = id) o a todos. */
        send(obj, reliable, to) {
            for (const g of this.guests.values()) if (g.link && (!to || g.id === to)) g.link.send(obj, reliable);
        }
        /** Echa a un invitado (o a todos). */
        kick(id) {
            for (const g of Array.from(this.guests.values())) {
                if (id && g.id !== id) continue;
                this.guests.delete(g.id);
                if (g.link) g.link.close();
            }
            this._list();
        }

        async close() {
            if (this.closed) return;
            for (const g of this.guests.values()) if (g.link) g.link.close();
            this.closed = true;
            clearInterval(this.listT);
            if (this.isPublic) this.hub.publish(this.T.room(this.code), null, true);
            await sleep(150);
            this.hub.close();
            this._ev = {};
        }
    }

    // ── Invitado ─────────────────────────────────────────────
    class RoomGuest extends Emitter {
        constructor({ game, code, info, hub }) {
            super();
            this.game = game; this.T = topics(game);
            this.code = normalizeCode(code);
            this.info = sanitizeInfo(info);
            this.id = rid(12);
            this.ownHub = !hub;
            this.hub = hub || new Hub();
            this.link = null; this.host = null;
            this.closed = false;
        }

        async join() {
            await this.hub.start();
            if (this.closed) return;
            const myTopic = this.T.guest(this.id);
            this.hub.subscribe(myTopic);
            this.unsub = this.hub.on('message', (t, m) => { if (t === myTopic && m && m.from === 'host') this._onMsg(m); });
            const hello = () => this.hub.publish(this.T.host(this.code), { t: 'hello', from: this.id, info: this.info, v: PROTO });
            hello();
            this.helloT = setInterval(() => { if (!this.host) hello(); }, 1500);
            this.failT = setTimeout(() => {
                if (!this.host && !this.closed) { this.emit('error', 'notfound'); this.close(); }
            }, 9000);
        }

        _onMsg(m) {
            if (this.closed) return;
            if (m.t === 'full' || m.t === 'reject') { this.emit('error', m.t === 'full' ? 'full' : 'version'); this.close(); return; }
            if (m.t === 'welcome') {
                if (this.host) return;
                clearInterval(this.helloT); clearTimeout(this.failT);
                this.host = sanitizeInfo(m.host);
                const link = this.link = new Link({ hub: this.hub, me: this.id, peerTopic: this.T.host(this.code), initiator: false });
                link.on('ready', (mode) => this.emit('ready', this.host, mode));
                link.on('mode', (mode) => this.emit('mode', mode));
                link.on('rtt', (r) => this.emit('rtt', r));
                link.on('message', (o) => this.emit('message', o));
                link.on('lost', (reason) => { this.emit('lost', reason); this.close(); });
                link.start();
                this.emit('welcome', this.host);
                return;
            }
            if (this.link) this.link.onSignal(m);
        }

        get mode() { return this.link ? this.link.mode : 'connecting'; }
        get rtt() { return this.link ? this.link.rtt : null; }
        send(obj, reliable) { if (this.link) this.link.send(obj, reliable); }

        close() {
            if (this.closed) return;
            this.closed = true;
            clearInterval(this.helloT); clearTimeout(this.failT);
            if (this.link) this.link.close();
            if (this.unsub) this.unsub();
            this.hub.unsubscribe(this.T.guest(this.id));
            if (this.ownHub) setTimeout(() => this.hub.close(), 150);
            setTimeout(() => { this._ev = {}; }, 0);
        }
    }

    // ── Buscador de salas públicas ──────────────────────────
    class RoomBrowser extends Emitter {
        constructor({ game, hub }) {
            super();
            this.T = topics(game);
            this.ownHub = !hub;
            this.hub = hub || new Hub();
            this.rooms = new Map();
            this.ttl = config().ROOM_TTL;
        }

        async start() {
            this.unsub = this.hub.on('message', (t, m) => this._onMsg(t, m));
            this.unsubS = this.hub.on('status', () => this.emit('status', this.hub.online, this.hub.total));
            this.pruneT = setInterval(() => this._prune(), 5000);
            await this.hub.start();
            this.hub.subscribe(this.T.rooms);
            this.emit('status', this.hub.online, this.hub.total);
        }

        _onMsg(topic, m) {
            const prefix = this.T.room('');
            if (!topic.startsWith(prefix)) return;
            const code = topic.slice(prefix.length);
            if (!m) { if (this.rooms.delete(code)) this._emit(); return; }
            if (m.v !== PROTO || m.code !== code || typeof m.ts !== 'number') return;
            if (Date.now() - m.ts > this.ttl) return;
            this.rooms.set(code, { code, host: sanitizeInfo(m.host), ts: m.ts, max: Math.max(2, m.max | 0 || 2), n: Math.max(1, m.n | 0 || 1) });
            this._emit();
        }

        _prune() {
            let changed = false;
            for (const [k, r] of this.rooms) if (Date.now() - r.ts > this.ttl) { this.rooms.delete(k); changed = true; }
            if (changed) this._emit();
        }

        _emit() { this.emit('rooms', this.list()); }
        list() { return Array.from(this.rooms.values()).sort((a, b) => b.ts - a.ts); }

        stop() {
            clearInterval(this.pruneT);
            if (this.unsub) this.unsub();
            if (this.unsubS) this.unsubS();
            this.hub.unsubscribe(this.T.rooms);
            if (this.ownHub) this.hub.close();
        }
    }

    Nexus.net = { PROTO, config, Hub, RoomHost, RoomGuest, RoomBrowser, normalizeCode, genCode, Emitter };
})();
