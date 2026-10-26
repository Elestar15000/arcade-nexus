/* ============================================================
   NEXUS ARCADE · ui/particles.js
   Fondo de partículas. Mejoras respecto a la v1:
   - toma los colores del tema activo,
   - se pausa si la pestaña no está visible o está desactivado,
   - respeta "reducir animaciones".
   ============================================================ */
(function () {
    'use strict';

    class BackgroundParticles {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.particles = [];
            this.mouse = { x: -1000, y: -1000 };
            this.running = false;
            this.token = 0;
            this.colors = ['108, 92, 231', '0, 206, 201'];

            this.resize();
            window.addEventListener('resize', Nexus.util.debounce(() => { this.resize(); this.init(); }, 200));
            document.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; }, { passive: true });
            document.addEventListener('visibilitychange', () => this.sync());
            Nexus.bus.on('settings:change', () => { this.readColors(); this.sync(); });
            Nexus.bus.on('user:login', () => { this.readColors(); this.sync(); });
            this.readColors();
            this.init();
            this.sync();
        }

        readColors() {
            const cs = getComputedStyle(document.documentElement);
            const p = cs.getPropertyValue('--primary-rgb').trim();
            const s = cs.getPropertyValue('--secondary-rgb').trim();
            if (p && s) this.colors = [p, s];
        }

        shouldRun() {
            const s = Nexus.services.settings;
            return !document.hidden && !Nexus.ui.fx.reduced() && (!s || s.get('particles'));
        }

        sync() {
            const run = this.shouldRun();
            if (run && !this.running) { this.running = true; this.loop(++this.token); }
            else if (!run) {
                this.running = false;
                this.token++;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        init() {
            const count = Math.min(120, Math.floor((this.canvas.width * this.canvas.height) / 18000));
            this.particles = Array.from({ length: count }, () => ({
                x: Math.random() * this.canvas.width, y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 2 + 0.5, alpha: Math.random() * 0.3 + 0.05,
                c: Math.random() > 0.5 ? 0 : 1
            }));
        }

        loop(token) {
            if (!this.running || token !== this.token) return;
            const { ctx, canvas, particles } = this;
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            for (const p of particles) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;

                const dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 0) {
                    const force = (120 - dist) / 120 * 0.02;
                    p.vx += dx / dist * force; p.vy += dy / dist * force;
                }
                p.vx *= 0.99; p.vy *= 0.99;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.colors[p.c]}, ${p.alpha})`;
                ctx.fill();
            }

            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i], b = particles[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 10000) {
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(${this.colors[0]}, ${(1 - Math.sqrt(d2) / 100) * 0.08})`;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(() => this.loop(token));
        }
    }

    Nexus.ui.BackgroundParticles = BackgroundParticles;
})();
