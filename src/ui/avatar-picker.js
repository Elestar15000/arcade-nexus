/* ============================================================
   NEXUS ARCADE · ui/avatar-picker.js — Selector de avatares
   Pantalla completa al estilo Netflix / Prime Video:
   · arriba, el avatar actual del jugador;
   · una fila desplazable por colección (flechas, arrastre, rueda, teclado);
   · al pulsar un avatar, confirmación «antes → después»; nada se guarda hasta aceptar.
   Nexus.ui.avatarPicker.open({ onboarding }) → Promise<boolean> (true si se guardó)
   `onboarding`: paso de bienvenida tras crear la cuenta («Más tarde» deja el avatar por defecto).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $ } = Nexus.util;
    const AV = () => Nexus.services.avatars;
    const U = () => Nexus.services.users;
    const icon = (n, s) => Nexus.ui.brand.icon(n, s);

    let current = null;   // instancia abierta (sólo una a la vez)

    class Picker {
        constructor(opts, resolve) {
            this.opts = opts || {};
            this.resolve = resolve;
            this.user = U().current() || { name: 'Jugador', avatar: AV().DEFAULT };
            this.active = AV().resolve(this.user.avatar);
            this.prevFocus = document.activeElement;
            this.onKey = (e) => this.key(e);
            this.render();
        }

        render() {
            const me = AV().info(this.active), ob = !!this.opts.onboarding;
            const el = this.el = document.createElement('div');
            el.className = 'avp';
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-modal', 'true');
            el.setAttribute('aria-labelledby', 'avp-title');
            el.innerHTML = `
                <div class="avp-shell">
                    <header class="avp-head">
                        <div class="avp-me">
                            <span class="avp-me-pic" style="--av-accent:${esc(me.accent)}">${Nexus.ui.avatar.html(me.id, { size: 512 })}</span>
                            <div class="avp-me-txt">
                                <span class="avp-kicker">${ob ? '¡Bienvenido, ' + esc(this.user.name) + '!' : esc(this.user.name)}</span>
                                <h2 id="avp-title">${ob ? 'Elige cómo te verán los demás' : 'Elige tu avatar'}</h2>
                                <p class="avp-sub">${ob ? 'Aparecerá en los rankings, en las partidas online y en tu perfil. Puedes cambiarlo cuando quieras.' : `Ahora llevas a <b>${esc(me.name)}</b>.`}</p>
                            </div>
                        </div>
                        <button type="button" class="btn btn-ghost avp-close" data-close>${ob ? 'Más tarde' : `${icon('arrow', 18)}<span>Volver</span>`}</button>
                    </header>
                    <div class="avp-rows">
                        ${AV().collections().filter(c => c.avatars.length).map((c, r) => this.row(c, r)).join('')}
                    </div>
                </div>
                <div class="avp-confirm" hidden></div>`;
            document.body.appendChild(el);
            document.body.classList.add('avp-open');
            requestAnimationFrame(() => el.classList.add('in'));

            el.addEventListener('click', (e) => this.click(e));
            document.addEventListener('keydown', this.onKey, true);
            el.querySelectorAll('.avp-track').forEach(t => {
                t.addEventListener('scroll', () => this.arrows(t), { passive: true });
                this.drag(t);
                this.arrows(t);
            });
            this.onResize = () => el.querySelectorAll('.avp-track').forEach(t => this.arrows(t));
            window.addEventListener('resize', this.onResize);

            // Foco en el avatar actual (y su fila desplazada para que se vea)
            const cur = $(`.avp-opt[data-id="${this.active}"]`, el) || $('.avp-opt', el);
            if (cur) { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); cur.focus({ preventScroll: true }); }
        }

        row(c, r) {
            const opts = c.avatars.map((a, i) => {
                const on = a.id === this.active, locked = !AV().isUnlocked(a);
                return `<button type="button" class="avp-opt${on ? ' is-current' : ''}${locked ? ' is-locked' : ''}" data-id="${esc(a.id)}" data-row="${r}" data-col="${i}"
                            style="--av-accent:${esc(a.accent)}" aria-label="${esc(a.name)} · ${esc(c.name)}${on ? ' · en uso' : ''}${locked ? ' · ' + esc(AV().unlockText(a)) : ''}"
                            ${on ? 'aria-current="true"' : ''} title="${esc(locked ? AV().unlockText(a) : a.name)}">
                        <span class="avp-pic">${Nexus.ui.avatar.html(a.id, { size: 256 })}${locked ? `<span class="avp-lock">${icon('lock', 22)}</span>` : ''}${on ? '<span class="avp-badge">En uso</span>' : ''}</span>
                        <span class="avp-name">${esc(a.name)}</span>
                    </button>`;
            }).join('');
            return `
                <section class="avp-row" style="--row-accent:${esc(c.accent)}" aria-label="${esc(c.name)}">
                    <h3 class="avp-row-title"><i aria-hidden="true"></i>${esc(c.name)}<small>${esc(c.desc || '')}</small></h3>
                    <div class="avp-track-wrap">
                        <button type="button" class="avp-nav prev" data-nav="-1" aria-label="Anteriores de ${esc(c.name)}" tabindex="-1">${icon('chevronRight', 22)}</button>
                        <div class="avp-track">${opts}</div>
                        <button type="button" class="avp-nav next" data-nav="1" aria-label="Siguientes de ${esc(c.name)}" tabindex="-1">${icon('chevronRight', 22)}</button>
                    </div>
                </section>`;
        }

        /** Muestra u oculta las flechas según quede contenido a cada lado. */
        arrows(t) {
            const wrap = t.parentElement, max = t.scrollWidth - t.clientWidth - 2;
            wrap.classList.toggle('can-prev', t.scrollLeft > 2);
            wrap.classList.toggle('can-next', t.scrollLeft < max);
        }

        /** Arrastre con el ratón como en las filas de Netflix (en táctil ya desplaza el navegador). */
        drag(t) {
            let x0 = 0, s0 = 0, down = false, moved = false;
            t.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; x0 = e.clientX; s0 = t.scrollLeft; });
            window.addEventListener('pointermove', (e) => {
                if (!down) return;
                const dx = e.clientX - x0;
                if (Math.abs(dx) > 6) { moved = true; t.classList.add('dragging'); }
                if (moved) t.scrollLeft = s0 - dx;
            });
            window.addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => t.classList.remove('dragging'), 0); });
            t.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
        }

        click(e) {
            const t = e.target;
            if (t.closest('[data-close]')) return this.close(false);
            const nav = t.closest('[data-nav]');
            if (nav) {
                const track = nav.parentElement.querySelector('.avp-track');
                track.scrollBy({ left: Number(nav.dataset.nav) * track.clientWidth * 0.8, behavior: this.smooth() });
                return;
            }
            const opt = t.closest('.avp-opt');
            if (opt) return this.choose(opt.dataset.id);
            if (t.closest('[data-c-cancel]') || t.classList.contains('avp-confirm')) return this.closeConfirm();
            if (t.closest('[data-c-save]')) return this.save();
        }

        choose(id) {
            const a = AV().get(id);
            if (!a) return;
            if (!AV().isUnlocked(a)) { Nexus.ui.toast(AV().unlockText(a), { icon: '🔒' }); return; }
            if (id === this.active) {
                if (this.opts.onboarding) return this.close(false);
                Nexus.ui.toast('Ya llevas este avatar', { icon: 'ℹ️' });
                return;
            }
            const before = AV().info(this.active);
            const box = $('.avp-confirm', this.el);
            this.pending = id;
            box.innerHTML = `
                <div class="avp-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="avp-c-title">
                    <h3 id="avp-c-title">¿Cambiar el avatar?</h3>
                    <div class="avp-swap">
                        <figure><span class="avp-big" style="--av-accent:${esc(before.accent)}">${Nexus.ui.avatar.html(before.id, { size: 512 })}</span><figcaption>${esc(before.name)}<small>Actual</small></figcaption></figure>
                        <span class="avp-swap-arrow" aria-hidden="true">${icon('arrow', 28)}</span>
                        <figure><span class="avp-big is-new" style="--av-accent:${esc(a.accent)}">${Nexus.ui.avatar.html(a.id, { size: 512 })}</span><figcaption>${esc(a.name)}<small>Nuevo · ${esc(a.collectionName)}</small></figcaption></figure>
                    </div>
                    <p class="form-error" role="alert" hidden></p>
                    <div class="avp-confirm-actions">
                        <button type="button" class="btn btn-primary" data-c-save>Guardar</button>
                        <button type="button" class="btn btn-ghost" data-c-cancel>Volver</button>
                    </div>
                </div>`;
            box.hidden = false;
            requestAnimationFrame(() => box.classList.add('in'));
            $('[data-c-save]', box).focus();
        }

        closeConfirm() {
            const box = $('.avp-confirm', this.el);
            if (box.hidden) return;
            box.classList.remove('in'); box.hidden = true; box.innerHTML = '';
            const opt = $(`.avp-opt[data-id="${this.pending}"]`, this.el);
            this.pending = null;
            if (opt) opt.focus({ preventScroll: true });
        }

        async save() {
            const id = this.pending, box = $('.avp-confirm', this.el);
            const btn = $('[data-c-save]', box), err = $('.form-error', box);
            btn.disabled = true; btn.classList.add('is-loading'); err.hidden = true;
            try {
                await U().updateProfile({ avatar: id });
                Nexus.ui.toast('Avatar actualizado', { type: 'success' });
                this.close(true);
            } catch (e) {
                err.textContent = e.message || 'No se pudo guardar el avatar.'; err.hidden = false;
                btn.disabled = false; btn.classList.remove('is-loading');
            }
        }

        // ── Teclado: flechas dentro de la fila y entre filas, Esc para salir, foco atrapado ──
        key(e) {
            if (!this.el) return;
            const confirmOpen = !$('.avp-confirm', this.el).hidden;
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return confirmOpen ? this.closeConfirm() : this.close(false); }
            if (e.key === 'Tab') return this.trap(e, confirmOpen ? $('.avp-confirm', this.el) : $('.avp-shell', this.el));
            if (confirmOpen) return;
            const opt = document.activeElement && document.activeElement.closest && document.activeElement.closest('.avp-opt');
            if (!opt) return;
            const r = Number(opt.dataset.row), c = Number(opt.dataset.col);
            let target = null;
            if (e.key === 'ArrowRight') target = opt.nextElementSibling;
            else if (e.key === 'ArrowLeft') target = opt.previousElementSibling;
            else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const rows = this.el.querySelectorAll('.avp-track');
                const next = rows[r + (e.key === 'ArrowDown' ? 1 : -1)];
                if (next) target = next.children[Math.min(c, next.children.length - 1)];
            } else if (e.key === 'Home') target = opt.parentElement.firstElementChild;
            else if (e.key === 'End') target = opt.parentElement.lastElementChild;
            if (!target) return;
            e.preventDefault();
            target.focus({ preventScroll: true });
            target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: this.smooth() });
        }

        trap(e, scope) {
            const list = Array.from(scope.querySelectorAll('button:not([disabled]):not([tabindex="-1"])')).filter(b => b.offsetParent !== null);
            if (!list.length) return;
            const i = list.indexOf(document.activeElement);
            if (e.shiftKey && (i <= 0)) { e.preventDefault(); list[list.length - 1].focus(); }
            else if (!e.shiftKey && (i === -1 || i === list.length - 1)) { e.preventDefault(); list[0].focus(); }
        }

        smooth() { return document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth'; }

        close(saved) {
            if (!this.el) return;
            document.removeEventListener('keydown', this.onKey, true);
            window.removeEventListener('resize', this.onResize);
            const el = this.el; this.el = null;
            el.classList.remove('in');
            setTimeout(() => el.remove(), document.documentElement.dataset.motion === 'reduced' ? 0 : 220);
            document.body.classList.remove('avp-open');
            current = null;
            if (this.prevFocus && this.prevFocus.focus && document.contains(this.prevFocus)) this.prevFocus.focus({ preventScroll: true });
            this.resolve(!!saved);
        }
    }

    Nexus.ui.avatarPicker = {
        open(opts) {
            if (current) return Promise.resolve(false);
            if (!U().current()) return Promise.resolve(false);
            return new Promise((resolve) => { current = new Picker(opts, resolve); });
        },
        isOpen: () => !!current,
        close: () => { if (current) current.close(false); }
    };
})();
