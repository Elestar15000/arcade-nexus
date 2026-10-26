/* ============================================================
   NEXUS ARCADE · ui/auth.js
   Pantalla de selección de perfil: elegir usuario, crear uno
   nuevo, entrar como invitado e importar copias de seguridad.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, timeAgo } = Nexus.util;
    const users = () => Nexus.services.users;

    // ── Formulario de nuevo perfil ───────────────────────────
    function openCreateProfile(onCreated) {
        const U = users();
        const picker = Nexus.ui.components.avatarColorPicker(U.AVATARS[0], U.COLORS[0]);

        const body = document.createElement('div');
        body.className = 'profile-form';
        body.innerHTML = `
            <label class="field">
                <span class="field-label">Nombre</span>
                <input class="input" id="pf-name" type="text" maxlength="${U.limits.NAME_MAX}" autocomplete="off" placeholder="Tu nombre de jugador" />
            </label>
            <div data-slot="picker"></div>
            <div class="field-row">
                <label class="field">
                    <span class="field-label">Contraseña <small>(opcional)</small></span>
                    <input class="input" id="pf-pass" type="password" autocomplete="new-password" />
                </label>
                <label class="field">
                    <span class="field-label">Repetir</span>
                    <input class="input" id="pf-pass2" type="password" autocomplete="new-password" />
                </label>
            </div>
            <p class="field-hint">La contraseña sólo protege el perfil en este dispositivo. Si la olvidas no se puede recuperar.</p>
            <p class="field-error" role="alert" hidden></p>`;

        const err = $('.field-error', body);
        $('[data-slot="picker"]', body).replaceWith(picker.el);

        const submit = (api) => {
            const name = $('#pf-name', body).value;
            const p1 = $('#pf-pass', body).value, p2 = $('#pf-pass2', body).value;
            let msg = U.validateName(name) || U.validatePassword(p1);
            if (!msg && p1 !== p2) msg = 'Las contraseñas no coinciden.';
            if (msg) { err.textContent = msg; err.hidden = false; return false; }
            try {
                const user = U.create({ name, ...picker.get(), password: p1 });
                api.close(user);
                if (onCreated) onCreated(user, p1);
            } catch (e) { err.textContent = e.message; err.hidden = false; return false; }
        };

        const m = Nexus.ui.modal.open({
            title: 'Nuevo perfil', icon: '✨', className: 'modal-form', body,
            actions: [
                { label: 'Cancelar', kind: 'ghost', value: null },
                { label: 'Crear perfil', kind: 'primary', keepOpen: true, onClick: submit }
            ]
        });
        body.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submit(m); }
        });
        return m;
    }

    // ── Pantalla principal ───────────────────────────────────
    const Auth = {
        openCreateProfile,

        show() {
            const el = $('#auth-screen');
            $('#shell').hidden = true;
            el.hidden = false;
            this.render();
        },

        hide() { $('#auth-screen').hidden = true; },

        render() {
            const el = $('#auth-screen');
            const list = users().list().sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));

            const cards = list.map(u => `
                <button class="profile-pick" type="button" data-id="${esc(u.id)}" style="--user-color:${esc(u.color)}">
                    <span class="profile-pick-avatar">${esc(u.avatar)}${u.hasPassword ? '<span class="lock-badge" title="Protegido con contraseña">🔒</span>' : ''}</span>
                    <span class="profile-pick-name">${esc(u.name)}</span>
                    <span class="profile-pick-meta">${u.lastLoginAt ? esc(timeAgo(u.lastLoginAt)) : 'Nuevo'}</span>
                </button>`).join('');

            el.innerHTML = `
                <div class="auth-inner">
                    <div class="auth-brand"><span class="logo-diamond">◆</span>
                        <span><span class="logo-title">NEXUS</span> <span class="logo-sub">ARCADE</span></span></div>
                    <h1 class="auth-title">${list.length ? '¿Quién juega?' : '¡Bienvenido!'}</h1>
                    <p class="auth-sub">${list.length
                        ? 'Elige tu perfil o crea uno nuevo. Todo se guarda en este navegador.'
                        : 'Crea tu primer perfil para guardar tu progreso, logros y récords en este navegador.'}</p>
                    <div class="profile-grid">
                        ${cards}
                        <button class="profile-pick profile-add" type="button" id="auth-add">
                            <span class="profile-pick-avatar">＋</span>
                            <span class="profile-pick-name">Nuevo perfil</span>
                            <span class="profile-pick-meta">&nbsp;</span>
                        </button>
                    </div>
                    ${list.length ? `<label class="check"><input type="checkbox" id="auth-remember" checked /> Recordarme en este dispositivo</label>` : ''}
                    <div class="auth-actions">
                        <button class="btn btn-ghost" type="button" id="auth-guest">👤 Jugar como invitado</button>
                        <button class="btn btn-ghost" type="button" id="auth-import">📥 Importar copia de seguridad</button>
                        <input type="file" id="auth-file" accept="application/json,.json" hidden />
                    </div>
                    ${Nexus.storage.volatile ? '<p class="auth-warning">⚠️ Tu navegador bloquea el almacenamiento local: los perfiles se perderán al cerrar la pestaña.</p>' : ''}
                </div>`;

            el.querySelectorAll('.profile-pick[data-id]').forEach(b =>
                b.addEventListener('click', () => this.pick(b.dataset.id)));
            $('#auth-add', el).addEventListener('click', () => openCreateProfile((user, pw) => this.finishLogin(user.id, pw)));
            $('#auth-guest', el).addEventListener('click', () => users().loginGuest());
            $('#auth-import', el).addEventListener('click', () => $('#auth-file', el).click());
            $('#auth-file', el).addEventListener('change', (e) => this.importFile(e.target.files[0]));
            const first = el.querySelector('.profile-pick');
            if (first) first.focus({ preventScroll: true });
        },

        remember() {
            const cb = $('#auth-remember');
            return cb ? cb.checked : true;
        },

        pick(id) {
            const user = users().get(id);
            if (!user) return this.render();
            if (!user.hasPassword) return this.finishLogin(id, '');
            Nexus.ui.modal.prompt({
                title: `Hola, ${user.name}`, icon: user.avatar, label: 'Contraseña', type: 'password',
                confirmLabel: 'Entrar',
                validate: (pw) => users().verify(id, pw) ? null : 'Contraseña incorrecta.'
            }).then(pw => { if (pw !== null) this.finishLogin(id, pw); });
        },

        finishLogin(id, password, remember) {
            try { users().login(id, password, { remember: remember === undefined ? this.remember() : remember }); }
            catch (e) { Nexus.ui.toast(e.message, { type: 'error' }); }
        },

        importFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const names = users().importBackup(JSON.parse(reader.result));
                    Nexus.ui.toast(`Importado: ${names.join(', ')}`, { type: 'success' });
                    this.render();
                } catch (e) {
                    Nexus.ui.toast(e.message || 'No se pudo leer el archivo.', { type: 'error', duration: 5000 });
                }
            };
            reader.onerror = () => Nexus.ui.toast('No se pudo leer el archivo.', { type: 'error' });
            reader.readAsText(file);
        }
    };

    Nexus.ui.auth = Auth;
})();
