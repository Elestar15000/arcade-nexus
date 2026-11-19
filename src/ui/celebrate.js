/* ============================================================
   NEXUS ARCADE · ui/celebrate.js — Celebraciones
   · Común: toast · Raro: toast con brillo y sonido
   · Épico: ventana con la insignia girando y la recompensa
   · Legendario: pantalla completa con confeti de la marca y
     botón «Compartir» (tarjeta PNG generada en un <canvas>)
   También avisa de misiones completadas, niveles del pase,
   cosméticos ganados y Maestrías.
   ============================================================ */
(function () {
    'use strict';

    const { esc } = Nexus.util;
    const A = () => Nexus.services.achievements;
    const RW = () => Nexus.services.rewards;
    const reduced = () => (Nexus.ui.fx && Nexus.ui.fx.reduced && Nexus.ui.fx.reduced());
    const BRAND = ['#FFD43B', '#F2A900', '#7b4dff', '#4B8DFF', '#FF6584', '#00C9A7', '#ffffff'];
    const RCOLOR = { common: '#94a3b8', rare: '#4B8DFF', epic: '#A879FF', legendary: '#FFD43B' };
    const diamond = (size = 16) => `<svg class="rw-diamond" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(45 50 50)"><rect x="17" y="17" width="66" height="66" rx="15" fill="#FFD43B"/><rect x="37" y="37" width="26" height="26" rx="6" fill="#141640"/></g></svg>`;

    /** Insignia de un logro (icono dentro de un rombo con el color de su rareza). */
    function badge(def, cls = '') {
        return `<span class="rw-badge rarity-${esc(def.rarity)} ${cls}" style="--rc:${RCOLOR[def.rarity]}"><span class="rw-badge-ic">${esc(def.icon)}</span></span>`;
    }
    const rewardLine = (def) => {
        const bits = [`+${def.xp} XP`, `${diamond(13)} +${def.rombos}`];
        const t = def.title && RW().item(def.title); if (t) bits.push(`Título «${esc(t.name)}»`);
        const it = def.reward && RW().item(def.reward); if (it) bits.push(esc(it.name));
        return bits.join(' · ');
    };

    // ── Confeti ─────────────────────────────────────────────
    function confetti(host, n = 160) {
        if (reduced()) return () => {};
        const cv = document.createElement('canvas');
        cv.className = 'rw-confetti';
        host.appendChild(cv);
        const ctx = cv.getContext('2d');
        const fit = () => { cv.width = host.clientWidth || innerWidth; cv.height = host.clientHeight || innerHeight; };
        fit();
        const parts = Array.from({ length: n }, () => ({
            x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.6, s: 6 + Math.random() * 8,
            vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.5, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25,
            c: BRAND[Math.floor(Math.random() * BRAND.length)], d: Math.random() < 0.45
        }));
        let alive = true, t0 = performance.now();
        const loop = (t) => {
            if (!alive) return;
            ctx.clearRect(0, 0, cv.width, cv.height);
            for (const p of parts) {
                p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.02;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
                if (p.d) { ctx.rotate(Math.PI / 4); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); }
                else ctx.fillRect(-p.s / 2, -p.s / 5, p.s, p.s / 2.5);
                ctx.restore();
            }
            if (t - t0 < 6000) requestAnimationFrame(loop); else cv.remove();
        };
        requestAnimationFrame(loop);
        return () => { alive = false; cv.remove(); };
    }

    // ── Tarjeta PNG para compartir ──────────────────────────
    async function shareCard(def) {
        const u = Nexus.services.users.current() || { name: 'Jugador' };
        const S = 1080, cv = document.createElement('canvas'); cv.width = cv.height = S;
        const ctx = cv.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#1d2072'); g.addColorStop(1, '#0b0e1f');
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        const glow = ctx.createRadialGradient(S / 2, 430, 40, S / 2, 430, 420); glow.addColorStop(0, RCOLOR[def.rarity] + '66'); glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, S, S);
        // Rombo con el icono
        ctx.save(); ctx.translate(S / 2, 430); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#141640'; ctx.strokeStyle = RCOLOR[def.rarity]; ctx.lineWidth = 14;
        const w = 300; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -w / 2, w, w, 60) : ctx.rect(-w / 2, -w / 2, w, w); ctx.fill(); ctx.stroke(); ctx.restore();
        Nexus.ui.icons.preload([def.icon], '#ffffff');
        await new Promise(r => setTimeout(r, 120));
        Nexus.ui.icons.draw(ctx, def.icon, S / 2, 430, 190, '#ffffff');
        // Textos
        ctx.textAlign = 'center'; ctx.fillStyle = RCOLOR[def.rarity];
        ctx.font = '800 38px Outfit, system-ui, sans-serif'; ctx.fillText(`LOGRO ${A().RARITY[def.rarity].label.toUpperCase()}`, S / 2, 720);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 84px Outfit, system-ui, sans-serif'; ctx.fillText(def.name, S / 2, 810);
        ctx.fillStyle = '#c7cbff'; ctx.font = '500 36px Inter, system-ui, sans-serif'; ctx.fillText(def.desc.slice(0, 60), S / 2, 870);
        ctx.fillStyle = '#FFD43B'; ctx.font = '800 40px Outfit, system-ui, sans-serif'; ctx.fillText(`${u.name} · Nexus Arcade`, S / 2, 990);
        const url = cv.toDataURL('image/png');
        const a = document.createElement('a'); a.href = url; a.download = `logro-${def.id}.png`; document.body.appendChild(a); a.click(); a.remove();
        Nexus.ui.toast('Tarjeta descargada', { type: 'success' });
    }

    // ── Celebraciones por rareza ────────────────────────────
    function toastFor(def) {
        Nexus.audio.play('achievement');
        const R = A().RARITY[def.rarity];
        Nexus.ui.toastHtml(`
            ${badge(def, 'sm')}
            <div class="toast-body">
                <span class="toast-kicker">Logro desbloqueado · ${esc(R.label)}</span>
                <strong>${esc(def.name)}</strong>
                <span class="toast-sub">${esc(def.desc)} · ${rewardLine(def)}</span>
            </div>`, { duration: def.rarity === 'rare' ? 5500 : 4500, className: 'toast-achievement rarity-' + def.rarity });
    }

    function overlayFor(def, full) {
        Nexus.audio.play(full ? 'levelup' : 'achievement');
        const el = document.createElement('div');
        el.className = 'rw-celebrate ' + (full ? 'is-legendary' : 'is-epic');
        el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Logro desbloqueado: ' + def.name);
        el.innerHTML = `
            <div class="rw-cel-card" style="--rc:${RCOLOR[def.rarity]}">
                <span class="rw-cel-kicker">${full ? '¡Logro legendario!' : 'Logro épico'}</span>
                ${badge(def, 'xl spin')}
                <h2>${esc(def.name)}</h2>
                <p>${esc(def.desc)}</p>
                <p class="rw-cel-reward">${rewardLine(def)}</p>
                <div class="rw-cel-actions">
                    ${full ? '<button type="button" class="btn btn-ghost" data-share>Compartir</button>' : ''}
                    <button type="button" class="btn btn-primary" data-close>¡Genial!</button>
                </div>
            </div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('in'));
        const stop = full ? confetti(el) : () => {};
        const close = () => { stop(); el.classList.remove('in'); setTimeout(() => el.remove(), 250); document.removeEventListener('keydown', onKey, true); window.removeEventListener('hashchange', close); };
        window.addEventListener('hashchange', close);
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        document.addEventListener('keydown', onKey, true);
        el.addEventListener('click', (e) => {
            if (e.target.closest('[data-share]')) { shareCard(def); return; }
            if (e.target.closest('[data-close]') || e.target === el) close();
        });
        const btn = el.querySelector('[data-close]'); if (btn) btn.focus();
    }

    /** Celebra un logro según su rareza. */
    function achievement(def) {
        if (def.rarity === 'legendary') overlayFor(def, true);
        else if (def.rarity === 'epic') overlayFor(def, false);
        else toastFor(def);
    }

    /** Confeti sobre el modal de resultados si en la partida cayó un legendario. */
    function burst(host) { return confetti(host || document.body, 120); }

    // ── Avisos del sistema de recompensas ───────────────────
    const inGame = () => /^#\/game\//.test(location.hash);
    Nexus.bus.on('achievement:unlock', achievement);
    Nexus.bus.on('rewards:missions', ({ done }) => {
        if (inGame() && document.querySelector('.modal-result')) return;   // ya se ven en el modal de resultados
        done.forEach((m, i) => setTimeout(() => Nexus.ui.toastHtml(`<span class="toast-icon">${diamond(22)}</span><div class="toast-body"><span class="toast-kicker">Misión ${esc(RW().TIER_LABEL[m.tier].toLowerCase())} completada</span><strong>${esc(m.text)}</strong><span class="toast-sub">+${RW().MISSION_ROMBOS[m.tier]} Rombos${m.food && Nexus.services.pet ? ` · +1 ${esc(Nexus.services.pet.FOOD[m.food].name.toLowerCase())} para ${esc(Nexus.services.pet.name())}` : ''}</span></div>`, { duration: 4000, className: 'toast-mission' }), i * 900));
    });
    Nexus.bus.on('rewards:season', ({ level, item }) => setTimeout(() => Nexus.ui.toastHtml(`<span class="toast-icon">${diamond(22)}</span><div class="toast-body"><span class="toast-kicker">Pase de batalla · nivel ${level}</span><strong>${item ? esc(item.name) : 'Nivel alcanzado'}</strong><span class="toast-sub">Míralo en Cosméticos · Pase de batalla</span></div>`, { duration: 4500, className: 'toast-season' }), 1200));
    Nexus.bus.on('rewards:mastery', ({ game }) => {
        const g = Nexus.games.registry.get(game);
        setTimeout(() => Nexus.ui.toastHtml(`<span class="toast-icon big">${g ? esc(g.emoji) : '👑'}</span><div class="toast-body"><span class="toast-kicker">¡Maestría!</span><strong>${g ? esc(g.name) : ''}</strong><span class="toast-sub">Título «Maestro de ${g ? esc(g.name) : ''}», marco Maestría y 500 Rombos</span></div>`, { duration: 6000, className: 'toast-achievement rarity-legendary' }), 1800);
    });

    Nexus.ui.celebrate = { achievement, badge, burst, confetti, shareCard, rewardLine, diamond, RCOLOR };
})();
