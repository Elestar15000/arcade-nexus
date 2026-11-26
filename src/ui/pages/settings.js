/* ============================================================
   NEXUS ARCADE · ui/pages/settings.js — Ajustes
   Los cambios se aplican y guardan al instante (por usuario).
   ============================================================ */
(function () {
    'use strict';

    const { esc, $, $$ } = Nexus.util;
    const C = Nexus.ui.components;
    const S = () => Nexus.services.settings;

    Nexus.ui.pages.settings = {
        title: 'Ajustes',

        render(root) {
            const themes = S().THEMES;
            const users = Nexus.services.users;

            root.innerHTML = `
                <div class="page-body narrow">
                    <div class="page-head"><div><h2 class="page-title">Ajustes</h2>
                        <p class="page-sub">Se guardan en tu cuenta y se aplican al instante.</p></div></div>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🎨</span> Apariencia</h2>
                        <div class="setting-row">
                            <span class="setting-text"><strong>Tema</strong><small>Color de acento de toda la aplicación</small></span>
                            <div class="theme-grid" role="radiogroup" aria-label="Tema" data-choice="theme">
                                ${themes.map(t => `<button type="button" class="theme-opt" role="radio" data-value="${esc(t.id)}"
                                    style="--a:${esc(t.colors[0])};--b:${esc(t.colors[1])}"><span class="theme-swatch"></span>${esc(t.name)}</button>`).join('')}
                            </div>
                        </div>
                        ${C.switchRow('particles', 'Partículas de fondo', 'Animación decorativa; desactívala para ahorrar batería')}
                        ${C.switchRow('reduceMotion', 'Reducir animaciones', 'Menos movimiento en transiciones y efectos')}
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🔊</span> Sonido</h2>
                        ${C.switchRow('sound', 'Efectos de sonido')}
                        <div class="setting-row">
                            <span class="setting-text"><strong>Volumen</strong></span>
                            <span class="range-wrap"><input type="range" min="0" max="1" step="0.05" data-range="volume" aria-label="Volumen" />
                                <button class="btn btn-ghost btn-sm" id="st-test-sound" type="button">▶ Probar</button></span>
                        </div>
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🧭</span> Interfaz</h2>
                        ${C.switchRow('autoCollapseSidebar', 'Plegar la barra lateral al jugar', 'Más espacio para el tablero; se restaura al salir')}
                        <label class="setting-row">
                            <span class="setting-text"><strong>Barra lateral plegada por defecto</strong><small>También puedes plegarla con el botón ☰ o Ctrl + B</small></span>
                            <span class="switch"><input type="checkbox" id="st-sidebar" /><span class="switch-track"><span class="switch-thumb"></span></span></span>
                        </label>
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>💛</span> Nexito</h2>
                        <label class="setting-row">
                            <span class="setting-text"><strong>Mostrar a Nexito</strong><small>En Inicio, el menú y al terminar cada partida. Si lo ocultas, su racha sigue contando</small></span>
                            <span class="switch"><input type="checkbox" id="st-pet-show" /><span class="switch-track"><span class="switch-thumb"></span></span></span>
                        </label>
                        <label class="setting-row">
                            <span class="setting-text"><strong>Avisos de racha</strong><small>Racha en peligro y sugerencia de pausa tras 45 minutos seguidos</small></span>
                            <span class="switch"><input type="checkbox" id="st-pet-alerts" /><span class="switch-track"><span class="switch-thumb"></span></span></span>
                        </label>
                        <p class="muted small">El nombre y el modo vacaciones están en <a href="#/pet" data-pet-settings>Ajustes de Nexito</a>.</p>
                    </section>

                    <section class="section card-surface st-beta">
                        <h2 class="section-title"><span>🧪</span> Modos BETA</h2>
                        <p class="muted small">Funciones experimentales que no vienen activadas de serie. Se desbloquean con un código y, después, puedes activarlas o desactivarlas cuando quieras, también a mitad de partida.</p>
                        <form class="st-beta-form" id="st-beta-form" autocomplete="off">
                            <input class="input" id="st-beta-code" maxlength="24" placeholder="Código de letras y números" aria-label="Código BETA" spellcheck="false" autocapitalize="characters" />
                            <button class="btn btn-primary" type="submit">🔓 Desbloquear</button>
                        </form>
                        <div id="st-beta-list"></div>
                    </section>

                    <p class="muted small">Los ajustes de cada juego (pieza fantasma, modo difícil, cuadrícula…) están dentro del propio juego, en el botón ⚙️ de su cabecera.</p>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>☁️</span> Cuenta y datos</h2>
                        <p class="muted" id="st-sync"></p>
                        <div class="btn-row">
                            <button class="btn btn-ghost" id="st-reset" type="button">↺ Restablecer ajustes</button>
                        </div>
                    </section>

                    <p class="muted small center">Nexus Arcade v${esc(Nexus.VERSION)}</p>
                </div>`;

            const drawBeta = () => {
                const list = S().BETA.filter(b => S().betaUnlocked(b.id));
                $('#st-beta-list', root).innerHTML = list.length
                    ? list.map(b => `<div class="st-beta-item"><span class="st-beta-ic">${b.icon}</span>${C.switchRow(b.key, b.name + ' · BETA', b.desc)}</div>`).join('')
                    : '<p class="muted small st-beta-none">Aún no has desbloqueado ningún modo BETA.</p>';
                syncControls();
            };
            const syncControls = () => {
                $$('[data-setting]', root).forEach(i => { i.checked = !!S().get(i.dataset.setting); });
                $$('[data-choice]', root).forEach(g => {
                    const v = S().get(g.dataset.choice);
                    $$('[data-value]', g).forEach(b => {
                        const on = b.dataset.value === v;
                        b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on));
                    });
                });
                $$('[data-range]', root).forEach(r => { r.value = S().get(r.dataset.range); });
                $('#st-sidebar', root).checked = !!S().getUI('sidebarCollapsed', false);
            };

            root.addEventListener('change', (e) => {
                const t = e.target;
                if (t.dataset.setting) { S().set(t.dataset.setting, t.checked); Nexus.audio.play('click'); }
                else if (t.id === 'st-sidebar') Nexus.ui.sidebar.setCollapsed(t.checked);
                else if (t.dataset.range) { S().set(t.dataset.range, parseFloat(t.value)); }
            });
            root.addEventListener('click', (e) => {
                const b = e.target.closest('[data-choice] [data-value]');
                if (b) {
                    const key = b.closest('[data-choice]').dataset.choice;
                    S().set(key, b.dataset.value); syncControls(); Nexus.audio.play('click');
                }
            });

            $('#st-test-sound', root).addEventListener('click', () => Nexus.audio.play('win'));
            $('#st-beta-form', root).addEventListener('submit', (e) => {
                e.preventDefault();
                const inp = $('#st-beta-code', root), code = inp.value.trim();
                if (!/^[a-z0-9]+$/i.test(code)) { Nexus.ui.toast('El código solo tiene letras y números', { type: 'error' }); return; }
                const r = S().redeemBeta(code);
                if (!r.ok) { Nexus.ui.toast('Código no válido', { type: 'error' }); Nexus.audio.play('error'); inp.select(); return; }
                inp.value = '';
                if (r.already) Nexus.ui.toast(`Ya tenías «${r.beta.name}»`, { icon: r.beta.icon });
                else { Nexus.ui.toast(`Modo BETA desbloqueado y activado: ${r.beta.name}`, { type: 'success', icon: '🧪' }); Nexus.audio.play('win'); }
                drawBeta();
            });
            // Nexito (services/pet.js)
            const PT = Nexus.services.pet, ps = $('#st-pet-show', root), pa = $('#st-pet-alerts', root);
            if (PT && PT.data()) {
                ps.checked = !PT.isHidden(); pa.checked = !PT.data().noAlerts;
                ps.addEventListener('change', (e) => { e.stopPropagation(); PT.setHidden(!ps.checked); });
                pa.addEventListener('change', (e) => { e.stopPropagation(); PT.setAlerts(pa.checked); });
            }
            const pl = $('[data-pet-settings]', root); if (pl) pl.addEventListener('click', () => { Nexus.ui.petPanel = 'settings'; });
            $('#st-reset', root).addEventListener('click', async () => {
                const ok = await Nexus.ui.modal.confirm({ title: 'Restablecer ajustes', message: 'Todos los ajustes volverán a sus valores por defecto.', confirmLabel: 'Restablecer' });
                if (ok) { S().reset(); drawBeta(); Nexus.ui.toast('Ajustes restablecidos', { type: 'success' }); }
            });

            const syncEl = $('#st-sync', root);
            const SYNC = { synced: 'Tu cuenta está sincronizada con el servidor.', pending: 'Hay cambios pendientes de guardar…', syncing: 'Guardando…',
                offline: 'Sin conexión: tus cambios se guardarán al volver.', error: 'No se pudieron guardar los últimos cambios.', idle: '' };
            const paintSync = () => {
                syncEl.textContent = Nexus.backend.kind === 'local'
                    ? 'Modo local: tus datos se guardan sólo en este navegador.'
                    : (SYNC[users.sync] || '');
            };
            paintSync();
            const off = Nexus.bus.on('sync:state', paintSync);

            drawBeta();
            return () => { if (off) off(); };
        }
    };
})();
