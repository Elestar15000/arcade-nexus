/* ============================================================
   NEXUS ARCADE · ui/pages/achievements.js — Logros
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, pct } = Nexus.util;
    const C = Nexus.ui.components;

    Nexus.ui.pages.achievements = {
        title: 'Logros',

        render(root) {
            const A = Nexus.services.achievements;
            const all = A.all();
            const unlocked = A.unlockedMap();
            const done = A.countUnlocked();
            const xpEarned = all.filter(d => unlocked[d.id]).reduce((s, d) => s + d.xp, 0);

            // Orden de secciones: general primero, luego cada juego
            const groups = [{ id: 'general', name: 'General', emoji: '🌐' }]
                .concat(Nexus.games.registry.available().map(g => ({ id: g.id, name: g.name, emoji: g.emoji })));
            let state = 'all', game = 'all';

            root.innerHTML = `
                <div class="page-body">
                    <div class="page-head"><div><h2 class="page-title">Logros</h2>
                        <p class="page-sub">${done} de ${all.length} desbloqueados · ${esc(String(xpEarned))} XP ganados con logros</p></div></div>

                    <div class="ach-summary card-surface">
                        <div class="ring" style="--p:${pct(done, all.length)}"><span>${pct(done, all.length)}%</span></div>
                        <div class="ach-summary-rarities">
                            ${Object.entries(A.RARITY).map(([id, r]) => {
                                const t = all.filter(d => d.rarity === id);
                                const u = t.filter(d => unlocked[d.id]).length;
                                return `<div class="rarity-count rarity-${id}"><b>${u}/${t.length}</b><span>${esc(r.label)}</span></div>`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="filters">
                        <div class="chips" role="group" aria-label="Estado">
                            <button class="chip-btn active" data-state="all">Todos</button>
                            <button class="chip-btn" data-state="unlocked">Desbloqueados</button>
                            <button class="chip-btn" data-state="locked">Bloqueados</button>
                        </div>
                        <div class="chips" role="group" aria-label="Juego">
                            <button class="chip-btn active" data-game="all">Todos los juegos</button>
                            ${groups.map(g => `<button class="chip-btn" data-game="${esc(g.id)}">${esc(g.emoji)} ${esc(g.name)}</button>`).join('')}
                        </div>
                    </div>
                    <div id="ach-groups"></div>
                </div>`;

            const draw = () => {
                const html = groups.filter(g => game === 'all' || g.id === game).map(g => {
                    const list = all.filter(d => d.game === g.id)
                        .filter(d => state === 'all' || (state === 'unlocked' ? unlocked[d.id] : !unlocked[d.id]))
                        .sort((a, b) => (!!unlocked[b.id] - !!unlocked[a.id]) || (A.RARITY[a.rarity].order - A.RARITY[b.rarity].order));
                    if (!list.length) return '';
                    const total = all.filter(d => d.game === g.id);
                    const got = total.filter(d => unlocked[d.id]).length;
                    return `<section class="section">
                        <h3 class="section-title"><span>${esc(g.emoji)}</span> ${esc(g.name)} <small class="muted">${got}/${total.length}</small></h3>
                        <div class="ach-grid">${list.map(d => C.achievementCard(d, unlocked[d.id])).join('')}</div></section>`;
                }).join('');
                $('#ach-groups', root).innerHTML = html || C.empty('🔍', 'Nada que mostrar', 'Ningún logro coincide con el filtro.');
            };

            const bindChips = (attr, setter) => $$(`[data-${attr}]`, root).forEach(b => b.addEventListener('click', () => {
                $$(`[data-${attr}]`, root).forEach(x => x.classList.toggle('active', x === b));
                setter(b.dataset[attr]); draw();
            }));
            bindChips('state', v => { state = v; });
            bindChips('game', v => { game = v; });
            draw();
        }
    };
})();
