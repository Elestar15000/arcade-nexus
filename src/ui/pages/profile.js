/* ============================================================
   NEXUS ARCADE · ui/pages/profile.js — Perfil
   Editar nombre/avatar/color, contraseña, exportar y borrar.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, formatNumber, formatDuration, formatDate, download } = Nexus.util;
    const C = Nexus.ui.components;
    const users = () => Nexus.services.users;

    function openEdit(user, rerender) {
        const body = document.createElement('div');
        body.innerHTML = `
            <label class="field"><span class="field-label">Nombre</span>
                <input class="input" id="pe-name" maxlength="${users().limits.NAME_MAX}" autocomplete="off" value="${esc(user.name)}" /></label>
            <div data-slot="picker"></div>
            <p class="field-error" role="alert" hidden></p>`;
        const picker = C.avatarColorPicker(user.avatar, user.color);
        $('[data-slot="picker"]', body).replaceWith(picker.el);
        const err = $('.field-error', body);

        const m = Nexus.ui.modal.open({
            title: 'Editar perfil', icon: '✏️', className: 'modal-form', body,
            actions: [
                { label: 'Cancelar', kind: 'ghost' },
                { label: 'Guardar', kind: 'primary', keepOpen: true, onClick: (api) => {
                    try {
                        users().update(user.id, { name: $('#pe-name', body).value, ...picker.get() });
                        api.close(true);
                        Nexus.ui.toast('Perfil actualizado', { type: 'success' });
                        rerender();
                    } catch (e) { err.textContent = e.message; err.hidden = false; return false; }
                } }
            ]
        });
        body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); m.el.querySelector('.btn-primary').click(); } });
    }

    function openPassword(user, rerender, removing) {
        const body = document.createElement('div');
        body.innerHTML = `
            ${user.hasPassword ? `<label class="field"><span class="field-label">Contraseña actual</span>
                <input class="input" id="pw-cur" type="password" autocomplete="current-password" /></label>` : ''}
            ${removing ? '' : `
            <label class="field"><span class="field-label">Nueva contraseña</span>
                <input class="input" id="pw-new" type="password" autocomplete="new-password" /></label>
            <label class="field"><span class="field-label">Repetir contraseña</span>
                <input class="input" id="pw-new2" type="password" autocomplete="new-password" /></label>`}
            <p class="field-error" role="alert" hidden></p>`;
        const err = $('.field-error', body);

        const m = Nexus.ui.modal.open({
            title: removing ? 'Quitar contraseña' : (user.hasPassword ? 'Cambiar contraseña' : 'Añadir contraseña'),
            icon: '🔐', className: 'modal-sm', body,
            actions: [
                { label: 'Cancelar', kind: 'ghost' },
                { label: 'Guardar', kind: removing ? 'danger' : 'primary', keepOpen: true, onClick: (api) => {
                    const cur = $('#pw-cur', body) ? $('#pw-cur', body).value : '';
                    const n1 = removing ? '' : $('#pw-new', body).value;
                    const n2 = removing ? '' : $('#pw-new2', body).value;
                    if (!removing && !n1) { err.textContent = 'Escribe la nueva contraseña.'; err.hidden = false; return false; }
                    if (n1 !== n2) { err.textContent = 'Las contraseñas no coinciden.'; err.hidden = false; return false; }
                    try {
                        users().setPassword(user.id, cur, n1);
                        api.close(true);
                        Nexus.ui.toast(removing ? 'Contraseña eliminada' : 'Contraseña guardada', { type: 'success' });
                        rerender();
                    } catch (e) { err.textContent = e.message; err.hidden = false; return false; }
                } }
            ]
        });
        body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); m.el.querySelector('.modal-buttons .btn:last-child').click(); } });
    }

    async function deleteProfile(user) {
        const ok = await Nexus.ui.modal.confirm({
            title: 'Eliminar perfil', icon: '🗑️', danger: true, confirmLabel: 'Eliminar para siempre',
            message: `Se borrarán el perfil "${user.name}", su progreso, logros y estadísticas. Esta acción no se puede deshacer.`
        });
        if (!ok) return;
        let pw = '';
        if (user.hasPassword) {
            pw = await Nexus.ui.modal.prompt({
                title: 'Confirma tu contraseña', label: 'Contraseña', type: 'password', confirmLabel: 'Eliminar',
                validate: (v) => users().verify(user.id, v) ? null : 'Contraseña incorrecta.'
            });
            if (pw === null) return;
        }
        try { users().remove(user.id, pw); Nexus.ui.toast('Perfil eliminado', { icon: '🗑️' }); }
        catch (e) { Nexus.ui.toast(e.message, { type: 'error' }); }
    }

    function saveGuestProgress() {
        const guestData = users().data();
        Nexus.ui.auth.openCreateProfile((user, pw) => {
            users().login(user.id, pw, { remember: true });
            users().adoptData(guestData);
            Nexus.ui.toast('¡Perfil creado! Tu progreso de invitado se ha guardado.', { type: 'success' });
            Nexus.ui.router.render();
        });
    }

    Nexus.ui.pages.profile = {
        title: 'Perfil',

        render(root) {
            const rerender = () => { Nexus.ui.sidebar.renderUser(); this.render(root); };
            const U = users();
            const user = U.current();
            const data = U.data();
            const lv = Nexus.services.progress.level();
            const A = Nexus.services.achievements;
            const guest = U.isGuest();
            const recent = Object.entries(data.achievements).filter(([id]) => A.get(id)).sort((a, b) => b[1] - a[1]).slice(0, 6);

            root.innerHTML = `
                <div class="page-body">
                    <section class="profile-hero card-surface" style="--user-color:${esc(user.color)}">
                        ${C.avatar(user, 'xl')}
                        <div class="profile-hero-info">
                            <h2>${esc(user.name)}${guest ? ' <span class="chip">Invitado</span>' : ''}</h2>
                            <p class="muted">${esc(lv.rank.icon)} ${esc(lv.rank.name)} · Nivel ${lv.level}${guest ? '' : ` · Miembro desde ${esc(formatDate(user.createdAt))}`}</p>
                            ${C.progressBar(lv.pct)}
                            <small class="muted">${formatNumber(lv.xp)} / ${formatNumber(lv.next)} XP · ${formatNumber(lv.total)} XP totales · ${esc(formatDuration(data.meta.playTime))} jugados</small>
                        </div>
                        ${guest ? '<button class="btn btn-primary" id="pf-save-guest">💾 Guardar mi progreso</button>'
                            : '<button class="btn btn-ghost" id="pf-edit">✏️ Editar perfil</button>'}
                    </section>

                    ${guest ? `<div class="banner banner-info"><span>👤 Como invitado, tu progreso vive sólo en esta sesión. Crea un perfil y se conservará todo lo que has conseguido hasta ahora.</span></div>` : ''}

                    <section class="section card-surface">
                        <div class="section-head"><h2 class="section-title"><span>🏅</span> Logros destacados</h2>
                            <a class="link" href="#/achievements">${A.countUnlocked()}/${A.all().length} · Ver todos</a></div>
                        ${recent.length ? `<div class="ach-list">${recent.map(([id, at]) => C.achievementCard(A.get(id), at, true)).join('')}</div>`
                            : C.empty('🏅', 'Sin logros aún', 'Juega para empezar tu colección.')}
                    </section>

                    ${guest ? '' : `
                    <section class="section card-surface">
                        <h2 class="section-title"><span>🔐</span> Seguridad</h2>
                        <p class="muted">${user.hasPassword ? 'Tu perfil está protegido con contraseña.' : 'Tu perfil no tiene contraseña: cualquiera que use este navegador puede entrar.'}</p>
                        <div class="btn-row">
                            <button class="btn btn-ghost" id="pf-pass">${user.hasPassword ? 'Cambiar contraseña' : 'Añadir contraseña'}</button>
                            ${user.hasPassword ? '<button class="btn btn-ghost" id="pf-pass-rm">Quitar contraseña</button>' : ''}
                        </div>
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>💾</span> Tus datos</h2>
                        <p class="muted">Descarga una copia de este perfil (progreso, logros, ajustes) para guardarla o moverla a otro navegador.</p>
                        <div class="btn-row"><button class="btn btn-ghost" id="pf-export">📤 Exportar perfil</button></div>
                    </section>

                    <section class="section card-surface danger-zone">
                        <h2 class="section-title"><span>⚠️</span> Zona de peligro</h2>
                        <div class="btn-row">
                            <button class="btn btn-danger-ghost" id="pf-reset">Reiniciar progreso</button>
                            <button class="btn btn-danger-ghost" id="pf-delete">Eliminar perfil</button>
                        </div>
                    </section>`}
                </div>`;

            const on = (id, fn) => { const el = $('#' + id, root); if (el) el.addEventListener('click', fn); };
            on('pf-edit', () => openEdit(user, rerender));
            on('pf-save-guest', saveGuestProgress);
            on('pf-pass', () => openPassword(user, rerender, false));
            on('pf-pass-rm', () => openPassword(user, rerender, true));
            on('pf-export', () => {
                const safe = user.name.replace(/[^\w-]+/g, '_');
                download(`nexus-arcade-${safe}.json`, JSON.stringify(U.exportUser(user.id), null, 2));
                Nexus.ui.toast('Perfil exportado', { type: 'success' });
            });
            on('pf-reset', async () => {
                const ok = await Nexus.ui.modal.confirm({
                    title: 'Reiniciar progreso', icon: '♻️', danger: true, confirmLabel: 'Reiniciar',
                    message: 'Se borrarán tus estadísticas, historial, XP y logros. Tus ajustes y tu perfil se mantienen.'
                });
                if (ok) { U.resetProgress(); Nexus.ui.toast('Progreso reiniciado', { icon: '♻️' }); rerender(); }
            });
            on('pf-delete', () => deleteProfile(user));
        }
    };
})();
