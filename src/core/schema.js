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

    const modeStats = () => ({ played: 0, wins: 0, bestScore: 0, bestTime: null, streak: 0, bestStreak: 0 });

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
        events: {},
        pet: petData()                              // Nexito, la mascota de racha (services/pet.js)
    });

    /** Nexito: necesidades, racha, comida, vacaciones y ajustes. */
    const petData = () => ({
        name: 'Nexito', born: '', caredDays: 0,
        needs: { food: 80, fun: 80, rest: 100 },
        tick: 0, lastPlay: 0, lastGame: '', sessionStart: 0, tiredAt: 0, restedUntil: 0, happyUntil: 0, wokeUntil: 0,
        today: { day: '', played: false, fed: false, cared: false, snack: true },
        streak: { count: 0, best: 0, last: '', shields: 1, shieldWeek: '', shieldLog: [], danger: '', rescueUsed: '', milestones: [] },
        food: { galleta: 0, bocadillo: 0, tarta: 0, banquete: 0, helado: 0, pizza: 0 },
        vacation: { from: '', to: '', year: '', used: 0 },
        stats: { fed: 0, nightFeeds: 0, wakes: 0, pokes: 0 },
        hidden: false, noAlerts: false, stageSeen: '', migrated: false
    });

    /** Las dos rachas diarias anteriores (días seguidos y misiones) pasan a la de Nexito, quedándose con la mejor. */
    function migratePet(d) {
        const p = d.rewards.pet, m = d.meta, ms = d.rewards.missions.streak || {};
        const U = Nexus.util, today = U.dayKey(), yesterday = U.dayKey(Date.now() - 864e5);
        p.migrated = true;
        p.born = m.lastDay || today;
        p.caredDays = Math.max(0, m.daysPlayed | 0);
        p.streak.best = Math.max(m.bestDayStreak | 0, ms.best | 0);
        if (m.lastDay === today || m.lastDay === yesterday) { p.streak.count = m.dayStreak | 0; p.streak.last = p.streak.count ? m.lastDay : ''; }
        p.streak.best = Math.max(p.streak.best, p.streak.count);
        // Los premios de 3, 7 y 30 días ya cobrados con la racha de misiones no se pagan dos veces
        p.streak.milestones = [3, 7, 30].filter(n => (ms.best | 0) >= n);
        if (m.lastDay === today) p.today = { day: today, played: true, fed: false, cared: false, snack: true };
    }

    /** Rellena campos que falten y corrige tipos. Seguro de llamar siempre. */
    function normalize(raw) {
        const d = (raw && typeof raw === 'object') ? raw : {};
        const hadPet = !!(d.rewards && d.rewards.pet && d.rewards.pet.migrated);
        const isNew = !d.meta;
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
        const p = r.pet;
        if (!hadPet) { if (isNew) { p.migrated = true; p.born = Nexus.util.dayKey(); } else migratePet(d); }
        for (const k of ['shieldLog', 'milestones']) if (!Array.isArray(p.streak[k])) p.streak[k] = [];
        for (const k of ['food', 'fun', 'rest']) p.needs[k] = Math.max(0, Math.min(100, +p.needs[k] || 0));
        p.streak.shields = Math.max(0, Math.min(3, p.streak.shields | 0));
        return d;
    }

    Nexus.schema = {
        VERSION: SCHEMA_VERSION,
        DEFAULT_SETTINGS,
        gameStats, modeStats, userData, rewardsData, petData, normalize
    };
})();
