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

    // ── Nexito ──────────────────────────────────────────────
    // Bolita amarilla de ojos grandes con bracitos y piececitos, dentro de una cúpula de cristal
    // sobre un pedestal índigo. Forma única (sin evolución). Se dibuja a escala 1620 (K) y
    // los complementos (ropa, zzz) en la escala antigua de 240.
    // opts: { mood, outfit: { 'pet-hat', 'pet-glasses', 'pet-scarf', 'pet-dome' }, scene }
    const K = .15, Y = '#ffd400', YD = '#e2ab01', BR = '#a94701';
    function face(mood) {
        const w = (d, sw = 20) => `<path d="${d}" fill="none" stroke="${BR}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
        const eyes = `<g class="nxp-eyes">
            <circle cx="645" cy="978" r="106" fill="#fff"/><circle cx="922" cy="978" r="106" fill="#fff"/>
            <ellipse cx="672" cy="982" rx="60" ry="67" fill="#000"/><ellipse cx="906" cy="982" rx="60" ry="67" fill="#000"/>
            <path fill="${BR}" d="M630 1012A42 30 0 0 0 714 1012A42 18 0 0 1 630 1012Z"/><path fill="${BR}" d="M864 1012A42 30 0 0 0 948 1012A42 18 0 0 1 864 1012Z"/>
            <circle cx="690" cy="966" r="34" fill="#fff"/><circle cx="636" cy="958" r="11" fill="#fff"/>
            <circle cx="892" cy="969" r="32" fill="#fff"/><circle cx="944" cy="955" r="11" fill="#fff"/></g>`;
        const mouth = `<path fill="${BR}" d="M766 1058A26 22 0 0 0 818 1058Z"/>`;
        const drop = (x, y) => `<path d="M${x} ${y}q34 48 0 74a37 37 0 0 1-30-37q0-17 30-37z" fill="#7FD8FF" stroke="#fff" stroke-width="6"/>`;
        const closed = (up, dy = 0) => [645, 922].map(x => w(`M${x - 80} ${978 + dy}Q${x} ${978 + dy + (up ? -90 : 50)} ${x + 80} ${978 + dy}`, 22)).join('');
        switch (mood) {
            case 'happy': case 'rested':
                return closed(true, 20) + `<path d="M746 1050Q790 1124 834 1050Z" fill="${BR}"/><path d="M768 1086Q790 1068 812 1086Q790 1102 768 1086Z" fill="#ff8a7a"/>`
                    + (mood === 'rested' ? sparkle(1140, 730, 46, '#fff') + sparkle(430, 760, 30, '#fff') : '');
            case 'hungry':
                return eyes + `<ellipse cx="792" cy="1076" rx="26" ry="32" fill="${BR}"/><path d="M816 1094q10 30 2 56" fill="none" stroke="#7FD8FF" stroke-width="14" stroke-linecap="round"/>`;
            case 'bored':
                return eyes + [645, 922].map(x => `<path d="M${x - 110} 980A110 110 0 0 1 ${x + 110} 980Z" fill="${Y}"/>`).join('')
                    + w('M535 980H755M812 980H1032', 18) + w('M762 1070H822', 16);
            case 'tired':
                return closed(false) + w('M756 1072q16-14 32 0t32 0', 14) + drop(1120, 790);
            case 'sleepy':
                return closed(false, 8) + `<ellipse cx="792" cy="1072" rx="15" ry="18" fill="${BR}"/>`;
            case 'sad':
                return eyes + w('M548 852L700 814M1019 852L867 814', 18) + w('M756 1088Q790 1052 824 1088', 14) + drop(580, 1062);
            default:
                return eyes + mouth;
        }
    }
    // ── Ropa de Nexito ─────────────────────────────────────
    // Sombreros, accesorios y ropa se dibujan a escala 240 ({i} = prefijo de ids del SVG).
    const HATS = {
        'nx-gorra': `<path d="M82 86q4-34 38-36t38 36q-38-10-76 0z" fill="url(#{i}cap)" stroke="#11134a" stroke-width="2.5" stroke-linejoin="round"/><path d="M152 84q26-6 34 4q-14 6-36 2z" fill="#2a2f9a" stroke="#11134a" stroke-width="2.5" stroke-linejoin="round"/><path d="M120 54l8 9-8 9-8-9z" fill="#FFD43B" stroke="#11134a" stroke-width="1.5"/><circle cx="120" cy="50" r="3" fill="#FF6584"/>`,
        'nx-auriculares': `<path d="M70 124q0-66 50-66t50 66" fill="none" stroke="#2a2f9a" stroke-width="8" stroke-linecap="round"/><path d="M70 124q0-66 50-66t50 66" fill="none" stroke="#5D67F8" stroke-width="3" stroke-linecap="round"/><rect x="56" y="110" width="20" height="34" rx="9" fill="#FF6584" stroke="#2a2f9a" stroke-width="3.5"/><rect x="164" y="110" width="20" height="34" rx="9" fill="#3DE0F5" stroke="#2a2f9a" stroke-width="3.5"/><circle cx="66" cy="127" r="3" fill="#fff" opacity=".7"/><circle cx="174" cy="127" r="3" fill="#fff" opacity=".7"/>`,
        'nx-copa': `<path d="M96 40h48l-3 42H99z" fill="#15163f"/><path d="M97 64h46l-1 10H98z" fill="#FF6584"/><ellipse cx="120" cy="84" rx="40" ry="8" fill="#15163f"/><path d="M104 46v28" stroke="#fff" stroke-opacity=".18" stroke-width="5" stroke-linecap="round"/>`,
        'nx-corona': `<path d="M90 88l3-36 15 16 12-26 12 26 15-16 3 36q-30-8-60 0z" fill="#FFD43B" stroke="#B87A00" stroke-width="2.5" stroke-linejoin="round"/><path d="M93 80q27-6 54 0" fill="none" stroke="#B87A00" stroke-width="2"/><circle cx="120" cy="72" r="5" fill="#FF6584" stroke="#fff" stroke-width="1.2"/><circle cx="103" cy="77" r="3.8" fill="#3DE0F5"/><circle cx="137" cy="77" r="3.8" fill="#A879FF"/>`,
        'nx-gorro-navidad': `<path d="M86 86Q90 48 122 42Q152 38 170 66L164 74Q154 60 142 62Q152 74 154 86Z" fill="#d62839"/><path d="M96 80Q100 54 122 48" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="5" stroke-linecap="round"/><path d="M142 62Q152 74 154 86L146 86Q146 72 142 62Z" fill="#a51d2c"/>
            <rect x="80" y="78" width="80" height="15" rx="7.5" fill="#fff" stroke="#d9e2ee" stroke-width="1.5"/><path d="M88 82q3 3 6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0t6 0" fill="none" stroke="#dfe6f2" stroke-width="2"/><circle cx="167" cy="74" r="9" fill="#fff" stroke="#d9e2ee" stroke-width="1.5"/><circle cx="164" cy="71" r="3" fill="#fff"/>`,
        'nx-gorro-lana': `<path d="M82 88Q80 46 120 46Q160 46 158 88Z" fill="#3DA5F5"/><path d="M84 70H156M82 60H158" stroke="#fff" stroke-width="5" opacity=".85"/><path d="M98 52Q110 48 120 48" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>
            <rect x="78" y="78" width="84" height="15" rx="6" fill="#2a6fd1"/><path d="M86 80v11M94 80v11M102 80v11M110 80v11M118 80v11M126 80v11M134 80v11M142 80v11M150 80v11" stroke="#1f58ad" stroke-width="2.5"/>
            <circle cx="120" cy="44" r="10" fill="#fff4d6"/><circle cx="116" cy="40" r="3.5" fill="#fff"/>`,
        'nx-reno': `<path d="M80 94Q120 70 160 94" fill="none" stroke="#6b3d1a" stroke-width="5" stroke-linecap="round"/>
            <g fill="none" stroke="#9b6a3c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M92 84L84 56M86 64L72 58M85 60L92 46M88 72L76 72"/><path d="M148 84L156 56M154 64L168 58M155 60L148 46M152 72L164 72"/></g>
            <path d="M112 80q-10-8-18-2q8 8 18 2zM128 80q10-8 18-2q-8 8-18 2z" fill="#2e8b3e" stroke="#1d6a2c" stroke-width="1.2"/><circle cx="116" cy="79" r="3.6" fill="#d62839"/><circle cx="124" cy="79" r="3.6" fill="#d62839"/><circle cx="120" cy="74" r="3.6" fill="#e8394a"/>
            <circle cx="120" cy="88" r="5" fill="#FFD43B" stroke="#b98a00" stroke-width="1.5"/><path d="M117 89h6" stroke="#b98a00" stroke-width="1.5"/>`,
        'nx-bruja': `<ellipse cx="120" cy="86" rx="52" ry="9" fill="#2f1850"/><path d="M92 84Q110 62 116 26Q120 16 128 24Q132 40 150 84Z" fill="#4b2a7a"/><path d="M116 26Q120 16 128 24Q124 22 120 34Z" fill="#5d3a92"/>
            <path d="M95 74Q120 82 147 74L150 84Q120 92 92 84Z" fill="#ff8c1a"/><rect x="113" y="74" width="14" height="12" rx="2" fill="none" stroke="#FFD43B" stroke-width="2.5"/><path d="M104 46q4-10 10-16" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="4" stroke-linecap="round"/>`,
        'nx-vaquero': `<path d="M64 82Q72 96 120 94Q168 96 176 82Q168 78 158 84Q120 92 82 84Q72 78 64 82Z" fill="#8b5a2b" stroke="#5c3a17" stroke-width="2"/><path d="M88 84Q84 56 104 50Q120 60 136 50Q156 56 152 84Q120 90 88 84Z" fill="#a8703a" stroke="#5c3a17" stroke-width="2"/>
            <path d="M89 76Q120 82 151 76L152 84Q120 90 88 84Z" fill="#4a2a10"/><path d="M98 60Q102 54 108 54" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/><path d="M118 79l3-3 3 3-3 3z" fill="#FFD43B"/>`,
        'nx-chef': `<g fill="#fff" stroke="#d8dde8" stroke-width="2"><circle cx="98" cy="54" r="16"/><circle cx="142" cy="54" r="16"/><circle cx="120" cy="44" r="19"/></g><rect x="90" y="54" width="60" height="34" rx="4" fill="#fff" stroke="#d8dde8" stroke-width="2"/>
            <path d="M104 62v22M120 60v24M136 62v22" stroke="#e3e8f0" stroke-width="2.5"/><rect x="90" y="80" width="60" height="8" rx="3" fill="#eef2f8"/>`,
        'nx-fiesta': `<g transform="rotate(-12 120 88)"><path d="M98 88L120 30L142 88Z" fill="#FF6584"/><path d="M106 68L134 68M101 80L139 80M112 54L128 54" stroke="#FFD43B" stroke-width="5"/><circle cx="112" cy="74" r="2.4" fill="#3DE0F5"/><circle cx="128" cy="62" r="2.4" fill="#3DE0F5"/>
            <circle cx="120" cy="28" r="7" fill="#FFD43B"/><path d="M114 24l12 8M126 24l-12 8M120 20v16" stroke="#ff9f1c" stroke-width="2"/></g>`,
        'nx-flores': `<path d="M78 90Q120 74 162 90" fill="none" stroke="#3a9d3a" stroke-width="4" stroke-linecap="round"/><path d="M90 84q-6-6-12-2q6 6 12 2zM150 84q6-6 12-2q-6 6-12 2z" fill="#4cb84c"/>
            ${[[84, 88, 'd'], [101, 82, 'p'], [120, 79, 'd'], [139, 82, 'p'], [156, 88, 'd']].map(([x, y, t]) => t === 'd'
                ? `<g>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${x}" cy="${y - 6}" rx="3.4" ry="6" fill="#fff" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="3.6" fill="#FFD43B"/></g>`
                : `<g>${[0, 90, 180, 270].map(a => `<circle cx="${x}" cy="${y - 5}" r="5.2" fill="#e8394a" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="3" fill="#2a1a1a"/></g>`).join('')}`,
        'nx-pirata': `<path d="M66 88Q76 54 120 56Q164 54 174 88Q150 76 120 82Q90 76 66 88Z" fill="#1b1b2a" stroke="#FFD43B" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="120" cy="68" r="7" fill="#fff"/><rect x="116" y="72" width="8" height="5" rx="1.5" fill="#fff"/><circle cx="117.4" cy="67" r="1.8" fill="#1b1b2a"/><circle cx="122.6" cy="67" r="1.8" fill="#1b1b2a"/>
            <path d="M108 72l24 10M132 72l-24 10" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
        'nx-boina': `<path d="M80 84Q76 60 116 58Q162 56 164 78Q160 90 120 90Q88 92 80 84Z" fill="#c0392b"/><path d="M84 84Q120 92 160 80" fill="none" stroke="#8e2a1f" stroke-width="3"/><path d="M118 58l2-6 3 6" fill="#8e2a1f"/><path d="M94 68q10-6 22-7" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>`,
        'nx-aureola': `<g class="nxp-glow"><ellipse cx="120" cy="56" rx="32" ry="8.5" fill="none" stroke="#FFF2A8" stroke-width="9" opacity=".45"/><ellipse cx="120" cy="56" rx="32" ry="8.5" fill="none" stroke="#FFE066" stroke-width="5"/></g>`
    };
    // Ajuste de cada sombrero sobre la cabeza (por defecto: translate(-1.5 33))
    const HAT_AT = { 'nx-auriculares': 'translate(-1 26) scale(.86 .92) translate(19 4)', 'nx-aureola': 'translate(-1.5 36)' };
    const GLASSES = {
        'nx-gafas-sol': `<g><path d="M80 122q0-8 9-8h20q9 0 9 8v4q0 15-19 15t-19-15z" fill="#0b0c2a" stroke="#FFD43B" stroke-width="2.4"/><path d="M122 122q0-8 9-8h20q9 0 9 8v4q0 15-19 15t-19-15z" fill="#0b0c2a" stroke="#FFD43B" stroke-width="2.4"/><path d="M118 122h4" stroke="#FFD43B" stroke-width="3"/><path d="M86 120l9 9M128 120l9 9" stroke="#fff" stroke-width="2.5" opacity=".45" stroke-linecap="round"/></g>`,
        'nx-gafas-pixel': `<g fill="#0b0c2a"><rect x="78" y="118" width="84" height="6"/><rect x="82" y="124" width="34" height="6"/><rect x="124" y="124" width="34" height="6"/><rect x="86" y="130" width="26" height="6"/><rect x="128" y="130" width="26" height="6"/><rect x="86" y="124" width="6" height="6" fill="#fff"/><rect x="128" y="124" width="6" height="6" fill="#fff"/></g>`,
        'nx-gafas-redondas': `<g fill="#cfe8ff" fill-opacity=".22" stroke="#c99a1e" stroke-width="2.6"><circle cx="100" cy="128" r="17"/><circle cx="140" cy="128" r="17"/></g><path d="M117 125q3-4 6 0M83 124l-8-3M157 124l8-3" fill="none" stroke="#c99a1e" stroke-width="2.6" stroke-linecap="round"/><path d="M90 120q4-4 9-5M130 120q4-4 9-5" fill="none" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/>`,
        'nx-gafas-corazon': [100, 140].map(x => `<path d="M${x} 143C${x - 26} 128 ${x - 20} 108 ${x} 118C${x + 20} 108 ${x + 26} 128 ${x} 143Z" fill="#ff4f8b" fill-opacity=".72" stroke="#c2185b" stroke-width="2.4" stroke-linejoin="round"/><path d="M${x - 12} 120q4-3 8-1" fill="none" stroke="#fff" stroke-width="2" opacity=".8" stroke-linecap="round"/>`).join('') + '<path d="M118 124h4" stroke="#c2185b" stroke-width="3"/>',
        'nx-gafas-3d': `<rect x="78" y="114" width="84" height="28" rx="5" fill="#f5f5f5" stroke="#cfcfcf" stroke-width="1.5"/><rect x="84" y="118" width="31" height="20" rx="3" fill="#ff2d55" fill-opacity=".8"/><rect x="125" y="118" width="31" height="20" rx="3" fill="#18d8ff" fill-opacity=".8"/><path d="M114 142q6-6 12 0" fill="#e0e0e0"/>`,
        'nx-gafas-esqui': `<path d="M64 124H176" stroke="#2a2f9a" stroke-width="8" stroke-linecap="round"/><rect x="76" y="110" width="88" height="36" rx="18" fill="#1d1d2b"/><rect x="81" y="114" width="78" height="28" rx="14" fill="url(#{i}ski)"/><path d="M90 122q14-6 30-4" fill="none" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>`,
        'nx-monoculo': `<circle cx="140" cy="128" r="18" fill="#cfe8ff" fill-opacity=".25" stroke="#d4a017" stroke-width="3"/><path d="M130 118q5-5 12-5" fill="none" stroke="#fff" stroke-width="2" opacity=".75" stroke-linecap="round"/><path d="M155 137Q166 152 160 176" fill="none" stroke="#d4a017" stroke-width="1.8" stroke-dasharray="2 2.5"/>`,
        'nx-parche': `<path d="M84 122L64 108M116 122L176 104" stroke="#1b1b2a" stroke-width="3" stroke-linecap="round"/><ellipse cx="100" cy="128" rx="18" ry="16" fill="#1b1b2a"/><path d="M90 120q6-4 12-3" fill="none" stroke="#fff" stroke-width="2" opacity=".25" stroke-linecap="round"/>`,
        'nx-bigote': `<path d="M121 139C112 133 101 135 96 144C102 141 109 144 121 144C133 144 140 141 146 144C141 135 130 133 121 139Z" fill="#4a2508"/><path d="M96 144q-4-1-5-5M146 144q4-1 5-5" fill="none" stroke="#4a2508" stroke-width="2.4" stroke-linecap="round"/>`
    };
    const knit = (y, c) => `<path d="M76 ${y}l6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`;
    const SCARF = {
        'nx-bufanda': `<path d="M76 160q44 24 88 0l4 12q-48 28-96 0z" fill="#FF6584" stroke="#B8284A" stroke-width="2"/><path d="M90 170l-3 9M105 175l-2 9M120 177v9M135 175l2 9M150 170l3 9" stroke="#fff" stroke-width="3" opacity=".55"/><path d="M140 171l12 26-13 3-7-26z" fill="#FF6584" stroke="#B8284A" stroke-width="2" stroke-linejoin="round"/>`,
        'nx-pajarita': `<path d="M120 168l-17-10q-4 10 0 20zM120 168l17-10q4 10 0 20z" fill="#FF6584" stroke="#a01c44" stroke-width="2.2" stroke-linejoin="round"/><circle cx="120" cy="168" r="4.5" fill="#a01c44"/>`,
        'nx-capa': `<path d="M84 112q-34 56-24 90 60 10 120 0 10-34-24-90z" fill="#d8304f"/><path d="M84 112q-34 56-24 90 12 2 24 3-10-40 12-90z" fill="#000" opacity=".15"/>`,
        'nx-capa-mago': `<path d="M84 112q-34 56-24 90 60 10 120 0 10-34-24-90z" fill="#5b2a9e"/><path d="M84 112q-34 56-24 90 12 2 24 3-10-40 12-90z" fill="#000" opacity=".18"/>
            ${[[70, 170, 4], [168, 160, 3.5], [74, 194, 3], [172, 190, 4]].map(([x, y, s]) => sparkle(x, y, s, '#FFE066')).join('')}`,
        'nx-jersey-navidad': `<path d="M72 158Q120 176 168 158C174 178 160 196 120 197C80 196 66 178 72 158Z" fill="#c62828"/>
            <path d="M72 158Q120 176 168 158" fill="none" stroke="#2e7d32" stroke-width="6" stroke-linecap="round"/>${knit(178, '#fff')}${knit(190, '#2e7d32')}
            ${[[96, 184], [120, 186], [144, 184]].map(([x, y]) => `<path d="M${x - 4} ${y}h8M${x} ${y - 4}v8M${x - 3} ${y - 3}l6 6M${x + 3} ${y - 3}l-6 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`).join('')}
            <path d="M80 194Q120 204 160 194" fill="none" stroke="#2e7d32" stroke-width="4" stroke-linecap="round" opacity=".9"/>`,
        'nx-bufanda-navidad': `<path d="M76 160q44 24 88 0l4 12q-48 28-96 0z" fill="#c62828" stroke="#8e1b1b" stroke-width="2"/><path d="M94 168l-3 12M112 174l-1 12M130 174l1 12M148 168l3 12" stroke="#2e7d32" stroke-width="6"/><path d="M103 172l-2 12M139 172l2 12" stroke="#fff" stroke-width="3"/>
            <path d="M140 171l12 26-13 3-7-26z" fill="#c62828" stroke="#8e1b1b" stroke-width="2" stroke-linejoin="round"/><path d="M144 181l9 -2M147 189l8-2" stroke="#2e7d32" stroke-width="4"/><path d="M139 198l2 5M144 197l2 5M149 196l2 5" stroke="#fff" stroke-width="2"/>`,
        'nx-corbata': `<path d="M114 160h12l-2 6h-8z" fill="#1d2072"/><path d="M116 166h8l6 22-10 9-10-9z" fill="#2a2f9a"/><path d="M114 174l12-4M112 182l16-5M114 190l12-4" stroke="#FFD43B" stroke-width="2.2"/>`,
        'nx-collar-flores': [[80, 160, '#ff6fa5'], [92, 167, '#FFD43B'], [106, 172, '#ff9f1c'], [120, 174, '#ff6fa5'], [134, 172, '#fff'], [148, 167, '#FFD43B'], [160, 160, '#ff9f1c']].map(([x, y, c]) =>
            `<g>${[0, 72, 144, 216, 288].map(a => `<circle cx="${x}" cy="${y - 4.5}" r="4" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="2.6" fill="#c2185b"/></g>`).join(''),
        'nx-medalla': `<path d="M104 156l12 22h8l-12-22zM136 156l-12 22h-8l12-22z" fill="#2a6fd1"/><path d="M110 156l10 20M130 156l-10 20" stroke="#d62839" stroke-width="3"/><circle cx="120" cy="186" r="10" fill="#FFD43B" stroke="#b98a00" stroke-width="2"/>${sparkle(120, 186, 5.5, '#fff6c9')}`,
        'nx-bandana': `<path d="M78 158Q120 174 162 158L120 196Z" fill="#d62839" stroke="#9e1c2b" stroke-width="2" stroke-linejoin="round"/>${[[104, 172], [120, 180], [136, 172], [114, 188], [126, 188], [90, 166], [150, 166]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#fff"/>`).join('')}`
    };
    const BACK_WEAR = new Set(['nx-capa', 'nx-capa-mago']);

    // ── Cúpulas (escala 1620) ──────────────────────────────
    // G: cristal [borde, sombra del borde, interior, sombra interior] · B: pedestal [oscuro, claro, aro claro, aro, disco]
    // back: dentro de la cúpula, detrás de Nexito · floor: sobre el disco · front: delante (nieve, luces…) · base: adornos del pedestal
    const DOME_IN = 'M252 1396L262 798C268 594 440 500 806 500C1172 500 1312 594 1318 798L1328 1396Z';
    const rand = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const bulbs = (pts, cls = 'nxp-light') => pts.map(([x, y], k) => `<g class="${cls}" style="animation-delay:${(k % 4) * .35}s"><circle cx="${x}" cy="${y}" r="17" fill="${['#ff3b4f', '#FFD43B', '#3DE0F5', '#7CFF6B'][k % 4]}"/><circle cx="${x - 5}" cy="${y - 5}" r="5" fill="#fff" opacity=".7"/></g>`).join('');
    const holly = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0C-30-28-62-20-80 0C-62 4-58 20-44 26C-30 14-16 18 0 0Z" fill="#2e8b3e"/><path d="M0 0C30-28 62-20 80 0C62 4 58 20 44 26C30 14 16 18 0 0Z" fill="#257a34"/><path d="M0 0L-70 4M0 0L70 4" stroke="#1b5e27" stroke-width="4"/><circle cx="-12" cy="-6" r="15" fill="#d62839"/><circle cx="12" cy="-6" r="15" fill="#e8394a"/><circle cx="0" cy="-22" r="15" fill="#c21f30"/><circle cx="-16" cy="-12" r="4" fill="#fff" opacity=".6"/></g>`;
    const snowfall = (i, n = 28) => { const r = rand(97); let s = ''; for (let k = 0; k < n; k++) { const x = 280 + r() * 1020, y = 480 + r() * 80, sz = 7 + r() * 9, d = 7 + r() * 6;
        s += `<g class="nxp-snow" style="animation-duration:${d.toFixed(1)}s;animation-delay:-${(r() * d).toFixed(1)}s"><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${sz.toFixed(1)}" fill="#fff" stroke="#a9c3e3" stroke-width="3"/></g>`; } return `<g clip-path="url(#${i}in)">${s}</g>`; };
    const DOMES = {
        '': { G: ['#d6e0f6', '#c4d2f2', '#eef3fc', '#e3ebfa'], B: ['#3c429e', '#5e69fc', '#b3c0f8', '#8494f5', '#58627c'] },
        'nx-cupula-navidad': {
            G: ['#d3e7f8', '#bad6ef', '#eaf5ff', '#dbecfb'], B: ['#a3172a', '#d62839', '#ffffff', '#e4edf7', '#eef4fb'],
            back: () => `<rect x="252" y="500" width="1076" height="900" fill="#dbe9fb" opacity=".55"/>
                <path d="M252 1250Q420 1180 600 1236Q760 1180 920 1232Q1100 1176 1328 1240V1400H252Z" fill="#fff"/>
                <g transform="translate(410 0)"><rect x="-22" y="1180" width="44" height="70" fill="#7a4a24"/>
                    <path d="M0 720L-120 920H-60L-170 1080H-90L-210 1230H210L90 1080H170L60 920H120Z" fill="#2e8b3e"/><path d="M0 720L-120 920H-60L-170 1080H-90L-210 1230H0Z" fill="#257a34"/>
                    <path d="M-110 912Q0 960 112 908M-160 1072Q0 1130 162 1070M-200 1222Q0 1270 202 1220" fill="none" stroke="#FFD43B" stroke-width="10" stroke-linecap="round"/>
                    ${bulbs([[-70, 935], [10, 950], [80, 925], [-120, 1090], [-40, 1112], [40, 1110], [120, 1088], [-170, 1236], [-80, 1250], [10, 1256], [100, 1248], [180, 1232]])}
                    ${sparkle(0, 706, 46, '#FFD43B')}</g>
                <g transform="translate(1176 0)"><ellipse cx="0" cy="1218" rx="96" ry="88" fill="#fff" stroke="#d6e3f3" stroke-width="6"/><circle cx="0" cy="1070" r="72" fill="#fff" stroke="#d6e3f3" stroke-width="6"/><circle cx="0" cy="955" r="56" fill="#fff" stroke="#d6e3f3" stroke-width="6"/>
                    <rect x="-46" y="880" width="92" height="16" rx="6" fill="#1b1b2a"/><rect x="-32" y="820" width="64" height="66" rx="6" fill="#1b1b2a"/><rect x="-32" y="866" width="64" height="12" fill="#d62839"/>
                    <circle cx="-20" cy="945" r="7" fill="#1b1b2a"/><circle cx="20" cy="945" r="7" fill="#1b1b2a"/><path d="M0 960L56 974L0 978Z" fill="#ff8c1a"/>
                    <path d="M-62 1004Q0 1030 62 1004L66 1024Q0 1050-66 1024Z" fill="#2e7d32"/><path d="M30 1020l14 60-24 4-8-58z" fill="#2e7d32"/>
                    <circle cx="0" cy="1060" r="8" fill="#1b1b2a"/><circle cx="0" cy="1100" r="8" fill="#1b1b2a"/>
                    <path d="M-70 1060L-150 1010M-120 1028L-140 1000M70 1060L150 1010M120 1028L144 1004" stroke="#7a4a24" stroke-width="10" stroke-linecap="round"/></g>`,
            floor: () => `<path d="M400 1388Q420 1320 520 1330Q600 1296 690 1316Q790 1290 890 1314Q990 1294 1080 1328Q1190 1320 1212 1388Q806 1500 400 1388Z" fill="#fff"/>
                <path d="M450 1380Q806 1460 1160 1380" fill="none" stroke="#d6e3f3" stroke-width="8"/>
                <g transform="translate(300 1340)"><rect x="-56" y="-60" width="112" height="96" rx="8" fill="#2a6fd1"/><rect x="-10" y="-60" width="20" height="96" fill="#FFD43B"/><rect x="-62" y="-74" width="124" height="26" rx="6" fill="#3a82e8"/><rect x="-10" y="-74" width="20" height="26" fill="#FFD43B"/><path d="M0-74C-30-110-60-90-34-74ZM0-74C30-110 60-90 34-74Z" fill="#FFD43B"/></g>
                <g transform="translate(1316 1350)"><rect x="-44" y="-50" width="88" height="80" rx="8" fill="#7CB342"/><rect x="-8" y="-50" width="16" height="80" fill="#d62839"/><rect x="-50" y="-62" width="100" height="22" rx="6" fill="#8bc34a"/><rect x="-8" y="-62" width="16" height="22" fill="#d62839"/><path d="M0-62C-24-92-50-76-28-62ZM0-62C24-92 50-76 28-62Z" fill="#d62839"/></g>`,
            front: (i) => `${snowfall(i)}
                <path d="M250 700C256 556 430 450 806 450C1182 450 1356 556 1362 700C1340 690 1326 720 1300 704C1276 690 1262 650 1230 664C1196 680 1180 640 1140 650C1100 660 1090 630 1050 626C1000 620 960 600 906 604C860 606 840 590 806 590C772 590 752 606 706 604C652 600 612 620 562 626C522 630 512 660 472 650C432 640 416 680 382 664C350 650 336 690 312 704C286 720 272 690 250 700Z" fill="#fff"/>
                <path d="M286 700q6 30 0 56M562 626q8 26 2 46M1050 626q-8 26-2 46M1326 700q-6 30 0 56" stroke="#fff" stroke-width="20" stroke-linecap="round"/>
                <path d="M300 640C380 540 560 490 806 488" fill="none" stroke="#dbe8f7" stroke-width="10" stroke-linecap="round"/>
                <path d="M230 1396Q806 1560 1382 1396" fill="none" stroke="#2e7d32" stroke-width="34" stroke-linecap="round"/><path d="M230 1396Q806 1560 1382 1396" fill="none" stroke="#1f5e27" stroke-width="34" stroke-dasharray="6 26" stroke-linecap="round"/>
                ${bulbs([[300, 1424], [420, 1452], [540, 1472], [670, 1484], [806, 1488], [942, 1484], [1072, 1472], [1192, 1452], [1312, 1424]])}`,
            knob: () => `<rect x="778" y="398" width="56" height="44" rx="8" fill="#e0b13a"/><path d="M778 410h56" stroke="#b98a00" stroke-width="6"/><circle cx="806" cy="350" r="54" fill="#d62839"/><circle cx="788" cy="332" r="15" fill="#fff" opacity=".55"/><path d="M754 350Q806 372 858 350" fill="none" stroke="#FFD43B" stroke-width="8"/>${holly(806, 462, .9)}`,
            base: () => `<rect x="760" y="1570" width="92" height="292" fill="#FFD43B"/><rect x="772" y="1396" width="68" height="258" fill="#FFD43B"/>
                <path d="M110 1690Q806 1780 1500 1690" fill="none" stroke="#FFD43B" stroke-width="30"/>
                <g transform="translate(806 1712)"><path d="M0 0C-120-110-210-30-150 30C-100 70-40 30 0 0ZM0 0C120-110 210-30 150 30C100 70 40 30 0 0Z" fill="#FFD43B" stroke="#d4a017" stroke-width="8"/><path d="M0 0L-80 120L-40 120L0 40L40 120L80 120Z" fill="#f0c020"/><circle cx="0" cy="0" r="34" fill="#f0c020" stroke="#d4a017" stroke-width="8"/></g>
                ${[[240, 1760], [420, 1800], [1180, 1800], [1380, 1760], [320, 1480], [1290, 1480], [560, 1520], [1060, 1520]].map(([x, y]) => `<g fill="#fff" opacity=".85"><circle cx="${x}" cy="${y}" r="10"/><path d="M${x - 26} ${y}h52M${x} ${y - 26}v52M${x - 18} ${y - 18}l36 36M${x + 18} ${y - 18}l-36 36" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>`).join('')}
                ${holly(240, 1610, .8)}${holly(1372, 1610, .8)}`
        },
        'nx-cupula-neon': { G: ['#ffc9f4', '#ffaaee', '#fff1fc', '#ffe0f8'], B: ['#2a0f4d', '#ff2bd6', '#ffc2f2', '#ff6be6', '#2b1d3f'],
            front: () => `<path d="M226 1396L232 790C238 570 420 476 806 476C1192 476 1374 570 1380 790L1386 1396" fill="none" stroke="#ff2bd6" stroke-width="10" opacity=".55" class="nxp-glow"/>` },
        'nx-cupula-oro': { G: ['#ffe9a6', '#ffdc78', '#fff9e3', '#fff0c4'], B: ['#c98a00', '#ffcf3a', '#ffeaa0', '#ffd65c', '#6b5a3a'],
            front: () => [[420, 700, 30], [1180, 760, 24], [1240, 1150, 34], [360, 1200, 22]].map(([x, y, s], k) => `<g class="nxp-light" style="animation-delay:${k * .4}s">${sparkle(x, y, s, '#fff')}</g>`).join('') },
        'nx-cupula-estrellas': { G: ['#cbb8ff', '#b39dff', '#2b1f6b', '#251a5c'], B: ['#2e1a78', '#7a5cff', '#d6c8ff', '#a58bff', '#3c3466'],
            back: () => { const r = rand(11); let s = ''; for (let k = 0; k < 40; k++) s += `<circle cx="${(270 + r() * 1040).toFixed(0)}" cy="${(520 + r() * 760).toFixed(0)}" r="${(3 + r() * 5).toFixed(1)}" fill="#fff" opacity="${(.4 + r() * .6).toFixed(2)}"/>`;
                return s + `<path d="M1150 640a70 70 0 1 0 40 128a56 56 0 1 1-40-128z" fill="#fff3c4"/>`; },
            front: () => [[420, 700], [1150, 940], [1200, 1180], [400, 1240], [960, 600], [560, 600]].map(([x, y], k) => `<g class="nxp-light" style="animation-delay:${k * .3}s">${sparkle(x, y, 26 + (k % 2) * 14, '#fff')}</g>`).join('') },
        'nx-cupula-arcade': { G: ['#5a60c8', '#4a4fb0', '#141640', '#10123a'], B: ['#1d2072', '#3a44c9', '#8f9bff', '#4f5be8', '#2b2f52'],
            back: () => `<g stroke="#ff2bd6" stroke-width="4" opacity=".55">${[1180, 1230, 1290, 1360].map(y => `<path d="M252 ${y}H1328"/>`).join('')}${[-600, -380, -160, 0, 160, 380, 600].map(dx => `<path d="M806 1090L${806 + dx * 1.6} 1400"/>`).join('')}</g>
                <path d="M252 1090H1328" stroke="#3DE0F5" stroke-width="6" opacity=".7"/>
                ${[[420, 700, '#3DE0F5'], [1160, 760, '#ff2bd6'], [800, 600, '#7CFF6B']].map(([x, y, c]) => `<g fill="${c}" class="nxp-light">${[[0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0], [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1], [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1], [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0]].map((row, ry) => row.map((v, rx) => v ? `<rect x="${x - 66 + rx * 12}" y="${y - 48 + ry * 12}" width="12" height="12"/>` : '').join('')).join('')}</g>`).join('')}`,
            base: () => [260, 530, 806, 1080, 1350].map((x, k) => `<circle cx="${x}" cy="${k === 0 || k === 4 ? 1700 : 1730}" r="26" fill="${['#FF6584', '#FFD43B', '#3DE0F5', '#A879FF', '#00C9A7'][k]}" class="nxp-light" style="animation-delay:${k * 0.2}s"/>`).join('')
                + [380, 806, 1230].map((x, k) => `<circle cx="${x}" cy="${k === 1 ? 1560 : 1530}" r="18" fill="#fff" class="nxp-light" style="animation-delay:${k * .3 + .1}s"/>`).join('') },
        'nx-cupula-oceano': { G: ['#a8d8f0', '#8cc8e8', '#bfe8fb', '#a7dcf5'], B: ['#0e5b7a', '#1b8fb5', '#bdeaf7', '#5cc3e0', '#e8c88a'],
            back: () => `<path d="M252 640Q420 610 560 640T860 640T1160 640T1328 640V1400H252Z" fill="#4fb3e3" opacity=".55"/><path d="M252 980Q520 940 806 980T1328 980V1400H252Z" fill="#2a8fc4" opacity=".45"/>
                ${[[330, 1360, 360], [400, 1360, 280], [1250, 1360, 380], [1180, 1360, 260]].map(([x, y, h]) => `<path d="M${x} ${y}Q${x - 40} ${y - h * .33} ${x} ${y - h * .5}T${x} ${y - h}" fill="none" stroke="#2f9e5a" stroke-width="22" stroke-linecap="round" class="nxp-sway"/>`).join('')}
                <g class="nxp-swim"><path d="M1040 760q60-40 120 0q-60 40-120 0zM1160 760l40-30v60z" fill="#ff8c1a"/><circle cx="1070" cy="752" r="8" fill="#1b1b2a"/></g>
                <g class="nxp-swim" style="animation-delay:-3s"><path d="M430 880q46-30 92 0q-46 30-92 0zM522 880l30-24v48z" fill="#FFD43B"/><circle cx="452" cy="874" r="6" fill="#1b1b2a"/></g>
                <path d="M1230 1300c-30-60 0-110 40-80c10-60 70-40 60 10c50 0 40 70-10 70z" fill="#ff6f91"/>`,
            floor: () => `<ellipse cx="806" cy="1388" rx="415" ry="96" fill="#f2d59a"/><path d="M430 1400Q806 1300 1182 1400" fill="none" stroke="#e5c27e" stroke-width="10"/>
                <path d="M1110 1420l14-30 14 30 32 2-24 20 8 30-30-16-30 16 8-30-24-20z" fill="#ff7a59"/><path d="M500 1420q30-40 60 0z" fill="#ffe4d0" stroke="#e8b89a" stroke-width="5"/>`,
            front: (i) => { const r = rand(5); let s = ''; for (let k = 0; k < 16; k++) { const d = 5 + r() * 5; s += `<g class="nxp-bubble" style="animation-duration:${d.toFixed(1)}s;animation-delay:-${(r() * d).toFixed(1)}s"><circle cx="${(300 + r() * 980).toFixed(0)}" cy="1360" r="${(8 + r() * 14).toFixed(0)}" fill="#fff" fill-opacity=".25" stroke="#fff" stroke-width="4" stroke-opacity=".8"/></g>`; }
                return `<g clip-path="url(#${i}in)">${s}</g>`; } },
        'nx-cupula-espacio': { G: ['#7a7fd0', '#6066c0', '#0d0f33', '#0b0c2a'], B: ['#1a1b4a', '#3b3f9a', '#9aa3e8', '#5d64c8', '#9aa0b8'],
            back: () => { const r = rand(23); let s = ''; for (let k = 0; k < 60; k++) s += `<circle cx="${(270 + r() * 1040).toFixed(0)}" cy="${(520 + r() * 860).toFixed(0)}" r="${(2 + r() * 5).toFixed(1)}" fill="#fff" opacity="${(.3 + r() * .7).toFixed(2)}"/>`;
                return `<ellipse cx="520" cy="760" rx="300" ry="180" fill="#a879ff" opacity=".18"/><ellipse cx="1100" cy="1000" rx="260" ry="200" fill="#3de0f5" opacity=".12"/>${s}
                    <g class="nxp-orbit"><circle cx="1130" cy="720" r="80" fill="#ff9f43"/><path d="M1060 700q70-26 140 20" fill="none" stroke="#e67e22" stroke-width="14" opacity=".6"/><ellipse cx="1130" cy="720" rx="150" ry="34" fill="none" stroke="#ffe0a8" stroke-width="14" transform="rotate(-18 1130 720)"/></g>
                    <circle cx="440" cy="640" r="40" fill="#cfd5ea"/><circle cx="428" cy="630" r="10" fill="#aab2cc"/><circle cx="454" cy="654" r="7" fill="#aab2cc"/>`; },
            floor: () => `<ellipse cx="806" cy="1388" rx="415" ry="96" fill="#9aa0b8"/>${[[560, 1400, 46], [1000, 1380, 38], [780, 1440, 30], [1100, 1430, 22]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .4}" fill="#7d849e"/>`).join('')}`,
            front: () => `<g class="nxp-light">${sparkle(330, 900, 30, '#fff')}</g><g class="nxp-light" style="animation-delay:.6s">${sparkle(1250, 1200, 26, '#fff')}</g>` },
        'nx-cupula-jardin': { G: ['#d3f0d0', '#bfe6bb', '#effaf0', '#e0f4de'], B: ['#a64b2a', '#d9764a', '#f2b48f', '#e08c5f', '#5fbf4a'],
            back: () => `<circle cx="1150" cy="680" r="80" fill="#FFE066"/><g stroke="#FFE066" stroke-width="12" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M1150 560v-30" transform="rotate(${a} 1150 680)"/>`).join('')}</g>
                <g fill="#fff"><ellipse cx="440" cy="680" rx="80" ry="34"/><ellipse cx="490" cy="660" rx="56" ry="38"/><ellipse cx="400" cy="694" rx="50" ry="24"/></g>
                <path d="M252 1260Q520 1180 806 1240T1328 1230V1400H252Z" fill="#8fd16f"/>
                ${[[330, 1260, '#ff6fa5'], [1260, 1250, '#FFD43B'], [1200, 1290, '#a879ff'], [380, 1300, '#ff9f1c']].map(([x, y, c]) => `<path d="M${x} ${y + 60}V${y}" stroke="#3a9d3a" stroke-width="8"/><g>${[0, 72, 144, 216, 288].map(a => `<circle cx="${x}" cy="${y - 18}" r="16" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="12" fill="#fff4c4"/></g>`).join('')}`,
            floor: () => `<ellipse cx="806" cy="1388" rx="415" ry="96" fill="#5fbf4a"/>${[480, 560, 1040, 1120, 760, 880].map((x, k) => `<path d="M${x} ${1400 + (k % 2) * 20}l10-36 8 30 10-40 8 46" fill="none" stroke="#3f9a33" stroke-width="7" stroke-linecap="round"/>`).join('')}
                ${[[520, 1350, '#fff'], [1090, 1356, '#ff6fa5'], [640, 1446, '#FFD43B'], [980, 1450, '#fff']].map(([x, y, c]) => `<g>${[0, 72, 144, 216, 288].map(a => `<circle cx="${x}" cy="${y - 10}" r="9" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="7" fill="#FFD43B"/></g>`).join('')}`,
            front: () => [[1180, 920, '#ff6fa5'], [400, 860, '#3DA5F5']].map(([x, y, c], k) => `<g class="nxp-flutter" style="animation-delay:${k * .5}s"><path d="M${x} ${y}c-40-50-90-20-60 20c-40 30 0 70 60-20zM${x} ${y}c40-50 90-20 60 20c40 30 0 70-60-20z" fill="${c}"/><path d="M${x} ${y - 24}v52" stroke="#2a1a1a" stroke-width="8" stroke-linecap="round"/></g>`).join('') },
        'nx-cupula-playa': { G: ['#cfe9fb', '#b6dcf6', '#e9f6ff', '#d8eefc'], B: ['#2f7fbf', '#4fa6e0', '#fbe7b5', '#f3d28a', '#f3d99c'],
            back: () => `<rect x="252" y="500" width="1076" height="900" fill="#9fd8fa" opacity=".6"/><circle cx="1120" cy="700" r="90" fill="#FFD43B"/><circle cx="1120" cy="700" r="130" fill="#FFD43B" opacity=".25"/>
                <path d="M252 1160Q420 1130 600 1160T940 1160T1328 1150V1400H252Z" fill="#2fa3e0"/><path d="M252 1200Q420 1176 600 1200T940 1200T1328 1196" fill="none" stroke="#fff" stroke-width="8" opacity=".7"/>
                <g transform="translate(390 0)"><path d="M0 1350Q-20 1100 30 900" fill="none" stroke="#9b6a3c" stroke-width="40" stroke-linecap="round"/><path d="M0 1350Q-20 1100 30 900" fill="none" stroke="#7a4a24" stroke-width="40" stroke-dasharray="6 34"/>
                    ${[[-150, 960], [-120, 830], [40, 800], [180, 860], [200, 980]].map(([x, y]) => `<path d="M30 900Q${(30 + x) / 2} ${y - 60} ${x} ${y}" fill="none" stroke="#2e9e4a" stroke-width="34" stroke-linecap="round"/>`).join('')}<circle cx="16" cy="920" r="22" fill="#7a4a24"/><circle cx="46" cy="926" r="22" fill="#6b3d1a"/></g>`,
            floor: () => `<ellipse cx="806" cy="1388" rx="415" ry="96" fill="#f3d99c"/><path d="M1120 1410l14-30 14 30 32 2-24 20 8 30-30-16-30 16 8-30-24-20z" fill="#ff7a59"/>
                <g transform="translate(500 1400)"><path d="M-40-40h80l-10 70h-60z" fill="#ff6584"/><path d="M-36-40q36-50 72 0" fill="none" stroke="#1b1b2a" stroke-width="6"/></g>` },
        'nx-cupula-halloween': { G: ['#7d5ba6', '#6a4a94', '#2a1640', '#24123a'], B: ['#2a1a3a', '#ff7a1a', '#ffb366', '#ff8f33', '#3b2c2c'],
            back: () => `<circle cx="1110" cy="720" r="110" fill="#fff2b3"/><circle cx="1070" cy="690" r="18" fill="#efe0a0"/><circle cx="1140" cy="760" r="12" fill="#efe0a0"/>
                ${[[520, 760], [880, 640], [1240, 960]].map(([x, y], k) => `<g class="nxp-flutter" style="animation-delay:${k * .3}s"><path d="M${x} ${y}c-30-30-70-30-90 0c20-6 30 10 40 20c10-14 30-20 50-20zM${x} ${y}c30-30 70-30 90 0c-20-6-30 10-40 20c-10-14-30-20-50-20z" fill="#140a1e"/><circle cx="${x}" cy="${y + 6}" r="16" fill="#140a1e"/></g>`).join('')}
                <g stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"><path d="M262 520L262 760M262 520L460 520M262 520L420 680M262 520L340 740M262 520L440 600"/><path d="M262 600Q300 590 320 560M262 680Q330 670 370 610M300 740Q360 700 400 640M340 520Q345 560 360 580"/></g>
                <path d="M300 1350v-120q0-50 50-50t50 50v120z" fill="#5b5670"/><path d="M332 1250h36M350 1232v40" stroke="#3e3a4f" stroke-width="10"/>`,
            floor: () => `<ellipse cx="806" cy="1388" rx="415" ry="96" fill="#3b2c2c"/>${[[480, 1386, 1], [1130, 1392, .85]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-50" rx="96" ry="76" fill="#ff7a1a"/><path d="M-40-120Q0-90 40-120M0-126V-50M-60-110Q-90-50-60 10M60-110Q90-50 60 10" fill="none" stroke="#d35400" stroke-width="8"/><path d="M-6-124q2-30 20-36" fill="none" stroke="#2e7d32" stroke-width="14" stroke-linecap="round"/>
                    <path d="M-50-64l20-26 20 26zM10-64l20-26 20 26z" fill="#ffd84a" class="nxp-light"/><path d="M-50-30q50 34 100 0l-16 12-14-12-14 12-14-12-14 12z" fill="#ffd84a" class="nxp-light"/></g>`).join('')}` },
        'nx-cupula-leyenda': { G: ['#e3d3ff', '#d2bdff', '#f7f1ff', '#ece2ff'], B: ['#4b2a9e', '#8b5cff', '#e0d0ff', '#b79bff', '#4a3f6e'],
            back: (i) => `<g opacity=".35">${['#FFD43B', '#FF6584', '#A879FF', '#3DE0F5'].map((c, k) => `<path d="M806 1300L${400 + k * 280} 520" stroke="${c}" stroke-width="70" stroke-linecap="round"/>`).join('')}</g>`,
            base: (i) => `<ellipse cx="806" cy="1572" rx="690" ry="96" fill="none" stroke="url(#${i}rb)" stroke-width="16" class="nxp-aura"/>${sparkle(120, 1640, 34)}${sparkle(1500, 1690, 40, '#fff')}`,
            front: () => [[400, 760], [1220, 880], [1180, 1240], [380, 1220], [806, 590]].map(([x, y], k) => `<g class="nxp-light" style="animation-delay:${k * .3}s">${sparkle(x, y, 30, ['#FFD43B', '#fff', '#3DE0F5', '#FF6584', '#fff'][k])}</g>`).join('') }
    };

    function nexito(opts = {}) {
        const i = uid(), mood = opts.mood || 'content', o = opts.outfit || {};
        const hatId = HATS[o['pet-hat']] ? o['pet-hat'] : '';
        const hat = hatId ? `<g transform="${HAT_AT[hatId] || 'translate(-1.5 33)'}">${HATS[hatId].split('{i}').join(i)}</g>` : '';
        const wear = SCARF[o['pet-scarf']] ? o['pet-scarf'] : '';
        const cape = BACK_WEAR.has(wear) ? `<g transform="translate(0 12)">${SCARF[wear]}</g>` : '';
        const scarf = wear && !BACK_WEAR.has(wear) ? `<g transform="translate(118.5 175) scale(.92 1) translate(-120 -164)">${SCARF[wear]}</g>` : '';
        const glasses = GLASSES[o['pet-glasses']] ? `<g transform="translate(117.5 146.5) scale(1.02) translate(-120 -128)">${GLASSES[o['pet-glasses']].split('{i}').join(i)}</g>` : '';
        const blush = ['sad', 'bored'].includes(mood) ? .45 : 1;
        const pet = `<g class="nxp-body"><g transform="scale(${K})">
            <ellipse cx="790" cy="1418" rx="270" ry="34" fill="#000" opacity=".16"/>
            <ellipse cx="626" cy="1382" rx="98" ry="44" fill="${YD}"/><ellipse cx="958" cy="1382" rx="98" ry="44" fill="${YD}"/>
            <ellipse cx="619" cy="1400" rx="96" ry="38" fill="${Y}"/><ellipse cx="959" cy="1400" rx="96" ry="38" fill="${Y}"/>
            <ellipse cx="790" cy="1190" rx="300" ry="185" fill="${YD}"/>
            <ellipse cx="790" cy="1000" rx="330" ry="257" fill="${Y}"/>
            <ellipse cx="790" cy="1140" rx="300" ry="146" fill="${Y}"/>
            <ellipse cx="610" cy="830" rx="120" ry="52" transform="rotate(-24 610 830)" fill="#fff" opacity=".32"/><circle cx="500" cy="900" r="16" fill="#fff" opacity=".4"/>
            <g class="nxp-face">${face(mood)}
            <g opacity="${blush}"><rect x="533" y="1056" width="92" height="50" rx="25" fill="#e15c3b" transform="rotate(25 579 1081)"/>
            <rect x="955" y="1058" width="92" height="50" rx="25" fill="#e15c3b" transform="rotate(-25 1001 1083)"/></g></g>
        </g>${scarf}<g transform="scale(${K})">
            <ellipse cx="478" cy="1190" rx="62" ry="95" fill="${YD}" transform="rotate(-20 478 1190)"/><ellipse cx="1102" cy="1190" rx="62" ry="95" fill="${YD}" transform="rotate(20 1102 1190)"/>
            <ellipse cx="458" cy="1135" rx="70" ry="100" fill="${Y}" transform="rotate(-25 458 1135)"/><ellipse cx="1122" cy="1135" rx="70" ry="100" fill="${Y}" transform="rotate(25 1122 1135)"/>
            <ellipse cx="438" cy="1080" rx="22" ry="34" transform="rotate(-25 438 1080)" fill="#fff" opacity=".35"/>
        </g>${glasses}${hat}</g>`;
        const zzz = mood === 'sleepy' ? '<g class="nxp-zzz" fill="#dfe2ff" font-family="var(--font-title), sans-serif" font-weight="800"><text x="160" y="112" font-size="18">z</text><text x="174" y="94" font-size="14">z</text><text x="186" y="80" font-size="11">z</text></g>' : '';
        const defs = `<defs><linearGradient id="${i}cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5D67F8"/><stop offset="1" stop-color="#2a2f9a"/></linearGradient>
            <linearGradient id="${i}ski" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset=".5" stop-color="#ff7a59"/><stop offset="1" stop-color="#c2185b"/></linearGradient>
            <linearGradient id="${i}rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFD43B"/><stop offset=".33" stop-color="#FF6584"/><stop offset=".66" stop-color="#A879FF"/><stop offset="1" stop-color="#3DE0F5"/></linearGradient>
            <clipPath id="${i}in"><path d="${DOME_IN}"/></clipPath></defs>`;
        if (!opts.scene) {
            return `<svg class="nx-art nx-pet m-${mood}" viewBox="46 44 148 180" aria-hidden="true" focusable="false">${defs}${cape}${pet}${zzz}</svg>`;
        }
        const T = DOMES[o['pet-dome']] || DOMES[''], G = T.G, B = T.B;
        const knob = `<rect x="771" y="398" width="70" height="70" rx="14" fill="${G[1]}"/><ellipse cx="806" cy="462" rx="70" ry="16" fill="${G[1]}"/>
                <circle cx="806" cy="380" r="46" fill="${G[0]}"/><path fill="${G[1]}" d="M852 380A46 46 0 0 1 772 411A46 38 0 0 0 852 380Z"/><circle cx="790" cy="364" r="12" fill="#fff"/>`;
        return `<svg class="nx-art nx-scene m-${mood}" viewBox="4 40 236 244" aria-hidden="true" focusable="false">${defs}
            <g transform="scale(${K})">
                <ellipse cx="810" cy="1848" rx="760" ry="28" fill="#000" opacity=".22"/>
                <path fill="${B[0]}" d="M110 1570H1510L1580 1790H40Z"/>
                <ellipse cx="810" cy="1790" rx="770" ry="72" fill="${B[0]}"/>
                <ellipse cx="806" cy="1572" rx="700" ry="100" fill="${B[1]}"/>
                <rect x="201" y="1396" width="1210" height="194" fill="${B[0]}"/>
                <ellipse cx="806" cy="1590" rx="605" ry="62" fill="${B[0]}"/>
                ${T.base ? T.base(i) : ''}
                ${T.knob ? '' : knob}
                <path fill="${G[0]}" d="M214 1396L226 790C232 560 420 462 806 462C1192 462 1380 560 1386 790L1398 1396Z"/>
                <path fill="${G[1]}" d="M1238 540C1334 593 1383 675 1386 790L1398 1396H1352L1342 800C1338 680 1300 600 1238 540Z"/>
                <path fill="${G[2]}" d="${DOME_IN}"/>
                <path fill="${G[3]}" d="M1197 572C1278 622 1315 696 1318 798L1328 1396H1288L1280 808C1278 700 1250 620 1197 572Z"/>
                ${T.back ? `<g clip-path="url(#${i}in)">${T.back(i)}</g>` : ''}
                <ellipse cx="806" cy="1396" rx="606" ry="102" fill="${B[2]}"/>
                <ellipse cx="806" cy="1400" rx="586" ry="92" fill="${B[3]}"/>
                <ellipse cx="806" cy="1388" rx="415" ry="96" fill="${B[4]}"/>
                ${T.floor ? T.floor(i) : ''}
            </g>
            ${cape}<g class="nxp-float">${pet}</g>${zzz}
            <g transform="scale(${K})">
                <path fill="#fff" d="M300 1120L306 800C310 660 380 586 500 548C410 600 352 690 348 800L342 1120A21 21 0 0 1 300 1120Z" opacity=".9"/>
                <circle cx="322" cy="1180" r="21" fill="#fff" opacity=".9"/>
                <path fill="#fff" d="M620 536C700 522 760 520 820 520A14 14 0 0 1 820 548C760 548 700 550 626 562A13 13 0 0 1 620 536Z"/>
                <rect x="1262" y="860" width="18" height="230" rx="9" fill="#fff" opacity=".9"/>
                <circle cx="1271" cy="1124" r="9" fill="#fff"/>
                <path fill="#fff" d="M257 1439A606 102 0 0 0 503 1484L513 1480A586 92 0 0 1 275 1439Z"/>
                ${T.front ? T.front(i) : ''}
                ${T.knob ? T.knob(i) : ''}
            </g>
        </svg>`;
    }

    /** Cúpulas disponibles (para la tienda y los tests). */
    nexito.DOMES = Object.keys(DOMES).filter(Boolean);
    nexito.HATS = Object.keys(HATS); nexito.GLASSES = Object.keys(GLASSES); nexito.WEAR = Object.keys(SCARF);


    Nexus.ui.art = { trophy, target, chest, nexito };
})();
