/* ============================================================
   NEXUS ARCADE · ui/router.js
   Router por hash (#/home, #/game/wordle…). Funciona con
   file:// y mantiene el botón "atrás" del navegador.
   Una página es { title, render(root, params) → cleanup? }.
   ============================================================ */
(function () {
    'use strict';

    const { esc } = Nexus.util;
    const DEFAULT_ROUTE = 'home';

    const Router = {
        container: null,
        cleanup: null,
        current: null,

        init(container) {
            this.container = container;
            window.addEventListener('hashchange', () => this.render());
        },

        start() {
            if (!location.hash || location.hash === '#') location.replace('#/' + DEFAULT_ROUTE);
            else this.render();
        },

        navigate(path) {
            const target = '#/' + path.replace(/^#?\/?/, '');
            if (location.hash === target) this.render(); else location.hash = target;
        },

        parse() {
            const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
            const name = parts[0] || DEFAULT_ROUTE;
            return { name, params: { id: parts[1] }, key: name === 'game' ? `game/${parts[1]}` : name };
        },

        render() {
            if (!Nexus.services.users.isLoggedIn()) return;
            const route = this.parse();

            // Limpia la página anterior
            if (typeof this.cleanup === 'function') {
                try { this.cleanup(); } catch (e) { console.error('[router] cleanup', e); }
            }
            this.cleanup = null;
            this.container.innerHTML = '';
            this.container.scrollTop = 0;

            let page, title;
            if (route.name === 'game') {
                const game = Nexus.games.registry.get(route.params.id);
                if (!game) return this.notFound();
                title = game.name;
                page = { render: (root) => { const inst = game.mount(root); return () => inst && inst.destroy && inst.destroy(); } };
                Nexus.ui.sidebar.enterGame();
            } else {
                page = Nexus.ui.pages[route.name];
                if (!page) return this.notFound();
                title = page.title;
                Nexus.ui.sidebar.exitGame();
            }

            this.current = route;
            document.title = `${title} · Nexus Arcade`;
            const titleEl = document.getElementById('page-title');
            if (titleEl) titleEl.textContent = title;
            Nexus.ui.sidebar.setActive(route.key);
            this.container.classList.toggle('view-game', route.name === 'game');

            try {
                const root = document.createElement('div');
                root.className = 'page page-' + route.name;
                this.container.appendChild(root);
                this.cleanup = page.render(root, route.params) || null;
                // Accesibilidad: el foco pasa al contenido (y deja de estar en el botón que se pulsó)
                if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
                this.container.focus({ preventScroll: true });
            } catch (e) {
                console.error('[router] error al pintar', route.key, e);
                this.container.innerHTML = `<div class="empty-state"><div class="empty-emoji">💥</div>
                    <h2>Algo ha fallado</h2><p>${esc(e.message)}</p>
                    <a class="btn btn-primary" href="#/home">Volver al inicio</a></div>`;
            }
        },

        /** Descarta la página activa (al cerrar sesión). */
        reset() {
            if (typeof this.cleanup === 'function') {
                try { this.cleanup(); } catch (e) { console.error('[router] cleanup', e); }
            }
            this.cleanup = null;
            this.current = null;
            if (this.container) this.container.innerHTML = '';
            if (Nexus.ui.sidebar && Nexus.ui.sidebar.exitGame) Nexus.ui.sidebar.exitGame();
        },

        notFound() {
            this.container.innerHTML = `<div class="empty-state"><div class="empty-emoji">🛰️</div>
                <h2>Página no encontrada</h2><p>Esta ruta no existe.</p>
                <a class="btn btn-primary" href="#/home">Volver al inicio</a></div>`;
            document.title = 'No encontrada · Nexus Arcade';
        }
    };

    Nexus.ui.router = Router;
})();
