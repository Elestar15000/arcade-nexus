/* ============================================================
   NEXUS ARCADE · games/cardgames/core.js
   Núcleo puro (sin DOM) de los juegos de baraja española:
   cartas como texto «<palo><número>» (o1 = as de oros, c12 = rey
   de copas…), baraja de 40, barajado y utilidades comunes.
   ============================================================ */
(function () {
    'use strict';

    const SUITS = ['o', 'c', 'e', 'b'];
    const SUIT_NAME = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };
    const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    const RANK_NAME = { 1: 'as', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 10: 'sota', 11: 'caballo', 12: 'rey' };

    const suitOf = (c) => c[0];
    const rankOf = (c) => parseInt(c.slice(1), 10);          // admite la segunda copia del mazo doble del Chinchón («o5z»)
    /** Comodines del Chinchón: «j1» y «j2». */
    const isJoker = (c) => typeof c === 'string' && c[0] === 'j';
    const cardName = (c) => (isJoker(c) ? 'comodín' : `${RANK_NAME[rankOf(c)]} de ${SUIT_NAME[suitOf(c)]}`);
    const isCard = (c) => typeof c === 'string' && /^[oceb](?:[1-7]|1[0-2])z?$/.test(c);

    function deck40() { const d = []; for (const s of SUITS) for (const r of RANKS) d.push(s + r); return d; }
    function shuffle(a, rnd = Math.random) {
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }
    /** Ordena una mano por palo y número (para mostrarla). */
    function sortHand(h, trump) {
        const so = (s) => (s === 'j' ? 9 : s === trump ? -1 : SUITS.indexOf(s));
        return h.slice().sort((a, b) => so(suitOf(a)) - so(suitOf(b)) || RANKS.indexOf(rankOf(a)) - RANKS.indexOf(rankOf(b)));
    }
    const removeCard = (hand, c) => { const i = hand.indexOf(c); if (i >= 0) hand.splice(i, 1); return i >= 0; };

    Nexus.games.cardCore = { SUITS, SUIT_NAME, RANKS, RANK_NAME, suitOf, rankOf, cardName, isCard, isJoker, deck40, shuffle, sortHand, removeCard };
})();
