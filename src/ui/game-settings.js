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
        snake: [sw('snake.grid', 'Mostrar cuadrícula', 'Ayuda a calcular distancias'), sw('snake.dpad', 'Cruceta en pantalla', 'En móvil, además de deslizar sobre el tablero')],
        pacman: [sw('pacman.dpad', 'Cruceta en pantalla', 'En móvil, además de deslizar sobre el tablero')],
        pong: [
            { type: 'choice', key: 'pong.target', title: 'Puntos para ganar', desc: 'Siempre con 2 de ventaja', options: [{ value: '7', label: '7' }, { value: '11', label: '11' }, { value: '21', label: '21' }] },
            sw('pong.shake', 'Sacudida de pantalla', 'En golpes fuertes, remates y puntos'),
            sw('pong.publicRooms', 'Salas públicas por defecto', 'Las salas que crees aparecerán en el buscador de partidas')
        ],
        pasapalabra: [sw('pasapalabra.contest', 'Modo Concurso', '180 s de reloj que se para mientras lees cada definición')],
        sudoku: [sw('sudoku.checkAtEnd', 'Comprobar al terminar', 'Sin marcar errores al momento ni límite de 3: se comprueba al llenar el tablero')],
        solitaire: [sw('solitaire.autoFound', 'Subida automática segura', 'Ases, doses y cartas que ya no hacen falta suben solas a la fundación')],
        mentiroso: [{ type: 'choice', key: 'mentiroso.variant', title: 'Variante', desc: 'Lo elige quien crea la mesa', options: [{ value: 'same', label: 'Mismo número' }, { value: 'next', label: 'Mismo o siguiente' }, { value: 'up', label: 'Ascendente' }] }],
        poker: [
            { type: 'choice', key: 'poker.blinds', title: 'Ciegas', desc: 'Lo elige quien crea la mesa', options: [{ value: 'fast', label: 'Torneo rápido' }, { value: 'slow', label: 'Torneo lento' }, { value: 'fixed', label: 'Fijas' }] },
            sw('poker.autoMuck', 'Tirar la mano perdedora', 'En el showdown, si no puedes ganar a lo enseñado, tiras sin mostrar')
        ],
        brisca: [sw('brisca.showScore', 'Marcador visible', 'Ver los puntos durante la mano (en la mesa real se cuentan de memoria)')],
        guinote: [sw('guinote.partnerCante', 'Canta la pareja', 'También puede cantar el compañero de quien gana la baza')],
        chess: [sw('chess.showLegal', 'Marcar jugadas legales', 'Al elegir una pieza se señalan sus casillas de destino'),
            Object.assign(sw('chess.betaDanger', '🧪 BETA · Casillas peligrosas', 'Punto rojo donde el rival podría capturar la pieza'), { beta: 'chess-danger' }),
            Object.assign(sw('chess.betaHint', '🧪 BETA · Jugada recomendada', 'La CPU te sugiere una jugada mirando 3 respuestas del rival'), { beta: 'chess-hint' }),
            PUBLIC_ROOMS],
        battleship: [PUBLIC_ROOMS],
        billiards: [sw('billiards.guide', 'Guía larga', 'Muestra hacia dónde saldrán la bola objetivo y la blanca, y el rebote en la banda'), PUBLIC_ROOMS]
    };

    function open(gameId) {
        const defs = (DEFS[gameId] || []).filter(d => !d.beta || S().betaUnlocked(d.beta)); if (!defs.length) return;
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
