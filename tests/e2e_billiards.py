"""Billar (bola 8): menú, contra la CPU (bola en mano, tiro con el ratón, turno de la CPU, guardado), victoria y logros,
práctica, ajustes del juego, online entre dos navegadores (mismo rack, tiro sincronizado, abandono) y móvil en vertical.
Arranca dos brokers MQTT locales.   python3 tests/e2e_billiards.py"""
import pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
PORTS = (18881, 18882)
BROKERS = [f'ws://localhost:{p}' for p in PORTS]
URL = f'file://{ROOT}/index.html'
HOOK = """() => { const g = Nexus.games.registry.get('billiards'); const m = g.mount; g.mount = (r) => (window.__bi = m(r)); }"""
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)
brokers = [subprocess.Popen(['node', str(ROOT / 'tests/mqtt_test_broker.mjs'), str(p)], stdout=subprocess.DEVNULL) for p in PORTS]
time.sleep(0.6)

def player(browser, name, errs, mobile=False):
    ctx = browser.new_context(**({'viewport': {'width': 390, 'height': 840}, 'has_touch': True, 'is_mobile': True} if mobile else {'viewport': {'width': 1366, 'height': 860}}))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(f'{name}: {m.text}'))
    local_mode(page, BROKERS)
    page.goto(URL); register(page, name, 'secreta1'); page.evaluate(HOOK)
    return page

def open_game(page):
    if page.evaluate('location.hash').startswith('#/game/'): page.goto(URL + '#/home'); page.wait_for_timeout(150)
    page.goto(URL + '#/game/billiards'); page.wait_for_timeout(500)

def screen(page, x, y):
    """Coordenadas de la mesa → píxeles de pantalla (mesa sin girar)."""
    bb = page.locator('#bi-canvas').bounding_box()
    lw, lh = page.evaluate('[__bi.cv.lw, __bi.cv.lh]')
    return bb['x'] + (x + 46) / lw * bb['width'], bb['y'] + (y + 46) / lh * bb['height']

def wait_idle(page, timeout=20000):
    page.wait_for_function("__bi.phase !== 'moving' && __bi.phase !== 'wait'", timeout=timeout)

SETUP = """([list, cue, groups, turn]) => { const st = __bi.st; st.balls.forEach(b => { b.in = b.n !== 0; });
    for (const [n, x, y] of list) { const b = st.balls[n]; b.in = false; b.x = x; b.y = y; }
    st.balls[0].in = false; st.balls[0].x = cue[0]; st.balls[0].y = cue[1];
    Object.assign(st, { breakShot: false, ballInHand: false, kitchen: false, groups, turn }); __bi.lastTurnOwner = -1; __bi.beginTurn(); }"""
