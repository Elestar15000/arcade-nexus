/* ============================================================
   NEXUS ARCADE · ui/avatar.js — Pintado de avatares PNG
   · Nexus.ui.avatar.html(valor, { size, cls, alt })  → <nx-av><img></nx-av>
   · Nexus.ui.avatar.user(usuario, 'sm'|'md'|'lg'|'xl') → avatar redondo con el anillo del acento
   · Nexus.ui.avatar.set(elemento, valor, size)         → cambia el avatar de un elemento ya pintado
   · Nexus.ui.avatar.accent(valor)                      → color de acento del avatar
   `valor` puede ser un id del catálogo o un emoji antiguo (se traduce solo).
   Si el PNG todavía no existe (o no carga) se ve el rombo de la marca sobre el
   color del avatar, sin parpadeos: las rutas que fallan se recuerdan.
   ============================================================ */
(function () {
    'use strict';

    const esc = Nexus.util.esc;
    const A = () => Nexus.services.avatars;
    const missing = new Set();

    /** Tamaño de PNG adecuado para un tamaño en pantalla (px CSS), contando pantallas retina. */
    const pick = (px) => (px * (window.devicePixelRatio || 1) > 260 ? 512 : 256);

    function html(value, { size = 256, cls = '', alt = '' } = {}) {
        const a = A().info(value);
        if (!a) return '';
        const src = A().url(a.id, size);
        const known = missing.has(src);
        if (value === '❔' || value === '?') return `<nx-av class="is-missing is-unknown ${cls}" style="--av-accent:#64748b"></nx-av>`;   // rival aún sin conectar
        return `<nx-av class="${known ? 'is-missing' : ''} ${cls}" style="--av-accent:${esc(a.accent)}" data-av="${esc(a.id)}">`
            + (known ? '' : `<img class="nx-av-img" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" draggable="false">`)
            + '</nx-av>';
    }

    const SIZE_PX = { xs: 22, sm: 30, md: 42, lg: 64, xl: 92, xxl: 160 };
    /** Avatar redondo con anillo (sustituye al antiguo span con emoji). */
    function user(u, size = 'md', { label = false } = {}) {
        u = u || {};
        const a = A().info(u.avatar);
        // Marco de avatar (Cosméticos · Colección): el propio se lee de las recompensas; el de otros, de su resumen público
        const me = Nexus.services.users && Nexus.services.users.current();
        const frame = u.frame !== undefined ? u.frame : (me && u.id === me.id && Nexus.services.rewards ? Nexus.services.rewards.frame() : '');
        const fcls = frame && /^[a-z0-9-]+$/.test(frame) ? ` has-frame frame-${frame}` : '';
        return `<span class="avatar avatar-${size}${fcls}" style="--user-color:${esc(a.accent)}"${label ? ` role="img" aria-label="${esc(a.name)}"` : ' aria-hidden="true"'}>${html(a.id, { size: pick(SIZE_PX[size] || 42) })}</span>`;
    }

    /** Pinta un avatar dentro de `el` sólo si ha cambiado (para cabeceras que se refrescan a menudo). */
    function set(el, value, size = 256) {
        if (!el) return;
        const id = A().resolve(value);
        if (el.dataset.avatar === id && el.firstElementChild) return;
        el.dataset.avatar = id;
        el.innerHTML = html(id, { size });
    }

    const accent = (value) => A().info(value).accent;

    /** Pone en un círculo .avatar ya existente el marco equipado del jugador actual. */
    function applyFrame(el) {
        if (!el) return;
        [...el.classList].filter(c => c === 'has-frame' || c.startsWith('frame-')).forEach(c => el.classList.remove(c));
        const f = Nexus.services.rewards && Nexus.services.rewards.data() ? Nexus.services.rewards.frame() : '';
        if (f) el.classList.add('has-frame', 'frame-' + f);
    }

    // Un PNG que no carga (todavía no generado, o sin red): se marca y se muestra el rombo de reserva
    document.addEventListener('error', (e) => {
        const img = e.target;
        if (!img || img.tagName !== 'IMG' || !img.classList.contains('nx-av-img')) return;
        missing.add(img.getAttribute('src'));
        const box = img.parentElement;
        if (box) box.classList.add('is-missing');
        img.remove();
    }, true);

    Nexus.ui.avatar = { html, user, set, accent, pick, applyFrame };
})();
