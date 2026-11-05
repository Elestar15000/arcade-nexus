/* ============================================================
   NEXUS ARCADE · games/chess/game.js
   Ajedrez: contra la máquina (4 niveles) u online 1 contra 1.
     · Tablero con arrastrar o tocar-y-tocar, jugadas legales
       marcadas, animaciones, última jugada, jaque, promoción con
       selector, tablero girado si llevas negras.
     · La IA piensa en un Web Worker (no congela la interfaz); si el
       navegador no lo permite, piensa en el hilo principal.
     · Online por turnos sobre el vestíbulo compartido: jugadas con
       número de orden (se resincroniza si algo se pierde), rendirse,
       ofrecer tablas y revancha alternando colores.
     · La partida contra la máquina se guarda y se recupera.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber } = Nexus.util;
    const Kit = Nexus.games.kit;
    const Core = Nexus.games.ChessCore;
    const C = Core();
    const { WHITE, BLACK, P, N, B, R, Q, K } = C;

    const LEVELS = [
        { id: 'easy', emoji: '🌱', label: 'Fácil', desc: 'Mira una sola jugada y se despista a menudo.', depth: 1, noise: 170, time: 400, mult: 1 },
        { id: 'normal', emoji: '⚔️', label: 'Normal', desc: 'Calcula un par de jugadas, con algún despiste.', depth: 2, noise: 40, time: 800, mult: 1.6 },
        { id: 'hard', emoji: '🔥', label: 'Difícil', desc: 'Calcula 4 jugadas y no regala material.', depth: 4, noise: 0, time: 1200, mult: 2.5 },
        { id: 'master', emoji: '💀', label: 'Maestro', desc: 'Hasta 2,5 s de cálculo por jugada. Juega para ganar.', depth: 14, noise: 0, time: 2500, mult: 4 }
    ];
    const GLYPH = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' };
    const NAMES = { 1: 'peón', 2: 'caballo', 3: 'alfil', 4: 'torre', 5: 'dama', 6: 'rey' };
    const REASONS = {
        mate: 'Jaque mate', stalemate: 'Rey ahogado', fifty: 'Regla de las 50 jugadas', repetition: 'Triple repetición',
        material: 'Material insuficiente', resign: 'Abandono', agreement: 'Tablas de mutuo acuerdo', forfeit: 'El rival se desconectó'
    };
    const glyph = (p) => GLYPH[p & 7] + '︎';

    // ── IA en un Web Worker (con alternativa en el hilo principal) ──
    const Engine = {
        worker: null, failed: false, pending: null, seq: 0,
        ensure() {
            if (this.worker || this.failed) return;
            try {
                const src = `const ChessCore = ${Core.toString()};
                    const C = ChessCore();
                    self.onmessage = (e) => {
                        const d = e.data;
                        try { const pos = C.replay(d.fen, d.moves); self.postMessage({ id: d.id, r: C.search(pos, d.opts) }); }
                        catch (err) { self.postMessage({ id: d.id, error: String(err) }); }
                    };`;
                const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
                this.worker = new Worker(url);
                this.worker.onmessage = (e) => {
                    const p = this.pending;
                    if (!p || p.id !== e.data.id) return;
                    this.pending = null;
                    if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.r);
                };
                this.worker.onerror = (e) => {
                    e.preventDefault && e.preventDefault();
                    this.failed = true; this.worker = null;
                    const p = this.pending; this.pending = null;
                    if (p) this.local(p);
                };
            } catch (_) { this.failed = true; this.worker = null; }
        },
        local(p) { setTimeout(() => { try { p.resolve(C.search(C.replay(p.fen, p.moves), p.opts)); } catch (err) { p.reject(err); } }, 30); },
        think(fen, moves, opts) {
            this.ensure();
            return new Promise((resolve, reject) => {
                const p = { id: ++this.seq, fen, moves: moves.slice(), opts, resolve, reject };
                if (this.worker) { this.pending = p; this.worker.postMessage({ id: p.id, fen, moves: p.moves, opts }); }
                else this.local(p);
            });
        },
        cancel() {
            if (this.pending && this.worker) { this.worker.terminate(); this.worker = null; }
            this.pending = null;
        }
    };

    class ChessGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.level = LEVELS[1];
            this.colorPref = 'white';
            this.kind = 'cpu';
            this.state = 'menu';
            this.myColor = WHITE;
            this.startFen = C.START;
            this.pos = C.Position.fromFen(C.START);
            this.moves = []; this.sans = [];
            this.lastMove = null;
            this.selected = -1;
            this.pieceEls = new Map();
            this.thinkSeq = 0; this.thinking = false;
            this.stats = this.newStats();
            this.build();
            this.bind();
            this.lobby = new Nexus.games.OnlineLobby({
                game: 'chess', el: this.$('#ch-online'), title: 'AJEDREZ ONLINE',
                roomNote: 'Los colores se sortean en la primera partida y se alternan en cada revancha.',
                startOptions: (round) => {
                    this.hostWhite = round === 1 ? Math.random() < 0.5 : !this.hostWhite;
                    return { hostWhite: this.hostWhite };
                },
                onStart: (ctx) => this.startOnline(ctx),
                onMessage: (m) => this.onNet(m),
                onLost: (info) => this.onPeerLost(info),
                onExit: () => this.showHome(),
                onStatus: () => this.updateSide()
            });
            this.renderBoard();
            this.updateSide();
            const code = Nexus.games.OnlineLobby.inviteCode('chess');
            if (code) { this.kind = 'online'; this.overlay.hidden = true; this.lobby.show(); this.lobby.join(code); }
            else if (!this.resumeSaved()) this.showHome();
            this.unsubSettings = Nexus.bus.on('settings:change', () => this.renderBoard());
        }

        newStats() { return { castled: false, promoted: false, ep: false, undos: 0, captures: 0 }; }

        // ── Plantilla ───────────────────────────────────────
        build() {
            this.root.innerHTML = `
            <div class="game ax-game chess" style="--ax-accent:#a78bfa;--ol-a:#e2e8f0;--ol-b:#a78bfa">
                ${Kit.header({ emoji: '♟️', title: 'Ajedrez', pills: [
                    { id: 'turn', icon: '⚪', init: 'Blancas', title: 'Turno' },
                    { id: 'move', icon: '#', init: '1', title: 'Jugada' },
                    { id: 'ping', icon: '📶', init: '–', title: 'Latencia' }] })}
                <div class="ch-body" id="ch-body">
                    <div class="ch-main">
                        <div class="ch-player" id="ch-top"></div>
                        <div class="ch-board-wrap" id="ch-wrap">
                            <div class="ch-board" id="ch-board" role="grid" aria-label="Tablero de ajedrez">
                                <div class="ch-squares" id="ch-squares"></div>
                                <div class="ch-pieces" id="ch-pieces" aria-hidden="true"></div>
                            </div>
                            <div class="ch-promo" id="ch-promo" hidden></div>
                        </div>
                        <div class="ch-player" id="ch-bottom"></div>
                    </div>
                    <aside class="ch-side">
                        <div class="ax-card ch-status-card">
                            <div class="ch-status" id="ch-status" role="status" aria-live="polite">–</div>
                            <div class="ch-offer" id="ch-offer" hidden></div>
                        </div>
                        <div class="ax-card ch-moves-card">
                            <h3>Jugadas</h3>
                            <ol class="ch-moves" id="ch-moves"></ol>
                        </div>
                        <div class="ax-card">
                            <div class="ch-actions">
                                <button class="btn btn-ghost" id="ch-undo" type="button" title="Deshace tu última jugada">↶ Deshacer</button>
                                <button class="btn btn-ghost" id="ch-flip" type="button" title="Girar el tablero">🔄 Girar</button>
                                <button class="btn btn-ghost" id="ch-draw" type="button">🤝 Ofrecer tablas</button>
                                <button class="btn btn-ghost" id="ch-resign" type="button">🏳️ Rendirse</button>
                                <button class="btn btn-ghost" id="ch-menu" type="button">☰ Menú</button>
                            </div>
                        </div>
                    </aside>
                    <div class="ax-overlay ch-overlay" id="ch-overlay"></div>
                    <div class="ol-overlay" id="ch-online" hidden></div>
                </div>
            </div>`;
            this.$ = (s) => this.root.querySelector(s);
            this.overlay = this.$('#ch-overlay');
            this.boardEl = this.$('#ch-board');
            this.squaresEl = this.$('#ch-squares');
            this.piecesEl = this.$('#ch-pieces');
            const sq = [];
            for (let i = 0; i < 64; i++) sq.push('<div class="ch-sq"></div>');
            this.squaresEl.innerHTML = sq.join('');
        }

        // ── Coordenadas de pantalla ─────────────────────────
        get flipped() { return this.myColor === BLACK ? !this.userFlip : !!this.userFlip; }
        /** Casilla 0x88 → (x, y) de pantalla. */
        xy(s) { const f = s & 7, r = s >> 4; return this.flipped ? { x: 7 - f, y: r } : { x: f, y: 7 - r }; }
        sqAt(x, y) { return this.flipped ? (y * 16 + (7 - x)) : ((7 - y) * 16 + x); }
        sqFromPoint(cx, cy) {
            const rc = this.boardEl.getBoundingClientRect();
            const x = Math.floor((cx - rc.left) / rc.width * 8), y = Math.floor((cy - rc.top) / rc.height * 8);
            if (x < 0 || x > 7 || y < 0 || y > 7) return -1;
            return this.sqAt(x, y);
        }

        // ── Pintado del tablero ─────────────────────────────
        renderBoard() {
            const showLegal = Nexus.services.settings.get('chess.showLegal') !== false;
            const legalTo = new Map();
            if (this.selected >= 0 && this.canMove()) for (const m of this.legalCache()) if (C.mFrom(m) === this.selected) legalTo.set(C.mTo(m), !!(C.mFlags(m) & C.F_CAP));
            const checkSq = this.pos.inCheck() ? this.pos.kings[this.pos.turn ? 1 : 0] : -1;
            const cells = this.squaresEl.children;
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                const s = this.sqAt(x, y), el = cells[y * 8 + x];
                const dark = ((s >> 4) + (s & 7)) % 2 === 0;
                let cls = 'ch-sq ' + (dark ? 'dark' : 'light');
                if (this.lastMove && (s === this.lastMove.from || s === this.lastMove.to)) cls += ' ch-last';
                if (s === this.selected) cls += ' ch-sel';
                if (s === checkSq) cls += ' ch-chk';
                if (showLegal && legalTo.has(s)) cls += legalTo.get(s) ? ' ch-cap' : ' ch-dot';
                el.className = cls;
                el.dataset.sq = s;
                const coord = [];
                if (x === 0) coord.push(`<i class="ch-rank">${(s >> 4) + 1}</i>`);
                if (y === 7) coord.push(`<i class="ch-file">${'abcdefgh'[s & 7]}</i>`);
                const html = coord.join('');
                if (el.innerHTML !== html) el.innerHTML = html;
                el.setAttribute('aria-label', C.sqName(s) + (this.pos.b[s] ? ' ' + NAMES[this.pos.b[s] & 7] + (this.pos.b[s] & 8 ? ' negro' : ' blanco') : ''));
            }
            this.syncPieces(null);
        }

        /** Coloca las piezas reutilizando los elementos (así se animan al moverse). */
        syncPieces(move) {
            const old = this.pieceEls, next = new Map();
            if (move) {
                const pairs = [[move.from, move.to]];
                if (move.castle) pairs.push(move.castle);
                for (const [f, t] of pairs) {
                    const el = old.get(f); if (!el) continue;
                    old.delete(f);
                    const victim = old.get(t);
                    if (victim) { old.delete(t); this.fadeOut(victim); }
                    next.set(t, el);
                }
            }
            for (let s = 0; s < 128; s++) {
                if (s & 0x88) { s += 7; continue; }
                const p = this.pos.b[s]; if (!p) continue;
                let el = next.get(s);
                if (!el) { el = old.get(s); if (el) old.delete(s); }
                if (!el) {
                    el = document.createElement('span');
                    el.className = 'ch-piece appear';
                    this.piecesEl.appendChild(el);
                    this.later(() => el.classList.remove('appear'), 20);
                }
                if (Number(el.dataset.p) !== p) {
                    el.dataset.p = p; el.textContent = glyph(p);
                    el.classList.toggle('w', !(p & 8)); el.classList.toggle('b', !!(p & 8));
                }
                const { x, y } = this.xy(s);
                el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
                el.dataset.sq = s;
                next.set(s, el);
            }
            for (const el of old.values()) this.fadeOut(el);
            this.pieceEls = next;
        }
        fadeOut(el) { el.classList.add('gone'); setTimeout(() => el.remove(), 260); }

        legalCache() {
            if (!this._legal || this._legalKey !== this.pos.key() + ':' + this.moves.length) { this._legal = this.pos.legal(); this._legalKey = this.pos.key() + ':' + this.moves.length; }
            return this._legal;
        }

        canMove() {
            return this.state === 'playing' && !this.thinking && this.pos.turn === this.myColor && this.$('#ch-promo').hidden;
        }

        // ── Entrada ─────────────────────────────────────────
        bind() {
            const board = this.boardEl;
            board.addEventListener('pointerdown', (e) => this.onDown(e));
            this.onMove = (e) => this.onDrag(e);
            this.onUp = (e) => this.onRelease(e);
            window.addEventListener('pointermove', this.onMove);
            window.addEventListener('pointerup', this.onUp);
            window.addEventListener('pointercancel', this.onUp);
            this.$('#ch-undo').addEventListener('click', () => this.undo());
            this.$('#ch-flip').addEventListener('click', () => { this.userFlip = !this.userFlip; this.renderBoard(); this.renderPlayers(); });
            this.$('#ch-resign').addEventListener('click', () => this.resign());
            this.$('#ch-draw').addEventListener('click', () => this.offerDraw());
            this.$('#ch-menu').addEventListener('click', () => this.openMenu());
            this.$('#ch-offer').addEventListener('click', (e) => {
                const b = e.target.closest('[data-offer]'); if (!b) return;
                this.answerDraw(b.dataset.offer === 'yes');
            });
            this.$('#ch-promo').addEventListener('click', (e) => {
                const b = e.target.closest('[data-promo]'); if (!b) return;
                const pr = Number(b.dataset.promo);
                const pend = this.promoPending; this.promoPending = null;
                this.$('#ch-promo').hidden = true;
                if (pr && pend) { const m = pend.find(x => C.mPromo(x) === pr); if (m) this.commit(m, 'me'); }
                else this.renderBoard();
            });
            this.overlay.addEventListener('click', (e) => this.onOverlay(e));
            this.onKey = (e) => {
                if (this.destroyed || document.querySelector('.modal-overlay.active')) return;
                if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
                if (e.key === 'Escape') {
                    if (!this.$('#ch-promo').hidden) { this.$('#ch-promo').hidden = true; this.promoPending = null; this.renderBoard(); }
                    else if (this.selected >= 0) { this.selected = -1; this.renderBoard(); }
                }
                if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && this.kind === 'cpu') { e.preventDefault(); this.undo(); }
            };
            document.addEventListener('keydown', this.onKey);
        }

        onDown(e) {
            if (e.button !== undefined && e.button !== 0) return;
            const s = this.sqFromPoint(e.clientX, e.clientY);
            if (s < 0 || !this.canMove()) return;
            const p = this.pos.b[s];
            // Clic en destino legal de la pieza seleccionada
            if (this.selected >= 0 && this.selected !== s && !(p && (p & 8) === this.myColor)) { this.tryMove(this.selected, s); return; }
            if (p && (p & 8) === this.myColor) {
                e.preventDefault();
                const wasSel = this.selected === s;
                this.selected = s;
                this.drag = { from: s, x: e.clientX, y: e.clientY, active: false, el: this.pieceEls.get(s), wasSel, id: e.pointerId };
                this.renderBoard();
            } else if (this.selected >= 0) { this.selected = -1; this.renderBoard(); }
        }

        onDrag(e) {
            const d = this.drag; if (!d || e.pointerId !== d.id) return;
            if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
            d.active = true;
            const rc = this.boardEl.getBoundingClientRect(), size = rc.width / 8;
            if (d.el) {
                d.el.classList.add('drag');
                d.el.style.transform = `translate(${e.clientX - rc.left - size / 2}px, ${e.clientY - rc.top - size / 2}px) scale(1.12)`;
            }
        }

        onRelease(e) {
            const d = this.drag; if (!d || (e.pointerId !== undefined && e.pointerId !== d.id)) return;
            this.drag = null;
            if (d.el) d.el.classList.remove('drag');
            if (d.active) {
                const to = this.sqFromPoint(e.clientX, e.clientY);
                if (to >= 0 && to !== d.from && this.tryMove(d.from, to)) return;
                this.syncPieces(null);
                return;
            }
            if (d.wasSel) { this.selected = -1; this.renderBoard(); }   // segundo toque en la misma pieza: deselecciona
        }

        tryMove(from, to) {
            const cands = this.legalCache().filter(m => C.mFrom(m) === from && C.mTo(m) === to);
            if (!cands.length) {
                const p = this.pos.b[to];
                this.selected = p && (p & 8) === this.myColor ? to : -1;
                this.renderBoard();
                return false;
            }
            if (cands.length > 1) { this.askPromotion(cands, to); return true; }
            this.commit(cands[0], 'me');
            return true;
        }

        askPromotion(cands, to) {
            this.promoPending = cands;
            this.syncPieces(null);
            const { x, y } = this.xy(to);
            const box = this.$('#ch-promo');
            const c = this.myColor;
            box.style.left = `${x * 12.5}%`;
            box.dataset.side = y === 0 ? 'top' : 'bottom';
            box.innerHTML = [Q, R, B, N].map(t => `<button type="button" class="ch-piece-btn ${c ? 'b' : 'w'}" data-promo="${t}" aria-label="Coronar ${NAMES[t]}">${glyph(t | c)}</button>`).join('')
                + '<button type="button" class="ch-promo-x" data-promo="0" aria-label="Cancelar">✕</button>';
            box.hidden = false;
        }

        // ── Jugadas ─────────────────────────────────────────
        commit(m, by) {
            const pos = this.pos, from = C.mFrom(m), to = C.mTo(m), fl = C.mFlags(m);
            const mover = pos.b[from];
            const san = pos.san(m);
            const uci = pos.uci(m);
            const isMine = (mover & 8) === this.myColor;
            pos.make(m);
            this.moves.push(uci); this.sans.push(san);
            this.selected = -1;
            const castle = fl & C.F_CASTLE ? (to === 6 ? [7, 5] : to === 2 ? [0, 3] : to === 118 ? [119, 117] : [112, 115]) : null;
            this.lastMove = { from, to };
            if (isMine) {
                if (castle) this.stats.castled = true;
                if (C.mPromo(m)) this.stats.promoted = true;
                if (fl & C.F_EP) this.stats.ep = true;
                if (fl & C.F_CAP) this.stats.captures++;
            }
            this.renderBoardMove({ from, to, castle });
            const check = pos.inCheck();
            Nexus.audio.play(check ? 'chessCheck' : castle ? 'chessCastle' : (fl & C.F_CAP) ? 'chessCapture' : 'chessMove');
            if (this.kind === 'online' && by === 'me' && this.lobby) this.lobby.send({ t: 'mv', n: this.moves.length, u: uci });
            if (this.offerShown && by !== 'sync') this.clearOffer();
            this.save();
            this.updateSide();
            const st = pos.status();
            if (st.over) { this.finish(st.result, st.reason); return; }
            if (this.kind === 'cpu' && pos.turn !== this.myColor) this.think();
        }

        renderBoardMove(move) {
            // Piezas primero (con animación), después casillas
            this.syncPieces(move);
            this.renderBoard();
        }

        think() {
            const token = ++this.thinkSeq;
            this.thinking = true;
            this.updateSide();
            const L = this.level, t0 = Date.now();
            Engine.think(this.startFen, this.moves, { depth: L.depth, time: L.time, noise: L.noise }).then((r) => {
                if (token !== this.thinkSeq || this.destroyed || this.state !== 'playing') return;
                const wait = Math.max(0, 380 - (Date.now() - t0));
                this.later(() => {
                    if (token !== this.thinkSeq || this.state !== 'playing') return;
                    this.thinking = false;
                    const m = r && r.move ? this.pos.fromUci(r.move) : 0;
                    if (m) this.commit(m, 'cpu'); else this.updateSide();
                }, wait);
            }).catch((err) => {
                console.error('[chess] IA', err);
                if (token !== this.thinkSeq) return;
                this.thinking = false;
                const legal = this.pos.legal();
                if (legal.length && this.state === 'playing') this.commit(legal[Math.floor(Math.random() * legal.length)], 'cpu');
            });
        }

        undo() {
            if (this.kind !== 'cpu' || this.state !== 'playing' || !this.moves.length) return;
            if (this.thinking) { this.thinkSeq++; Engine.cancel(); this.thinking = false; }
            const list = this.moves.slice();
            // Quita hasta la última jugada propia (y la respuesta de la CPU si la hubo)
            do { list.pop(); } while (list.length && C.replay(this.startFen, list).turn !== this.myColor);
            if (C.replay(this.startFen, list).turn !== this.myColor) return;
            this.stats.undos++;
            this.rebuild(list);
            Nexus.audio.play('flip');
            this.save();
        }

        rebuild(list) {
            this.pos = C.replay(this.startFen, list);
            this.moves = list.slice();
            const tmp = C.Position.fromFen(this.startFen);
            this.sans = list.map(u => { const m = tmp.fromUci(u); const s = tmp.san(m); tmp.make(m); return s; });
            const last = list[list.length - 1];
            this.lastMove = last ? { from: C.sqOf(last.slice(0, 2)), to: C.sqOf(last.slice(2, 4)) } : null;
            this.selected = -1;
            this.renderBoard(); this.updateSide();
        }

        // ── Partidas ────────────────────────────────────────
        newGame(kind, myColor) {
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.thinkSeq++; Engine.cancel(); this.thinking = false;
            this.kind = kind;
            this.myColor = myColor;
            this.userFlip = false;
            this.startFen = C.START;
            this.pos = C.Position.fromFen(C.START);
            this.moves = []; this.sans = []; this.lastMove = null; this.selected = -1;
            this.stats = this.newStats();
            this.clearOffer();
            this.state = 'playing';
            this.overlay.hidden = true;
            this.$('#ch-promo').hidden = true;
            this.renderBoard(); this.updateSide(); this.renderPlayers();
            Nexus.audio.play('tdRound');
            if (kind === 'cpu') { this.save(); if (this.pos.turn !== this.myColor) this.think(); }
        }

        startCpu() {
            const c = this.colorPref === 'random' ? (Math.random() < 0.5 ? WHITE : BLACK) : this.colorPref === 'black' ? BLACK : WHITE;
            this.newGame('cpu', c);
        }

        saveKey() { const u = Nexus.services.users.current(); return u ? `run:${u.id}:chess` : null; }
        save() {
            const k = this.saveKey(); if (!k) return;
            if (this.kind !== 'cpu' || this.state !== 'playing') { Nexus.storage.remove(k); return; }
            Nexus.storage.set(k, { v: 1, at: Date.now(), level: this.level.id, color: this.myColor, fen: this.startFen, moves: this.moves, stats: this.stats });
        }
        resumeSaved() {
            const k = this.saveKey(); if (!k) return false;
            const r = Nexus.storage.get(k);
            if (!r || r.v !== 1 || !Array.isArray(r.moves)) return false;
            try {
                this.level = LEVELS.find(l => l.id === r.level) || this.level;
                this.kind = 'cpu'; this.myColor = r.color === BLACK ? BLACK : WHITE;
                this.startFen = r.fen || C.START;
                this.stats = Object.assign(this.newStats(), r.stats || {});
                this.state = 'playing';
                this.overlay.hidden = true;
                this.rebuild(r.moves);
                this.renderPlayers();
                Nexus.ui.toast('Partida recuperada', { icon: '♟️' });
                if (this.pos.status().over) { Nexus.storage.remove(k); this.showHome(); return true; }
                if (this.pos.turn !== this.myColor) this.think();
                return true;
            } catch (_) { Nexus.storage.remove(k); return false; }
        }

        resign() {
            if (this.state !== 'playing') return;
            Nexus.ui.modal.confirm({
                title: 'Rendirse', icon: '🏳️', danger: true, confirmLabel: 'Rendirme',
                message: 'La partida contará como derrota.'
            }).then(ok => {
                if (!ok || this.destroyed || this.state !== 'playing') return;
                if (this.kind === 'online') this.lobby.send({ t: 'resign' });
                this.finish(this.myColor === WHITE ? '0-1' : '1-0', 'resign');
            });
        }

        offerDraw() {
            if (this.state !== 'playing') return;
            if (this.kind === 'cpu') {
                // La máquina acepta si no va ganando (según una búsqueda rápida)
                if (this.thinking) return;
                const r = C.search(C.replay(this.startFen, this.moves), { depth: 3, time: 300 });
                const cpuScore = this.pos.turn === this.myColor ? -r.score : r.score;
                if (cpuScore <= 30 && this.moves.length >= 20) { Nexus.ui.toast('La CPU acepta las tablas', { icon: '🤝' }); this.finish('1/2-1/2', 'agreement'); }
                else Nexus.ui.toast(this.moves.length < 20 ? 'La CPU no acepta tablas tan pronto' : 'La CPU rechaza las tablas: cree que va ganando', { icon: '🤖' });
                return;
            }
            if (this.drawSent) return;
            this.drawSent = true;
            this.lobby.send({ t: 'draw?' });
            Nexus.ui.toast('Has ofrecido tablas', { icon: '🤝' });
            this.updateSide();
        }

        answerDraw(yes) {
            this.clearOffer();
            if (this.state !== 'playing') return;
            this.lobby.send({ t: yes ? 'draw!' : 'draw-no' });
            if (yes) this.finish('1/2-1/2', 'agreement');
        }

        clearOffer() { this.offerShown = false; this.drawSent = false; const o = this.$('#ch-offer'); if (o) { o.hidden = true; o.innerHTML = ''; } }

        // ── Online ──────────────────────────────────────────
        startOnline({ role, opts }) {
            const hostWhite = !!opts.hostWhite;
            this.newGame('online', (role === 'host') === hostWhite ? WHITE : BLACK);
            // Latido: cada 4 s se anuncia cuántas jugadas hay; si el otro tiene menos, pide sincronizar
            clearInterval(this.plyBeat);
            this.plyBeat = setInterval(() => { if (this.state === 'playing' && this.kind === 'online') this.lobby.send({ t: 'ply', n: this.moves.length }); }, 4000);
            Nexus.ui.toast(this.myColor === WHITE ? 'Juegas con blancas: empiezas tú' : 'Juegas con negras', { icon: this.myColor === WHITE ? '⚪' : '⚫' });
        }

        onNet(m) {
            if (m.t === 'mv') {
                if (this.state !== 'playing' || typeof m.n !== 'number') return;
                if (m.n <= this.moves.length) return;                     // repetido
                if (m.n > this.moves.length + 1) { this.lobby.send({ t: 'sync?' }); return; }
                if (this.pos.turn === this.myColor) { this.lobby.send({ t: 'sync?' }); return; }
                const mv = this.pos.fromUci(m.u);
                if (!mv) { this.lobby.send({ t: 'sync?' }); return; }
                this.commit(mv, 'peer');
            } else if (m.t === 'ply') {
                if (this.state === 'playing' && typeof m.n === 'number' && m.n > this.moves.length) this.lobby.send({ t: 'sync?' });
            } else if (m.t === 'sync?') {
                this.lobby.send({ t: 'sync', moves: this.moves });
            } else if (m.t === 'sync') {
                if (!Array.isArray(m.moves) || this.state !== 'playing') return;
                const mine = this.moves;
                const extends_ = m.moves.length > mine.length && mine.every((u, i) => m.moves[i] === u);
                if (this.lobby.role === 'guest' || extends_) {
                    try { this.rebuild(m.moves); const st = this.pos.status(); if (st.over) this.finish(st.result, st.reason); } catch (_) { /* lista inválida */ }
                }
            } else if (m.t === 'resign') {
                if (this.state === 'playing') this.finish(this.myColor === WHITE ? '1-0' : '0-1', 'resign');
            } else if (m.t === 'draw?') {
                if (this.state !== 'playing') return;
                this.offerShown = true;
                const o = this.$('#ch-offer');
                o.hidden = false;
                o.innerHTML = `<p>🤝 <b>${esc((this.lobby.peer && this.lobby.peer.name) || 'Tu rival')}</b> ofrece tablas</p>
                    <div class="ch-offer-btns"><button class="btn btn-primary" data-offer="yes" type="button">Aceptar</button><button class="btn btn-ghost" data-offer="no" type="button">Rechazar</button></div>`;
                Nexus.audio.play('achievement');
            } else if (m.t === 'draw!') {
                if (this.state === 'playing') { Nexus.ui.toast('Tablas aceptadas', { icon: '🤝' }); this.finish('1/2-1/2', 'agreement'); }
            } else if (m.t === 'draw-no') {
                this.drawSent = false;
                Nexus.ui.toast('Tu rival rechaza las tablas', { icon: '✋' });
                this.updateSide();
            }
        }

        onPeerLost({ wasPlaying }) {
            if (wasPlaying && this.state === 'playing' && this.kind === 'online') this.finish(this.myColor === WHITE ? '1-0' : '0-1', 'forfeit');
            this.updateSide();
        }

        // ── Fin ─────────────────────────────────────────────
        finish(result, reason) {
            if (this.state !== 'playing') return;
            this.state = 'over';
            this.thinkSeq++; Engine.cancel(); this.thinking = false;
            clearInterval(this.plyBeat);
            this.clearOffer();
            const online = this.kind === 'online';
            if (online) this.lobby.gameOver();
            this.save();
            const draw = result === '1/2-1/2';
            const won = !draw && ((result === '1-0') === (this.myColor === WHITE));
            const mode = online ? 'online' : this.level.id;
            const mult = online ? 2 : this.level.mult;
            const myMoves = Math.ceil(this.moves.length / 2);
            const score = Math.round((won ? 1000 + Math.max(0, 60 - myMoves) * 12 : draw ? 300 : 40) * mult);
            const xp = Math.round((won ? 60 : draw ? 25 : 10) * mult);
            const result_ = Nexus.services.progress.recordGame({
                game: 'chess', mode, won, score, time: 0, xp,
                extra: { draw, reason, moves: myMoves, online, level: mode, color: this.myColor === WHITE ? 'w' : 'b', ...this.stats },
                updateExtra: (x) => { if (draw) x.draws = (x.draws || 0) + 1; }
            });
            this.updateSide();
            Nexus.audio.play(won ? 'win' : draw ? 'achievement' : 'lose');
            const foe = online ? ((this.lobby.peer && this.lobby.peer.name) || 'tu rival') : `la CPU (${this.level.label})`;
            const title = won ? '¡VICTORIA!' : draw ? 'TABLAS' : 'DERROTA';
            const actions = online ? [
                { label: '🔄 Revancha', kind: 'primary', onClick: () => this.later(() => this.lobby.ready(), 50) },
                { label: '🚪 Salir de la sala', kind: 'ghost', onClick: () => this.later(() => { this.lobby.leave(); this.lobby.show(); }, 50) }
            ] : [
                { label: '🔄 Otra partida', kind: 'primary', onClick: () => this.later(() => this.startCpu(), 50) },
                { label: '☰ Cambiar nivel', kind: 'ghost', onClick: () => this.later(() => this.showCpu(), 50) },
                { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
            ];
            this.later(() => {
                if (this.destroyed) return;
                const rm = this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: won ? '🏆' : draw ? '🤝' : '♟️', kind: won ? 'win' : draw ? '' : 'lose', title,
                    subtitle: `${REASONS[reason] || ''} · contra ${foe}`,
                    stats: [
                        { label: 'Resultado', value: result.replace('1/2', '½').replace('1/2', '½') },
                        { label: 'Jugadas', value: String(myMoves) },
                        { label: 'Capturas', value: String(this.stats.captures) },
                        { label: 'Puntuación', value: formatNumber(score) }
                    ],
                    result: result_, actions
                });
                if (online && rm && rm.closed) rm.closed.then(() => { if (this.resultModal === rm) this.resultModal = null; if (!this.destroyed && this.state === 'over' && this.lobby.active === false) this.lobby.afterGame(); });
            }, reason === 'mate' ? 900 : 400);
        }

        // ── Menús ───────────────────────────────────────────
        showHome() {
            this.state = this.state === 'playing' ? 'playing' : 'menu';
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <div class="ch-logo"><span>♞</span> AJEDREZ</div>
                <p class="ax-sub">Jaque mate al rey rival. Contra la máquina o contra otra persona online.</p>
                <div class="ch-choices">
                    <button type="button" class="ch-choice" data-do="go-cpu"><span>🤖</span><strong>Contra la máquina</strong><small>4 niveles, de Fácil a Maestro</small></button>
                    <button type="button" class="ch-choice" data-do="go-online"><span>🌐</span><strong>Online 1 contra 1</strong><small>Crea una sala o entra con un código</small></button>
                </div>
                ${this.state === 'playing' ? '<div class="ax-play-row"><button class="btn btn-ghost" data-do="close" type="button">▶ Volver a la partida</button></div>' : ''}
            </div>`;
        }

        showCpu() {
            if (this.state !== 'playing') this.state = 'menu';
            const ms = Nexus.services.progress.stats('chess').byMode[this.level.id];
            const rec = ms && ms.played ? `Contra ${esc(this.level.label)}: <b>${ms.wins}</b> victorias en ${ms.played} partidas` : `Aún no has jugado contra el nivel ${esc(this.level.label)}`;
            const col = (id, label) => `<button type="button" class="${this.colorPref === id ? 'active' : ''}" data-color="${id}" role="radio" aria-checked="${this.colorPref === id}">${label}</button>`;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">CONTRA LA MÁQUINA</h2>
                ${Kit.modeCards(LEVELS.map(l => ({ ...l, desc: l.desc + ' (×' + String(l.mult).replace('.', ',') + ')' })), this.level.id)}
                <div class="ch-color segmented" role="radiogroup" aria-label="Color">${col('white', '⚪ Blancas')}${col('random', '🎲 Al azar')}${col('black', '⚫ Negras')}</div>
                <div class="ax-best">${rec}</div>
                <div class="ax-play-row">
                    <button class="btn btn-ghost" data-do="home" type="button">← Volver</button>
                    <button class="btn btn-primary btn-glow" data-do="start" type="button">▶ Jugar · ${esc(this.level.label)}</button>
                </div>
            </div>`;
        }

        openMenu() {
            if (this.kind === 'online' && this.state === 'playing') { Nexus.ui.toast('En una partida online puedes rendirte u ofrecer tablas', { icon: 'ℹ️' }); return; }
            if (this.kind === 'online' && this.lobby.net) { this.lobby.showRoom(); return; }
            this.showHome();
        }

        onOverlay(e) {
            const lv = e.target.closest('[data-mode]');
            if (lv) { this.level = LEVELS.find(l => l.id === lv.dataset.mode) || this.level; Nexus.audio.play('click'); this.showCpu(); return; }
            const col = e.target.closest('[data-color]');
            if (col) { this.colorPref = col.dataset.color; Nexus.audio.play('click'); this.showCpu(); return; }
            const b = e.target.closest('[data-do]'); if (!b) return;
            Nexus.audio.play('click');
            const d = b.dataset.do;
            if (d === 'go-cpu') this.showCpu();
            else if (d === 'go-online') {
                if (this.state === 'playing' && this.kind === 'cpu') this.save();
                this.overlay.hidden = true; this.lobby.show();
            } else if (d === 'home') this.showHome();
            else if (d === 'start') this.startCpu();
            else if (d === 'close') this.overlay.hidden = true;
        }

        // ── Panel lateral y jugadores ───────────────────────
        material() {
            const start = { 1: 8, 2: 2, 3: 2, 4: 2, 5: 1 };
            const cnt = [{}, {}];
            for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = this.pos.b[s]; if (p && (p & 7) !== K) { const c = p & 8 ? 1 : 0; cnt[c][p & 7] = (cnt[c][p & 7] || 0) + 1; } }
            const lost = [[], []];
            for (let c = 0; c < 2; c++) for (const t of [5, 4, 3, 2, 1]) { const n = Math.max(0, start[t] - (cnt[c][t] || 0)); for (let i = 0; i < n; i++) lost[c].push(t); }
            const val = (c) => [1, 2, 3, 4, 5].reduce((s, t) => s + (cnt[c][t] || 0) * [0, 1, 3, 3, 5, 9][t], 0);
            return { lost, diff: val(0) - val(1) };
        }

        renderPlayers() {
            const me = Nexus.games.OnlineLobby.myInfo();
            const online = this.kind === 'online';
            const peer = online ? (this.lobby.peer || { name: 'Rival', avatar: '❔' }) : { name: `CPU · ${this.level.label}`, avatar: '🤖' };
            const mat = this.material();
            const card = (info, color, isMe) => {
                const c = color === WHITE ? 0 : 1;
                const caps = mat.lost[1 - c];       // piezas del rival que ha capturado este jugador
                const adv = c === 0 ? mat.diff : -mat.diff;
                const turn = this.state === 'playing' && this.pos.turn === color;
                return `<span class="ch-pl-av">${esc(info.avatar)}</span>
                    <span class="ch-pl-info"><b>${esc(info.name)}${isMe ? ' <small>(tú)</small>' : ''}</b>
                        <span class="ch-caps ${c ? 'w' : 'b'}">${caps.map(t => glyph(t | (c ? WHITE : BLACK))).join('')}${adv > 0 ? ` <em>+${adv}</em>` : ''}</span></span>
                    <span class="ch-pl-color ${c ? 'b' : 'w'}${turn ? ' turn' : ''}" title="${c ? 'Negras' : 'Blancas'}"></span>
                    ${!isMe && this.thinking ? '<span class="ch-thinking"><i></i><i></i><i></i></span>' : ''}`;
            };
            const topColor = this.flipped ? WHITE : BLACK, bottomColor = topColor ^ 8;
            const top = this.$('#ch-top'), bottom = this.$('#ch-bottom');
            const mineTop = topColor === this.myColor;
            top.innerHTML = card(mineTop ? me : peer, topColor, mineTop);
            bottom.innerHTML = card(mineTop ? peer : me, bottomColor, !mineTop);
            top.classList.toggle('turn', this.state === 'playing' && this.pos.turn === topColor);
            bottom.classList.toggle('turn', this.state === 'playing' && this.pos.turn === bottomColor);
        }

        updateSide() {
            const pos = this.pos, playing = this.state === 'playing';
            const set = (sel, v) => { const el = this.root.querySelector(sel); if (el && el.textContent !== v) el.textContent = v; };
            const turnW = pos.turn === WHITE;
            const pill = this.root.querySelector('[data-pill="turn"]');
            if (pill) { pill.textContent = turnW ? 'Blancas' : 'Negras'; pill.previousElementSibling.textContent = turnW ? '⚪' : '⚫'; }
            set('[data-pill="move"]', String(pos.full));
            const online = this.kind === 'online';
            set('[data-pill="ping"]', online && this.lobby.rtt != null ? Math.round(this.lobby.rtt) + ' ms' : '–');
            // Estado
            let st;
            if (this.state === 'over') st = '🏁 Partida terminada';
            else if (this.state !== 'playing') st = 'Elige un modo para empezar';
            else if (this.thinking) st = '🤖 La CPU está pensando…';
            else if (pos.turn === this.myColor) st = pos.inCheck() ? '⚠️ ¡Jaque! Te toca mover' : `Te toca mover (${turnW ? 'blancas' : 'negras'})`;
            else st = online ? `Turno de ${(this.lobby.peer && this.lobby.peer.name) || 'tu rival'}…` : 'Turno de la CPU';
            if (playing && pos.inCheck() && pos.turn !== this.myColor) st += ' · ¡Jaque!';
            set('#ch-status', st);
            this.$('#ch-status').classList.toggle('check', playing && pos.inCheck());
            // Jugadas
            const rows = [];
            const offset = this.startFen.split(' ')[1] === 'b' ? 1 : 0;
            const all = offset ? ['…'].concat(this.sans) : this.sans;
            const cell = (k) => all[k] === undefined ? '' : `<span${k === all.length - 1 ? ' class="last"' : ''}>${esc(all[k])}</span>`;
            for (let i = 0; i < all.length; i += 2) rows.push(`<li>${cell(i)}${cell(i + 1)}</li>`);
            const ml = this.$('#ch-moves');
            const html = rows.join('') || '<li class="ch-empty">Aún no hay jugadas</li>';
            if (ml.innerHTML !== html) { ml.innerHTML = html; ml.scrollTop = ml.scrollHeight; }
            // Botones
            this.$('#ch-undo').hidden = online;
            this.$('#ch-undo').disabled = !playing || !this.moves.length;
            this.$('#ch-resign').disabled = !playing;
            this.$('#ch-draw').disabled = !playing || !!this.drawSent;
            this.$('#ch-draw').textContent = this.drawSent ? '🤝 Tablas ofrecidas' : '🤝 Ofrecer tablas';
            this.renderPlayers();
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id); return id;
        }

        destroy() {
            if (this.state === 'playing' && this.kind === 'cpu') this.save();
            if (this.state === 'playing' && this.kind === 'online') {
                // Salir a mitad de partida online cuenta como derrota
                this.state = 'over';
                const myMoves = Math.ceil(this.moves.length / 2);
                Nexus.services.progress.recordGame({ game: 'chess', mode: 'online', won: false, score: 0, time: 0, xp: 5,
                    extra: { draw: false, reason: 'resign', moves: myMoves, online: true, level: 'online', ...this.stats } });
            }
            this.destroyed = true;
            this.thinkSeq++; Engine.cancel();
            clearInterval(this.plyBeat);
            window.removeEventListener('pointermove', this.onMove);
            window.removeEventListener('pointerup', this.onUp);
            window.removeEventListener('pointercancel', this.onUp);
            document.removeEventListener('keydown', this.onKey);
            if (this.unsubSettings) this.unsubSettings();
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
            this.lobby.destroy();
        }
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'chess') ? c.event : null;
    const cpuWin = (c, modes) => { const e = ev(c); return !!e && e.won && !e.extra.online && modes.includes(e.mode); };
    A.register([
        { id: 'ch_first', game: 'chess', name: 'Primer jaque mate', desc: 'Gana una partida a la máquina.', icon: '♟️', rarity: 'common',
            test: (c) => cpuWin(c, ['easy', 'normal', 'hard', 'master']) },
        { id: 'ch_normal', game: 'chess', name: 'Aficionado', desc: 'Gana a la máquina en Normal o superior.', icon: '⚔️', rarity: 'rare',
            test: (c) => cpuWin(c, ['normal', 'hard', 'master']) },
        { id: 'ch_hard', game: 'chess', name: 'Maestro de club', desc: 'Gana a la máquina en Difícil o superior.', icon: '🔥', rarity: 'epic',
            test: (c) => cpuWin(c, ['hard', 'master']) },
        { id: 'ch_master', game: 'chess', name: 'Gran Maestro', desc: 'Gana a la máquina en Maestro.', icon: '👑', rarity: 'legendary',
            test: (c) => cpuWin(c, ['master']) },
        { id: 'ch_fast', game: 'chess', name: 'Golpe fulminante', desc: 'Da jaque mate en 25 jugadas o menos.', icon: '⚡', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.won && e.extra.reason === 'mate' && e.extra.moves <= 25; } },
        { id: 'ch_castle', game: 'chess', name: 'Al refugio', desc: 'Enroca en una partida.', icon: '🏰', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.castled; } },
        { id: 'ch_promo', game: 'chess', name: 'Ascenso', desc: 'Corona un peón.', icon: '👸', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.promoted; } },
        { id: 'ch_ep', game: 'chess', name: 'Al paso', desc: 'Captura un peón al paso.', icon: '🥷', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.ep; } },
        { id: 'ch_draw', game: 'chess', name: 'Resistencia', desc: 'Consigue tablas contra la máquina en Difícil o Maestro.', icon: '🤝', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.draw && ['hard', 'master'].includes(e.mode); } },
        { id: 'ch_online', game: 'chess', name: 'Ajedrez por correspondencia', desc: 'Juega una partida online.', icon: '🌐', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.online; } },
        { id: 'ch_online_win', game: 'chess', name: 'Jaque en la red', desc: 'Gana una partida online por jaque mate.', icon: '🏆', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.online && e.won && e.extra.reason === 'mate'; } },
        { id: 'ch_online10', game: 'chess', name: 'Campeón online', desc: 'Gana 10 partidas online.', icon: '🥇', rarity: 'epic',
            ...A.counter((c) => ((c.stats('chess').byMode || {}).online || {}).wins || 0, 10) }
    ]);

    Nexus.games.registry.register({
        id: 'chess', name: 'Ajedrez', emoji: '♟️', accent: '#a78bfa',
        tagline: 'Contra la máquina · Online 1 contra 1',
        description: 'Ajedrez completo (enroques, al paso, promoción, tablas) con motor propio. Juega contra la IA en 4 niveles o contra otra persona online creando una sala o entrando con un código.',
        tags: ['Estrategia', 'Multijugador'],
        modes: LEVELS.map(l => ({ id: l.id, label: l.label })).concat([{ id: 'online', label: 'Online' }]),
        metrics: [{ id: 'wins', label: 'Victorias' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new ChessGame(root)
    });
})();
