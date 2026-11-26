/* ============================================================
   NEXUS ARCADE · ui/pages/settings.js — Ajustes
   Sólo sonido y modos BETA. El estilo de la aplicación es el
   mismo para todos (no hay temas ni opciones de apariencia) y
   las opciones de cada juego están en su botón ⚙️.
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
            root.innerHTML = `
                <div class="page-body narrow">
                    <div class="page-head"><div><h2 class="page-title">Ajustes</h2>
                        <p class="page-sub">Se guardan en tu cuenta y se aplican al instante.</p></div></div>

                    <section class="section card-surface">
                        <h2 class="section-title"><span>🔊</span> Sonido</h2>
                        ${C.switchRow('sound', 'Efectos de sonido')}
                        <div class="setting-row">
                            <span class="setting-text"><strong>Volumen</strong></span>
                            <span class="range-wrap"><input type="range" min="0" max="1" step="0.05" data-range="volume" aria-label="Volumen" />
                                <button class="btn btn-ghost btn-sm" id="st-test-sound" type="button">▶ Probar</button></span>
                        </div>
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

                    <p class="muted small">Las opciones de cada juego (pieza fantasma, modo difícil, cuadrícula…) están dentro del propio juego, en el botón ⚙️ de su cabecera.</p>
                    <p class="muted small center st-legal">Nexus Arcade v${esc(Nexus.VERSION)} · <a href="#/privacy">Política de privacidad</a> · <a href="#/terms">Términos y condiciones</a></p>
                </div>`;

            const syncControls = () => {
                $$('[data-setting]', root).forEach(i => { i.checked = !!S().get(i.dataset.setting); });
                $$('[data-range]', root).forEach(r => { r.value = S().get(r.dataset.range); });
            };
            const drawBeta = () => {
                const list = S().BETA.filter(b => S().betaUnlocked(b.id));
                $('#st-beta-list', root).innerHTML = list.length
                    ? list.map(b => `<div class="st-beta-item"><span class="st-beta-ic">${b.icon}</span>${C.switchRow(b.key, b.name + ' · BETA', b.desc)}</div>`).join('')
                    : '<p class="muted small st-beta-none">Aún no has desbloqueado ningún modo BETA.</p>';
                syncControls();
            };

            root.addEventListener('change', (e) => {
                const t = e.target;
                if (t.dataset.setting) { S().set(t.dataset.setting, t.checked); Nexus.audio.play('click'); }
                else if (t.dataset.range) { S().set(t.dataset.range, parseFloat(t.value)); }
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

            drawBeta();
        }
    };
})();
