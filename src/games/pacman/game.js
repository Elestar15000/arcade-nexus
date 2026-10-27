/* ============================================================
   NEXUS ARCADE · games/pacman/game.js
   Pac-Man Nexus: el clásico laberinto con
     · 8 tipos de enemigos, cada uno con su propia IA y habilidad
       (Cazador, Emboscador, Flanqueador, Errático, Espectro,
        Saltarín, Sombra y Blindado);
     · 7 poderes que aparecen en el mapa y se guardan en 2 ranuras
       (Turbo, Imán, Fase, Hielo, Escudo, Onda y Salto);
     · 3 modos: Clásico (4 fantasmas, sin poderes), Nexus (los enemigos
       nuevos llegan nivel a nivel) y Horda (todos desde el principio).
   Movimiento por casillas con interpolación suave; la lógica de IA
   usa los objetivos clásicos (Blinky, Pinky, Inky, Clyde).
   ============================================================ */
(function () {
    'use strict';

    const { esc, clamp, formatNumber } = Nexus.util;
    const Kit = Nexus.games.kit;

    // ── Laberintos (19 × 21) ────────────────────────────────
    // # pared · . pastilla · o píldora de poder · ' ' vacío · P inicio · G casa de fantasmas · - puerta
    const MAZE_A = [
        '###################',
        '#........#........#',
        '#o##.###.#.###.##o#',
        '#.................#',
        '#.##.#.#####.#.##.#',
        '#....#...#...#....#',
        '####.###.#.###.####',
        '####.#.......#.####',
        '####.#.##-##.#.####',
        '    . .#GGG#. .    ',
        '####.#.#####.#.####',
        '####.#.......#.####',
        '####.###.#.###.####',
        '#........#........#',
        '#.##.###.#.###.##.#',
        '#o.#.....P.....#.o#',
        '##.#.#.#####.#.#.##',
        '#....#...#...#....#',
        '#.######.#.######.#',
        '#.................#',
        '###################'
    ];
    const MAZE_B = MAZE_A.slice();
    MAZE_B[2] = '#o.##.##.#.##.##.o#';
    MAZE_B[4] = '#.#..#.#####.#..#.#';
    MAZE_B[6] = '###..###.#.###..###';
    MAZE_B[12] = '###..###.#.###..###';
    MAZE_B[14] = '#.#..###.#.###..#.#';
    const MAZES = [MAZE_A, MAZE_B];
    const THEMES = ['#3b82f6', '#a855f7', '#10b981', '#f43f5e', '#f59e0b'];

    const W = 19, H = 21, T = 24;
    const EXIT = { x: 9, y: 7 };       // casilla justo encima de la puerta
    const HOME = { x: 9, y: 9 };       // centro de la casa
    const SLOTS = [{ x: 8, y: 9 }, { x: 10, y: 9 }, { x: 9, y: 9 }];
    const DIRS = { up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, down: { x: 0, y: 1 }, right: { x: 1, y: 0 } };
    const DIR_LIST = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];   // orden de desempate clásico

    // ── Enemigos ────────────────────────────────────────────
    const GHOSTS = {
        blinky:  { name: 'Cazador',     color: '#ff4d4d', corner: [17, 0],  desc: 'Te persigue sin rodeos y se acelera cuando quedan pocas pastillas.' },
        pinky:   { name: 'Emboscador',  color: '#ff9ff3', corner: [1, 0],   desc: 'Apunta 4 casillas por delante de ti para cortarte el paso.' },
        inky:    { name: 'Flanqueador', color: '#22d3ee', corner: [17, 20], desc: 'Usa la posición del Cazador para cerrarte el cerco por el otro lado.' },
        clyde:   { name: 'Errático',    color: '#fb923c', corner: [1, 20],  desc: 'Te persigue de lejos, pero huye a su rincón cuando está cerca.' },
        specter: { name: 'Espectro',    color: '#c4b5fd', corner: [9, 0],   desc: 'Se vuelve casi invisible a ratos, pero sigue siendo letal.' },
        jumper:  { name: 'Saltarín',    color: '#4ade80', corner: [9, 20],  desc: 'Cada pocos segundos se teletransporta cerca de ti (avisa con un aro).' },
        shadow:  { name: 'Sombra',      color: '#94a3b8', corner: [0, 10],  desc: 'No te persigue: recorre tu rastro con unos segundos de retraso.' },
        brute:   { name: 'Blindado',    color: '#b45309', corner: [18, 10], desc: 'Más lento, pero inmune a las píldoras de poder. Sólo Hielo y Onda lo frenan.' }
    };
    const ORDER = ['blinky', 'pinky', 'inky', 'clyde', 'specter', 'jumper', 'shadow', 'brute'];

    // ── Poderes ─────────────────────────────────────────────
    const POWERS = {
        turbo:  { icon: '⚡', name: 'Turbo',  weight: 18, dur: 5,  desc: 'Velocidad ×1,45 durante 5 s.' },
        magnet: { icon: '🧲', name: 'Imán',   weight: 14, dur: 7,  desc: 'Recoge las pastillas a tu alrededor (radio 3) durante 7 s.' },
        phase:  { icon: '👻', name: 'Fase',   weight: 14, dur: 5,  desc: 'Atraviesas a los enemigos sin daño durante 5 s.' },
        freeze: { icon: '❄️', name: 'Hielo',  weight: 16, dur: 5,  desc: 'Congela a todos los enemigos 5 s (inofensivos mientras tanto).' },
        shield: { icon: '🛡️', name: 'Escudo', weight: 16, dur: 15, desc: 'Absorbe un golpe (caduca a los 15 s).' },
        shock:  { icon: '💥', name: 'Onda',   weight: 12, dur: 4,  desc: 'Aturde 4 s a los enemigos en un radio de 5 casillas.' },
        warp:   { icon: '🌀', name: 'Salto',  weight: 10, dur: 0,  desc: 'Te teletransporta al punto más seguro del laberinto.' }
    };

    const MODES = [
        { id: 'classic', emoji: '🟡', label: 'Clásico', desc: '4 fantasmas, sin poderes. La receta de siempre.', lives: 3, items: 0 },
        { id: 'nexus',   emoji: '🔮', label: 'Nexus',   desc: 'Poderes en el mapa y enemigos nuevos cada nivel.', lives: 3, items: 13 },
        { id: 'horde',   emoji: '👹', label: 'Horda',   desc: 'Los 8 enemigos desde el nivel 1. Muchos poderes, 5 vidas.', lives: 5, items: 8, ghostMul: 0.94 }
    ];

    const EXTRA_LIFE = 10000;

    const wrapX = (x) => ((x % W) + W) % W;
    const same = (a, b) => a.x === b.x && a.y === b.y;

    class PacmanGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.mode = MODES.find(m => m.id === Nexus.services.settings.get('pacman.defaultMode')) || MODES[1];
            this.state = 'menu';
            this.t = 0;
            this.particles = []; this.floaters = [];
            this.build();
            this.initRun();
            this.loadLevel(1, true);
            this.bind();
            this.loop = Kit.loop((dt) => this.update(dt), () => this.draw(), () => { if (this.state === 'playing') this.pause(); });
            this.loop.start();
            this.showMenu();
            this.unsubProgress = Nexus.bus.on('progress:update', () => this.updateRecords());
            this.updateRecords();
        }

        // ── Plantilla ───────────────────────────────────────
        build() {
            this.root.innerHTML = `
            <div class="game ax-game pacman" style="--ax-accent:#facc15">
                ${Kit.header({ emoji: '🟡', title: 'Pac-Man Nexus', pills: [
                    { id: 'score', icon: '💎', init: '0', title: 'Puntos' },
                    { id: 'lives', icon: '❤️', init: '3', title: 'Vidas' },
                    { id: 'level', icon: '🏁', init: '1', title: 'Nivel' }] })}
                <div class="ax-body">
                    <div class="ax-stage-wrap" id="pm-wrap">
                        <div class="ax-stage" id="pm-stage">
                            <canvas id="pm-canvas" aria-label="Laberinto de Pac-Man Nexus"></canvas>
                            <div class="ax-toast" id="pm-toast" role="status"></div>
                        </div>
                        <div class="ax-overlay" id="pm-overlay"></div>
                    </div>
                    <aside class="ax-side">
                        <div class="ax-card">
                            <h3>⚡ Poderes <span class="pm-keys">Espacio · 1 · 2</span></h3>
                            <div class="pm-slots" id="pm-slots"></div>
                            <div class="ax-chips" id="pm-effects"></div>
                        </div>
                        <div class="ax-card">
                            <h3>👾 Enemigos de este nivel</h3>
                            <div class="pm-bestiary" id="pm-bestiary"></div>
                        </div>
                        <div class="ax-card">
                            <h3>Partida</h3>
                            <div class="ax-rows">
                                <div class="ax-row"><span>Pastillas</span><b id="pm-left">0</b></div>
                                <div class="ax-row"><span>Fantasmas comidos</span><b id="pm-eaten">0</b></div>
                                <div class="ax-row"><span>Poderes usados</span><b id="pm-used">0</b></div>
                                <div class="ax-row"><span>Mejor (modo)</span><b id="pm-best">0</b></div>
                            </div>
                        </div>
                    </aside>
                </div>
                <div class="ax-touch pm-touch" id="pm-touch">
                    <div class="ax-pad">
                        <button type="button" class="up" data-act="up" aria-label="Arriba">▲</button>
                        <button type="button" class="left" data-act="left" aria-label="Izquierda">◀</button>
                        <button type="button" class="down-b" data-act="down" aria-label="Abajo">▼</button>
                        <button type="button" class="right" data-act="right" aria-label="Derecha">▶</button>
                    </div>
                    <button type="button" data-act="p0" id="pm-t0" aria-label="Poder 1">—</button>
                    <button type="button" data-act="p1" id="pm-t1" aria-label="Poder 2">—</button>
                </div>
            </div>`;
            this.$ = (s) => this.root.querySelector(s);
            this.canvas = this.$('#pm-canvas');
            this.stage = this.$('#pm-stage');
            this.overlay = this.$('#pm-overlay');
            this.fit = Kit.canvas(this.canvas, this.$('#pm-wrap'), this.stage, W * T, H * T);
            this.ctx = this.fit.ctx;
        }

        // ── Estado ──────────────────────────────────────────
        initRun() {
            this.score = 0; this.lives = this.mode.lives; this.level = 1;
            this.nextLife = EXTRA_LIFE;
            this.slots = [null, null];
            this.stats = { eaten: 0, maxChain: 0, powersUsed: 0, kinds: {}, pellets: 0, shieldSaves: 0, flawless: 0, level: 1, items: 0 };
            this.time = 0;
        }

        newGame(modeId) {
            if (modeId) this.mode = MODES.find(m => m.id === modeId) || this.mode;
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.initRun();
            this.loadLevel(1, false);
            this.overlay.hidden = true;
            this.updateAll();
        }

        rosterFor(level) {
            if (this.mode.id === 'classic') return ORDER.slice(0, 4);
            if (this.mode.id === 'horde') return ORDER.slice();
            return ORDER.slice(0, Math.min(ORDER.length, 1 + level));
        }

        loadLevel(level, quiet) {
            this.level = level;
            this.stats.level = Math.max(this.stats.level, level);
            this.mazeIdx = (level - 1) % MAZES.length;
            this.theme = THEMES[(level - 1) % THEMES.length];
            const rows = MAZES[this.mazeIdx];
            this.cells = rows.map(r => r.split(''));
            this.pelletsLeft = 0;
            for (const r of this.cells) for (const c of r) if (c === '.' || c === 'o') this.pelletsLeft++;
            this.pelletsTotal = this.pelletsLeft;
            this.bfs = this.bfsFor(rows);
            this.wallImg = this.renderWalls(rows, this.theme);
            this.items = [];
            this.itemTimer = 5;
            this.lostLife = false;
            this.pellets = 0;
            this.modeIdx = 0; this.modeT = 0;
            const prev = this.roster || [];
            this.roster = this.rosterFor(level);
            this.resetActors(true);
            this.updateBestiary();
            const fresh = this.roster.filter(id => !prev.includes(id));
            if (!quiet && level > 1 && fresh.length && this.mode.id === 'nexus') this.toast(`⚠️ Nuevo enemigo: ${GHOSTS[fresh[0]].name}`);
            this.state = quiet ? 'menu' : 'ready';
            this.readyT = 2.2;
            this.updateAll();
        }

        resetActors(full) {
            // Pac-Man
            let start = { x: 9, y: 15 };
            this.pac = { tx: start.x, ty: start.y, dx: 0, dy: 0, p: 0, want: null, face: DIRS.left, mouth: 0,
                turbo: 0, magnet: 0, phase: 0, shield: 0, invuln: 0, dead: 0 };
            this.hist = [];
            this.chain = 0;
            // Fantasmas
            const gap = Math.max(0.9, 2.4 - this.level * 0.12);
            this.ghosts = this.roster.map((id, i) => {
                const g = { id, i, tx: 9, ty: 7, dx: -1, dy: 0, p: 0, state: 'normal', fright: 0, stun: 0, slot: SLOTS[(i - 1) % 3], release: 0,
                    tp: 6 + Math.random() * 3, tele: 0, dest: null, cycle: Math.random() * 6, wob: Math.random() * 6 };
                if (i > 0) {
                    g.state = 'house'; g.tx = g.slot.x; g.ty = g.slot.y; g.dx = 0; g.dy = 0;
                    g.release = 1.2 + (i - 1) * gap;
                }
                return g;
            });
            if (!full) { /* tras morir se conservan las pastillas y los objetos */ }
        }

        // ── Utilidades de mapa ──────────────────────────────
        ch(x, y) { if (y < 0 || y >= H) return '#'; return this.cells[y][wrapX(x)]; }
        walkPac(x, y) { const c = this.ch(x, y); return c !== '#' && c !== 'G' && c !== '-'; }
        walkGhost(g, x, y) {
            const c = this.ch(x, y);
            if (c === '#') return false;
            if (c === 'G' || c === '-') return g.state === 'leaving' || g.state === 'eyes' || g.state === 'house';
            return true;
        }

        bfsFor(rows) {
            const mk = (sx, sy) => {
                const d = Array.from({ length: H }, () => new Array(W).fill(Infinity));
                d[sy][sx] = 0;
                const q = [[sx, sy]];
                while (q.length) {
                    const [x, y] = q.shift();
                    for (const v of DIR_LIST) {
                        const nx = wrapX(x + v.x), ny = y + v.y;
                        if (ny < 0 || ny >= H || rows[ny][nx] === '#') continue;
                        if (d[ny][nx] > d[y][x] + 1) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); }
                    }
                }
                return d;
            };
            return { toExit: mk(EXIT.x, EXIT.y), toHome: mk(HOME.x, HOME.y) };
        }

        renderWalls(rows, color) {
            const key = this.mazeIdx + color;
            this._wallCache = this._wallCache || {};
            if (this._wallCache[key]) return this._wallCache[key];
            const S = 3, off = document.createElement('canvas');
            off.width = W * T * S; off.height = H * T * S;
            const c = off.getContext('2d');
            c.scale(S, S);
            const wall = (x, y) => y >= 0 && y < H && x >= 0 && x < W && rows[y][x] === '#';
            const open = (x, y) => y >= 0 && y < H && x >= 0 && x < W && rows[y][x] !== '#';
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                if (!wall(x, y)) continue;
                let adj = false;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (open(x + dx, y + dy)) adj = true;
                if (adj) { c.fillStyle = Kit.rgba(color, 0.13); c.fillRect(x * T, y * T, T, T); }
            }
            c.lineCap = 'round'; c.lineWidth = 2.2; c.strokeStyle = color; c.shadowColor = color; c.shadowBlur = 7;
            c.beginPath();
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                if (!wall(x, y)) continue;
                const X = x * T, Y = y * T;
                if (open(x, y - 1)) { c.moveTo(X, Y); c.lineTo(X + T, Y); }
                if (open(x, y + 1)) { c.moveTo(X, Y + T); c.lineTo(X + T, Y + T); }
                if (open(x - 1, y)) { c.moveTo(X, Y); c.lineTo(X, Y + T); }
                if (open(x + 1, y)) { c.moveTo(X + T, Y); c.lineTo(X + T, Y + T); }
            }
            c.stroke();
            c.strokeStyle = '#f9a8d4'; c.shadowColor = '#f9a8d4'; c.lineWidth = 3;
            c.beginPath();
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (rows[y][x] === '-') { c.moveTo(x * T + 2, y * T + T / 2); c.lineTo(x * T + T - 2, y * T + T / 2); }
            c.stroke();
            this._wallCache[key] = off;
            return off;
        }

        // ── Movimiento genérico por casillas ────────────────
        pos(e) {
            let x = e.tx + e.dx * e.p, y = e.ty + e.dy * e.p;
            return { x, y };
        }
        flip(e) {
            if (e.dx === 0 && e.dy === 0) return;
            if (e.p > 0) { e.tx = wrapX(e.tx + e.dx); e.ty += e.dy; e.p = 1 - e.p; }
            e.dx = -e.dx; e.dy = -e.dy;
        }
        advance(e, dist, pick, arrive) {
            let guard = 0;
            while (dist > 1e-6 && guard++ < 10) {
                if (e.dx === 0 && e.dy === 0) {
                    const d = pick(e);
                    if (!d) return;
                    e.dx = d.x; e.dy = d.y; e.p = 0;
                }
                const remain = 1 - e.p;
                if (dist < remain) { e.p += dist; return; }
                dist -= remain;
                e.tx = wrapX(e.tx + e.dx); e.ty += e.dy; e.p = 0;
                if (arrive) arrive(e);
                if (e.noMove) return;
                const d = pick(e);
                if (!d) { e.dx = 0; e.dy = 0; return; }
                e.dx = d.x; e.dy = d.y;
            }
        }

        // ── Pac-Man ─────────────────────────────────────────
        pacPick(e) {
            if (e.want && this.walkPac(e.tx + e.want.x, e.ty + e.want.y)) { e.face = e.want; return e.want; }
            if ((e.dx || e.dy) && this.walkPac(e.tx + e.dx, e.ty + e.dy)) return { x: e.dx, y: e.dy };
            return null;
        }
        pacArrive(e) {
            this.hist.push({ x: e.tx, y: e.ty });
            if (this.hist.length > 60) this.hist.shift();
            this.eatAt(e.tx, e.ty);
            this.pickItem(e.tx, e.ty);
        }
        pacSpeed() {
            let s = 7.3;
            if (this.pac.turbo > 0) s *= 1.45;
            return s;
        }

        eatAt(x, y) {
            const c = this.ch(x, y);
            if (c !== '.' && c !== 'o') return;
            this.cells[y][wrapX(x)] = ' ';
            this.pelletsLeft--;
            this.stats.pellets++;
            if (c === '.') { this.addScore(10); this.chompN = (this.chompN || 0) + 1; if (this.chompN % 2) Nexus.audio.play('axChomp', this.chompN); }
            else {
                this.addScore(50);
                this.chain = 0;
                Nexus.audio.play('axPower');
                const dur = Math.max(2, 7 - 0.6 * (this.level - 1)) * (this.mode.id === 'horde' ? 0.8 : 1);
                for (const g of this.ghosts) {
                    if (g.id === 'brute' || g.state === 'eyes') continue;
                    g.fright = dur;
                    if (g.state === 'normal') this.flip(g);
                }
                this.burst(x, y, '#fde047', 14);
            }
            if (this.pelletsLeft <= 0) this.levelClear();
        }

        addScore(n) {
            this.score += n;
            if (this.score >= this.nextLife) {
                this.nextLife += EXTRA_LIFE; this.lives++;
                this.pop('❤️ ¡Vida extra!', '#fb7185');
                Nexus.audio.play('achievement');
            }
        }

        // ── Poderes ─────────────────────────────────────────
        pickPowerKind() {
            const total = Object.values(POWERS).reduce((s, p) => s + p.weight, 0);
            let x = Math.random() * total;
            for (const [k, p] of Object.entries(POWERS)) if ((x -= p.weight) < 0) return k;
            return 'turbo';
        }
        spawnItem() {
            const pp = this.pacPos();
            const tiles = [];
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const c = this.cells[y][x];
                if (c === '#' || c === 'G' || c === '-') continue;
                if (Math.abs(x - pp.x) + Math.abs(y - pp.y) < 6) continue;
                if (this.items.some(it => it.tx === x && it.ty === y)) continue;
                tiles.push([x, y]);
            }
            if (!tiles.length) return;
            const [x, y] = Nexus.util.pick(tiles);
            this.items.push({ tx: x, ty: y, kind: this.pickPowerKind(), life: 13 });
        }
        pickItem(x, y) {
            const i = this.items.findIndex(it => it.tx === x && it.ty === y);
            if (i < 0) return;
            const it = this.items.splice(i, 1)[0];
            this.addScore(100);
            this.stats.items++;
            Nexus.audio.play('axPickup');
            const free = this.slots.indexOf(null);
            if (free >= 0) { this.slots[free] = it.kind; this.pop(`${POWERS[it.kind].icon} ${POWERS[it.kind].name}`, '#fde047'); }
            else { this.pop(`${POWERS[it.kind].icon} ${POWERS[it.kind].name} (al instante)`, '#fde047'); this.applyPower(it.kind); }
            this.updateSlots();
        }
        usePower(i) {
            if (this.state !== 'playing') return;
            const kind = this.slots[i];
            if (!kind) return;
            this.slots[i] = null;
            this.applyPower(kind);
            this.updateSlots();
        }
        applyPower(kind) {
            const pac = this.pac, P = POWERS[kind];
            this.stats.powersUsed++;
            this.stats.kinds[kind] = true;
            const pp = this.pacPos();
            Nexus.audio.play(kind === 'warp' ? 'axJump' : 'axPower');
            if (kind === 'turbo') pac.turbo = P.dur;
            else if (kind === 'magnet') pac.magnet = P.dur;
            else if (kind === 'phase') pac.phase = P.dur;
            else if (kind === 'shield') pac.shield = P.dur;
            else if (kind === 'freeze') { for (const g of this.ghosts) if (g.state !== 'eyes') g.stun = Math.max(g.stun, P.dur); this.burst(pp.x, pp.y, '#7dd3fc', 22); }
            else if (kind === 'shock') {
                for (const g of this.ghosts) {
                    const gp = this.pos(g);
                    if (g.state !== 'eyes' && Math.hypot(gp.x - pp.x, gp.y - pp.y) <= 5) { g.stun = Math.max(g.stun, P.dur); this.burst(gp.x, gp.y, '#fde047', 8); }
                }
                this.ring = { x: pp.x, y: pp.y, t: 0 };
            } else if (kind === 'warp') {
                const cand = [];
                for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                    if (!this.walkPac(x, y)) continue;
                    let m = Infinity;
                    for (const g of this.ghosts) { if (g.state === 'house') continue; const gp = this.pos(g); m = Math.min(m, Math.abs(gp.x - x) + Math.abs(gp.y - y)); }
                    cand.push({ x, y, m: m === Infinity ? 99 : m, d: Math.abs(pp.x - x) + Math.abs(pp.y - y) });
                }
                cand.sort((a, b) => b.m - a.m);
                const top = cand.slice(0, 6).filter(c => c.d > 4);
                const c = Nexus.util.pick(top.length ? top : cand.slice(0, 6));
                this.burst(pp.x, pp.y, '#a78bfa', 16);
                pac.tx = c.x; pac.ty = c.y; pac.dx = 0; pac.dy = 0; pac.p = 0; pac.invuln = 0.6;
                this.burst(c.x, c.y, '#a78bfa', 16);
                this.eatAt(c.x, c.y); this.pickItem(c.x, c.y);
            }
            this.pop(`${P.icon} ${P.name}`, '#fff');
            this.updateAll();
        }

        // ── Fantasmas ───────────────────────────────────────
        pacPos() { return this.pos(this.pac); }
        pacTile() { const p = this.pacPos(); return { x: Math.round(p.x), y: Math.round(p.y) }; }

        ghostBase() {
            return Math.min(8.2, 6.5 + 0.18 * (this.level - 1)) * (this.mode.ghostMul || 1);
        }
        ghostSpeed(g) {
            if (g.stun > 0) return 0;
            if (g.state === 'eyes') return 14;
            if (g.state === 'leaving') return 5.2;
            if (g.fright > 0) return 3.7;
            let s = this.ghostBase();
            if (g.id === 'brute') s *= 0.86;
            if (g.id === 'blinky') { if (this.pelletsLeft < 12) s *= 1.14; else if (this.pelletsLeft < 28) s *= 1.07; }
            if (g.ty === 9 && (g.tx < 4 || g.tx > 14)) s *= 0.55;      // túnel
            return s;
        }

        targetFor(g) {
            const pt = this.pacTile(), pac = this.pac;
            const face = (pac.dx || pac.dy) ? { x: pac.dx, y: pac.dy } : pac.face;
            const scatter = this.scatterNow();
            if (scatter) return { x: GHOSTS[g.id].corner[0], y: GHOSTS[g.id].corner[1] };
            switch (g.id) {
                case 'pinky': return { x: pt.x + face.x * 4, y: pt.y + face.y * 4 };
                case 'inky': {
                    const b = this.ghosts.find(o => o.id === 'blinky') || g;
                    const bp = this.pos(b);
                    const piv = { x: pt.x + face.x * 2, y: pt.y + face.y * 2 };
                    return { x: piv.x * 2 - bp.x, y: piv.y * 2 - bp.y };
                }
                case 'clyde': {
                    const gp = this.pos(g);
                    return Math.hypot(gp.x - pt.x, gp.y - pt.y) > 8 ? pt : { x: GHOSTS.clyde.corner[0], y: GHOSTS.clyde.corner[1] };
                }
                case 'shadow': {
                    const gp = this.pos(g);
                    if (Math.hypot(gp.x - pt.x, gp.y - pt.y) < 2.6 || this.hist.length < 6) return pt;
                    return this.hist[Math.max(0, this.hist.length - 1 - 11)];
                }
                default: return pt;
            }
        }

        scatterNow() {
            if (this.mode.id === 'horde' && this.level > 1) return false;
            const sc = Math.max(2, 7 - 0.5 * (this.level - 1));
            const seq = [sc, 20, sc, 20, Math.max(2, sc - 2), 20, Math.max(2, sc - 2), Infinity];
            return this.modeIdx % 2 === 0 && this.modeIdx < seq.length;
        }
        modeDur() {
            const sc = Math.max(2, 7 - 0.5 * (this.level - 1));
            const seq = [sc, 20, sc, 20, Math.max(2, sc - 2), 20, Math.max(2, sc - 2), Infinity];
            return seq[Math.min(this.modeIdx, seq.length - 1)];
        }

        ghostPick(g) {
            const cur = { x: g.dx, y: g.dy };
            const rev = (g.dx || g.dy) ? { x: -g.dx, y: -g.dy } : null;
            let cands = DIR_LIST.filter(d => this.walkGhost(g, g.tx + d.x, g.ty + d.y) && !(rev && d.x === rev.x && d.y === rev.y));
            if (!cands.length) cands = DIR_LIST.filter(d => this.walkGhost(g, g.tx + d.x, g.ty + d.y));
            if (!cands.length) return null;
            void cur;
            if (g.state === 'eyes' || g.state === 'leaving') {
                const map = g.state === 'eyes' ? this.bfs.toHome : this.bfs.toExit;
                let best = null, bd = Infinity;
                for (const d of DIR_LIST) {
                    const nx = wrapX(g.tx + d.x), ny = g.ty + d.y;
                    if (!this.walkGhost(g, nx, ny)) continue;
                    if (map[ny][nx] < bd) { bd = map[ny][nx]; best = d; }
                }
                return best;
            }
            if (g.fright > 0 && g.id !== 'brute') return Nexus.util.pick(cands);
            const tgt = this.targetFor(g);
            let best = cands[0], bd = Infinity;
            for (const d of cands) {
                const nx = g.tx + d.x, ny = g.ty + d.y;
                const dd = (nx - tgt.x) ** 2 + (ny - tgt.y) ** 2;
                if (dd < bd - 1e-9) { bd = dd; best = d; }
            }
            return best;
        }

        ghostArrive(g) {
            if (g.state === 'eyes' && g.tx === HOME.x && g.ty === HOME.y) {
                g.state = 'leaving'; g.fright = 0;
                return;
            }
            if (g.state === 'leaving' && g.tx === EXIT.x && g.ty === EXIT.y) {
                g.state = 'normal';
                g.dx = Math.random() < 0.5 ? -1 : 1; g.dy = 0; g.p = 0;
            }
        }

        updateGhost(g, dt) {
            g.wob += dt;
            if (g.stun > 0) g.stun = Math.max(0, g.stun - dt);
            if (g.fright > 0 && g.state !== 'eyes') { g.fright = Math.max(0, g.fright - dt); }
            if (g.state === 'house') {
                g.release -= dt;
                if (g.release <= 0) { g.state = 'leaving'; g.dx = 0; g.dy = 0; g.p = 0; }
                return;
            }
            if (g.stun > 0) return;
            // Habilidades
            if (g.id === 'jumper' && g.state === 'normal') {
                if (g.tele > 0) {
                    g.tele -= dt;
                    if (g.tele <= 0 && g.dest) {
                        this.burst(g.tx, g.ty, GHOSTS.jumper.color, 10);
                        g.tx = g.dest.x; g.ty = g.dest.y; g.dx = 0; g.dy = 0; g.p = 0; g.dest = null;
                        this.burst(g.tx, g.ty, GHOSTS.jumper.color, 10);
                        g.tp = Math.max(4, 8 - this.level * 0.3) + Math.random() * 2;
                    }
                    return;                       // se queda quieto mientras carga el salto
                }
                g.tp -= dt;
                if (g.tp <= 0) {
                    const pt = this.pacTile(), tiles = [];
                    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                        const c = this.cells[y][x];
                        if (c === '#' || c === 'G' || c === '-') continue;
                        const d = Math.abs(x - pt.x) + Math.abs(y - pt.y);
                        if (d >= 5 && d <= 10) tiles.push({ x, y });
                    }
                    if (tiles.length) { g.dest = Nexus.util.pick(tiles); g.tele = 0.95; Nexus.audio.play('axWarn'); }
                    else g.tp = 2;
                }
            }
            const modeSpeed = this.ghostSpeed(g);
            if (modeSpeed > 0) this.advance(g, modeSpeed * dt, (e) => this.ghostPick(e), (e) => this.ghostArrive(e));
        }

        ghostVisible(g) {
            if (g.id !== 'specter' || g.state === 'eyes') return 1;
            const k = (this.t + g.cycle) % 6;
            if (k < 3.3) return 1;
            if (k < 3.7) return 1 - (k - 3.3) / 0.4 * 0.88;
            if (k < 5.4) return 0.12;
            return 0.12 + (k - 5.4) / 0.6 * 0.88;
        }

        // ── Bucle ───────────────────────────────────────────
        update(dt) {
            this.t += dt;
            for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
            this.particles = this.particles.filter(p => p.life > 0);
            for (const f of this.floaters) { f.y -= 20 * dt; f.life -= dt; }
            this.floaters = this.floaters.filter(f => f.life > 0);
            if (this.ring) { this.ring.t += dt; if (this.ring.t > 0.6) this.ring = null; }
            if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.$('#pm-toast').classList.remove('show');

            if (this.state === 'ready') {
                this.readyT -= dt;
                if (this.readyT <= 0) this.state = 'playing';
                return;
            }
            if (this.state === 'dying') {
                this.pac.dead += dt;
                if (this.pac.dead > 1.5) this.afterDeath();
                return;
            }
            if (this.state === 'clear') {
                this.clearT -= dt;
                if (this.clearT <= 0) this.nextLevel();
                return;
            }
            if (this.state !== 'playing') return;

            this.time += dt;
            const pac = this.pac;
            for (const k of ['turbo', 'magnet', 'phase', 'shield', 'invuln']) if (pac[k] > 0) pac[k] = Math.max(0, pac[k] - dt);
            this._ft = (this._ft || 0) + dt;
            if (this._ft > 0.2) { this._ft = 0; this.updateEffects(); }

            // Alternancia dispersión / persecución
            this.modeT += dt;
            if (this.modeT >= this.modeDur()) {
                this.modeT = 0; this.modeIdx++;
                for (const g of this.ghosts) if (g.state === 'normal' && g.fright <= 0) this.flip(g);
            }

            // Pac-Man: giro inmediato de 180º y avance
            if (pac.want && (pac.dx || pac.dy) && pac.want.x === -pac.dx && pac.want.y === -pac.dy && pac.p > 0) { this.flip(pac); pac.face = pac.want; }
            const moving = pac.dx || pac.dy;
            this.advance(pac, this.pacSpeed() * dt, (e) => this.pacPick(e), (e) => this.pacArrive(e));
            if (moving || pac.dx || pac.dy) pac.mouth += dt * 14;
            if (this.state !== 'playing') return;           // pudo terminar el nivel
            if (pac.dx || pac.dy) pac.face = { x: pac.dx, y: pac.dy };

            // Imán
            if (pac.magnet > 0) {
                const pp = this.pacPos();
                for (let y = Math.floor(pp.y - 3); y <= Math.ceil(pp.y + 3); y++) for (let x = Math.floor(pp.x - 3); x <= Math.ceil(pp.x + 3); x++) {
                    if (Math.hypot(x - pp.x, y - pp.y) <= 3.05) this.eatAt(x, y);
                }
                if (this.state !== 'playing') return;
            }

            // Objetos
            if (this.mode.items) {
                this.itemTimer -= dt;
                if (this.itemTimer <= 0 && this.items.length < 2) { this.spawnItem(); this.itemTimer = this.mode.items * (0.7 + Math.random() * 0.6); }
                for (const it of this.items) it.life -= dt;
                this.items = this.items.filter(it => it.life > 0);
            }

            // Fantasmas
            for (const g of this.ghosts) this.updateGhost(g, dt);
            this.collide();
        }

        collide() {
            const pac = this.pac, pp = this.pacPos();
            for (const g of this.ghosts) {
                if (g.state === 'house' || g.state === 'eyes') continue;
                const gp = this.pos(g);
                if (Math.hypot(gp.x - pp.x, gp.y - pp.y) > 0.62) continue;
                if (g.fright > 0 && g.id !== 'brute') { this.eatGhost(g); continue; }
                if (g.stun > 0 || pac.phase > 0 || pac.invuln > 0) continue;
                if (pac.shield > 0) {
                    pac.shield = 0; pac.invuln = 1.6; g.stun = Math.max(g.stun, 2.5);
                    this.stats.shieldSaves++;
                    this.burst(pp.x, pp.y, '#67e8f9', 18);
                    this.pop('🛡️ ¡Bloqueado!', '#67e8f9');
                    Nexus.audio.play('axPower');
                    continue;
                }
                this.die();
                return;
            }
        }

        eatGhost(g) {
            this.chain++;
            this.stats.eaten++;
            this.stats.maxChain = Math.max(this.stats.maxChain, this.chain);
            const pts = 200 * Math.pow(2, Math.min(this.chain - 1, 3));
            this.addScore(pts);
            const gp = this.pos(g);
            this.floaters.push({ text: String(pts), color: '#67e8f9', x: gp.x * T + T / 2, y: gp.y * T + T / 2, life: 1 });
            this.burst(gp.x, gp.y, GHOSTS[g.id].color, 14);
            g.state = 'eyes'; g.fright = 0; g.stun = 0;
            Nexus.audio.play('axEatGhost');
            this.updateSide();
        }

        die() {
            this.state = 'dying';
            this.pac.dead = 0;
            this.lostLife = true;
            Nexus.audio.play('axDie');
            this.updateAll();
        }

        afterDeath() {
            this.lives--;
            if (this.lives <= 0) { this.lives = 0; this.gameOver(); return; }
            this.slots = this.slots.slice();
            this.resetActors(false);
            this.modeIdx = 0; this.modeT = 0;
            this.state = 'ready'; this.readyT = 1.8;
            this.updateAll();
        }

        levelClear() {
            this.state = 'clear';
            this.clearT = 1.7;
            this.addScore(500 * this.level);
            if (!this.lostLife) { this.stats.flawless++; this.pop('✨ Nivel perfecto', '#fde047'); }
            Nexus.audio.play('win');
        }

        nextLevel() {
            this.loadLevel(this.level + 1, false);
        }

        // ── Entrada ─────────────────────────────────────────
        bind() {
            const blocked = () => this.destroyed || !!document.querySelector('.modal-overlay.active');
            const keymap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
            this.onKeyDown = (e) => {
                if (blocked() || (e.target && /input|textarea|select/i.test(e.target.tagName))) return;
                const k = e.key;
                if (k === 'p' || k === 'P' || k === 'Escape') {
                    if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume();
                    e.preventDefault(); return;
                }
                if (k === 'Enter' && this.state === 'menu') { this.newGame(); e.preventDefault(); return; }
                if (keymap[k]) { this.setDir(keymap[k]); e.preventDefault(); return; }
                if (k === ' ' || k === '1') { this.usePower(0); e.preventDefault(); return; }
                if (k === '2') { this.usePower(1); e.preventDefault(); }
            };
            document.addEventListener('keydown', this.onKeyDown);
            Kit.swipe(this.stage, (d) => { if (d !== 'tap') this.setDir(d); });
            Kit.touchButtons(this.$('#pm-touch'), (a) => {
                if (a === 'p0') this.usePower(0); else if (a === 'p1') this.usePower(1); else this.setDir(a);
            });
            this.$('#pm-slots').addEventListener('click', (e) => {
                const b = e.target.closest('[data-slot]');
                if (b) this.usePower(parseInt(b.dataset.slot, 10));
            });
            this.overlay.addEventListener('click', (e) => {
                const m = e.target.closest('[data-mode]');
                if (m) { this.mode = MODES.find(x => x.id === m.dataset.mode); this.showMenu(); Nexus.audio.play('click'); return; }
                const b = e.target.closest('[data-do]');
                if (!b) return;
                const d = b.dataset.do;
                if (d === 'start' || d === 'restart') this.newGame();
                else if (d === 'resume') this.resume();
                else if (d === 'menu') { this.state = 'menu'; this.initRun(); this.loadLevel(1, true); this.showMenu(); }
            });
        }

        setDir(name) {
            this.pac.want = DIRS[name];
        }

        // ── Pausa / menús / fin ─────────────────────────────
        pause() {
            if (this.state !== 'playing') return;
            this.state = 'paused';
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">PAUSA</h2>
                <div class="ax-play-row">
                    <button class="btn btn-primary" data-do="resume" type="button">▶ Continuar</button>
                    <button class="btn btn-ghost" data-do="restart" type="button">🔄 Reiniciar</button>
                    <button class="btn btn-ghost" data-do="menu" type="button">☰ Menú</button>
                </div></div>`;
        }
        resume() { if (this.state !== 'paused') return; this.state = 'playing'; this.overlay.hidden = true; }

        showMenu() {
            this.overlay.hidden = false;
            const gs = Nexus.services.progress.stats('pacman');
            const ms = gs.byMode[this.mode.id];
            const best = ms ? `Mejor: <b>${formatNumber(ms.bestScore)}</b> pts` : 'Aún sin récord';
            const bestiary = ORDER.map(id => `<li><span class="pm-dot" style="background:${GHOSTS[id].color}"></span><b>${GHOSTS[id].name}</b> — ${GHOSTS[id].desc}</li>`).join('');
            const powers = Object.values(POWERS).map(p => `<li>${p.icon} <b>${p.name}</b> — ${p.desc}</li>`).join('');
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">PAC-MAN NEXUS</h2>
                <p class="ax-sub">Laberinto clásico con poderes y enemigos con personalidad</p>
                ${Kit.modeCards(MODES, this.mode.id)}
                <details class="ax-help"><summary>📖 Controles y reglas</summary><ul>
                    <li><kbd>←↑↓→</kbd> / <kbd>WASD</kbd> mover (o desliza en pantallas táctiles) · <kbd>Espacio</kbd> o <kbd>1</kbd> usa el poder de la ranura 1, <kbd>2</kbd> el de la ranura 2 · <kbd>P</kbd> pausa.</li>
                    <li>Come todas las pastillas. Las píldoras grandes asustan a los fantasmas (menos al Blindado): cómelos en cadena para 200-400-800-1600.</li>
                    <li>Los <b>poderes</b> aparecen en el mapa (modos Nexus y Horda) y se guardan en 2 ranuras; con las dos llenas, el nuevo se activa al instante. Caducan si no los recoges.</li>
                    <li>Vida extra cada 10.000 puntos.</li>
                </ul></details>
                <details class="ax-help"><summary>👾 Bestiario (8 enemigos)</summary><ul>${bestiary}</ul></details>
                <details class="ax-help"><summary>⚡ Poderes (7)</summary><ul>${powers}</ul></details>
                <div class="ax-best">${best}</div>
                <div class="ax-play-row"><button class="btn btn-primary btn-glow" data-do="start" type="button">▶ Jugar · ${esc(this.mode.label)}</button></div>
            </div>`;
        }

        gameOver() {
            if (this.state === 'over') return;
            this.state = 'over';
            Nexus.audio.play('lose');
            const xp = Math.min(600, Math.round(this.score / 20) + this.stats.eaten * 3);
            const kinds = Object.keys(this.stats.kinds).length;
            const result = Nexus.services.progress.recordGame({
                game: 'pacman', mode: this.mode.id, won: false, endless: true, score: this.score, time: Math.round(this.time), xp,
                extra: { ...this.stats, kinds, mode: this.mode.id, level: this.level },
                updateExtra: (x) => {
                    x.totalPellets = (x.totalPellets || 0) + this.stats.pellets;
                    x.totalGhosts = (x.totalGhosts || 0) + this.stats.eaten;
                }
            });
            this.updateAll();
            this.later(() => {
                this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: '🟡', kind: 'lose', title: 'GAME OVER',
                    subtitle: `Llegaste al nivel ${this.level}`,
                    stats: [
                        { label: 'Puntuación', value: formatNumber(this.score) },
                        { label: 'Nivel', value: String(this.level) },
                        { label: 'Fantasmas', value: String(this.stats.eaten) },
                        { label: 'Poderes usados', value: String(this.stats.powersUsed) }
                    ],
                    result,
                    actions: [
                        { label: '🔄 Otra partida', kind: 'primary', onClick: () => { this.later(() => this.newGame(), 50); } },
                        { label: '☰ Cambiar modo', kind: 'ghost', onClick: () => { this.later(() => { this.state = 'menu'; this.initRun(); this.loadLevel(1, true); this.showMenu(); }, 50); } },
                        { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
                    ]
                });
            }, 500);
        }

        // ── Efectos ─────────────────────────────────────────
        burst(tx, ty, color, n) {
            const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 110;
                this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.45, max: 0.8, color, s: 2 + Math.random() * 2.5 });
            }
        }
        pop(text, color) {
            const pp = this.pacPos();
            this.floaters.push({ text, color, x: clamp((pp.x + 0.5) * T, 60, W * T - 60), y: (pp.y - 0.4) * T, life: 1.3 });
            this.toast(text);
        }
        toast(text) { const el = this.$('#pm-toast'); el.textContent = text; el.classList.add('show'); this.toastT = 2; }

        // ── Dibujo ──────────────────────────────────────────
        draw() {
            const ctx = this.ctx, CW = W * T, CH = H * T;
            ctx.clearRect(0, 0, CW, CH);
            ctx.fillStyle = '#05050d'; ctx.fillRect(0, 0, CW, CH);
            const flash = this.state === 'clear' && Math.floor(this.t * 6) % 2 === 0;
            ctx.globalAlpha = flash ? 0.35 : 1;
            if (this.wallImg) ctx.drawImage(this.wallImg, 0, 0, CW, CH);
            ctx.globalAlpha = 1;

            // Pastillas
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const c = this.cells[y][x];
                if (c === '.') { ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc((x + 0.5) * T, (y + 0.5) * T, 2.2, 0, Math.PI * 2); ctx.fill(); }
                else if (c === 'o') {
                    const r = 5.2 + Math.sin(this.t * 7) * 1.4;
                    ctx.fillStyle = '#fff7c2'; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.arc((x + 0.5) * T, (y + 0.5) * T, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                }
            }

            // Objetos de poder
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (const it of this.items) {
                if (it.life < 3 && Math.floor(this.t * 8) % 2) continue;
                const x = (it.tx + 0.5) * T, y = (it.ty + 0.5) * T + Math.sin(this.t * 4 + it.tx) * 1.5;
                ctx.fillStyle = 'rgba(250,204,21,.18)'; ctx.beginPath(); ctx.arc(x, y, 11 + Math.sin(this.t * 5) * 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.font = '15px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
                ctx.fillStyle = '#fff'; ctx.fillText(POWERS[it.kind].icon, x, y + 1);
            }

            // Telegrafía del Saltarín
            for (const g of this.ghosts) if (g.dest && g.tele > 0) {
                const k = 1 - g.tele / 0.95, x = (g.dest.x + 0.5) * T, y = (g.dest.y + 0.5) * T;
                ctx.strokeStyle = GHOSTS.jumper.color; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(x, y, 18 - k * 10, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 0.4 + k * 0.4; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = GHOSTS.jumper.color; ctx.fill(); ctx.globalAlpha = 1;
            }

            // Onda de choque
            if (this.ring) {
                const k = this.ring.t / 0.6;
                ctx.strokeStyle = `rgba(253,224,71,${1 - k})`; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc((this.ring.x + 0.5) * T, (this.ring.y + 0.5) * T, 5 * T * k, 0, Math.PI * 2); ctx.stroke();
            }

            // Fantasmas y Pac-Man
            if (this.state !== 'menu' || true) {
                for (const g of this.ghosts) this.drawGhost(ctx, g);
                this.drawPac(ctx);
            }

            // Partículas y textos
            for (const p of this.particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
            ctx.globalAlpha = 1;
            ctx.font = '800 13px Orbitron, system-ui, sans-serif';
            for (const f of this.floaters) {
                ctx.globalAlpha = Math.min(1, f.life * 1.5);
                ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(f.text, f.x, f.y);
                ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
            }
            ctx.globalAlpha = 1;

            if (this.state === 'ready') {
                ctx.font = '800 20px Orbitron, system-ui, sans-serif';
                ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText('¡LISTO!', CW / 2, 10.5 * T + 2);
                ctx.fillStyle = '#facc15'; ctx.fillText('¡LISTO!', CW / 2, 10.5 * T + 2);
            }
        }

        drawPac(ctx) {
            const pac = this.pac, pp = this.pacPos();
            const x = (pp.x + 0.5) * T, y = (pp.y + 0.5) * T, r = T * 0.42;
            let ang = Math.atan2(pac.face.y, pac.face.x);
            let open = (pac.dx || pac.dy) ? Math.abs(Math.sin(pac.mouth)) * 0.85 : 0.18;
            let alpha = 1;
            if (this.state === 'dying') {
                const k = Math.min(1, pac.dead / 1.3);
                open = 0.1 + k * 3.0; ang = -Math.PI / 2;
                alpha = 1 - Math.max(0, k - 0.85) * 6;
                if (alpha <= 0) return;
            }
            if (pac.phase > 0) alpha = 0.45 + 0.2 * Math.sin(this.t * 14);
            if (pac.invuln > 0 && Math.floor(this.t * 14) % 2) alpha = Math.min(alpha, 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            if (pac.turbo > 0) { ctx.strokeStyle = 'rgba(250,204,21,.5)'; ctx.lineWidth = 2; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x - pac.face.x * (r + i * 5), y - pac.face.y * (r + i * 5) - 4); ctx.lineTo(x - pac.face.x * (r + i * 5 + 6), y - pac.face.y * (r + i * 5 + 6) - 4); ctx.stroke(); } }
            if (pac.magnet > 0) { ctx.strokeStyle = 'rgba(244,114,182,.35)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(x, y, 3 * T, this.t, this.t + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
            ctx.fillStyle = '#facc15'; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, r, ang + open * 0.5, ang + Math.PI * 2 - open * 0.5);
            ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
            if (pac.shield > 0) {
                ctx.strokeStyle = `rgba(103,232,249,${0.55 + 0.35 * Math.sin(this.t * 8)})`; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }

        drawGhost(ctx, g) {
            const gp = g.state === 'house' ? { x: g.tx, y: g.ty + Math.sin(g.wob * 5 + g.i) * 0.12 } : this.pos(g);
            const x = (gp.x + 0.5) * T + (g.state === 'house' && g.i > 3 ? (g.i - 3) * 3 : 0), y = (gp.y + 0.5) * T;
            const info = GHOSTS[g.id];
            const big = g.id === 'brute' ? 1.1 : 1;
            const r = T * 0.44 * big;
            let color = info.color, alpha = this.ghostVisible(g);
            const fr = g.fright > 0 && g.id !== 'brute' && g.state !== 'eyes';
            if (fr) color = (g.fright < 2 && Math.floor(this.t * 8) % 2) ? '#f8fafc' : '#2f3dff';
            if (g.stun > 0 && !fr) color = '#8bd4f2';
            ctx.save();
            ctx.globalAlpha = (this.pac.phase > 0 && g.state !== 'eyes') ? Math.min(alpha, 0.55) : alpha;
            if (g.state !== 'eyes') {
                ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = g.id === 'specter' ? 14 : 8;
                ctx.beginPath();
                ctx.arc(x, y - r * 0.1, r, Math.PI, 0);
                ctx.lineTo(x + r, y + r * 0.85);
                const n = 3, w = (r * 2) / n;
                for (let i = 0; i < n; i++) {
                    const sx = x + r - i * w;
                    ctx.quadraticCurveTo(sx - w * 0.25, y + r * 0.4 + Math.sin(this.t * 10 + i) * 1.2, sx - w * 0.5, y + r * 0.85);
                    ctx.quadraticCurveTo(sx - w * 0.75, y + r * 1.15, sx - w, y + r * 0.85);
                }
                ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
                if (g.id === 'brute') { ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.stroke(); }
            }
            // Ojos
            const look = fr ? { x: 0, y: 0 } : { x: g.dx, y: g.dy };
            if (fr) {
                ctx.fillStyle = '#fde68a';
                ctx.fillRect(x - r * 0.45, y - r * 0.3, r * 0.22, r * 0.22); ctx.fillRect(x + r * 0.23, y - r * 0.3, r * 0.22, r * 0.22);
                ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.4; ctx.beginPath();
                for (let i = 0; i < 5; i++) ctx.lineTo(x - r * 0.6 + i * r * 0.3, y + r * 0.35 + (i % 2 ? -3 : 0));
                ctx.stroke();
            } else {
                for (const s of [-1, 1]) {
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + s * r * 0.38, y - r * 0.2, r * 0.27, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.arc(x + s * r * 0.38 + look.x * r * 0.13, y - r * 0.2 + look.y * r * 0.15, r * 0.14, 0, Math.PI * 2); ctx.fill();
                }
            }
            // Marcas de tipo
            if (g.state !== 'eyes' && !fr) {
                ctx.font = `${Math.floor(r * 0.7)}px system-ui, "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                if (g.stun > 0) ctx.fillText('❄️', x, y - r * 1.15);
                else if (g.id === 'jumper') ctx.fillText('✦', x, y + r * 0.3);
                else if (g.id === 'shadow') { ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(x - r * 0.55, y + r * 0.2, r * 1.1, r * 0.22); }
            }
            ctx.restore();
        }

        // ── Panel / píldoras ────────────────────────────────
        updateAll() { this.updatePills(); this.updateSide(); this.updateSlots(); this.updateEffects(); }
        updatePills() {
            const set = (id, v) => { const el = this.root.querySelector(`[data-pill="${id}"]`); if (el) el.textContent = v; };
            set('score', formatNumber(this.score)); set('lives', this.lives); set('level', this.level);
        }
        updateSide() {
            const set = (id, v) => { const el = this.$('#' + id); if (el) el.textContent = v; };
            set('pm-left', `${this.pelletsLeft} / ${this.pelletsTotal}`);
            set('pm-eaten', this.stats.eaten);
            set('pm-used', this.stats.powersUsed);
        }
        updateSlots() {
            const el = this.$('#pm-slots');
            if (!el) return;
            el.innerHTML = this.slots.map((k, i) => k
                ? `<button type="button" class="pm-slot on" data-slot="${i}" title="${esc(POWERS[k].desc)}"><span class="pm-slot-icon">${POWERS[k].icon}</span><span class="pm-slot-name">${esc(POWERS[k].name)}</span><kbd>${i === 0 ? 'Espacio' : '2'}</kbd></button>`
                : `<button type="button" class="pm-slot" data-slot="${i}" disabled><span class="pm-slot-icon">·</span><span class="pm-slot-name">Vacía</span><kbd>${i === 0 ? 'Espacio' : '2'}</kbd></button>`).join('');
            this.slots.forEach((k, i) => { const b = this.$('#pm-t' + i); if (b) b.textContent = k ? POWERS[k].icon : '—'; });
        }
        updateEffects() {
            const pac = this.pac, chips = [];
            if (pac.turbo > 0) chips.push(`<span class="ax-chip hot">⚡ ${Math.ceil(pac.turbo)} s</span>`);
            if (pac.magnet > 0) chips.push(`<span class="ax-chip hot">🧲 ${Math.ceil(pac.magnet)} s</span>`);
            if (pac.phase > 0) chips.push(`<span class="ax-chip hot">👻 ${Math.ceil(pac.phase)} s</span>`);
            if (pac.shield > 0) chips.push(`<span class="ax-chip hot">🛡️ ${Math.ceil(pac.shield)} s</span>`);
            const fr = this.ghosts.reduce((m, g) => Math.max(m, g.state !== 'eyes' && g.id !== 'brute' ? g.fright : 0), 0);
            if (fr > 0) chips.push(`<span class="ax-chip">😱 ${fr.toFixed(0)} s</span>`);
            const html = chips.join('') || '<span class="ax-hint">Sin efectos activos</span>';
            const el = this.$('#pm-effects');
            if (el && el.innerHTML !== html) el.innerHTML = html;
            this.updatePills(); this.updateSide();
        }
        updateBestiary() {
            const el = this.$('#pm-bestiary');
            if (!el) return;
            el.innerHTML = this.roster.map(id => `<div class="pm-enemy" title="${esc(GHOSTS[id].desc)}"><span class="pm-dot" style="background:${GHOSTS[id].color}"></span><b>${GHOSTS[id].name}</b><small>${esc(GHOSTS[id].desc)}</small></div>`).join('');
        }
        updateRecords() {
            const ms = Nexus.services.progress.stats('pacman').byMode[this.mode.id];
            const el = this.$('#pm-best');
            if (el) el.textContent = ms ? formatNumber(ms.bestScore) : '0';
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id);
            return id;
        }

        destroy() {
            this.destroyed = true;
            this.loop.destroy();
            this.fit.destroy();
            document.removeEventListener('keydown', this.onKeyDown);
            if (this.unsubProgress) this.unsubProgress();
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
        }
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'pacman') ? c.event : null;
    const pm = (c) => c.stats('pacman');
    A.register([
        { id: 'pm_level3', game: 'pacman', name: 'Laberinto dominado', desc: 'Llega al nivel 3.', icon: '🏁', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.level >= 3; } },
        { id: 'pm_level6', game: 'pacman', name: 'Superviviente nato', desc: 'Llega al nivel 6.', icon: '🔥', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.extra.level >= 6; } },
        { id: 'pm_chain4', game: 'pacman', name: 'Festín fantasma', desc: 'Come 4 fantasmas con una sola píldora.', icon: '👻', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxChain >= 4; } },
        { id: 'pm_shield', game: 'pacman', name: '¡Casi!', desc: 'Bloquea un golpe con el Escudo 🛡️.', icon: '🛡️', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.shieldSaves >= 1; } },
        { id: 'pm_powers4', game: 'pacman', name: 'Arsenal', desc: 'Usa 4 poderes distintos en una partida.', icon: '⚡', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.kinds >= 4; } },
        { id: 'pm_flawless', game: 'pacman', name: 'Nivel perfecto', desc: 'Completa un nivel sin perder ninguna vida.', icon: '✨', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.flawless >= 1; } },
        { id: 'pm_score10k', game: 'pacman', name: 'Vida extra', desc: 'Supera los 10.000 puntos.', icon: '❤️', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.score >= 10000; } },
        { id: 'pm_score30k', game: 'pacman', name: 'Maestro del laberinto', desc: 'Supera los 30.000 puntos.', icon: '👑', rarity: 'legendary',
            test: (c) => { const e = ev(c); return !!e && e.score >= 30000; } },
        { id: 'pm_horde', game: 'pacman', name: 'Sobreviviente de la Horda', desc: 'Consigue 8.000 puntos en el modo Horda.', icon: '👹', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.mode === 'horde' && e.score >= 8000; } },
        { id: 'pm_pellets', game: 'pacman', name: 'Comilón', desc: 'Come 2.000 pastillas en total.', icon: '🟡', rarity: 'rare',
            ...A.counter((c) => (pm(c).extra.totalPellets || 0), 2000) },
        { id: 'pm_ghosts', game: 'pacman', name: 'Cazafantasmas', desc: 'Come 100 fantasmas en total.', icon: '🎯', rarity: 'epic',
            ...A.counter((c) => (pm(c).extra.totalGhosts || 0), 100) }
    ]);

    Nexus.games.registry.register({
        id: 'pacman', name: 'Pac-Man Nexus', emoji: '🟡', accent: '#facc15',
        tagline: '8 enemigos · 7 poderes · 3 modos',
        description: 'El laberinto de siempre con poderes que se guardan para el momento justo y ocho tipos de enemigos: desde el Cazador hasta el Saltarín que se teletransporta o el Espectro invisible.',
        tags: ['Arcade', 'Acción'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'score', label: 'Puntuación' }],
        mount: (root) => new PacmanGame(root)
    });
})();
