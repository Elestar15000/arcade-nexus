/* ============================================================
   NEXUS ARCADE · services/achievements.js
   Sistema de logros.
   - Los logros generales se definen aquí; cada juego registra
     los suyos con `Nexus.services.achievements.register([...])`.
   - Un logro es:
       { id, game, name, desc, icon, rarity, test(ctx), progress?(ctx),
         best?(ctx), hidden?, hint?, title?, reward?, window? }
     donde ctx = { data, stats, event }  (event es null si se
     evalúa sin partida, p. ej. al iniciar sesión).
       · progress → barra { value, target } (logros de contador)
       · best     → «mejor intento» { value, target, label, lower? }
       · hidden   → secreto: se ve como «???» con su `hint`
       · title    → id de un título que se gana al desbloquearlo
       · reward   → id de un cosmético que se gana al desbloquearlo
       · window   → logro de evento: { from:'MM-DD', to:'MM-DD', event }
   - Cada logro da XP, Rombos y puntos de logro según su rareza.
   - Escaleras: grupos de logros de contador que se muestran como un
     trofeo con grados (Bronce → Nexus). Los ids no cambian.
   - Maestría: completar todos los logros de un juego.
   ============================================================ */
(function () {
    'use strict';

    const RARITY = {
        common:    { label: 'Común',      xp: 25,  rombos: 10,  points: 10,  order: 0 },
        rare:      { label: 'Raro',       xp: 60,  rombos: 25,  points: 25,  order: 1 },
        epic:      { label: 'Épico',      xp: 120, rombos: 60,  points: 50,  order: 2 },
        legendary: { label: 'Legendario', xp: 300, rombos: 150, points: 100, order: 3 }
    };
    const GRADES = [
        { id: 'bronze',   name: 'Bronce',  color: '#d08a4b' },
        { id: 'silver',   name: 'Plata',   color: '#c7d0de' },
        { id: 'gold',     name: 'Oro',     color: '#FFD43B' },
        { id: 'platinum', name: 'Platino', color: '#7fe3f0' },
        { id: 'nexus',    name: 'Nexus',   color: '#FFD43B' }
    ];

    const defs = [];
    const byId = new Map();
    const byGame = new Map();

    /** Atajo para logros de contador: { value, target } + test automático. */
    function counter(valueFn, target) {
        return {
            progress: (ctx) => ({ value: Math.min(target, valueFn(ctx)), target }),
            test: (ctx) => valueFn(ctx) >= target
        };
    }

    // ── Escaleras (logros de contador agrupados en grados) ──
    const LADDERS = [
        { id: 'ld-games', game: 'general', name: 'Jugón', grades: ['first_game', 'games_10', 'games_50', 'games_200'] },
        { id: 'ld-wins', game: 'general', name: 'Ganador', grades: ['wins_1', 'wins_25', 'wins_100'] },
        { id: 'ld-level', game: 'general', name: 'Escalador', grades: ['level_5', 'level_10', 'level_20'] },
        { id: 'ld-days', game: 'general', name: 'Inseparables', grades: ['days_3', 'days_7', 'pet_30', 'pet_100', 'pet_365'] },
        { id: 'ld-wordle', game: 'wordle', name: 'Palabrero', grades: ['wd_win_1', 'wd_win_10', 'wd_win_50'] },
        { id: 'ld-rosco', game: 'pasapalabra', name: 'Roscos superados', grades: ['pp_win_1', 'pp_win_10', 'pp_win_40'] },
        { id: 'ld-snake-len', game: 'snake', name: 'Longitud', grades: ['sn_len15', 'sn_len40'] },
        { id: 'ld-snake-score', game: 'snake', name: 'Puntuación neón', grades: ['sn_score2k', 'sn_score6k'] },
        { id: 'ld-pm-level', game: 'pacman', name: 'Niveles del laberinto', grades: ['pm_level3', 'pm_level6'] },
        { id: 'ld-pm-score', game: 'pacman', name: 'Puntuación del laberinto', grades: ['pm_score10k', 'pm_score30k'] },
        { id: 'ld-rally', game: 'pong', name: 'Peloteo', grades: ['pg_rally15', 'pg_rally30'] },
        { id: 'ld-2048', game: 'g2048', name: 'Fichas', grades: ['g2_512', 'g2_2048', 'g2_4096'] },
        { id: 'ld-combo', game: 'minesweeper', name: 'Combos cuánticos', grades: ['ms_combo10', 'ms_combo20'] }
    ];
    const LADDER_OF = new Map();
    LADDERS.forEach(l => l.grades.forEach((id, i) => LADDER_OF.set(id, { ladder: l, index: i })));

    // ── «Mejor intento» para logros de una sola vez con objetivo numérico ──
    const bestScore = (game, target) => (c) => ({ value: (c.data.stats[game] || {}).bestScore || 0, target, label: 'Mejor puntuación' });
    const BEST = {
        sn_score2k: bestScore('snake', 2000), sn_score6k: bestScore('snake', 6000),
        pm_score10k: bestScore('pacman', 10000), pm_score30k: bestScore('pacman', 30000),
        tt_score20k: bestScore('tetris', 20000), ms_score5k: bestScore('minesweeper', 5000)
    };

    const mmdd = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const inWindow = (w, at) => {
        if (!w) return true;
        const k = mmdd(new Date(at || Date.now()));
        return w.from <= w.to ? (k >= w.from && k <= w.to) : (k >= w.from || k <= w.to);   // ventanas que cruzan el año (Navidad)
    };

    /** Rareza real: % de jugadores que tienen cada logro (lo calcula el ranking). */
    let realPct = null;   // { id: pct } | null
    let realPlayers = 0;
    const MIN_PLAYERS_FOR_REAL = 20;
    const tierFromPct = (p) => (p >= 50 ? 'common' : p >= 20 ? 'rare' : p >= 5 ? 'epic' : 'legendary');

    const Achievements = {
        RARITY, GRADES, LADDERS, counter,

        register(list) {
            for (const d of list) {
                if (byId.has(d.id)) { console.warn('[achievements] id duplicado:', d.id); continue; }
                const def = Object.assign({ game: 'general', rarity: 'common', icon: '🏅' }, d);
                if (!def.best && BEST[def.id]) def.best = BEST[def.id];
                const R = RARITY[def.rarity] || RARITY.common;
                def.xp = R.xp; def.rombos = R.rombos; def.points = R.points;
                defs.push(def);
                byId.set(def.id, def);
                if (!byGame.has(def.game)) byGame.set(def.game, []);
                byGame.get(def.game).push(def);
            }
        },

        all() { return defs.slice(); },
        get(id) { return byId.get(id); },
        ofGame(game) { return (byGame.get(game) || []).slice(); },

        unlockedMap() {
            const data = Nexus.services.users.data();
            return data ? data.achievements : {};
        },
        isUnlocked(id) { return !!this.unlockedMap()[id]; },
        countUnlocked() { return Object.keys(this.unlockedMap()).filter(id => byId.has(id)).length; },

        /** ¿Está activo? (los de evento sólo durante su ventana, salvo que ya se tengan) */
        isActive(def, at) { return !def.window || inWindow(def.window, at) || this.isUnlocked(def.id); },
        /** Logros que cuentan para el total (los de evento sólo si están activos o se consiguieron). */
        visible() { return defs.filter(d => this.isActive(d)); },
        points() { const u = this.unlockedMap(); return defs.reduce((s, d) => s + (u[d.id] ? d.points : 0), 0); },
        pointsOf(map) { return defs.reduce((s, d) => s + (map && map[d.id] ? d.points : 0), 0); },

        ladderOf(id) { return LADDER_OF.get(id) || null; },
        gradeOf(id) { const l = LADDER_OF.get(id); return l ? GRADES[Math.min(GRADES.length - 1, l.index)] : null; },

        /** Maestría de un juego: { got, total, done } (sin contar logros de evento). */
        mastery(game, map) {
            map = map || this.unlockedMap();
            const list = this.ofGame(game).filter(d => !d.window);
            const got = list.filter(d => map[d.id]).length;
            return { got, total: list.length, done: list.length > 0 && got === list.length };
        },

        _ctx(event) {
            const data = Nexus.services.users.data();
            return { data, event: event || null, stats: (id) => (data.stats[id] || Nexus.schema.gameStats()) };
        },

        /** Progreso de un logro bloqueado: { value, target, label?, lower? } o null. */
        progressOf(def) {
            const fn = def.progress || def.best;
            if (!fn) return null;
            try {
                const p = fn(this._ctx(null));
                if (!p || !p.target) return null;
                return Object.assign({ best: !def.progress }, p);
            } catch (e) { return null; }
        },
        /** 0…1: lo cerca que está (los de «mejor intento» nunca llegan a 1 sin desbloquearse). */
        ratioOf(def) {
            const p = this.progressOf(def);
            if (!p) return 0;
            const r = p.lower ? (p.value ? p.target / p.value : 0) : p.value / p.target;
            return Math.max(0, Math.min(0.99, r));
        },

        /** Los n logros bloqueados más cercanos (el seguido, primero). Opcional: de un juego. */
        near(n = 3, game) {
            const u = this.unlockedMap(), tracked = Nexus.services.rewards ? Nexus.services.rewards.tracked() : '';
            const list = defs.filter(d => !u[d.id] && !d.hidden && this.isActive(d) && (!game || d.game === game))
                .map(d => ({ def: d, ratio: this.ratioOf(d), prog: this.progressOf(d) }))
                .filter(x => x.prog && x.ratio > 0 || x.def.id === tracked);
            list.sort((a, b) => (b.def.id === tracked) - (a.def.id === tracked) || b.ratio - a.ratio || RARITY[a.def.rarity].order - RARITY[b.def.rarity].order);
            return list.slice(0, n);
        },

        // ── Rareza real ─────────────────────────────────────
        setRealRarity(pctMap, players) { realPct = pctMap; realPlayers = players | 0; },
        /** % real de jugadores que lo tienen (sólo con muestra suficiente; con pocos jugadores no significa nada). */
        realPct(id) { return realPct && realPlayers >= MIN_PLAYERS_FOR_REAL ? (realPct[id] || 0) : null; },
        /** Rareza que se muestra: real si hay jugadores suficientes; si no, la fija del logro. */
        rarityOf(def) {
            const p = this.realPct(def.id);
            return p !== null && realPlayers >= MIN_PLAYERS_FOR_REAL ? tierFromPct(p) : def.rarity;
        },

        /**
         * Evalúa los logros pendientes. Tras una partida sólo se miran los generales,
         * los del juego de la partida y los «meta» (que dependen de otros logros); al
         * iniciar sesión, todos. Repite mientras se sigan desbloqueando.
         */
        check(event) {
            const users = Nexus.services.users;
            const data = users.data();
            if (!data) return [];
            const unlocked = [];
            let evt = event || null;
            let again = true;
            const pool = event ? defs.filter(d => d.game === 'general' || d.game === event.game || d.meta) : defs;

            while (again) {
                again = false;
                const ctx = this._ctx(evt);
                for (const def of pool) {
                    if (data.achievements[def.id]) continue;
                    if (def.window && !inWindow(def.window, evt ? evt.at : Date.now())) continue;
                    let ok = false;
                    try { ok = !!def.test(ctx); } catch (e) { console.error('[achievements]', def.id, e); }
                    if (ok) {
                        data.achievements[def.id] = Date.now();
                        Nexus.services.progress.addXP(def.xp);
                        if (Nexus.services.rewards) Nexus.services.rewards.onAchievement(def);
                        unlocked.push(def);
                        again = true;
                    }
                }
                evt = null; // en la segunda pasada sólo logros "de estado"
            }

            if (unlocked.length) {
                if (Nexus.services.rewards) Nexus.services.rewards.checkMastery(unlocked);
                users.saveData();
                // Tras una partida los logros se celebran en el modal de resultados; fuera de una
                // partida, cada uno con su celebración según la rareza.
                if (!event) {
                    unlocked.forEach((def, i) => setTimeout(() => {
                        Nexus.bus.emit('achievement:unlock', def);
                    }, 600 + i * 1400));
                }
            }
            return unlocked;
        },

        /** Re-evalúa en silencio al iniciar sesión (p. ej. tras sincronizar con el servidor). */
        evaluateSilently() {
            const data = Nexus.services.users.data();
            if (!data) return;
            this.check(null);
        }
    };

    Nexus.services.achievements = Achievements;

    // ── Logros generales ────────────────────────────────────
    const totalPlayed = (c) => Nexus.services.progress.totals(c.data).played;
    const totalWins = (c) => Nexus.services.progress.totals(c.data).wins;
    const R = (c) => (c.data.rewards || {});
    const PET = (c) => (R(c).pet || {});
    const petBest = (c) => ((PET(c).streak || {}).best || 0);
    const today = (c) => (R(c).today || {});

    Achievements.register([
        { id: 'first_game', name: 'Primeros pasos', desc: 'Juega tu primera partida.', icon: '👣', rarity: 'common',
            ...counter(totalPlayed, 1) },
        { id: 'games_10', name: 'Jugón', desc: 'Juega 10 partidas.', icon: '🎲', rarity: 'common',
            ...counter(totalPlayed, 10) },
        { id: 'games_50', name: 'Adicto al arcade', desc: 'Juega 50 partidas.', icon: '🕹️', rarity: 'rare',
            ...counter(totalPlayed, 50) },
        { id: 'games_200', name: 'Leyenda de los recreativos', desc: 'Juega 200 partidas.', icon: '🏛️', rarity: 'epic',
            ...counter(totalPlayed, 200) },
        { id: 'wins_1', name: 'Sabor a victoria', desc: 'Gana tu primera partida.', icon: '🥇', rarity: 'common',
            ...counter(totalWins, 1) },
        { id: 'wins_25', name: 'Imparable', desc: 'Acumula 25 victorias.', icon: '🏆', rarity: 'rare',
            ...counter(totalWins, 25) },
        { id: 'wins_100', name: 'Campeón', desc: 'Acumula 100 victorias.', icon: '👑', rarity: 'legendary', title: 't-campeon',
            ...counter(totalWins, 100) },
        { id: 'level_5', name: 'Subiendo', desc: 'Alcanza el nivel 5.', icon: '⬆️', rarity: 'common',
            ...counter((c) => c.data.xp.level, 5) },
        { id: 'level_10', name: 'Cuesta arriba', desc: 'Alcanza el nivel 10.', icon: '🚀', rarity: 'rare',
            ...counter((c) => c.data.xp.level, 10) },
        { id: 'level_20', name: 'En la cima', desc: 'Alcanza el nivel 20.', icon: '🏔️', rarity: 'epic',
            ...counter((c) => c.data.xp.level, 20) },
        // Racha de Nexito (services/pet.js): 1 partida + 1 comida al día
        { id: 'days_3', name: 'Constancia', desc: 'Cuida a Nexito 3 días seguidos.', icon: '📆', rarity: 'common',
            ...counter(petBest, 3) },
        { id: 'days_7', name: 'Semana perfecta', desc: 'Cuida a Nexito 7 días seguidos.', icon: '🔥', rarity: 'epic',
            ...counter(petBest, 7) },
        { id: 'pet_30', name: 'Un mes juntos', desc: 'Cuida a Nexito 30 días seguidos.', icon: '💛', rarity: 'epic',
            ...counter(petBest, 30) },
        { id: 'pet_100', name: 'Inseparables', desc: 'Cuida a Nexito 100 días seguidos.', icon: '🏅', rarity: 'legendary',
            ...counter(petBest, 100) },
        { id: 'pet_365', name: 'Un año con Nexito', desc: 'Cuida a Nexito 365 días seguidos.', icon: '👑', rarity: 'legendary',
            ...counter(petBest, 365) },
        { id: 'explorer', name: 'Explorador', desc: 'Juega a todos los juegos disponibles.', icon: '🧭', rarity: 'rare', title: 't-explorador',
            progress: (c) => {
                const games = Nexus.games.registry.available();
                const done = games.filter(g => (c.data.stats[g.id] || {}).played > 0).length;
                return { value: done, target: games.length };
            },
            test: (c) => {
                const games = Nexus.games.registry.available();
                return games.length > 0 && games.every(g => (c.data.stats[g.id] || {}).played > 0);
            } },
        { id: 'night_owl', name: 'Búho nocturno', desc: 'Termina una partida entre las 00:00 y las 05:00.', icon: '🦉', rarity: 'rare',
            test: (c) => !!c.event && new Date(c.event.at).getHours() < 5 },
        { id: 'hour_played', name: 'Una hora de diversión', desc: 'Acumula 1 hora de juego.', icon: '⏳', rarity: 'rare',
            ...counter((c) => Math.floor(c.data.meta.playTime / 60), 60) },
        { id: 'collector', name: 'Coleccionista', desc: 'Desbloquea 10 logros.', icon: '🗂️', rarity: 'epic', meta: true, title: 't-coleccionista',
            ...counter(() => Achievements.countUnlocked(), 10) },
        { id: 'collector_50', name: 'Vitrina llena', desc: 'Desbloquea 50 logros.', icon: '🏛️', rarity: 'legendary', meta: true, reward: 'fr-legend',
            ...counter(() => Achievements.countUnlocked(), 50) },
        { id: 'missions_10', name: 'Misión cumplida', desc: 'Completa 10 misiones.', icon: '🎯', rarity: 'rare', meta: true,
            ...counter((c) => (R(c).missions || {}).completed || 0, 10) },
        { id: 'mission_streak_7', name: 'Disciplina', desc: 'Llega a una racha de 7 días completando las misiones diarias.', icon: '🔥', rarity: 'epic', meta: true,
            ...counter((c) => ((R(c).missions || {}).streak || {}).best || 0, 7) },
        { id: 'mastery_1', name: 'Maestro', desc: 'Consigue la Maestría de un juego (todos sus logros).', icon: '👑', rarity: 'legendary', meta: true,
            ...counter((c) => Object.keys(R(c).mastery || {}).length, 1) }
    ]);

    // ── Logros secretos ─────────────────────────────────────
    const isNight = (at) => new Date(at).getHours() < 5;
    Achievements.register([
        { id: 'sx_kamikaze', name: 'Kamikaze', desc: 'Pierde en Snake en 3 segundos o menos.', hint: 'Las paredes también son tuyas', hidden: true,
            icon: '💥', rarity: 'rare', title: 't-kamikaze',
            test: (c) => !!c.event && c.event.game === 'snake' && !c.event.won && c.event.time <= 3 },
        { id: 'sx_self', name: 'Yo contra mí', desc: 'Bate tu propio récord en 3 juegos distintos el mismo día.', hint: 'El rival más duro', hidden: true,
            icon: '🪞', rarity: 'epic', test: (c) => (today(c).records || []).length >= 3 },
        { id: 'sx_night7', name: 'Noctámbulo de verdad', desc: 'Juega 7 noches distintas entre las 00:00 y las 05:00.', hint: 'Cuando todos duermen…', hidden: true,
            icon: '🌙', rarity: 'epic', title: 't-insomne', test: (c) => (R(c).nights || []).length >= 7 },
        { id: 'sx_marathon', name: 'Maratón', desc: 'Juega 25 partidas en un mismo día.', hint: 'Un día muy, muy largo', hidden: true,
            icon: '🏃', rarity: 'epic', title: 't-maratoniano', test: (c) => (today(c).played || 0) >= 25 },
        { id: 'sx_allround', name: 'Todoterreno', desc: 'Juega a 8 juegos distintos en un mismo día.', hint: 'Un poco de todo', hidden: true,
            icon: '🧭', rarity: 'rare', test: (c) => (today(c).games || []).length >= 8 },
        { id: 'sx_comeback', name: 'Nunca te rindas', desc: 'Gana justo después de perder 10 partidas seguidas.', hint: 'Diez caídas, una victoria', hidden: true,
            icon: '💪', rarity: 'epic', test: (c) => !!c.event && c.event.won && (R(c).lostBefore || 0) >= 10 },
        { id: 'sx_early', name: 'Madrugador', desc: 'Termina una partida entre las 06:00 y las 07:00.', hint: 'Antes del café', hidden: true,
            icon: '☀️', rarity: 'rare', test: (c) => !!c.event && new Date(c.event.at).getHours() === 6 },
        { id: 'sx_weekend', name: 'Fin de semana gamer', desc: 'Juega un sábado y el domingo siguiente.', hint: 'Sábado y domingo', hidden: true,
            icon: '🎮', rarity: 'common', test: (c) => !!R(c).weekendBoth },
        { id: 'sx_flash', name: 'Visto y no visto', desc: 'Gana una partida en 10 segundos o menos.', hint: 'Parpadea y te lo pierdes', hidden: true,
            icon: '⚡', rarity: 'rare', test: (c) => !!c.event && c.event.won && c.event.time > 0 && c.event.time <= 10 },
        { id: 'sx_friday13', name: 'Viernes 13', desc: 'Juega un viernes 13.', hint: 'Un día de mala suerte', hidden: true,
            icon: '🎃', rarity: 'epic', test: (c) => { if (!c.event) return false; const d = new Date(c.event.at); return d.getDay() === 5 && d.getDate() === 13; } },
        { id: 'sx_zero', name: 'Cero patatero', desc: 'Termina 5 partidas con 0 puntos.', hint: 'Lo importante es participar', hidden: true,
            icon: '🥚', rarity: 'common', test: (c) => (R(c).zeroes || 0) >= 5 },
        { id: 'sx_pet_night', name: 'Merienda de medianoche', desc: 'Da de comer a Nexito entre las 0:00 y las 5:00.', hint: 'Nexito también tiene hambre de noche', hidden: true,
            icon: '🌙', rarity: 'rare', test: (c) => (PET(c).stats || {}).nightFeeds > 0 },
        { id: 'sx_pet_dress', name: 'De punta en blanco', desc: 'Viste a Nexito con sombrero, accesorio, ropa y cúpula a la vez.', hint: 'Nexito, de gala', hidden: true,
            icon: '🎩', rarity: 'epic', test: (c) => { const e = (R(c).cosmetics || {}).equipped || {}; return ['pet-hat', 'pet-glasses', 'pet-scarf', 'pet-dome'].every(k => !!e[k]); } },
        { id: 'sx_pet_wake', name: 'Despertador', desc: 'Despierta a Nexito 10 veces.', hint: 'Zzz…', hidden: true,
            icon: '⏰', rarity: 'rare', test: (c) => (PET(c).stats || {}).wakes >= 10 },
        { id: 'sx_secrets', name: 'Buscador de secretos', desc: 'Descubre 5 logros secretos.', hint: 'Hay más de lo que se ve', hidden: true, meta: true,
            icon: '🔮', rarity: 'legendary', reward: 'nx-aureola', title: 't-buscador',
            test: () => defs.filter(d => d.hidden && d.id !== 'sx_secrets' && Achievements.isUnlocked(d.id)).length >= 5 }
    ]);

    // ── Logros de evento (sólo durante su ventana) ──────────
    const evPlays = (key) => (c) => ((R(c).events || {})[key] || {}).played || 0;
    const evWins = (key, col) => (c) => (((R(c).events || {})[key] || {}).wins || {})[col] || 0;
    Achievements.register([
        { id: 'ev_halloween_5', name: 'Truco o trato', desc: 'Juega 5 partidas durante Halloween.', icon: '🎃', rarity: 'rare',
            window: { from: '10-25', to: '11-02', event: 'halloween' }, reward: 'av:rw-ghost', ...counter(evPlays('halloween'), 5) },
        { id: 'ev_halloween_pm', name: 'Noche de fantasmas', desc: 'Gana 3 partidas de Clásicos durante Halloween.', icon: '👻', rarity: 'epic',
            window: { from: '10-25', to: '11-02', event: 'halloween' }, title: 't-cazafantasmas', ...counter(evWins('halloween', 'clasicos'), 3) },
        { id: 'ev_xmas_10', name: 'Espíritu navideño', desc: 'Juega 10 partidas durante la Navidad.', icon: '🎁', rarity: 'rare',
            window: { from: '12-20', to: '01-06', event: 'navidad' }, reward: 'av:rw-xmas', ...counter(evPlays('navidad'), 10) },
        { id: 'ev_xmas_cards', name: 'Partida de Nochebuena', desc: 'Gana 3 partidas de Cartas durante la Navidad.', icon: '🃏', rarity: 'epic',
            window: { from: '12-20', to: '01-06', event: 'navidad' }, reward: 'nx-reno', ...counter(evWins('navidad', 'cartas'), 3) }
    ]);
    Achievements.isNight = isNight;
    Achievements.inWindow = inWindow;
})();
