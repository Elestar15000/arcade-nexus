/* ============================================================
   NEXUS ARCADE · ui/pages/info.js — Ficha de juego
   Portada, botón de jugar, modos con tus récords, tus números,
   logros del juego, últimas partidas y juegos parecidos.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatTime, formatDuration, pct, timeAgo } = Nexus.util;
    const C = Nexus.ui.components;
    const L = () => Nexus.ui.launcher;
    const CO = () => Nexus.games.collections;

    Nexus.ui.pages.info = {
        title: 'Ficha de juego',

        render(root, params) {
            const g = Nexus.games.registry.get(params.id);
            if (!g) { root.innerHTML = C.empty('🛰️', 'Juego no encontrado', ''); return; }
            const P = Nexus.services.progress, A = Nexus.services.achievements;
            const gs = P.stats(g.id), col = CO().of(g.id);
            const data = Nexus.services.users.data();
            const hist = data.history.filter(h => h.game === g.id).slice(0, 6);
            const achs = A.all().filter(a => a.game === g.id);
            const unlocked = A.unlockedMap();
            const got = achs.filter(a => unlocked[a.id]).length;
            const fav = CO().isFav(g.id);
            const online = CO().isOnline(g), daily = CO().isDaily(g);
            const dailyState = CO().dailies().find(d => d.id === g.id);
            const similar = CO().withGames().find(c => c.id === col.id);
            const others = (similar ? similar.list : []).filter(x => x.id !== g.id);
            const winRate = gs.played ? pct(gs.wins, gs.played) : 0;

            root.innerHTML = `
                <div class="page-body ginfo" style="--game-accent:${esc(g.accent || col.color)}">
                    <section class="ginfo-hero">
                        <div class="ginfo-art" aria-hidden="true"><span class="ginfo-ghost">${esc(g.emoji)}</span>${L().cover(g, 'xl')}</div>
                        <div class="ginfo-main">
                            <a class="ginfo-crumb" href="#/library">${esc(col.emoji)} ${esc(col.name)}</a>
                            <h2 class="ginfo-title">${esc(g.name)}</h2>
                            <p class="ginfo-tagline">${esc(g.tagline || '')}</p>
                            <div class="ginfo-chips">
                                ${online ? '<span class="lc-feat">🌐 Online</span>' : ''}${daily ? '<span class="lc-feat">📅 Reto diario</span>' : ''}
                                ${g.tags.map(t => `<span class="lc-chip">${esc(t)}</span>`).join('')}
                                <span class="lc-chip">${g.modes.length} modo${g.modes.length === 1 ? '' : 's'}</span>
                            </div>
                            <p class="ginfo-desc">${esc(g.description || '')}</p>
                            <div class="ginfo-actions">
                                <a class="btn btn-primary btn-lg" href="#/game/${esc(g.id)}">▶ Jugar</a>
                                ${dailyState && !dailyState.done ? `<a class="btn btn-ghost" href="${esc(dailyState.href)}">📅 ${esc(dailyState.label)}</a>` : ''}
                                <a class="btn btn-ghost" href="#/rankings" data-rank="${esc(g.id)}">🏆 Rankings</a>
                                <button type="button" class="btn btn-ghost ginfo-fav ${fav ? 'on' : ''}" data-fav="${esc(g.id)}" aria-pressed="${fav}">${fav ? '★ Favorito' : '☆ Favorito'}</button>
                            </div>
                        </div>
                        <div class="ginfo-side">
                            <div class="ginfo-num"><b>${formatNumber(gs.played)}</b><small>partidas</small></div>
                            <div class="ginfo-num"><b>${formatNumber(gs.wins)}</b><small>victorias</small></div>
                            <div class="ginfo-num"><b>${winRate}%</b><small>acierto</small></div>
                            <div class="ginfo-num"><b>${gs.bestScore ? formatNumber(gs.bestScore) : '—'}</b><small>récord</small></div>
                            <div class="ginfo-num"><b>${gs.bestTime !== null && gs.bestTime !== undefined ? formatTime(gs.bestTime) : '—'}</b><small>mejor tiempo</small></div>
                            <div class="ginfo-num"><b>${esc(formatDuration(gs.totalTime || 0))}</b><small>jugado</small></div>
                        </div>
                    </section>

                    <div class="ginfo-grid">
                        <section class="lpanel">
                            <div class="lpanel-head"><h2>🎚️ Modos</h2><span class="muted small">tus mejores marcas</span></div>
                            <div class="ginfo-modes">${g.modes.map(m => {
                                const ms = gs.byMode[m.id];
                                const isOnline = m.id === 'online', isDaily = /diari|daily|phrase/.test(m.id);
                                return `<a class="ginfo-mode" href="#/game/${esc(g.id)}${m.id === 'phrase' ? '/frase' : ''}">
                                    <span class="ginfo-mode-ic">${isOnline ? '🌐' : isDaily ? '📅' : '🎮'}</span>
                                    <span class="ginfo-mode-txt"><b>${esc(m.label)}</b><small>${ms && ms.played ? `${ms.played} partida${ms.played === 1 ? '' : 's'} · ${pct(ms.wins, ms.played)}% · récord ${ms.bestScore ? formatNumber(ms.bestScore) : '—'}${ms.bestTime !== null && ms.bestTime !== undefined ? ` · ${formatTime(ms.bestTime)}` : ''}` : 'Sin jugar todavía'}</small></span>
                                    <span class="ginfo-mode-go">▶</span></a>`; }).join('')}</div>
                            ${g.statsExtra && gs.played ? `<div class="ginfo-extra">${g.statsExtra(gs)}</div>` : ''}
                        </section>

                        <section class="lpanel">
                            <div class="lpanel-head"><h2>🏅 Logros</h2><span class="muted small">${got}/${achs.length}</span></div>
                            ${(() => { const ms = A.mastery(g.id); return ms.total ? `<div class="ginfo-mastery${ms.done ? ' done' : ''}" title="Consigue todos los logros del juego">
                                <span>👑 <b>Maestría</b> ${ms.got}/${ms.total}${ms.done ? ' · ¡conseguida!' : ''}</span><span class="nh-gbar"><i style="width:${pct(ms.got, ms.total)}%"></i></span>
                                <small>${ms.done ? `Título «Maestro de ${esc(g.name)}» y marco Maestría` : 'Recompensa: título «Maestro de …», marco Maestría y 500 Rombos'}</small></div>` : ''; })()}
                            ${A.near(2, g.id).length ? `<div class="ginfo-near"><b class="small">🎯 Casi lo tienes</b>${A.near(2, g.id).map(x => C.achievementCard(x.def, null, true)).join('')}</div>` : ''}
                            ${achs.length ? `<div class="ach-list">${achs.sort((a, b) => (!!unlocked[b.id] - !!unlocked[a.id]) || (A.RARITY[a.rarity].order - A.RARITY[b.rarity].order)).map(a => C.achievementCard(a, unlocked[a.id], true)).join('')}</div>` : C.empty('🏅', 'Sin logros propios', '')}
                        </section>

                        <section class="lpanel">
                            <div class="lpanel-head"><h2>🕑 Últimas partidas</h2><a class="link" href="#/stats">Estadísticas</a></div>
                            ${hist.length ? `<ul class="history-list">${hist.map(C.historyRow).join('')}</ul>` : C.empty('🕹️', 'Todavía no has jugado', 'Tu primera partida aparecerá aquí.', `<a class="btn btn-primary btn-sm" href="#/game/${esc(g.id)}">▶ Jugar ahora</a>`)}
                        </section>
                    </div>

                    ${L().row({ icon: col.emoji, title: `Más de ${col.name}`, sub: col.desc, link: '#/library', items: others.map(x => L().tile(x)) })}
                </div>`;

            L().bindRows(root);
            $('[data-fav]', root).addEventListener('click', (e) => {
                const on = CO().toggleFav(g.id);
                e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', String(on));
                e.currentTarget.textContent = on ? '★ Favorito' : '☆ Favorito';
                Nexus.audio.play(on ? 'orbCollect' : 'click');
                Nexus.ui.toast(on ? 'Añadido a favoritos' : 'Quitado de favoritos', { icon: '★' });
            });
            $('[data-rank]', root).addEventListener('click', () => { Nexus.ui.rankingsTab = g.id; });
        }
    };
})();
