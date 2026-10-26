/* ============================================================
   NEXUS ARCADE · services/settings.js
   Ajustes por usuario (se guardan dentro de sus datos) y
   preferencias de interfaz globales (estado de la sidebar).
   ============================================================ */
(function () {
    'use strict';

    const DEFAULTS = Nexus.schema.DEFAULT_SETTINGS;

    const THEMES = [
        { id: 'neon',   name: 'Neón',      colors: ['#6c5ce7', '#00cec9'] },
        { id: 'ocean',  name: 'Océano',    colors: ['#0984e3', '#00cec9'] },
        { id: 'sunset', name: 'Atardecer', colors: ['#e17055', '#fdcb6e'] },
        { id: 'forest', name: 'Bosque',    colors: ['#00b894', '#a3cb38'] }
    ];

    const Settings = {
        THEMES,
        DEFAULTS,

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
            data.settings = {};
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
