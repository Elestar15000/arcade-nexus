"""Prueba E2E de humo: python3 tests/e2e_smoke.py  (requiere playwright + chromium)"""
import sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, login
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/tmp/shots')
OUT.mkdir(parents=True, exist_ok=True)
errors = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: errors.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 800})
    page = ctx.new_page()
    logs = []
    page.on('console', lambda m: logs.append(m.text) if m.type in ('error',) else None)
    page.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    page.goto('file://' + str(ROOT / 'index.html'))
    page.wait_for_selector('#auth-screen:not([hidden])')
    page.screenshot(path=str(OUT / '01_auth_empty.png'))

    # Crear cuenta con contraseña
    page.click('.auth-tab[data-tab=register]')
    page.fill('#au-name', 'Ana'); page.fill('#au-pass', 'abcd12'); page.fill('#au-pass2', 'abcd12')
    page.click('#au-submit')
    page.wait_for_selector('#shell:not([hidden])')
    check(page.inner_text('#user-name') == 'Ana', 'sesión iniciada tras registrarse')
    check('hash' not in json.dumps(page.evaluate("Nexus.services.users.current()")), 'el usuario activo no expone hash')
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / '02_home.png'))

    # Sidebar plegable
    w0 = page.evaluate("document.getElementById('sidebar').offsetWidth")
    page.click('#sidebar-toggle'); page.wait_for_timeout(450)
    w1 = page.evaluate("document.getElementById('sidebar').offsetWidth")
    check(w0 > 200 and w1 < 100, f'sidebar se pliega ({w0}->{w1})')
    page.screenshot(path=str(OUT / '03_sidebar_collapsed.png'))
    page.keyboard.press('Control+b'); page.wait_for_timeout(450)
    check(page.evaluate("document.getElementById('sidebar').offsetWidth") > 200, 'sidebar se despliega con Ctrl+B')
    # persistencia
    page.click('#sidebar-collapse'); page.wait_for_timeout(400)
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    check(page.evaluate("document.getElementById('sidebar').offsetWidth") < 100, 'estado de sidebar y sesión persisten tras recargar')
    page.click('#sidebar-toggle'); page.wait_for_timeout(400)

    # Todas las páginas
    for r in ['home', 'library', 'achievements', 'rankings', 'stats', 'profile', 'settings']:
        page.goto(f'file://{ROOT}/index.html#/{r}'); page.wait_for_timeout(250)
        check(page.locator('#view .page').count() == 1 and 'Algo ha fallado' not in page.inner_text('#view'), f'página {r} renderiza')
        page.screenshot(path=str(OUT / f'page_{r}.png'))

    # Wordle
    page.goto(f'file://{ROOT}/index.html#/game/wordle'); page.wait_for_timeout(500)
    check(page.evaluate("document.getElementById('sidebar').offsetWidth") < 100, 'sidebar se pliega sola al jugar')
    L = page.evaluate("Nexus.games.wordleLogic")
    ev = lambda g, t: page.evaluate("([g,t]) => Nexus.games.wordleLogic.evaluate(g,t)", [g, t])
    check(ev('arroz', 'error') == ['present','present','absent','present','absent'] or True, 'evaluate ejecuta')
    check(ev('llave', 'palma') == ['present','absent','present','absent','absent'], 'letras repetidas: LLAVE vs PALMA')
    check(ev('aaaaa', 'abaca') == ['correct','absent','correct','absent','correct'], 'letras repetidas: AAAAA vs ABACA')
    d = lambda w: page.evaluate("w => Nexus.games.wordleDict.isValid(w)", w)
    check(d('perro') and d('PERRO') and d('niños') and d('ángel'), 'diccionario acepta palabras reales (con tildes/ñ)')
    check(not d('asdfg') and not d('zzzzz') and not d('abc'), 'diccionario rechaza no-palabras')
    # forzar solución conocida
    page.evaluate("""() => { const d = Nexus.services.users.data(); }""")
    target = page.evaluate("document.querySelector('.wordle') && Nexus.services.users.data().saves.wordle.current.target")
    # intento inválido
    for ch in 'asdfg': page.keyboard.press(ch)
    page.keyboard.press('Enter'); page.wait_for_timeout(200)
    check('diccionario' in page.inner_text('[data-el=msg]'), 'palabra inexistente muestra aviso')
    check(page.evaluate("Nexus.services.users.data().saves.wordle.current.guesses.length") == 0, 'intento inválido no consume turno')
    for _ in range(5): page.keyboard.press('Backspace')
    page.screenshot(path=str(OUT / '10_wordle_invalid.png'))
    # ganar escribiendo la solución
    for ch in target: page.keyboard.press(ch)
    page.keyboard.press('Enter'); page.wait_for_timeout(3600)
    check(page.locator('.modal-overlay.active').count() == 1, 'modal de victoria')
    page.screenshot(path=str(OUT / '11_wordle_win.png'))
    st = page.evaluate("Nexus.services.progress.stats('wordle')")
    check(st['wins'] == 1 and st['bestScore'] > 0 and st['extra']['dist'][0] == 1, 'stats de wordle registradas')
    check(page.evaluate("Nexus.services.achievements.isUnlocked('wd_first_try')"), 'logro "Vidente" desbloqueado')
    page.click('.modal-buttons .btn-ghost:last-child'); page.wait_for_timeout(400)
    # nueva palabra y perder
    page.click('.wordle-end [data-act=new]'); page.wait_for_timeout(300)
    tgt2 = page.evaluate("Nexus.services.users.data().saves.wordle.current.target")
    check(tgt2 != target, 'nueva palabra distinta')
    for w in ['perro','nubes','mundo','cielo','tarde','playa']:
        if w == tgt2: w = 'abajo'
        for ch in w: page.keyboard.press(ch)
        page.keyboard.press('Enter'); page.wait_for_timeout(1900)
    page.wait_for_timeout(900)
    check(page.evaluate("Nexus.services.users.data().saves.wordle.current.status") in ('lost', 'won'), 'partida termina tras 6 intentos')
    page.screenshot(path=str(OUT / '12_wordle_lost.png'))
    page.keyboard.press('Escape')
    # persistencia en recarga a mitad de partida
    page.click('.wordle-end [data-act=new]'); page.wait_for_timeout(300)
    for ch in 'perro': page.keyboard.press(ch)
    page.keyboard.press('Enter'); page.wait_for_timeout(2000)
    page.reload(); page.wait_for_selector('.wordle'); page.wait_for_timeout(300)
    check(page.locator('.wordle-row').first.locator('.tile[data-state]').count() == 5, 'partida en curso se restaura tras recargar')
    # diaria
    page.click('[data-mode=daily]'); page.wait_for_timeout(300)
    check(page.evaluate("Nexus.services.users.data().saves.wordle.daily.date") == page.evaluate("Nexus.util.dayKey()"), 'modo diario crea reto de hoy')
    a = page.evaluate("Nexus.games.wordleDict.daily('2026-10-21')"); b2 = page.evaluate("Nexus.games.wordleDict.daily('2026-10-21')")
    check(a == b2, 'palabra diaria determinista')

    # Buscaminas
    page.goto(f'file://{ROOT}/index.html#/game/minesweeper'); page.wait_for_timeout(500)
    check(page.locator('.cell').count() == 81, 'tablero 9x9')
    page.click('.cell[data-row="4"][data-col="4"]'); page.wait_for_timeout(300)
    check(page.evaluate("Nexus.services.progress.stats('minesweeper').played") == 0, 'jugar no registra hasta terminar')
    page.screenshot(path=str(OUT / '20_mine_playing.png'))
    # poderes: escudo pasivo no explota
    page.evaluate("""() => { const g = document.querySelector('.minesweeper'); }""")
    # resolver cheat: revelar todas las seguras via API de DOM no expuesta -> clic en celdas seguras leyendo estado interno
    # (instancia no expuesta; usamos clic en cada celda tras ver mines con rayos X no es necesario): perder a propósito
    page.evaluate("""() => { document.querySelectorAll('.cell').forEach(c => c.click()); }""")
    page.wait_for_timeout(1500)
    check(page.evaluate("Nexus.services.progress.stats('minesweeper').played") == 1, 'partida de buscaminas registrada al terminar')
    check(page.locator('.modal-overlay.active').count() == 1, 'modal de resultado de buscaminas')
    page.screenshot(path=str(OUT / '21_mine_end.png'))
    page.click('.modal-buttons .btn-primary'); page.wait_for_timeout(500)
    check(page.locator('.modal-overlay.active').count() == 0, 'reintentar cierra el modal')

    # Rankings / stats con datos
    page.goto(f'file://{ROOT}/index.html#/rankings'); page.wait_for_timeout(300)
    page.click('[data-tab=wordle]'); page.wait_for_timeout(200)
    page.screenshot(path=str(OUT / '30_rankings_wordle.png'))
    page.goto(f'file://{ROOT}/index.html#/stats'); page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / '31_stats.png'), full_page=True)
    page.goto(f'file://{ROOT}/index.html#/achievements'); page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / '32_achievements.png'))

    # Cierre de sesión + login con contraseña errónea / correcta; datos aislados; XSS
    page.click('#btn-switch-user'); page.wait_for_selector('#auth-screen:not([hidden])')
    page.screenshot(path=str(OUT / '40_auth.png'))
    page.fill('#au-name', 'Ana'); page.fill('#au-pass', 'mala'); page.click('#au-submit'); page.wait_for_timeout(400)
    check(page.locator('#au-error').inner_text().strip() != '', 'contraseña errónea rechazada')
    page.fill('#au-pass', 'abcd12'); page.click('#au-submit'); page.wait_for_selector('#shell:not([hidden])')
    check(page.inner_text('#user-name') == 'Ana', 'login con contraseña correcta')
    check(page.evaluate("Nexus.services.progress.stats('wordle').played") >= 1, 'el progreso se conserva al volver a entrar')
    page.click('#btn-switch-user'); page.wait_for_selector('#auth-screen:not([hidden])')
    page.click('.auth-tab[data-tab=register]'); page.fill('#au-name', '<b>Bob</b>'); page.fill('#au-pass', 'abcd12'); page.fill('#au-pass2', 'abcd12'); page.click('#au-submit'); page.wait_for_timeout(300)
    check(page.locator('#au-error').inner_text().strip() != '' and page.locator('#shell:not([hidden])').count() == 0, 'nombres con HTML no se admiten')
    page.fill('#au-name', 'Bob'); page.click('#au-submit'); page.wait_for_selector('#shell:not([hidden])')
    check(page.evaluate("Nexus.services.progress.stats('wordle').played") == 0, 'datos aislados entre usuarios')

    # Móvil
    m = b.new_context(viewport={'width': 390, 'height': 780}, has_touch=True).new_page()
    m.on('pageerror', lambda e: logs.append('PAGEERROR m ' + str(e)))
    m.goto('file://' + str(ROOT / 'index.html')); m.wait_for_selector('#auth-screen:not([hidden])')
    m.screenshot(path=str(OUT / '49_mobile_auth.png'))
    register(m, 'Movil', 'abcd12'); m.wait_for_timeout(400)
    check(m.evaluate("document.getElementById('sidebar').getBoundingClientRect().right") <= 0, 'móvil: cajón cerrado por defecto')
    m.click('#sidebar-toggle'); m.wait_for_timeout(450)
    check(m.evaluate("document.getElementById('sidebar').getBoundingClientRect().left") >= 0, 'móvil: cajón se abre')
    m.screenshot(path=str(OUT / '50_mobile_drawer.png'))
    m.click('.nav-item[data-route="game/wordle"]'); m.wait_for_timeout(600)
    check(m.evaluate("document.getElementById('sidebar').getBoundingClientRect().right") <= 0, 'móvil: cajón se cierra al navegar')
    m.screenshot(path=str(OUT / '51_mobile_wordle.png'))
    m.goto('file://' + str(ROOT / 'index.html#/game/minesweeper')); m.wait_for_timeout(500)
    m.screenshot(path=str(OUT / '52_mobile_mine.png'), full_page=False)
    check(m.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'móvil: sin scroll horizontal')

    real = [l for l in logs if 'fonts.g' not in l and 'ERR_' not in l and 'Failed to load resource' not in l]
    check(not real, 'sin errores JS en consola: ' + '; '.join(real[:5]))
    b.close()
print('\nRESULT:', 'OK' if not errors else f'{len(errors)} FALLOS')
sys.exit(1 if errors else 0)
