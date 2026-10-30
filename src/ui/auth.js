/* ============================================================
   NEXUS ARCADE · ui/auth.js
   Pantalla de acceso: iniciar sesión o crear cuenta.
   Cuenta con usuario y contraseña obligatorios; los datos viven en
   el servidor (o en este navegador si no hay servidor configurado).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $ } = Nexus.util;
    const users = () => Nexus.services.users;

    const STRENGTH_TEXT = ['', 'Muy débil', 'Podría ser mejor', 'Buena', 'Muy buena'];

    const Auth = {
        mode: 'login',

        show(mode) {
            const el = $('#auth-screen');
            $('#shell').hidden = true;
            el.hidden = false;
            this.mode = mode || 'login';
            this.render();
        },

        hide() { $('#auth-screen').hidden = true; },

        render() {
            const el = $('#auth-screen');
            const games = Nexus.games.registry.available();
            const registering = this.mode === 'register';
            const U = users();
            const remote = Nexus.backend.kind === 'remote';

            const tiles = games.slice(0, 9).map((g, i) => `
                <div class="auth-tile" style="--tile:${esc(g.accent || 'var(--primary)')};--i:${i}" title="${esc(g.name)}">
                    <span aria-hidden="true">${esc(g.emoji)}</span></div>`).join('');

            el.innerHTML = `
                <div class="auth-layout">
                    <section class="auth-hero" aria-label="Nexus Arcade">
                        <h1 class="auth-wordmark"><span>Nexus</span><span class="w-2">Arcade</span></h1>
                        <p class="auth-tagline"><strong>${games.length} juegos, un solo ranking.</strong>
                            Entra con tu cuenta, sigue donde lo dejaste desde cualquier dispositivo y compite por el primer puesto.</p>
                        <div class="auth-tiles" aria-hidden="true">${tiles}</div>
                    </section>

                    <section class="auth-panel">
                        <div class="auth-card">
                            <div class="auth-tabs" role="tablist" aria-label="Acceso">
                                <button class="auth-tab" role="tab" type="button" data-tab="login" aria-selected="${!registering}">Iniciar sesión</button>
                                <button class="auth-tab" role="tab" type="button" data-tab="register" aria-selected="${registering}">Crear cuenta</button>
                            </div>
                            <form class="auth-form" id="auth-form" novalidate>
                                ${registering ? this.registerFields() : this.loginFields()}
                                <p class="form-error" id="au-error" role="alert" hidden></p>
                                <button class="btn btn-primary" id="au-submit" type="submit">${registering ? 'Crear mi cuenta' : 'Entrar'}</button>
                                <p class="auth-switch">${registering
                                    ? '¿Ya tienes cuenta? <button type="button" data-tab="login">Inicia sesión</button>'
                                    : '¿Aún no tienes cuenta? <button type="button" data-tab="register">Créala gratis</button>'}</p>
                            </form>
                        </div>
                        <div class="auth-status" id="au-status" data-state="${remote ? 'checking' : 'local'}">${remote ? 'Conectando con el servidor…' : 'Modo local: tu cuenta se guarda sólo en este navegador'}</div>
                        ${Nexus.storage.volatile ? '<p class="auth-warning">Tu navegador bloquea el almacenamiento local: no se podrá mantener la sesión al recargar.</p>' : ''}
                    </section>
                </div>`;

            this.bind(el);
            if (remote) this.ping();
            const first = $(registering ? '#au-name' : (U.lastUsername() ? '#au-pass' : '#au-name'), el);
            if (first) first.focus({ preventScroll: true });
        },

        loginFields() {
            return `
                <div class="auth-head"><h2>Bienvenido de nuevo</h2>
                    <p class="lead">Tu progreso y tus récords te están esperando.</p></div>
                <label class="field"><span class="field-label">Usuario</span>
                    <input class="input" id="au-name" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false"
                        maxlength="${users().limits.NAME_MAX}" value="${esc(users().lastUsername())}" /></label>
                <label class="field"><span class="field-label">Contraseña</span>
                    <span class="input-wrap"><input class="input" id="au-pass" name="password" type="password" autocomplete="current-password" />
                        <button class="input-toggle" type="button" data-toggle="au-pass" aria-label="Mostrar contraseña">Mostrar</button></span></label>`;
        },

        registerFields() {
            const U = users();
            this.picker = Nexus.ui.components.avatarColorPicker(U.AVATARS[Math.floor(Math.random() * U.AVATARS.length)], U.COLORS[Math.floor(Math.random() * U.COLORS.length)]);
            return `
                <div class="auth-head"><h2>Crea tu cuenta</h2>
                    <p class="lead">Tu progreso se guarda y puedes entrar desde cualquier dispositivo.</p></div>
                <label class="field"><span class="field-label">Usuario <small>(3–${U.limits.NAME_MAX} caracteres: letras, números, - y _)</small></span>
                    <input class="input" id="au-name" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="${U.limits.NAME_MAX}" /></label>
                <label class="field"><span class="field-label">Contraseña <small>(mínimo ${U.limits.PASS_MIN} caracteres)</small></span>
                    <span class="input-wrap"><input class="input" id="au-pass" name="password" type="password" autocomplete="new-password" />
                        <button class="input-toggle" type="button" data-toggle="au-pass" aria-label="Mostrar contraseña">Mostrar</button></span>
                    <span class="strength" id="au-strength" data-level="0" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                    <span class="strength-text" id="au-strength-text"></span></label>
                <label class="field"><span class="field-label">Repite la contraseña</span>
                    <input class="input" id="au-pass2" type="password" autocomplete="new-password" /></label>
                <details id="au-look"><summary>Tu avatar <span class="auth-preview" id="au-preview"></span></summary><div data-slot="picker"></div></details>
                <p class="field-hint" style="margin:0">No podemos recuperar contraseñas olvidadas: guárdala en un lugar seguro.</p>`;
        },

        bind(el) {
            const U = users();
            el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
                if (b.dataset.tab !== this.mode) { this.mode = b.dataset.tab; this.render(); }
            }));
            el.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
                const input = $('#' + b.dataset.toggle, el);
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                b.textContent = show ? 'Ocultar' : 'Mostrar';
                b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
            }));

            if (this.mode === 'register') {
                const slot = el.querySelector('[data-slot="picker"]');
                slot.replaceWith(this.picker.el);
                const preview = $('#au-preview', el);
                const paint = () => { const p = this.picker.get(); preview.innerHTML = `<span class="avatar avatar-sm" style="--user-color:${esc(p.color)}">${esc(p.avatar)}</span>`; };
                paint();
                this.picker.el.addEventListener('click', () => setTimeout(paint, 0));
                const pass = $('#au-pass', el), bar = $('#au-strength', el), txt = $('#au-strength-text', el);
                pass.addEventListener('input', () => {
                    const lv = U.passwordStrength(pass.value);
                    bar.dataset.level = lv; txt.textContent = STRENGTH_TEXT[lv];
                });
            }
            $('#auth-form', el).addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
        },

        async ping() {
            const st = $('#au-status');
            try {
                await Nexus.backend.ping();
                if (st) { st.dataset.state = 'online'; st.textContent = 'Conectado al servidor'; }
            } catch (e) {
                if (st) { st.dataset.state = 'offline'; st.textContent = 'No hay conexión con el servidor. Inténtalo de nuevo en unos segundos.'; }
            }
        },

        setError(msg, field) {
            const box = $('#au-error');
            box.textContent = msg; box.hidden = !msg;
            document.querySelectorAll('#auth-form .input').forEach(i => i.removeAttribute('aria-invalid'));
            if (field && $('#' + field)) { $('#' + field).setAttribute('aria-invalid', 'true'); $('#' + field).focus(); }
        },

        async submit() {
            const U = users();
            const btn = $('#au-submit');
            const name = $('#au-name').value.trim(), pass = $('#au-pass').value;
            this.setError('');
            try {
                if (this.mode === 'register') {
                    let msg = U.validateName(name);
                    if (msg) return this.setError(msg, 'au-name');
                    msg = U.validatePassword(pass);
                    if (msg) return this.setError(msg, 'au-pass');
                    if (pass !== $('#au-pass2').value) return this.setError('Las contraseñas no coinciden.', 'au-pass2');
                } else if (!name || !pass) {
                    return this.setError('Escribe tu usuario y tu contraseña.', name ? 'au-pass' : 'au-name');
                }
                btn.classList.add('is-loading'); btn.disabled = true;
                if (this.mode === 'register') await U.register({ name, password: pass, ...this.picker.get() });
                else await U.login(name, pass);
                // user:login se encarga de mostrar la aplicación
            } catch (e) {
                btn.classList.remove('is-loading'); btn.disabled = false;
                const field = e.status === 409 ? 'au-name' : (this.mode === 'login' ? 'au-pass' : null);
                this.setError(e.message || 'No se pudo completar la operación.', field);
            }
        }
    };

    Nexus.ui.auth = Auth;
})();
