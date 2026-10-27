"""Tetris Fusion, Pac-Man Nexus y Snake Neón: biblioteca, partida por teclado, fin de partida,
guardado de récord/logros, ajustes y vista móvil.
python3 tests/e2e_arcade.py"""
import pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1366, 'height': 800}); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(m.text))
    page.goto(f'file://{ROOT}/index.html'); page.wait_for_selector('#auth-screen:not([hidden])')
    page.click('#auth-add'); page.fill('#pf-name', 'Tester'); page.click('.modal-buttons .btn-primary'); page.wait_for_selector('#shell:not([hidden])')
    page.evaluate("""() => { for (const id of ['snake','tetris','pacman']) { const g = Nexus.games.registry.get(id); const m = g.mount; g.mount = (r) => (window['__'+id] = m(r)); } }""")

    # Biblioteca
    page.goto(f'file://{ROOT}/index.html#/library'); page.wait_for_timeout(400)
    for gid in ('snake', 'tetris', 'pacman'):
        check(page.locator(f'a.game-card[href="#/game/{gid}"]').count() == 1, f'{gid} disponible en la biblioteca')
    check(page.locator('[data-soon]').count() == 1, 'sólo Pong sigue como "próximamente"')

    # Snake: partida real por teclado
    page.goto(f'file://{ROOT}/index.html#/game/snake'); page.wait_for_timeout(500)
    check(page.locator('.ax-mode').count() == 4, 'Snake: 4 modos')
    page.click('.ax-mode[data-mode=rival]'); page.click('[data-do=start]'); page.wait_for_timeout(200)
    check(page.evaluate('__snake.rivals.length') == 1, 'Snake/Rival: aparece un rival con IA')
    page.keyboard.press('ArrowUp'); page.wait_for_timeout(600)
    check(page.evaluate('__snake.waiting') is False, 'Snake: la partida arranca al pulsar una flecha')
    page.screenshot(path=str(SHOTS / 'snake_rival.png'))
    page.evaluate("__snake.score = 2100; __snake.stats.maxLen = 16; __snake.die('Prueba')"); page.wait_for_timeout(1000)
    check(page.locator('.modal-overlay.active').count() == 1, 'Snake: modal de fin de partida')
    check(page.locator('.unlock-row').count() >= 2, 'Snake: logros desbloqueados al terminar')
    page.screenshot(path=str(SHOTS / 'snake_result.png'))
    page.evaluate("document.querySelector('.modal-overlay.active') && Nexus.ui.modal.closeAll()")
    check(page.evaluate("Nexus.services.progress.stats('snake').byMode.rival.bestScore") == 2100, 'Snake: récord guardado por modo')

    # Zona
    page.evaluate("__snake.newGame('zone'); __snake.waiting=false; __snake.zone.next=0.01; __snake.update(0.05); __snake.zone.next=2")
    page.wait_for_timeout(500); page.screenshot(path=str(SHOTS / 'snake_zone.png'))
    check(page.evaluate('__snake.zone.l') == 1, 'Snake/Zona: la lava avanza')

    # Tetris
    page.goto(f'file://{ROOT}/index.html#/game/tetris'); page.wait_for_timeout(500)
    check(page.locator('.ax-mode').count() == 4, 'Tetris: 4 modos')
    page.click('[data-do=start]'); page.wait_for_timeout(300)
    for k in ['ArrowLeft', 'ArrowUp', 'Space', 'c']: page.keyboard.press(k); page.wait_for_timeout(80)
    check(page.evaluate('__tetris.piecesLocked') >= 1, 'Tetris: la caída directa fija una pieza')
    page.evaluate("__tetris.score = 25000; __tetris.gameOver(false, 'Prueba')"); page.wait_for_timeout(1000)
    check(page.locator('.modal-overlay.active').count() == 1, 'Tetris: modal de fin de partida')
    page.evaluate("Nexus.ui.modal.closeAll()")
    check(page.evaluate("Nexus.services.progress.stats('tetris').bestScore") == 25000, 'Tetris: récord guardado')

    # Pac-Man
    page.goto(f'file://{ROOT}/index.html#/game/pacman'); page.wait_for_timeout(500)
    check(page.locator('.ax-mode').count() == 3, 'Pac-Man: 3 modos')
    page.click('.ax-mode[data-mode=horde]'); page.click('[data-do=start]'); page.wait_for_timeout(2500)
    check(page.locator('.pm-enemy').count() == 8, 'Pac-Man/Horda: 8 tipos de enemigo en el bestiario')
    page.keyboard.press('ArrowLeft'); page.wait_for_timeout(800)
    page.screenshot(path=str(SHOTS / 'pacman_horde.png'))

    # Ajustes y stats
    page.goto(f'file://{ROOT}/index.html#/settings'); page.wait_for_timeout(400)
    check(page.locator('[data-choice="snake.defaultMode"]').count() == 1 and page.locator('[data-choice="tetris.defaultMode"]').count() == 1
          and page.locator('[data-choice="pacman.defaultMode"]').count() == 1, 'Ajustes: secciones de los 3 juegos')
    page.goto(f'file://{ROOT}/index.html#/stats'); page.wait_for_timeout(400)
    check('Snake' in page.inner_text('#view'), 'Estadísticas incluyen Snake')

    # Móvil
    m = b.new_page(viewport={'width': 390, 'height': 800}, has_touch=True, is_mobile=True)
    m.on('pageerror', lambda e: errs.append(str(e)))
    m.goto(f'file://{ROOT}/index.html'); m.wait_for_selector('#auth-screen:not([hidden])')
    m.click('#auth-guest') if m.locator('#auth-guest').count() else None
    m.wait_for_timeout(300)
    if m.locator('#shell:not([hidden])').count() == 0:
        m.click('#auth-add'); m.fill('#pf-name', 'Mov'); m.click('.modal-buttons .btn-primary'); m.wait_for_selector('#shell:not([hidden])')
    m.goto(f'file://{ROOT}/index.html#/game/snake'); m.wait_for_timeout(500)
    m.click('[data-do=start]'); m.wait_for_timeout(300)
    check(m.locator('#sn-touch').is_visible(), 'Snake móvil: controles táctiles visibles')
    m.screenshot(path=str(SHOTS / 'snake_mobile.png'))

    check(not errs, 'sin errores de JS: ' + '; '.join(errs))
    b.close()
print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + ', '.join(bad))
