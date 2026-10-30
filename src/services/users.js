/* ============================================================
   NEXUS ARCADE · services/users.js
   Cuentas y sesión del jugador:
   - Registro / inicio de sesión contra Nexus.backend (servidor
     global o modo local). Contraseña obligatoria.
   - Sesión persistente en este navegador: al recargar se entra
     directamente con los datos en caché y se sincroniza en segundo
     plano.
   - Los datos de juego se guardan al instante en local y se envían
     al servidor agrupados (2,5 s) o de inmediato con flush().
   - Si hay cambios sin enviar (sin conexión), se reintentan solos.
   ============================================================ */
(function () {
    'use strict';

    const store = Nexus.storage;
    const B = () => Nexus.backend;

    const NAME_MIN = 3, NAME_MAX = 16, PASS_MIN = 6, PASS_MAX = 64;
    const PUSH_DELAY = 2500, RETRY_EVERY = 20000;

    const AVATARS = ['🎮', '🕹️', '👾', '🤖', '🦊', '🐱', '🐼', '🦁', '🐸', '🐙',
        '🦄', '🐲', '🚀', '⚡', '🔥', '💎', '🎯', '🧠', '👑', '🌟'];
    const COLORS = ['#6c5ce7', '#0984e3', '#00cec9', '#00b894', '#fdcb6e', '#e17055', '#fd79a8', '#d63031'];

    class UserService {
        constructor() {
            this._user = null;      // { id, name, avatar, color, createdAt }
            this._data = null;      // datos de juego del usuario activo
            this._token = null;
            this._serverAt = 0;     // updatedAt del servidor sobre el que se basan los datos locales
            this._dirty = false;    // hay cambios sin enviar
            this._timer = null;
            this._pushing = null;
            this.sync = 'idle';     // idle | pending | syncing | synced | offline | error
            this.AVATARS = AVATARS;
            this.COLORS = COLORS;
            this.limits = { NAME_MIN, NAME_MAX, PASS_MIN, PASS_MAX };

            window.addEventListener('online', () => this.flush());
            window.addEventListener('pagehide', () => this.flush({ keepalive: true }));
            document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush({ keepalive: true }); });
            setInterval(() => { if (this._dirty && this._token && this.sync !== 'syncing') this.flush(); }, RETRY_EVERY);
        }

        // ── Lectura ─────────────────────────────────────────
        current() { return this._user; }
        isLoggedIn() { return !!this._user; }
        data() { return this._data; }
        lastUsername() { return store.get('lastUser', ''); }

        // ── Validación (misma que el servidor) ──────────────
        validateName(name) {
            name = (name || '').trim();
            if (!/^[A-Za-z0-9_-]+$/.test(name)) return 'Usa sólo letras, números, guion y guion bajo (sin espacios ni acentos).';
            if (name.length < NAME_MIN) return `El usuario debe tener al menos ${NAME_MIN} caracteres.`;
            if (name.length > NAME_MAX) return `El usuario no puede superar ${NAME_MAX} caracteres.`;
            if (B().RESERVED.includes(name.toLowerCase())) return 'Ese nombre está reservado.';
            return null;
        }
        validatePassword(pw) {
            if (!pw) return 'Escribe una contraseña.';
            if (pw.length < PASS_MIN) return `La contraseña debe tener al menos ${PASS_MIN} caracteres.`;
            if (pw.length > PASS_MAX) return `La contraseña no puede superar ${PASS_MAX} caracteres.`;
            return null;
        }
        /** 0–4 según longitud y variedad de caracteres. */
        passwordStrength(pw) {
            if (!pw) return 0;
            let s = 0;
            if (pw.length >= 6) s++;
            if (pw.length >= 10) s++;
            if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
            if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
            else if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s += pw.length >= 8 ? 1 : 0;
            return Math.min(4, s);
        }

        // ── Alta e inicio de sesión ─────────────────────────
        async register({ name, password, avatar, color }) {
            name = (name || '').trim();
            const err = this.validateName(name) || this.validatePassword(password);
            if (err) throw new Error(err);
            const res = await B().register({
                name, password,
                avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
                color: COLORS.includes(color) ? color : COLORS[0]
            });
            this._begin(res);
            return this._user;
        }

        async login(name, password) {
            name = (name || '').trim();
            if (!name || !password) throw new Error('Escribe tu usuario y tu contraseña.');
            const res = await B().login({ name, password });
            this._begin(res);
            return this._user;
        }

        _begin(res) {
            const id = res.user.id;
            let data = Nexus.schema.normalize(res.data);
            const cache = store.get('cache:' + id);
            this._dirty = false;
            // Cambios locales sin enviar (p. ej. se cerró sin conexión): conserva los más avanzados.
            if (cache && cache.dirty && cache.data) {
                const local = Nexus.schema.normalize(cache.data);
                if (local.xp.total >= data.xp.total) { data = local; this._dirty = true; }
            }
            this._user = res.user; this._token = res.token; this._data = data; this._serverAt = res.updatedAt || 0;
            store.set('session', { token: res.token, id, name: res.user.name });
            store.set('lastUser', res.user.name);
            this._writeCache();
            this._setSync(this._dirty ? 'pending' : 'synced');
            if (this._dirty) this.flush();
            Nexus.services.settings.apply();
            Nexus.bus.emit('user:login', this._user);
        }

        /** Entra con la sesión guardada usando la caché local; sincroniza en segundo plano. */
        restoreSession() {
            const s = store.get('session');
            if (!s || !s.token || !s.id) return false;
            const cache = store.get('cache:' + s.id);
            if (!cache || !cache.user || !cache.data) { store.remove('session'); return false; }
            this._user = cache.user; this._token = s.token; this._serverAt = cache.serverAt || 0;
            this._data = Nexus.schema.normalize(cache.data);
            this._dirty = !!cache.dirty;
            this._setSync(this._dirty ? 'pending' : 'synced');
            Nexus.services.settings.apply();
            Nexus.bus.emit('user:login', this._user);
            this.refresh();
            return true;
        }

        /** Compara con el servidor: adopta sus datos si son más nuevos o envía los locales. */
        async refresh() {
            const token = this._token;
            if (!token) return;
            try {
                this._setSync('syncing');
                const r = await B().session(token);
                if (this._token !== token) return;
                this._user = r.user;
                const server = Nexus.schema.normalize(r.data);
                if (this._dirty) {
                    if (server.xp.total > this._data.xp.total) this._adopt(server, r.updatedAt);
                    else { this._serverAt = r.updatedAt; this._writeCache(); this.flush(); return; }
                } else if (r.updatedAt !== this._serverAt) this._adopt(server, r.updatedAt);
                this._writeCache();
                this._setSync('synced');
                Nexus.bus.emit('user:update', this._user);
            } catch (e) {
                if (e.status === 401) this._expire();
                else this._setSync(this._dirty ? 'pending' : 'offline');
            }
        }

        _adopt(data, at) {
            this._data = data; this._serverAt = at; this._dirty = false;
            Nexus.services.settings.apply();
            Nexus.bus.emit('progress:update', { synced: true });
        }

        _expire() {
            Nexus.ui && Nexus.ui.toast && Nexus.ui.toast('Tu sesión ha caducado. Vuelve a iniciar sesión.', { type: 'error', duration: 6000 });
            this.logout();
        }

        logout() {
            if (!this._user) return;
            if (this._dirty) this.flush({ keepalive: true });
            const id = this._user.id;
            if (!this._dirty) store.remove('cache:' + id);
            this._user = null; this._data = null; this._token = null; this._dirty = false;
            clearTimeout(this._timer);
            store.remove('session');
            this._setSync('idle');
            Nexus.bus.emit('user:logout');
        }

        // ── Datos y sincronización ──────────────────────────
        _writeCache() {
            if (!this._user) return;
            store.set('cache:' + this._user.id, { user: this._user, data: this._data, serverAt: this._serverAt, dirty: this._dirty });
        }

        _setSync(state) {
            if (this.sync === state) return;
            this.sync = state;
            Nexus.bus.emit('sync:state', state);
        }

        /** Guarda en local al instante y programa el envío al servidor. */
        saveData() {
            if (!this._user || !this._data) return true;
            this._data.meta.updatedAt = Date.now();
            this._dirty = true;
            this._writeCache();
            this._setSync('pending');
            clearTimeout(this._timer);
            this._timer = setTimeout(() => this.flush(), PUSH_DELAY);
            return true;
        }

        /** Envía ya los cambios pendientes. Devuelve una promesa que no rechaza. */
        async flush({ keepalive = false } = {}) {
            clearTimeout(this._timer);
            if (this._pushing) { try { await this._pushing; } catch (e) { /* ya gestionado */ } }
            if (!this._token || !this._dirty || !this._data) return;
            const token = this._token, data = this._data, stamp = data.meta.updatedAt;
            this._pushing = (async () => {
                try {
                    this._setSync('syncing');
                    const small = keepalive && JSON.stringify(data).length < 60000;
                    const r = await B().saveData(token, data, small);
                    if (this._token !== token) return;
                    this._serverAt = r.updatedAt;
                    if (data.meta.updatedAt === stamp) this._dirty = false;
                    this._writeCache();
                    this._setSync(this._dirty ? 'pending' : 'synced');
                    if (this._dirty) this._timer = setTimeout(() => this.flush(), PUSH_DELAY);
                } catch (e) {
                    if (e.status === 401) this._expire();
                    else if (e.offline || e.status === 0) this._setSync('offline');
                    else { this._setSync('error'); if (Nexus.ui && Nexus.ui.toast) Nexus.ui.toast(e.message, { type: 'error' }); }
                } finally { this._pushing = null; }
            })();
            await this._pushing;
        }

        // ── Cuenta ──────────────────────────────────────────
        async updateProfile(patch) {
            const clean = {};
            if (AVATARS.includes(patch.avatar)) clean.avatar = patch.avatar;
            if (COLORS.includes(patch.color)) clean.color = patch.color;
            const r = await B().profile(this._token, clean);
            this._user = Object.assign({}, this._user, r.user);
            this._writeCache();
            Nexus.bus.emit('user:update', this._user);
            return this._user;
        }

        async changePassword(current, next) {
            const err = this.validatePassword(next);
            if (err) throw new Error(err);
            const r = await B().password(this._token, { current, next });
            this._token = r.token;
            store.set('session', { token: r.token, id: this._user.id, name: this._user.name });
        }

        async deleteAccount(password) {
            await B().deleteAccount(this._token, password);
            const id = this._user.id;
            this._dirty = false;
            store.remove('cache:' + id);
            this.logout();
        }

        /** Borra el progreso (stats, logros, XP) pero conserva la cuenta y los ajustes. */
        resetProgress() {
            if (!this._data) return;
            const settings = this._data.settings;
            this._data = Nexus.schema.userData();
            this._data.settings = settings;
            this.saveData();
            this.flush();
            Nexus.bus.emit('progress:update', { reset: true });
        }
    }

    Nexus.services.users = new UserService();
})();
