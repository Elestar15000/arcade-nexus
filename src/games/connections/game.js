/* ============================================================
   NEXUS ARCADE · games/connections/game.js
   Conexiones: 16 palabras, 4 grupos ocultos de 4. Partida libre,
   difícil (2 fallos) y reto diario igual para todos.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatTime, formatNumber } = Nexus.util;
    const COLORS = ['amarillo', 'verde', 'azul', 'morado'];
    const SQ = ['🟨', '🟩', '🟦', '🟪'];

    // ── Generador ───────────────────────────────────────────
    const isPal = (w) => w.length >= 3 && w === w.split('').reverse().join('');
    const sortL = (w) => w.split('').sort().join('');
    function compatible(a, b) {
        if (a.fam === b.fam) return false;
        const sa = new Set(a.keys);
        return !b.keys.some(k => sa.has(k));
    }
    /** Comprueba las reglas de juego de palabras sobre las 16 palabras elegidas. */
    function valid(groups) {
        const all = groups.flatMap(g => g.keys);
        if (new Set(all).size !== 16) return false;
        for (const g of groups) {
            const others = groups.filter(x => x !== g).flatMap(x => x.keys);
            if (g.cat.hides && others.some(w => g.cat.hides.some(h => w.includes(h)))) return false;
            if (g.cat.palindrome && others.some(isPal)) return false;
            if (g.cat.anagram && others.some(w => sortL(w) === sortL(g.cat.anagram))) return false;
        }
        return true;
    }
    function generate(r) {
        const { CATS } = Nexus.games.connectionsBank;
        for (let attempt = 0; attempt < 400; attempt++) {
            const chosen = [];
            for (let lv = 0; lv < 4; lv++) {
                const opts = CATS.filter(c => c.lv === lv && c.words.length >= 4 && chosen.every(x => compatible(x, c)));
                if (!opts.length) break;
                chosen.push(r.pick(opts));
            }
            if (chosen.length < 4) continue;
            const groups = chosen.map(cat => {
                const idx = r.sample(cat.words.map((_, i) => i), 4);
                return { cat, lv: cat.lv, name: cat.name, words: idx.map(i => cat.words[i]), keys: idx.map(i => cat.keys[i]) };
            });
            if (!valid(groups)) continue;
            const tiles = r.shuffle(groups.flatMap((g, gi) => g.words.map(w => ({ w, g: gi }))));
            return { groups: groups.map(g => ({ lv: g.lv, name: g.name, words: g.words, cat: g.cat.id })), tiles };
        }
        throw new Error('[conexiones] no se pudo generar');
    }
    Nexus.games.connectionsLogic = { generate, valid, compatible };

    // ── Juego ───────────────────────────────────────────────
    const MODES = [
        { id: 'libre', label: 'Partida libre', emoji: '🧩', desc: 'Un tablero nuevo · 4 fallos', lives: 4 },
        { id: 'dificil', label: 'Difícil', emoji: '🔥', desc: 'Solo 2 fallos permitidos', lives: 2 },
        { id: 'diario', label: 'Conexiones del día', emoji: '📅', desc: 'El mismo tablero para todos · 4 fallos', lives: 4, daily: true }
    ];

    class Connections extends Nexus.games.PuzzleGame {
        constructor(root) {
            super(root, {
                id: 'connections', name: 'Conexiones', emoji: '🧩', accent: '#c084fc', modes: MODES,
                tagline: 'Encuentra los 4 grupos de 4 palabras que tienen algo en común.',
                pills: [{ id: 'lives', icon: '❤️', init: '4', title: 'Fallos restantes' }, { id: 'groups', icon: '✅', init: '0/4', title: 'Grupos' }],
                help: ['Hay 16 palabras que forman 4 grupos secretos de 4. Selecciona cuatro y pulsa <b>Enviar</b>.',
                    'Los grupos van de más fácil (🟨) a más retorcido (🟪): en el morado suele haber juegos de palabras.',
                    'Cuidado con las trampas: algunas palabras parecen encajar en varios grupos, pero solo hay una solución.',
                    'Si aciertas tres de cuatro te avisaremos con «¡A una!». Cada fallo te quita una vida.']
            });
            this.bindGame();
            this.showMenu();
        }
        layout() {
            return {
                main: `<p class="cx-top">Forma cuatro grupos de cuatro</p>
                    <div class="cx-solved" id="cx-solved"></div>
                    <div class="cx-grid" id="cx-grid"></div>
                    <div class="cx-lives" id="cx-lives"></div>
                    <div class="cx-btns"><button type="button" class="btn btn-ghost" data-c="shuffle">🔀 Mezclar</button><button type="button" class="btn btn-ghost" data-c="clear">Deseleccionar</button><button type="button" class="btn btn-primary" data-c="submit">Enviar</button></div>`,
                side: `<div class="ax-card"><h3>Partida</h3><div class="ax-rows">
                    <div class="ax-row"><span>Grupos</span><b data-s="groups">0/4</b></div>
                    <div class="ax-row"><span>Fallos</span><b data-s="miss">0</b></div></div></div>
                    <div class="ax-card"><h3>Intentos</h3><div class="cx-history" id="cx-hist"></div></div>`
            };
        }
        bindGame() {
            this.$('#cx-grid').addEventListener('click', (e) => {
                const t = e.target.closest('[data-w]'); if (!t || this.state !== 'playing') return;
                const w = t.dataset.w;
                if (this.sel.includes(w)) this.sel = this.sel.filter(x => x !== w);
                else if (this.sel.length < 4) this.sel.push(w);
                Nexus.audio.play('click'); this.render();
            });
            this.$('.cx-btns').addEventListener('click', (e) => {
                const b = e.target.closest('[data-c]'); if (!b || this.state !== 'playing') return;
                const c = b.dataset.c;
                if (c === 'shuffle') { this.order = Nexus.util.shuffle(this.order.slice()); this.render(); }
                else if (c === 'clear') { this.sel = []; this.render(); }
                else this.submit();
            });
        }
        newGame(mode, r) {
            const p = generate(r);
            this.groups = p.groups; this.order = p.tiles.map(t => t.w); this.groupOf = Object.fromEntries(p.tiles.map(t => [t.w, t.g]));
            this.solved = []; this.sel = []; this.misses = 0; this.tries = [];
        }
        serialize() { return { g: this.groups, o: this.order, go: this.groupOf, s: this.solved, m: this.misses, t: this.tries }; }
        restore(d) { this.groups = d.g; this.order = d.o; this.groupOf = d.go; this.solved = d.s; this.misses = d.m; this.tries = d.t; this.sel = []; }

        submit() {
            if (this.sel.length !== 4) { this.toast('Selecciona 4 palabras'); return; }
            const key = this.sel.slice().sort().join('|');
            if (this.tries.some(t => t.key === key)) { this.toast('Ya has probado esa combinación'); return; }
            const gs = this.sel.map(w => this.groupOf[w]);
            const count = {}; gs.forEach(g => { count[g] = (count[g] || 0) + 1; });
            const best = Math.max(...Object.values(count));
            this.tries.push({ key, colors: gs.map(g => this.groups[g].lv) });
            if (best === 4) {
                const g = gs[0];
                this.solved.push(g);
                this.order = this.order.filter(w => this.groupOf[w] !== g);
                this.sel = [];
                Nexus.audio.play('correct');
                this.render();
                if (this.solved.length === 4) { this.win(); return; }
            } else {
                this.misses++;
                Nexus.audio.play('error');
                const grid = this.$('#cx-grid'); grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
                if (best === 3) this.toast('¡A una! Te falta solo una palabra');
                this.render();
                if (this.misses >= this.mode.lives) { this.lose(); return; }
            }
            this.saveRun();
        }
        summary() { return this.tries.map(t => t.colors.map(c => SQ[c]).join('')).join('<br>'); }
        win() {
            const purpleFirst = this.solved[0] !== undefined && this.groups[this.solved[0]].lv === 3;
            const score = 800 + (this.mode.lives - this.misses) * 250 + Math.max(0, 600 - this.elapsed) + (purpleFirst ? 300 : 0) + (this.mode.id === 'dificil' ? 400 : 0);
            this.finish({ won: true, score, label: `${this.misses} fallo${this.misses === 1 ? '' : 's'}`, emoji: '🧩',
                html: `<div class="cx-sum">${this.summary()}</div>`,
                stats: [{ label: 'Fallos', value: `${this.misses}/${this.mode.lives}` }, { label: 'Tiempo', value: formatTime(this.elapsed) }, { label: 'Puntos', value: formatNumber(score) }],
                extra: { misses: this.misses, purpleFirst }, updateExtra: (x) => { if (!this.misses) x.perfect = (x.perfect || 0) + 1; } });
        }
        lose() {
            // Muestra los grupos que faltaban
            this.groups.forEach((g, i) => { if (!this.solved.includes(i)) this.solved.push(i); });
            this.order = []; this.render();
            this.finish({ won: false, score: this.solved.length * 50, emoji: '💔', title: 'SIN VIDAS', delay: 1400, html: `<div class="cx-sum">${this.summary()}</div>`, extra: { misses: this.misses } });
        }
        onGiveUp() { this.lose(); }

        render() {
            if (!this.groups) return;
            this.$('#cx-solved').innerHTML = this.solved.map(i => { const g = this.groups[i]; return `<div class="cx-row c-${COLORS[g.lv]}"><b>${esc(g.name)}</b><span>${g.words.map(esc).join(', ')}</span></div>`; }).join('');
            this.$('#cx-grid').innerHTML = this.order.map(w => `<button type="button" class="cx-tile ${this.sel.includes(w) ? 'sel' : ''} ${w.length > 9 ? 'long' : ''}" data-w="${esc(w)}">${esc(w)}</button>`).join('');
            const left = this.mode.lives - this.misses;
            this.$('#cx-lives').innerHTML = `Fallos restantes: ${'<i class="on"></i>'.repeat(Math.max(0, left))}${'<i></i>'.repeat(Math.max(0, this.misses))}`;
            this.$('[data-c="submit"]').disabled = this.sel.length !== 4;
            this.$('#cx-hist').innerHTML = this.tries.length ? this.summary() : '<span class="ax-hint">Aún no has enviado ningún grupo.</span>';
            const set = (k, v) => { const e = this.$(`[data-s="${k}"]`); if (e) e.textContent = v; };
            set('groups', `${this.solved.filter((_, k) => k < 4).length}/4`); set('miss', this.misses);
            this.pill('lives', String(Math.max(0, left))); this.pill('groups', `${Math.min(4, this.solved.length)}/4`);
        }
    }

    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'connections' ? c.event : null);
    A.register([
        { id: 'cx_first', game: 'connections', name: 'Todo conectado', desc: 'Resuelve un tablero de Conexiones.', icon: '🧩', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won; } },
        { id: 'cx_perfect', game: 'connections', name: 'Sin un fallo', desc: 'Resuelve un tablero sin fallar.', icon: '💎', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && !e.extra.misses; } },
        { id: 'cx_purple', game: 'connections', name: 'Morado primero', desc: 'Resuelve el grupo morado antes que ningún otro.', icon: '🟪', rarity: 'epic', test: (c) => { const e = ev(c); return !!e && e.won && e.extra.purpleFirst; } },
        { id: 'cx_hard', game: 'connections', name: 'Al límite', desc: 'Resuelve un tablero en modo difícil.', icon: '🔥', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.mode === 'dificil'; } },
        { id: 'cx_daily7', game: 'connections', name: 'Conectado a diario', desc: 'Resuelve 7 Conexiones del día.', icon: '📅', rarity: 'rare', ...A.counter((c) => c.stats('connections').extra.dailies || 0, 7) }
    ]);
    Nexus.games.registry.register({
        id: 'connections', name: 'Conexiones', emoji: '🧩', accent: '#c084fc',
        tagline: '16 palabras · 4 grupos · reto diario',
        description: 'Agrupa 16 palabras en 4 grupos secretos, del más fácil al más retorcido, sin gastar tus vidas. Con trampas, juegos de palabras y un tablero diario igual para todos.',
        tags: ['Puzzle', 'Palabras'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'wins', label: 'Resueltos' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new Connections(root)
    });
})();
