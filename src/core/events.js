/* ============================================================
   NEXUS ARCADE · core/events.js
   Bus de eventos mínimo (pub/sub) para desacoplar módulos.
   Eventos usados: user:login, user:logout, user:update,
   progress:update, achievement:unlock, settings:change.
   ============================================================ */
(function () {
    'use strict';

    const listeners = new Map();

    Nexus.bus = {
        on(event, fn) {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(fn);
            return () => this.off(event, fn);
        },
        off(event, fn) {
            const set = listeners.get(event);
            if (set) set.delete(fn);
        },
        emit(event, payload) {
            const set = listeners.get(event);
            if (!set) return;
            for (const fn of Array.from(set)) {
                try { fn(payload); } catch (e) { console.error(`[bus] error en "${event}":`, e); }
            }
        }
    };
})();
