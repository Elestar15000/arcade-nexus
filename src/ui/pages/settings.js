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
                        <h2 class="section-title"><span>💣</span> Buscaminas</h2>
                        ${C.choiceRow('minesweeper.defaultDifficulty', 'Dificultad inicial', '', [
                            { value: 'easy', label: 'Recluta' }, { value: 'medium', label: 'Soldado' },
                            { value: 'hard', label: 'Veterano' }, { value: 'nightmare', label: 'Pesadilla' }])}
                        ${C.switchRow('minesweeper.longPressFlag', 'Pulsación larga para poner bandera', 'En pantallas táctiles')}
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🔤</span> Wordle</h2>
                        ${C.choiceRow('wordle.defaultMode', 'Modo inicial', '', [
                            { value: 'random', label: 'Aleatoria' }, { value: 'daily', label: 'Diaria' }])}
                        ${C.switchRow('wordle.hardMode', 'Modo difícil', 'Debes usar todas las pistas reveladas en los siguientes intentos')}
                        ${C.switchRow('wordle.colorblind', 'Alto contraste (daltonismo)', 'Naranja y azul en lugar de verde y amarillo')}
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🧩</span> Tetris Fusion</h2>
                        ${C.choiceRow('tetris.defaultMode', 'Modo inicial', '', [
                            { value: 'fusion', label: 'Fusión' }, { value: 'cascade', label: 'Cascada' },
                            { value: 'chaos', label: 'Caos' }, { value: 'sprint', label: 'Sprint' }])}
                        ${C.switchRow('tetris.ghost', 'Pieza fantasma', 'Muestra dónde caerá la pieza')}
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🟡</span> Pac-Man Nexus</h2>
                        ${C.choiceRow('pacman.defaultMode', 'Modo inicial', '', [
                            { value: 'classic', label: 'Clásico' }, { value: 'nexus', label: 'Nexus' }, { value: 'horde', label: 'Horda' }])}
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🐍</span> Snake Neón</h2>
                        ${C.choiceRow('snake.defaultMode', 'Modo inicial', '', [
                            { value: 'classic', label: 'Clásico' }, { value: 'evolve', label: 'Evolución' },
                            { value: 'rival', label: 'Rival' }, { value: 'zone', label: 'Zona' }])}
                        ${C.switchRow('snake.grid', 'Mostrar cuadrícula', 'Ayuda a calcular distancias')}
                    </section>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>☁️</span> Cuenta y datos</h2>
                        <p class="muted" id="st-sync"></p>
                        <div class="btn-row">
                            <button class="btn btn-ghost" id="st-reset" type="button">↺ Restablecer ajustes</button>
                        </div>
                    </section>

                    <p class="muted small center">Nexus Arcade v${esc(Nexus.VERSION)}</p>
                </div>`;

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
                if (b) { S().set(b.closest('[data-choice]').dataset.choice, b.dataset.value); syncControls(); Nexus.audio.play('click'); }
            });

            $('#st-test-sound', root).addEventListener('click', () => Nexus.audio.play('win'));
            $('#st-reset', root).addEventListener('click', async () => {
                const ok = await Nexus.ui.modal.confirm({ title: 'Restablecer ajustes', message: 'Todos los ajustes volverán a sus valores por defecto.', confirmLabel: 'Restablecer' });
                if (ok) { S().reset(); syncControls(); Nexus.ui.toast('Ajustes restablecidos', { type: 'success' }); }
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

            syncControls();
            return () => { if (off) off(); };
        }
    };
})();
