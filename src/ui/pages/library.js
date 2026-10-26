/* ============================================================
   NEXUS ARCADE · ui/pages/library.js — Biblioteca de juegos
   Búsqueda por texto + filtro por etiqueta.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$ } = Nexus.util;
    const C = Nexus.ui.components;

    Nexus.ui.pages.library = {
        title: 'Biblioteca',

        render(root) {
            const available = Nexus.games.registry.available();
            const soon = Nexus.games.registry.comingSoon();
            const tags = Array.from(new Set(available.concat(soon).flatMap(g => g.tags))).sort();
            let query = '', tag = '';

            root.innerHTML = `
                <div class="page-body">
                    <div class="page-head">
                        <div><h2 class="page-title">Biblioteca de juegos</h2>
                            <p class="page-sub">${available.length} disponibles · ${soon.length} en camino</p></div>
                        <label class="search"><span aria-hidden="true">🔎</span>
                            <input type="search" id="lib-search" placeholder="Buscar juego…" aria-label="Buscar juego" /></label>
                    </div>
                    <div class="chips" role="group" aria-label="Filtrar por etiqueta">
                        <button class="chip-btn active" data-tag="">Todos</button>
                        ${tags.map(t => `<button class="chip-btn" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
                    </div>
                    <div class="games-grid" id="lib-grid"></div>
                    <p class="muted center" id="lib-empty" hidden>Ningún juego coincide con tu búsqueda.</p>
                </div>`;

            const grid = $('#lib-grid', root), empty = $('#lib-empty', root);

            const draw = () => {
                const match = (g) => (!tag || g.tags.includes(tag)) &&
                    (!query || (g.name + ' ' + (g.tagline || '') + ' ' + g.tags.join(' ')).toLowerCase().includes(query));
                const a = available.filter(match), s = soon.filter(match);
                grid.innerHTML = a.map(C.gameCard).join('') + s.map(C.comingSoonCard).join('');
                empty.hidden = a.length + s.length > 0;
                $$('[data-soon]', grid).forEach(card => {
                    const notice = () => Nexus.ui.toast('Este juego estará disponible próximamente', { icon: '🔒' });
                    card.addEventListener('click', notice);
                    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); notice(); } });
                });
            };

            $('#lib-search', root).addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); draw(); });
            $$('.chip-btn', root).forEach(b => b.addEventListener('click', () => {
                $$('.chip-btn', root).forEach(x => x.classList.toggle('active', x === b));
                tag = b.dataset.tag; draw();
            }));
            draw();
        }
    };
})();
