"""Auditoría F4: interfaz en móvil (390×844, táctil).
Buscaminas girado y con lupa, Tetris con giro antihorario, gestos y columna de reserva, Pac-Man/Snake solo deslizar,
Pasapalabra compacto, mini-mapa de Hundir la flota, Sudoku, 2048, Solitario y Conexiones.
python3 tests/e2e_mobile.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m, flush=True); (not c) and bad.append(m)

def open_game(page, gid):
    page.evaluate("(id) => { const g = Nexus.games.registry.get(id); if (!g.__hooked) { const m = g.mount; g.mount = (r) => (window.__g = m(r)); g.__hooked = true; } }", gid)
    page.goto(URL + '#/home'); page.wait_for_timeout(100)
    page.goto(URL + f'#/game/{gid}'); page.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); register(page, 'Movil')

    # ── Buscaminas ──
    open_game(page, 'minesweeper')
    page.evaluate("__g.newGame('hard')"); page.wait_for_timeout(200)
    check(page.evaluate('__g.rotated') is True, 'buscaminas: 16×30 se gira en vertical')
    first = page.evaluate("[...document.querySelectorAll('#board .cell')].slice(0, 2).map(c => c.dataset.row + ',' + c.dataset.col)")
    check(first == ['0,0', '1,0'], f'buscaminas: girado, la primera fila visual es la columna 0 ({first})')
    check(page.evaluate('__g.cellSize') >= 30 and page.locator('#btn-zoom').is_visible(), 'buscaminas: lupa visible y casillas de 32 px al acercar')
    page.click('#btn-zoom'); page.wait_for_timeout(100)
    check(page.evaluate('__g.cellSize') < 30, 'buscaminas: «Ver todo» encoge el tablero')
    page.click('.stat-mines'); check(page.evaluate('__g.flagMode') is True, 'buscaminas: el contador 🚩 activa el modo bandera')
    page.click('.stat-mines')
    page.evaluate("__g.handleCellClick(5, 5)"); page.wait_for_timeout(100)
    box = page.locator('#powers-container').bounding_box(); bb = page.locator('#board-wrapper').bounding_box()
    check(box['y'] > bb['y'] + bb['height'] - 2, 'buscaminas: los poderes quedan en una barra bajo el tablero')
    page.click('.power-btn[data-power=shield]'); page.wait_for_timeout(80)
    check(page.evaluate("document.querySelector('#board').classList.contains('pw-shield')"), 'buscaminas: el escudo armado se ve en el tablero')
    page.screenshot(path=str(SHOTS / 'mobile_minesweeper.png'))

    # ── Tetris ──
    open_game(page, 'tetris')
    page.click('[data-do=start]'); page.wait_for_timeout(300)
    check(page.locator('#tt-touch [data-act=ccw]').is_visible(), 'tetris: botón de giro antihorario')
    check(page.locator('.tt-mcol').is_visible(), 'tetris: reserva y siguientes junto al tablero')
    r0 = page.evaluate('__g.piece.rot'); page.locator('#tt-touch [data-act=ccw]').tap(); page.wait_for_timeout(60)
    check(page.evaluate('__g.piece.rot') == (r0 + 3) % 4 or page.evaluate("__g.piece.type") == 'O', 'tetris: ⟲ gira al revés')
    st = page.locator('#tt-stage').bounding_box()
    x0 = page.evaluate('__g.piece.x')
    page.evaluate("""([x, y, w]) => { const el = document.querySelector('#tt-stage'); const ev = (t, cx) => el.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: cx, clientY: y, bubbles: true }));
        ev('pointerdown', x); ev('pointermove', x + w / 10 * 2.2); ev('pointerup', x + w / 10 * 2.2); }""", [st['x'] + st['width'] / 2, st['y'] + 100, st['width']])
    check(page.evaluate('__g.piece.x') == x0 + 2, 'tetris: arrastrar mueve la pieza una columna por casilla')
    r1 = page.evaluate('__g.piece.rot')
    page.touchscreen.tap(st['x'] + st['width'] * 0.8, st['y'] + 200); page.wait_for_timeout(60)
    check(page.evaluate('__g.piece.rot') != r1 or page.evaluate("__g.piece.type") == 'O', 'tetris: un toque gira la pieza')

    # ── Pac-Man / Snake ──
    open_game(page, 'pacman')
    page.click('[data-mode=classic]')
    check(page.locator('#pm-powers-card').is_hidden(), 'pac-man clásico: sin ranuras de poder')
    page.click('[data-do=start]'); page.wait_for_timeout(200)
    check(not page.locator('#pm-touch .ax-pad').is_visible(), 'pac-man: por defecto solo deslizar (sin cruceta)')
    page.evaluate("Nexus.services.settings.set('pacman.dpad', true)"); page.wait_for_timeout(60)
    check(page.locator('#pm-touch .ax-pad').is_visible(), 'pac-man: el ajuste muestra la cruceta sobre el tablero')
    page.evaluate("Nexus.services.settings.set('pacman.dpad', false)")

    # ── Pasapalabra ──
    open_game(page, 'pasapalabra')
    check(page.locator('[data-mode=daily] .pp-cal').inner_text() == str(page.evaluate('new Date().getDate()')), 'pasapalabra: icono del diario con el día de hoy')
    page.click('button:has-text("Empezar")'); page.wait_for_timeout(200)
    ring = page.locator('.pp-ring').bounding_box()
    check(ring['height'] < 360, f'pasapalabra: rosco más pequeño en móvil ({ring["height"]:.0f}px)')
    play = page.locator('.pp-play').bounding_box()
    check(play['y'] < 844, 'pasapalabra: la definición queda a la vista')
    page.screenshot(path=str(SHOTS / 'mobile_pasapalabra.png'))

    # ── Hundir la flota ──
    open_game(page, 'battleship')
    page.click('[data-do=go-cpu]'); page.click('[data-do=start]'); page.click('[data-dock=random]'); page.click('[data-dock=ready]'); page.wait_for_timeout(300)
    check(page.locator('#bs-minimap').is_visible() and page.locator('#bs-minimap i.s').count() == 17, 'flota: mini-mapa con tu flota junto al tablero enemigo')
    page.evaluate('__g.playerFire(0)'); page.wait_for_timeout(2600)
    check(page.locator('#bs-minimap i.last').count() == 1, 'flota: el mini-mapa marca el último disparo rival')

    # ── 2048, Sudoku, Conexiones ──
    open_game(page, 'g2048'); page.click('[data-do=new]'); page.wait_for_timeout(200)
    ub = page.locator('#g2-undo').bounding_box(); gb = page.locator('#g2-board').bounding_box()
    check(ub['y'] > gb['y'] + gb['height'], '2048: Deshacer bajo el tablero')
    open_game(page, 'sudoku'); page.click('[data-do=new]'); page.wait_for_timeout(300)
    ys = page.evaluate("[...document.querySelectorAll('.sd-tools .btn')].map(b => Math.round(b.getBoundingClientRect().top))")
    check(len(set(ys)) == 1, 'sudoku: herramientas en una sola fila')
    open_game(page, 'connections'); page.click('[data-do=new]'); page.wait_for_timeout(300)
    check(page.evaluate("[...document.querySelectorAll('.cx-tile')].every(t => t.scrollWidth <= t.clientWidth + 1)"), 'conexiones: ninguna palabra se sale de su casilla')
    page.screenshot(path=str(SHOTS / 'mobile_connections.png'))

    b.close()
check(not errs, 'sin errores de JS: ' + '; '.join(errs[:3]))
print('\nRESULT:', 'OK' if not bad else f'{len(bad)} FAIL(S)')
sys.exit(1 if bad else 0)
