/* ============================================================
   NEXUS ARCADE · ui/icons.js — Sistema de iconos
   Sustituye los emojis de la interfaz por iconos de línea SVG
   coherentes (24×24, trazo 2, extremos redondeados, color del texto).

   · Nexus.ui.icons.svg(name, opts)   → <svg> en línea de un icono
   · Nexus.ui.icons.html(texto)        → texto con los emojis ya convertidos
   · Nexus.ui.icons.strip(texto)       → texto sin emojis (títulos, <option>…)
   · Nexus.ui.icons.draw(ctx, e, x, y, size, color)  → icono en un <canvas>
   · Nexus.ui.icons.fillRich(ctx, texto, x, y, opts) → texto + iconos en <canvas>

   El código del juego puede seguir usando emojis como «identificadores»
   (avatares guardados, pistas de las salas, logros…): un observador del DOM
   los cambia al vuelo por <nx-ic>, que conserva el emoji original oculto
   (<nx-src>) para que textContent siga devolviendo lo mismo.
   Añadir un icono: dibújalo en GLYPHS y apúntalo en EMOJI.
   ============================================================ */
(function () {
    'use strict';

    const F = 'fill="currentColor" stroke="none"';   // relleno sólido
    const S = 'fill="currentColor" fill-opacity=".18"'; // relleno suave

    /* ───────────────────────── Glifos ───────────────────────── */
    const GLYPHS = {
        // ── Interfaz ──
        home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
        trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
        medal: '<path d="M7 2h4l2 5M17 2h-4"/><path d="m7 2 3.5 7M17 2l-3.5 7"/><circle cx="12" cy="15" r="6"/><path d="m12 12.5.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z" ' + F + '/>',
        medal1: '<path d="m7 2 3.5 7M17 2l-3.5 7"/><circle cx="12" cy="15" r="6" ' + S + '/><path d="M11 13.2 12.5 12v6"/>',
        medal2: '<path d="m7 2 3.5 7M17 2l-3.5 7"/><circle cx="12" cy="15" r="6" ' + S + '/><path d="M10.2 13.3a1.9 1.9 0 0 1 3.6.7c0 1.4-3.6 2.4-3.6 4h3.7"/>',
        medal3: '<path d="m7 2 3.5 7M17 2l-3.5 7"/><circle cx="12" cy="15" r="6" ' + S + '/><path d="M10.3 12.3h3.2l-1.7 2a1.8 1.8 0 1 1-1.6 2.6"/>',
        award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 13.8-1.5 7.2 5-3 5 3-1.5-7.2"/><circle cx="12" cy="9" r="2.4" ' + F + '/>',
        chart: '<path d="M3 3v18h18"/><path d="M8 17v-5M12.5 17V8M17 17v-8"/>',
        trendUp: '<path d="M3 17 9.5 10.5l4 4L21 7"/><path d="M15 7h6v6"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
        users: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6"/><path d="M16 4.6a3.6 3.6 0 0 1 0 6.8M18 14.3c2.2.6 3.5 2.6 3.5 5.7"/>',
        cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
        knobs: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="10" r="2.5"/><circle cx="15.5" cy="10" r="2.5"/><path d="M8.5 10 9.5 8.6M15.5 10l-1.3-1M7 16h2M11 16h2M15 16h2"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
        help: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.3-2.7 4M12 17.3v.01"/>',
        alert: '<path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17.2v.01"/>',
        siren: '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M4 21h16v-3H4zM12 3v1.5M4.2 6.2l1.1 1.1M19.8 6.2l-1.1 1.1M21 12h-1.5M3 12h1.5"/>',
        megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1z"/><path d="M19 9a4 4 0 0 1 0 6M8 15l1.5 6"/>',
        speech: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5A8 8 0 1 1 21 12z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/>',
        bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
        bellDesk: '<path d="M3 18h18M5 18a7 7 0 0 1 14 0"/><path d="M12 8V6M10 6h4"/><path d="M3 21h18"/>',
        check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
        checkCircle: '<circle cx="12" cy="12" r="9" ' + S + '/><path d="m8 12.3 2.8 2.8L16.3 9"/>',
        x: '<path d="M6 6l12 12M18 6 6 18"/>',
        xCircle: '<circle cx="12" cy="12" r="9" ' + S + '/><path d="m9 9 6 6M15 9l-6 6"/>',
        minus: '<path d="M5 12h14"/>',
        ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
        stop: '<path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2z"/><path d="M8 12h8"/>',
        refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5"/><path d="M4 3.5v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.6l1.7-2.1"/><path d="M20 20.5v-5h-5"/>',
        rotateCw: '<path d="M20 12a8 8 0 1 1-2.6-5.9L20 8.5"/><path d="M20 3.5v5h-5"/>',
        rotateCcw: '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 3.5v5h5"/>',
        undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
        cornerBack: '<path d="M9 15 4 10l5-5"/><path d="M4 10h11a5 5 0 0 1 5 5v4"/>',
        enter: '<path d="M20 4v7a4 4 0 0 1-4 4H5"/><path d="m9 11-4 4 4 4"/>',
        backspace: '<path d="M21 5H8.5L2 12l6.5 7H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m11.5 9 6 6M17.5 9l-6 6"/>',
        swap: '<path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',
        shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
        repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
        recycle: '<path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7l1.6-2.8M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.2-2"/><path d="m14 16-3 3 3 3M8.3 13.6 7.2 9.5l-4 1.1M9.3 5.5l1.1-1.9a1.8 1.8 0 0 1 3.1 0l3.9 6.8"/><path d="m13.4 9.3 4.1-.1-.1-4.1"/>',
        play: '<path d="M7 4.5v15l12.5-7.5z" ' + F + '/>',
        pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" ' + F + '/><rect x="14" y="4.5" width="4" height="15" rx="1.2" ' + F + '/>',
        playPause: '<path d="M3 5v14l9-7z" ' + F + '/><path d="M15 5v14M20 5v14"/>',
        rewind: '<path d="M11 19 2 12l9-7zM22 19l-9-7 9-7z" ' + F + '/>',
        skip: '<path d="M4 5v14l10-7z" ' + F + '/><path d="M18 5v14"/>',
        triUp: '<path d="M12 5 20 18H4z" ' + F + '/>',
        triDown: '<path d="M12 19 4 6h16z" ' + F + '/>',
        triLeft: '<path d="M5 12 18 4v16z" ' + F + '/>',
        chevronsDown: '<path d="m6 6 6 6 6-6M6 13l6 6 6-6"/>',
        arrowUpCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 16.5v-9M8 11l4-4 4 4"/>',
        trayDown: '<path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6l-3-8H6z"/><path d="M12 3v7M9 7.5l3 3 3-3"/>',
        inbox: '<path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6l-3-8H6z"/>',
        mail: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 6.5 9 6.5 9-6.5"/>',
        mailIn: '<path d="M21.5 11v6a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H13"/><path d="m3 6.5 9 6.5 4-2.9M19 2v6M16.5 5.5 19 8l2.5-2.5"/>',
        mailbox: '<path d="M7 7h10a4 4 0 0 1 4 4v7H3v-7a4 4 0 0 1 4-4z"/><path d="M7 7a4 4 0 0 1 4 4v7M14 7V3h4M7 12h1M7 21v-3"/>',
        link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.4.5l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.6 1.6"/><path d="M14 10.5a4.5 4.5 0 0 0-6.4-.5l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6"/>',
        clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="8.5" y="2.5" width="7" height="3.5" rx="1"/><path d="M9 11h6M9 15h4"/>',
        save: '<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3M7.5 21v-7h9v7"/>',
        trash: '<path d="M3.5 6h17M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M5.5 6 6.5 20a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1l1-14M10 10.5v6M14 10.5v6"/>',
        pencil: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="m14.5 5.5 3 3"/>',
        notePen: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z"/><path d="M14 3v6h5M8.5 13h3M8.5 16.5h2"/><path d="m16.5 12.5-3.8 3.8-.7 2.2 2.2-.7 3.8-3.8z"/>',
        file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
        fileText: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8.5 12.5h7M8.5 16h7"/>',
        folders: '<path d="M8 6h3l1.5 1.5H20a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/><path d="M4 9v10a1 1 0 0 0 1 1h12"/>',
        archive: '<rect x="2.5" y="4" width="19" height="5" rx="1"/><path d="M4.5 9v10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9M10 13h4"/>',
        calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><rect x="7" y="13" width="3.5" height="3.5" rx=".8" ' + F + '/>',
        calendarDays: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h.01M12 13.5h.01M16.5 13.5h.01M7.5 17h.01M12 17h.01"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
        clock8: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3.8 2.2"/>',
        timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V10M9.5 2.5h5M12 2.5V6M18.4 7.1l1.3-1.3"/>',
        alarm: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M5 3 2.5 5.5M19 3l2.5 2.5M6.5 19.5 5 21M17.5 19.5 19 21"/>',
        hourglass: '<path d="M6 2.5h12M6 21.5h12"/><path d="M7.5 2.5v3.2a4 4 0 0 0 1.5 3.1L12 12l3-3.2a4 4 0 0 0 1.5-3.1V2.5M7.5 21.5v-3.2a4 4 0 0 1 1.5-3.1L12 12l3 3.2a4 4 0 0 1 1.5 3.1v3.2"/><path d="M9.5 19.5h5l-2.5-2.5z" ' + F + '/>',
        gauge: '<path d="M3.6 17a9 9 0 1 1 16.8 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1.6" ' + F + '/><path d="M6 13h1M17 13h1M12 7v1"/>',
        mantelClock: '<path d="M5 21h14M6.5 21v-8.5a5.5 5.5 0 0 1 11 0V21"/><circle cx="12" cy="12.5" r="3.2"/><path d="M12 11v1.5h1.3M10 4.5h4"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
        earth: '<circle cx="12" cy="12" r="9"/><path d="M5.5 6.5c1.5 1.3 3.8 1 4.2 3s-1.9 2.4-1.2 4.4c.5 1.4 2.4 1.6 2.5 3.6.1 1.4-.7 2.6-1.6 3.2M14.5 3.4c-.5 1.3.3 2.7 1.7 2.9 1.6.2 2.4 1.2 2.1 2.7-.3 1.2.7 2.3 2.3 2.2M13.5 20.8c.2-1.8 1.2-3.3 2.8-3.9 1.3-.5 2.1-1.7 2-3"/>',
        signal: '<path d="M4 20v-3M9.3 20v-7M14.6 20v-11M20 20V5"/>',
        wifiOff: '<path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.4M12.6 10a10 10 0 0 1 6.4 2.9M2 9.3a15 15 0 0 1 3.9-2.6M10.7 5.1A15 15 0 0 1 22 9.3M12 20h.01"/>',
        dish: '<path d="M4.5 9.5a7.5 7.5 0 0 0 10 10z"/><path d="m9.5 14.5 3-3M13 4a7 7 0 0 1 7 7M13 7.5a3.5 3.5 0 0 1 3.5 3.5"/><path d="M8 18.5 5.5 21.5h5"/>',
        satellite: '<path d="m13 7 4 4-6 6-4-4z"/><path d="m9.5 4.5 3 3-2.5 2.5-3-3zM17 12l3 3-2.5 2.5-3-3zM6 15l-2 2M15 19a4 4 0 0 0 4-4M15 22a7 7 0 0 0 7-7"/>',
        phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
        phoneArrow: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3M2 10h7M6.5 7.5 9 10l-2.5 2.5"/>',
        receiver: '<path d="M21 16.5v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.8 2 2 0 0 1 3.1 1.6h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L7.1 9.5a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
        oldPhone: '<path d="M3 9c0-2 4-4 9-4s9 2 9 4v1.5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V9H8v1.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M6 12.5 4.5 20h15L18 12.5"/><circle cx="12" cy="16" r="2"/>',
        monitor: '<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8.5 21h7M12 16.5V21"/>',
        laptop: '<rect x="4" y="4.5" width="16" height="11" rx="1.6"/><path d="M2 19.5h20l-2-4H4z"/>',
        tv: '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="m8 2.5 4 4.5 4-4.5"/>',
        radio: '<rect x="2.5" y="8" width="19" height="12.5" rx="2"/><path d="M6.5 8 18 3"/><circle cx="16" cy="14.2" r="2.8"/><path d="M6 12.5h5M6 16h5"/>',
        volume: '<path d="M11 5 6 9H2.5v6H6l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.6 5.4a9.5 9.5 0 0 1 0 13.2"/>',
        music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
        mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7"/>',
        palette: '<path d="M12 3a9 9 0 0 0 0 18c1.3 0 2-.8 2-1.8 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" ' + F + '/><circle cx="10" cy="7" r="1.2" ' + F + '/><circle cx="15" cy="7.2" r="1.2" ' + F + '/>',
        cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.1-8.9A6.5 6.5 0 1 0 6.5 19z"/>',
        compass: '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2 5.6-5.6 2 2-5.6z"/>',
        eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        eyeHoriz: '<path d="M1.5 12C4 8 7.6 6 12 6s8 2 10.5 6c-2.5 4-6.1 6-10.5 6S4 16 1.5 12z"/><circle cx="12" cy="12" r="3.2" ' + F + '/><path d="M3.5 19.5 6 16.5M12 18v3.5"/>',
        lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>',
        unlock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5"/><path d="M12 14.5v2.5"/>',
        lockKey: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.6"/><path d="M12 16.6V18.5"/>',
        lockPen: '<rect x="3" y="11" width="12" height="10" rx="2"/><path d="M5.5 11V8a3.5 3.5 0 0 1 7 0v3"/><path d="m20.5 9.5-4.5 4.5-.5 2 2-.5 4.5-4.5a1.4 1.4 0 0 0-1.5-1.5z"/>',
        key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2.5 2.5"/>',
        oldKey: '<circle cx="6.5" cy="12" r="3.8"/><circle cx="6.5" cy="12" r="1.2" ' + F + '/><path d="M10.3 12H22M18 12v3.5M21 12v2.5M15 12v2"/>',
        shield: '<path d="M12 21.5s8-3.5 8-10V5l-8-2.5L4 5v6.5c0 6.5 8 10 8 10z"/>',
        shieldCheck: '<path d="M12 21.5s8-3.5 8-10V5l-8-2.5L4 5v6.5c0 6.5 8 10 8 10z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
        flag: '<path d="M5 21.5V3.5"/><path d="M5 4h12.5l-2.5 4 2.5 4H5"/>',
        flagFill: '<path d="M5 21.5V3.5"/><path d="M5 4h12.5l-2.5 4 2.5 4H5z" ' + F + '/>',
        flagChecker: '<path d="M4.5 21.5v-18"/><path d="M4.5 4h15v9h-15"/><path d="M4.5 4h3.75v3H4.5zM12 4h3.75v3H12zM8.25 7H12v3H8.25zM15.75 7h3.75v3h-3.75zM4.5 10h3.75v3H4.5zM12 10h3.75v3H12z" ' + F + '/>',
        pin: '<path d="M9 3h6l-1 6 3.5 3.5v1.5h-11v-1.5L10 9z"/><path d="M12 14v7.5"/>',
        tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5" ' + F + '/>',
        bookmark: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
        idCard: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.4-1.6 1.6-2.4 3-2.4s2.6.8 3 2.4M14.5 10h4M14.5 13.5h3"/>',
        creditCard: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
        ticket: '<path d="M3 7.5V5h18v2.5a2.5 2.5 0 0 0 0 5V15H3v-2.5a2.5 2.5 0 0 0 0-5z" transform="translate(0 2)"/><path d="M14 7v2M14 11v2M14 15v2"/>',
        receipt: '<path d="M5 2.5v19l2.3-1.5 2.3 1.5 2.4-1.5 2.4 1.5 2.3-1.5 2.3 1.5v-19l-2.3 1.5-2.3-1.5-2.4 1.5-2.4-1.5-2.3 1.5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
        newspaper: '<path d="M4 4h13v15a2 2 0 0 0 2 2H5a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M17 8h3v11a2 2 0 0 1-4 0M7 8h6v4H7zM7 15.5h6"/>',
        cookie: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1" ' + F + '/><circle cx="14.5" cy="10" r="1" ' + F + '/><circle cx="10" cy="14.5" r="1" ' + F + '/><circle cx="15" cy="15" r="1" ' + F + '/>',
        sandwich: '<path d="M3 11 12 5l9 6z"/><path d="M3 11h18v2H3zM4 13l1.5 3h13L20 13"/><path d="M4 17h16v2H4z"/>',
        cake: '<path d="M4 21h16v-8H4z"/><path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0"/><path d="M8 13V9M12 13V9M16 13V9"/><path d="M8 6.5a1 1 0 0 0 0-2M12 6.5a1 1 0 0 0 0-2M16 6.5a1 1 0 0 0 0-2"/>',
        iceCream: '<path d="M8 11h8l-4 10z"/><path d="M7 11a5 5 0 0 1 10 0"/>',
        pizza: '<path d="M12 21 3.5 6a14 14 0 0 1 17 0z"/><path d="M5.5 9.5a11 11 0 0 1 13 0"/><circle cx="12" cy="13" r="1.3" ' + F + '/><circle cx="9.5" cy="10.5" r="1" ' + F + '/><circle cx="14.5" cy="10.5" r="1" ' + F + '/>',
        shopBag: '<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
        sparkles: '<path d="M10 3c.9 4.2 2.8 6.1 7 7-4.2.9-6.1 2.8-7 7-.9-4.2-2.8-6.1-7-7 4.2-.9 6.1-2.8 7-7z"/><path d="M18.5 14c.4 1.9 1.3 2.8 3 3.2-1.7.4-2.6 1.3-3 3.3-.4-2-1.3-2.9-3-3.3 1.7-.4 2.6-1.3 3-3.2zM18 2.5c.3 1.2.8 1.8 2 2-1.2.3-1.7.8-2 2-.3-1.2-.8-1.7-2-2 1.2-.2 1.7-.8 2-2z"/>',
        sparkle4: '<path d="M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10z" ' + F + '/>',
        star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
        starFill: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="currentColor"/>',
        starGlow: '<path d="m12 6 1.9 3.8 4.2.6-3 3 .7 4.1-3.8-2-3.8 2 .7-4.1-3-3 4.2-.6z" fill="currentColor"/><path d="M12 1.5V3M21.5 8.5l-1.4.5M2.5 8.5l1.4.5M18 20.5l-.9-1.2M6 20.5l.9-1.2"/>',
        heart: '<path d="M12 20.5s-8.5-5-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11z" fill="currentColor"/>',
        heartBroken: '<path d="M12 20.5s-8.5-5-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11z"/><path d="m12 6.6-1.5 4 3 2-2 4"/>',
        zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" fill-opacity=".2"/>',
        flame: '<path d="M12 22c4 0 7-2.8 7-7 0-4.5-3.5-7-4.5-11-2 1.5-3 3.5-3 6-1.5-1-2-2.5-2-4C6.5 8 5 11 5 15c0 4.2 3 7 7 7z"/><path d="M12 22a3 3 0 0 1-3-3c0-2 1.5-2.8 3-5 1.5 2.2 3 3 3 5a3 3 0 0 1-3 3z"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" ' + F + '/>',
        gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8.5 9 12 3l3.5 6z"/>',
        crown: '<path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5z"/><path d="M5 21h14"/>',
        tiara: '<path d="M3 17c2-5 5-8 9-12 4 4 7 7 9 12"/><path d="M3 17h18v3H3z"/><circle cx="12" cy="11" r="1.8" ' + F + '/>',
        rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
        handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7-.9l.5.3a3 3 0 0 0 2.1.4L21 4l1 7-2 2"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>',
        hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
        muscle: '<path d="M6.5 6.5h11M6.5 17.5h11"/><rect x="2" y="4" width="4.5" height="16" rx="1.5"/><rect x="17.5" y="4" width="4.5" height="16" rx="1.5"/><path d="M6.5 12h11"/>',
        footprints: '<path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0zM20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6-1.9 0-2.5 1.8-2.5 3.5 0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0z"/><path d="M16 17h4M4 13h4"/>',
        eyes: '<circle cx="7.5" cy="12" r="4.5"/><circle cx="16.5" cy="12" r="4.5"/><circle cx="8.5" cy="12.5" r="1.6" ' + F + '/><circle cx="17.5" cy="12.5" r="1.6" ' + F + '/>',
        bulb: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.4v1.5h6v-1.5c0-1 .4-1.8 1-2.4A6.5 6.5 0 0 0 12 2.5z"/>',
        book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/><path d="M8.5 7.5h7"/>',
        bookOpen: '<path d="M2 4.5h6a4 4 0 0 1 4 4v12.5a3 3 0 0 0-3-3H2zM22 4.5h-6a4 4 0 0 0-4 4v12.5a3 3 0 0 1 3-3h7z"/>',
        books: '<path d="M3 3h4v18H3zM7 5h4v16H7z"/><path d="m13.5 5.2 3.8-1.1 4.4 15.6-3.8 1.1z"/><path d="M3 7h4M7 8.5h4"/>',
        notebook: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M2.5 7h4M2.5 12h4M2.5 17h4M10 7.5h5"/>',
        scroll: '<path d="M15 12h-5M15 8h-5M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
        letters: '<path d="M2.5 18 6.5 6l4 12M4 14h5"/><path d="M13.5 6v12h4a3 3 0 0 0 0-6h-4M13.5 12h3.5a3 3 0 0 0 0-6h-3.5"/>',
        lettersLower: '<path d="M3 9.5a3 3 0 0 1 5.5 1.6V18M8.5 14.5c-3.5-.5-5.5.4-5.5 2s2.5 2.3 5.5-.5"/><path d="M12.5 4.5V18M12.5 13a3 3 0 1 1 0 .1zM21.5 11a3 3 0 1 0 0 5.5"/>',
        lettersUpper: '<path d="M2 19 6.5 5 11 19M3.6 14h5.8"/><path d="M14 5h7l-7 14h7"/>',
        numbers: '<path d="M4 8 6 6.5V17M3.5 17h5"/><path d="M10.5 8.5a2.4 2.4 0 0 1 4.6 1c0 2.4-4.6 3.8-4.6 7.5h5"/><path d="M17.5 7h4l-2.2 3.3a3 3 0 1 1-2 4.9"/>',
        abacus: '<path d="M4 3v18M20 3v18M4 7.5h16M4 12h16M4 16.5h16"/><circle cx="8" cy="7.5" r="1.4" ' + F + '/><circle cx="11" cy="7.5" r="1.4" ' + F + '/><circle cx="14" cy="12" r="1.4" ' + F + '/><circle cx="9" cy="16.5" r="1.4" ' + F + '/><circle cx="16" cy="16.5" r="1.4" ' + F + '/>',
        ruler: '<path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/>',
        setSquare: '<path d="M3 21V3l18 18z"/><path d="M7 17V12l5 5zM3 8h2M3 13h2"/>',
        puzzle: '<path d="M19.4 14.1a2.4 2.4 0 1 0 0-4.2V6a1 1 0 0 0-1-1h-3.8a2.4 2.4 0 1 0-4.2 0H6.5a1 1 0 0 0-1 1v3.9a2.4 2.4 0 1 1 0 4.2V18a1 1 0 0 0 1 1h3.9a2.4 2.4 0 1 1 4.2 0h3.8a1 1 0 0 0 1-1z"/>',
        brain: '<path d="M12 5a3 3 0 1 0-5.9.8 4 4 0 0 0-2.6 5.8 4 4 0 0 0 .6 6.6A4 4 0 1 0 12 18z"/><path d="M12 5a3 3 0 1 1 5.9.8 4 4 0 0 1 2.6 5.8 4 4 0 0 1-.6 6.6A4 4 0 1 1 12 18z"/><path d="M12 5v13M8 9.5a3 3 0 0 0 2 1M16 9.5a3 3 0 0 1-2 1"/>',
        gamepad: '<path d="M6.5 7h11a4.5 4.5 0 0 1 4.4 5.4l-.9 4.3a2.5 2.5 0 0 1-4.3 1.2L14.5 15.5h-5L7.3 17.9A2.5 2.5 0 0 1 3 16.7l-.9-4.3A4.5 4.5 0 0 1 6.5 7z"/><path d="M7.5 10v3.5M5.8 11.8h3.5"/><circle cx="15.5" cy="11" r="1" ' + F + '/><circle cx="17.8" cy="13" r="1" ' + F + '/>',
        joystick: '<path d="M5 15h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/><path d="M12 15V9"/><circle cx="12" cy="6" r="3.2" ' + S + '/><path d="M6.5 18h1.5"/>',
        invader: '<path d="M7 3h2v2h6V3h2v2h2v3h2v8h-2v-3h-2v3h-3v-2H10v2H7v-3H5v3H3V8h2V5h2zM8 9v2h2V9zm6 0v2h2V9zM8 16h3v3H8zm5 0h3v3h-3z" ' + F + '/>',
        bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4.5M2 13v3M22 13v3"/><circle cx="12" cy="3.5" r="1.2" ' + F + '/><circle cx="9" cy="13.5" r="1.4" ' + F + '/><circle cx="15" cy="13.5" r="1.4" ' + F + '/><path d="M9.5 17h5"/>',
        dice: '<rect x="3" y="3" width="18" height="18" rx="3.5"/><circle cx="8" cy="8" r="1.4" ' + F + '/><circle cx="16" cy="8" r="1.4" ' + F + '/><circle cx="12" cy="12" r="1.4" ' + F + '/><circle cx="8" cy="16" r="1.4" ' + F + '/><circle cx="16" cy="16" r="1.4" ' + F + '/>',
        cards: '<rect x="8" y="4" width="12" height="17" rx="2"/><path d="M8 6.5 4.8 7.3a1.5 1.5 0 0 0-1.1 1.8l2.8 11.1a1.5 1.5 0 0 0 1.8 1.1"/><path d="M14 9.5c1.2 1.3 2.5 2.3 2.5 3.5a1.4 1.4 0 0 1-2.5.9 1.4 1.4 0 0 1-2.5-.9c0-1.2 1.3-2.2 2.5-3.5zM14 14v2.5"/>',
        cardsFan: '<rect x="9" y="3" width="10" height="15" rx="1.8" transform="rotate(14 14 10.5)"/><rect x="5" y="4" width="10" height="15" rx="1.8" transform="rotate(-10 10 11.5)"/><circle cx="10" cy="11.5" r="2"/>',
        cardAce: '<rect x="5" y="2.5" width="14" height="19" rx="2.2"/><path d="m9.5 16 2.5-7 2.5 7M10.4 13.6h3.2"/><path d="M8 5.5h.01M16 18.5h.01"/>',
        cardBack: '<rect x="5" y="2.5" width="14" height="19" rx="2.2"/><rect x="8" y="5.5" width="8" height="13" rx="1"/><path d="m8 5.5 8 13M16 5.5l-8 13"/>',
        chessPawn: '<circle cx="12" cy="6" r="3"/><path d="M9.5 9.3h5L13.5 15h-3z"/><path d="M8 15h8l1.5 4.5h-11zM5.5 21.5h13"/>',
        chessKnight: '<path d="M7 21h11l-.8-5.5c-.4-3 .3-6.4-1.2-9.2C14.4 3.5 11.5 2.5 9 3l1 2-4.5 4.5L6 12l3-.5 2-1.5c-.3 2.5-2.5 4-3.5 6.5z"/><path d="M5.5 21.5h13"/>',
        castle: '<path d="M3 21V9h3v3h2.5V9h7v3H18V9h3v12z"/><path d="M3 9V5h3v2h2.5V5H11v4M13 9V5h2.5v2H18V5h3v4M10 21v-4a2 2 0 0 1 4 0v4"/>',
        swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 18 3h3v3l-3.5 8.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
        dagger: '<path d="m14.5 3 6.5 0 0 6.5-9 9-6.5-6.5z"/><path d="m3 21 4.5-4.5M5 12.5 11.5 19M8.5 15.5 7 17"/>',
        bomb: '<circle cx="10.5" cy="14" r="7"/><path d="m15.5 9 2-2M17 5.5c.5-1.5 2-2.5 3.5-2M20 6.5h1.5M19.5 2.5V1.5"/><path d="M7 12.5a3.5 3.5 0 0 1 3-2.5"/>',
        burst: '<path d="m12 2 1.9 5.3 5.2-2.4-2.4 5.2L22 12l-5.3 1.9 2.4 5.2-5.2-2.4L12 22l-1.9-5.3-5.2 2.4 2.4-5.2L2 12l5.3-1.9-2.4-5.2 5.2 2.4z"/>',
        firecracker: '<rect x="6" y="9" width="8" height="12" rx="1.5" transform="rotate(-30 10 15)"/><path d="M13.5 7.5c.5-2 2-3 4-3M19 2l.5 1.5M21.5 4l-1.5.5M21.5 7.5l-1.5-.5"/>',
        party: '<path d="M5.8 11.3 2 22l10.7-3.8"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01M22 2l-2.2.7a2.9 2.9 0 0 0-1.9 3.4c.2.9-.4 1.8-1.4 1.9H16M22 13l-.8-.3a2.7 2.7 0 0 0-3.2 1.4v0a2.7 2.7 0 0 1-3.1 1.4L14 15M11 2l.3.8a2.7 2.7 0 0 1-1.4 3.2v0A2.7 2.7 0 0 0 8.5 9.1L9 10"/><path d="M11 13c1.9 1.9 2.8 4.1 2 4.9s-3-.1-4.9-2-2.8-4.1-2-4.9 3 .1 4.9 2z"/>',
        gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
        coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M12 9v6M10.5 10.5h2.5a1 1 0 0 1 0 2h-2a1 1 0 0 0 0 2h2.5"/>',
        moneyBag: '<path d="M9 3h6l-2 4h-2z"/><path d="M10 7h4c4 2.5 6 6 6 9.5A4.5 4.5 0 0 1 15.5 21h-7A4.5 4.5 0 0 1 4 16.5C4 13 6 9.5 10 7z"/><path d="M14 11.5h-3a1.3 1.3 0 0 0 0 2.6h2a1.3 1.3 0 0 1 0 2.6h-3M12 10v1.5M12 16.7v1.3"/>',
        bank: '<path d="M3 21h18M5 18h14M12 2.5 3 8h18z"/><path d="M6 11v7M10 11v7M14 11v7M18 11v7"/>',
        slot: '<rect x="2.5" y="5" width="16" height="16" rx="2"/><path d="M5.5 9.5h10v6h-10zM8.8 9.5v6M12.2 9.5v6M18.5 9h2.5V5M21 3.5v1.5M7 18.5h7"/>',
        briefcase: '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2.5 12.5h19M10.5 12.5v2h3v-2"/>',
        suitcase: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7M9 7v13M15 7v13M7 20v1.5M17 20v1.5"/>',
        backpack: '<path d="M5 10a7 7 0 0 1 14 0v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9 3.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5M8 21v-5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v5M8 11h8"/>',
        box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
        toolbox: '<rect x="2.5" y="8" width="19" height="12" rx="2"/><path d="M8.5 8V5.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V8M2.5 13h19M8 11.5v3M16 11.5v3"/>',
        chest: '<path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v10H3z"/><path d="M3 11h18M10.5 11v3h3v-3"/>',
        cabinet: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 9h16M4 15.5h16M10.5 6h3M10.5 12.2h3M10.5 18.5h3"/>',
        fileBox: '<path d="M4 8h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M6 8V4h5v4M13 8V3h5v5M10 13h4"/>',
        tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9L7 20a2.1 2.1 0 0 1-3-3l6.6-6.6a6 6 0 0 1 7.9-7.9z"/>',
        wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9L7 20a2.1 2.1 0 0 1-3-3l6.6-6.6a6 6 0 0 1 7.9-7.9z"/><circle cx="5.5" cy="18.5" r=".5" ' + F + '/>',
        hammer: '<path d="m15 12-8.4 8.4a2.1 2.1 0 1 1-3-3L12 9"/><path d="M17.6 15 22 10.6 19.2 7.8a1.7 1.7 0 0 1-.5-1.2V5.2L16.5 3a5.6 5.6 0 0 0-4-1.6H9.9l.9.8a6.2 6.2 0 0 1 2 4.5v1.5l2 2h1.2a1.7 1.7 0 0 1 1.2.5z"/>',
        screwdriver: '<path d="m14 10-9.5 9.5a1.5 1.5 0 0 0 2 2L16 12"/><path d="m14.5 3.5 6 6-2.5 2.5-6-6z"/><path d="m12 6 6 6"/>',
        shovel: '<path d="M21 3 9.5 14.5M17.5 2.5 21.5 6.5"/><path d="M11 13 4.6 14.4a1 1 0 0 0-.6 1.6L8 20a1 1 0 0 0 1.6-.6L11 13"/>',
        broom: '<path d="M19 2 11.5 9.5"/><path d="M13 11 9 7c-2 0-4 1.5-5.5 3l9 9c1.5-1.5 3-3.5 3-5.5z"/><path d="m3.5 10 1 6 3.5 3.5 6-1M7 13.5 5 16"/>',
        sponge: '<rect x="3" y="7" width="18" height="11" rx="3"/><circle cx="8" cy="11" r="1" ' + F + '/><circle cx="12.5" cy="13.5" r="1" ' + F + '/><circle cx="16" cy="10.5" r="1" ' + F + '/><circle cx="8.5" cy="15" r=".8" ' + F + '/>',
        magnet: '<path d="M6 15a6 6 0 0 0 12 0V3h-4v12a2 2 0 0 1-4 0V3H6z"/><path d="M6 7h4M14 7h4"/>',
        scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
        plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"/>',
        battery: '<rect x="2.5" y="7" width="16" height="10" rx="2"/><path d="M21.5 10.5v3M6 10.5v3M9.5 10.5v3"/>',
        extinguisher: '<path d="M8 8h6v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M10 8V5h2v3M12 5h3.5l4 2M9 5c-3 0-5 1.5-5 4.5"/><path d="M8 12h6"/>',
        thermometer: '<path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z"/><path d="M12 9v8"/>',
        flashlight: '<path d="M18 6 6 18M7.5 4.5l12 12"/><path d="m15 3 6 6-3.5 3.5-6-6z"/><path d="m11.5 6.5-8.3 8.3a2 2 0 0 0 0 2.8l2.7 2.7a2 2 0 0 0 2.8 0l8.3-8.3"/>',
        telescope: '<path d="m10.7 13.4-3.3 8.1M13.3 13.4l3.3 8.1"/><path d="m3.5 13.2 1.5 3.4 15.5-6.5-2.5-6.2z"/><path d="m16.5 4.4 3.7-1.5 2 4.9-3.7 1.6"/><circle cx="12" cy="13" r="1.5" ' + F + '/>',
        flask: '<path d="M9 3h6M10 3v6l-5.4 9.2A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.2 15h9.6"/>',
        alembic: '<circle cx="9" cy="15" r="6"/><path d="M7 3h4M8 3v6.3M10 3v6.3M13 11l8-4v3"/><path d="M5 15.5h8"/>',
        atom: '<circle cx="12" cy="12" r="1.5" ' + F + '/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
        dna: '<path d="M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10"/><path d="M8.5 5.5h7M9.5 8.5h5M9.5 15.5h5M8.5 18.5h7"/>',
        radioactive: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6" ' + F + '/><path d="M12 10.4 9.2 5.5A7 7 0 0 0 5 12.7h5.4M13.6 12.7H19a7 7 0 0 0-4.2-7.2L12 10.4M10.7 13.4 8 18.1a7 7 0 0 0 8 0l-2.7-4.7" ' + S + '/>',
        lantern: '<path d="M9 2h6M10 2v2M14 2v2"/><path d="M8 4h8l1 4v9l-1 4H8l-1-4V8z"/><path d="M7 8h10M7 17h10M12 4v17"/>',
        oilLamp: '<path d="M3 15c2 3 5 4 9 4s7-1 9-4H3z"/><path d="M18 15c2 0 3.5-1 3.5-3M8 19l-1 2.5h10L16 19"/><path d="M8 15c0-2 1.5-3 1.5-5 1.5 1 2 2.5 2 4"/>',
        candle: '<path d="M9 21h6M10 21V10h4v11"/><path d="M12 3c1.5 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2.2 2-4z"/><path d="M12 10V9"/>',
        bulbLamp: '<path d="M6 21h12M12 21v-6M7.5 3h9L19 10H5z"/><path d="M10 10v1.5a2 2 0 0 0 4 0V10"/>',
        frame: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><rect x="6" y="6" width="12" height="12"/><path d="m6 16 3.5-3.5 3 3 2-2L18 17"/><circle cx="14.5" cy="9.5" r="1.2" ' + F + '/>',
        mirror: '<ellipse cx="12" cy="9.5" rx="6" ry="7.5"/><path d="M12 17v4.5M8.5 21.5h7M9.5 6.5l-1.5 2M12.5 5.5 8.5 11"/>',
        window: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M4 12h16M12 3v18"/>',
        stainedGlass: '<path d="M5 21V10a7 7 0 0 1 14 0v11z"/><path d="M5 14h14M12 3v18M7 7l5 3 5-3"/>',
        grate: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7v10M10.5 7v10M14 7v10M17.5 7v10"/>',
        hole: '<ellipse cx="12" cy="15" rx="9" ry="4" ' + S + '/><path d="M3 15V12M21 15V12M3 12c0-2.2 4-4 9-4s9 1.8 9 4"/>',
        door: '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><circle cx="15" cy="12.5" r="1.1" ' + F + '/>',
        doorOpen: '<path d="M4 21h16M6 21V3h7M16 21V7"/><path d="M13 3l4.5 1.5V21L13 19.5z" ' + S + '/>',
        elevator: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M12 2.5v19M8 8.5 9 7l1 1.5M14 8.5l1 1.5 1-1.5"/>',
        sign: '<path d="M12 3v3M12 16v6"/><rect x="3" y="6" width="18" height="10" rx="1.5"/><path d="M7 11h10"/>',
        ladder: '<path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/>',
        gate: '<path d="M2.5 6h19M4 3.5h16M5 6v15M19 6v15M5 11h14"/>',
        torii: '<path d="M2 5c4 1 16 1 20 0M4 9h16M6 6v15M18 6v15M12 6v3"/>',
        crane: '<path d="M6 21V5M3 21h7M6 5h15M6 5l6-2 9 2M18 5v6"/><path d="M16.5 11h3v2.5h-3zM6 9l4-4M6 13l4-4"/>',
        building: '<rect x="4" y="3" width="11" height="18" rx="1"/><path d="M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19M7.5 7h1M11 7h1M7.5 11h1M11 11h1M7.5 15h1M11 15h1M17.5 13v.01M17.5 17v.01"/>',
        city: '<path d="M2 21h20M4 21V9h5v12M9 21V4h6v17M15 21v-9h5v9"/><path d="M11.5 7.5h1M11.5 11h1M11.5 14.5h1M6 12.5h1M6 16h1M17 15h1"/>',
        hotel: '<path d="M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16M2 21h20M10 21v-4h4v4"/><path d="M9.5 8.5v4M14.5 8.5v4M9.5 10.5h5"/>',
        landmark: '<path d="M3 21h18M4.5 18h15M12 2.5 3 7.5h18z"/><path d="M6.5 10.5v7.5M10 10.5v7.5M14 10.5v7.5M17.5 10.5v7.5"/>',
        church: '<path d="M12 2v4M10 4h4"/><path d="M6 21V11l6-5 6 5v10M3 21h18M10 21v-4a2 2 0 0 1 4 0v4"/><circle cx="12" cy="12" r="1.5"/>',
        temple: '<path d="M12 2.5 8 7h8zM6 7h12M5 10.5h14M7 10.5v8M17 10.5v8M10.5 10.5v8M13.5 10.5v8M3 21h18v-2.5H3z"/>',
        altar: '<path d="M3 21h18M5 21v-8h14v8M3 13h18"/><path d="M9 13V9.5M15 13V9.5M9 7.5c1-1.2 1.2-2 1-3-1 .8-2 1.6-2 3h2M15 7.5c1-1.2 1.2-2 1-3-1 .8-2 1.6-2 3h2"/>',
        hut: '<path d="M2 12 12 3l10 9M4.5 10V21h15V10M10 21v-5h4v5"/>',
        shed: '<path d="M3 21V10l9-6 9 6v11M3 21h18M8 21v-7h8v7M8 17.5h8"/>',
        castleTower: '<path d="M6 21V8h12v13M4 8V4h3v2h2.5V4h5v2H17V4h3v4M10 21v-5a2 2 0 0 1 4 0v5"/>',
        statue: '<path d="M8 21V9a4 4 0 0 1 8 0v12M6 21h12"/><path d="M8.5 6.5h7M10 11h1M13 11h1M10 15c1.3.7 2.7.7 4 0M12 11v2.5"/>',
        amphora: '<path d="M9 3h6M10 3v2.5c-3.5 1.5-5 4.5-5 8 0 3.5 2.5 6.5 5 7.5h4c2.5-1 5-4 5-7.5 0-3.5-1.5-6.5-5-8V3"/><path d="M10 6c-2-.5-3.5.5-3.5 2.5M14 6c2-.5 3.5.5 3.5 2.5M6 13h12"/>',
        urn: '<path d="M8 3h8M9 3c0 2 -3 3 -3 7a6 6 0 0 0 12 0c0-4-3-5-3-7"/><path d="M8 21h8M10 16.5 9 21M14 16.5l1 4.5M6.5 9.5h11"/>',
        coffin: '<path d="M9 2h6l4 6-3 14H8L5 8z"/><path d="M12 8v6M10 10h4"/>',
        cauldron: '<path d="M4 10h16v3a8 8 0 0 1-16 0z"/><path d="M2.5 10h19M6 19.5l-1 2M18 19.5l1 2"/><path d="M9 7c0-1.5 1-2 1-3.5M13 7.5c0-2 1.5-2.5 1.5-4.5"/>',
        pot: '<path d="M4 9h16v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 9h20M2 9v2M22 9v2M9 6c0-1 1-1.5 1-2.5M14 6c0-1 1-1.5 1-2.5"/>',
        pan: '<circle cx="10" cy="12" r="7"/><path d="M16.5 14.5 22 20"/><ellipse cx="10" cy="12" rx="2.5" ry="2" ' + S + '/>',
        utensils: '<path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2M6 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a1 1 0 0 0 1 1h3zM21 15v7"/>',
        jar: '<path d="M7 3h10v3H7z"/><path d="M7 6c-1.5 1-2 2-2 3.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5c0-1.5-.5-2.5-2-3.5"/><path d="M5 12h14"/>',
        bottle: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8v4H8z"/>',
        lotion: '<path d="M10 2h4l1 3H9zM12 5v2"/><rect x="7" y="7" width="10" height="15" rx="2.5"/><path d="M10 13h4"/>',
        barrel: '<path d="M6 3h12c1.5 3 2 6 2 9s-.5 6-2 9H6c-1.5-3-2-6-2-9s.5-6 2-9z"/><path d="M4.4 8h15.2M4.4 16h15.2"/>',
        coffee: '<path d="M4 8h13v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M3 22h16M8 2.5c0 1.5 1 1.5 1 3M12 2.5c0 1.5 1 1.5 1 3"/>',
        egg: '<path d="M12 2.5c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11z"/>',
        cake: '<path d="M3 21h18M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/><path d="M4 16c1.5 1 3 1 4 0s3-1 4 0 3 1 4 0 3-1 4 0M12 12V8"/><path d="M12 3.5c1 1.2 1.3 2 1.3 2.5a1.3 1.3 0 0 1-2.6 0c0-.5.3-1.3 1.3-2.5z"/>',
        apple: '<path d="M12 7c-1.5-1-5-1.5-6.5 1.5S4.5 16 6 18.5 9 22 10.5 21.3c.9-.4 2.1-.4 3 0C15 22 17 21 18.5 18.5S20 11.5 18.5 8.5 13.5 6 12 7z"/><path d="M12 7c0-2 1-4 3-4.5"/>',
        cherries: '<circle cx="7" cy="17" r="4"/><circle cx="17" cy="16" r="4"/><path d="M7 13c1-4 4-7 8-9M17 12c-.5-3-1-5.5-2-8M15 4l3.5-1"/>',
        lemon: '<path d="M4 12c0-4 4-8 8-8 2 0 3 1 4.5.5S19 5 19.5 7.5 20 10 20 12c0 4-4 8-8 8-2 0-3-1-4.5-.5S5 19 4.5 16.5 4 14 4 12z"/><path d="M8.5 9.5c1-1 2.5-1.5 4-1.5"/>',
        strawberry: '<path d="M12 7c4 0 8 1.5 8 5 0 5-5 10-8 10s-8-5-8-10c0-3.5 4-5 8-5z"/><path d="M8 4c1.5 1 2.5 2 4 3 1.5-1 2.5-2 4-3M12 7V2.5M9 12h.01M15 12h.01M12 15h.01M9.5 17.5h.01M14.5 17.5h.01"/>',
        mushroom: '<path d="M12 3C6.5 3 3 6.5 3 10.5c0 .8.7 1.5 1.5 1.5h15c.8 0 1.5-.7 1.5-1.5C21 6.5 17.5 3 12 3z"/><path d="M9 12v6.5a2.5 2.5 0 0 0 5 0V12"/><circle cx="8" cy="7.5" r="1.2" ' + F + '/><circle cx="14.5" cy="6.5" r="1.2" ' + F + '/>',
        wheat: '<path d="M12 22V8"/><path d="M12 9c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 9c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zM12 14c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 14c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zM12 19c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 19c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zM12 4V2"/>',
        sprout: '<path d="M12 21v-9"/><path d="M12 12C12 8 9 5.5 4 5.5c0 4.5 3.5 6.5 8 6.5zM12 14c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M7 21h10"/>',
        plant: '<path d="M7 15h10l-1.5 6.5h-7z"/><path d="M12 15V9M12 9c-.5-3.5-3.5-5.5-7-5 0 3 3 5.5 7 5zM12 11c.5-3 3-5 6.5-4.5-.5 3-3 4.5-6.5 4.5z"/>',
        tree: '<path d="M12 22v-5"/><path d="M12 2.5a5 5 0 0 0-4.8 6.4A4.5 4.5 0 0 0 8 17h8a4.5 4.5 0 0 0 .8-8.1A5 5 0 0 0 12 2.5z"/>',
        pine: '<path d="M12 2 6.5 9h3L5 15h4l-4 5h14l-4-5h4l-4.5-6h3z"/><path d="M12 20v2.5"/>',
        palm: '<path d="M13 8c-1 4-1 9 0 14M9 22h8"/><path d="M13 8c-2-3-6-3.5-9-1.5 3 .5 5.5 1.3 9 1.5zM13 8c1.5-3.5 5-5 8.5-4-2.5 1.5-5 3-8.5 4zM13 8c3.5-.5 7 1 8 4.5-3-1-5.5-2.5-8-4.5zM13 8c-3 .5-6 3-6.5 6.5 2.5-2 4.5-4 6.5-6.5z"/>',
        island: '<path d="M2 20c2 1.3 3.5 1.3 5 0s3.5-1.3 5 0 3.5 1.3 5 0 3.5-1.3 5 0"/><path d="M5 17c2-1.5 4.5-2 7-2s5 .5 7 2"/><path d="M12 15c0-3 .5-6 2-8.5M14 6.5c-1-2-3.5-2.5-6-1.5 2 .5 4 .8 6 1.5zM14 6.5c1.5-1.8 4-2 6-.5-2 .5-4 .8-6 .5z"/>',
        flower: '<circle cx="12" cy="8" r="2.5"/><path d="M12 5.5a2.5 2.5 0 1 1 2.4 1.7M14.4 7.2a2.5 2.5 0 1 1-.9 3M13.5 10.2a2.5 2.5 0 1 1-3 0M10.5 10.2a2.5 2.5 0 1 1-.9-3M9.6 7.2A2.5 2.5 0 1 1 12 5.5"/><path d="M12 10.5V22M12 17c-2-2.5-4.5-3-6.5-2.5 1 2.5 3.5 3.5 6.5 2.5zM12 19c2-2.5 4.5-3 6.5-2.5-1 2.5-3.5 3.5-6.5 2.5z"/>',
        sunflower: '<circle cx="12" cy="8" r="3" ' + S + '/><path d="M12 2v1.5M17 3.5l-1 1.2M18.5 8H17M17 12.5l-1-1.2M7 12.5l1-1.2M5.5 8H7M7 3.5l1 1.2"/><path d="M12 11v11M12 17c-2-2.5-4.5-3-6.5-2.5 1 2.5 3.5 3.5 6.5 2.5z"/>',
        tulip: '<path d="M12 13c-3.5 0-6-2.5-6-6.5V3l3 2.5L12 3l3 2.5L18 3v3.5c0 4-2.5 6.5-6 6.5z"/><path d="M12 13v9M12 18.5c-2-2-4-2.5-6-2 1 2 3 3 6 2z"/>',
        rock: '<path d="M3 19 5.5 10l5-4.5 5 1.5 3.5 4 2 8z"/><path d="m10.5 5.5 1.5 6.5 4.5 1M12 12l-3.5 3"/>',
        log: '<ellipse cx="18" cy="12" rx="3" ry="5"/><path d="M18 7H6a3 5 0 0 0 0 10h12"/><ellipse cx="18" cy="12" rx="1" ry="2"/>',
        ice: '<path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/><path d="M7 9.5 8 13" />',
        snowflake: '<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2M4 11l2.5-1-.5-3M20 13l-2.5 1 .5 3M4 13l2.5 1-.5 3M20 11l-2.5-1 .5-3"/>',
        sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
        moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.6 6.6 0 0 0 11 11z"/>',
        cloudSunRain: '<path d="M12 2v1.5M5.6 4.6l1 1M18.4 4.6l-1 1M3 11h1.5"/><path d="M8.5 9.5a4 4 0 0 1 7.3-1.5"/><path d="M17 18a3.5 3.5 0 1 0-.9-6.9A5 5 0 1 0 8 18z"/><path d="M9 21v1M13 21v1"/>',
        rainbow: '<path d="M2 18a10 10 0 0 1 20 0M5.5 18a6.5 6.5 0 0 1 13 0M9 18a3 3 0 0 1 6 0"/>',
        tornado: '<path d="M21 4H3M18 8H6M19 12H9M16 16h-6M11 20H9"/>',
        waves: '<path d="M2 7c2 1.3 3.5 1.3 5 0s3.5-1.3 5 0 3.5 1.3 5 0 3.5-1.3 5 0M2 12c2 1.3 3.5 1.3 5 0s3.5-1.3 5 0 3.5 1.3 5 0 3.5-1.3 5 0M2 17c2 1.3 3.5 1.3 5 0s3.5-1.3 5 0 3.5 1.3 5 0 3.5-1.3 5 0"/>',
        droplet: '<path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5z"/>',
        mountain: '<path d="m2 20 7-12 4 6 2.5-3.5L22 20z"/><path d="m7.4 10.8 1.6 1.2 1.6-1.6"/>',
        spiral: '<path d="M12 12a1.5 1.5 0 1 1 1.5 1.5A3 3 0 0 1 10.5 10.5 4.5 4.5 0 0 1 15 6a6 6 0 0 1 6 6 7.5 7.5 0 0 1-7.5 7.5A9 9 0 0 1 4.5 10.5"/>',
        galaxy: '<circle cx="12" cy="12" r="2"/><path d="M12 4c5 0 8 3.5 8 7M12 20c-5 0-8-3.5-8-7M4 9c1-3 4-5 7-5M20 15c-1 3-4 5-7 5"/><path d="M18 4h.01M5 20h.01M20 20h.01"/>',
        comet: '<circle cx="16.5" cy="7.5" r="4" ' + S + '/><path d="M13.5 10.5 3 21M12 7 4 15M17 12l-8 8"/>',
        planet: '<circle cx="12" cy="12" r="6"/><path d="M5.5 9.5C2.5 11 1.5 13 2.5 14.5c1.5 2.2 7.5 1.3 13.4-2.1S24 5 21.5 4c-1-.5-2.5-.2-4 .5"/>',
        ufo: '<ellipse cx="12" cy="13" rx="10" ry="3.5"/><path d="M7 11a5 5 0 0 1 10 0"/><path d="M8 16.5 6 21M16 16.5l2 4.5M12 17v4"/>',
        star4: '<path d="M12 3c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8z"/>',
        dizzy: '<path d="M12 12a1.5 1.5 0 1 1 1.5 1.5A3 3 0 0 1 10.5 10.5a4.5 4.5 0 0 1 4.5-4.5 6 6 0 0 1 6 6"/><path d="M5 4l.7 1.6L7.3 6l-1.6.7L5 8.3l-.7-1.6L2.7 6l1.6-.4zM6 15l.6 1.4 1.4.6-1.4.6L6 19l-.6-1.4L4 17l1.4-.6zM16 18l.5 1.2 1.2.5-1.2.5L16 21.5l-.5-1.3-1.2-.5 1.2-.5z"/>',
        zzz: '<path d="M3 9h6l-6 7h6M13 4h5l-5 6h5M16 15h4l-4 5h4"/>',
        wordle: '<rect x="2" y="8" width="5.6" height="8" rx="1.2" ' + F + '/><rect x="9.2" y="8" width="5.6" height="8" rx="1.2"/><rect x="16.4" y="8" width="5.6" height="8" rx="1.2" ' + S + '/><path d="M2 19.5h20M2 4.5h20"/>',
        connections: '<rect x="3" y="3" width="8" height="8" rx="2" ' + F + '/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2" ' + S + '/><path d="M11 7h2M7 11v2"/>',
        copa: '<path d="M6 3h12v3a6 6 0 0 1-12 0z"/><path d="M12 12v5M8 21h8l-1-4H9z"/><path d="M6 5.5H3.5M18 5.5h2.5"/>',
        spade: '<path d="M12 2.5C9 6 4 9 4 13a4 4 0 0 0 7 2.6L10 21.5h4l-1-5.9A4 4 0 0 0 20 13c0-4-5-7-8-10.5z"/>',
        umbrella: '<path d="M3 11a9 9 0 0 1 18 0z"/><path d="M12 11v8.5a2 2 0 0 1-4 0M12 2v-.5M3 22h18"/>',
        map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
        scale: '<path d="M12 3v18M7 21h10M5 7h14M12 5.5l0 1.5"/><path d="M5 7 2 14a3.2 3.2 0 0 0 6 0zM19 7l-3 7a3.2 3.2 0 0 0 6 0z"/>',
        // ── Animales ──
        snake: '<path d="M17 7.5c0-2-1.6-3.5-3.5-3.5S10 5.5 10 7.5 11.5 10 14 10.5c3 .6 6 2 6 5.5a5 5 0 0 1-5 5H5c-1.5 0-2.5-1-2.5-2.5S3.5 16 5 16h9.5a1 1 0 0 0 0-2C10 14 6.5 11.5 6.5 7.5"/><circle cx="14.6" cy="6.6" r=".9" ' + F + '/><path d="M17 7.5h2.5L21 6.5M19.5 7.5 21 8.5"/>',
        eagle: '<path d="M12 9c-1.5-3-5-5-10-5 1 3 3.5 5.5 7 6.5M12 9c1.5-3 5-5 10-5-1 3-3.5 5.5-7 6.5"/><path d="M9 10.5V16l3 5 3-5v-5.5"/><path d="M12 6.5c-1-.2-1.8.3-2 1.2.7 0 1.4.3 2 .8.6-.5 1.3-.8 2-.8-.2-.9-1-1.4-2-1.2z"/>',
        bird: '<path d="M16 7h.01M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.3-2.3L2 20"/><path d="m20 7 2 .5-2 .5M10 18v3M14 17.7V21M7 18a6 6 0 0 0 3.8-5.6V10"/>',
        parrot: '<path d="M14 3a5 5 0 0 0-5 5v4c0 3-2 6-5 9h8c4 0 7-3.5 7-8V8a5 5 0 0 0-5-5z"/><path d="M19 8c1.5 0 2.5 1 2.5 2.5L19 11"/><circle cx="15" cy="7.5" r="1" ' + F + '/><path d="M9 13c2 0 4-1 5-3"/>',
        owl: '<path d="M5 4l2.5 2.5h9L19 4v10a7 7 0 0 1-14 0z"/><circle cx="9" cy="11" r="2.2"/><circle cx="15" cy="11" r="2.2"/><path d="m11.2 14 .8 1 .8-1M9 19.5h1M14 19.5h1"/>',
        rooster: '<path d="M8 21h8M12 21v-3"/><path d="M9 18a6 6 0 0 1-3-5V9a4 4 0 0 1 4-4h.5"/><path d="M10 4.5C10 3 11 2 12 2.5c.5-.8 1.8-.8 2 .5 1-.3 1.8.6 1.3 1.5"/><path d="M10.5 5a3.5 3.5 0 0 1 6 2.5v1L19 10l-2.5.5c0 3.5-2 6-5 7.5"/><path d="M16 12c2.5-2 4.5-1.5 5.5 1-1.5 3-3.5 4-6 3.5"/>',
        turtle: '<path d="M4.5 15a7.5 7.5 0 0 1 15 0z"/><path d="M8 11.5 10 15M16 11.5 14 15M10 9l2 2 2-2M19.5 13.5c1.2-.3 2.3-1.3 2.3-2.8 0-.8-.6-1.2-1.3-1.2a2.2 2.2 0 0 0-2 1.2"/><path d="M6 15v3M18 15v3M3 15h1.5"/>',
        rabbit: '<path d="M13 16a3 3 0 0 1 2.2 5H8a6 6 0 0 1 0-12h.5"/><path d="M16 21a6 6 0 0 0 3.8-10.6L18 9.5c1-3.5.5-6-1-7-1.5.5-2.5 3.5-2 6.5"/><path d="M14 8.5c-1-3-3-5-5-5-.5 2 .5 4.5 2.5 6"/><circle cx="17" cy="13" r=".9" ' + F + '/>',
        kangaroo: '<path d="M3 20c3 0 5-1.5 7-4M10 16c1 2.5 3 4 6 4h3"/><path d="M10 16c-1.5-3 0-7 3.5-8 1.5-.5 3 0 4 1M17.5 9c.5-2 2-3.5 3.5-3.5L20 9"/><path d="M14 13c-1 1.5-2 1.5-3 1"/><circle cx="18.5" cy="8.5" r=".8" ' + F + '/>',
        cat: '<path d="M12 5c.7 0 1.3.1 2 .2C15.7 3.6 18 2.5 19.5 3c.5 2.1-.3 4.3-1 5.7A7 7 0 0 1 19 12c0 4.5-3 8-7 8s-7-3.5-7-8a7 7 0 0 1 .5-3.3C4.8 7.3 4 5.1 4.5 3c1.5-.5 3.8.6 5.5 2.2.7-.1 1.3-.2 2-.2z"/><path d="M8.5 12.5h.01M15.5 12.5h.01M11 15.5h2l-1 1z"/>',
        fox: '<path d="M3 3l4 7.5L12 21l5-10.5L21 3l-5.5 4.5h-7z"/><path d="M7 10.5 12 13l5-2.5M9.5 9.5h.01M14.5 9.5h.01"/>',
        panda: '<circle cx="12" cy="13" r="8"/><circle cx="5.5" cy="5.5" r="2.5" ' + F + '/><circle cx="18.5" cy="5.5" r="2.5" ' + F + '/><ellipse cx="8.8" cy="12.5" rx="1.8" ry="2.3" transform="rotate(-25 8.8 12.5)" ' + F + '/><ellipse cx="15.2" cy="12.5" rx="1.8" ry="2.3" transform="rotate(25 15.2 12.5)" ' + F + '/><path d="M11 16.5h2l-1 1z"/>',
        lion: '<circle cx="12" cy="12.5" r="5"/><path d="M12 2.5 14 5l3-1.5.5 3.5 3.5 1-1.5 3 2 2.5-3 1.5.5 3.5-3.5-.5L14 21l-2-2.5L10 21l-1.5-3-3.5.5.5-3.5-3-1.5 2-2.5L3 8l3.5-1L7 3.5 10 5z"/><path d="M10.2 11.5h.01M13.8 11.5h.01M11 14.5h2l-1 1z"/>',
        frog: '<path d="M3 15c0-4 4-7 9-7s9 3 9 7c0 3-4 5-9 5s-9-2-9-5z"/><circle cx="7.5" cy="7.5" r="2.8"/><circle cx="16.5" cy="7.5" r="2.8"/><circle cx="7.5" cy="7.5" r="1" ' + F + '/><circle cx="16.5" cy="7.5" r="1" ' + F + '/><path d="M8 15c2.5 1.5 5.5 1.5 8 0"/>',
        octopus: '<path d="M6 12a6 6 0 0 1 12 0v1.5"/><path d="M6 12v2c0 2-2 3-3 4M9 14v3c0 2-1 3-2 4M12 14v7M15 14v3c0 2 1 3 2 4M18 13.5v.5c0 2 2 3 3 4"/><path d="M10 10h.01M14 10h.01"/>',
        unicorn: '<path d="M9 21v-4.5c-2-.5-4-2-4-5L8 7l-2-5 5 3.5h1c4 0 7 2.5 7 6.5 0 1.5-.5 3-1.5 4L19 21"/><path d="m11 5.5 3-4M9 10h.01M14 13c-1 1-2.5 1.5-4 1"/>',
        dragon: '<path d="M4 20c4 0 6-2 7-5l2-4c1-2 3-3 5-3l3-1-1 3-3 1"/><path d="M13 11c2 3 2 6 0 9h8"/><path d="M11 15 5 13l2-3 4 1M8.5 7 6 3l5 3"/><circle cx="17.5" cy="8.5" r=".8" ' + F + '/>',
        pig: '<circle cx="12" cy="13" r="7.5"/><path d="M6.5 7 5 3.5l4 2M17.5 7 19 3.5l-4 2"/><ellipse cx="12" cy="15" rx="3" ry="2.2"/><path d="M11 15h.01M13 15h.01M8.8 11h.01M15.2 11h.01"/>',
        cow: '<path d="M7 7c-2 0-4-1-4-3 2 0 3 .5 4 1.5M17 7c2 0 4-1 4-3-2 0-3 .5-4 1.5"/><path d="M7 6h10v6c0 1.5 1 2.5 1 4.5a4.5 4.5 0 0 1-4.5 4.5h-3A4.5 4.5 0 0 1 6 16.5c0-2 1-3 1-4.5z"/><ellipse cx="12" cy="17" rx="3.5" ry="2.2"/><path d="M10.5 17h.01M13.5 17h.01M9.5 10.5h.01M14.5 10.5h.01"/>',
        bull: '<path d="M3 4c0 3 2 5 5 5M21 4c0 3-2 5-5 5"/><path d="M8 8h8v5c0 1.5.8 2.5.8 4a4.8 4.8 0 0 1-9.6 0c0-1.5.8-2.5.8-4z"/><circle cx="12" cy="18.5" r="1.4"/><path d="M10 12h.01M14 12h.01"/>',
        fish: '<path d="M6.5 12c3-5.5 9-6.5 13.5 0-4.5 6.5-10.5 5.5-13.5 0z"/><path d="M6.5 12 2 8v8z"/><circle cx="16" cy="11" r=".9" ' + F + '/>',
        shell: '<path d="M12 21c-5 0-9-4-9-9a9 9 0 0 1 9-9c3 0 5 2 5 5s-2 4-4 4-3-1-3-2.5S11 7 12 7"/><path d="M12 21c5 0 9-4 9-9"/>',
        beetle: '<ellipse cx="12" cy="14" rx="5.5" ry="7"/><path d="M12 7v14M8.5 4.5 10 7M15.5 4.5 14 7M6.5 11 3 9.5M17.5 11 21 9.5M6.5 15H3M17.5 15H21M7 18.5l-3 2M17 18.5l3 2"/><path d="M9 7.5a3 3 0 0 1 6 0"/>',
        paw: '<circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 11.5c-3 0-6 4.5-6 7a2.5 2.5 0 0 0 3.2 2.4c1.8-.5 3.8-.5 5.6 0A2.5 2.5 0 0 0 18 18.5c0-2.5-3-7-6-7z"/>',
        ghost: '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-1.8L14.3 21 12 19.2 9.7 21l-2.4-1.8z"/><circle cx="9.3" cy="10.5" r="1.3" ' + F + '/><circle cx="14.7" cy="10.5" r="1.3" ' + F + '/>',
        skull: '<path d="M12 2.5a8 8 0 0 0-8 8c0 2.8 1.2 4.5 3 5.7V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.8c1.8-1.2 3-2.9 3-5.7a8 8 0 0 0-8-8z"/><circle cx="9" cy="11.5" r="1.8" ' + F + '/><circle cx="15" cy="11.5" r="1.8" ' + F + '/><path d="M10 20v-2.5M14 20v-2.5M12 14.5l-.8 1.5h1.6z"/>',
        crossbones: '<path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 2.2 1 3.6 2.5 4.6V15h8v-1.4c1.5-1 2.5-2.4 2.5-4.6A6.5 6.5 0 0 0 12 2.5z"/><circle cx="9.5" cy="9.5" r="1.4" ' + F + '/><circle cx="14.5" cy="9.5" r="1.4" ' + F + '/><path d="m4 17 16 4.5M20 17 4 21.5"/>',
        alien: '<path d="M12 2.5c-4.5 0-8 3.2-8 8 0 5 5 11 8 11s8-6 8-11c0-4.8-3.5-8-8-8z"/><path d="M7 11.5c1.5 0 3 1 3.5 2.5-1.5 0-3-1-3.5-2.5zM17 11.5c-1.5 0-3 1-3.5 2.5 1.5 0 3-1 3.5-2.5z" ' + F + '/>',
        demon: '<path d="M4 3c0 3 1 5 3 6M20 3c0 3-1 5-3 6"/><path d="M12 6a7 7 0 0 0-7 7c0 4.5 3 8 7 8s7-3.5 7-8a7 7 0 0 0-7-7z"/><path d="m8 11.5 2.5 1M16 11.5l-2.5 1M8.5 16.5c2.3 1.5 4.7 1.5 7 0M10.5 16.5v1.5M13.5 16.5v1.5"/>',
        clown: '<circle cx="12" cy="13" r="7.5"/><circle cx="12" cy="14" r="1.8" ' + F + '/><path d="M8.5 11h.01M15.5 11h.01M8.5 17c2.3 1.5 4.7 1.5 7 0M7 5.5 4 3M17 5.5l3-2.5M4.5 13a2.5 2.5 0 0 1-2.3-3.5M19.5 13a2.5 2.5 0 0 0 2.3-3.5"/>',
        pumpkin: '<path d="M12 7c-5 0-8.5 3-8.5 7s3.5 7 8.5 7 8.5-3 8.5-7-3.5-7-8.5-7z"/><path d="M12 7c-2 0-3.5 3-3.5 7s1.5 7 3.5 7 3.5-3 3.5-7-1.5-7-3.5-7zM12 7V3.5L14 2.5"/>',
        teddy: '<circle cx="12" cy="8" r="4.5"/><circle cx="7.5" cy="4" r="1.8"/><circle cx="16.5" cy="4" r="1.8"/><path d="M8.5 12C6 13 5 15.5 5 17.5 5 20 8 21.5 12 21.5s7-1.5 7-4c0-2-1-4.5-3.5-5.5"/><path d="M10.5 7.5h.01M13.5 7.5h.01M11.2 9.5h1.6"/>',
        doll: '<circle cx="12" cy="7" r="4"/><path d="M8.5 9c-2 2-3.5 5-3.5 8a4.5 4.5 0 0 0 4.5 4.5h5A4.5 4.5 0 0 0 19 17c0-3-1.5-6-3.5-8"/><path d="M10.5 7h.01M13.5 7h.01M8 15c2.5 1.5 5.5 1.5 8 0"/>',
        // ── Personas ──
        detective: '<path d="M3 9.5h18M5 9.5l1.5-6h11L19 9.5"/><circle cx="8" cy="15" r="3"/><circle cx="16" cy="15" r="3"/><path d="M11 15h2M5 15l-2-1M19 15l2-1"/>',
        ninja: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9.5h17v4.5h-17z" ' + S + '/><path d="M8.5 11.8h2M13.5 11.8h2M20.5 10l2-2M20.5 12.5l2.2 1"/>',
        guard: '<path d="M8 10V5a4 4 0 0 1 8 0v5"/><path d="M7 10h10M9.5 13h5M8 10c0 6 1.5 8 4 8s4-2 4-8"/><path d="M5 22c.5-2.5 3-4 7-4s6.5 1.5 7 4"/>',
        pilot: '<path d="M5 9c1.5-3 4-4.5 7-4.5S17.5 6 19 9z"/><path d="M5 9h14M12 6.5v1M7.5 9.5c0 4 2 6.5 4.5 6.5s4.5-2.5 4.5-6.5M5 22c.5-3 3-5 7-5s6.5 2 7 5"/>',
        astronaut: '<circle cx="12" cy="9" r="6.5"/><rect x="8" y="6.5" width="8" height="5" rx="2.5" ' + S + '/><path d="M6 15.5 4.5 21.5h15L18 15.5M10 18.5h4"/>',
        farmer: '<path d="M3 9h18M6.5 9c0-3 2.5-5.5 5.5-5.5S17.5 6 17.5 9"/><path d="M8 10c0 3.5 1.8 5.5 4 5.5s4-2 4-5.5M5 22c.5-3 3-5 7-5s6.5 2 7 5"/>',
        elder: '<circle cx="12" cy="8" r="4"/><path d="M8.5 6.5c.5-2 2-3 3.5-3s3 1 3.5 3M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/><path d="M17.5 21v-5.5"/>',
        bearded: '<circle cx="12" cy="7.5" r="4"/><path d="M8 8.5c0 4 2 6 4 6s4-2 4-6M10.5 11.5h3M4 22c0-3.5 3-6 8-6s8 2.5 8 6"/>',
        suit: '<circle cx="12" cy="6" r="3.5"/><path d="M5 21.5V15a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v6.5"/><path d="M9.5 11 12 16l2.5-5M12 16v5.5"/>',
        topHat: '<path d="M6.5 15V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v10"/><path d="M2.5 15h19c0 2-2 3-4 3h-11c-2 0-4-1-4-3zM6.5 11.5h11"/>',
        doctor: '<path d="M5 3v4a4 4 0 0 0 8 0V3M5 3h1.5M11.5 3H13M9 11v3a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="10" r="2"/>',
        meditate: '<circle cx="12" cy="4.5" r="2.2"/><path d="M12 8v6M7 11l5-2 5 2M4 19c2-2.5 5-3.5 8-3.5s6 1 8 3.5M7 21h10"/>',
        graduate: '<path d="M2 9 12 4l10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>',
        // ── Caras ──
        faceHalo: '<circle cx="12" cy="13" r="8"/><ellipse cx="12" cy="3.5" rx="5" ry="1.5"/><path d="M8.5 15.5c2 2 5 2 7 0M9 11h.01M15 11h.01"/>',
        faceLiar: '<circle cx="11" cy="12" r="8.5"/><path d="M8.5 10h.01M13.5 10h.01M11.5 13h10.5M8 16.5h4.5"/>',
        faceDizzy: '<circle cx="12" cy="12" r="9"/><path d="m7.5 8 3 3M10.5 8l-3 3M13.5 8l3 3M16.5 8l-3 3"/><circle cx="12" cy="16" r="1.8"/>',
        faceNeutral: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5h7M9 9.5h.01M15 9.5h.01"/>',
        faceSweat: '<circle cx="12" cy="12" r="9"/><path d="M7.5 14c1.5 3 7.5 3 9 0zM9 9.5h.01M15 9.5h.01"/><path d="M19 3.5s-2 2.2-2 3.3a2 2 0 0 0 4 0c0-1.1-2-3.3-2-3.3z" ' + F + '/>',
        faceScream: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="16" rx="2" ry="2.8"/><path d="M8 9.5c.5-1 1.5-1.5 2-1.2M16 9.5c-.5-1-1.5-1.5-2-1.2M9 11h.01M15 11h.01"/>',
        masks: '<path d="M2 4c3 1.5 7 1.5 10 0v6a5 5 0 0 1-10 0z"/><path d="M12 9c3 1.5 7 1.5 10 0v6a5 5 0 0 1-10 0"/><path d="M4.5 8.5h1.5M8 8.5h1.5M5 11.5c1 1 2.8 1 3.8 0M14.5 13.5h1.5M18 13.5h1.5M15 17.5c1-1 2.8-1 3.8 0"/>',
        crystalBall: '<circle cx="12" cy="10" r="7.5"/><path d="M6 21h12l-2-4H8z"/><path d="M9 7a4 4 0 0 1 3-2"/><path d="M14.5 10.5l.5 1.2 1.2.5-1.2.5-.5 1.3-.5-1.3-1.2-.5 1.2-.5z" ' + F + '/>',
        // ── Transporte ──
        ship: '<path d="M2 19c2 1.3 3.5 1.3 5 0s3.5-1.3 5 0 3.5 1.3 5 0 3.5-1.3 5 0"/><path d="M4 16 3 11h18l-2.5 5"/><path d="M6 11V7h12v4M10 7V3h4v4"/>',
        anchor: '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M8 11h8M4 13a8 8 0 0 0 16 0M4 13H2.5M20 13h1.5"/>',
        lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m4.9 4.9 4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3"/>',
        train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4M8.5 14h.01M15.5 14h.01M10 6.5h4"/>',
        locomotive: '<path d="M3 17V9h9V4h5v4h3l1 4v5z"/><path d="M5 9V5h3v4M12 12h9"/><circle cx="7" cy="18.5" r="2"/><circle cx="16" cy="18.5" r="2"/>',
        tram: '<rect x="4" y="6" width="16" height="12" rx="2.5"/><path d="M4 12h16M12 6v6M9 3h6M12 3v3M8 21l1-3M16 21l-1-3"/>',
        tractor: '<circle cx="7" cy="16" r="4"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M11 16h5M3 12V6h6l2 6h7.5l1 3"/><path d="M9 6v6"/>',
        plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
        // ── Ropa y objetos ──
        shirt: '<path d="M8 3 3 6l2 4.5 2-1V21h10V9.5l2 1L21 6l-5-3a4 4 0 0 1-8 0z"/>',
        coat: '<path d="M8 3 4 5.5 3 21h6l3-9 3 9h6l-1-15.5L16 3"/><path d="M8 3l4 5 4-5M12 8v4"/>',
        ring: '<circle cx="12" cy="14.5" r="6.5"/><path d="m9.5 3.5 2.5 3 2.5-3-1-1.5h-3z"/>',
        yarn: '<circle cx="12" cy="12" r="9"/><path d="M5 6.5c4 0 9 3 11 9M3.5 11c3.5 0 7.5 2.5 8.5 9.5M9 3.3c4 1.2 8.5 5.3 9.5 12.5M19 7c-3.5.5-7 3.5-8 9"/>',
        violin: '<path d="M14 4 20 2l2 2-2 6M14 10l-4.5 4.5"/><path d="M9.5 9.5c-2-1-4.5 0-5.5 2s-.5 3.5.5 4.5c-1 1-.5 3 .5 4s3 1.5 4 .5c1 1 2.5 1.5 4.5.5s3-3.5 2-5.5"/><path d="M8 14l2 2"/>',
        football: '<circle cx="12" cy="12" r="9"/><path d="m12 7 3.8 2.8-1.4 4.5H9.6L8.2 9.8z" ' + F + '/><path d="M12 7V3M15.8 9.8l3.8-1.3M14.4 14.3l2.4 3.4M9.6 14.3l-2.4 3.4M8.2 9.8 4.4 8.5"/>',
        eightBall: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="11.6" r="4.7"/><circle cx="12" cy="10" r="1.2" stroke-width="1.4"/><circle cx="12" cy="13.05" r="1.5" stroke-width="1.4"/>',
        pingPong: '<circle cx="9.5" cy="9.5" r="6.5"/><path d="m14 14 6.5 6.5a1.4 1.4 0 0 1-2 2L12 16"/><circle cx="19" cy="5" r="2.2" ' + F + '/>',
        rosco: '<circle cx="12" cy="4" r="1.6"/><circle cx="17.7" cy="6.3" r="1.6"/><circle cx="20" cy="12" r="1.6"/><circle cx="17.7" cy="17.7" r="1.6"/><circle cx="12" cy="20" r="1.6" ' + F + '/><circle cx="6.3" cy="17.7" r="1.6" ' + F + '/><circle cx="4" cy="12" r="1.6"/><circle cx="6.3" cy="6.3" r="1.6" ' + F + '/>',
        blocks: '<rect x="3" y="13" width="6" height="6" rx="1"/><rect x="9" y="13" width="6" height="6" rx="1"/><rect x="9" y="7" width="6" height="6" rx="1"/><rect x="15" y="13" width="6" height="6" rx="1" ' + S + '/>',
        bricks: '<rect x="2.5" y="4" width="19" height="16" rx="1.5"/><path d="M2.5 9.3h19M2.5 14.7h19M9 4v5.3M15 9.3v5.4M9 14.7V20"/>',
        grid2048: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18M12 3v18"/><path d="M6.5 7.5h2M15.5 16.5h2"/>',
        crossword: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><rect x="9" y="9" width="6" height="6" ' + F + '/><rect x="15" y="3" width="6" height="6" ' + F + '/>',
        wordsearch: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h.01M12 8h.01M17 8h.01M7 16h.01M12 16h.01M17 16h.01"/><rect x="5" y="10" width="14" height="4" rx="2"/>',
        sudoku: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/><path d="M5.5 5.3 6.5 4.8V7.3M11 11.2a1 1 0 0 1 2 .3c0 .7-2 1-2 2h2"/>',
        mine: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2 19 19M5 19l2.8-2.8M16.2 7.8 19 5"/><circle cx="10" cy="10" r="1.3" ' + F + '/>',
        pacman: '<path d="M21 12a9 9 0 1 1-2.6-6.4L12 12l6.4 6.4A9 9 0 0 0 21 12z"/><circle cx="11" cy="7.5" r="1.2" ' + F + '/>',
        // ── Formas de color ──
        sq: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" ' + F + '/>',
        dot: '<circle cx="12" cy="12" r="7" ' + F + '/>',
        ring2: '<circle cx="12" cy="12" r="7"/>',
        dotOutline: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>',
        radioBtn: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" ' + F + '/>',
        flagEs: '<path d="M4 21.5V3.5"/><path d="M4 4h16v10H4z"/><path d="M4 7.3h16v3.4H4z" ' + F + '/>',
        nexus: '<g transform="rotate(45 12 12)"><rect x="4.5" y="4.5" width="15" height="15" rx="3.5" ' + F + '/><rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.3" fill="var(--nx-ic-hole, #141640)" stroke="none"/></g>'
    };

    /* ─────────────── Emoji → icono (y tono opcional) ─────────────── */
    // valor: 'icono' o ['icono', 'color']
    const GOLD = '#FFD43B', GREEN = '#22c55e', RED = '#ef4444', AMBER = '#f59e0b', ORANGE = '#f97316';
    const EMOJI = {
        // Navegación e interfaz
        '🏠': 'home', '🏆': 'trophy', '🏅': 'medal', '🎖': 'award', '📊': 'chart', '📈': 'trendUp', '👤': 'user', '👥': 'users',
        '⚙': 'cog', '🎚': 'sliders', '🎛': 'knobs', '☰': 'menu', '🔍': 'search', '🔎': 'search', 'ℹ': 'info', '❔': 'help',
        '⚠': ['alert', AMBER], '🚨': ['siren', RED], '📣': 'megaphone', '🗣': 'speech', '🔔': 'bell', '🛎': 'bellDesk',
        '✓': 'check', '✔': 'check', '✅': ['checkCircle', GREEN], '✕': 'x', '✖': 'x', '✗': 'x', '❌': ['xCircle', RED],
        '➖': 'minus', '⛔': ['ban', RED], '🛑': ['stop', RED], '🔄': 'refresh', '↻': 'rotateCw', '↺': 'rotateCcw', '♻': 'recycle',
        '↶': 'undo', '↩': 'cornerBack', '⏎': 'enter', '⌫': 'backspace', '⇄': 'swap', '🔀': 'shuffle', '🔁': 'repeat',
        '▶': 'play', '⏸': 'pause', '⏯': 'playPause', '⏪': 'rewind', '⏭': 'skip', '▲': 'triUp', '▼': 'triDown', '◀': 'triLeft',
        '⏬': 'chevronsDown', '⬆': 'arrowUpCircle', '📥': 'trayDown', '📭': 'inbox', '📬': 'mailbox', '✉': 'mail', '📨': 'mailIn',
        '🔗': 'link', '📋': 'clipboard', '💾': 'save', '🗑': 'trash', '✏': 'pencil', '📝': 'notePen', '📄': 'file', '📃': 'fileText',
        '🗂': 'folders', '🗃': 'fileBox', '📅': 'calendar', '📆': 'calendarDays', '🗓': 'calendarDays', '🕑': 'clock', '🕗': 'clock8',
        '⏱': 'timer', '⏰': 'alarm', '⏳': 'hourglass', '⌛': 'hourglass', '⏲': 'gauge', '🕰': 'mantelClock',
        '🌐': 'globe', '🌍': 'earth', '📶': 'signal', '📴': 'wifiOff', '📡': 'dish', '🛰': 'satellite',
        '📱': 'phone', '📲': 'phoneArrow', '📞': 'receiver', '☎': 'oldPhone', '🖥': 'monitor', '💻': 'laptop', '📺': 'tv', '📻': 'radio',
        '🔊': 'volume', '🎵': 'music', '🎤': 'mic', '🎨': 'palette', '☁': 'cloud', '🧭': 'compass', '🗺': 'map', '⚖': 'scale', '👁': 'eye', '👀': 'eyes',
        '🔒': 'lock', '🔓': 'unlock', '🔐': 'lockKey', '🔏': 'lockPen', '🔑': 'key', '🗝': 'oldKey', '🛡': 'shield',
        '🏳': 'flag', '🚩': ['flagFill', RED], '🏁': 'flagChecker', '📌': 'pin', '🏷': 'tag', '🔖': 'bookmark', '🪪': 'idCard',
        '💳': 'creditCard', '🎟': 'ticket', '🎫': 'ticket', '🧾': 'receipt', '📰': 'newspaper',
        '🍪': 'cookie', '🥪': 'sandwich', '🎂': 'cake', '🍦': 'iceCream', '🍕': 'pizza', '🛍': 'shopBag', '🛍️': 'shopBag', '✨': 'sparkles', '⭐': ['starFill', GOLD], '★': ['starFill', GOLD], '☆': 'star', '🌟': ['starGlow', GOLD],
        '❤': ['heart', '#fb7185'], '💛': ['heart', '#facc15'], '💔': ['heartBroken', '#fb7185'],
        '⚡': 'zap', '🔥': 'flame', '🎯': 'target', '💎': 'gem', '👑': 'crown', '👸': 'tiara', '🚀': 'rocket',
        '🤝': 'handshake', '✋': 'hand', '💪': 'muscle', '👣': 'footprints', '💡': 'bulb',
        '📖': 'bookOpen', '📚': 'books', '📕': ['book', '#f87171'], '📘': ['book', '#60a5fa'], '📙': ['book', '#fb923c'],
        '📓': 'notebook', '📔': ['notebook', '#fbbf24'], '📒': ['notebook', '#facc15'], '📜': 'scroll',
        '🔤': 'letters', '🔡': 'lettersLower', '🔠': 'lettersUpper', '🔢': 'numbers', '🧮': 'abacus', '📏': 'ruler', '📐': 'setSquare',
        '🧩': 'puzzle', '🧠': 'brain', '🎮': 'gamepad', '🕹': 'joystick', '👾': 'invader', '🤖': 'bot', '🎲': 'dice',
        '🃏': 'cards', '🎴': 'cardsFan', '🂡': 'cardAce', '🂠': 'cardBack', '♟': 'chessPawn', '♠': 'spade', '🏰': 'castle', '⚔': 'swords', '🗡': 'dagger',
        '💣': 'bomb', '💥': 'burst', '🧨': 'firecracker', '🎉': 'party', '🎁': 'gift', '🪙': 'coin', '💰': 'moneyBag', '🏦': 'bank',
        '🎰': 'slot', '💼': 'briefcase', '🧳': 'suitcase', '🎒': 'backpack', '📦': 'box', '🧰': 'toolbox', '🗄': 'cabinet',
        '🛠': 'tools', '🔧': 'wrench', '🔨': 'hammer', '🪛': 'screwdriver', '🪏': 'shovel', '🧹': 'broom', '🧽': 'sponge',
        '🧲': 'magnet', '✂': 'scissors', '🔌': 'plug', '🔋': 'battery', '🧯': 'extinguisher', '🌡': 'thermometer', '🔦': 'flashlight',
        '🔭': 'telescope', '🧪': 'flask', '⚗': 'alembic', '⚛': 'atom', '🧬': 'dna', '☢': ['radioactive', '#facc15'],
        '🏮': 'lantern', '🪔': 'oilLamp', '🕯': 'candle', '🖼': 'frame', '🪞': 'mirror', '🪟': 'window', '⛪': 'church', '🔲': 'grate',
        '🕳': 'hole', '🚪': 'door', '🛗': 'elevator', '🪧': 'sign', '⛩': 'torii', '🏗': 'crane', '🏙': 'city', '🏨': 'hotel',
        '🏛': 'landmark', '🛕': 'temple', '🛐': 'altar', '🛖': 'hut', '🗿': 'statue', '🏺': 'amphora', '⚱': 'urn', '⚰': 'coffin',
        '🫕': 'cauldron', '🍲': 'pot', '🍳': 'pan', '🍽': 'utensils', '🫙': 'jar', '🍾': 'bottle', '🧴': 'lotion', '🛢': 'barrel',
        '☕': 'coffee', '🥚': 'egg', '🍰': 'cake', '🍎': 'apple', '🍒': 'cherries', '🍋': 'lemon', '🍓': 'strawberry', '🍄': 'mushroom',
        '🌾': 'wheat', '🌱': 'sprout', '🪴': 'plant', '🌳': 'tree', '🌲': 'pine', '🌴': 'palm', '🏝': 'island', '🏖': 'umbrella',
        '⛱': 'umbrella', '🌻': 'sunflower', '🌷': 'tulip', '🪨': 'rock', '🪵': 'log', '🧊': 'ice', '❄': 'snowflake', '☀': 'sun',
        '🌙': 'moon', '🌦': 'cloudSunRain', '🌈': 'rainbow', '🌪': 'tornado', '🌊': 'waves', '💧': 'droplet', '🏔': 'mountain',
        '🌀': 'spiral', '🌌': 'galaxy', '☄': 'comet', '🪐': 'planet', '🛸': 'ufo', '💫': 'dizzy', '💤': 'zzz',
        // Animales
        '🐍': 'snake', '🦅': 'eagle', '🐦': 'bird', '🦜': 'parrot', '🦉': 'owl', '🐓': 'rooster', '🐢': 'turtle', '🐇': 'rabbit',
        '🦘': 'kangaroo', '🐱': 'cat', '🐈': 'cat', '🦊': 'fox', '🐼': 'panda', '🦁': 'lion', '🐸': 'frog', '🐙': 'octopus',
        '🦄': 'unicorn', '🐲': 'dragon', '🐖': 'pig', '🐄': 'cow', '🐂': 'bull', '🐟': 'fish', '🐚': 'shell', '🪲': 'beetle',
        '👻': 'ghost', '💀': 'skull', '☠': 'crossbones', '👹': 'demon', '🤡': 'clown', '🎃': 'pumpkin', '🧸': 'teddy', '🪆': 'doll',
        // Personas y caras
        '🕵': 'detective', '🥷': 'ninja', '💂': 'guard', '🧑‍✈': 'pilot', '🧑‍🚀': 'astronaut', '👨‍🌾': 'farmer', '🧑‍🦳': 'elder',
        '🧔': 'bearded', '🕴': 'suit', '🎩': 'topHat', '👩‍⚕': 'doctor', '🧘': 'meditate', '🎓': 'graduate',
        '😇': 'faceHalo', '🤥': 'faceLiar', '😵': 'faceDizzy', '😐': 'faceNeutral', '😅': 'faceSweat', '😱': 'faceScream',
        '🎭': 'masks', '🔮': 'crystalBall',
        // Transporte, ropa, deporte
        '🚢': 'ship', '⚓': 'anchor', '🛟': 'lifebuoy', '🚆': 'train', '🚂': 'locomotive', '🚃': 'tram', '🚜': 'tractor',
        '👕': 'shirt', '🧥': 'coat', '💍': 'ring', '🧶': 'yarn', '🎻': 'violin', '⚽': 'football', '🏓': 'pingPong', '🎱': 'eightBall', '🎡': 'rosco',
        '🧱': 'bricks', '🫀': 'user',
        // Colores
        '🟩': ['sq', '#22c55e'], '🟨': ['sq', '#eab308'], '🟧': ['sq', '#f97316'], '🟦': ['sq', '#3b82f6'], '🟥': ['sq', '#ef4444'],
        '🟪': ['sq', '#a855f7'], '🟫': ['sq', '#a16207'], '⬛': ['sq', '#3f3f46'],
        '🟢': ['dot', GREEN], '🟡': ['dot', '#eab308'], '🔴': ['dot', RED], '🟠': ['dot', ORANGE],
        '⚪': ['dotOutline', '#f1f5f9'], '⚫': ['dotOutline', '#0f172a'], '🔘': 'radioBtn',
        '🥇': ['medal1', GOLD], '🥈': ['medal2', '#cbd5e1'], '🥉': ['medal3', '#d97706'],
        '🇪🇸': ['flagEs', '#f59e0b'], '◆': ['nexus', GOLD]
    };
    // Símbolos tipográficos que sólo se convierten si vienen en presentación emoji (con U+FE0F):
    // el ♟ de las piezas del tablero se queda como glifo; el ♟️ del menú se vuelve icono.
    const TEXT_DEFAULT = new Set(['♟', '♠']);

    /* ─────────── Logotipos de juego (cada juego, su icono propio) ─────────── */
    const LOGOS = {
        minesweeper: 'bomb', wordle: 'wordle', pasapalabra: 'rosco', tetris: 'blocks', pacman: 'pacman', snake: 'snake',
        escape: 'oldKey', sudoku: 'sudoku', crossword: 'crossword', wordsearch: 'wordsearch', connections: 'connections',
        g2048: 'grid2048', solitaire: 'cardAce', pong: 'pingPong', chess: 'chessKnight', battleship: 'ship', billiards: 'eightBall',
        brisca: 'copa', guinote: 'cards', chinchon: 'cardsFan', poker: 'spade', mentiroso: 'faceLiar'
    };
    // Cada icono recibe un carácter de uso privado (U+E100…) que viaja por el código como si fuera un emoji
    const TOKENS = {}, TOKEN_OF = {};
    let tokSeq = 0xE100;
    function token(name) {
        if (!GLYPHS[name]) return '';
        if (!TOKEN_OF[name]) { const ch = String.fromCharCode(tokSeq++); TOKEN_OF[name] = ch; TOKENS[ch] = [name, null]; }
        return TOKEN_OF[name];
    }
    /** Logotipo de un juego, como carácter que el sistema de iconos convierte (sirve donde antes iba su emoji). */
    const logo = (gameId, fallback = '🎮') => LOGOS[gameId] ? token(LOGOS[gameId]) : fallback;

    /* ───────────────────────── Detección ───────────────────────── */
    const CORE = '[\\uE100-\\uE1FF\\u{1F000}-\\u{1FAFF}\\u2600-\\u27BF\\u2B00-\\u2BFF\\u2300-\\u23FF\\u2190-\\u21FF\\u25A0-\\u25FF\\u2139\\u3030\\u303D]';
    const SEQ = `(?:[\\u{1F1E6}-\\u{1F1FF}]{2}|${CORE}\\uFE0F?[\\u{1F3FB}-\\u{1F3FF}]?(?:\\u200D${CORE}\\uFE0F?)*)`;
    const RE_G = new RegExp(SEQ, 'gu');
    const RE_ANY = new RegExp(SEQ, 'u');
    const lookCache = new Map();

    /** Devuelve [icono, tono] para una secuencia emoji, o null si no se convierte. */
    function lookup(seq) {
        if (TOKENS[seq]) return TOKENS[seq];
        if (lookCache.has(seq)) return lookCache.get(seq);
        const hasVS = seq.includes('️');
        const norm = seq.replace(/[️\u{1F3FB}-\u{1F3FF}]/gu, '');
        let v = EMOJI[norm];
        if (v === undefined && norm.includes('‍')) v = EMOJI[norm.split('‍')[0]];
        if (v !== undefined && TEXT_DEFAULT.has(norm) && !hasVS) v = undefined;
        const out = v === undefined ? null : (Array.isArray(v) ? v : [v, null]);
        lookCache.set(seq, out);
        return out;
    }
    const has = (s) => typeof s === 'string' && RE_ANY.test(s) && [...s.matchAll(RE_G)].some(m => lookup(m[0]));

    /* ───────────────────────── SVG ───────────────────────── */
    const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    let sprite = null;
    const inSprite = new Set();
    function ensureSymbol(name) {
        if (inSprite.has(name)) return;
        if (!sprite) {
            sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            sprite.setAttribute('aria-hidden', 'true');
            sprite.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
            sprite.id = 'nx-icon-sprite';
            (document.body || document.documentElement).appendChild(sprite);
        }
        sprite.insertAdjacentHTML('beforeend', `<symbol id="nxi-${name}" viewBox="0 0 24 24">${GLYPHS[name] || ''}</symbol>`);
        inSprite.add(name);
    }

    /** <svg> en línea con el icono (para plantillas nuevas). */
    function svg(name, { size, cls = '', title = '', color = '' } = {}) {
        const dim = size ? ` width="${size}" height="${size}"` : '';
        const st = color ? ` style="color:${color}"` : '';
        const a11y = title ? `role="img" aria-label="${title.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
        return `<svg class="nx-ic ${cls}"${dim}${st} ${SVG_ATTR} ${a11y} focusable="false">${GLYPHS[name] || ''}</svg>`;
    }

    /** Elemento <nx-ic> que sustituye a un emoji dentro del DOM. */
    function makeNode(seq, hit) {
        const [name, tone] = hit;
        ensureSymbol(name);
        const el = document.createElement('nx-ic');
        el.setAttribute('data-i', name);
        if (tone) el.style.setProperty('--nx-tone', tone);
        el.innerHTML = `<svg ${SVG_ATTR} aria-hidden="true" focusable="false"><use href="#nxi-${name}" width="24" height="24"/></svg><nx-src>${seq}</nx-src>`;
        return el;
    }

    /** HTML con los emojis convertidos (el texto de entrada debe estar ya escapado). */
    function html(str) {
        if (!has(str)) return str;
        return String(str).replace(RE_G, (m) => {
            const hit = lookup(m);
            if (!hit) return m;
            const [name, tone] = hit;
            return `<nx-ic data-i="${name}"${tone ? ` style="--nx-tone:${tone}"` : ''}><svg ${SVG_ATTR} aria-hidden="true" focusable="false">${GLYPHS[name]}</svg><nx-src>${m}</nx-src></nx-ic>`;
        });
    }

    /** Texto sin emojis convertibles (para title, aria-label, <option>, document.title…). */
    function strip(str) {
        if (!has(str)) return str;
        return String(str).replace(new RegExp(SEQ + '\\s*', 'gu'), (m) => lookup(m.trim()) ? '' : m).replace(/\s{2,}/g, ' ').trim();
    }

    /* ─────────────────────── Conversión del DOM ─────────────────────── */
    const SKIP = 'script,style,textarea,input,nx-ic,[contenteditable=""],[contenteditable="true"],[data-raw-emoji]';
    const STRIP_PARENTS = new Set(['OPTION', 'OPTGROUP', 'TITLE', 'text', 'tspan', 'textPath']);
    const ATTRS = ['title', 'aria-label', 'placeholder', 'data-tooltip', 'alt', 'data-title', 'data-label'];

    function convertText(node) {
        const v = node.nodeValue;
        if (!v || !RE_ANY.test(v)) return;
        const p = node.parentNode;
        if (!p || p.nodeType !== 1) return;
        if (p.closest && p.closest(SKIP)) return;
        if (STRIP_PARENTS.has(p.nodeName) || p.namespaceURI === 'http://www.w3.org/2000/svg') {
            const s = strip(v); if (s !== v) node.nodeValue = s;
            return;
        }
        RE_G.lastIndex = 0;
        let m, last = 0, frag = null;
        while ((m = RE_G.exec(v))) {
            const hit = lookup(m[0]);
            if (!hit) continue;
            frag = frag || document.createDocumentFragment();
            if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
            frag.appendChild(makeNode(m[0], hit));
            last = m.index + m[0].length;
        }
        if (!frag) return;
        if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
        p.replaceChild(frag, node);
    }

    function convertAttrs(el) {
        for (const a of ATTRS) {
            const v = el.getAttribute(a);
            if (v && RE_ANY.test(v)) { const s = strip(v); if (s !== v) el.setAttribute(a, s); }
        }
    }

    function scan(root) {
        if (!root) return;
        if (root.nodeType === 3) { convertText(root); return; }
        if (root.nodeType !== 1 && root.nodeType !== 11) return;
        if (root.nodeType === 1) {
            if (root.nodeName === 'NX-IC' || root === sprite) return;
            convertAttrs(root);
            root.querySelectorAll('[title],[aria-label],[placeholder],[data-tooltip],[alt],[data-title],[data-label]').forEach(convertAttrs);
        }
        // Atajo: si no hay emojis en el texto del subárbol no hace falta recorrerlo
        if (!RE_ANY.test(root.textContent || '')) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const list = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) if (RE_ANY.test(n.nodeValue)) list.push(n);
        list.forEach(convertText);
    }

    let observer = null;
    function start() {
        if (observer || typeof MutationObserver === 'undefined') return;
        scan(document.body);
        observer = new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.type === 'childList') m.addedNodes.forEach(scan);
                else if (m.type === 'characterData') convertText(m.target);
                else if (m.type === 'attributes') convertAttrs(m.target);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }

    /* ───────────────────────── Canvas ───────────────────────── */
    const imgCache = new Map();
    function image(name, color) {
        const k = name + '|' + color;
        let img = imgCache.get(k);
        if (!img) {
            img = new Image();
            const src = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" ${SVG_ATTR} style="color:${color}">${(GLYPHS[name] || '').replace(/currentColor/g, color)}</svg>`.replace('stroke="currentColor"', `stroke="${color}"`);
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
            imgCache.set(k, img);
        }
        return img;
    }
    const resolve = (e) => GLYPHS[e] ? [e, null] : lookup(e);

    /** Dibuja un icono centrado en (x, y). `e` puede ser un emoji o el nombre de un icono. */
    function draw(ctx, e, x, y, size, color) {
        const hit = resolve(e);
        if (!hit) return false;
        const img = image(hit[0], color || hit[1] || '#ffffff');
        if (img.complete && img.naturalWidth) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        return true;
    }

    /** fillText que convierte los emojis del texto en iconos (respeta textAlign y el trazo opcional). */
    function fillRich(ctx, text, x, y, { stroke = null, lineWidth = null, color = null } = {}) {
        text = String(text);
        const fill = color || (typeof ctx.fillStyle === 'string' ? ctx.fillStyle : '#ffffff');
        if (!has(text)) {
            if (stroke) { if (lineWidth) ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); }
            ctx.fillStyle = fill; ctx.fillText(text, x, y);
            return;
        }
        const size = parseFloat((ctx.font.match(/(\d+(?:\.\d+)?)px/) || [0, 16])[1]);
        const parts = []; let last = 0; RE_G.lastIndex = 0; let m;
        while ((m = RE_G.exec(text))) {
            const hit = lookup(m[0]); if (!hit) continue;
            if (m.index > last) parts.push({ t: text.slice(last, m.index) });
            parts.push({ i: hit }); last = m.index + m[0].length;
        }
        if (last < text.length) parts.push({ t: text.slice(last) });
        const icon = size * 1.05, gap = size * 0.1;
        const widths = parts.map(p => p.t !== undefined ? ctx.measureText(p.t).width : icon + gap);
        const total = widths.reduce((a, b) => a + b, 0);
        const align = ctx.textAlign;
        let cx = align === 'center' ? x - total / 2 : (align === 'right' || align === 'end') ? x - total : x;
        const base = ctx.textBaseline;
        const midY = base === 'middle' ? y : base === 'top' ? y + size / 2 : y - size * 0.35;
        ctx.save(); ctx.textAlign = 'left';
        parts.forEach((p, i) => {
            if (p.t !== undefined) {
                if (stroke) { if (lineWidth) ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.strokeText(p.t, cx, y); }
                ctx.fillStyle = fill; ctx.fillText(p.t, cx, y);
            } else {
                const img = image(p.i[0], p.i[1] || fill);
                if (img.complete && img.naturalWidth) ctx.drawImage(img, cx, midY - icon / 2, icon, icon);
            }
            cx += widths[i];
        });
        ctx.restore();
    }

    /** Precarga las imágenes de canvas de una lista de emojis/nombres (evita un primer fotograma vacío). */
    function preload(list, color) { (list || []).forEach(e => { const h = resolve(e); if (h) image(h[0], color || h[1] || '#ffffff'); }); }

    Nexus.ui = Nexus.ui || {};
    Nexus.ui.icons = { svg, html, strip, has, lookup, scan, start, draw, fillRich, preload, token, logo, GLYPHS, EMOJI, LOGOS };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
