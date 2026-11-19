/* ============================================================
   NEXUS ARCADE · ui/pages/profile.js — Perfil
   Avatar y color, contraseña, estado de sincronización,
   reinicio de progreso y borrado de la cuenta.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatDuration, formatDate } = Nexus.util;
    const C = Nexus.ui.components;
    const users = () => Nexus.services.users;

    /** Ejecuta una operación asíncrona de un modal mostrando el error en línea. */
    async function attempt(api, err, fn) {
        try { await fn(); api.close(true); return true; }
        catch (e) { err.textContent = e.message || 'No se pudo completar la operación.'; err.hidden = false; return false; }
    }

    /** Selector de avatares a pantalla completa; al guardar se vuelve a pintar el perfil. */
    function openEdit(user, rerender) {
        Nexus.ui.avatarPicker.open().then((saved) => { if (saved) rerender(); });
    }

    function openPassword(rerender) {
        const body = document.createElement('div');
        body.innerHTML = `
            <label class="field"><span class="field-label">Contraseña actual</span>
                <input class="input" id="pw-cur" type="password" autocomplete="current-password" /></label>
            <label class="field"><span class="field-label">Nueva contraseña <small>(mínimo ${users().limits.PASS_MIN} caracteres)</small></span>
                <input class="input" id="pw-new" type="password" autocomplete="new-password" /></label>
            <label class="field"><span class="field-label">Repite la nueva contraseña</span>
                <input class="input" id="pw-new2" type="password" autocomplete="new-password" /></label>
            <p class="form-error" role="alert" hidden></p>`;
        const err = $('.form-error', body);

        const m = Nexus.ui.modal.open({
            title: 'Cambiar contraseña', icon: '🔐', className: 'modal-sm', body,
            actions: [
                { label: 'Cancelar', kind: 'ghost' },
                { label: 'Guardar contraseña', kind: 'primary', keepOpen: true, onClick: async (api) => {
                    const cur = $('#pw-cur', body).value, n1 = $('#pw-new', body).value, n2 = $('#pw-new2', body).value;
                    err.hidden = true;
                    const fail = (t) => { err.textContent = t; err.hidden = false; return false; };
                    if (!cur) return fail('Escribe tu contraseña actual.');
                    if (n1 !== n2) return fail('Las contraseñas nuevas no coinciden.');
                    const ok = await attempt(api, err, () => users().changePassword(cur, n1));
                    if (ok) Nexus.ui.toast('Contraseña actualizada', { type: 'success' });
                    return false;
                } }
            ]
        });
        body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); m.el.querySelector('.modal-buttons .btn:last-child').click(); } });
    }

    function openDelete() {
        const body = document.createElement('div');
        body.innerHTML = `
            <p class="modal-text left">Se borrarán tu cuenta, tu progreso, tus logros y tu puesto en el ranking. No se puede deshacer.</p>
            <label class="field"><span class="field-label">Escribe tu contraseña para confirmar</span>
                <input class="input" id="del-pw" type="password" autocomplete="current-password" /></label>
            <p class="form-error" role="alert" hidden></p>`;
        const err = $('.form-error', body);
        const m = Nexus.ui.modal.open({
            title: 'Eliminar cuenta', icon: '🗑️', className: 'modal-sm', body,
            actions: [
                { label: 'Cancelar', kind: 'ghost' },
                { label: 'Eliminar para siempre', kind: 'danger', keepOpen: true, onClick: async (api) => {
                    const pw = $('#del-pw', body).value;
                    err.hidden = true;
                    if (!pw) { err.textContent = 'Escribe tu contraseña.'; err.hidden = false; return false; }
                    const ok = await attempt(api, err, () => users().deleteAccount(pw));
                    if (ok) Nexus.ui.toast('Cuenta eliminada', { icon: '🗑️' });
                    return false;
                } }
            ]
        });
        body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); m.el.querySelector('.modal-buttons .btn:last-child').click(); } });
    }

    const SYNC_TEXT = { synced: '✅ Sincronizada con el servidor', pending: '⏳ Cambios pendientes de guardar', syncing: '🔄 Guardando…',
        offline: '📡 Sin conexión: se guardará al volver', error: '⚠️ Error al guardar', idle: '' };

    Nexus.ui.pages.profile = {
        title: 'Perfil',

        render(root) {
            const rerender = () => { Nexus.ui.sidebar.renderUser(); this.render(root); };
            const U = users();
            const user = U.current();
            const data = U.data();
            const lv = Nexus.services.progress.level();
            const A = Nexus.services.achievements;
            const local = Nexus.backend.kind === 'local';
            const recent = Object.entries(data.achievements).filter(([id]) => A.get(id)).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const RW = Nexus.services.rewards, showcase = RW ? RW.showcase() : [];

            root.innerHTML = `
                <div class="page-body">
                    <section class="profile-hero card-surface${RW && RW.equipped('banner') ? ' banner b-' + esc(RW.equipped('banner')) : ''}" style="--user-color:${esc(Nexus.ui.avatar.accent(user.avatar))}">
                        ${C.avatar(user, 'xl')}
                        <div class="profile-hero-info">
                            <h2>${esc(user.name)}</h2>
                            ${RW && RW.title() ? `<span class="rw-title-chip">${esc(RW.title())}</span>` : ''}
                            <p class="muted">${esc(lv.rank.icon)} ${esc(lv.rank.name)} · Nivel ${lv.level} · Miembro desde ${esc(formatDate(user.createdAt))}</p>
                            ${C.progressBar(lv.pct)}
                            <small class="muted">${formatNumber(lv.xp)} / ${formatNumber(lv.next)} XP · ${formatNumber(lv.total)} XP totales · ${esc(formatDuration(data.meta.playTime))} jugados</small>
                        </div>
                        <div class="pf-hero-side">
                            <a class="rw-wallet" href="#/cosmetics" data-cos-tab="tienda" title="Rombos">${Nexus.ui.celebrate.diamond(18)}<b>${formatNumber(RW ? RW.balance() : 0)}</b><small>Rombos</small></a>
                            <button class="btn btn-ghost" id="pf-edit" type="button">✏️ Cambiar avatar</button>
                            <a class="btn btn-ghost" href="#/cosmetics" data-cos-tab="coleccion">🎨 Personalizar</a>
                        </div>
                    </section>

                    <section class="section card-surface pf-showcase">
                        <div class="section-head"><h2 class="section-title"><span>⭐</span> Escaparate</h2>
                            <span class="muted small">${formatNumber(A.points())} puntos de logro</span></div>
                        ${showcase.length ? `<div class="pf-show">${showcase.map(id => { const d = A.get(id); return `<div class="pf-show-item rarity-${esc(d.rarity)}">${Nexus.ui.celebrate.badge(d, 'lg')}<b>${esc(d.name)}</b><small>${esc(A.RARITY[d.rarity].label)}</small></div>`; }).join('')}</div>`
                            : C.empty('⭐', 'Tu escaparate está vacío', 'En Logros, pulsa ☆ en hasta 3 logros conseguidos para enseñarlos aquí, en el ranking y en las salas online.')}
                    </section>

                    <section class="section card-surface">
                        <div class="section-head"><h2 class="section-title"><span>🏅</span> Logros destacados</h2>
                            <a class="link" href="#/achievements">${A.countUnlocked()}/${A.visible().length} · Ver todos</a></div>
                        ${recent.length ? `<div class="ach-list">${recent.map(([id, at]) => C.achievementCard(A.get(id), at, true)).join('')}</div>`
                            : C.empty('🏅', 'Sin logros aún', 'Juega para empezar tu colección.')}
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🔐</span> Cuenta y seguridad</h2>
                        <p class="muted" id="pf-sync">${local ? 'Modo local: tu cuenta vive sólo en este navegador.' : esc(SYNC_TEXT[U.sync] || '')}</p>
                        <div class="btn-row">
                            <button class="btn btn-ghost" id="pf-pass" type="button">Cambiar contraseña</button>
                            <button class="btn btn-ghost" id="pf-logout" type="button">Cerrar sesión</button>
                        </div>
                    </section>

                    <section class="section card-surface danger-zone">
                        <h2 class="section-title"><span>⚠️</span> Zona de peligro</h2>
                        <div class="btn-row">
                            <button class="btn btn-danger-ghost" id="pf-reset" type="button">Reiniciar progreso</button>
                            <button class="btn btn-danger-ghost" id="pf-delete" type="button">Eliminar cuenta</button>
                        </div>
                    </section>
                </div>`;

            const on = (id, fn) => { const el = $('#' + id, root); if (el) el.addEventListener('click', fn); };
            on('pf-edit', () => openEdit(user, rerender));
            $$('[data-cos-tab]', root).forEach(a => a.addEventListener('click', () => { Nexus.ui.cosmeticsTab = a.dataset.cosTab; }));
            on('pf-pass', () => openPassword(rerender));
            on('pf-logout', () => Nexus.app.logout());
            on('pf-reset', async () => {
                const ok = await Nexus.ui.modal.confirm({
                    title: 'Reiniciar progreso', icon: '♻️', danger: true, confirmLabel: 'Reiniciar',
                    message: 'Se borrarán tus estadísticas, historial, XP y logros (también en el ranking). Tus ajustes y tu cuenta se mantienen.'
                });
                if (ok) { U.resetProgress(); Nexus.ui.toast('Progreso reiniciado', { icon: '♻️' }); rerender(); }
            });
            on('pf-delete', openDelete);

            const off = Nexus.bus.on('sync:state', () => { const el = $('#pf-sync', root); if (el && !local) el.textContent = SYNC_TEXT[U.sync] || ''; });
            return () => off();
        }
    };
})();
