/* ============================================================
   NEXUS ARCADE · ui/nexito.js — Nexito fuera de su página
   · Nexus.ui.nexito.mini(): Nexito pequeño con su estado
   · card(): tarjeta de Inicio (frase, lo que falta hoy, racha)
   · resultLine(): línea del modal de resultados
   · suggestGame(): el juego al que hace más que no juegas
   · avisos (toasts / celebración) de los eventos pet:*
   Respeta «ocultar a Nexito» y «sin avisos de racha».
   ============================================================ */
(function () {
    'use strict';

    const { esc, formatNumber } = Nexus.util;
    const P = () => Nexus.services.pet;
    const RW = () => Nexus.services.rewards;
    const inGame = () => /^#\/game\//.test(location.hash);

    function mini(opts = {}) {
        const p = P();
        return Nexus.ui.art.nexito(Object.assign({ stage: p.stage().id, mood: p.mood().id, outfit: p.outfit() }, opts));
    }

    /** Juego sugerido: el disponible al que hace más que no juegas (estable durante el día). */
    function suggestGame() {
        const games = Nexus.games.registry.available();
        const hist = (Nexus.services.users.data() || {}).history || [];
        const last = {};
        hist.forEach(h => { if (!(h.game in last)) last[h.game] = h.at || 0; });
        const never = games.filter(g => !(g.id in last));
        if (never.length) return never[Math.abs(Nexus.util.dayKey().split('-').reduce((a, b) => a + +b, 0)) % never.length];
        return games.slice().sort((a, b) => (last[a.id] || 0) - (last[b.id] || 0))[0] || games[0];
    }

    /** Lista de lo que falta hoy («Hoy te toca»). */
    function todoHtml() {
        const t = P().todo();
        if (t.danger) return `<span class="nxt-todo danger">⚠ Racha en peligro: completa hoy las 3 misiones diarias</span>`;
        if (t.cared) return `<span class="nxt-todo ok">✓ Hoy, cuidado. ¡Hasta mañana!</span>`;
        return `<span class="nxt-todo"><i class="${t.played ? 'on' : ''}">${t.played ? '✓' : '▶'} 1 partida</i><i class="${t.fed ? 'on' : ''}">${t.fed ? '✓' : '🍎'} 1 comida</i></span>`;
    }

    /** Tarjeta de Inicio. */
    function card() {
        const p = P(); if (!p.data() || p.isHidden()) return '';
        const st = p.streak(), t = p.todo();
        return `<section class="nh-pet" aria-label="${esc(p.name())}">
            <a class="nh-pet-art" href="#/pet" aria-label="Ir con ${esc(p.name())}">${mini()}</a>
            <div class="nh-pet-body"><span class="nh-pet-bubble">${esc(p.line())}</span>
                <b>${esc(p.name())} <small>${esc(p.mood().label)}</small></b>${todoHtml()}</div>
            <div class="nh-pet-streak"><span>🔥 <b>${formatNumber(st.count)}</b></span><small>día${st.count === 1 ? '' : 's'} de racha</small></div>
            <div class="nh-pet-acts">${!t.fed && t.snack ? '<button type="button" class="btn btn-primary btn-sm" data-pet-snack>🍎 Dar merienda</button>' : ''}<a class="btn btn-ghost btn-sm" href="#/pet">Ver a ${esc(p.name())}</a></div>
        </section>`;
    }

    /** Línea del modal de resultados (r = resultado de recordGame). */
    function resultLine(r) {
        const p = P(); if (!r || !r.pet || !p.data() || p.isHidden()) return '';
        const x = r.pet, t = p.todo();
        const msg = x.credited && x.credited.count ? `¡Día cuidado! Racha de <b>${x.credited.count}</b> día${x.credited.count === 1 ? '' : 's'}`
            : t.cared ? `+${x.fun} de diversión · hoy ya está cuidado`
            : t.danger ? `+${x.fun} de diversión · racha en peligro: completa las 3 misiones`
            : `+${x.fun} de diversión · dale de comer para sumar el día`;
        return `<div class="modal-pet"><span class="modal-pet-art">${mini()}</span><span class="modal-pet-txt"><b>${esc(p.name())}</b><small>${msg}</small></span>
            ${!t.fed && t.snack ? '<button type="button" class="btn btn-ghost btn-sm modal-pet-snack" data-pet-snack>🍎 Merienda</button>' : ''}</div>`;
    }

    /** Botones «Dar merienda» en cualquier sitio. */
    document.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pet-snack]'); if (!b) return;
        const r = P().feed('merienda');
        if (!r.ok) return Nexus.ui.toast(r.error, { type: 'warn' });
        Nexus.audio.play('orbCollect');
        const wrap = b.closest('.modal-pet, .nh-pet');
        if (wrap && wrap.classList.contains('modal-pet')) {
            const c = r.credited;
            wrap.querySelector('small').innerHTML = c && c.count ? `¡Día cuidado! Racha de <b>${c.count}</b> día${c.count === 1 ? '' : 's'}` : '¡Ñam! Merienda comida';
            b.remove();
        }
        if (!r.credited) Nexus.ui.toast(`¡Ñam! ${P().name()} ha merendado. ${P().todo().played ? '' : 'Juega una partida para sumar el día.'}`, { icon: '🍎' });
    });

    // ── Avisos ──────────────────────────────────────────────
    const quiet = () => !P().data() || P().isHidden();
    const alertsOff = () => quiet() || P().data().noAlerts;
    const toast = (kicker, title, sub, cls = '', ms = 4500) => Nexus.ui.toastHtml(`<span class="toast-icon nxt-toast-art">${mini({ mood: 'happy' })}</span><div class="toast-body"><span class="toast-kicker">${kicker}</span><strong>${title}</strong>${sub ? `<span class="toast-sub">${sub}</span>` : ''}</div>`, { duration: ms, className: 'toast-pet ' + cls });
    const later = (fn, ms = 600) => setTimeout(fn, ms);

    Nexus.bus.on('pet:cared', ({ count, pending }) => {
        if (quiet() || (inGame() && document.querySelector('.modal-result'))) return;
        later(() => pending ? toast(esc(P().name()), 'Día cuidado', 'Completa las 3 misiones para que cuente en la racha')
            : toast('¡Día cuidado!', `Racha de ${count} día${count === 1 ? '' : 's'}`, esc(P().line())));
    });
    Nexus.bus.on('pet:milestone', ({ days, got }) => {
        if (P().isHidden()) return;
        later(() => toast(`Hito de racha · ${days} días`, `¡${days} días con ${esc(P().name())}!`, got.map(g => esc(g.name)).join(' · '), 'big', 6500), 1400);
    });
    Nexus.bus.on('pet:evolve', ({ stage }) => {
        if (quiet()) return;
        later(() => evolveOverlay(stage), inGame() ? 2500 : 900);
    });
    Nexus.bus.on('pet:shield', ({ left }) => { if (!quiet()) later(() => toast('Escudo de racha', 'Se ha gastado 1 escudo', `La racha sigue. Te quedan ${left}.`), 1200); });
    Nexus.bus.on('pet:danger', () => { if (!alertsOff()) later(() => toast('Racha en peligro', 'Completa hoy las 3 misiones diarias', 'Así recuperas la racha entera.', 'warn', 7000), 1400); });
    Nexus.bus.on('pet:broken', ({ lost }) => { if (!quiet()) later(() => toast('¡Empezamos otra!', `Tu racha de ${lost} día${lost === 1 ? '' : 's'} ha terminado`, `Nada de lo ganado se pierde. Mejor racha: ${P().streak().best}.`, '', 6500), 1400); });
    Nexus.bus.on('pet:rescued', ({ count }) => { if (!quiet()) later(() => toast('¡Racha rescatada!', `Racha de ${count} días`, 'Las 3 misiones la han salvado.', 'big', 6000), 1200); });
    Nexus.bus.on('pet:tired', () => { if (!alertsOff()) later(() => toast(esc(P().name()), 'Llevamos 45 minutos jugando', '¿Una pausa? Al volver estaré descansado.'), 2500); });
    Nexus.bus.on('pet:rested', () => { if (!quiet()) later(() => toast(esc(P().name()), '¡Qué bien me ha sentado la pausa!', 'Descansado y listo para jugar.'), 900); });
    Nexus.bus.on('pet:change', () => { document.documentElement.toggleAttribute('data-pet-hidden', !!(P().data() && P().isHidden())); });
    Nexus.bus.on('user:logout', () => document.documentElement.removeAttribute('data-pet-hidden'));

    /** Celebración de evolución a pantalla completa. */
    function evolveOverlay(stage) {
        const CEL = Nexus.ui.celebrate;
        const el = document.createElement('div');
        el.className = 'rw-celebrate is-legendary nxt-evolve';
        el.innerHTML = `<div class="rw-cel-card" style="--rc:#FFD43B" role="dialog" aria-modal="true" aria-label="${esc(P().name())} ha evolucionado">
            <span class="rw-cel-kicker">¡Evolución!</span>
            <div class="nxt-evolve-art">${mini({ stage: stage.id, mood: 'happy', scene: true })}</div>
            <h2>${esc(stage.name)}</h2><p>${esc(stage.desc)}</p>
            <div class="rw-cel-actions"><a class="btn btn-ghost" href="#/pet">Ver a ${esc(P().name())}</a><button type="button" class="btn btn-primary" data-close>¡Genial!</button></div></div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('in'));
        if (CEL && CEL.confetti) CEL.confetti(el);
        const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); window.removeEventListener('hashchange', close); };
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]') || e.target.closest('a')) close(); });
        window.addEventListener('hashchange', close);
        Nexus.audio.play('levelup');
    }

    Nexus.ui.nexito = { mini, card, resultLine, suggestGame, todoHtml, evolveOverlay };
})();
