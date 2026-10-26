/* ============================================================
   NEXUS ARCADE · games/towerdefense/data.js
   Datos del Tower Defense "Kernel Defense": mapa único (placa base),
   amenazas (Virus y Malware, con capas), torres-lenguaje con mejoras
   de 3 opciones por nivel y generador de rondas infinitas.
   Sin dependencias del DOM (se prueba también en Node).
   ============================================================ */
(function () {
    'use strict';

    const TD = (Nexus.games.td = Nexus.games.td || {});

    TD.W = 900;              // tamaño lógico del mapa
    TD.H = 600;
    TD.PATH_HALF = 20;       // mitad del ancho del bus de datos
    TD.TOWER_R = 16;         // radio de colocación de una torre
    TD.BASE_SPEED = 70;      // px/s de un Bug (la amenaza más lenta)
    TD.MAX_LEVEL = 4;        // mejoras por torre
    TD.SAVE_VERSION = 2;

    // ── Configuración de partida (única) ────────────────────
    TD.CONFIG = { lives: 150, cash: 650 };

    // ── Mapa único ──────────────────────────────────────────
    // El bus de datos entra por INTERNET (izquierda) y termina en el CORE.
    TD.MAP = {
        id: 'mainboard', name: 'Placa base', emoji: '🖥️',
        desc: 'Un único bus de datos serpentea por la placa hasta el CORE. Defiéndelo mientras aguantes.',
        path: [[-30, 90], [720, 90], [720, 250], [170, 250], [170, 410], [600, 410], [600, 520], [872, 520]],
        obstacles: [
            { x: 450, y: 170, r: 28, label: 'RAM' }, { x: 850, y: 175, r: 30, label: 'GPU' },
            { x: 62, y: 170, r: 24, label: 'I/O' }, { x: 400, y: 330, r: 26, label: 'SSD' },
            { x: 800, y: 410, r: 30, label: 'PSU' }, { x: 70, y: 505, r: 26, label: 'BIOS' },
            { x: 330, y: 525, r: 28, label: 'NIC' }
        ],
        colors: { base: '#0a1119', grid: '#101c28', trace: '#14323b', bus: '#0d2a33', busEdge: '#19d3da', chip: '#1b2735' }
    };
    TD.CORE = { x: 872, y: 520 };

    // ── Amenazas ────────────────────────────────────────────
    // family: 'Virus' | 'Malware' · speed: multiplicador sobre BASE_SPEED
    // kids: amenazas en las que se descompone al romperse su capa
    // immune: tipos de daño que ignora ('script' | 'gc' | 'lock') · armored: un upgrade puede romper su inmunidad
    TD.ENEMIES = {
        bug:     { name: 'Bug',          family: 'Virus',   color: '#ff6b6b', glyph: '🐛', speed: 1.0, hp: 1,  kids: [], reward: 1, r: 11 },
        macro:   { name: 'Macro virus',  family: 'Virus',   color: '#4dabf7', glyph: '📄', speed: 1.4, hp: 1,  kids: ['bug'], reward: 1, r: 11 },
        worm:    { name: 'Gusano',       family: 'Virus',   color: '#51cf66', glyph: '🧬', speed: 1.8, hp: 1,  kids: ['macro'], reward: 1, r: 11 },
        spyware: { name: 'Spyware',      family: 'Malware', color: '#ffd43b', glyph: '👁️', speed: 3.2, hp: 1,  kids: ['worm'], reward: 1, r: 11 },
        adware:  { name: 'Adware',       family: 'Malware', color: '#f783ac', glyph: '📢', speed: 3.5, hp: 1,  kids: ['spyware'], reward: 1, r: 11 },
        rootkit: { name: 'Rootkit',      family: 'Malware', color: '#9775fa', glyph: '💀', speed: 1.8, hp: 1,  kids: ['adware', 'adware'], reward: 1, r: 12, immune: ['gc'] },
        ransom:  { name: 'Ransomware',   family: 'Malware', color: '#e9ecef', glyph: '🔒', speed: 2.0, hp: 1,  kids: ['adware', 'adware'], reward: 1, r: 12, immune: ['lock'] },
        trojan:  { name: 'Troyano',      family: 'Malware', color: '#ced4da', glyph: '🐴', speed: 1.0, hp: 1,  kids: ['rootkit', 'rootkit'], reward: 1, r: 12, immune: ['script'], armored: true },
        botnet:  { name: 'Botnet',       family: 'Malware', color: '#20c997', glyph: '🕸️', speed: 2.2, hp: 1,  kids: ['rootkit', 'ransom'], reward: 1, r: 12 },
        crypto:  { name: 'Cryptolocker', family: 'Malware', color: '#ff922b', glyph: '🔐', speed: 2.5, hp: 10, kids: ['botnet', 'botnet'], reward: 3, r: 13 },
        zeroday: { name: 'Zero-Day',     family: 'Malware', color: '#ff2e63', glyph: '☠️', speed: 0.9, hp: 200, kids: ['crypto', 'crypto'], reward: 25, r: 34, boss: true, leak: 60 }
    };
    TD.DMG_LABEL = { script: 'scripts', gc: 'el recolector (GC)', lock: 'el bloqueo (lock)' };

    /** RBE ("bug equivalente"): cuánto cuesta destruir una amenaza entera, capas incluidas. */
    const rbeCache = {};
    TD.rbe = function (type, hp) {
        const d = TD.ENEMIES[type];
        const own = hp === undefined ? d.hp : hp;
        if (hp === undefined && rbeCache[type] !== undefined) return rbeCache[type];
        let total = own;
        for (const k of d.kids) total += TD.rbe(k);
        if (hp === undefined) rbeCache[type] = total;
        return total;
    };

    // ── Torres (lenguajes) ──────────────────────────────────
    // Cada torre tiene 2 ramas (A y B) y 4 niveles de mejora. En CADA nivel se elige
    // UNA de 3 opciones: refuerza la rama A, refuerza la rama B o una mejora HÍBRIDA
    // que combina un poco de las dos. Las ramas se pueden mezclar libremente.
    // `patch`: { stat: ['+', n] | ['*', n] | ['min', n] | valor } (valor = asignar).
    const o = (name, cost, desc, patch) => ({ name, cost, desc, patch });

    TD.OPTION_LABELS = ['A', 'B', 'AB'];            // índice de opción → etiqueta
    TD.OPTION_COLORS = ['#ffd43b', '#4dabf7', '#b197fc'];

    TD.TOWERS = {
        python: {
            name: 'Python', short: 'Py', emoji: '🐍', color: '#3b82c4', color2: '#ffd43b', cost: 200, kind: 'projectile',
            desc: 'Lanza scripts que atraviesan varias amenazas. Barata, versátil y fácil de escalar.',
            base: { range: 125, cd: 0.8, damage: 1, pierce: 3, speed: 520, shots: 1, spread: 0, dmgKind: 'script', breaksArmor: false },
            branches: [{ name: 'Data Science', desc: 'Perforación, alcance y múltiples scripts' }, { name: 'Automatización', desc: 'Cadencia y daño' }],
            levels: [
                [o('NumPy', 140, '+3 de perforación', { pierce: ['+', 3] }),
                 o('List comprehension', 140, 'Dispara un 25 % más rápido', { cd: ['*', 0.75] }),
                 o('Pandas', 160, '+1 perforación, +10 alcance, 10 % más rápido', { pierce: ['+', 1], range: ['+', 10], cd: ['*', 0.9] })],
                [o('TensorFlow', 240, '+30 alcance y +2 perforación', { range: ['+', 30], pierce: ['+', 2] }),
                 o('Cython', 240, '+1 daño; rompe la armadura de los Troyanos', { damage: ['+', 1], breaksArmor: true }),
                 o('Jupyter', 270, '+15 alcance, 10 % más rápido; rompe Troyanos', { range: ['+', 15], cd: ['*', 0.9], breaksArmor: true })],
                [o('Red neuronal', 600, 'Lanza 3 scripts a la vez', { shots: 3, spread: 0.32 }),
                 o('Multithreading', 600, 'Cadencia muy alta', { cd: ['*', 0.45] }),
                 o('Pipeline', 680, '2 scripts a la vez y 30 % más rápido', { shots: 2, spread: 0.16, cd: ['*', 0.7] })],
                [o('Deep Learning', 2200, '5 scripts a la vez y +2 perforación', { shots: 5, spread: 0.55, pierce: ['+', 2] }),
                 o('GIL liberado', 2200, 'Aún más rápido y +1 daño', { cd: ['*', 0.5], damage: ['+', 1] }),
                 o('AutoML', 2500, '4 scripts, 40 % más rápido y +1 daño', { shots: 4, spread: 0.45, cd: ['*', 0.6], damage: ['+', 1] })]
            ]
        },
        java: {
            name: 'Java', short: 'Jv', emoji: '☕', color: '#e8590c', color2: '#ffa94d', cost: 600, kind: 'projectile',
            desc: 'Su Garbage Collector barre en área. Los Rootkits se esconden del recolector.',
            base: { range: 145, cd: 1.35, damage: 1, pierce: 16, speed: 340, shots: 1, spread: 0, splash: 52, dmgKind: 'gc', breaksArmor: true },
            branches: [{ name: 'JVM / Heap', desc: 'Área y daño de la explosión' }, { name: 'Concurrencia', desc: 'Cadencia y múltiples cañones' }],
            levels: [
                [o('Heap ampliado', 400, 'Explosión más grande y +6 objetivos', { splash: ['+', 14], pierce: ['+', 6] }),
                 o('Compilador JIT', 350, 'Dispara un 20 % más rápido', { cd: ['*', 0.8] }),
                 o('Streams', 440, '+8 área, 10 % más rápido, +10 alcance', { splash: ['+', 8], cd: ['*', 0.9], range: ['+', 10] })],
                [o('Full GC', 500, '+1 daño (daña Cryptolockers)', { damage: ['+', 1] }),
                 o('Pool de hilos', 450, 'Dispara un 25 % más rápido', { cd: ['*', 0.75] }),
                 o('Spring Boot', 560, '+1 daño, +8 área y 10 % más rápido', { damage: ['+', 1], splash: ['+', 8], cd: ['*', 0.9] })],
                [o('Bomba pesada', 1100, '+2 daño y +10 objetivos', { damage: ['+', 2], pierce: ['+', 10] }),
                 o('Doble hilo', 1000, 'Dispara 2 bombas', { shots: 2, spread: 0.12, cd: ['*', 0.85] }),
                 o('Microservicios', 1250, '+1 daño, 2 bombas y +20 alcance', { damage: ['+', 1], shots: 2, spread: 0.12, range: ['+', 20] })],
                [o('OutOfMemory', 4200, 'Explosión enorme y +6 daño', { splash: ['+', 30], damage: ['+', 6] }),
                 o('Artillería concurrente', 3800, 'Cadencia altísima', { cd: ['*', 0.4] }),
                 o('Kubernetes', 4600, '+15 área, +3 daño y 40 % más rápido', { splash: ['+', 15], damage: ['+', 3], cd: ['*', 0.6] })]
            ]
        },
        cpp: {
            name: 'C++', short: 'C+', emoji: '⚙️', color: '#00839a', color2: '#4dd0e1', cost: 350, kind: 'sniper',
            desc: 'Acceso directo a memoria: disparo certero de muy largo alcance. Un solo objetivo.',
            base: { range: 300, cd: 1.7, damage: 2, pierce: 1, dmgKind: 'pointer' },
            branches: [{ name: 'Optimización', desc: 'Daño por disparo' }, { name: 'Bajo nivel', desc: 'Cadencia de disparo' }],
            levels: [
                [o('-O2', 300, '+2 daño y +20 alcance', { damage: ['+', 2], range: ['+', 20] }),
                 o('Inline', 250, 'Dispara un 25 % más rápido y +20 alcance', { cd: ['*', 0.75], range: ['+', 20] }),
                 o('constexpr', 330, '+1 daño, 12 % más rápido y +20 alcance', { damage: ['+', 1], cd: ['*', 0.88], range: ['+', 20] })],
                [o('Punteros crudos', 600, '+4 daño', { damage: ['+', 4] }),
                 o('SIMD', 500, 'Dispara un 30 % más rápido', { cd: ['*', 0.7] }),
                 o('Move semantics', 660, '+2 daño y 15 % más rápido', { damage: ['+', 2], cd: ['*', 0.85] })],
                [o('Metaprogramación', 1900, '+18 daño', { damage: ['+', 18] }),
                 o('Lock-free', 2400, 'Cadencia muy alta', { cd: ['*', 0.4] }),
                 o('Compilación JIT', 2200, '+7 daño y 35 % más rápido', { damage: ['+', 7], cd: ['*', 0.65] })],
                [o('Kernel hacker', 6500, '+100 daño y +60 alcance: revienta Zero-Days', { damage: ['+', 100], range: ['+', 60] }),
                 o('Multihilo nativo', 5000, 'Cadencia altísima, +2 daño y +40 alcance', { cd: ['*', 0.5], damage: ['+', 2], range: ['+', 40] }),
                 o('Zero-overhead', 6200, '+32 daño, el doble de rápido y +50 alcance', { damage: ['+', 32], cd: ['*', 0.5], range: ['+', 50] })]
            ]
        },
        rust: {
            name: 'Rust', short: 'Rs', emoji: '🦀', color: '#b7410e', color2: '#f4a261', cost: 450, kind: 'pulse',
            desc: 'El borrow checker ralentiza a todo lo cercano. El Ransomware cifra el bloqueo y es inmune.',
            base: { range: 85, cd: 2.0, damage: 0, pierce: 40, slowFactor: 0.5, slowTime: 1.5, dmgKind: 'lock' },
            branches: [{ name: 'Ownership', desc: 'Control: lentitud y alcance' }, { name: 'Unsafe', desc: 'Daño por pulso' }],
            levels: [
                [o('Lifetimes', 250, 'Ralentiza durante 1 s más', { slowTime: ['+', 1] }),
                 o('Clippy', 200, 'Inflige 1 de daño por pulso', { damage: ['+', 1] }),
                 o('Borrowing', 280, '+0,5 s de lentitud y +15 alcance', { slowTime: ['+', 0.5], range: ['+', 15] })],
                [o('Ventisca de borrows', 350, '+25 alcance y más lentitud', { range: ['+', 25], slowFactor: ['min', 0.35] }),
                 o('cargo build', 500, 'Pulsa un 30 % más rápido y +1 daño', { cd: ['*', 0.7], damage: ['+', 1] }),
                 o('Trait objects', 450, '+15 alcance, algo más de lentitud, +1 daño', { range: ['+', 15], slowFactor: ['min', 0.42], damage: ['+', 1] })],
                [o('Mutex', 900, 'Inmoviliza a las amenazas', { slowFactor: ['min', 0], slowTime: ['+', -0.5], cd: ['*', 1.1] }),
                 o('unsafe { }', 1000, '+3 de daño por pulso', { damage: ['+', 3] }),
                 o('Arc<Mutex>', 1100, 'Casi las inmoviliza, +2 daño y +15 alcance', { slowFactor: ['min', 0.2], damage: ['+', 2], range: ['+', 15] })],
                [o('Pin<Box>', 3000, '+40 alcance, +2 daño y pulso rápido', { range: ['+', 40], damage: ['+', 2], cd: ['*', 0.6] }),
                 o('Zero-cost abstractions', 3500, '+8 daño y pulso al doble de ritmo', { damage: ['+', 8], cd: ['*', 0.5] }),
                 o('Fearless concurrency', 3800, 'Inmoviliza, +4 daño, +30 alcance', { slowFactor: ['min', 0], damage: ['+', 4], range: ['+', 30], cd: ['*', 0.55] })]
            ]
        }
    };
    TD.TOWER_ORDER = ['python', 'java', 'cpp', 'rust'];
    TD.STRATEGIES = [
        { id: 'first', label: 'Primero' }, { id: 'last', label: 'Último' },
        { id: 'strong', label: 'Más fuerte' }, { id: 'close', label: 'Más cercano' }
    ];

    /** Aplica un parche de mejora a unas estadísticas. */
    TD.applyPatch = function (stats, patch) {
        for (const k of Object.keys(patch)) {
            const v = patch[k];
            if (Array.isArray(v)) {
                const cur = stats[k] === undefined ? 0 : stats[k];
                if (v[0] === '+') stats[k] = cur + v[1];
                else if (v[0] === '*') stats[k] = cur * v[1];
                else if (v[0] === 'min') stats[k] = Math.min(stats[k] === undefined ? Infinity : stats[k], v[1]);
            } else stats[k] = v;
        }
    };

    /** Estadísticas de una torre dada su secuencia de elecciones (`picks`: 0 = A, 1 = B, 2 = híbrida). */
    TD.statsFor = function (type, picks) {
        const def = TD.TOWERS[type];
        const stats = Object.assign({}, def.base);
        picks.forEach((p, lvl) => TD.applyPatch(stats, def.levels[lvl][p].patch));
        return stats;
    };

    /** Resumen de la "build" de una torre: especialista en A, en B o híbrida. */
    TD.buildTitle = function (type, picks) {
        const def = TD.TOWERS[type];
        if (!picks.length) return 'Sin mejorar';
        const a = picks.filter(p => p === 0).length, b = picks.filter(p => p === 1).length, h = picks.filter(p => p === 2).length;
        if (a && !b && !h) return def.branches[0].name;
        if (b && !a && !h) return def.branches[1].name;
        if (h && !a && !b) return 'Híbrida pura';
        return a === b || h >= Math.max(a, b) ? 'Híbrida' : (a > b ? `${def.branches[0].name} + mix` : `${def.branches[1].name} + mix`);
    };

    // ── Rondas infinitas ────────────────────────────────────
    // Se generan por presupuesto de RBE. Los tipos se desbloquean por ronda y, a partir de la
    // ronda SCALE_FROM, las amenazas se vuelven más resistentes y rápidas sin límite.
    const UNLOCK = [['bug', 1], ['macro', 2], ['worm', 4], ['spyware', 8], ['adware', 12],
        ['rootkit', 16], ['ransom', 17], ['trojan', 21], ['botnet', 30], ['crypto', 36]];
    const BOSS_EVERY = 10, BOSS_FIRST = 20, SCALE_FROM = 40, MAX_COUNT = 200;
    TD.BOSS_EVERY = BOSS_EVERY; TD.BOSS_FIRST = BOSS_FIRST;

    TD.BUDGET_K = 0.7; // calibrado con el bot (tests/td_sim.js)
    TD.budget = function (r) {
        return TD.BUDGET_K * (18 + 4.5 * r + 0.3 * r * r + 0.0125 * r * r * r);
    };

    /** Escalado infinito: tras la ronda 40 TODAS las capas ganan vida (crece cada vez más rápido) y velocidad. */
    TD.waveMods = function (r) {
        const over = Math.max(0, r - SCALE_FROM);
        return { hpMul: 1 + over * 0.07 + over * over * 0.0028, speedMul: Math.min(1.7, 1 + over * 0.012) };
    };

    TD.isBossRound = (r) => r >= BOSS_FIRST && r % BOSS_EVERY === 0;

    /**
     * Devuelve los grupos de la ronda: [{ type, count, start, gap, hp?, spd, hpm }].
     * Determinista: la misma ronda siempre es igual.
     */
    TD.buildWave = function (r) {
        let budget = TD.budget(r);
        const mods = TD.waveMods(r);
        const groups = [];
        const isBoss = TD.isBossRound(r);

        if (isBoss) {
            const hp = Math.round((80 + (r - BOSS_FIRST) * 12) * mods.hpMul);
            groups.push({ type: 'zeroday', count: 1, start: 1.0, gap: 1, hp, spd: mods.speedMul, hpm: mods.hpMul });
            budget *= 0.3;
        }

        const unlocked = UNLOCK.filter(u => u[1] <= r).map(u => u[0]);
        // Las 4 más fuertes desbloqueadas reparten el presupuesto (más peso a las fuertes)
        const used = unlocked.slice(-4);
        const weights = [0.14, 0.18, 0.28, 0.40].slice(4 - used.length);
        const wsum = weights.reduce((a, b) => a + b, 0);
        const counts = used.map((type, i) => Math.min(MAX_COUNT, Math.max(0, Math.floor(budget * (weights[i] / wsum) / TD.rbe(type)))));
        const totalCount = Math.max(1, counts.reduce((a, b) => a + b, 0));

        const windowLen = Math.min(26, 7 + r * 0.38);
        let t = isBoss ? 3 : 0.5;
        used.forEach((type, i) => {
            const count = counts[i];
            if (!count) return;
            const dur = windowLen * (count / totalCount);
            const gap = Math.max(0.09, dur / count);
            groups.push({ type, count, start: t, gap, spd: mods.speedMul, hpm: mods.hpMul });
            t += dur + 0.4;
        });
        if (!groups.length) groups.push({ type: 'bug', count: 5, start: 0.5, gap: 0.5, spd: 1, hpm: 1 });
        return groups;
    };

    TD.waveRBE = function (r) {
        return TD.buildWave(r).reduce((s, g) => s + g.count * TD.rbe(g.type, g.hp), 0);
    };
})();
