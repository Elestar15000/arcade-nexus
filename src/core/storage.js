/* ============================================================
   NEXUS ARCADE · core/storage.js
   Capa de persistencia sobre localStorage:
   - Claves con prefijo y versión (nexus:v2:*) para no chocar con
     otras apps ni con la versión anterior (nexus-arcade-profile).
   - JSON seguro (try/catch) y caída a memoria si el navegador
     bloquea el almacenamiento (modo privado, cuota, etc.).
   - Almacenamiento de sesión separado (sessionStorage).
   ============================================================ */
(function () {
    'use strict';

    const PREFIX = 'nexus:v2:';
    const memory = new Map();
    let errorReported = false;

    function probe(kind) {
        try {
            const s = window[kind];
            const k = '__nexus_probe__';
            s.setItem(k, '1'); s.removeItem(k);
            return s;
        } catch (e) { return null; }
    }

    const local = probe('localStorage');
    const session = probe('sessionStorage');

    function reportError(e) {
        console.warn('[storage]', e);
        if (!errorReported) {
            errorReported = true;
            Nexus.bus && Nexus.bus.emit('storage:error', e);
        }
    }

    function read(store, memMap, key) {
        try {
            const raw = store ? store.getItem(PREFIX + key) : memMap.get(key);
            return raw == null ? null : JSON.parse(raw);
        } catch (e) { reportError(e); return null; }
    }

    function write(store, memMap, key, value) {
        const raw = JSON.stringify(value);
        if (!store) { memMap.set(key, raw); return true; }
        try { store.setItem(PREFIX + key, raw); return true; }
        catch (e) { reportError(e); memMap.set(key, raw); return false; }
    }

    const sessionMemory = new Map();

    Nexus.storage = {
        PREFIX,
        /** true si estamos usando memoria (los datos NO sobrevivirán a recargar). */
        get volatile() { return !local; },

        get(key, fallback = null) {
            const v = read(local, memory, key);
            return v === null ? fallback : v;
        },
        set(key, value) { return write(local, memory, key, value); },
        remove(key) {
            try { local ? local.removeItem(PREFIX + key) : memory.delete(key); }
            catch (e) { reportError(e); }
        },
        /** Lista las claves propias de la app (sin prefijo). */
        keys() {
            if (!local) return Array.from(memory.keys());
            const out = [];
            for (let i = 0; i < local.length; i++) {
                const k = local.key(i);
                if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
            }
            return out;
        },

        // Lectura directa de claves antiguas (migración desde la v1)
        getLegacy(rawKey) {
            try { return local ? JSON.parse(local.getItem(rawKey)) : null; }
            catch (e) { return null; }
        },

        // Sesión del navegador (se borra al cerrar la pestaña)
        getSession(key, fallback = null) {
            const v = read(session, sessionMemory, key);
            return v === null ? fallback : v;
        },
        setSession(key, value) { return write(session, sessionMemory, key, value); },
        removeSession(key) {
            try { session ? session.removeItem(PREFIX + key) : sessionMemory.delete(key); }
            catch (e) { reportError(e); }
        }
    };
})();
