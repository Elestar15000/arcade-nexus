/* ============================================================
   NEXUS ARCADE · ui/pages/achievements.js — Logros
   Pestañas:
     · Logros: «Casi lo tienes», escaleras (Bronce → Nexus),
       Maestría por juego, secretos, eventos, seguir y escaparate
     · Misiones: 3 diarias + 1 semanal, racha y meta de comunidad
   El pase de batalla, la tienda y la colección están en
   ui/pages/cosmetics.js (página «Cosméticos»).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, pct, formatNumber } = Nexus.util;
    const C = Nexus.ui.components;
    const A = () => Nexus.services.achievements;
    const RW = () => Nexus.services.rewards;
    const CEL = () => Nexus.ui.celebrate;
    const TABS = [['logros', 'Logros', '🏅'], ['misiones', 'Misiones', '🎯']];
    const rombos = (n) => `<span class="rw-amount">${CEL().diamond(16)}${formatNumber(n)}</span>`;
    const untilMidnight = () => { const d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); const h = Math.floor((m - d) / 36e5), mi = Math.floor((m - d) % 36e5 / 6e4); return `${h} h ${mi} min`; };



    Nexus.ui.pages.achievements = {
        title: 'Logros',

        render(root) {
            let tab = TABS.some(t => t[0] === Nexus.ui.achievementsTab) ? Nexus.ui.achievementsTab : 'logros';
            Nexus.ui.achievementsTab = null;
            let state = 'all', game = 'all';
            let community = null;

            const head = () => {
                const all = A().visible(), unlocked = A().unlockedMap();
                const done = all.filter(d => unlocked[d.id]).length;
                const secrets = all.filter(d => d.hidden), sGot = secrets.filter(d => unlocked[d.id]).length;
                return `
                    <div class="page-head ach-page-head"><div><h2 class="page-title">Logros</h2>
                        <p class="page-sub">${done} de ${all.length} desbloqueados · ${formatNumber(A().points())} puntos de logro</p></div>
                        <a class="rw-wallet" href="#/cosmetics" title="Gasta tus Rombos en Cosméticos">${rombos(RW().balance())}<small>Rombos</small></a></div>
                    <div class="ach-summary card-surface">
                        <div class="ring" style="--p:${pct(done, all.length)}"><span>${pct(done, all.length)}%</span></div>
                        <div class="ach-summary-rarities">
                            ${Object.entries(A().RARITY).map(([id, r]) => {
                                const t = all.filter(d => d.rarity === id && !d.hidden), u = t.filter(d => unlocked[d.id]).length;
                                return `<div class="rarity-count rarity-${id}"><b>${u}/${t.length}</b><span>${esc(r.label)}</span></div>`;
                            }).join('')}
                            <div class="rarity-count secret"><b>${sGot}/${secrets.length}</b><span>Secretos</span></div>
                        </div>
                    </div>
                    <nav class="rw-tabs" role="tablist" aria-label="Secciones de logros">
                        ${TABS.map(([id, label, ic]) => `<button type="button" role="tab" class="rw-tab${id === tab ? ' active' : ''}" data-tab="${id}" aria-selected="${id === tab}"><span aria-hidden="true">${ic}</span>${label}</button>`).join('')}
                    </nav>`;
            };

            // ── Logros ──
            const nearHtml = () => {
                const near = A().near(3);
                if (!near.length) return '';
                return `<section class="rw-near card-surface"><h3 class="section-title"><span>🎯</span> Casi lo tienes</h3>
                    <div class="rw-near-list">${near.map(x => C.achievementCard(x.def, null, true, { actions: true })).join('')}</div></section>`;
            };
            const ladderHtml = (l, unlocked) => {
                const idx = l.grades.findIndex(id => !unlocked[id]);
                const nextDef = idx >= 0 ? A().get(l.grades[idx]) : null;
                const prog = nextDef ? A().progressOf(nextDef) : null;
                const top = idx === -1 ? A().get(l.grades[l.grades.length - 1]) : (idx > 0 ? A().get(l.grades[idx - 1]) : null);
                const grade = idx === -1 ? A().GRADES[l.grades.length - 1] : idx > 0 ? A().GRADES[idx - 1] : null;
                return `<div class="ach-ladder${idx === -1 ? ' complete' : ''}" style="--gc:${grade ? grade.color : '#64748b'}">
                    <div class="ach-icon">${esc((top || nextDef).icon)}</div>
                    <div class="ach-body">
                        <div class="ach-head"><strong>${esc(l.name)}</strong><span class="rarity-tag">${grade ? esc(grade.name) : 'Sin grado'}</span></div>
                        <div class="ach-grades">${l.grades.map((id, i) => { const d = A().get(id); const g = A().GRADES[i];
                            return d ? `<span class="ach-grade${unlocked[id] ? ' on' : ''}" style="--gc:${g.color}" title="${esc(d.name)}: ${esc(d.desc)}">${esc(g.name)}</span>` : ''; }).join('')}</div>
                        ${nextDef ? `<p>Siguiente: <b>${esc(nextDef.name)}</b> · ${esc(nextDef.desc)}</p>${prog ? `<div class="ach-progress">${C.progressBar(pct(prog.value, prog.target))}<small>${formatNumber(prog.value)} / ${formatNumber(prog.target)}</small></div>` : ''}`
                            : '<p>¡Todos los grados conseguidos!</p>'}
                    </div></div>`;
            };
            const drawLogros = () => {
                const all = A().visible(), unlocked = A().unlockedMap();
                const groups = [{ id: 'general', name: 'General', emoji: '🌐' }]
                    .concat(all.some(d => d.window) ? [{ id: 'evento', name: 'Evento de temporada', emoji: '🎉' }] : [])
                    .concat(Nexus.games.registry.available().map(g => ({ id: g.id, name: g.name, emoji: g.emoji })));
                const inGroup = (d, g) => (g.id === 'evento' ? !!d.window : !d.window && d.game === g.id);
                const filt = (d) => state === 'all' || (state === 'unlocked' ? unlocked[d.id] : state === 'locked' ? !unlocked[d.id] : d.hidden);
                const html = groups.filter(g => game === 'all' || g.id === game).map(g => {
                    const total = all.filter(d => inGroup(d, g));
                    const list = total.filter(filt);
                    if (!list.length) return '';
                    const got = total.filter(d => unlocked[d.id]).length;
                    const ladders = A().LADDERS.filter(l => l.game === g.id && state !== 'secret');
                    const inLadder = new Set(ladders.flatMap(l => l.grades));
                    const rest = list.filter(d => !inLadder.has(d.id))
                        .sort((a, b) => (!!unlocked[b.id] - !!unlocked[a.id]) || (A().RARITY[a.rarity].order - A().RARITY[b.rarity].order));
                    const ms = g.id !== 'general' && g.id !== 'evento' ? A().mastery(g.id) : null;
                    return `<section class="section ach-group">
                        <h3 class="section-title"><span>${esc(g.emoji)}</span> ${esc(g.name)} <small class="muted">${got}/${total.length}</small>
                            ${ms ? `<span class="ach-mastery${ms.done ? ' done' : ''}" title="Maestría: consigue todos los logros del juego">👑 Maestría ${ms.got}/${ms.total}<i style="--p:${pct(ms.got, ms.total)}%"></i></span>` : ''}</h3>
                        <div class="ach-grid">${ladders.map(l => ladderHtml(l, unlocked)).join('')}${rest.map(d => C.achievementCard(d, unlocked[d.id], false, { actions: true })).join('')}</div></section>`;
                }).join('');
                return `${state === 'all' && game === 'all' ? nearHtml() : ''}
                    <div class="filters">
                        <div class="chips" role="group" aria-label="Estado">
                            ${[['all', 'Todos'], ['unlocked', 'Desbloqueados'], ['locked', 'Bloqueados'], ['secret', 'Secretos']].map(([id, l]) => `<button class="chip-btn${state === id ? ' active' : ''}" data-state="${id}">${l}</button>`).join('')}
                        </div>
                        <div class="chips" role="group" aria-label="Juego">
                            <button class="chip-btn${game === 'all' ? ' active' : ''}" data-game="all">Todos los juegos</button>
                            ${groups.map(g => `<button class="chip-btn${game === g.id ? ' active' : ''}" data-game="${esc(g.id)}">${esc(g.emoji)} ${esc(g.name)}</button>`).join('')}
                        </div>
                    </div>
                    <p class="muted small rw-hint">📌 sigue un logro para tenerlo siempre a la vista · ☆ pon hasta 3 en tu escaparate</p>
                    ${html || C.empty('🔍', 'Nada que mostrar', 'Ningún logro coincide con el filtro.')}`;
            };

            // ── Misiones ──
            const mCard = (m, i, rerollable) => `
                <div class="rw-mission tier-${esc(m.tier)}${m.done ? ' done' : ''}">
                    <span class="rw-m-tier">${esc(RW().TIER_LABEL[m.tier])}</span>
                    <b>${esc(m.text)}</b>
                    <div class="ach-progress">${C.progressBar(pct(m.prog, m.n))}<small>${m.prog} / ${m.n}</small></div>
                    <div class="rw-m-foot">${rombos(RW().MISSION_ROMBOS[m.tier])}${m.done ? '<span class="rw-ok">✓ Completada</span>'
                        : rerollable ? `<button type="button" class="btn btn-ghost btn-sm" data-reroll="${i}" title="Una vez al día">🔄 Cambiar</button>` : ''}</div>
                </div>`;
            const drawMisiones = () => {
                const M = RW().missions(); if (!M) return '';
                const st = M.streak, doneToday = M.daily.every(m => m.done);
                return `
                    <section class="section">
                        <h3 class="section-title"><span>🎯</span> Misiones de hoy <small class="muted">se renuevan en ${untilMidnight()}</small></h3>
                        <div class="rw-missions">${M.daily.map((m, i) => mCard(m, i, !M.rerolled)).join('')}</div>
                        ${Nexus.services.rewards.isWeekend() ? '<p class="rw-banner-note">🎉 Fin de semana: los logros y las misiones dan el doble de Rombos.</p>' : ''}
                    </section>
                    <section class="section">
                        <h3 class="section-title"><span>📆</span> Misión semanal <small class="muted">se renueva el lunes</small></h3>
                        <div class="rw-missions one">${mCard(M.weekly, -1, false)}</div>
                    </section>
                    <section class="section card-surface rw-streak">
                        <h3 class="section-title"><span>🔥</span> Racha de misiones</h3>
                        <div class="rw-streak-row"><b class="rw-streak-n">${st.count}</b><span>día${st.count === 1 ? '' : 's'} seguidos completando las tres misiones diarias${doneToday ? ' (hoy, hecho)' : ''}<small>Mejor racha: ${st.best} · La racha perdona un día por semana</small></span></div>
                        <div class="rw-prizes">${Object.entries(RW().STREAK_PRIZES).map(([d, n]) => `<span class="rw-prize${st.best >= +d ? ' on' : ''}"><b>${d} días</b>${rombos(n)}</span>`).join('')}</div>
                    </section>
                    <section class="section card-surface rw-community">
                        <h3 class="section-title"><span>👥</span> Meta de comunidad · Temporada ${RW().seasonOf().id}</h3>
                        ${community ? `<p>Entre todos: <b>${formatNumber(community.total)}</b> de ${formatNumber(community.goal)} partidas esta temporada.${community.reached ? ' ¡Conseguido! Los que jugaron esta temporada reciben el fondo de perfil «Comunidad» y 300 Rombos.' : ' Si se alcanza, todos los que hayan jugado esta temporada reciben el fondo de perfil «Comunidad» y 300 Rombos.'}</p>
                            <div class="ach-progress">${C.progressBar(pct(community.total, community.goal))}</div>` : '<p class="muted">Conectando con el ranking…</p>'}
                    </section>`;
            };

            const draw = () => {
                const body = { logros: drawLogros, misiones: drawMisiones }[tab]();
                root.innerHTML = `<div class="page-body ach-page">${head()}<div class="rw-panel" role="tabpanel">${body}</div></div>`;
                bind();
            };

            const bind = () => {
                $$('[data-tab]', root).forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; Nexus.audio.play('click'); draw(); }));
                $$('[data-state]', root).forEach(b => b.addEventListener('click', () => { state = b.dataset.state; draw(); }));
                $$('[data-game]', root).forEach(b => b.addEventListener('click', () => { game = b.dataset.game; draw(); }));
                $$('[data-track]', root).forEach(b => b.addEventListener('click', () => {
                    const on = RW().track(b.dataset.track) === b.dataset.track;
                    Nexus.ui.toast(on ? 'Logro seguido: lo verás en Inicio y al acabar cada partida' : 'Has dejado de seguir el logro', { icon: '📌' }); draw();
                }));
                $$('[data-showcase]', root).forEach(b => b.addEventListener('click', () => {
                    const on = RW().toggleShowcase(b.dataset.showcase);
                    Nexus.ui.toast(on ? 'Añadido a tu escaparate' : 'Quitado del escaparate', { icon: '★' }); draw();
                }));
                $$('[data-reroll]', root).forEach(b => b.addEventListener('click', () => { if (RW().reroll(+b.dataset.reroll)) { Nexus.ui.toast('Misión cambiada', { icon: '🔄' }); draw(); } }));
            };

            const onChange = () => { if (root.isConnected) draw(); };
            Nexus.bus.on('rewards:change', onChange);
            draw();
            // Rareza real y meta de comunidad: necesitan el ranking
            const L = Nexus.services.leaderboard;
            if (L) L.load().then(() => { community = L.community(); if (root.isConnected) draw(); }).catch(() => {});
            return () => { Nexus.bus.off && Nexus.bus.off('rewards:change', onChange); };
        }
    };
})();
