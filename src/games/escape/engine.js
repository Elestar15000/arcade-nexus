/* ============================================================
   NEXUS ARCADE · games/escape/engine.js
   Motor puro (sin DOM) del Escape Room. Una sala es un conjunto
   de objetos con los que se interactúa:
     · look   texto (o lista [condición, texto], …, 'por defecto')
     · note   pista que se apunta en el cuaderno al mirar
     · take   { item, if?, t? }  coger un objeto (gone: desaparece)
     · lock   { k: digits|word|colors|dirs, len, ans, q, if?, then }
     · use    [{ item, if?, then, consume? }]  usar un objeto
   Efectos (then): { t, set: [flags], give: [items], take: [items],
     note, win }. Condiciones: 'flag', '!flag', 'has:item',
     'got:item', 'obj:open' o un array (todas).
   Los objetos del inventario pueden combinarse (combine).
   ============================================================ */
(function () {
    'use strict';

    const COLORS = {
        rojo: '#ef4444', naranja: '#f97316', amarillo: '#facc15', verde: '#22c55e', azul: '#3b82f6',
        morado: '#a855f7', rosa: '#ec4899', blanco: '#f8fafc', negro: '#111827', gris: '#9ca3af'
    };
    const DIRS = { U: '↑', D: '↓', L: '←', R: '→' };

    /** Mayúsculas sin tildes ni espacios (la Ñ se mantiene). */
    function norm(s) {
        return String(s == null ? '' : s).toUpperCase().trim()
            .replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ')
            .replace(/[^A-Z0-9Ñ]/g, '');
    }

    function newState(room) {
        return { room: room.id, flags: {}, inv: [], notes: [], log: [], won: false };
    }

    function test(cond, st) {
        if (cond === undefined || cond === null || cond === '') return true;
        if (Array.isArray(cond)) return cond.every(c => test(c, st));
        const neg = cond[0] === '!';
        const c = neg ? cond.slice(1) : cond;
        let v;
        if (c.startsWith('has:')) v = st.inv.includes(c.slice(4));
        else v = !!st.flags[c];
        return neg ? !v : v;
    }

    const visible = (o, st) => test(o.show, st) && !(o.take && o.take.gone && st.flags['got:' + o.take.item]);

    /** Texto de un objeto según el estado. */
    function lookText(o, st) {
        const L = o.look;
        if (!L) return '';
        if (typeof L === 'string') return L;
        for (const e of L) {
            if (typeof e === 'string') return e;
            if (test(e[0], st)) return e[1];
        }
        return '';
    }
    function noteOf(o, st) {
        if (!o.note) return null;
        if (typeof o.note === 'string') return o.note;
        return test(o.note[0], st) ? o.note[1] : null;
    }

    function addNote(st, n) { if (n && !st.notes.includes(n)) st.notes.push(n); }

    function effect(room, st, eff) {
        if (!eff) return '';
        for (const f of [].concat(eff.set || [])) st.flags[f] = true;
        for (const it of [].concat(eff.take || [])) { const i = st.inv.indexOf(it); if (i >= 0) st.inv.splice(i, 1); }
        for (const it of [].concat(eff.give || [])) give(room, st, it);
        if (eff.note) addNote(st, eff.note);
        if (eff.win) st.won = true;
        return eff.t || '';
    }
    function give(room, st, it) {
        if (!room.items[it]) throw new Error(`[escape] ${room.id}: objeto desconocido ${it}`);
        if (!st.inv.includes(it)) st.inv.push(it);
        st.flags['got:' + it] = true;
        const n = room.items[it].note;
        if (n) addNote(st, n);
    }

    // ── Acciones ────────────────────────────────────────────
    function look(room, st, id) {
        const o = room.objs.find(x => x.id === id);
        if (!o || !visible(o, st)) return null;
        addNote(st, noteOf(o, st));
        st.flags['seen:' + id] = true;
        return lookText(o, st);
    }

    const canTake = (o, st) => !!o.take && !st.flags['got:' + o.take.item] && test(o.take.if, st);
    function take(room, st, id) {
        const o = room.objs.find(x => x.id === id);
        if (!o || !visible(o, st) || !canTake(o, st)) return { ok: false };
        give(room, st, o.take.item);
        for (const f of [].concat(o.take.set || [])) st.flags[f] = true;
        return { ok: true, t: o.take.t || `Coges: ${room.items[o.take.item].n}.` };
    }

    const lockOpen = (o, st) => !!st.flags[o.id + ':open'];
    const lockReady = (o, st) => !!o.lock && !lockOpen(o, st) && test(o.lock.if, st);

    /** Compara la respuesta (string para digits/word, array para colors/dirs). */
    function checkAnswer(lock, value) {
        if (lock.k === 'colors' || lock.k === 'dirs') {
            const v = (Array.isArray(value) ? value : String(value).split(',')).map(x => String(x).trim());
            return v.join(',') === lock.ans.join(',');
        }
        const alts = Array.isArray(lock.ans) ? lock.ans : [lock.ans];
        return alts.some(a => norm(a) === norm(value));
    }
    function tryLock(room, st, id, value) {
        const o = room.objs.find(x => x.id === id);
        if (!o || !visible(o, st) || !lockReady(o, st)) return { ok: false, t: '' };
        if (!checkAnswer(o.lock, value)) return { ok: false, wrong: true, t: o.lock.wrong || 'No se abre. La combinación no es correcta.' };
        st.flags[o.id + ':open'] = true;
        return { ok: true, t: effect(room, st, o.lock.then) || '¡Clic! Se ha abierto.' };
    }

    function useOptions(o, st, item) { return (o.use || []).filter(u => u.item === item && test(u.if, st) && !st.flags[`used:${o.id}:${u.item}`]); }
    function useItem(room, st, id, item) {
        const o = room.objs.find(x => x.id === id);
        if (!o || !visible(o, st) || !st.inv.includes(item)) return { ok: false, t: '' };
        const u = useOptions(o, st, item)[0];
        if (!u) {
            const done = (o.use || []).some(x => x.item === item && st.flags[`used:${o.id}:${x.item}`]);
            const blocked = (o.use || []).find(x => x.item === item && !test(x.if, st));
            return { ok: false, t: done ? 'Ya lo has hecho.' : blocked && blocked.no ? blocked.no : 'No parece servir aquí.' };
        }
        st.flags[`used:${o.id}:${u.item}`] = true;
        if (u.consume) { const i = st.inv.indexOf(item); if (i >= 0) st.inv.splice(i, 1); }
        return { ok: true, t: effect(room, st, u.then) };
    }

    function combine(room, st, a, b) {
        if (a === b || !st.inv.includes(a) || !st.inv.includes(b)) return { ok: false, t: '' };
        const A = room.items[a], B = room.items[b];
        const c = (A.combine && A.combine.with === b) ? A.combine : (B.combine && B.combine.with === a) ? B.combine : null;
        if (!c) return { ok: false, t: 'Esas dos cosas no encajan.' };
        st.inv = st.inv.filter(x => x !== a && x !== b);
        give(room, st, c.give);
        return { ok: true, t: c.t || `Combinas y obtienes: ${room.items[c.give].n}.` };
    }

    /** Pista actual: la primera cuya condición «until» aún no se cumple. */
    function hintIndex(room, st) {
        const i = room.hints.findIndex(h => !h.until || !test(h.until, st));
        return i < 0 ? room.hints.length - 1 : i;
    }

    // ── Validación: busca una ruta hasta la salida (para las pruebas) ──
    function solve(room, maxStates = 200000) {
        const key = (st) => Object.keys(st.flags).filter(k => !k.startsWith('seen:')).sort().join('|') + '#' + st.inv.slice().sort().join('|');
        const clone = (st) => ({ room: st.room, flags: Object.assign({}, st.flags), inv: st.inv.slice(), notes: st.notes.slice(), log: [], won: st.won });
        const start = newState(room);
        const queue = [[start, []]]; const seen = new Set([key(start)]);
        while (queue.length) {
            const [st, path] = queue.shift();
            const next = [];
            for (const o of room.objs) {
                if (!visible(o, st)) continue;
                if (canTake(o, st)) { const s = clone(st); take(room, s, o.id); next.push([s, `coger ${o.id}`]); }
                if (lockReady(o, st)) { const s = clone(st); tryLock(room, s, o.id, o.lock.k === 'colors' || o.lock.k === 'dirs' ? o.lock.ans : [].concat(o.lock.ans)[0]); next.push([s, `abrir ${o.id}`]); }
                for (const it of st.inv) if (useOptions(o, st, it).length) { const s = clone(st); useItem(room, s, o.id, it); next.push([s, `usar ${it} en ${o.id}`]); }
            }
            for (let i = 0; i < st.inv.length; i++) for (let j = i + 1; j < st.inv.length; j++) {
                const s = clone(st); if (combine(room, s, st.inv[i], st.inv[j]).ok) next.push([s, `combinar ${st.inv[i]}+${st.inv[j]}`]);
            }
            for (const [s, a] of next) {
                if (s.won) return { ok: true, path: path.concat(a) };
                const k = key(s); if (seen.has(k)) continue;
                seen.add(k); queue.push([s, path.concat(a)]);
                if (seen.size > maxStates) return { ok: false, reason: 'demasiados estados' };
            }
        }
        return { ok: false, reason: 'sin salida' };
    }

    /** Comprueba referencias: objetos, cosas del inventario, candados y pistas. */
    function lint(room) {
        const errs = [];
        const items = room.items || {};
        const ids = new Set();
        const checkEff = (e, where) => { if (!e) return; for (const it of [].concat(e.give || [], e.take || [])) if (!items[it]) errs.push(`${where}: objeto ${it} no existe`); };
        for (const o of room.objs) {
            if (ids.has(o.id)) errs.push('id repetido ' + o.id); ids.add(o.id);
            if (!o.e || !o.n) errs.push(o.id + ': falta emoji o nombre');
            if (o.take && !items[o.take.item]) errs.push(`${o.id}: take ${o.take.item} no existe`);
            if (o.lock) {
                const L = o.lock;
                if (!['digits', 'word', 'colors', 'dirs'].includes(L.k)) errs.push(`${o.id}: candado desconocido`);
                if (L.k === 'digits' && (!/^\d+$/.test(L.ans) || L.ans.length !== L.len)) errs.push(`${o.id}: código ${L.ans} no tiene ${L.len} cifras`);
                if (L.k === 'colors' && !L.ans.every(c => COLORS[c])) errs.push(`${o.id}: color desconocido`);
                if (L.k === 'dirs' && !L.ans.every(c => DIRS[c])) errs.push(`${o.id}: dirección desconocida`);
                if (!L.q) errs.push(`${o.id}: candado sin enunciado`);
                checkEff(L.then, o.id);
            }
            for (const u of o.use || []) { if (!items[u.item]) errs.push(`${o.id}: use ${u.item} no existe`); checkEff(u.then, o.id); }
            if (o.x < 0 || o.x > 100 || o.y < 0 || o.y > 100) errs.push(`${o.id}: posición fuera de la escena`);
        }
        for (const [k, it] of Object.entries(items)) {
            if (!it.e || !it.n || !it.d) errs.push(`objeto ${k}: incompleto`);
            if (it.combine && (!items[it.combine.with] || !items[it.combine.give])) errs.push(`objeto ${k}: combinación rota`);
        }
        if (!room.hints || room.hints.length < 2) errs.push('pocas pistas');
        if (!room.intro || !room.name) errs.push('falta nombre o introducción');
        return errs;
    }

    // ── Azar con semilla (salas diarias) ────────────────────
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function seedOf(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) {
        const r = mulberry32(seedOf(seed));
        const R = () => r();
        R.int = (a, b) => a + Math.floor(r() * (b - a + 1));
        R.pick = (arr) => arr[Math.floor(r() * arr.length)];
        R.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
        R.sample = (arr, n) => R.shuffle(arr).slice(0, n);
        return R;
    }

    Nexus.games.escapeEngine = {
        COLORS, DIRS, norm, newState, test, visible, lookText, noteOf, look, take, canTake, tryLock, lockReady, lockOpen,
        checkAnswer, useItem, useOptions, combine, hintIndex, solve, lint, rng, effect
    };
})();
