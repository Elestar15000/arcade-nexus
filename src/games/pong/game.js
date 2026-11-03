/* ============================================================
   NEXUS ARCADE · games/pong/game.js
   Pong Turbo: el clásico de dos palas con estética neón.
     · Modo único "Turbo": la bola acelera con cada golpe; el punto
       de contacto decide el ángulo y el movimiento de la pala le
       da efecto. Cada devolución carga el ⚡ Turbo: cuando está
       lleno, actívalo y tu siguiente golpe es un remate ×1,55.
       Gana quien llegue a 7.
     · Contra la máquina: 4 niveles (Fácil, Normal, Difícil, Maestro).
     · Online 1 contra 1 sin servidor: el anfitrión crea la sala
       (su navegador hace de servidor y simula la partida) y el
       rival entra con el código o desde el buscador de salas.
       Ver src/core/net.js.
   Mientras estás en los menús, dos IA juegan una partida de
   exhibición de fondo.
   ============================================================ */
(function () {
    'use strict';

    const { esc, clamp, formatNumber } = Nexus.util;
    const Kit = Nexus.games.kit;

    // ── Constantes ──────────────────────────────────────────
    const W = 960, H = 540, WALL = 16;
    const PAD_W = 16, PAD_H = 104, PAD_X = [44, W - 44 - PAD_W];
    const R = 10;
    const BASE = 440, MAX = 1500, ACCEL = 1.05, TURBO_MUL = 1.55, METER_GAIN = 25;
    const WIN = 7;
    const KEY_SPEED = 660, PTR_SPEED = 1600;
    const Y_MIN = WALL + PAD_H / 2, Y_MAX = H - WALL - PAD_H / 2;
    const B_MIN = WALL + R, B_MAX = H - WALL - R;
    const C_ME = '#22d3ee', C_FOE = '#f472b6', C_TURBO = '#fb923c';

    const LEVELS = [
        { id: 'easy', emoji: '🌱', label: 'Fácil', desc: 'Lento y algo despistado. Para calentar la muñeca.',
            speed: 330, react: 0.30, err: 70, predict: false, aim: 0, turbo: 0, mult: 1 },
        { id: 'normal', emoji: '⚔️', label: 'Normal', desc: 'Lee la trayectoria y devuelve casi todo lo fácil.',
            speed: 440, react: 0.20, err: 44, predict: true, aim: 0.35, turbo: 0.25, mult: 1.5 },
        { id: 'hard', emoji: '🔥', label: 'Difícil', desc: 'Predice rebotes, busca ángulos y usa el Turbo.',
            speed: 560, react: 0.13, err: 28, predict: true, aim: 0.65, turbo: 0.7, mult: 2.2 },
        { id: 'master', emoji: '💀', label: 'Maestro', desc: 'Reflejos de máquina. Sólo la velocidad y los ángulos le ganan.',
            speed: 700, react: 0.075, err: 16, predict: true, aim: 0.9, turbo: 1, mult: 3 }
    ];
    const DEMO_LEVEL = { speed: 560, react: 0.13, err: 26, predict: true, aim: 0.6, turbo: 0.6 };
    const ONLINE_MULT = 2;
    const NET_ERRORS = {
        notfound: 'No hay ninguna sala abierta con ese código.',
        full: 'Esa sala ya tiene dos jugadores.',
        version: 'El anfitrión usa otra versión del juego. Recargad la página los dos.'
    };

    const rand = (a, b) => a + Math.random() * (b - a);
    /** Mezcla dos colores hex y devuelve hex (Kit.mix devuelve rgb()). */
    function mixHex(a, b, t) {
        t = clamp(t, 0, 1);
        const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
        const ch = (sh) => Math.round(((x >> sh) & 255) * (1 - t) + ((y >> sh) & 255) * t);
        return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
    }
    /** Pliega una coordenada y dentro de la pista simulando los rebotes en las paredes. */
    function foldY(y) {
        const L = B_MAX - B_MIN;
        let v = (y - B_MIN) % (2 * L);
        if (v < 0) v += 2 * L;
        return B_MIN + (v > L ? 2 * L - v : v);
    }
    const newPad = () => ({ y: H / 2, vy: 0, kv: 0, meter: 0, armed: false, flash: 0 });
    const newSideStats = () => ({ hits: 0, turbos: 0, turboGoals: 0, maxDef: 0 });

    class PongGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.level = LEVELS.find(l => l.id === Nexus.services.settings.get('pong.defaultLevel')) || LEVELS[1];
            this.kind = 'cpu';           // cpu | online
            this.state = 'menu';         // menu | playing | paused | over
            this.view = 'home';
            this.net = null;             // { role, conn, peer, ready:[h,g], code, isPublic }
            this.lobby = null;           // { hub, browser, rooms }
            this.t = 0;
            this.keys = { up: false, down: false };
            this.ptrY = null; this.ctrl = 'keys';
            this.armSeq = 0; this.lastArm = 0;
            this.particles = []; this.rings = []; this.floaters = []; this.trail = [];
            this.shake = 0; this.hitStop = 0; this.flash = null; this.ballPop = 0; this.scorePop = [0, 0];
            this.ais = [{ t: 0, target: H / 2 }, { t: 0, target: H / 2 }];
            this.events = [];
            this.build();
            this.sim = this.newSim(true);
            this.bind();
            this.loop = Kit.loop((dt) => this.update(dt), () => this.draw(), () => { if (this.state === 'playing' && this.kind === 'cpu') this.pause(); });
            this.loop.start();
            this.unsubProgress = Nexus.bus.on('progress:update', () => this.updateSide(true));
            const m = location.hash.match(/^#\/game\/pong\/([A-Za-z0-9]{5})$/);
            if (m) {
                history.replaceState(null, '', location.href.split('#')[0] + '#/game/pong');
                this.showOnline();
                this.joinRoom(m[1]);
            } else this.showHome();
            this.updateSide(true);
        }

        // ── Plantilla ───────────────────────────────────────
        build() {
            this.root.innerHTML = `
            <div class="game ax-game pong" style="--ax-accent:#22d3ee">
                ${Kit.header({ emoji: '🏓', title: 'Pong Turbo', pills: [
                    { id: 'score', icon: '🏓', init: '0 – 0', title: 'Marcador' },
                    { id: 'rally', icon: '🔥', init: '0', title: 'Peloteo' },
                    { id: 'ping', icon: '📶', init: '–', title: 'Latencia' }] })}
                <div class="ax-body">
                    <div class="ax-stage-wrap" id="pg-wrap">
                        <div class="ax-stage" id="pg-stage">
                            <canvas id="pg-canvas" aria-label="Pista de Pong Turbo"></canvas>
                            <div class="ax-toast" id="pg-toast" role="status"></div>
                        </div>
                        <div class="ax-overlay" id="pg-overlay"></div>
                    </div>
                    <aside class="ax-side">
                        <div class="ax-card">
                            <h3>Marcador</h3>
                            <div class="pg-vs">
                                <div class="pg-player me"><span class="pg-av" id="pg-me-av">🎮</span><span class="pg-name" id="pg-me-name">Tú</span><b class="pg-pts" id="pg-me-pts">0</b></div>
                                <div class="pg-player foe"><span class="pg-av" id="pg-foe-av">🤖</span><span class="pg-name" id="pg-foe-name">CPU</span><b class="pg-pts" id="pg-foe-pts">0</b></div>
                            </div>
                            <div class="ax-rows">
                                <div class="ax-row"><span>Rival</span><b id="pg-mode">–</b></div>
                                <div class="ax-row"><span>Peloteo</span><b id="pg-rally">0</b></div>
                                <div class="ax-row"><span>Mejor peloteo</span><b id="pg-best-rally">0</b></div>
                                <div class="ax-row"><span>Velocidad de la bola</span><b id="pg-speed">×1,0</b></div>
                                <div class="ax-row"><span>Victorias en este modo</span><b id="pg-wins">0</b></div>
                            </div>
                        </div>
                        <div class="ax-card pg-turbo-card" id="pg-turbo-card">
                            <h3>⚡ Turbo</h3>
                            <div class="ax-bar pg-meter"><i id="pg-meter"></i></div>
                            <p class="ax-hint" id="pg-turbo-hint">Devuelve la bola para cargarlo.</p>
                            <div class="ax-btn-row"><button class="btn btn-ghost" id="pg-btn-turbo" type="button" disabled>⚡ Activar Turbo</button></div>
                        </div>
                        <div class="ax-card" id="pg-net-card" hidden>
                            <h3>🌐 Conexión</h3>
                            <div class="ax-rows">
                                <div class="ax-row"><span>Sala</span><b id="pg-net-code">–</b></div>
                                <div class="ax-row"><span>Enlace</span><b id="pg-net-mode">–</b></div>
                                <div class="ax-row"><span>Latencia</span><b id="pg-net-ping">–</b></div>
                            </div>
                            <div class="ax-btn-row"><button class="btn btn-ghost" id="pg-btn-leave" type="button">🚪 Abandonar</button></div>
                        </div>
                        <div class="ax-card">
                            <h3>🎮 Controles</h3>
                            <p class="ax-hint"><kbd>↑</kbd><kbd>↓</kbd> o <kbd>W</kbd><kbd>S</kbd>, o mueve el ratón / el dedo sobre la pista ·
                                <kbd>Espacio</kbd> Turbo · <kbd>P</kbd> pausa (contra la máquina).</p>
                        </div>
                    </aside>
                </div>
                <div class="ax-touch pg-touch" id="pg-touch">
                    <button type="button" data-act="up" aria-label="Subir">▲</button>
                    <button type="button" data-act="down" aria-label="Bajar">▼</button>
                    <button type="button" class="pg-touch-turbo" data-act="turbo" aria-label="Turbo">⚡</button>
                </div>
            </div>`;
            this.$ = (s) => this.root.querySelector(s);
            this.canvas = this.$('#pg-canvas');
            this.stage = this.$('#pg-stage');
            this.overlay = this.$('#pg-overlay');
            this.fit = Kit.canvas(this.canvas, this.$('#pg-wrap'), this.stage, W, H);
            this.ctx = this.fit.ctx;
            // Patrón de líneas de barrido (CRT)
            const pc = document.createElement('canvas'); pc.width = 2; pc.height = 4;
            const pctx = pc.getContext('2d'); pctx.fillStyle = 'rgba(0,0,0,.22)'; pctx.fillRect(0, 0, 2, 1);
            this.scan = this.ctx.createPattern(pc, 'repeat');
        }

        // ── Simulación (CPU, anfitrión y exhibición) ────────
        newSim(demo) {
            return {
                ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, spd: BASE, turbo: false },
                pads: [newPad(), newPad()],
                score: [0, 0],
                phase: 'count', timer: demo ? 1 : 3,
                serveTo: Math.random() < 0.5 ? 0 : 1,
                rally: 0, hits: 0, maxRally: 0, maxSpd: BASE, lastHit: -1, winner: -1, time: 0,
                st: [newSideStats(), newSideStats()],
                demo: !!demo
            };
        }

        serve() {
            const s = this.sim, b = s.ball;
            const a = rand(-0.42, 0.42);
            const dir = s.serveTo === 0 ? -1 : 1;
            b.x = W / 2; b.y = rand(H * 0.35, H * 0.65);
            b.spd = BASE; b.turbo = false;
            b.vx = Math.cos(a) * BASE * dir; b.vy = Math.sin(a) * BASE;
            s.phase = 'live'; s.rally = 0; s.lastHit = -1;
            this.events.push({ k: 'serve' });
        }

        simStep(dt) {
            const s = this.sim;
            for (const p of s.pads) p.flash = Math.max(0, p.flash - dt * 4);
            if (s.phase === 'over') return;
            s.time += dt;
            if (s.phase === 'count' || s.phase === 'point') {
                s.timer -= dt;
                if (s.timer <= 0) this.serve();
                return;
            }
            const b = s.ball;
            const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 6));
            const h = dt / n;
            for (let i = 0; i < n; i++) {
                b.x += b.vx * h; b.y += b.vy * h;
                if (b.y < B_MIN) { b.y = 2 * B_MIN - b.y; b.vy = Math.abs(b.vy); this.events.push({ k: 'wall', x: b.x, y: B_MIN - R }); }
                else if (b.y > B_MAX) { b.y = 2 * B_MAX - b.y; b.vy = -Math.abs(b.vy); this.events.push({ k: 'wall', x: b.x, y: B_MAX + R }); }
                if (b.vx < 0) this.tryHit(0); else this.tryHit(1);
                if (b.x < -R * 3) { this.goal(1); break; }
                if (b.x > W + R * 3) { this.goal(0); break; }
            }
        }

        tryHit(i) {
            const s = this.sim, b = s.ball, p = s.pads[i];
            const face = i === 0 ? PAD_X[0] + PAD_W : PAD_X[1];
            const inX = i === 0 ? (b.x - R <= face && b.x > PAD_X[0] - R) : (b.x + R >= face && b.x < PAD_X[1] + PAD_W + R);
            if (!inX || Math.abs(b.y - p.y) > PAD_H / 2 + R * 0.8) return;
            const off = clamp((b.y - p.y) / (PAD_H / 2), -1, 1);
            b.spd = Math.min(MAX, b.spd * ACCEL);
            let real = b.spd, turbo = false;
            if (p.armed) {
                turbo = true; p.armed = false; p.meter = 0;
                real = Math.min(MAX * 1.25, b.spd * TURBO_MUL);
                s.st[i].turbos++;
            } else p.meter = Math.min(100, p.meter + METER_GAIN);
            const dir = i === 0 ? 1 : -1, ang = off * 1.0;
            let vx = Math.cos(ang) * real * dir, vy = Math.sin(ang) * real + clamp(p.vy, -1600, 1600) * 0.22;
            const m = Math.hypot(vx, vy); vx = vx / m * real; vy = vy / m * real;
            if (Math.abs(vx) < real * 0.5) { vx = dir * real * 0.5; vy = (vy < 0 ? -1 : 1) * Math.sqrt(real * real - vx * vx); }
            b.vx = vx; b.vy = vy; b.turbo = turbo;
            b.x = i === 0 ? face + R : face - R;
            s.rally++; s.hits++; s.maxRally = Math.max(s.maxRally, s.rally);
            s.maxSpd = Math.max(s.maxSpd, real); s.lastHit = i; s.st[i].hits++;
            p.flash = 1;
            this.events.push({ k: 'hit', i, x: b.x, y: b.y, spd: real, turbo });
        }

        goal(scorer) {
            const s = this.sim, b = s.ball;
            s.score[scorer]++;
            if (b.turbo && s.lastHit === scorer) s.st[scorer].turboGoals++;
            for (let i = 0; i < 2; i++) s.st[i].maxDef = Math.max(s.st[i].maxDef, s.score[1 - i] - s.score[i]);
            this.events.push({ k: 'goal', i: scorer, y: b.y, turbo: b.turbo && s.lastHit === scorer });
            b.x = W / 2; b.y = H / 2; b.vx = 0; b.vy = 0; b.turbo = false;
            if (s.score[scorer] >= WIN && !s.demo) { s.phase = 'over'; s.winner = scorer; this.events.push({ k: 'over' }); }
            else if (s.score[scorer] >= WIN) { this.sim = this.newSim(true); }
            else { s.phase = 'point'; s.timer = 1.3; s.serveTo = 1 - scorer; }
        }

        // ── Control de palas ────────────────────────────────
        controlLocal(p, dt) {
            const prev = p.y;
            if (this.ctrl === 'pointer' && this.ptrY !== null) {
                const d = this.ptrY - p.y, mx = PTR_SPEED * dt;
                p.y += clamp(d, -mx, mx);
                p.kv = 0;
            } else {
                const dir = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
                p.kv = Kit.approach(p.kv || 0, dir * KEY_SPEED, dt * 16);
                p.y += p.kv * dt;
            }
            p.y = clamp(p.y, Y_MIN, Y_MAX);
            p.vy = dt > 0 ? (p.y - prev) / dt : 0;
        }

        aiMove(i, L, dt) {
            const s = this.sim, b = s.ball, p = s.pads[i], ai = this.ais[i];
            const coming = s.phase === 'live' && (i === 1 ? b.vx > 0 : b.vx < 0);
            ai.t -= dt;
            if (ai.t <= 0) {
                ai.t = L.react * rand(0.7, 1.3);
                if (coming) {
                    const faceX = i === 1 ? PAD_X[1] - R : PAD_X[0] + PAD_W + R;
                    const far = Math.abs(faceX - b.x) / W;
                    let y;
                    if (L.predict) y = foldY(b.y + b.vy * ((faceX - b.x) / b.vx));
                    else y = b.y + b.vy * 0.12;
                    let aim = 0;
                    if (Math.random() < L.aim) aim = (Math.random() < 0.5 ? -1 : 1) * PAD_H * rand(0.18, 0.36);
                    // Cuanto más rápida va la bola, más le cuesta acertar (también a la máquina)
                    const ratio = Math.hypot(b.vx, b.vy) / BASE;
                    ai.target = y + L.err * (0.45 + far) * Math.pow(ratio, 1.6) * rand(-1, 1) - aim;
                    if (p.meter >= 100 && !p.armed && Math.random() < L.turbo * 0.5) { p.armed = true; if (!s.demo) this.events.push({ k: 'arm', i }); }
                } else {
                    ai.target = H / 2 + (b.y - H / 2) * 0.3;
                }
            }
            const prev = p.y, d = ai.target - p.y, mx = L.speed * dt;
            p.y = clamp(p.y + clamp(d, -mx, mx) * (Math.abs(d) < 14 ? 0.5 : 1), Y_MIN, Y_MAX);
            p.vy = dt > 0 ? (p.y - prev) / dt : 0;
        }

        // ── Bucle ───────────────────────────────────────────
        update(dt) {
            this.t += dt;
            this.updateFx(dt);
            const s = this.sim;

            if (this.state === 'menu' || (this.state === 'over' && s.demo)) {
                this.aiMove(0, DEMO_LEVEL, dt); this.aiMove(1, DEMO_LEVEL, dt);
                this.simStep(dt);
                this.consumeEvents(true);
            } else if (this.state === 'playing') {
                if (this.kind === 'online' && this.net && this.net.role === 'guest') {
                    this.guestUpdate(dt);
                } else {
                    if (this.hitStop > 0) { this.hitStop -= dt; this.controlLocal(s.pads[0], dt); }
                    else {
                        this.controlLocal(s.pads[0], dt);
                        if (this.kind === 'cpu') this.aiMove(1, this.level, dt);
                        this.simStep(dt);
                    }
                    this.consumeEvents(false);
                    if (this.kind === 'online') this.hostNet(dt);
                    if (s.phase === 'over' && this.state === 'playing') this.matchOver();
                }
                this.countdownSound();
            }
            this.updateTrail(dt);
            this.tickSide(dt);
        }

        countdownSound() {
            const s = this.sim;
            if (s.phase !== 'count') { this._cd = null; return; }
            const c = Math.ceil(s.timer);
            if (c !== this._cd && c >= 1 && c <= 3) { this._cd = c; Nexus.audio.play('pongBeep', 0); }
            if (s.timer <= 0.05 && this._cd !== 0) { this._cd = 0; Nexus.audio.play('pongBeep', 1); }
        }

        // ── Efectos a partir de eventos ─────────────────────
        consumeEvents(demo) {
            for (const e of this.events.splice(0)) this.effect(e, demo);
        }

        effect(e, demo) {
            const me = this.meIdx();
            const color = (i) => (i === me ? C_ME : C_FOE);
            const sx = (x) => this.sx(x);
            const big = !this.calm();
            if (e.k === 'hit') {
                const ratio = e.spd / BASE;
                const dir = this.sx(e.i === 0 ? W : 0) > sx(e.x) ? 1 : -1;
                this.sparks(sx(e.x), e.y, e.turbo ? C_TURBO : color(e.i), e.turbo ? 34 : 12 + Math.round(ratio * 3), 160 + ratio * 70, dir);
                this.rings.push({ x: sx(e.x), y: e.y, r: 6, life: 0.45, max: 0.45, color: e.turbo ? C_TURBO : color(e.i), w: e.turbo ? 5 : 3 });
                this.ballPop = 1;
                if (big) this.shake = Math.max(this.shake, e.turbo ? 0.9 : Math.min(0.45, (ratio - 1) * 0.18));
                if (e.turbo && !demo && this.state === 'playing') { this.hitStop = 0.05; this.floatText('¡TURBO!', C_TURBO, sx(e.x), e.y - 30, 30); }
                if (!demo) Nexus.audio.play(e.turbo ? 'pongTurbo' : 'pongHit', ratio);
            } else if (e.k === 'wall') {
                this.sparks(sx(e.x), e.y, '#a5b4fc', 5, 110, 0);
                if (!demo) Nexus.audio.play('pongWall');
            } else if (e.k === 'goal') {
                const scrSide = this.sx(e.i === 0 ? W : 0) > W / 2 ? 1 : 0;   // lado de pantalla donde entró la bola
                const x = scrSide ? W - 4 : 4;
                this.sparks(x, e.y, color(e.i), big ? 60 : 24, 360, scrSide ? -1 : 1);
                this.rings.push({ x, y: e.y, r: 10, life: 0.7, max: 0.7, color: color(e.i), w: 6 });
                this.flash = { side: scrSide, life: 0.6, color: color(e.i) };
                this.scorePop[this.sx(e.i === 0 ? 0 : W) < W / 2 ? 0 : 1] = 1;
                if (big) this.shake = 1;
                this.trail = [];
                if (!demo) {
                    this.floatText(e.i === me ? '¡PUNTO!' : (this.kind === 'cpu' ? 'Punto de la CPU' : 'Punto del rival'), color(e.i), W / 2, H / 2 - 70, 34);
                    if (e.turbo) this.floatText('⚡ Remate turbo', C_TURBO, W / 2, H / 2 - 30, 20);
                    Nexus.audio.play(e.i === me ? 'pongGoal' : 'pongMiss');
                }
            } else if (e.k === 'arm') {
                if (!demo) Nexus.audio.play('powerActivate');
            } else if (e.k === 'serve') {
                this.trail = [];
            }
        }

        calm() { return !!Nexus.services.settings.get('reduceMotion') || !Nexus.services.settings.get('pong.shake'); }

        sparks(x, y, color, n, speed, dir) {
            if (Nexus.services.settings.get('reduceMotion')) n = Math.ceil(n / 3);
            for (let i = 0; i < n; i++) {
                const a = dir ? (dir > 0 ? 0 : Math.PI) + rand(-1.1, 1.1) : rand(0, Math.PI * 2);
                const v = speed * rand(0.25, 1);
                this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.75), max: 0.75, color, s: rand(1.5, 3.8) });
            }
        }
        floatText(text, color, x, y, size) { this.floaters.push({ text, color, x, y, life: 1.2, max: 1.2, size: size || 24 }); }

        updateFx(dt) {
            for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
            this.particles = this.particles.filter(p => p.life > 0);
            if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
            for (const r of this.rings) { r.r += dt * 220; r.life -= dt; }
            this.rings = this.rings.filter(r => r.life > 0);
            for (const f of this.floaters) { f.y -= 26 * dt; f.life -= dt; }
            this.floaters = this.floaters.filter(f => f.life > 0);
            this.shake = Math.max(0, this.shake - dt * 3.2);
            this.ballPop = Math.max(0, this.ballPop - dt * 5);
            this.scorePop = this.scorePop.map(v => Math.max(0, v - dt * 2.2));
            if (this.flash && (this.flash.life -= dt) <= 0) this.flash = null;
            if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.$('#pg-toast').classList.remove('show');
        }

        updateTrail() {
            const s = this.sim, b = s.ball;
            if (s.phase !== 'live') { if (this.trail.length) this.trail.shift(); return; }
            this.trail.push({ x: b.x, y: b.y, turbo: b.turbo });
            if (this.trail.length > 22) this.trail.shift();
            if (b.turbo && Math.random() < 0.8) {
                const sx = this.sx(b.x);
                this.particles.push({ x: sx + rand(-4, 4), y: b.y + rand(-4, 4), vx: -this.sxv(b.vx) * 0.08 + rand(-30, 30), vy: rand(-40, 40), life: rand(0.2, 0.45), max: 0.45, color: Math.random() < 0.5 ? '#fde047' : C_TURBO, s: rand(2, 4) });
            }
        }

        // ── Vista (espejo para el invitado: siempre te ves a la izquierda) ──
        meIdx() { return this.net && this.net.role === 'guest' && this.kind === 'online' && !this.sim.demo ? 1 : 0; }
        mirrored() { return this.meIdx() === 1; }
        sx(x) { return this.mirrored() ? W - x : x; }
        sxv(vx) { return this.mirrored() ? -vx : vx; }

        // ── Entrada ─────────────────────────────────────────
        bind() {
            const blocked = () => this.destroyed || !!document.querySelector('.modal-overlay.active');
            this.onKeyDown = (e) => {
                if (blocked()) return;
                if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
                if (this.handleKey(e.key, true, e.repeat)) e.preventDefault();
            };
            this.onKeyUp = (e) => this.handleKey(e.key, false, false);
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup', this.onKeyUp);

            const toY = (e) => { const r = this.canvas.getBoundingClientRect(); return clamp(((e.clientY - r.top) / r.height) * H, 0, H); };
            this.stage.addEventListener('pointermove', (e) => {
                if (e.pointerType === 'mouse' || e.buttons || e.pointerType === 'touch') { this.ptrY = toY(e); this.ctrl = 'pointer'; }
            });
            this.stage.addEventListener('pointerdown', (e) => { this.ptrY = toY(e); this.ctrl = 'pointer'; });

            Kit.touchButtons(this.$('#pg-touch'), (a) => {
                if (a === 'turbo') this.arm();
                else { this.ctrl = 'keys'; this.keys[a] = true; }
            }, (a) => { if (a !== 'turbo') this.keys[a] = false; });
            this.$('#pg-btn-turbo').addEventListener('click', () => this.arm());
            this.$('#pg-btn-leave').addEventListener('click', () => this.confirmLeave());

            this.overlay.addEventListener('click', (e) => this.onOverlayClick(e));
            this.overlay.addEventListener('submit', (e) => { e.preventDefault(); const i = this.$('#pg-code'); if (i) this.joinRoom(i.value); });
            this.overlay.addEventListener('input', (e) => {
                if (e.target.id === 'pg-code') { const v = Nexus.net.normalizeCode(e.target.value); if (v !== e.target.value) e.target.value = v; }
            });
        }

        handleKey(k, down, repeat) {
            const map = { ArrowUp: 'up', ArrowDown: 'down', w: 'up', s: 'down', W: 'up', S: 'down' };
            if (map[k]) { this.keys[map[k]] = down; if (down) this.ctrl = 'keys'; return this.state === 'playing' || this.state === 'paused'; }
            if (!down) return false;
            if (k === 'p' || k === 'P' || k === 'Escape') {
                if (this.kind === 'cpu') {
                    if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume();
                    return true;
                }
                if (this.state === 'playing') { this.confirmLeave(); return true; }
                return false;
            }
            if (k === ' ' && !repeat) { if (this.state === 'playing') { this.arm(); return true; } return false; }
            if (k === 'Enter' && this.state === 'menu' && this.view === 'cpu') { this.startCpu(); return true; }
            return false;
        }

        arm() {
            if (this.state !== 'playing') return;
            const s = this.sim;
            if (this.kind === 'online' && this.net && this.net.role === 'guest') {
                if (s.pads[1].meter >= 100 && !s.pads[1].armed) { this.armSeq++; s.pads[1].armed = true; Nexus.audio.play('powerActivate'); }
                return;
            }
            const p = s.pads[0];
            if (p.meter >= 100 && !p.armed) { p.armed = true; Nexus.audio.play('powerActivate'); this.updateSide(); }
        }

        onOverlayClick(e) {
            const lv = e.target.closest('[data-mode]');
            if (lv) {
                this.level = LEVELS.find(l => l.id === lv.dataset.mode) || this.level;
                Nexus.audio.play('click');
                this.showCpu(); this.updateSide(true);
                return;
            }
            const b = e.target.closest('[data-do]');
            if (!b) return;
            const d = b.dataset.do;
            Nexus.audio.play('click');
            switch (d) {
                case 'go-cpu': this.kind = 'cpu'; this.showCpu(); this.updateSide(true); break;
                case 'go-online': this.showOnline(); break;
                case 'home': this.leaveOnline(); this.showHome(); break;
                case 'start': case 'restart': this.startCpu(); break;
                case 'resume': this.resume(); break;
                case 'menu': this.state = 'menu'; this.sim = this.newSim(true); this.showCpu(); break;
                case 'create': this.createRoom(); break;
                case 'join': this.joinRoom(b.dataset.code); break;
                case 'join-code': { const i = this.$('#pg-code'); this.joinRoom(i ? i.value : ''); break; }
                case 'retry': this.closeLobby(); this.showOnline(); break;
                case 'cancel-room': this.leaveRoom(); this.showOnline(); break;
                case 'copy-code': this.copy(this.net.code, 'Código copiado'); break;
                case 'copy-link': this.copy(location.href.split('#')[0] + '#/game/pong/' + this.net.code, 'Enlace copiado'); break;
                case 'ready': this.setReady(); break;
                case 'stay': this.overlay.hidden = true; break;
                case 'forfeit': this.forfeit(); break;
                default: break;
            }
        }

        // ── Contra la máquina ───────────────────────────────
        startCpu() {
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.kind = 'cpu';
            this.sim = this.newSim(false);
            this.sim.pads[0].y = this.sim.pads[1].y = H / 2;
            this.ais = [{ t: 0, target: H / 2 }, { t: 0, target: H / 2 }];
            this.trail = []; this.particles = []; this.floaters = [];
            this.state = 'playing';
            this.overlay.hidden = true;
            this.updateSide(true);
        }

        pause() {
            if (this.state !== 'playing' || this.kind !== 'cpu') return;
            this.state = 'paused';
            this.keys.up = this.keys.down = false;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">PAUSA</h2>
                <div class="ax-play-row">
                    <button class="btn btn-primary" data-do="resume" type="button">▶ Continuar</button>
                    <button class="btn btn-ghost" data-do="restart" type="button">🔄 Reiniciar</button>
                    <button class="btn btn-ghost" data-do="menu" type="button">☰ Niveles</button>
                </div></div>`;
        }
        resume() {
            if (this.state !== 'paused') return;
            this.state = 'playing';
            this.overlay.hidden = true;
        }

        // ── Pantallas del menú ──────────────────────────────
        showHome() {
            this.view = 'home';
            this.state = 'menu';
            if (!this.sim.demo) this.sim = this.newSim(true);
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pg-panel">
                <div class="pg-logo"><span class="pg-logo-a">PONG</span><span class="pg-logo-b">TURBO</span></div>
                <p class="ax-sub">La bola acelera con cada golpe. Carga el ⚡ Turbo y remata. Gana quien llegue a ${WIN}.</p>
                <div class="pg-choices">
                    <button type="button" class="pg-choice" data-do="go-cpu">
                        <span class="pg-choice-emoji">🤖</span>
                        <strong>Contra la máquina</strong>
                        <small>4 niveles: Fácil, Normal, Difícil y Maestro</small>
                    </button>
                    <button type="button" class="pg-choice online" data-do="go-online">
                        <span class="pg-choice-emoji">🌐</span>
                        <strong>Online 1 contra 1</strong>
                        <small>Crea una sala o entra con un código</small>
                    </button>
                </div>
                ${this.helpHtml()}
            </div>`;
        }

        helpHtml() {
            return `<details class="ax-help"><summary>📖 Cómo se juega</summary><ul>
                <li>Mueve tu pala con <kbd>↑</kbd><kbd>↓</kbd> / <kbd>W</kbd><kbd>S</kbd>, con el ratón o arrastrando el dedo sobre la pista.</li>
                <li>El <b>punto de contacto</b> decide el ángulo: el centro la devuelve recta, los bordes la cruzan. Si mueves la pala al golpear, le das <b>efecto</b>.</li>
                <li>Cada golpe acelera la bola un 5 %. Cuanto más dura el peloteo, más rápido va.</li>
                <li><b>⚡ Turbo</b>: cada devolución carga un 25 %. Lleno, pulsa <kbd>Espacio</kbd> (o el botón) y tu siguiente golpe será un remate ×1,55 en llamas.</li>
                <li><b>Online</b>: quien crea la sala hace de servidor desde su navegador; el rival entra con el código de 5 letras, con el enlace o desde el buscador. Tu pala siempre se ve a la izquierda.</li>
            </ul></details>`;
        }

        showCpu() {
            this.view = 'cpu';
            this.state = 'menu';
            this.kind = 'cpu';
            if (!this.sim.demo) this.sim = this.newSim(true);
            const ms = Nexus.services.progress.stats('pong').byMode[this.level.id];
            const rec = ms && ms.played ? `Contra ${esc(this.level.label)}: <b>${ms.wins}</b> victorias en ${ms.played} partidas · mejor <b>${formatNumber(ms.bestScore)}</b> pts` : `Aún no has jugado contra el nivel ${esc(this.level.label)}`;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pg-panel">
                <h2 class="ax-big">CONTRA LA MÁQUINA</h2>
                <p class="ax-sub">Elige el nivel de la IA. La puntuación se multiplica según la dificultad.</p>
                ${Kit.modeCards(LEVELS.map(l => ({ ...l, desc: l.desc + ' (×' + String(l.mult).replace('.', ',') + ')' })), this.level.id)}
                <div class="ax-best">${rec}</div>
                <div class="ax-play-row">
                    <button class="btn btn-ghost" data-do="home" type="button">← Volver</button>
                    <button class="btn btn-primary btn-glow" data-do="start" type="button">▶ Jugar · ${esc(this.level.label)}</button>
                </div>
            </div>`;
        }

        // ── Online: vestíbulo ───────────────────────────────
        myInfo() {
            const u = Nexus.services.users.current() || {};
            return { name: u.name || 'Jugador', avatar: u.avatar || '🎮', color: u.color || '#22d3ee', level: Nexus.services.progress.level().level };
        }

        ensureLobby() {
            if (this.lobby) return this.lobby;
            const hub = new Nexus.net.Hub();
            const browser = new Nexus.net.RoomBrowser({ game: 'pong', hub });
            const lobby = this.lobby = { hub, browser, rooms: [], status: 'connecting' };
            browser.on('rooms', (list) => { lobby.rooms = list; if (this.view === 'online') this.renderRooms(); });
            browser.on('status', (n) => { lobby.status = n > 0 ? 'online' : 'offline'; if (this.view === 'online') this.renderNetStatus(); });
            browser.start().then(() => { lobby.status = 'online'; if (this.view === 'online') this.renderNetStatus(); })
                .catch(() => { lobby.status = 'error'; if (this.view === 'online') this.renderNetStatus(); });
            return lobby;
        }

        closeLobby() {
            if (!this.lobby) return;
            try { this.lobby.browser.stop(); } catch (_) { /* noop */ }
            this.lobby.hub.close();
            this.lobby = null;
        }

        showOnline(errorMsg) {
            this.view = 'online';
            this.state = 'menu';
            this.kind = 'online';
            if (!this.sim.demo) this.sim = this.newSim(true);
            this.ensureLobby();
            this.updateSide(true);
            const pub = Nexus.services.settings.get('pong.publicRooms') !== false;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pg-panel pg-lobby">
                <h2 class="ax-big">ONLINE 1 CONTRA 1</h2>
                <div class="pg-net-status" id="pg-net-status"></div>
                ${errorMsg ? `<div class="pg-error" role="alert">${esc(errorMsg)}</div>` : ''}
                <div class="pg-lobby-grid">
                    <div class="pg-box">
                        <h3>🏠 Crear sala</h3>
                        <p class="ax-hint">Tu navegador hará de servidor. Comparte el código con tu rival.</p>
                        <label class="pg-check"><input type="checkbox" id="pg-public" ${pub ? 'checked' : ''}> Pública (aparece en el buscador)</label>
                        <button class="btn btn-primary btn-glow" data-do="create" type="button">＋ Crear sala</button>
                    </div>
                    <form class="pg-box" id="pg-join-form" autocomplete="off">
                        <h3>🔑 Unirse con código</h3>
                        <p class="ax-hint">5 caracteres, sin I, O, 0 ni 1.</p>
                        <input class="pg-code-input" id="pg-code" maxlength="5" placeholder="ABCDE" aria-label="Código de sala" autocapitalize="characters" spellcheck="false">
                        <button class="btn btn-ghost" data-do="join-code" type="button">Entrar →</button>
                    </form>
                </div>
                <div class="pg-box pg-rooms-box">
                    <h3>🔎 Salas abiertas</h3>
                    <div class="pg-rooms" id="pg-rooms"></div>
                </div>
                <div class="ax-play-row"><button class="btn btn-ghost" data-do="home" type="button">← Volver</button></div>
            </div>`;
            this.$('#pg-public').addEventListener('change', (e) => Nexus.services.settings.set('pong.publicRooms', e.target.checked));
            this.renderNetStatus();
            this.renderRooms();
        }

        renderNetStatus() {
            const el = this.$('#pg-net-status'); if (!el || !this.lobby) return;
            const st = this.lobby.status, hub = this.lobby.hub;
            el.dataset.state = st;
            el.innerHTML = st === 'online' ? `<i></i> Conectado a la red de partidas · ${hub.online}/${hub.total} servidores`
                : st === 'error' ? `<i></i> No se pudo conectar con la red de partidas. <button class="btn-link" data-do="retry" type="button">Reintentar</button>`
                    : st === 'offline' ? '<i></i> Conexión perdida, reintentando…' : '<i></i> Conectando con la red de partidas…';
        }

        renderRooms() {
            const el = this.$('#pg-rooms'); if (!el || !this.lobby) return;
            const rooms = this.lobby.rooms.filter(r => !this.net || r.code !== this.net.code);
            if (!rooms.length) {
                el.innerHTML = `<p class="pg-empty">${this.lobby.status === 'online' ? 'No hay salas públicas abiertas ahora mismo. ¡Crea una!' : 'Buscando salas…'}</p>`;
                return;
            }
            el.innerHTML = rooms.map(r => `
                <div class="pg-room">
                    <span class="pg-room-av" style="--c:${esc(r.host.color)}">${esc(r.host.avatar)}</span>
                    <span class="pg-room-info"><b>${esc(r.host.name)}</b><small>Nivel ${r.host.level} · sala ${esc(r.code)} · ${this.ago(r.ts)}</small></span>
                    <button class="btn btn-primary" data-do="join" data-code="${esc(r.code)}" type="button">Unirse</button>
                </div>`).join('');
        }

        ago(ts) {
            const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
            return s < 30 ? 'ahora' : s < 90 ? 'hace 1 min' : `hace ${Math.round(s / 60)} min`;
        }

        // ── Online: anfitrión ───────────────────────────────
        async createRoom() {
            if (this.net) return;
            const isPublic = !!(this.$('#pg-public') ? this.$('#pg-public').checked : true);
            const host = new Nexus.net.RoomHost({ game: 'pong', info: this.myInfo(), isPublic });
            this.net = { role: 'host', conn: host, peer: null, ready: [false, false], code: host.code, isPublic, linking: false };
            this.view = 'opening';
            this.overlay.innerHTML = `<div class="ax-panel pg-panel"><div class="pg-spinner"></div><p class="ax-sub">Abriendo sala…</p></div>`;
            host.on('joining', (g) => { if (this.net && this.net.conn === host) { this.net.peer = g.info; this.net.linking = true; if (this.state !== 'playing') this.showHostWait(); } });
            host.on('guest', (g, mode) => {
                if (!this.net || this.net.conn !== host) return;
                this.net.peer = g.info; this.net.linking = false; this.net.ready = [false, false];
                Nexus.audio.play('orbCollect');
                this.toast(`${g.info.name} se ha unido (${mode === 'p2p' ? 'conexión directa' : 'retransmitida'})`);
                this.sendRoom();
                this.showRoom();
            });
            host.on('message', (m) => this.onNet(m));
            host.on('guestLeft', (g, reason) => this.onPeerLost(reason, g && g.info));
            host.on('mode', () => this.updateSide());
            host.on('rtt', () => this.updatePing());
            try {
                await host.open();
                if (this.destroyed || !this.net || this.net.conn !== host) { host.close(); return; }
                this.showHostWait();
                this.updateSide(true);
            } catch (e) {
                host.close();
                this.net = null;
                this.showOnline('No se pudo abrir la sala: ' + e.message);
            }
        }

        showHostWait() {
            this.view = 'host-wait';
            this.state = 'menu';
            const n = this.net;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pg-panel">
                <h2 class="ax-big">TU SALA</h2>
                <p class="ax-sub">${n.isPublic ? 'Sala pública: aparece en el buscador.' : 'Sala privada: sólo se entra con el código.'}</p>
                <div class="pg-code-big" aria-label="Código de sala">${esc(n.code).split('').map(ch => `<span>${ch}</span>`).join('')}</div>
                <div class="ax-play-row">
                    <button class="btn btn-ghost" data-do="copy-code" type="button">📋 Copiar código</button>
                    <button class="btn btn-ghost" data-do="copy-link" type="button">🔗 Copiar enlace</button>
                </div>
                <div class="pg-waiting"><div class="pg-spinner"></div>
                    <span>${n.linking && n.peer ? `Conectando con <b>${esc(n.peer.name)}</b>…` : 'Esperando a un rival…'}</span></div>
                <div class="ax-play-row"><button class="btn btn-ghost" data-do="cancel-room" type="button">✕ Cerrar sala</button></div>
            </div>`;
        }

        sendRoom() {
            if (this.net && this.net.role === 'host') this.net.conn.send({ t: 'room', ready: this.net.ready }, true);
        }

        // ── Online: invitado ────────────────────────────────
        joinRoom(raw) {
            const code = Nexus.net.normalizeCode(raw);
            if (code.length !== 5) { this.showOnline('El código debe tener 5 caracteres.'); return; }
            if (this.net) return;
            const lobby = this.ensureLobby();
            const guest = new Nexus.net.RoomGuest({ game: 'pong', code, info: this.myInfo(), hub: lobby.hub });
            this.net = { role: 'guest', conn: guest, peer: null, ready: [false, false], code };
            this.view = 'joining';
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pg-panel">
                <h2 class="ax-big">SALA ${esc(code)}</h2>
                <div class="pg-waiting"><div class="pg-spinner"></div><span id="pg-join-msg">Buscando la sala…</span></div>
                <div class="ax-play-row"><button class="btn btn-ghost" data-do="cancel-room" type="button">✕ Cancelar</button></div>
            </div>`;
            guest.on('welcome', (h) => {
                if (!this.net || this.net.conn !== guest) return;
                this.net.peer = h;
                const el = this.$('#pg-join-msg');
                if (el) el.innerHTML = `Sala de <b>${esc(h.name)}</b> encontrada. Estableciendo conexión directa…`;
            });
            guest.on('ready', (h, mode) => {
                if (!this.net || this.net.conn !== guest) return;
                this.net.peer = h;
                Nexus.audio.play('orbCollect');
                this.toast(`Conectado con ${h.name} (${mode === 'p2p' ? 'directa' : 'retransmitida'})`);
                this.showRoom();
                this.updateSide(true);
            });
            guest.on('error', (e) => {
                if (!this.net || this.net.conn !== guest) return;
                this.net = null;
                this.showOnline(NET_ERRORS[e] || 'No se pudo entrar en la sala.');
            });
            guest.on('lost', (reason) => this.onPeerLost(reason, this.net && this.net.peer));
            guest.on('message', (m) => this.onNet(m));
            guest.on('mode', () => this.updateSide());
            guest.on('rtt', () => this.updatePing());
            guest.join().catch(() => {
                if (this.net && this.net.conn === guest) { this.net = null; this.showOnline('No se pudo conectar con la red de partidas.'); }
            });
        }

        // ── Online: sala con los dos jugadores ──────────────
        showRoom() {
            const n = this.net;
            if (!n) { this.showOnline(); return; }
            if (n.role === 'host' && !n.conn.guest) { this.showHostWait(); return; }
            this.view = 'room';
            this.state = 'menu';
            this.kind = 'online';
            if (!this.sim.demo) this.sim = this.newSim(true);
            const me = n.role === 'host' ? 0 : 1;
            const mine = this.myInfo(), peer = n.peer || { name: 'Rival', avatar: '❔', level: 1 };
            const ready = n.ready;
            const card = (info, isMe, rdy) => `
                <div class="pg-seat ${isMe ? 'me' : 'foe'}${rdy ? ' ready' : ''}">
                    <span class="pg-seat-av">${esc(info.avatar)}</span>
                    <b>${esc(info.name)}${isMe ? ' <small>(tú)</small>' : ''}</b>
                    <small>Nivel ${info.level || 1}${(isMe ? n.role : (n.role === 'host' ? 'guest' : 'host')) === 'host' ? ' · anfitrión' : ''}</small>
                    <span class="pg-seat-state">${rdy ? '✅ Listo' : '⏳ No listo'}</span>
                </div>`;
            const conn = n.conn, mode = conn.mode;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pg-panel">
                <h2 class="ax-big">SALA ${esc(n.code)}</h2>
                <p class="ax-sub">${mode === 'p2p' ? '⚡ Conexión directa entre navegadores' : '📡 Conexión retransmitida (algo más de latencia)'}${conn.rtt != null ? ` · ${Math.round(conn.rtt)} ms` : ''}</p>
                <div class="pg-seats">${card(mine, true, ready[me])}<span class="pg-vs-badge">VS</span>${card(peer, false, ready[1 - me])}</div>
                <p class="ax-hint">La partida empieza cuando los dos estéis listos. Primero en llegar a ${WIN} gana.</p>
                <div class="ax-play-row">
                    <button class="btn ${ready[me] ? 'btn-ghost' : 'btn-primary btn-glow'}" data-do="ready" type="button">${ready[me] ? '✋ No estoy listo' : '✅ ¡Listo!'}</button>
                    <button class="btn btn-ghost" data-do="cancel-room" type="button">🚪 Salir de la sala</button>
                </div>
            </div>`;
            this.updateSide(true);
        }

        setReady() {
            const n = this.net; if (!n) return;
            const me = n.role === 'host' ? 0 : 1;
            n.ready[me] = !n.ready[me];
            if (n.role === 'host') { this.sendRoom(); this.maybeStart(); }
            else n.conn.send({ t: 'ready', v: n.ready[1] }, true);
            if (this.state !== 'playing') this.showRoom();
        }

        maybeStart() {
            const n = this.net;
            if (!n || n.role !== 'host' || !n.conn.guest || !n.ready[0] || !n.ready[1]) return;
            n.ready = [false, false];
            n.conn.send({ t: 'start' }, true);
            this.startOnline();
        }

        startOnline() {
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.kind = 'online';
            this.sim = this.newSim(false);
            this.trail = []; this.particles = []; this.floaters = [];
            this.netAcc = 0; this.snapQ = 0; this.lastSnapQ = 0; this.inQ = 0; this.lastInQ = 0;
            this.armSeq = 0; this.lastArm = 0;
            this.nb = null; this.corr = { x: 0, y: 0 }; this.hostY = H / 2;
            this.state = 'playing';
            this.view = 'match';
            this.overlay.hidden = true;
            Nexus.audio.play('tdRound');
            this.updateSide(true);
        }

        /** Mensajes del otro jugador. */
        onNet(m) {
            const n = this.net; if (!n || !m || typeof m.t !== 'string') return;
            if (n.role === 'host') {
                if (m.t === 'I') {
                    if (this.state !== 'playing' || typeof m.q !== 'number' || m.q <= (this.lastInQ || 0)) return;
                    this.lastInQ = m.q;
                    const p = this.sim.pads[1];
                    if (Number.isFinite(m.y)) p.y = clamp(m.y, Y_MIN, Y_MAX);
                    if (Number.isFinite(m.vy)) p.vy = clamp(m.vy, -2400, 2400);
                    if (typeof m.a === 'number' && m.a > this.lastArm) {
                        this.lastArm = m.a;
                        if (p.meter >= 100 && !p.armed) { p.armed = true; this.events.push({ k: 'arm', i: 1 }); }
                    }
                } else if (m.t === 'ready') {
                    n.ready[1] = !!m.v; this.sendRoom();
                    if (this.state !== 'playing') this.showRoom();
                    this.maybeStart();
                }
            } else {
                if (m.t === 'S') this.onSnap(m);
                else if (m.t === 'room') { n.ready = [!!m.ready[0], !!m.ready[1]]; if (this.state !== 'playing' && this.view === 'room') this.showRoom(); }
                else if (m.t === 'start') { n.ready = [false, false]; this.startOnline(); }
                else if (m.t === 'end' && this.state === 'playing') this.finish(m.d);
            }
        }

        hostNet(dt) {
            const n = this.net; if (!n || !n.conn.guest) return;
            this.netAcc += dt;
            const iv = n.conn.mode === 'p2p' ? 1 / 30 : 1 / 15;
            if (this.netAcc < iv) return;
            this.netAcc = 0;
            const s = this.sim, b = s.ball, r1 = (v) => Math.round(v * 10) / 10;
            n.conn.send({
                t: 'S', q: ++this.snapQ,
                b: [r1(b.x), r1(b.y), Math.round(b.vx), Math.round(b.vy), b.turbo ? 1 : 0],
                p: [r1(s.pads[0].y), r1(s.pads[1].y)],
                m: [s.pads[0].meter, s.pads[1].meter], a: [s.pads[0].armed ? 1 : 0, s.pads[1].armed ? 1 : 0],
                s: s.score, ph: s.phase, tm: Math.round(s.timer * 100) / 100,
                r: s.rally, h: s.hits, mr: s.maxRally, ms: Math.round(s.maxSpd), lh: s.lastHit
            });
        }

        onSnap(S) {
            if (this.state !== 'playing' || typeof S.q !== 'number' || S.q <= this.lastSnapQ) return;
            if (!Array.isArray(S.b) || !Array.isArray(S.p) || !Array.isArray(S.s)) return;
            this.lastSnapQ = S.q;
            const s = this.sim;
            const now = performance.now();
            // Efectos deducidos de los cambios de estado
            if (S.h > s.hits && S.h - s.hits < 4) {
                const side = S.b[2] > 0 ? 0 : 1;
                this.effect({ k: 'hit', i: side, x: side === 0 ? PAD_X[0] + PAD_W + R : PAD_X[1] - R, y: S.b[1], spd: Math.hypot(S.b[2], S.b[3]), turbo: !!S.b[4] }, false);
            }
            if (S.s[0] + S.s[1] > s.score[0] + s.score[1]) {
                const scorer = S.s[0] > s.score[0] ? 0 : 1;
                this.effect({ k: 'goal', i: scorer, y: s.ball.y, turbo: s.ball.turbo && S.lh === scorer }, false);
            }
            if (s.pads[1].meter < 100 && S.m[1] >= 100) Nexus.audio.play('orbCollect');
            s.hits = S.h; s.score = [S.s[0] | 0, S.s[1] | 0]; s.rally = S.r | 0; s.maxRally = S.mr | 0; s.maxSpd = S.ms || BASE; s.lastHit = S.lh;
            const wasLive = s.phase === 'live';
            s.phase = S.ph; s.timer = S.tm;
            for (let i = 0; i < 2; i++) { s.pads[i].meter = S.m[i]; }
            s.pads[0].armed = !!S.a[0];
            if (S.a[1] || s.pads[1].meter < 100) s.pads[1].armed = !!S.a[1];
            this.hostY = S.p[0];
            // Bola: nueva base de extrapolación y corrección suave del salto
            const prev = this.nb ? this.extrap(now) : null;
            this.nb = { x: S.b[0], y: S.b[1], vx: S.b[2], vy: S.b[3], turbo: !!S.b[4], at: now };
            if (prev && wasLive && s.phase === 'live') {
                const nx = this.extrap(now);
                const dx = prev.x + this.corr.x - nx.x, dy = prev.y + this.corr.y - nx.y;
                this.corr = Math.hypot(dx, dy) < 70 ? { x: dx, y: dy } : { x: 0, y: 0 };
            } else this.corr = { x: 0, y: 0 };
        }

        /** Posición estimada de la bola "ahora" a partir de la última instantánea. */
        extrap(now) {
            const nb = this.nb, s = this.sim;
            if (s.phase !== 'live') return { x: nb.x, y: nb.y };
            const lat = this.net && this.net.conn.rtt != null ? this.net.conn.rtt / 2000 : 0.04;
            const dt = Math.min(0.2, (now - nb.at) / 1000 + lat);
            let x = nb.x + nb.vx * dt;
            const y = foldY(nb.y + nb.vy * dt);
            // Nunca atravesar una pala que la está tapando (el anfitrión confirmará el rebote)
            const f0 = PAD_X[0] + PAD_W + R, f1 = PAD_X[1] - R;
            if (nb.vx < 0 && nb.x >= f0 && x < f0 && Math.abs(y - s.pads[0].y) <= PAD_H / 2 + R) x = f0;
            if (nb.vx > 0 && nb.x <= f1 && x > f1 && Math.abs(y - s.pads[1].y) <= PAD_H / 2 + R) x = f1;
            return { x, y };
        }

        guestUpdate(dt) {
            const s = this.sim, n = this.net;
            this.controlLocal(s.pads[1], dt);
            s.pads[0].y = Kit.approach(s.pads[0].y, this.hostY, dt * 22);
            for (const p of s.pads) p.flash = Math.max(0, p.flash - dt * 4);
            if (s.phase === 'count' || s.phase === 'point') s.timer = Math.max(0, s.timer - dt);
            if (s.phase !== 'over') s.time += dt;
            if (this.nb) {
                const e = this.extrap(performance.now());
                const k = Math.exp(-dt * 12);
                this.corr.x *= k; this.corr.y *= k;
                s.ball.x = e.x + this.corr.x; s.ball.y = clamp(e.y + this.corr.y, B_MIN, B_MAX);
                s.ball.vx = this.nb.vx; s.ball.vy = this.nb.vy; s.ball.turbo = this.nb.turbo;
            }
            // Mando del invitado al anfitrión
            this.netAcc += dt;
            const iv = n.conn.mode === 'p2p' ? 1 / 30 : 1 / 15;
            if (this.netAcc >= iv) {
                this.netAcc = 0;
                const p = s.pads[1];
                n.conn.send({ t: 'I', q: ++this.inQ, y: Math.round(p.y * 10) / 10, vy: Math.round(p.vy), a: this.armSeq });
            }
        }

        onPeerLost(reason, peer) {
            const n = this.net; if (!n) return;
            const who = (peer && peer.name) || 'Tu rival';
            const wasPlaying = this.state === 'playing' && this.kind === 'online' && !this.sim.demo;
            if (wasPlaying) {
                // Victoria por abandono
                const s = this.sim;
                this.finish({ score: s.score.slice(), winner: this.meIdx(), st: s.st, maxRally: s.maxRally, maxSpd: s.maxSpd, time: s.time, forfeit: 'peer' });
            }
            const msg = reason === 'left' ? `${who} ha salido de la sala` : `Se perdió la conexión con ${who}`;
            this.toast(msg);
            Nexus.ui.toast(msg, { icon: '📴' });
            if (n.role === 'host') {
                n.peer = null; n.ready = [false, false]; n.linking = false;
                if (!wasPlaying) this.showHostWait();
            } else {
                this.net = null;
                if (!wasPlaying) this.showOnline(msg + '.');
            }
            this.updateSide(true);
        }

        confirmLeave() {
            if (this.kind !== 'online' || !this.net) return;
            if (this.state !== 'playing') { this.leaveRoom(); this.showOnline(); return; }
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel pg-panel">
                <h2 class="ax-big">¿ABANDONAR?</h2>
                <p class="ax-sub">La partida online no se puede pausar y sigue mientras decides. Si abandonas, cuenta como derrota.</p>
                <div class="ax-play-row">
                    <button class="btn btn-primary" data-do="stay" type="button">▶ Seguir jugando</button>
                    <button class="btn btn-ghost" data-do="forfeit" type="button">🏳️ Abandonar</button>
                </div></div>`;
        }

        forfeit() {
            if (this.state === 'playing' && this.kind === 'online') {
                const s = this.sim;
                this.finish({ score: s.score.slice(), winner: 1 - this.meIdx(), st: s.st, maxRally: s.maxRally, maxSpd: s.maxSpd, time: s.time, forfeit: 'self' }, true);
            }
            this.leaveRoom();
            this.showOnline();
        }

        leaveRoom() {
            const n = this.net; if (!n) return;
            this.net = null;
            try { n.conn.close(); } catch (_) { /* noop */ }
            this.updateSide(true);
        }

        leaveOnline() {
            this.leaveRoom();
            this.closeLobby();
            this.kind = 'cpu';
        }

        // ── Fin de partida ──────────────────────────────────
        matchOver() {
            const s = this.sim;
            const d = { score: s.score.slice(), winner: s.winner, st: s.st, maxRally: s.maxRally, maxSpd: s.maxSpd, time: s.time };
            if (this.kind === 'online' && this.net) this.net.conn.send({ t: 'end', d }, true);
            this.finish(d);
        }

        finish(d, quiet) {
            if (this.state === 'over') return;
            this.state = 'over';
            this.keys.up = this.keys.down = false;
            if (!d || !Array.isArray(d.score) || !Array.isArray(d.st)) return;
            const me = this.meIdx(), won = d.winner === me;
            const my = d.score[me] | 0, opp = d.score[1 - me] | 0;
            const online = this.kind === 'online';
            const mode = online ? 'online' : this.level.id;
            const mult = online ? ONLINE_MULT : this.level.mult;
            const mst = d.st[me] || newSideStats();
            const speed = Math.round(((d.maxSpd || BASE) / BASE) * 100) / 100;
            const score = Math.round((my * 100 + (won ? 600 : 0) + (d.maxRally | 0) * 12 + (mst.turboGoals | 0) * 60 + (won && opp === 0 ? 400 : 0)) * mult);
            const xp = Math.round((won ? 45 : 15) * mult + my * 3);
            const result = Nexus.services.progress.recordGame({
                game: 'pong', mode, won, score, time: Math.round(d.time || 0), xp,
                extra: { my, opp, maxRally: d.maxRally | 0, speed, turboGoals: mst.turboGoals | 0, turbos: mst.turbos | 0,
                    comeback: won ? (mst.maxDef | 0) : 0, online, forfeit: d.forfeit || null, level: mode },
                updateExtra: (x) => {
                    x.bestRally = Math.max(x.bestRally || 0, d.maxRally | 0);
                    x.turboGoals = (x.turboGoals || 0) + (mst.turboGoals | 0);
                }
            });
            if (quiet) return;
            Nexus.audio.play(won ? 'win' : 'lose');
            const foe = online ? ((this.net && this.net.peer && this.net.peer.name) || 'tu rival') : `la CPU (${this.level.label})`;
            const sub = `${my} – ${opp} contra ${foe}` + (d.forfeit === 'peer' ? ' · victoria por abandono' : '');
            const stats = [
                { label: 'Marcador', value: `${my} – ${opp}` },
                { label: 'Peloteo máx.', value: String(d.maxRally | 0) },
                { label: 'Velocidad máx.', value: '×' + String(speed).replace('.', ',') },
                { label: 'Remates turbo', value: String(mst.turbos | 0) },
                { label: 'Puntuación', value: formatNumber(score) },
                { label: 'Tiempo', value: Nexus.util.formatTime(d.time || 0) }
            ];
            const actions = online ? [
                { label: '🔄 Revancha', kind: 'primary', onClick: () => this.later(() => { if (this.net) { this.setReady(); } else this.showOnline(); }, 50) },
                { label: '🚪 Salir de la sala', kind: 'ghost', onClick: () => this.later(() => { this.leaveRoom(); this.showOnline(); }, 50) }
            ] : [
                { label: '🔄 Otra partida', kind: 'primary', onClick: () => this.later(() => this.startCpu(), 50) },
                { label: '☰ Cambiar nivel', kind: 'ghost', onClick: () => this.later(() => { this.state = 'menu'; this.sim = this.newSim(true); this.showCpu(); }, 50) },
                { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
            ];
            if (online && this.net && d.forfeit !== 'peer') { this.later(() => { if (this.state === 'over' && this.net && !this.resultModal) this.showRoom(); }, 400); }
            const open = () => {
                if (this.destroyed) return;
                this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: won ? '🏆' : '🏓', kind: won ? 'win' : 'lose', title: won ? '¡VICTORIA!' : 'DERROTA', subtitle: sub, stats, result, actions
                });
                // Al cerrar el modal (con o sin elegir), en online se vuelve a la sala o al vestíbulo
                const rm = this.resultModal;
                if (online && rm && rm.closed) rm.closed.then(() => {
                    if (this.resultModal === rm) this.resultModal = null;
                    if (!this.destroyed && this.state === 'over') { if (this.net) this.showRoom(); else this.showOnline(); }
                });
            };
            this.later(open, 900);
        }

        // ── Utilidades de interfaz ──────────────────────────
        toast(text) {
            const el = this.$('#pg-toast');
            el.textContent = text; el.classList.add('show'); this.toastT = 2.2;
        }

        copy(text, ok) {
            const done = () => Nexus.ui.toast(ok, { icon: '📋' });
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => this.copyFallback(text, done));
            else this.copyFallback(text, done);
        }
        copyFallback(text, done) {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); } catch (_) { Nexus.ui.toast(text, { icon: '🔗', duration: 8000 }); }
            ta.remove();
        }

        updatePing() {
            const n = this.net;
            const rtt = n && n.conn.rtt != null ? Math.round(n.conn.rtt) + ' ms' : '–';
            const set = (sel, v) => { const el = this.root.querySelector(sel); if (el && el.textContent !== v) el.textContent = v; };
            set('[data-pill="ping"]', this.kind === 'online' ? rtt : '–');
            set('#pg-net-ping', rtt);
        }

        tickSide(dt) {
            this._st = (this._st || 0) + dt;
            if (this._st > 0.12) { this._st = 0; this.updateSide(); }
        }

        updateSide(full) {
            const s = this.sim, live = !s.demo;
            const me = this.meIdx(), foe = 1 - me;
            const set = (id, v) => { const el = this.$('#' + id); if (el && el.textContent !== String(v)) el.textContent = v; };
            const myScore = live ? s.score[me] : 0, foeScore = live ? s.score[foe] : 0;
            const pill = this.root.querySelector('[data-pill="score"]'); if (pill) pill.textContent = `${myScore} – ${foeScore}`;
            const rp = this.root.querySelector('[data-pill="rally"]'); if (rp) rp.textContent = String(live ? s.rally : 0);
            set('pg-me-pts', myScore); set('pg-foe-pts', foeScore);
            set('pg-rally', live ? s.rally : 0);
            set('pg-best-rally', live ? s.maxRally : 0);
            set('pg-speed', '×' + (live && s.phase === 'live' ? Math.hypot(s.ball.vx, s.ball.vy) / BASE : 1).toFixed(1).replace('.', ','));
            // Turbo
            const p = s.pads[me];
            const meter = live ? p.meter : 0, armed = live && p.armed;
            this.$('#pg-meter').style.width = meter + '%';
            const card = this.$('#pg-turbo-card');
            card.classList.toggle('full', meter >= 100 && !armed); card.classList.toggle('armed', armed);
            set('pg-turbo-hint', armed ? '🔥 ¡Armado! Tu siguiente golpe será un remate.' : meter >= 100 ? '¡Listo! Pulsa Espacio para armarlo.' : `Devuelve la bola para cargarlo (${meter}%).`);
            const btn = this.$('#pg-btn-turbo'); btn.disabled = !(this.state === 'playing' && meter >= 100 && !armed);
            this.$('#pg-touch').classList.toggle('turbo-ready', !btn.disabled);
            if (this.kind === 'online') this.updatePing();
            this.root.firstElementChild.classList.toggle('pg-playing', this.state === 'playing' || this.state === 'paused');
            if (!full) return;
            // Nombres, modo, conexión
            const mine = this.myInfo();
            set('pg-me-av', mine.avatar); set('pg-me-name', mine.name);
            const online = this.kind === 'online' && this.net;
            const peer = online && this.net.peer;
            const isOnline = this.kind === 'online';
            set('pg-foe-av', isOnline ? (peer ? peer.avatar : '❔') : '🤖');
            set('pg-foe-name', isOnline ? (peer ? peer.name : 'Rival') : 'CPU');
            set('pg-mode', this.kind === 'online' ? '🌐 Online' : `${this.level.emoji} ${this.level.label}`);
            const ms = Nexus.services.progress.stats('pong').byMode[this.kind === 'online' ? 'online' : this.level.id];
            set('pg-wins', ms ? ms.wins : 0);
            this.$('#pg-net-card').hidden = !online;
            if (online) {
                set('pg-net-code', this.net.code);
                const m = this.net.conn.mode;
                set('pg-net-mode', m === 'p2p' ? '⚡ Directo (P2P)' : m === 'relay' ? '📡 Retransmitido' : m === 'waiting' ? 'Esperando rival' : 'Conectando…');
            }
            this.updatePing();
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id);
            return id;
        }

        // ── Dibujo ──────────────────────────────────────────
        draw() {
            const ctx = this.ctx, s = this.sim, t = this.t;
            ctx.save();
            if (this.shake > 0 && !this.calm()) ctx.translate((Math.random() - 0.5) * this.shake * 10, (Math.random() - 0.5) * this.shake * 10);

            // Fondo
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#060818'); bg.addColorStop(0.5, '#0b0c26'); bg.addColorStop(1, '#070716');
            ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
            const glowL = ctx.createRadialGradient(0, H / 2, 0, 0, H / 2, W * 0.55);
            glowL.addColorStop(0, Kit.rgba(C_ME, 0.13)); glowL.addColorStop(1, Kit.rgba(C_ME, 0));
            ctx.fillStyle = glowL; ctx.fillRect(0, 0, W, H);
            const glowR = ctx.createRadialGradient(W, H / 2, 0, W, H / 2, W * 0.55);
            glowR.addColorStop(0, Kit.rgba(C_FOE, 0.13)); glowR.addColorStop(1, Kit.rgba(C_FOE, 0));
            ctx.fillStyle = glowR; ctx.fillRect(0, 0, W, H);

            // Rejilla que se desplaza lentamente
            ctx.strokeStyle = 'rgba(129,140,248,.07)'; ctx.lineWidth = 1;
            const g = 40, off = (t * 10) % g;
            ctx.beginPath();
            for (let x = -g + off; x < W + g; x += g) { ctx.moveTo(x, WALL); ctx.lineTo(x, H - WALL); }
            for (let y = WALL + (off / 2) % g; y < H - WALL; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
            ctx.stroke();

            // Marcador gigante de fondo
            const live = !s.demo;
            const scoreL = s.score[this.mirrored() ? 1 : 0], scoreR = s.score[this.mirrored() ? 0 : 1];
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            [[scoreL, W * 0.25, C_ME, 0], [scoreR, W * 0.75, C_FOE, 1]].forEach(([v, x, c, side]) => {
                const pop = this.scorePop[side];
                ctx.save();
                ctx.translate(x, H / 2); ctx.scale(1 + pop * 0.25, 1 + pop * 0.25);
                ctx.font = '800 230px "Bricolage Grotesque", system-ui, sans-serif';
                ctx.fillStyle = Kit.rgba(c, (live ? 0.08 : 0.05) + pop * 0.25);
                ctx.fillText(String(v), 0, 8);
                ctx.restore();
            });

            // Destello de gol
            if (this.flash) {
                const f = this.flash, a = f.life / 0.6;
                const gx = f.side ? W : 0;
                const fg = ctx.createLinearGradient(gx, 0, f.side ? W - 260 : 260, 0);
                fg.addColorStop(0, Kit.rgba(f.color, 0.55 * a)); fg.addColorStop(1, Kit.rgba(f.color, 0));
                ctx.fillStyle = fg; ctx.fillRect(f.side ? W - 260 : 0, 0, 260, H);
            }

            // Línea central y círculo
            ctx.save();
            ctx.shadowColor = 'rgba(165,180,252,.8)'; ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(165,180,252,.35)'; ctx.lineWidth = 3;
            ctx.setLineDash([14, 14]); ctx.lineDashOffset = -t * 20;
            ctx.beginPath(); ctx.moveTo(W / 2, WALL + 6); ctx.lineTo(W / 2, H - WALL - 6); ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(165,180,252,.18)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(W / 2, H / 2, 64, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();

            // Paredes
            const wallG = ctx.createLinearGradient(0, 0, W, 0);
            wallG.addColorStop(0, C_ME); wallG.addColorStop(0.5, '#a78bfa'); wallG.addColorStop(1, C_FOE);
            ctx.save();
            ctx.fillStyle = 'rgba(10,12,40,.9)'; ctx.fillRect(0, 0, W, WALL); ctx.fillRect(0, H - WALL, W, WALL);
            ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 14;
            ctx.fillStyle = wallG; ctx.fillRect(0, WALL - 3, W, 3); ctx.fillRect(0, H - WALL, W, 3);
            ctx.restore();

            // Palas
            for (let i = 0; i < 2; i++) this.drawPad(i);

            // Estela de la bola
            this.drawTrail();

            // Bola
            this.drawBall();

            // Partículas y ondas
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const p of this.particles) {
                ctx.globalAlpha = Math.max(0, p.life / p.max);
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.5 + p.life / p.max * 0.5), 0, Math.PI * 2); ctx.fill();
            }
            for (const r of this.rings) {
                ctx.globalAlpha = Math.max(0, r.life / r.max) * 0.9;
                ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (r.life / r.max);
                ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();

            // Textos flotantes
            for (const f of this.floaters) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, f.life / f.max * 1.6);
                ctx.font = `800 ${f.size}px "Bricolage Grotesque", system-ui, sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowColor = f.color; ctx.shadowBlur = 18;
                ctx.fillStyle = '#fff'; ctx.fillText(f.text, f.x, f.y);
                ctx.restore();
            }

            // Cuenta atrás
            if (live && s.phase === 'count' && this.state === 'playing') {
                const c = Math.ceil(s.timer), fr = s.timer - Math.floor(s.timer);
                ctx.save();
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = '800 120px "Bricolage Grotesque", system-ui, sans-serif';
                ctx.globalAlpha = 0.35 + fr * 0.65;
                ctx.translate(W / 2, H / 2); ctx.scale(0.8 + fr * 0.5, 0.8 + fr * 0.5);
                ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 30;
                ctx.fillStyle = '#fff'; ctx.fillText(c > 0 ? String(c) : '¡YA!', 0, 0);
                ctx.restore();
            }

            // Velocímetro
            if (live && s.phase === 'live' && this.state === 'playing') {
                const ratio = Math.hypot(s.ball.vx, s.ball.vy) / BASE;
                const w = 150, x = W / 2 - w / 2, y = H - WALL - 18;
                ctx.save();
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = 'rgba(255,255,255,.08)'; Kit.roundRect(ctx, x, y, w, 5, 3); ctx.fill();
                ctx.fillStyle = this.ballColor(ratio, s.ball.turbo);
                Kit.roundRect(ctx, x, y, w * clamp((ratio - 1) / 3, 0.02, 1), 5, 3); ctx.fill();
                ctx.font = '700 11px Manrope, system-ui, sans-serif'; ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(226,232,240,.7)'; ctx.fillText('VELOCIDAD ×' + ratio.toFixed(1).replace('.', ','), W / 2, y - 8);
                ctx.restore();
            }

            // Viñeta y barrido CRT
            const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
            vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
            ctx.fillStyle = vg; ctx.fillRect(-20, -20, W + 40, H + 40);
            if (this.scan) { ctx.fillStyle = this.scan; ctx.fillRect(0, 0, W, H); }
            ctx.restore();
        }

        ballColor(ratio, turbo) {
            if (turbo) return C_TURBO;
            if (ratio < 1.6) return mixHex('#e0f2fe', '#67e8f9', (ratio - 1) / 0.6);
            if (ratio < 2.4) return mixHex('#67e8f9', '#fde047', (ratio - 1.6) / 0.8);
            return mixHex('#fde047', '#f87171', (ratio - 2.4) / 0.9);
        }

        drawPad(i) {
            const ctx = this.ctx, s = this.sim, p = s.pads[i];
            const isMe = i === this.meIdx();
            const c = isMe ? C_ME : C_FOE;
            const x = this.mirrored() ? W - PAD_X[i] - PAD_W : PAD_X[i];
            const y = p.y - PAD_H / 2;
            ctx.save();
            if (p.armed) {
                const pulse = 0.5 + 0.5 * Math.sin(this.t * 14);
                ctx.shadowColor = C_TURBO; ctx.shadowBlur = 26 + pulse * 18;
                ctx.fillStyle = Kit.rgba(C_TURBO, 0.18 + pulse * 0.12);
                Kit.roundRect(ctx, x - 7, y - 7, PAD_W + 14, PAD_H + 14, 12); ctx.fill();
                if (Math.random() < 0.5) this.particles.push({ x: x + PAD_W / 2 + rand(-8, 8), y: y + rand(0, PAD_H), vx: rand(-20, 20), vy: rand(-90, -30), life: rand(0.2, 0.45), max: 0.45, color: Math.random() < 0.5 ? '#fde047' : C_TURBO, s: rand(1.5, 3) });
            } else if (p.meter >= 100 && !s.demo) {
                ctx.shadowColor = '#fde047'; ctx.shadowBlur = 16 + 8 * Math.sin(this.t * 6);
            } else { ctx.shadowColor = c; ctx.shadowBlur = 18; }
            const grad = ctx.createLinearGradient(x, y, x + PAD_W, y + PAD_H);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.25, c); grad.addColorStop(1, mixHex(c, '#000000', 0.35));
            ctx.fillStyle = grad;
            const sq = p.flash * 6;
            Kit.roundRect(ctx, x - sq / 4, y - sq, PAD_W + sq / 2, PAD_H + sq * 2, 8); ctx.fill();
            if (p.flash > 0) { ctx.globalAlpha = p.flash * 0.8; ctx.fillStyle = '#fff'; Kit.roundRect(ctx, x, y, PAD_W, PAD_H, 8); ctx.fill(); }
            // Carga de turbo en la propia pala
            if (!s.demo && p.meter > 0) {
                ctx.globalAlpha = 1; ctx.shadowBlur = 0;
                const h = (PAD_H - 16) * (p.meter / 100);
                ctx.fillStyle = p.meter >= 100 ? '#fde047' : 'rgba(255,255,255,.55)';
                const bx = isMe ? x - 7 : x + PAD_W + 4;
                Kit.roundRect(ctx, bx, y + 8 + (PAD_H - 16 - h), 3, h, 2); ctx.fill();
            }
            ctx.restore();
        }

        drawTrail() {
            const ctx = this.ctx, tr = this.trail;
            if (tr.length < 2) return;
            const s = this.sim, ratio = Math.hypot(s.ball.vx, s.ball.vy) / BASE;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            for (let i = 1; i < tr.length; i++) {
                const a = i / tr.length;
                ctx.strokeStyle = Kit.rgba(tr[i].turbo ? C_TURBO : (ratio > 2.2 ? '#fde047' : '#67e8f9'), a * 0.55);
                ctx.lineWidth = R * 2 * a * (tr[i].turbo ? 1.3 : 0.9);
                ctx.beginPath();
                ctx.moveTo(this.sx(tr[i - 1].x), tr[i - 1].y); ctx.lineTo(this.sx(tr[i].x), tr[i].y);
                ctx.stroke();
            }
            ctx.restore();
        }

        drawBall() {
            const ctx = this.ctx, s = this.sim, b = s.ball;
            const waiting = s.phase === 'count' || s.phase === 'point';
            if (s.phase === 'over') return;
            if (waiting && s.timer > 0.7 && s.phase === 'point') return;
            const ratio = Math.hypot(b.vx, b.vy) / BASE || 1;
            const c = this.ballColor(ratio, b.turbo);
            const x = this.sx(b.x), y = b.y;
            const r = R * (1 + this.ballPop * 0.35) * (waiting ? 0.9 + 0.1 * Math.sin(this.t * 10) : 1);
            ctx.save();
            const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
            halo.addColorStop(0, Kit.rgba(c, 0.45)); halo.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowColor = c; ctx.shadowBlur = 24;
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        destroy() {
            this.destroyed = true;
            this.loop.destroy();
            this.fit.destroy();
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            if (this.unsubProgress) this.unsubProgress();
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
            if (this.state === 'playing' && this.kind === 'online' && this.net) {
                const s = this.sim;
                this.finish({ score: s.score.slice(), winner: 1 - this.meIdx(), st: s.st, maxRally: s.maxRally, maxSpd: s.maxSpd, time: s.time, forfeit: 'self' }, true);
            }
            this.leaveOnline();
        }
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'pong') ? c.event : null;
    const cpuWin = (c, modes) => { const e = ev(c); return !!e && e.won && !e.extra.online && modes.includes(e.mode); };
    A.register([
        { id: 'pg_first', game: 'pong', name: 'Primer saque', desc: 'Gana una partida a la máquina.', icon: '🏓', rarity: 'common',
            test: (c) => cpuWin(c, ['easy', 'normal', 'hard', 'master']) },
        { id: 'pg_normal', game: 'pong', name: 'Buen pulso', desc: 'Gana a la máquina en Normal o superior.', icon: '⚔️', rarity: 'common',
            test: (c) => cpuWin(c, ['normal', 'hard', 'master']) },
        { id: 'pg_hard', game: 'pong', name: 'Raqueta de fuego', desc: 'Gana a la máquina en Difícil.', icon: '🔥', rarity: 'rare',
            test: (c) => cpuWin(c, ['hard', 'master']) },
        { id: 'pg_master', game: 'pong', name: 'Más rápido que la máquina', desc: 'Gana a la máquina en Maestro.', icon: '💀', rarity: 'legendary',
            test: (c) => cpuWin(c, ['master']) },
        { id: 'pg_shutout', game: 'pong', name: 'Blanqueo', desc: 'Gana 7–0 en Normal o superior (u online).', icon: '🧊', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.won && e.mode !== 'easy' && !e.extra.forfeit && e.extra.opp === 0 && e.extra.my >= 7; } },
        { id: 'pg_rally15', game: 'pong', name: 'Peloteo', desc: 'Mantén un peloteo de 15 golpes.', icon: '🔁', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxRally >= 15; } },
        { id: 'pg_rally30', game: 'pong', name: 'Muro humano', desc: 'Mantén un peloteo de 30 golpes.', icon: '🧱', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxRally >= 30; } },
        { id: 'pg_turbo', game: 'pong', name: 'Remate turbo', desc: 'Gana un punto con un remate ⚡ Turbo.', icon: '⚡', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.turboGoals >= 1; } },
        { id: 'pg_speed', game: 'pong', name: 'Velocidad luz', desc: 'Haz que la bola supere ×3 su velocidad inicial.', icon: '☄️', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.speed >= 3; } },
        { id: 'pg_comeback', game: 'pong', name: 'Remontada', desc: 'Gana tras ir perdiendo por 4 puntos.', icon: '🔄', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.won && !e.extra.forfeit && e.extra.comeback >= 4; } },
        { id: 'pg_online', game: 'pong', name: 'Conectado', desc: 'Juega una partida online.', icon: '🌐', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.online; } },
        { id: 'pg_online_win', game: 'pong', name: 'Rey de la red', desc: 'Gana una partida online jugada hasta el final.', icon: '👑', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.online && e.won && !e.extra.forfeit; } },
        { id: 'pg_online10', game: 'pong', name: 'Leyenda online', desc: 'Gana 10 partidas online.', icon: '🏆', rarity: 'epic',
            ...A.counter((c) => ((c.stats('pong').byMode || {}).online || {}).wins || 0, 10) }
    ]);

    Nexus.games.registry.register({
        id: 'pong', name: 'Pong Turbo', emoji: '🏓', accent: '#22d3ee',
        tagline: 'Contra la máquina · Online 1 contra 1',
        description: 'El Pong de siempre con estética neón: la bola acelera con cada golpe, el contacto decide el ángulo y el Turbo carga remates en llamas. Juega contra la IA (4 niveles) o online contra otra persona creando una sala o entrando con un código.',
        tags: ['Arcade', 'Multijugador'],
        modes: LEVELS.map(l => ({ id: l.id, label: l.label })).concat([{ id: 'online', label: 'Online' }]),
        metrics: [{ id: 'wins', label: 'Victorias' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new PongGame(root)
    });
})();
