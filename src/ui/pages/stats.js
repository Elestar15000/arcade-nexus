/* ============================================================
   NEXUS ARCADE · ui/pages/stats.js — Estadísticas
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber, formatTime, formatDuration, pct, dayKey } = Nexus.util;
    const C = Nexus.ui.components;

    /** Gráfico de barras (SVG) con las partidas de los últimos 14 días. */
    function activityChart(history) {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
            days.push({ key: dayKey(d), label: d.toLocaleDateString('es-ES', { weekday: 'narrow' }), wins: 0, losses: 0 });
        }
        const idx = new Map(days.map((d, i) => [d.key, i]));
        history.forEach(h => {
            const i = idx.get(dayKey(h.at));
            if (i !== undefined) h.won ? days[i].wins++ : days[i].losses++;
        });
        const max = Math.max(4, ...days.map(d => d.wins + d.losses));
        const W = 560, H = 150, pad = 22, bw = (W - pad * 2) / days.length;
        const bars = days.map((d, i) => {
            const x = pad + i * bw + bw * 0.15, w = bw * 0.7;
            const hw = ((H - 34) * d.wins) / max, hl = ((H - 34) * d.losses) / max;
            const base = H - 20;
            return `
                <g><title>${esc(d.key)}: ${d.wins} victorias, ${d.losses} derrotas</title>
                <rect x="${x}" y="${base - hw}" width="${w}" height="${hw}" rx="3" class="chart-win"/>
                <rect x="${x}" y="${base - hw - hl}" width="${w}" height="${hl}" rx="3" class="chart-loss"/>
                <text x="${x + w / 2}" y="${H - 5}" text-anchor="middle" class="chart-label">${esc(d.label.toUpperCase())}</text></g>`;
        }).join('');
        return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Partidas de los últimos 14 días">
            <line x1="${pad}" y1="${H - 20}" x2="${W - pad}" y2="${H - 20}" class="chart-axis"/>${bars}</svg>
            <div class="chart-legend"><span><i class="dot win"></i> Victorias</span><span><i class="dot loss"></i> Derrotas</span></div>`;
    }

    Nexus.ui.pages.stats = {
        title: 'Estadísticas',

        render(root) {
            const progress = Nexus.services.progress;
            const data = Nexus.services.users.data();
            const t = progress.totals();
            const m = data.meta;
            const games = Nexus.games.registry.available();

            const gameCards = games.map(g => {
                const gs = progress.stats(g.id);
                const modeRows = g.modes.map(mode => {
                    const ms = gs.byMode[mode.id];
                    if (!ms || !ms.played) return '';
                    return `<tr><td>${esc(mode.label)}</td><td>${ms.played}</td><td>${pct(ms.wins, ms.played)} %</td>
                        <td>${ms.bestScore ? formatNumber(ms.bestScore) : '—'}</td><td>${ms.bestTime !== null ? formatTime(ms.bestTime) : '—'}</td></tr>`;
                }).join('');
                const extra = g.statsExtra ? g.statsExtra(gs) : '';
                return `
                    <section class="section card-surface game-stats" style="--game-accent:${esc(g.accent || 'var(--primary)')}">
                        <h2 class="section-title"><span>${esc(g.emoji)}</span> ${esc(g.name)}</h2>
                        ${gs.played === 0 ? C.empty(g.emoji, 'Sin partidas', 'Todavía no has jugado a este juego.',
                            `<a class="btn btn-primary btn-sm" href="#/game/${esc(g.id)}">Jugar</a>`) : `
                        <div class="tiles">
                            ${C.statTile('Partidas', formatNumber(gs.played))}
                            ${C.statTile('Victorias', formatNumber(gs.wins), '', pct(gs.wins, gs.played) + ' % de acierto')}
                            ${C.statTile('Mejor puntuación', gs.bestScore ? formatNumber(gs.bestScore) : '—')}
                            ${C.statTile('Mejor tiempo', gs.bestTime !== null ? formatTime(gs.bestTime) : '—')}
                            ${C.statTile('Racha actual', gs.streak)}
                            ${C.statTile('Mejor racha', gs.bestStreak)}
                        </div>
                        ${C.progressBar(pct(gs.wins, gs.played), 'bar-win')}
                        ${modeRows ? `<div class="table-wrap"><table class="table">
                            <thead><tr><th>Modo</th><th>Partidas</th><th>Victorias</th><th>Mejor punt.</th><th>Mejor tiempo</th></tr></thead>
                            <tbody>${modeRows}</tbody></table></div>` : ''}
                        ${extra}`}
                    </section>`;
            }).join('');

            const recent = progress.history(10);

            root.innerHTML = `
                <div class="page-body">
                    <div class="page-head"><div><h2 class="page-title">Estadísticas</h2>
                        <p class="page-sub">Tu actividad de un vistazo</p></div></div>

                    <div class="tiles tiles-lg">
                        ${C.statTile('Partidas jugadas', formatNumber(t.played), '🎮')}
                        ${C.statTile('Victorias', formatNumber(t.wins), '🏆', pct(t.wins, t.played) + ' % de acierto')}
                        ${C.statTile('Tiempo jugado', formatDuration(m.playTime), '⏱️')}
                        ${C.statTile('Racha de días', m.dayStreak, '🔥', `Mejor: ${m.bestDayStreak}`)}
                        ${C.statTile('XP total', formatNumber(data.xp.total), '✨', `Nivel ${data.xp.level}`)}
                        ${C.statTile('Días jugados', m.daysPlayed, '📆')}
                    </div>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>📈</span> Actividad (14 días)</h2>
                        ${data.history.length ? activityChart(data.history) : C.empty('📈', 'Sin actividad', 'Juega alguna partida para ver tu gráfico.')}
                        ${data.history.length ? '<p class="muted small">Basado en tus últimas 100 partidas.</p>' : ''}
                    </section>

                    <div class="stats-games">${gameCards}</div>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🕑</span> Últimas partidas</h2>
                        ${recent.length ? `<ul class="history-list">${recent.map(C.historyRow).join('')}</ul>` : C.empty('🕑', 'Nada por aquí', 'Aún no hay partidas registradas.')}
                    </section>
                </div>`;
        }
    };
})();
