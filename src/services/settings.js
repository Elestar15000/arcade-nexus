/* ============================================================
   NEXUS ARCADE · services/settings.js
   Ajustes por usuario (se guardan dentro de sus datos) y
   preferencias de interfaz globales (estado de la sidebar).
   ============================================================ */
(function () {
    'use strict';

    const DEFAULTS = Nexus.schema.DEFAULT_SETTINGS;

    const THEMES = [
        { id: 'neon',   name: 'Recreativa', colors: ['#ffd23f', '#3de0f5'] },
        { id: 'ocean',  name: 'Océano',     colors: ['#4fd1ff', '#8affc1'] },
        { id: 'sunset', name: 'Atardecer',  colors: ['#ff7a59', '#ffd166'] },
        { id: 'forest', name: 'Bosque',     colors: ['#b6f03c', '#4fe3a8'] }
    ];

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
        THEMES,
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

        /** Aplica al documento los ajustes visuales. */
        apply() {
            const root = document.documentElement;
            const theme = THEMES.some(t => t.id === this.get('theme')) ? this.get('theme') : 'neon';
            root.dataset.theme = theme;
            root.dataset.motion = this.get('reduceMotion') ? 'reduced' : 'full';
            root.dataset.colorblind = this.get('wordle.colorblind') ? 'on' : 'off';
            const particles = document.getElementById('bg-particles');
            if (particles) particles.style.display = this.get('particles') ? '' : 'none';
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
