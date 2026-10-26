/* ============================================================
   NEXUS ARCADE · core/utils.js
   Utilidades puras y pequeñas, compartidas por toda la app.
   ============================================================ */
(function () {
    'use strict';

    const U = Nexus.util = {};

    // ── DOM ──────────────────────────────────────────────────
    U.$ = (sel, root) => (root || document).querySelector(sel);
    U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    /** Escapa texto para insertarlo de forma segura en HTML (nombres de usuario, etc.). */
    U.esc = (value) => String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    /** Crea un elemento a partir de un string HTML. */
    U.html = (markup) => {
        const t = document.createElement('template');
        t.innerHTML = markup.trim();
        return t.content.firstElementChild;
    };

    // ── Formato ──────────────────────────────────────────────
    U.formatTime = (seconds) => {
        if (seconds == null || isNaN(seconds)) return '--:--';
        seconds = Math.max(0, Math.round(seconds));
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    };

    /** Duración legible: "2 h 5 min", "45 min", "30 s". */
    U.formatDuration = (seconds) => {
        seconds = Math.max(0, Math.round(seconds || 0));
        if (seconds < 60) return `${seconds} s`;
        const m = Math.floor(seconds / 60);
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60);
        return `${h} h ${m % 60} min`;
    };

    U.formatNumber = (n) => (Number(n) || 0).toLocaleString('es-ES');

    U.formatDate = (ts) => new Date(ts).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric'
    });

    U.timeAgo = (ts) => {
        const diff = Math.max(0, Date.now() - ts);
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'ahora mismo';
        if (min < 60) return `hace ${min} min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `hace ${h} h`;
        const d = Math.floor(h / 24);
        if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
        return U.formatDate(ts);
    };

    U.pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

    // ── Fechas (siempre en hora local del usuario) ───────────
    U.dayKey = (date) => {
        const d = date ? new Date(date) : new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };

    /** Días enteros entre dos claves YYYY-MM-DD (b - a). */
    U.daysBetween = (a, b) => {
        const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
        const da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
        const db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
        return Math.round((db - da) / 86400000);
    };

    // ── Números / colecciones ────────────────────────────────
    U.clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    U.randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    /** Fisher-Yates (el `sort(() => Math.random() - .5)` original está sesgado). */
    U.shuffle = (arr) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    U.debounce = (fn, ms) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };

    U.uid = () => {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    };

    U.deepClone = (o) => JSON.parse(JSON.stringify(o));

    /** Mezcla profunda: rellena en `target` lo que falte según `defaults`. */
    U.fillDefaults = (target, defaults) => {
        for (const k of Object.keys(defaults)) {
            const dv = defaults[k];
            if (target[k] === undefined || target[k] === null) {
                target[k] = U.deepClone(dv);
            } else if (dv && typeof dv === 'object' && !Array.isArray(dv) && typeof target[k] === 'object') {
                U.fillDefaults(target[k], dv);
            }
        }
        return target;
    };

    // ── Archivos / portapapeles ──────────────────────────────
    U.download = (filename, text, mime) => {
        const blob = new Blob([text], { type: mime || 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    U.copyText = async (text) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) { /* cae al método clásico */ }
        try {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch (e) { return false; }
    };
})();
