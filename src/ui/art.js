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
    // opts: { mood, outfit: { 'pet-hat', 'pet-glasses', 'pet-scarf', 'pet-dome', 'pet-base' }, scene }
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
    const HATS = {
        'nx-gorra': `<path d="M82 86q4-34 38-36t38 36q-38-10-76 0z" fill="url(#{i}cap)" stroke="#11134a" stroke-width="2.5" stroke-linejoin="round"/><path d="M152 84q26-6 34 4q-14 6-36 2z" fill="#2a2f9a" stroke="#11134a" stroke-width="2.5" stroke-linejoin="round"/><path d="M120 54l8 9-8 9-8-9z" fill="#FFD43B" stroke="#11134a" stroke-width="1.5"/><circle cx="120" cy="50" r="3" fill="#FF6584"/>`,
        'nx-auriculares': `<path d="M70 124q0-66 50-66t50 66" fill="none" stroke="#2a2f9a" stroke-width="8" stroke-linecap="round"/><path d="M70 124q0-66 50-66t50 66" fill="none" stroke="#5D67F8" stroke-width="3" stroke-linecap="round"/><rect x="56" y="110" width="20" height="34" rx="9" fill="#FF6584" stroke="#2a2f9a" stroke-width="3.5"/><rect x="164" y="110" width="20" height="34" rx="9" fill="#3DE0F5" stroke="#2a2f9a" stroke-width="3.5"/><circle cx="66" cy="127" r="3" fill="#fff" opacity=".7"/><circle cx="174" cy="127" r="3" fill="#fff" opacity=".7"/>`,
        'nx-copa': `<path d="M96 40h48l-3 42H99z" fill="#15163f"/><path d="M97 64h46l-1 10H98z" fill="#FF6584"/><ellipse cx="120" cy="84" rx="40" ry="8" fill="#15163f"/><path d="M104 46v28" stroke="#fff" stroke-opacity=".18" stroke-width="5" stroke-linecap="round"/>`,
        'nx-corona': `<path d="M90 88l3-36 15 16 12-26 12 26 15-16 3 36q-30-8-60 0z" fill="#FFD43B" stroke="#B87A00" stroke-width="2.5" stroke-linejoin="round"/><path d="M93 80q27-6 54 0" fill="none" stroke="#B87A00" stroke-width="2"/><circle cx="120" cy="72" r="5" fill="#FF6584" stroke="#fff" stroke-width="1.2"/><circle cx="103" cy="77" r="3.8" fill="#3DE0F5"/><circle cx="137" cy="77" r="3.8" fill="#A879FF"/>`
    };
    // Dónde va cada complemento (escala 240) sobre el cuerpo dibujado a escala K
    const HAT_AT = { 'nx-auriculares': 'translate(-1 26) scale(.86 .92) translate(19 4)' };
    const GLASSES = {
        'nx-gafas-sol': `<g><path d="M80 122q0-8 9-8h20q9 0 9 8v4q0 15-19 15t-19-15z" fill="#0b0c2a" stroke="#FFD43B" stroke-width="2.4"/><path d="M122 122q0-8 9-8h20q9 0 9 8v4q0 15-19 15t-19-15z" fill="#0b0c2a" stroke="#FFD43B" stroke-width="2.4"/><path d="M118 122h4" stroke="#FFD43B" stroke-width="3"/><path d="M86 120l9 9M128 120l9 9" stroke="#fff" stroke-width="2.5" opacity=".45" stroke-linecap="round"/></g>`,
        'nx-gafas-pixel': `<g fill="#0b0c2a"><rect x="78" y="118" width="84" height="6"/><rect x="82" y="124" width="34" height="6"/><rect x="124" y="124" width="34" height="6"/><rect x="86" y="130" width="26" height="6"/><rect x="128" y="130" width="26" height="6"/><rect x="86" y="124" width="6" height="6" fill="#fff"/><rect x="128" y="124" width="6" height="6" fill="#fff"/></g>`
    };
    const SCARF = {
        'nx-bufanda': `<path d="M76 160q44 24 88 0l4 12q-48 28-96 0z" fill="#FF6584" stroke="#B8284A" stroke-width="2"/><path d="M90 170l-3 9M105 175l-2 9M120 177v9M135 175l2 9M150 170l3 9" stroke="#fff" stroke-width="3" opacity=".55"/><path d="M140 171l12 26-13 3-7-26z" fill="#FF6584" stroke="#B8284A" stroke-width="2" stroke-linejoin="round"/>`,
        'nx-pajarita': `<path d="M120 168l-17-10q-4 10 0 20zM120 168l17-10q4 10 0 20z" fill="#FF6584" stroke="#a01c44" stroke-width="2.2" stroke-linejoin="round"/><circle cx="120" cy="168" r="4.5" fill="#a01c44"/>`,
        'nx-capa': `<path d="M84 112q-34 56-24 90 60 10 120 0 10-34-24-90z" fill="#d8304f"/><path d="M84 112q-34 56-24 90 12 2 24 3-10-40 12-90z" fill="#000" opacity=".15"/>`
    };
    function nexito(opts = {}) {
        const i = uid(), mood = opts.mood || 'content', o = opts.outfit || {};
        const hatId = HATS[o['pet-hat']] ? o['pet-hat'] : '';
        const hat = hatId ? `<g transform="${HAT_AT[hatId] || 'translate(-1.5 33)'}">${HATS[hatId].split('{i}').join(i)}</g>` : '';
        const cape = o['pet-scarf'] === 'nx-capa' ? `<g transform="translate(0 12)">${SCARF['nx-capa']}</g>` : '';
        const scarf = o['pet-scarf'] && o['pet-scarf'] !== 'nx-capa' && SCARF[o['pet-scarf']] ? `<g transform="translate(118.5 175) scale(.92 1) translate(-120 -164)">${SCARF[o['pet-scarf']]}</g>` : '';
        const glasses = GLASSES[o['pet-glasses']] ? `<g transform="translate(117.5 146.5) scale(1.02) translate(-120 -128)">${GLASSES[o['pet-glasses']]}</g>` : '';
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
            <linearGradient id="${i}rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFD43B"/><stop offset=".33" stop-color="#FF6584"/><stop offset=".66" stop-color="#A879FF"/><stop offset="1" stop-color="#3DE0F5"/></linearGradient></defs>`;
        if (!opts.scene) {
            return `<svg class="nx-art nx-pet m-${mood}" viewBox="50 64 140 160" aria-hidden="true" focusable="false">${defs}${cape}${pet}${zzz}</svg>`;
        }
        const dome = o['pet-dome'] || '', base = o['pet-base'] || '';
        // cristal: [borde, sombra del borde, interior, sombra interior]
        const G = { 'nx-cupula-neon': ['#ffc9f4', '#ffaaee', '#fff1fc', '#ffe0f8'], 'nx-cupula-oro': ['#ffe9a6', '#ffdc78', '#fff9e3', '#fff0c4'],
            'nx-cupula-estrellas': ['#d8cbff', '#c4b2ff', '#f2edff', '#e5dbff'] }[dome] || ['#d6e0f6', '#c4d2f2', '#eef3fc', '#e3ebfa'];
        // pedestal: [oscuro, claro, aro claro, aro, disco]
        const B = { 'nx-base-oro': ['#c98a00', '#ffcf3a', '#ffeaa0', '#ffd65c', '#6b5a3a'], 'nx-base-arcade': ['#1d2072', '#3a44c9', '#8f9bff', '#4f5be8', '#2b2f52'],
            'nx-base-leyenda': ['#4b2a9e', '#8b5cff', '#e0d0ff', '#b79bff', '#4a3f6e'] }[base] || ['#3c429e', '#5e69fc', '#b3c0f8', '#8494f5', '#58627c'];
        const stars = dome === 'nx-cupula-estrellas' ? [[420, 700], [1150, 660], [1200, 1000], [400, 1240], [960, 600], [560, 600]].map(([x, y], k) => `<g class="nxp-light" style="animation-delay:${k * .3}s">${sparkle(x, y, 26 + (k % 2) * 14, '#fff')}</g>`).join('') : '';
        const lights = base === 'nx-base-arcade' ? [260, 530, 806, 1080, 1350].map((x, k) => `<circle cx="${x}" cy="${k === 0 || k === 4 ? 1700 : 1730}" r="26" fill="${['#FF6584', '#FFD43B', '#3DE0F5', '#A879FF', '#00C9A7'][k]}" class="nxp-light" style="animation-delay:${k * 0.2}s"/>`).join('')
            + [380, 806, 1230].map((x, k) => `<circle cx="${x}" cy="${k === 1 ? 1560 : 1530}" r="18" fill="#fff" class="nxp-light" style="animation-delay:${k * .3 + .1}s"/>`).join('') : '';
        const legend = base === 'nx-base-leyenda' ? `<ellipse cx="806" cy="1572" rx="690" ry="96" fill="none" stroke="url(#${i}rb)" stroke-width="16" class="nxp-aura"/>${sparkle(120, 1640, 34)}${sparkle(1500, 1690, 40, '#fff')}` : '';
        return `<svg class="nx-art nx-scene m-${mood}" viewBox="4 48 236 236" aria-hidden="true" focusable="false">${defs}
            <g transform="scale(${K})">
                <ellipse cx="810" cy="1848" rx="760" ry="28" fill="#000" opacity=".22"/>
                <path fill="${B[0]}" d="M110 1570H1510L1580 1790H40Z"/>
                <ellipse cx="810" cy="1790" rx="770" ry="72" fill="${B[0]}"/>
                <ellipse cx="806" cy="1572" rx="700" ry="100" fill="${B[1]}"/>
                ${legend}
                <rect x="201" y="1396" width="1210" height="194" fill="${B[0]}"/>
                <ellipse cx="806" cy="1590" rx="605" ry="62" fill="${B[0]}"/>
                ${lights}
                <rect x="771" y="398" width="70" height="70" rx="14" fill="${G[1]}"/>
                <ellipse cx="806" cy="462" rx="70" ry="16" fill="${G[1]}"/>
                <circle cx="806" cy="380" r="46" fill="${G[0]}"/>
                <path fill="${G[1]}" d="M852 380A46 46 0 0 1 772 411A46 38 0 0 0 852 380Z"/>
                <circle cx="790" cy="364" r="12" fill="#fff"/>
                <path fill="${G[0]}" d="M214 1396L226 790C232 560 420 462 806 462C1192 462 1380 560 1386 790L1398 1396Z"/>
                <path fill="${G[1]}" d="M1238 540C1334 593 1383 675 1386 790L1398 1396H1352L1342 800C1338 680 1300 600 1238 540Z"/>
                <path fill="${G[2]}" d="M252 1396L262 798C268 594 440 500 806 500C1172 500 1312 594 1318 798L1328 1396Z"/>
                <path fill="${G[3]}" d="M1197 572C1278 622 1315 696 1318 798L1328 1396H1288L1280 808C1278 700 1250 620 1197 572Z"/>
                <ellipse cx="806" cy="1396" rx="606" ry="102" fill="${B[2]}"/>
                <ellipse cx="806" cy="1400" rx="586" ry="92" fill="${B[3]}"/>
                <ellipse cx="806" cy="1388" rx="415" ry="96" fill="${B[4]}"/>
            </g>
            ${cape}<g class="nxp-float">${pet}</g>${zzz}
            <g transform="scale(${K})">
                <path fill="#fff" d="M300 1120L306 800C310 660 380 586 500 548C410 600 352 690 348 800L342 1120A21 21 0 0 1 300 1120Z"/>
                <circle cx="322" cy="1180" r="21" fill="#fff"/>
                <path fill="#fff" d="M620 536C700 522 760 520 820 520A14 14 0 0 1 820 548C760 548 700 550 626 562A13 13 0 0 1 620 536Z"/>
                <rect x="1262" y="860" width="18" height="230" rx="9" fill="#fff"/>
                <circle cx="1271" cy="1124" r="9" fill="#fff"/>
                <path fill="#fff" d="M257 1439A606 102 0 0 0 503 1484L513 1480A586 92 0 0 1 275 1439Z"/>
                ${stars}
            </g>
        </svg>`;
    }

    Nexus.ui.art = { trophy, target, chest, nexito };
})();
