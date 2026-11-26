/* ============================================================
   NEXUS ARCADE · services/settings.js
   Ajustes por usuario (sonido, modos BETA y opciones de cada
   juego; se guardan en sus datos) y el estado de la barra lateral.
   ============================================================ */
(function () {
    'use strict';

    const DEFAULTS = Nexus.schema.DEFAULT_SETTINGS;

    // Modos BETA: funciones experimentales que se desbloquean en Ajustes con un código y luego se activan o desactivan
    // cuando se quiera (también a mitad de partida). Los códigos se guardan como huella, no en claro.
    const codeHash = (s) => { let x = 5381; for (const c of s) x = ((x * 33) ^ c.charCodeAt(0)) >>> 0; return x; };
    const BETA = [
        { id: 'chess-danger', game: 'chess', icon: '🎯', key: 'chess.betaDanger', h: 2700710573, name: 'Ajedrez · Casillas peligrosas',
            desc: 'Al elegir una pieza, el punto de destino sale en rojo si el rival podría capturarla ahí. Puedes moverla igualmente.' },
        { id: 'chess-hint', game: 'chess', icon: '💡', key: 'chess.betaHint', h: 193465751, name: 'Ajedrez · Jugada recomendada',
            desc: 'En tu turno, la CPU te recomienda una jugada calculando las 3 próximas respuestas del rival.' }
    ];

    const Settings = {
        DEFAULTS,
        BETA,

        /** ¿Está desbloqueado este modo BETA? */
        betaUnlocked(id) { const u = this.get('beta.unlocked'); return Array.isArray(u) && u.includes(id); },
        /** ¿Está desbloqueado y activado? */
        betaOn(id) { const b = BETA.find(x => x.id === id); return !!b && this.betaUnlocked(id) && !!this.get(b.key); },
        /** Canjea un código (letras y números). Devuelve { ok, beta, already } o { ok:false }. */
        redeemBeta(code) {
            const h = codeHash(String(code || '').trim().toUpperCase());
            const b = BETA.find(x => x.h === h);
            if (!b) return { ok: false };
            if (this.betaUnlocked(b.id)) return { ok: true, beta: b, already: true };
            this.set('beta.unlocked', (this.get('beta.unlocked') || []).concat(b.id));
            this.set(b.key, true);
            Nexus.bus.emit('beta:unlock', { beta: b });
            return { ok: true, beta: b };
        },

        get(key) {
            const u = Nexus.services.users;
            const data = u && u.data();
            if (data && data.settings && data.settings[key] !== undefined) return data.settings[key];
            return DEFAULTS[key];
        },

        set(key, value) {
            if (!(key in DEFAULTS)) { console.warn('[settings] clave desconocida:', key); return; }
            const u = Nexus.services.users;
            const data = u && u.data();
            if (!data) return;
            data.settings[key] = value;
            u.saveData();
            this.apply();
            Nexus.bus.emit('settings:change', { key, value });
        },

        reset() {
            const u = Nexus.services.users;
            const data = u && u.data();
            if (!data) return;
            const keep = data.settings['beta.unlocked'];   // restablecer no vuelve a bloquear los modos BETA
            data.settings = keep ? { 'beta.unlocked': keep } : {};
            u.saveData();
            this.apply();
            Nexus.bus.emit('settings:change', { key: '*', value: null });
        },

        /** El estilo es el mismo para todos (sin temas ni opciones de apariencia). Sólo se respeta «reducir movimiento»
         *  del sistema operativo, por accesibilidad, y el alto contraste propio de Wordle. */
        apply() {
            const root = document.documentElement;
            delete root.dataset.theme;
            const mq = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
            root.dataset.motion = mq && mq.matches ? 'reduced' : 'full';
            root.dataset.colorblind = this.get('wordle.colorblind') ? 'on' : 'off';
        },

        // ── Preferencias globales de interfaz (no dependen del usuario) ──
        getUI(key, fallback) {
            const ui = Nexus.storage.get('ui', {});
            return ui[key] === undefined ? fallback : ui[key];
        },
        setUI(key, value) {
            const ui = Nexus.storage.get('ui', {});
            ui[key] = value;
            Nexus.storage.set('ui', ui);
        }
    };

    Nexus.services.settings = Settings;
})();
