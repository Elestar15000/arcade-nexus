/* ============================================================
   NEXUS ARCADE · services/leaderboard.js
   Rankings globales: se descargan del servidor (resúmenes públicos
   de todos los jugadores) y se calculan en el cliente. Tu propia
   fila se sustituye por tus datos locales para que tu última
   partida aparezca al instante, aunque el servidor tarde.
   ============================================================ */
(function () {
    'use strict';

    const { pct } = Nexus.util;
    const TTL = 15000;

    const Leaderboard = {
        players: [], updatedAt: 0, loadedAt: 0,

        /** Descarga la clasificación (cacheada 15 s salvo force). Rechaza si no hay conexión. */
        async load(force) {
            const users = Nexus.services.users;
            await users.flush();                   // que mi última partida ya esté en el servidor
            if (!force && this.players.length && Date.now() - this.loadedAt < TTL) return;
            const r = await Nexus.backend.leaderboard();
            this.players = Array.isArray(r.players) ? r.players : [];
            this.updatedAt = r.updatedAt || Date.now();
            this.loadedAt = Date.now();
        },

        /** Jugadores con mi fila actualizada con los datos locales. */
        _all() {
            const me = Nexus.services.users.current(), data = Nexus.services.users.data();
            const list = this.players.filter(p => !me || p.id !== me.id);
            if (me && data) list.push(Nexus.core.summarize(me, data));
            return list;
        },

        /** Clasificación general: por XP total. */
        overall() {
            const progress = Nexus.services.progress;
            const rows = this._all().map(p => ({
                user: { id: p.id, name: p.name, avatar: p.avatar, color: p.color },
                level: p.level, totalXP: p.totalXP,
                rank: progress.rankFor(p.level),
                played: p.played, wins: p.wins,
                winRate: pct(p.wins, p.played),
                achievements: p.achievements
            }));
            rows.sort((a, b) => b.totalXP - a.totalXP || b.wins - a.wins);
            return rows.map((r, i) => Object.assign(r, { pos: i + 1 }));
        },

        /**
         * Clasificación de un juego en un modo.
         * @param {string} metric 'score' (mayor mejor) | 'time' (menor mejor) | 'wins'
         */
        forGame(gameId, mode, metric) {
            const rows = [];
            for (const p of this._all()) {
                const gs = p.stats && p.stats[gameId];
                if (!gs) continue;
                const ms = mode === 'all' ? gs : (gs.byMode || {})[mode];
                if (!ms || ms.played === 0) continue;
                rows.push({
                    user: { id: p.id, name: p.name, avatar: p.avatar, color: p.color },
                    played: ms.played, wins: ms.wins,
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
