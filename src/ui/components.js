/* ============================================================
   NEXUS ARCADE · ui/components.js
   Piezas de interfaz reutilizables (devuelven HTML como string;
   todo texto de usuario pasa por esc()).
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber, formatTime, pct } = Nexus.util;
    const C = Nexus.ui.components = {};

    /** Avatar PNG redondo de un usuario (ver ui/avatar.js). */
    C.avatar = (user, size = 'md') => Nexus.ui.avatar.user(user, size);

    C.statTile = (label, value, icon, sub) => `
        <div class="stat-tile">
            ${icon ? `<span class="stat-tile-icon" aria-hidden="true">${esc(icon)}</span>` : ''}
            <span class="stat-tile-value">${esc(value)}</span>
            <span class="stat-tile-label">${esc(label)}</span>
            ${sub ? `<span class="stat-tile-sub">${esc(sub)}</span>` : ''}
        </div>`;

    C.progressBar = (percent, cls = '') => `
        <div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}">
            <div class="bar-fill" style="width:${Math.max(0, Math.min(100, percent))}%"></div>
        </div>`;

    C.empty = (emoji, title, text, actionHtml = '') => `
        <div class="empty-state"><div class="empty-emoji">${esc(emoji)}</div>
            <h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHtml}</div>`;

    /** Tarjeta de juego disponible (con las estadísticas del usuario). */
    C.gameCard = (g) => {
        const gs = Nexus.services.progress.stats(g.id);
        const best = gs.bestScore > 0 ? formatNumber(gs.bestScore) : '—';
        return `
            <a class="game-card available" href="#/game/${esc(g.id)}" style="--game-accent:${esc(g.accent || 'var(--primary)')}">
                <div class="card-shine"></div>
                <div class="card-visual">
                    <span class="card-emoji">${esc(g.emoji)}</span>
                    <span class="card-badge badge-available">DISPONIBLE</span>
                </div>
                <div class="card-info">
                    <h3>${esc(g.name)}</h3>
                    <p>${esc(g.tagline)}</p>
                    <div class="card-tags">${g.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
                    <div class="card-stats">
                        <span><b>${formatNumber(gs.played)}</b> partidas</span>
                        <span><b>${formatNumber(gs.wins)}</b> victorias</span>
                        <span>Récord <b>${best}</b></span>
                    </div>
                </div>
                <span class="card-play" aria-hidden="true">▶</span>
            </a>`;
    };

    C.comingSoonCard = (g) => `
        <div class="game-card locked" data-soon="1" tabindex="0" role="button" aria-label="${esc(g.name)} (próximamente)">
            <div class="card-visual">
                <span class="card-emoji">${esc(g.emoji)}</span>
                <span class="card-badge badge-locked">PRÓXIMAMENTE</span>
            </div>
            <div class="card-info">
                <h3>${esc(g.name)}</h3>
                <p>Próximamente</p>
                <div class="card-tags">${g.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
            </div>
            <div class="card-lock" aria-hidden="true">🔒</div>
        </div>`;

    /**
     * Tarjeta de logro. opts.actions: botones de seguir (bloqueados) y escaparate (desbloqueados).
     * Los secretos bloqueados se ven como «???» con su pista.
     */
    C.achievementCard = (def, unlockedAt, compact, opts = {}) => {
        const A = Nexus.services.achievements, RW = Nexus.services.rewards, CEL = Nexus.ui.celebrate;
        const shown = A.rarityOf(def), R = A.RARITY[shown];
        const secret = def.hidden && !unlockedAt;
        const prog = unlockedAt || secret ? null : A.progressOf(def);
        const p = prog ? (prog.best ? Math.round(A.ratioOf(def) * 100) : pct(prog.value, prog.target)) : 0;
        const real = A.realPct(def.id);
        const tracked = RW && RW.tracked() === def.id;
        const pinned = RW && RW.showcase().includes(def.id);
        const icon = secret ? '❔' : def.icon;
        const reward = CEL ? CEL.rewardLine(def) : `+${def.xp} XP`;
        const actions = opts.actions ? (unlockedAt
            ? `<button type="button" class="ach-act${pinned ? ' on' : ''}" data-showcase="${esc(def.id)}" title="${pinned ? 'Quitar del escaparate' : 'Poner en el escaparate (máx. 3)'}" aria-pressed="${pinned}">${pinned ? '★' : '☆'}</button>`
            : secret ? '' : `<button type="button" class="ach-act${tracked ? ' on' : ''}" data-track="${esc(def.id)}" title="${tracked ? 'Dejar de seguir' : 'Seguir este logro'}" aria-pressed="${tracked}">📌</button>`) : '';
        return `
            <div class="ach-card rarity-${esc(shown)} ${unlockedAt ? 'unlocked' : 'locked'}${secret ? ' secret' : ''}${compact ? ' compact' : ''}${tracked ? ' tracked' : ''}" data-ach="${esc(def.id)}">
                <div class="ach-icon">${esc(icon)}${!unlockedAt && !secret ? '<i class="ach-lock" aria-hidden="true">🔒</i>' : ''}</div>
                <div class="ach-body">
                    <div class="ach-head"><strong>${secret ? '???' : esc(def.name)}</strong>
                        <span class="rarity-tag">${secret ? 'Secreto' : esc(R.label)}${real !== null && !secret ? ` · ${real < 1 ? '<1' : Math.round(real)} %` : ''}</span>${def.window ? '<span class="rarity-tag ev">Evento</span>' : ''}${actions}</div>
                    <p>${secret ? `<em>«${esc(def.hint || 'Logro secreto')}»</em>` : esc(def.desc)}</p>
                    ${unlockedAt
                        ? `<small class="ach-meta">✔ ${esc(Nexus.util.formatDate(unlockedAt))} · ${reward}</small>`
                        : prog
                            ? `<div class="ach-progress">${C.progressBar(p)}<small>${prog.best ? `${esc(prog.label || 'Mejor intento')}: ` : ''}${formatNumber(prog.value)} / ${formatNumber(prog.target)}</small></div>`
                            : `<small class="ach-meta">${secret ? 'Descúbrelo jugando' : reward}</small>`}
                </div>
            </div>`;
    };

    C.historyRow = (h) => {
        const g = Nexus.games.registry.get(h.game);
        const modeLabel = g ? (g.modes.find(m => m.id === h.mode) || {}).label || h.mode : h.mode;
        return `
            <li class="history-row ${h.won ? 'won' : 'lost'}">
                <span class="history-emoji">${esc(g ? g.emoji : '🎮')}</span>
                <span class="history-main"><strong>${esc(g ? g.name : h.game)}</strong>
                    <small>${esc(modeLabel)} · ${esc(Nexus.util.timeAgo(h.at))}</small></span>
                <span class="history-result">${h.won ? 'Victoria' : 'Derrota'}</span>
                <span class="history-score">${formatNumber(h.score)}<small>${formatTime(h.time)}</small></span>
            </li>`;
    };

    /** Abre el selector de avatares a pantalla completa (ver ui/avatar-picker.js). */
    C.openAvatarPicker = (opts) => Nexus.ui.avatarPicker.open(opts);

    // ── Controles de ajustes ────────────────────────────────
    C.switchRow = (key, title, desc) => `
        <label class="setting-row">
            <span class="setting-text"><strong>${esc(title)}</strong>${desc ? `<small>${esc(desc)}</small>` : ''}</span>
            <span class="switch"><input type="checkbox" data-setting="${esc(key)}" /><span class="switch-track"><span class="switch-thumb"></span></span></span>
        </label>`;

    C.choiceRow = (key, title, desc, options) => `
        <div class="setting-row">
            <span class="setting-text"><strong>${esc(title)}</strong>${desc ? `<small>${esc(desc)}</small>` : ''}</span>
            <div class="segmented" role="radiogroup" aria-label="${esc(title)}" data-choice="${esc(key)}">
                ${options.map(o => `<button type="button" role="radio" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('')}
            </div>
        </div>`;
})();
