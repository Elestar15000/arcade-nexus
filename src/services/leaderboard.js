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
            this.computeRarity();
            const RW = Nexus.services.rewards; if (RW && RW.data()) RW.community(this.community().total);
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
                user: { id: p.id, name: p.name, avatar: p.avatar, color: p.color, frame: p.frame || '' },
                title: p.title || '', showcase: p.showcase || [], points: p.points || 0, pet: p.pet || null,
                level: p.level, totalXP: p.totalXP,
                rank: progress.rankFor(p.level),
                played: p.played, wins: p.wins,
                winRate: pct(p.wins, p.played),
                achievements: p.achievements
            }));
            rows.sort((a, b) => b.totalXP - a.totalXP || b.wins - a.wins);
            return rows.map((r, i) => Object.assign(r, { pos: i + 1 }));
        },

        /** Clasificación por mejor racha de Nexito (sin quienes lo ocultan). */
        byStreak() {
            const rows = this.overall().filter(r => r.pet && !r.pet.hidden && r.pet.best > 0).sort((a, b) => b.pet.best - a.pet.best || b.pet.count - a.pet.count);
            return rows.map((r, i) => Object.assign({}, r, { pos: i + 1 }));
        },

        /** Clasificación por puntos de logro. */
        byPoints() {
            const rows = this.overall().slice().sort((a, b) => b.points - a.points || b.achievements - a.achievements);
            return rows.map((r, i) => Object.assign({}, r, { pos: i + 1 }));
        },

        /** % de jugadores que tienen cada logro (rareza real). */
        computeRarity() {
            const list = this._all().filter(p => Array.isArray(p.ach));
            const count = {};
            for (const p of list) for (const id of p.ach) count[id] = (count[id] || 0) + 1;
            const pctMap = {};
            for (const [id, n] of Object.entries(count)) pctMap[id] = n / Math.max(1, list.length) * 100;
            if (Nexus.services.achievements) Nexus.services.achievements.setRealRarity(pctMap, list.length);
            return pctMap;
        },

        /** Partidas de esta temporada entre todos (meta de comunidad). */
        community() {
            const RW = Nexus.services.rewards;
            const sid = RW ? RW.seasonOf().id : 0;
            const total = this._all().reduce((s, p) => s + (p.season && p.season.id === sid ? p.season.played | 0 : 0), 0);
            return RW ? { total, goal: RW.COMMUNITY_GOAL, reached: total >= RW.COMMUNITY_GOAL } : { total, goal: 0, reached: false };
        },

        /** Resumen público de un jugador (para comparar). */
        player(id) { return this._all().find(p => p.id === id) || null; },

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
