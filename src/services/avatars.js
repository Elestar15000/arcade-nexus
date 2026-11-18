/* ============================================================
   NEXUS ARCADE · services/avatars.js
   Catálogo de avatares PNG (assets/avatars/manifest.js).
   · list(), collections(), get(id)      → entradas del catálogo
   · resolve(valor)                       → id válido a partir de un id, un emoji antiguo o nada
   · url(id, 256|512)                     → ruta del PNG
   · isValid(id), fromLegacy(emoji)
   · isUnlocked(avatar)                   → para avatares de recompensa (campo `unlock`)
   ============================================================ */
(function () {
    'use strict';

    const M = (Nexus.data && Nexus.data.avatars) || { base: 'assets/avatars/', default: 'nx-nexo', collections: [], avatars: [], legacy: {} };
    const ID_RE = /^[a-z]{2}-[a-z0-9-]{2,24}$/;
    const noVS = (s) => String(s).replace(/[️\u{1F3FB}-\u{1F3FF}]/gu, '');

    const COLS = new Map(M.collections.map(c => [c.id, c]));
    const BY_ID = new Map();
    for (const a of M.avatars) {
        const col = COLS.get(a.collection) || {};
        BY_ID.set(a.id, Object.freeze(Object.assign({ accent: col.accent || '#FFD43B', tags: [] }, a, {
            collectionName: col.name || a.collection
        })));
    }
    const LEGACY = new Map(Object.entries(M.legacy || {}).map(([k, v]) => [noVS(k), v]));

    const Avatars = {
        DEFAULT: M.default,
        ID_RE,
        manifest: M,

        list: () => Array.from(BY_ID.values()),
        collections: () => M.collections.map(c => Object.assign({}, c, { avatars: Avatars.list().filter(a => a.collection === c.id) })),
        get: (id) => BY_ID.get(id) || null,
        isValid: (id) => typeof id === 'string' && BY_ID.has(id),
        fromLegacy: (emoji) => LEGACY.get(noVS(emoji || '')) || null,

        /** Id válido para cualquier valor guardado: id actual, emoji de la versión anterior o vacío. */
        resolve(value) {
            if (Avatars.isValid(value)) return value;
            return Avatars.fromLegacy(value) || M.default;
        },
        /** Entrada del catálogo para cualquier valor (nunca null). */
        info: (value) => BY_ID.get(Avatars.resolve(value)) || BY_ID.get(M.default),

        url(value, size = 256) {
            const a = Avatars.info(value);
            if (!a) return '';
            const s = size > 256 ? 512 : 256;
            return `${M.base}${a.collection}/${a.id}-${s}.png`;
        },

        /** ¿Puede elegirlo el jugador actual? (los que no tienen `unlock` siempre) */
        isUnlocked(a) {
            if (!a || !a.unlock) return true;
            const u = a.unlock;
            try {
                if (u.reward) return !!(Nexus.services.rewards && Nexus.services.rewards.owns(u.reward));
                if (u.level) return Nexus.services.progress.level().level >= u.level;
                if (u.achievement) return !!(Nexus.services.users.data() || { achievements: {} }).achievements[u.achievement];
            } catch (e) { /* sin sesión todavía */ }
            return false;
        },
        unlockText(a) {
            if (!a || !a.unlock) return '';
            if (a.unlock.reward) {
                const it = Nexus.services.rewards && Nexus.services.rewards.item(a.unlock.reward);
                return it ? `${it.desc} ${it.price ? `También en la tienda (${it.price} Rombos).` : ''}`.trim() : 'Avatar de recompensa';
            }
            if (a.unlock.level) return `Desbloquéalo al llegar al nivel ${a.unlock.level}`;
            if (a.unlock.achievement) {
                const A = Nexus.services.achievements && Nexus.services.achievements.get(a.unlock.achievement);
                return `Desbloquéalo con el logro «${A ? A.name : a.unlock.achievement}»`;
            }
            return 'Bloqueado';
        }
    };

    Nexus.services.avatars = Avatars;
})();
