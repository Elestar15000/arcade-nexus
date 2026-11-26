"""Modos BETA del Ajedrez: desbloqueo con código en Ajustes, «Casillas peligrosas» (punto rojo si el rival puede
capturar) y «Jugada recomendada» (la CPU mira 3 respuestas del rival), contra la máquina y online, activándolos y
desactivándolos a mitad de partida. Arranca dos brokers MQTT locales.
python3 tests/e2e_chess_beta.py"""
import pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
PORTS = (18871, 18872)
BROKERS = [f'ws://localhost:{p}' for p in PORTS]
URL = f'file://{ROOT}/index.html'
HOOK = """() => { const g = Nexus.games.registry.get('chess'); const m = g.mount; g.mount = (r) => (window.__c = m(r)); }"""
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)
brokers = [subprocess.Popen(['node', str(ROOT / 'tests/mqtt_test_broker.mjs'), str(p)], stdout=subprocess.DEVNULL) for p in PORTS]
time.sleep(0.6)

def player(browser, name, errs):
    page = browser.new_context(viewport={'width': 1366, 'height': 860}).new_page()
    page.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(f'{name}: {m.text}'))
    local_mode(page, BROKERS)
    page.goto(URL); register(page, name, 'secreta1'); page.evaluate(HOOK)
    return page

def open_game(page, suffix=''):
    if page.evaluate('location.hash').startswith('#/game/'): page.goto(URL + '#/home'); page.wait_for_timeout(150)
    page.goto(URL + '#/game/chess' + suffix); page.wait_for_timeout(400)

def sq(page, name):
    page.evaluate("document.querySelectorAll('.toast').forEach(e => e.remove())")   # que ningún aviso tape el tablero
    bb = page.locator('#ch-board').bounding_box(); f = 'abcdefgh'.index(name[0]); r = int(name[1]) - 1
    x, y = (7 - f, r) if page.evaluate('__c.flipped') else (f, 7 - r)
    return bb['x'] + (x + .5) * bb['width'] / 8, bb['y'] + (y + .5) * bb['height'] / 8

def set_fen(page, fen):
    page.evaluate("""(fen) => { const C = Nexus.games.ChessCore(); __c.thinkSeq++; __c.thinking = false; __c.state = 'playing'; __c.startFen = fen; __c.pos = C.Position.fromFen(fen);
        __c.moves = []; __c.sans = []; __c.lastMove = null; __c.selected = -1; __c.hint = null; __c.renderBoard(); __c.updateSide(); }""", fen)

def marked(page, cls):
    return sorted(page.evaluate(f"""[...document.querySelectorAll('.ch-sq.{cls}')].map(e => 'abcdefgh'[e.dataset.sq & 7] + ((e.dataset.sq >> 4) + 1))"""))

