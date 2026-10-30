/* ============================================================
   NEXUS ARCADE · games/snake/game.js
   Snake Neón: la serpiente de siempre con mecánicas propias.
     · Energía: mantén Espacio para el ⚡ Turbo (más rápido, puntos ×1,5)
       y usa 🦘 Salto para saltar 3 casillas por encima de tu propio
       cuerpo, rocas o rivales.
     · Frutas y poderes: 🌟 dorada, 🍄 seta (invierte controles),
       👻 Fantasma, 🧲 Imán, 🐢 Lento, 💰 Doble, ✂️ Tijeras, 💣 Bomba.
     · Racha: comer seguido sube el multiplicador de puntos.
     · Portales 🌀 que conectan dos puntos del mapa (el cuerpo también
       los atraviesa), rocas que aparecen con el tiempo.
     · 4 modos: Clásico, Evolución, Rival (serpientes enemigas con IA
       que compiten por la comida y se pueden cazar) y Zona (la arena se
       llena de lava y se encoge).
   Movimiento por casillas con interpolación suave.
   ============================================================ */
(function () {
    'use strict';

    const { esc, clamp, formatNumber } = Nexus.util;
    const Kit = Nexus.games.kit;

    // ── Datos ───────────────────────────────────────────────
    const GW = 25, GH = 19, CELL = 28;
    const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const DIR_NAMES = ['up', 'right', 'down', 'left'];

    const ENERGY_MAX = 100, HOP_COST = 35, HOP_LEN = 3, TURBO_DRAIN = 38, ENERGY_REGEN = 5;
    const COMBO_WINDOW = 3.5;
    const ZONE_FIRST = 18, ZONE_EVERY = 12, ZONE_MAX_X = 8, ZONE_MAX_Y = 6;

    const FOODS = {
        apple:  { emoji: '🍎', name: 'Manzana', pts: 10, grow: 1, color: '#f87171', energy: 12, desc: '+10 y crece 1.' },
        gold:   { emoji: '🌟', name: 'Dorada', pts: 50, grow: 2, color: '#fbbf24', energy: 25, ttl: 9, desc: '+50, crece 2 y recarga energía. Dura 9 s.' },
        bit:    { emoji: '✨', name: 'Fragmento', pts: 3, grow: 0, color: '#a5b4fc', energy: 2, ttl: 14, desc: 'Restos de cola o de rivales. +3.' },
        shroom: { emoji: '🍄', name: 'Seta', pts: 40, grow: 1, color: '#f472b6', energy: 10, ttl: 12, desc: '+40, pero invierte tus controles 6 s.' },
        ghost:  { emoji: '👻', name: 'Fantasma', power: true, color: '#c4b5fd', ttl: 12, dur: 6, weight: 16, desc: '6 s intangible: atraviesas tu cuerpo, rocas, rivales y los bordes dan la vuelta.' },
        magnet: { emoji: '🧲', name: 'Imán', power: true, color: '#60a5fa', ttl: 12, dur: 8, weight: 15, desc: '8 s: las frutas cercanas vuelan hacia ti.' },
        slow:   { emoji: '🐢', name: 'Lento', power: true, color: '#4ade80', ttl: 12, dur: 6, weight: 12, desc: '6 s de tiempo lento para todos.' },
        double: { emoji: '💰', name: 'Doble', power: true, color: '#facc15', ttl: 12, dur: 8, weight: 14, desc: '8 s con los puntos ×2.' },
        scissors: { emoji: '✂️', name: 'Tijeras', power: true, color: '#fb7185', ttl: 12, dur: 0, weight: 12, desc: 'Corta la mitad de tu cola: se convierte en fragmentos.' },
        bomb:   { emoji: '💣', name: 'Bomba', power: true, color: '#f97316', ttl: 12, dur: 0, weight: 12, desc: 'Explota en radio 3: destruye rocas y corta a los rivales.' }
    };
    const FX_LABEL = { ghost: '👻 Fantasma', magnet: '🧲 Imán', slow: '🐢 Lento', double: '💰 ×2', confuse: '🍄 Invertido' };

    const MODES = [
        { id: 'classic', emoji: '🟢', label: 'Clásico', desc: 'Sin poderes ni trucos: sólo tú, la manzana y las paredes.',
            base: 0.14, min: 0.08, apples: 1 },
        { id: 'evolve', emoji: '🧬', label: 'Evolución', desc: 'Frutas especiales, portales, rocas, Turbo y Salto.',
            base: 0.13, min: 0.075, apples: 1, powers: true, skills: true, rocks: true, portals: true },
        { id: 'rival', emoji: '🐍', label: 'Rival', desc: 'Serpientes enemigas con IA compiten por la comida. Córtales el paso.',
            base: 0.13, min: 0.08, apples: 2, powers: true, skills: true, rivals: true },
        { id: 'zone', emoji: '🔥', label: 'Zona', desc: 'La arena se llena de lava y se encoge. Sobrevive cuanto puedas.',
            base: 0.13, min: 0.075, apples: 1, powers: true, skills: true, zone: true }
    ];

    const PLAYER_COLORS = ['#4ade80', '#0f766e'];
    const RIVAL_COLORS = [['#fb923c', '#9a3412'], ['#e879f9', '#701a75'], ['#38bdf8', '#075985']];

    const key = (x, y) => x + ',' + y;
    const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const rand = (n) => Math.floor(Math.random() * n);

    class SnakeGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.mode = MODES.find(m => m.id === Nexus.services.settings.get('snake.defaultMode')) || MODES[1];
            this.state = 'menu';
            this.t = 0;
            this.turboHeld = false;
            this.particles = []; this.floaters = [];
            this.shake = 0;
            this.build();
            this.resetGame();
            this.bind();
            this.loop = Kit.loop((dt) => this.update(dt), () => this.draw(), () => { if (this.state === 'playing') this.pause(); });
            this.loop.start();
            this.showMenu();
            this.unsubProgress = Nexus.bus.on('progress:update', () => this.updateRecords());
            this.updateRecords();
            this.run = Kit.autosave(this, { id: 'snake', exclude: ['mode', 'prev'] });
            this.resumeSaved();
        }

        /** Restaura una partida interrumpida (recarga o cierre) en pausa. */
        resumeSaved() {
            const saved = this.run.load();
            if (!saved || !Array.isArray(saved.snap.snake) || !saved.snap.snake.length) return;
            this.mode = MODES.find(m => m.id === saved.mode) || this.mode;
            this.run.apply(saved.snap);
            this.prev = this.snake.map(s => ({ ...s }));
            this.alpha = 1;
            this.state = 'playing';
            this.pause();
            this.updateModeUI(); this.updatePills(); this.updateSide();
            this.toast && this.toast('Partida recuperada');
        }

        // ── Plantilla ───────────────────────────────────────
        build() {
            this.root.innerHTML = `
            <div class="game ax-game snake" style="--ax-accent:#22c55e">
                ${Kit.header({ emoji: '🐍', title: 'Snake Neón', pills: [
                    { id: 'score', icon: '💎', init: '0', title: 'Puntos' },
                    { id: 'length', icon: '📏', init: '3', title: 'Longitud' },
                    { id: 'time', icon: '⏱️', init: '00:00', title: 'Tiempo' }] })}
                <div class="ax-body">
                    <div class="ax-stage-wrap" id="sn-wrap">
                        <div class="ax-stage" id="sn-stage">
                            <canvas id="sn-canvas" aria-label="Tablero de Snake Neón"></canvas>
                            <div class="ax-toast" id="sn-toast" role="status"></div>
                        </div>
                        <div class="ax-overlay" id="sn-overlay"></div>
                    </div>
                    <aside class="ax-side">
                        <div class="ax-card">
                            <h3>Partida</h3>
                            <div class="ax-rows">
                                <div class="ax-row"><span>Racha</span><b id="sn-combo">–</b></div>
                                <div class="ax-row"><span>Multiplicador</span><b id="sn-mult">×1</b></div>
                                <div class="ax-row"><span>Frutas</span><b id="sn-apples">0</b></div>
                                <div class="ax-row" id="sn-extra-row"><span id="sn-extra-label">Rivales cazados</span><b id="sn-extra">0</b></div>
                                <div class="ax-row"><span>Mejor</span><b id="sn-best">0</b></div>
                            </div>
                        </div>
                        <div class="ax-card" id="sn-skill-card">
                            <h3>⚡ Energía</h3>
                            <div class="ax-bar"><i id="sn-energy"></i></div>
                            <div class="ax-btn-row">
                                <button class="btn btn-ghost" id="sn-btn-hop" type="button" title="Salta 3 casillas por encima de lo que haya (Z)">🦘 Salto · ${HOP_COST}</button>
                            </div>
                            <p class="ax-hint"><kbd>Espacio</kbd> mantenido = ⚡ Turbo (puntos ×1,5).</p>
                            <div class="ax-chips" id="sn-effects"></div>
                        </div>
                        <div class="ax-card" id="sn-legend-card">
                            <h3>🍽️ Frutas y poderes</h3>
                            <div class="sn-legend" id="sn-legend"></div>
                        </div>
                    </aside>
                </div>
                <div class="ax-touch sn-touch" id="sn-touch">
                    <div class="ax-pad">
                        <button type="button" class="up" data-act="up" aria-label="Arriba">▲</button>
                        <button type="button" class="left" data-act="left" aria-label="Izquierda">◀</button>
                        <button type="button" class="down-b" data-act="down" aria-label="Abajo">▼</button>
                        <button type="button" class="right" data-act="right" aria-label="Derecha">▶</button>
                    </div>
                    <button type="button" data-act="turbo" aria-label="Turbo">⚡</button>
                    <button type="button" data-act="hop" aria-label="Salto">🦘</button>
                </div>
            </div>`;
            this.$ = (s) => this.root.querySelector(s);
            this.canvas = this.$('#sn-canvas');
            this.stage = this.$('#sn-stage');
            this.overlay = this.$('#sn-overlay');
            this.fit = Kit.canvas(this.canvas, this.$('#sn-wrap'), this.stage, GW * CELL, GH * CELL);
            this.ctx = this.fit.ctx;
        }

        // ── Estado de partida ───────────────────────────────
        resetGame() {
            const m = this.mode;
            const cy = Math.floor(GH / 2), cx = Math.floor(GW / 2);
            this.snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
            this.prev = this.snake.map(s => ({ ...s }));
            this.dir = 'right';
            this.queue = [];
            this.acc = 0; this.alpha = 1;
            this.grow = 0;
            this.foods = []; this.rocks = [];
            this.portals = null; this.portalCd = 0;
            this.rivals = []; this.respawns = [];
            this.zone = { l: 0, r: 0, t: 0, b: 0, next: ZONE_FIRST, level: 0 };
            this.fx = { ghost: 0, magnet: 0, slow: 0, double: 0, confuse: 0 };
            this.energy = m.skills ? 60 : 0;
            this.turboOn = false;
            this.combo = 0; this.comboT = 0;
            this.score = 0; this.apples = 0; this.time = 0; this.zoneAcc = 0;
            this.waiting = true;
            this.turboHeld = false;
            this.particles = []; this.floaters = [];
            this.kinds = new Set();
            this.stats = { apples: 0, golds: 0, maxLen: 3, maxCombo: 0, hops: 0, hopOver: 0, ghostPass: 0, portals: 0,
                kills: 0, shrooms: 0, magnetEats: 0, rocksBombed: 0, scissors: 0, bombs: 0, turboTime: 0, zoneLevel: 0, kinds: 0 };
            this.ensureApples();
            if (m.rivals) this.spawnRival(true);
            this.updatePills(); this.updateSide();
        }

        newGame(modeId) {
            if (modeId) this.mode = MODES.find(m => m.id === modeId) || this.mode;
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.resetGame();
            this.state = 'playing';
            this.overlay.hidden = true;
            this.updateModeUI();
            this.updateRecords();
        }

        // ── Geometría ───────────────────────────────────────
        bounds() { const z = this.zone; return { x0: z.l, x1: GW - 1 - z.r, y0: z.t, y1: GH - 1 - z.b }; }
        inBounds(x, y) { const b = this.bounds(); return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1; }
        inGrid(x, y) { return x >= 0 && x < GW && y >= 0 && y < GH; }

        occupied() {
            const s = new Set();
            for (const p of this.snake) s.add(key(p.x, p.y));
            for (const r of this.rivals) for (const p of r.body) s.add(key(p.x, p.y));
            for (const p of this.rocks) s.add(key(p.x, p.y));
            for (const f of this.foods) s.add(key(f.x, f.y));
            if (this.portals) { s.add(key(this.portals.a.x, this.portals.a.y)); s.add(key(this.portals.b.x, this.portals.b.y)); }
            return s;
        }

        freeCell(minDist = 0, ahead = false) {
            const occ = this.occupied();
            const head = this.snake[0], b = this.bounds();
            const all = [];
            for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
                if (occ.has(key(x, y))) continue;
                if (minDist && dist({ x, y }, head) < minDist) continue;
                if (ahead) {   // evita bloquear de frente el camino inmediato
                    const d = DIRS[this.dir];
                    let blocked = false;
                    for (let i = 1; i <= 5; i++) if (head.x + d.x * i === x && head.y + d.y * i === y) blocked = true;
                    if (blocked) continue;
                }
                all.push({ x, y });
            }
            return all.length ? all[rand(all.length)] : null;
        }

        // ── Comida ──────────────────────────────────────────
        spawnFood(type, cell) {
            cell = cell || this.freeCell(type === 'apple' ? 0 : 2);
            if (!cell) return null;
            const def = FOODS[type];
            const f = { x: cell.x, y: cell.y, type, ttl: def.ttl || null, max: def.ttl || null, born: this.t };
            this.foods.push(f);
            return f;
        }
        ensureApples() {
            const n = this.foods.filter(f => f.type === 'apple').length;
            for (let i = n; i < this.mode.apples; i++) this.spawnFood('apple');
        }
        pickPower() {
            const list = Object.entries(FOODS).filter(([, d]) => d.power);
            const total = list.reduce((s, [, d]) => s + d.weight, 0);
            let x = Math.random() * total;
            for (const [k, d] of list) { if ((x -= d.weight) < 0) return k; }
            return 'ghost';
        }

        // ── Bucle ───────────────────────────────────────────
        baseInterval() { return Math.max(this.mode.min, this.mode.base - this.apples * 0.0022); }
        slowMul() { return this.fx.slow > 0 ? 1.6 : 1; }
        playerInterval() { return this.baseInterval() * this.slowMul() * (this.turboOn ? 0.5 : 1); }
        mult() {
            if (!this.mode.skills) return 1;
            return (1 + Math.min(Math.max(this.combo - 1, 0), 8) * 0.25) * (this.turboOn ? 1.5 : 1) * (this.fx.double > 0 ? 2 : 1);
        }

        update(dt) {
            this.t += dt;
            for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt; }
            this.particles = this.particles.filter(p => p.life > 0);
            for (const f of this.floaters) { f.y -= 28 * dt; f.life -= dt; }
            this.floaters = this.floaters.filter(f => f.life > 0);
            this.shake = Math.max(0, this.shake - dt * 3);
            if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.$('#sn-toast').classList.remove('show');
            if (this.state !== 'playing' || this.waiting) return;

            this.time += dt;
            for (const k of Object.keys(this.fx)) if (this.fx[k] > 0) this.fx[k] = Math.max(0, this.fx[k] - dt);
            if (this.comboT > 0 && (this.comboT -= dt) <= 0) this.combo = 0;

            // Energía y turbo
            if (this.mode.skills) {
                this.turboOn = this.turboHeld && this.energy > 0;
                if (this.turboOn) {
                    this.energy = Math.max(0, this.energy - TURBO_DRAIN * dt);
                    this.stats.turboTime += dt;
                    if (Math.random() < 0.6) { const h = this.snake[0]; this.spark((h.x + 0.5) * CELL, (h.y + 0.5) * CELL, '#fde047', 1, 40); }
                } else this.energy = Math.min(ENERGY_MAX, this.energy + ENERGY_REGEN * dt);
            }

            // Comida con caducidad
            for (const f of this.foods) if (f.ttl !== null) f.ttl -= dt;
            this.foods = this.foods.filter(f => f.ttl === null || f.ttl > 0);
            this.ensureApples();

            // Portales
            if (this.portals) { if ((this.portals.ttl -= dt) <= 0) { this.portals = null; this.portalCd = 7; } }
            else if (this.portalCd > 0) this.portalCd -= dt;

            // Zona
            if (this.mode.zone) {
                this.zoneAcc += dt;
                if (this.zoneAcc >= 1) { this.zoneAcc -= 1; this.score += 2; }
                if (this.zone.next !== Infinity && (this.zone.next -= dt) <= 0) {
                    this.shrinkZone();
                    if (this.state !== 'playing') return;
                }
            }

            // Rivales (reapariciones + movimiento)
            if (this.mode.rivals) {
                for (let i = 0; i < this.respawns.length; i++) this.respawns[i] -= dt;
                const want = Math.min(3, 1 + Math.floor(this.time / 50));
                if (this.rivals.length + this.respawns.filter(t => t > 0).length < want) this.respawns.push(5);
                while (this.respawns.length && this.respawns[0] <= 0) { this.respawns.shift(); this.spawnRival(false); }
                for (const r of this.rivals.slice()) {
                    r.acc += dt;
                    const iv = this.baseInterval() * 1.12 * this.slowMul();
                    while (r.acc >= iv && !r.dead && this.state === 'playing') { r.acc -= iv; this.rivalTick(r); }
                    r.alpha = Math.min(1, r.acc / iv);
                }
                this.rivals = this.rivals.filter(r => !r.dead);
                if (this.state !== 'playing') return;
            }

            // Serpiente del jugador
            this.acc += dt;
            let iv = this.playerInterval();
            while (this.acc >= iv && this.state === 'playing') {
                this.acc -= iv;
                this.tick();
                iv = this.playerInterval();
            }
            this.alpha = Math.min(1, this.acc / iv);
            this.stats.maxLen = Math.max(this.stats.maxLen, this.snake.length);
            this.tickPills(dt);
        }

        // ── Un paso de la serpiente del jugador ─────────────
        tick() {
            if (this.queue.length) this.dir = this.queue.shift();
            this.prev = this.snake.map(s => ({ ...s }));
            const d = DIRS[this.dir], head = this.snake[0];
            let nx = head.x + d.x, ny = head.y + d.y;
            const ghost = this.fx.ghost > 0;

            if (!this.inGrid(nx, ny)) {
                if (ghost) { nx = (nx + GW) % GW; ny = (ny + GH) % GH; }
                else return this.die(this.mode.zone ? 'Te quemaste con la lava' : 'Chocaste contra la pared');
            }
            if (!this.inBounds(nx, ny)) return this.die('Te quemaste con la lava');

            // Portales
            const P = this.portals;
            if (P) {
                const inA = nx === P.a.x && ny === P.a.y, inB = nx === P.b.x && ny === P.b.y;
                if (inA || inB) {
                    const to = inA ? P.b : P.a;
                    this.burst(nx, ny, '#22d3ee', 10);
                    nx = to.x; ny = to.y;
                    this.stats.portals++;
                    this.burst(nx, ny, '#fb923c', 10);
                    Nexus.audio.play('flip');
                }
            }

            const food = this.foodAt(nx, ny);
            const willGrow = this.grow > 0 || (food && FOODS[food.type].grow > 0);
            if (!ghost) {
                const limit = willGrow ? this.snake.length : this.snake.length - 1;
                for (let i = 0; i < limit; i++) if (this.snake[i].x === nx && this.snake[i].y === ny) return this.die('Te mordiste la cola');
                if (this.rocks.some(r => r.x === nx && r.y === ny)) return this.die('Chocaste contra una roca');
                const hit = this.rivalAt(nx, ny);
                if (hit) {
                    if (hit.idx === 0 && this.snake.length + (willGrow ? 1 : 0) > hit.r.body.length) this.killRival(hit.r, true);
                    else return this.die(hit.idx === 0 ? 'Choque frontal con un rival más grande' : 'Te chocaste con un rival');
                }
            } else {
                for (let i = 0; i < this.snake.length - 1; i++) if (this.snake[i].x === nx && this.snake[i].y === ny) { this.stats.ghostPass++; break; }
            }

            this.snake.unshift({ x: nx, y: ny });
            if (this.grow > 0) this.grow--; else this.snake.pop();
            this.afterMove();
            if (this.state === 'playing') Nexus.audio.play('key');
        }

        afterMove() {
            const h = this.snake[0];
            const f = this.foodAt(h.x, h.y);
            if (f) this.eat(f, true);
            if (this.fx.magnet > 0) this.pullFoods();
        }

        foodAt(x, y) { return this.foods.find(f => f.x === x && f.y === y) || null; }
        rivalAt(x, y) {
            for (const r of this.rivals) for (let i = 0; i < r.body.length; i++) if (r.body[i].x === x && r.body[i].y === y) return { r, idx: i };
            return null;
        }

        pullFoods() {
            const h = this.snake[0];
            const occ = this.occupied();
            for (const f of this.foods.slice()) {
                const def = FOODS[f.type];
                if (def.power || f.type === 'shroom') continue;
                const dx = h.x - f.x, dy = h.y - f.y;
                if (Math.abs(dx) + Math.abs(dy) > 5 || (!dx && !dy)) continue;
                const sx = Math.sign(dx), sy = Math.sign(dy);
                const tries = Math.abs(dx) >= Math.abs(dy) ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]];
                for (const [ax, ay] of tries) {
                    if (!ax && !ay) continue;
                    const nx = f.x + ax, ny = f.y + ay;
                    if (!this.inBounds(nx, ny)) continue;
                    if (nx === h.x && ny === h.y) { this.stats.magnetEats++; this.eat(f, true); break; }
                    if (occ.has(key(nx, ny))) continue;
                    f.x = nx; f.y = ny; break;
                }
            }
        }

        // ── Comer ───────────────────────────────────────────
        eat(f, byPlayer) {
            const def = FOODS[f.type];
            this.foods = this.foods.filter(x => x !== f);
            const h = this.snake[0];
            const cx = (f.x + 0.5) * CELL, cy = (f.y + 0.5) * CELL;
            this.spark(cx, cy, def.color, 14, 130);
            if (def.power) { this.usePower(f.type); this.ensureApples(); return; }

            this.stats.apples++; if (f.type === 'gold') this.stats.golds++;
            if (f.type !== 'bit') this.apples++;
            if (this.mode.skills) {
                this.combo = this.comboT > 0 ? this.combo + 1 : 1;
                this.comboT = COMBO_WINDOW;
                this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
                this.energy = Math.min(ENERGY_MAX, this.energy + def.energy);
            }
            const gain = Math.round(def.pts * this.mult());
            this.score += gain;
            this.grow += def.grow;
            this.floatText('+' + gain, def.color, cx, cy - 8);
            if (this.fx.magnet > 0 && byPlayer) { /* contado en pullFoods */ }
            Nexus.audio.play(f.type === 'apple' ? 'combo' : 'orbCollect', this.combo + 1);

            if (f.type === 'shroom') {
                this.fx.confuse = 6; this.stats.shrooms++;
                this.pop('🍄 ¡Controles invertidos!', '#f472b6');
            }
            if (f.type === 'apple') this.onApple();
            this.ensureApples();
            this.updatePills();
        }

        onApple() {
            const m = this.mode;
            if (m.powers) {
                const powersOnMap = this.foods.filter(f => FOODS[f.type].power).length;
                if (powersOnMap < 2 && Math.random() < 0.38) this.spawnFood(this.pickPower());
                if (Math.random() < 0.15) this.spawnFood('gold');
                if (this.apples >= 5 && Math.random() < 0.13) this.spawnFood('shroom');
            }
            if (m.rocks && this.apples % 4 === 0 && this.rocks.length < 16) {
                const c = this.freeCell(4, true);
                if (c) { this.rocks.push(c); this.burst(c.x, c.y, '#94a3b8', 8); }
            }
            if (m.portals && !this.portals && this.portalCd <= 0 && this.apples >= 6) this.spawnPortals();
        }

        spawnPortals() {
            const head = this.snake[0];
            for (let i = 0; i < 40; i++) {
                const a = this.freeCell(3), b = this.freeCell(3);
                if (a && b && dist(a, b) >= 9 && dist(a, head) >= 3 && dist(b, head) >= 3) {
                    this.portals = { a, b, ttl: 22 };
                    this.pop('🌀 ¡Portales abiertos!', '#22d3ee');
                    return;
                }
            }
        }

        usePower(kind) {
            const def = FOODS[kind];
            this.kinds.add(kind); this.stats.kinds = this.kinds.size;
            Nexus.audio.play('powerActivate');
            const h = this.snake[0];
            if (def.dur) this.fx[kind] = def.dur;
            this.pop(`${def.emoji} ${def.name}`, def.color);
            if (kind === 'scissors') {
                const n = this.snake.length;
                const remove = Math.floor((n - 3) / 2);
                if (remove > 0) {
                    const cut = this.snake.splice(n - remove, remove);
                    this.stats.scissors += remove;
                    this.score += remove * 4;
                    // los trozos cortados se convierten en fragmentos
                    cut.filter((_, i) => i % Math.ceil(cut.length / 8) === 0).forEach(c => this.spawnFood('bit', c));
                    this.grow = 0;
                    this.prev = this.snake.map(s => ({ ...s }));
                    cut.forEach(c => this.burst(c.x, c.y, '#fb7185', 3));
                }
            } else if (kind === 'bomb') {
                this.stats.bombs++;
                const R = 3, near = (p) => Math.max(Math.abs(p.x - h.x), Math.abs(p.y - h.y)) <= R;
                const destroyed = this.rocks.filter(near);
                this.rocks = this.rocks.filter(r => !near(r));
                this.stats.rocksBombed += destroyed.length;
                this.score += destroyed.length * 20;
                destroyed.forEach(r => this.burst(r.x, r.y, '#f97316', 12));
                for (const r of this.rivals.slice()) {
                    const idx = r.body.findIndex(near);
                    if (idx === 0) this.killRival(r, true);
                    else if (idx > 0) this.cutRival(r, idx);
                }
                for (let i = 0; i < 28; i++) {
                    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 260;
                    this.particles.push({ x: (h.x + 0.5) * CELL, y: (h.y + 0.5) * CELL, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, color: '#fb923c', s: 4 });
                }
                this.shake = 1;
                Nexus.audio.play('explosion');
            }
        }

        // ── Habilidades ─────────────────────────────────────
        hop() {
            if (this.state !== 'playing' || !this.mode.skills) return;
            if (this.waiting) return;
            if (this.energy < HOP_COST) { this.toast('Sin energía para saltar'); Nexus.audio.play('error'); return; }
            const d = DIRS[this.dir], h = this.snake[0];
            const cells = [];
            for (let i = 1; i <= HOP_LEN; i++) cells.push({ x: h.x + d.x * i, y: h.y + d.y * i });
            if (cells.some(c => !this.inBounds(c.x, c.y))) { this.toast('No hay espacio para saltar'); Nexus.audio.play('error'); return; }
            const land = cells[cells.length - 1];
            const blockedBy = this.snake.some(s => s.x === land.x && s.y === land.y) || this.rocks.some(r => r.x === land.x && r.y === land.y) || this.rivalAt(land.x, land.y);
            if (blockedBy && this.fx.ghost <= 0) { this.toast('Aterrizaje bloqueado'); Nexus.audio.play('error'); return; }
            const over = cells.slice(0, -1).some(c => this.snake.some(s => s.x === c.x && s.y === c.y));
            if (over) this.stats.hopOver++;
            this.stats.hops++;
            this.energy -= HOP_COST;
            for (const c of cells) {
                this.snake.unshift({ x: c.x, y: c.y });
                if (this.grow > 0) this.grow--; else this.snake.pop();
                this.spark((c.x + 0.5) * CELL, (c.y + 0.5) * CELL, '#86efac', 6, 90);
            }
            this.prev = this.snake.map(s => ({ ...s }));
            this.acc = 0;
            Nexus.audio.play('powerUse');
            this.afterMove();
        }

        // ── Zona ────────────────────────────────────────────
        shrinkZone() {
            const z = this.zone;
            if (z.l < ZONE_MAX_X) { z.l++; z.r++; }
            if (z.t < ZONE_MAX_Y && z.level % 4 !== 3) { z.t++; z.b++; }
            z.level++;
            this.stats.zoneLevel = z.level;
            z.next = (z.l >= ZONE_MAX_X && z.t >= ZONE_MAX_Y) ? Infinity : ZONE_EVERY;
            this.pop('🔥 ¡La zona se encoge!', '#f97316');
            this.shake = 0.8;
            Nexus.audio.play('explosion');
            this.foods = this.foods.filter(f => this.inBounds(f.x, f.y));
            this.rocks = this.rocks.filter(r => this.inBounds(r.x, r.y));
            if (!this.inBounds(this.snake[0].x, this.snake[0].y)) return this.die('La lava te alcanzó');
            const idx = this.snake.findIndex((s, i) => i > 0 && !this.inBounds(s.x, s.y));
            if (idx > 0) {
                const lost = this.snake.splice(idx);
                lost.forEach(c => this.burst(c.x, c.y, '#f97316', 3));
                this.prev = this.snake.map(s => ({ ...s }));
            }
            this.ensureApples();
        }
        zoneWarn() {
            const z = this.zone;
            return this.mode.zone && z.next !== Infinity && z.next < 3.2;
        }

        // ── Rivales ─────────────────────────────────────────
        spawnRival(first) {
            const head = this.snake[0];
            const occ = this.occupied();
            for (let n = 0; n < 80; n++) {
                const dn = DIR_NAMES[rand(4)], d = DIRS[dn];
                const x = 2 + rand(GW - 4), y = 2 + rand(GH - 4);
                const cells = [];
                let ok = true;
                for (let i = 0; i < 4; i++) {
                    const c = { x: x - d.x * i, y: y - d.y * i };
                    if (!this.inBounds(c.x, c.y) || occ.has(key(c.x, c.y)) || dist(c, head) < (first ? 6 : 9)) { ok = false; break; }
                    cells.push(c);
                }
                if (!ok) continue;
                const color = RIVAL_COLORS[rand(RIVAL_COLORS.length)];
                this.rivals.push({ body: cells, prev: cells.map(c => ({ ...c })), dir: dn, acc: 0, alpha: 1, grow: 0, color, dead: false,
                    aggr: Math.min(0.5, 0.08 + this.time / 240) });
                this.burst(x, y, color[0], 12);
                return;
            }
        }

        rivalTick(r) {
            r.prev = r.body.map(s => ({ ...s }));
            const dn = this.rivalDecide(r);
            r.dir = dn;
            const d = DIRS[dn], head = r.body[0];
            const nx = head.x + d.x, ny = head.y + d.y;
            const ghost = this.fx.ghost > 0;
            if (!this.inBounds(nx, ny)) return this.killRival(r, false);
            // cuerpos (el último segmento se libera salvo que crezca)
            const selfLimit = r.grow > 0 ? r.body.length : r.body.length - 1;
            for (let i = 0; i < selfLimit; i++) if (r.body[i].x === nx && r.body[i].y === ny) return this.killRival(r, false);
            if (this.rocks.some(k => k.x === nx && k.y === ny)) return this.killRival(r, false);
            for (const o of this.rivals) {
                if (o === r || o.dead) continue;
                for (let i = 0; i < o.body.length; i++) if (o.body[i].x === nx && o.body[i].y === ny) return this.killRival(r, false);
            }
            if (!ghost) {
                const ph = this.snake[0];
                if (nx === ph.x && ny === ph.y) {
                    if (r.body.length < this.snake.length) return this.killRival(r, true);
                    return this.die('Un rival te embistió');
                }
                for (let i = 1; i < this.snake.length; i++) if (this.snake[i].x === nx && this.snake[i].y === ny) return this.killRival(r, true);
            }
            r.body.unshift({ x: nx, y: ny });
            if (r.grow > 0) r.grow--; else r.body.pop();
            const f = this.foodAt(nx, ny);
            if (f) {
                const def = FOODS[f.type];
                if (!def.power && f.type !== 'shroom') {
                    this.foods = this.foods.filter(x => x !== f);
                    if (r.body.length < 22) r.grow += def.grow;
                    this.spark((nx + 0.5) * CELL, (ny + 0.5) * CELL, r.color[0], 8, 90);
                    this.ensureApples();
                }
            }
        }

        rivalDecide(r) {
            const head = r.body[0];
            const ph = this.snake[0];
            const ghost = this.fx.ghost > 0;
            const blocked = new Set();
            const addBody = (body, grows) => { const n = grows ? body.length : body.length - 1; for (let i = 0; i < n; i++) blocked.add(key(body[i].x, body[i].y)); };
            addBody(r.body, r.grow > 0);
            for (const o of this.rivals) if (o !== r && !o.dead) addBody(o.body, true);
            if (!ghost) {
                addBody(this.snake, this.grow > 0);
                if (r.body.length <= this.snake.length) for (const dn of DIR_NAMES) blocked.add(key(ph.x + DIRS[dn].x, ph.y + DIRS[dn].y));
            }
            for (const k of this.rocks) blocked.add(key(k.x, k.y));
            if (this.portals) { blocked.add(key(this.portals.a.x, this.portals.a.y)); blocked.add(key(this.portals.b.x, this.portals.b.y)); }
            blocked.delete(key(head.x, head.y));

            // Objetivos
            let targets = new Set();
            if (Math.random() < r.aggr && !ghost) {
                const d = DIRS[this.dir];
                const gx = ph.x + d.x * 3, gy = ph.y + d.y * 3;
                if (this.inBounds(gx, gy)) targets.add(key(gx, gy));
            }
            if (!targets.size) for (const f of this.foods) { const def = FOODS[f.type]; if (!def.power && f.type !== 'shroom') targets.add(key(f.x, f.y)); }

            const step = (x, y) => {
                const out = [];
                for (const dn of DIR_NAMES) {
                    const nx = x + DIRS[dn].x, ny = y + DIRS[dn].y;
                    if (!this.inBounds(nx, ny) || blocked.has(key(nx, ny))) continue;
                    out.push({ x: nx, y: ny, dn });
                }
                return out;
            };
            // BFS hasta el objetivo más cercano alcanzable
            const seen = new Set([key(head.x, head.y)]);
            let q = step(head.x, head.y).map(s => ({ ...s, first: s.dn }));
            q.forEach(s => seen.add(key(s.x, s.y)));
            let qi = 0;
            while (qi < q.length) {
                const c = q[qi++];
                if (targets.has(key(c.x, c.y))) return c.first;
                for (const n of step(c.x, c.y)) {
                    const k = key(n.x, n.y);
                    if (seen.has(k)) continue;
                    seen.add(k); q.push({ ...n, first: c.first });
                }
            }
            // Sin camino: la dirección con más espacio libre
            let best = null, bestN = -1;
            for (const s of step(head.x, head.y)) {
                const area = new Set([key(s.x, s.y)]); const fr = [s];
                while (fr.length && area.size < 60) {
                    const c = fr.shift();
                    for (const n of step(c.x, c.y)) { const k = key(n.x, n.y); if (!area.has(k)) { area.add(k); fr.push(n); } }
                }
                if (area.size > bestN) { bestN = area.size; best = s.dn; }
            }
            return best || r.dir;
        }

        killRival(r, byPlayer) {
            if (r.dead) return;
            r.dead = true;
            // los segmentos se convierten en fragmentos
            r.body.forEach((c, i) => { if (i % 2 === 0 && this.inBounds(c.x, c.y) && !this.foodAt(c.x, c.y)) this.spawnFood('bit', c); });
            r.body.forEach(c => this.burst(c.x, c.y, r.color[0], 4));
            this.rivals = this.rivals.filter(x => x !== r);
            if (byPlayer) {
                this.stats.kills++;
                const gain = Math.round(100 * (this.mode.skills ? Math.max(1, this.mult()) : 1));
                this.score += gain;
                this.pop(`🐍 ¡Rival eliminado! +${gain}`, '#fb923c');
                Nexus.audio.play('win');
            }
            this.shake = Math.max(this.shake, 0.4);
            this.updatePills();
        }
        cutRival(r, idx) {
            const lost = r.body.splice(idx);
            lost.forEach((c, i) => { if (i % 2 === 0 && !this.foodAt(c.x, c.y)) this.spawnFood('bit', c); this.burst(c.x, c.y, r.color[0], 3); });
            r.prev = r.body.map(s => ({ ...s }));
            if (r.body.length < 2) this.killRival(r, true);
        }

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

            Kit.touchButtons(this.$('#sn-touch'), (a) => this.act(a, true), (a) => this.act(a, false));
            Kit.swipe(this.stage, (d) => { if (d !== 'tap') this.turn(d); });
            const hopBtn = this.$('#sn-btn-hop');
            hopBtn.addEventListener('click', () => this.hop());
            this.overlay.addEventListener('click', (e) => {
                const m = e.target.closest('[data-mode]');
                if (m) { this.mode = MODES.find(x => x.id === m.dataset.mode); this.showMenu(); this.updateRecords(); Nexus.audio.play('click'); return; }
                const b = e.target.closest('[data-do]');
                if (!b) return;
                const d = b.dataset.do;
                if (d === 'start' || d === 'restart') this.newGame();
                else if (d === 'resume') this.resume();
                else if (d === 'menu') { this.state = 'menu'; this.showMenu(); }
            });
        }

        handleKey(k, down, repeat) {
            const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
                w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
            if (down && (k === 'p' || k === 'P' || k === 'Escape')) {
                if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume();
                return true;
            }
            if (down && k === 'Enter' && this.state === 'menu') { this.newGame(); return true; }
            if (k === ' ') { this.turboHeld = down; return true; }
            if (dirs[k]) { if (down && !repeat) this.turn(dirs[k]); return true; }
            if (down && !repeat && (k === 'z' || k === 'Z' || k === 'x' || k === 'X' || k === 'Shift')) { this.hop(); return true; }
            return false;
        }

        act(a, down) {
            if (a === 'turbo') { this.turboHeld = down; return; }
            if (!down) return;
            if (a === 'hop') this.hop(); else this.turn(a);
        }

        turn(dir) {
            if (this.state !== 'playing') return;
            if (this.fx.confuse > 0) dir = OPP[dir];
            if (this.waiting) {
                if (dir === OPP[this.dir]) return;
                this.dir = dir; this.waiting = false; this.acc = 0;
                return;
            }
            const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
            if (dir === last || dir === OPP[last] || this.queue.length >= 2) return;
            this.queue.push(dir);
        }

        // ── Pausa / fin ─────────────────────────────────────
        pause() {
            if (this.state !== 'playing') return;
            this.state = 'paused';
            this.turboHeld = false; this.turboOn = false;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">PAUSA</h2>
                <div class="ax-play-row">
                    <button class="btn btn-primary" data-do="resume" type="button">▶ Continuar</button>
                    <button class="btn btn-ghost" data-do="restart" type="button">🔄 Reiniciar</button>
                    <button class="btn btn-ghost" data-do="menu" type="button">☰ Menú</button>
                </div></div>`;
        }
        resume() {
            if (this.state !== 'paused') return;
            this.state = 'playing';
            this.overlay.hidden = true;
        }

        showMenu() {
            this.overlay.hidden = false;
            const gs = Nexus.services.progress.stats('snake');
            const ms = gs.byMode[this.mode.id];
            const best = ms ? `Mejor: <b>${formatNumber(ms.bestScore)}</b> pts` : 'Aún sin récord';
            this.updateModeUI();
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">SNAKE NEÓN</h2>
                <p class="ax-sub">La serpiente de siempre, con energía, poderes, portales y rivales</p>
                ${Kit.modeCards(MODES, this.mode.id)}
                <details class="ax-help"><summary>📖 Cómo se juega</summary><ul>
                    <li><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> o <kbd>WASD</kbd> para girar (en móvil, desliza) · <kbd>P</kbd> pausa.</li>
                    <li><b>⚡ Turbo</b>: mantén <kbd>Espacio</kbd>; vas el doble de rápido y los puntos valen ×1,5, pero gasta energía. <b>🦘 Salto</b> (<kbd>Z</kbd>, ${HOP_COST} de energía): saltas ${HOP_LEN} casillas por encima de tu cuerpo, rocas o rivales; el aterrizaje debe estar libre. La energía se recarga sola y comiendo.</li>
                    <li><b>Racha</b>: comer en menos de ${COMBO_WINDOW} s seguidos sube el multiplicador hasta ×3.</li>
                    <li><b>Frutas</b>: 🌟 dorada (+50), 🍄 seta (+40 pero invierte los controles), y poderes 👻 Fantasma, 🧲 Imán, 🐢 Lento, 💰 Doble, ✂️ Tijeras y 💣 Bomba. Los poderes aparecen al comer y caducan si no los recoges.</li>
                    <li><b>Evolución</b>: aparecen rocas y portales 🌀 (entras por uno y sales por el otro, cuerpo incluido).</li>
                    <li><b>Rival</b>: las serpientes enemigas buscan la comida y te cierran el paso. Si chocan con tu cuerpo mueren y se convierten en fragmentos ✨; si chocas con ellas, pierdes. En un cara a cara gana la más larga.</li>
                    <li><b>Zona</b>: la lava avanza desde los bordes cada 12 s (se avisa antes). Lo que toque se quema: la cola se corta y si te alcanza la cabeza, pierdes.</li>
                </ul></details>
                <div class="ax-best">${best}</div>
                <div class="ax-play-row"><button class="btn btn-primary btn-glow" data-do="start" type="button">▶ Jugar · ${esc(this.mode.label)}</button></div>
            </div>`;
        }

        updateModeUI() {
            const m = this.mode;
            this.$('#sn-skill-card').hidden = !m.skills;
            this.$('#sn-legend-card').hidden = !m.powers;
            this.$('#sn-touch').classList.toggle('no-skills', !m.skills);
            const extraRow = this.$('#sn-extra-row');
            extraRow.hidden = !(m.rivals || m.zone);
            this.$('#sn-extra-label').textContent = m.zone ? 'Zona' : 'Rivales cazados';
            this.$('#sn-legend').innerHTML = Object.entries(FOODS).map(([, d]) =>
                `<div class="sn-leg"><span class="sn-leg-icon">${d.emoji}</span><span><b>${d.name}</b><small>${d.desc}</small></span></div>`).join('');
        }

        die(reason) {
            if (this.state === 'over') return;
            this.state = 'over';
            if (this.run) this.run.clear();
            this.turboHeld = false; this.turboOn = false;
            this.shake = 1;
            const h = this.snake[0];
            this.burst(h.x, h.y, '#4ade80', 30);
            this.snake.forEach(s => this.burst(s.x, s.y, '#22c55e', 2));
            Nexus.audio.play('lose');
            const m = this.mode;
            const xp = Math.min(400, Math.round(this.score / 12) + this.apples + this.stats.kills * 15);
            const result = Nexus.services.progress.recordGame({
                game: 'snake', mode: m.id, won: false, endless: true, score: Math.round(this.score), time: Math.round(this.time), xp,
                extra: { ...this.stats, length: this.snake.length, mode: m.id, time: Math.round(this.time) },
                updateExtra: (x) => { x.totalApples = (x.totalApples || 0) + this.stats.apples; }
            });
            this.updatePills(); this.updateSide();
            const stats = [
                { label: 'Puntuación', value: formatNumber(Math.round(this.score)) },
                { label: 'Longitud máx.', value: String(this.stats.maxLen) },
                { label: 'Frutas', value: String(this.stats.apples) },
                { label: 'Tiempo', value: Nexus.util.formatTime(this.time) }
            ];
            if (m.rivals) stats.push({ label: 'Rivales cazados', value: String(this.stats.kills) });
            if (m.zone) stats.push({ label: 'Zona alcanzada', value: String(this.stats.zoneLevel) });
            const open = () => {
                if (this.destroyed) return;
                this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: '🐍', kind: 'lose', title: 'FIN DE LA PARTIDA', subtitle: reason, stats, result,
                    actions: [
                        { label: '🔄 Otra partida', kind: 'primary', onClick: () => { this.later(() => this.newGame(), 50); } },
                        { label: '☰ Cambiar modo', kind: 'ghost', onClick: () => { this.later(() => { this.state = 'menu'; this.showMenu(); }, 50); } },
                        { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
                    ]
                });
            };
            this.later(open, 700);
        }

        // ── Efectos visuales ────────────────────────────────
        burst(c, r, color, n) { this.spark((c + 0.5) * CELL, (r + 0.5) * CELL, color, n, 170); }
        spark(x, y, color, n, speed) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.9);
                this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.45, max: 0.8, color, s: 2 + Math.random() * 3 });
            }
        }
        floatText(text, color, x, y) { this.floaters.push({ text, color, x, y, life: 1.1 }); }
        pop(text, color) {
            const h = this.snake[0];
            this.floatText(text, color, clamp((h.x + 0.5) * CELL, 90, GW * CELL - 90), clamp((h.y - 0.6) * CELL, 24, GH * CELL));
            this.toast(text);
        }
        toast(text) {
            const el = this.$('#sn-toast');
            el.textContent = text; el.classList.add('show'); this.toastT = 1.8;
        }

        // ── Dibujo ──────────────────────────────────────────
        draw() {
            const ctx = this.ctx, W = GW * CELL, H = GH * CELL, b = this.bounds();
            ctx.save();
            ctx.clearRect(0, 0, W, H);
            if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 8, (Math.random() - 0.5) * this.shake * 8);
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0a0f1c'); bg.addColorStop(1, '#0d1626');
            ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);

            if (Nexus.services.settings.get('snake.grid')) {
                ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
                ctx.beginPath();
                for (let c = 1; c < GW; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); }
                for (let r = 1; r < GH; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); }
                ctx.stroke();
            }

            // Lava y aviso de zona
            if (this.mode.zone) {
                const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
                for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
                    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) continue;
                    ctx.fillStyle = `rgba(${200 + pulse * 40 | 0},${50 + pulse * 30 | 0},20,${0.55 + pulse * 0.15})`;
                    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
                }
                if (this.zoneWarn()) {
                    const z = this.zone;
                    ctx.fillStyle = `rgba(251,146,60,${0.18 + pulse * 0.3})`;
                    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
                        const edgeX = z.l < ZONE_MAX_X && (x === b.x0 || x === b.x1);
                        const edgeY = z.t < ZONE_MAX_Y && z.level % 4 !== 3 && (y === b.y0 || y === b.y1);
                        if (edgeX || edgeY) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
                    }
                }
                ctx.strokeStyle = 'rgba(251,146,60,.8)'; ctx.lineWidth = 2;
                ctx.strokeRect(b.x0 * CELL + 1, b.y0 * CELL + 1, (b.x1 - b.x0 + 1) * CELL - 2, (b.y1 - b.y0 + 1) * CELL - 2);
            }

            // Portales
            if (this.portals) {
                this.drawPortal(this.portals.a, '#22d3ee', 1);
                this.drawPortal(this.portals.b, '#fb923c', -1);
            }
            // Rocas
            for (const r of this.rocks) {
                const x = r.x * CELL, y = r.y * CELL;
                Kit.roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 7);
                const g = ctx.createLinearGradient(x, y, x, y + CELL);
                g.addColorStop(0, '#64748b'); g.addColorStop(1, '#334155');
                ctx.fillStyle = g; ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 7, y + 7, 6, 3);
            }
            // Comida
            for (const f of this.foods) this.drawFood(f);

            // Rivales y jugador
            for (const r of this.rivals) this.drawSnake(r.body, r.prev, r.alpha, r.color, r.dir, true, 1);
            if (this.state !== 'menu') {
                const ghost = this.fx.ghost > 0;
                if (this.fx.magnet > 0) {
                    const h = this.pos(this.snake, this.prev, this.alpha, 0);
                    ctx.strokeStyle = `rgba(96,165,250,${0.25 + 0.15 * Math.sin(this.t * 6)})`; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc((h.x + 0.5) * CELL, (h.y + 0.5) * CELL, CELL * 5.5, 0, Math.PI * 2); ctx.stroke();
                }
                this.drawSnake(this.snake, this.prev, this.alpha, PLAYER_COLORS, this.dir, false, ghost ? 0.5 + 0.15 * Math.sin(this.t * 10) : 1);
            }

            // Efectos de estado
            if (this.fx.confuse > 0) { ctx.strokeStyle = `rgba(244,114,182,${0.5 + 0.3 * Math.sin(this.t * 8)})`; ctx.lineWidth = 5; ctx.strokeRect(2, 2, W - 4, H - 4); }
            if (this.turboOn) { ctx.strokeStyle = 'rgba(253,224,71,.5)'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, W - 4, H - 4); }
            if (this.fx.slow > 0) { ctx.fillStyle = 'rgba(74,222,128,.06)'; ctx.fillRect(0, 0, W, H); }

            for (const p of this.particles) {
                ctx.globalAlpha = Math.max(0, p.life / p.max);
                ctx.fillStyle = p.color; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
            }
            ctx.globalAlpha = 1;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '800 17px Orbitron, system-ui, sans-serif';
            for (const f of this.floaters) {
                ctx.globalAlpha = Math.min(1, f.life * 1.6);
                ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(f.text, f.x, f.y);
                ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
            }
            ctx.globalAlpha = 1;
            if (this.state === 'playing' && this.waiting) {
                ctx.fillStyle = 'rgba(5,5,14,.55)'; ctx.fillRect(0, H / 2 + 40, W, 44);
                ctx.fillStyle = '#e2e8f0'; ctx.font = '700 17px Inter, system-ui, sans-serif';
                ctx.fillText('Pulsa una flecha (o desliza) para empezar', W / 2, H / 2 + 62);
            }
            ctx.restore();
        }

        pos(body, prev, alpha, i) {
            const c = body[i], p = prev[i];
            if (!p || Math.abs(c.x - p.x) + Math.abs(c.y - p.y) > 1) return c;
            return { x: p.x + (c.x - p.x) * alpha, y: p.y + (c.y - p.y) * alpha };
        }

        drawSnake(body, prev, alpha, colors, dir, isRival, opacity) {
            const ctx = this.ctx, n = body.length;
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const pts = body.map((_, i) => this.pos(body, prev, alpha, i));
            for (let i = n - 1; i >= 1; i--) {
                const a = pts[i], b = pts[i - 1];
                const t = i / Math.max(1, n - 1);
                const far = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1.2;
                const w = CELL * (0.82 - 0.3 * t);
                ctx.strokeStyle = Kit.mix(colors[0], colors[1], t);
                ctx.lineWidth = w;
                ctx.shadowColor = colors[0]; ctx.shadowBlur = 8 * (1 - t);
                ctx.beginPath();
                ctx.moveTo((a.x + 0.5) * CELL, (a.y + 0.5) * CELL);
                if (far) ctx.lineTo((a.x + 0.5) * CELL, (a.y + 0.5) * CELL); else ctx.lineTo((b.x + 0.5) * CELL, (b.y + 0.5) * CELL);
                ctx.stroke();
                // franja clara sobre el lomo
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = w * 0.3;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            // Cabeza
            const h = pts[0], hx = (h.x + 0.5) * CELL, hy = (h.y + 0.5) * CELL, d = DIRS[dir];
            ctx.fillStyle = colors[0];
            ctx.shadowColor = colors[0]; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(hx, hy, CELL * 0.46, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            const px = -d.y, py = d.x;
            for (const s of [-1, 1]) {
                const ex = hx + d.x * CELL * 0.12 + px * s * CELL * 0.2, ey = hy + d.y * CELL * 0.12 + py * s * CELL * 0.2;
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, CELL * 0.12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = isRival ? '#dc2626' : '#0f172a';
                ctx.beginPath(); ctx.arc(ex + d.x * CELL * 0.04, ey + d.y * CELL * 0.04, CELL * 0.065, 0, Math.PI * 2); ctx.fill();
            }
            if (!isRival && this.fx.confuse > 0) {
                ctx.font = `${CELL * 0.7}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('💫', hx, hy - CELL * 0.8);
            }
            ctx.restore();
        }

        drawFood(f) {
            const ctx = this.ctx, def = FOODS[f.type];
            const cx = (f.x + 0.5) * CELL, cy = (f.y + 0.5) * CELL;
            const age = this.t - f.born;
            const blink = f.ttl !== null && f.ttl < 3 && Math.floor(this.t * 6) % 2 === 0;
            if (blink) ctx.globalAlpha = 0.35;
            const pulse = 1 + 0.08 * Math.sin(this.t * 5 + f.x);
            const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL * 0.8);
            glow.addColorStop(0, Kit.rgba(def.color, 0.45)); glow.addColorStop(1, Kit.rgba(def.color, 0));
            ctx.fillStyle = glow; ctx.fillRect(cx - CELL, cy - CELL, CELL * 2, CELL * 2);
            ctx.font = `${Math.floor(CELL * 0.72 * pulse * Math.min(1, age * 5 + 0.3))}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(def.emoji, cx, cy + 1);
            if (f.max) {
                ctx.strokeStyle = Kit.rgba(def.color, 0.9); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, f.ttl / f.max)); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        drawPortal(p, color, spin) {
            const ctx = this.ctx, cx = (p.x + 0.5) * CELL, cy = (p.y + 0.5) * CELL;
            const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL * 0.75);
            g.addColorStop(0, Kit.rgba(color, 0.05)); g.addColorStop(0.7, Kit.rgba(color, 0.35)); g.addColorStop(1, Kit.rgba(color, 0));
            ctx.fillStyle = g; ctx.fillRect(cx - CELL, cy - CELL, CELL * 2, CELL * 2);
            ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
            for (let i = 0; i < 3; i++) {
                const a = this.t * 3 * spin + i * (Math.PI * 2 / 3), r = CELL * (0.42 - i * 0.08);
                ctx.beginPath(); ctx.arc(cx, cy, r, a, a + 1.6); ctx.stroke();
            }
            if (this.portals && this.portals.ttl < 4 && Math.floor(this.t * 6) % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(cx - CELL / 2, cy - CELL / 2, CELL, CELL); }
        }

        // ── Panel / píldoras ────────────────────────────────
        updatePills() {
            const set = (id, v) => { const el = this.root.querySelector(`[data-pill="${id}"]`); if (el) el.textContent = v; };
            set('score', formatNumber(Math.round(this.score)));
            set('length', String(this.snake.length));
            set('time', Nexus.util.formatTime(this.time));
        }
        updateSide() {
            const set = (id, v) => { const el = this.$('#' + id); if (el) el.textContent = v; };
            set('sn-combo', this.combo > 1 ? `🔥 ${this.combo}` : '–');
            const mu = this.mult();
            set('sn-mult', '×' + (Math.round(mu * 100) / 100).toString().replace('.', ','));
            set('sn-apples', this.stats.apples);
            set('sn-extra', this.mode.zone ? this.stats.zoneLevel : this.stats.kills);
            this.$('#sn-energy').style.width = this.energy + '%';
            const hop = this.$('#sn-btn-hop');
            hop.disabled = this.energy < HOP_COST || !this.mode.skills;
            hop.classList.toggle('ready', !hop.disabled);
            this.updateEffects();
        }
        updateEffects() {
            const chips = [];
            for (const k of Object.keys(FX_LABEL)) if (this.fx[k] > 0) chips.push(`<span class="ax-chip${k === 'confuse' ? ' hot' : ''}">${FX_LABEL[k]} · ${Math.ceil(this.fx[k])} s</span>`);
            if (this.turboOn) chips.push('<span class="ax-chip hot">⚡ Turbo</span>');
            if (this.mode.zone && this.zone.next !== Infinity && this.state === 'playing') chips.push(`<span class="ax-chip${this.zoneWarn() ? ' hot' : ''}">🔥 Lava en ${Math.max(0, Math.ceil(this.zone.next))} s</span>`);
            const html = chips.join('') || '<span class="ax-hint">Sin efectos activos</span>';
            const el = this.$('#sn-effects');
            if (el.innerHTML !== html) el.innerHTML = html;
        }
        tickPills(dt) {
            this._pt = (this._pt || 0) + dt;
            if (this._pt > 0.12) { this._pt = 0; this.updatePills(); this.updateSide(); }
        }
        updateRecords() {
            const gs = Nexus.services.progress.stats('snake');
            const ms = gs.byMode[this.mode.id];
            const el = this.$('#sn-best');
            if (el) el.textContent = ms ? formatNumber(ms.bestScore) : '0';
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id);
            return id;
        }

        destroy() {
            if (this.run) this.run.stop();
            this.destroyed = true;
            this.loop.destroy();
            this.fit.destroy();
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            if (this.unsubProgress) this.unsubProgress();
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
        }
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'snake') ? c.event : null;
    const sn = (c) => c.stats('snake');
    A.register([
        { id: 'sn_len15', game: 'snake', name: 'Culebrón', desc: 'Alcanza una longitud de 15.', icon: '📏', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxLen >= 15; } },
        { id: 'sn_len40', game: 'snake', name: 'Anaconda', desc: 'Alcanza una longitud de 40.', icon: '🐍', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxLen >= 40; } },
        { id: 'sn_combo5', game: 'snake', name: 'En racha', desc: 'Encadena 5 frutas seguidas.', icon: '🔥', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxCombo >= 5; } },
        { id: 'sn_hop', game: 'snake', name: 'Salto del tigre', desc: 'Salta por encima de tu propio cuerpo.', icon: '🦘', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.hopOver >= 1; } },
        { id: 'sn_ghost', game: 'snake', name: 'Intangible', desc: 'Atraviesa tu propio cuerpo con 👻 Fantasma.', icon: '👻', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.ghostPass >= 1; } },
        { id: 'sn_portal', game: 'snake', name: 'Viajero dimensional', desc: 'Cruza 8 portales en una partida.', icon: '🌀', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.portals >= 8; } },
        { id: 'sn_shroom', game: 'snake', name: 'Mal viaje', desc: 'Come 3 setas 🍄 en una partida.', icon: '🍄', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.shrooms >= 3; } },
        { id: 'sn_magnet', game: 'snake', name: 'Aspiradora', desc: 'Atrae 6 frutas con el Imán 🧲 en una partida.', icon: '🧲', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.magnetEats >= 6; } },
        { id: 'sn_bomb', game: 'snake', name: 'Voladura', desc: 'Destruye 5 rocas con Bombas 💣 en una partida.', icon: '💣', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.rocksBombed >= 5; } },
        { id: 'sn_arsenal', game: 'snake', name: 'Arsenal', desc: 'Usa 5 poderes distintos en una partida.', icon: '⚡', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.kinds >= 5; } },
        { id: 'sn_kill', game: 'snake', name: 'Depredador', desc: 'Elimina a una serpiente rival.', icon: '🦅', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.kills >= 1; } },
        { id: 'sn_kill5', game: 'snake', name: 'Rey de la jungla', desc: 'Elimina a 5 rivales en una partida.', icon: '👑', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.extra.kills >= 5; } },
        { id: 'sn_zone', game: 'snake', name: 'Piel de lava', desc: 'Aguanta 90 s en el modo Zona.', icon: '🔥', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.mode === 'zone' && e.extra.time >= 90; } },
        { id: 'sn_zone_max', game: 'snake', name: 'Último refugio', desc: 'Sobrevive hasta que la arena sea mínima.', icon: '🏝️', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.mode === 'zone' && e.extra.zoneLevel >= 9; } },
        { id: 'sn_classic', game: 'snake', name: 'Purista', desc: 'Consigue 300 puntos en el modo Clásico.', icon: '🟢', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.mode === 'classic' && e.score >= 300; } },
        { id: 'sn_score2k', game: 'snake', name: 'Neón brillante', desc: 'Consigue 2.000 puntos en una partida.', icon: '💎', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.score >= 2000; } },
        { id: 'sn_score6k', game: 'snake', name: 'Leyenda reptante', desc: 'Consigue 6.000 puntos en una partida.', icon: '🏆', rarity: 'legendary',
            test: (c) => { const e = ev(c); return !!e && e.score >= 6000; } },
        { id: 'sn_apples500', game: 'snake', name: 'Glotón', desc: 'Come 500 frutas en total.', icon: '🍎', rarity: 'rare',
            ...A.counter((c) => (sn(c).extra.totalApples || 0), 500) }
    ]);

    Nexus.games.registry.register({
        id: 'snake', name: 'Snake Neón', emoji: '🐍', accent: '#22c55e',
        tagline: 'Turbo · Salto · Portales · Rivales',
        description: 'Snake con energía para el Turbo y el Salto, frutas con poderes, portales, rocas, serpientes rivales con IA y un modo de lava que se encoge.',
        tags: ['Arcade', 'Acción'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'score', label: 'Puntuación' }],
        mount: (root) => new SnakeGame(root)
    });
})();
