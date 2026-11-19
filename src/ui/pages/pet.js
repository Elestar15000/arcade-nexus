/* ============================================================
   NEXUS ARCADE · ui/pages/pet.js — Nexito (#/pet)
   Escenario con cúpula y pedestal, bocadillo, racha con escudos
   · Estado (ánimo) · Necesidades (Comida, Diversión, Descanso)
   · Hoy te toca · Hitos de racha · Actividades: Jugar juntos,
   Darle comida, Vestir, Evolución y Ajustes (nombre, vacaciones,
   ocultar, avisos). Diseño del mockup corregido en el estudio.
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$, pct, formatNumber } = Nexus.util;
    const P = () => Nexus.services.pet;
    const RW = () => Nexus.services.rewards;
    const NX = () => Nexus.ui.nexito;
    const dia = (n = 16) => Nexus.ui.celebrate.diamond(n);
    const rombos = (n, s = 16) => `<span class="rw-amount">${dia(s)}${formatNumber(n)}</span>`;
    const bar = (p, cls) => `<span class="nxt-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span>`;
    const fmtDay = (k) => k ? k.split('-').reverse().join('/') : '';

    Nexus.ui.pages.pet = {
        title: 'Nexito',

        render(root) {
            let panel = Nexus.ui.petPanel || 'food';
            Nexus.ui.petPanel = null;
            let bounce = false;

            const needRow = (ic, label, v, cls, help) => `<div class="nxt-need" title="${esc(help)}"><span class="nxt-need-ic ${cls}">${ic}</span><span class="nxt-need-l">${label}</span>${bar(v, cls)}<b>${Math.round(v)}%</b></div>`;

            const stagePanel = () => {
                const p = P(), d = p.data(), st = d.streak, stage = p.stage(), next = p.nextStage();
                const shields = Array.from({ length: Math.max(P().MAX_SHIELDS, st.shields) }, (_, i) => `<i class="${i < st.shields ? 'on' : ''}" title="Escudo de racha">🛡</i>`).join('');
                return `<section class="nxt-main">
                    <header class="nxt-head"><span class="nxt-logo">${Nexus.ui.brand.logo(48)}</span>
                        <div><h2>${esc(p.name())}</h2><p>Tu compañero en Nexus Arcade · <b>${esc(stage.name)}</b>${next ? ` · ${next.at - d.caredDays} día${next.at - d.caredDays === 1 ? '' : 's'} cuidados para ${esc(next.name)}` : ''}</p></div>
                        <button type="button" class="nxt-gear" data-panel="settings" title="Ajustes de ${esc(p.name())}" aria-label="Ajustes">⚙️</button></header>
                    <div class="nxt-stage">
                        <span class="nxt-bubble" aria-live="polite">${esc(p.line())}</span>
                        <button type="button" class="nxt-scene${bounce ? ' bounce' : ''}" data-poke aria-label="Acariciar a ${esc(p.name())}">${NX().mini({ scene: true })}</button>
                        <div class="nxt-streak">
                            <span class="nxt-flame">🔥</span>
                            <span><small>Racha actual</small><b>${formatNumber(st.count)} día${st.count === 1 ? '' : 's'}</b></span>
                            <span class="nxt-shields" aria-label="${st.shields} escudos">${shields}</span>
                            <button type="button" class="nxt-info" data-panel="rules" title="Cómo funciona la racha" aria-label="Cómo funciona la racha">ℹ</button>
                        </div>
                    </div>
                    ${st.danger ? `<p class="nxt-alert">⚠ Ayer no hubo cuidado y no quedaban escudos. <b>Completa hoy las 3 misiones diarias</b> y la racha vuelve entera.</p>` : ''}
                    ${p.onVacation(Nexus.util.dayKey()) ? `<p class="nxt-alert calm">🏖 Modo vacaciones hasta el ${fmtDay(d.vacation.to)}: la racha está congelada.</p>` : ''}
                    <section class="nxt-acts" aria-label="Actividades con ${esc(p.name())}">
                        <h3><span>✨</span> Actividades con ${esc(p.name())}</h3>
                        <div class="nxt-acts-row">
                            ${(() => { const g = NX().suggestGame(); return g ? `<a class="nxt-act main" href="#/info/${esc(g.id)}" title="Sugerencia: ${esc(g.name)}"><span>🎮</span>Jugar juntos<small>${esc(g.name)}</small></a>` : ''; })()}
                            <button type="button" class="nxt-act${panel === 'food' ? ' on' : ''}" data-panel="food"><span>🍽</span>Darle comida<small>${foodCount()} en la despensa</small></button>
                            <button type="button" class="nxt-act${panel === 'dress' ? ' on' : ''}" data-panel="dress"><span>🎩</span>Vestir<small>${Object.values(p.outfit()).filter(Boolean).length}/5 puestos</small></button>
                            <button type="button" class="nxt-act${panel === 'evo' ? ' on' : ''}" data-panel="evo"><span>🥚</span>Evolución<small>${esc(stage.name)}</small></button>
                        </div>
                    </section>
                </section>`;
            };
            const foodCount = () => { const d = P().data(); return Object.values(d.food).reduce((a, b) => a + b, 0) + (d.today.snack ? 1 : 0); };

            const side = () => {
                const p = P(), d = p.data(), n = d.needs, m = p.mood(), st = d.streak, t = p.todo();
                const nm = p.nextMilestone();
                const ms = P().MILESTONES.slice().filter(x => !st.milestones.includes(x.days) || x.days > st.count).slice(0, 3);
                const prize = (x) => x.rombos ? rombos(x.rombos, 18) : x.shield ? '🛡 Escudo' : esc(x.items.map(id => (RW().item(id) || {}).name || id).join(' + '));
                return `<aside class="nxt-side">
                    <section class="nxt-card"><h3><span>${esc(p.stage().id === 'egg' ? '🥚' : '💛')}</span>Estado de ${esc(p.name())}<span class="nxt-mood t-${esc(m.tone)}"><i></i>${esc(m.label)}</span></h3>
                        <p class="nxt-sub">${esc(moodText(m.id))}</p></section>
                    <section class="nxt-card"><h3><span>📊</span>Necesidades<button type="button" class="nxt-help" data-panel="rules" title="Cómo sube y baja cada una" aria-label="Ayuda">?</button></h3>
                        ${needRow('🍽', 'Comida', n.food, 'c-food', 'Sube al darle de comer. Baja 4 por hora.')}
                        ${needRow('🎮', 'Diversión', n.fun, 'c-fun', 'Sube 15 con cada partida (20 si cambias de juego). Baja 3 por hora.')}
                        ${needRow('💤', 'Descanso', n.rest, 'c-rest', 'Sube 20 por hora sin jugar. Baja jugando mucho rato seguido.')}
                    </section>
                    <section class="nxt-card nxt-today${t.cared ? ' done' : ''}"><h3><span>📅</span>Hoy te toca</h3>
                        <ul class="nxt-checks">
                            <li class="${t.played ? 'on' : ''}"><i>${t.played ? '✓' : '1'}</i>Jugar 1 partida</li>
                            <li class="${t.fed ? 'on' : ''}"><i>${t.fed ? '✓' : '2'}</i>Darle 1 comida${!t.fed && t.snack ? ' <button type="button" class="btn btn-primary btn-sm" data-feed="merienda">🍎 Merienda gratis</button>' : ''}</li>
                        </ul>
                        <p class="nxt-sub">${t.cared ? '¡Hoy, cuidado! ¡Hasta mañana!' : t.danger ? 'Hoy además: las 3 misiones diarias rescatan la racha.' : 'Con eso se suma el día a la racha.'}</p></section>
                    <section class="nxt-card"><h3><span>🎁</span>Hitos de racha${nm ? `<span class="nxt-count">${st.count}/${nm.days}</span>` : ''}</h3>
                        ${nm ? bar(pct(st.count, nm.days), 'c-gold') : ''}
                        <div class="nxt-prizes">${ms.map(x => `<span class="${st.count >= x.days ? 'on' : ''}"><b>${x.days} días</b>${prize(x)}</span>`).join('')}</div>
                        <p class="nxt-sub">Mejor racha: <b>${st.best}</b> · ${d.caredDays} días cuidados en total</p></section>
                    <section class="nxt-card nxt-shop"><h3><span>🛡</span>Escudos de racha<span class="nxt-count">${st.shields}/${P().MAX_SHIELDS}</span></h3>
                        <p class="nxt-sub">Si un día no lo cuidas, se gasta uno y la racha sigue. Cada lunes te regala uno.</p>
                        ${st.shields < P().MAX_SHIELDS ? `<button type="button" class="btn btn-ghost btn-sm" data-buy-shield>Comprar escudo · ${rombos(P().SHIELD_PRICE)}</button>` : '<span class="rw-ok">Tienes el máximo</span>'}</section>
                </aside>`;
            };
            const moodText = (id) => ({
                happy: 'Está encantado. ¡Seguid así!', content: 'Está a gusto. Una partida le vendría genial.',
                hungry: 'Tiene hambre: dale algo de la despensa.', bored: 'Se aburre: prueba un juego distinto.',
                tired: 'Está cansado: una pausa le sentará bien.', sleepy: 'Está dormido. Tócalo para despertarlo.',
                rested: 'Ha descansado contigo y está lleno de energía.', sad: 'Te echaba de menos. Una partida y una comida y vuelve a estar feliz.'
            }[id] || '');

            // ── Paneles inferiores ──
            const foodPanel = () => {
                const d = P().data(), F = P().FOOD;
                const own = ['merienda', 'galleta', 'bocadillo', 'tarta', 'banquete', 'helado', 'pizza'].map(k => {
                    const f = F[k], n = k === 'merienda' ? (d.today.snack ? 1 : 0) : d.food[k] || 0;
                    return `<div class="nxt-food${n ? '' : ' empty'}"><span class="nxt-food-ic">${f.icon}</span><b>${esc(f.name)}</b><small>${esc(f.desc)}</small>
                        <span class="nxt-food-fx">+${f.food} comida${f.fun ? ` · +${f.fun} diversión` : ''}</span>
                        <div class="nxt-food-foot"><span class="nxt-food-n">×${n}</span>
                        ${n ? `<button type="button" class="btn btn-primary btn-sm" data-feed="${k}">Dar</button>` : f.price ? `<button type="button" class="btn btn-ghost btn-sm" data-treat="${k}">${rombos(f.price)}</button>` : '<span class="muted small">Gana con misiones</span>'}</div></div>`;
                }).join('');
                return `<section class="nxt-panel"><h3><span>🍽</span>Despensa<small>Cada misión completada da una comida: fácil = galleta, media = bocadillo, difícil = tarta y semanal = banquete.</small></h3><div class="nxt-foods">${own}</div></section>`;
            };
            const dressPanel = () => {
                const o = P().outfit();
                return `<section class="nxt-panel"><h3><span>🎩</span>Vestir a ${esc(P().name())}<small>Se compran en la Tienda de Cosméticos, salen en el pase de batalla y algunos se ganan con la racha.</small></h3>
                    ${Object.entries(P().SLOTS).map(([slot, label]) => {
                        const items = RW().CATALOG.filter(c => c.kind === slot);
                        return `<div class="nxt-slot"><b>${esc(label)}</b><div class="nxt-wear">
                            <button type="button" class="nxt-wear-it${!o[slot] ? ' on' : ''}" data-wear="${slot}" data-id=""><span class="nxt-wear-none">—</span><small>Nada</small></button>
                            ${items.map(it => { const own = RW().owns(it.id), on = o[slot] === it.id; const prev = Object.assign({}, o, { [slot]: it.id });
                                return `<button type="button" class="nxt-wear-it${on ? ' on' : ''}${own ? '' : ' locked'}" ${own ? `data-wear="${slot}" data-id="${esc(it.id)}"` : 'disabled'} title="${esc(it.desc)}">
                                    <span class="nxt-wear-art">${NX().mini({ outfit: prev, scene: slot === 'pet-dome' || slot === 'pet-base', mood: 'happy' })}</span><small>${own ? '' : '🔒 '}${esc(it.name)}</small></button>`; }).join('')}
                        </div></div>`;
                    }).join('')}
                    <a class="btn btn-ghost" href="#/cosmetics" data-cos-tab="tienda">🛍 Ir a la tienda</a></section>`;
            };
            const evoPanel = () => {
                const d = P().data(), cur = P().stage();
                return `<section class="nxt-panel"><h3><span>🥚</span>Evolución<small>La fase depende de los días cuidados en total (${d.caredDays}), así que nunca retrocede.</small></h3>
                    <div class="nxt-evo">${P().STAGES.map(s => { const got = d.caredDays >= s.at;
                        return `<div class="nxt-evo-it${got ? ' got' : ''}${s.id === cur.id ? ' cur' : ''}"><span class="nxt-evo-art">${got ? NX().mini({ stage: s.id, mood: 'content', outfit: {} }) : '<span class="nxt-evo-q">?</span>'}</span>
                            <b>${esc(s.name)}</b><small>${s.at} día${s.at === 1 ? '' : 's'}</small></div>`; }).join('')}</div></section>`;
            };
            const rulesPanel = () => `<section class="nxt-panel nxt-rules"><h3><span>ℹ</span>Cómo funciona la racha</h3>
                <ul>
                    <li><b>Un día cuenta</b> cuando juegas 1 partida y le das 1 comida. Cada día trae una merienda gratis.</li>
                    <li><b>Escudos:</b> si un día no lo cuidas se gasta uno y la racha sigue. Empiezas con 1, cada lunes te regala otro y puedes guardar ${P().MAX_SHIELDS}.</li>
                    <li><b>Rescate:</b> sin escudos, la racha queda en peligro un día. Si ese día completas las 3 misiones diarias, vuelve entera (una vez cada ${P().RESCUE_EVERY} días).</li>
                    <li><b>Si se rompe</b> vuelve a 0, pero conservas tu mejor racha, la fase de ${esc(P().name())} y todo lo ganado.</li>
                    <li><b>Necesidades:</b> la comida baja 4 por hora y la diversión 3; el descanso sube 20 por hora sin jugar. Nunca pasa nada malo: como mucho está un poco triste.</li>
                    <li><b>Vacaciones:</b> hasta ${P().VACATION_DAYS} días al año con la racha congelada (en Ajustes de ${esc(P().name())}).</li>
                </ul></section>`;
            const settingsPanel = () => {
                const d = P().data(), v = d.vacation, left = P().vacationLeft(), today = Nexus.util.dayKey();
                const onVac = v.from && v.to >= today;
                return `<section class="nxt-panel nxt-settings"><h3><span>⚙️</span>Ajustes de ${esc(P().name())}</h3>
                    <form class="nxt-form" data-rename><label>Nombre<input class="input" name="name" value="${esc(P().name())}" maxlength="16" required></label><button class="btn btn-primary btn-sm">Guardar</button></form>
                    <div class="nxt-form"><span>Modo vacaciones <small class="muted">${left} día${left === 1 ? '' : 's'} libres este año</small></span>
                        ${onVac ? `<span>Del ${fmtDay(v.from)} al ${fmtDay(v.to)}</span><button type="button" class="btn btn-ghost btn-sm" data-vac-stop>Terminar vacaciones</button>`
                            : `<label><span class="sr-only">Días</span><input class="input" type="number" min="1" max="${left}" value="${Math.min(3, Math.max(1, left))}" data-vac-days ${left ? '' : 'disabled'}></label><button type="button" class="btn btn-ghost btn-sm" data-vac-start ${left ? '' : 'disabled'}>Empezar mañana</button>`}</div>
                    <label class="nxt-toggle"><input type="checkbox" data-alerts ${d.noAlerts ? '' : 'checked'}><span>Avisos de racha (en peligro, pausa tras 45 min)</span></label>
                    <label class="nxt-toggle"><input type="checkbox" data-hidden ${d.hidden ? 'checked' : ''}><span>Ocultar a ${esc(P().name())} en Inicio, el menú y los resultados (la racha sigue contando)</span></label>
                </section>`;
            };

            const draw = () => {
                const p = P(); if (!p.data()) return;
                p.tick();
                const body = { food: foodPanel, dress: dressPanel, evo: evoPanel, rules: rulesPanel, settings: settingsPanel }[panel] || foodPanel;
                root.innerHTML = `<div class="page-body nxt-page">
                    ${p.isHidden() ? `<p class="nxt-alert calm">${esc(p.name())} está oculto en Inicio y el menú. <button type="button" class="btn btn-ghost btn-sm" data-unhide>Mostrarlo otra vez</button></p>` : ''}
                    <div class="nxt-grid">${stagePanel()}${side()}</div>
                    <div class="nxt-below">${body()}</div></div>`;
                bind();
                bounce = false;
            };

            const bind = () => {
                $$('[data-panel]', root).forEach(b => b.addEventListener('click', () => { panel = b.dataset.panel; Nexus.audio.play('click'); draw(); const el = $('.nxt-below', root), sc = Nexus.ui.router && Nexus.ui.router.container;
                    // Sólo se desplaza el contenedor de la página (scrollIntoView movería también el documento)
                    if (el && sc) { const dy = el.getBoundingClientRect().top - sc.getBoundingClientRect().bottom + 160; if (dy > 0) sc.scrollBy({ top: dy, behavior: 'smooth' }); } }));
                $$('[data-feed]', root).forEach(b => b.addEventListener('click', () => {
                    const r = P().feed(b.dataset.feed);
                    if (!r.ok) return Nexus.ui.toast(r.error, { type: 'warn' });
                    Nexus.audio.play('orbCollect'); bounce = true;
                    if (!r.credited) Nexus.ui.toast(`¡Ñam! ${r.food.name} para ${P().name()}`, { icon: r.food.icon });
                    draw();
                }));
                $$('[data-treat]', root).forEach(b => b.addEventListener('click', () => {
                    const r = P().buyTreat(b.dataset.treat);
                    if (!r.ok) return Nexus.ui.toast(r.error, { type: 'warn' });
                    Nexus.ui.toast(`${r.food.name} a la despensa`, { type: 'success' }); draw();
                }));
                $$('[data-wear]', root).forEach(b => b.addEventListener('click', () => { if (P().equip(b.dataset.wear, b.dataset.id)) { bounce = true; draw(); } }));
                $$('[data-buy-shield]', root).forEach(b => b.addEventListener('click', () => {
                    const r = P().buyShield();
                    if (!r.ok) return Nexus.ui.toast(r.error, { type: 'warn' });
                    Nexus.ui.toast('Escudo de racha comprado', { type: 'success', icon: '🛡' }); draw();
                }));
                $$('[data-poke]', root).forEach(b => b.addEventListener('click', () => {
                    const was = P().poke();
                    if (was === 'sleepy') Nexus.ui.toast(`${P().name()} se despierta un momento`, { icon: '⏰' });
                    bounce = true; Nexus.audio.play('click'); draw();
                }));
                $$('[data-cos-tab]', root).forEach(a => a.addEventListener('click', () => { Nexus.ui.cosmeticsTab = a.dataset.cosTab; }));
                const rn = $('[data-rename]', root);
                if (rn) rn.addEventListener('submit', (e) => { e.preventDefault(); const r = P().rename(rn.name.value); Nexus.ui.toast(r.ok ? 'Nombre guardado' : r.error, { type: r.ok ? 'success' : 'warn' }); if (r.ok) draw(); });
                const vs = $('[data-vac-start]', root);
                if (vs) vs.addEventListener('click', () => { const r = P().startVacation(+$('[data-vac-days]', root).value); Nexus.ui.toast(r.ok ? `Vacaciones del ${fmtDay(r.from)} al ${fmtDay(r.to)}` : r.error, { type: r.ok ? 'success' : 'warn', icon: '🏖' }); draw(); });
                const ve = $('[data-vac-stop]', root);
                if (ve) ve.addEventListener('click', () => { P().stopVacation(); Nexus.ui.toast('Vacaciones terminadas', { icon: '🏖' }); draw(); });
                const al = $('[data-alerts]', root); if (al) al.addEventListener('change', () => P().setAlerts(al.checked));
                const hd = $('[data-hidden]', root); if (hd) hd.addEventListener('change', () => { P().setHidden(hd.checked); draw(); });
                const uh = $('[data-unhide]', root); if (uh) uh.addEventListener('click', () => { P().setHidden(false); draw(); });
            };

            const onChange = () => { if (root.isConnected) draw(); };
            Nexus.bus.on('pet:change', onChange);
            Nexus.bus.on('rewards:change', onChange);
            draw();
            // El ánimo y las necesidades cambian con el tiempo: se repinta cada minuto mientras la página está abierta
            const iv = setInterval(() => { if (root.isConnected && !root.querySelector('input:focus')) draw(); }, 60e3);
            return () => { clearInterval(iv); if (Nexus.bus.off) { Nexus.bus.off('pet:change', onChange); Nexus.bus.off('rewards:change', onChange); } };
        }
    };
})();
