/* ============================================================
   NEXUS ARCADE · services/notices.js
   Avisos que llegan desde el panel de administración:
     · mantenimiento → pantalla fija que cubre toda la página para
       todas las cuentas (salvo administradores) hasta que se quita
     · pop-ups enviados a una cuenta → se muestran uno a uno y se
       marcan como leídos al cerrarlos
     · suspensión → cierra la sesión y explica el motivo
   Se consulta al arrancar, al volver a la pestaña y cada minuto
   (cada pocos segundos en modo local).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $ } = Nexus.util;
    const B = () => Nexus.backend;
    const U = () => Nexus.services.users;
    const KIND = { info: { icon: '📣', label: 'Aviso' }, warn: { icon: '⚠️', label: 'Importante' }, alert: { icon: '🚨', label: 'Urgente' } };

    const Notices = {
        maintenance: { on: false, message: '', since: 0 },
        queue: [],
        seen: new Set(),
        showing: false,
        busy: false,

        start() {
            this.every = B().kind === 'local' ? 4000 : 60000;
            Nexus.bus.on('user:login', () => setTimeout(() => this.check(), 300));
            Nexus.bus.on('user:logout', () => { this.queue = []; setTimeout(() => this.check(), 300); });
            Nexus.bus.on('admin:session', () => this.paint());
            document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
            window.addEventListener('online', () => this.check());
            setInterval(() => { if (!document.hidden) this.check(); }, this.every);
            this.check();
        },

        /** Pregunta al servidor por mantenimiento, pop-ups y suspensión. */
        async check() {
            if (B().unavailable || this.busy || !B().status) return;
            this.busy = true;
            try {
                const tok = U().isLoggedIn() && U().token();
                const r = tok ? await B().notices(tok) : await B().status();
                this.setMaintenance(r.maintenance || { on: false });
                if (r.suspended) { U().suspended(r.suspended); return; }
                (r.messages || []).forEach(m => { if (!this.seen.has(m.id)) { this.seen.add(m.id); this.queue.push(m); } });
                this.next();
            } catch (e) {
                if (e.code === 'suspended') U().suspended(e);
            } finally { this.busy = false; }
        },

        /** Los administradores (cuenta o sesión del panel) ven una franja en vez de la pantalla bloqueante. */
        exempt() { return U().isAdmin() || !!(Nexus.ui.admin && Nexus.ui.admin.hasSession()); },

        setMaintenance(m) {
            const was = this.maintenance.on;
            this.maintenance = { on: !!m.on, message: m.message || '', since: m.since || 0 };
            this.paint();
            if (was && !m.on && Nexus.ui.toast) Nexus.ui.toast('La página vuelve a estar disponible. ¡Gracias por la espera!', { icon: '✅', type: 'success' });
        },

        paint() {
            const m = this.maintenance, exempt = this.exempt();
            let screen = $('#maint-screen'), band = $('#maint-band');
            document.body.classList.toggle('maint-on', m.on && !exempt);
            if (m.on && !exempt) {
                if (band) band.remove();
                if (!screen) {
                    screen = document.createElement('div');
                    screen.id = 'maint-screen'; screen.className = 'maint-screen';
                    screen.setAttribute('role', 'alertdialog'); screen.setAttribute('aria-modal', 'true'); screen.setAttribute('aria-labelledby', 'maint-title');
                    document.body.appendChild(screen);
                }
                const since = m.since ? new Date(m.since).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '';
                screen.innerHTML = `
                    <div class="maint-card">
                        <div class="maint-gear" aria-hidden="true"><span>⚙️</span><span>🛠️</span></div>
                        <h2 id="maint-title">Página en mantenimiento</h2>
                        <p class="maint-lead">Estamos mejorando Nexus Arcade. Tu progreso está a salvo.</p>
                        ${m.message ? `<p class="maint-msg">${esc(m.message)}</p>` : ''}
                        <p class="maint-meta"><span class="maint-pulse"></span>${since ? `Desde ${esc(since)} · ` : ''}la página se abrirá sola cuando terminemos</p>
                        <div class="maint-actions">
                            <button type="button" class="btn btn-primary" data-maint="retry">🔄 Comprobar ahora</button>
                            <button type="button" class="btn btn-ghost btn-sm maint-admin" data-maint="admin">🛡️ Acceso de administrador</button>
                        </div>
                    </div>`;
                screen.querySelector('[data-maint=retry]').addEventListener('click', (e) => { e.currentTarget.classList.add('is-loading'); this.check(); });
                screen.querySelector('[data-maint=admin]').addEventListener('click', () => Nexus.ui.admin.openStandalone());
            } else {
                if (screen) screen.remove();
                if (m.on && exempt) {
                    if (!band) {
                        band = document.createElement('div'); band.id = 'maint-band'; band.className = 'maint-band'; band.setAttribute('role', 'status');
                        document.body.appendChild(band);
                    }
                    band.innerHTML = `🛠️ <b>Mantenimiento activo</b><span>Los jugadores ven la pantalla de mantenimiento${m.message ? ': «' + esc(m.message) + '»' : ''}.</span>
                        <button type="button" data-band="admin">Gestionar</button>`;
                    band.querySelector('[data-band]').addEventListener('click', () => Nexus.ui.admin.goto('maintenance'));
                } else if (band) band.remove();
            }
        },

        /** Muestra el siguiente pop-up pendiente. */
        next() {
            if (this.showing || !this.queue.length || !U().isLoggedIn()) return;
            const m = this.queue.shift(), k = KIND[m.kind] || KIND.info;
            this.showing = true;
            Nexus.audio && Nexus.audio.play && Nexus.audio.play('achievement');
            const when = new Date(m.at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
            const modal = Nexus.ui.modal.open({
                icon: k.icon, title: m.title, className: `modal-sm notice-modal notice-${esc(m.kind || 'info')}`,
                body: `<span class="notice-tag">${esc(k.label)} del equipo de Nexus Arcade</span>
                    <p class="notice-text">${esc(m.body).replace(/\n/g, '<br>')}</p>
                    <small class="notice-when">${esc(when)}</small>`,
                actions: [{ label: 'Entendido', kind: 'primary' }]
            });
            modal.closed.then(() => {
                this.showing = false;
                const tok = U().token();
                if (tok) B().ackNotices(tok, [m.id]).catch(() => { this.seen.delete(m.id); });
                setTimeout(() => this.next(), 250);
            });
        }
    };

    Nexus.services.notices = Notices;
})();
