/* ============================================================
   NEXUS ARCADE · services/pet.js — Nexito, la mascota de racha
   Una sola racha diaria: un día cuenta cuando Nexito ha jugado
   contigo y ha comido (1 partida + 1 comida). Escudos (1 gratis
   cada lunes, máx. 2), rescate (3 misiones al día siguiente, 1
   vez cada 30 días), modo vacaciones (14 días al año), hitos y
   6 fases de evolución por días cuidados en total.
   Necesidades (Comida, Diversión, Descanso) calculadas con el
   tiempo real desde la última visita: no hay temporizadores.
   Nunca muere, enferma ni se va; lo peor es «un poco triste».
   Estado en data.rewards.pet (ver core/schema.js · petData).
   ============================================================ */
(function () {
    'use strict';

    const { dayKey, daysBetween } = Nexus.util;
    const U = () => Nexus.services.users;
    const RW = () => Nexus.services.rewards;
    const A = () => Nexus.services.achievements;

    // ── Reglas ──────────────────────────────────────────────
    const RATE = { food: 4, fun: 3, rest: 20 };          // por hora: −comida, −diversión, +descanso sin jugar
    const MAX_HOURS = 72;                                 // tope de horas que se aplican de golpe
    const FUN_PER_GAME = 15, FUN_NEW_GAME = 5;
    const REST_PER_15MIN = 10, REST_MIN_PER_GAME = 2;
    const TIRED_AFTER = 45 * 60e3;                        // juego seguido antes de sugerir una pausa
    const SESSION_GAP = 20 * 60e3;                        // pausa que corta una sesión
    const RESTED_AFTER = 60 * 60e3;                       // pausa que deja a Nexito «Descansado»
    const MAX_SHIELDS = 2, SHIELD_PRICE = 300;
    const RESCUE_EVERY = 30;                              // días entre rescates
    const VACATION_DAYS = 14;                             // por año
    const NAME_RE = /^[\p{L}\p{N} _-]{2,16}$/u;

    const STAGES = [
        { id: 'egg', name: 'Huevo', at: 0, desc: 'Se mueve un poco. ¡Algo va a salir!' },
        { id: 'baby', name: 'Cría', at: 3, desc: 'Pequeño, curioso y con unos ojos enormes.' },
        { id: 'nexito', name: 'Nexito', at: 7, desc: 'Ya tiene brazos y pies para jugar contigo.' },
        { id: 'pro', name: 'Nexito Pro', at: 30, desc: 'Visera de jugador y brillo propio.' },
        { id: 'gold', name: 'Nexito Dorado', at: 100, desc: 'Acabado dorado con destellos.' },
        { id: 'legend', name: 'Leyenda', at: 365, desc: 'Aura de colores y pedestal propio.' }
    ];
    const MILESTONES = [
        { days: 3, rombos: 60 },
        { days: 7, rombos: 200, items: ['nx-bufanda'] },
        { days: 14, shield: 1 },
        { days: 30, rombos: 1000, items: ['nx-cupula-estrellas'] },
        { days: 100, items: ['t-inseparables', 'fr-nexito'] },
        { days: 365, items: ['av:rw-nexito', 'nx-base-leyenda'] }
    ];
    /** Comidas: las cuatro primeras se ganan con misiones; los caprichos se compran con Rombos. */
    const FOOD = {
        merienda: { name: 'Merienda', icon: '🍎', food: 35, fun: 0, desc: 'La que trae Nexito cada día. Gratis.' },
        galleta: { name: 'Galleta', icon: '🍪', food: 35, fun: 0, desc: 'Misión fácil completada.' },
        bocadillo: { name: 'Bocadillo', icon: '🥪', food: 50, fun: 5, desc: 'Misión media completada.' },
        tarta: { name: 'Tarta', icon: '🎂', food: 70, fun: 15, desc: 'Misión difícil completada.' },
        banquete: { name: 'Banquete', icon: '🍽', food: 100, fun: 30, happy: 24, desc: 'Misión semanal: lo llena y lo pone feliz 24 h.' },
        helado: { name: 'Helado', icon: '🍦', food: 40, fun: 20, price: 50, desc: 'Capricho de la tienda.' },
        pizza: { name: 'Pizza', icon: '🍕', food: 60, fun: 10, price: 80, desc: 'Capricho de la tienda.' }
    };
    const TIER_FOOD = { easy: 'galleta', medium: 'bocadillo', hard: 'tarta', weekly: 'banquete' };
    const SLOTS = { 'pet-hat': 'Sombrero', 'pet-glasses': 'Gafas', 'pet-scarf': 'Cuello', 'pet-dome': 'Cúpula', 'pet-base': 'Pedestal' };
    const MOODS = {
        happy: { label: 'Feliz', tone: 'good' },
        content: { label: 'Contento', tone: 'good' },
        hungry: { label: 'Hambriento', tone: 'warn' },
        bored: { label: 'Aburrido', tone: 'warn' },
        tired: { label: 'Cansado', tone: 'warn' },
        sleepy: { label: 'Dormido', tone: 'calm' },
        rested: { label: 'Descansado', tone: 'good' },
        sad: { label: 'Un poco triste', tone: 'warn' }
    };
    // Frases: siempre en positivo, nunca culpa
    const LINES = {
        happy: ['¡Qué bien lo estamos pasando!', '¡Hoy estoy a tope!', '¿Otra partida? ¡Venga!', '¡Eres mi jugador favorito!'],
        content: ['¡Vamos a jugar un rato!', '¿A qué jugamos hoy?', 'Me apetece probar algo nuevo.'],
        hungry: ['¿Merendamos algo?', 'Mmm… ¿huele a galleta?', 'Una misión y una comidita, ¿hace?'],
        bored: ['¿Y si probamos otro juego?', '¡Me apetece una partida!', 'Hace tiempo que no jugamos a algo distinto.'],
        tired: ['Uf, qué maratón. ¿Pausa?', 'Llevamos un buen rato. ¡Estírate un poco!', 'Un descanso y seguimos, ¿vale?'],
        sleepy: ['Zzz…', 'Zzz… cinco minutitos más…', 'Zzz… soñando con rombos…'],
        rested: ['¡Qué bien me ha sentado la pausa!', '¡Recargado y listo!', '¡Hola otra vez! ¿Jugamos?'],
        sad: ['¡Qué bien que hayas vuelto!', '¡Hola! Te estaba esperando para jugar.', '¿Una partida para empezar?'],
        welcome: ['¡Qué bien que hayas vuelto!', '¡Empezamos otra racha juntos!'],
        cared: ['¡Hoy, cuidado! ¡Hasta mañana!', '¡Un día más juntos!', '¡Racha al día!']
    };

    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
    const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
    const weekKey = (t) => { const x = new Date(t); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return dayKey(x); };
    const emit = (n, p) => Nexus.bus.emit(n, p || {});

    // ── Reloj: hora del servidor cuando la hay (core/backend.js fija el desfase) ──
    const clock = Nexus.clock = Nexus.clock || { offset: 0, now() { return Date.now() + this.offset; } };

    const Pet = {
        STAGES, MILESTONES, FOOD, TIER_FOOD, SLOTS, MOODS, MAX_SHIELDS, SHIELD_PRICE, VACATION_DAYS, RESCUE_EVERY, RATE,

        now() { return clock.now(); },
        data() { const r = RW() && RW().data(); return r ? r.pet : null; },

        // ── Tiempo ──────────────────────────────────────────
        /** Aplica el paso del tiempo y cierra los días pasados. Devuelve el estado. Seguro de llamar a menudo. */
        tick(now = this.now()) {
            const p = this.data(); if (!p) return null;
            if (!p.tick || p.tick > now + 5 * 60e3) p.tick = now;            // primera vez, o reloj atrasado
            const h = Math.min(MAX_HOURS, Math.max(0, (now - p.tick) / 36e5));
            if (h > 0) {
                const n = p.needs;
                n.food = clamp(n.food - RATE.food * h);
                n.fun = clamp(n.fun - RATE.fun * h);
                n.rest = clamp(n.rest + RATE.rest * h);
                p.tick = now;
            }
            if (p.tiredAt && p.lastPlay && now - p.lastPlay >= RESTED_AFTER) { p.tiredAt = 0; p.restedUntil = now + 30 * 60e3; emit('pet:rested'); }
            this._closeDays(dayKey(now), now);
            this._shields(now);
            return p;
        },
        /** Cierra cada día entre el último visto y hoy: escudo, peligro o rotura. */
        _closeDays(today) {
            const p = this.data(), st = p.streak;
            if (!p.today.day) { p.today = this._newDay(today); return; }
            if (p.today.day >= today) return;
            let d = p.today.day, guard = 0;
            while (d < today && guard++ < 400) {
                const cared = st.last === d;
                if (st.danger && d === addDays(st.danger, 1)) {
                    // Terminó el día de rescate sin rescatar: la racha vuelve a 0 (o a 1 si ese día se cuidó)
                    const caredThatDay = p.today.day === d && p.today.cared;
                    const lost = st.count;
                    st.danger = ''; st.count = caredThatDay ? 1 : 0; if (caredThatDay) st.last = d;
                    if (lost > 0) emit('pet:broken', { lost });
                } else if (!cared && st.count > 0) {
                    if (this.onVacation(d)) { st.last = d; }
                    else if (st.shields > 0) { st.shields--; st.last = d; st.shieldLog.unshift(d); st.shieldLog.length = Math.min(st.shieldLog.length, 10); emit('pet:shield', { day: d, left: st.shields }); }
                    else if (this.canRescue(addDays(d, 1))) { st.danger = d; emit('pet:danger', { day: d }); }
                    else { const lost = st.count; st.count = 0; emit('pet:broken', { lost }); }
                }
                d = addDays(d, 1);
            }
            p.today = this._newDay(today);
        },
        _newDay(day) { return { day, played: false, fed: false, cared: false, snack: true }; },
        /** Un escudo gratis cada lunes (máx. 2). */
        _shields(now) {
            const st = this.data().streak, wk = weekKey(now);
            if (st.shieldWeek === wk) return;
            if (st.shieldWeek) st.shields = Math.min(MAX_SHIELDS, st.shields + 1);
            st.shieldWeek = wk;
        },

        // ── Cuidar ──────────────────────────────────────────
        /** Tras cada partida (services/progress.js). */
        onGame(e) {
            const p = this.data(); if (!p) return null;
            const now = e.at || this.now();
            this.tick(now);
            const n = p.needs, wasNew = p.lastGame && p.lastGame !== e.game;
            n.fun = clamp(n.fun + FUN_PER_GAME + (wasNew ? FUN_NEW_GAME : 0));
            const secs = Math.max(0, e.time || 0);
            n.rest = clamp(n.rest - Math.max(REST_MIN_PER_GAME, REST_PER_15MIN * secs / 900));
            // Sesión de juego seguido: sugerir pausa a los 45 min (sin bloquear nada)
            if (!p.sessionStart || !p.lastPlay || now - secs * 1000 - p.lastPlay > SESSION_GAP) p.sessionStart = now - secs * 1000;
            p.lastPlay = now; p.lastGame = e.game; p.restedUntil = 0;
            let tired = false;
            if (!p.tiredAt && now - p.sessionStart >= TIRED_AFTER) { p.tiredAt = now; tired = true; emit('pet:tired'); }
            p.today.played = true;
            const credited = this._credit(now);
            emit('pet:change', { kind: 'game' });
            return { fun: FUN_PER_GAME + (wasNew ? FUN_NEW_GAME : 0), credited, tired, needFood: !p.today.fed, hidden: p.hidden };
        },
        /** Dar de comer. kind: merienda (gratis 1/día) o una del inventario. */
        feed(kind, now = this.now()) {
            const p = this.data(), f = FOOD[kind]; if (!p || !f) return { ok: false, error: 'Esa comida no existe.' };
            this.tick(now);
            if (kind === 'merienda') { if (!p.today.snack) return { ok: false, error: 'La merienda de hoy ya está comida.' }; p.today.snack = false; }
            else { if (!(p.food[kind] > 0)) return { ok: false, error: `No te quedan: ${f.name}.` }; p.food[kind]--; }
            p.needs.food = clamp(p.needs.food + f.food);
            p.needs.fun = clamp(p.needs.fun + f.fun);
            if (f.happy) p.happyUntil = now + f.happy * 36e5;
            p.today.fed = true;
            p.stats.fed++;
            const h = new Date(now).getHours();
            if (h >= 0 && h < 5) p.stats.nightFeeds++;
            const credited = this._credit(now);
            U().saveData();
            emit('pet:change', { kind: 'feed', food: kind });
            this._checkAch(now);
            return { ok: true, food: f, credited };
        },
        /** Suma el día a la racha en cuanto se cumplen las dos cosas. */
        _credit(now) {
            const p = this.data(), st = p.streak, today = dayKey(now);
            if (!p.today.played || !p.today.fed || p.today.cared) return null;
            p.today.cared = true;
            p.caredDays++;
            const before = this.stage().id;
            if (st.danger) { emit('pet:cared', { pending: true }); this._evolve(before); return { pending: true }; }   // cuenta cuando se rescate
            st.count = st.last === addDays(today, -1) ? st.count + 1 : 1;
            st.last = today;
            st.best = Math.max(st.best, st.count);
            const prizes = this._milestone(st.count);
            emit('pet:cared', { count: st.count, prizes });
            this._evolve(before);
            this._checkAch(now);
            return { count: st.count, prizes };
        },
        _evolve(before) {
            const now = this.stage();
            if (now.id !== before) { this.data().stageSeen = ''; emit('pet:evolve', { stage: now }); }
        },
        _milestone(count) {
            const m = MILESTONES.find(x => x.days === count), p = this.data();
            if (!m || p.streak.milestones.includes(count)) return null;
            p.streak.milestones.push(count);
            const got = [];
            if (m.rombos) { const n = RW().earn(m.rombos, `Racha de Nexito: ${count} días`, { double: false }); got.push({ kind: 'rombos', n, name: `${m.rombos} Rombos` }); }
            if (m.shield) { p.streak.shields = Math.min(MAX_SHIELDS + m.shield, p.streak.shields + m.shield); got.push({ kind: 'shield', name: 'Escudo de racha' }); }
            (m.items || []).forEach(id => { const it = RW().grant(id, `Racha de Nexito: ${count} días`); if (it) got.push(it); });
            emit('pet:milestone', { days: count, got });
            return got;
        },
        /** Misión completada (services/rewards.js): una comida según la dificultad. */
        giveFood(tier) {
            const p = this.data(), kind = TIER_FOOD[tier]; if (!p || !kind) return null;
            p.food[kind] = Math.min(99, (p.food[kind] || 0) + 1);
            emit('pet:change', { kind: 'food', food: kind });
            return kind;
        },
        /** Las 3 misiones diarias hechas: si la racha está en peligro, se rescata. */
        onAllMissions(now = this.now()) {
            const p = this.data(); if (!p) return false;
            const st = p.streak, today = dayKey(now);
            if (!st.danger || today !== addDays(st.danger, 1)) return false;
            st.last = st.danger; st.danger = ''; st.rescueUsed = today;
            if (p.today.cared) {            // el día ya estaba cuidado: ahora sí cuenta
                st.count = st.count + 1; st.last = today; st.best = Math.max(st.best, st.count); this._milestone(st.count);
            }
            emit('pet:rescued', { count: st.count });
            U().saveData();
            return true;
        },
        canRescue(day) {
            const st = this.data().streak;
            return !st.rescueUsed || daysBetween(st.rescueUsed, day) >= RESCUE_EVERY;
        },

        // ── Tienda de Nexito ────────────────────────────────
        buyShield() {
            const p = this.data(); if (!p) return { ok: false, error: 'Inicia sesión.' };
            if (p.streak.shields >= MAX_SHIELDS) return { ok: false, error: `Ya tienes ${MAX_SHIELDS} escudos, el máximo.` };
            if (!RW().spend(SHIELD_PRICE, 'Nexito: escudo de racha')) return { ok: false, error: `Te faltan ${SHIELD_PRICE - RW().balance()} Rombos.` };
            p.streak.shields++; U().saveData(); emit('pet:change', { kind: 'shield' });
            return { ok: true };
        },
        buyTreat(kind) {
            const p = this.data(), f = FOOD[kind]; if (!p || !f || !f.price) return { ok: false, error: 'No está a la venta.' };
            if ((p.food[kind] || 0) >= 99) return { ok: false, error: 'Ya tienes muchos.' };
            if (!RW().spend(f.price, `Nexito: ${f.name}`)) return { ok: false, error: `Te faltan ${f.price - RW().balance()} Rombos.` };
            p.food[kind] = (p.food[kind] || 0) + 1; U().saveData(); emit('pet:change', { kind: 'treat' });
            return { ok: true, food: f };
        },

        // ── Vestir ──────────────────────────────────────────
        outfit() { const o = {}; Object.keys(SLOTS).forEach(k => { o[k] = RW() ? RW().equipped(k) : ''; }); return o; },
        equip(slot, id) {
            if (!SLOTS[slot] || !RW().equip(slot, id)) return false;
            return true;
        },

        // ── Caricias y despertar ────────────────────────────
        poke(now = this.now()) {
            const p = this.data(); if (!p) return null;
            const was = this.mood(now).id;
            if (was === 'sleepy') { p.stats.wakes++; p.wokeUntil = now + 2 * 60e3; }
            p.stats.pokes++;
            U().saveData(); this._checkAch(now);
            return was;
        },

        // ── Estado ──────────────────────────────────────────
        stage(days) {
            const n = days === undefined ? (this.data() || { caredDays: 0 }).caredDays : days;
            let s = STAGES[0];
            for (const x of STAGES) if (n >= x.at) s = x;
            return s;
        },
        nextStage() { const s = this.stage(); return STAGES[STAGES.indexOf(s) + 1] || null; },
        nextMilestone() { const st = (this.data() || {}).streak || { count: 0 }; return MILESTONES.find(m => m.days > st.count) || null; },
        mood(now = this.now()) {
            const p = this.data(); if (!p) return Object.assign({ id: 'content' }, MOODS.content);
            const n = p.needs, h = new Date(now).getHours();
            const pick = (id) => Object.assign({ id }, MOODS[id]);
            if (p.happyUntil > now) return pick('happy');
            if (p.restedUntil > now) return pick('rested');
            if (!(p.wokeUntil > now) && ((h >= 1 && h < 7 && !(p.lastPlay > now - 30 * 60e3)) || n.rest < 20)) return pick('sleepy');
            if (n.food < 25 && n.fun < 25 && n.rest < 40) return pick('sad');
            const min = Math.min(n.food, n.fun, n.rest);
            if (min > 75) return pick('happy');
            if (min >= 50) return pick('content');
            if (min === n.food) return pick('hungry');
            if (min === n.fun) return pick('bored');
            return pick('tired');
        },
        /** Frase del bocadillo: cambia cada media hora, siempre la misma en ese rato. */
        line(now = this.now()) {
            const p = this.data();
            let key = this.mood(now).id;
            if (p && p.today.cared && (key === 'content' || key === 'happy')) key = 'cared';
            const list = LINES[key] || LINES.content;
            return list[Math.floor(now / 18e5) % list.length];
        },
        /** Lo que falta hoy para sumar el día. */
        todo() {
            const p = this.data(); if (!p) return null;
            return { played: p.today.played, fed: p.today.fed, cared: p.today.cared, danger: p.streak.danger, snack: p.today.snack };
        },
        streak() { const p = this.data(); return p ? p.streak : null; },
        name() { const p = this.data(); return (p && p.name) || 'Nexito'; },
        rename(name) {
            const v = String(name || '').trim();
            if (!NAME_RE.test(v)) return { ok: false, error: 'Entre 2 y 16 letras, números, espacios, guiones o guiones bajos.' };
            this.data().name = v; U().saveData(); emit('pet:change', { kind: 'name' }); return { ok: true };
        },
        setHidden(v) { const p = this.data(); p.hidden = !!v; U().saveData(); emit('pet:change', { kind: 'hidden' }); },
        setAlerts(v) { const p = this.data(); p.noAlerts = !v; U().saveData(); },
        isHidden() { const p = this.data(); return !!(p && p.hidden); },

        // ── Vacaciones ──────────────────────────────────────
        onVacation(day) { const v = (this.data() || {}).vacation || {}; return !!(v.from && day >= v.from && day <= v.to); },
        vacationLeft(now = this.now()) { const v = this.data().vacation, y = String(new Date(now).getFullYear()); return VACATION_DAYS - (v.year === y ? v.used : 0); },
        /** Congela la racha desde mañana durante n días. */
        startVacation(n, now = this.now()) {
            const p = this.data(), v = p.vacation, y = String(new Date(now).getFullYear());
            n = Math.floor(n);
            if (v.year !== y) { v.year = y; v.used = 0; }
            if (!(n >= 1) || n > VACATION_DAYS - v.used) return { ok: false, error: `Te quedan ${VACATION_DAYS - v.used} días de vacaciones este año.` };
            const from = addDays(dayKey(now), 1);
            v.from = from; v.to = addDays(from, n - 1); v.used += n;
            U().saveData(); emit('pet:change', { kind: 'vacation' });
            return { ok: true, from: v.from, to: v.to };
        },
        stopVacation(now = this.now()) {
            const p = this.data(), v = p.vacation; if (!v.from) return;
            const today = dayKey(now);
            if (v.from > today) { v.used -= daysBetween(v.from, v.to) + 1; v.from = v.to = ''; }       // aún no había empezado
            else { v.used -= Math.max(0, daysBetween(today, v.to)); v.to = addDays(today, -1); if (v.to < v.from) v.from = v.to = ''; }
            U().saveData(); emit('pet:change', { kind: 'vacation' });
        },

        _checkAch(now = this.now()) { if (A()) A().check({ game: 'nexito', mode: 'pet', at: now }); },

        /** Al iniciar sesión y al volver a la pestaña. */
        sync() { if (!this.data()) return; this.tick(); U().saveData(); emit('pet:change', { kind: 'sync' }); }
    };

    Nexus.services.pet = Pet;
    Nexus.bus.on('user:login', () => setTimeout(() => Pet.sync(), 0));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && U() && U().isLoggedIn && U().isLoggedIn()) Pet.sync(); });
})();
