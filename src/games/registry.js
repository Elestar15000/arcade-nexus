/* ============================================================
   NEXUS ARCADE · games/registry.js
   Registro de juegos. Para añadir un juego nuevo basta con:
     1. Crear src/games/<id>/game.js
     2. Llamar a Nexus.games.registry.register({...})
     3. Cargar el script en index.html
   Contrato de un juego:
     {
       id, name, emoji, tagline, description, tags: [],
       modes:   [{ id, label }],            // dificultades / modos (para stats y rankings)
       metrics: [{ id:'score'|'time'|'wins', label }],
       mount(root) → { destroy() }          // pinta el juego dentro de `root`
     }
   ============================================================ */
(function () {
    'use strict';

    const games = new Map();

    /** Juegos anunciados pero aún no disponibles. */
    const COMING_SOON = [
        { id: 'pong', name: 'Pong Turbo', emoji: '🏓', tags: ['Arcade', 'Multijugador'] }
    ];

    Nexus.games.registry = {
        register(def) {
            if (games.has(def.id)) throw new Error('Juego duplicado: ' + def.id);
            games.set(def.id, Object.assign({ tags: [], modes: [], metrics: [{ id: 'score', label: 'Puntuación' }] }, def));
        },
        get: (id) => games.get(id),
        available: () => Array.from(games.values()),
        comingSoon: () => COMING_SOON.slice()
    };
})();
