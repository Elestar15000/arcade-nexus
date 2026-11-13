/* ============================================================
   NEXUS ARCADE · ui/pages/home.js — Inicio del launcher
   Carrusel de destacados, retos de hoy, seguir jugando,
   colecciones, novedades y actividad.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatTime, timeAgo } = Nexus.util;
    const C = Nexus.ui.components;
    const L = () => Nexus.ui.launcher;
    const CO = () => Nexus.games.collections;

    function greeting() {
        const h = new Date().getHours();
        return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
    }

    /** Diapositivas del carrusel: último jugado, un reto diario pendiente, uno online y uno sin estrenar. */
    function slides(games, data) {
        const R = Nexus.games.registry, P = Nexus.services.progress;
        const out = [], used = new Set();
        const add = (g, badge, extra) => { if (g && !used.has(g.id)) { used.add(g.id); out.push(Object.assign({ g, badge }, extra || {})); } };
        const last = data.history[0] && R.get(data.history[0].game);
        if (last) { const gs = P.stats(last.id); add(last, 'Sigue jugando', { note: `${gs.played} partida${gs.played === 1 ? '' : 's'} · récord ${gs.bestScore ? formatNumber(gs.bestScore) : '—'}` }); }
        const pend = CO().dailies().find(d => !d.done);
        if (pend) add(pend.game, 'Reto de hoy', { note: `${pend.label}: ${pend.text}`, href: pend.href, cta: 'Jugar el reto' });
        add(games.filter(g => CO().isOnline(g))[Math.floor(Math.random() * games.filter(g => CO().isOnline(g)).length)], 'Multijugador online', { note: 'Crea una sala y comparte el código con quien quieras.' });
        const fresh = games.filter(g => !P.stats(g.id).played && !used.has(g.id));
        add(fresh[Math.floor(Math.random() * fresh.length)], 'Sin estrenar', { note: 'Todavía no lo has probado.' });
        if (out.length < 3) add(games[Math.floor(Math.random() * games.length)], 'Destacado');
        return out.slice(0, 4);
    }

    Nexus.ui.pages.home = {
        title: 'Inicio',

        render(root) {
            const users = Nexus.services.users, progress = Nexus.services.progress;
            const user = users.current(), data = users.data();
            const games = Nexus.games.registry.available();
            const totals = progress.totals();
            const lv = progress.level();
            const A = Nexus.services.achievements;
            const dailies = CO().dailies();
            const dailyDone = dailies.filter(d => d.done).length;
            const sl = slides(games, data);

            // Seguir jugando: últimos juegos distintos del historial
            const recentIds = [];
            for (const h of data.history) { if (!recentIds.includes(h.game) && Nexus.games.registry.get(h.game)) recentIds.push(h.game); if (recentIds.length >= 8) break; }
            const lastOf = (id) => data.history.find(h => h.game === id);
            const fresh = games.filter(g => !progress.stats(g.id).played);
            const favs = CO().favs().map(id => Nexus.games.registry.get(id)).filter(Boolean);
            const unlockedIds = Object.entries(data.achievements).sort((a, b) => b[1] - a[1]).slice(0, 4);
            const recent = progress.history(6);

            root.innerHTML = `
                <div class="page-body launcher-home">
                    <section class="hcar" id="hcar" aria-roledescription="carrusel" aria-label="Juegos destacados">
                        <div class="hcar-track">${sl.map((s, i) => {
                            const col = CO().of(s.g.id);
                            return `<article class="hslide ${i === 0 ? 'on' : ''}" data-i="${i}" style="--game-accent:${esc(s.g.accent || col.color)}" ${i === 0 ? '' : 'aria-hidden="true"'}>
                                <div class="hslide-art" aria-hidden="true"><span class="hslide-emoji">${esc(s.g.emoji)}</span><span class="hslide-ghost">${esc(s.g.emoji)}</span></div>
                                <div class="hslide-body">
                                    <span class="hslide-badge">${esc(s.badge)}</span>
                                    ${i === 0 ? `<p class="hslide-greet">${esc(greeting())}, <strong>${esc(user.name)}</strong></p>` : `<p class="hslide-greet">${esc(col.emoji + ' ' + col.name)}</p>`}
                                    <h2 class="hslide-title">${esc(s.g.name)}</h2>
                                    <p class="hslide-desc">${esc(s.note || s.g.description)}</p>
                                    <div class="hslide-actions">
                                        <a class="btn btn-primary btn-lg" href="${esc(s.href || `#/game/${s.g.id}`)}">▶ ${esc(s.cta || 'Jugar ahora')}</a>
                                        <a class="btn btn-ghost" href="#/info/${esc(s.g.id)}">Ficha del juego</a>
                                    </div>
                                </div>
                            </article>`; }).join('')}
                            ${sl.length > 1 ? `<div class="hcar-dots" role="tablist">${sl.map((s, i) => `<button type="button" role="tab" aria-selected="${i === 0}" class="${i === 0 ? 'on' : ''}" data-dot="${i}" aria-label="${esc(s.g.name)}"><span>${esc(s.g.emoji)}</span></button>`).join('')}</div>` : ''}
                        </div>
                        <div class="hcar-side">
                            <div class="hcar-stat"><b>${formatNumber(totals.played)}</b><small>partidas</small></div>
                            <div class="hcar-stat"><b>${formatNumber(totals.wins)}</b><small>victorias</small></div>
                            <div class="hcar-stat"><b>🔥 ${formatNumber(data.meta.dayStreak)}</b><small>días seguidos</small></div>
                            <div class="hcar-stat"><b>${A.countUnlocked()}<span class="muted">/${A.all().length}</span></b><small>logros</small></div>
                            <a class="hcar-level" href="#/profile" style="--p:${lv.pct}"><span class="hcar-ring"><b>${lv.level}</b></span><span><strong>${esc(lv.rank.icon)} ${esc(lv.rank.name)}</strong><small>${formatNumber(lv.xp)} / ${formatNumber(lv.next)} XP</small></span></a>
                        </div>
                    </section>

                    <section class="lrow" id="home-dailies">
                        <div class="lrow-head"><span class="lrow-icon">📅</span><div class="lrow-txt"><h2>Retos de hoy</h2><p>${dailyDone}/${dailies.length} completados · iguales para todos los jugadores</p></div>
                            <span class="lrow-nav"><button type="button" class="lrow-btn" data-scroll="-1" aria-label="Anterior">‹</button><button type="button" class="lrow-btn" data-scroll="1" aria-label="Siguiente">›</button></span></div>
                        <div class="lrow-track">${dailies.map(d => `
                            <a class="quick-card daily-card ${d.done ? 'done' : ''}" href="${esc(d.href)}" style="--game-accent:${esc(d.accent || 'var(--primary)')}">
                                <span class="quick-emoji">${esc(d.emoji)}</span>
                                <span class="quick-text"><strong>${esc(d.label)}</strong><small>${esc(d.name)}</small><em>${esc(d.text)}</em></span>
                                <span class="quick-go">${d.done ? '✅' : 'Jugar'}</span>
                            </a>`).join('')}</div>
                    </section>

                    ${L().row({ id: 'home-recent', icon: '⏯️', title: 'Seguir jugando', sub: 'Tus últimos juegos', link: '#/library', linkText: 'Biblioteca',
                        items: recentIds.map(id => { const g = Nexus.games.registry.get(id), h = lastOf(id); return L().tile(g, { sub: h ? `${h.won ? '🏆' : '💥'} ${formatNumber(h.score)} pts · ${esc(timeAgo(h.at))}` : '' }); }) })}

                    <section class="lrow">
                        <div class="lrow-head"><span class="lrow-icon">🗂️</span><div class="lrow-txt"><h2>Colecciones</h2><p>${games.length} juegos organizados por tipo</p></div><a class="lrow-link" href="#/library">Ver biblioteca →</a></div>
                        <div class="col-grid">${CO().withGames().map(c => `
                            <a class="col-tile" href="#/library" data-col="${esc(c.id)}" style="--col:${esc(c.color)}">
                                <span class="col-tile-emo">${esc(c.emoji)}</span>
                                <span class="col-tile-txt"><b>${esc(c.name)}</b><small>${c.list.length} juego${c.list.length === 1 ? '' : 's'}</small></span>
                                <span class="col-tile-peek" aria-hidden="true">${c.list.slice(0, 5).map(g => `<i>${esc(g.emoji)}</i>`).join('')}</span>
                            </a>`).join('')}</div>
                    </section>

                    ${L().row({ id: 'home-favs', icon: '★', title: 'Tus favoritos', sub: 'Marcados con la estrella en la biblioteca', items: favs.map(g => L().tile(g)) })}
                    ${L().row({ id: 'home-fresh', icon: '✨', title: 'Sin estrenar', sub: 'Juegos que todavía no has probado', link: '#/library', items: fresh.map(g => L().tile(g)) })}

                    <div class="two-col">
                        <section class="lpanel">
                            <div class="lpanel-head"><h2>🏅 Logros recientes</h2><a class="link" href="#/achievements">Ver todos</a></div>
                            ${unlockedIds.length
                                ? `<div class="ach-list">${unlockedIds.map(([id, at]) => A.get(id) ? C.achievementCard(A.get(id), at, true) : '').join('')}</div>`
                                : C.empty('🏅', 'Aún sin logros', 'Juega una partida para desbloquear el primero.')}
                        </section>
                        <section class="lpanel">
                            <div class="lpanel-head"><h2>🕑 Actividad reciente</h2><a class="link" href="#/stats">Estadísticas</a></div>
                            ${recent.length
                                ? `<ul class="history-list">${recent.map(C.historyRow).join('')}</ul>`
                                : C.empty('🕑', 'Sin partidas todavía', 'Tus últimas partidas aparecerán aquí.')}
                        </section>
                    </div>
                </div>`;

            L().bindRows(root);
            // Colecciones: abre la biblioteca y salta a la sección
            $$('.col-tile', root).forEach(a => a.addEventListener('click', () => { Nexus.ui.gotoCollection = a.dataset.col; }));

            // Carrusel
            const car = $('#hcar', root);
            let cur = 0, timer = 0, alive = true;
            const show = (i) => {
                cur = (i + sl.length) % sl.length;
                $$('.hslide', car).forEach((s, k) => { s.classList.toggle('on', k === cur); s.toggleAttribute('aria-hidden', k !== cur); });
                $$('[data-dot]', car).forEach((d, k) => { d.classList.toggle('on', k === cur); d.setAttribute('aria-selected', String(k === cur)); });
            };
            const auto = () => { clearInterval(timer); if (sl.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => { if (alive && !document.hidden) show(cur + 1); }, 7000); };
            $$('[data-dot]', car).forEach(d => d.addEventListener('click', () => { show(+d.dataset.dot); auto(); }));
            car.addEventListener('mouseenter', () => clearInterval(timer));
            car.addEventListener('mouseleave', auto);
            auto();
            return () => { alive = false; clearInterval(timer); };
        }
    };
})();
