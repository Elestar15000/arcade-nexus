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
            { id: 'fauna',      prefix: 'fa', name: 'Fauna neón',  accent: '#22C55E', desc: 'Animales con luz propia' },
            { id: 'recompensas', prefix: 'rw', name: 'Recompensas', accent: '#FFD43B', desc: 'Se ganan con logros, rangos, eventos y el pase de temporada' }
        ],

        // accent: opcional (si falta, el de su colección) · unlock: opcional, p. ej. { level: 10 } o { achievement: 'ch_mate' }
        avatars: [
            { id: 'nx-nexo',      collection: 'nexus',      name: 'Nexo',               tags: ['mascota', 'rombo'] },
            { id: 'nx-gamepad',   collection: 'nexus',      name: 'Pad',                tags: ['robot', 'mando'] },
            { id: 'nx-crown',     collection: 'nexus',      name: 'Reina del Arcade',   tags: ['corona', 'jugadora'] },
            { id: 'nx-gem',       collection: 'nexus',      name: 'Gólem de Cristal',   tags: ['gema', 'cristal'] },
            { id: 'nx-star',      collection: 'nexus',      name: 'Estela',             tags: ['estrella'] },
            { id: 'nx-bolt',      collection: 'nexus',      name: 'Voltio',             tags: ['rayo', 'energía'] },

            { id: 'ar-joystick',  collection: 'arcade',     name: 'Palanca',            tags: ['joystick', 'recreativa'] },
            { id: 'ar-invader',   collection: 'arcade',     name: 'Píxel',              tags: ['alien', 'píxel'] },
            { id: 'ar-robot',     collection: 'arcade',     name: 'Chispas',            tags: ['robot', 'retro'] },
            { id: 'ar-rocket',    collection: 'arcade',     name: 'Capitana Cohete',    tags: ['espacio', 'piloto'] },
            { id: 'ar-snake',     collection: 'arcade',     name: 'Serpentina',         tags: ['serpiente', 'snake'] },
            { id: 'ar-blocks',    collection: 'arcade',     name: 'Bloque',             tags: ['bloques', 'puzle'] },

            { id: 'ca-joker',     collection: 'cartas',     name: 'Comodín',            tags: ['bufón', 'comodín'] },
            { id: 'ca-sota',      collection: 'cartas',     name: 'Sota de Espadas',    tags: ['baraja española'] },
            { id: 'ca-copas',     collection: 'cartas',     name: 'Reina de Copas',     tags: ['baraja española', 'reina'] },
            { id: 'ca-ace',       collection: 'cartas',     name: 'As de Oros',         tags: ['moneda', 'oros'] },
            { id: 'ca-shark',     collection: 'cartas',     name: 'Tiburón del Póker',  tags: ['póker', 'tiburón'] },
            { id: 'ca-bluff',     collection: 'cartas',     name: 'Farol',              tags: ['mentiroso', 'zorro'] },

            { id: 'me-brain',     collection: 'mentes',     name: 'Cerebrito',          tags: ['cerebro'] },
            { id: 'me-owl',       collection: 'mentes',     name: 'Lechuza Sabia',      tags: ['búho', 'lechuza'] },
            { id: 'me-sphinx',    collection: 'mentes',     name: 'Esfinge',            tags: ['acertijo', 'gato'] },
            { id: 'me-wordsmith', collection: 'mentes',     name: 'Mago de las Letras', tags: ['wordle', 'mago'] },
            { id: 'me-archer',    collection: 'mentes',     name: 'Diana',              tags: ['diana', 'arquera'] },
            { id: 'me-puzzle',    collection: 'mentes',     name: 'Pieza',              tags: ['puzle'] },

            { id: 'es-knight',    collection: 'estrategia', name: 'Caballero',          tags: ['ajedrez', 'caballo'] },
            { id: 'es-queen',     collection: 'estrategia', name: 'Dama',               tags: ['ajedrez', 'reina'] },
            { id: 'es-captain',   collection: 'estrategia', name: 'Almirante',          tags: ['barco', 'flota'] },
            { id: 'es-dragon',    collection: 'estrategia', name: 'Dragón Estratega',   tags: ['dragón'] },
            { id: 'es-lion',      collection: 'estrategia', name: 'León General',       tags: ['león'] },
            { id: 'es-paddle',    collection: 'estrategia', name: 'As de la Pala',      tags: ['pong', 'ping-pong'] },

            { id: 'mi-detective', collection: 'misterio',   name: 'Gato Detective',     tags: ['gato', 'detective'] },
            { id: 'mi-explorer',  collection: 'misterio',   name: 'Exploradora',        tags: ['aventura'] },
            { id: 'mi-alchemist', collection: 'misterio',   name: 'Alquimista',         tags: ['ciencia'] },
            { id: 'mi-astronaut', collection: 'misterio',   name: 'Astronauta',         tags: ['espacio'] },
            { id: 'mi-pharaoh',   collection: 'misterio',   name: 'Faraona',            tags: ['egipto', 'gata'] },
            { id: 'mi-octopus',   collection: 'misterio',   name: 'Pulpo Inventor',     tags: ['pulpo', 'inventor'] },

            { id: 'fa-fox',       collection: 'fauna',      name: 'Zorro Neón',         tags: ['zorro'] },
            { id: 'fa-panda',     collection: 'fauna',      name: 'Panda Gamer',        tags: ['panda'] },
            { id: 'fa-frog',      collection: 'fauna',      name: 'Rana Saltarina',     tags: ['rana'] },
            { id: 'fa-unicorn',   collection: 'fauna',      name: 'Unicornio',          tags: ['unicornio'] },
            { id: 'fa-phoenix',   collection: 'fauna',      name: 'Fénix',              tags: ['fuego', 'ave'] },
            { id: 'fa-axolotl',   collection: 'fauna',      name: 'Ajolote',            tags: ['ajolote'] },

            // Avatares de recompensa: se desbloquean al tener el cosmético `av:<id>` (services/rewards.js)
            { id: 'rw-nexo-gold',      collection: 'recompensas', name: 'Nexo dorado',      unlock: { reward: 'av:rw-nexo-gold' } },
            { id: 'rw-pad-gold',       collection: 'recompensas', name: 'Pad dorado',       unlock: { reward: 'av:rw-pad-gold' } },
            { id: 'rw-detective-gold', collection: 'recompensas', name: 'Detective de oro', unlock: { reward: 'av:rw-detective-gold' } },
            { id: 'rw-crown-neon',     collection: 'recompensas', name: 'Reina neón',       unlock: { reward: 'av:rw-crown-neon' } },
            { id: 'rw-phoenix-gold',   collection: 'recompensas', name: 'Fénix dorado',     unlock: { reward: 'av:rw-phoenix-gold' } },
            { id: 'rw-legend',         collection: 'recompensas', name: 'Leyenda',          unlock: { reward: 'av:rw-legend' } },
            { id: 'rw-ghost',          collection: 'recompensas', name: 'Fantasma',         unlock: { reward: 'av:rw-ghost' } },
            { id: 'rw-xmas',           collection: 'recompensas', name: 'Duende navideño',  unlock: { reward: 'av:rw-xmas' } },
            { id: 'rw-nexito',         collection: 'recompensas', name: 'Nexito Leyenda',   unlock: { reward: 'av:rw-nexito' } }
        ],

        // Avatares de la versión con emojis → id equivalente (cuentas antiguas y clientes viejos online)
        legacy: {
            '🎮': 'nx-gamepad', '🕹️': 'ar-joystick', '👾': 'ar-invader', '🤖': 'ar-robot', '🦊': 'fa-fox',
            '🐱': 'mi-detective', '🐼': 'fa-panda', '🦁': 'es-lion', '🐸': 'fa-frog', '🐙': 'mi-octopus',
            '🦄': 'fa-unicorn', '🐲': 'es-dragon', '🚀': 'ar-rocket', '⚡': 'nx-bolt', '🔥': 'fa-phoenix',
            '💎': 'nx-gem', '🎯': 'me-archer', '🧠': 'me-brain', '👑': 'nx-crown', '🌟': 'nx-star'
        }
    };
})(window);
