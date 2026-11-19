/* ============================================================
   NEXUS ARCADE · ui/pages/achievements.js — Logros y Misiones
   Dos vistas con la identidad de Inicio y Biblioteca:
     · #/achievements           Logros: cabecera con trofeo y
       progreso total, 4 cifras, filtros (Todos · Por categoría ·
       Por rareza · Secretos) y tarjetas verticales por rareza
       (escaleras Bronce → Nexus, Maestría, eventos, seguir y
       escaparate)
     · #/achievements/misiones  Misiones: cabecera con diana y
       cofre, pestañas Diarias · Semanales · Especiales (racha,
       recompensa destacada, meta de comunidad y eventos)
   El pase de batalla, la tienda y la colección están en
   ui/pages/cosmetics.js (página «Cosméticos»).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $$, pct, formatNumber } = Nexus.util;
    const A = () => Nexus.services.achievements;
    const RW = () => Nexus.services.rewards;
    const CEL = () => Nexus.ui.celebrate;
    const ART = () => Nexus.ui.art;
    const PAGE = 24;                              // tarjetas por tanda en «Todos»

    const dia = (n = 16) => CEL().diamond(n);
    const rombos = (n, s = 16) => `<span class="rw-amount">${dia(s)}${formatNumber(n)}</span>`;
    const untilMidnight = () => { const d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); const h = Math.floor((m - d) / 36e5), mi = Math.floor((m - d) % 36e5 / 6e4); return `${h} h ${mi} min`; };
    const untilMonday = () => { const d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); m.setDate(m.getDate() + ((8 - m.getDay()) % 7)); const ms = m - d; return `${Math.floor(ms / 864e5)} d ${Math.floor(ms % 864e5 / 36e5)} h`; };
    const bar = (p, cls = '') => `<span class="ac-bar${cls ? ' ' + cls : ''}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span>`;

    // ── Tarjeta de logro ────────────────────────────────────
    function card(def, unlockedAt, i = 0) {
        const shown = A().rarityOf(def), R = A().RARITY[shown];
        const secret = def.hidden && !unlockedAt;
        const prog = unlockedAt || secret ? null : A().progressOf(def);
        const p = unlockedAt ? 100 : prog ? (prog.best ? Math.round(A().ratioOf(def) * 100) : pct(prog.value, prog.target)) : 0;
        const real = A().realPct(def.id);
        const tracked = RW().tracked() === def.id, pinned = RW().showcase().includes(def.id);
        const theme = secret ? 'secret' : shown;
        const act = unlockedAt
            ? `<button type="button" class="ac-act${pinned ? ' on' : ''}" data-showcase="${esc(def.id)}" title="${pinned ? 'Quitar del escaparate' : 'Poner en el escaparate (máx. 3)'}" aria-pressed="${pinned}">${pinned ? '★' : '☆'}</button>`
            : secret ? '' : `<button type="button" class="ac-act${tracked ? ' on' : ''}" data-track="${esc(def.id)}" title="${tracked ? 'Dejar de seguir' : 'Seguir este logro'}" aria-pressed="${tracked}">📌</button>`;
        const count = unlockedAt ? '' : prog ? `${prog.best ? '<em>Mejor:</em> ' : ''}${formatNumber(prog.value)}/${formatNumber(prog.target)}` : secret ? '' : '0/1';
        return `<article class="ac-card r-${theme}${unlockedAt ? ' done' : ' locked'}${tracked ? ' tracked' : ''}" data-ach="${esc(def.id)}" style="--d:${Math.min(i, 12) * 30}ms">
            <span class="ac-pill">${secret ? 'Secreto' : esc(R.label)}${real !== null && !secret ? ` · ${real < 1 ? '<1' : Math.round(real)} %` : ''}</span>
            ${def.window ? '<span class="ac-ev">Evento</span>' : ''}${act}
            <div class="ac-ic">${esc(secret ? '❔' : def.icon)}</div>
            <h4>${secret ? '???' : esc(def.name)}</h4>
            <p>${secret ? `«${esc(def.hint || 'Descúbrelo jugando')}»` : esc(def.desc)}</p>
            <div class="ac-foot">
                <div class="ac-prog"><small>${unlockedAt ? esc(Nexus.util.formatDate(unlockedAt)) : secret ? 'Descúbrelo jugando' : count}</small>${bar(p)}</div>
                ${unlockedAt ? '<span class="ac-ok" title="Desbloqueado">✓</span>'
                    : secret || !prog ? '<span class="ac-lock" title="Bloqueado">🔒</span>'
                    : `<span class="ac-xp">+${def.xp} XP</span>`}
            </div>
        </article>`;
    }

    /** Escalera (Bronce → Nexus) como una sola tarjeta. */
    function ladderCard(l, unlocked, i = 0) {
        const G = A().GRADES;
        const idx = l.grades.findIndex(id => !unlocked[id]);
        const next = idx >= 0 ? A().get(l.grades[idx]) : null;
        const prog = next ? A().progressOf(next) : null;
        const top = idx === -1 ? A().get(l.grades[l.grades.length - 1]) : (idx > 0 ? A().get(l.grades[idx - 1]) : null);
        const grade = idx === -1 ? G[l.grades.length - 1] : idx > 0 ? G[idx - 1] : null;
        const p = idx === -1 ? 100 : prog ? (prog.best ? Math.round(A().ratioOf(next) * 100) : pct(prog.value, prog.target)) : 0;
        return `<article class="ac-card r-ladder${idx === -1 ? ' done' : ''}" style="--gc:${grade ? grade.color : '#6c74d8'};--d:${Math.min(i, 12) * 30}ms">
            <span class="ac-pill">Escalera · ${grade ? esc(grade.name) : 'Sin grado'}</span>
            <div class="ac-ic">${esc((top || next).icon)}</div>
            <h4>${esc(l.name)}</h4>
            <div class="ac-grades">${l.grades.map((id, k) => { const d = A().get(id); return d ? `<i class="${unlocked[id] ? 'on' : ''}" style="--g:${G[k].color}" title="${esc(G[k].name)} · ${esc(d.name)}: ${esc(d.desc)}"></i>` : ''; }).join('')}</div>
            <p>${next ? `Siguiente: ${esc(next.desc)}` : '¡Todos los grados conseguidos!'}</p>
            <div class="ac-foot">
                <div class="ac-prog">${prog ? `<small>${formatNumber(prog.value)}/${formatNumber(prog.target)}</small>` : '<small>Completa</small>'}${bar(p)}</div>
                ${next ? `<span class="ac-xp">+${next.xp} XP</span>` : '<span class="ac-ok">✓</span>'}
            </div>
        </article>`;
    }

    // ── Página ──────────────────────────────────────────────
    Nexus.ui.pages.achievements = {
        title: 'Logros',

        render(root, params = {}) {
            const legacy = Nexus.ui.achievementsTab; Nexus.ui.achievementsTab = null;
            const view = params.id === 'misiones' || legacy === 'misiones' ? 'misiones' : 'logros';
            let mode = 'todos', state = 'all', game = 'all', shown = PAGE, mtab = 'diarias';
            let community = null;

            const switcher = () => {
                const M = RW().missions(), left = M ? M.daily.filter(m => !m.done).length : 0;
                return `<nav class="ac-switch" aria-label="Logros y misiones">
                    <a href="#/achievements" class="${view === 'logros' ? 'on' : ''}"${view === 'logros' ? ' aria-current="page"' : ''}>🏆 Logros</a>
                    <a href="#/achievements/misiones" class="${view === 'misiones' ? 'on' : ''}"${view === 'misiones' ? ' aria-current="page"' : ''}>🎯 Misiones${left ? `<b>${left}</b>` : ''}</a></nav>`;
            };

            // ════ Vista LOGROS ════
            const heroLogros = (all, done) => `
                <section class="ac-hero">
                    <div class="ac-hero-art">${ART().trophy()}</div>
                    <div class="ac-hero-body"><h2>Logros</h2>
                        <p>Completa desafíos, gana recompensas y demuestra tu habilidad en Nexus Arcade.</p>${switcher()}</div>
                    <div class="ac-hero-kpi"><b>${pct(done, all.length)}%</b><span>Progreso total</span>${bar(pct(done, all.length), 'gold')}</div>
                </section>`;
            const stats = (all, done) => {
                const lv = Nexus.services.progress.level();
                const tile = (ic, cls, n, label, href) => `<${href ? `a href="${href}"` : 'div'} class="ac-stat"><span class="ac-stat-ic ${cls}">${ic}</span><span><b>${n}</b><small>${label}</small></span></${href ? 'a' : 'div'}>`;
                return `<section class="ac-stats">
                    ${tile('🏆', 'c-gold', `${formatNumber(done)}<em>/${all.length}</em>`, 'Desbloqueados')}
                    ${tile('⭐', 'c-gold', formatNumber(A().points()), 'Puntos de logro', '#/rankings')}
                    ${tile(dia(26), 'c-cyan', formatNumber(RW().balance()), 'Rombos', '#/cosmetics')}
                    ${tile('👑', 'c-gold', `Nivel ${lv.level}`, esc(lv.rank.name))}
                </section>`;
            };
            const nearRow = (unlocked) => {
                const near = A().near(4);
                if (!near.length) return '';
                return `<section class="ac-sec"><h3 class="ac-sec-t"><span class="ac-sec-ic">🎯</span>Casi lo tienes <small>los más cercanos · 📌 fija uno para seguirlo</small></h3>
                    <div class="ac-grid">${near.map((x, i) => card(x.def, unlocked[x.def.id], i)).join('')}</div></section>`;
            };

            const filterBar = (groups) => `
                <div class="ac-filters">
                    <div class="ac-chips" role="tablist" aria-label="Vista">
                        ${[['todos', 'Todos', '🏆'], ['categoria', 'Por categoría', '🗂'], ['rareza', 'Por rareza', '💎'], ['secretos', 'Secretos', '❔']].map(([id, l, ic]) =>
                            `<button type="button" role="tab" class="ac-chip${mode === id ? ' on' : ''}" data-mode="${id}" aria-selected="${mode === id}">${id === 'todos' ? `<span aria-hidden="true">${ic}</span>` : ''}${l}</button>`).join('')}
                    </div>
                    <label class="ac-select"><span class="sr-only">Estado</span><select data-state>
                        ${[['all', 'Todos los estados'], ['unlocked', 'Desbloqueados'], ['locked', 'Por conseguir']].map(([id, l]) => `<option value="${id}"${state === id ? ' selected' : ''}>${l}</option>`).join('')}
                    </select></label>
                </div>
                ${mode === 'categoria' ? `<div class="ac-games">
                    <button type="button" class="ac-g${game === 'all' ? ' on' : ''}" data-game="all">Todas</button>
                    ${groups.map(g => `<button type="button" class="ac-g${game === g.id ? ' on' : ''}" data-game="${esc(g.id)}">${esc(g.emoji)} ${esc(g.name)}</button>`).join('')}</div>` : ''}`;

            const drawLogros = () => {
                const all = A().visible(), unlocked = A().unlockedMap();
                const done = all.filter(d => unlocked[d.id]).length;
                const groups = [{ id: 'general', name: 'General', emoji: '🌐' }]
                    .concat(all.some(d => d.window) ? [{ id: 'evento', name: 'Evento de temporada', emoji: '🎉' }] : [])
                    .concat(Nexus.games.registry.available().map(g => ({ id: g.id, name: g.name, emoji: g.emoji })));
                const inGroup = (d, g) => (g.id === 'evento' ? !!d.window : !d.window && d.game === g.id);
                const okState = (d) => state === 'all' || (state === 'unlocked' ? !!unlocked[d.id] : !unlocked[d.id]);
                const ladders = A().LADDERS;
                const inLadder = new Set(ladders.flatMap(l => l.grades));
                const ladderOk = (l) => state === 'all' || (state === 'unlocked' ? l.grades.some(id => unlocked[id]) : l.grades.some(id => !unlocked[id]));
                const order = (a, b) => (!!unlocked[b.id] - !!unlocked[a.id]) || (A().ratioOf(b) - A().ratioOf(a)) || (A().RARITY[a.rarity].order - A().RARITY[b.rarity].order);
                const grid = (items) => `<div class="ac-grid">${items.join('')}</div>`;
                const empty = (ic, t) => Nexus.ui.components.empty(ic, 'Nada que mostrar', t);
                let body = '';

                if (mode === 'todos') {
                    const cards = ladders.filter(ladderOk).map((l, i) => ladderCard(l, unlocked, i))
                        .concat(all.filter(d => !inLadder.has(d.id) && !(d.hidden && !unlocked[d.id]) && okState(d)).sort(order).map(d => card(d, unlocked[d.id])));
                    body = (state === 'all' ? nearRow(unlocked) : '') + `<section class="ac-sec"><h3 class="ac-sec-t"><span class="ac-sec-ic">🏆</span>Todos los logros <small>${cards.length}</small></h3>
                        ${cards.length ? grid(cards.slice(0, shown)) : empty('🔍', 'Ningún logro coincide con el filtro.')}
                        ${cards.length > shown ? `<div class="ac-more"><button type="button" class="btn btn-ghost" data-more>Mostrar más <small>(${cards.length - shown})</small></button></div>` : ''}</section>`;
                } else if (mode === 'categoria') {
                    body = groups.filter(g => game === 'all' || g.id === game).map(g => {
                        const total = all.filter(d => inGroup(d, g)), got = total.filter(d => unlocked[d.id]).length;
                        const lad = ladders.filter(l => l.game === g.id && ladderOk(l));
                        const list = total.filter(d => !inLadder.has(d.id) && okState(d)).sort(order);
                        if (!lad.length && !list.length) return '';
                        const ms = g.id !== 'general' && g.id !== 'evento' ? A().mastery(g.id) : null;
                        return `<section class="ac-sec"><h3 class="ac-sec-t"><span class="ac-sec-ic">${esc(g.emoji)}</span>${esc(g.name)} <small>${got}/${total.length}</small>
                            ${ms ? `<span class="ac-mastery${ms.done ? ' done' : ''}" title="Maestría: consigue todos los logros del juego">👑 Maestría ${ms.got}/${ms.total}${bar(pct(ms.got, ms.total), 'gold')}</span>` : ''}</h3>
                            ${grid(lad.map((l, i) => ladderCard(l, unlocked, i)).concat(list.map((d, i) => card(d, unlocked[d.id], i + lad.length))))}</section>`;
                    }).join('') || empty('🔍', 'Ningún logro coincide con el filtro.');
                } else if (mode === 'rareza') {
                    body = Object.entries(A().RARITY).sort((a, b) => b[1].order - a[1].order).map(([id, R]) => {
                        const total = all.filter(d => A().rarityOf(d) === id && !(d.hidden && !unlocked[d.id]));
                        const list = total.filter(okState).sort(order);
                        if (!list.length) return '';
                        return `<section class="ac-sec"><h3 class="ac-sec-t"><span class="ac-sec-ic r-${id}">💎</span>${esc(R.label)} <small>${total.filter(d => unlocked[d.id]).length}/${total.length} · +${R.xp} XP y ${R.rombos} Rombos cada uno</small></h3>
                            ${grid(list.map((d, i) => card(d, unlocked[d.id], i)))}</section>`;
                    }).join('') || empty('🔍', 'Ningún logro coincide con el filtro.');
                } else {
                    const sec = all.filter(d => d.hidden).filter(okState).sort(order);
                    body = `<section class="ac-sec"><h3 class="ac-sec-t"><span class="ac-sec-ic r-secret">❔</span>Logros secretos <small>${sec.filter(d => unlocked[d.id]).length}/${all.filter(d => d.hidden).length} · sólo se ve una pista hasta conseguirlos</small></h3>
                        ${sec.length ? grid(sec.map((d, i) => card(d, unlocked[d.id], i))) : empty('❔', 'Ningún secreto coincide con el filtro.')}</section>`;
                }
                return `${heroLogros(all, done)}${stats(all, done)}${filterBar(groups)}${body}`;
            };

            // ════ Vista MISIONES ════
            const ICON = (id) => /play/.test(id) ? '▶' : /distinct/.test(id) ? '🧭' : /daily/.test(id) ? '📅' : /record/.test(id) ? '🚀' : /streak/.test(id) ? '🔥' : /col_|colwin/.test(id) ? '🎮' : '🏆';
            const colOf = (m) => (m.id.match(/^(?:e_col|m_colwin)_(.+)$/) || [])[1] || '';
            const mRow = (m, i, rerollable) => {
                const col = colOf(m);
                return `<li class="mx-row t-${esc(m.tier)}${m.done ? ' done' : ''}">
                    <span class="mx-ic">${ICON(m.id)}</span>
                    <div class="mx-main"><span class="mx-tier">${esc(RW().TIER_LABEL[m.tier])}</span><b>${esc(m.text)}</b>${bar(pct(m.prog, m.n))}</div>
                    <span class="mx-n">${m.prog} / ${m.n}</span>
                    <span class="mx-rw">${rombos(RW().MISSION_ROMBOS[m.tier] * (RW().isWeekend() ? 2 : 1), 22)}<i class="mx-food" title="Comida para ${esc(Nexus.services.pet.name())}: ${esc(Nexus.services.pet.FOOD[Nexus.services.pet.TIER_FOOD[m.tier]].name)}">${Nexus.services.pet.FOOD[Nexus.services.pet.TIER_FOOD[m.tier]].icon}</i></span>
                    <span class="mx-act">${m.done ? '<span class="mx-done">✓ Hecha</span>'
                        : `${rerollable ? `<button type="button" class="mx-reroll" data-reroll="${i}" title="Cambiar misión (una vez al día)" aria-label="Cambiar misión">🔄</button>` : ''}<a class="mx-go" href="#/library"${col ? ` data-col="${esc(col)}"` : ''}>Ir</a>`}</span>
                </li>`;
            };
            const heroMisiones = () => `
                <section class="ac-hero mx-hero">
                    <div class="ac-hero-art">${ART().target()}</div>
                    <div class="ac-hero-body"><h2>Misiones</h2>
                        <p>Completa misiones y gana Rombos por jugar en Nexus Arcade.</p>${switcher()}</div>
                    <div class="ac-hero-art mx-chest">${ART().chest()}</div>
                </section>`;
            /** Recompensa destacada: el próximo hito de la racha de Nexito. */
            const featured = (M) => {
                const PT = Nexus.services.pet, st = PT.streak(), next = PT.nextMilestone() || PT.MILESTONES[PT.MILESTONES.length - 1];
                const prize = next.rombos ? rombos(next.rombos, 22) : next.shield ? '🛡 Escudo de racha' : esc(next.items.map(id => (RW().item(id) || {}).name || id).join(' + '));
                const t = PT.todo();
                return `<section class="mx-card mx-feat">
                    <h3 class="mx-card-t"><span class="mx-card-ic">🎁</span>Recompensa destacada</h3>
                    <div class="mx-feat-body"><div class="mx-feat-art">${Nexus.ui.nexito.mini({ mood: 'happy' })}</div>
                        <div class="mx-feat-txt"><p>Cuida a ${esc(PT.name())} <b>${next.days} días seguidos</b>: 1 partida y 1 comida al día. Cada misión le da una comida.</p>
                            <div class="mx-feat-prize">${prize}</div>
                            ${bar(pct(Math.min(st.count, next.days), next.days), 'gold')}<small class="mx-sub">Racha: ${Math.min(st.count, next.days)}/${next.days} días · mejor ${st.best}</small>
                            ${t.cared ? '<span class="mx-claimed">✓ Hoy, cuidado</span>' : `<a class="mx-cta" href="#/pet">Ir con ${esc(PT.name())}</a>`}</div></div>
                </section>`;
            };
            const weeklyCard = (M) => `
                <section class="mx-card">
                    <h3 class="mx-card-t"><span class="mx-card-ic">📆</span>Misión semanal<span class="mx-timer">⏱ ${untilMonday()}</span></h3>
                    <div class="mx-week"><b>${esc(M.weekly.text)}</b>
                        <div class="mx-week-row">${bar(pct(M.weekly.prog, M.weekly.n))}${rombos(RW().MISSION_ROMBOS.weekly, 20)}</div>
                        <small class="mx-sub">${M.weekly.done ? '✓ Completada' : `${M.weekly.prog} / ${M.weekly.n}`}</small></div>
                </section>`;
            const streakCard = () => {
                const PT = Nexus.services.pet, st = PT.streak();
                return `<section class="mx-card">
                    <h3 class="mx-card-t"><span class="mx-card-ic">🔥</span>Racha de ${esc(PT.name())}</h3>
                    <div class="mx-streak"><b>${st.count}</b><span>día${st.count === 1 ? '' : 's'} seguidos cuidando a ${esc(PT.name())}<small>Mejor racha: ${st.best} · ${st.shields} escudo${st.shields === 1 ? '' : 's'} · si se pone en peligro, las 3 misiones diarias la rescatan</small></span></div>
                    <div class="mx-prizes">${PT.MILESTONES.slice(0, 4).map(x => `<span class="${st.best >= x.days ? 'on' : ''}"><b>${x.days} días</b>${x.rombos ? rombos(x.rombos) : x.shield ? '🛡 Escudo' : '🎁'}</span>`).join('')}</div>
                </section>`;
            };
            const drawMisiones = () => {
                const M = RW().missions(); if (!M) return heroMisiones();
                const tabs = `<nav class="mx-tabs" role="tablist" aria-label="Tipo de misión">
                    ${[['diarias', 'Diarias', '📅'], ['semanales', 'Semanales', '📆'], ['especiales', 'Especiales', '🎉']].map(([id, l, ic]) =>
                        `<button type="button" role="tab" class="mx-tab${mtab === id ? ' on' : ''}" data-mtab="${id}" aria-selected="${mtab === id}"><span aria-hidden="true">${ic}</span>${l}</button>`).join('')}</nav>`;
                let body = '';
                if (mtab === 'diarias') {
                    body = `<section class="mx-panel">
                        <header class="mx-panel-h"><span class="mx-panel-ic">${dia(26)}</span><span class="mx-panel-tt"><small>Se actualiza en:</small><b>⏱ ${untilMidnight()}</b></span>
                            <span class="mx-panel-note">${RW().isWeekend() ? '🎉 Fin de semana: Rombos ×2' : M.rerolled ? 'Ya has cambiado una misión hoy' : '🔄 Puedes cambiar una misión al día'}</span></header>
                        <ul class="mx-list">${M.daily.map((m, i) => mRow(m, i, !M.rerolled)).join('')}</ul></section>
                        <div class="mx-duo">${weeklyCard(M)}${featured(M)}</div>`;
                } else if (mtab === 'semanales') {
                    body = `<section class="mx-panel">
                        <header class="mx-panel-h"><span class="mx-panel-ic">📆</span><span class="mx-panel-tt"><small>Termina en:</small><b>⏱ ${untilMonday()}</b></span>
                            <span class="mx-panel-note">${formatNumber(M.completed || 0)} misiones completadas en total</span></header>
                        <ul class="mx-list">${mRow(M.weekly, -1, false)}</ul></section>
                        <div class="mx-duo">${streakCard()}${featured(M)}</div>`;
                } else {
                    const events = A().all().filter(d => d.window && A().isActive(d)), unlocked = A().unlockedMap();
                    body = `<div class="mx-duo">
                        <section class="mx-card">
                            <h3 class="mx-card-t"><span class="mx-card-ic">👥</span>Meta de comunidad · Temporada ${RW().seasonOf().id}</h3>
                            ${community ? `<p>Entre todos: <b>${formatNumber(community.total)}</b> de ${formatNumber(community.goal)} partidas esta temporada.</p>
                                ${bar(pct(community.total, community.goal), 'gold')}
                                <small class="mx-sub">${community.reached ? '¡Conseguido! Quien haya jugado esta temporada recibe el fondo «Comunidad» y 300 Rombos.' : 'Si se alcanza, quien haya jugado esta temporada recibe el fondo «Comunidad» y 300 Rombos.'}</small>`
                                : '<p class="mx-sub">Conectando con el ranking…</p>'}
                        </section>
                        <section class="mx-card">
                            <h3 class="mx-card-t"><span class="mx-card-ic">🎉</span>Fin de semana doble</h3>
                            <p>Los sábados y domingos los logros y las misiones dan <b>el doble de Rombos</b>.</p>
                            <span class="mx-claimed${RW().isWeekend() ? '' : ' off'}">${RW().isWeekend() ? '✓ Activo ahora' : 'Vuelve el sábado'}</span>
                        </section></div>
                        <section class="mx-panel">
                            <header class="mx-panel-h"><span class="mx-panel-ic">🎉</span><span class="mx-panel-tt"><small>Eventos de temporada</small><b>${events.length ? 'Activo ahora' : 'Halloween (25 oct – 2 nov) · Navidad (20 dic – 6 ene)'}</b></span></header>
                            ${events.length ? `<div class="ac-grid mx-ev">${events.map((d, i) => card(d, unlocked[d.id], i)).join('')}</div>`
                                : '<p class="mx-empty">No hay ningún evento activo. Sus logros dan avatares y aspectos exclusivos que sólo se consiguen en esas fechas.</p>'}
                        </section>`;
                }
                return `${heroMisiones()}${tabs}${body}`;
            };

            const draw = () => {
                root.innerHTML = `<div class="page-body ac-page">${view === 'logros' ? drawLogros() : drawMisiones()}</div>`;
                bind();
            };

            const bind = () => {
                $$('[data-mode]', root).forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; shown = PAGE; Nexus.audio.play('click'); draw(); }));
                $$('select[data-state]', root).forEach(s => s.addEventListener('change', () => { state = s.value; shown = PAGE; draw(); }));
                $$('[data-game]', root).forEach(b => b.addEventListener('click', () => { game = b.dataset.game; draw(); }));
                $$('[data-more]', root).forEach(b => b.addEventListener('click', () => { shown += PAGE; draw(); }));
                $$('[data-mtab]', root).forEach(b => b.addEventListener('click', () => { mtab = b.dataset.mtab; Nexus.audio.play('click'); draw(); }));
                $$('[data-col]', root).forEach(a => a.addEventListener('click', () => { Nexus.ui.gotoCollection = a.dataset.col; }));
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
