/* ============================================================
   NEXUS ARCADE · ui/game-settings.js
   Ajustes propios de cada juego, dentro del juego: botón ⚙️ en
   su cabecera que abre un panel con sus opciones. (La página de
   Ajustes sólo tiene los ajustes generales.)
   ============================================================ */
(function () {
    'use strict';

    const C = Nexus.ui.components;
    const S = () => Nexus.services.settings;
    const sw = (key, title, desc) => ({ type: 'switch', key, title, desc });
    const PUBLIC_ROOMS = sw('online.publicRooms', 'Salas públicas por defecto', 'Las salas que crees aparecerán en el buscador de partidas');

    const DEFS = {
        minesweeper: [sw('minesweeper.longPressFlag', 'Pulsación larga para poner bandera', 'En pantallas táctiles')],
        wordle: [
            sw('wordle.hardMode', 'Modo difícil', 'Debes usar todas las pistas reveladas en los siguientes intentos'),
            sw('wordle.colorblind', 'Alto contraste (daltonismo)', 'Naranja y azul en lugar de verde y amarillo')
        ],
        tetris: [sw('tetris.ghost', 'Pieza fantasma', 'Muestra dónde caerá la pieza')],
        snake: [sw('snake.grid', 'Mostrar cuadrícula', 'Ayuda a calcular distancias')],
        pong: [
            sw('pong.shake', 'Sacudida de pantalla', 'En golpes fuertes, remates y puntos'),
            sw('pong.publicRooms', 'Salas públicas por defecto', 'Las salas que crees aparecerán en el buscador de partidas')
        ],
        chess: [sw('chess.showLegal', 'Marcar jugadas legales', 'Al elegir una pieza se señalan sus casillas de destino'), PUBLIC_ROOMS],
        battleship: [PUBLIC_ROOMS]
    };

    function open(gameId) {
        const defs = DEFS[gameId]; if (!defs) return;
        const game = Nexus.games.registry.get(gameId);
        const body = document.createElement('div');
        body.className = 'game-settings';
        body.innerHTML = defs.map(d => d.type === 'switch' ? C.switchRow(d.key, d.title, d.desc) : C.choiceRow(d.key, d.title, d.desc, d.options)).join('')
            + `<p class="muted small">Sonido, tema y animaciones están en <a href="#/settings">Ajustes</a>.</p>`;
        const sync = () => {
            body.querySelectorAll('[data-setting]').forEach(i => { i.checked = !!S().get(i.dataset.setting); });
            body.querySelectorAll('[data-choice]').forEach(g => g.querySelectorAll('[data-value]').forEach(b => {
                const on = b.dataset.value === S().get(g.dataset.choice);
                b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on));
            }));
        };
        body.addEventListener('change', (e) => { const t = e.target; if (t.dataset.setting) { S().set(t.dataset.setting, t.checked); Nexus.audio.play('click'); } });
        body.addEventListener('click', (e) => {
            const b = e.target.closest('[data-choice] [data-value]');
            if (b) { S().set(b.closest('[data-choice]').dataset.choice, b.dataset.value); sync(); Nexus.audio.play('click'); }
            if (e.target.closest('a[href="#/settings"]')) m.close();
        });
        sync();
        const m = Nexus.ui.modal.open({ title: `Ajustes · ${game ? game.name : ''}`, icon: '⚙️', className: 'modal-sm', body, actions: [{ label: 'Listo', kind: 'primary' }] });
        return m;
    }

    /** Añade el botón ⚙️ a la cabecera del juego (si el juego tiene ajustes propios). */
    function attach(root, gameId) {
        if (!DEFS[gameId]) return;
        const header = root.querySelector('.game-header');
        if (!header || header.querySelector('.game-settings-btn')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'game-settings-btn';
        btn.title = 'Ajustes del juego';
        btn.setAttribute('aria-label', 'Ajustes del juego');
        btn.textContent = '⚙️';
        btn.addEventListener('click', (e) => { e.currentTarget.blur(); open(gameId); });
        const stats = header.querySelector('.game-header-stats');
        if (stats) stats.appendChild(btn); else header.appendChild(btn);
    }

    Nexus.ui.gameSettings = { open, attach, DEFS };
})();
