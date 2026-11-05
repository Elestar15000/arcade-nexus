"""Ajedrez y Hundir la flota: contra la máquina y online entre dos navegadores (vestíbulo compartido,
jugadas sincronizadas, resincronización, tablas, rendición, revancha, verificación anti-trampas y abandono).
Arranca dos brokers MQTT locales (tests/mqtt_test_broker.mjs), así que no necesita Internet.
python3 tests/e2e_turnbased.py"""
import pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
PORTS = (18861, 18862)
BROKERS = [f'ws://localhost:{p}' for p in PORTS]
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

HOOK = """() => { for (const [id, v] of [['chess', '__c'], ['battleship', '__b']]) { const g = Nexus.games.registry.get(id); const m = g.mount; g.mount = (r) => (window[v] = m(r)); } }"""
brokers = [subprocess.Popen(['node', str(ROOT / 'tests/mqtt_test_broker.mjs'), str(p)], stdout=subprocess.DEVNULL) for p in PORTS]
time.sleep(0.6)

def player(browser, name, errs, relay=False, mobile=False):
    ctx = browser.new_context(**({'viewport': {'width': 390, 'height': 840}, 'has_touch': True, 'is_mobile': True} if mobile else {'viewport': {'width': 1366, 'height': 860}}))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(f'{name}: {m.text}'))
    local_mode(page, BROKERS, relay)
    page.goto(URL); register(page, name, 'secreta1')
    page.evaluate(HOOK)
    return page

def open_game(page, gid, suffix=''):
    if page.evaluate('location.hash').startswith('#/game/'): page.goto(URL + '#/home'); page.wait_for_timeout(150)
    page.goto(URL + f'#/game/{gid}' + suffix); page.wait_for_timeout(400)

