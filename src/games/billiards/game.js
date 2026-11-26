/* ============================================================
   NEXUS ARCADE · games/billiards/game.js — Billar (bola 8)
     · Contra la CPU (Fácil, Normal, Difícil, Maestro)
     · Online 1 contra 1 (vestíbulo compartido)
     · Práctica: mete las 15 bolas en el menor número de tiros
   Controles: apuntar con el ratón (o arrastrando el dedo), fuerza
   arrastrando hacia atrás o con la barra, efecto en la bola blanca
   del panel. Teclado: ← → apuntar (Mayús: fino), ↑ ↓ fuerza,
   espacio para tirar.
   Online: quien tira manda el golpe; los dos lo simulan a la vez y
   al terminar quien tiró manda el resultado (posiciones y reglas),
   que el otro adopta.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber, formatTime } = Nexus.util;
    const Kit = Nexus.games.kit;
    const L = Nexus.games.billiardsLogic;
    const { W, H, R, POCKETS, COLORS } = L;
    const RL = 46;                                  // ancho de la banda de madera (+ almohadilla)
    const LW = W + RL * 2, LH = H + RL * 2;
    const TURN_TIME = 60;                           // segundos por tiro online
    const ACCENT = '#34d399';

    const LEVELS = [
        { id: 'easy', emoji: '🌱', label: 'Fácil', desc: 'Apunta a ojo y falla a menudo.', mult: 1 },
        { id: 'normal', emoji: '🎯', label: 'Normal', desc: 'Elige buenas bolas y comprueba el tiro.', mult: 1.6 },
        { id: 'hard', emoji: '🔥', label: 'Difícil', desc: 'Precisa, usa efecto y casi no comete faltas.', mult: 2.5 },
        { id: 'master', emoji: '💀', label: 'Maestro', desc: 'Juega la posición para la siguiente bola.', mult: 4 }
    ];
    const REASONS = { eight: 'Bola 8 metida', eightEarly: 'Bola 8 metida antes de tiempo', eightFoul: 'Bola 8 metida con falta',
        resign: 'Abandono', forfeit: 'El rival abandonó la partida', cleared: 'Mesa limpia' };

    class BilliardsGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.level = LEVELS[1];
            this.kind = 'cpu';
            this.phase = 'menu';
            this.st = L.newGame(1, 0, 2);
            this.aim = { a: Math.PI, p: 0.45, sx: 0, sy: 0 };
            this.sim = null; this.acc = 0; this.sinking = [];
            this.me = 0;
            this.stats = this.newStats();
            this.build();
            this.cv = Kit.canvas(this.$('#bi-canvas'), this.$('#bi-wrap'), this.$('#bi-stage'), LW, LH, (api) => this.onResize(api));
            this.ctx = this.cv.ctx;
            this.bind();
            this.lobby = new Nexus.games.OnlineLobby({
                game: 'billiards', el: this.$('#bi-online'), title: 'BILLAR ONLINE',
                roomNote: 'Bola 8. Quien rompe se sortea en la primera partida y se alterna en cada revancha. Tienes 60 s por tiro.',
                startOptions: (round) => {
                    this.hostBreaks = round === 1 ? Math.random() < 0.5 : !this.hostBreaks;
                    return { seed: (Math.random() * 2 ** 31) >>> 0, hostBreaks: this.hostBreaks };
                },
                onStart: (ctx) => this.startOnline(ctx),
                onMessage: (m) => this.onNet(m),
                onLost: (info) => this.onPeerLost(info),
                onExit: () => this.showHome(),
                onStatus: () => this.updateSide()
            });
            this.loop = Kit.loop((dt) => this.update(dt), () => this.draw());
            this.loop.start();
            const code = Nexus.games.OnlineLobby.inviteCode('billiards');
            if (code) { this.kind = 'online'; this.overlay.hidden = true; this.lobby.show(); this.lobby.join(code); }
            else if (!this.resumeSaved()) this.showHome();
            this.unsubSettings = Nexus.bus.on('settings:change', () => this.updateSide());
            this.updateSide();
        }

        newStats() { return { potted: 0, fouls: 0, shots: 0, run: 0, maxRun: 0, maxShot: 0, banks: 0, breakPot: 0, runOut: false, turnStartLeft: -1 }; }

        // ── Plantilla ───────────────────────────────────────
        build() {
            this.root.innerHTML = `
            <div class="game ax-game billiards" style="--ax-accent:${ACCENT}">
                ${Kit.header({ emoji: Nexus.ui.icons.logo('billiards'), title: 'Billar', pills: [
                    { id: 'turn', icon: '🎱', init: '–', title: 'Turno' },
                    { id: 'shots', icon: '#', init: '0', title: 'Tiros' },
                    { id: 'ping', icon: '📶', init: '–', title: 'Latencia' }] })}
                <div class="ax-body bi-body">
                    <div class="ax-stage-wrap" id="bi-wrap">
                        <div class="ax-stage bi-stage" id="bi-stage">
                            <canvas id="bi-canvas" aria-label="Mesa de billar" tabindex="0"></canvas>
                            <div class="ax-toast" id="bi-toast" role="status"></div>
                        </div>
                        <div class="bi-touch" id="bi-touch">
                            <label><span>Fuerza</span><input type="range" min="2" max="100" step="1" id="bi-power-m" aria-label="Fuerza del tiro" /></label>
                            <button class="btn btn-primary bi-shoot-m" id="bi-shoot-m" type="button">🎱 Tirar</button>
                        </div>
                        <div class="ax-overlay bi-overlay" id="bi-overlay"></div>
                        <div class="ol-overlay" id="bi-online" hidden></div>
                    </div>
                    <aside class="ax-side bi-side">
                        <div class="ax-card bi-players" id="bi-players"></div>
                        <div class="ax-card bi-status-card"><div class="bi-status" id="bi-status" role="status" aria-live="polite">–</div><div class="bi-clock" id="bi-clock" hidden></div></div>
                        <div class="ax-card bi-controls" id="bi-controls">
                            <h3>Tu tiro</h3>
                            <label class="bi-power"><span>Fuerza <b id="bi-pow-v">45 %</b></span>
                                <input type="range" min="2" max="100" step="1" id="bi-power" aria-label="Fuerza del tiro" /></label>
                            <div class="bi-ctl-row">
                                <div class="bi-spin" id="bi-spin" role="slider" tabindex="0" aria-label="Efecto: dónde golpea el taco a la bola blanca" title="Efecto: toca la bola (doble clic para centrar)"><i id="bi-spin-dot"></i></div>
                                <div class="bi-ctl-btns">
                                    <div class="bi-fine"><button class="btn btn-ghost btn-sm" type="button" data-fine="-1" aria-label="Girar el taco a la izquierda">◀</button><button class="btn btn-ghost btn-sm" type="button" data-fine="1" aria-label="Girar el taco a la derecha">▶</button></div>
                                    <button class="btn btn-primary btn-glow bi-shoot" id="bi-shoot" type="button">🎱 Tirar</button>
                                </div>
                            </div>
                            <p class="bi-tip muted small" id="bi-tip"></p>
                        </div>
                        <div class="ax-card">
                            <div class="bi-actions">
                                <button class="btn btn-ghost" id="bi-restart" type="button" hidden>↺ Reiniciar</button>
                                <button class="btn btn-ghost" id="bi-resign" type="button">🏳️ Rendirse</button>
                                <button class="btn btn-ghost" id="bi-menu" type="button">☰ Menú</button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>`;
            this.$ = (s) => this.root.querySelector(s);
            this.overlay = this.$('#bi-overlay');
            this.canvas = this.$('#bi-canvas');
        }

        onResize(api) {
            // Móvil en vertical: la mesa se gira 90° para aprovechar la pantalla
            const wrap = this.$('#bi-wrap'), vertical = wrap.clientHeight > wrap.clientWidth * 1.15;
            if (vertical !== !!this.vertical) {
                this.vertical = vertical;
                api.lw = vertical ? LH : LW; api.lh = vertical ? LW : LH;
                this.later(() => api.resize(), 0);
            }
        }

        // ── Coordenadas ─────────────────────────────────────
        /** Punto del puntero → coordenadas de la mesa (zona de juego). */
        toTable(e) {
            const rc = this.canvas.getBoundingClientRect();
            const cx = (e.clientX - rc.left) / rc.width * this.cv.lw, cy = (e.clientY - rc.top) / rc.height * this.cv.lh;
            const X = this.vertical ? cy : cx, Y = this.vertical ? this.cv.lw - cx : cy;
            return { x: X - RL, y: Y - RL };
        }

        // ── Estado de turno ─────────────────────────────────
        get myTurn() { return this.phase === 'aim' && (this.kind === 'practice' || this.st.turn === this.me); }
        get cpuTurn() { return this.kind === 'cpu' && this.phase === 'aim' && this.st.turn !== this.me; }
        players() {
            const me = Nexus.games.OnlineLobby.myInfo();
            if (this.kind === 'practice') return [{ name: me.name, avatar: me.avatar, me: true }];
            const foe = this.kind === 'online' ? (this.lobby.peer || { name: 'Rival', avatar: '❔' }) : { name: `CPU · ${this.level.label}`, avatar: '🤖' };
            const a = { name: me.name, avatar: me.avatar, me: true }, b = { name: foe.name, avatar: foe.avatar, me: false };
            return this.me === 0 ? [a, b] : [b, a];
        }

        // ── Entrada ─────────────────────────────────────────
        bind() {
            const cvs = this.canvas;
            cvs.addEventListener('pointerdown', (e) => this.onDown(e));
            cvs.addEventListener('pointermove', (e) => this.onMove(e));
            this.onUp = (e) => this.onRelease(e);
            window.addEventListener('pointerup', this.onUp);
            window.addEventListener('pointercancel', this.onUp);
            const pw = this.$('#bi-power');
            pw.addEventListener('input', () => { this.aim.p = pw.value / 100; this.sendAim(); this.renderControls(); });
            this.$('#bi-shoot').addEventListener('click', () => this.shootMine());
            this.$('#bi-shoot-m').addEventListener('click', () => this.shootMine());
            const pm = this.$('#bi-power-m');
            pm.addEventListener('input', () => { this.aim.p = pm.value / 100; this.sendAim(); this.renderControls(); });
            this.$('#bi-controls').addEventListener('click', (e) => { const f = e.target.closest('[data-fine]'); if (f) this.turnAim(Number(f.dataset.fine) * 0.004); });
            const spin = this.$('#bi-spin');
            const setSpin = (e) => {
                const rc = spin.getBoundingClientRect();
                let x = ((e.clientX - rc.left) / rc.width) * 2 - 1, y = ((e.clientY - rc.top) / rc.height) * 2 - 1;
                const d = Math.hypot(x, y); if (d > 0.8) { x = x / d * 0.8; y = y / d * 0.8; }
                this.aim.sx = Math.round(x / 0.8 * 100) / 100; this.aim.sy = Math.round(-y / 0.8 * 100) / 100;
                this.renderControls();
            };
            spin.addEventListener('pointerdown', (e) => { if (!this.myTurn) return; spin.setPointerCapture(e.pointerId); this.spinDrag = true; setSpin(e); });
            spin.addEventListener('pointermove', (e) => { if (this.spinDrag) setSpin(e); });
            spin.addEventListener('pointerup', () => { this.spinDrag = false; });
            spin.addEventListener('dblclick', () => { this.aim.sx = 0; this.aim.sy = 0; this.renderControls(); });
            spin.addEventListener('keydown', (e) => {
                const k = { ArrowUp: [0, 0.2], ArrowDown: [0, -0.2], ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0] }[e.key];
                if (!k) return; e.preventDefault(); e.stopPropagation();
                this.aim.sx = Math.max(-1, Math.min(1, this.aim.sx + k[0])); this.aim.sy = Math.max(-1, Math.min(1, this.aim.sy + k[1]));
                this.renderControls();
            });
            this.$('#bi-resign').addEventListener('click', () => this.resign());
            this.$('#bi-menu').addEventListener('click', () => this.openMenu());
            this.$('#bi-restart').addEventListener('click', () => this.startPractice());
            this.overlay.addEventListener('click', (e) => this.onOverlay(e));
            this.onKey = (e) => {
                if (this.destroyed || document.querySelector('.modal-overlay.active')) return;
                if (e.target && /input|textarea|select/i.test(e.target.tagName) && e.target.type !== 'range') return;
                if (!this.myTurn) return;
                const fine = e.shiftKey ? 0.0015 : 0.012;
                if (e.key === 'ArrowLeft') { e.preventDefault(); this.turnAim(-fine); }
                else if (e.key === 'ArrowRight') { e.preventDefault(); this.turnAim(fine); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); this.setPower(this.aim.p + 0.03); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); this.setPower(this.aim.p - 0.03); }
                else if (e.key === ' ' || e.key === 'Enter') { if (e.target && e.target.tagName === 'BUTTON') return; e.preventDefault(); this.shootMine(); }
            };
            document.addEventListener('keydown', this.onKey);
        }
        turnAim(d) { if (!this.myTurn) return; this.aim.a += d; this.sendAim(); }
        setPower(p) { this.aim.p = Math.max(0.02, Math.min(1, p)); this.sendAim(); this.renderControls(); }

        onDown(e) {
            if (!this.myTurn) return;
            const p = this.toTable(e), cue = this.st.balls[0];
            if (this.st.ballInHand && Math.hypot(p.x - cue.x, p.y - cue.y) < R * 3.2) {
                this.drag = { kind: 'place', id: e.pointerId, from: { x: cue.x, y: cue.y } };
                this.canvas.setPointerCapture(e.pointerId);
                e.preventDefault(); return;
            }
            if (e.pointerType === 'mouse' && e.button === 0) {
                // Ratón: se fija la dirección y al arrastrar hacia atrás se carga la fuerza; al soltar, tira
                this.aimAt(p);
                this.drag = { kind: 'stroke', id: e.pointerId, sx: p.x, sy: p.y, p0: this.aim.p, moved: false };
                this.canvas.setPointerCapture(e.pointerId);
            } else {
                this.drag = { kind: 'aim', id: e.pointerId };
                this.canvas.setPointerCapture(e.pointerId);
                this.aimAt(p);
            }
            e.preventDefault();
        }
        onMove(e) {
            const p = this.toTable(e);
            this.hover = p;
            const d = this.drag;
            if (!d) { if (e.pointerType === 'mouse' && this.myTurn) this.aimAt(p); return; }
            if (d.id !== e.pointerId) return;
            if (d.kind === 'place') {
                const ok = L.freeSpot(this.st.balls, p.x, p.y, this.st.kitchen);
                const cue = this.st.balls[0];
                if (ok) { cue.x = p.x; cue.y = p.y; cue.in = false; this.sendPlace(); }
            } else if (d.kind === 'aim') this.aimAt(p);
            else if (d.kind === 'stroke') {
                const dx = Math.cos(this.aim.a), dy = Math.sin(this.aim.a);
                const back = -((p.x - d.sx) * dx + (p.y - d.sy) * dy);
                if (Math.abs(back) > 4) d.moved = true;
                if (d.moved) { this.aim.p = Math.max(0.02, Math.min(1, back / 260)); this.renderControls(); this.sendAim(); }
            }
        }
        onRelease(e) {
            const d = this.drag; if (!d || d.id !== e.pointerId) return;
            this.drag = null;
            if (d.kind === 'stroke') {
                if (d.moved && this.aim.p > 0.03) this.shootMine();
                else this.aim.p = d.p0, this.renderControls();
            }
        }
        aimAt(p) {
            const cue = this.st.balls[0];
            if (Math.hypot(p.x - cue.x, p.y - cue.y) < R * 1.2) return;
            this.aim.a = Math.atan2(p.y - cue.y, p.x - cue.x);
            this.sendAim();
        }

        // ── Partidas ────────────────────────────────────────
        startCpu() { this.newGame('cpu', (Math.random() * 2 ** 31) >>> 0, Math.random() < 0.5 ? 0 : 1, 0); }
        startPractice() { this.newGame('practice', (Math.random() * 2 ** 31) >>> 0, 0, 0); }
        newGame(kind, seed, breaker, me) {
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.kind = kind; this.me = me;
            this.st = L.newGame(seed, breaker, kind === 'practice' ? 1 : 2);
            this.sim = null; this.sinking = []; this.cpuPlan = null; this.pendingRes = null;
            this.stats = this.newStats();
            this.aim = { a: 0, p: 0.92, sx: 0, sy: 0 };
            this.startedAt = Date.now();
            this.overlay.hidden = true;
            this.lastMsg = '';
            Nexus.audio.play('tdRound');
            this.beginTurn();
        }
        beginTurn() {
            if (this.st.over) return;
            this.phase = 'aim';
            this.turnStart = Date.now();
            this.aim.sx = 0; this.aim.sy = 0;
            const st = this.st, cue = st.balls[0];
            if (st.breakShot) this.aim = { a: Math.atan2(st.balls[1].y - cue.y, st.balls[1].x - cue.x), p: 0.92, sx: 0, sy: 0 };
            else if (this.aim.p > 0.8) this.aim.p = 0.45;
            if (this.st.turn === this.me || this.kind === 'practice') {
                // Racha de bolas en el turno: se guarda cuántas propias quedaban al empezar (para la «tacada limpia»)
                const g = st.groups[this.me];
                if (this.lastTurnOwner !== this.me) { this.stats.run = 0; this.stats.turnStartLeft = g ? L.remaining(st, g) : 7; }
            }
            this.lastTurnOwner = st.turn;
            this.save();
            this.updateSide();
            if (this.cpuTurn) this.later(() => this.cpuThink(), 650);
        }

        // ── Tiros ───────────────────────────────────────────
        shootMine() {
            if (!this.myTurn || this.drag && this.drag.kind === 'place') return;
            const cue = this.st.balls[0];
            if (cue.in || !L.freeSpot(this.st.balls, cue.x, cue.y, this.st.kitchen && this.st.ballInHand)) { this.toast('Coloca la bola blanca en un sitio libre'); return; }
            const shot = { a: this.aim.a, p: this.aim.p, sx: this.aim.sx, sy: this.aim.sy };
            if (this.kind === 'online') this.lobby.send({ t: 'shot', k: this.st.shots + 1, a: shot.a, p: shot.p, sx: shot.sx, sy: shot.sy, cx: cue.x, cy: cue.y });
            this.startShot(shot);
        }
        startShot(shot) {
            this.shotBy = this.st.turn;
            this.wasBreak = this.st.breakShot;
            this.lastShot = shot;
            this.sim = L.createSim(this.st.balls, shot);
            this.acc = 0; this.evSeen = { hits: 0, rails: 0, sinks: 0 };
            this.phase = 'moving';
            Nexus.audio.play('biCue', shot.p);
            this.updateSide();
        }

        update(dt) {
            this.sinking = this.sinking.filter(s => (s.t += dt) < 0.32);
            if (this.cpuPlan) this.cpuStep(dt);
            if (this.phase === 'moving' && this.sim) {
                this.acc += dt;
                let n = 0;
                while (this.acc >= L.DT && n < 900) { L.step(this.sim); this.acc -= L.DT; n++; if (this.sim.done) break; }
                this.sounds();
                if (this.sim.done) this.shotEnded();
            }
            if (this.kind === 'online' && this.phase === 'aim') this.tickClock();
        }
        sounds() {
            const ev = this.sim.ev, s = this.evSeen;
            if (ev.hits.length > s.hits) { Nexus.audio.play('biClack', Math.max(...ev.hits.slice(s.hits))); s.hits = ev.hits.length; }
            if (ev.rails.length > s.rails) { if (Math.max(...ev.rails.slice(s.rails)) > 0.08) Nexus.audio.play('biRail'); s.rails = ev.rails.length; }
            if (ev.sinks.length > s.sinks) {
                for (const k of ev.sinks.slice(s.sinks)) this.sinking.push({ n: k.n, x: k.x, y: k.y, px: POCKETS[k.pocket].x, py: POCKETS[k.pocket].y, t: 0 });
                Nexus.audio.play('biPocket'); s.sinks = ev.sinks.length;
            }
        }

        shotEnded() {
            const sim = this.sim;
            this.st.balls = sim.balls.map(b => ({ n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, in: b.in }));
            // Online, quien no ha tirado espera el resultado de quien tiró (manda su versión)
            if (this.kind === 'online' && this.shotBy !== this.me) {
                this.phase = 'wait';
                if (this.pendingRes) { const r = this.pendingRes; this.pendingRes = null; this.applyRemote(r); }
                else this.updateSide();
                return;
            }
            const res = L.judge(this.st, sim);
            this.sim = null;
            if (this.kind === 'online') this.lobby.send({ t: 'res', k: this.st.shots, st: this.packState(), res: this.packRes(res) });
            this.afterShot(res, this.shotBy);
        }
        packState() { const s = this.st; return { b: s.balls.map(b => [Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100, b.in ? 1 : 0]), turn: s.turn, groups: s.groups, bk: s.breakShot, bih: s.ballInHand, kit: s.kitchen, over: s.over, win: s.winner, reason: s.reason, shots: s.shots, msg: s.msg, foul: s.foul }; }
        unpackState(p) {
            const s = this.st;
            p.b.forEach((v, n) => { const b = s.balls[n]; b.x = v[0]; b.y = v[1]; b.in = !!v[2]; b.vx = 0; b.vy = 0; });
            Object.assign(s, { turn: p.turn, groups: p.groups, breakShot: p.bk, ballInHand: p.bih, kitchen: p.kit, over: p.over, winner: p.win, reason: p.reason, shots: p.shots, msg: p.msg, foul: p.foul });
        }
        packRes(r) { return { foul: r.foul, keep: r.keep, potted: r.potted, assigned: r.assigned, win: r.win, lose: r.lose, eightBreak: r.eightBreak, banks: r.banks }; }

        /** Contabiliza el tiro y pasa al siguiente turno (o termina). by = quien tiró. */
        afterShot(res, by) {
            const mine = by === this.me || this.kind === 'practice';
            if (mine) {
                const s = this.stats, myG = this.st.groups[this.me];
                s.shots++;
                const ownPotted = this.kind === 'practice' ? res.potted.length : res.potted.filter(n => n !== 8 && (!myG || L.groupOf(n) === myG)).length;
                s.potted += ownPotted;
                if (res.foul && this.kind !== 'practice') s.fouls++;
                s.maxShot = Math.max(s.maxShot, res.potted.length);
                s.banks += res.banks || 0;
                if (this.wasBreak) s.breakPot = Math.max(s.breakPot, res.potted.filter(n => n !== 8).length);
                if (res.keep || res.win) { s.run += ownPotted + (res.win ? 1 : 0); s.maxRun = Math.max(s.maxRun, s.run); } else s.run = 0;
                if (res.win && this.kind !== 'practice' && s.turnStartLeft >= 7 && this.lastTurnOwner === this.me) s.runOut = true;
            }
            this.wasBreak = false;
            const msg = this.st.msg;
            if (res.foul) { this.toast('⚠️ Falta: ' + (L.FOULS[res.foul] || '').toLowerCase()); Nexus.audio.play('error'); }
            else if (res.assigned && this.kind !== 'practice') {
                const meG = this.st.groups[this.me];
                this.toast(`${by === this.me ? 'Juegas' : 'Tu rival juega'} con ${L.GROUP_NAME[by === this.me ? meG : res.assigned].toLowerCase()}`);
            } else if (res.eightBreak) this.toast('La 8 ha entrado en el saque: vuelve a su sitio');
            this.lastMsg = msg;
            if (this.st.over) { this.finish(this.st.reason); return; }
            this.beginTurn();
        }

        // ── CPU ─────────────────────────────────────────────
        cpuThink() {
            if (!this.cpuTurn || this.cpuPlan) return;
            const shot = L.aiShot(this.st, this.level.id);
            const cue = this.st.balls[0];
            this.cpuPlan = { shot, t: 0, stage: shot.place ? 'place' : 'aim', from: { x: cue.x, y: cue.y }, a0: this.aim.a, p0: 0.05 };
            this.updateSide();
        }
        cpuStep(dt) {
            const c = this.cpuPlan; if (!c || this.phase !== 'aim') { this.cpuPlan = null; return; }
            c.t += dt;
            const cue = this.st.balls[0], ease = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            if (c.stage === 'place') {
                const k = Math.min(1, c.t / 0.6);
                cue.in = false; cue.x = c.from.x + (c.shot.place.x - c.from.x) * ease(k); cue.y = c.from.y + (c.shot.place.y - c.from.y) * ease(k);
                if (k >= 1) { c.stage = 'aim'; c.t = 0; c.a0 = this.aim.a; }
            } else if (c.stage === 'aim') {
                const k = Math.min(1, c.t / 0.85);
                let d = c.shot.a - c.a0; d = Math.atan2(Math.sin(d), Math.cos(d));
                this.aim.a = c.a0 + d * ease(k); this.aim.p = 0.05; this.aim.sx = c.shot.sx; this.aim.sy = c.shot.sy;
                if (k >= 1) { c.stage = 'pull'; c.t = 0; }
            } else if (c.stage === 'pull') {
                const k = Math.min(1, c.t / 0.5);
                this.aim.p = 0.05 + (c.shot.p - 0.05) * ease(k);
                if (k >= 1) { this.cpuPlan = null; this.aim.a = c.shot.a; this.aim.p = c.shot.p; this.startShot(c.shot); }
            }
        }

        // ── Online ──────────────────────────────────────────
        startOnline({ role, opts }) {
            const me = role === 'host' ? 0 : 1, breaker = opts.hostBreaks ? 0 : 1;
            this.newGame('online', opts.seed >>> 0, breaker, me);
            Nexus.ui.toast(breaker === me ? 'Rompes tú: ¡a por el saque!' : 'Rompe tu rival', { icon: '🎱' });
        }
        sendAim() {
            if (this.kind !== 'online' || !this.myTurn) return;
            const now = Date.now();
            if (now - (this.aimSent || 0) < 90) { clearTimeout(this.aimTimer); this.aimTimer = this.later(() => this.sendAim(), 100); return; }
            this.aimSent = now;
            this.lobby.send({ t: 'aim', a: Math.round(this.aim.a * 1e4) / 1e4, p: Math.round(this.aim.p * 100) / 100 });
        }
        sendPlace() {
            if (this.kind !== 'online') return;
            const now = Date.now(), c = this.st.balls[0];
            if (now - (this.placeSent || 0) < 80) return;
            this.placeSent = now;
            this.lobby.send({ t: 'place', x: Math.round(c.x), y: Math.round(c.y) });
        }
        onNet(m) {
            if (this.kind !== 'online') return;
            const theirs = this.phase === 'aim' && this.st.turn !== this.me;
            if (m.t === 'aim' && theirs) { this.aim.a = +m.a || 0; this.aim.p = +m.p || 0; }
            else if (m.t === 'place' && theirs && this.st.ballInHand) { const c = this.st.balls[0]; c.in = false; c.x = +m.x; c.y = +m.y; }
            else if (m.t === 'shot') {
                if (!theirs || m.k !== this.st.shots + 1) { this.lobby.send({ t: 'sync?' }); return; }
                const c = this.st.balls[0]; c.in = false; c.x = +m.cx; c.y = +m.cy;
                this.aim = { a: +m.a, p: +m.p, sx: +m.sx || 0, sy: +m.sy || 0 };
                this.startShot({ a: +m.a, p: +m.p, sx: +m.sx || 0, sy: +m.sy || 0 });
            } else if (m.t === 'res') {
                if (this.phase === 'moving') this.pendingRes = m; else this.applyRemote(m);
            } else if (m.t === 'to') {
                if (this.phase === 'aim' || this.phase === 'wait') { this.unpackState(m.st); this.toast('⏱️ A tu rival se le acabó el tiempo: bola en mano'); this.lastTurnOwner = -1; this.beginTurn(); }
            } else if (m.t === 'sync?') {
                if (this.phase !== 'moving') this.lobby.send({ t: 'state', st: this.packState() });
            } else if (m.t === 'state') {
                if (this.phase !== 'moving' && m.st) { this.unpackState(m.st); if (this.st.over) this.finish(this.st.reason); else this.beginTurn(); }
            } else if (m.t === 'resign') {
                if (this.phase !== 'over' && this.phase !== 'menu') { this.st.over = true; this.st.winner = this.me; this.st.reason = 'resign'; this.finish('resign'); }
            }
        }
        applyRemote(m) {
            this.sim = null;
            if (m.st) this.unpackState(m.st);
            this.afterShot(m.res || {}, 1 - this.me);
        }
        tickClock() {
            const left = TURN_TIME - (Date.now() - this.turnStart) / 1000;
            const el = this.$('#bi-clock');
            const txt = `⏱️ ${Math.max(0, Math.ceil(left))} s`;
            if (el.textContent !== txt) { el.textContent = txt; el.classList.toggle('low', left < 10); }
            if (left <= 0 && this.st.turn === this.me && !this.timedOut) {
                this.timedOut = true;
                L.timeoutFoul(this.st);
                this.lobby.send({ t: 'to', st: this.packState() });
                this.toast('⏱️ Se acabó tu tiempo: bola en mano para el rival');
                this.stats.fouls++;
                this.lastTurnOwner = -1;
                this.later(() => { this.timedOut = false; }, 500);
                this.beginTurn();
            }
        }
        onPeerLost({ wasPlaying }) {
            if (wasPlaying && this.kind === 'online' && this.phase !== 'over' && this.phase !== 'menu') {
                this.st.over = true; this.st.winner = this.me; this.st.reason = 'forfeit'; this.sim = null; this.finish('forfeit');
            }
            this.updateSide();
        }

        resign() {
            if (this.phase === 'over' || this.phase === 'menu') return;
            const practice = this.kind === 'practice';
            Nexus.ui.modal.confirm({ title: practice ? 'Dejar la práctica' : 'Rendirse', icon: '🏳️', danger: !practice, confirmLabel: practice ? 'Dejarla' : 'Rendirme',
                message: practice ? 'La mesa se recoge sin contar como partida.' : 'La partida contará como derrota.' }).then(ok => {
                if (!ok || this.destroyed || this.phase === 'over' || this.phase === 'menu') return;
                if (practice) { this.phase = 'menu'; this.st.over = true; this.save(); this.showHome(); return; }
                if (this.kind === 'online') this.lobby.send({ t: 'resign' });
                this.sim = null; this.cpuPlan = null;
                this.st.over = true; this.st.winner = 1 - this.me; this.st.reason = 'resign';
                this.finish('resign');
            });
        }

        // ── Fin ─────────────────────────────────────────────
        finish(reason) {
            if (this.phase === 'over') return;
            this.phase = 'over'; this.cpuPlan = null;
            const online = this.kind === 'online', practice = this.kind === 'practice';
            if (online) this.lobby.gameOver();
            this.save();
            const s = this.stats, st = this.st;
            const won = practice ? true : st.winner === this.me;
            const time = Math.round((Date.now() - this.startedAt) / 1000);
            const mode = practice ? 'practice' : online ? 'online' : this.level.id;
            const mult = practice ? 1 : online ? 2 : this.level.mult;
            const oppG = st.groups[1 - this.me], oppLeft = oppG ? L.remaining(st, oppG) : 7;
            const score = practice ? Math.max(200, 4000 - Math.max(0, s.shots - 15) * 80 - time * 2)
                : Math.round((won ? 1000 + s.potted * 40 + oppLeft * 60 + (s.runOut ? 500 : 0) - s.fouls * 30 : s.potted * 40) * mult);
            const xp = practice ? 40 : Math.round((won ? 60 : 12) * mult);
            const result = Nexus.services.progress.recordGame({
                game: 'billiards', mode, won, score: Math.max(0, score), time, xp,
                extra: { online, practice, level: mode, reason, potted: s.potted, fouls: s.fouls, shots: s.shots, maxRun: s.maxRun, maxShot: s.maxShot,
                    banks: s.banks, breakPot: s.breakPot, runOut: s.runOut, oppLeft }
            });
            this.updateSide();
            Nexus.audio.play(won ? 'win' : 'lose');
            const foe = online ? ((this.lobby.peer && this.lobby.peer.name) || 'tu rival') : `la CPU (${this.level.label})`;
            const actions = online ? [
                { label: '🔄 Revancha', kind: 'primary', onClick: () => this.later(() => this.lobby.ready(), 50) },
                { label: '🚪 Salir de la sala', kind: 'ghost', onClick: () => this.later(() => { this.lobby.leave(); this.lobby.show(); }, 50) }
            ] : [
                { label: practice ? '🔄 Otra mesa' : '🔄 Otra partida', kind: 'primary', onClick: () => this.later(() => (practice ? this.startPractice() : this.startCpu()), 50) },
                { label: '☰ Menú', kind: 'ghost', onClick: () => this.later(() => this.showHome(), 50) },
                { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
            ];
            this.later(() => {
                if (this.destroyed) return;
                const rm = this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: won ? '🏆' : '🎱', kind: won ? 'win' : 'lose', title: practice ? '¡MESA LIMPIA!' : won ? '¡VICTORIA!' : 'DERROTA',
                    subtitle: practice ? `${s.shots} tiros en ${formatTime(time)}` : `${REASONS[reason] || ''} · contra ${foe}`,
                    stats: practice ? [
                        { label: 'Tiros', value: String(s.shots) }, { label: 'Tiempo', value: formatTime(time) },
                        { label: 'Mejor tacada', value: String(s.maxRun) }, { label: 'Puntuación', value: formatNumber(Math.max(0, score)) }
                    ] : [
                        { label: 'Bolas metidas', value: String(s.potted) }, { label: 'Faltas', value: String(s.fouls) },
                        { label: 'Mejor tacada', value: String(s.maxRun) }, { label: 'Puntuación', value: formatNumber(Math.max(0, score)) }
                    ],
                    result, actions
                });
                if (online && rm && rm.closed) rm.closed.then(() => { if (this.resultModal === rm) this.resultModal = null; if (!this.destroyed && this.phase === 'over' && this.lobby.active === false) this.lobby.afterGame(); });
            }, 700);
        }

        // ── Guardado (CPU y práctica) ───────────────────────
        saveKey() { const u = Nexus.services.users.current(); return u ? `run:${u.id}:billiards` : null; }
        save() {
            const k = this.saveKey(); if (!k) return;
            if (this.kind === 'online' || this.phase !== 'aim' || this.st.over) { Nexus.storage.remove(k); return; }
            Nexus.storage.set(k, { v: 1, kind: this.kind, level: this.level.id, me: this.me, st: this.st, stats: this.stats, startedAt: this.startedAt });
        }
        resumeSaved() {
            const k = this.saveKey(); if (!k) return false;
            const r = Nexus.storage.get(k);
            if (!r || r.v !== 1 || !r.st || !Array.isArray(r.st.balls) || r.st.balls.length !== 16) return false;
            this.kind = r.kind === 'practice' ? 'practice' : 'cpu';
            this.level = LEVELS.find(l => l.id === r.level) || this.level;
            this.me = r.me ? 1 : 0;
            this.st = r.st; this.stats = Object.assign(this.newStats(), r.stats || {});
            this.startedAt = Date.now() - Math.min(3600e3, Math.max(0, Date.now() - (r.startedAt || Date.now())));
            this.overlay.hidden = true;
            this.lastTurnOwner = this.st.turn;
            Nexus.ui.toast('Partida recuperada', { icon: '🎱' });
            this.beginTurn();
            return true;
        }

        // ── Menús ───────────────────────────────────────────
        showHome() {
            if (this.phase !== 'aim' && this.phase !== 'moving') this.phase = 'menu';
            const playing = this.phase === 'aim' || this.phase === 'moving';
            this.overlay.hidden = false;
            const best = Nexus.services.progress.stats('billiards');
            this.overlay.innerHTML = `<div class="ax-panel">
                <div class="bi-logo"><span class="bi-logo-ball" aria-hidden="true"><b>8</b></span> BILLAR</div>
                <p class="ax-sub">Bola 8: mete tus siete bolas (lisas o rayadas) y después la negra.</p>
                <div class="bi-choices">
                    <button type="button" class="bi-choice" data-do="go-cpu"><span>🤖</span><strong>Contra la máquina</strong><small>4 niveles, de Fácil a Maestro</small></button>
                    <button type="button" class="bi-choice" data-do="go-online"><span>🌐</span><strong>Online 1 contra 1</strong><small>Crea una sala o entra con un código</small></button>
                    <button type="button" class="bi-choice" data-do="practice"><span>🎯</span><strong>Práctica</strong><small>Mete las 15 bolas en el menor número de tiros</small></button>
                </div>
                ${best.played ? `<div class="ax-best">Llevas <b>${best.wins}</b> victorias en ${best.played} partidas</div>` : ''}
                <details class="bi-rules"><summary>Reglas de la bola 8</summary>
                    <ul>
                        <li>Rompe un jugador desde detrás de la línea de saque. Tras el saque la mesa está «abierta».</li>
                        <li>La primera bola que metas (sin falta) decide tu grupo: lisas (1–7) o rayadas (9–15).</li>
                        <li>Sigues tirando mientras metas bolas de tu grupo. Cuando las metas todas, juega la 8: si entra, ganas.</li>
                        <li><b>Faltas</b> (bola en mano para el rival): meter la blanca, no tocar ninguna bola, tocar primero una que no es tuya o que ninguna bola toque banda tras el golpe.</li>
                        <li>Pierdes si metes la 8 antes de tiempo o con falta. Si entra en el saque, vuelve a su sitio.</li>
                    </ul></details>
                ${playing ? '<div class="ax-play-row"><button class="btn btn-ghost" data-do="close" type="button">▶ Volver a la partida</button></div>' : ''}
            </div>`;
        }
        showCpu() {
            const ms = Nexus.services.progress.stats('billiards').byMode[this.level.id];
            const rec = ms && ms.played ? `Contra ${esc(this.level.label)}: <b>${ms.wins}</b> victorias en ${ms.played} partidas` : `Aún no has jugado contra el nivel ${esc(this.level.label)}`;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">CONTRA LA MÁQUINA</h2>
                ${Kit.modeCards(LEVELS.map(l => ({ ...l, desc: l.desc + ' (×' + String(l.mult).replace('.', ',') + ')' })), this.level.id)}
                <div class="ax-best">${rec}</div>
                <div class="ax-play-row">
                    <button class="btn btn-ghost" data-do="home" type="button">← Volver</button>
                    <button class="btn btn-primary btn-glow" data-do="start" type="button">▶ Jugar · ${esc(this.level.label)}</button>
                </div>
            </div>`;
        }
        openMenu() {
            if (this.kind === 'online' && this.phase !== 'over' && this.phase !== 'menu') { Nexus.ui.toast('En una partida online sólo puedes rendirte', { icon: 'ℹ️' }); return; }
            if (this.kind === 'online' && this.lobby.net) { this.lobby.showRoom(); return; }
            this.showHome();
        }
        onOverlay(e) {
            const lv = e.target.closest('[data-mode]');
            if (lv) { this.level = LEVELS.find(l => l.id === lv.dataset.mode) || this.level; Nexus.audio.play('click'); this.showCpu(); return; }
            const b = e.target.closest('[data-do]'); if (!b) return;
            Nexus.audio.play('click');
            const d = b.dataset.do;
            if (d === 'go-cpu') this.showCpu();
            else if (d === 'go-online') { this.save(); this.overlay.hidden = true; this.phase = 'menu'; this.lobby.show(); }
            else if (d === 'practice') this.startPractice();
            else if (d === 'home') this.showHome();
            else if (d === 'start') this.startCpu();
            else if (d === 'close') this.overlay.hidden = true;
        }

        // ── Panel lateral ───────────────────────────────────
        toast(msg) {
            const t = this.$('#bi-toast'); if (!t) return;
            t.textContent = msg; t.classList.add('show');
            clearTimeout(this.toastT); this.toastT = this.later(() => t.classList.remove('show'), 2600);
        }
        ballChip(n, gone) {
            const c = COLORS[n], stripe = n > 8;
            return `<i class="bi-chip${stripe ? ' st' : ''}${gone ? ' gone' : ''}" style="--c:${c}" title="Bola ${n}">${n}</i>`;
        }
        updateSide() {
            if (this.destroyed) return;
            const st = this.st, pl = this.players(), playing = this.phase !== 'menu' && this.phase !== 'over';
            const online = this.kind === 'online', practice = this.kind === 'practice';
            // Jugadores
            const card = (p, i) => {
                const g = practice ? null : st.groups[i];
                const turn = playing && (practice || st.turn === i);
                const balls = practice ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] : g === 'solids' ? [1, 2, 3, 4, 5, 6, 7] : g === 'stripes' ? [9, 10, 11, 12, 13, 14, 15] : [];
                const left = g ? L.remaining(st, g) : 0;
                return `<div class="bi-pl${turn ? ' turn' : ''}">
                    <span class="bi-pl-av">${Nexus.ui.avatar.html(p.avatar)}</span>
                    <span class="bi-pl-info"><b>${esc(p.name)}${p.me && !practice ? ' <small>(tú)</small>' : ''}</b>
                        <small>${practice ? `${st.balls.filter(b => b.n && !b.in).length} bolas en la mesa` : g ? `${L.GROUP_NAME[g]}${left ? ` · faltan ${left}` : ' · ¡a por la 8!'}` : st.breakShot ? 'Saque' : 'Mesa abierta'}</small>
                        <span class="bi-chips">${balls.map(n => this.ballChip(n, st.balls[n].in)).join('')}${g && !left ? this.ballChip(8, st.balls[8].in) : ''}</span></span>
                    ${turn && this.cpuPlan ? '<span class="bi-thinking"><i></i><i></i><i></i></span>' : ''}</div>`;
            };
            const html = pl.map(card).join('');
            const pe = this.$('#bi-players'); if (pe.innerHTML !== html) pe.innerHTML = html;
            // Estado
            let s;
            if (this.phase === 'menu') s = 'Elige un modo para empezar';
            else if (this.phase === 'over') s = practice ? '🏁 ¡Mesa limpia!' : st.winner === this.me ? '🏆 ¡Has ganado!' : '🏁 Partida terminada';
            else if (this.phase === 'moving') s = 'Las bolas ruedan…';
            else if (this.phase === 'wait') s = 'Sincronizando con tu rival…';
            else if (this.myTurn) s = st.breakShot ? '🎱 Te toca romper' : st.ballInHand ? '✋ Bola en mano: arrastra la blanca y tira' : 'Te toca tirar';
            else s = this.kind === 'cpu' ? '🤖 Tira la CPU' : `Tira ${(this.lobby.peer && this.lobby.peer.name) || 'tu rival'}…`;
            const last = playing && this.lastMsg && this.phase === 'aim' ? `<small>${esc(this.lastMsg)}</small>` : '';
            const sh = `${esc(s)}${last}`;
            const se = this.$('#bi-status'); if (se.innerHTML !== sh) se.innerHTML = sh;
            this.$('#bi-clock').hidden = !(online && this.phase === 'aim');
            // Controles
            this.$('#bi-controls').classList.toggle('off', !this.myTurn);
            this.$('#bi-shoot').disabled = !this.myTurn;
            this.$('#bi-touch').classList.toggle('on', this.myTurn);
            this.$('#bi-resign').disabled = !playing;
            this.$('#bi-resign').textContent = practice ? '🏳️ Dejar' : '🏳️ Rendirse';
            this.$('#bi-restart').hidden = !practice;
            const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
            this.$('#bi-tip').textContent = coarse ? 'Arrastra el dedo por la mesa para apuntar, elige la fuerza y pulsa Tirar.'
                : 'Apunta con el ratón y arrastra hacia atrás para dar fuerza; al soltar, tiras. ← → apuntar (Mayús: fino), ↑ ↓ fuerza, espacio: tirar.';
            // Píldoras
            const set = (id, v) => { const el = this.root.querySelector(`[data-pill="${id}"]`); if (el && el.textContent !== v) el.textContent = v; };
            set('turn', !playing ? '–' : practice ? 'Práctica' : st.turn === this.me ? 'Tú' : this.kind === 'cpu' ? 'CPU' : 'Rival');
            set('shots', String(practice ? this.stats.shots : st.shots));
            set('ping', online && this.lobby.rtt != null ? Math.round(this.lobby.rtt) + ' ms' : '–');
            this.renderControls();
        }
        renderControls() {
            const pw = this.$('#bi-power'), v = Math.round(this.aim.p * 100);
            if (document.activeElement !== pw || this.drag) pw.value = v;
            const pm = this.$('#bi-power-m'); if (document.activeElement !== pm || this.drag) pm.value = v;
            const pv = this.$('#bi-pow-v'); const t = v + ' %'; if (pv.textContent !== t) pv.textContent = t;
            const dot = this.$('#bi-spin-dot');
            dot.style.left = (50 + this.aim.sx * 40) + '%'; dot.style.top = (50 - this.aim.sy * 40) + '%';
            this.$('#bi-spin').setAttribute('aria-valuetext', `lateral ${Math.round(this.aim.sx * 100)}, ${this.aim.sy >= 0 ? 'alto' : 'bajo'} ${Math.round(Math.abs(this.aim.sy) * 100)}`);
        }

        // ── Dibujo ──────────────────────────────────────────
        draw() {
            const ctx = this.ctx;
            ctx.save();
            ctx.clearRect(0, 0, this.cv.lw, this.cv.lh);
            if (this.vertical) { ctx.translate(this.cv.lw, 0); ctx.rotate(Math.PI / 2); }
            this.drawTable(ctx);
            ctx.translate(RL, RL);
            const balls = this.sim ? this.sim.balls : this.st.balls;
            const aiming = this.phase === 'aim' && !this.st.over;
            if (aiming && this.st.ballInHand && this.st.kitchen) {
                ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, 0, L.HEAD_X, H);
            }
            // Bolas que caen en la tronera
            for (const s of this.sinking) {
                const k = Math.min(1, s.t / 0.3);
                this.drawBall(ctx, s.n, s.x + (s.px - s.x) * k, s.y + (s.py - s.y) * k, 1 - k * 0.55, 1 - k);
            }
            for (const b of balls) if (!b.in) this.drawBall(ctx, b.n, b.x, b.y, 1, 1);
            if (aiming) this.drawAim(ctx);
            ctx.restore();
        }
        drawTable(ctx) {
            // Madera
            const g = ctx.createLinearGradient(0, 0, 0, LH);
            g.addColorStop(0, '#5a321a'); g.addColorStop(0.5, '#3d200f'); g.addColorStop(1, '#2a1509');
            ctx.fillStyle = g; roundRect(ctx, 0, 0, LW, LH, 26); ctx.fill();
            ctx.strokeStyle = 'rgba(52, 211, 153, .55)'; ctx.lineWidth = 2; roundRect(ctx, 1.5, 1.5, LW - 3, LH - 3, 25); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; roundRect(ctx, 8, 8, LW - 16, LH - 16, 20); ctx.stroke();
            // Rombos (diamantes)
            ctx.fillStyle = '#e8dcc2';
            for (let i = 1; i < 8; i++) { if (i === 4) continue; const x = RL + W * i / 8; diamond(ctx, x, RL / 2 - 6, 4); diamond(ctx, x, LH - RL / 2 + 6, 4); }
            for (let i = 1; i < 4; i++) { const y = RL + H * i / 4; diamond(ctx, RL / 2 - 6, y, 4); diamond(ctx, LW - RL / 2 + 6, y, 4); }
            // Almohadillas y paño
            ctx.fillStyle = '#0b5a43'; ctx.fillRect(RL - 14, RL - 14, W + 28, H + 28);
            const cloth = ctx.createRadialGradient(RL + W / 2, RL + H / 2, 40, RL + W / 2, RL + H / 2, W * 0.62);
            cloth.addColorStop(0, '#16936c'); cloth.addColorStop(1, '#0c6c50');
            ctx.fillStyle = cloth; ctx.fillRect(RL, RL, W, H);
            ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.strokeRect(RL, RL, W, H);
            // Marca, línea de saque y punto de pie
            ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#ffffff';
            ctx.translate(RL + W / 2, RL + H / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-28, -28, 56, 56); ctx.restore();
            ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.setLineDash([6, 6]);
            ctx.beginPath(); ctx.moveTo(RL + L.HEAD_X, RL); ctx.lineTo(RL + L.HEAD_X, RL + H); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,255,255,.3)';
            for (const x of [L.HEAD_X, L.FOOT_X]) { ctx.beginPath(); ctx.arc(RL + x, RL + L.MID_Y, 2.4, 0, Math.PI * 2); ctx.fill(); }
            // Troneras
            for (const p of POCKETS) {
                const x = RL + p.x, y = RL + p.y, r = p.corner ? 25 : 21;
                ctx.fillStyle = '#1a0f07'; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill();
                const pg = ctx.createRadialGradient(x, y, 2, x, y, r);
                pg.addColorStop(0, '#000'); pg.addColorStop(1, '#121212');
                ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            }
        }
        drawBall(ctx, n, x, y, scale, alpha) {
            const r = R * scale;
            ctx.save(); ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(x + 2.4, y + 3, r, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath();
            if (n > 8) {
                ctx.fillStyle = '#f4f1e8'; ctx.fill();
                ctx.save(); ctx.clip(); ctx.fillStyle = COLORS[n]; ctx.fillRect(x - r, y - r * 0.55, r * 2, r * 1.1); ctx.restore();
            } else { ctx.fillStyle = COLORS[n]; ctx.fill(); }
            if (n > 0 && scale > 0.7) {
                ctx.fillStyle = '#fbfaf5'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#111'; ctx.font = `800 ${(r * 0.62).toFixed(1)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(String(n), x, y + 0.5);
            }
            const sh = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.05);
            sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(0.35, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.35)');
            ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        drawAim(ctx) {
            const st = this.st, cue = st.balls[0];
            if (cue.in) return;
            const mine = this.myTurn, a = this.aim.a, dx = Math.cos(a), dy = Math.sin(a);
            // Bola en mano
            if (st.ballInHand && mine) {
                const pulse = 0.5 + Math.sin(performance.now() / 220) * 0.25;
                ctx.strokeStyle = `rgba(52, 211, 153, ${pulse})`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cue.x, cue.y, R + 6, 0, Math.PI * 2); ctx.stroke();
            }
            // Bolas a las que se puede tirar (al empezar el turno)
            if (mine && Date.now() - this.turnStart < 2200 && this.kind !== 'practice') {
                const k = 1 - (Date.now() - this.turnStart) / 2200;
                ctx.strokeStyle = `rgba(255,255,255,${0.5 * k})`; ctx.lineWidth = 1.5;
                for (const n of L.legalTargets(st)) { const b = st.balls[n]; if (!b.in) { ctx.beginPath(); ctx.arc(b.x, b.y, R + 4, 0, Math.PI * 2); ctx.stroke(); } }
            }
            // Guía (sólo en tu turno)
            if (mine) {
                const tr = L.traceAim(st.balls, cue.x, cue.y, a);
                const long = Nexus.services.settings.get('billiards.guide') !== false;
                ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 6]);
                const ex = tr.ball ? tr.gx : tr.px, ey = tr.ball ? tr.gy : tr.py;
                ctx.beginPath(); ctx.moveTo(cue.x + dx * R, cue.y + dy * R); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
                if (tr.ball) {
                    const legal = L.legalTargets(st).includes(tr.ball.n);
                    ctx.strokeStyle = legal ? 'rgba(255,255,255,.75)' : 'rgba(248,113,113,.9)';
                    ctx.beginPath(); ctx.arc(tr.gx, tr.gy, R, 0, Math.PI * 2); ctx.stroke();
                    const nx = tr.ball.x - tr.gx, ny = tr.ball.y - tr.gy, nl = Math.hypot(nx, ny) || 1, ux = nx / nl, uy = ny / nl;
                    const len = long ? 150 : 55;
                    ctx.strokeStyle = legal ? 'rgba(52, 211, 153, .85)' : 'rgba(248,113,113,.7)'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(tr.ball.x, tr.ball.y); ctx.lineTo(tr.ball.x + ux * len, tr.ball.y + uy * len); ctx.stroke();
                    if (long) {
                        // Salida de la blanca (tangente)
                        let tx = dx - (dx * ux + dy * uy) * ux, ty = dy - (dx * ux + dy * uy) * uy; const tl = Math.hypot(tx, ty);
                        if (tl > 0.05) { tx /= tl; ty /= tl; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tr.gx, tr.gy); ctx.lineTo(tr.gx + tx * 70 * tl, tr.gy + ty * 70 * tl); ctx.stroke(); }
                    }
                } else if (long) {
                    // Rebote en la banda
                    const rx = (tr.px <= R + 0.5 || tr.px >= W - R - 0.5) ? -dx : dx, ry = (tr.py <= R + 0.5 || tr.py >= H - R - 0.5) ? -dy : dy;
                    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.setLineDash([4, 6]);
                    ctx.beginPath(); ctx.moveTo(tr.px, tr.py); ctx.lineTo(tr.px + rx * 90, tr.py + ry * 90); ctx.stroke(); ctx.setLineDash([]);
                }
            }
            // Taco (también el del rival o la CPU)
            if (this.phase === 'aim' && !(this.drag && this.drag.kind === 'place')) {
                const pull = 8 + this.aim.p * 95;
                this.drawCue(ctx, cue.x, cue.y, a, pull, mine ? 1 : 0.7);
            }
        }
        drawCue(ctx, x, y, a, pull, alpha) {
            const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
            const s0 = R + 3 + pull, len = 440;
            const tipX = x - dx * s0, tipY = y - dy * s0, endX = x - dx * (s0 + len), endY = y - dy * (s0 + len);
            ctx.save(); ctx.globalAlpha = alpha;
            const quad = (d0, d1, w0, w1, fill) => {
                const ax = x - dx * d0, ay = y - dy * d0, bx = x - dx * d1, by = y - dy * d1;
                ctx.fillStyle = fill; ctx.beginPath();
                ctx.moveTo(ax + px * w0, ay + py * w0); ctx.lineTo(bx + px * w1, by + py * w1); ctx.lineTo(bx - px * w1, by - py * w1); ctx.lineTo(ax - px * w0, ay - py * w0); ctx.closePath(); ctx.fill();
            };
            // Sombra
            ctx.save(); ctx.translate(4, 6); quad(s0, s0 + len, 2.4, 6.5, 'rgba(0,0,0,.25)'); ctx.restore();
            const sg = ctx.createLinearGradient(tipX, tipY, endX, endY);
            sg.addColorStop(0, '#f0dcae'); sg.addColorStop(0.55, '#d9b46f'); sg.addColorStop(0.62, '#2b1406'); sg.addColorStop(1, '#4a230c');
            quad(s0, s0 + len, 2.3, 6.2, sg);
            quad(s0, s0 + 4, 2.3, 2.35, '#3b82f6');
            quad(s0 + 4, s0 + 12, 2.35, 2.5, '#f8fafc');
            quad(s0 + len * 0.6, s0 + len * 0.6 + 6, 4.7, 4.8, ACCENT);
            ctx.restore();
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id); return id;
        }

        destroy() {
            if (this.phase === 'aim' && this.kind !== 'online') this.save();
            if (this.kind === 'online' && this.phase !== 'over' && this.phase !== 'menu') {
                // Salir a mitad de partida online cuenta como derrota
                this.phase = 'over';
                Nexus.services.progress.recordGame({ game: 'billiards', mode: 'online', won: false, score: 0, time: 0, xp: 5,
                    extra: { online: true, reason: 'resign', level: 'online', ...this.stats } });
            }
            this.destroyed = true;
            this.loop.destroy();
            this.cv.destroy();
            window.removeEventListener('pointerup', this.onUp);
            window.removeEventListener('pointercancel', this.onUp);
            document.removeEventListener('keydown', this.onKey);
            if (this.unsubSettings) this.unsubSettings();
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
            this.lobby.destroy();
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function diamond(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'billiards') ? c.event : null;
    const cpuWin = (c, modes) => { const e = ev(c); return !!e && e.won && !e.extra.online && !e.extra.practice && modes.includes(e.mode); };
    A.register([
        { id: 'bi_first', game: 'billiards', name: 'Primera bola 8', desc: 'Gana una partida a la máquina.', icon: '🎱', rarity: 'common',
            test: (c) => cpuWin(c, ['easy', 'normal', 'hard', 'master']) },
        { id: 'bi_normal', game: 'billiards', name: 'Buen pulso', desc: 'Gana a la máquina en Normal o superior.', icon: '🎯', rarity: 'common',
            test: (c) => cpuWin(c, ['normal', 'hard', 'master']) },
        { id: 'bi_hard', game: 'billiards', name: 'Tiburón', desc: 'Gana a la máquina en Difícil o superior.', icon: '🦈', rarity: 'rare',
            test: (c) => cpuWin(c, ['hard', 'master']) },
        { id: 'bi_master', game: 'billiards', name: 'Maestro del paño', desc: 'Gana a la máquina en Maestro.', icon: '👑', rarity: 'legendary',
            test: (c) => cpuWin(c, ['master']) },
        { id: 'bi_break', game: 'billiards', name: 'Saque de campeón', desc: 'Mete 2 bolas o más en el saque.', icon: '💥', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.breakPot >= 2; } },
        { id: 'bi_combo', game: 'billiards', name: 'Tres de golpe', desc: 'Mete 3 bolas o más en un solo tiro.', icon: '🎆', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxShot >= 3; } },
        { id: 'bi_bank', game: 'billiards', name: 'Por banda', desc: 'Mete una bola que antes ha tocado banda.', icon: '↩️', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.banks >= 1; } },
        { id: 'bi_run5', game: 'billiards', name: 'Racha de cinco', desc: 'Mete 5 bolas seguidas sin ceder el turno.', icon: '🔥', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && !e.extra.practice && e.extra.maxRun >= 5; } },
        { id: 'bi_runout', game: 'billiards', name: 'Tacada limpia', desc: 'Gana metiendo tus 7 bolas y la 8 en un solo turno.', icon: '🧹', rarity: 'legendary',
            test: (c) => { const e = ev(c); return !!e && e.won && e.extra.runOut; } },
        { id: 'bi_clean', game: 'billiards', name: 'Juego limpio', desc: 'Gana sin cometer ninguna falta (Normal o superior, u online).', icon: '🧤', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.won && !e.extra.practice && e.extra.fouls === 0 && e.mode !== 'easy' && e.extra.reason !== 'forfeit'; } },
        { id: 'bi_practice', game: 'billiards', name: 'Mesa limpia', desc: 'En práctica, mete las 15 bolas en 30 tiros o menos.', icon: '🧽', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.extra.practice && e.won && e.extra.shots <= 30; } },
        { id: 'bi_online', game: 'billiards', name: 'Billar en red', desc: 'Juega una partida online.', icon: '🌐', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.online; } },
        { id: 'bi_online_win', game: 'billiards', name: 'Rey de los billares', desc: 'Gana una partida online metiendo la 8.', icon: '🏆', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.online && e.won && e.extra.reason === 'eight'; } },
        { id: 'bi_online10', game: 'billiards', name: 'Leyenda del billar', desc: 'Gana 10 partidas online.', icon: '🥇', rarity: 'epic',
            ...A.counter((c) => ((c.stats('billiards').byMode || {}).online || {}).wins || 0, 10) }
    ]);

    Nexus.games.registry.register({
        id: 'billiards', name: 'Billar', emoji: '🎱', accent: ACCENT,
        tagline: 'Bola 8 · Contra la máquina · Online 1 contra 1',
        description: 'Billar americano a la bola 8 con física real: choques, bandas, troneras y efecto en la blanca (alto, bajo y lateral). Juega contra la IA en 4 niveles, contra otra persona online o en modo práctica.',
        tags: ['Deportes', 'Multijugador'],
        modes: LEVELS.map(l => ({ id: l.id, label: l.label })).concat([{ id: 'online', label: 'Online' }, { id: 'practice', label: 'Práctica' }]),
        metrics: [{ id: 'wins', label: 'Victorias' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new BilliardsGame(root)
    });
})();
