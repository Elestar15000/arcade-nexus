/* ============================================================
   NEXUS ARCADE · ui/sidebar.js
   Barra lateral desplegable.
   - Escritorio: se pliega a una columna de iconos (con tooltips)
     y se vuelve a desplegar; el estado se recuerda.
   - Móvil/tablet: cajón deslizante con fondo oscuro.
   - Al entrar en un juego se pliega sola (ajustable) para dar
     más espacio al tablero, y se restaura al salir.
   - Atajo: Ctrl/Cmd + B.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$ } = Nexus.util;
    const MOBILE_QUERY = '(max-width: 820px)';

    const NAV_MAIN = [
        { route: 'home', icon: '🏠', label: 'Inicio' },
        { route: 'library', icon: '🎮', label: 'Biblioteca' },
        { route: 'achievements', icon: '🏅', label: 'Logros' },
        { route: 'rankings', icon: '🏆', label: 'Rankings' },
        { route: 'stats', icon: '📊', label: 'Estadísticas' }
    ];
    const NAV_BOTTOM = [
        { route: 'profile', icon: '👤', label: 'Perfil' },
        { route: 'settings', icon: '⚙️', label: 'Ajustes' }
    ];

    const Sidebar = {
        pref: false,        // preferencia guardada (plegada o no)
        temp: null,         // plegado temporal (modo juego)
        inGame: false,
        mobileOpen: false,

        init() {
            this.shell = $('#shell');
            this.el = $('#sidebar');
            this.pref = !!Nexus.services.settings.getUI('sidebarCollapsed', false);
            this.mq = window.matchMedia(MOBILE_QUERY);

            $('#sidebar-toggle').addEventListener('click', () => this.toggle());
            $('#sidebar-collapse').addEventListener('click', () => this.toggle());
            $('#sidebar-backdrop').addEventListener('click', () => this.closeMobile());
            $('#btn-switch-user').addEventListener('click', () => Nexus.app.logout());

            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && this.shell && !this.shell.hidden) {
                    e.preventDefault(); this.toggle();
                } else if (e.key === 'Escape' && this.mobileOpen) {
                    this.closeMobile();
                }
            });
            this.mq.addEventListener('change', () => { this.closeMobile(); this.apply(); });

            // Avisa a los juegos cuando termina la animación para que reajusten su tamaño
            this.el.addEventListener('transitionend', (e) => {
                if (e.propertyName === 'width' || e.propertyName === 'transform') Nexus.bus.emit('layout:change');
            });

            Nexus.bus.on('progress:update', () => this.renderUser());
            Nexus.bus.on('user:update', () => this.renderUser());

            this.buildNav();
            this.apply();
        },

        isMobile() { return this.mq.matches; },
        effective() { return this.temp !== null ? this.temp : this.pref; },

        buildNav() {
            const link = (n) => `
                <a class="nav-item" href="#/${esc(n.route)}" data-route="${esc(n.route)}" data-tooltip="${esc(n.label)}">
                    <span class="nav-icon" aria-hidden="true">${esc(n.icon)}</span>
                    <span class="nav-label">${esc(n.label)}</span>
                </a>`;
            const games = Nexus.games.registry.available().map(g => link({
                route: 'game/' + g.id, icon: g.emoji, label: g.name
            })).join('');

            $('#sidebar-nav').innerHTML = `
                <div class="nav-group">${NAV_MAIN.map(link).join('')}</div>
                <div class="nav-group">
                    <span class="nav-heading">Juegos</span>
                    ${games}
                </div>
                <div class="nav-group nav-group-bottom">${NAV_BOTTOM.map(link).join('')}</div>`;

            $$('#sidebar-nav .nav-item').forEach(a => a.addEventListener('click', () => this.closeMobile()));
        },

        setActive(routeKey) {
            $$('#sidebar-nav .nav-item').forEach(a => {
                const on = a.dataset.route === routeKey;
                a.classList.toggle('active', on);
                if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
            });
        },

        renderUser() {
            const user = Nexus.services.users.current();
            if (!user) return;
            const lv = Nexus.services.progress.level();
            const card = $('#user-card');
            card.style.setProperty('--user-color', user.color);
            $('#user-avatar').textContent = user.avatar;
            $('#user-name').textContent = user.name;
            $('#user-rank').textContent = `${lv.rank.icon} ${lv.rank.name} · Nivel ${lv.level}`;
            $('#user-xp-fill').style.width = lv.pct + '%';
            $('#user-xp-text').textContent = `${Nexus.util.formatNumber(lv.xp)} / ${Nexus.util.formatNumber(lv.next)} XP`;
            const chip = $('#topbar-level');
            if (chip) chip.textContent = `Nv. ${lv.level}`;
            card.title = Nexus.services.users.isGuest() ? 'Invitado (no se guarda el progreso)' : `${user.name} · ver perfil`;
            $('#btn-switch-user').title = Nexus.services.users.isGuest() ? 'Salir del modo invitado' : 'Cambiar de usuario';
        },

        // ── Plegar / desplegar ──────────────────────────────
        toggle() {
            if (this.isMobile()) {
                this.mobileOpen ? this.closeMobile() : this.openMobile();
                return;
            }
            const next = !this.effective();
            if (this.inGame) this.temp = next;
            else { this.pref = next; Nexus.services.settings.setUI('sidebarCollapsed', next); }
            this.apply();
        },

        setCollapsed(value) {
            this.pref = !!value;
            Nexus.services.settings.setUI('sidebarCollapsed', this.pref);
            this.apply();
        },

        openMobile() { this.mobileOpen = true; this.apply(); },
        closeMobile() { if (this.mobileOpen) { this.mobileOpen = false; this.apply(); } },

        enterGame() {
            this.inGame = true;
            this.temp = (Nexus.services.settings.get('autoCollapseSidebar') && !this.pref) ? true : null;
            this.apply();
        },
        exitGame() {
            this.inGame = false;
            this.temp = null;
            this.apply();
        },

        apply() {
            if (!this.shell) return;
            const mobile = this.isMobile();
            const collapsed = !mobile && this.effective();
            this.shell.classList.toggle('collapsed', collapsed);
            this.shell.classList.toggle('mobile-open', mobile && this.mobileOpen);
            document.body.classList.toggle('no-scroll', mobile && this.mobileOpen);

            const expanded = mobile ? this.mobileOpen : !collapsed;
            ['sidebar-toggle', 'sidebar-collapse'].forEach(id => {
                const b = document.getElementById(id);
                if (!b) return;
                b.setAttribute('aria-expanded', String(expanded));
                b.setAttribute('aria-label', expanded ? 'Plegar barra lateral' : 'Desplegar barra lateral');
            });
            // En móvil, el contenido del cajón no debe recibir foco mientras está oculto
            if (mobile) {
                if (this.mobileOpen) this.el.removeAttribute('inert'); else this.el.setAttribute('inert', '');
            } else this.el.removeAttribute('inert');
            // Sin animación (p. ej. al cambiar entre móvil/escritorio) también hay que avisar
            clearTimeout(this._t);
            this._t = setTimeout(() => Nexus.bus.emit('layout:change'), 350);
        }
    };

    Nexus.ui.sidebar = Sidebar;
})();