def online_pair(A, B, gid):
    """A crea sala pública, B la encuentra en el buscador, entra y los dos pulsan «Listo»."""
    open_game(A, gid); open_game(B, gid)
    A.click('[data-do=go-online]'); B.click('[data-do=go-online]')
    A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
    A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
    v = '__c' if gid == 'chess' else '__b'
    code = A.evaluate(f'{v}.lobby.code')
    B.wait_for_selector(f'[data-ol-do=join][data-code="{code}"]', timeout=8000)
    B.click(f'[data-ol-do=join][data-code="{code}"]')
    A.wait_for_selector('.ol-seats', timeout=15000); B.wait_for_selector('.ol-seats', timeout=15000)
    B.click('[data-ol-do=ready]'); A.wait_for_function(f'{v}.lobby.net.ready[1]', timeout=6000); A.click('[data-ol-do=ready]')
    return code

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
        errs = []
        A = player(b, 'Ana', errs)
        A.goto(URL + '#/library'); A.wait_for_timeout(300)
        for gid in ('chess', 'battleship'):
            check(A.locator(f'a.game-card[href="#/game/{gid}"]').count() == 1, f'{gid} en la biblioteca')

        # ═════════ AJEDREZ contra la máquina ═════════
        open_game(A, 'chess')
        check(A.locator('.ch-choice').count() == 2, 'ajedrez: menú máquina / online')
        A.click('[data-do=go-cpu]'); A.wait_for_timeout(150)
        check(A.locator('.ax-mode').count() == 4, 'ajedrez: 4 niveles')
        A.click('.ax-mode[data-mode=normal]'); A.click('[data-color=white]'); A.click('[data-do=start]'); A.wait_for_timeout(300)
        def sq(page, name):
            bb = page.locator('#ch-board').bounding_box(); f = 'abcdefgh'.index(name[0]); r = int(name[1]) - 1
            flip = page.evaluate('__c.flipped')
            x, y = (7 - f, r) if flip else (f, 7 - r)
            return bb['x'] + (x + .5) * bb['width'] / 8, bb['y'] + (y + .5) * bb['height'] / 8
        A.mouse.move(*sq(A, 'e2')); A.mouse.down(); A.mouse.move(*sq(A, 'e4'), steps=6); A.mouse.up()
        A.wait_for_function('__c.moves.length === 2', timeout=8000)
        check(A.evaluate('__c.moves[0]') == 'e2e4', 'ajedrez: arrastrar mueve la pieza (e4)')
        A.mouse.click(*sq(A, 'g1')); A.wait_for_timeout(100)
        check(A.locator('.ch-sq.ch-dot').count() == 3, 'ajedrez: al seleccionar se marcan las jugadas legales (Cf3, Ch3, Ce2)')
        A.mouse.click(*sq(A, 'f3')); A.wait_for_function('__c.moves.length === 4', timeout=8000)
        check(A.evaluate('__c.sans[2]') == 'Cf3', 'ajedrez: tocar-tocar y notación en español (Cf3)')
        A.click('#ch-undo'); A.wait_for_timeout(200)
        check(A.evaluate('__c.moves.length') == 2, 'ajedrez: deshacer quita tu jugada y la de la CPU')
        # Partida guardada y recuperada
        A.goto(URL + '#/library'); A.wait_for_timeout(200); open_game(A, 'chess'); A.wait_for_timeout(300)
        check(A.evaluate('[__c.state, __c.moves.length]') == ['playing', 2], 'ajedrez: la partida contra la CPU se recupera al volver')
        # Mate en una
        A.evaluate("""(() => { __c.startFen = 'k7/8/1K6/8/8/8/8/7Q w - - 0 1'; __c.rebuild([]); return 1; })()""")
        A.mouse.click(*sq(A, 'h1')); A.mouse.click(*sq(A, 'h8'))
        A.wait_for_selector('.modal-overlay.active', timeout=5000)
        check('VICTORIA' in A.inner_text('.modal-overlay.active') and 'Jaque mate' in A.inner_text('.modal-overlay.active'), 'ajedrez: jaque mate gana la partida')
        ach = A.evaluate("Object.keys(Nexus.services.users.data().achievements)")
        check('ch_first' in ach and 'ch_normal' in ach and 'ch_fast' in ach, 'ajedrez: logros de victoria')
        A.screenshot(path=str(SHOTS / 'chess_cpu_result.png'))
        A.evaluate('Nexus.ui.modal.closeAll()')
        # Promoción con selector
        A.evaluate("""(() => { __c.newGame('cpu', 0); __c.startFen = '7k/P7/8/8/8/8/8/K7 w - - 0 1'; __c.rebuild([]); return 1; })()""")
        A.mouse.click(*sq(A, 'a7')); A.mouse.click(*sq(A, 'a8')); A.wait_for_timeout(200)
        check(A.locator('#ch-promo:not([hidden]) [data-promo]').count() == 5, 'ajedrez: selector de promoción')
        A.click('#ch-promo [data-promo="2"]'); A.wait_for_timeout(200)
        check(A.evaluate('__c.moves[0]') == 'a7a8n', 'ajedrez: corona caballo')

        # ═════════ AJEDREZ online ═════════
        B = player(b, 'Bruno', errs)
        online_pair(A, B, 'chess')
        A.wait_for_function("__c.state === 'playing' && __c.kind === 'online'", timeout=8000); B.wait_for_function("__c.state === 'playing' && __c.kind === 'online'", timeout=8000)
        ca, cb = A.evaluate('__c.myColor'), B.evaluate('__c.myColor')
        check({ca, cb} == {0, 8}, 'ajedrez online: un jugador con blancas y otro con negras')
        W, K = (A, B) if ca == 0 else (B, A)
        check(K.evaluate('__c.flipped') is True, 'ajedrez online: las negras ven el tablero girado')
        check(A.evaluate('__c.lobby.mode') == 'p2p', 'ajedrez online: conexión directa P2P')
        W.mouse.click(*sq(W, 'f2')); W.mouse.click(*sq(W, 'f3'))
        K.wait_for_function('__c.moves.length === 1', timeout=6000)
        check(K.evaluate('__c.moves') == ['f2f3'], 'ajedrez online: la jugada llega al rival')
        K.mouse.click(*sq(K, 'e7')); K.mouse.click(*sq(K, 'e5'))
        W.wait_for_function('__c.moves.length === 2', timeout=6000)
        # Jugada que se "pierde": el rival la recupera con el latido de sincronización
        W.evaluate("(() => { __c.commit(__c.pos.fromUci('g2g4'), 'test'); return 1; })()")
        K.wait_for_function('__c.moves.length === 3', timeout=12000)
        check(K.evaluate('__c.moves[2]') == 'g2g4', 'ajedrez online: una jugada perdida se resincroniza sola')
        K.mouse.click(*sq(K, 'd8')); K.mouse.click(*sq(K, 'h4'))
        W.wait_for_selector('.modal-overlay.active', timeout=6000); K.wait_for_selector('.modal-overlay.active', timeout=6000)
        check('DERROTA' in W.inner_text('.modal-overlay.active') and 'VICTORIA' in K.inner_text('.modal-overlay.active'), 'ajedrez online: mate del loco, victoria de las negras')
        K.screenshot(path=str(SHOTS / 'chess_online_result.png'))
        check(K.evaluate("Nexus.services.progress.stats('chess').byMode.online.wins") == 1, 'ajedrez online: victoria registrada')
        # Revancha con colores cambiados
        W.click('.modal-overlay.active .btn-primary'); K.click('.modal-overlay.active .btn-primary')
        W.wait_for_function("__c.state === 'playing'", timeout=8000); K.wait_for_function("__c.state === 'playing'", timeout=8000)
        check(W.evaluate('__c.myColor') == 8 and K.evaluate('__c.myColor') == 0, 'ajedrez online: en la revancha se alternan los colores')
        W, K = K, W
        W.mouse.click(*sq(W, 'e2')); W.mouse.click(*sq(W, 'e4'))
        K.wait_for_function('__c.moves.length === 1', timeout=6000)
        W.screenshot(path=str(SHOTS / 'chess_online_white.png')); K.screenshot(path=str(SHOTS / 'chess_online_black.png'))
        # Tablas de mutuo acuerdo
        K.click('#ch-draw'); W.wait_for_selector('#ch-offer:not([hidden])', timeout=6000)
        W.click('[data-offer=yes]')
        W.wait_for_selector('.modal-overlay.active', timeout=6000); K.wait_for_selector('.modal-overlay.active', timeout=6000)
        check('TABLAS' in W.inner_text('.modal-overlay.active') and 'TABLAS' in K.inner_text('.modal-overlay.active'), 'ajedrez online: tablas aceptadas')
        # Tercera partida: rendición
        W.click('.modal-overlay.active .btn-primary'); K.click('.modal-overlay.active .btn-primary')
        W.wait_for_function("__c.state === 'playing'", timeout=8000); K.wait_for_function("__c.state === 'playing'", timeout=8000)
        K.click('#ch-resign'); K.click('.modal-buttons .btn-danger')
        W.wait_for_selector('.modal-overlay.active', timeout=6000)
        check('VICTORIA' in W.inner_text('.modal-overlay.active') and 'Abandono' in W.inner_text('.modal-overlay.active'), 'ajedrez online: rendirse da la victoria al rival')
        W.evaluate('Nexus.ui.modal.closeAll()'); K.evaluate('Nexus.ui.modal.closeAll()')
        W.wait_for_selector('.ol-seats', timeout=5000)
        check(True, 'ajedrez online: al cerrar el resultado se vuelve a la sala')

        # ═════════ HUNDIR LA FLOTA contra la máquina ═════════
        open_game(A, 'battleship')
        check(A.locator('.ch-choice').count() == 2, 'flota: menú máquina / online')
        A.click('[data-do=go-cpu]'); A.click('.ax-mode[data-mode=master]'); A.click('[data-do=start]'); A.wait_for_timeout(200)
        fb = A.locator('#bs-mine .bs-field').bounding_box()
        cell = lambda bb, i: (bb['x'] + ((i % 10) + .5) * bb['width'] / 10, bb['y'] + ((i // 10) + .5) * bb['height'] / 10)
        A.mouse.click(*cell(fb, 0))                 # portaaviones en A1-A5
        A.keyboard.press('r'); A.mouse.click(*cell(fb, 1))   # acorazado vertical junto a él: tocaría → rechazado
        check(A.evaluate('__b.placing.length') == 1, 'flota: no deja colocar barcos que se tocan')
        A.mouse.click(*cell(fb, 29))
        check(A.evaluate('__b.placing.length') == 2 and A.evaluate("__b.placing[1].vertical") is True, 'flota: R gira el barco y se coloca')
        A.screenshot(path=str(SHOTS / 'bs_place.png'))
        A.click('[data-dock=random]'); A.click('[data-dock=ready]'); A.wait_for_timeout(300)
        check(A.evaluate('__b.phase') == 'battle', 'flota: empieza la batalla')
        # Ganamos disparando a los barcos de la CPU (que conocemos en la prueba)
        for _ in range(200):
            if A.evaluate('__b.phase') != 'battle': break
            if A.evaluate('__b.myTurn && !__b.awaiting'):
                A.evaluate("(() => { const t = __b.foe.ships.flatMap(s => s.cells).find(i => __b.view.k[i] === 0); __b.playerFire(t); return 1; })()")
            A.wait_for_timeout(120)
        A.wait_for_selector('.modal-overlay.active', timeout=6000)
        check('VICTORIA' in A.inner_text('.modal-overlay.active'), 'flota: hundir toda la flota gana')
        A.screenshot(path=str(SHOTS / 'bs_cpu_result.png'))
        ach = A.evaluate("Object.keys(Nexus.services.users.data().achievements)")
        check('bs_first' in ach and 'bs_master' in ach and 'bs_eagle' in ach and 'bs_streak' in ach, 'flota: logros de victoria, Maestro, precisión y racha')
        A.evaluate('Nexus.ui.modal.closeAll()')

        # ═════════ HUNDIR LA FLOTA online ═════════
        online_pair(A, B, 'battleship')
        A.wait_for_function("__b.phase === 'place'", timeout=8000); B.wait_for_function("__b.phase === 'place'", timeout=8000)
        for P in (A, B): P.click('[data-dock=random]')
        A.click('[data-dock=ready]'); A.wait_for_timeout(300)
        check(A.evaluate('__b.phase') == 'place' and 'Esperando' in A.inner_text('#bs-banner'), 'flota online: espera a que el rival coloque su flota')
        B.click('[data-dock=ready]')
        A.wait_for_function("__b.phase === 'battle'", timeout=6000); B.wait_for_function("__b.phase === 'battle'", timeout=6000)
        check(A.evaluate('__b.myTurn') != B.evaluate('__b.myTurn'), 'flota online: sólo uno tiene el turno')
        check(len(A.evaluate('__b.peerCommit')) == 64, 'flota online: compromiso SHA-256 del tablero rival recibido')
        A.screenshot(path=str(SHOTS / 'bs_online_a.png'))
        def autoplay(P1, P2, limit=400):
            for _ in range(limit):
                if P1.evaluate("__b.phase") == 'over' and P2.evaluate("__b.phase") == 'over': return True
                for P in (P1, P2):
                    if P.evaluate("__b.phase === 'battle' && __b.myTurn && !__b.awaiting"):
                        P.evaluate("(() => { __b.playerFire(Nexus.games.battleshipLogic.aiPick(__b.view, 'master')); return 1; })()")
                P1.wait_for_timeout(40)
            return False
        check(autoplay(A, B), 'flota online: la partida termina')
        A.wait_for_selector('.modal-overlay.active', timeout=8000); B.wait_for_selector('.modal-overlay.active', timeout=8000)
        ta, tb = A.inner_text('.modal-overlay.active'), B.inner_text('.modal-overlay.active')
        check(('VICTORIA' in ta) != ('VICTORIA' in tb), 'flota online: un ganador y un perdedor')
        check('verificado' in ta and 'verificado' in tb, 'flota online: los dos tableros se verifican contra su compromiso')
        (A if 'VICTORIA' in ta else B).screenshot(path=str(SHOTS / 'bs_online_result.png'))
        # Revancha con trampa: B cambia su flota tras comprometerse
        A.click('.modal-overlay.active .btn-primary'); B.click('.modal-overlay.active .btn-primary')
        A.wait_for_function("__b.phase === 'place'", timeout=8000); B.wait_for_function("__b.phase === 'place'", timeout=8000)
        for P in (A, B): P.click('[data-dock=random]'); P.click('[data-dock=ready]')
        A.wait_for_function("__b.phase === 'battle'", timeout=6000); B.wait_for_function("__b.phase === 'battle'", timeout=6000)
        B.evaluate("(() => { const L = Nexus.games.battleshipLogic; __b.mine = new L.Board(L.randomFleet()); return 1; })()")
        autoplay(A, B)
        A.wait_for_selector('.modal-overlay.active', timeout=8000)
        check('no coincide' in A.inner_text('.modal-overlay.active'), 'flota online: detecta al rival que cambió su flota a mitad de partida')
        for P in (A, B): P.evaluate('Nexus.ui.modal.closeAll()')
        # Abandono a mitad de batalla
        A.wait_for_selector('.ol-seats', timeout=6000); B.wait_for_selector('.ol-seats', timeout=6000)
        A.click('[data-ol-do=ready]'); B.click('[data-ol-do=ready]')
        A.wait_for_function("__b.phase === 'place'", timeout=8000); B.wait_for_function("__b.phase === 'place'", timeout=8000)
        for P in (A, B): P.click('[data-dock=random]'); P.click('[data-dock=ready]')
        A.wait_for_function("__b.phase === 'battle'", timeout=6000)
        B.goto(URL + '#/library')
        A.wait_for_selector('.modal-overlay.active', timeout=15000)
        check('abandonó' in A.inner_text('.modal-overlay.active'), 'flota online: si el rival se va, ganas por abandono')

        # ═════════ Invitación por enlace (sala privada) + retransmisión ═════════
        D = player(b, 'Dani', errs, relay=True); E = player(b, 'Eva', errs, relay=True)
        open_game(D, 'chess'); D.click('[data-do=go-online]'); D.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
        D.uncheck('[data-ol=public]'); D.click('[data-ol-do=create]'); D.wait_for_selector('.ol-code-big', timeout=8000)
        code = D.evaluate('__c.lobby.code')
        open_game(E, 'chess', '/' + code)
        E.wait_for_selector('.ol-seats', timeout=20000)
        check(E.evaluate('__c.lobby.mode') == 'relay', 'enlace de invitación + conexión retransmitida')
        E.click('[data-ol-do=ready]'); D.wait_for_function('__c.lobby.net.ready[1]', timeout=8000); D.click('[data-ol-do=ready]')
        D.wait_for_function("__c.state === 'playing'", timeout=8000); E.wait_for_function("__c.state === 'playing'", timeout=8000)
        Wp = D if D.evaluate('__c.myColor') == 0 else E; Kp = E if Wp is D else D
        Wp.mouse.click(*sq(Wp, 'd2')); Wp.mouse.click(*sq(Wp, 'd4'))
        Kp.wait_for_function('__c.moves.length === 1', timeout=8000)
        check(True, 'ajedrez retransmitido: la jugada llega')

        # ═════════ Ajustes y móvil ═════════
        A.goto(URL + '#/settings'); A.wait_for_timeout(300)
        check(A.locator('[data-choice="chess.defaultLevel"]').count() == 0, 'Ajustes: sin nivel inicial')
        open_game(A, 'chess'); A.click('.game-settings-btn'); A.wait_for_timeout(300)
        check(A.locator('.modal-overlay.active [data-setting="chess.showLegal"]').count() == 1, 'ajustes de Ajedrez dentro del juego')
        A.evaluate('Nexus.ui.modal.closeAll()')
        M = player(b, 'Movil', errs, mobile=True)
        open_game(M, 'chess'); M.click('[data-do=go-cpu]'); M.click('[data-do=start]'); M.wait_for_timeout(300)
        check(M.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'móvil ajedrez: sin scroll horizontal')
        M.screenshot(path=str(SHOTS / 'chess_mobile.png'))
        open_game(M, 'battleship'); M.click('[data-do=go-cpu]'); M.click('[data-do=start]'); M.click('[data-dock=random]'); M.click('[data-dock=ready]'); M.wait_for_timeout(1500)
        check(M.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'móvil flota: sin scroll horizontal')
        M.screenshot(path=str(SHOTS / 'bs_mobile.png'), full_page=True)

        real = [e for e in errs if 'fonts.g' not in e]
        check(not real, 'sin errores de JavaScript' + ('' if not real else ': ' + ' | '.join(real[:5])))
        b.close()
finally:
    for pr in brokers: pr.terminate()

print('\n' + ('TODO OK' if not bad else f'{len(bad)} FALLOS'))
sys.exit(1 if bad else 0)
