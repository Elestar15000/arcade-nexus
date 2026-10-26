/* ============================================================
   NEXUS ARCADE · app.js
   Punto de entrada: conecta servicios y UI, restaura la sesión
   y decide si mostrar la selección de perfil o la aplicación.
   ============================================================ */
(function () {
    'use strict';

    const { $ } = Nexus.util;

    Nexus.app = {
        /** Cierra la sesión limpiando antes la página activa (guarda partidas en curso). */
        logout() {
            Nexus.ui.router.reset();
            Nexus.services.users.logout();
        }
    };

    function showApp() {
        Nexus.ui.auth.hide();
        $('#shell').hidden = false;
        Nexus.ui.sidebar.renderUser();
        Nexus.services.achievements.evaluateSilently();
        Nexus.ui.router.start();
    }

    function showAuth() {
        Nexus.ui.router.reset();
        Nexus.ui.sidebar.closeMobile();
        Nexus.services.settings.apply();
        document.title = 'Nexus Arcade';
        Nexus.ui.auth.show();
    }

    function boot() {
        const users = Nexus.services.users;
        Nexus.services.settings.apply();

        new Nexus.ui.BackgroundParticles($('#bg-particles'));
        Nexus.ui.sidebar.init();
        Nexus.ui.router.init($('#view'));

        Nexus.bus.on('user:login', showApp);
        Nexus.bus.on('user:logout', showAuth);
        // Aviso de nivel al subir (los logros ya tienen el suyo)
        Nexus.bus.on('settings:change', () => Nexus.ui.sidebar.renderUser());

        const migrated = users.migrateLegacy();
        if (!users.restoreSession()) {
            showAuth();
            if (migrated) {
                Nexus.ui.toast(`Hemos recuperado tu perfil anterior como "${migrated.name}".`, { type: 'success', duration: 5000 });
            }
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
