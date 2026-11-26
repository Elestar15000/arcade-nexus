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
            const blocked = !!Nexus.backend.unavailable;

            const B = Nexus.ui.brand;
            el.innerHTML = `
                ${B.decor('auth')}
                <div class="auth-layout">
                    <section class="auth-hero" aria-label="Nexus Arcade">
                        <div class="auth-brand">
                            ${B.logo3d('auth-logo')}
                            <h1 class="auth-wordmark"><span>Nexus</span><span class="w-2">Arcade</span></h1>
                        </div>
                        <p class="auth-tagline">Muchos juegos. Un solo universo.</p>
                        <span class="auth-line" aria-hidden="true"></span>
                        <p class="auth-facts"><span>🎮 ${games.length} juegos</span><span>🏆 Rankings y logros</span><span>🌐 Online con amigos</span></p>
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
                                <button class="btn btn-primary auth-submit" id="au-submit" type="submit"${blocked ? ' disabled' : ''}>${registering ? 'Crear mi cuenta' : 'Entrar'}</button>
                                <p class="auth-switch">${registering
                                    ? '¿Ya tienes cuenta? <button type="button" data-tab="login">Inicia sesión</button>'
                                    : '¿Aún no tienes cuenta? <button type="button" data-tab="register">Créala gratis</button>'}</p>
                            </form>
                            <div class="auth-foot">
                                <div class="auth-status" id="au-status" data-state="${blocked ? 'offline' : remote ? 'checking' : 'local'}">${blocked
                                    ? 'Servidor de cuentas no configurado: sólo se puede entrar con cuentas del repositorio de datos (ver backend/README.md).'
                                    : remote ? 'Conectando con el servidor…' : 'Modo local de desarrollo: las cuentas se guardan sólo en este navegador'}</div>
                                <button type="button" class="auth-admin-link" id="au-admin">🛡️ Panel de administración</button>
                                <p class="auth-legal"><a href="#" data-legal="privacy">Política de privacidad</a> · <a href="#" data-legal="terms">Términos y condiciones</a></p>
                            </div>
                        </div>
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
                <label class="field auth-field"><span class="sr-only">Usuario</span>
                    <span class="auth-ic">${Nexus.ui.brand.icon('user', 20)}</span>
                    <input class="input" id="au-name" name="username" type="text" placeholder="Usuario" autocomplete="username" autocapitalize="none" spellcheck="false"
                        maxlength="${users().limits.NAME_MAX}" value="${esc(users().lastUsername())}" /></label>
                <label class="field auth-field"><span class="sr-only">Contraseña</span>
                    <span class="auth-ic">${Nexus.ui.brand.icon('lock', 20)}</span>
                    <input class="input" id="au-pass" name="password" type="password" placeholder="Contraseña" autocomplete="current-password" />
                    <button class="auth-eye" type="button" data-toggle="au-pass" aria-label="Mostrar contraseña" title="Mostrar contraseña">${Nexus.ui.brand.icon('eye', 20)}</button></label>`;
        },

        registerFields() {
            const U = users();
            return `
                <div class="auth-head"><h2>Crea tu cuenta</h2>
                    <p class="lead">Tu progreso se guarda y puedes entrar desde cualquier dispositivo.</p></div>
                <label class="field auth-field"><span class="sr-only">Usuario</span>
                    <span class="auth-ic">${Nexus.ui.brand.icon('user', 20)}</span>
                    <input class="input" id="au-name" name="username" type="text" placeholder="Usuario" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="${U.limits.NAME_MAX}" aria-describedby="au-name-hint" /></label>
                <small class="auth-hint" id="au-name-hint">3–${U.limits.NAME_MAX} caracteres: letras, números, - y _</small>
                <label class="field auth-field"><span class="sr-only">Contraseña</span>
                    <span class="auth-ic">${Nexus.ui.brand.icon('lock', 20)}</span>
                    <input class="input" id="au-pass" name="password" type="password" placeholder="Contraseña (mínimo ${U.limits.PASS_MIN} caracteres)" autocomplete="new-password" />
                    <button class="auth-eye" type="button" data-toggle="au-pass" aria-label="Mostrar contraseña" title="Mostrar contraseña">${Nexus.ui.brand.icon('eye', 20)}</button></label>
                <span class="auth-strength"><span class="strength" id="au-strength" data-level="0" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                    <span class="strength-text" id="au-strength-text"></span></span>
                <label class="field auth-field"><span class="sr-only">Repite la contraseña</span>
                    <span class="auth-ic">${Nexus.ui.brand.icon('lock', 20)}</span>
                    <input class="input" id="au-pass2" type="password" placeholder="Repite la contraseña" autocomplete="new-password" /></label>
                <p class="field-hint" style="margin:0">No podemos recuperar contraseñas olvidadas: guárdala en un lugar seguro.</p>
                <label class="auth-accept"><input type="checkbox" id="au-accept" /><span>Tengo al menos 14 años (o autorización de mis padres) y acepto los
                    <a href="#" data-legal="terms">Términos y condiciones</a> y la <a href="#" data-legal="privacy">Política de privacidad</a>.</span></label>`;
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
                b.innerHTML = Nexus.ui.brand.icon(show ? 'eyeOff' : 'eye', 20);
                b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña'); b.title = b.getAttribute('aria-label');
            }));

            if (this.mode === 'register') {
                const pass = $('#au-pass', el), bar = $('#au-strength', el), txt = $('#au-strength-text', el);
                pass.addEventListener('input', () => {
                    const lv = U.passwordStrength(pass.value);
                    bar.dataset.level = lv; txt.textContent = STRENGTH_TEXT[lv];
                });
            }
            $('#au-admin', el).addEventListener('click', () => Nexus.ui.admin.openStandalone());
            $('#auth-form', el).addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
            el.querySelectorAll('[data-legal]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); Nexus.ui.legal.open(a.dataset.legal); }));
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
                    if (!$('#au-accept').checked) return this.setError('Para crear la cuenta tienes que aceptar los Términos y condiciones y la Política de privacidad.', 'au-accept');
                } else if (!name || !pass) {
                    return this.setError('Escribe tu usuario y tu contraseña.', name ? 'au-pass' : 'au-name');
                }
                if (Nexus.backend.unavailable) return this.setError('El servidor de cuentas no está configurado.');
                btn.classList.add('is-loading'); btn.disabled = true;
                if (this.mode === 'register') {
                    Nexus.ui.legal.acceptNextLogin();   // aceptó con la casilla al registrarse
                    await U.register({ name, password: pass, avatar: Nexus.services.avatars.DEFAULT });
                    // Paso de bienvenida: elegir avatar (se puede dejar para más tarde)
                    setTimeout(() => Nexus.ui.avatarPicker.open({ onboarding: true }), 450);
                } else await U.login(name, pass);
                // user:login se encarga de mostrar la aplicación
            } catch (e) {
                Nexus.ui.legal.acceptNextLogin(false);
                btn.classList.remove('is-loading'); btn.disabled = false;
                const field = (e.status === 409 || e.status === 404) ? 'au-name' : (this.mode === 'login' && e.status === 401 ? 'au-pass' : null);
                this.setError(e.message || 'No se pudo completar la operación.', field);
            }
        }
    };

    Nexus.ui.auth = Auth;
})();
