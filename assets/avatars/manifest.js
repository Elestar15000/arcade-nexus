/* ============================================================
   NEXUS ARCADE · assets/avatars/manifest.js
   Catálogo de avatares (única fuente de verdad).
   Cada avatar es un PNG en  assets/avatars/<colección>/<id>-512.png  y  <id>-256.png.
   · Un id NUNCA se renombra ni se borra: las cuentas lo guardan. Sólo se añaden.
   · Tras tocar esta lista:  node tools/avatars/export.mjs --sync  (copia los ids al Worker)
     y  node tests/avatars_test.mjs.
   Es un script clásico (no JSON) para que la web funcione abriendo index.html desde el disco.
   ============================================================ */
(function (global) {
    'use strict';
    const Nexus = global.Nexus = global.Nexus || {};
    Nexus.data = Nexus.data || {};

    Nexus.data.avatars = {
        version: 1,
        base: 'assets/avatars/',
        sizes: [256, 512],
        default: 'nx-nexo',

        collections: [
            { id: 'nexus',      prefix: 'nx', name: 'Nexus',       accent: '#FFD43B', desc: 'Las mascotas de la casa' },
            { id: 'arcade',     prefix: 'ar', name: 'Arcade',      accent: '#F97316', desc: 'Recreativas, robots y espacio' },
            { id: 'cartas',     prefix: 'ca', name: 'Cartas',      accent: '#FF6584', desc: 'Baraja, póker y faroles' },
            { id: 'mentes',     prefix: 'me', name: 'Mentes',      accent: '#A879FF', desc: 'Palabras, lógica y acertijos' },
            { id: 'estrategia', prefix: 'es', name: 'Estrategia',  accent: '#4B8DFF', desc: 'Ajedrez, flotas y líderes' },
            { id: 'misterio',   prefix: 'mi', name: 'Misterio',    accent: '#00C9A7', desc: 'Escape rooms y exploración' },
            { id: 'fauna',      prefix: 'fa', name: 'Fauna neón',  accent: '#22C55E', desc: 'Animales con luz propia' }
        ],

        // accent: opcional (si falta, el de su colección) · unlock: opcional, p. ej. { level: 10 } o { achievement: 'ch_mate' }
        avatars: [
            { id: 'nx-nexo',      collection: 'nexus',      name: 'Nexo',               tags: ['mascota', 'rombo'] },
            { id: 'nx-gamepad',   collection: 'nexus',      name: 'Pad',                tags: ['robot', 'mando'] },
            { id: 'nx-crown',     collection: 'nexus',      name: 'Reina del Arcade',   tags: ['corona', 'jugadora'] },
            { id: 'nx-gem',       collection: 'nexus',      name: 'Gólem de Cristal',   tags: ['gema', 'cristal'] },
            { id: 'nx-star',      collection: 'nexus',      name: 'Estela',             tags: ['estrella'] },
            { id: 'nx-bolt',      collection: 'nexus',      name: 'Voltio',             tags: ['rayo', 'energía'] },
        ],
    };
})(window);
