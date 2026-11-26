/* ============================================================
   NEXUS ARCADE · ui/pages/cosmetics.js — Cosméticos
   Pestañas:
     · Pase de batalla: 30 niveles gratuitos por temporada
     · Tienda: todo el catálogo, siempre (de jugador y de Nexito)
     · Colección: solo los cosméticos que ya tienes, para equipar
   Los Rombos se ganan en Logros (logros, misiones y rachas).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $$, pct, formatNumber } = Nexus.util;
    const C = Nexus.ui.components;
    const RW = () => Nexus.services.rewards;
    const CEL = () => Nexus.ui.celebrate;
    const TABS = [['pase', 'Pase de batalla', '🎖️'], ['tienda', 'Tienda', '🛍'], ['coleccion', 'Colección', '🎨']];
    const rombos = (n) => `<span class="rw-amount">${CEL().diamond(16)}${formatNumber(n)}</span>`;
    let family = 'all';

    /** Vista previa de un cosmético. */
    function preview(it) {
        const k = it.kind;
        if (/^pet-/.test(k) && Nexus.ui.nexito) return `<span class="rw-prev pet${k === 'pet-dome' ? ' dome' : ''}">${Nexus.ui.nexito.mini({ outfit: { [k]: it.id }, mood: 'happy', scene: k === 'pet-dome' })}</span>`;
        if (k === 'frame') return `<span class="rw-prev frame">${Nexus.ui.avatar.user(Object.assign({}, Nexus.services.users.current(), { frame: it.id }), 'lg')}</span>`;
        if (k === 'title') return `<span class="rw-prev title"><span class="rw-title-chip">${esc(it.name)}</span></span>`;
        if (k === 'avatar') return `<span class="rw-prev avatar">${Nexus.ui.avatar.html(it.id.slice(3), { size: 256 })}</span>`;
        if (k === 'banner') return `<span class="rw-prev banner b-${esc(it.id)}"></span>`;
        return '<span class="rw-prev"></span>';
    }
    Nexus.ui.rewardPreview = preview;

    Nexus.ui.pages.cosmetics = {
        title: 'Cosméticos',

        render(root) {
            let tab = TABS.some(t => t[0] === Nexus.ui.cosmeticsTab) ? Nexus.ui.cosmeticsTab : 'pase';
            Nexus.ui.cosmeticsTab = null;

            const head = () => {
                const s = RW().seasonState(), owned = RW().data().cosmetics.owned.length;
                return `
                    <div class="page-head ach-page-head"><div><h2 class="page-title">Cosméticos</h2>
                        <p class="page-sub">Pase de batalla nivel ${s.level}/${s.max} · ${owned} cosmético${owned === 1 ? '' : 's'} en tu colección</p></div>
                        <a class="rw-wallet" href="#/achievements" title="Gana Rombos con logros, misiones y rachas">${rombos(RW().balance())}<small>Rombos</small></a></div>
                    <nav class="rw-tabs" role="tablist" aria-label="Secciones de cosméticos">
                        ${TABS.map(([id, label, ic]) => `<button type="button" role="tab" class="rw-tab${id === tab ? ' active' : ''}" data-tab="${id}" aria-selected="${id === tab}"><span aria-hidden="true">${ic}</span>${label}</button>`).join('')}
                    </nav>`;
            };

            // ── Pase de batalla ──
            const drawPase = () => {
                const s = RW().seasonState();
                return `
                    <section class="rw-season-head card-surface">
                        <div><span class="rw-kicker">Pase de batalla · gratuito para todos</span><h3>Temporada ${s.id}</h3>
                            <p class="muted">Del ${esc(s.start.split('-').reverse().join('/'))} al ${esc(s.end.split('-').reverse().join('/'))} · quedan ${s.daysLeft} días</p></div>
                        <div class="rw-season-lv"><b>${s.level}</b><small>/ ${s.max}</small></div>
                        <div class="rw-season-bar">${C.progressBar(pct(s.into, s.cost))}<small>${s.level >= s.max ? '¡Pase completado!' : `${s.into} / ${s.cost} Rombos para el nivel ${s.level + 1}`}</small></div>
                        <p class="muted small">Cada Rombo que ganas esta temporada (logros, misiones, rachas) cuenta para el pase. Los 30 niveles son gratuitos y todos tienen premio; lo que no consigas volverá a la tienda más adelante.</p>
                    </section>
                    <div class="rw-track">${RW().SEASON_REWARDS.map((rw, i) => {
                        const lv = i + 1, got = s.level >= lv;
                        const it = typeof rw === 'object' ? null : RW().item(rw);
                        return `<div class="rw-tier${got ? ' got' : ''}${lv === s.level + 1 ? ' next' : ''}">
                            <span class="rw-tier-n">${lv}</span>
                            ${it ? preview(it) : `<span class="rw-prev rombos">${CEL().diamond(30)}</span>`}
                            <b>${it ? esc(it.name) : `${rw.rombos} Rombos`}</b><small>${it ? esc(RW().KINDS[it.kind] || '') : 'Para la tienda'}</small>
                            ${got ? '<i class="rw-check">✓</i>' : ''}</div>`;
                    }).join('')}</div>`;
            };

            const familyBar = () => `<div class="segmented rw-family" role="group" aria-label="Tipo de cosmético">
                ${[['all', 'Todo', '✨']].concat(RW().GROUPS.map(g => [g.id, g.name, g.icon])).map(([id, label, ic]) => `<button type="button" data-family="${id}" class="${family === id ? 'active' : ''}">${ic} ${label}</button>`).join('')}</div>`;
            const groups = () => RW().GROUPS.filter(g => family === 'all' || g.id === family);

            // ── Tienda: todo el catálogo, siempre ──
            const drawTienda = () => {
                const bal = RW().balance(), all = RW().shopItems();
                const card = (it) => {
                    const own = RW().owns(it.id);
                    return `<div class="rw-item${own ? ' owned' : ''}${!own && !it.price ? ' earn' : ''}" data-item="${esc(it.id)}">${preview(it)}<b>${esc(it.name)}</b><small>${esc(it.desc)}</small>
                        ${own ? '<span class="rw-ok">✓ Ya es tuyo</span>'
                            : it.price ? `<button type="button" class="btn ${bal >= it.price ? 'btn-primary' : 'btn-ghost'} btn-sm" data-buy="${esc(it.id)}">${rombos(it.price)}</button>`
                            : '<span class="rw-earn">🏅 Se consigue jugando</span>'}</div>`;
                };
                return `
                    <section class="section">
                        <div class="rw-shop-head"><h3 class="section-title"><span>🛍</span> Tienda <small class="muted">${all.length} cosméticos · siempre disponibles</small></h3>${familyBar()}</div>
                        <p class="muted small">Todo es cosmético. Lo comprado se equipa en Colección. Lo que no tiene precio se gana con logros, rachas de Nexito, el pase o eventos. Tienes ${rombos(bal)}.</p>
                        ${groups().map(g => `<h3 class="rw-family-title"><span>${g.icon}</span> ${esc(g.name)}</h3>` + g.kinds.map(k => {
                            const list = all.filter(it => it.kind === k);
                            const own = list.filter(it => RW().owns(it.id)).length;
                            return `<h4 class="rw-kind-title">${esc(RW().KINDS[k])} <small class="muted">${own}/${list.length}</small></h4><div class="rw-shop">${list.map(card).join('')}</div>`;
                        }).join('')).join('')}
                    </section>
                    <section class="section card-surface"><h3 class="section-title"><span>🧾</span> Últimos movimientos</h3>
                        ${(RW().data().log || []).length ? `<ul class="rw-log">${RW().data().log.slice(0, 10).map(l => `<li><span>${esc(l.why)}</span><b class="${l.n < 0 ? 'neg' : ''}">${l.n > 0 ? '+' : ''}${formatNumber(l.n)}</b></li>`).join('')}</ul>` : '<p class="muted">Todavía no has ganado Rombos. Juega, completa misiones y desbloquea logros.</p>'}</section>`;
            };

            // ── Colección: solo lo que ya tienes ──
            const drawColeccion = () => {
                const owned = RW().data().cosmetics.owned.map(id => RW().item(id)).filter(it => it && RW().KINDS[it.kind]);
                const body = groups().map(g => `<h3 class="rw-family-title"><span>${g.icon}</span> ${esc(g.name)}</h3>` + g.kinds.map(k => {
                    const list = owned.filter(it => it.kind === k);
                    const eq = RW().equipped(k), canEquip = k !== 'avatar';
                    if (!list.length) return `<h4 class="rw-kind-title">${esc(RW().KINDS[k])}</h4><p class="muted small rw-empty">Aún no tienes ninguno. <a href="#/cosmetics" data-goto-shop>Ver en la tienda</a></p>`;
                    return `<h4 class="rw-kind-title">${esc(RW().KINDS[k])} <small class="muted">${list.length}</small></h4>
                        <div class="rw-shop">${canEquip ? `<div class="rw-item${!eq ? ' equipped' : ''}"><span class="rw-prev none">—</span><b>Ninguno</b><small>Por defecto</small>${eq ? `<button type="button" class="btn btn-ghost btn-sm" data-equip="${k}" data-id="">Usar</button>` : '<span class="rw-ok">En uso</span>'}</div>` : ''}
                            ${list.map(it => {
                                const on = eq === it.id;
                                return `<div class="rw-item${on ? ' equipped' : ''}" data-item="${esc(it.id)}">${preview(it)}<b>${esc(it.name)}</b><small>${esc(it.desc)}</small>
                                    ${!canEquip ? '<button type="button" class="btn btn-ghost btn-sm" data-avatar-pick>Elegir icono</button>'
                                        : on ? '<span class="rw-ok">En uso</span>' : `<button type="button" class="btn btn-primary btn-sm" data-equip="${k}" data-id="${esc(it.id)}">Usar</button>`}</div>`;
                            }).join('')}</div>`;
                }).join('')).join('');
                return `<section class="section"><div class="rw-shop-head"><h3 class="section-title"><span>🎨</span> Tu colección <small class="muted">${owned.length} cosmético${owned.length === 1 ? '' : 's'}</small></h3>${familyBar()}</div>${body}</section>`;
            };

            const draw = () => {
                const body = { pase: drawPase, tienda: drawTienda, coleccion: drawColeccion }[tab]();
                root.innerHTML = `<div class="page-body ach-page cos-page">${head()}<div class="rw-panel" role="tabpanel">${body}</div></div>`;
                bind();
            };

            const bind = () => {
                $$('[data-tab]', root).forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; Nexus.audio.play('click'); draw(); }));
                $$('[data-buy]', root).forEach(b => b.addEventListener('click', () => {
                    const r = RW().buy(b.dataset.buy);
                    if (r.ok) { Nexus.audio.play('orbCollect'); Nexus.ui.toast(`¡${r.item.name} es tuyo! Equípalo en Colección`, { type: 'success' }); }
                    else Nexus.ui.toast(r.error, { type: 'warn' });
                    draw();
                }));
                $$('[data-equip]', root).forEach(b => b.addEventListener('click', () => {
                    if (RW().equip(b.dataset.equip, b.dataset.id)) { Nexus.ui.toast('Equipado', { type: 'success' }); draw(); }
                }));
                $$('[data-family]', root).forEach(b => b.addEventListener('click', () => { family = b.dataset.family; Nexus.audio.play('click'); draw(); }));
                $$('[data-goto-shop]', root).forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); tab = 'tienda'; draw(); }));
                $$('[data-avatar-pick]', root).forEach(b => b.addEventListener('click', () => Nexus.ui.avatarPicker.open()));
            };

            const onChange = () => { if (root.isConnected) draw(); };
            Nexus.bus.on('rewards:change', onChange);
            draw();
            return () => { Nexus.bus.off && Nexus.bus.off('rewards:change', onChange); };
        }
    };
})();
