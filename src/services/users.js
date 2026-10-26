/* ============================================================
   NEXUS ARCADE · services/users.js
   Gestión de usuarios locales:
   - Varios perfiles en el mismo navegador, con avatar y color.
   - Contraseña opcional (hash con sal, ver core/hash.js).
   - Sesión opcional recordada ("Recordarme").
   - Modo invitado: juega sin guardar nada en disco.
   - Exportar / importar perfiles (copia de seguridad en JSON).
   - Migración automática del perfil de la versión 1.
   ============================================================ */
(function () {
    'use strict';

    const { esc, uid } = Nexus.util;
    const hash = Nexus.core.hash;
    const store = Nexus.storage;

    const NAME_MIN = 2, NAME_MAX = 16, PASS_MIN = 4;
    const LEGACY_KEY = 'nexus-arcade-profile';

    const AVATARS = ['🎮', '🕹️', '👾', '🤖', '🦊', '🐱', '🐼', '🦁', '🐸', '🐙',
        '🦄', '🐲', '🚀', '⚡', '🔥', '💎', '🎯', '🧠', '👑', '🌟'];
    const COLORS = ['#6c5ce7', '#0984e3', '#00cec9', '#00b894', '#fdcb6e', '#e17055', '#fd79a8', '#d63031'];

    class UserService {
        constructor() {
            this._current = null;   // registro de usuario activo
            this._data = null;      // datos de juego del usuario activo
            this._guest = false;
            this.AVATARS = AVATARS;
            this.COLORS = COLORS;
            this.limits = { NAME_MIN, NAME_MAX, PASS_MIN };
        }

        // ── Lectura ─────────────────────────────────────────
        _records() { return store.get('users', []); }
        _saveRecords(list) { return store.set('users', list); }

        /** Perfiles públicos (sin hash ni sal). */
        list() {
            return this._records().map(u => this._public(u));
        }

        get(id) {
            const u = this._records().find(x => x.id === id);
            return u ? this._public(u) : null;
        }

        _public(u) {
            return {
                id: u.id, name: u.name, avatar: u.avatar, color: u.color,
                hasPassword: !!u.hash, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt
            };
        }

        current() { return this._current ? this._public(this._current) : null; }
        isGuest() { return this._guest; }
        isLoggedIn() { return !!this._current; }
        data() { return this._data; }

        /** Carga los datos de cualquier usuario (para rankings). No toca la sesión. */
        loadData(id) {
            return Nexus.schema.normalize(store.get('data:' + id, null));
        }

        // ── Validación ──────────────────────────────────────
        validateName(name, ignoreId) {
            name = (name || '').trim().replace(/\s+/g, ' ');
            if (name.length < NAME_MIN) return `El nombre debe tener al menos ${NAME_MIN} caracteres.`;
            if (name.length > NAME_MAX) return `El nombre no puede superar ${NAME_MAX} caracteres.`;
            if (/^invitado$/i.test(name)) return 'Ese nombre está reservado.';
            const taken = this._records().some(u => u.id !== ignoreId && u.name.toLowerCase() === name.toLowerCase());
            if (taken) return 'Ya existe un perfil con ese nombre.';
            return null;
        }

        validatePassword(pw) {
            if (pw && pw.length < PASS_MIN) return `La contraseña debe tener al menos ${PASS_MIN} caracteres.`;
            return null;
        }

        // ── Crear / editar / borrar ─────────────────────────
        create({ name, avatar, color, password }) {
            const err = this.validateName(name) || this.validatePassword(password);
            if (err) throw new Error(err);
            name = name.trim().replace(/\s+/g, ' ');

            const rec = {
                id: uid(), name,
                avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
                color: COLORS.includes(color) ? color : COLORS[0],
                salt: null, hash: null,
                createdAt: Date.now(), lastLoginAt: null
            };
            if (password) {
                rec.salt = hash.randomSalt();
                rec.hash = hash.hashPassword(password, rec.salt);
            }
            const list = this._records();
            list.push(rec);
            this._saveRecords(list);
            store.set('data:' + rec.id, Nexus.schema.userData());
            return this._public(rec);
        }

        update(id, patch) {
            const list = this._records();
            const rec = list.find(u => u.id === id);
            if (!rec) throw new Error('Usuario no encontrado.');
            if (patch.name !== undefined) {
                const err = this.validateName(patch.name, id);
                if (err) throw new Error(err);
                rec.name = patch.name.trim().replace(/\s+/g, ' ');
            }
            if (patch.avatar && AVATARS.includes(patch.avatar)) rec.avatar = patch.avatar;
            if (patch.color && COLORS.includes(patch.color)) rec.color = patch.color;
            this._saveRecords(list);
            if (this._current && this._current.id === id) {
                this._current = rec;
                Nexus.bus.emit('user:update', this.current());
            }
            return this._public(rec);
        }

        /** Cambia o elimina (newPassword vacío) la contraseña. Exige la actual si existe. */
        setPassword(id, currentPassword, newPassword) {
            const list = this._records();
            const rec = list.find(u => u.id === id);
            if (!rec) throw new Error('Usuario no encontrado.');
            if (rec.hash && !this._check(rec, currentPassword)) throw new Error('La contraseña actual no es correcta.');
            const err = this.validatePassword(newPassword);
            if (err) throw new Error(err);
            if (newPassword) {
                rec.salt = hash.randomSalt();
                rec.hash = hash.hashPassword(newPassword, rec.salt);
            } else {
                rec.salt = null; rec.hash = null;
            }
            this._saveRecords(list);
            if (this._current && this._current.id === id) this._current = rec;
            Nexus.bus.emit('user:update', this.current());
        }

        remove(id, password) {
            const list = this._records();
            const rec = list.find(u => u.id === id);
            if (!rec) return;
            if (rec.hash && !this._check(rec, password)) throw new Error('La contraseña no es correcta.');
            // Si es el usuario activo, se descartan sus datos en memoria antes de cerrar sesión
            // (logout() guarda los datos y los reescribiría tras borrarlos).
            if (this._current && this._current.id === id) this._data = null;
            this._saveRecords(list.filter(u => u.id !== id));
            store.remove('data:' + id);
            const sess = store.get('session');
            if (sess && sess.userId === id) store.remove('session');
            if (this._current && this._current.id === id) this.logout();
        }

        _check(rec, password) {
            if (!rec.hash) return true;
            return hash.hashPassword(password || '', rec.salt) === rec.hash;
        }

        // ── Sesión ──────────────────────────────────────────
        verify(id, password) {
            const rec = this._records().find(u => u.id === id);
            return !!rec && this._check(rec, password);
        }

        login(id, password, { remember = false } = {}) {
            const list = this._records();
            const rec = list.find(u => u.id === id);
            if (!rec) throw new Error('Usuario no encontrado.');
            if (!this._check(rec, password)) throw new Error('Contraseña incorrecta.');

            rec.lastLoginAt = Date.now();
            this._saveRecords(list);
            this._current = rec;
            this._guest = false;
            this._data = this.loadData(id);

            store.removeSession('session');
            store.remove('session');
            if (remember) store.set('session', { userId: id });
            else store.setSession('session', { userId: id });

            this._afterLogin();
        }

        loginGuest() {
            this._current = { id: 'guest', name: 'Invitado', avatar: '👤', color: '#9898bb', createdAt: Date.now() };
            this._guest = true;
            this._data = Nexus.schema.normalize(null);
            store.removeSession('session');
            store.remove('session');
            this._afterLogin();
        }

        /** Restaura la sesión anterior si existe y el usuario sigue existiendo. */
        restoreSession() {
            const sess = store.getSession('session') || store.get('session');
            if (!sess || !sess.userId) return false;
            const rec = this._records().find(u => u.id === sess.userId);
            if (!rec) return false;
            this._current = rec; this._guest = false;
            this._data = this.loadData(rec.id);
            this._afterLogin();
            return true;
        }

        logout() {
            if (!this._current) return;
            this.saveData();
            this._current = null; this._data = null; this._guest = false;
            store.removeSession('session');
            store.remove('session');
            Nexus.bus.emit('user:logout');
        }

        _afterLogin() {
            Nexus.services.settings.apply();
            Nexus.bus.emit('user:login', this.current());
        }

        // ── Datos del usuario activo ────────────────────────
        saveData() {
            if (!this._current || this._guest || !this._data) return true;
            return store.set('data:' + this._current.id, this._data);
        }

        /** Sustituye los datos del usuario activo (p. ej. al convertir un invitado en perfil). */
        adoptData(data) {
            if (!this._current || this._guest) return;
            this._data = Nexus.schema.normalize(data);
            this.saveData();
            Nexus.bus.emit('progress:update', { adopted: true });
        }

        /** Borra el progreso (stats, logros, XP) pero conserva el perfil. */
        resetProgress() {
            if (!this._data) return;
            const settings = this._data.settings;
            this._data = Nexus.schema.userData();
            this._data.settings = settings;
            this.saveData();
            Nexus.bus.emit('progress:update', { reset: true });
        }

        // ── Exportar / importar ─────────────────────────────
        exportUser(id) {
            const rec = this._records().find(u => u.id === id);
            if (!rec) throw new Error('Usuario no encontrado.');
            const data = (this._current && this._current.id === id && !this._guest)
                ? this._data : this.loadData(id);
            return {
                format: 'nexus-arcade-backup', version: Nexus.schema.VERSION,
                exportedAt: new Date().toISOString(),
                users: [{ profile: rec, data }]
            };
        }

        exportAll() {
            return {
                format: 'nexus-arcade-backup', version: Nexus.schema.VERSION,
                exportedAt: new Date().toISOString(),
                users: this._records().map(rec => ({ profile: rec, data: this.loadData(rec.id) }))
            };
        }

        /**
         * Importa una copia de seguridad. Nunca sobreescribe: si el nombre ya existe
         * se añade un sufijo, y siempre se genera un id nuevo.
         * @returns {string[]} nombres de los perfiles importados
         */
        importBackup(json) {
            if (!json || json.format !== 'nexus-arcade-backup' || !Array.isArray(json.users)) {
                throw new Error('El archivo no es una copia de seguridad válida de Nexus Arcade.');
            }
            const imported = [];
            const list = this._records();
            for (const entry of json.users) {
                const p = entry && entry.profile;
                if (!p || typeof p.name !== 'string') continue;

                let base = p.name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX) || 'Jugador';
                let name = base, n = 2;
                const taken = (nm) => list.some(u => u.name.toLowerCase() === nm.toLowerCase()) || /^invitado$/i.test(nm);
                while (taken(name)) {
                    const suffix = ` ${n++}`;
                    name = base.slice(0, NAME_MAX - suffix.length) + suffix;
                }
                const rec = {
                    id: uid(), name,
                    avatar: AVATARS.includes(p.avatar) ? p.avatar : AVATARS[0],
                    color: COLORS.includes(p.color) ? p.color : COLORS[0],
                    salt: typeof p.salt === 'string' ? p.salt : null,
                    hash: typeof p.hash === 'string' ? p.hash : null,
                    createdAt: Number(p.createdAt) || Date.now(), lastLoginAt: null
                };
                if (!rec.hash || !rec.salt) { rec.hash = null; rec.salt = null; }
                list.push(rec);
                store.set('data:' + rec.id, Nexus.schema.normalize(entry.data));
                imported.push(name);
            }
            if (!imported.length) throw new Error('La copia no contiene ningún perfil.');
            this._saveRecords(list);
            return imported;
        }

        // ── Migración desde la v1 ───────────────────────────
        /** Si existe el perfil antiguo y aún no hay usuarios, lo convierte en un perfil nuevo. */
        migrateLegacy() {
            const meta = store.get('meta', {});
            if (meta.legacyMigrated) return null;
            const old = store.getLegacy(LEGACY_KEY);
            meta.legacyMigrated = true; meta.schema = Nexus.schema.VERSION;
            store.set('meta', meta);
            if (!old || this._records().length > 0) return null;

            let name = (typeof old.name === 'string' && old.name.trim()) || 'Jugador';
            name = name.slice(0, NAME_MAX);
            if (this.validateName(name)) name = 'Jugador';
            const user = this.create({ name, avatar: AVATARS[0], color: COLORS[0] });
            store.set('data:' + user.id, Nexus.schema.normalize(Nexus.schema.fromLegacy(old)));
            return user;
        }
    }

    Nexus.services.users = new UserService();
})();