AIM_POCKET = """([n, pocket, p]) => { const L = Nexus.games.billiardsLogic, st = __bi.st, c = st.balls[0], t = st.balls[n], P = L.POCKETS[pocket];
    const d = Math.hypot(P.ax - t.x, P.ay - t.y), gx = t.x - (P.ax - t.x) / d * 2 * L.R, gy = t.y - (P.ay - t.y) / d * 2 * L.R;
    __bi.aim.a = Math.atan2(gy - c.y, gx - c.x); __bi.aim.p = p; __bi.shootMine(); }"""

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
        errs = []
        A = player(b, 'Ana', errs)
        A.goto(URL + '#/library'); A.wait_for_timeout(300)
        check(A.locator('a.game-card[href="#/game/billiards"]').count() == 1, 'billar en la biblioteca')
        open_game(A)
        check(A.locator('.bi-choice').count() == 3 and A.locator('.bi-rules').count() == 1, 'menú: CPU, online, práctica y reglas')
        A.screenshot(path=str(SHOTS / 'billiards_menu.png'))

        # ── Contra la CPU ──
        A.click('[data-do=go-cpu]'); A.wait_for_timeout(150)
        check(A.locator('.ax-mode').count() == 4, '4 niveles')
        A.click('.ax-mode[data-mode=normal]'); A.click('[data-do=start]'); A.wait_for_timeout(400)
        A.evaluate("__bi.cpuPlan = null; __bi.st.turn = __bi.me; __bi.lastTurnOwner = -1; __bi.beginTurn()"); A.wait_for_timeout(200)
        check(A.evaluate("__bi.myTurn && __bi.st.breakShot && __bi.st.ballInHand && __bi.st.kitchen"), 'saque: bola en mano detrás de la línea')
        # Arrastrar la blanca (dentro de la zona de saque; no puede pasar la línea)
        cx, cy = A.evaluate("[__bi.st.balls[0].x, __bi.st.balls[0].y]")
        A.mouse.move(*screen(A, cx, cy)); A.mouse.down(); A.mouse.move(*screen(A, 150, 140), steps=8); A.mouse.up()
        nx, ny = A.evaluate("[__bi.st.balls[0].x, __bi.st.balls[0].y]")
        check(abs(nx - 150) < 2 and abs(ny - 140) < 2, 'bola en mano: se arrastra la blanca')
        A.mouse.move(*screen(A, 150, 140)); A.mouse.down(); A.mouse.move(*screen(A, 600, 140), steps=8); A.mouse.up()
        check(A.evaluate("__bi.st.balls[0].x") <= 250.5, 'bola en mano del saque: no pasa de la línea')
        A.evaluate("__bi.st.balls[0].x = 250; __bi.st.balls[0].y = 250")
        # Tiro con el ratón: apuntar, arrastrar hacia atrás y soltar
        A.mouse.move(*screen(A, 750, 250)); A.wait_for_timeout(50)
        check(abs(A.evaluate("__bi.aim.a")) < 0.02, 'el taco apunta al puntero')
        A.screenshot(path=str(SHOTS / 'billiards_aim.png'))
        A.mouse.down(); A.mouse.move(*screen(A, 520, 250), steps=10)
        check(A.evaluate("__bi.aim.p") > 0.8, 'arrastrar hacia atrás carga la fuerza')
        A.mouse.up(); A.wait_for_timeout(100)
        check(A.evaluate("__bi.phase") == 'moving', 'al soltar se tira')
        A.wait_for_timeout(600); A.screenshot(path=str(SHOTS / 'billiards_break.png'))
        wait_idle(A)
        check(A.evaluate("__bi.st.shots") == 1 and not A.evaluate("__bi.st.breakShot"), 'el saque se juzga al pararse las bolas')
        # Turno de la CPU (le damos el turno y esperamos su tiro)
        A.evaluate("__bi.st.turn = 1 - __bi.me; __bi.st.ballInHand = true; __bi.lastTurnOwner = -1; __bi.beginTurn()")
        A.wait_for_function("__bi.st.shots >= 2 && __bi.phase !== 'moving'", timeout=30000)
        check(A.evaluate("__bi.st.shots") >= 2, 'la CPU coloca la blanca y tira')
        wait_idle(A)
        # Guardado y recuperación
        A.evaluate("__bi.cpuPlan = null; __bi.st.turn = __bi.me; __bi.lastTurnOwner = -1; __bi.beginTurn()")
        shots = A.evaluate("__bi.st.shots"); pos = A.evaluate("__bi.st.balls.map(b => Math.round(b.x)).join()")
        A.goto(URL + '#/home'); A.wait_for_timeout(200); open_game(A)
        check(A.evaluate("__bi.kind") == 'cpu' and A.evaluate("__bi.st.shots") == shots and A.evaluate("__bi.st.balls.map(b => Math.round(b.x)).join()") == pos, 'partida recuperada al volver')
        # Victoria: sólo queda la 8 y el grupo propio está limpio
        A.evaluate(SETUP, [[[8, 900, 400], [12, 300, 100]], [700, 200], ['solids', 'stripes'], A.evaluate('__bi.me')])
        A.evaluate(AIM_POCKET, [8, 5, 0.4])
        A.wait_for_selector('.modal-overlay.active .modal-stats-grid', timeout=15000)
        t = A.inner_text('.modal-overlay.active')
        check('VICTORIA' in t and 'Bola 8 metida' in t, 'meter la 8 con el grupo limpio: victoria')
        check(A.evaluate("Nexus.services.progress.stats('billiards').byMode.normal.wins") == 1, 'victoria registrada en Normal')
        check(A.evaluate("!!Nexus.services.achievements.unlockedMap().bi_first"), 'logro «Primera bola 8»')
        A.screenshot(path=str(SHOTS / 'billiards_win.png'))
        A.evaluate('Nexus.ui.modal.closeAll()'); A.wait_for_timeout(300)

        # ── Práctica ──
        A.evaluate("__bi.showHome()"); A.click('[data-do=practice]'); A.wait_for_timeout(300)
        check(A.evaluate("__bi.kind") == 'practice' and A.locator('#bi-restart').is_visible(), 'práctica: una sola persona y botón reiniciar')
        A.evaluate(SETUP, [[[4, 900, 400]], [700, 200], [None, None], 0])
        A.evaluate(AIM_POCKET, [4, 5, 0.4])
        A.wait_for_selector('.modal-overlay.active .modal-stats-grid', timeout=15000)
        check('MESA LIMPIA' in A.inner_text('.modal-overlay.active'), 'práctica: mesa limpia')
        check(A.evaluate("!!Nexus.services.achievements.unlockedMap().bi_practice"), 'logro «Mesa limpia» (≤ 30 tiros)')
        A.evaluate('Nexus.ui.modal.closeAll()'); A.wait_for_timeout(300)
        A.click('.game-settings-btn'); A.wait_for_timeout(250)
        check(A.locator('.modal-overlay.active [data-setting="billiards.guide"]').count() == 1, 'ajustes del juego: guía larga')
        A.keyboard.press('Escape'); A.wait_for_timeout(200)

        # ── Online ──
        B = player(b, 'Bruno', errs)
        open_game(A); open_game(B)
        if A.locator('[data-do=go-online]').count() == 0: A.evaluate("__bi.showHome()")
        A.click('[data-do=go-online]'); B.click('[data-do=go-online]')
        A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
        A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
        code = A.evaluate('__bi.lobby.code')
        B.wait_for_selector(f'[data-ol-do=join][data-code="{code}"]', timeout=8000); B.click(f'[data-ol-do=join][data-code="{code}"]')
        A.wait_for_selector('.ol-seats', timeout=15000); B.wait_for_selector('.ol-seats', timeout=15000)
        B.click('[data-ol-do=ready]'); A.wait_for_function('__bi.lobby.net.ready[1]', timeout=6000); A.click('[data-ol-do=ready]')
        A.wait_for_function("__bi.kind === 'online' && __bi.phase === 'aim'", timeout=8000); B.wait_for_function("__bi.kind === 'online' && __bi.phase === 'aim'", timeout=8000)
        same = A.evaluate("JSON.stringify(__bi.st.balls.map(b => [b.n, Math.round(b.x), Math.round(b.y)]))") == B.evaluate("JSON.stringify(__bi.st.balls.map(b => [b.n, Math.round(b.x), Math.round(b.y)]))")
        check(same, 'online: el mismo rack en los dos navegadores')
        check(A.evaluate("__bi.me") != B.evaluate("__bi.me") and A.evaluate("__bi.st.turn") == B.evaluate("__bi.st.turn"), 'online: cada uno su lado y el mismo turno')
        S, O = (A, B) if A.evaluate("__bi.st.turn === __bi.me") else (B, A)
        S.evaluate("__bi.aim.a = 0.01; __bi.sendAim()"); O.wait_for_timeout(400)
        check(abs(O.evaluate("__bi.aim.a") - 0.01) < 0.001, 'online: el rival ve cómo apuntas')
        S.evaluate("__bi.aim.a = 0; __bi.aim.p = 0.95; __bi.shootMine()")
        O.wait_for_function("__bi.phase === 'moving' || __bi.st.shots === 1", timeout=6000)
        check(True, 'online: el tiro llega al rival y se ve rodar')
        wait_idle(S); O.wait_for_function("__bi.st.shots === 1 && __bi.phase !== 'moving' && __bi.phase !== 'wait'", timeout=20000)
        sa = S.evaluate("JSON.stringify(__bi.st.balls.map(b => [b.n, Math.round(b.x), Math.round(b.y), b.in]))")
        sb = O.evaluate("JSON.stringify(__bi.st.balls.map(b => [b.n, Math.round(b.x), Math.round(b.y), b.in]))")
        check(sa == sb and S.evaluate("__bi.st.turn") == O.evaluate("__bi.st.turn"), 'online: al pararse, mismas posiciones y mismo turno en los dos')
        S.screenshot(path=str(SHOTS / 'billiards_online.png'))
        # Abandono
        O.evaluate("__bi.lobby.send({ t: 'resign' }); __bi.st.over = true; __bi.st.winner = 1 - __bi.me; __bi.st.reason = 'resign'; __bi.finish('resign')")
        S.wait_for_selector('.modal-overlay.active .modal-stats-grid', timeout=8000)
        check('VICTORIA' in S.inner_text('.modal-overlay.active'), 'online: si el rival se rinde, ganas')
        check(S.evaluate("Nexus.services.progress.stats('billiards').byMode.online.played") == 1, 'online: partida registrada')

        # ── Móvil en vertical ──
        M = player(b, 'Mia', errs, mobile=True)
        open_game(M); M.click('[data-do=practice]'); M.wait_for_timeout(700)
        check(M.evaluate("__bi.vertical") is True, 'móvil: la mesa se gira en vertical')
        check(M.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'móvil: sin scroll horizontal')
        M.screenshot(path=str(SHOTS / 'billiards_mobile.png'), full_page=True)

        real = [e for e in errs if 'fonts.g' not in e]
        check(not real, 'sin errores de JavaScript' + ('' if not real else ': ' + ' | '.join(real[:5])))
        b.close()
finally:
    for pr in brokers: pr.terminate()

print('\n' + ('TODO OK' if not bad else f'{len(bad)} FALLOS'))
sys.exit(1 if bad else 0)
