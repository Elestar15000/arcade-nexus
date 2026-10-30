/* ============================================================
   NEXUS ARCADE · ui/modal.js
   Sistema de modales accesible (foco atrapado, Esc, restaura el
   foco) + modal de resultados compartido por todos los juegos.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatTime, formatNumber } = Nexus.util;
    const stack = [];

    function root() {
        let el = document.getElementById('modal-root');
        if (!el) { el = document.createElement('div'); el.id = 'modal-root'; document.body.appendChild(el); }
        return el;
    }

    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    /**
     * Abre un modal.
     * @param {object} o { title, icon, body (string|Node), actions:[{label,kind,value,keepOpen,onClick}],
     *                     dismissable=true, className, onClose }
     * @returns {{el, body, close(value), closed: Promise}}
     */
    function open(o) {
        const previousFocus = document.activeElement;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal ${esc(o.className || '')}" role="dialog" aria-modal="true" ${o.title ? 'aria-labelledby="modal-title-x"' : ''}>
                ${o.dismissable === false ? '' : '<button class="modal-x" aria-label="Cerrar" type="button">✕</button>'}
                ${o.icon ? `<div class="modal-emoji">${esc(o.icon)}</div>` : ''}
                ${o.title ? `<h2 class="modal-title ${esc(o.titleClass || '')}" id="modal-title-x">${esc(o.title)}</h2>` : ''}
                <div class="modal-body"></div>
                <div class="modal-buttons"></div>
            </div>`;
        const modal = overlay.firstElementChild;
        const body = modal.querySelector('.modal-body');
        const btns = modal.querySelector('.modal-buttons');

        if (typeof o.body === 'string') body.innerHTML = o.body;
        else if (o.body instanceof Node) body.appendChild(o.body);

        let resolveClosed, done = false;
        const closed = new Promise(r => { resolveClosed = r; });

        const api = {
            el: overlay, body, closed,
            close(value) {
                if (done) return;
                done = true;
                const i = stack.indexOf(api);
                if (i >= 0) stack.splice(i, 1);
                overlay.classList.remove('active');
                document.removeEventListener('keydown', onKey, true);
                setTimeout(() => overlay.remove(), 350);
                if (previousFocus && previousFocus.focus && document.contains(previousFocus)) {
                    try { previousFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ }
                }
                if (o.onClose) o.onClose(value);
                resolveClosed(value);
            }
        };

        (o.actions || []).forEach(a => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn ' + ({ primary: 'btn-primary', danger: 'btn-danger' }[a.kind] || 'btn-ghost');
            b.textContent = a.label;
            b.addEventListener('click', async () => {
                if (a.onClick) {
                    const res = await a.onClick(api);
                    if (res === false) return; // la acción cancela el cierre (p. ej. validación)
                }
                if (!a.keepOpen) api.close(a.value);
            });
            btns.appendChild(b);
        });
        if (!btns.children.length) btns.remove();

        const dismiss = () => { if (o.dismissable !== false) api.close(undefined); };
        const x = modal.querySelector('.modal-x');
        if (x) x.addEventListener('click', dismiss);
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) dismiss(); });

        function onKey(e) {
            if (stack[stack.length - 1] !== api) return;
            if (e.key === 'Escape') { e.stopPropagation(); dismiss(); }
            if (e.key === 'Tab') {
                const f = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null);
                if (!f.length) return;
                const first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
        document.addEventListener('keydown', onKey, true);

        root().appendChild(overlay);
        stack.push(api);
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            const auto = modal.querySelector('[autofocus], input, textarea') ||
                modal.querySelector('.modal-buttons .btn-primary, .modal-buttons .btn-danger') ||
                modal.querySelector(FOCUSABLE);
            if (auto) auto.focus({ preventScroll: true });
        });
        return api;
    }

    function confirm({ title = '¿Seguro?', message = '', confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false, icon } = {}) {
        const m = open({
            title, icon, className: 'modal-sm',
            body: `<p class="modal-text">${esc(message)}</p>`,
            actions: [
                { label: cancelLabel, kind: 'ghost', value: false },
                { label: confirmLabel, kind: danger ? 'danger' : 'primary', value: true }
            ]
        });
        return m.closed.then(v => v === true);
    }

    /** Pide un texto (p. ej. contraseña). Devuelve string o null si se cancela. */
    function prompt({ title, message = '', label = '', type = 'text', placeholder = '', confirmLabel = 'Aceptar',
        extraHtml = '', validate, maxLength, icon } = {}) {
        return new Promise(resolve => {
            const body = document.createElement('div');
            body.innerHTML = `
                ${message ? `<p class="modal-text">${esc(message)}</p>` : ''}
                <label class="field">
                    ${label ? `<span class="field-label">${esc(label)}</span>` : ''}
                    <input class="input" type="${esc(type)}" placeholder="${esc(placeholder)}" ${maxLength ? `maxlength="${maxLength}"` : ''} autocomplete="off" />
                </label>
                ${extraHtml}
                <p class="field-error" role="alert" hidden></p>`;
            const input = body.querySelector('input');
            const err = body.querySelector('.field-error');
            let result = null;

            const submit = (api) => {
                const val = input.value;
                const msg = validate ? validate(val, body) : null;
                if (msg) { err.textContent = msg; err.hidden = false; input.focus(); return false; }
                result = val;
                api.close(val);
            };
            const m = open({
                title, icon, className: 'modal-sm', body,
                actions: [
                    { label: 'Cancelar', kind: 'ghost', value: null },
                    { label: confirmLabel, kind: 'primary', keepOpen: true, onClick: submit }
                ]
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(m); } });
            m.closed.then(() => resolve(result));
        });
    }

    function closeAll() { stack.slice().forEach(m => m.close()); }

    // ── Modal de resultados (común a todos los juegos) ───────
    /**
     * @param {object} o { emoji, title, kind:'win'|'lose', subtitle, stats:[{label,value}],
     *                     result (de progress.recordGame), extraHtml, actions }
     */
    function resultModal(o) {
        const r = o.result || {};
        const parts = [];
        if (o.subtitle) parts.push(`<p class="modal-subtitle">${esc(o.subtitle)}</p>`);

        if (o.stats && o.stats.length) {
            parts.push('<div class="modal-stats-grid">' + o.stats.map(s => `
                <div class="modal-stat-item"><span class="label">${esc(s.label)}</span><span class="value">${esc(s.value)}</span></div>`
            ).join('') + '</div>');
        }
        if (o.extraHtml) parts.push(o.extraHtml);

        const badges = [];
        if (r.records && r.records.score) badges.push('<span class="chip chip-gold">🏆 ¡Nueva mejor puntuación!</span>');
        if (r.records && r.records.time) badges.push('<span class="chip chip-gold">⚡ ¡Nuevo mejor tiempo!</span>');
        if (badges.length) parts.push(`<div class="modal-badges">${badges.join('')}</div>`);

        if (r.xp > 0) {
            let line = `+${formatNumber(r.xp)} XP`;
            if (r.levelUp) line += ` · ¡Nivel ${r.newLevel}!`;
            parts.push(`<div class="modal-xp">${esc(line)}</div>`);
        }
        if (r.unlocked && r.unlocked.length) {
            parts.push('<div class="modal-unlocks"><span class="modal-unlocks-title">Logros desbloqueados</span>' +
                r.unlocked.map(a => `
                <div class="unlock-row rarity-${esc(a.rarity)}"><span class="unlock-icon">${esc(a.icon)}</span>
                    <span><strong>${esc(a.name)}</strong><small>${esc(a.desc)}</small></span></div>`).join('') + '</div>');
        }

        if (r.levelUp) Nexus.audio.play('levelup');
        else if (r.unlocked && r.unlocked.length) Nexus.audio.play('achievement');

        return open({
            icon: o.emoji, title: o.title, titleClass: o.kind || '',
            className: 'modal-result', body: parts.join(''), actions: o.actions || []
        });
    }

    Nexus.ui.modal = { open, confirm, prompt, closeAll, resultModal };
    Nexus.ui.formatTime = formatTime;
})();
