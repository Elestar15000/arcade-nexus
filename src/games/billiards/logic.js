/* ============================================================
   NEXUS ARCADE · games/billiards/logic.js
   Billar (bola 8): física, reglas y CPU, sin nada de pantalla
   (se prueba en Node: tests/billiards_test.mjs).

   Mesa: zona de juego de 1000 × 500 unidades (proporción 2:1 de
   una mesa de 9 pies), bolas de radio 11, 6 troneras.
   Física con paso fijo de 1/480 s (determinista): rozamiento de
   rodadura, choques elásticos entre bolas, bandas como segmentos
   (con las esquinas de las troneras) y efecto en la blanca:
   alto/bajo (sigue o retrocede tras el primer choque) y lateral
   (cambia el ángulo de salida en las bandas).
   ============================================================ */
(function () {
    'use strict';

    const W = 1000, H = 500, R = 11;
    const DT = 1 / 480;
    const MAX_SPEED = 2000, MIN_SPEED = 90;
    const E_BALL = 0.95, E_RAIL = 0.76;
    const STOP = 3;
    const DEC0 = 140, DECK = 0.2;              // rozamiento: deceleración base + parte proporcional a la velocidad
    const CURVE = 1.5;                         // la fuerza crece más despacio al principio (más control en tiros suaves)
    const CG = 33, SG = 23;                    // hueco de las troneras de esquina (desde la esquina) y de las centrales (a cada lado)
    const HEAD_X = W * 0.25, FOOT_X = W * 0.75, MID_Y = H / 2;

    // Troneras: centro de captura y radio. Puntos de mira (algo dentro de la boca) para la CPU y la guía.
    const POCKETS = [
        { x: -4, y: -4, r: 27, ax: 7, ay: 7, corner: true }, { x: W / 2, y: -9, r: 22, ax: W / 2, ay: 1 }, { x: W + 4, y: -4, r: 27, ax: W - 7, ay: 7, corner: true },
        { x: -4, y: H + 4, r: 27, ax: 7, ay: H - 7, corner: true }, { x: W / 2, y: H + 9, r: 22, ax: W / 2, ay: H - 1 }, { x: W + 4, y: H + 4, r: 27, ax: W - 7, ay: H - 7, corner: true }
    ];
    // Bandas (segmentos). Sus extremos hacen de «esquinas» de las troneras.
    const RAILS = [];
    const seg = (x1, y1, x2, y2) => RAILS.push({ x1, y1, x2, y2 });
    seg(CG, 0, W / 2 - SG, 0); seg(W / 2 + SG, 0, W - CG, 0);
    seg(CG, H, W / 2 - SG, H); seg(W / 2 + SG, H, W - CG, H);
    seg(0, CG, 0, H - CG); seg(W, CG, W, H - CG);
    // Bocas de las troneras (cortas, hacia fuera): dan el rebote en los labios
    seg(CG, 0, CG - 12, -14); seg(0, CG, -14, CG - 12); seg(W - CG, 0, W - CG + 12, -14); seg(W, CG, W + 14, CG - 12);
    seg(CG, H, CG - 12, H + 14); seg(0, H - CG, -14, H - CG + 12); seg(W - CG, H, W - CG + 12, H + 14); seg(W, H - CG, W + 14, H - CG + 12);
    seg(W / 2 - SG, 0, W / 2 - SG + 3, -13); seg(W / 2 + SG, 0, W / 2 + SG - 3, -13);
    seg(W / 2 - SG, H, W / 2 - SG + 3, H + 13); seg(W / 2 + SG, H, W / 2 + SG - 3, H + 13);

    const COLORS = ['#f4f1e8', '#f5c518', '#1f4fd1', '#d62828', '#6a2c91', '#f77f00', '#0b8a3e', '#7b1e1e', '#111111',
        '#f5c518', '#1f4fd1', '#d62828', '#6a2c91', '#f77f00', '#0b8a3e', '#7b1e1e'];
    const groupOf = (n) => (n >= 1 && n <= 7 ? 'solids' : n >= 9 && n <= 15 ? 'stripes' : null);
    const GROUP_NAME = { solids: 'Lisas', stripes: 'Rayadas' };
    const other = (g) => (g === 'solids' ? 'stripes' : g === 'stripes' ? 'solids' : null);

    // ── Azar con semilla (el rack es el mismo en los dos navegadores) ──
    function rng(seed) {
        let a = (seed >>> 0) || 1;
        return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }

    /** Triángulo de salida: la 1 en el vértice, la 8 en el centro, una lisa y una rayada en las esquinas de atrás. */
    function rack(seed) {
        const r = rng(seed), d = 2 * R + 0.15, pos = [];
        for (let row = 0; row < 5; row++) for (let j = 0; j <= row; j++) pos.push({ x: FOOT_X + row * d * Math.sqrt(3) / 2, y: MID_Y + (j - row / 2) * d });
        const order = new Array(15).fill(0);
        order[0] = 1; order[4] = 8;
        const solids = [2, 3, 4, 5, 6, 7], stripes = [9, 10, 11, 12, 13, 14, 15];
        const take = (arr) => arr.splice(Math.floor(r() * arr.length), 1)[0];
        const sFirst = r() < 0.5;
        order[10] = sFirst ? take(solids) : take(stripes);
        order[14] = sFirst ? take(stripes) : take(solids);
        const rest = solids.concat(stripes);
        for (let i = 0; i < 15; i++) if (!order[i]) order[i] = take(rest);
        const balls = [{ n: 0, x: HEAD_X, y: MID_Y, vx: 0, vy: 0, in: false }];
        pos.forEach((p, i) => balls.push({ n: order[i], x: p.x, y: p.y, vx: 0, vy: 0, in: false }));
        return balls.sort((a, b) => a.n - b.n);
    }

    const cloneBalls = (balls) => balls.map(b => ({ n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, in: b.in }));

    // ── Simulación ──────────────────────────────────────────
    /** Prepara un tiro: { a (rad), p (0–1), sx, sy (efecto, −1…1) }. */
    function createSim(balls, shot) {
        const bs = cloneBalls(balls);
        const cue = bs[0];
        const speed = speedOf(shot.p);
        const dx = Math.cos(shot.a), dy = Math.sin(shot.a);
        cue.vx = dx * speed; cue.vy = dy * speed;
        return {
            balls: bs, t: 0, done: false,
            spin: { x: clamp(shot.sx || 0, -1, 1), y: clamp(shot.sy || 0, -1, 1), dx, dy, used: false },
            ev: { firstHit: 0, potted: [], sinks: [], railAfter: false, cueRails: 0, ballRails: {}, hits: [], rails: [], pockets: [] }
        };
    }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function speedOf(p) { return MIN_SPEED + Math.pow(clamp(p, 0, 1), CURVE) * (MAX_SPEED - MIN_SPEED); }

    function friction(b, dt) {
        const sp = Math.hypot(b.vx, b.vy);
        if (sp === 0) return;
        const dec = (DEC0 + DECK * sp) * dt;
        if (sp <= dec || sp < STOP) { b.vx = 0; b.vy = 0; return; }
        const k = (sp - dec) / sp;
        b.vx *= k; b.vy *= k;
    }

    function pocketCheck(sim, b) {
        for (let i = 0; i < POCKETS.length; i++) {
            const p = POCKETS[i];
            if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < p.r * p.r) { sink(sim, b, i); return true; }
        }
        // Seguridad: una bola que se escapa de la mesa entra en la tronera más cercana
        if (b.x < -18 || b.x > W + 18 || b.y < -18 || b.y > H + 18) {
            let best = 0, bd = Infinity;
            POCKETS.forEach((p, i) => { const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2; if (d < bd) { bd = d; best = i; } });
            sink(sim, b, best); return true;
        }
        return false;
    }
    function sink(sim, b, i) {
        sim.ev.sinks.push({ n: b.n, x: b.x, y: b.y, pocket: i, t: sim.t });
        b.in = true; b.vx = 0; b.vy = 0; b.pocket = i;
        b.x = POCKETS[i].x; b.y = POCKETS[i].y;
        sim.ev.potted.push(b.n); sim.ev.pockets.push(i);
    }

    function railCollide(sim, b) {
        for (const s of RAILS) {
            const ex = s.x2 - s.x1, ey = s.y2 - s.y1, len2 = ex * ex + ey * ey;
            let t = ((b.x - s.x1) * ex + (b.y - s.y1) * ey) / len2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const px = s.x1 + ex * t, py = s.y1 + ey * t;
            const dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
            if (d2 >= R * R || d2 === 0) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
            const vn = b.vx * nx + b.vy * ny;
            b.x = px + nx * (R + 0.01); b.y = py + ny * (R + 0.01);
            if (vn >= 0) continue;
            const sp = Math.hypot(b.vx, b.vy);
            b.vx -= (1 + E_RAIL) * vn * nx; b.vy -= (1 + E_RAIL) * vn * ny;
            // Rozamiento tangencial de la banda
            b.vx *= 0.97; b.vy *= 0.97;
            if (b.n === 0) {
                sim.ev.cueRails++;
                // Efecto lateral: la blanca sale abierta (derecha) o cerrada (izquierda)
                if (Math.abs(sim.spin.x) > 0.02) {
                    const rx = -sim.spin.dy, ry = sim.spin.dx;            // derecha de la dirección del tiro
                    const tx = rx - (rx * nx + ry * ny) * nx, ty = ry - (rx * nx + ry * ny) * ny, tl = Math.hypot(tx, ty);
                    if (tl > 0.01) { const k = sim.spin.x * 0.32 * sp; b.vx += tx / tl * k; b.vy += ty / tl * k; }
                    sim.spin.x *= 0.5;
                }
            } else sim.ev.ballRails[b.n] = (sim.ev.ballRails[b.n] || 0) + 1;
            if (sim.ev.firstHit) sim.ev.railAfter = true;
            sim.ev.rails.push(Math.min(1, -vn / 900));
        }
    }

    function ballCollide(sim, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = 2 * R;
        if (d2 >= min * min || d2 === 0) return;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = (min - d) / 2 + 0.005;
        a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel <= 0) return;
        const cue = a.n === 0 ? a : b.n === 0 ? b : null;
        const cueSpeed = cue ? Math.hypot(cue.vx, cue.vy) : 0;
        const j = rel * (1 + E_BALL) / 2;
        a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny;
        if (cue && !sim.ev.firstHit) sim.ev.firstHit = (cue === a ? b : a).n;
        // Primer choque de la blanca: sigue (efecto alto o rodada natural) o retrocede (efecto bajo)
        if (cue && !sim.spin.used) {
            sim.spin.used = true;
            const f = sim.spin.y * 0.62 + 0.22;
            cue.vx += sim.spin.dx * f * cueSpeed * 0.9; cue.vy += sim.spin.dy * f * cueSpeed * 0.9;
        }
        sim.ev.hits.push(Math.min(1, rel / 1200));
    }

    /** Avanza la simulación un paso fijo. Devuelve true si todo está parado. */
    function step(sim) {
        if (sim.done) return true;
        const bs = sim.balls;
        for (const b of bs) {
            if (b.in || (b.vx === 0 && b.vy === 0)) continue;
            b.x += b.vx * DT; b.y += b.vy * DT;
        }
        for (const b of bs) if (!b.in && (b.vx || b.vy)) { if (!pocketCheck(sim, b)) railCollide(sim, b); }
        for (let i = 0; i < bs.length; i++) {
            const a = bs[i]; if (a.in) continue;
            for (let k = i + 1; k < bs.length; k++) { const b = bs[k]; if (!b.in) ballCollide(sim, a, b); }
        }
        let moving = false;
        for (const b of bs) { if (b.in) continue; friction(b, DT); if (b.vx || b.vy) moving = true; }
        sim.t += DT;
        if (!moving || sim.t > 40) { sim.done = true; for (const b of bs) { b.vx = 0; b.vy = 0; } }
        return sim.done;
    }
    /** Simula hasta el final. */
    function run(sim) { while (!step(sim)) { /* nada */ } return sim; }

    // ── Bola en mano ────────────────────────────────────────
    function freeSpot(balls, x, y, kitchen) {
        if (x < R || x > W - R || y < R || y > H - R) return false;
        if (kitchen && x > HEAD_X) return false;
        return balls.every(b => b.n === 0 || b.in || (b.x - x) ** 2 + (b.y - y) ** 2 >= (2 * R + 0.5) ** 2);
    }
    /** Sitio libre más cercano a (x, y) (para colocar la blanca o volver a poner la 8). */
    function nearestFree(balls, x, y, kitchen) {
        x = clamp(x, R, kitchen ? HEAD_X : W - R); y = clamp(y, R, H - R);
        if (freeSpot(balls, x, y, kitchen)) return { x, y };
        for (let d = 4; d < 600; d += 4) for (let k = 0; k < 24; k++) {
            const a = k / 24 * Math.PI * 2, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
            if (freeSpot(balls, px, py, kitchen)) return { x: px, y: py };
        }
        return { x: HEAD_X, y: MID_Y };
    }

    // ── Reglas de la bola 8 ─────────────────────────────────
    /** Estado nuevo de partida. players: 2 (contra CPU/online) o 1 (práctica). */
    function newGame(seed, breaker = 0, players = 2) {
        return { balls: rack(seed), turn: breaker, groups: [null, null], breakShot: true, ballInHand: true, kitchen: true,
            over: false, winner: -1, reason: '', players, shots: 0, msg: '', foul: '' };
    }
    const remaining = (st, group) => st.balls.filter(b => !b.in && groupOf(b.n) === group).length;
    /** Bolas que puede golpear primero quien tira. */
    function legalTargets(st) {
        if (st.players === 1) return st.balls.filter(b => b.n && !b.in).map(b => b.n);
        const g = st.groups[st.turn];
        if (!g) return st.balls.filter(b => b.n && b.n !== 8 && !b.in).map(b => b.n).concat(st.breakShot ? [8] : []);
        const mine = st.balls.filter(b => !b.in && groupOf(b.n) === g).map(b => b.n);
        return mine.length ? mine : [8];
    }

    const FOULS = { scratch: 'La blanca ha entrado en una tronera', nohit: 'La blanca no ha tocado ninguna bola', wrong: 'Primero has tocado una bola que no era tuya',
        norail: 'Ninguna bola ha tocado banda tras el golpe', timeout: 'Se acabó el tiempo de tiro' };

    /**
     * Aplica el resultado de un tiro (sim terminada) al estado. Devuelve un resumen:
     * { foul, keep, potted, assigned, win, lose, eightBreak, msg }.
     */
    function judge(st, sim) {
        const ev = sim.ev, me = st.turn, opp = st.players === 2 ? 1 - me : 0;
        const before = st.balls;
        const myGroupBefore = st.groups[me];
        const clearedBefore = myGroupBefore ? remaining(st, myGroupBefore) === 0 : false;
        const targets = legalTargets(st);
        st.balls = sim.balls.map(b => ({ n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, in: b.in }));
        st.shots++;
        const potted = ev.potted.filter(n => n !== 0);
        const scratch = ev.potted.includes(0);
        const out = { foul: '', keep: false, potted, assigned: null, win: false, lose: false, eightBreak: false, msg: '', banks: 0 };
        out.banks = potted.filter(n => (ev.ballRails[n] || 0) > 0).length;
        const wasBreak = st.breakShot;
        st.breakShot = false; st.kitchen = false;

        // Práctica: sin faltas, sólo hay que meterlas todas
        if (st.players === 1) {
            if (scratch) { out.foul = 'scratch'; st.ballInHand = true; respotCue(st); } else st.ballInHand = false;
            out.keep = true;
            if (st.balls.every(b => b.n === 0 || b.in)) { st.over = true; st.winner = 0; st.reason = 'cleared'; out.win = true; }
            out.msg = scratch ? 'Blanca dentro: colócala donde quieras' : potted.length ? `Dentro: ${potted.join(', ')}` : '';
            st.msg = out.msg; st.foul = out.foul;
            return out;
        }

        // Falta
        let foul = '';
        if (scratch) foul = 'scratch';
        else if (!ev.firstHit) foul = 'nohit';
        else if (!wasBreak && !targets.includes(ev.firstHit)) foul = 'wrong';
        else if (!wasBreak && !potted.length && !ev.railAfter) foul = 'norail';

        // La 8
        if (potted.includes(8)) {
            if (wasBreak) {
                out.eightBreak = true;
                const p = nearestFree(st.balls.filter(b => b.n !== 8), FOOT_X, MID_Y);
                const e = st.balls.find(b => b.n === 8); e.in = false; e.x = p.x; e.y = p.y;
            } else if (clearedBefore && !foul) { st.over = true; st.winner = me; st.reason = 'eight'; out.win = true; }
            else { st.over = true; st.winner = opp; st.reason = foul ? 'eightFoul' : 'eightEarly'; out.lose = true; }
        }
        if (st.over) { st.msg = out.win ? '¡La 8 dentro!' : (foul ? 'Bola 8 con falta' : 'Bola 8 antes de tiempo'); st.foul = foul; out.foul = foul; return out; }

        // Grupos: en mesa abierta, la primera bola metida (sin falta y fuera del saque) decide
        if (!st.groups[me] && !wasBreak && !foul) {
            const first = potted.find(n => groupOf(n));
            if (first) { const g = groupOf(first); st.groups[me] = g; st.groups[opp] = other(g); out.assigned = g; }
        }
        const g = st.groups[me];
        if (!foul) out.keep = wasBreak ? potted.some(n => n !== 8) : g ? potted.some(n => groupOf(n) === g) : false;
        out.foul = foul;
        if (foul) {
            st.turn = opp; st.ballInHand = true;
            if (scratch) respotCue(st);
            st.msg = FOULS[foul] + ': bola en mano para el rival';
        } else if (!out.keep) {
            st.turn = opp; st.ballInHand = false;
            st.msg = potted.length ? 'Has metido una bola del rival: turno del rival' : '';
        } else {
            st.ballInHand = false;
            st.msg = out.assigned ? `Juegas con ${GROUP_NAME[out.assigned].toLowerCase()}` : '';
        }
        st.foul = foul;
        return out;
    }
    function respotCue(st) {
        const c = st.balls[0], p = nearestFree(st.balls, HEAD_X, MID_Y);
        c.in = false; c.x = p.x; c.y = p.y;
    }
    /** Falta por tiempo (online): turno y bola en mano para el rival. */
    function timeoutFoul(st) {
        st.breakShot = false; st.kitchen = false;
        if (st.players === 2) st.turn = 1 - st.turn;
        st.ballInHand = true; st.foul = 'timeout'; st.msg = FOULS.timeout + ': bola en mano para el rival';
    }

    // ── Geometría para la guía y la CPU ─────────────────────
    /** Primer choque de un tiro recto desde (x, y) en dirección a: { ball, t, gx, gy } o { rail, t, px, py }. */
    function traceAim(balls, x, y, a) {
        const dx = Math.cos(a), dy = Math.sin(a);
        let best = { t: Infinity };
        for (const b of balls) {
            if (b.n === 0 || b.in) continue;
            const ox = b.x - x, oy = b.y - y, proj = ox * dx + oy * dy;
            if (proj <= 0) continue;
            const perp2 = ox * ox + oy * oy - proj * proj, rr = 4 * R * R;
            if (perp2 > rr) continue;
            const t = proj - Math.sqrt(rr - perp2);
            if (t < best.t) best = { ball: b, t, gx: x + dx * t, gy: y + dy * t };
        }
        // Bandas (rectángulo interior menos el radio)
        const tx = dx > 0 ? (W - R - x) / dx : dx < 0 ? (R - x) / dx : Infinity;
        const ty = dy > 0 ? (H - R - y) / dy : dy < 0 ? (R - y) / dy : Infinity;
        const tr = Math.min(tx, ty);
        if (tr < best.t) return { rail: true, t: tr, px: x + dx * tr, py: y + dy * tr };
        return best;
    }
    function segClear(balls, x1, y1, x2, y2, skip, rad = 2 * R - 0.5) {
        const ex = x2 - x1, ey = y2 - y1, len2 = ex * ex + ey * ey || 1;
        for (const b of balls) {
            if (b.in || skip.includes(b.n)) continue;
            let t = ((b.x - x1) * ex + (b.y - y1) * ey) / len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
            if ((b.x - x1 - ex * t) ** 2 + (b.y - y1 - ey * t) ** 2 < rad * rad) return false;
        }
        return true;
    }
    const DECEL = 200;   // deceleración media aproximada para calcular fuerzas
    const powerFor = (speed) => clamp(Math.pow(clamp((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED), 0, 1), 1 / CURVE), 0.04, 1);

    /** Tiros directos posibles (bola objetivo → tronera) desde la posición de la blanca. */
    function candidates(st, cueX, cueY) {
        const out = [], targets = legalTargets(st);
        for (const n of targets) {
            const t = st.balls[n]; if (!t || t.in) continue;
            POCKETS.forEach((p, pi) => {
                const ox = p.ax - t.x, oy = p.ay - t.y, od = Math.hypot(ox, oy);
                if (od < 1) return;
                const ux = ox / od, uy = oy / od;
                // Las troneras centrales sólo admiten ángulos de entrada abiertos
                if (!p.corner && Math.abs(uy) < 0.5) return;
                const gx = t.x - ux * 2 * R, gy = t.y - uy * 2 * R;
                if (gx < R || gx > W - R || gy < R || gy > H - R) return;
                const cx = gx - cueX, cy = gy - cueY, cd = Math.hypot(cx, cy);
                if (cd < 1) return;
                const cos = (cx * ux + cy * uy) / cd;
                if (cos < 0.2) return;
                if (!segClear(st.balls, cueX, cueY, gx, gy, [0, n])) return;
                if (!segClear(st.balls, t.x, t.y, p.ax, p.ay, [0, n])) return;
                const vObj = Math.sqrt(2 * DECEL * (od + 40)) + 70;
                const vHit = vObj / (cos * 0.97);
                const v = Math.sqrt(vHit * vHit + 2 * DECEL * cd);
                const a = Math.atan2(cy, cx);
                const ease = cos * cos * (1 - Math.min(od + cd, 1400) / 2200) * (p.corner ? 1 : 0.85);
                out.push({ n, pocket: pi, a, p: powerFor(v * 1.05), gx, gy, cut: Math.acos(Math.min(1, cos)), ease, dist: od + cd });
            });
        }
        return out.sort((x, y) => y.ease - x.ease);
    }

    const LEVELS = {
        easy: { err: 0.034, perr: 0.22, sims: 0, pick: 4, spin: false, leave: false },
        normal: { err: 0.013, perr: 0.1, sims: 8, pick: 2, spin: false, leave: false },
        hard: { err: 0.0055, perr: 0.05, sims: 18, pick: 1, spin: true, leave: false },
        master: { err: 0.0018, perr: 0.02, sims: 28, pick: 1, spin: true, leave: true }
    };

    /** Prueba un tiro sobre una copia del estado: { ok, foul, keep, win, lose, cue } */
    function tryShot(st, shot) {
        const s = JSON.parse(JSON.stringify(st));
        const sim = run(createSim(s.balls, shot));
        const res = judge(s, sim);
        return { ok: !res.foul && !res.lose && (res.keep || res.win), foul: res.foul, keep: res.keep, win: res.win, lose: res.lose, st: s };
    }

    /** Colocación de la blanca con bola en mano: detrás de la bola fantasma del mejor tiro recto. */
    function placeCue(st, level) {
        const L = LEVELS[level] || LEVELS.normal, tmp = JSON.parse(JSON.stringify(st));
        let best = null;
        for (const n of legalTargets(st)) {
            const t = st.balls[n]; if (t.in) continue;
            POCKETS.forEach((p) => {
                const ox = p.ax - t.x, oy = p.ay - t.y, od = Math.hypot(ox, oy); if (od < 1) return;
                const ux = ox / od, uy = oy / od;
                if (!p.corner && Math.abs(uy) < 0.5) return;
                if (!segClear(st.balls, t.x, t.y, p.ax, p.ay, [0, n])) return;
                for (const back of [70, 110, 160]) {
                    const x = t.x - ux * (2 * R + back), y = t.y - uy * (2 * R + back);
                    if (!freeSpot(st.balls, x, y, st.kitchen)) continue;
                    if (!segClear(st.balls, x, y, t.x - ux * 2 * R, t.y - uy * 2 * R, [0, n])) continue;
                    const score = 1000 - od - back * 0.5 + (p.corner ? 40 : 0);
                    if (!best || score > best.score) best = { x, y, score };
                }
            });
        }
        if (!best) { const p = nearestFree(tmp.balls, st.kitchen ? HEAD_X * 0.6 : W / 2, MID_Y, st.kitchen); best = { x: p.x, y: p.y }; }
        return { x: best.x, y: best.y, L };
    }

    /** La jugada de la CPU. rand: función de azar (0–1). Devuelve { a, p, sx, sy, place } */
    function aiShot(st, level, rand = Math.random) {
        const L = LEVELS[level] || LEVELS.normal;
        const work = JSON.parse(JSON.stringify(st));
        let place = null;
        if (work.ballInHand) {
            if (work.breakShot) place = { x: HEAD_X - 10, y: MID_Y + (rand() - 0.5) * 120 };
            else place = placeCue(work, level);
            work.balls[0].x = place.x; work.balls[0].y = place.y; work.balls[0].in = false;
            place = { x: place.x, y: place.y };
        }
        const cue = work.balls[0];
        const noisy = (shot) => ({ a: shot.a + (rand() * 2 - 1) * L.err, p: clamp(shot.p * (1 + (rand() * 2 - 1) * L.perr), 0.04, 1), sx: shot.sx || 0, sy: shot.sy || 0, place });
        // Saque: fuerte contra la bola de cabeza
        if (work.breakShot) {
            const head = work.balls[1];
            return noisy({ a: Math.atan2(head.y - cue.y + (rand() - 0.5) * 4, head.x - cue.x), p: 0.92 + rand() * 0.08, sy: -0.1 });
        }
        const cands = candidates(work, cue.x, cue.y);
        let chosen = null;
        if (L.sims) {
            const variants = [];
            for (const c of cands.slice(0, L.sims)) {
                variants.push({ c, a: c.a, p: c.p, sx: 0, sy: 0 });
                if (L.spin) { variants.push({ c, a: c.a, p: clamp(c.p * 1.25, 0, 1), sx: 0, sy: 0 }); variants.push({ c, a: c.a, p: c.p, sx: 0, sy: -0.5 }); variants.push({ c, a: c.a, p: c.p * 0.85, sx: 0, sy: 0.5 }); }
            }
            let best = -Infinity;
            for (const v of variants) {
                const r = tryShot(work, v);
                if (!r.ok) continue;
                let score = 100 + v.c.ease * 50 + (r.win ? 1000 : 0);
                if (L.leave && !r.win) {
                    const next = candidates(r.st, r.st.balls[0].x, r.st.balls[0].y);
                    score += Math.min(4, next.length) * 12 + (next[0] ? next[0].ease * 40 : -40);
                }
                // Robustez: el tiro sigue entrando con un pequeño error
                if (L.leave) { const r2 = tryShot(work, Object.assign({}, v, { a: v.a + 0.004 })); if (!r2.ok) score -= 45; }
                if (score > best) { best = score; chosen = v; }
            }
        } else if (cands.length) {
            const c = cands[Math.floor(rand() * Math.min(L.pick, cands.length))];
            chosen = { a: c.a, p: c.p, sx: 0, sy: 0 };
        }
        if (chosen) return noisy(chosen);
        return noisy(safety(work, rand));
    }

    /** Tiro de seguridad: tocar una bola propia sin hacer falta (y, si se puede, dejarla difícil). */
    function safety(st, rand) {
        const cue = st.balls[0], opts = [];
        for (const n of legalTargets(st)) {
            const t = st.balls[n]; if (t.in) continue;
            for (const off of [0, -0.6, 0.6, -1.2, 1.2]) {
                const base = Math.atan2(t.y - cue.y, t.x - cue.x), dist = Math.hypot(t.x - cue.x, t.y - cue.y);
                const a = base + Math.asin(clamp(off * R / Math.max(dist, 2 * R), -1, 1));
                for (const p of [0.22, 0.35, 0.5]) opts.push({ a, p, sx: 0, sy: 0 });
            }
        }
        let best = null, bs = -Infinity;
        for (const o of opts.slice(0, 60)) {
            const r = tryShot(st, o);
            if (r.foul || r.lose) continue;
            let s = r.keep ? 50 : 0;
            const after = r.st; after.turn = 1 - st.turn;
            s -= candidates(after, after.balls[0].x, after.balls[0].y).length * 8;
            if (s > bs) { bs = s; best = o; }
        }
        if (best) return best;
        const t = st.balls[legalTargets(st)[0]] || st.balls[8];
        return { a: Math.atan2(t.y - cue.y, t.x - cue.x) + (rand() - 0.5) * 0.02, p: 0.4, sx: 0, sy: 0 };
    }

    Nexus.games.billiardsLogic = {
        W, H, R, DT, POCKETS, RAILS, COLORS, HEAD_X, FOOT_X, MID_Y, MAX_SPEED, MIN_SPEED, GROUP_NAME, FOULS, LEVELS,
        groupOf, other, rng, rack, cloneBalls, createSim, step, run, freeSpot, nearestFree,
        newGame, remaining, legalTargets, judge, timeoutFoul, respotCue, traceAim, candidates, aiShot, tryShot, powerFor, speedOf
    };
})();
