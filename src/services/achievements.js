/* ============================================================
   NEXUS ARCADE · services/achievements.js
   Sistema de logros.
   - Los logros generales se definen aquí; cada juego registra
     los suyos con `Nexus.services.achievements.register([...])`.
   - Un logro es:
       { id, game, name, desc, icon, rarity, test(ctx), progress?(ctx) }
     donde ctx = { data, stats, event }  (event es null si se
     evalúa sin partida, p. ej. al iniciar sesión).
   ============================================================ */
(function () {
    'use strict';

    const RARITY = {
        common:    { label: 'Común',      xp: 25,  order: 0 },
        rare:      { label: 'Raro',       xp: 60,  order: 1 },
        epic:      { label: 'Épico',      xp: 120, order: 2 },
        legendary: { label: 'Legendario', xp: 300, order: 3 }
    };

    const defs = [];
    const byId = new Map();

    /** Atajo para logros de contador: { value, target } + test automático. */
    function counter(valueFn, target) {
        return {
            progress: (ctx) => ({ value: Math.min(target, valueFn(ctx)), target }),
            test: (ctx) => valueFn(ctx) >= target
        };
    }

    const Achievements = {
        RARITY, counter,

        register(list) {
            for (const d of list) {
                if (byId.has(d.id)) { console.warn('[achievements] id duplicado:', d.id); continue; }
                const def = Object.assign({ game: 'general', rarity: 'common', icon: '🏅' }, d);
                def.xp = RARITY[def.rarity].xp;
                defs.push(def);
                byId.set(def.id, def);
            }
        },

        all() { return defs.slice(); },
        get(id) { return byId.get(id); },

        unlockedMap() {
            const data = Nexus.services.users.data();
            return data ? data.achievements : {};
        },
        isUnlocked(id) { return !!this.unlockedMap()[id]; },
        countUnlocked() { return Object.keys(this.unlockedMap()).filter(id => byId.has(id)).length; },

        _ctx(event) {
            const data = Nexus.services.users.data();
            return { data, event: event || null, stats: (id) => (data.stats[id] || Nexus.schema.gameStats()) };
        },

        /** Progreso de un logro bloqueado: { value, target } o null. */
        progressOf(def) {
            if (!def.progress) return null;
            try { return def.progress(this._ctx(null)); } catch (e) { return null; }
        },

        /**
         * Evalúa todos los logros pendientes. Repite mientras se sigan
         * desbloqueando (un logro da XP, la XP sube de nivel, y eso puede
         * desbloquear otro). Devuelve los logros nuevos.
         */
        check(event) {
            const users = Nexus.services.users;
            const data = users.data();
            if (!data) return [];
            const unlocked = [];
            let evt = event || null;
            let again = true;

            while (again) {
                again = false;
                const ctx = this._ctx(evt);
                for (const def of defs) {
                    if (data.achievements[def.id]) continue;
                    let ok = false;
                    try { ok = !!def.test(ctx); } catch (e) { console.error('[achievements]', def.id, e); }
                    if (ok) {
                        data.achievements[def.id] = Date.now();
                        Nexus.services.progress.addXP(def.xp);
                        unlocked.push(def);
                        again = true;
                    }
                }
                evt = null; // en la segunda pasada sólo logros "de estado"
            }

            if (unlocked.length) {
                users.saveData();
                // Tras una partida los logros se listan en el modal de resultados; el toast
                // sólo se usa para los que se desbloquean fuera de una partida.
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
        { id: 'wins_100', name: 'Campeón', desc: 'Acumula 100 victorias.', icon: '👑', rarity: 'legendary',
            ...counter(totalWins, 100) },
        { id: 'level_5', name: 'Subiendo', desc: 'Alcanza el nivel 5.', icon: '⬆️', rarity: 'common',
            ...counter((c) => c.data.xp.level, 5) },
        { id: 'level_10', name: 'Cuesta arriba', desc: 'Alcanza el nivel 10.', icon: '🚀', rarity: 'rare',
            ...counter((c) => c.data.xp.level, 10) },
        { id: 'level_20', name: 'En la cima', desc: 'Alcanza el nivel 20.', icon: '🏔️', rarity: 'epic',
            ...counter((c) => c.data.xp.level, 20) },
        { id: 'days_3', name: 'Constancia', desc: 'Juega 3 días seguidos.', icon: '📆', rarity: 'common',
            ...counter((c) => c.data.meta.bestDayStreak, 3) },
        { id: 'days_7', name: 'Semana perfecta', desc: 'Juega 7 días seguidos.', icon: '🔥', rarity: 'epic',
            ...counter((c) => c.data.meta.bestDayStreak, 7) },
        { id: 'explorer', name: 'Explorador', desc: 'Juega a todos los juegos disponibles.', icon: '🧭', rarity: 'rare',
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
        { id: 'collector', name: 'Coleccionista', desc: 'Desbloquea 10 logros.', icon: '🗂️', rarity: 'epic',
            ...counter(() => Achievements.countUnlocked(), 10) }
    ]);
})();
