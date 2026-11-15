/* ============================================================
   NEXUS ARCADE · ui/admin.js — Panel de control de administración
   Acceso: cuenta administradora + su contraseña + clave de
   administrador (las comprueba el servidor). La sesión dura 30 min
   y sólo vive en esta pestaña (sessionStorage).
   Secciones: Resumen · Cuentas (ficha, suspender, eliminar) ·
   Pop-ups · Mantenimiento · Registro.
   Se abre como página (#/admin) con la sesión iniciada, o a pantalla
   completa desde el acceso o la pantalla de mantenimiento.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, formatNumber, formatTime, formatDuration, timeAgo } = Nexus.util;
    const B = () => Nexus.backend.admin;
    const KEY = 'nexus-admin';
    const KINDS = [['info', '📣', 'Aviso'], ['warn', '⚠️', 'Importante'], ['alert', '🚨', 'Urgente']];
    const KIND = Object.fromEntries(KINDS.map(([k, i, l]) => [k, { icon: i, label: l }]));
    const ACTIONS = {
        login: ['🔑', 'Acceso al panel'], suspend: ['⛔', 'Suspensión'], unsuspend: ['✅', 'Reactivación'], delete: ['🗑️', 'Cuenta eliminada'],
        message: ['📨', 'Pop-up enviado'], cancel: ['↩️', 'Pop-up retirado'], 'maintenance-on': ['🛠️', 'Mantenimiento activado'], 'maintenance-off': ['🟢', 'Mantenimiento desactivado']
    };
    const TABS = [['overview', '📊', 'Resumen'], ['accounts', '👥', 'Cuentas'], ['messages', '📨', 'Pop-ups'], ['maintenance', '🛠️', 'Mantenimiento'], ['log', '📜', 'Registro']];
    const dateTime = (t) => (t ? new Date(t).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
    const pctOf = (a, b) => (b ? Math.round(a / b * 100) : 0);
    const gameOf = (id) => Nexus.games.registry.get(id) || { name: id, emoji: '🎮' };

    // ── Sesión de administrador ─────────────────────────────
    function readSession() {
        try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return s && s.token && s.expiresAt > Date.now() ? s : null; }
        catch (e) { return null; }
    }
    function writeSession(s) {
        try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ }
        Admin._mem = s;
        Nexus.bus.emit('admin:session', !!s);
    }

    class Panel {
        constructor(root, opts = {}) {
            this.root = root; this.standalone = !!opts.standalone;
            this.tab = opts.tab || 'overview';
            this.data = null; this.sel = new Set(); this.q = ''; this.filter = 'all'; this.sort = 'xp';
            this.compose = { to: [], kind: 'info', title: '', body: '' };
            this.alive = true;
            this.tick = setInterval(() => this.countdown(), 1000);
            this.render();
        }
        destroy() { this.alive = false; clearInterval(this.tick); }
        get s() { return Admin.session(); }

        /** Llama al servidor con el token de administrador; si la sesión ya no vale vuelve al acceso. */
        async call(fn, ...args) {
            try { return await fn(this.s.token, ...args); }
            catch (e) {
                if (e.status === 401 || e.code === 'admin_required') { writeSession(null); this.render('Tu sesión de administrador ha terminado: ' + e.message); }
                throw e;
            }
        }

        render(notice) {
            if (!this.alive) return;
            if (!this.s) return this.renderLogin(notice);
            this.root.innerHTML = `
                <div class="adm">
                    <header class="adm-head">
                        <div class="adm-id"><span class="adm-shield" aria-hidden="true">🛡️</span>
                            <div><h2>Panel de control</h2><p>Sesión de <b>${esc(this.s.name)}</b> · caduca en <b class="adm-exp" id="adm-exp">--:--</b></p></div></div>
                        <div class="adm-head-act">
                            <span class="adm-maint-chip" id="adm-maint-chip" hidden></span>
                            <button type="button" class="btn btn-ghost btn-sm" data-act="refresh">🔄 Actualizar</button>
                            <button type="button" class="btn btn-ghost btn-sm" data-act="logout">🔒 Salir del panel</button>
                        </div>
                    </header>
                    <nav class="tabs adm-tabs" role="tablist">${TABS.map(([id, ic, label]) => `
                        <button type="button" role="tab" class="tab ${this.tab === id ? 'active' : ''}" aria-selected="${this.tab === id}" data-tab="${id}">${ic} ${label}<span class="adm-tab-n" data-n="${id}"></span></button>`).join('')}</nav>
                    <div class="adm-body" id="adm-body"><div class="adm-loading"><span class="spinner"></span> Cargando datos del servidor…</div></div>
                </div>`;
            $$('[data-tab]', this.root).forEach(b => b.addEventListener('click', () => this.setTab(b.dataset.tab)));
            $('[data-act=refresh]', this.root).addEventListener('click', () => this.load(true));
            $('[data-act=logout]', this.root).addEventListener('click', () => { writeSession(null); this.render('Has salido del panel de administración.'); });
            this.countdown();
            this.load();
        }

        renderLogin(notice) {
            const me = Nexus.services.users.current();
            this.root.innerHTML = `
                <div class="adm-login">
                    <div class="adm-login-card">
                        <div class="adm-login-badge" aria-hidden="true">🛡️</div>
                        <h2>Panel de administración</h2>
                        <p class="adm-login-lead">Acceso restringido. Entra con una <b>cuenta administradora</b>, su contraseña y la <b>clave de administrador</b>.</p>
                        ${notice ? `<p class="adm-login-note">${esc(notice)}</p>` : ''}
                        <form id="adm-login-form" novalidate>
                            <label class="field"><span class="field-label">Cuenta administradora</span>
                                <input class="input" id="adm-name" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(me ? me.name : '')}" /></label>
                            <label class="field"><span class="field-label">Contraseña de la cuenta</span>
                                <input class="input" id="adm-pass" type="password" autocomplete="current-password" /></label>
                            <label class="field"><span class="field-label">Clave de administrador</span>
                                <input class="input" id="adm-key" type="password" autocomplete="off" /></label>
                            <p class="form-error" id="adm-error" role="alert" hidden></p>
                            <button class="btn btn-primary btn-lg" id="adm-submit" type="submit">🔓 Entrar al panel</button>
                        </form>
                        <ul class="adm-login-facts">
                            <li>🔐 Lo comprueba el servidor: el navegador no sabe quién es administrador.</li>
                            <li>⏱️ La sesión dura 30 minutos y sólo vale en esta pestaña.</li>
                            <li>📜 Cada acceso y cada acción quedan en el registro.</li>
                        </ul>
                    </div>
                </div>`;
            const f = $('#adm-login-form', this.root);
            const first = $(me ? '#adm-pass' : '#adm-name', this.root);
            // Foco inicial sin robárselo a un campo que ya se esté rellenando
            if (first) requestAnimationFrame(() => { if (!f.contains(document.activeElement)) first.focus({ preventScroll: true }); });
            f.addEventListener('submit', async (e) => {
                e.preventDefault();
                const err = $('#adm-error', this.root), btn = $('#adm-submit', this.root);
                const name = $('#adm-name', this.root).value.trim(), password = $('#adm-pass', this.root).value, key = $('#adm-key', this.root).value;
                err.hidden = true;
                if (!name || !password || !key) { err.textContent = 'Rellena los tres campos.'; err.hidden = false; return; }
                btn.classList.add('is-loading'); btn.disabled = true;
                try {
                    const r = await B().login({ name, password, key });
                    writeSession({ token: r.token, name: r.admin.name, avatar: r.admin.avatar, expiresAt: r.expiresAt });
                    Nexus.audio.play('orbCollect');
                    this.render();
                } catch (x) {
                    btn.classList.remove('is-loading'); btn.disabled = false;
                    err.textContent = x.message || 'No se pudo entrar.'; err.hidden = false;
                    $('#adm-pass', this.root).value = ''; $('#adm-key', this.root).value = '';
                }
            });
        }

        countdown() {
            const el = $('#adm-exp', this.root);
            const s = this.s;
            if (!el) return;
            if (!s) { writeSession(null); this.render('La sesión de administrador ha caducado. Vuelve a entrar.'); return; }
            const left = Math.max(0, Math.round((s.expiresAt - Date.now()) / 1000));
            el.textContent = formatTime(left);
            el.classList.toggle('low', left < 120);
        }

        async load(manual) {
            const body = $('#adm-body', this.root);
            try {
                this.data = await this.call(B().overview);
                if (!this.alive) return;
                const names = new Set(this.data.users.map(u => u.lname));
                this.sel.forEach(n => { if (!names.has(n)) this.sel.delete(n); });
                this.paintChrome();
                this.paintTab();
                if (manual) Nexus.ui.toast('Datos actualizados', { icon: '🔄' });
            } catch (e) {
                if (this.s && body) body.innerHTML = Nexus.ui.components.empty('⚠️', 'No se pudieron cargar los datos', e.message, '<button type="button" class="btn btn-primary btn-sm" data-retry>Reintentar</button>');
                const r = body && $('[data-retry]', body); if (r) r.addEventListener('click', () => this.load());
            }
        }

        paintChrome() {
            const d = this.data, m = d.maintenance;
            const chip = $('#adm-maint-chip', this.root);
            if (chip) { chip.hidden = false; chip.className = 'adm-maint-chip ' + (m.on ? 'on' : 'off'); chip.textContent = m.on ? '🛠️ Mantenimiento activo' : '🟢 Página abierta'; }
            const n = { accounts: d.users.length, messages: d.messages.filter(x => !x.readAt).length || '' };
            $$('[data-n]', this.root).forEach(s => { s.textContent = n[s.dataset.n] ? String(n[s.dataset.n]) : ''; });
            Nexus.services.notices.setMaintenance(m);
        }

        setTab(tab) {
            this.tab = tab;
            $$('[data-tab]', this.root).forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
            if (this.data) this.paintTab();
        }

        paintTab() {
            const body = $('#adm-body', this.root);
            if (!body || !this.data) return;
            body.innerHTML = this['tab_' + this.tab]();
            this['bind_' + this.tab](body);
        }

        // ── Resumen ─────────────────────────────────────────
        tab_overview() {
            const us = this.data.users;
            const sum = (k) => us.reduce((n, u) => n + (u[k] || 0), 0);
            const played = sum('played'), wins = sum('wins');
            const susp = us.filter(u => u.suspended).length;
            const unread = this.data.messages.filter(m => !m.readAt).length;
            const avgLv = us.length ? (sum('level') / us.length).toFixed(1) : '0';
            const games = {};
            us.forEach(u => Object.entries(u.stats || {}).forEach(([g, s]) => {
                if (!s.played) return;
                const x = games[g] || (games[g] = { played: 0, wins: 0, players: 0 });
                x.played += s.played; x.wins += s.wins; x.players++;
            }));
            const top = Object.entries(games).sort((a, b) => b[1].played - a[1].played).slice(0, 10);
            const maxP = top.length ? top[0][1].played : 1;
            const best = us.slice().sort((a, b) => b.totalXP - a.totalXP).slice(0, 8);
            const kpi = (ic, v, l, cls = '') => `<div class="adm-kpi ${cls}"><span class="adm-kpi-ic">${ic}</span><b>${v}</b><small>${l}</small></div>`;
            return `
                <div class="adm-kpis">
                    ${kpi('👥', formatNumber(us.length), 'cuentas')}
                    ${kpi('⛔', formatNumber(susp), 'suspendidas', susp ? 'warn' : '')}
                    ${kpi('🎮', formatNumber(played), 'partidas jugadas')}
                    ${kpi('🏆', pctOf(wins, played) + ' %', `victorias (${formatNumber(wins)})`)}
                    ${kpi('✨', formatNumber(sum('totalXP')), 'XP total')}
                    ${kpi('📈', avgLv, 'nivel medio')}
                    ${kpi('🏅', formatNumber(sum('achievements')), 'logros desbloqueados')}
                    ${kpi('📨', formatNumber(unread), 'pop-ups sin leer')}
                </div>
                <div class="adm-grid2">
                    <section class="lpanel">
                        <div class="lpanel-head"><h2>🎮 Juegos más jugados</h2><span class="muted small">partidas · jugadores</span></div>
                        ${top.length ? `<ul class="adm-bars">${top.map(([g, x]) => { const G = gameOf(g); return `
                            <li><span class="adm-bar-name">${esc(G.emoji)} ${esc(G.name)}</span>
                                <span class="adm-bar"><i style="width:${Math.max(4, x.played / maxP * 100)}%"></i></span>
                                <span class="adm-bar-n">${formatNumber(x.played)} <small>· ${x.players} 👤</small></span></li>`; }).join('')}</ul>`
                            : Nexus.ui.components.empty('🎮', 'Aún no hay partidas', '')}
                    </section>
                    <section class="lpanel">
                        <div class="lpanel-head"><h2>🏆 Jugadores con más XP</h2><button type="button" class="link" data-goto="accounts">Ver cuentas →</button></div>
                        <ol class="adm-top">${best.map((u, i) => `
                            <li><button type="button" data-user="${esc(u.lname)}"><span class="adm-top-pos">${i + 1}</span>${this.avatar(u)}
                                <span class="adm-top-name"><b>${esc(u.name)}</b><small>Nivel ${u.level} · ${formatNumber(u.played)} partidas</small></span>
                                <span class="adm-top-xp">${formatNumber(u.totalXP)} XP</span></button></li>`).join('')}</ol>
                    </section>
                </div>
                <section class="lpanel">
                    <div class="lpanel-head"><h2>📜 Últimas acciones del panel</h2><button type="button" class="link" data-goto="log">Registro completo →</button></div>
                    ${this.logList(this.data.log.slice(0, 6))}
                </section>`;
        }
        bind_overview(body) {
            $$('[data-goto]', body).forEach(b => b.addEventListener('click', () => this.setTab(b.dataset.goto)));
            $$('[data-user]', body).forEach(b => b.addEventListener('click', () => this.openUser(b.dataset.user)));
        }

        avatar(u) { return `<span class="avatar avatar-sm" style="--user-color:${esc(u.color || '#6c5ce7')}" aria-hidden="true">${esc(u.avatar || '🎮')}</span>`; }

        // ── Cuentas ─────────────────────────────────────────
        filtered() {
            const q = this.q.trim().toLowerCase();
            const list = this.data.users.filter(u =>
                (!q || u.lname.includes(q)) &&
                (this.filter === 'all' || (this.filter === 'active' && !u.suspended) || (this.filter === 'suspended' && u.suspended) || (this.filter === 'admin' && u.admin)));
            const by = { xp: (u) => -u.totalXP, level: (u) => -u.level, played: (u) => -u.played, wins: (u) => -u.wins, name: (u) => u.lname };
            const f = by[this.sort] || by.xp;
            return list.sort((a, b) => { const x = f(a), y = f(b); return x < y ? -1 : x > y ? 1 : 0; });
        }
        tab_accounts() {
            const seg = [['all', 'Todas'], ['active', 'Activas'], ['suspended', 'Suspendidas'], ['admin', 'Administradores']];
            return `
                <div class="adm-toolbar">
                    <label class="search adm-search"><span aria-hidden="true">🔎</span><input type="search" id="adm-q" placeholder="Buscar cuenta…" value="${esc(this.q)}" aria-label="Buscar cuenta" /></label>
                    <div class="segmented" role="group" aria-label="Filtrar">${seg.map(([id, l]) => `<button type="button" class="${this.filter === id ? 'active' : ''}" data-filter="${id}">${l}</button>`).join('')}</div>
                    <label class="adm-sort"><span class="muted small">Ordenar</span>
                        <select class="input input-sm" id="adm-sort">${[['xp', 'XP'], ['level', 'Nivel'], ['played', 'Partidas'], ['wins', 'Victorias'], ['name', 'Nombre']].map(([v, l]) => `<option value="${v}" ${this.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
                </div>
                <div class="adm-bulk" id="adm-bulk"></div>
                <div class="lpanel adm-table-panel"><div class="table-wrap"><table class="table adm-table">
                    <thead><tr><th class="adm-cb"><input type="checkbox" id="adm-all" aria-label="Seleccionar todas" /></th><th>Cuenta</th><th>Nivel</th><th>XP</th><th>Partidas</th><th>Victorias</th><th>Logros</th><th>Estado</th><th class="adm-act-h">Acciones</th></tr></thead>
                    <tbody id="adm-rows"></tbody></table></div><p class="adm-empty-row muted" id="adm-none" hidden>Ninguna cuenta coincide.</p></div>`;
        }
        rows() {
            const list = this.filtered();
            $('#adm-rows', this.root).innerHTML = list.map(u => `
                <tr class="${u.suspended ? 'is-susp' : ''}" data-row="${esc(u.lname)}">
                    <td class="adm-cb">${u.admin ? '' : `<input type="checkbox" data-sel="${esc(u.lname)}" ${this.sel.has(u.lname) ? 'checked' : ''} aria-label="Seleccionar ${esc(u.name)}" />`}</td>
                    <td><button type="button" class="adm-who" data-user="${esc(u.lname)}">${this.avatar(u)}<span><b>${esc(u.name)}</b>${u.unread ? `<small>📨 ${u.unread} sin leer</small>` : ''}</span></button></td>
                    <td data-l="Nivel">${u.level}</td><td data-l="XP">${formatNumber(u.totalXP)}</td><td data-l="Partidas">${formatNumber(u.played)}</td>
                    <td data-l="Victorias">${formatNumber(u.wins)} <small class="muted">${pctOf(u.wins, u.played)}%</small></td><td data-l="Logros">${u.achievements}</td>
                    <td class="adm-state">${u.admin ? '<span class="adm-badge admin">🛡️ Admin</span>' : u.suspended ? `<span class="adm-badge susp" title="${esc(u.suspended.reason || '')}">⛔ Suspendida${u.suspended.until ? ' · ' + esc(new Date(u.suspended.until).toLocaleDateString('es-ES')) : ''}</span>` : '<span class="adm-badge ok">Activa</span>'}</td>
                    <td class="adm-acts">
                        <button type="button" class="adm-ic" data-user="${esc(u.lname)}" title="Ver ficha" aria-label="Ver ficha de ${esc(u.name)}">👁️</button>
                        <button type="button" class="adm-ic" data-msg="${esc(u.lname)}" title="Enviar pop-up" aria-label="Enviar pop-up a ${esc(u.name)}">✉️</button>
                        ${u.admin ? '' : u.suspended
                            ? `<button type="button" class="adm-ic" data-unsusp="${esc(u.lname)}" title="Reactivar" aria-label="Reactivar ${esc(u.name)}">✅</button>`
                            : `<button type="button" class="adm-ic" data-susp="${esc(u.lname)}" title="Suspender" aria-label="Suspender ${esc(u.name)}">⛔</button>`}
                        ${u.admin ? '' : `<button type="button" class="adm-ic danger" data-del="${esc(u.lname)}" title="Eliminar" aria-label="Eliminar ${esc(u.name)}">🗑️</button>`}
                    </td></tr>`).join('');
            $('#adm-none', this.root).hidden = !!list.length;
            const sel = list.filter(u => !u.admin);
            const all = $('#adm-all', this.root);
            all.checked = sel.length > 0 && sel.every(u => this.sel.has(u.lname));
            all.indeterminate = !all.checked && sel.some(u => this.sel.has(u.lname));
            this.bulk();
        }
        bulk() {
            const el = $('#adm-bulk', this.root); if (!el) return;
            const n = this.sel.size;
            el.classList.toggle('on', n > 0);
            el.innerHTML = n ? `<span><b>${n}</b> cuenta${n === 1 ? '' : 's'} seleccionada${n === 1 ? '' : 's'}</span>
                <button type="button" class="btn btn-primary btn-sm" data-bulk="msg">✉️ Enviar pop-up</button>
                <button type="button" class="btn btn-ghost btn-sm" data-bulk="clear">Quitar selección</button>` : '';
            if (n) {
                $('[data-bulk=msg]', el).addEventListener('click', () => this.composeTo([...this.sel]));
                $('[data-bulk=clear]', el).addEventListener('click', () => { this.sel.clear(); this.rows(); });
            }
        }
        bind_accounts(body) {
            const q = $('#adm-q', body);
            q.addEventListener('input', () => { this.q = q.value; this.rows(); });
            $$('[data-filter]', body).forEach(b => b.addEventListener('click', () => { this.filter = b.dataset.filter; $$('[data-filter]', body).forEach(x => x.classList.toggle('active', x === b)); this.rows(); }));
            $('#adm-sort', body).addEventListener('change', (e) => { this.sort = e.target.value; this.rows(); });
            $('#adm-all', body).addEventListener('change', (e) => { this.filtered().filter(u => !u.admin).forEach(u => e.target.checked ? this.sel.add(u.lname) : this.sel.delete(u.lname)); this.rows(); });
            $('#adm-rows', body).addEventListener('click', (e) => {
                const t = e.target.closest('button,input'); if (!t) return;
                const d = t.dataset;
                if (d.sel) { t.checked ? this.sel.add(d.sel) : this.sel.delete(d.sel); this.rows(); }
                else if (d.user) this.openUser(d.user);
                else if (d.msg) this.composeTo([d.msg]);
                else if (d.susp) this.suspend(d.susp);
                else if (d.unsusp) this.unsuspend(d.unsusp);
                else if (d.del) this.remove(d.del);
            });
            this.rows();
        }

        // ── Ficha de una cuenta ─────────────────────────────
        async openUser(lname) {
            const m = Nexus.ui.modal.open({ className: 'modal-wide adm-user-modal', body: '<div class="adm-loading"><span class="spinner"></span> Cargando ficha…</div>' });
            let r;
            try { r = await this.call(B().user, lname); }
            catch (e) { m.body.innerHTML = `<p class="form-error">${esc(e.message)}</p>`; return; }
            const a = r.account, d = r.data, meta = d.meta || {};
            const stats = Object.entries(d.stats || {}).filter(([, s]) => s && s.played).sort((x, y) => y[1].played - x[1].played);
            const played = stats.reduce((n, [, s]) => n + s.played, 0), wins = stats.reduce((n, [, s]) => n + (s.wins || 0), 0);
            const kpi = (v, l) => `<div class="adm-mini"><b>${v}</b><small>${l}</small></div>`;
            m.body.innerHTML = `
                <div class="adm-user">
                    <header class="adm-user-head" style="--user-color:${esc(a.color)}">
                        <span class="avatar avatar-lg" aria-hidden="true">${esc(a.avatar)}</span>
                        <div><h2>${esc(a.name)}</h2>
                            <div class="chips">${a.admin ? '<span class="adm-badge admin">🛡️ Administrador</span>' : ''}
                                ${a.suspended ? `<span class="adm-badge susp">⛔ Suspendida ${a.suspended.until ? 'hasta ' + esc(dateTime(a.suspended.until)) : 'indefinidamente'}</span>` : '<span class="adm-badge ok">Activa</span>'}</div>
                            ${a.suspended && a.suspended.reason ? `<p class="adm-user-reason">Motivo: ${esc(a.suspended.reason)}</p>` : ''}</div>
                    </header>
                    <dl class="adm-facts">
                        <div><dt>Cuenta creada</dt><dd>${esc(dateTime(a.createdAt))}</dd></div>
                        <div><dt>Último inicio de sesión</dt><dd>${esc(dateTime(a.lastLoginAt))}</dd></div>
                        <div><dt>Última sincronización</dt><dd>${r.updatedAt ? esc(timeAgo(r.updatedAt)) : '—'}</dd></div>
                        <div><dt>Días jugados</dt><dd>${formatNumber(meta.daysPlayed || 0)} · racha ${formatNumber(meta.dayStreak || 0)} (mejor ${formatNumber(meta.bestDayStreak || 0)})</dd></div>
                    </dl>
                    <div class="adm-minis">
                        ${kpi(d.xp.level, 'nivel')}${kpi(formatNumber(d.xp.total), 'XP total')}${kpi(formatNumber(played), 'partidas')}
                        ${kpi(pctOf(wins, played) + ' %', 'victorias')}${kpi(esc(formatDuration(meta.playTime || 0)), 'tiempo jugado')}${kpi(Object.keys(d.achievements || {}).length, 'logros')}
                    </div>
                    <h3 class="adm-h3">🎮 Estadísticas por juego</h3>
                    ${stats.length ? `<div class="table-wrap"><table class="table adm-gtable"><thead><tr><th>Juego</th><th>Partidas</th><th>Victorias</th><th>Récord</th><th>Mejor tiempo</th><th>Mejor racha</th></tr></thead><tbody>
                        ${stats.map(([g, s]) => { const G = gameOf(g); return `<tr><td>${esc(G.emoji)} ${esc(G.name)}</td><td>${formatNumber(s.played)}</td><td>${formatNumber(s.wins || 0)} <small class="muted">${pctOf(s.wins || 0, s.played)}%</small></td>
                            <td>${s.bestScore ? formatNumber(s.bestScore) : '—'}</td><td>${s.bestTime !== null && s.bestTime !== undefined ? formatTime(s.bestTime) : '—'}</td><td>${s.bestStreak || 0}</td></tr>`; }).join('')}
                    </tbody></table></div>` : '<p class="muted">Todavía no ha jugado ninguna partida.</p>'}
                    <div class="adm-grid2">
                        <div><h3 class="adm-h3">🕑 Últimas partidas</h3>
                            ${d.history.length ? `<ul class="history-list">${d.history.slice(0, 8).map(Nexus.ui.components.historyRow).join('')}</ul>` : '<p class="muted">Sin partidas.</p>'}</div>
                        <div><h3 class="adm-h3">📨 Pop-ups enviados</h3>
                            ${r.messages.length ? `<ul class="adm-msgs">${r.messages.slice().reverse().map(x => `<li class="kind-${esc(x.kind)}"><b>${esc((KIND[x.kind] || KIND.info).icon)} ${esc(x.title)}</b><small>${esc(dateTime(x.at))} · ${x.readAt ? '✓ leído ' + esc(timeAgo(x.readAt)) : '⏳ pendiente'}</small></li>`).join('')}</ul>` : '<p class="muted">Ninguno.</p>'}</div>
                    </div>
                </div>`;
            const btns = document.createElement('div');
            btns.className = 'modal-buttons';
            btns.innerHTML = `<button type="button" class="btn btn-ghost" data-u="msg">✉️ Enviar pop-up</button>
                ${a.admin ? '' : a.suspended ? '<button type="button" class="btn btn-ghost" data-u="unsusp">✅ Reactivar</button>' : '<button type="button" class="btn btn-ghost" data-u="susp">⛔ Suspender</button>'}
                ${a.admin ? '' : '<button type="button" class="btn btn-danger-ghost" data-u="del">🗑️ Eliminar cuenta</button>'}`;
            m.body.appendChild(btns);
            btns.addEventListener('click', (e) => {
                const b = e.target.closest('[data-u]'); if (!b) return;
                m.close();
                const act = { msg: () => this.composeTo([lname]), susp: () => this.suspend(lname), unsusp: () => this.unsuspend(lname), del: () => this.remove(lname) }[b.dataset.u];
                setTimeout(act, 120);
            });
        }

        // ── Acciones sobre cuentas ──────────────────────────
        nameOf(lname) { const u = this.data.users.find(x => x.lname === lname); return u ? u.name : lname; }

        suspend(lname) {
            const name = this.nameOf(lname);
            const body = document.createElement('div');
            body.innerHTML = `
                <p class="modal-text">La cuenta <b>${esc(name)}</b> no podrá iniciar sesión y se cerrarán todas sus sesiones abiertas.</p>
                <div class="field"><span class="field-label">Duración</span>
                    <div class="segmented adm-days">${[[1, '1 día'], [7, '7 días'], [30, '30 días'], [0, 'Indefinida']].map(([v, l], i) => `<button type="button" data-days="${v}" class="${i === 1 ? 'active' : ''}">${l}</button>`).join('')}</div></div>
                <label class="field"><span class="field-label">Motivo <small>(lo verá el jugador)</small></span>
                    <textarea class="input" id="adm-reason" rows="3" maxlength="200" placeholder="Por ejemplo: uso de trampas en el ranking"></textarea></label>
                <p class="form-error" role="alert" hidden></p>`;
            let days = 7;
            $$('[data-days]', body).forEach(b => b.addEventListener('click', () => { days = +b.dataset.days; $$('[data-days]', body).forEach(x => x.classList.toggle('active', x === b)); }));
            Nexus.ui.modal.open({
                icon: '⛔', title: `Suspender a ${name}`, className: 'modal-sm', body,
                actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Suspender cuenta', kind: 'danger', onClick: async () => {
                    try {
                        await this.call(B().suspend, { name: lname, reason: $('#adm-reason', body).value, days });
                        Nexus.ui.toast(`${name} suspendida${days ? ` ${days} día${days === 1 ? '' : 's'}` : ''}`, { icon: '⛔' });
                        this.load();
                    } catch (e) { const er = $('.form-error', body); er.textContent = e.message; er.hidden = false; return false; }
                } }]
            });
        }

        async unsuspend(lname) {
            const name = this.nameOf(lname);
            if (!(await Nexus.ui.modal.confirm({ icon: '✅', title: `Reactivar a ${name}`, message: 'Podrá volver a iniciar sesión y jugar con normalidad.', confirmLabel: 'Reactivar cuenta' }))) return;
            try { await this.call(B().unsuspend, lname); Nexus.ui.toast(`${name} vuelve a estar activa`, { icon: '✅', type: 'success' }); this.load(); }
            catch (e) { Nexus.ui.toast(e.message, { type: 'error' }); }
        }

        async remove(lname) {
            const name = this.nameOf(lname);
            const val = await Nexus.ui.modal.prompt({
                icon: '🗑️', title: `Eliminar la cuenta ${name}`, label: `Escribe «${name}» para confirmar`, placeholder: name, confirmLabel: 'Eliminar para siempre',
                message: 'Se borran la cuenta, su progreso, sus logros y su puesto en el ranking. No se puede deshacer.',
                validate: (v) => (v.trim().toLowerCase() === lname ? null : 'El nombre no coincide.')
            });
            if (val === null) return;
            try {
                await this.call(B().remove, { name: lname, confirm: val.trim() });
                this.sel.delete(lname);
                Nexus.ui.toast(`Cuenta ${name} eliminada`, { icon: '🗑️' });
                this.load();
            } catch (e) { Nexus.ui.toast(e.message, { type: 'error' }); }
        }

        // ── Pop-ups ─────────────────────────────────────────
        composeTo(list) {
            this.compose.to = [...new Set(list)];
            this.setTab('messages');
            setTimeout(() => { const t = $('#adm-title', this.root); if (t) t.focus(); }, 60);
        }
        tab_messages() {
            const c = this.compose;
            // Agrupa los envíos (un mismo pop-up a varias cuentas comparte id)
            const groups = new Map();
            for (const m of this.data.messages) {
                const g = groups.get(m.id) || groups.set(m.id, { ...m, to: [] }).get(m.id);
                g.to.push({ name: m.to, readAt: m.readAt });
            }
            const sent = [...groups.values()].sort((a, b) => b.at - a.at);
            return `
                <div class="adm-grid2 adm-msg-grid">
                    <section class="lpanel adm-compose">
                        <div class="lpanel-head"><h2>✉️ Nuevo pop-up</h2></div>
                        <div class="field"><span class="field-label">Destinatarios</span>
                            <div class="adm-to" id="adm-to"></div>
                            <div class="adm-to-add">
                                <input class="input input-sm" id="adm-to-in" list="adm-users-dl" placeholder="Añadir cuenta…" autocomplete="off" />
                                <datalist id="adm-users-dl">${this.data.users.map(u => `<option value="${esc(u.name)}"></option>`).join('')}</datalist>
                                <button type="button" class="btn btn-ghost btn-sm" data-to="add">Añadir</button>
                                <button type="button" class="btn btn-ghost btn-sm" data-to="all">Todas las cuentas</button>
                            </div></div>
                        <div class="field"><span class="field-label">Tipo</span>
                            <div class="segmented" id="adm-kind">${KINDS.map(([k, i, l]) => `<button type="button" data-kind="${k}" class="${c.kind === k ? 'active' : ''}">${i} ${l}</button>`).join('')}</div></div>
                        <label class="field"><span class="field-label">Título</span><input class="input" id="adm-title" maxlength="80" value="${esc(c.title)}" placeholder="Por ejemplo: ¡Torneo este sábado!" /></label>
                        <label class="field"><span class="field-label">Mensaje <small id="adm-count"></small></span><textarea class="input" id="adm-text" rows="5" maxlength="1000" placeholder="Lo que verá el jugador al entrar o en cuanto esté conectado">${esc(c.body)}</textarea></label>
                        <p class="form-error" id="adm-msg-err" role="alert" hidden></p>
                        <div class="adm-compose-foot"><span class="muted small">Le aparecerá en menos de un minuto si está conectado, o al entrar.</span>
                            <button type="button" class="btn btn-primary" id="adm-send">📨 Enviar pop-up</button></div>
                    </section>
                    <section class="lpanel">
                        <div class="lpanel-head"><h2>👀 Vista previa</h2></div>
                        <div class="adm-preview notice-${esc(c.kind)}" id="adm-preview"></div>
                    </section>
                </div>
                <section class="lpanel">
                    <div class="lpanel-head"><h2>📬 Pop-ups enviados</h2><span class="muted small">${sent.length}</span></div>
                    ${sent.length ? `<ul class="adm-sent">${sent.map(g => `
                        <li class="kind-${esc(g.kind)}">
                            <div class="adm-sent-head"><b>${esc((KIND[g.kind] || KIND.info).icon)} ${esc(g.title)}</b><small>${esc(dateTime(g.at))} · por ${esc(g.by)} · ${g.to.filter(t => t.readAt).length}/${g.to.length} leído${g.to.length === 1 ? '' : 's'}</small></div>
                            <p>${esc(g.body)}</p>
                            <div class="adm-sent-to">${g.to.map(t => `<span class="adm-rcpt ${t.readAt ? 'read' : ''}" title="${t.readAt ? 'Leído ' + esc(dateTime(t.readAt)) : 'Pendiente'}">${t.readAt ? '✓' : '⏳'} ${esc(this.nameOf(t.name))}
                                ${t.readAt ? '' : `<button type="button" data-cancel="${esc(g.id)}" data-cto="${esc(t.name)}" aria-label="Retirar el pop-up a ${esc(t.name)}" title="Retirar">✕</button>`}</span>`).join('')}</div>
                        </li>`).join('')}</ul>` : Nexus.ui.components.empty('📭', 'Aún no has enviado pop-ups', '')}
                </section>`;
        }
        bind_messages(body) {
            const c = this.compose;
            const paintTo = () => {
                $('#adm-to', body).innerHTML = c.to.length ? c.to.map(n => `<span class="adm-rcpt">${esc(this.nameOf(n))}<button type="button" data-rm="${esc(n)}" aria-label="Quitar ${esc(n)}">✕</button></span>`).join('')
                    : '<span class="muted small">Ninguno: elige cuentas en «Cuentas» o añádelas aquí.</span>';
            };
            const paintPrev = () => {
                const k = KIND[c.kind];
                const p = $('#adm-preview', body); p.className = 'adm-preview notice-' + c.kind;
                p.innerHTML = `<div class="adm-prev-card"><div class="adm-prev-emoji" aria-hidden="true">${k.icon}</div><h3>${esc(c.title || 'Título del pop-up')}</h3>
                    <span class="notice-tag">${esc(k.label)} del equipo de Nexus Arcade</span><p class="notice-text">${esc(c.body || 'Aquí aparecerá tu mensaje.').replace(/\n/g, '<br>')}</p>
                    <span class="btn btn-primary btn-sm">Entendido</span></div>`;
                $('#adm-count', body).textContent = `(${c.body.length}/1000)`;
            };
            paintTo(); paintPrev();
            $('#adm-to', body).addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { c.to = c.to.filter(n => n !== b.dataset.rm); paintTo(); } });
            const add = () => {
                const v = $('#adm-to-in', body).value.trim().toLowerCase(); if (!v) return;
                if (!this.data.users.some(u => u.lname === v)) { Nexus.ui.toast('No existe esa cuenta', { type: 'error' }); return; }
                if (!c.to.includes(v)) c.to.push(v);
                $('#adm-to-in', body).value = ''; paintTo();
            };
            $('[data-to=add]', body).addEventListener('click', add);
            $('#adm-to-in', body).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
            $('[data-to=all]', body).addEventListener('click', () => { c.to = this.data.users.map(u => u.lname); paintTo(); });
            $$('[data-kind]', body).forEach(b => b.addEventListener('click', () => { c.kind = b.dataset.kind; $$('[data-kind]', body).forEach(x => x.classList.toggle('active', x === b)); paintPrev(); }));
            $('#adm-title', body).addEventListener('input', (e) => { c.title = e.target.value; paintPrev(); });
            $('#adm-text', body).addEventListener('input', (e) => { c.body = e.target.value; paintPrev(); });
            $('#adm-send', body).addEventListener('click', async (e) => {
                const err = $('#adm-msg-err', body), btn = e.currentTarget;
                err.hidden = true;
                const fail = (m) => { err.textContent = m; err.hidden = false; };
                if (!c.to.length) return fail('Elige al menos un destinatario.');
                if (!c.title.trim() || !c.body.trim()) return fail('Escribe un título y un mensaje.');
                btn.classList.add('is-loading'); btn.disabled = true;
                try {
                    const r = await this.call(B().message, { to: c.to, title: c.title, body: c.body, kind: c.kind });
                    Nexus.ui.toast(`Pop-up enviado a ${r.sent} cuenta${r.sent === 1 ? '' : 's'}`, { icon: '📨', type: 'success' });
                    this.compose = { to: [], kind: c.kind, title: '', body: '' };
                    this.sel.clear();
                    this.load();
                } catch (x) { btn.classList.remove('is-loading'); btn.disabled = false; fail(x.message); }
            });
            $$('[data-cancel]', body).forEach(b => b.addEventListener('click', async () => {
                try { await this.call(B().cancelMessage, { to: b.dataset.cto, id: b.dataset.cancel }); Nexus.ui.toast('Pop-up retirado', { icon: '↩️' }); this.load(); }
                catch (x) { Nexus.ui.toast(x.message, { type: 'error' }); }
            }));
        }

        // ── Mantenimiento ───────────────────────────────────
        tab_maintenance() {
            const m = this.data.maintenance;
            const presets = ['Volvemos en unos minutos.', 'Estamos actualizando los juegos. Volvemos en 30 minutos.', 'Mantenimiento programado hasta las 18:00.', 'Estamos arreglando un problema con los guardados.'];
            return `
                <section class="adm-maint ${m.on ? 'on' : ''}">
                    <div class="adm-maint-state">
                        <span class="adm-maint-ic" aria-hidden="true">${m.on ? '🛠️' : '🟢'}</span>
                        <div><h2>${m.on ? 'La página está en mantenimiento' : 'La página está abierta'}</h2>
                            <p>${m.on ? `Desde ${esc(dateTime(m.since))}${m.by ? ' · activado por ' + esc(m.by) : ''}. Todas las cuentas ven una pantalla fija que no se puede cerrar; no se puede entrar ni crear cuentas. Los administradores ven sólo una franja.`
                                : 'Al activarlo, todas las cuentas verán al momento (o en menos de un minuto) una pantalla de mantenimiento que no se puede cerrar hasta que lo desactives.'}</p></div>
                    </div>
                    <label class="field"><span class="field-label">Mensaje para los jugadores <small>(opcional, máx. 300)</small></span>
                        <textarea class="input" id="adm-mmsg" rows="3" maxlength="300" placeholder="Por ejemplo: volvemos a las 18:00">${esc(m.message || '')}</textarea></label>
                    <div class="chips adm-presets">${presets.map(p => `<button type="button" class="chip-btn" data-preset="${esc(p)}">${esc(p)}</button>`).join('')}</div>
                    <div class="btn-row">
                        ${m.on ? `<button type="button" class="btn btn-primary" data-m="off">🟢 Desactivar mantenimiento</button>
                                 <button type="button" class="btn btn-ghost" data-m="save">💾 Actualizar mensaje</button>`
                               : '<button type="button" class="btn btn-danger" data-m="on">🛠️ Activar mantenimiento para todas las cuentas</button>'}
                    </div>
                </section>
                <section class="lpanel">
                    <div class="lpanel-head"><h2>👀 Lo que verán los jugadores</h2></div>
                    <div class="adm-maint-prev"><div class="maint-card">
                        <div class="maint-gear" aria-hidden="true"><span>⚙️</span><span>🛠️</span></div>
                        <h2>Página en mantenimiento</h2><p class="maint-lead">Estamos mejorando Nexus Arcade. Tu progreso está a salvo.</p>
                        <p class="maint-msg" id="adm-mprev" ${m.message ? '' : 'hidden'}>${esc(m.message || '')}</p>
                        <p class="maint-meta"><span class="maint-pulse"></span>la página se abrirá sola cuando terminemos</p></div></div>
                </section>`;
        }
        bind_maintenance(body) {
            const ta = $('#adm-mmsg', body), prev = $('#adm-mprev', body);
            const sync = () => { prev.textContent = ta.value; prev.hidden = !ta.value.trim(); };
            ta.addEventListener('input', sync);
            $$('[data-preset]', body).forEach(b => b.addEventListener('click', () => { ta.value = b.dataset.preset; sync(); }));
            $$('[data-m]', body).forEach(b => b.addEventListener('click', async () => {
                const act = b.dataset.m, on = act === 'on' || act === 'save';
                if (act === 'on' && !(await Nexus.ui.modal.confirm({ icon: '🛠️', title: 'Activar mantenimiento', danger: true, confirmLabel: 'Activar',
                    message: 'Todas las cuentas que no sean administradoras verán la pantalla de mantenimiento y no podrán jugar hasta que lo desactives.' }))) return;
                b.classList.add('is-loading'); b.disabled = true;
                try {
                    const r = await this.call(B().maintenance, { on, message: ta.value });
                    this.data.maintenance = r.maintenance;
                    Nexus.ui.toast(act === 'on' ? 'Mantenimiento activado' : act === 'off' ? 'Mantenimiento desactivado: la página vuelve a estar abierta' : 'Mensaje actualizado', { icon: act === 'off' ? '🟢' : '🛠️' });
                    this.load();
                } catch (e) { b.classList.remove('is-loading'); b.disabled = false; Nexus.ui.toast(e.message, { type: 'error' }); }
            }));
        }

        // ── Registro ────────────────────────────────────────
        logList(list) {
            if (!list.length) return Nexus.ui.components.empty('📜', 'Sin acciones registradas', '');
            return `<ul class="adm-log">${list.map(l => { const [ic, label] = ACTIONS[l.action] || ['•', l.action]; return `
                <li><span class="adm-log-ic">${ic}</span><span class="adm-log-main"><b>${esc(label)}</b>${l.target ? ` · ${esc(l.target)}` : ''}${l.detail ? `<small>${esc(l.detail)}</small>` : ''}</span>
                    <span class="adm-log-meta">${esc(l.by)}<small>${esc(dateTime(l.at))}</small></span></li>`; }).join('')}</ul>`;
        }
        tab_log() { return `<section class="lpanel"><div class="lpanel-head"><h2>📜 Registro de acciones</h2><span class="muted small">últimas ${this.data.log.length}</span></div>${this.logList(this.data.log)}</section>`; }
        bind_log() {}
    }

    // ── API pública ─────────────────────────────────────────
    const Admin = {
        _mem: null,
        session() { const s = readSession() || (this._mem && this._mem.expiresAt > Date.now() ? this._mem : null); return s; },
        hasSession() { return !!this.session(); },
        /** Monta el panel en un contenedor; devuelve la función de limpieza. */
        mount(root, opts) { const p = new Panel(root, opts); this.active = p; return () => { p.destroy(); if (this.active === p) this.active = null; }; },
        /** Abre una sección: como página si se puede navegar, o a pantalla completa. */
        goto(tab) {
            const blocked = document.body.classList.contains('maint-on');
            if (Nexus.services.users.isLoggedIn() && !blocked && !$('#admin-screen')) {
                this.nextTab = tab;
                if (this.active && Nexus.ui.router.current && Nexus.ui.router.current.name === 'admin') { this.active.setTab(tab); return; }
                Nexus.ui.router.navigate('admin');
            } else this.openStandalone(tab);
        },
        /** Panel a pantalla completa (desde el acceso o la pantalla de mantenimiento). */
        openStandalone(tab) {
            if ($('#admin-screen')) return;
            const scr = document.createElement('div');
            scr.id = 'admin-screen'; scr.className = 'admin-screen';
            scr.setAttribute('role', 'dialog'); scr.setAttribute('aria-modal', 'true'); scr.setAttribute('aria-label', 'Panel de administración');
            scr.innerHTML = `<div class="admin-screen-bar"><span class="brand-mini"><span class="logo-diamond">◆</span> Nexus Arcade · Administración</span>
                <button type="button" class="btn btn-ghost btn-sm" data-close>✕ Cerrar</button></div><div class="admin-screen-body page-body"></div>`;
            document.body.appendChild(scr);
            document.body.classList.add('admin-standalone');
            const cleanup = this.mount($('.admin-screen-body', scr), { standalone: true, tab });
            const close = () => {
                cleanup(); scr.remove(); document.body.classList.remove('admin-standalone');
                document.removeEventListener('keydown', onKey);
                Nexus.services.notices.paint();
            };
            const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-overlay.active')) close(); };
            document.addEventListener('keydown', onKey);
            $('[data-close]', scr).addEventListener('click', close);
        }
    };

    Nexus.ui.admin = Admin;
    Nexus.ui.pages.admin = {
        title: 'Administración',
        render(root) {
            const tab = Admin.nextTab; Admin.nextTab = null;
            root.innerHTML = '<div class="page-body adm-page"></div>';
            return Admin.mount(root.firstElementChild, { tab: tab || 'overview' });
        }
    };
})();
