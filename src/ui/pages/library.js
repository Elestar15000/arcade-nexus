/* ============================================================
   NEXUS ARCADE · ui/pages/library.js — Biblioteca de juegos
   Misma identidad que el acceso y el Inicio (índigo + Arcade
   Yellow, barras diagonales, fichas en degradado):
     · banner «Elige tu próxima partida» con buscador y contadores
     · pestañas por colección (Todos, Clásicos, Cartas…)
     · «Seguir jugando» con fichas de color y botón Jugar
     · «Todos los juegos»: filtros rápidos, orden (más populares,
       A–Z, por colección) y vista en cuadrícula o en lista
     · favoritos (estrella) y ficha de cada juego
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatDuration, timeAgo } = Nexus.util;
    const CO = () => Nexus.games.collections;
    const B = () => Nexus.ui.brand;
    /** Icono de línea: los de la librería general y, si no está, los de la marca (grid, arrow, chevronDown…). */
    const I = (name, size, cls = '', color = '') => Nexus.ui.icons.GLYPHS[name]
        ? Nexus.ui.icons.svg(name, { size, cls, color })
        : B().icon(name, size || 20, cls);

    const FILTERS = [
        { id: 'online', label: 'Online', icon: 'globe' },
        { id: 'daily', label: 'Reto diario', icon: 'calendar' },
        { id: 'new', label: 'Sin estrenar', icon: 'sparkles' },
        { id: 'fav', label: 'Favoritos', icon: 'starFill' }
    ];
    const SORTS = [{ id: 'played', label: 'Más populares' }, { id: 'az', label: 'A–Z' }, { id: 'col', label: 'Por colección' }];

    const isOnline = (g) => CO().isOnline(g);
    const isDaily = (g) => CO().isDaily(g);
    const collectionOf = (id) => CO().of(id);
    const prefs = () => CO().prefs();
    const savePrefs = () => { if (Nexus.services.users.data()) Nexus.services.users.saveData(); };
    const tileStyle = (g) => { const [a, b] = CO().tileColors(g); return `--ta:${a};--tb:${b}`; };

    /** Rombo de la marca en oscuro (para la etiqueta amarilla del banner). */
    const diamond = () => `<svg class="lb-diamond" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="rotate(45 50 50)"><rect x="17" y="17" width="66" height="66" rx="15" fill="currentColor"/><rect x="37" y="37" width="26" height="26" rx="6" fill="var(--primary)"/></g></svg>`;

    const favBtn = (g, on) => `<button type="button" class="lb-fav ${on ? 'on' : ''}" data-fav="${esc(g.id)}" aria-pressed="${on}"
        aria-label="${on ? 'Quitar de' : 'Añadir a'} favoritos" title="${on ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${I(on ? 'starFill' : 'star', 20)}</button>`;

    /** Tarjeta de «Todos los juegos» (cuadrícula o lista según la clase del contenedor). */
    function card(g, favs) {
        const gs = Nexus.services.progress.stats(g.id);
        const col = collectionOf(g.id);
        const fav = favs.includes(g.id);
        const pct = gs.played ? Math.round(gs.wins / gs.played * 100) : 0;
        const feats = [
            isOnline(g) ? `<span class="lb-feat">${I('globe', 14)}Online</span>` : '',
            isDaily(g) ? `<span class="lb-feat">${I('calendar', 14)}Diario</span>` : ''
        ].join('');
        return `
            <a class="game-card available lb-card" href="#/game/${esc(g.id)}" data-game="${esc(g.id)}" style="${tileStyle(g)};--col:${esc(col.color)}">
                <div class="lb-cover">
                    <span class="lb-cover-ic" aria-hidden="true">${esc(g.emoji)}</span>
                    ${gs.played ? '' : '<span class="lb-new">Nuevo</span>'}
                    <button type="button" class="lb-info" data-info="${esc(g.id)}" aria-label="Ficha de ${esc(g.name)}" title="Ver ficha">${I('info', 18)}</button>
                </div>
                <div class="lb-body">
                    <div class="lb-name"><h3>${esc(g.name)}</h3><span class="lb-col"><i aria-hidden="true"></i>${esc(col.name)}</span></div>
                    <p class="lb-tag">${esc(g.tagline || '')}</p>
                    ${feats ? `<div class="lb-feats">${feats}</div>` : ''}
                    <div class="lb-stats">
                        <span title="Partidas jugadas">${I('gamepad', 15)}<b>${formatNumber(gs.played)}</b></span>
                        ${gs.played ? `<span class="lb-wr" style="--p:${pct}%" title="Victorias: ${pct}%"><i></i>${pct}%</span>` : '<span class="lb-try">¡Pruébalo!</span>'}
                        <span title="Mejor marca">${I('trophy', 15)}<b>${gs.bestScore > 0 ? formatNumber(gs.bestScore) : '—'}</b></span>
                    </div>
                    <div class="lb-actions"><span class="lb-play">${I('play', 16)}Jugar</span>${favBtn(g, fav)}</div>
                </div>
            </a>`;
    }

    /** Ficha de «Seguir jugando»: portada de color con el nombre encima, Jugar y favorito. */
    function recentCard(g, favs, last) {
        const col = collectionOf(g.id);
        return `
            <a class="lb-rc" href="#/game/${esc(g.id)}" style="${tileStyle(g)};--col:${esc(col.color)}">
                <span class="lb-rc-cover">
                    <span class="lb-cover-ic" aria-hidden="true">${esc(g.emoji)}</span>
                    <span class="lb-rc-txt"><b>${esc(g.name)}</b><small>${esc(col.name)}${last ? ` · ${esc(timeAgo(last.at))}` : ''}</small></span>
                </span>
                <span class="lb-actions"><span class="lb-play">${I('play', 16)}Jugar</span>${favBtn(g, favs.includes(g.id))}</span>
            </a>`;
    }

    Nexus.ui.pages.library = {
        title: 'Biblioteca',

        render(root) {
            const all = Nexus.games.registry.available();
            const soon = Nexus.games.registry.comingSoon();
            const byId = new Map(all.map(g => [g.id, g]));
            const cols = CO().withGames();
            const P = prefs();
            let query = Nexus.ui.searchQuery || '', filter = '';
            let cat = cols.some(c => c.id === Nexus.ui.gotoCollection) ? Nexus.ui.gotoCollection : '';
            Nexus.ui.gotoCollection = null;
            let sort = SORTS.some(s => s.id === P.sort) ? P.sort : 'played';
            let view = P.view === 'list' ? 'list' : 'grid';
            const totals = Nexus.services.progress.totals();
            const nOnline = all.filter(isOnline).length, nDaily = all.filter(isDaily).length;
            const playTime = (Nexus.services.users.data() || { meta: {} }).meta.playTime || 0;

            root.innerHTML = `
                <div class="page-body lb">
                    <h1 class="sr-only">Biblioteca de juegos</h1>
                    <section class="lb-hero">
                        ${B().decor('hero')}
                        <div class="lb-hero-body">
                            <span class="lb-kicker">${diamond()}Biblioteca</span>
                            <h2 class="lb-title">Elige tu próxima <span class="y">partida</span></h2>
                            <p class="lb-sub">Descubre, juega y compite en nuestros minijuegos.</p>
                            <p class="lb-meta"><b>${all.length}</b> juegos · <b>${cols.length}</b> colecciones · <b>${nOnline}</b> con modo online · <b>${nDaily}</b> con reto diario</p>
                            <label class="lb-search">${I('search', 20)}
                                <input type="search" id="lib-search" placeholder="Buscar por nombre, tipo o colección…" aria-label="Buscar juego" autocomplete="off" value="${esc(query)}" /></label>
                        </div>
                        <div class="lb-hero-art" aria-hidden="true">${I('gamepad', null, 'lb-pad')}</div>
                        <div class="lb-stats-hero">
                            <div class="lb-kpi" style="--k:#A879FF">${I('play', 26)}<b>${formatNumber(totals.played)}</b><small>Partidas</small></div>
                            <div class="lb-kpi" style="--k:var(--primary)">${I('trophy', 26)}<b>${formatNumber(totals.wins)}</b><small>Victorias</small></div>
                            <div class="lb-kpi" style="--k:#4B8DFF">${I('clock', 26)}<b>${esc(formatDuration(playTime))}</b><small>Jugado</small></div>
                        </div>
                    </section>

                    <nav class="lb-tabs" aria-label="Colecciones">
                        <button type="button" class="lb-tab" data-cat="" aria-pressed="false"><span class="lb-tab-ic">${I('grid', 22)}</span>Todos<small>${all.length}</small></button>
                        ${cols.map(c => `<button type="button" class="lb-tab" data-cat="${esc(c.id)}" aria-pressed="false" style="--col:${esc(c.color)}">
                            <span class="lb-tab-ic" style="color:${esc(c.color)}" aria-hidden="true">${esc(c.emoji)}</span>${esc(c.name)}<small>${c.list.length}</small></button>`).join('')}
                    </nav>

                    <section class="lb-panel" id="lib-recent" hidden></section>

                    <section class="lb-all">
                        <header class="lb-head">
                            <h2><span class="lb-head-ic" aria-hidden="true">${I('starFill', 26)}</span><span id="lib-title">Todos los juegos</span><small id="lib-count"></small></h2>
                            <div class="lb-tools">
                                <label class="lb-select"><span class="sr-only">Ordenar</span>
                                    <select id="lib-sort">${SORTS.map(s => `<option value="${s.id}"${s.id === sort ? ' selected' : ''}>${s.label}</option>`).join('')}</select>${I('chevronDown', 16)}</label>
                                <div class="lb-view" role="group" aria-label="Vista">
                                    <button type="button" data-view="grid" aria-label="Cuadrícula" title="Cuadrícula">${I('grid', 18)}</button>
                                    <button type="button" data-view="list" aria-label="Lista" title="Lista">${I('menu', 18)}</button>
                                </div>
                            </div>
                        </header>
                        <div class="lb-filters" role="group" aria-label="Filtros">
                            ${FILTERS.map(f => `<button type="button" class="lb-chip" data-filter="${f.id}" aria-pressed="false">${I(f.icon, 16)}${f.label}</button>`).join('')}
                        </div>
                        <div id="lib-content"></div>
                        <div class="lb-empty" id="lib-empty" hidden>${I('search', 44)}<p>Ningún juego coincide con tu búsqueda.</p><button type="button" class="btn btn-ghost" id="lib-reset">Ver todos los juegos</button></div>
                    </section>
                </div>`;

            const content = $('#lib-content', root), empty = $('#lib-empty', root);

            const drawRecent = () => {
                const hist = Nexus.services.progress.history(60), seen = [];
                for (const h of hist) { if (!seen.includes(h.game) && byId.has(h.game)) seen.push(h.game); if (seen.length >= 8) break; }
                const box = $('#lib-recent', root);
                box.hidden = !seen.length || !!query || !!filter || !!cat;
                if (box.hidden) { box.innerHTML = ''; return; }
                box.innerHTML = `
                    <header class="lb-head">
                        <h2><span class="lb-head-ic" aria-hidden="true">${I('playPause', 28)}</span><span>Seguir jugando<small class="lb-head-sub">Continúa donde lo dejaste</small></span></h2>
                        <a class="lb-more" href="#/stats">Ver todo ${I('arrow', 16)}</a>
                    </header>
                    <div class="lb-track">${seen.map(id => recentCard(byId.get(id), prefs().favs, hist.find(h => h.game === id))).join('')}</div>`;
            };

            const match = (g) => {
                const col = collectionOf(g.id);
                if (cat && col.id !== cat) return false;
                if (filter === 'online' && !isOnline(g)) return false;
                if (filter === 'daily' && !isDaily(g)) return false;
                if (filter === 'new' && Nexus.services.progress.stats(g.id).played) return false;
                if (filter === 'fav' && !prefs().favs.includes(g.id)) return false;
                if (!query) return true;
                const up = (s) => Nexus.games.seed ? Nexus.games.seed.up(s) : String(s).toUpperCase();
                return up([g.name, g.tagline, g.description, g.tags.join(' '), col.name].join(' ')).includes(up(query));
            };

            const grid = (list) => `<div class="lb-grid${view === 'list' ? ' is-list' : ''}">${list.map(g => card(g, prefs().favs)).join('')}</div>`;
            const section = (c, list) => `
                <section class="lb-sec" id="col-${c.id}" style="--col:${c.color}">
                    <div class="lb-sec-head"><span class="lb-sec-ic" aria-hidden="true">${c.icon || esc(c.emoji)}</span>
                        <div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p></div><span class="lb-sec-n">${list.length}</span></div>
                    ${grid(list)}
                </section>`;
            const played = (g) => Nexus.services.progress.stats(g.id).played;

            const draw = () => {
                const favs = prefs().favs;
                let html = '', count = 0;
                const list = all.filter(match);
                count = list.length;
                if (sort === 'col' && !cat) {
                    const favList = favs.map(id => byId.get(id)).filter(g => g && match(g));
                    if (favList.length && filter !== 'fav') html += section({ id: 'favoritos', name: 'Tus favoritos', icon: I('starFill', 24), color: '#FFD43B', desc: 'Los que has marcado con la estrella.' }, favList);
                    for (const c of cols) { const l = c.list.filter(match); if (l.length) html += section(c, l); }
                } else if (list.length) {
                    list.sort(sort === 'az'
                        ? (a, b) => a.name.localeCompare(b.name, 'es')
                        : (a, b) => played(b) - played(a) || a.name.localeCompare(b.name, 'es'));
                    html += grid(list);
                }
                const soonList = soon.filter(g => !cat && (!query || (g.name + ' ' + g.tags.join(' ')).toLowerCase().includes(query.toLowerCase())));
                if (soonList.length && !filter) html += `<section class="lb-sec soon"><div class="lb-sec-head"><span class="lb-sec-ic">${I('lock', 22)}</span><div><h3>Próximamente</h3><p>En camino</p></div></div>
                    <div class="games-grid lb-grid">${soonList.map(Nexus.ui.components.comingSoonCard).join('')}</div></section>`;
                content.innerHTML = html;
                empty.hidden = count + (filter ? 0 : soonList.length) > 0;
                const c = cols.find(x => x.id === cat);
                $('#lib-title', root).textContent = c ? c.name : (filter === 'fav' ? 'Tus favoritos' : 'Todos los juegos');
                $('#lib-count', root).textContent = `${count} juego${count === 1 ? '' : 's'}`;
                $$('[data-cat]', root).forEach(b => { const on = b.dataset.cat === cat; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
                $$('[data-filter]', root).forEach(b => { const on = b.dataset.filter === filter; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
                $$('[data-view]', root).forEach(b => { const on = b.dataset.view === view; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
                drawRecent();
            };

            // ── Eventos ──
            $('#lib-search', root).addEventListener('input', (e) => { query = e.target.value.trim(); draw(); });
            const onSearch = (q) => { if (!root.isConnected) return; query = q || ''; $('#lib-search', root).value = query; draw(); };
            Nexus.bus.on('search:change', onSearch);
            $$('[data-cat]', root).forEach(b => b.addEventListener('click', () => {
                cat = b.dataset.cat; Nexus.audio.play('click'); draw();
                if (cat) $('.lb-all', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
            }));
            $$('[data-filter]', root).forEach(b => b.addEventListener('click', () => {
                filter = filter === b.dataset.filter ? '' : b.dataset.filter;
                Nexus.audio.play('click'); draw();
            }));
            $('#lib-sort', root).addEventListener('change', (e) => { sort = e.target.value; prefs().sort = sort; savePrefs(); draw(); });
            $$('[data-view]', root).forEach(b => b.addEventListener('click', () => {
                view = b.dataset.view; prefs().view = view; savePrefs(); Nexus.audio.play('click'); draw();
            }));
            $('#lib-reset', root).addEventListener('click', () => {
                filter = ''; query = ''; cat = ''; $('#lib-search', root).value = ''; draw();
            });
            // Ficha y favoritos: botones dentro del enlace de la tarjeta
            root.addEventListener('click', (e) => {
                const i = e.target.closest('[data-info]');
                if (i) { e.preventDefault(); e.stopPropagation(); Nexus.ui.router.navigate('info/' + i.dataset.info); return; }
                const f = e.target.closest('[data-fav]'); if (!f) return;
                e.preventDefault(); e.stopPropagation();
                const id = f.dataset.fav, on = CO().toggleFav(id);
                Nexus.audio.play(on ? 'orbCollect' : 'click');
                Nexus.ui.toast(on ? `${byId.get(id).name} añadido a favoritos` : `${byId.get(id).name} quitado de favoritos`, { icon: '★' });
                draw();
            });
            $$('[data-soon]', root).forEach(c => c.addEventListener('click', () => Nexus.ui.toast('Este juego estará disponible próximamente', { icon: '🔒' })));
            draw();
            return () => { Nexus.bus.off && Nexus.bus.off('search:change', onSearch); };
        }
    };
})();
