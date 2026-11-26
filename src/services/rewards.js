/* ============================================================
   NEXUS ARCADE · services/rewards.js
   Recompensas del sistema de logros (datos en data.rewards):
     · Rombos: la moneda con la forma del logo (saldo, tope diario,
       fines de semana dobles para logros y misiones)
     · Misiones: 3 diarias (fácil, media, difícil) + 1 semanal,
       iguales para todos (semilla de la fecha), con racha
     · Temporada: 6 semanas, 30 niveles de 150 Rombos con premios
     · Tienda semanal de cosméticos
     · Cosméticos: marcos de avatar, títulos, temas, efectos de
       fondo, fondos de perfil, aspectos en juegos y avatares
     · Recompensas de rango (cada 5 niveles), Maestría por juego,
       escaparate de logros, logro seguido y meta de comunidad
   Todo es cosmético: nada da ventaja en las partidas.
   ============================================================ */
(function () {
    'use strict';

    const { dayKey, daysBetween } = Nexus.util;
    const U = () => Nexus.services.users;
    const A = () => Nexus.services.achievements;

    const DAILY_CAP = 3000;            // Rombos máximos por día (salvo compras)
    const LEVEL_COST = 150;            // Rombos de temporada por nivel del pase
    const SEASON_LEVELS = 30;
    const SEASON_DAYS = 42;
    const SEASON_EPOCH = '2026-11-02'; // lunes en que empieza la temporada 1
    const COMMUNITY_GOAL = 2000;       // partidas entre todos por temporada

    // ── Utilidades de fechas y azar con semilla ──────────────
    const keyOf = (d) => dayKey(d);
    const weekKey = (d = new Date()) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return keyOf(x); };
    const addDays = (k, n) => { const [y, m, dd] = k.split('-').map(Number); const x = new Date(y, m - 1, dd + n); return keyOf(x); };
    const isWeekend = (d = new Date()) => d.getDay() === 0 || d.getDay() === 6;
    function rng(seed) {
        let h = 1779033703 ^ seed.length;
        for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
        let a = h >>> 0;
        return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    const pick = (r, list) => list[Math.floor(r() * list.length)];
    function seasonOf(d = new Date()) {
        const days = daysBetween(SEASON_EPOCH, keyOf(d));
        const id = Math.max(1, Math.floor(Math.max(0, days) / SEASON_DAYS) + 1);
        const start = addDays(SEASON_EPOCH, (id - 1) * SEASON_DAYS);
        return { id, start, end: addDays(start, SEASON_DAYS - 1), daysLeft: Math.max(0, SEASON_DAYS - (days - (id - 1) * SEASON_DAYS)) };
    }

    // ── Catálogo de cosméticos ──────────────────────────────
    // Solo dos familias:
    //   · Jugador: frame (marco) | title (título) | banner (fondo de perfil) | avatar (icono de perfil)
    //   · Nexito:  pet-hat (sombreros) | pet-glasses (accesorios) | pet-scarf (ropa) | pet-dome (cúpulas)
    // price > 0 → se compra en la tienda; sin precio → se gana (logro, racha, pase, rango o evento).
    const C = (id, kind, name, desc, price = 0, extra = {}) => Object.assign({ id, kind, name, desc, price }, extra);
    const CATALOG = [
        // Jugador · Marcos
        C('fr-silver', 'frame', 'Anillo de plata', 'Un anillo metálico alrededor de tu avatar.', 400),
        C('fr-gold', 'frame', 'Anillo de oro', 'El amarillo Nexus alrededor de tu avatar.', 700),
        C('fr-neon', 'frame', 'Neón', 'Un anillo de luz que late.', 600),
        C('fr-diamond', 'frame', 'Rombos', 'Rombos dorados girando alrededor del avatar.', 900),
        C('fr-fire', 'frame', 'Fuego', 'Un aro de llamas naranjas.', 800),
        C('fr-mastery', 'frame', 'Maestría', 'Corona dorada: completa un juego entero.'),
        C('fr-legend', 'frame', 'Leyenda', 'Consigue 50 logros.'),
        C('fr-nexito', 'frame', 'Nexito', 'Nexito asomado a tu avatar: 100 días de racha.'),
        // Jugador · Títulos
        C('t-estratega', 'title', 'Estratega', 'Piensa antes de mover.', 250),
        C('t-pixel', 'title', 'Píxel perfecto', 'Para los amantes de lo retro.', 250),
        C('t-tahur', 'title', 'Tahúr', 'Maestro de las cartas… y de los faroles.', 250),
        C('t-cerebro', 'title', 'Cerebrito', 'Palabras, números y lógica.', 250),
        C('t-campeon', 'title', 'Campeón', 'Consigue 100 victorias.'),
        C('t-explorador', 'title', 'Explorador', 'Prueba todos los juegos.'),
        C('t-coleccionista', 'title', 'Coleccionista', 'Desbloquea 10 logros.'),
        C('t-kamikaze', 'title', 'Kamikaze', 'Logro secreto.'),
        C('t-insomne', 'title', 'El Insomne', 'Logro secreto.'),
        C('t-maratoniano', 'title', 'Maratoniano', 'Logro secreto.'),
        C('t-buscador', 'title', 'Buscador de secretos', 'Descubre 5 logros secretos.'),
        C('t-cazafantasmas', 'title', 'Cazafantasmas', 'Evento de Halloween.'),
        C('t-leyenda', 'title', 'Leyenda', 'Rango Leyenda (nivel 30).'),
        C('t-veterano', 'title', 'Veterano de temporada', 'Nivel 29 del pase de batalla.'),
        C('t-inseparables', 'title', 'Inseparables', '100 días de racha con Nexito.'),
        // Jugador · Fondos de perfil
        C('bn-galaxia', 'banner', 'Galaxia', 'Fondo de perfil con nebulosas.', 350),
        C('bn-arcade', 'banner', 'Recreativa', 'Fondo de perfil con rejilla de neón.', 350),
        C('bn-oro', 'banner', 'Oro', 'Fondo de perfil dorado.', 500),
        C('bn-aurora', 'banner', 'Aurora', 'Luces del norte en verde y violeta.', 450),
        C('bn-atardecer', 'banner', 'Atardecer', 'Naranja y rosa de última hora.', 400),
        C('bn-oceano', 'banner', 'Océano', 'Azules profundos con reflejos.', 400),
        C('bn-navidad', 'banner', 'Navidad', 'Nieve sobre verde y rojo.', 450),
        C('bn-comunidad', 'banner', 'Comunidad', 'Meta de comunidad conseguida.'),
        // Jugador · Iconos de perfil
        C('av:rw-pad-gold', 'avatar', 'Pad dorado', 'Icono exclusivo de mando dorado.', 800),
        C('av:rw-detective-gold', 'avatar', 'Detective de oro', 'Icono exclusivo.', 800),
        C('av:rw-phoenix-gold', 'avatar', 'Fénix dorado', 'Nivel 15 del pase de batalla.'),
        C('av:rw-crown-neon', 'avatar', 'Reina neón', 'Rango nivel 20.'),
        C('av:rw-nexo-gold', 'avatar', 'Nexo dorado', 'Nivel 30 del pase de batalla.'),
        C('av:rw-legend', 'avatar', 'Leyenda', 'Rango Leyenda (nivel 30).'),
        C('av:rw-ghost', 'avatar', 'Fantasma', 'Evento de Halloween.'),
        C('av:rw-xmas', 'avatar', 'Duende navideño', 'Evento de Navidad.'),
        C('av:rw-nexito', 'avatar', 'Nexito Leyenda', '365 días de racha con Nexito.'),

        // Nexito · Sombreros
        C('nx-gorra', 'pet-hat', 'Gorra Nexus', 'Gorra índigo con el rombo.', 400),
        C('nx-auriculares', 'pet-hat', 'Auriculares gamer', 'Para concentrarse en la partida.', 500),
        C('nx-copa', 'pet-hat', 'Sombrero de copa', 'Elegancia de casino.', 600),
        C('nx-corona', 'pet-hat', 'Corona', 'El rey del arcade.', 900),
        C('nx-gorro-navidad', 'pet-hat', 'Gorro de Papá Noel', 'Rojo, blanco y con borla.', 500),
        C('nx-gorro-lana', 'pet-hat', 'Gorro de lana', 'Calentito, a rayas y con pompón.', 350),
        C('nx-reno', 'pet-hat', 'Cuernos de reno', 'Evento de Navidad: gana 3 partidas de Cartas.'),
        C('nx-bruja', 'pet-hat', 'Sombrero de bruja', 'Puntiagudo, con hebilla dorada.', 500),
        C('nx-vaquero', 'pet-hat', 'Sombrero vaquero', '¡Yiijaa!', 450),
        C('nx-chef', 'pet-hat', 'Gorro de chef', 'Para la hora de la merienda.', 400),
        C('nx-fiesta', 'pet-hat', 'Gorro de fiesta', 'Para celebrar cada hito.', 300),
        C('nx-flores', 'pet-hat', 'Corona de flores', 'Margaritas y amapolas.', 450),
        C('nx-pirata', 'pet-hat', 'Sombrero pirata', 'Tricornio con calavera.', 600),
        C('nx-boina', 'pet-hat', 'Boina', 'Toque de artista.', 300),
        C('nx-aureola', 'pet-hat', 'Aureola', 'Logro secreto: Buscador de secretos.'),
        // Nexito · Accesorios
        C('nx-gafas-sol', 'pet-glasses', 'Gafas de sol', 'Estilo de verano.', 400),
        C('nx-gafas-pixel', 'pet-glasses', 'Gafas pixeladas', 'Deal with it.', 600),
        C('nx-gafas-redondas', 'pet-glasses', 'Gafas redondas', 'Montura dorada fina.', 350),
        C('nx-gafas-corazon', 'pet-glasses', 'Gafas de corazón', 'Enamorado del arcade.', 400),
        C('nx-gafas-3d', 'pet-glasses', 'Gafas 3D', 'Rojo y cian, como en el cine.', 350),
        C('nx-gafas-esqui', 'pet-glasses', 'Gafas de esquí', 'Para la cúpula nevada.', 450),
        C('nx-monoculo', 'pet-glasses', 'Monóculo', 'Con cadenita dorada.', 500),
        C('nx-parche', 'pet-glasses', 'Parche pirata', '¡Al abordaje!', 300),
        C('nx-bigote', 'pet-glasses', 'Bigote', 'Muy distinguido.', 250),
        // Nexito · Ropa
        C('nx-bufanda', 'pet-scarf', 'Bufanda', 'Hito: 7 días de racha.'),
        C('nx-pajarita', 'pet-scarf', 'Pajarita', 'Para las ocasiones especiales.', 350),
        C('nx-capa', 'pet-scarf', 'Capa de héroe', 'Una capa roja al viento.', 800),
        C('nx-jersey-navidad', 'pet-scarf', 'Jersey navideño', 'Punto rojo con copos y renos.', 600),
        C('nx-bufanda-navidad', 'pet-scarf', 'Bufanda navideña', 'Rayas rojas y verdes.', 400),
        C('nx-corbata', 'pet-scarf', 'Corbata', 'Lista para la reunión.', 300),
        C('nx-collar-flores', 'pet-scarf', 'Collar hawaiano', 'Aloha.', 350),
        C('nx-medalla', 'pet-scarf', 'Medalla de oro', 'Campeón de la cúpula.', 500),
        C('nx-bandana', 'pet-scarf', 'Pañuelo', 'Bandana roja de explorador.', 300),
        C('nx-capa-mago', 'pet-scarf', 'Capa de mago', 'Violeta y llena de estrellas.', 800),
        // Nexito · Cúpulas (cristal + pedestal)
        C('nx-cupula-navidad', 'pet-dome', 'Cúpula de Navidad', 'Nieve que cae, abeto con luces, muñeco de nieve y pedestal envuelto como un regalo.', 1500),
        C('nx-cupula-estrellas', 'pet-dome', 'Cúpula estrellada', 'Hito: 30 días de racha.'),
        C('nx-cupula-neon', 'pet-dome', 'Cúpula neón', 'Cristal rosa con brillo.', 600),
        C('nx-cupula-oro', 'pet-dome', 'Cúpula dorada', 'Cristal y pedestal de oro.', 900),
        C('nx-cupula-arcade', 'pet-dome', 'Cúpula arcade', 'Rejilla de neón, marcianitos y luces de recreativa.', 900),
        C('nx-cupula-oceano', 'pet-dome', 'Cúpula acuario', 'Agua, burbujas, peces y algas.', 1000),
        C('nx-cupula-espacio', 'pet-dome', 'Cúpula espacial', 'Planetas y estrellas alrededor de Nexito.', 1000),
        C('nx-cupula-jardin', 'pet-dome', 'Cúpula jardín', 'Flores, césped y mariposas.', 800),
        C('nx-cupula-playa', 'pet-dome', 'Cúpula playa', 'Sol, arena y una palmera.', 800),
        C('nx-cupula-halloween', 'pet-dome', 'Cúpula de Halloween', 'Calabazas, murciélagos y telarañas.', 1000),
        C('nx-cupula-leyenda', 'pet-dome', 'Cúpula Leyenda', 'Hito: 365 días de racha.')
    ];
    const BY_ID = new Map(CATALOG.map(c => [c.id, c]));
    const KINDS = { frame: 'Marcos', title: 'Títulos', banner: 'Fondos de perfil', avatar: 'Iconos de perfil',
        'pet-hat': 'Sombreros', 'pet-glasses': 'Accesorios', 'pet-scarf': 'Ropa', 'pet-dome': 'Cúpulas' };
    const GROUPS = [
        { id: 'player', name: 'Jugador', icon: '👤', kinds: ['frame', 'title', 'banner', 'avatar'] },
        { id: 'pet', name: 'Nexito', icon: '💛', kinds: ['pet-hat', 'pet-glasses', 'pet-scarf', 'pet-dome'] }
    ];
    // Cosméticos retirados (temas, efectos, aspectos de juegos, pedestales sueltos): se cambian o reembolsan una vez
    const RETIRED = { 'nx-base-oro': 'nx-cupula-oro', 'nx-base-arcade': 'nx-cupula-arcade', 'nx-base-leyenda': 'nx-cupula-leyenda',
        'th-oro': 1200, 'th-nocturno': 1200, 'pt-rombos': 600, 'pt-estrellas': 900, 'sk-snake-gold': 500, 'sk-snake-ice': 500, 'sk-snake-lava': 500,
        'sk-cards-indigo': 400, 'sk-cards-gold': 400, 'sk-cards-xmas': 400, 'sk-chess-wood': 500, 'sk-chess-ocean': 500, 'sk-tetris-pastel': 500, 'sk-tetris-neon': 500 };

    /** Cosmético por id (los títulos de Maestría se crean al vuelo: t-master-<juego>). */
    function item(id) {
        if (BY_ID.has(id)) return BY_ID.get(id);
        const m = /^t-master-([a-z0-9]+)$/.exec(id || '');
        if (m) { const g = Nexus.games.registry.get(m[1]); return C(id, 'title', `Maestro de ${g ? g.name : m[1]}`, 'Maestría del juego.'); }
        return null;
    }

    // ── Pase de temporada y rangos ──────────────────────────
    const R = (n) => ({ rombos: n });
    const SEASON_REWARDS = [
        R(50), 'bn-galaxia', R(75), 't-estratega', 'nx-gorro-lana', 'nx-pajarita', 'fr-neon', R(100), 'nx-gafas-redondas', 'av:rw-pad-gold',
        R(100), 'nx-fiesta', R(125), 't-pixel', 'av:rw-phoenix-gold', R(125), 'bn-aurora', R(150), 'bn-oro', 'nx-corbata',
        'nx-cupula-neon', 'nx-cupula-jardin', R(175), 't-tahur', 'nx-vaquero', R(200), 'fr-diamond', R(200), 't-veterano', 'av:rw-nexo-gold'
    ];
    const RANK_REWARDS = { 5: ['fr-silver'], 10: ['bn-arcade'], 15: ['fr-gold'], 20: ['av:rw-crown-neon'], 25: ['nx-cupula-espacio'], 30: ['av:rw-legend', 't-leyenda'] };

    // ── Misiones ────────────────────────────────────────────
    const isDailyMode = (e) => /diari|daily|phrase|frase/.test(e.mode || '');
    const colOf = (e) => Nexus.games.collections.of(e.game).id;
    const COLS = () => Nexus.games.collections.withGames().map(c => ({ id: c.id, name: c.name }));
    /** Plantillas: inc(evento, misión) → +n, o 'reset' para volver a 0. */
    function templates() {
        const T = [];
        const add = (tier, id, text, n, inc) => T.push({ tier, id, text, n, inc });
        add('easy', 'e_play3', 'Juega 3 partidas', 3, () => 1);
        add('easy', 'e_win1', 'Gana 1 partida', 1, (e) => (e.won ? 1 : 0));
        add('easy', 'e_daily1', 'Juega un reto diario', 1, (e) => (isDailyMode(e) ? 1 : 0));
        for (const c of COLS()) add('easy', 'e_col_' + c.id, `Juega 2 partidas de ${c.name}`, 2, (e) => (colOf(e) === c.id ? 1 : 0));
        add('medium', 'm_win3', 'Gana 3 partidas', 3, (e) => (e.won ? 1 : 0));
        add('medium', 'm_distinct3', 'Juega a 3 juegos distintos', 3, (e, m) => distinct(e, m));
        add('medium', 'm_daily2', 'Completa 2 retos diarios', 2, (e) => (isDailyMode(e) && (e.won || e.endless) ? 1 : 0));
        for (const c of COLS()) add('medium', 'm_colwin_' + c.id, `Gana 2 partidas de ${c.name}`, 2, (e) => (e.won && colOf(e) === c.id ? 1 : 0));
        add('hard', 'h_win5', 'Gana 5 partidas', 5, (e) => (e.won ? 1 : 0));
        add('hard', 'h_streak3', 'Gana 3 partidas seguidas', 3, (e) => (e.won ? 1 : e.endless ? 0 : 'reset'));
        add('hard', 'h_distinct5', 'Juega a 5 juegos distintos', 5, (e, m) => distinct(e, m));
        add('hard', 'h_record1', 'Bate uno de tus récords', 1, (e) => (e.record ? 1 : 0));
        add('hard', 'h_daily3', 'Completa 3 retos diarios', 3, (e) => (isDailyMode(e) && (e.won || e.endless) ? 1 : 0));
        add('weekly', 'w_distinct6', 'Juega a 6 juegos distintos esta semana', 6, (e, m) => distinct(e, m));
        add('weekly', 'w_win15', 'Gana 15 partidas esta semana', 15, (e) => (e.won ? 1 : 0));
        add('weekly', 'w_play30', 'Juega 30 partidas esta semana', 30, () => 1);
        add('weekly', 'w_daily7', 'Completa 7 retos diarios esta semana', 7, (e) => (isDailyMode(e) && (e.won || e.endless) ? 1 : 0));
        return T;
    }
    function distinct(e, m) { m.seen = m.seen || []; if (m.seen.includes(e.game)) return 0; m.seen.push(e.game); return 1; }
    const MISSION_ROMBOS = { easy: 20, medium: 40, hard: 70, weekly: 250 };
    const TIER_LABEL = { easy: 'Fácil', medium: 'Media', hard: 'Difícil', weekly: 'Semanal' };
    const STREAK_PRIZES = { 3: 60, 7: 200, 30: 1000 };

    const Rewards = {
        CATALOG, KINDS, GROUPS, SEASON_REWARDS, RANK_REWARDS, LEVEL_COST, SEASON_LEVELS, COMMUNITY_GOAL, MISSION_ROMBOS, TIER_LABEL, STREAK_PRIZES,
        item, seasonOf, weekKey, isWeekend,

        data() { const d = U().data(); return d ? d.rewards : null; },
        balance() { const r = this.data(); return r ? r.rombos : 0; },

        // ── Rombos ──────────────────────────────────────────
        /** Suma Rombos. opts: { double } (fin de semana ×2), { season:false } (no cuenta para el pase), { silent } */
        earn(n, why, opts = {}) {
            const r = this.data(); if (!r || !(n > 0)) return 0;
            const today = keyOf();
            if (r.day.key !== today) r.day = { key: today, earned: 0 };
            if (opts.double && isWeekend()) n *= 2;
            n = Math.max(0, Math.min(n, DAILY_CAP - r.day.earned));
            if (!n) return 0;
            r.rombos += n; r.earned += n; r.day.earned += n;
            r.log.unshift({ at: Date.now(), n, why: String(why || '').slice(0, 60) });
            if (r.log.length > 30) r.log.length = 30;
            if (opts.season !== false) { this.ensureSeason(); r.season.earned += n; this._seasonLevels(); }
            Nexus.bus.emit('rewards:change', { kind: 'rombos', n, why });
            return n;
        },
        spend(n, why) {
            const r = this.data(); if (!r || r.rombos < n) return false;
            r.rombos -= n;
            r.log.unshift({ at: Date.now(), n: -n, why: String(why || '').slice(0, 60) });
            if (r.log.length > 30) r.log.length = 30;
            Nexus.bus.emit('rewards:change', { kind: 'spend', n });
            return true;
        },

        // ── Cosméticos ──────────────────────────────────────
        owns(id) { const r = this.data(); return !!r && r.cosmetics.owned.includes(id); },
        /** Da un cosmético (o Rombos si es { rombos }). Devuelve el objeto ganado o null si ya se tenía. */
        grant(reward, why) {
            const r = this.data(); if (!r || !reward) return null;
            if (typeof reward === 'object' && reward.rombos) { this.earn(reward.rombos, why, { season: false }); return { kind: 'rombos', n: reward.rombos, name: `${reward.rombos} Rombos` }; }
            const it = item(reward);
            if (!it || r.cosmetics.owned.includes(it.id)) return null;
            r.cosmetics.owned.push(it.id);
            Nexus.bus.emit('rewards:grant', { item: it, why });
            return it;
        },
        equipped(kind) { const r = this.data(); return r ? (r.cosmetics.equipped[kind] || '') : ''; },
        equip(kind, id) {
            const r = this.data(); if (!r) return false;
            if (id && (!this.owns(id) || item(id).kind !== kind)) return false;
            r.cosmetics.equipped[kind] = id || '';
            U().saveData(); this.apply();
            Nexus.bus.emit('rewards:change', { kind: 'equip' });
            if (kind === 'title' || kind === 'frame') Nexus.bus.emit('user:update', U().current());
            if (/^pet-/.test(kind) && Nexus.services.pet) { Nexus.bus.emit('pet:change', { kind: 'outfit' }); Nexus.services.pet._checkAch(); }
            return true;
        },
        title() { const id = this.equipped('title'); const it = id && item(id); return it ? it.name : ''; },
        frame() { return this.equipped('frame'); },
        /** Los cosméticos solo afectan al perfil y a Nexito: no hay nada global que aplicar. */
        apply() {},
        /** Cambia o reembolsa (una vez) los cosméticos de tipos retirados y limpia lo equipado que ya no existe. */
        migrate() {
            const r = this.data(); if (!r) return false;
            const c = r.cosmetics, eq = c.equipped; let changed = false;
            for (const id of c.owned.slice()) {
                if (!(id in RETIRED)) continue;
                c.owned.splice(c.owned.indexOf(id), 1); changed = true;
                const to = RETIRED[id];
                if (typeof to === 'string') { if (!c.owned.includes(to)) c.owned.push(to); if (eq['pet-base'] === id && !eq['pet-dome']) eq['pet-dome'] = to; }
                else { r.rombos += to; r.earned += to; r.log.unshift({ at: Date.now(), n: to, why: 'Reembolso: cosmético retirado' }); }
            }
            for (const k of Object.keys(eq)) if (!KINDS[k] || (eq[k] && (!c.owned.includes(eq[k]) || (item(eq[k]) || {}).kind !== k))) { delete eq[k]; changed = true; }
            if (r.log.length > 30) r.log.length = 30;
            return changed;
        },

        // ── Logros, Maestría y rangos ───────────────────────
        onAchievement(def) {
            const r = this.data(); if (r) r.points = A().points();
            this.earn(def.rombos, `Logro: ${def.name}`, { double: true });
            if (def.title) this.grant(def.title, def.name);
            if (def.reward) this.grant(def.reward, def.name);
        },
        checkMastery(unlocked) {
            const r = this.data(); if (!r) return;
            const games = new Set(unlocked.map(d => d.game).filter(g => g !== 'general'));
            for (const g of games) {
                if (r.mastery[g] || !A().mastery(g).done) continue;
                r.mastery[g] = Date.now();
                this.earn(500, `Maestría: ${(Nexus.games.registry.get(g) || {}).name || g}`, { double: false });
                this.grant('t-master-' + g, 'Maestría'); this.grant('fr-mastery', 'Maestría');
                Nexus.bus.emit('rewards:mastery', { game: g });
            }
        },
        checkRanks() {
            const r = this.data(), d = U().data(); if (!r || !d) return [];
            const got = [];
            for (const lv of Object.keys(RANK_REWARDS).map(Number)) {
                if (d.xp.level < lv || r.ranks.includes(lv)) continue;
                r.ranks.push(lv);
                RANK_REWARDS[lv].forEach(id => { const it = this.grant(id, `Nivel ${lv}`); if (it) got.push(it); });
            }
            return got;
        },

        // ── Temporada ───────────────────────────────────────
        ensureSeason() {
            const r = this.data(); if (!r) return null;
            const s = seasonOf();
            if (r.season.id !== s.id) r.season = { id: s.id, earned: 0, level: 0, played: 0 };
            return s;
        },
        _seasonLevels() {
            const r = this.data();
            const lv = Math.min(SEASON_LEVELS, Math.floor(r.season.earned / LEVEL_COST));
            while (r.season.level < lv) {
                r.season.level++;
                const reward = SEASON_REWARDS[r.season.level - 1];
                const it = this.grant(reward, `Temporada ${r.season.id} · nivel ${r.season.level}`);
                Nexus.bus.emit('rewards:season', { level: r.season.level, item: it });
            }
        },
        seasonState() {
            const s = this.ensureSeason() || seasonOf(); const r = this.data() || { season: { earned: 0, level: 0 } };
            const into = r.season.level >= SEASON_LEVELS ? LEVEL_COST : r.season.earned - r.season.level * LEVEL_COST;
            return Object.assign({}, s, { level: r.season.level, earned: r.season.earned, into, cost: LEVEL_COST, max: SEASON_LEVELS });
        },

        // ── Tienda ──────────────────────────────────────────
        /** La tienda muestra siempre todo el catálogo (lo que no tiene precio indica cómo se consigue). */
        shopItems() { return CATALOG.slice(); },
        buy(id) {
            const it = item(id), r = this.data();
            if (!it || !r || !it.price || this.owns(id)) return { ok: false, error: this.owns(id) ? 'Ya lo tienes.' : 'No está a la venta.' };
            if (r.rombos < it.price) return { ok: false, error: `Te faltan ${it.price - r.rombos} Rombos.` };
            this.spend(it.price, `Tienda: ${it.name}`);
            this.grant(id, 'Tienda');
            U().saveData();
            return { ok: true, item: it };
        },

        // ── Misiones ────────────────────────────────────────
        _make(tpl) { return { id: tpl.id, tier: tpl.tier, text: tpl.text, n: tpl.n, prog: 0, done: false, seen: [] }; },
        _daily(day) {
            const T = templates(), r = rng('missions:' + day);
            return ['easy', 'medium', 'hard'].map(t => this._make(pick(r, T.filter(x => x.tier === t))));
        },
        _weekly(week) { const T = templates().filter(x => x.tier === 'weekly'); return this._make(pick(rng('weekly:' + week), T)); },
        /** Renueva las misiones si ha cambiado el día o la semana y cierra la racha del día anterior. */
        ensureMissions() {
            const r = this.data(); if (!r) return null;
            const M = r.missions, today = keyOf(), week = weekKey();
            if (M.day !== today) {
                const st = M.streak;
                if (st.last && st.last !== today) {
                    const gap = daysBetween(st.last, today);
                    // La racha perdona un día por semana
                    if (gap === 2 && st.freezeWeek !== week) st.freezeWeek = week;
                    else if (gap > 1) st.count = 0;
                }
                M.day = today; M.list = this._daily(today); M.rerolled = false;
            }
            if (M.week !== week || !M.weekly) { M.week = week; M.weekly = this._weekly(week); }
            return M;
        },
        missions() { const M = this.ensureMissions(); return M ? { daily: M.list, weekly: M.weekly, streak: M.streak, rerolled: M.rerolled, completed: M.completed } : null; },
        /** Cambia una misión diaria sin completar (una vez al día). */
        reroll(index) {
            const M = this.ensureMissions(); if (!M || M.rerolled) return false;
            const cur = M.list[index]; if (!cur || cur.done) return false;
            const options = templates().filter(t => t.tier === cur.tier && !M.list.some(m => m.id === t.id));
            if (!options.length) return false;
            M.list[index] = this._make(pick(rng('reroll:' + M.day + ':' + index), options));
            M.rerolled = true; U().saveData();
            Nexus.bus.emit('rewards:change', { kind: 'missions' });
            return true;
        },
        _progress(m, e, done) {
            if (m.done) return;
            const tpl = templates().find(t => t.id === m.id); if (!tpl) return;
            const v = tpl.inc(e, m);
            if (v === 'reset') m.prog = 0; else m.prog = Math.min(m.n, m.prog + (v | 0));
            if (m.prog >= m.n) {
                m.done = true;
                const M = this.data().missions; M.completed++;
                this.earn(MISSION_ROMBOS[m.tier], `Misión: ${m.text}`, { double: true });
                m.food = Nexus.services.pet ? Nexus.services.pet.giveFood(m.tier) : null;   // cada misión da una comida a Nexito
                done.push(m);
            }
        },
        _streakUpdate() {
            const M = this.data().missions, st = M.streak, today = keyOf();
            if (!M.list.length || !M.list.every(m => m.done) || st.last === today) return null;
            const gap = st.last ? daysBetween(st.last, today) : 0;
            st.count = gap === 1 || (gap === 2 && st.freezeWeek === weekKey()) ? st.count + 1 : 1;
            st.last = today; st.best = Math.max(st.best, st.count);
            // Sin premios: la racha diaria es la de Nexito (services/pet.js). Este contador sólo alimenta el logro «Disciplina».
            return st.count;
        },

        // ── Tras cada partida ───────────────────────────────
        /** Actualiza contadores, misiones, temporada y eventos. Devuelve lo que se completó para el modal. */
        onGame(e) {
            const r = this.data(); if (!r) return null;
            const today = keyOf(new Date(e.at)), d = new Date(e.at);
            // Contadores del día y de los logros secretos
            if (r.today.key !== today) r.today = { key: today, played: 0, games: [], records: [] };
            r.today.played++;
            if (!r.today.games.includes(e.game)) r.today.games.push(e.game);
            if (e.record && !r.today.records.includes(e.game)) r.today.records.push(e.game);
            if (A().isNight && A().isNight(e.at) && !r.nights.includes(today)) { r.nights.push(today); if (r.nights.length > 31) r.nights.shift(); }
            if (!e.endless && !e.won) { r.losing++; r.lostBefore = 0; }
            else if (e.won) { r.lostBefore = r.losing; r.losing = 0; }
            if (e.score === 0) r.zeroes++;
            if (d.getDay() === 6) r.lastSat = today;
            if (d.getDay() === 0 && r.lastSat && daysBetween(r.lastSat, today) === 1) r.weekendBoth = true;
            // Eventos de temporada (Halloween, Navidad…)
            for (const def of A().all()) {
                if (!def.window || !A().inWindow(def.window, e.at)) continue;
                const ev = r.events[def.window.event] = r.events[def.window.event] || { played: 0, wins: {}, at: 0 };
                if (ev.at === e.at) continue;
                ev.at = e.at; ev.played++;
                if (e.won) { const col = colOf(e); ev.wins[col] = (ev.wins[col] || 0) + 1; }
            }
            // Temporada
            this.ensureSeason(); r.season.played++;
            // Misiones
            this.ensureMissions();
            const done = [];
            r.missions.list.forEach(m => this._progress(m, e, done));
            if (r.missions.weekly) this._progress(r.missions.weekly, e, done);
            this._streakUpdate();
            // Las 3 misiones diarias rescatan la racha de Nexito si está en peligro
            const rescued = r.missions.list.length && r.missions.list.every(m => m.done) && Nexus.services.pet ? Nexus.services.pet.onAllMissions(e.at) : false;
            if (done.length) Nexus.bus.emit('rewards:missions', { done, rescued });
            return { done, rescued };
        },

        // ── Seguir un logro y escaparate ────────────────────
        tracked() { const r = this.data(); return r ? r.tracked || '' : ''; },
        track(id) { const r = this.data(); if (!r) return; r.tracked = r.tracked === id ? '' : id; U().saveData(); Nexus.bus.emit('rewards:change', { kind: 'track' }); return r.tracked; },
        showcase() { const r = this.data(); return r ? r.showcase.filter(id => A().isUnlocked(id)).slice(0, 3) : []; },
        toggleShowcase(id) {
            const r = this.data(); if (!r || !A().isUnlocked(id)) return false;
            const i = r.showcase.indexOf(id);
            if (i >= 0) r.showcase.splice(i, 1);
            else { if (r.showcase.length >= 3) r.showcase.shift(); r.showcase.push(id); }
            U().saveData(); Nexus.bus.emit('rewards:change', { kind: 'showcase' }); Nexus.bus.emit('user:update', U().current());
            return r.showcase.includes(id);
        },

        // ── Meta de comunidad ───────────────────────────────
        /** total: partidas de la temporada entre todos (lo calcula el ranking). */
        community(total) {
            const r = this.data(), s = seasonOf();
            const reached = total >= COMMUNITY_GOAL;
            if (reached && r && r.season.played > 0 && !r.community.includes(s.id)) {
                r.community.push(s.id); this.grant('bn-comunidad', 'Meta de comunidad'); this.earn(300, 'Meta de comunidad', { season: false });
                U().saveData();
            }
            return { total, goal: COMMUNITY_GOAL, reached, season: s.id };
        },

        /** Al iniciar sesión: renueva misiones/temporada, entrega rangos pendientes y aplica los cosméticos. */
        sync() {
            const r = this.data(); if (!r) return;
            r.points = A().points();
            if (this.migrate()) U().saveData();
            this.ensureMissions(); this.ensureSeason(); this.checkRanks();
        }
    };

    Nexus.services.rewards = Rewards;
    Nexus.bus.on('user:login', () => setTimeout(() => Rewards.sync(), 0));
    Nexus.bus.on('progress:update', () => { if (Rewards.checkRanks().length) U().saveData(); });
})();
