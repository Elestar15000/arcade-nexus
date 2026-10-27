/* ============================================================
   NEXUS ARCADE · core/schema.js
   Forma de los datos guardados + normalización + migración.

   Claves en localStorage (prefijo nexus:v2:):
     users            → [{ id, name, avatar, color, salt, hash, createdAt, lastLoginAt }]
     data:<userId>    → datos de juego de ese usuario (ver userData())
     session          → { userId }           (si "recordarme")
     ui               → preferencias de interfaz globales (sidebar…)
     meta             → { schema: 2, legacyMigrated: bool }
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
        'minesweeper.defaultDifficulty': 'easy',
        'minesweeper.longPressFlag': true,
        'wordle.hardMode': false,
        'wordle.colorblind': false,
        'wordle.defaultMode': 'random', // random | daily
        'tetris.defaultMode': 'fusion', // fusion | cascade | chaos | sprint
        'tetris.ghost': true,
        'pacman.defaultMode': 'nexus',  // classic | nexus | horde
        'snake.defaultMode': 'evolve',  // classic | evolve | rival | zone
        'snake.grid': true
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
        meta: { playTime: 0, daysPlayed: 0, dayStreak: 0, bestDayStreak: 0, lastDay: null },
        saves: {}           // partidas en curso por juego (p. ej. Wordle)
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
        return d;
    }

    /** Convierte el perfil de la v1 (clave "nexus-arcade-profile") al nuevo formato. */
    function fromLegacy(old) {
        const d = userData();
        if (!old || typeof old !== 'object') return d;
        d.xp.level = Math.max(1, old.level | 0 || 1);
        d.xp.xp = Math.max(0, old.xp | 0);
        d.xp.total = Math.max(0, old.totalXP | 0);
        const ms = old.stats && old.stats.minesweeper;
        if (ms) {
            const g = gameStats();
            g.played = ms.totalGames | 0;
            g.wins = ms.totalWins | 0;
            g.losses = Math.max(0, g.played - g.wins);
            g.bestScore = ms.bestScore | 0;
            g.bestTime = ms.bestTime == null ? null : ms.bestTime;
            g.totalScore = ms.totalScore | 0;
            g.streak = ms.currentStreak | 0;
            g.bestStreak = ms.winStreak | 0;
            d.stats.minesweeper = g;
        }
        return d;
    }

    Nexus.schema = {
        VERSION: SCHEMA_VERSION,
        DEFAULT_SETTINGS,
        gameStats, modeStats, userData, normalize, fromLegacy
    };
})();