def unlock(page, code):
    page.goto(URL + '#/settings'); page.wait_for_selector('#st-beta-form')
    page.fill('#st-beta-code', code); page.click('#st-beta-form button[type=submit]'); page.wait_for_timeout(250)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
        errs = []
        A = player(b, 'Ana', errs)

        # ── Sin desbloquear: nada de BETA ──
        open_game(A); A.click('[data-do=go-cpu]'); A.click('.ax-mode[data-mode=normal]'); A.click('[data-color=white]'); A.click('[data-do=start]'); A.wait_for_timeout(300)
        check(A.locator('#ch-beta').is_hidden(), 'sin códigos: no hay tarjeta BETA en el ajedrez')
        A.click('.game-settings-btn'); A.wait_for_timeout(250)
        check(A.locator('.modal-overlay.active [data-setting="chess.betaDanger"]').count() == 0, 'sin códigos: el ⚙️ del juego no muestra modos BETA')
        A.keyboard.press('Escape'); A.wait_for_timeout(150)
        set_fen(A, '4k3/8/8/8/8/4n3/8/3QK3 w - - 0 1')
        A.mouse.click(*sq(A, 'd1')); A.wait_for_timeout(100)
        check(len(marked(A, 'ch-dot')) > 10 and len(marked(A, 'ch-danger')) == 0, 'sin códigos: puntos normales, sin rojo')
        A.evaluate("__c.state = 'over'; __c.save()")

        # ── Ajustes: códigos ──
        unlock(A, 'NOVALE1')
        check(A.locator('.st-beta-item').count() == 0, 'código incorrecto: no desbloquea nada')
        unlock(A, 'muert3')
        check(A.evaluate("Nexus.services.settings.betaOn('chess-danger')") and not A.evaluate("Nexus.services.settings.betaUnlocked('chess-hint')"), 'MUERT3 desbloquea y activa «Casillas peligrosas»')
        unlock(A, 'PR0')
        check(A.evaluate("Nexus.services.settings.betaOn('chess-hint')"), 'PR0 desbloquea y activa «Jugada recomendada»')
        check(A.locator('.st-beta-item').count() == 2, 'Ajustes: los dos modos BETA con su interruptor')
        A.screenshot(path=str(SHOTS / 'beta_settings.png'), full_page=True)
        A.locator('.st-beta-item').nth(1).locator('.switch').click(); A.wait_for_timeout(100)
        check(not A.evaluate("Nexus.services.settings.betaOn('chess-hint')") and A.evaluate("Nexus.services.settings.betaUnlocked('chess-hint')"), 'Ajustes: se puede desactivar sin perder el desbloqueo')
        A.locator('.st-beta-item').nth(1).locator('.switch').click(); A.wait_for_timeout(100)
        A.evaluate("Nexus.services.settings.reset()")
        check(A.evaluate("Nexus.services.settings.betaUnlocked('chess-danger') && Nexus.services.settings.betaUnlocked('chess-hint')"), 'restablecer ajustes no vuelve a bloquear los BETA')
        A.evaluate("Nexus.services.settings.set('chess.betaDanger', true); Nexus.services.settings.set('chess.betaHint', false)")

        # ── Contra la máquina: casillas peligrosas ──
        open_game(A); A.click('[data-do=go-cpu]'); A.click('.ax-mode[data-mode=normal]'); A.click('[data-color=white]'); A.click('[data-do=start]'); A.wait_for_timeout(300)
        check(A.locator('#ch-beta').is_visible() and A.locator('.ch-beta-btn').count() == 2, 'tarjeta BETA con los dos interruptores')
        set_fen(A, '4k3/pp6/8/8/8/4n3/7P/3QK3 w - - 0 1')
        A.mouse.click(*sq(A, 'd1')); A.wait_for_timeout(100)
        check(marked(A, 'ch-danger') == ['c2', 'd5', 'd7', 'd8', 'g4'], f'punto rojo donde el rival captura la dama: {marked(A, "ch-danger")}')
        check(all(s in marked(A, 'ch-dot') and s not in marked(A, 'ch-danger') for s in ['d2', 'e2', 'h5', 'b3']), 'las casillas seguras siguen con punto normal')
        A.screenshot(path=str(SHOTS / 'beta_danger.png'))
        A.mouse.click(*sq(A, 'c2')); A.wait_for_function('__c.moves.length >= 1', timeout=4000)
        check(A.evaluate('__c.moves[0]') == 'd1c2', 'se puede mover igualmente a una casilla roja')
        A.wait_for_function('__c.moves.length === 2', timeout=8000)
        check(A.evaluate("__c.moves[1].endsWith('c2')"), 'la CPU captura la dama colgada')
        # Ataque en passant: el peón que avanza dos casillas puede ser capturado al paso
        set_fen(A, '4k3/8/8/8/5p2/8/4P3/4K3 w - - 0 1')
        A.mouse.click(*sq(A, 'e2')); A.wait_for_timeout(100)
        check(marked(A, 'ch-danger') == ['e3', 'e4'], f'peligro también por captura al paso: {marked(A, "ch-danger")}')
        # Se desactiva a mitad de partida
        A.click('.ch-beta-btn[data-beta="chess.betaDanger"]'); A.wait_for_timeout(150)
        check(len(marked(A, 'ch-danger')) == 0 and len(marked(A, 'ch-dot')) == 2, 'desactivado a mitad de partida: vuelven los puntos normales')

        # ── Contra la máquina: jugada recomendada ──
        set_fen(A, '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1')
        A.click('.ch-beta-btn[data-beta="chess.betaHint"]')
        A.wait_for_function("__c.hint && __c.hint.move", timeout=8000)
        check(A.evaluate('__c.hint.move') == 'a1a8', 'recomendación: encuentra el mate en una (Ta8#)')
        A.wait_for_timeout(100)
        check(A.locator('#ch-arrows line').count() == 1 and marked(A, 'ch-hint-from') == ['a1'] and marked(A, 'ch-hint-to') == ['a8'], 'flecha y casillas de la jugada recomendada')
        check('Ta8' in A.inner_text('#ch-beta'), 'la tarjeta explica la jugada en notación (Ta8)')
        A.screenshot(path=str(SHOTS / 'beta_hint_mate.png'))
        set_fen(A, '7k/8/8/3q4/8/8/3R4/K7 w - - 0 1')
        A.wait_for_function("__c.hint && __c.hint.move", timeout=8000)
        check(A.evaluate('__c.hint.move') == 'd2d5', 'recomendación: gana la dama colgada (Txd5)')
        A.evaluate("__c.commit(__c.pos.fromUci('d2d4'), 'me')"); A.wait_for_timeout(50)
        check(A.locator('#ch-arrows line').count() == 0, 'durante el turno de la CPU no hay recomendación')
        A.wait_for_function('__c.moves.length === 2 && __c.hint && __c.hint.move', timeout=12000)
        check(A.evaluate("__c.pos.fromUci(__c.hint.move) !== 0"), 'tras responder la CPU, nueva recomendación legal')
        A.click('.ch-beta-btn[data-beta="chess.betaHint"]'); A.wait_for_timeout(150)
        check(A.locator('#ch-arrows line').count() == 0 and 'Te recomiendo' not in A.inner_text('#ch-beta'), 'recomendación desactivada a mitad de partida')
        A.click('.game-settings-btn'); A.wait_for_timeout(250)
        check(A.locator('.modal-overlay.active [data-setting="chess.betaDanger"]').count() == 1 and A.locator('.modal-overlay.active [data-setting="chess.betaHint"]').count() == 1, 'el ⚙️ del juego también tiene los BETA')
        A.keyboard.press('Escape'); A.wait_for_timeout(150)
        A.evaluate("Nexus.services.settings.set('chess.betaHint', true); Nexus.services.settings.set('chess.betaDanger', true)")

        # ── Online ──
        B = player(b, 'Bruno', errs)
        A.evaluate("__c.state = 'over'; __c.save()"); open_game(A); open_game(B)
        A.click('[data-do=go-online]'); B.click('[data-do=go-online]')
        A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
        A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
        code = A.evaluate('__c.lobby.code')
        B.wait_for_selector(f'[data-ol-do=join][data-code="{code}"]', timeout=8000); B.click(f'[data-ol-do=join][data-code="{code}"]')
        A.wait_for_selector('.ol-seats', timeout=15000); B.wait_for_selector('.ol-seats', timeout=15000)
        B.click('[data-ol-do=ready]'); A.wait_for_function('__c.lobby.net.ready[1]', timeout=6000); A.click('[data-ol-do=ready]')
        A.wait_for_function("__c.state === 'playing' && __c.kind === 'online'", timeout=8000); B.wait_for_function("__c.state === 'playing' && __c.kind === 'online'", timeout=8000)
        check(B.locator('#ch-beta').is_hidden(), 'online: quien no tiene códigos no ve los BETA')
        if A.evaluate('__c.myColor') != 0:   # que A (con BETA) juegue con blancas para probar en su turno
            B.mouse.click(*sq(B, 'g1')); B.mouse.click(*sq(B, 'f3')); A.wait_for_function('__c.moves.length === 1', timeout=6000)
        A.wait_for_function("__c.hint && __c.hint.move", timeout=8000)
        check(A.evaluate("__c.pos.fromUci(__c.hint.move) !== 0") and A.locator('#ch-arrows line').count() == 1, 'online: recomendación en tu turno')
        A.click('.ch-beta-btn[data-beta="chess.betaHint"]'); A.wait_for_timeout(100)
        check(A.locator('#ch-arrows line').count() == 0, 'online: se desactiva a mitad de partida')
        A.click('.ch-beta-btn[data-beta="chess.betaHint"]'); A.wait_for_timeout(100)
        n0 = A.evaluate('__c.moves.length')
        # e4 y el rival pone un caballo que ataca d5 / f5
        mine = 'e2' if A.evaluate('__c.myColor') == 0 else 'e7'
        A.mouse.click(*sq(A, mine)); A.wait_for_timeout(100)
        exp = [] if mine == 'e2' else ['e5']   # con negras, tras 1.Cf3 la casilla e5 está atacada por el caballo
        check(len(marked(A, 'ch-dot')) == 2 and marked(A, 'ch-danger') == exp, f'online: peón de rey, rojo solo donde ataca el rival {marked(A, "ch-danger")}')
        A.mouse.click(*sq(A, 'e4' if mine == 'e2' else 'e5'))
        B.wait_for_function(f'__c.moves.length === {n0 + 1}', timeout=6000)
        if mine == 'e2':
            B.mouse.click(*sq(B, 'g8')); B.mouse.click(*sq(B, 'f6'))
        else:
            B.mouse.click(*sq(B, 'g2')); B.mouse.click(*sq(B, 'g3'))
        A.wait_for_function(f'__c.moves.length === {n0 + 2}', timeout=6000); A.wait_for_timeout(100)
        if mine == 'e2':
            A.mouse.click(*sq(A, 'd1')); A.wait_for_timeout(100)
            check('h5' in marked(A, 'ch-danger') and 'g4' in marked(A, 'ch-danger') and 'e2' not in marked(A, 'ch-danger'), f'online: dama con casillas rojas (Ch5, Cg4): {marked(A, "ch-danger")} {marked(A, "ch-dot")} {A.evaluate("[__c.moves, __c.selected, __c.canMove()]")}')
        A.screenshot(path=str(SHOTS / 'beta_online.png'))

        real = [e for e in errs if 'fonts.g' not in e]
        check(not real, 'sin errores de JavaScript' + ('' if not real else ': ' + ' | '.join(real[:5])))
        b.close()
finally:
    for pr in brokers: pr.terminate()

print('\n' + ('TODO OK' if not bad else f'{len(bad)} FALLOS'))
sys.exit(1 if bad else 0)
