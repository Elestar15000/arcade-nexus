/* ============================================================
   NEXUS ARCADE · core/schema.js
   Forma de los datos guardados + normalización + migración.

   Claves en localStorage (prefijo nexus:v2:):
     session          → { token, id, name }   (sesión persistente)
     cache:<userId>   → { user, data, serverAt, dirty }  copia local de los datos del usuario
     lastUser         → último nombre de usuario (para rellenar el login)
     run:<userId>:<g> → partida en curso de un juego (se restaura al recargar)
     ldb              → base de datos del modo local (sin servidor)
     ui               → preferencias de interfaz globales (sidebar…)
   ============================================================ */
(function () {
    'use strict';

    const SCHEMA_VERSION = 2;

    /** Ajustes por defecto (por usuario). Claves planas con punto. */
    const DEFAULT_SETTINGS = {
        'theme': 'neon',               // neon | ocean | sunset | forest
        'reduceMotion': false,
        'particles': true,
        'sound': true,
        'volume': 0.6,
        'autoCollapseSidebar': true,   // plegar la barra lateral al entrar en un juego
        'minesweeper.longPressFlag': true,
        'wordle.hardMode': false,
        'wordle.colorblind': false,
        'tetris.ghost': true,
        'snake.grid': true,
        'pong.shake': true,            // sacudida de pantalla en golpes y puntos
        'pong.publicRooms': true,      // las salas nuevas aparecen en el buscador
        'online.publicRooms': true,    // ídem para Ajedrez y Hundir la flota
        'chess.showLegal': true,       // marcar las jugadas legales
    };

    const gameStats = () => ({
        played: 0, wins: 0, losses: 0,
        bestScore: 0, bestTime: null,
        totalScore: 0, totalTime: 0,
        streak: 0, bestStreak: 0,
        byMode: {},   // { [modo]: { played, wins, bestScore, bestTime } }
        extra: {}     // datos propios de cada juego (p. ej. distribución del Wordle)
    });

    const modeStats = () => ({ played: 0, wins: 0, bestScore: 0, bestTime: null });

    const userData = () => ({
        v: SCHEMA_VERSION,
        xp: { level: 1, xp: 0, total: 0 },
        stats: {},          // { [juego]: gameStats() }
        history: [],        // últimas partidas (más reciente primero)
        achievements: {},   // { [idLogro]: timestamp }
        settings: {},       // sólo se guardan los valores cambiados
        meta: { playTime: 0, daysPlayed: 0, dayStreak: 0, bestDayStreak: 0, lastDay: null, updatedAt: 0 },
        saves: {},          // partidas en curso por juego (p. ej. Wordle)
        rewards: rewardsData()   // Rombos, misiones, temporada, cosméticos, escaparate (services/rewards.js)
    });

    /** Datos del sistema de recompensas. */
    const rewardsData = () => ({
        rombos: 0, earned: 0,                       // saldo y total ganado
        day: { key: '', earned: 0 },                // tope diario de Rombos
        log: [],                                    // últimos movimientos [{ at, n, why }]
        missions: { day: '', list: [], rerolled: false, week: '', weekly: null, completed: 0,
            streak: { count: 0, best: 0, last: '', freezeWeek: '' } },
        season: { id: 0, earned: 0, level: 0, played: 0 },
        cosmetics: { owned: [], equipped: {} },
        shop: { week: '', bought: [] },
        showcase: [], tracked: '',
        mastery: {}, ranks: [], community: [],
        today: { key: '', played: 0, games: [], records: [] },
        nights: [], zeroes: 0, losing: 0, lostBefore: 0, weekendBoth: false, lastSat: '',
        events: {}
    });

    /** Rellena campos que falten y corrige tipos. Seguro de llamar siempre. */
    function normalize(raw) {
        const d = (raw && typeof raw === 'object') ? raw : {};
        Nexus.util.fillDefaults(d, userData());
        d.v = SCHEMA_VERSION;
        if (!Array.isArray(d.history)) d.history = [];
        if (d.history.length > 100) d.history.length = 100;
        for (const id of Object.keys(d.stats)) Nexus.util.fillDefaults(d.stats[id], gameStats());
        d.xp.level = Math.max(1, d.xp.level | 0);
        d.xp.xp = Math.max(0, d.xp.xp | 0);
        d.xp.total = Math.max(0, d.xp.total | 0);
        // Curva de nivel: el nivel siempre se deduce de la XP total (así las cuentas antiguas se migran solas)
        if (Nexus.services && Nexus.services.progress && Nexus.services.progress.rebuildLevel) Nexus.services.progress.rebuildLevel(d);
        const r = d.rewards;
        for (const k of ['log', 'showcase', 'ranks', 'community', 'nights']) if (!Array.isArray(r[k])) r[k] = [];
        if (!Array.isArray(r.cosmetics.owned)) r.cosmetics.owned = [];
        if (!Array.isArray(r.missions.list)) r.missions.list = [];
        r.rombos = Math.max(0, r.rombos | 0);
        return d;
    }

    Nexus.schema = {
        VERSION: SCHEMA_VERSION,
        DEFAULT_SETTINGS,
        gameStats, modeStats, userData, rewardsData, normalize
    };
})();
