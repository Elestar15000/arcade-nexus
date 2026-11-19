/* ============================================================
   NEXUS ARCADE · ui/pages/cosmetics.js — Cosméticos
   Pestañas:
     · Pase de batalla: 30 niveles gratuitos por temporada
     · Tienda: 6 artículos que rotan cada lunes
     · Colección: cosméticos propios, para equipar
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
    const untilMonday = () => { const d = new Date(); const days = (8 - d.getDay()) % 7 || 7; return days === 1 ? 'mañana' : `en ${days} días`; };

    /** Vista previa de un cosmético. */
    function preview(it) {
        const k = it.kind;
        if (/^pet-/.test(k) && Nexus.ui.nexito) return `<span class="rw-prev pet">${Nexus.ui.nexito.mini({ outfit: { [k]: it.id }, mood: 'happy', scene: k === 'pet-dome' || k === 'pet-base' })}</span>`;
        if (k === 'frame') return `<span class="rw-prev frame">${Nexus.ui.avatar.user(Object.assign({}, Nexus.services.users.current(), { frame: it.id }), 'lg')}</span>`;
        if (k === 'title') return `<span class="rw-prev title"><span class="rw-title-chip">${esc(it.name)}</span></span>`;
        if (k === 'avatar') return `<span class="rw-prev avatar">${Nexus.ui.avatar.html(it.id.slice(3), { size: 256 })}</span>`;
        if (k === 'theme') return `<span class="rw-prev theme t-${esc(it.id)}"><i></i><i></i><i></i></span>`;
        if (k === 'particles') return `<span class="rw-prev particles p-${esc(it.id)}"></span>`;
        if (k === 'banner') return `<span class="rw-prev banner b-${esc(it.id)}"></span>`;
        if (it.palette) return `<span class="rw-prev swatch">${Object.values(it.palette).map(c => `<i style="background:${esc(c)}"></i>`).join('')}</span>`;
        if (it.colors) return `<span class="rw-prev swatch">${it.colors.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</span>`;
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

            // ── Tienda ──
            const drawTienda = () => {
                const items = RW().shopItems(), bal = RW().balance();
                return `
                    <section class="section">
                        <h3 class="section-title"><span>🛍</span> Tienda de la semana <small class="muted">cambia ${untilMonday()}</small></h3>
                        <p class="muted small">Todo es cosmético. Lo comprado se equipa en Colección. Tienes ${rombos(bal)}.</p>
                        <div class="rw-shop">${items.map(it => {
                            const own = RW().owns(it.id);
                            return `<div class="rw-item${own ? ' owned' : ''}">${preview(it)}<b>${esc(it.name)}</b><small>${esc(RW().KINDS[it.kind])} · ${esc(it.desc)}</small>
                                ${own ? '<span class="rw-ok">✓ Ya es tuyo</span>' : `<button type="button" class="btn ${bal >= it.price ? 'btn-primary' : 'btn-ghost'} btn-sm" data-buy="${esc(it.id)}">${rombos(it.price)}</button>`}</div>`;
                        }).join('')}</div>
                    </section>
                    <section class="section card-surface"><h3 class="section-title"><span>🧾</span> Últimos movimientos</h3>
                        ${(RW().data().log || []).length ? `<ul class="rw-log">${RW().data().log.slice(0, 10).map(l => `<li><span>${esc(l.why)}</span><b class="${l.n < 0 ? 'neg' : ''}">${l.n > 0 ? '+' : ''}${formatNumber(l.n)}</b></li>`).join('')}</ul>` : '<p class="muted">Todavía no has ganado Rombos. Juega, completa misiones y desbloquea logros.</p>'}</section>`;
            };

            // ── Colección ──
            const drawColeccion = () => {
                const kinds = Object.keys(RW().KINDS);
                return kinds.map(k => {
                    const all = RW().CATALOG.filter(c => c.kind === k);
                    const owned = RW().data().cosmetics.owned.filter(id => (RW().item(id) || {}).kind === k);
                    const masterTitles = k === 'title' ? owned.filter(id => /^t-master-/.test(id)).map(id => RW().item(id)) : [];
                    const list = all.concat(masterTitles);
                    const eq = RW().equipped(k);
                    const canEquip = k !== 'avatar';
                    return `<section class="section"><h3 class="section-title">${esc(RW().KINDS[k])} <small class="muted">${owned.length}/${list.length}</small></h3>
                        <div class="rw-shop">${canEquip ? `<div class="rw-item${!eq ? ' equipped' : ''}"><span class="rw-prev none">—</span><b>Ninguno</b><small>Por defecto</small>${eq ? `<button type="button" class="btn btn-ghost btn-sm" data-equip="${k}" data-id="">Usar</button>` : '<span class="rw-ok">En uso</span>'}</div>` : ''}
                            ${list.map(it => {
                                const own = RW().owns(it.id), on = eq === it.id;
                                return `<div class="rw-item${own ? '' : ' locked'}${on ? ' equipped' : ''}">${preview(it)}<b>${esc(it.name)}</b><small>${esc(it.desc)}</small>
                                    ${!own ? `<span class="muted small">🔒 ${it.price ? 'Tienda o pase' : 'Por conseguir'}</span>`
                                        : !canEquip ? '<button type="button" class="btn btn-ghost btn-sm" data-avatar-pick>Elegir avatar</button>'
                                        : on ? '<span class="rw-ok">En uso</span>' : `<button type="button" class="btn btn-primary btn-sm" data-equip="${k}" data-id="${esc(it.id)}">Usar</button>`}</div>`;
                            }).join('')}</div></section>`;
                }).join('');
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
                    if (RW().equip(b.dataset.equip, b.dataset.id)) { if (b.dataset.equip === 'theme') Nexus.services.settings.apply(); Nexus.ui.toast('Equipado', { type: 'success' }); draw(); }
                }));
                $$('[data-avatar-pick]', root).forEach(b => b.addEventListener('click', () => Nexus.ui.avatarPicker.open()));
            };

            const onChange = () => { if (root.isConnected) draw(); };
            Nexus.bus.on('rewards:change', onChange);
            draw();
            return () => { Nexus.bus.off && Nexus.bus.off('rewards:change', onChange); };
        }
    };
})();
