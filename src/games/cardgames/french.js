/* ============================================================
   NEXUS ARCADE · games/cardgames/french.js
   Baraja francesa de 52 cartas (Póker y Solitario). Cartas como
   texto «<palo><número>» con el palo en MAYÚSCULA para no chocar
   con la baraja española: S picas, H corazones, D diamantes,
   C tréboles; 1 = As … 11 = J, 12 = Q, 13 = K (H12 = reina de
   corazones). Incluye el HTML de la carta (mismo tamaño .pc que
   la baraja española).
   ============================================================ */
(function () {
    'use strict';

    const SUITS = ['S', 'H', 'D', 'C'];
    const SUIT_NAME = { S: 'picas', H: 'corazones', D: 'diamantes', C: 'tréboles' };
    const SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
    const LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    const RANK_NAME = { 1: 'as', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'jota', 12: 'reina', 13: 'rey' };
    const RANK_PLURAL = { 1: 'ases', 2: 'doses', 3: 'treses', 4: 'cuatros', 5: 'cincos', 6: 'seises', 7: 'sietes', 8: 'ochos', 9: 'nueves', 10: 'dieces', 11: 'jotas', 12: 'reinas', 13: 'reyes' };

    const suitOf = (c) => c[0];
    const rankOf = (c) => Number(c.slice(1));
    const isRed = (c) => c[0] === 'H' || c[0] === 'D';
    const isCard = (c) => typeof c === 'string' && /^[SHDC](?:[1-9]|1[0-3])$/.test(c);
    const label = (c) => LABEL[rankOf(c)] || String(rankOf(c));
    const cardName = (c) => `${RANK_NAME[rankOf(c)]} de ${SUIT_NAME[suitOf(c)]}`;
    function deck52() { const d = []; for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push(s + r); return d; }

    const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    /** HTML de una carta francesa (o.back = boca abajo; o.cls, o.attrs como en la española). */
    function html(c, o = {}) {
        if (!c || o.back) return `<span class="pc back ${o.cls || ''}" ${o.attrs || ''}><i></i></span>`;
        const s = suitOf(c), r = rankOf(c), fig = r >= 11, sym = SYM[s];
        const mid = fig ? `<span class="fr-fig">${label(c)}</span><span class="fr-figsuit">${sym}</span>` : `<span class="fr-mid${r === 1 ? ' ace' : ''}">${sym}</span>`;
        return `<span class="pc fr ${isRed(c) ? 'fr-red' : 'fr-black'}${fig ? ' fig' : ''} ${o.cls || ''}" data-card="${esc(c)}" title="${esc(cardName(c))}" ${o.attrs || ''}>
            <b class="fr-c tl">${label(c)}<i>${sym}</i></b>${mid}<b class="fr-c br">${label(c)}<i>${sym}</i></b></span>`;
    }

    Nexus.games.frenchCards = { SUITS, SUIT_NAME, SYM, RANK_NAME, RANK_PLURAL, suitOf, rankOf, isRed, isCard, label, cardName, deck52, html };
})();
