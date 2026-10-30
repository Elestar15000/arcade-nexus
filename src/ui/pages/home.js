/* ============================================================
   NEXUS ARCADE · ui/pages/home.js — Inicio
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber, dayKey } = Nexus.util;
    const C = Nexus.ui.components;

    function greeting() {
        const h = new Date().getHours();
        return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
    }

    Nexus.ui.pages.home = {
        title: 'Inicio',

        render(root) {
            const users = Nexus.services.users;
            const progress = Nexus.services.progress;
            const user = users.current();
            const data = users.data();
            const games = Nexus.games.registry.available();
            const totals = progress.totals();
            const lv = progress.level();

            // Juego destacado: el último al que jugaste (o el primero)
            const last = data.history[0];
            const featured = (last && Nexus.games.registry.get(last.game)) || games[0];
            const gs = progress.stats(featured.id);

            // Reto diario de Wordle
            const wordle = Nexus.games.registry.get('wordle');
            const dailyState = wordle && data.saves.wordle && data.saves.wordle.daily;
            const dailyDone = !!(dailyState && dailyState.date === dayKey() && dailyState.status !== 'playing');

            const unlockedIds = Object.entries(data.achievements).sort((a, b) => b[1] - a[1]).slice(0, 4);
            const recent = progress.history(5);
            const achievements = Nexus.services.achievements;

            root.innerHTML = `
                <section class="hero" style="--game-accent:${esc(featured.accent || 'var(--primary)')}">
                    <div class="hero-bg"></div>
                    <div class="hero-content">
                        <span class="hero-badge">${last ? 'Sigue jugando' : 'Destacado'}</span>
                        <p class="hero-greeting">${esc(greeting())}, <strong>${esc(user.name)}</strong></p>
                        <h2 class="hero-title">${esc(featured.name)}</h2>
                        <p class="hero-desc">${esc(featured.description)}</p>
                        <div class="hero-actions">
                            <a class="btn btn-primary btn-glow" href="#/game/${esc(featured.id)}"><span>▶</span> Jugar ahora</a>
                            <a class="btn btn-ghost" href="#/library">Ver biblioteca</a>
                        </div>
                        <div class="hero-stats-row">
                            <div class="hero-stat"><span class="hero-stat-value">${formatNumber(totals.played)}</span><span class="hero-stat-label">Partidas</span></div>
                            <div class="hero-stat"><span class="hero-stat-value">${formatNumber(totals.wins)}</span><span class="hero-stat-label">Victorias</span></div>
                            <div class="hero-stat"><span class="hero-stat-value">${formatNumber(data.meta.dayStreak)}</span><span class="hero-stat-label">Racha de días</span></div>
                            <div class="hero-stat"><span class="hero-stat-value">${achievements.countUnlocked()}/${achievements.all().length}</span><span class="hero-stat-label">Logros</span></div>
                        </div>
                    </div>
                    <div class="hero-visual" aria-hidden="true">
                        <div class="floating-icon floating-main">${esc(featured.emoji)}</div>
                        <div class="floating-icon floating-a">⚡</div>
                        <div class="floating-icon floating-b">🏆</div>
                        <div class="floating-icon floating-c">⭐</div>
                    </div>
                </section>

                <div class="page-body">

                    <div class="quick-row">
                        ${wordle ? `
                        <a class="quick-card" href="#/game/wordle">
                            <span class="quick-emoji">📅</span>
                            <span class="quick-text"><strong>Reto diario de Wordle</strong>
                                <small>${dailyDone ? '✅ Ya lo has jugado hoy. ¡Vuelve mañana!' : 'Una palabra nueva cada día, igual para todos.'}</small></span>
                            <span class="quick-go">${dailyDone ? 'Ver' : 'Jugar'}</span>
                        </a>` : ''}
                        <a class="quick-card" href="#/profile">
                            <span class="quick-emoji">${esc(lv.rank.icon)}</span>
                            <span class="quick-text"><strong>${esc(lv.rank.name)} · Nivel ${lv.level}</strong>
                                ${C.progressBar(lv.pct)}<small>${formatNumber(lv.xp)} / ${formatNumber(lv.next)} XP para el siguiente nivel</small></span>
                            <span class="quick-go">Ver perfil</span>
                        </a>
                    </div>

                    <section class="section">
                        <h2 class="section-title"><span>🎮</span> Tus juegos</h2>
                        <div class="games-grid">${games.map(C.gameCard).join('')}</div>
                    </section>

                    <div class="two-col">
                        <section class="section card-surface">
                            <div class="section-head"><h2 class="section-title"><span>🏅</span> Logros recientes</h2>
                                <a class="link" href="#/achievements">Ver todos</a></div>
                            ${unlockedIds.length
                                ? `<div class="ach-list">${unlockedIds.map(([id, at]) => achievements.get(id) ? C.achievementCard(achievements.get(id), at, true) : '').join('')}</div>`
                                : C.empty('🏅', 'Aún sin logros', 'Juega una partida para desbloquear el primero.')}
                        </section>
                        <section class="section card-surface">
                            <div class="section-head"><h2 class="section-title"><span>🕑</span> Actividad reciente</h2>
                                <a class="link" href="#/stats">Estadísticas</a></div>
                            ${recent.length
                                ? `<ul class="history-list">${recent.map(C.historyRow).join('')}</ul>`
                                : C.empty('🕑', 'Sin partidas todavía', 'Tus últimas partidas aparecerán aquí.')}
                        </section>
                    </div>
                </div>`;
        }
    };
})();
