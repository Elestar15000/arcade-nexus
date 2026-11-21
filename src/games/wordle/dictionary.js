/* ============================================================
   NEXUS ARCADE · games/wordle/dictionary.js
   Acceso al diccionario español del Wordle.
   - Las letras se comparan SIN tildes (á→a, ü→u) pero conservando
     la Ñ, que en español es una letra distinta de la N.
   - isValid(): comprueba que lo escrito es una palabra real.
   - random(): solución aleatoria evitando las usadas hace poco.
   - daily(): solución determinista por fecha (igual para todos).
   Datos: assets/data/words-es.js (window.NexusWordData).
   ============================================================ */
(function () {
    'use strict';

    const LENGTH = 5;
    let validSet = null;
    let answers = null; // [{ word, display }]
    let legacy = null;  // soluciones anteriores al cambio (para los días ya jugados)

    /** minúsculas, sin tildes ni diéresis, conservando la ñ. */
    function normalize(w) {
        return String(w).toLowerCase()
            .replace(/ñ/g, '\u0001')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/\u0001/g, 'ñ');
    }

    function load() {
        if (validSet) return;
        const data = window.NexusWordData;
        if (!data) throw new Error('No se ha cargado el diccionario (assets/data/words-es.js).');
        validSet = new Set(data.VALID.split(' '));
        answers = data.ANSWERS.split(' ').map(display => ({ word: normalize(display), display }));
        legacy = (data.LEGACY_ANSWERS || data.ANSWERS).split(' ').map(display => ({ word: normalize(display), display }));
        // Las soluciones siempre son válidas como intento
        answers.forEach(a => validSet.add(a.word));
        legacy.forEach(a => validSet.add(a.word));
    }

    // PRNG con semilla (mulberry32) para barajar de forma reproducible
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffled(n, seed) {
        const rand = mulberry32(seed);
        const idx = Array.from({ length: n }, (_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        return idx;
    }
    /** Orden antiguo (709 palabras desde 2024-01-01): ya dio la vuelta completa el 10-12-2025. */
    let legacyOrder = null;
    const getLegacyOrder = () => legacyOrder || (legacyOrder = shuffled(legacy.length, 20240607));
    /** Orden nuevo: primero las palabras que NUNCA han salido como diaria (barajadas) y al final las que ya salieron. */
    let dailyOrder = null;
    function getDailyOrder() {
        if (dailyOrder) return dailyOrder;
        const used = new Set(legacy.map(a => a.word));
        const perm = shuffled(answers.length, 20261123);
        return (dailyOrder = perm.filter(i => !used.has(answers[i].word)).concat(perm.filter(i => used.has(answers[i].word))));
    }

    const EPOCH = '2024-01-01';
    const CUTOVER = '2026-11-23';     // desde este día, la lista nueva sin repeticiones

    Nexus.games.wordleDict = {
        LENGTH,
        normalize,

        /** Número de palabras aceptadas / de posibles soluciones. */
        sizes() { load(); return { valid: validSet.size, answers: answers.length }; },

        isValid(word) {
            load();
            const w = normalize(word);
            return w.length === LENGTH && validSet.has(w);
        },

        /** Devuelve la versión con tilde de una solución (p. ej. "angel" → "ángel"). */
        display(word) {
            load();
            const a = answers.find(x => x.word === word) || legacy.find(x => x.word === word);
            return a ? a.display : word;
        },

        /** Solución aleatoria que no esté en `recent` (lista de palabras normalizadas). */
        random(recent = []) {
            load();
            const skip = new Set(recent);
            const pool = answers.filter(a => !skip.has(a.word));
            const list = pool.length ? pool : answers;
            return list[Math.floor(Math.random() * list.length)].word;
        },

        /** Número de reto diario (días desde 2024-01-01) para una clave YYYY-MM-DD. */
        dailyNumber(dayKey) { return Nexus.util.daysBetween(EPOCH, dayKey) + 1; },

        /** Palabra del día: el mismo resultado para la misma fecha en cualquier dispositivo. */
        daily(dayKey) {
            load();
            const k = Nexus.util.daysBetween(CUTOVER, dayKey);
            if (k < 0) {   // días anteriores al cambio: la palabra que tocó entonces
                const order = getLegacyOrder(), n = Nexus.util.daysBetween(EPOCH, dayKey);
                return legacy[order[((n % order.length) + order.length) % order.length]].word;
            }
            const order = getDailyOrder();
            return answers[order[k % order.length]].word;
        },
        /** Días seguidos sin repetir palabra diaria desde el cambio. */
        dailyCycle() { load(); return getDailyOrder().length; }
    };
})();
