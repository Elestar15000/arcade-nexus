/* ============================================================
   NEXUS ARCADE · games/wordsearch/game.js
   Sopa de letras temática: fácil (10×10, horizontal y vertical),
   medio (12×12, + diagonales), difícil (14×14, en las 8
   direcciones, también al revés) y sopa diaria.
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatTime, formatNumber } = Nexus.util;
    const up = (s) => Nexus.games.seed.up(s);

    const THEMES = [
        ['Animales', '🦁', 'león tigre jirafa elefante cebra canguro koala pingüino delfín ballena lobo zorro ardilla conejo murciélago cocodrilo'],
        ['Frutas', '🍓', 'manzana pera plátano naranja fresa cereza melocotón sandía melón uva kiwi piña mango limón ciruela frambuesa'],
        ['Países', '🌍', 'España Francia Italia Portugal Alemania Grecia México Argentina Chile Perú Colombia Japón China Canadá Brasil Marruecos'],
        ['Deportes', '⚽', 'fútbol tenis golf natación ciclismo boxeo esgrima remo baloncesto balonmano atletismo judo surf rugby voleibol escalada'],
        ['Profesiones', '👩‍⚕️', 'médico profesora bombero carpintero panadero abogada piloto cocinero fontanero periodista enfermera arquitecto policía dentista jardinero músico'],
        ['Instrumentos', '🎻', 'guitarra violín piano batería flauta trompeta arpa saxofón clarinete tambor acordeón gaita oboe ukelele contrabajo castañuelas'],
        ['En la cocina', '🍳', 'sartén olla cuchara tenedor cuchillo horno nevera plato vaso taza batidora colador rallador espátula microondas cazo'],
        ['El espacio', '🚀', 'planeta estrella cometa galaxia luna sol astronauta cohete satélite meteorito órbita nebulosa telescopio eclipse marte saturno'],
        ['Ropa', '👕', 'camisa pantalón falda vestido abrigo chaqueta bufanda guantes calcetín zapato bota gorro jersey corbata sombrero pijama'],
        ['Transportes', '🚆', 'coche autobús tren avión barco bicicleta moto metro tranvía helicóptero camión furgoneta patinete velero taxi globo'],
        ['La casa', '🏠', 'cocina salón baño dormitorio pasillo terraza ventana puerta tejado escalera garaje balcón chimenea sótano jardín desván'],
        ['Colores', '🎨', 'rojo azul verde amarillo naranja morado rosa blanco negro gris marrón turquesa violeta dorado plateado granate'],
        ['El cuerpo', '🫀', 'cabeza brazo pierna rodilla codo hombro mano dedo nariz boca oreja ojo cuello espalda tobillo corazón'],
        ['La playa', '🏖️', 'arena ola sombrilla toalla concha cangrejo gaviota faro barca bañador castillo cubo pala crema sol mar'],
        ['Ciudades de España', '🏙️', 'Madrid Barcelona Valencia Sevilla Zaragoza Málaga Bilbao Granada Toledo Salamanca Córdoba Cádiz Oviedo Murcia Alicante Burgos'],
        ['Árboles y plantas', '🌳', 'roble pino olivo encina abeto sauce palmera cactus helecho rosal girasol margarita tulipán amapola hiedra bambú'],
        ['Oficios del mar', '⚓', 'pescador marinero capitán buzo socorrista grumete farero armador naviero estibador timonel práctico'],
        ['El tiempo', '🌦️', 'lluvia nieve viento niebla granizo tormenta rayo trueno nube sol arcoíris helada tornado huracán brisa rocío'],
        ['Postres', '🍰', 'flan helado tarta natillas galleta bizcocho churro magdalena turrón mazapán merengue crepe brownie torrija arroz mousse'],
        ['Mitología', '🏛️', 'Zeus Hera Atenea Apolo Hermes Poseidón Afrodita Ares Hades Perseo Medusa Hércules Pegaso Minotauro Aquiles Ulises'],
        ['Material escolar', '✏️', 'lápiz goma regla cuaderno libro estuche mochila tijeras pegamento rotulador compás sacapuntas pizarra tiza carpeta agenda'],
        ['Emociones', '💛', 'alegría tristeza miedo sorpresa calma ilusión orgullo ternura nostalgia rabia vergüenza envidia esperanza cariño asombro'],
        ['Juegos de mesa', '🎲', 'ajedrez damas parchís oca dominó mus tute brisca bingo póker dados ruleta cartas puzle'],
        ['En el bosque', '🌲', 'seta musgo tronco rama hoja ardilla búho ciervo jabalí ciénaga sendero arroyo cabaña hoguera bellota piña']
    ].map(([name, emoji, words]) => ({ name, emoji, words: words.split(' ') }));

    const LV = {
        facil: { size: 10, count: 8, dirs: [[0, 1], [1, 0]] },
        medio: { size: 12, count: 10, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
        dificil: { size: 14, count: 12, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] },
        diario: { size: 13, count: 11, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] }
    };
    const FILL = 'AAAAAAAEEEEEEEIIIIOOOOOOUUUBBCCCCDDDDFGGHJLLLLLMMMNNNNNÑPPPQRRRRRRSSSSSSTTTTVYZ';

    /** Genera { grid: [[letra]], words: [{w, label, r, c, dr, dc}] }. */
    function generate(r, lv, theme) {
        const { size, count, dirs } = LV[lv];
        for (let attempt = 0; attempt < 40; attempt++) {
            const grid = Array.from({ length: size }, () => new Array(size).fill(''));
            const placed = [];
            const pool = r.shuffle(theme.words.filter(w => up(w).replace(/[^A-ZÑ]/g, '').length >= 3 && up(w).length <= size));
            for (const label of pool) {
                if (placed.length >= count) break;
                const w = up(label).replace(/[^A-ZÑ]/g, '');
                if (placed.some(p => p.w.includes(w) || w.includes(p.w))) continue;
                const opts = [];
                for (const [dr, dc] of dirs) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                    const ey = y + dr * (w.length - 1), ex = x + dc * (w.length - 1);
                    if (ey < 0 || ey >= size || ex < 0 || ex >= size) continue;
                    let ok = true, cross = 0;
                    for (let k = 0; k < w.length; k++) { const ch = grid[y + dr * k][x + dc * k]; if (ch && ch !== w[k]) { ok = false; break; } if (ch) cross++; }
                    if (ok) opts.push({ y, x, dr, dc, cross });
                }
                if (!opts.length) continue;
                // Preferimos algún cruce para que la sopa quede compacta, pero con azar
                const withCross = opts.filter(o => o.cross > 0);
                const o = withCross.length && r() < 0.5 ? r.pick(withCross) : r.pick(opts);
                for (let k = 0; k < w.length; k++) grid[o.y + o.dr * k][o.x + o.dc * k] = w[k];
                placed.push({ w, label, r: o.y, c: o.x, dr: o.dr, dc: o.dc });
            }
            if (placed.length < count) continue;
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!grid[y][x]) grid[y][x] = FILL[Math.floor(r() * FILL.length)];
            // Ninguna palabra puede aparecer dos veces (por azar del relleno)
            if (placed.every(p => occurrences(grid, p.w) === 1)) return { grid, words: placed.sort((a, b) => a.label.localeCompare(b.label, 'es')) };
        }
        throw new Error('[sopa] no se pudo generar');
    }
    function occurrences(grid, w) {
        const n = grid.length; let k = 0;
        const all = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (const [dr, dc] of all) {
            let ok = true;
            for (let i = 0; i < w.length; i++) { const yy = y + dr * i, xx = x + dc * i; if (yy < 0 || yy >= n || xx < 0 || xx >= n || grid[yy][xx] !== w[i]) { ok = false; break; } }
            if (ok) k++;
        }
        return w.length > 1 && w === w.split('').reverse().join('') ? k / 2 : k;
    }
    Nexus.games.wordsearchLogic = { generate, occurrences, THEMES, LV };

    // ── Juego ───────────────────────────────────────────────
    const MODES = [
        { id: 'facil', label: 'Fácil', emoji: '🟢', desc: '10×10 · horizontal y vertical' },
        { id: 'medio', label: 'Medio', emoji: '🟡', desc: '12×12 · también en diagonal' },
        { id: 'dificil', label: 'Difícil', emoji: '🔴', desc: '14×14 · en todas las direcciones y al revés' },
        { id: 'diario', label: 'Sopa diaria', emoji: '📅', desc: 'Tema y sopa iguales para todos hoy', daily: true }
    ];
    const HUES = [4, 28, 48, 90, 150, 175, 200, 220, 255, 280, 310, 335];

    class WordSearch extends Nexus.games.PuzzleGame {
        constructor(root) {
            super(root, {
                id: 'wordsearch', name: 'Sopa de letras', emoji: '🔤', accent: '#22c55e', modes: MODES,
                tagline: 'Encuentra todas las palabras escondidas del tema.',
                pills: [{ id: 'found', icon: '✅', init: '0/0', title: 'Encontradas' }],
                help: ['Arrastra desde la primera hasta la última letra de una palabra (o toca la primera y luego la última).',
                    'En fácil solo van hacia la derecha o hacia abajo; en medio, también en diagonal; en difícil, en cualquier dirección y al revés.',
                    'Las palabras se escriben sin tildes en la sopa.',
                    'La pista ilumina la primera letra de una palabra que te falte (resta puntos).']
            });
            this.bindGame();
            this.showMenu();
        }
        layout() {
            return {
                main: `<div class="ws-theme" id="ws-theme"></div>
                    <div class="ws-wrap"><div class="ws-board" id="ws-board"><svg class="ws-svg" id="ws-svg" aria-hidden="true"></svg><div class="ws-grid" id="ws-grid"></div></div></div>
                    <div class="ws-words" id="ws-words"></div>`,
                side: `<div class="ax-card"><h3>Partida</h3><div class="ax-rows">
                    <div class="ax-row"><span>Encontradas</span><b data-s="found">–</b></div>
                    <div class="ax-row"><span>Pistas</span><b data-s="hints">0</b></div></div>
                    <button type="button" class="btn btn-primary" id="ws-hint">💡 Pista</button></div>`
            };
        }
        bindGame() {
            const grid = this.$('#ws-grid');
            const cellAt = (e) => {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const c = el && el.closest && el.closest('.ws-cell');
                return c && grid.contains(c) ? [+c.dataset.r, +c.dataset.c] : null;
            };
            grid.addEventListener('pointerdown', (e) => {
                if (this.state !== 'playing') return;
                const p = cellAt(e); if (!p) return;
                e.preventDefault();
                if (this.tapStart && !this.drag) {          // segundo toque: fin de la palabra
                    const s = this.tapStart; this.tapStart = null; this.select(s, p, true); return;
                }
                this.drag = { s: p, e: p, id: e.pointerId, moved: false };
                try { grid.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                this.drawSel();
            });
            grid.addEventListener('pointermove', (e) => {
                const d = this.drag; if (!d || e.pointerId !== d.id) return;
                const p = cellAt(e); if (!p) return;
                if (p[0] !== d.e[0] || p[1] !== d.e[1]) { d.e = p; d.moved = true; this.drawSel(); }
            });
            const end = (e) => {
                const d = this.drag; if (!d || e.pointerId !== d.id) return;
                this.drag = null;
                if (!d.moved) { this.tapStart = d.s; this.drawSel(); return; }
                this.select(d.s, d.e, true);
            };
            grid.addEventListener('pointerup', end);
            grid.addEventListener('pointercancel', (e) => { this.drag = null; this.drawSel(); });
            this.$('#ws-hint').addEventListener('click', () => this.hint());
            this.onResize = () => this.drawLines();
            window.addEventListener('resize', this.onResize);
        }
        onDestroy() { window.removeEventListener('resize', this.onResize); }

        /** Recorta el arrastre a una línea recta (horizontal, vertical o diagonal). */
        line(s, e) {
            let dr = e[0] - s[0], dc = e[1] - s[1];
            const len = Math.max(Math.abs(dr), Math.abs(dc));
            if (!len) return { cells: [s], dr: 0, dc: 0 };
            // Elegir la dirección de 8 más cercana
            const ang = Math.atan2(dr, dc), oct = Math.round(ang / (Math.PI / 4));
            const DIRS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
            const [ddr, ddc] = DIRS[(oct + 8) % 8];
            const n = this.grid.length, cells = [];
            for (let k = 0; k <= len; k++) { const y = s[0] + ddr * k, x = s[1] + ddc * k; if (y < 0 || y >= n || x < 0 || x >= n) break; cells.push([y, x]); }
            return { cells, dr: ddr, dc: ddc };
        }
        select(s, e) {
            const L = this.line(s, e);
            this.drawSel();
            if (L.cells.length < 2) return;
            const str = L.cells.map(([y, x]) => this.grid[y][x]).join('');
            const first = L.cells[0], last = L.cells[L.cells.length - 1];
            const w = this.words.find(p => !this.found.includes(p.w) && (
                (p.w === str && p.r === first[0] && p.c === first[1]) ||
                (p.w === str.split('').reverse().join('') && p.r === last[0] && p.c === last[1])));
            if (!w) { if (L.cells.length > 2) { Nexus.audio.play('error'); this.flashBad(L.cells); } return; }
            this.found.push(w.w);
            Nexus.audio.play('correct');
            this.render();
            if (this.found.length === this.words.length) this.win();
            else this.saveRun();
        }
        flashBad(cells) {
            cells.forEach(([y, x]) => { const el = this.$(`.ws-cell[data-r="${y}"][data-c="${x}"]`); if (el) { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); } });
        }
        hint() {
            if (this.state !== 'playing') return;
            const left = this.words.filter(p => !this.found.includes(p.w));
            if (!left.length) return;
            const w = left[Math.floor(Math.random() * left.length)];
            this.hints++;
            Nexus.audio.play('powerActivate');
            const el = this.$(`.ws-cell[data-r="${w.r}"][data-c="${w.c}"]`);
            if (el) { el.classList.remove('hinted'); void el.offsetWidth; el.classList.add('hinted'); }
            this.toast(`Busca «${w.label}» empezando por la letra que brilla`);
            this.render();
        }

        newGame(mode, r) {
            const theme = r.pick(THEMES);
            const g = generate(r, mode.id, theme);
            this.theme = theme.name; this.themeEmoji = theme.emoji;
            this.grid = g.grid; this.words = g.words; this.found = []; this.hints = 0; this.drag = null; this.tapStart = null;
        }
        serialize() { return { t: this.theme, te: this.themeEmoji, g: this.grid, w: this.words, f: this.found, h: this.hints }; }
        restore(d) { this.theme = d.t; this.themeEmoji = d.te; this.grid = d.g; this.words = d.w; this.found = d.f; this.hints = d.h; this.drag = null; this.tapStart = null; }

        win() {
            const score = Math.max(100, { facil: 600, medio: 1100, dificil: 1800, diario: 1500 }[this.mode.id] + Math.max(0, 900 - this.elapsed) * 2 - this.hints * 120);
            this.finish({ won: true, score, label: formatTime(this.elapsed), stats: [{ label: 'Tiempo', value: formatTime(this.elapsed) }, { label: 'Palabras', value: String(this.words.length) }, { label: 'Pistas', value: String(this.hints) }, { label: 'Puntos', value: formatNumber(score) }],
                extra: { hints: this.hints, level: this.mode.id, theme: this.theme }, updateExtra: (x) => { x.words = (x.words || 0) + this.words.length; } });
        }

        render() {
            if (!this.grid) return;
            const n = this.grid.length;
            const board = this.$('#ws-board'); board.style.setProperty('--n', n);
            const foundCells = new Map();
            this.words.forEach((p, i) => { if (this.found.includes(p.w)) for (let k = 0; k < p.w.length; k++) foundCells.set(`${p.r + p.dr * k},${p.c + p.dc * k}`, i); });
            this.$('#ws-grid').innerHTML = this.grid.map((row, y) => row.map((ch, x) => `<span class="ws-cell ${foundCells.has(`${y},${x}`) ? 'got' : ''}" data-r="${y}" data-c="${x}">${ch}</span>`).join('')).join('');
            this.$('#ws-theme').innerHTML = `<span>${esc(this.themeEmoji)}</span> ${esc(this.theme)}`;
            this.$('#ws-words').innerHTML = this.words.map((p, i) => `<span class="ws-word ${this.found.includes(p.w) ? 'got' : ''}" style="--h:${HUES[i % HUES.length]}">${esc(p.label)}</span>`).join('');
            const set = (k, v) => { const e = this.$(`[data-s="${k}"]`); if (e) e.textContent = v; };
            set('found', `${this.found.length}/${this.words.length}`); set('hints', this.hints);
            this.pill('found', `${this.found.length}/${this.words.length}`);
            this.drawLines();
        }
        geom() {
            const g = this.$('#ws-grid').getBoundingClientRect(), b = this.$('#ws-board').getBoundingClientRect();
            const n = this.grid.length, cw = g.width / n;
            return { ox: g.left - b.left, oy: g.top - b.top, cw, w: b.width, h: b.height };
        }
        seg(cells, G, cls, hue) {
            const a = cells[0], z = cells[cells.length - 1];
            const x1 = G.ox + (a[1] + 0.5) * G.cw, y1 = G.oy + (a[0] + 0.5) * G.cw, x2 = G.ox + (z[1] + 0.5) * G.cw, y2 = G.oy + (z[0] + 0.5) * G.cw;
            return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${G.cw * 0.78}" ${hue !== undefined ? `style="--h:${hue}"` : ''}/>`;
        }
        drawLines() {
            if (!this.grid) return;
            const G = this.geom(), svg = this.$('#ws-svg');
            svg.setAttribute('viewBox', `0 0 ${G.w} ${G.h}`);
            let html = '';
            this.words.forEach((p, i) => {
                if (!this.found.includes(p.w)) return;
                html += this.seg([[p.r, p.c], [p.r + p.dr * (p.w.length - 1), p.c + p.dc * (p.w.length - 1)]], G, 'ws-found', HUES[i % HUES.length]);
            });
            this.linesHtml = html;
            this.drawSel();
        }
        drawSel() {
            const svg = this.$('#ws-svg'); if (!this.grid) return;
            let html = this.linesHtml || '';
            const G = this.geom();
            if (this.drag) html += this.seg(this.line(this.drag.s, this.drag.e).cells, G, 'ws-sel');
            else if (this.tapStart) html += this.seg([this.tapStart], G, 'ws-sel');
            svg.innerHTML = html;
        }
    }

    const A = Nexus.services.achievements;
    const ev = (c) => (c.event && c.event.game === 'wordsearch' ? c.event : null);
    A.register([
        { id: 'ws_first', game: 'wordsearch', name: 'Buen ojo', desc: 'Completa una sopa de letras.', icon: '🔤', rarity: 'common', test: (c) => { const e = ev(c); return !!e && e.won; } },
        { id: 'ws_hard', game: 'wordsearch', name: 'Ojo de halcón', desc: 'Completa una sopa difícil sin pistas.', icon: '🦅', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.mode === 'dificil' && !e.extra.hints; } },
        { id: 'ws_fast', game: 'wordsearch', name: 'Visto y no visto', desc: 'Completa una sopa media en menos de 2 minutos.', icon: '⚡', rarity: 'rare', test: (c) => { const e = ev(c); return !!e && e.won && e.mode === 'medio' && e.time < 120; } },
        { id: 'ws_200', game: 'wordsearch', name: 'Cazapalabras', desc: 'Encuentra 200 palabras en total.', icon: '🔎', rarity: 'epic', ...A.counter((c) => c.stats('wordsearch').extra.words || 0, 200) },
        { id: 'ws_daily7', game: 'wordsearch', name: 'Sopa de cada día', desc: 'Completa 7 sopas diarias.', icon: '📅', rarity: 'rare', ...A.counter((c) => c.stats('wordsearch').extra.dailies || 0, 7) }
    ]);
    Nexus.games.registry.register({
        id: 'wordsearch', name: 'Sopa de letras', emoji: '🔤', accent: '#22c55e',
        tagline: '24 temas · 3 niveles · sopa diaria',
        description: 'Encuentra las palabras escondidas de cada tema arrastrando sobre las letras. Tres tamaños, palabras en diagonal y al revés en los niveles altos, y una sopa diaria igual para todos.',
        tags: ['Puzzle', 'Palabras'],
        modes: MODES.map(m => ({ id: m.id, label: m.label })),
        metrics: [{ id: 'wins', label: 'Completadas' }, { id: 'time', label: 'Mejor tiempo' }, { id: 'score', label: 'Puntuación' }],
        mount: (root) => new WordSearch(root)
    });
})();
