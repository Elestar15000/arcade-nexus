/* ============================================================
   NEXUS ARCADE · games/towerdefense/engine.js
   Motor puro del Tower Defense (sin DOM): bus de datos, amenazas
   (Virus y Malware) con capas, torres-lenguaje, proyectiles, rondas
   infinitas, economía y (de)serialización.
   Se prueba en Node con tests/td_sim.js.
   ============================================================ */
(function () {
    'use strict';

    const TD = Nexus.games.td;
    const STEP = 1 / 60;
    TD.CASH_K = 1;          // multiplicador de créditos por amenaza (calibración)
    TD.ROUND_BONUS = 100;   // bonus base al terminar una ronda
    TD.ROUND_BONUS_K = 2;   // + ronda × K

    TD.cost = function (c) {
        return Math.max(5, Math.round(c / 5) * 5);
    };

    // ── Geometría del camino ────────────────────────────────
    function buildPath(points) {
        const cum = [0];
        for (let i = 1; i < points.length; i++) {
            cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
        }
        return { pts: points, cum, total: cum[cum.length - 1] };
    }
    function posAt(path, dist, hint) {
        const { pts, cum } = path;
        let i = hint || 0;
        if (i > 0 && cum[i] > dist) i = 0;
        while (i < pts.length - 2 && cum[i + 1] < dist) i++;
        const len = cum[i + 1] - cum[i] || 1;
        const t = Math.max(0, Math.min(1, (dist - cum[i]) / len));
        return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, seg: i };
    }
    function distToSeg(px, py, a, b) {
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
        return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
    }
    TD.distToPath = function (path, x, y) {
        let m = Infinity;
        for (let i = 0; i < path.pts.length - 1; i++) m = Math.min(m, distToSeg(x, y, path.pts[i], path.pts[i + 1]));
        return m;
    };

    // ── Motor ───────────────────────────────────────────────
    class Engine {
        constructor(opts) {
            opts = opts || {};
            this.map = TD.MAP;
            this.noFx = !!opts.noFx;
            this.path = buildPath(this.map.path);
            this.cash = TD.CONFIG.cash; this.lives = TD.CONFIG.lives;
            this.round = 0; this.roundActive = false;
            this.over = false; this.won = false;   // sin victoria: las rondas son infinitas
            this.enemies = []; this.towers = []; this.projs = []; this.fx = [];
            this.queue = []; this.roundTime = 0; this.acc = 0; this.time = 0;
            this.nextId = 1;
            this.autoStart = false;
            this.stats = { pops: 0, leaks: 0, built: 0, sold: 0, upgrades: 0, cashEarned: 0, bossKills: 0, livesLost: 0, perfectRounds: 0 };
            this._roundLeak = false;
            this.events = []; // para sonidos/avisos: {t:'pop'|'round'|'leak'|'boom'|'shoot'|'end'}
        }

        emit(t, d) { if (!this.noFx) this.events.push(Object.assign({ t }, d || {})); }
        addFx(f) { if (!this.noFx) this.fx.push(f); }

        // ── Colocación y economía de torres ─────────────────
        towerCost(type) { return TD.cost(TD.TOWERS[type].cost); }

        canPlace(type, x, y, ignoreCash) {
            if (!ignoreCash && this.cash < this.towerCost(type)) return { ok: false, reason: 'cash' };
            const R = TD.TOWER_R;
            if (x < R || y < R || x > TD.W - R || y > TD.H - R) return { ok: false, reason: 'bounds' };
            if (TD.distToPath(this.path, x, y) < TD.PATH_HALF + R * 0.6) return { ok: false, reason: 'path' };
            for (const o of this.map.obstacles) if (Math.hypot(x - o.x, y - o.y) < o.r + R - 4) return { ok: false, reason: 'obstacle' };
            if (Math.hypot(x - TD.CORE.x, y - TD.CORE.y) < 44) return { ok: false, reason: 'obstacle' };
            for (const t of this.towers) if (Math.hypot(x - t.x, y - t.y) < R * 2 - 2) return { ok: false, reason: 'tower' };
            return { ok: true };
        }

        place(type, x, y) {
            const chk = this.canPlace(type, x, y);
            if (!chk.ok || this.over) return null;
            const def = TD.TOWERS[type];
            const cost = this.towerCost(type);
            this.cash -= cost;
            const t = {
                id: this.nextId++, type, x, y, picks: [], spent: cost,
                stats: Object.assign({}, def.base), strategy: 'first',
                cd: 0, angle: -Math.PI / 2, pops: 0, flash: 0
            };
            this.towers.push(t);
            this.stats.built++;
            return t;
        }

        /** Opciones del siguiente nivel de una torre: `opt` = 0 (rama A), 1 (rama B) o 2 (híbrida). */
        upgradeInfo(t, opt) {
            const def = TD.TOWERS[t.type];
            const lvl = t.picks.length;
            if (lvl >= TD.MAX_LEVEL) return { ok: false, reason: 'max' };
            const up = def.levels[lvl][opt];
            const cost = TD.cost(up.cost);
            if (this.cash < cost) return { ok: false, reason: 'cash', cost, up };
            return { ok: true, cost, up };
        }

        upgrade(t, opt) {
            const info = this.upgradeInfo(t, opt);
            if (!info.ok || this.over) return false;
            this.cash -= info.cost; t.spent += info.cost;
            TD.applyPatch(t.stats, info.up.patch);
            t.picks.push(opt);
            this.stats.upgrades++;
            return true;
        }

        sellValue(t) { return Math.floor(t.spent * 0.7); }
        sell(t) {
            const i = this.towers.indexOf(t);
            if (i < 0 || this.over) return 0;
            const v = this.sellValue(t);
            this.cash += v; this.towers.splice(i, 1); this.stats.sold++;
            return v;
        }

        // ── Rondas ──────────────────────────────────────────
        startRound() {
            if (this.roundActive || this.over) return false;
            this.round++;
            this.roundActive = true; this.roundTime = 0; this._roundLeak = false;
            const q = [];
            for (const g of TD.buildWave(this.round)) {
                for (let i = 0; i < g.count; i++) q.push({ t: g.start + i * g.gap, type: g.type, hp: g.hp, spd: g.spd, hpm: g.hpm });
            }
            q.sort((a, b) => a.t - b.t);
            this.queue = q;
            this.emit('round', { round: this.round });
            return true;
        }

        _endRound() {
            this.roundActive = false;
            const bonus = Math.round(TD.ROUND_BONUS + this.round * TD.ROUND_BONUS_K);
            this.cash += bonus; this.stats.cashEarned += bonus;
            if (!this._roundLeak) this.stats.perfectRounds++;
            this.lastBonus = bonus;
            this.checkpoint = this.snapshot();
            this.emit('roundEnd', { round: this.round, bonus });
        }

        // ── Bucle ───────────────────────────────────────────
        update(dt) {
            if (this.over) return;
            this.acc += Math.min(dt, 0.25);
            let n = 0;
            while (this.acc >= STEP && n++ < 30) { this.acc -= STEP; this._step(STEP); if (this.over) break; }
        }

        /** `spd` y `hpm`: multiplicadores de velocidad y vida de la ronda (los hijos los heredan). */
        _spawn(type, dist, hp, parent, srcProj, spd, hpm) {
            const d = TD.ENEMIES[type];
            const m = parent ? parent.hpm : (hpm || 1);
            const life = hp === undefined ? Math.max(1, Math.round(d.hp * m)) : hp;
            const b = {
                id: this.nextId++, type, hp: life, max: life,
                dist: Math.max(0, dist), x: 0, y: 0, seg: 0, slowT: 0, slowF: 1, skip: srcProj || 0,
                spd: spd || 1, hpm: m
            };
            if (parent) { b.slowT = parent.slowT; b.slowF = parent.slowF; b.spd = parent.spd; }
            const p = posAt(this.path, b.dist, 0);
            b.x = p.x; b.y = p.y; b.seg = p.seg;
            this.enemies.push(b);
            return b;
        }

        _step(dt) {
            this.time += dt;
            if (this.roundActive) {
                this.roundTime += dt;
                while (this.queue.length && this.queue[0].t <= this.roundTime) {
                    const q = this.queue.shift();
                    this._spawn(q.type, 0, q.hp, null, 0, q.spd, q.hpm);
                }
            }
            // movimiento de amenazas
            const total = this.path.total;
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const b = this.enemies[i];
                if (b.slowT > 0) { b.slowT -= dt; if (b.slowT <= 0) b.slowF = 1; }
                b.dist += TD.BASE_SPEED * TD.ENEMIES[b.type].speed * b.spd * b.slowF * dt;
                if (b.dist >= total) {
                    const loss = TD.ENEMIES[b.type].leak || Math.round(TD.rbe(b.type, b.hp));
                    this.lives -= loss; this.stats.leaks++; this.stats.livesLost += loss; this._roundLeak = true;
                    this.enemies.splice(i, 1);
                    this.emit('leak', { loss });
                    if (this.lives <= 0) { this.lives = 0; this.over = true; this.won = false; this.emit('end', { won: false }); return; }
                    continue;
                }
                const p = posAt(this.path, b.dist, b.seg);
                b.x = p.x; b.y = p.y; b.seg = p.seg;
            }
            // torres
            for (const t of this.towers) this._towerStep(t, dt);
            // proyectiles
            this._projStep(dt);
            // fx
            for (let i = this.fx.length - 1; i >= 0; i--) {
                const f = this.fx[i]; f.t += dt;
                if (f.t >= f.life) this.fx.splice(i, 1);
            }
            // fin de ronda
            if (this.roundActive && !this.queue.length && !this.enemies.length) {
                this._endRound();
                if (this.autoStart && !this.over) this.startRound();
            }
        }

        // ── Daño ────────────────────────────────────────────
        static canHurt(b, kind, breaksArmor) {
            const def = TD.ENEMIES[b.type];
            const im = def.immune;
            if (!im || !im.includes(kind)) return true;
            return !!def.armored && !!breaksArmor;   // p. ej. Python con Cython rompe la armadura del Troyano
        }

        /** Aplica `dmg` de golpe; las capas rotas dejan amenazas hijas. Devuelve nº de capas rotas. */
        _hit(b, dmg, kind, breaksArmor, tower, projId) {
            if (!this.enemies.includes(b) || !Engine.canHurt(b, kind, breaksArmor)) return 0;
            if (b.hp > dmg) { b.hp -= dmg; return 0; }
            // se rompe esta capa
            const rem = dmg - b.hp;
            const def = TD.ENEMIES[b.type];
            const idx = this.enemies.indexOf(b);
            this.enemies.splice(idx, 1);
            const gain = def.reward * TD.CASH_K;
            this.cash += gain; this.stats.cashEarned += gain; this.stats.pops++;
            if (tower) tower.pops++;
            if (def.boss) this.stats.bossKills++;
            if (!this.noFx) {
                this.addFx({ type: 'pop', x: b.x, y: b.y, color: def.color, t: 0, life: def.boss ? 0.8 : 0.28, r: def.r });
                if (this.fx.length < 220 && gain >= 3) this.addFx({ type: 'cash', x: b.x, y: b.y - 8, text: '+' + gain, t: 0, life: 0.8 });
                this.emit('pop', { boss: !!def.boss });
            }
            let popped = 1;
            def.kids.forEach((k, i) => {
                const kid = this._spawn(k, b.dist - i * 5, undefined, b, projId);
                if (rem > 0) popped += this._hit(kid, rem, kind, breaksArmor, tower, projId);
            });
            return popped;
        }

        // ── Torres ──────────────────────────────────────────
        _targets(t) {
            const s = t.stats;
            const range = s.range;
            const out = [];
            for (const b of this.enemies) {
                if (b.dist < 24) continue;                       // aún fuera de la placa
                if (b.x < -4 || b.x > TD.W + 4 || b.y < -4 || b.y > TD.H + 4) continue;
                if (range < 5000 && Math.hypot(b.x - t.x, b.y - t.y) > range + TD.ENEMIES[b.type].r) continue;
                if (!Engine.canHurt(b, s.dmgKind, s.breaksArmor)) continue;
                out.push(b);
            }
            return out;
        }

        _pick(t, list) {
            let best = null, bv = -Infinity;
            const st = t.strategy;
            for (const b of list) {
                let v;
                if (st === 'first') v = b.dist;
                else if (st === 'last') v = -b.dist;
                else if (st === 'strong') v = TD.rbe(b.type, b.hp) * 10000 + b.dist * 0.001;
                else v = -Math.hypot(b.x - t.x, b.y - t.y);
                if (v > bv) { bv = v; best = b; }
            }
            return best;
        }

        _towerStep(t, dt) {
            const def = TD.TOWERS[t.type];
            if (t.flash > 0) t.flash -= dt;
            if (t.cd > 0) { t.cd -= dt; if (t.cd > 0) return; }
            const s = t.stats;
            const list = this._targets(t);
            if (!list.length) { t.cd = 0; return; }

            if (def.kind === 'pulse') {
                list.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
                const hit = list.slice(0, s.pierce);
                for (const b of hit) {
                    const f = Math.max(s.slowFactor, TD.ENEMIES[b.type].boss ? 0.6 : 0);
                    if (f < b.slowF || b.slowT <= 0) b.slowF = f;
                    b.slowT = Math.max(b.slowT, s.slowTime);
                }
                if (s.damage > 0) for (const b of hit) this._hit(b, s.damage, s.dmgKind, false, t);
                this.addFx({ type: 'pulse', x: t.x, y: t.y, r: s.range, color: def.color2, t: 0, life: 0.35 });
                t.cd = s.cd; t.flash = 0.15;
                return;
            }

            const target = this._pick(t, list);
            if (!target) return;

            if (def.kind === 'sniper') {
                t.angle = Math.atan2(target.y - t.y, target.x - t.x);
                this.addFx({ type: 'beam', x: t.x, y: t.y, x2: target.x, y2: target.y, color: def.color2, t: 0, life: 0.14 });
                this._hit(target, s.damage, s.dmgKind, false, t);
                this.emit('shoot', { k: 'sniper' });
                t.cd = s.cd; t.flash = 0.1;
                return;
            }

            // proyectil con predicción de posición
            const sp = s.speed;
            let tx = target.x, ty = target.y;
            for (let k = 0; k < 2; k++) {
                const tt = Math.hypot(tx - t.x, ty - t.y) / sp;
                const bs = TD.BASE_SPEED * TD.ENEMIES[target.type].speed * target.spd * target.slowF;
                const p = posAt(this.path, Math.min(this.path.total, target.dist + bs * tt), target.seg);
                tx = p.x; ty = p.y;
            }
            const base = Math.atan2(ty - t.y, tx - t.x);
            t.angle = base;
            const n = s.shots || 1;
            for (let i = 0; i < n; i++) {
                const a = base + (n > 1 ? (i / (n - 1) - 0.5) * s.spread * 2 : 0);
                const dist = Math.hypot(tx - t.x, ty - t.y);
                this.projs.push({
                    id: this.nextId++, x: t.x, y: t.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                    dmg: s.damage, pierce: s.pierce, kind: s.dmgKind, breaksArmor: !!s.breaksArmor,
                    splash: s.splash || 0, tower: t, hit: new Set(), travel: 0,
                    maxTravel: Math.max(s.range * 1.15, dist) + 10,
                    tx: t.x + Math.cos(a) * dist, ty: t.y + Math.sin(a) * dist, color: def.color2, type: t.type, a
                });
            }
            this.emit('shoot', { k: t.type });
            t.cd = s.cd; t.flash = 0.1;
        }

        _projStep(dt) {
            for (let i = this.projs.length - 1; i >= 0; i--) {
                const p = this.projs[i];
                const mv = Math.hypot(p.vx, p.vy) * dt;
                p.x += p.vx * dt; p.y += p.vy * dt; p.travel += mv;
                let done = false;
                // colisión
                for (const b of this.enemies) {
                    if (p.hit.has(b.id) || b.skip === p.id) continue;
                    const r = TD.ENEMIES[b.type].r + 4;
                    if ((b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y) > r * r) continue;
                    if (p.splash) { this._explode(p, p.x, p.y); done = true; break; }
                    if (!Engine.canHurt(b, p.kind, p.breaksArmor)) continue;
                    p.hit.add(b.id);
                    this._hit(b, p.dmg, p.kind, p.breaksArmor, p.tower, p.id);
                    p.pierce--;
                    if (p.pierce <= 0) { done = true; break; }
                }
                if (!done && p.splash && Math.hypot(p.tx - p.x, p.ty - p.y) < mv * 0.6 + 2) { this._explode(p, p.x, p.y); done = true; }
                if (!done && (p.travel > p.maxTravel || p.x < -40 || p.y < -40 || p.x > TD.W + 40 || p.y > TD.H + 40)) done = true;
                if (done) this.projs.splice(i, 1);
            }
        }

        _explode(p, x, y) {
            const R = p.splash;
            const near = this.enemies.filter(b => Math.hypot(b.x - x, b.y - y) <= R + TD.ENEMIES[b.type].r * 0.5)
                .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
            let n = 0;
            for (const b of near) {
                if (n >= p.pierce) break;
                if (!Engine.canHurt(b, p.kind, p.breaksArmor)) continue;
                this._hit(b, p.dmg, p.kind, p.breaksArmor, p.tower, p.id);
                n++;
            }
            this.addFx({ type: 'boom', x, y, r: R, color: p.color, t: 0, life: 0.3 });
            this.emit('boom', {});
        }

        // ── Guardado ────────────────────────────────────────
        /** Sólo entre rondas (la simulación en curso no se guarda). */
        snapshot() {
            return {
                v: TD.SAVE_VERSION, cash: this.cash, lives: this.lives,
                round: this.round, stats: Object.assign({}, this.stats),
                towers: this.towers.map(t => ({ type: t.type, x: t.x, y: t.y, picks: t.picks.slice(), strategy: t.strategy, spent: t.spent, pops: t.pops }))
            };
        }
        static restore(snap, opts) {
            const e = new Engine(opts);
            e.cash = snap.cash; e.lives = snap.lives; e.round = snap.round;
            Object.assign(e.stats, snap.stats || {});
            for (const s of snap.towers || []) {
                const def = TD.TOWERS[s.type];
                if (!def) continue;
                const picks = (s.picks || []).slice(0, TD.MAX_LEVEL);
                e.towers.push({
                    id: e.nextId++, type: s.type, x: s.x, y: s.y, picks, spent: s.spent,
                    stats: TD.statsFor(s.type, picks), strategy: s.strategy || 'first',
                    cd: 0, angle: -Math.PI / 2, pops: s.pops || 0, flash: 0
                });
            }
            return e;
        }
    }

    TD.Engine = Engine;
    TD.posAt = posAt;
})();
