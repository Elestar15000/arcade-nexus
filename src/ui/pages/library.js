/* ============================================================
   NEXUS ARCADE · ui/pages/library.js — Biblioteca de juegos
   Juegos organizados por colecciones (Clásicos, Cartas, Retos
   mentales, Tablero y estrategia), con:
     · cabecera con buscador y accesos a cada colección
     · «Seguir jugando» con los últimos juegos usados
     · favoritos (★) que forman su propia colección
     · filtros rápidos (online, reto diario, sin estrenar)
     · orden por colecciones, A–Z o más jugados
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatDuration } = Nexus.util;

    /** Colecciones de la biblioteca. Un juego que no esté en ninguna cae en «Otros». */
    const COLLECTIONS = [
        { id: 'clasicos', name: 'Clásicos', emoji: '🕹️', color: '#f97316', desc: 'Los arcades de toda la vida, con un toque moderno.',
            games: ['tetris', 'pacman', 'snake', 'minesweeper', 'pong', 'g2048'] },
        { id: 'cartas', name: 'Cartas', emoji: '🃏', color: '#ef4444', desc: 'Baraja española contra la máquina o con amigos online.',
            games: ['guinote', 'brisca', 'chinchon'] },
        { id: 'mentales', name: 'Retos mentales', emoji: '🧠', color: '#a855f7', desc: 'Palabras, lógica y acertijos. Muchos con reto diario.',
            games: ['wordle', 'pasapalabra', 'crossword', 'wordsearch', 'connections', 'sudoku', 'escape'] },
        { id: 'estrategia', name: 'Tablero y estrategia', emoji: '♟️', color: '#38bdf8', desc: 'Piensa cada movimiento: contra la IA o contra otra persona.',
            games: ['chess', 'battleship'] }
    ];
    const OTHER = { id: 'otros', name: 'Otros', emoji: '✨', color: '#94a3b8', desc: 'Más juegos de la colección.', games: [] };
    const FILTERS = [
        { id: '', label: 'Todos', icon: '🎮' },
        { id: 'online', label: 'Online', icon: '🌐' },
        { id: 'daily', label: 'Reto diario', icon: '📅' },
        { id: 'new', label: 'Sin estrenar', icon: '✨' },
        { id: 'fav', label: 'Favoritos', icon: '★' }
    ];
    const SORTS = [{ id: 'col', label: 'Por colecciones' }, { id: 'az', label: 'A–Z' }, { id: 'played', label: 'Más jugados' }];

    const isOnline = (g) => g.modes.some(m => m.id === 'online');
    const isDaily = (g) => g.modes.some(m => /diari|daily|phrase/.test(m.id));
    const collectionOf = (id) => COLLECTIONS.find(c => c.games.includes(id)) || OTHER;

    // Preferencias de la biblioteca (favoritos, orden) dentro de los datos del usuario
    const prefs = () => {
        const d = Nexus.services.users.data();
        if (!d) return { favs: [], sort: 'col' };
        if (!d.saves.library) d.saves.library = { favs: [], sort: 'col' };
        return d.saves.library;
    };
    const savePrefs = () => { if (Nexus.services.users.data()) Nexus.services.users.saveData(); };

    /** Tarjeta de juego de la biblioteca. */
    function card(g, favs, compact) {
        const gs = Nexus.services.progress.stats(g.id);
        const col = collectionOf(g.id);
        const fav = favs.includes(g.id);
        const pct = gs.played ? Math.round(gs.wins / gs.played * 100) : 0;
        const feats = [isOnline(g) ? '<span class="lc-feat" title="Multijugador online">🌐 Online</span>' : '', isDaily(g) ? '<span class="lc-feat" title="Tiene reto diario">📅 Diario</span>' : ''].join('');
        return `
            <a class="game-card available lib-card${compact ? ' compact' : ''}" href="#/game/${esc(g.id)}" data-game="${esc(g.id)}" style="--game-accent:${esc(g.accent || col.color)}">
                <div class="lc-visual">
                    <span class="lc-pattern" aria-hidden="true">${esc(g.emoji + ' ').repeat(18)}</span>
                    <span class="lc-emoji">${esc(g.emoji)}</span>
                    ${gs.played ? '' : '<span class="lc-new">NUEVO</span>'}
                    <button type="button" class="lc-fav ${fav ? 'on' : ''}" data-fav="${esc(g.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de' : 'Añadir a'} favoritos" title="${fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${fav ? '★' : '☆'}</button>
                </div>
                <div class="lc-body">
                    <div class="lc-top"><h3>${esc(g.name)}</h3><span class="lc-col" title="${esc(col.name)}">${esc(col.emoji)}</span></div>
                    <p class="lc-tag">${esc(g.tagline || '')}</p>
                    ${compact ? '' : `<div class="lc-feats">${feats}${g.tags.filter(t => t !== 'Multijugador').slice(0, 2).map(t => `<span class="lc-chip">${esc(t)}</span>`).join('')}</div>`}
                    <div class="lc-stats">
                        <span><b>${formatNumber(gs.played)}</b> partidas</span>
                        ${gs.played ? `<span class="lc-wr" style="--p:${pct}%" title="Victorias: ${pct}%"><i></i>${pct}%</span>` : '<span class="lc-wr empty">¡Pruébalo!</span>'}
                        <span>🏆 <b>${gs.bestScore > 0 ? formatNumber(gs.bestScore) : '—'}</b></span>
                    </div>
                </div>
                <span class="lc-play" aria-hidden="true">▶ Jugar</span>
            </a>`;
    }

    Nexus.ui.pages.library = {
        title: 'Biblioteca',

        render(root) {
            const all = Nexus.games.registry.available();
            const soon = Nexus.games.registry.comingSoon();
            const byId = new Map(all.map(g => [g.id, g]));
            const cols = COLLECTIONS.concat([OTHER]).map(c => Object.assign({}, c, {
                list: c === OTHER ? all.filter(g => collectionOf(g.id) === OTHER) : c.games.map(id => byId.get(id)).filter(Boolean)
            })).filter(c => c.list.length);
            const P = prefs();
            let query = '', filter = '', sort = SORTS.some(s => s.id === P.sort) ? P.sort : 'col';
            const totals = Nexus.services.progress.totals();
            const nOnline = all.filter(isOnline).length, nDaily = all.filter(isDaily).length;

            root.innerHTML = `
                <div class="page-body lib">
                    <section class="lib-hero">
                        <div class="lib-hero-text">
                            <span class="lib-kicker">🎮 Biblioteca</span>
                            <h2 class="lib-title">Elige tu próxima partida</h2>
                            <p class="lib-sub"><b>${all.length}</b> juegos · <b>${cols.length}</b> colecciones · <b>${nOnline}</b> con modo online · <b>${nDaily}</b> con reto diario</p>
                            <label class="search lib-search"><span aria-hidden="true">🔎</span>
                                <input type="search" id="lib-search" placeholder="Buscar por nombre, tipo o colección…" aria-label="Buscar juego" autocomplete="off" /></label>
                        </div>
                        <div class="lib-hero-stats">
                            <div><b>${formatNumber(totals.played)}</b><small>partidas</small></div>
                            <div><b>${formatNumber(totals.wins)}</b><small>victorias</small></div>
                            <div><b>${esc(formatDuration((Nexus.services.users.data() || { meta: {} }).meta.playTime || 0))}</b><small>jugado</small></div>
                        </div>
                    </section>

                    <nav class="lib-cols" aria-label="Colecciones">
                        ${cols.map(c => `<button type="button" class="lib-col-btn" data-goto="${c.id}" style="--col:${c.color}">
                            <span class="lib-col-emo">${c.emoji}</span><span class="lib-col-txt"><b>${esc(c.name)}</b><small>${c.list.length} juego${c.list.length === 1 ? '' : 's'}</small></span>
                            <span class="lib-col-peek" aria-hidden="true">${c.list.slice(0, 4).map(g => esc(g.emoji)).join('')}</span></button>`).join('')}
                    </nav>

                    <section class="lib-recent" id="lib-recent" hidden></section>

                    <div class="lib-bar">
                        <div class="lib-filters" role="group" aria-label="Filtros">
                            ${FILTERS.map(f => `<button type="button" class="chip-btn${f.id === filter ? ' active' : ''}" data-filter="${f.id}">${f.icon} ${f.label}</button>`).join('')}
                        </div>
                        <div class="segmented lib-sort" role="radiogroup" aria-label="Ordenar">
                            ${SORTS.map(s => `<button type="button" class="${s.id === sort ? 'active' : ''}" data-sort="${s.id}">${s.label}</button>`).join('')}
                        </div>
                    </div>

                    <div id="lib-content"></div>
                    <div class="lib-empty" id="lib-empty" hidden><span>🕵️</span><p>Ningún juego coincide con tu búsqueda.</p><button type="button" class="btn btn-ghost" id="lib-reset">Ver todos</button></div>
                </div>`;

            const content = $('#lib-content', root), empty = $('#lib-empty', root);

            const drawRecent = () => {
                const seen = [];
                for (const h of Nexus.services.progress.history(40)) { if (!seen.includes(h.game) && byId.has(h.game)) seen.push(h.game); if (seen.length >= 4) break; }
                const box = $('#lib-recent', root);
                box.hidden = !seen.length || !!query || !!filter;
                if (box.hidden) { box.innerHTML = ''; return; }
                box.innerHTML = `<div class="lib-sec-head"><span class="lib-sec-emo" style="--col:var(--primary)">⏯️</span><div><h3>Seguir jugando</h3><p>Tus últimos juegos</p></div></div>
                    <div class="lib-row">${seen.map(id => card(byId.get(id), prefs().favs, true)).join('')}</div>`;
            };

            const match = (g) => {
                const col = collectionOf(g.id);
                if (filter === 'online' && !isOnline(g)) return false;
                if (filter === 'daily' && !isDaily(g)) return false;
                if (filter === 'new' && Nexus.services.progress.stats(g.id).played) return false;
                if (filter === 'fav' && !prefs().favs.includes(g.id)) return false;
                if (!query) return true;
                const hay = Nexus.games.seed ? Nexus.games.seed.up([g.name, g.tagline, g.description, g.tags.join(' '), col.name].join(' ')) : (g.name + ' ' + g.tags.join(' ')).toUpperCase();
                const q = Nexus.games.seed ? Nexus.games.seed.up(query) : query.toUpperCase();
                return hay.includes(q);
            };

            const section = (c, list) => `
                <section class="lib-sec" id="col-${c.id}" style="--col:${c.color}">
                    <div class="lib-sec-head"><span class="lib-sec-emo">${c.emoji}</span><div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p></div><span class="lib-sec-n">${list.length}</span></div>
                    <div class="games-grid lib-grid">${list.map(g => card(g, prefs().favs)).join('')}</div>
                </section>`;

            const draw = () => {
                const favs = prefs().favs;
                let html = '', count = 0;
                if (sort === 'col') {
                    const favList = favs.map(id => byId.get(id)).filter(g => g && match(g));
                    if (favList.length && filter !== 'fav') html += section({ id: 'favoritos', name: 'Tus favoritos', emoji: '★', color: '#facc15', desc: 'Los que has marcado con la estrella.' }, favList);
                    for (const c of cols) {
                        const list = c.list.filter(match);
                        count += list.length;
                        if (list.length) html += section(c, list);
                    }
                } else {
                    const list = all.filter(match).sort(sort === 'az'
                        ? (a, b) => a.name.localeCompare(b.name, 'es')
                        : (a, b) => Nexus.services.progress.stats(b.id).played - Nexus.services.progress.stats(a.id).played || a.name.localeCompare(b.name, 'es'));
                    count = list.length;
                    if (list.length) html += `<div class="games-grid lib-grid">${list.map(g => card(g, favs)).join('')}</div>`;
                }
                const soonList = soon.filter(g => !query || (g.name + ' ' + g.tags.join(' ')).toLowerCase().includes(query.toLowerCase()));
                if (soonList.length && !filter) html += `<section class="lib-sec soon"><div class="lib-sec-head"><span class="lib-sec-emo">🔒</span><div><h3>Próximamente</h3><p>En camino</p></div></div>
                    <div class="games-grid lib-grid">${soonList.map(Nexus.ui.components.comingSoonCard).join('')}</div></section>`;
                content.innerHTML = html;
                empty.hidden = count + (filter ? 0 : soonList.length) > 0;
                $$('.lib-col-btn', root).forEach(b => b.classList.toggle('dim', sort === 'col' && !$(`#col-${b.dataset.goto}`, root)));
                drawRecent();
            };

            // Eventos
            $('#lib-search', root).addEventListener('input', (e) => { query = e.target.value.trim(); draw(); });
            $$('[data-filter]', root).forEach(b => b.addEventListener('click', () => {
                filter = b.dataset.filter;
                $$('[data-filter]', root).forEach(x => x.classList.toggle('active', x === b));
                Nexus.audio.play('click'); draw();
            }));
            $$('[data-sort]', root).forEach(b => b.addEventListener('click', () => {
                sort = b.dataset.sort; prefs().sort = sort; savePrefs();
                $$('[data-sort]', root).forEach(x => x.classList.toggle('active', x === b));
                Nexus.audio.play('click'); draw();
            }));
            $$('.lib-col-btn', root).forEach(b => b.addEventListener('click', () => {
                Nexus.audio.play('click');
                if (sort !== 'col' || filter || query) {
                    sort = 'col'; filter = ''; query = ''; $('#lib-search', root).value = '';
                    $$('[data-sort]', root).forEach(x => x.classList.toggle('active', x.dataset.sort === 'col'));
                    $$('[data-filter]', root).forEach(x => x.classList.toggle('active', x.dataset.filter === ''));
                    draw();
                }
                const sec = $(`#col-${b.dataset.goto}`, root);
                if (sec) { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); sec.classList.remove('pulse'); void sec.offsetWidth; sec.classList.add('pulse'); }
            }));
            $('#lib-reset', root).addEventListener('click', () => {
                filter = ''; query = ''; $('#lib-search', root).value = '';
                $$('[data-filter]', root).forEach(x => x.classList.toggle('active', x.dataset.filter === ''));
                draw();
            });
            // Favoritos: el botón está dentro del enlace de la tarjeta
            root.addEventListener('click', (e) => {
                const f = e.target.closest('[data-fav]'); if (!f) return;
                e.preventDefault(); e.stopPropagation();
                const p = prefs(), id = f.dataset.fav;
                p.favs = p.favs.includes(id) ? p.favs.filter(x => x !== id) : p.favs.concat([id]);
                savePrefs();
                Nexus.audio.play(p.favs.includes(id) ? 'orbCollect' : 'click');
                Nexus.ui.toast(p.favs.includes(id) ? `${byId.get(id).name} añadido a favoritos` : `${byId.get(id).name} quitado de favoritos`, { icon: '★' });
                draw();
            });
            $$('[data-soon]', root).forEach(c => c.addEventListener('click', () => Nexus.ui.toast('Este juego estará disponible próximamente', { icon: '🔒' })));
            draw();
        }
    };

    Nexus.games.collections = { list: COLLECTIONS, of: collectionOf, isOnline, isDaily };
})();