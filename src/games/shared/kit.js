/* ============================================================
   NEXUS ARCADE · games/shared/kit.js
   Utilidades comunes de los juegos de canvas (Tetris, Pac-Man,
   Snake): lienzo ajustado al contenedor con nitidez en pantallas
   HiDPI, bucle de animación, gestos táctiles, botones táctiles y
   pequeños generadores de HTML (cabecera, tarjetas de modo…).
   ============================================================ */
(function () {
    'use strict';

    const { esc } = Nexus.util;

    const Kit = {
        /** Cabecera estándar de juego (volver + título + píldoras de estadísticas). */
        header({ emoji, title, pills }) {
            return `
                <header class="game-header">
                    <a class="btn-back" href="#/library"><span class="back-arrow">←</span><span>Biblioteca</span></a>
                    <div class="game-title"><span>${esc(emoji)}</span> ${esc(title)}</div>
                    <div class="game-header-stats">
                        ${pills.map(p => `<div class="pill"${p.title ? ` title="${esc(p.title)}"` : ''}><span aria-hidden="true">${p.icon}</span><span class="pill-value" data-pill="${esc(p.id)}">${esc(p.init || '0')}</span></div>`).join('')}
                    </div>
                </header>`;
        },

        /** Tarjetas de selección de modo. */
        modeCards(modes, selected) {
            return `<div class="ax-modes" role="radiogroup" aria-label="Modo de juego">${modes.map(m => `
                <button type="button" class="ax-mode${m.id === selected ? ' on' : ''}" role="radio" aria-checked="${m.id === selected}" data-mode="${esc(m.id)}">
                    <span class="ax-mode-emoji">${esc(m.emoji || '🎮')}</span>
                    <span class="ax-mode-text"><strong>${esc(m.label)}</strong><small>${esc(m.desc || '')}</small></span>
                </button>`).join('')}</div>`;
        },

        /**
         * Lienzo con resolución lógica fija (lw × lh) que se escala al contenedor.
         * Devuelve { ctx, resize(), destroy() }. Dibuja siempre en unidades lógicas.
         */
        canvas(canvas, wrap, stage, lw, lh, onResize) {
            const ctx = canvas.getContext('2d');
            const api = {
                ctx, lw, lh, scale: 1,
                resize() {
                    const availW = Math.max(120, wrap.clientWidth - 8), availH = Math.max(120, wrap.clientHeight - 8);
                    const k = Math.min(availW / lw, availH / lh);
                    const cw = Math.floor(lw * k), ch = Math.floor(lh * k);
                    stage.style.width = cw + 'px';
                    stage.style.height = ch + 'px';
                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    canvas.width = Math.floor(cw * dpr);
                    canvas.height = Math.floor(ch * dpr);
                    api.scale = (cw * dpr) / lw;
                    ctx.setTransform(api.scale, 0, 0, api.scale, 0, 0);
                    ctx.imageSmoothingEnabled = true;
                    if (onResize) onResize(api);
                },
                destroy() {
                    if (ro) ro.disconnect();
                    window.removeEventListener('resize', debounced);
                    if (unsub) unsub();
                }
            };
            const debounced = Nexus.util.debounce(() => api.resize(), 40);
            let ro = null;
            if (window.ResizeObserver) { ro = new ResizeObserver(debounced); ro.observe(wrap); }
            window.addEventListener('resize', debounced);
            const unsub = Nexus.bus.on('layout:change', debounced);
            api.resize();
            return api;
        },

        /** Bucle de animación con paso máximo; se detiene solo si la pestaña se oculta (llama a onHide). */
        loop(update, draw, onHide) {
            let raf = 0, last = 0, running = false;
            const frame = (t) => {
                if (!running) return;
                const dt = Math.min(0.05, (t - last) / 1000 || 0);
                last = t;
                update(dt);
                draw(dt);
                raf = requestAnimationFrame(frame);
            };
            const vis = () => { if (document.hidden && onHide) onHide(); };
            document.addEventListener('visibilitychange', vis);
            return {
                start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
                stop() { running = false; cancelAnimationFrame(raf); },
                destroy() { running = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); },
                get running() { return running; }
            };
        },

        /** Gesto de deslizar → callback('up'|'down'|'left'|'right'). Un toque corto → callback('tap'). */
        swipe(el, cb, threshold = 22) {
            let sx = 0, sy = 0, active = false, fired = false;
            const start = (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; active = true; fired = false; };
            const move = (e) => {
                if (!active) return;
                const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
                fired = true;
                cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
                sx = t.clientX; sy = t.clientY;     // permite encadenar giros en un mismo gesto
                e.preventDefault();
            };
            const end = () => { if (active && !fired) cb('tap'); active = false; };
            el.addEventListener('touchstart', start, { passive: true });
            el.addEventListener('touchmove', move, { passive: false });
            el.addEventListener('touchend', end, { passive: true });
            el.addEventListener('touchcancel', () => { active = false; }, { passive: true });
        },

        /** Botones táctiles `[data-act]`: onDown(act) al pulsar y onUp(act) al soltar. */
        touchButtons(root, onDown, onUp) {
            const held = new Set();
            const down = (e) => {
                const b = e.target.closest('[data-act]');
                if (!b || !root.contains(b)) return;
                e.preventDefault();
                held.add(b.dataset.act);
                b.classList.add('down');
                if (b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } }
                onDown(b.dataset.act);
            };
            const up = (e) => {
                const b = e.target.closest('[data-act]');
                if (!b) return;
                b.classList.remove('down');
                if (held.delete(b.dataset.act) && onUp) onUp(b.dataset.act);
            };
            root.addEventListener('pointerdown', down);
            root.addEventListener('pointerup', up);
            root.addEventListener('pointercancel', up);
            root.addEventListener('contextmenu', (e) => e.preventDefault());
        },

        /** Desplaza un número hacia su objetivo (animación de contadores). */
        approach(cur, target, k) { return cur + (target - cur) * Math.min(1, k); },

        rgba(hex, a) {
            const n = parseInt(hex.slice(1), 16);
            return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
        },

        mix(hexA, hexB, t) {
            const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
            const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
            return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
        },

        roundRect(ctx, x, y, w, h, r) {
            r = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }
    };

    Nexus.games.kit = Kit;
})();
