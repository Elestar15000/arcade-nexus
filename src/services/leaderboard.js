/* ============================================================
   NEXUS ARCADE · services/leaderboard.js
   Rankings locales: compara a todos los perfiles del navegador.
   Los invitados no aparecen (no guardan datos).
   ============================================================ */
(function () {
    'use strict';

    const { pct } = Nexus.util;

    const Leaderboard = {
        /** Todos los perfiles con sus datos. */
        _players() {
            const users = Nexus.services.users;
            return users.list().map(user => ({ user, data: users.loadData(user.id) }));
        },

        /** Clasificación general: por XP total. */
        overall() {
            const progress = Nexus.services.progress;
            const rows = this._players().map(({ user, data }) => {
                const t = progress.totals(data);
                return {
                    user,
                    level: data.xp.level,
                    totalXP: data.xp.total,
                    rank: progress.rankFor(data.xp.level),
                    played: t.played, wins: t.wins,
                    winRate: pct(t.wins, t.played),
                    achievements: Object.keys(data.achievements)
                        .filter(id => Nexus.services.achievements.get(id)).length
                };
            });
            rows.sort((a, b) => b.totalXP - a.totalXP || b.wins - a.wins);
            return rows.map((r, i) => Object.assign(r, { pos: i + 1 }));
        },

        /**
         * Clasificación de un juego en un modo.
         * @param {string} metric 'score' (mayor mejor) | 'time' (menor mejor) | 'wins'
         */
        forGame(gameId, mode, metric) {
            const rows = [];
            for (const { user, data } of this._players()) {
                const gs = data.stats[gameId];
                if (!gs) continue;
                const ms = mode === 'all'
                    ? { played: gs.played, wins: gs.wins, bestScore: gs.bestScore, bestTime: gs.bestTime }
                    : gs.byMode[mode];
                if (!ms || ms.played === 0) continue;
                rows.push({
                    user, played: ms.played, wins: ms.wins,
                    winRate: pct(ms.wins, ms.played),
                    bestScore: ms.bestScore, bestTime: ms.bestTime,
                    streak: gs.bestStreak
                });
            }
            const valid = (r) => (metric === 'time' ? r.bestTime !== null : metric === 'score' ? r.bestScore > 0 : true);
            const sorters = {
                score: (a, b) => b.bestScore - a.bestScore || b.wins - a.wins,
                time: (a, b) => a.bestTime - b.bestTime || b.wins - a.wins,
                wins: (a, b) => b.wins - a.wins || b.winRate - a.winRate
            };
            const out = rows.filter(valid).sort(sorters[metric] || sorters.score);
            return out.map((r, i) => Object.assign(r, { pos: i + 1 }));
        }
    };

    Nexus.services.leaderboard = Leaderboard;
})();
