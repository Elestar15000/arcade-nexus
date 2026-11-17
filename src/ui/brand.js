/* ============================================================
   NEXUS ARCADE · ui/brand.js — Piezas de la identidad visual
   · logo(): el rombo amarillo (símbolo corporativo), plano
   · logo3d(): el rombo con volumen y brillo para portadas
   · sparkle(): destello de cuatro puntas
   · icon(): iconos de línea (usuario, candado, ojo, flecha…)
   · decor(): fondo decorativo de barras diagonales y destellos
   Todo es SVG en línea: sin imágenes externas.
   ============================================================ */
(function () {
    'use strict';

    let seq = 0;
    /** Símbolo plano (sidebar, favicon, tamaños pequeños). */
    function logo(size = 40, cls = '') {
        const k = 'nxl-' + (++seq);
        return `<svg class="nx-logo ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE680"/><stop offset=".5" stop-color="#FFD43B"/><stop offset="1" stop-color="#F2A900"/></linearGradient></defs>
            <g transform="rotate(45 50 50)">
                <rect x="17" y="17" width="66" height="66" rx="15" fill="url(#${k})"/>
                <rect x="37" y="37" width="26" height="26" rx="6" fill="#141640"/>
            </g></svg>`;
    }

    /** Rombo con volumen: canto inferior, brillo superior y halo. */
    function logo3d(cls = '') {
        // ids únicos: si el primer SVG queda oculto (display:none) sus degradados no se pintan en los demás
        const k = 'nx3-' + (++seq);
        return `<svg class="nx-logo3d ${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="${k}-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE98F"/><stop offset=".45" stop-color="#FFD43B"/><stop offset="1" stop-color="#F7B500"/></linearGradient>
                <linearGradient id="${k}-side" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E39A00"/><stop offset="1" stop-color="#B46F00"/></linearGradient>
                <linearGradient id="${k}-hole" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E1035"/><stop offset="1" stop-color="#262A6E"/></linearGradient>
                <radialGradient id="${k}-glow"><stop offset="0" stop-color="#FFD43B" stop-opacity=".55"/><stop offset="1" stop-color="#FFD43B" stop-opacity="0"/></radialGradient>
            </defs>
            <circle cx="100" cy="104" r="96" fill="url(#${k}-glow)"/>
            <g transform="rotate(45 100 100)">
                <rect x="40" y="48" width="120" height="120" rx="28" fill="url(#${k}-side)"/>
                <rect x="40" y="40" width="120" height="120" rx="28" fill="url(#${k}-face)"/>
                <rect x="44" y="44" width="112" height="112" rx="25" fill="none" stroke="#FFF6C4" stroke-opacity=".7" stroke-width="3"/>
                <rect x="76" y="76" width="48" height="48" rx="11" fill="url(#${k}-hole)"/>
                <rect x="76" y="76" width="48" height="48" rx="11" fill="none" stroke="#C98600" stroke-width="4"/>
            </g>
            <path d="M58 70 Q84 40 112 34" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/>
        </svg>`;
    }

    /** Destello de cuatro puntas. */
    const sparkle = (cls = '', style = '') => `<svg class="nx-spark ${cls}" style="${style}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z" fill="currentColor"/></svg>`;

    const ICONS = {
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
        lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
        eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6C3.8 8.5 2 12 2 12s3.6 7 10 7a9.6 9.6 0 005.4-1.6"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
        arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
        chevronDown: '<path d="M6 9l6 6 6-6"/>',
        chevronRight: '<path d="M9 6l6 6-6 6"/>',
        play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
        grid: '<rect x="3" y="3" width="8" height="8" rx="2.2" fill="currentColor" stroke="none"/><rect x="13" y="3" width="8" height="8" rx="2.2" fill="currentColor" stroke="none"/><rect x="3" y="13" width="8" height="8" rx="2.2" fill="currentColor" stroke="none"/><rect x="13" y="13" width="8" height="8" rx="2.2" fill="currentColor" stroke="none"/>',
        bars: '<rect x="3" y="12" width="4.5" height="9" rx="1.5" fill="#FFD43B" stroke="none"/><rect x="9.75" y="7" width="4.5" height="14" rx="1.5" fill="#00C9A7" stroke="none"/><rect x="16.5" y="3" width="4.5" height="18" rx="1.5" fill="#FF6584" stroke="none"/>',
        logout: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9"/>',
        cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'
    };
    /** Icono de línea (hereda el color del texto). */
    const icon = (name, size = 20, cls = '') => `<svg class="nx-ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

    /**
     * Fondo decorativo: barras diagonales redondeadas (índigo y amarillas), rombos y destellos.
     * variant: 'hero' (banner) | 'auth' (pantalla de acceso)
     */
    function decor(variant = 'hero') {
        const bars = variant === 'auth'
            ? [['y', -6, -14, 34, 150], ['i', 8, 54, 22, 120], ['i', 74, -10, 26, 130], ['y', 88, 70, 30, 150], ['i', 60, 74, 18, 90], ['i2', 26, 70, 14, 60]]
            : [['i', 32, -30, 16, 90], ['i', 60, 40, 22, 110], ['i2', 4, 50, 12, 70], ['y', 92, 70, 12, 110], ['i', 78, -40, 14, 80]];
        const sparks = variant === 'auth'
            ? [[16, 22, 26], [8, 84, 30], [90, 12, 22], [86, 88, 18], [52, 6, 14]]
            : [[44, 20, 26], [92, 18, 34], [56, 60, 20], [74, 10, 14]];
        const gems = variant === 'auth' ? [[10, 8, 46], [64, 90, 36]] : [[66, 82, 34]];
        return `<div class="nx-decor nx-decor-${variant}" aria-hidden="true">
            ${bars.map(([c, x, y, w, h]) => `<span class="nx-bar nx-bar-${c}" style="left:${x}%;top:${y}%;width:${w}vmin;height:${h}vmin"></span>`).join('')}
            ${gems.map(([x, y, s]) => `<span class="nx-gem" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px"></span>`).join('')}
            ${sparks.map(([x, y, s], i) => sparkle('', `left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${-i * 0.9}s`)).join('')}
        </div>`;
    }

    window.Nexus = window.Nexus || {}; Nexus.ui = Nexus.ui || {};
    Nexus.ui.brand = { logo, logo3d, sparkle, icon, decor };
})();
