/* ============================================================
   NEXUS ARCADE · services/progress.js
   XP / niveles, estadísticas por juego y modo, historial de
   partidas, racha de días y tiempo total jugado.

   Los juegos sólo llaman a `recordGame(payload)`; este servicio
   se encarga de todo lo demás (stats, XP, logros, guardado).
   ============================================================ */
(function () {
    'use strict';

    const { dayKey, daysBetween } = Nexus.util;

    const XP_BASE = 100;
    const XP_SCALING = 1.3;   // cada nivel exige un 30 % más que el anterior
    const HISTORY_MAX = 100;

    const RANKS = [
        { min: 1,  name: 'Novato',     icon: '🌱' },
        { min: 5,  name: 'Aprendiz',   icon: '🎯' },
        { min: 10, name: 'Jugador',    icon: '🎮' },
        { min: 15, name: 'Experto',    icon: '⚔️' },
        { min: 20, name: 'Maestro',    icon: '💎' },
        { min: 30, name: 'Leyenda',    icon: '👑' }
    ];

    const Progress = {
        RANKS,

        xpForLevel(level) {
            return Math.floor(XP_BASE * Math.pow(XP_SCALING, Math.max(0, level - 1)));
        },

        rankFor(level) {
            let rank = RANKS[0];
            for (const r of RANKS) if (level >= r.min) rank = r;
            return rank;
        },

        /** Estado de nivel del usuario activo (o de unos datos concretos). */
        level(data) {
            data = data || Nexus.services.users.data();
            if (!data) return { level: 1, xp: 0, next: XP_BASE, pct: 0, total: 0, rank: RANKS[0] };
            const next = this.xpForLevel(data.xp.level);
            return {
                level: data.xp.level, xp: data.xp.xp, next,
                pct: Math.min(100, (data.xp.xp / next) * 100),
                total: data.xp.total, rank: this.rankFor(data.xp.level)
            };
        },

        addXP(amount) {
            const data = Nexus.services.users.data();
            if (!data || amount <= 0) return { levelsGained: 0, newLevel: data ? data.xp.level : 1 };
            const x = data.xp;
            x.xp += amount;
            x.total += amount;
            let gained = 0;
            while (x.xp >= this.xpForLevel(x.level)) {
                x.xp -= this.xpForLevel(x.level);
                x.level++;
                gained++;
            }
            return { levelsGained: gained, newLevel: x.level };
        },

        /** Estadísticas de un juego (se crean si no existen). */
        stats(gameId) {
            const data = Nexus.services.users.data();
            if (!data) return Nexus.schema.gameStats();
            if (!data.stats[gameId]) data.stats[gameId] = Nexus.schema.gameStats();
            return data.stats[gameId];
        },

        modeStats(gameId, mode) {
            const gs = this.stats(gameId);
            if (!gs.byMode[mode]) gs.byMode[mode] = Nexus.schema.modeStats();
            return gs.byMode[mode];
        },

        totals(data) {
            data = data || Nexus.services.users.data();
            const t = { played: 0, wins: 0, losses: 0, score: 0, time: 0 };
            if (!data) return t;
            for (const gs of Object.values(data.stats)) {
                t.played += gs.played; t.wins += gs.wins; t.losses += gs.losses;
                t.score += gs.totalScore; t.time += gs.totalTime;
            }
            return t;
        },

        history(limit) {
            const data = Nexus.services.users.data();
            const h = data ? data.history : [];
            return limit ? h.slice(0, limit) : h.slice();
        },

        /**
         * Registra el final de una partida.
         * @param {object} p
         * @param {string} p.game      id del juego
         * @param {string} p.mode      modo/dificultad
         * @param {boolean} p.won
         * @param {boolean} [p.endless] juego sin final: ni suma victorias/derrotas ni corta la racha; la puntuación siempre cuenta como récord
         * @param {number} p.score
         * @param {number} p.time      segundos
         * @param {number} [p.xp]      XP base de la partida (si no, score/10)
         * @param {object} [p.extra]   datos para logros (no se guardan tal cual)
         * @param {function} [p.updateExtra] recibe `stats.extra` para que el juego guarde lo suyo
         * @returns {object} resultado para mostrar en el modal final
         */
        recordGame(p) {
            const users = Nexus.services.users;
            const data = users.data();
            const result = {
                xp: 0, levelUp: false, newLevel: 1, records: { score: false, time: false },
                unlocked: [], saved: !!data
            };
            if (!data) return result;

            const score = Math.max(0, Math.round(p.score || 0));
            const time = Math.max(0, Math.round(p.time || 0));
            const gs = this.stats(p.game);
            const ms = this.modeStats(p.game, p.mode);
            const prevBestScore = ms.bestScore;
            const prevBestTime = ms.bestTime;

            // Estadísticas globales del juego
            gs.played++; ms.played++;
            gs.totalScore += score;
            gs.totalTime += time;
            if (p.endless) {
                // Juegos infinitos: no hay victoria ni derrota; cada partida puede batir el récord de puntuación
                if (score > gs.bestScore) gs.bestScore = score;
                if (score > ms.bestScore) ms.bestScore = score;
                result.records.score = prevBestScore > 0 && score > prevBestScore;
            } else if (p.won) {
                gs.wins++; ms.wins++;
                gs.streak++;
                gs.bestStreak = Math.max(gs.bestStreak, gs.streak);
                if (score > gs.bestScore) gs.bestScore = score;
                if (gs.bestTime === null || time < gs.bestTime) gs.bestTime = time;
                if (score > ms.bestScore) ms.bestScore = score;
                if (ms.bestTime === null || time < ms.bestTime) ms.bestTime = time;
                // "Récord" = superar una marca previa (la primera victoria no cuenta)
                result.records.score = prevBestScore > 0 && score > prevBestScore;
                result.records.time = prevBestTime !== null && time < prevBestTime;
            } else {
                gs.losses++;
                gs.streak = 0;
            }
            if (typeof p.updateExtra === 'function') p.updateExtra(gs.extra);

            // Historial
            const xpBase = p.xp !== undefined ? p.xp : Math.round(score / 10);
            data.history.unshift({
                game: p.game, mode: p.mode, won: !!p.won, score, time, at: Date.now(), xp: xpBase
            });
            if (data.history.length > HISTORY_MAX) data.history.length = HISTORY_MAX;

            // Tiempo jugado y racha de días
            const m = data.meta;
            m.playTime += time;
            const today = dayKey();
            if (m.lastDay !== today) {
                const gap = m.lastDay ? daysBetween(m.lastDay, today) : null;
                m.dayStreak = gap === 1 ? m.dayStreak + 1 : 1;
                m.bestDayStreak = Math.max(m.bestDayStreak, m.dayStreak);
                m.daysPlayed++;
                m.lastDay = today;
            }

            // XP
            const levelBefore = data.xp.level;
            result.xp = Math.max(0, Math.round(xpBase));
            this.addXP(result.xp);

            // Logros (pueden dar XP extra y desbloquear otros por nivel)
            const unlocked = Nexus.services.achievements.check({
                game: p.game, mode: p.mode, won: !!p.won, score, time, extra: p.extra || {}, at: Date.now()
            });
            result.unlocked = unlocked;
            result.xp += unlocked.reduce((sum, a) => sum + a.xp, 0);
            result.newLevel = data.xp.level;
            result.levelUp = result.newLevel > levelBefore;

            users.saveData();
            users.flush();      // el ranking global se actualiza al terminar cada partida
            Nexus.bus.emit('progress:update', { game: p.game, result });
            return result;
        }
    };

    Nexus.services.progress = Progress;
})();
