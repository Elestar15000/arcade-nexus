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
    // Cuerpo = el rombo de la marca; cara = el hueco del logo convertido en visor índigo con ojos.
    // opts: { stage, mood, outfit: { 'pet-hat', 'pet-glasses', 'pet-scarf', 'pet-dome', 'pet-base' }, scene }
    const EYE = '#EFFBFF', LX = 107, RX = 133, EY = 126;
    function face(mood) {
        const w = (d, sw = 3) => `<path d="${d}" fill="none" stroke="${EYE}" stroke-width="${sw}" stroke-linecap="round"/>`;
        const round = (r = 6.5) => [LX, RX].map(x => `<ellipse cx="${x}" cy="${EY}" rx="${r - 1}" ry="${r + 1}" fill="${EYE}"/><circle cx="${x + 2}" cy="${EY - 3}" r="2" fill="#fff" opacity=".9"/>`).join('');
        switch (mood) {
            case 'happy': case 'rested':
                return w(`M${LX - 6} ${EY + 2}Q${LX} ${EY - 7} ${LX + 6} ${EY + 2}`) + w(`M${RX - 6} ${EY + 2}Q${RX} ${EY - 7} ${RX + 6} ${EY + 2}`)
                    + `<path d="M109 137Q120 151 131 137Z" fill="#FF6584" stroke="${EYE}" stroke-width="2" stroke-linejoin="round"/>`
                    + (mood === 'rested' ? `<path d="M120 104l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#FFE680"/>` : '');
            case 'hungry':
                return round() + `<ellipse cx="120" cy="142" rx="5" ry="6" fill="#2a0f3d" stroke="${EYE}" stroke-width="2"/><path d="M125 145q2 5 0 7" fill="none" stroke="#7fe3ff" stroke-width="2" stroke-linecap="round"/>`;
            case 'bored':
                return [LX, RX].map(x => `<ellipse cx="${x}" cy="${EY + 1}" rx="5.5" ry="6" fill="${EYE}"/><rect x="${x - 8}" y="${EY - 7}" width="16" height="7" fill="#1d2072"/>`).join('')
                    + w(`M${LX - 7} ${EY}H${LX + 7}M${RX - 7} ${EY}H${RX + 7}`, 2.5) + w('M112 142H128', 2.5);
            case 'tired':
                return w(`M${LX - 6} ${EY}Q${LX} ${EY + 4} ${LX + 6} ${EY}`) + w(`M${RX - 6} ${EY}Q${RX} ${EY + 4} ${RX + 6} ${EY}`)
                    + w('M113 143q3.5-3 7 0t7 0', 2.5) + `<path d="M150 112q4 6 0 9a4 4 0 0 1-4-4q0-2 4-5z" fill="#7fe3ff" opacity=".9"/>`;
            case 'sleepy':
                return w(`M${LX - 6} ${EY}Q${LX} ${EY + 5} ${LX + 6} ${EY}`) + w(`M${RX - 6} ${EY}Q${RX} ${EY + 5} ${RX + 6} ${EY}`)
                    + `<ellipse cx="120" cy="142" rx="3" ry="3.5" fill="none" stroke="${EYE}" stroke-width="2"/>`;
            case 'sad':
                return round(6) + w(`M${LX - 7} ${EY - 11}L${LX + 5} ${EY - 8}M${RX + 7} ${EY - 11}L${RX - 5} ${EY - 8}`, 2.5) + w('M112 145Q120 139 128 145', 2.5);
            default:
                return round() + w('M110 139Q120 148 130 139');
        }
    }
    const HATS = {
        'nx-gorra': `<path d="M88 74q32-28 64 0v8H88z" fill="#1d2072" stroke="#FFD43B" stroke-width="2.5"/><path d="M150 80q22 0 26 8H150z" fill="#1d2072" stroke="#FFD43B" stroke-width="2"/><path d="M120 60l7 8-7 8-7-8z" fill="#FFD43B"/>`,
        'nx-auriculares': `<path d="M76 116q0-62 44-62t44 62" fill="none" stroke="#2a2f9a" stroke-width="7" stroke-linecap="round"/><rect x="66" y="106" width="18" height="30" rx="8" fill="#FF6584" stroke="#2a2f9a" stroke-width="3"/><rect x="156" y="106" width="18" height="30" rx="8" fill="#3DE0F5" stroke="#2a2f9a" stroke-width="3"/>`,
        'nx-copa': `<rect x="96" y="34" width="48" height="40" rx="5" fill="#15163f"/><rect x="96" y="62" width="48" height="8" fill="#FFD43B"/><ellipse cx="120" cy="76" rx="38" ry="7" fill="#15163f"/>`,
        'nx-corona': `<path d="M90 80l4-34 14 18 12-24 12 24 14-18 4 34z" fill="#FFD43B" stroke="#C98300" stroke-width="2.5" stroke-linejoin="round"/><circle cx="120" cy="66" r="4.5" fill="#FF6584"/><circle cx="102" cy="70" r="3.5" fill="#3DE0F5"/><circle cx="138" cy="70" r="3.5" fill="#A879FF"/>`
    };
    const GLASSES = {
        'nx-gafas-sol': `<g><rect x="95" y="118" width="22" height="15" rx="6" fill="#0b0c2a" stroke="#FFD43B" stroke-width="2"/><rect x="123" y="118" width="22" height="15" rx="6" fill="#0b0c2a" stroke="#FFD43B" stroke-width="2"/><path d="M117 123h6" stroke="#FFD43B" stroke-width="2"/><path d="M99 121l6 0" stroke="#fff" stroke-width="1.5" opacity=".6"/></g>`,
        'nx-gafas-pixel': `<g fill="#0b0c2a"><rect x="94" y="119" width="52" height="5"/><rect x="96" y="124" width="18" height="5"/><rect x="126" y="124" width="18" height="5"/><rect x="100" y="129" width="10" height="4"/><rect x="130" y="129" width="10" height="4"/><rect x="99" y="124" width="4" height="4" fill="#fff"/><rect x="129" y="124" width="4" height="4" fill="#fff"/></g>`
    };
    const SCARF = {
        'nx-bufanda': `<path d="M84 160q36 22 72 0l4 10q-40 24-80 0z" fill="#FF6584"/><path d="M96 168l-4 10M110 172l-2 10M130 172l2 10M144 168l4 10" stroke="#fff" stroke-width="3" opacity=".6"/><path d="M140 170l10 26-12 2-6-24z" fill="#FF6584"/>`,
        'nx-pajarita': `<path d="M120 170l-18-10v20zM120 170l18-10v20z" fill="#FF6584" stroke="#a01c44" stroke-width="2" stroke-linejoin="round"/><circle cx="120" cy="170" r="4" fill="#a01c44"/>`,
        'nx-capa': `<path d="M82 150q-30 50-18 66 56 10 112 0 12-16-18-66z" fill="#d8304f" opacity=".95"/>`
    };
    function nexito(opts = {}) {
        const i = uid(), stage = opts.stage || 'nexito', mood = opts.mood || 'content', o = opts.outfit || {};
        const gold = stage === 'gold' || stage === 'legend';
        const body = gold ? `url(#${i}gb)` : `url(#${i}b)`;
        const cape = o['pet-scarf'] === 'nx-capa' ? SCARF['nx-capa'] : '';
        const scarf = o['pet-scarf'] && o['pet-scarf'] !== 'nx-capa' ? SCARF[o['pet-scarf']] || '' : '';
        let pet;
        if (stage === 'egg') {
            pet = `<g class="nxp-egg"><ellipse cx="120" cy="138" rx="50" ry="60" fill="url(#${i}e)" stroke="#E0A800" stroke-width="2.5"/>
                <path d="M74 128l14 8 12-10 12 10 12-10 12 10 12-10 14 8" fill="none" stroke="#B87A00" stroke-width="3" stroke-linejoin="round"/>
                <path d="M120 150l11 11-11 11-11-11z" fill="#1d2072"/><path d="M120 156l5 5-5 5-5-5z" fill="#FFD43B"/>
                ${mood === 'sleepy' ? '' : '<circle cx="106" cy="118" r="3.5" fill="#1d2072"/><circle cx="134" cy="118" r="3.5" fill="#1d2072"/>'}</g>`;
        } else {
            const baby = stage === 'baby', s = baby ? 0.82 : 1;
            const limbs = baby ? '' : `<ellipse cx="62" cy="150" rx="14" ry="10" transform="rotate(-30 62 150)" fill="${body}" stroke="#C98300" stroke-width="2"/><ellipse cx="178" cy="150" rx="14" ry="10" transform="rotate(30 178 150)" fill="${body}" stroke="#C98300" stroke-width="2"/>
                <ellipse cx="102" cy="196" rx="14" ry="8" fill="${body}" stroke="#C98300" stroke-width="2"/><ellipse cx="138" cy="196" rx="14" ry="8" fill="${body}" stroke="#C98300" stroke-width="2"/>`;
            const antenna = stage === 'pro' && !o['pet-hat'] ? `<path d="M120 70V52" stroke="#C98300" stroke-width="3"/><path d="M120 40l8 8-8 8-8-8z" fill="#3DE0F5" class="nxp-glow"/>` : '';
            pet = `<g class="nxp-body" transform="translate(${120 - 120 * s} ${132 - 132 * s}) scale(${s})">${limbs}${antenna}
                <rect x="76" y="88" width="88" height="88" rx="24" transform="rotate(45 120 132)" fill="${body}" stroke="${gold ? '#B87A00' : '#E0A800'}" stroke-width="2.5"/>
                <path d="M84 104q18-20 36-26" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-linecap="round"/>
                <rect x="101" y="112" width="38" height="38" rx="10" transform="rotate(45 120 131)" fill="#1d2072"/>
                ${['happy', 'content', 'rested'].includes(mood) ? '<ellipse cx="86" cy="142" rx="7" ry="4" fill="#FF6584" opacity=".45"/><ellipse cx="154" cy="142" rx="7" ry="4" fill="#FF6584" opacity=".45"/>' : ''}
                <g class="nxp-face">${face(mood)}</g>
                ${GLASSES[o['pet-glasses']] || ''}${scarf}${HATS[o['pet-hat']] || ''}</g>`;
        }
        const zzz = mood === 'sleepy' ? '<g class="nxp-zzz" fill="#dfe2ff" font-family="var(--font-title), sans-serif" font-weight="800"><text x="160" y="80" font-size="18">z</text><text x="174" y="62" font-size="14">z</text><text x="186" y="48" font-size="11">z</text></g>' : '';
        const sparkles = gold ? `${sparkle(56, 78, 7)}${sparkle(186, 110, 6)}${sparkle(176, 188, 5, '#fff')}` : '';
        const aura = stage === 'legend' ? `<circle cx="120" cy="134" r="86" fill="none" stroke="url(#${i}a)" stroke-width="6" opacity=".8" class="nxp-aura"/>` : '';
        const defs = `<defs>
            <linearGradient id="${i}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE680"/><stop offset=".55" stop-color="#FFD43B"/><stop offset="1" stop-color="#F2A900"/></linearGradient>
            <linearGradient id="${i}gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6C9"/><stop offset=".35" stop-color="#FFD43B"/><stop offset=".6" stop-color="#E9A400"/><stop offset="1" stop-color="#FFE680"/></linearGradient>
            <radialGradient id="${i}e" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF7D6"/><stop offset="1" stop-color="#FFD43B"/></radialGradient>
            <linearGradient id="${i}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD43B"/><stop offset=".3" stop-color="#FF6584"/><stop offset=".6" stop-color="#A879FF"/><stop offset="1" stop-color="#3DE0F5"/></linearGradient>
            <linearGradient id="${i}d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>
            <linearGradient id="${i}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3192"/><stop offset="1" stop-color="#15174f"/></linearGradient>
        </defs>`;
        if (!opts.scene) {
            return `<svg class="nx-art nx-pet m-${mood} s-${stage}" viewBox="40 20 160 200" aria-hidden="true" focusable="false">${defs}${aura}${cape}${pet}${zzz}${sparkles}</svg>`;
        }
        const dome = o['pet-dome'] || '', base = o['pet-base'] || '';
        const rim = { 'nx-cupula-neon': '#ff2bd6', 'nx-cupula-oro': '#FFD43B', 'nx-cupula-estrellas': '#A879FF' }[dome] || 'rgba(255,255,255,.35)';
        const domeFill = dome === 'nx-cupula-oro' ? 'rgba(255,212,59,.12)' : dome === 'nx-cupula-neon' ? 'rgba(255,43,214,.08)' : `url(#${i}d)`;
        const stars = dome === 'nx-cupula-estrellas' ? [[70, 70], [160, 60], [150, 120], [84, 150], [120, 44], [176, 160]].map(([x, y]) => sparkle(x, y, 4, '#fff')).join('') : '';
        const baseRim = { 'nx-base-oro': '#FFD43B', 'nx-base-arcade': '#3DE0F5', 'nx-base-leyenda': `url(#${i}a)` }[base] || '#FFD43B';
        const baseFill = base === 'nx-base-oro' ? `url(#${i}b)` : `url(#${i}p)`;
        const lights = base === 'nx-base-arcade' ? [70, 95, 120, 145, 170].map((x, k) => `<circle cx="${x}" cy="247" r="3.5" fill="${['#FF6584', '#FFD43B', '#3DE0F5', '#A879FF', '#00C9A7'][k]}" class="nxp-light" style="animation-delay:${k * 0.2}s"/>`).join('') : '';
        return `<svg class="nx-art nx-scene m-${mood} s-${stage}" viewBox="0 0 240 272" aria-hidden="true" focusable="false">${defs}
            <ellipse cx="120" cy="250" rx="112" ry="20" fill="#FFD43B" opacity=".12"/>
            <path d="M30 236h180l-14 26H44z" fill="${baseFill}" stroke="${baseRim}" stroke-width="3"/>
            <ellipse cx="120" cy="236" rx="90" ry="14" fill="${baseFill}" stroke="${baseRim}" stroke-width="4"/>
            ${lights}
            <g transform="translate(0 20)">${aura}${cape}<g class="nxp-float">${pet}</g>${zzz}${sparkles}</g>
            <path d="M36 236V128a84 84 0 0 1 168 0v108" fill="${domeFill}" stroke="${rim}" stroke-width="2.5"/>
            <path d="M58 140a62 62 0 0 1 40-62" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>
            ${stars}
        </svg>`;
    }

    Nexus.ui.art = { trophy, target, chest, nexito };
})();
