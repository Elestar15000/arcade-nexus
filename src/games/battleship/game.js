/* ============================================================
   NEXUS ARCADE · games/battleship/game.js
   Hundir la flota: 10×10, flota clásica (5, 4, 3, 3, 2).
     · Reglas: los barcos no pueden tocarse (ni en diagonal); si
       aciertas, vuelves a disparar; al hundir un barco, el agua de
       alrededor se descubre sola.
     · Colocación: arrastra o toca para colocar, R o «Girar» para
       rotar, «Aleatorio» para repartir la flota.
     · Contra la máquina, 4 niveles: Fácil (al azar), Normal (busca al azar
       y remata), Difícil (patrón de damero y descarta diagonales) y Maestro (mapa de probabilidad de todas las
       posiciones posibles de la flota que queda).
     · Online por turnos: cada jugador guarda su tablero; al empezar
       se envía un compromiso SHA-256 (flota + sal) y al acabar se
       revela, así cada uno comprueba que el otro no hizo trampas.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber } = Nexus.util;
    const Kit = Nexus.games.kit;
    const S = 10, CELLS = S * S;
    const FLEET = [
        { id: 'carrier', name: 'Portaaviones', len: 5 },
        { id: 'battleship', name: 'Acorazado', len: 4 },
        { id: 'cruiser', name: 'Crucero', len: 3 },
        { id: 'submarine', name: 'Submarino', len: 3 },
        { id: 'destroyer', name: 'Destructor', len: 2 }
    ];
    const LEVELS = [
        { id: 'easy', emoji: '🌱', label: 'Fácil', desc: 'Dispara casi al azar y a veces olvida rematar.', mult: 1 },
        { id: 'normal', emoji: '⚔️', label: 'Normal', desc: 'Busca al azar, pero remata sin piedad los barcos tocados.', mult: 1.5 },
        { id: 'hard', emoji: '🔥', label: 'Difícil', desc: 'Adapta el patrón al barco más pequeño y aprovecha que no se tocan.', mult: 2.2 },
        { id: 'master', emoji: '💀', label: 'Maestro', desc: 'Calcula la probabilidad de cada casilla con todas las flotas posibles.', mult: 3 }
    ];
    // Conocimiento de un tablero enemigo: 0 desconocido, 1 agua, 2 tocado, 3 hundido, 4 agua deducida (alrededor de un hundido)
    const U = 0, MISS = 1, HIT = 2, SUNK = 3, WATER = 4;
    const COLS = 'ABCDEFGHIJ';
    const label = (i) => COLS[i % S] + (Math.floor(i / S) + 1);
    const xyOf = (i) => ({ x: i % S, y: Math.floor(i / S) });
    const rand = (n) => Math.floor(Math.random() * n);

    // ── Lógica pura ─────────────────────────────────────────
    function shipCells(x, y, len, vertical) {
        const out = [];
        for (let k = 0; k < len; k++) {
            const cx = x + (vertical ? 0 : k), cy = y + (vertical ? k : 0);
            if (cx < 0 || cy < 0 || cx >= S || cy >= S) return null;
            out.push(cy * S + cx);
        }
        return out;
    }
    function neighbors8(i) {
        const { x, y } = xyOf(i), out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < S && ny < S) out.push(ny * S + nx);
        }
        return out;
    }
    function neighbors4(i) {
        const { x, y } = xyOf(i), out = [];
        if (x > 0) out.push(i - 1); if (x < S - 1) out.push(i + 1); if (y > 0) out.push(i - S); if (y < S - 1) out.push(i + S);
        return out;
    }
    /** ¿Cabe un barco en esas casillas sin solaparse ni tocar a los demás? */
    function canPlace(ships, cells, ignoreId) {
        if (!cells) return false;
        const blocked = new Set();
        for (const sh of ships) {
            if (sh.id === ignoreId || !sh.cells) continue;
            for (const c of sh.cells) { blocked.add(c); neighbors8(c).forEach(n => blocked.add(n)); }
        }
        return cells.every(c => !blocked.has(c));
    }
    function randomFleet() {
        for (let attempt = 0; attempt < 200; attempt++) {
            const ships = [];
            let ok = true;
            for (const f of FLEET) {
                let placed = false;
                for (let t = 0; t < 300 && !placed; t++) {
                    const v = Math.random() < 0.5, cells = shipCells(rand(S), rand(S), f.len, v);
                    if (canPlace(ships, cells)) { ships.push({ id: f.id, len: f.len, cells, vertical: v }); placed = true; }
                }
                if (!placed) { ok = false; break; }
            }
            if (ok) return ships;
        }
        throw new Error('No se pudo colocar la flota');
    }
    const fleetString = (ships) => ships.slice().sort((a, b) => a.id < b.id ? -1 : 1).map(s => `${s.id}:${s.cells.slice().sort((a, b) => a - b).join(',')}`).join('|');
    function validFleet(ships) {
        if (!Array.isArray(ships) || ships.length !== FLEET.length) return false;
        const placed = [];
        for (const f of FLEET) {
            const sh = ships.find(s => s && s.id === f.id);
            if (!sh || !Array.isArray(sh.cells) || sh.cells.length !== f.len) return false;
            const cs = sh.cells.slice().sort((a, b) => a - b);
            if (!cs.every(c => Number.isInteger(c) && c >= 0 && c < CELLS)) return false;
            const { x, y } = xyOf(cs[0]);
            const h = shipCells(x, y, f.len, false), v = shipCells(x, y, f.len, true);
            const same = (a) => a && a.every((c, k) => c === cs[k]);
            if (!same(h) && !same(v)) return false;
            if (!canPlace(placed, cs)) return false;
            placed.push({ id: f.id, cells: cs });
        }
        return true;
    }

    /** Tablero propio: barcos + disparos recibidos. */
    class Board {
        constructor(ships) {
            this.ships = ships.map(s => ({ id: s.id, len: s.len || s.cells.length, cells: s.cells.slice(), vertical: !!s.vertical, hits: 0 }));
            this.shots = new Int8Array(CELLS);      // 0 nada, 1 agua, 2 tocado, 3 hundido
        }
        receive(i) {
            if (i < 0 || i >= CELLS || this.shots[i]) return null;
            const sh = this.ships.find(s => s.cells.includes(i));
            if (!sh) { this.shots[i] = MISS; return { r: 'miss' }; }
            sh.hits++;
            if (sh.hits >= sh.len) {
                sh.cells.forEach(c => { this.shots[c] = SUNK; });
                return { r: 'sunk', ship: { id: sh.id, cells: sh.cells.slice() }, over: this.ships.every(s => s.hits >= s.len) };
            }
            this.shots[i] = HIT;
            return { r: 'hit' };
        }
        get afloat() { return this.ships.filter(s => s.hits < s.len).length; }
    }

    /** Lo que sé del tablero rival. */
    class View {
        constructor() { this.k = new Int8Array(CELLS); this.sunk = []; }
        apply(i, res) {
            if (res.r === 'miss') this.k[i] = MISS;
            else if (res.r === 'hit') this.k[i] = HIT;
            else if (res.r === 'sunk' && res.ship) {
                this.sunk.push(res.ship);
                for (const c of res.ship.cells) this.k[c] = SUNK;
                for (const c of res.ship.cells) for (const n of neighbors8(c)) if (this.k[n] === U) this.k[n] = WATER;
            }
        }
        remaining() {
            const gone = this.sunk.map(s => s.id);
            return FLEET.filter(f => !gone.includes(f.id));
        }
    }

    // ── IA ──────────────────────────────────────────────────
    function aiPick(view, level) {
        const k = view.k;
        const unknown = [];
        for (let i = 0; i < CELLS; i++) if (k[i] === U) unknown.push(i);
        const hits = [];
        for (let i = 0; i < CELLS; i++) if (k[i] === HIT) hits.push(i);
        const pick = (list) => list[rand(list.length)];
        // Diagonales de un tocado: nunca pueden tener barco (no se tocan)
        const impossible = new Set();
        if (level !== 'easy' && level !== 'normal') for (const h of hits) for (const n of neighbors8(h)) if (!neighbors4(h).includes(n)) impossible.add(n);
        const cand = unknown.filter(i => !impossible.has(i));
        const pool = cand.length ? cand : unknown;

        if (level === 'easy') {
            if (hits.length && Math.random() < 0.55) {
                const adj = hits.flatMap(neighbors4).filter(i => k[i] === U);
                if (adj.length) return pick(adj);
            }
            return pick(unknown);
        }

        if (level === 'master') return densityPick(view, impossible);

        if (hits.length) {
            // ¿Hay al menos dos tocados en línea? Prolonga la línea
            for (const h of hits) {
                for (const d of [1, S]) {
                    const okDir = d === 1 ? (a, b) => Math.floor(a / S) === Math.floor(b / S) : () => true;
                    if (!hits.includes(h + d) || !okDir(h, h + d)) continue;
                    let a = h, b = h + d;
                    while (hits.includes(a - d) && okDir(a, a - d)) a -= d;
                    while (hits.includes(b + d) && okDir(b, b + d)) b += d;
                    const ends = [a - d, b + d].filter(e => e >= 0 && e < CELLS && okDir(e, e === a - d ? a : b) && k[e] === U);
                    if (ends.length) return pick(ends);
                }
            }
            const adj = hits.flatMap(neighbors4).filter(i => k[i] === U && !impossible.has(i));
            if (adj.length) {
                if (level === 'hard') return bestByDensity(view, adj, impossible);
                return pick(adj);
            }
        }
        // Búsqueda en damero (Difícil: espaciado según el barco más pequeño que queda)
        const minLen = Math.min(...view.remaining().map(f => f.len));
        if (level === 'normal') return pick(pool);              // Normal: busca al azar, sólo es listo rematando
        const step = Math.max(2, minLen);
        if (view._off === undefined || view._step !== step) { view._off = rand(step); view._step = step; }
        const parity = pool.filter(i => ((i % S) + Math.floor(i / S)) % step === view._off);
        return pick(parity.length ? parity : pool);
    }

    /** Mapa de densidad: cuántas posiciones posibles de la flota restante cubren cada casilla. */
    function density(view, impossible) {
        const k = view.k, dens = new Float64Array(CELLS);
        const hitSet = new Set(); for (let i = 0; i < CELLS; i++) if (k[i] === HIT) hitSet.add(i);
        for (const f of view.remaining()) {
            for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) for (const v of [false, true]) {
                const cells = shipCells(x, y, f.len, v);
                if (!cells || cells.some(c => k[c] === MISS || k[c] === SUNK || k[c] === WATER || impossible.has(c))) continue;
                const covers = cells.filter(c => hitSet.has(c)).length;
                if (hitSet.size && !covers) { for (const c of cells) if (k[c] === U) dens[c] += 0.02; continue; }
                const w = hitSet.size ? Math.pow(30, covers) : 1;
                for (const c of cells) if (k[c] === U) dens[c] += w;
            }
        }
        return dens;
    }
    function bestByDensity(view, list, impossible) {
        const d = density(view, impossible);
        let best = -1, out = [];
        for (const i of list) { if (d[i] > best + 1e-9) { best = d[i]; out = [i]; } else if (Math.abs(d[i] - best) < 1e-9) out.push(i); }
        return out[rand(out.length)];
    }
    function densityPick(view, impossible) {
        const d = density(view, impossible);
        const list = [];
        for (let i = 0; i < CELLS; i++) if (view.k[i] === U) list.push(i);
        return bestByDensity(view, list, impossible);
    }

    // ── Juego ───────────────────────────────────────────────
    class BattleshipGame {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.level = LEVELS.find(l => l.id === Nexus.services.settings.get('battleship.defaultLevel')) || LEVELS[1];
            this.kind = 'cpu';
            this.phase = 'menu';           // menu | place | battle | over
            this.vertical = false;
            this.placing = [];             // barcos colocados (fase de colocación)
            this.sel = FLEET[0].id;
            this.hover = -1;
            this.build();
            this.bind();
            this.lobby = new Nexus.games.OnlineLobby({
                game: 'battleship', el: this.$('#bs-online'), title: 'HUNDIR LA FLOTA ONLINE',
                roomNote: 'Primero colocáis la flota los dos; empieza quien diga el sorteo y se alterna en cada revancha.',
                startOptions: (round) => {
                    this.hostFirst = round === 1 ? Math.random() < 0.5 : !this.hostFirst;
                    return { first: this.hostFirst ? 'host' : 'guest' };
                },
                onStart: (ctx) => this.startOnline(ctx),
                onMessage: (m) => this.onNet(m),
                onLost: (info) => this.onPeerLost(info),
                onExit: () => this.showHome(),
                onStatus: () => this.updateHud()
            });
            const code = Nexus.games.OnlineLobby.inviteCode('battleship');
            if (code) { this.lobby.show(); this.lobby.join(code); }
            else this.showHome();
            this.render();
        }

        build() {
            const board = (id, title) => `
                <div class="bs-board" id="${id}">
                    <div class="bs-corner"></div>
                    ${Array.from({ length: S }, (_, i) => `<div class="bs-lab top">${i + 1}</div>`).join('')}
                    ${Array.from({ length: S }, (_, i) => `<div class="bs-lab side" style="grid-row:${i + 2}">${COLS[i]}</div>`).join('')}
                    <div class="bs-field" aria-label="${title}">
                        <div class="bs-cells">${Array.from({ length: CELLS }, (_, i) => `<div class="bs-cell" data-i="${i}" aria-label="${label(i)}"></div>`).join('')}</div>
                        <div class="bs-ships"></div>
                        <div class="bs-marks"></div>
                    </div>
                </div>`;
            this.root.innerHTML = `
            <div class="game ax-game battleship" style="--ax-accent:#38bdf8;--ol-a:#38bdf8;--ol-b:#f97316">
                ${Kit.header({ emoji: '🚢', title: 'Hundir la flota', pills: [
                    { id: 'shots', icon: '🎯', init: '0', title: 'Disparos' },
                    { id: 'acc', icon: '💥', init: '–', title: 'Precisión' },
                    { id: 'ping', icon: '📶', init: '–', title: 'Latencia' }] })}
                <div class="bs-body" id="bs-body">
                    <div class="bs-banner" id="bs-banner" role="status" aria-live="polite"></div>
                    <div class="bs-arena">
                        <section class="bs-side bs-enemy-side" id="bs-enemy-side">
                            <h3 class="bs-title"><span>🎯 Aguas enemigas</span><span class="bs-fleet" id="bs-enemy-fleet"></span></h3>
                            ${board('bs-enemy', 'Tablero rival')}
                        </section>
                        <section class="bs-side bs-mine-side" id="bs-mine-side">
                            <h3 class="bs-title"><span>⚓ Tu flota</span><span class="bs-fleet" id="bs-my-fleet"></span></h3>
                            ${board('bs-mine', 'Tu tablero')}
                            <div class="bs-dock" id="bs-dock"></div>
                        </section>
                    </div>
                    <div class="ax-overlay bs-overlay" id="bs-overlay"></div>
                    <div class="ol-overlay" id="bs-online" hidden></div>
                </div>
            </div>`;
            this.$ = (s) => this.root.querySelector(s);
            this.overlay = this.$('#bs-overlay');
            this.mineEl = this.$('#bs-mine');
            this.enemyEl = this.$('#bs-enemy');
        }

        // ── Entrada ─────────────────────────────────────────
        bind() {
            const field = (el) => el.querySelector('.bs-field');
            const cellAt = (el, e) => {
                const rc = field(el).getBoundingClientRect();
                const x = Math.floor((e.clientX - rc.left) / rc.width * S), y = Math.floor((e.clientY - rc.top) / rc.height * S);
                return x >= 0 && y >= 0 && x < S && y < S ? y * S + x : -1;
            };
            // Colocación
            const mf = field(this.mineEl);
            mf.addEventListener('pointermove', (e) => { if (this.phase !== 'place' || this.ready) return; const i = cellAt(this.mineEl, e); if (i !== this.hover) { this.hover = i; this.renderPreview(); } });
            mf.addEventListener('pointerleave', () => { this.hover = -1; this.renderPreview(); });
            mf.addEventListener('pointerdown', (e) => {
                if (this.phase !== 'place' || this.ready) return;
                const i = cellAt(this.mineEl, e); if (i < 0) return;
                if (e.button === 2) { this.rotate(); return; }
                const own = this.placing.find(s => s.cells.includes(i));
                if (own && (!this.sel || this.placing.some(s => s.id === this.sel))) {
                    // Recoger un barco ya colocado
                    this.placing = this.placing.filter(s => s !== own);
                    this.sel = own.id; this.vertical = own.vertical; this.hover = i;
                    Nexus.audio.play('click'); this.render(); return;
                }
                this.hover = i;
                this.placeSelected();
            });
            mf.addEventListener('contextmenu', (e) => { if (this.phase === 'place') e.preventDefault(); });
            // Disparos
            const ef = field(this.enemyEl);
            ef.addEventListener('click', (e) => { const i = cellAt(this.enemyEl, e); if (i >= 0) this.playerFire(i); });
            ef.addEventListener('pointermove', (e) => {
                if (this.phase !== 'battle') return;
                const i = cellAt(this.enemyEl, e);
                this.enemyEl.querySelectorAll('.bs-cell.aim').forEach(c => c.classList.remove('aim'));
                if (i >= 0 && this.myTurn && this.view.k[i] === U) this.enemyEl.querySelector(`.bs-cell[data-i="${i}"]`).classList.add('aim');
            });
            this.$('#bs-dock').addEventListener('click', (e) => {
                const b = e.target.closest('[data-ship],[data-dock]'); if (!b) return;
                Nexus.audio.play('click');
                if (b.dataset.ship) { this.sel = b.dataset.ship; const placed = this.placing.find(s => s.id === b.dataset.ship); if (placed) { this.placing = this.placing.filter(s => s !== placed); this.vertical = placed.vertical; } this.render(); return; }
                const a = b.dataset.dock;
                if (a === 'rotate') this.rotate();
                else if (a === 'random') { this.placing = randomFleet(); this.sel = null; this.render(); }
                else if (a === 'clear') { this.placing = []; this.sel = FLEET[0].id; this.render(); }
                else if (a === 'ready') this.confirmFleet();
                else if (a === 'menu') this.openMenu();
            });
            this.overlay.addEventListener('click', (e) => this.onOverlay(e));
            this.onKey = (e) => {
                if (this.destroyed || document.querySelector('.modal-overlay.active')) return;
                if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
                if ((e.key === 'r' || e.key === 'R') && this.phase === 'place') { e.preventDefault(); this.rotate(); }
            };
            document.addEventListener('keydown', this.onKey);
        }

        rotate() {
            if (this.phase !== 'place' || this.ready) return;
            this.vertical = !this.vertical;
            Nexus.audio.play('flip');
            this.renderPreview(); this.renderDock();
        }

        previewCells() {
            if (!this.sel || this.hover < 0) return null;
            const f = FLEET.find(x => x.id === this.sel);
            const { x, y } = xyOf(this.hover);
            // Que el barco quepa: si se sale por el borde, se desplaza hacia dentro
            const sx = this.vertical ? x : Math.min(x, S - f.len), sy = this.vertical ? Math.min(y, S - f.len) : y;
            return shipCells(sx, sy, f.len, this.vertical);
        }

        placeSelected() {
            const cells = this.previewCells(); if (!cells) return;
            if (!canPlace(this.placing, cells, this.sel)) {
                Nexus.audio.play('error');
                const pv = this.mineEl.querySelector('.bs-preview'); if (pv) { pv.classList.remove('shake'); void pv.offsetWidth; pv.classList.add('shake'); }
                return;
            }
            this.placing = this.placing.filter(s => s.id !== this.sel).concat({ id: this.sel, len: cells.length, cells, vertical: this.vertical });
            Nexus.audio.play('tdPlace');
            const next = FLEET.find(f => !this.placing.some(s => s.id === f.id));
            this.sel = next ? next.id : null;
            this.render();
        }

        // ── Flujo ───────────────────────────────────────────
        startPlacement(kind) {
            if (this.resultModal) { this.resultModal.close(); this.resultModal = null; }
            this.kind = kind;
            this.phase = 'place';
            this.ready = false; this.peerReady = false;
            // Estado de red de la partida anterior (revancha)
            this.lastPeerShot = 0; this.shotSeq = 0; this.pendingShot = -1; this.awaiting = false;
            this.peerReveal = null; this.peerCommit = null; this.onReveal = null; this.showFoe = false;
            this.placing = []; this.sel = FLEET[0].id; this.vertical = false; this.hover = -1;
            this.mine = null; this.view = new View();
            this.stats = { shots: 0, hits: 0, streak: 0, maxStreak: 0 };
            this.foeStats = { shots: 0, hits: 0 };
            this.log = [];
            this.overlay.hidden = true;
            this.render();
        }

        confirmFleet() {
            if (this.placing.length !== FLEET.length || this.ready) return;
            this.ready = true;
            this.mine = new Board(this.placing);
            Nexus.audio.play('tdRound');
            if (this.kind === 'cpu') {
                this.foe = new Board(randomFleet());
                this.foeView = new View();         // lo que la CPU sabe de mi tablero
                this.beginBattle(Math.random() < 0.5);
            } else {
                this.salt = Nexus.core.hash.randomSalt();
                this.commit = Nexus.core.hash.sha256Hex(fleetString(this.mine.ships) + '#' + this.salt);
                this.lobby.send({ t: 'bs-ready', c: this.commit });
                if (this.peerReady) this.beginBattle(this.iStart);
                else this.render();
            }
        }

        beginBattle(meFirst) {
            this.phase = 'battle';
            this.myTurn = meFirst;
            this.shotSeq = 0; this.awaiting = false;
            this.render();
            this.banner(meFirst ? '¡Empiezas tú! Elige una casilla del tablero rival.' : (this.kind === 'cpu' ? 'Empieza la CPU…' : `Empieza ${this.peerName()}…`));
            if (!meFirst && this.kind === 'cpu') this.cpuTurn();
        }

        peerName() { return this.kind === 'cpu' ? 'la CPU' : ((this.lobby.peer && this.lobby.peer.name) || 'tu rival'); }

        playerFire(i) {
            if (this.phase !== 'battle' || !this.myTurn || this.awaiting || this.view.k[i] !== U) return;
            this.stats.shots++;
            Nexus.audio.play('bsFire');
            if (this.kind === 'cpu') {
                const res = this.foe.receive(i);
                this.afterMyShot(i, res);
            } else {
                this.awaiting = true;
                this.pendingShot = i;
                this.lobby.send({ t: 'shot', i, n: ++this.shotSeq });
                this.markPending(i);
            }
        }

        afterMyShot(i, res) {
            this.awaiting = false;
            this.view.apply(i, res);
            if (res.r === 'miss') { this.stats.streak = 0; }
            else { this.stats.hits++; this.stats.streak++; this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.streak); }
            this.effect(this.enemyEl, i, res);
            this.enemyEl.querySelectorAll('.bs-cell.aim').forEach(c => c.classList.remove('aim'));
            if (res.over) { this.render(); this.finish(true); return; }
            if (res.r === 'miss') this.myTurn = false;
            this.render();
            if (res.r === 'miss') {
                this.banner(`Agua en ${label(i)}. Turno de ${this.peerName()}…`);
                if (this.kind === 'cpu') this.cpuTurn();
            } else this.banner(res.r === 'sunk' ? `¡Hundido! ${FLEET.find(f => f.id === res.ship.id).name} enemigo a pique. Vuelve a disparar.` : `¡Tocado en ${label(i)}! Vuelve a disparar.`);
        }

        cpuTurn() {
            if (this.phase !== 'battle' || this.myTurn) return;
            this.later(() => {
                if (this.phase !== 'battle' || this.myTurn) return;
                const i = aiPick(this.foeView, this.level.id);
                const res = this.mine.receive(i);
                if (!res) { this.myTurn = true; return; }
                this.receivedShot(i, res);
                if (res.over) return;
                if (res.r !== 'miss') this.cpuTurn();
            }, this.foeStats.shots ? 620 + rand(260) : 900);
        }

        /** Disparo recibido (de la CPU o del rival online). */
        receivedShot(i, res) {
            this.foeStats.shots++;
            if (res.r !== 'miss') this.foeStats.hits++;
            if (this.foeView) this.foeView.apply(i, res);
            this.effect(this.mineEl, i, res);
            if (res.over) { this.render(); this.finish(false); return; }
            if (res.r === 'miss') this.myTurn = true;
            this.render();
            if (res.r === 'miss') { this.banner(`${this.kind === 'cpu' ? 'La CPU' : this.peerName()} falla en ${label(i)}. ¡Tu turno!`); }
            else this.banner(res.r === 'sunk' ? `¡Te han hundido el ${FLEET.find(f => f.id === res.ship.id).name}!` : `Te han tocado en ${label(i)}…`);
        }

        // ── Online ──────────────────────────────────────────
        startOnline({ role, opts }) {
            this.iStart = opts.first === role;
            this.startPlacement('online');
            Nexus.ui.toast('Coloca tu flota y pulsa «¡Listo!»', { icon: '⚓' });
        }

        onNet(m) {
            if (m.t === 'bs-ready') {
                if (typeof m.c !== 'string') return;
                this.peerCommit = m.c; this.peerReady = true;
                if (this.phase === 'place' && this.ready) this.beginBattle(this.iStart);
                else this.render();
            } else if (m.t === 'shot') {
                if (this.phase !== 'battle' || this.myTurn || !Number.isInteger(m.i)) return;
                if (m.n <= (this.lastPeerShot || 0)) return;
                this.lastPeerShot = m.n;
                const res = this.mine.receive(m.i);
                if (!res) return;
                this.lobby.send(Object.assign({ t: 'res', i: m.i, n: m.n }, res));
                this.receivedShot(m.i, res);
            } else if (m.t === 'res') {
                if (!this.awaiting || m.n !== this.shotSeq || m.i !== this.pendingShot) return;
                if (!['miss', 'hit', 'sunk'].includes(m.r)) return;
                if (m.r === 'sunk' && (!m.ship || !Array.isArray(m.ship.cells) || !m.ship.cells.includes(m.i))) return;
                this.afterMyShot(m.i, { r: m.r, ship: m.ship, over: !!m.over });
            } else if (m.t === 'reveal') {
                this.peerReveal = m;
                if (this.onReveal) this.onReveal();
            }
        }

        onPeerLost({ wasPlaying }) {
            if (wasPlaying && (this.phase === 'battle' || this.phase === 'place') && this.kind === 'online') this.finish(true, 'forfeit');
        }

        /** Comprueba el tablero revelado por el rival contra su compromiso y contra sus respuestas. */
        verifyPeer() {
            const r = this.peerReveal;
            if (!r || !Array.isArray(r.ships) || typeof r.salt !== 'string') return { ok: null, text: '⏳ El rival no ha revelado su tablero.' };
            if (!validFleet(r.ships)) return { ok: false, text: '⚠️ El tablero revelado por el rival no es una flota válida.' };
            const fs = fleetString(r.ships.map(s => ({ id: s.id, cells: s.cells })));
            if (Nexus.core.hash.sha256Hex(fs + '#' + r.salt) !== this.peerCommit) return { ok: false, text: '⚠️ El tablero revelado no coincide con el que se comprometió al empezar.' };
            const occ = new Set(r.ships.flatMap(s => s.cells));
            for (let i = 0; i < CELLS; i++) {
                const k = this.view.k[i];
                if ((k === MISS && occ.has(i)) || ((k === HIT || k === SUNK) && !occ.has(i))) return { ok: false, text: `⚠️ La respuesta en ${label(i)} no coincide con el tablero revelado.` };
            }
            return { ok: true, text: '🔒 Tablero del rival verificado: jugó limpio.' };
        }

        // ── Fin ─────────────────────────────────────────────
        finish(won, reason) {
            if (this.phase === 'over') return;
            const wasPlacing = this.phase === 'place';
            this.phase = 'over';
            this.myTurn = false;
            const online = this.kind === 'online';
            if (online) {
                this.lobby.gameOver();
                if (this.mine) this.lobby.send({ t: 'reveal', ships: this.mine.ships.map(s => ({ id: s.id, cells: s.cells })), salt: this.salt });
            }
            const mode = online ? 'online' : this.level.id;
            const mult = online ? 2 : this.level.mult;
            const st = this.stats;
            const acc = st.shots ? st.hits / st.shots : 0;
            const lost = this.mine ? FLEET.length - this.mine.afloat : 0;
            const score = Math.round((won ? 1000 + Math.max(0, 100 - st.shots) * 12 + Math.round(acc * 400) + (FLEET.length - lost) * 60 : st.hits * 15) * mult);
            const xp = Math.round((won ? 55 : 12) * mult);
            const result = (wasPlacing && reason !== 'forfeit') ? null : Nexus.services.progress.recordGame({
                game: 'battleship', mode, won, score, time: 0, xp,
                extra: { online, shots: st.shots, hits: st.hits, acc, maxStreak: st.maxStreak, lost, forfeit: reason || null, level: mode },
                updateExtra: (x) => { x.sunk = (x.sunk || 0) + this.view.sunk.length; x.shots = (x.shots || 0) + st.shots; }
            });
            this.render();
            this.banner(won ? '🏆 ¡Has hundido toda la flota enemiga!' : '💀 Han hundido toda tu flota.');
            Nexus.audio.play(won ? 'win' : 'lose');
            if (!won && this.kind === 'cpu') this.revealFoe();
            const open = () => {
                if (this.destroyed) return;
                let extra = '';
                if (online && reason !== 'forfeit') { const v = this.verifyPeer(); extra = `<p class="bs-verify ${v.ok === true ? 'ok' : v.ok === false ? 'bad' : ''}">${esc(v.text)}</p>`; }
                const actions = online ? [
                    { label: '🔄 Revancha', kind: 'primary', onClick: () => this.later(() => this.lobby.ready(), 50) },
                    { label: '🚪 Salir de la sala', kind: 'ghost', onClick: () => this.later(() => { this.lobby.leave(); this.lobby.show(); }, 50) }
                ] : [
                    { label: '🔄 Otra partida', kind: 'primary', onClick: () => this.later(() => this.startPlacement('cpu'), 50) },
                    { label: '☰ Cambiar nivel', kind: 'ghost', onClick: () => this.later(() => this.showCpu(), 50) },
                    { label: '🏠 Biblioteca', kind: 'ghost', onClick: () => { location.hash = '#/library'; } }
                ];
                const rm = this.resultModal = Nexus.ui.modal.resultModal({
                    emoji: won ? '🏆' : '🌊', kind: won ? 'win' : 'lose', title: won ? '¡VICTORIA NAVAL!' : 'FLOTA HUNDIDA',
                    subtitle: (reason === 'forfeit' ? 'Tu rival abandonó la partida · ' : '') + `contra ${this.peerName()}`,
                    extraHtml: extra,
                    stats: [
                        { label: 'Disparos', value: String(st.shots) },
                        { label: 'Precisión', value: Math.round(acc * 100) + ' %' },
                        { label: 'Barcos perdidos', value: `${lost}/${FLEET.length}` },
                        { label: 'Puntuación', value: formatNumber(score) }
                    ],
                    result: result || { xp: 0, unlocked: [], records: {} }, actions
                });
                if (online && rm && rm.closed) rm.closed.then(() => { if (this.resultModal === rm) this.resultModal = null; if (!this.destroyed && this.phase === 'over' && !this.lobby.active) this.lobby.afterGame(); });
            };
            if (online && reason !== 'forfeit' && !this.peerReveal) {
                // Espera un momento a que llegue el tablero del rival para verificarlo
                let done = false;
                const go = () => { if (done) return; done = true; this.onReveal = null; open(); };
                this.onReveal = () => this.later(go, 200);
                this.later(go, 2500);
            } else this.later(open, 900);
        }

        revealFoe() { this.showFoe = true; this.render(); }

        // ── Menús ───────────────────────────────────────────
        showHome() {
            if (this.phase !== 'battle' && this.phase !== 'place') this.phase = 'menu';
            this.overlay.hidden = false;
            const resumable = (this.phase === 'battle' || this.phase === 'place') && this.kind === 'cpu';
            this.overlay.innerHTML = `<div class="ax-panel">
                <div class="bs-logo">HUNDIR <span>LA FLOTA</span></div>
                <p class="ax-sub">Coloca tus 5 barcos y hunde los del rival antes que él. Si aciertas, repites.</p>
                <div class="ch-choices">
                    <button type="button" class="ch-choice bs-choice" data-do="go-cpu"><span>🤖</span><strong>Contra la máquina</strong><small>4 niveles, de Fácil a Maestro</small></button>
                    <button type="button" class="ch-choice bs-choice" data-do="go-online"><span>🌐</span><strong>Online 1 contra 1</strong><small>Crea una sala o entra con un código</small></button>
                </div>
                <details class="ax-help"><summary>📖 Cómo se juega</summary><ul>
                    <li>Flota: Portaaviones (5), Acorazado (4), Crucero (3), Submarino (3) y Destructor (2). Los barcos <b>no pueden tocarse</b>, ni en diagonal.</li>
                    <li>Coloca cada barco tocando tu tablero; <kbd>R</kbd>, el botón «Girar» o el clic derecho lo giran. Tócalo de nuevo para moverlo.</li>
                    <li>Por turnos, dispara a una casilla del tablero rival: 💧 agua (pasa el turno), 🔥 tocado o ☠️ hundido (vuelves a disparar).</li>
                    <li>Al hundir un barco se descubre el agua de su alrededor. Gana quien hunda antes la flota completa.</li>
                    <li><b>Online</b>: al empezar cada jugador envía una huella cifrada (SHA-256) de su flota y al terminar la revela: así se comprueba que nadie movió sus barcos.</li>
                </ul></details>
                ${resumable ? '<div class="ax-play-row"><button class="btn btn-ghost" data-do="close" type="button">▶ Volver a la partida</button></div>' : ''}
            </div>`;
        }

        showCpu() {
            if (this.phase === 'over') this.phase = 'menu';
            const ms = Nexus.services.progress.stats('battleship').byMode[this.level.id];
            const rec = ms && ms.played ? `Contra ${esc(this.level.label)}: <b>${ms.wins}</b> victorias en ${ms.played} partidas` : `Aún no has jugado contra el nivel ${esc(this.level.label)}`;
            this.overlay.hidden = false;
            this.overlay.innerHTML = `<div class="ax-panel">
                <h2 class="ax-big">CONTRA LA MÁQUINA</h2>
                ${Kit.modeCards(LEVELS.map(l => ({ ...l, desc: l.desc + ' (×' + String(l.mult).replace('.', ',') + ')' })), this.level.id)}
                <div class="ax-best">${rec}</div>
                <div class="ax-play-row">
                    <button class="btn btn-ghost" data-do="home" type="button">← Volver</button>
                    <button class="btn btn-primary btn-glow" data-do="start" type="button">⚓ Colocar flota · ${esc(this.level.label)}</button>
                </div>
            </div>`;
        }

        openMenu() {
            if (this.kind === 'online' && this.lobby.net) {
                if (this.phase === 'place' || this.phase === 'battle') {
                    Nexus.ui.modal.confirm({ title: 'Abandonar', icon: '🏳️', danger: true, confirmLabel: 'Abandonar', message: 'Si sales ahora, la partida contará como derrota.' })
                        .then(ok => { if (ok && !this.destroyed) { this.finishQuietLoss(); this.lobby.leave(); this.lobby.show(); } });
                    return;
                }
                this.lobby.showRoom(); return;
            }
            this.showHome();
        }

        finishQuietLoss() {
            if (this.phase !== 'battle' && this.phase !== 'place') return;
            const wasBattle = this.phase === 'battle';
            this.phase = 'over';
            if (wasBattle) Nexus.services.progress.recordGame({ game: 'battleship', mode: this.kind === 'online' ? 'online' : this.level.id, won: false, score: 0, time: 0, xp: 5,
                extra: { online: this.kind === 'online', shots: this.stats.shots, hits: this.stats.hits, acc: 0, maxStreak: this.stats.maxStreak, lost: 0, forfeit: 'self' } });
        }

        onOverlay(e) {
            const lv = e.target.closest('[data-mode]');
            if (lv) { this.level = LEVELS.find(l => l.id === lv.dataset.mode) || this.level; Nexus.audio.play('click'); this.showCpu(); return; }
            const b = e.target.closest('[data-do]'); if (!b) return;
            Nexus.audio.play('click');
            const d = b.dataset.do;
            if (d === 'go-cpu') this.showCpu();
            else if (d === 'go-online') { if (this.kind === 'cpu') { this.phase = 'menu'; } this.overlay.hidden = true; this.lobby.show(); }
            else if (d === 'home') this.showHome();
            else if (d === 'start') this.startPlacement('cpu');
            else if (d === 'close') this.overlay.hidden = true;
        }

        // ── Pintado ─────────────────────────────────────────
        banner(text) { const el = this.$('#bs-banner'); el.textContent = text; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

        render() {
            const body = this.$('#bs-body');
            body.dataset.phase = this.phase;
            const place = this.phase === 'place';
            this.$('#bs-enemy-side').hidden = place || this.phase === 'menu';
            this.renderMine(); this.renderEnemy(); this.renderDock(); this.renderPreview(); this.updateHud();
            if (place) this.banner(this.ready ? (this.kind === 'online' && !this.peerReady ? `Flota lista. Esperando a que ${this.peerName()} coloque la suya…` : 'Flota lista.') :
                this.placing.length === FLEET.length ? 'Flota colocada. Pulsa «¡Listo!» para empezar.' : 'Coloca tu flota: elige un barco y toca tu tablero (R para girar).');
            if (this.phase === 'menu') this.$('#bs-banner').textContent = '';
        }

        shipHtml(sh, cls) {
            const { x, y } = xyOf(Math.min(...sh.cells));
            const vert = sh.cells.length > 1 ? (Math.max(...sh.cells) - Math.min(...sh.cells)) >= S : false;
            const w = vert ? 1 : sh.cells.length, h = vert ? sh.cells.length : 1;
            return `<div class="bs-ship ${cls || ''} ${vert ? 'v' : 'h'} len${sh.cells.length}" data-ship="${esc(sh.id)}" style="left:${x * 10}%;top:${y * 10}%;width:${w * 10}%;height:${h * 10}%"><i></i></div>`;
        }

        renderMine() {
            const ships = this.phase === 'place' && !this.ready ? this.placing : (this.mine ? this.mine.ships : this.placing);
            this.mineEl.querySelector('.bs-ships').innerHTML = ships.map(sh => this.shipHtml(sh, (sh.hits >= sh.len ? 'sunk' : '') + (this.phase === 'place' && !this.ready ? ' placed' : ''))).join('');
            const marks = [];
            if (this.mine) for (let i = 0; i < CELLS; i++) {
                const s = this.mine.shots[i];
                if (s) marks.push(this.markHtml(i, s === MISS ? 'miss' : s === SUNK ? 'sunk' : 'hit'));
            }
            this.mineEl.querySelector('.bs-marks').innerHTML = marks.join('');
            this.mineEl.classList.toggle('active-turn', this.phase === 'battle' && !this.myTurn);
        }

        renderEnemy() {
            const v = this.view;
            const ships = [];
            if (v) for (const sh of v.sunk) ships.push(this.shipHtml(sh, 'sunk foe'));
            if (this.showFoe && this.foe) for (const sh of this.foe.ships) if (sh.hits < sh.len) ships.push(this.shipHtml(sh, 'ghost'));
            this.enemyEl.querySelector('.bs-ships').innerHTML = ships.join('');
            const marks = [];
            if (v) for (let i = 0; i < CELLS; i++) {
                const k = v.k[i];
                if (k === MISS) marks.push(this.markHtml(i, 'miss'));
                else if (k === HIT) marks.push(this.markHtml(i, 'hit'));
                else if (k === SUNK) marks.push(this.markHtml(i, 'sunk'));
                else if (k === WATER) marks.push(this.markHtml(i, 'water'));
            }
            if (this.awaiting && this.pendingShot >= 0) marks.push(this.markHtml(this.pendingShot, 'pending'));
            this.enemyEl.querySelector('.bs-marks').innerHTML = marks.join('');
            this.enemyEl.classList.toggle('active-turn', this.phase === 'battle' && this.myTurn);
            this.enemyEl.classList.toggle('locked', !(this.phase === 'battle' && this.myTurn && !this.awaiting));
        }

        markHtml(i, kind) {
            const { x, y } = xyOf(i);
            const isNew = this.fresh && this.fresh.i === i && this.fresh.k === kind;
            return `<span class="bs-mark ${kind}${isNew ? ' new' : ''}" style="left:${x * 10}%;top:${y * 10}%"></span>`;
        }

        markPending(i) { this.renderEnemy(); }

        effect(boardEl, i, res) {
            this.fresh = { i, k: res.r === 'miss' ? 'miss' : res.r === 'sunk' ? 'sunk' : 'hit' };
            this.later(() => { this.fresh = null; }, 50);
            Nexus.audio.play(res.r === 'miss' ? 'bsSplash' : res.r === 'sunk' ? 'bsSunk' : 'bsHit');
            if (res.r !== 'miss' && !Nexus.ui.fx.reduced()) {
                boardEl.classList.remove('boom'); void boardEl.offsetWidth; boardEl.classList.add('boom');
                this.later(() => boardEl.classList.remove('boom'), 450);
            }
            if (res.r === 'sunk') {
                const { x, y } = xyOf(i);
                const fx = document.createElement('span');
                fx.className = 'bs-blast'; fx.style.left = (x * 10 + 5) + '%'; fx.style.top = (y * 10 + 5) + '%';
                boardEl.querySelector('.bs-field').appendChild(fx);
                this.later(() => fx.remove(), 900);
            }
        }

        renderPreview() {
            const layer = this.mineEl.querySelector('.bs-ships');
            const old = layer.querySelector('.bs-preview'); if (old) old.remove();
            if (this.phase !== 'place' || this.ready) return;
            const cells = this.previewCells(); if (!cells) return;
            const ok = canPlace(this.placing, cells, this.sel);
            layer.insertAdjacentHTML('beforeend', this.shipHtml({ id: 'preview', cells }, 'bs-preview ' + (ok ? 'ok' : 'bad')));
        }

        renderDock() {
            const dock = this.$('#bs-dock');
            if (this.phase !== 'place') { dock.hidden = true; return; }
            dock.hidden = false;
            const all = this.placing.length === FLEET.length;
            dock.innerHTML = `
                <div class="bs-dock-ships">${FLEET.map(f => {
                    const placed = this.placing.some(s => s.id === f.id);
                    return `<button type="button" class="bs-dock-ship${this.sel === f.id ? ' sel' : ''}${placed ? ' placed' : ''}" data-ship="${f.id}" ${this.ready ? 'disabled' : ''}>
                        <span class="bs-dock-hull">${'<i></i>'.repeat(f.len)}</span><span>${f.name} <small>(${f.len})</small></span>${placed ? '<em>✓</em>' : ''}</button>`;
                }).join('')}</div>
                <div class="bs-dock-btns">
                    <button class="btn btn-ghost" data-dock="rotate" type="button" ${this.ready ? 'disabled' : ''}>↻ Girar (${this.vertical ? 'vertical' : 'horizontal'})</button>
                    <button class="btn btn-ghost" data-dock="random" type="button" ${this.ready ? 'disabled' : ''}>🎲 Aleatorio</button>
                    <button class="btn btn-ghost" data-dock="clear" type="button" ${this.ready ? 'disabled' : ''}>🧹 Vaciar</button>
                    <button class="btn ${all && !this.ready ? 'btn-primary btn-glow' : 'btn-ghost'}" data-dock="ready" type="button" ${all && !this.ready ? '' : 'disabled'}>${this.ready ? '⏳ Esperando…' : '✅ ¡Listo!'}</button>
                    <button class="btn btn-ghost" data-dock="menu" type="button">☰ Menú</button>
                </div>`;
        }

        updateHud() {
            const st = this.stats || { shots: 0, hits: 0 };
            const set = (sel, v) => { const el = this.root.querySelector(sel); if (el && el.textContent !== v) el.textContent = v; };
            set('[data-pill="shots"]', String(st.shots));
            set('[data-pill="acc"]', st.shots ? Math.round(st.hits / st.shots * 100) + ' %' : '–');
            set('[data-pill="ping"]', this.kind === 'online' && this.lobby && this.lobby.rtt != null ? Math.round(this.lobby.rtt) + ' ms' : '–');
            const pips = (afloatIds) => FLEET.map(f => `<i class="${afloatIds.includes(f.id) ? '' : 'down'}" title="${f.name}" style="--l:${f.len}"></i>`).join('');
            const myAfloat = this.mine ? this.mine.ships.filter(s => s.hits < s.len).map(s => s.id) : FLEET.map(f => f.id);
            const foeAfloat = this.view ? this.view.remaining().map(f => f.id) : FLEET.map(f => f.id);
            this.$('#bs-my-fleet').innerHTML = this.phase === 'battle' || this.phase === 'over' ? pips(myAfloat) : '';
            this.$('#bs-enemy-fleet').innerHTML = pips(foeAfloat);
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id); return id;
        }

        destroy() {
            if (this.kind === 'online' && this.lobby.playing) this.finishQuietLoss();
            this.destroyed = true;
            document.removeEventListener('keydown', this.onKey);
            this.timers.forEach(clearTimeout); this.timers.clear();
            if (this.resultModal) this.resultModal.close();
            this.lobby.destroy();
        }
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'battleship') ? c.event : null;
    const cpuWin = (c, modes) => { const e = ev(c); return !!e && e.won && !e.extra.online && modes.includes(e.mode); };
    A.register([
        { id: 'bs_first', game: 'battleship', name: 'Bautismo de fuego', desc: 'Gana una batalla a la máquina.', icon: '🚢', rarity: 'common',
            test: (c) => cpuWin(c, ['easy', 'normal', 'hard', 'master']) },
        { id: 'bs_normal', game: 'battleship', name: 'Capitán de fragata', desc: 'Gana a la máquina en Normal o superior.', icon: '⚔️', rarity: 'common',
            test: (c) => cpuWin(c, ['normal', 'hard', 'master']) },
        { id: 'bs_hard', game: 'battleship', name: 'Capitán de navío', desc: 'Gana a la máquina en Difícil o superior.', icon: '🔥', rarity: 'rare',
            test: (c) => cpuWin(c, ['hard', 'master']) },
        { id: 'bs_master', game: 'battleship', name: 'Almirante', desc: 'Gana a la máquina en Maestro.', icon: '🎖️', rarity: 'legendary',
            test: (c) => cpuWin(c, ['master']) },
        { id: 'bs_flawless', game: 'battleship', name: 'Intocable', desc: 'Gana sin perder ningún barco.', icon: '🛡️', rarity: 'epic',
            test: (c) => { const e = ev(c); return !!e && e.won && !e.extra.forfeit && e.extra.lost === 0; } },
        { id: 'bs_eagle', game: 'battleship', name: 'Ojo de halcón', desc: 'Gana con una precisión del 55 % o más.', icon: '🦅', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.won && !e.extra.forfeit && e.extra.acc >= 0.55; } },
        { id: 'bs_streak', game: 'battleship', name: 'Fuego graneado', desc: 'Acierta 6 disparos seguidos.', icon: '💥', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.maxStreak >= 6; } },
        { id: 'bs_sunk50', game: 'battleship', name: 'Cementerio marino', desc: 'Hunde 50 barcos en total.', icon: '⚓', rarity: 'epic',
            ...A.counter((c) => (c.stats('battleship').extra.sunk || 0), 50) },
        { id: 'bs_online', game: 'battleship', name: 'Flota conectada', desc: 'Juega una batalla online.', icon: '🌐', rarity: 'common',
            test: (c) => { const e = ev(c); return !!e && e.extra.online; } },
        { id: 'bs_online_win', game: 'battleship', name: 'Dueño de los mares', desc: 'Gana una batalla online hasta el final.', icon: '🏆', rarity: 'rare',
            test: (c) => { const e = ev(c); return !!e && e.extra.online && e.won && !e.extra.forfeit; } },
        { id: 'bs_online10', game: 'battleship', name: 'Gran Armada', desc: 'Gana 10 batallas online.', icon: '🥇', rarity: 'epic',
            ...A.counter((c) => ((c.stats('battleship').byMode || {}).online || {}).wins || 0, 10) }
    ]);

    Nexus.games.registry.register({
        id: 'battleship', name: 'Hundir la flota', emoji: '🚢', accent: '#38bdf8',
        tagline: 'Contra la máquina · Online 1 contra 1',
        description: 'La batalla naval de siempre: coloca tus 5 barcos y hunde los del rival. Si aciertas, repites. Contra la IA en 4 niveles o contra otra persona online, con verificación anti-trampas del tablero.',
        tags: ['Estrategia', 'Multijugador'],
        modes: LEVELS.map(l => ({ id: l.id, label: l.label })).concat([{ id: 'online', label: 'Online' }]),
        metrics: [{ id: 'wins', label: 'Victorias' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new BattleshipGame(root)
    });

    Nexus.games.battleshipLogic = { randomFleet, canPlace, validFleet, fleetString, aiPick, Board, View, FLEET, shipCells };
})();
