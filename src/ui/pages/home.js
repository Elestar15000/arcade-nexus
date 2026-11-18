/* ============================================================
   NEXUS ARCADE · ui/pages/home.js — Inicio del launcher
   Diseño corporativo (índigo + Arcade Yellow, Outfit/Inter):
     · banner con carrusel: la marca (rombo 3D y «Explorar
       juegos»), el reto de hoy y tu último juego
     · «Tu progreso»: nivel con barra de XP y 4 contadores
     · Juegos destacados (fichas de colores), retos de hoy,
       seguir jugando, categorías, logros y actividad
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, timeAgo } = Nexus.util;
    const C = Nexus.ui.components;
    const CO = () => Nexus.games.collections;
    const R = () => Nexus.games.registry;
    const B = () => Nexus.ui.brand;

    /** Juegos destacados (el color de cada ficha sale de games/collections.js: tileColors). */
    const FEATURED = ['chess', 'solitaire', 'snake', 'minesweeper', 'g2048', 'tetris', 'poker', 'wordle', 'pacman', 'battleship', 'sudoku', 'pong'];
    /** Color de cada categoría (secundarios de la marca). */
    const CAT = { clasicos: ['#FF914D', '🕹️'], cartas: ['#FF6584', '🃏'], mentales: ['#A879FF', '🧩'], estrategia: ['#4B8DFF', '♟️'] };

    function greeting() {
        const h = new Date().getHours();
        return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
    }

    /** Ficha de juego de colores (como en el diseño): icono grande sobre degradado y nombre. */
    function tile(g, i, sub) {
        const [a, b] = CO().tileColors(g);
        return `<a class="nh-tile" href="#/game/${esc(g.id)}" style="--ta:${a};--tb:${b}" title="${esc(g.name)} · ${esc(g.tagline || '')}">
            <span class="nh-tile-spot" aria-hidden="true"></span>
            <span class="nh-tile-ic" aria-hidden="true">${esc(g.emoji)}</span>
            <span class="nh-tile-name">${esc(g.name)}</span>
            ${sub ? `<span class="nh-tile-sub">${sub}</span>` : ''}
        </a>`;
    }

    /** Diapositivas: la marca siempre primero; luego el reto pendiente y tu último juego (o uno sin estrenar). */
    function slides(data) {
        const P = Nexus.services.progress, out = [{ kind: 'brand' }];
        const pend = CO().dailies().find(d => !d.done);
        if (pend) out.push({ kind: 'game', g: pend.game, badge: '📅 Reto de hoy', title: pend.label, text: `${pend.name} · ${pend.text}`, href: pend.href, cta: 'Jugar el reto' });
        const last = data.history[0] && R().get(data.history[0].game);
        if (last && (!pend || last.id !== pend.game.id)) {
            const gs = P.stats(last.id);
            out.push({ kind: 'game', g: last, badge: '⏯️ Sigue jugando', title: last.name, text: `${gs.played} partida${gs.played === 1 ? '' : 's'} · récord ${gs.bestScore ? formatNumber(gs.bestScore) : '—'}. ${last.tagline || ''}`, href: `#/game/${last.id}`, cta: 'Continuar' });
        } else {
            const fresh = R().available().filter(g => !P.stats(g.id).played);
            const g = fresh[Math.floor(Math.random() * fresh.length)];
            if (g) out.push({ kind: 'game', g, badge: '✨ Sin estrenar', title: g.name, text: g.description || g.tagline, href: `#/game/${g.id}`, cta: 'Probarlo' });
        }
        return out;
    }

    function slideHtml(s, i) {
        if (s.kind === 'brand') return `
            <article class="nh-slide nh-slide-brand ${i === 0 ? 'on' : ''}" data-i="${i}">
                ${B().decor('hero')}
                <div class="nh-slide-body">
                    <h2 class="nh-word"><span>Nexus</span><span class="y">Arcade</span></h2>
                    <p class="nh-slogan">Muchos juegos. Un solo universo.</p>
                    <a class="nh-cta" href="#/library">${B().icon('play', 20)} Explorar juegos</a>
                </div>
                <div class="nh-slide-art">${B().logo3d('nh-logo3d')}</div>
            </article>`;
        return `
            <article class="nh-slide ${i === 0 ? 'on' : ''}" data-i="${i}" style="--c:${esc(s.g.accent || '#7b4dff')}" aria-hidden="true">
                ${B().decor('hero')}
                <div class="nh-slide-body">
                    <span class="nh-badge">${esc(s.badge)}</span>
                    <h2 class="nh-title">${esc(s.title)}</h2>
                    <p class="nh-text">${esc(s.text || '')}</p>
                    <div class="nh-acts"><a class="nh-cta" href="${esc(s.href)}">${B().icon('play', 20)} ${esc(s.cta)}</a>
                        <a class="nh-ghost" href="#/info/${esc(s.g.id)}">Ficha del juego</a></div>
                </div>
                <div class="nh-slide-art"><span class="nh-gamegem" aria-hidden="true"><span>${esc(s.g.emoji)}</span></span></div>
            </article>`;
    }

    /** Cabecera de sección: icono amarillo, título y botón «Ver todos». */
    const head = (icon, title, link, linkText, extra = '') => `
        <header class="nh-head"><h2><span class="nh-head-ic" aria-hidden="true">${icon}</span>${esc(title)}</h2>
            <span class="nh-head-tools">${extra}${link ? `<a class="nh-more" href="${esc(link)}">${esc(linkText || 'Ver todos')} ${B().icon('arrow', 16)}</a>` : ''}</span></header>`;

    Nexus.ui.pages.home = {
        title: 'Inicio',

        render(root) {
            const users = Nexus.services.users, progress = Nexus.services.progress;
            const user = users.current(), data = users.data();
            const games = R().available();
            const totals = progress.totals();
            const lv = progress.level();
            const A = Nexus.services.achievements;
            const dailies = CO().dailies();
            const dailyDone = dailies.filter(d => d.done).length;
            const sl = slides(data);
            const featured = FEATURED.map(id => R().get(id)).filter(Boolean).slice(0, 6);
            const recentIds = [];
            for (const h of data.history) { if (!recentIds.includes(h.game) && R().get(h.game)) recentIds.push(h.game); if (recentIds.length >= 6) break; }
            const lastOf = (id) => data.history.find(h => h.game === id);
            const unlockedIds = Object.entries(data.achievements).sort((a, b) => b[1] - a[1]).slice(0, 4);
            const recent = progress.history(5);

            root.innerHTML = `
                <div class="page-body nh">
                    <h1 class="sr-only">Inicio · ${esc(greeting())}, ${esc(user.name)}</h1>
                    <div class="nh-top">
                        <section class="nh-hero" id="hcar" aria-roledescription="carrusel" aria-label="Destacados" tabindex="0">
                            ${sl.map(slideHtml).join('')}
                            ${sl.length > 1 ? `<div class="nh-dots" role="tablist" aria-label="Diapositivas">${sl.map((s, i) => `<button type="button" role="tab" aria-selected="${i === 0}" class="${i === 0 ? 'on' : ''}" data-dot="${i}" aria-label="${esc(s.kind === 'brand' ? 'Nexus Arcade' : s.title)}"></button>`).join('')}</div>` : ''}
                        </section>

                        <a class="nh-prog" href="#/profile" aria-label="Tu progreso: nivel ${lv.level}">
                            <h2 class="nh-prog-title">${B().icon('bars', 22)} Tu progreso</h2>
                            <div class="nh-prog-lv">
                                <span class="nh-star" aria-hidden="true">⭐</span>
                                <span class="nh-prog-lvtxt"><b>Nivel ${lv.level}</b><span class="nh-bar"><i style="width:${lv.pct}%"></i></span></span>
                                <small>${formatNumber(lv.xp)} / ${formatNumber(lv.next)} XP</small>
                            </div>
                            <div class="nh-stats">
                                <span class="nh-stat"><i aria-hidden="true">🎮</i><b>${formatNumber(totals.played)}</b><small>Partidas</small></span>
                                <span class="nh-stat"><i aria-hidden="true">🏆</i><b>${formatNumber(totals.wins)}</b><small>Victorias</small></span>
                                <span class="nh-stat"><i aria-hidden="true">🏅</i><b>${A.countUnlocked()}</b><small>Logros</small></span>
                                <span class="nh-stat"><i aria-hidden="true">🔥</i><b>${formatNumber(data.meta.dayStreak)}</b><small>Días seguidos</small></span>
                            </div>
                            <span class="nh-prog-rank">${esc(lv.rank.icon)} ${esc(lv.rank.name)} · ${esc(greeting())}, <b>${esc(user.name)}</b></span>
                        </a>
                    </div>

                    <section class="nh-sec">
                        ${head(B().icon('grid', 24), 'Juegos destacados', '#/library', 'Ver todos')}
                        <div class="nh-tiles">${featured.map((g, i) => tile(g, i)).join('')}</div>
                    </section>

                    <section class="nh-sec lrow" id="home-dailies">
                        ${head('📅', 'Retos de hoy', null, null, `<span class="nh-count">${dailyDone}/${dailies.length} completados</span>
                            <button type="button" class="lrow-btn nh-arrow" data-scroll="-1" aria-label="Anterior">‹</button><button type="button" class="lrow-btn nh-arrow" data-scroll="1" aria-label="Siguiente">›</button>`)}
                        <div class="lrow-track nh-track">${dailies.map(d => `
                            <a class="quick-card daily-card nh-daily ${d.done ? 'done' : ''}" href="${esc(d.href)}">
                                <span class="nh-daily-ic" style="--c:${esc(d.accent || '#7b4dff')}">${esc(d.emoji)}</span>
                                <span class="nh-daily-txt"><b>${esc(d.label)}</b><small>${esc(d.name)}</small></span>
                                <span class="nh-daily-st">${d.done ? '✓' : 'Jugar'}</span>
                            </a>`).join('')}</div>
                    </section>

                    ${recentIds.length ? `<section class="nh-sec lrow" id="home-recent">
                        ${head('⏯️', 'Seguir jugando', '#/stats', 'Estadísticas', `<button type="button" class="lrow-btn nh-arrow" data-scroll="-1" aria-label="Anterior">‹</button><button type="button" class="lrow-btn nh-arrow" data-scroll="1" aria-label="Siguiente">›</button>`)}
                        <div class="lrow-track nh-track nh-track-tiles">${recentIds.map((id, i) => { const h = lastOf(id); return tile(R().get(id), i + 2, h ? `${h.won ? '🏆' : '🕹️'} ${esc(timeAgo(h.at))}` : ''); }).join('')}</div>
                    </section>` : ''}

                    <section class="nh-sec">
                        ${head('🗂️', 'Categorías', '#/library', 'Biblioteca')}
                        <div class="nh-cats">${CO().withGames().map(c => { const [col, emo] = CAT[c.id] || [c.color, c.emoji]; return `
                            <a class="nh-cat" href="#/library" data-col="${esc(c.id)}" style="--c:${esc(col)}">
                                <span class="nh-cat-ic" aria-hidden="true">${esc(emo)}</span>
                                <span class="nh-cat-txt"><b>${esc(c.name)}</b><small>${c.list.length} juego${c.list.length === 1 ? '' : 's'}</small></span>
                                <span class="nh-cat-peek" aria-hidden="true">${c.list.slice(0, 3).map(g => `<i>${esc(g.emoji)}</i>`).join('')}</span>
                                ${B().icon('chevronRight', 20, 'nh-cat-go')}
                            </a>`; }).join('')}</div>
                    </section>

                    <div class="nh-bottom">
                        <section class="nh-panel">
                            ${head('🏅', 'Logros recientes', '#/achievements', 'Ver todos')}
                            ${unlockedIds.length
                                ? `<div class="ach-list">${unlockedIds.map(([id, at]) => A.get(id) ? C.achievementCard(A.get(id), at, true) : '').join('')}</div>`
                                : C.empty('🏅', 'Aún sin logros', 'Juega una partida para desbloquear el primero.')}
                        </section>
                        <section class="nh-panel">
                            ${head('🕑', 'Actividad reciente', '#/stats', 'Estadísticas')}
                            ${recent.length
                                ? `<ul class="history-list">${recent.map(C.historyRow).join('')}</ul>`
                                : C.empty('🕑', 'Sin partidas todavía', 'Tus últimas partidas aparecerán aquí.')}
                        </section>
                    </div>
                </div>`;

            Nexus.ui.launcher.bindRows(root);
            // Una categoría abre la biblioteca con esa colección seleccionada
            $$('.nh-cat[data-col]', root).forEach(a => a.addEventListener('click', () => { Nexus.ui.gotoCollection = a.dataset.col; }));

            // Carrusel del banner
            const car = $('#hcar', root);
            let cur = 0, timer = 0, alive = true;
            const show = (i) => {
                cur = (i + sl.length) % sl.length;
                $$('.nh-slide', car).forEach((s, k) => { s.classList.toggle('on', k === cur); s.toggleAttribute('aria-hidden', k !== cur); $$('a', s).forEach(a => { a.tabIndex = k === cur ? 0 : -1; }); });
                $$('[data-dot]', car).forEach((d, k) => { d.classList.toggle('on', k === cur); d.setAttribute('aria-selected', String(k === cur)); });
            };
            const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
            const auto = () => { clearInterval(timer); if (sl.length > 1 && !reduced) timer = setInterval(() => { if (alive && !document.hidden) show(cur + 1); }, 8000); };
            $$('[data-dot]', car).forEach(d => d.addEventListener('click', () => { show(+d.dataset.dot); auto(); }));
            car.addEventListener('mouseenter', () => clearInterval(timer));
            car.addEventListener('mouseleave', auto);
            car.addEventListener('focusin', () => clearInterval(timer));
            car.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { show(cur + (e.key === 'ArrowLeft' ? -1 : 1)); auto(); } });
            show(0); auto();
            return () => { alive = false; clearInterval(timer); };
        }
    };
})();
