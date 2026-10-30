/* ============================================================
   NEXUS ARCADE · ui/pages/rankings.js — Rankings
   Clasificaciones globales (descargadas del servidor).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatTime } = Nexus.util;
    const C = Nexus.ui.components;
    const MEDALS = ['🥇', '🥈', '🥉'];

    Nexus.ui.pages.rankings = {
        title: 'Rankings',

        render(root) {
            const L = Nexus.services.leaderboard;
            const me = Nexus.services.users.current();
            const games = Nexus.games.registry.available();
            const tabs = [{ id: 'overall', label: '🌐 General' }]
                .concat(games.map(g => ({ id: g.id, label: `${g.emoji} ${g.name}` })));
            const state = { tab: 'overall', mode: 'all', metric: null };

            root.innerHTML = `
                <div class="page-body">
                    <div class="page-head"><div><h2 class="page-title">Rankings</h2>
                        <p class="page-sub" id="rk-sub">Cargando clasificación…</p></div>
                        <button class="btn btn-ghost btn-sm" id="rk-refresh" type="button">↻ Actualizar</button></div>
                    <div class="tabs" role="tablist">
                        ${tabs.map(t => `<button class="tab" role="tab" data-tab="${esc(t.id)}">${esc(t.label)}</button>`).join('')}
                    </div>
                    <div id="rk-filters"></div>
                    <div id="rk-table" class="card-surface"></div>
                    <p class="muted small center" id="rk-note"></p>
                </div>`;

            const who = (u) => `<span class="player">${C.avatar(u, 'sm')}<span class="player-name">${esc(u.name)}${me && u.id === me.id ? ' <em>(tú)</em>' : ''}</span></span>`;
            const posCell = (pos) => `<td class="col-pos">${MEDALS[pos - 1] || pos}</td>`;
            const rowCls = (u) => (me && u.id === me.id ? ' class="me"' : '');

            const drawOverall = () => {
                $('#rk-filters', root).innerHTML = '';
                const rows = L.overall();
                if (!rows.length) return C.empty('🏆', 'Sin jugadores', 'Crea un perfil para aparecer en el ranking.');
                return `<div class="table-wrap"><table class="table table-rank">
                    <thead><tr><th>#</th><th>Jugador</th><th>Rango</th><th class="num">XP total</th><th class="num">Victorias</th><th class="num">% vict.</th><th class="num">Logros</th></tr></thead>
                    <tbody>${rows.map(r => `<tr${rowCls(r.user)}>${posCell(r.pos)}<td>${who(r.user)}</td>
                        <td>${esc(r.rank.icon)} ${esc(r.rank.name)} · Nv. ${r.level}</td>
                        <td class="num strong">${formatNumber(r.totalXP)}</td><td class="num">${r.wins}</td>
                        <td class="num">${r.winRate} %</td><td class="num">${r.achievements}</td></tr>`).join('')}</tbody></table></div>`;
            };

            const drawGame = () => {
                const g = Nexus.games.registry.get(state.tab);
                if (!state.metric || !g.metrics.some(m => m.id === state.metric)) state.metric = g.metrics[0].id;
                const modes = [{ id: 'all', label: 'Todos' }].concat(g.modes);
                $('#rk-filters', root).innerHTML = `
                    <div class="filters">
                        ${g.modes.length > 1 ? `<div class="chips" role="group" aria-label="Modo">${modes.map(m =>
                            `<button class="chip-btn${m.id === state.mode ? ' active' : ''}" data-mode="${esc(m.id)}">${esc(m.label)}</button>`).join('')}</div>` : ''}
                        ${g.metrics.length > 1 ? `<div class="chips" role="group" aria-label="Ordenar por">${g.metrics.map(m =>
                            `<button class="chip-btn${m.id === state.metric ? ' active' : ''}" data-metric="${esc(m.id)}">${esc(m.label)}</button>`).join('')}</div>` : ''}
                    </div>`;
                $$('[data-mode]', root).forEach(b => b.addEventListener('click', () => { state.mode = b.dataset.mode; draw(); }));
                $$('[data-metric]', root).forEach(b => b.addEventListener('click', () => { state.metric = b.dataset.metric; draw(); }));

                const rows = L.forGame(g.id, g.modes.length > 1 ? state.mode : 'all', state.metric);
                if (!rows.length) return C.empty(g.emoji, 'Aún no hay marcas',
                    'Gana una partida en este modo para entrar en la clasificación.',
                    `<a class="btn btn-primary btn-sm" href="#/game/${esc(g.id)}">Jugar</a>`);
                const hi = (m) => (state.metric === m ? ' strong hi' : '');
                return `<div class="table-wrap"><table class="table table-rank">
                    <thead><tr><th>#</th><th>Jugador</th><th class="num">Mejor punt.</th><th class="num">Mejor tiempo</th>
                    <th class="num">Victorias</th><th class="num">% vict.</th><th class="num">Partidas</th></tr></thead>
                    <tbody>${rows.map(r => `<tr${rowCls(r.user)}>${posCell(r.pos)}<td>${who(r.user)}</td>
                        <td class="num${hi('score')}">${r.bestScore ? formatNumber(r.bestScore) : '—'}</td>
                        <td class="num${hi('time')}">${r.bestTime !== null ? formatTime(r.bestTime) : '—'}</td>
                        <td class="num${hi('wins')}">${r.wins}</td><td class="num">${r.winRate} %</td><td class="num">${r.played}</td></tr>`).join('')}</tbody></table></div>`;
            };

            const draw = () => {
                $$('.tab', root).forEach(t => {
                    const on = t.dataset.tab === state.tab;
                    t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on));
                });
                $('#rk-table', root).innerHTML = (state.tab === 'overall' ? drawOverall() : drawGame());
            };

            $$('.tab', root).forEach(t => t.addEventListener('click', () => {
                state.tab = t.dataset.tab; state.mode = 'all'; state.metric = null; draw();
            }));

            let alive = true;
            const sub = $('#rk-sub', root), note = $('#rk-note', root), btn = $('#rk-refresh', root);
            const local = Nexus.backend.kind === 'local';
            note.textContent = local
                ? 'Modo local: sólo aparecen las cuentas de este navegador. Configura el servidor (config.js) para tener un ranking global.'
                : 'Las marcas se envían al terminar cada partida. Ranking global de todos los jugadores registrados.';
            const fetchBoard = async (force) => {
                btn.disabled = true;
                if (!L.players.length) $('#rk-table', root).innerHTML = '<div class="loading-block"><span class="spinner"></span> Cargando clasificación…</div>';
                try {
                    await L.load(force);
                    if (!alive) return;
                    sub.textContent = `${L._all().length} jugador${L._all().length === 1 ? '' : 'es'} · actualizado ${Nexus.util.timeAgo(L.updatedAt)}`;
                    draw();
                } catch (e) {
                    if (!alive) return;
                    sub.textContent = 'No se pudo cargar la clasificación';
                    if (L.players.length) draw();
                    else $('#rk-table', root).innerHTML = C.empty('📡', 'Sin conexión con el servidor', e.message || 'Inténtalo de nuevo en unos segundos.');
                } finally { if (alive) btn.disabled = false; }
            };
            btn.addEventListener('click', () => fetchBoard(true));
            fetchBoard(false);
            return () => { alive = false; };
        }
    };
})();
