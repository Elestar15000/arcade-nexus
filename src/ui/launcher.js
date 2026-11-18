/* ============================================================
   NEXUS ARCADE · ui/launcher.js
   Piezas comunes del launcher:
     · barra superior: buscador global (atajo «/»), retos de hoy
       (desplegable con su estado) y nivel con anillo de XP
     · «portadas» de juego (tiles) y filas desplazables que usan
       el inicio, la ficha de juego y la biblioteca
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatTime } = Nexus.util;
    const CO = () => Nexus.games.collections;

    // ── Portadas y filas ────────────────────────────────────
    /** Portada de juego (emoji grande sobre degradado del color del juego). */
    function cover(g, size = 'md') {
        const col = CO().of(g.id);
        return `<span class="cover cover-${size}" style="--game-accent:${esc(g.accent || col.color)}" aria-hidden="true">
            <span class="cover-glow"></span><span class="cover-emoji">${esc(g.emoji)}</span></span>`;
    }
    /**
     * Tile de juego para filas horizontales: portada, nombre, pie y acciones (Jugar / ficha).
     * opts: { sub, badge, href }
     */
    function tile(g, opts = {}) {
        const gs = Nexus.services.progress.stats(g.id);
        const col = CO().of(g.id);
        const fav = CO().isFav(g.id);
        return `
            <a class="tile" href="${esc(opts.href || `#/game/${g.id}`)}" data-tile="${esc(g.id)}" style="--game-accent:${esc(g.accent || col.color)}">
                ${cover(g, 'lg')}
                ${opts.badge ? `<span class="tile-badge">${opts.badge}</span>` : ''}
                ${fav ? '<span class="tile-fav" aria-label="Favorito">★</span>' : ''}
                <span class="tile-body">
                    <b>${esc(g.name)}</b>
                    <small>${opts.sub !== undefined ? opts.sub : esc(col.emoji + ' ' + col.name)}</small>
                </span>
                <span class="tile-actions"><span class="tile-play">▶ Jugar</span>
                    <button type="button" class="tile-info" data-info="${esc(g.id)}" aria-label="Ficha de ${esc(g.name)}">ℹ️</button></span>
                ${gs.played ? '' : '<span class="tile-new">NUEVO</span>'}
            </a>`;
    }
    /** Fila horizontal desplazable con cabecera. */
    function row({ id, icon, title, sub, link, linkText, items, cls = '' }) {
        if (!items.length) return '';
        return `
            <section class="lrow ${cls}" ${id ? `id="${esc(id)}"` : ''}>
                <div class="lrow-head"><span class="lrow-icon">${icon}</span><div class="lrow-txt"><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
                    ${link ? `<a class="lrow-link" href="${esc(link)}">${esc(linkText || 'Ver todo')} →</a>` : ''}
                    <span class="lrow-nav"><button type="button" class="lrow-btn" data-scroll="-1" aria-label="Anterior">‹</button><button type="button" class="lrow-btn" data-scroll="1" aria-label="Siguiente">›</button></span></div>
                <div class="lrow-track">${items.join('')}</div>
            </section>`;
    }
    /** Activa flechas, rueda y botones de ficha dentro de un contenedor. */
    function bindRows(root) {
        $$('.lrow', root).forEach(sec => {
            const track = $('.lrow-track', sec); if (!track) return;
            $$('[data-scroll]', sec).forEach(b => b.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.8 * Number(b.dataset.scroll), behavior: 'smooth' })));
            const upd = () => { sec.classList.toggle('at-start', track.scrollLeft <= 2); sec.classList.toggle('at-end', track.scrollLeft + track.clientWidth >= track.scrollWidth - 2); sec.classList.toggle('no-scroll', track.scrollWidth <= track.clientWidth + 2); };
            track.addEventListener('scroll', upd, { passive: true }); upd();
            requestAnimationFrame(upd);
        });
        root.addEventListener('click', (e) => {
            const i = e.target.closest('[data-info]'); if (!i) return;
            e.preventDefault(); e.stopPropagation();
            Nexus.ui.router.navigate('info/' + i.dataset.info);
        });
    }

    // ── Barra superior ──────────────────────────────────────
    const Topbar = {
        init() {
            this.input = $('#topbar-search-input'); this.pop = $('#topbar-pop'); this.btn = $('#topbar-daily');
            if (!this.input) return;
            let t = 0;
            this.input.addEventListener('input', () => {
                clearTimeout(t);
                t = setTimeout(() => {
                    const q = this.input.value.trim();
                    Nexus.ui.searchQuery = q;
                    const r = Nexus.ui.router.current;
                    if (q && (!r || r.name !== 'library')) Nexus.ui.router.navigate('library');
                    else Nexus.bus.emit('search:change', q);
                }, 160);
            });
            this.input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.input.value = ''; Nexus.ui.searchQuery = ''; Nexus.bus.emit('search:change', ''); this.input.blur(); } });
            document.addEventListener('keydown', (e) => {
                if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input,textarea,[contenteditable]') && $('#shell') && !$('#shell').hidden) {
                    const r = Nexus.ui.router.current; if (r && r.name === 'game') return;
                    e.preventDefault(); this.input.focus(); this.input.select();
                }
            });
            this.btn.addEventListener('click', (e) => { e.stopPropagation(); this.pop.hidden ? this.openDaily() : this.closeDaily(); });
            document.addEventListener('click', (e) => { if (!this.pop.hidden && !this.pop.contains(e.target)) this.closeDaily(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.pop.hidden) this.closeDaily(); });
            window.addEventListener('hashchange', () => this.closeDaily());
            // Menú de la cuenta (avatar)
            this.ubtn = $('#topbar-user-btn'); this.menu = $('#topbar-menu');
            if (this.ubtn) {
                this.ubtn.addEventListener('click', (e) => { e.stopPropagation(); this.menu.hidden ? this.openMenu() : this.closeMenu(); });
                document.addEventListener('click', (e) => { if (!this.menu.hidden && !this.menu.contains(e.target)) this.closeMenu(); });
                document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.menu.hidden) { this.closeMenu(); this.ubtn.focus(); } });
                window.addEventListener('hashchange', () => this.closeMenu());
                this.menu.addEventListener('keydown', (e) => {
                    const items = $$('[role=menuitem]', this.menu), i = items.indexOf(document.activeElement);
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
                });
            }
            Nexus.bus.on('progress:update', () => this.renderDaily());
            Nexus.bus.on('user:login', () => this.renderDaily());
            this.renderDaily();
        },
        /** Contador de retos pendientes en el botón. */
        renderDaily() {
            if (!this.btn || !Nexus.services.users.data()) return;
            const d = CO().dailies();
            const left = d.filter(x => !x.done).length;
            const badge = $('#topbar-daily-badge');
            badge.hidden = !left; badge.textContent = String(left);
            this.btn.classList.toggle('done', !!d.length && !left);
            this.btn.title = left ? `${left} reto${left === 1 ? '' : 's'} de hoy por hacer` : 'Retos de hoy completados';
        },
        openDaily() {
            const d = CO().dailies();
            const done = d.filter(x => x.done).length;
            this.pop.innerHTML = `<div class="tpop-head"><b>📅 Retos de hoy</b><span>${done}/${d.length}</span></div>
                <div class="tpop-list">${d.map(x => `
                    <a class="tpop-item ${x.done ? 'done' : ''}" href="${esc(x.href)}" style="--game-accent:${esc(x.accent || 'var(--primary)')}">
                        <span class="tpop-emo">${esc(x.emoji)}</span><span class="tpop-txt"><b>${esc(x.label)}</b><small>${esc(x.name)} · ${esc(x.text)}</small></span>
                        <span class="tpop-state">${x.done ? '✅' : '▶'}</span></a>`).join('') || '<p class="muted small">No hay retos diarios.</p>'}</div>
                <div class="tpop-foot"><span class="muted small">🔥 Racha de días: <b>${formatNumber((Nexus.services.users.data() || { meta: {} }).meta.dayStreak || 0)}</b></span></div>`;
            this.pop.hidden = false; this.btn.setAttribute('aria-expanded', 'true');
        },
        openMenu() {
            const u = Nexus.services.users.current(); if (!u) return;
            const lv = Nexus.services.progress.level(), B = Nexus.ui.brand;
            const item = (href, emo, label) => `<a role="menuitem" class="tb-mi" href="${href}"><span aria-hidden="true">${emo}</span>${esc(label)}</a>`;
            this.menu.innerHTML = `
                <div class="tb-menu-head" style="--user-color:${esc(Nexus.ui.avatar.accent(u.avatar))}">${Nexus.ui.avatar.user(u, 'md')}
                    <span><b>${esc(u.name)}</b><small>${esc(lv.rank.icon)} ${esc(lv.rank.name)} · Nivel ${lv.level}</small></span></div>
                ${item('#/profile', '👤', 'Mi perfil')}<button role="menuitem" type="button" class="tb-mi" data-avatar-pick><span aria-hidden="true">🎨</span>Cambiar avatar</button>${item('#/achievements', '🏅', 'Logros')}${item('#/stats', '📊', 'Estadísticas')}${item('#/settings', '⚙️', 'Ajustes')}
                ${Nexus.services.users.isAdmin() ? item('#/admin', '🛡️', 'Administración') : ''}
                <hr><button role="menuitem" type="button" class="tb-mi tb-mi-out" data-logout>${B.icon('logout', 18)}Cerrar sesión</button>`;
            $('[data-logout]', this.menu).addEventListener('click', () => { this.closeMenu(); Nexus.app.logout(); });
            $('[data-avatar-pick]', this.menu).addEventListener('click', () => { this.closeMenu(); Nexus.ui.avatarPicker.open(); });
            this.menu.hidden = false; this.ubtn.setAttribute('aria-expanded', 'true');
            const first = $('[role=menuitem]', this.menu); if (first) first.focus({ preventScroll: true });
        },
        closeMenu() { if (this.menu && !this.menu.hidden) { this.menu.hidden = true; this.ubtn.setAttribute('aria-expanded', 'false'); } },
        closeDaily() { if (this.pop && !this.pop.hidden) { this.pop.hidden = true; this.btn.setAttribute('aria-expanded', 'false'); } },
        /** Anillo de XP y avatar junto al nivel. */
        renderUser() {
            const user = Nexus.services.users.current(); if (!user) return;
            const lv = Nexus.services.progress.level();
            const ring = $('#topbar-ring'); if (ring) ring.title = `Nivel ${lv.level} · ${formatNumber(lv.xp)} / ${formatNumber(lv.next)} XP`;
            const xp = $('#topbar-xp'); if (xp) xp.style.width = lv.pct + '%';
            const lvEl = $('#topbar-level'); if (lvEl) lvEl.textContent = `Nivel ${lv.level}`;
            const av = $('#topbar-avatar'); if (av) { Nexus.ui.avatar.set(av, user.avatar, Nexus.ui.avatar.pick(38)); av.parentElement.style.setProperty('--user-color', Nexus.ui.avatar.accent(user.avatar)); }
        },
        /** Miga de pan de la barra superior. */
        setCrumb(text) { const c = $('#page-crumb'); if (c) c.textContent = text; }
    };

    Nexus.ui.launcher = { cover, tile, row, bindRows, topbar: Topbar };
})();
