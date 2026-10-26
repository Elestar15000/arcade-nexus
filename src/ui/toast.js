/* ============================================================
   NEXUS ARCADE · ui/toast.js
   Notificaciones emergentes y aviso de logro desbloqueado.
   ============================================================ */
(function () {
    'use strict';

    const { esc } = Nexus.util;

    function root() {
        let el = document.getElementById('toast-root');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast-root';
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        return el;
    }

    function show(html, { duration = 3000, className = '' } = {}) {
        const el = document.createElement('div');
        el.className = 'toast ' + className;
        el.setAttribute('role', 'status');
        el.innerHTML = html;
        const host = root();
        host.appendChild(el);
        // máx. 4 toasts visibles
        while (host.children.length > 4) host.firstElementChild.remove();

        requestAnimationFrame(() => el.classList.add('show'));
        const close = () => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 350);
        };
        const timer = setTimeout(close, duration);
        el.addEventListener('click', () => { clearTimeout(timer); close(); });
        return close;
    }

    /** toast('Mensaje', { icon:'✅', type:'success'|'error'|'warn'|'info', duration }) */
    function toast(message, opts = {}) {
        const type = opts.type || 'info';
        const icons = { success: '✅', error: '⚠️', warn: '⚠️', info: 'ℹ️' };
        const icon = opts.icon || icons[type];
        return show(`<span class="toast-icon">${esc(icon)}</span><span class="toast-msg">${esc(message)}</span>`,
            { duration: opts.duration || 3000, className: 'toast-' + type });
    }

    function achievementToast(def) {
        Nexus.audio.play('achievement');
        const rarity = Nexus.services.achievements.RARITY[def.rarity];
        show(`
            <span class="toast-icon big">${esc(def.icon)}</span>
            <div class="toast-body">
                <span class="toast-kicker">🏅 Logro desbloqueado · ${esc(rarity.label)}</span>
                <strong>${esc(def.name)}</strong>
                <span class="toast-sub">${esc(def.desc)} · +${def.xp} XP</span>
            </div>`, { duration: 4500, className: 'toast-achievement rarity-' + def.rarity });
    }

    Nexus.ui.toast = toast;
    Nexus.ui.achievementToast = achievementToast;
    Nexus.bus.on('achievement:unlock', achievementToast);
    Nexus.bus.on('storage:error', () => toast(
        'No se pudo guardar en el navegador (¿modo privado o almacenamiento lleno?). Tu progreso puede perderse.',
        { type: 'error', duration: 7000 }));
})();
