/* ============================================================
   NEXUS ARCADE · games/towerdefense/game.js
   Kernel Defense — Tower Defense con temática de programación.
   - Un único mapa (la placa base) y rondas infinitas: se juega hasta caer.
   - 4 torres-lenguaje (Python, Java, C++, Rust). Cada nivel ofrece 3
     opciones: rama A, rama B o híbrida (se mezclan libremente).
   - Amenazas: Virus y Malware con capas, inmunidades y jefes Zero-Day.
   - Guardado automático al terminar cada ronda.
   La lógica vive en data.js / engine.js (sin DOM).
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber, formatTime } = Nexus.util;
    const TD = Nexus.games.td;
    const W = TD.W, H = TD.H;
    const SPEEDS = [1, 2, 3];
    const MONO = "'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace";
    const KEYS = ['q', 'w', 'e'];
    const REASONS = {
        cash: 'No tienes suficientes créditos', path: 'No puedes construir sobre el bus de datos',
        obstacle: 'Hay un componente en ese sitio', tower: 'Demasiado cerca de otra torre', bounds: 'Fuera de la placa'
    };
    const SNIPPETS = [
        'def attack(virus):', 'print("Hello, World!")', 'public static void main(String[] a)', 'int main() { return 0; }',
        'fn main() { println!("Hi"); }', 'if (malware) quarantine();', 'while True: scan()', '#include <stdio.h>',
        'import numpy as np', 'git commit -m "fix"', 'try { run(); } catch (e) {}', 'for (i = 0; i < n; i++)',
        'SELECT * FROM threats;', '0xDEADBEEF', '// TODO: fix bug', 'chmod +x firewall.sh', 'return NULL;',
        'let mut core = Core::new();', 'class Firewall extends Shield', 'sudo apt install antivirus', 'assert(!virus);'
    ];

    // ── Utilidades de dibujo ────────────────────────────────
    function rng(seed) {
        return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }
    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
        c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
        c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
        c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
    }
    function lighten(hex, a) {
        const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
        const f = (v) => Math.round(v + (255 - v) * a);
        return `rgb(${f(r)},${f(g)},${f(b)})`;
    }

    let bgCache = null;
    /** Fondo de la placa base (PCB, código, bus de datos, chips, INTERNET y CORE) renderizado una vez a 2x. */
    function background() {
        if (bgCache) return bgCache;
        const map = TD.MAP, col = map.colors;
        const S = 2, cv = document.createElement('canvas');
        cv.width = W * S; cv.height = H * S;
        const c = cv.getContext('2d'); c.scale(S, S);
        const r = rng(2026);
        c.fillStyle = col.base; c.fillRect(0, 0, W, H);
        // rejilla
        c.strokeStyle = col.grid; c.lineWidth = 1;
        c.beginPath();
        for (let x = 0; x <= W; x += 30) { c.moveTo(x + .5, 0); c.lineTo(x + .5, H); }
        for (let y = 0; y <= H; y += 30) { c.moveTo(0, y + .5); c.lineTo(W, y + .5); }
        c.stroke();
        // código de fondo
        c.font = `11px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'middle';
        for (let i = 0; i < 46; i++) {
            c.fillStyle = r() > .5 ? 'rgba(80,220,190,.075)' : 'rgba(120,160,255,.07)';
            c.fillText(SNIPPETS[Math.floor(r() * SNIPPETS.length)], r() * (W - 120), 10 + r() * (H - 20));
        }
        // pistas del circuito impreso
        c.strokeStyle = col.trace; c.lineWidth = 1.6; c.lineJoin = 'round';
        for (let i = 0; i < 44; i++) {
            let x = Math.round(r() * W / 30) * 30, y = Math.round(r() * H / 30) * 30;
            c.beginPath(); c.moveTo(x, y);
            const n = 2 + Math.floor(r() * 3);
            for (let k = 0; k < n; k++) {
                const horiz = r() > .5, len = (1 + Math.floor(r() * 4)) * 30 * (r() > .5 ? 1 : -1);
                if (horiz) x += len; else y += len;
                c.lineTo(x, y);
                if (r() > .6) { x += len > 0 ? 30 : -30; y += 30; c.lineTo(x, y); }
            }
            c.stroke();
            c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.stroke();
        }
        // bus de datos
        const stroke = (w, colr, dash) => {
            c.beginPath(); map.path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
            c.lineWidth = w; c.strokeStyle = colr; c.lineJoin = 'round'; c.lineCap = 'butt';
            c.setLineDash(dash || []); c.stroke(); c.setLineDash([]);
        };
        stroke(TD.PATH_HALF * 2 + 14, 'rgba(25,211,218,.08)');
        stroke(TD.PATH_HALF * 2 + 4, 'rgba(25,211,218,.55)');
        stroke(TD.PATH_HALF * 2, col.bus);
        // "bits" a lo largo del bus
        c.font = `bold 10px ${MONO}`; c.textAlign = 'center'; c.fillStyle = 'rgba(25,211,218,.16)';
        const pts = map.path;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            for (let d = 14; d < len; d += 22) {
                const t = d / len;
                c.fillText(r() > .5 ? '1' : '0', a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + (i % 2 ? 0 : 0));
            }
        }
        // chips (obstáculos)
        for (const o of map.obstacles) {
            const s = o.r * 1.7, x = o.x - s / 2, y = o.y - s / 2;
            c.fillStyle = 'rgba(0,0,0,.35)'; roundRect(c, x + 3, y + 4, s, s, 5); c.fill();
            c.fillStyle = '#8d99a6';
            for (let k = 0; k < 5; k++) {
                const p = (k + .5) * s / 5;
                c.fillRect(x - 4, y + p - 1.5, 5, 3); c.fillRect(x + s - 1, y + p - 1.5, 5, 3);
                c.fillRect(x + p - 1.5, y - 4, 3, 5); c.fillRect(x + p - 1.5, y + s - 1, 3, 5);
            }
            const g = c.createLinearGradient(x, y, x + s, y + s);
            g.addColorStop(0, '#26364a'); g.addColorStop(1, col.chip);
            c.fillStyle = g; roundRect(c, x, y, s, s, 5); c.fill();
            c.lineWidth = 1.5; c.strokeStyle = '#3b5068'; c.stroke();
            c.fillStyle = '#5c6f86'; c.beginPath(); c.arc(x + 6, y + 6, 2, 0, 7); c.fill();
            c.font = `bold ${Math.max(9, Math.round(o.r * .5))}px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillStyle = '#9fb3c8'; c.fillText(o.label, o.x, o.y + 1);
        }
        // entrada INTERNET
        c.font = `bold 11px ${MONO}`; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillStyle = '#ff6b6b'; c.fillText('🌐 INTERNET ▸', 8, 62);
        // CORE
        const K = TD.CORE, cs = 58;
        const glow = c.createRadialGradient(K.x, K.y, 10, K.x, K.y, 70);
        glow.addColorStop(0, 'rgba(25,211,218,.35)'); glow.addColorStop(1, 'rgba(25,211,218,0)');
        c.fillStyle = glow; c.fillRect(K.x - 70, K.y - 70, 140, 140);
        c.fillStyle = '#0f2a33'; roundRect(c, K.x - cs / 2, K.y - cs / 2, cs, cs, 8); c.fill();
        c.lineWidth = 2.5; c.strokeStyle = col.busEdge; c.stroke();
        c.strokeStyle = 'rgba(25,211,218,.5)'; c.lineWidth = 1; roundRect(c, K.x - cs / 2 + 7, K.y - cs / 2 + 7, cs - 14, cs - 14, 4); c.stroke();
        c.fillStyle = col.busEdge; c.font = `bold 13px ${MONO}`; c.textAlign = 'center'; c.fillText('CORE', K.x, K.y + 1);
        c.font = '12px sans-serif'; c.fillText('🛡️', K.x, K.y - 14);
        bgCache = cv;
        return cv;
    }

    const bestOf = (ex) => {
        const b = (ex || {}).bestRound;
        return typeof b === 'number' ? b : (b && typeof b === 'object' ? Math.max(0, ...Object.values(b)) : 0);
    };

    // ── Juego ───────────────────────────────────────────────
    class TowerDefense {
        constructor(root) {
            this.root = root;
            this.destroyed = false;
            this.timers = new Set();
            this.engine = null;
            this.raf = 0;
            this.onKey = (e) => this.key(e);
            this.onLayout = () => this.resize();
            document.addEventListener('keydown', this.onKey);
            this.unsubLayout = Nexus.bus.on('layout:change', this.onLayout);
            this.showMenu();
        }

        later(fn, ms) {
            const id = setTimeout(() => { this.timers.delete(id); if (!this.destroyed) fn(); }, ms);
            this.timers.add(id);
        }

        /** Partida guardada compatible (las guardadas por la versión anterior del juego se ignoran). */
        saved() {
            const d = Nexus.services.users.data();
            const sv = d && d.saves ? d.saves.towerdefense : null;
            return sv && sv.v === TD.SAVE_VERSION ? sv : null;
        }
        writeSave(snap) {
            const d = Nexus.services.users.data();
            if (!d) return;
            if (snap) d.saves.towerdefense = snap; else delete d.saves.towerdefense;
            Nexus.services.users.saveData();
        }

        stopLoop() { cancelAnimationFrame(this.raf); this.raf = 0; if (this.ro) { this.ro.disconnect(); this.ro = null; } }

        // ── Menú ────────────────────────────────────────────
        showMenu() {
            this.stopLoop();
            this.engine = null;
            const sv = this.saved();
            const gs = Nexus.services.progress.stats('towerdefense');
            const best = bestOf(gs.extra);
            const threats = Object.values(TD.ENEMIES).map((en) => {
                const notes = [];
                if (en.immune) notes.push('Inmune a ' + en.immune.map(k => TD.DMG_LABEL[k]).join(', ') + (en.armored ? ' (se rompe con Cython)' : ''));
                if (en.boss) notes.push('Jefe cada 10 rondas desde la 20');
                if (en.kids.length) notes.push('Al romperse suelta: ' + en.kids.map(k => TD.ENEMIES[k].name).join(' + '));
                return `<div class="td-threat"><i class="td-dot${en.boss ? ' boss' : ''}" style="background:${en.color}"></i>
                    <div><strong>${esc(en.name)}</strong> <span class="td-fam ${en.family === 'Virus' ? 'virus' : 'malware'}">${esc(en.family)}</span>
                    <div class="muted small">${esc(notes.join(' · ') || 'Sin habilidades especiales')}</div></div></div>`;
            }).join('');
            const langs = TD.TOWER_ORDER.map((id) => {
                const t = TD.TOWERS[id];
                return `<div class="td-lang" style="--lang:${t.color}">
                    <div class="td-lang-head"><span class="td-lang-emoji">${esc(t.emoji)}</span><strong>${esc(t.name)}</strong><span class="td-lang-cost">🪙 ${TD.cost(t.cost)}</span></div>
                    <p class="small">${esc(t.desc)}</p>
                    <div class="td-lang-br"><span class="td-up-tag" style="--c:${TD.OPTION_COLORS[0]}">A</span> ${esc(t.branches[0].name)} <span class="muted">· ${esc(t.branches[0].desc)}</span></div>
                    <div class="td-lang-br"><span class="td-up-tag" style="--c:${TD.OPTION_COLORS[1]}">B</span> ${esc(t.branches[1].name)} <span class="muted">· ${esc(t.branches[1].desc)}</span></div>
                </div>`;
            }).join('');
            this.root.innerHTML = `
                <div class="game towerdefense">
                    <header class="game-header">
                        <a class="btn-back" href="#/library"><span class="back-arrow">←</span><span>Biblioteca</span></a>
                        <div class="game-title"><span>🖥️</span> Kernel Defense</div>
                        <div class="game-header-stats"></div>
                    </header>
                    <div class="td-menu"><div class="td-menu-inner">
                        ${sv ? `
                        <div class="td-resume">
                            <div><strong>▶ Partida guardada</strong>
                                <span class="muted small">Ronda ${sv.round} · 🛡️ ${sv.lives} · 🪙 ${formatNumber(sv.cash)} · ${sv.towers.length} torres</span></div>
                            <div class="td-resume-btns">
                                <button class="btn btn-primary" data-act="resume">Continuar</button>
                                <button class="btn btn-ghost btn-sm" data-act="discard">Descartar</button>
                            </div>
                        </div>` : ''}
                        <section class="td-hero">
                            <canvas width="360" height="240" data-prev></canvas>
                            <div class="td-hero-text">
                                <div class="td-hero-code">&lt;/&gt; kernel.defend(core)</div>
                                <h2 class="td-hero-title">Defiende el núcleo</h2>
                                <p class="muted">Un único mapa y <b>rondas infinitas</b>: Virus y Malware atacan sin parar y cada vez son más fuertes. Aguanta todo lo que puedas.</p>
                                <div class="td-hero-stats"><span>🏁 Mejor ronda <b>${best}</b></span><span>🎮 Partidas <b>${gs.played}</b></span></div>
                                <div class="td-menu-actions">
                                    <button class="btn btn-primary btn-lg" data-act="play">▶ Nueva partida</button>
                                    <button class="btn btn-ghost" data-act="help">❓ Cómo se juega</button>
                                </div>
                            </div>
                        </section>
                        <h3 class="subhead">Lenguajes (torres)</h3>
                        <p class="muted small">En cada nivel eliges <b>1 de 3 opciones</b>: refuerzas la rama <b>A</b>, la rama <b>B</b> o una mejora <b>híbrida (AB)</b> que combina las dos. Puedes mezclarlas como quieras.</p>
                        <div class="td-langs">${langs}</div>
                        <h3 class="subhead">Amenazas</h3>
                        <div class="td-threats">${threats}</div>
                    </div></div>
                </div>`;
            const pv = this.root.querySelector('canvas[data-prev]');
            pv.getContext('2d').drawImage(background(), 0, 0, pv.width, pv.height);
            this.root.onclick = (e) => {
                const b = e.target.closest('[data-act]');
                if (!b) return;
                const act = b.dataset.act;
                if (act === 'play') this.askNew();
                else if (act === 'resume') this.startGame(this.saved());
                else if (act === 'discard') this.discard();
                else if (act === 'help') this.help();
                Nexus.audio.play('click');
            };
        }

        async askNew() {
            if (this.saved()) {
                const ok = await Nexus.ui.modal.confirm({
                    title: '¿Empezar una partida nueva?', icon: '🖥️', confirmLabel: 'Empezar',
                    message: 'Tienes una partida guardada. Si empiezas una nueva se perderá.'
                });
                if (!ok || this.destroyed) return;
            }
            this.writeSave(null);
            this.startGame(null);
        }

        async discard() {
            const ok = await Nexus.ui.modal.confirm({ title: '¿Descartar la partida guardada?', danger: true, confirmLabel: 'Descartar', message: 'No se podrá recuperar.' });
            if (!ok || this.destroyed) return;
            this.writeSave(null); this.showMenu();
        }

        help() {
            Nexus.ui.modal.open({
                icon: '🖥️', title: 'Cómo se juega',
                body: `<div class="td-help">
                    <p>Los <b>Virus y Malware</b> entran por INTERNET y recorren el bus de datos: <b>no dejes que lleguen al CORE</b> o perderás integridad. No hay final: ¡las rondas son infinitas hasta que caigas!</p>
                    <ul>
                        <li>Elige un lenguaje en la tienda y haz clic en la placa para desplegarlo.</li>
                        <li>Pulsa <b>Ronda</b> (o <kbd>Espacio</kbd>) para lanzar la oleada. Atajos: <kbd>1</kbd>–<kbd>4</kbd> torres, <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> mejoras, <kbd>F</kbd> velocidad, <kbd>P</kbd> pausa, <kbd>Esc</kbd> cancelar.</li>
                        <li>Cada amenaza eliminada da créditos 🪙 y al acabar la ronda recibes un bonus.</li>
                        <li>Las amenazas grandes <b>se descomponen</b> en otras más pequeñas al romperse.</li>
                        <li><b>Mejoras:</b> cada torre tiene 4 niveles y, en cada uno, eliges <b>1 de 3 opciones</b>: rama <b>A</b>, rama <b>B</b> o <b>híbrida AB</b>. Se pueden combinar libremente.</li>
                        <li>Inmunidades: 💀 Rootkit esquiva el recolector de Java, 🔒 Ransomware cifra el bloqueo de Rust y 🐴 Troyano resiste los scripts de Python (hasta Cython). <b>C++</b> no tiene ningún problema con ellos.</li>
                        <li>Cada 10 rondas (desde la 20) llega un ☠️ <b>Zero-Day</b>. Pasada la ronda 40 todo se vuelve más resistente y rápido, sin límite.</li>
                        <li>La partida se guarda al terminar cada ronda.</li>
                    </ul></div>`,
                actions: [{ label: '¡Entendido!', kind: 'primary' }]
            });
        }

        // ── Partida ─────────────────────────────────────────
        startGame(snap) {
            this.stopLoop();
            this.engine = snap ? TD.Engine.restore(snap) : new TD.Engine();
            this.engine.checkpoint = snap || null;
            this.speedIdx = 0; this.paused = false; this.auto = !!(snap && snap.auto);
            this.engine.autoStart = this.auto;
            this.placing = null; this.selId = null; this.mouse = null;
            this.elapsed = snap && snap.elapsed ? snap.elapsed : 0;
            this.best = bestOf(Nexus.services.progress.stats('towerdefense').extra);
            this.ended = false; this.hurt = 0; this.sig = ''; this.lastSnd = {};
            this.build();
            this.bind();
            this.resize();
            this.last = performance.now();
            this.loop = this.loop.bind(this);
            this.raf = requestAnimationFrame(this.loop);
            if (snap) this.toast(`Partida recuperada · ronda ${snap.round}`);
            else this.toast('¡Despliega tus primeros lenguajes y pulsa Ronda!');
        }

        build() {
            const e = this.engine;
            this.root.innerHTML = `
                <div class="game towerdefense">
                    <header class="game-header">
                        <a class="btn-back" href="#/library"><span class="back-arrow">←</span><span>Biblioteca</span></a>
                        <div class="game-title"><span>🖥️</span> Kernel Defense <small class="muted">${esc(TD.MAP.name)} · Infinito</small></div>
                        <div class="game-header-stats">
                            <div class="pill" title="Integridad del CORE"><span aria-hidden="true">🛡️</span><span class="pill-value" data-el="lives">0</span></div>
                            <div class="pill" title="Créditos"><span aria-hidden="true">🪙</span><span class="pill-value" data-el="cash">0</span></div>
                            <div class="pill" title="Ronda (récord)"><span aria-hidden="true">🔄</span><span class="pill-value" data-el="round">0</span></div>
                        </div>
                    </header>
                    <div class="td-body">
                        <div class="td-stage" data-el="stage">
                            <canvas data-el="cv" aria-label="Placa base del juego"></canvas>
                            <div class="td-toast" data-el="toast" role="status" aria-live="polite"></div>
                            <div class="td-paused" data-el="paused" hidden>⏸ Pausa</div>
                        </div>
                        <aside class="td-side">
                            <div class="td-controls">
                                <button class="btn btn-primary td-go" data-act="go"></button>
                                <button class="icon-btn" data-act="speed" title="Velocidad (F)" aria-label="Velocidad"></button>
                                <button class="icon-btn" data-act="pause" title="Pausa (P)" aria-label="Pausa">❚❚</button>
                                <button class="icon-btn" data-act="auto" title="Siguiente ronda automática" aria-label="Automático">🔁</button>
                                <button class="icon-btn" data-act="help" title="Ayuda" aria-label="Ayuda">?</button>
                                <button class="icon-btn" data-act="menu" title="Salir al menú" aria-label="Salir al menú">🏠</button>
                            </div>
                            <div class="td-next" data-el="next"></div>
                            <div class="td-shop" data-el="shop">${TD.TOWER_ORDER.map((id, i) => {
                                const t = TD.TOWERS[id];
                                return `<button type="button" class="td-shop-btn" style="--lang:${t.color}" data-act="shop" data-type="${id}" title="${esc(t.name)} — ${esc(t.desc)} (${i + 1})">
                                    <span class="td-shop-emoji">${esc(t.emoji)}</span><span class="td-shop-name">${esc(t.name)}</span>
                                    <span class="td-shop-cost">🪙 ${e.towerCost(id)}</span></button>`;
                            }).join('')}</div>
                            <div class="td-sel" data-el="sel"></div>
                        </aside>
                    </div>
                </div>`;
            this.el = (n) => this.root.querySelector(`[data-el="${n}"]`);
            this.cv = this.el('cv'); this.ctx = this.cv.getContext('2d');
            this.bg = background();
        }

        bind() {
            this.root.onclick = (ev) => {
                const b = ev.target.closest('[data-act]');
                if (!b) return;
                b.blur();
                this.act(b.dataset.act, b);
            };
            const pos = (ev) => {
                const r = this.cv.getBoundingClientRect();
                return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
            };
            this.cv.addEventListener('pointermove', (ev) => { this.mouse = pos(ev); });
            this.cv.addEventListener('pointerleave', () => { this.mouse = null; });
            this.cv.addEventListener('pointerdown', (ev) => {
                if (ev.button === 2) return;
                const p = this.mouse = pos(ev);
                const e = this.engine;
                if (e.over) return;
                if (this.placing) {
                    const chk = e.canPlace(this.placing, p.x, p.y);
                    if (!chk.ok) { this.toast(REASONS[chk.reason] || 'No se puede construir aquí'); Nexus.audio.play('error'); return; }
                    const t = e.place(this.placing, p.x, p.y);
                    Nexus.audio.play('tdPlace');
                    this.selId = t.id;
                    if (!ev.shiftKey || e.cash < e.towerCost(this.placing)) this.placing = null;
                    this.afterChange();
                    return;
                }
                let hit = null, best = TD.TOWER_R + 6;
                for (const t of e.towers) { const dd = Math.hypot(t.x - p.x, t.y - p.y); if (dd <= best) { best = dd; hit = t; } }
                this.selId = hit ? hit.id : null;
                this.sig = '';
            });
            this.cv.addEventListener('contextmenu', (ev) => { ev.preventDefault(); this.placing = null; this.selId = null; this.sig = ''; });
            this.ro = new ResizeObserver(() => this.resize());
            this.ro.observe(this.el('stage'));
        }

        // ── Acciones de la interfaz ─────────────────────────
        act(a, b) {
            const e = this.engine;
            if (!e || this.ended) return;
            if (a === 'go') { if (!e.roundActive && !e.over) { e.startRound(); this.placing = null; } }
            else if (a === 'speed') this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
            else if (a === 'pause') this.setPause(!this.paused);
            else if (a === 'auto') { this.auto = !this.auto; e.autoStart = this.auto; if (this.auto && !e.roundActive) e.startRound(); }
            else if (a === 'help') { this.setPause(true); this.help(); }
            else if (a === 'menu') this.leave();
            else if (a === 'shop') this.pickTower(b.dataset.type);
            else if (a === 'up') {
                const t = this.sel();
                if (t && e.upgrade(t, +b.dataset.o)) { Nexus.audio.play('tdUpgrade'); this.afterChange(); }
                else Nexus.audio.play('error');
            } else if (a === 'sell') {
                const t = this.sel();
                if (t) { e.sell(t); this.selId = null; Nexus.audio.play('tdSell'); this.afterChange(); }
            } else if (a === 'strat') { const t = this.sel(); if (t) { t.strategy = b.dataset.id; this.sig = ''; } }
            this.sig = '';
        }

        pickTower(type) {
            const e = this.engine;
            if (this.placing === type) { this.placing = null; return; }
            if (e.cash < e.towerCost(type)) { this.toast(REASONS.cash); Nexus.audio.play('error'); return; }
            this.placing = type; this.selId = null;
        }

        sel() { return this.engine.towers.find(t => t.id === this.selId) || null; }
        setPause(v) { this.paused = v; this.el('paused').hidden = !v; this.sig = ''; }

        afterChange() {
            this.sig = '';
            if (!this.engine.roundActive) this.persist();
        }

        persist() {
            const e = this.engine;
            if (!e || e.over) return;
            const snap = e.roundActive ? e.checkpoint : e.snapshot();
            if (!snap) return;
            snap.auto = this.auto; snap.elapsed = Math.round(this.elapsed);
            this.writeSave(snap);
        }

        async leave() {
            const e = this.engine;
            if (!e.over) {
                const ok = await Nexus.ui.modal.confirm({
                    title: '¿Salir al menú?', icon: '🏠', confirmLabel: 'Salir',
                    message: e.roundActive ? 'La ronda en curso se perderá; volverás a la última ronda completada.' : 'Tu partida queda guardada para continuarla después.'
                });
                if (!ok || this.destroyed) return;
                if (!e.roundActive) this.persist();
            }
            this.showMenu();
        }

        key(ev) {
            if (this.destroyed || !this.engine || this.ended) return;
            if (document.querySelector('.modal-overlay')) return;
            const tag = (ev.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
            const k = ev.key.toLowerCase();
            const e = this.engine;
            if (k === ' ') { ev.preventDefault(); if (!e.roundActive) this.act('go'); }
            else if (k === 'f') this.act('speed');
            else if (k === 'p') this.act('pause');
            else if (k === 'escape') { this.placing = null; this.selId = null; this.sig = ''; }
            else if (k === 'delete' || k === 'backspace') { if (this.sel()) { ev.preventDefault(); this.act('sell'); } }
            else if (k >= '1' && k <= '4') this.pickTower(TD.TOWER_ORDER[+k - 1]);
            else if (KEYS.includes(k)) { if (this.sel()) this.act('up', { dataset: { o: KEYS.indexOf(k) } }); }
        }

        toast(msg) {
            const el = this.el('toast');
            if (!el) return;
            el.textContent = msg; el.classList.add('show');
            clearTimeout(this.toastT);
            this.toastT = setTimeout(() => el.classList.remove('show'), 2200);
        }

        // ── Bucle ───────────────────────────────────────────
        loop(ts) {
            if (this.destroyed) return;
            this.raf = requestAnimationFrame(this.loop);
            const dt = Math.min(0.1, Math.max(0, (ts - this.last) / 1000));
            this.last = ts;
            const e = this.engine;
            if (!this.paused && !e.over) {
                e.update(dt * SPEEDS[this.speedIdx]);
                if (e.roundActive) this.elapsed += dt;
            }
            this.drain();
            this.render();
            this.syncUI();
            if (e.over && !this.ended) this.finish();
        }

        snd(name, gap) {
            const now = performance.now();
            if (now - (this.lastSnd[name] || 0) < gap) return;
            this.lastSnd[name] = now; Nexus.audio.play(name);
        }

        drain() {
            const e = this.engine;
            if (!e.events.length) return;
            for (const ev of e.events) {
                if (ev.t === 'pop') this.snd('tdPop', ev.boss ? 0 : 55);
                else if (ev.t === 'boom') this.snd('tdBoom', 110);
                else if (ev.t === 'shoot') { if (ev.k === 'sniper') this.snd('tdSniper', 120); }
                else if (ev.t === 'leak') { this.hurt = 0.35; this.snd('tdLeak', 200); }
                else if (ev.t === 'round') {
                    Nexus.audio.play('tdRound');
                    this.toast(TD.isBossRound(ev.round) ? `☠️ Ronda ${ev.round}: ¡Zero-Day detectado!` : `Ronda ${ev.round}`);
                } else if (ev.t === 'roundEnd') {
                    Nexus.audio.play('tdRoundEnd');
                    this.toast(`Ronda ${ev.round} superada · +🪙 ${ev.bonus}`);
                    if (e.checkpoint) { e.checkpoint.auto = this.auto; e.checkpoint.elapsed = Math.round(this.elapsed); if (!e.over) this.writeSave(e.checkpoint); }
                }
            }
            e.events.length = 0;
        }

        // ── Interfaz lateral ────────────────────────────────
        syncUI() {
            const e = this.engine, t = this.sel();
            const sig = [e.cash, e.lives, e.round, e.roundActive, this.placing, this.selId, t ? t.picks.join('') + t.strategy + t.pops : '', this.speedIdx, this.paused, this.auto, e.towers.length].join('|');
            if (sig === this.sig) return;
            this.sig = sig;
            this.el('lives').textContent = formatNumber(e.lives);
            this.el('cash').textContent = formatNumber(e.cash);
            this.el('round').textContent = `${e.round}${this.best ? ' / ' + this.best : ''}`;
            const go = this.root.querySelector('[data-act="go"]');
            go.disabled = e.roundActive || e.over;
            go.textContent = e.roundActive ? `Ronda ${e.round} en curso…` : `▶ Ronda ${e.round + 1}`;
            this.root.querySelector('[data-act="speed"]').textContent = `${SPEEDS[this.speedIdx]}×`;
            this.root.querySelector('[data-act="pause"]').textContent = this.paused ? '▶' : '❚❚';
            this.root.querySelector('[data-act="auto"]').classList.toggle('on', this.auto);
            this.root.querySelectorAll('.td-shop-btn').forEach((b) => {
                b.classList.toggle('poor', e.cash < e.towerCost(b.dataset.type));
                b.classList.toggle('on', this.placing === b.dataset.type);
            });
            this.renderNext();
            this.renderSel();
        }

        renderNext() {
            const e = this.engine;
            const r = e.roundActive ? e.round : e.round + 1;
            const g = TD.buildWave(r);
            const m = TD.waveMods(r);
            const chips = g.map(x => { const en = TD.ENEMIES[x.type]; return `<span class="td-chip" title="${esc(en.name)} (${esc(en.family)})"><i class="td-dot${en.boss ? ' boss' : ''}" style="background:${en.color}"></i>×${x.count}</span>`; }).join('');
            const scale = m.hpMul > 1 ? `<span class="td-chip td-chip-warn" title="Pasada la ronda 40 las amenazas ganan vida y velocidad sin límite">⚠ vida ×${(Math.round(m.hpMul * 10) / 10)} · vel ×${(Math.round(m.speedMul * 100) / 100)}</span>` : '';
            this.el('next').innerHTML = `<span class="td-next-title">${e.roundActive ? 'Ronda actual' : 'Próxima ronda'}:</span>${chips}${scale}`;
        }

        statLine(t) {
            const s = t.stats, f = (n) => Math.round(n * 10) / 10;
            const def = TD.TOWERS[t.type];
            if (def.kind === 'pulse') return `Alcance ${s.range} · ${s.slowFactor === 0 ? 'inmoviliza' : `ralentiza ${Math.round((1 - s.slowFactor) * 100)} %`} · ${f(s.slowTime)} s${s.damage ? ` · daño ${s.damage}` : ''} · pulso cada ${f(s.cd)} s`;
            if (def.kind === 'sniper') return `Daño ${s.damage} · ${f(1 / s.cd)} disp./s · alcance ${s.range}`;
            return `Daño ${s.damage} · perfora ${s.pierce}${s.splash ? ` · área ${s.splash}` : ''} · alcance ${s.range} · ${f(1 / s.cd * (s.shots || 1))} disp./s`;
        }

        renderSel() {
            const box = this.el('sel'), e = this.engine;
            if (this.placing) {
                const d = TD.TOWERS[this.placing];
                box.innerHTML = `<div class="td-hint"><strong>${esc(d.emoji)} ${esc(d.name)}</strong> — ${esc(d.desc)}<br><span class="muted small">Haz clic en la placa para desplegarla (Mayús para varias). Esc o clic derecho cancela.</span></div>`;
                return;
            }
            const t = this.sel();
            if (!t) {
                box.innerHTML = `<div class="td-hint muted">Selecciona una torre de la placa para mejorarla o elige un lenguaje de la tienda.<br><span class="small">Tiempo de juego: ${formatTime(this.elapsed)}</span></div>`;
                return;
            }
            const d = TD.TOWERS[t.type];
            const lvl = t.picks.length;
            const pips = Array.from({ length: TD.MAX_LEVEL }, (_, i) => i < lvl ? `<span style="color:${TD.OPTION_COLORS[t.picks[i]]}">●</span>` : '○').join('');
            const hist = t.picks.map((p, i) => `<span class="td-hist" style="--c:${TD.OPTION_COLORS[p]}" title="${esc(d.levels[i][p].desc)}">${i + 1}· ${esc(d.levels[i][p].name)}</span>`).join('');
            let options;
            if (lvl >= TD.MAX_LEVEL) options = '<div class="td-up-done">✔ Torre al máximo nivel</div>';
            else {
                options = `<div class="td-path-head"><span>Mejora al nivel ${lvl + 1} · elige 1 de 3</span></div><div class="td-opts">` +
                    [0, 1, 2].map((o) => {
                        const up = d.levels[lvl][o], info = e.upgradeInfo(t, o);
                        const tag = o === 2 ? 'Híbrida' : d.branches[o].name;
                        return `<button type="button" class="td-up${info.ok ? '' : ' no'}" style="--c:${TD.OPTION_COLORS[o]}" data-act="up" data-o="${o}">
                            <span class="td-up-tag" style="--c:${TD.OPTION_COLORS[o]}">${TD.OPTION_LABELS[o]}</span>
                            <span class="td-up-name">${esc(up.name)} <small class="muted">· ${esc(tag)} <kbd>${KEYS[o].toUpperCase()}</kbd></small></span>
                            <span class="td-up-cost">🪙 ${formatNumber(TD.cost(up.cost))}</span>
                            <span class="td-up-desc">${esc(up.desc)}</span></button>`;
                    }).join('') + '</div>';
            }
            const strat = d.kind !== 'pulse' ? `
                <div class="td-strat">${TD.STRATEGIES.map(s => `<button type="button" class="${t.strategy === s.id ? 'on' : ''}" data-act="strat" data-id="${s.id}">${s.label}</button>`).join('')}</div>` : '';
            box.innerHTML = `
                <div class="td-sel-head"><span class="td-sel-emoji">${esc(d.emoji)}</span>
                    <div><strong>${esc(d.name)}</strong> <span class="td-pips">${pips}</span>
                    <div class="muted small">${esc(TD.buildTitle(t.type, t.picks))} · amenazas eliminadas: ${formatNumber(t.pops)}</div></div></div>
                <div class="td-stats small">${this.statLine(t)}</div>
                ${hist ? `<div class="td-hists">${hist}</div>` : ''}
                ${strat}
                ${options}
                <button type="button" class="btn btn-ghost btn-sm td-sell" data-act="sell">💸 Vender (+🪙 ${formatNumber(e.sellValue(t))})</button>`;
        }

        // ── Dibujo ──────────────────────────────────────────
        resize() {
            if (!this.cv || this.destroyed) return;
            const stage = this.el('stage');
            const w = stage.clientWidth;
            if (!w) return;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const cw = Math.round(w * dpr), ch = Math.round(w * H / W * dpr);
            if (this.cv.width !== cw || this.cv.height !== ch) { this.cv.width = cw; this.cv.height = ch; }
            this.scale = cw / W;
        }

        render() {
            const c = this.ctx, e = this.engine;
            if (!this.scale) return;
            c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
            c.drawImage(this.bg, 0, 0, W, H);

            // flujo de datos animado sobre el bus
            c.save();
            c.beginPath(); TD.MAP.path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
            c.setLineDash([5, 23]); c.lineDashOffset = -((e.time * 48) % 28);
            c.lineWidth = 2; c.strokeStyle = 'rgba(25,211,218,.45)'; c.lineJoin = 'round'; c.stroke();
            c.restore();

            // rango (torre seleccionada o fantasma)
            const sel = this.sel();
            if (sel) this.ring(sel.x, sel.y, sel.stats.range, 'rgba(255,255,255,.9)');

            for (const t of e.towers) this.drawTower(t, t === sel);
            for (const b of e.enemies) this.drawEnemy(b);
            for (const p of e.projs) this.drawProj(p);
            for (const f of e.fx) this.drawFx(f);

            if (this.placing && this.mouse && !this.paused) {
                const m = this.mouse, d = TD.TOWERS[this.placing];
                const ok = e.canPlace(this.placing, m.x, m.y).ok;
                this.ring(m.x, m.y, d.base.range, ok ? 'rgba(255,255,255,.9)' : 'rgba(255,90,90,.9)');
                c.globalAlpha = .75; this.drawTowerBody({ type: this.placing, x: m.x, y: m.y, angle: -Math.PI / 2, picks: [], flash: 0 }, ok ? null : 'rgba(255,60,60,.55)'); c.globalAlpha = 1;
            }
            if (this.hurt > 0) {
                c.fillStyle = `rgba(255,40,60,${Math.min(.28, this.hurt)})`; c.fillRect(0, 0, W, H);
                this.hurt -= 1 / 60;
            }
        }

        ring(x, y, r, col) {
            if (r > 2000) return;
            const c = this.ctx;
            c.beginPath(); c.arc(x, y, r, 0, 7);
            c.fillStyle = 'rgba(255,255,255,.10)'; c.fill();
            c.lineWidth = 1.5; c.strokeStyle = col; c.globalAlpha = .55; c.stroke(); c.globalAlpha = 1;
        }

        drawTower(t, selected) {
            this.drawTowerBody(t);
            const c = this.ctx;
            if (selected) { c.beginPath(); c.arc(t.x, t.y, TD.TOWER_R + 5, 0, 7); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); }
        }

        /** Torre = chip con el lenguaje en el centro y los pines de cada nivel debajo. */
        drawTowerBody(t, tint) {
            const c = this.ctx, d = TD.TOWERS[t.type], R = TD.TOWER_R * (1 + (t.flash > 0 ? .08 : 0));
            c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(t.x, t.y + R * .75, R, R * .45, 0, 0, 7); c.fill();
            if (d.kind === 'projectile' || d.kind === 'sniper') {
                c.save(); c.translate(t.x, t.y); c.rotate(t.angle);
                const thick = t.type === 'java' ? 9 : 5, len = d.kind === 'sniper' ? R + 12 : R + 6;
                c.fillStyle = '#10161d'; c.fillRect(2, -thick / 2, len, thick);
                c.fillStyle = d.color2; c.fillRect(len - 1, -thick / 2 - 1, 5, thick + 2);
                c.restore();
            }
            // pines
            c.fillStyle = '#9aa8b8';
            for (let k = -1; k <= 1; k++) {
                c.fillRect(t.x - R - 3, t.y + k * 7 - 1.5, 4, 3); c.fillRect(t.x + R - 1, t.y + k * 7 - 1.5, 4, 3);
                c.fillRect(t.x + k * 7 - 1.5, t.y - R - 3, 3, 4); c.fillRect(t.x + k * 7 - 1.5, t.y + R - 1, 3, 4);
            }
            const g = c.createLinearGradient(t.x - R, t.y - R, t.x + R, t.y + R);
            g.addColorStop(0, lighten(d.color, .35)); g.addColorStop(1, d.color);
            roundRect(c, t.x - R, t.y - R, R * 2, R * 2, 6); c.fillStyle = g; c.fill();
            c.lineWidth = 2; c.strokeStyle = d.color2; c.stroke();
            if (tint) { roundRect(c, t.x - R, t.y - R, R * 2, R * 2, 6); c.fillStyle = tint; c.fill(); }
            c.font = `bold 13px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
            c.fillText(d.short, t.x, t.y + 1);
            // pips de nivel, coloreados según la opción elegida (A, B o híbrida)
            const n = t.picks.length;
            for (let i = 0; i < n; i++) {
                c.beginPath(); c.arc(t.x - (n - 1) * 3.5 + i * 7, t.y + R + 8, 2.6, 0, 7);
                c.fillStyle = TD.OPTION_COLORS[t.picks[i]]; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
            }
        }

        /** Virus: bola con púas giratorias · Malware: hexágono. Ambos con su icono. */
        drawEnemy(b) {
            const c = this.ctx, d = TD.ENEMIES[b.type], r = d.r;
            if (d.boss) return this.drawBoss(b);
            const spin = this.engine.time * 1.4 + b.id;
            c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(b.x + 2, b.y + r * .9, r * .8, r * .35, 0, 0, 7); c.fill();
            if (d.family === 'Virus') {
                c.strokeStyle = d.color; c.lineWidth = 2;
                c.beginPath();
                for (let i = 0; i < 8; i++) {
                    const a = spin + i * Math.PI / 4;
                    c.moveTo(b.x + Math.cos(a) * r * .85, b.y + Math.sin(a) * r * .85);
                    c.lineTo(b.x + Math.cos(a) * r * 1.3, b.y + Math.sin(a) * r * 1.3);
                }
                c.stroke();
                const g = c.createRadialGradient(b.x - r * .3, b.y - r * .3, 1, b.x, b.y, r);
                g.addColorStop(0, lighten(d.color, .25)); g.addColorStop(1, '#0d141c');
                c.beginPath(); c.arc(b.x, b.y, r * .9, 0, 7); c.fillStyle = g; c.fill();
                c.lineWidth = 2; c.strokeStyle = d.color; c.stroke();
            } else {
                c.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = Math.PI / 6 + i * Math.PI / 3;
                    const px = b.x + Math.cos(a) * r * 1.08, py = b.y + Math.sin(a) * r * 1.08;
                    i ? c.lineTo(px, py) : c.moveTo(px, py);
                }
                c.closePath(); c.fillStyle = '#0d141c'; c.fill();
                c.lineWidth = 2.5; c.strokeStyle = d.color; c.stroke();
                c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke();
            }
            c.font = `${Math.round(r * 1.05)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
            c.fillText(d.glyph, b.x, b.y + 1);
            if (b.max > 1) {
                const w = 24, f = Math.max(0, b.hp / b.max);
                c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(b.x - w / 2, b.y - r - 8, w, 4);
                c.fillStyle = f > .5 ? '#51cf66' : f > .25 ? '#ffd43b' : '#ff6b6b'; c.fillRect(b.x - w / 2 + .5, b.y - r - 7.5, (w - 1) * f, 3);
            }
            if (b.slowT > 0) { c.beginPath(); c.arc(b.x, b.y, r + 4, 0, 7); c.strokeStyle = 'rgba(244,162,97,.9)'; c.lineWidth = 2; c.stroke(); }
        }

        drawBoss(b) {
            const c = this.ctx, d = TD.ENEMIES.zeroday, r = d.r;
            const k = this.engine.time;
            c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(b.x + 3, b.y + r * .8, r * 1.2, r * .4, 0, 0, 7); c.fill();
            // aura glitch
            c.globalAlpha = .25 + .1 * Math.sin(k * 6);
            c.fillStyle = d.color; c.beginPath(); c.arc(b.x, b.y, r * 1.35, 0, 7); c.fill(); c.globalAlpha = 1;
            c.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = Math.PI / 8 + i * Math.PI / 4;
                const px = b.x + Math.cos(a) * r * 1.1, py = b.y + Math.sin(a) * r * 1.1;
                i ? c.lineTo(px, py) : c.moveTo(px, py);
            }
            c.closePath();
            const g = c.createLinearGradient(b.x, b.y - r, b.x, b.y + r);
            g.addColorStop(0, '#3a0d1c'); g.addColorStop(1, '#12060b');
            c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = d.color; c.stroke();
            c.fillStyle = 'rgba(255,46,99,.35)'; c.fillRect(b.x - r * .9, b.y - 3 + Math.sin(k * 9) * 5, r * 1.8, 5);
            c.font = '26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(d.glyph, b.x, b.y + 1);
            c.font = `bold 9px ${MONO}`; c.fillStyle = d.color; c.fillText('ZERO-DAY', b.x, b.y - r - 16);
            const w = 58, f = Math.max(0, b.hp / b.max);
            c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(b.x - w / 2, b.y - r - 11, w, 6);
            c.fillStyle = f > .5 ? '#51cf66' : f > .25 ? '#ffd43b' : '#ff6b6b'; c.fillRect(b.x - w / 2 + 1, b.y - r - 10, (w - 2) * f, 4);
            if (b.slowT > 0) { c.beginPath(); c.arc(b.x, b.y, r * 1.2 + 3, 0, 7); c.strokeStyle = 'rgba(244,162,97,.9)'; c.lineWidth = 2; c.stroke(); }
        }

        drawProj(p) {
            const c = this.ctx;
            if (p.type === 'python') {
                c.save(); c.translate(p.x, p.y); c.rotate(p.a);
                c.fillStyle = '#3b82c4'; c.fillRect(-9, -1.5, 8, 3);
                c.fillStyle = '#ffd43b'; c.beginPath(); c.moveTo(-1, -3.5); c.lineTo(6, 0); c.lineTo(-1, 3.5); c.fill();
                c.restore();
            } else {
                c.beginPath(); c.arc(p.x, p.y, 6, 0, 7); c.fillStyle = '#3a1a08'; c.fill();
                c.lineWidth = 2; c.strokeStyle = '#ffa94d'; c.stroke();
                c.fillStyle = '#ffd8a8'; c.fillRect(p.x - 1, p.y - 9, 2, 3);
            }
        }

        drawFx(f) {
            const c = this.ctx, k = f.t / f.life;
            if (f.type === 'pop') {
                // "glitch": anillo y píxeles cuadrados dispersos
                c.globalAlpha = 1 - k; c.strokeStyle = f.color; c.lineWidth = 2;
                c.strokeRect(f.x - f.r * (.4 + k), f.y - f.r * (.4 + k), f.r * (.8 + 2 * k), f.r * (.8 + 2 * k));
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3 + k, rr = f.r * (.4 + k * 1.6);
                    c.fillStyle = f.color; c.fillRect(f.x + Math.cos(a) * rr - 2, f.y + Math.sin(a) * rr - 2, 4, 4);
                }
                c.globalAlpha = 1;
            } else if (f.type === 'boom') {
                c.globalAlpha = (1 - k) * .8;
                const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (.5 + k * .6));
                g.addColorStop(0, '#fff6c8'); g.addColorStop(.5, f.color); g.addColorStop(1, 'rgba(255,80,0,0)');
                c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, f.r * (.5 + k * .6), 0, 7); c.fill(); c.globalAlpha = 1;
            } else if (f.type === 'pulse') {
                c.globalAlpha = (1 - k) * .7; c.strokeStyle = f.color; c.lineWidth = 3;
                c.beginPath(); c.arc(f.x, f.y, f.r * k, 0, 7); c.stroke(); c.globalAlpha = 1;
            } else if (f.type === 'beam') {
                c.globalAlpha = 1 - k; c.strokeStyle = f.color; c.lineWidth = 2.5;
                c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2, f.y2); c.stroke(); c.globalAlpha = 1;
            } else if (f.type === 'cash') {
                c.globalAlpha = 1 - k; c.fillStyle = '#69f0ae'; c.font = `bold 12px ${MONO}`; c.textAlign = 'center';
                c.fillText(f.text, f.x, f.y - k * 22); c.globalAlpha = 1;
            }
        }

        // ── Fin de partida ──────────────────────────────────
        finish() {
            this.ended = true;
            const e = this.engine;
            const lives = e.lives, round = e.round;
            const maxPicks = (t, v) => t.picks.filter(p => p === v).length;
            const extra = {
                round, livesLost: e.stats.livesLost, pops: e.stats.pops, bossKills: e.stats.bossKills,
                tier4: e.towers.filter(t => t.picks.length >= TD.MAX_LEVEL).length,
                hybridMax: Math.max(0, ...e.towers.map(t => maxPicks(t, 2))),
                languages: new Set(e.towers.map(t => t.type)).size, towers: e.towers.length
            };
            const score = round * 100 + Math.round(e.stats.pops / 5);
            const xp = Math.max(5, Math.round(round * 4 + e.stats.bossKills * 10));
            this.writeSave(null);
            const result = Nexus.services.progress.recordGame({
                game: 'towerdefense', mode: 'endless', won: false, endless: true, score, time: Math.round(this.elapsed), xp, extra,
                updateExtra: (x) => {
                    x.bestRound = Math.max(bestOf(x), round);
                    x.totalPops = (x.totalPops || 0) + e.stats.pops;
                    x.bossKills = (x.bossKills || 0) + e.stats.bossKills;
                }
            });
            const record = round > this.best;
            if (record) { Nexus.audio.play('win'); Nexus.ui.fx.confetti({ count: 120 }); } else Nexus.audio.play('lose');
            this.later(() => {
                if (this.destroyed) return;
                Nexus.ui.modal.resultModal({
                    emoji: record ? '🏁' : '💥', kind: record ? 'win' : 'lose',
                    title: 'Sistema comprometido',
                    subtitle: `${record ? '¡Nuevo récord! ' : ''}Has aguantado hasta la ronda ${round}.`,
                    stats: [
                        { label: 'Puntuación', value: formatNumber(score) },
                        { label: 'Ronda alcanzada', value: String(round) },
                        { label: 'Amenazas eliminadas', value: formatNumber(e.stats.pops) },
                        { label: 'Zero-Days', value: String(e.stats.bossKills) },
                        { label: 'Torres', value: String(e.towers.length) },
                        { label: 'Tiempo', value: formatTime(this.elapsed) }
                    ],
                    result,
                    actions: [
                        { label: '🔄 Jugar de nuevo', kind: 'primary', onClick: () => this.later(() => this.startGame(null), 50) },
                        { label: 'Menú', kind: 'ghost', onClick: () => this.later(() => this.showMenu(), 50) }
                    ]
                });
            }, 600);
        }

        destroy() {
            this.destroyed = true;
            this.stopLoop();
            document.removeEventListener('keydown', this.onKey);
            if (this.unsubLayout) this.unsubLayout();
            this.timers.forEach(clearTimeout); this.timers.clear();
            clearTimeout(this.toastT);
            // la ronda en curso no se guarda: se vuelve al último punto de control
            try { if (this.engine && !this.engine.over && !this.ended && !this.engine.roundActive) this.persist(); } catch (err) { /* noop */ }
        }
    }

    // ── Estadísticas extra ──────────────────────────────────
    function statsExtra(gs) {
        const ex = gs.extra || {};
        const best = bestOf(ex);
        return `
            <h3 class="subhead">Mejor ronda</h3>
            <div class="dist"><div class="dist-row"><span class="dist-n" style="width:auto;min-width:70px">🔄 Infinito</span>
                <div class="dist-bar"><div class="dist-fill" style="width:${Math.max(best ? 8 : 0, Math.min(100, best))}%">${best}</div></div></div></div>
            <p class="muted small">Amenazas eliminadas: <b>${formatNumber(ex.totalPops || 0)}</b> · Zero-Days destruidos: <b>${ex.bossKills || 0}</b></p>`;
    }

    // ── Logros ──────────────────────────────────────────────
    const A = Nexus.services.achievements;
    const tdx = (c) => c.stats('towerdefense').extra || {};
    const ev = (c, fn) => !!c.event && c.event.game === 'towerdefense' && (!fn || fn(c.event));
    const reach = (n) => ({
        progress: (c) => ({ value: Math.min(n, bestOf(tdx(c))), target: n }),
        test: (c) => bestOf(tdx(c)) >= n
    });
    A.register([
        { id: 'td_r5', game: 'towerdefense', name: 'Hello, World!', desc: 'Llega a la ronda 5 en Kernel Defense.', icon: '👋', rarity: 'common', ...reach(5) },
        { id: 'td_r20', game: 'towerdefense', name: 'Compilación exitosa', desc: 'Llega a la ronda 20.', icon: '🌊', rarity: 'common', ...reach(20) },
        { id: 'td_r35', game: 'towerdefense', name: 'Deploy en producción', desc: 'Llega a la ronda 35.', icon: '🚀', rarity: 'rare', ...reach(35) },
        { id: 'td_r50', game: 'towerdefense', name: 'Uptime 99,99 %', desc: 'Llega a la ronda 50.', icon: '📡', rarity: 'epic', ...reach(50) },
        { id: 'td_r75', game: 'towerdefense', name: 'Sin downtime', desc: 'Llega a la ronda 75.', icon: '♾️', rarity: 'legendary', ...reach(75) },
        { id: 'td_boss', game: 'towerdefense', name: 'Cazador de Zero-Days', desc: 'Destruye tu primer Zero-Day.', icon: '☠️', rarity: 'rare',
            ...A.counter((c) => tdx(c).bossKills || 0, 1) },
        { id: 'td_pops_1k', game: 'towerdefense', name: 'Antivirus', desc: 'Elimina 1.000 amenazas.', icon: '🛡️', rarity: 'common',
            ...A.counter((c) => tdx(c).totalPops || 0, 1000) },
        { id: 'td_pops_20k', game: 'towerdefense', name: 'Firewall humano', desc: 'Elimina 20.000 amenazas.', icon: '🔥', rarity: 'epic',
            ...A.counter((c) => tdx(c).totalPops || 0, 20000) },
        { id: 'td_flawless', game: 'towerdefense', name: 'Cero bugs en producción', desc: 'Llega a la ronda 25 sin perder nada de integridad.', icon: '✨', rarity: 'legendary',
            test: (c) => ev(c, e => e.extra.round >= 25 && e.extra.livesLost === 0) },
        { id: 'td_tier4', game: 'towerdefense', name: 'Código optimizado', desc: 'Termina una partida con una torre al nivel 4.', icon: '⭐', rarity: 'rare',
            test: (c) => ev(c, e => e.extra.tier4 >= 1) },
        { id: 'td_arsenal', game: 'towerdefense', name: 'Full stack', desc: 'Termina una partida con 3 torres al nivel 4.', icon: '🌟', rarity: 'epic',
            test: (c) => ev(c, e => e.extra.tier4 >= 3) },
        { id: 'td_polyglot', game: 'towerdefense', name: 'Políglota', desc: 'Termina una partida con los 4 lenguajes desplegados.', icon: '🗣️', rarity: 'common',
            test: (c) => ev(c, e => e.extra.languages >= 4) },
        { id: 'td_hybrid', game: 'towerdefense', name: 'Arquitectura híbrida', desc: 'Termina con una torre que tenga 3 o más mejoras híbridas.', icon: '🧬', rarity: 'rare',
            test: (c) => ev(c, e => e.extra.hybridMax >= 3) }
    ]);

    // ── Registro ────────────────────────────────────────────
    Nexus.games.registry.register({
        id: 'towerdefense', name: 'Kernel Defense', emoji: '🖥️', accent: '#19d3da',
        tagline: 'Defiende el núcleo de infinitas amenazas',
        description: 'Tower defense con temática de programación: despliega Python, Java, C++ y Rust en una placa base, elige entre 3 mejoras por nivel (rama A, rama B o híbrida) y frena oleadas infinitas de Virus y Malware hasta que caigas.',
        tags: ['Estrategia', 'Tower Defense', 'Programación'],
        modes: [{ id: 'endless', label: 'Infinito' }],
        metrics: [{ id: 'score', label: 'Puntuación' }],
        statsExtra,
        mount: (root) => new TowerDefense(root)
    });
})();
