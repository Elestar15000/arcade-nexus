/* ============================================================
   NEXUS ARCADE · ui/art.js — Ilustraciones SVG de cabecera
   Trofeo con laureles (Logros), diana con flecha y cofre con
   gemas (Misiones). Vectores propios en la paleta de la marca:
   amarillo Nexus, índigo y acentos cian / violeta / coral.
   Cada llamada usa ids de degradado únicos.
   ============================================================ */
(function () {
    'use strict';

    let seq = 0;
    const uid = () => 'nxa' + (++seq);

    /** Hoja de laurel girada en (x, y). */
    const leaf = (x, y, rot, fill) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="5" transform="rotate(${rot} ${x} ${y})" fill="${fill}"/>`;
    const sparkle = (x, y, s, fill = '#FFE680') => `<path d="M${x} ${y - s}C${x + s * .18} ${y - s * .18} ${x + s * .18} ${y - s * .18} ${x + s} ${y}C${x + s * .18} ${y + s * .18} ${x + s * .18} ${y + s * .18} ${x} ${y + s}C${x - s * .18} ${y + s * .18} ${x - s * .18} ${y + s * .18} ${x - s} ${y}C${x - s * .18} ${y - s * .18} ${x - s * .18} ${y - s * .18} ${x} ${y - s}z" fill="${fill}"/>`;

    function trophy() {
        const i = uid();
        const L = [];
        for (let k = 0; k < 7; k++) {
            const th = (238 - k * 16) * Math.PI / 180, r = 76;
            const x = 100 + Math.cos(th) * r, y = 96 - Math.sin(th) * r;
            const rot = -(238 - k * 16) + 90 + 25;      // tangente al arco, algo abierta hacia fuera
            L.push(leaf(x.toFixed(1), y.toFixed(1), rot, `url(#${i}g)`));
            L.push(leaf((200 - x).toFixed(1), y.toFixed(1), -rot, `url(#${i}g)`));
        }
        return `<svg class="nx-art nx-art-trophy" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
            <defs>
                <radialGradient id="${i}h" cx="50%" cy="45%" r="50%"><stop offset="0" stop-color="#FFD43B" stop-opacity=".55"/><stop offset="1" stop-color="#FFD43B" stop-opacity="0"/></radialGradient>
                <linearGradient id="${i}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".45" stop-color="#FFD43B"/><stop offset="1" stop-color="#C98300"/></linearGradient>
                <linearGradient id="${i}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B86F00"/><stop offset=".3" stop-color="#FFE680"/><stop offset=".55" stop-color="#FFD43B"/><stop offset="1" stop-color="#A86200"/></linearGradient>
                <linearGradient id="${i}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3fae"/><stop offset="1" stop-color="#1d2072"/></linearGradient>
            </defs>
            <circle cx="100" cy="96" r="92" fill="url(#${i}h)"/>
            <g>${L.join('')}</g>
            <path d="M62 50h-16c0 26 12 40 30 42M138 50h16c0 26-12 40-30 42" fill="none" stroke="url(#${i}c)" stroke-width="8" stroke-linecap="round"/>
            <path d="M58 40h84v18c0 30-18 50-42 50S58 88 58 58z" fill="url(#${i}c)"/>
            <path d="M58 40h84v8H58z" fill="#FFF1A8" opacity=".7"/>
            <path d="M72 50c0 26 8 40 20 46" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
            <path d="M100 58l5.3 10.8 11.9 1.7-8.6 8.4 2 11.8L100 85.1l-10.6 5.6 2-11.8-8.6-8.4 11.9-1.7z" fill="#C98300" opacity=".85"/>
            <path d="M92 106h16l3 22H89z" fill="url(#${i}c)"/>
            <rect x="74" y="128" width="52" height="10" rx="4" fill="url(#${i}c)"/>
            <rect x="66" y="138" width="68" height="22" rx="6" fill="url(#${i}b)" stroke="#FFD43B" stroke-width="3"/>
            <rect x="86" y="145" width="28" height="8" rx="3" fill="#FFD43B" opacity=".85"/>
            ${sparkle(40, 36, 9)}${sparkle(164, 58, 7)}${sparkle(156, 150, 5, '#fff')}
        </svg>`;
    }

    function target() {
        const i = uid();
        return `<svg class="nx-art nx-art-target" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
            <defs>
                <radialGradient id="${i}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF6584" stop-opacity=".45"/><stop offset="1" stop-color="#FF6584" stop-opacity="0"/></radialGradient>
                <linearGradient id="${i}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8AA2"/><stop offset="1" stop-color="#C8193F"/></linearGradient>
                <linearGradient id="${i}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".5" stop-color="#FFD43B"/><stop offset="1" stop-color="#C98300"/></linearGradient>
            </defs>
            <circle cx="96" cy="104" r="92" fill="url(#${i}h)"/>
            <circle cx="96" cy="106" r="74" fill="url(#${i}g)"/>
            <circle cx="96" cy="104" r="68" fill="url(#${i}r)"/>
            <circle cx="96" cy="104" r="53" fill="#FFF3F5"/>
            <circle cx="96" cy="104" r="40" fill="url(#${i}r)"/>
            <circle cx="96" cy="104" r="26" fill="#FFF3F5"/>
            <circle cx="96" cy="104" r="13" fill="url(#${i}r)"/>
            <path d="M40 76a68 68 0 0 1 40-36" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>
            <path d="M98 102L166 34" stroke="#3a2a10" stroke-width="7" stroke-linecap="round"/>
            <path d="M98 102L166 34" stroke="url(#${i}g)" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M98 102l14-4-10-10z" fill="#5b6276"/>
            <path d="M160 40l6-22 6 10 10 2-22 10zM166 34l22-6-6 10 2 10-18-14z" fill="url(#${i}g)" stroke="#C98300" stroke-width="1.5" stroke-linejoin="round"/>
            ${sparkle(34, 40, 8)}${sparkle(176, 120, 6, '#fff')}
        </svg>`;
    }

    function chest() {
        const i = uid();
        const gem = (x, y, s, a, b) => `<path d="M${x} ${y - s}l${s * .8} ${s * .55}-${s * .8} ${s * 1.2}-${s * .8}-${s * 1.2}z" fill="${a}"/><path d="M${x} ${y - s}l${s * .8} ${s * .55}H${x - s * .8}z" fill="${b}" opacity=".85"/>`;
        return `<svg class="nx-art nx-art-chest" viewBox="0 0 240 200" aria-hidden="true" focusable="false">
            <defs>
                <radialGradient id="${i}h" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#FFD43B" stop-opacity=".6"/><stop offset="1" stop-color="#FFD43B" stop-opacity="0"/></radialGradient>
                <linearGradient id="${i}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4dd8"/><stop offset="1" stop-color="#4a1f8f"/></linearGradient>
                <linearGradient id="${i}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a06bf0"/><stop offset="1" stop-color="#6a33c0"/></linearGradient>
                <linearGradient id="${i}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1A8"/><stop offset=".5" stop-color="#FFD43B"/><stop offset="1" stop-color="#C98300"/></linearGradient>
            </defs>
            <ellipse cx="120" cy="96" rx="110" ry="86" fill="url(#${i}h)"/>
            <ellipse cx="120" cy="180" rx="92" ry="12" fill="#090a2b" opacity=".45"/>
            <path d="M44 70c0-34 26-50 76-50s76 16 76 50z" fill="url(#${i}l)" stroke="url(#${i}g)" stroke-width="5"/>
            <path d="M82 24v46M158 24v46" stroke="url(#${i}g)" stroke-width="9"/>
            <path d="M48 76h144" stroke="#FFF1A8" stroke-width="3" opacity=".7"/>
            <g>${gem(96, 82, 16, '#3DE0F5', '#c9f8ff')}${gem(124, 76, 20, '#A879FF', '#e2d2ff')}${gem(150, 84, 14, '#FF6584', '#ffd0da')}${gem(110, 86, 10, '#00C9A7', '#bff5ea')}</g>
            <circle cx="138" cy="90" r="8" fill="url(#${i}g)"/><circle cx="82" cy="92" r="6" fill="url(#${i}g)"/>
            <rect x="40" y="88" width="160" height="84" rx="12" fill="url(#${i}w)" stroke="url(#${i}g)" stroke-width="5"/>
            <path d="M82 90v80M158 90v80" stroke="url(#${i}g)" stroke-width="9"/>
            <path d="M42 112h156" stroke="#2c0f5c" stroke-width="3" opacity=".6"/>
            <rect x="104" y="104" width="32" height="38" rx="7" fill="url(#${i}g)" stroke="#9a5d00" stroke-width="2"/>
            <path d="M120 116a5 5 0 0 1 3 9l2 8h-10l2-8a5 5 0 0 1 3-9z" fill="#5a3300"/>
            ${gem(26, 160, 12, '#3DE0F5', '#c9f8ff')}${gem(214, 154, 14, '#A879FF', '#e2d2ff')}
            ${sparkle(40, 34, 8)}${sparkle(206, 42, 9)}${sparkle(196, 110, 5, '#fff')}
        </svg>`;
    }

    Nexus.ui.art = { trophy, target, chest };
})();
