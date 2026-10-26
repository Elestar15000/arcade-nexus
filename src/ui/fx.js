/* ============================================================
   NEXUS ARCADE · ui/fx.js
   Efectos visuales compartidos: confeti a pantalla completa.
   ============================================================ */
(function () {
    'use strict';

    function reduced() {
        return document.documentElement.dataset.motion === 'reduced' ||
            (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function confetti({ count = 140, colors } = {}) {
        if (reduced()) return;
        const cs = getComputedStyle(document.documentElement);
        const palette = colors || [
            cs.getPropertyValue('--primary').trim(), cs.getPropertyValue('--secondary').trim(),
            cs.getPropertyValue('--accent').trim(), cs.getPropertyValue('--warning').trim(), '#ffffff'
        ];
        const canvas = document.createElement('canvas');
        canvas.className = 'fx-confetti';
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const pieces = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * canvas.height * 0.4,
            w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
            vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
            rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
            color: palette[Math.floor(Math.random() * palette.length)]
        }));

        let frames = 0;
        (function tick() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = 0;
            for (const p of pieces) {
                p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
                if (p.y < canvas.height + 30) alive++;
                ctx.save();
                ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }
            frames++;
            if (alive > 0 && frames < 400) requestAnimationFrame(tick);
            else canvas.remove();
        })();
    }

    Nexus.ui.fx = { confetti, reduced };
})();
