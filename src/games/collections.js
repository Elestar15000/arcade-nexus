/* ============================================================
   NEXUS ARCADE · games/collections.js
   Colecciones del launcher (biblioteca, barra lateral, inicio y
   ficha de juego) y utilidades comunes: favoritos, juegos con
   modo online o con reto diario, y el estado de los retos de hoy.
   ============================================================ */
(function () {
    'use strict';

    const COLLECTIONS = [
        { id: 'clasicos', name: 'Clásicos', emoji: '🕹️', color: '#f97316', desc: 'Los arcades de toda la vida, con un toque moderno.',
            games: ['tetris', 'pacman', 'snake', 'minesweeper', 'pong', 'g2048'] },
        { id: 'cartas', name: 'Cartas', emoji: '🃏', color: '#ef4444', desc: 'Baraja española y francesa: contra la máquina, con amigos online o en solitario.',
            games: ['guinote', 'brisca', 'chinchon', 'poker', 'mentiroso', 'solitaire'] },
        { id: 'mentales', name: 'Retos mentales', emoji: '🧠', color: '#a855f7', desc: 'Palabras, lógica y acertijos. Muchos con reto diario.',
            games: ['wordle', 'pasapalabra', 'crossword', 'wordsearch', 'connections', 'sudoku', 'escape'] },
        { id: 'estrategia', name: 'Tablero y estrategia', emoji: '♟️', color: '#38bdf8', desc: 'Piensa cada movimiento: contra la IA o contra otra persona.',
            games: ['chess', 'battleship'] }
    ];
    const OTHER = { id: 'otros', name: 'Otros', emoji: '✨', color: '#94a3b8', desc: 'Más juegos de la colección.', games: [] };

    const isOnline = (g) => g.modes.some(m => m.id === 'online');
    const isDaily = (g) => g.modes.some(m => /diari|daily|phrase/.test(m.id));
    const of = (id) => COLLECTIONS.find(c => c.games.includes(id)) || OTHER;

    /** Colecciones con sus juegos ya registrados (y «Otros» si hace falta). */
    function withGames() {
        const all = Nexus.games.registry.available();
        const byId = new Map(all.map(g => [g.id, g]));
        return COLLECTIONS.concat([OTHER]).map(c => Object.assign({}, c, {
            list: c === OTHER ? all.filter(g => of(g.id) === OTHER) : c.games.map(id => byId.get(id)).filter(Boolean)
        })).filter(c => c.list.length);
    }

    // Favoritos (se guardan con los datos del usuario)
    const prefs = () => {
        const d = Nexus.services.users.data();
        if (!d) return { favs: [], sort: 'col' };
        if (!d.saves.library) d.saves.library = { favs: [], sort: 'col' };
        if (!Array.isArray(d.saves.library.favs)) d.saves.library.favs = [];
        return d.saves.library;
    };
    const favs = () => prefs().favs.slice();
    const isFav = (id) => prefs().favs.includes(id);
    function toggleFav(id) {
        const p = prefs();
        p.favs = p.favs.includes(id) ? p.favs.filter(x => x !== id) : p.favs.concat([id]);
        if (Nexus.services.users.data()) Nexus.services.users.saveData();
        Nexus.bus.emit('favs:change', { id, on: p.favs.includes(id) });
        return p.favs.includes(id);
    }

    /**
     * Retos de hoy: uno por juego con reto diario, con su estado.
     * → [{ id, game, name, emoji, accent, label, href, done, text }]
     */
    function dailies() {
        const d = Nexus.services.users.data(); if (!d) return [];
        const today = Nexus.util.dayKey();
        const R = Nexus.games.registry;
        const out = [];
        const push = (gid, o) => { const g = R.get(gid); if (g) out.push(Object.assign({ id: gid, game: g, name: g.name, emoji: g.emoji, accent: g.accent, href: `#/game/${gid}` }, o)); };
        const w = d.saves.wordle || {};
        if (R.get('wordle')) {
            const st = w.daily, done = !!(st && st.date === today && st.status !== 'playing');
            push('wordle', { id: 'wordle', label: 'Palabra del día', done, text: done ? 'Resuelta' : 'Una palabra de 5 letras, igual para todos.' });
            const ph = w.phrase, pdone = !!(ph && ph.date === today && ph.status !== 'playing');
            push('wordle', { id: 'wordle-frase', label: 'Frase del día', emoji: '🧩', href: '#/game/wordle/frase', done: pdone, text: pdone ? 'Completada' : 'Descubre la frase oculta en 6 intentos.' });
        }
        const pp = d.saves.pasapalabra && d.saves.pasapalabra.runs && d.saves.pasapalabra.runs.daily;
        if (R.get('pasapalabra')) { const done = !!(pp && pp.date === today && pp.status === 'over'); push('pasapalabra', { label: 'Rosco diario', done, text: done ? 'Jugado' : '25 definiciones; al final, tu marca de tiempo.' }); }
        if (R.get('escape')) { const e = d.saves.escape && d.saves.escape.daily && d.saves.escape.daily[today]; const done = !!(e && e.won); push('escape', { label: 'Sala diaria', done, text: done ? `Escapaste en ${Nexus.util.formatTime(e.time)}` : 'Una sala nueva cada día. ¿Escaparás?' }); }
        for (const [gid, label, text] of [['sudoku', 'Sudoku diario', 'El mismo sudoku para todos.'], ['crossword', 'Crucigrama diario', 'Definiciones del Pasapalabra.'],
            ['wordsearch', 'Sopa diaria', 'Tema y sopa iguales para todos.'], ['connections', 'Conexiones del día', '16 palabras, 4 grupos.'], ['g2048', '2048 diario', 'Mismas fichas, 150 movimientos.'], ['solitaire', 'Solitario diario', 'El mismo reparto para todos.']]) {
            if (!R.get(gid)) continue;
            const rec = d.saves[gid] && d.saves[gid].daily && d.saves[gid].daily[today];
            const done = !!(rec && rec.won);
            push(gid, { label, done, text: done ? (rec.label ? `Hecho · ${rec.label}` : 'Hecho') : text });
        }
        return out;
    }

    Nexus.games.collections = { list: COLLECTIONS, other: OTHER, of, withGames, isOnline, isDaily, prefs, favs, isFav, toggleFav, dailies };
})();
