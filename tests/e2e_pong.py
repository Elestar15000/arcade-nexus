"""Pong Turbo: modo contra la máquina (4 niveles) y multijugador online entre dos navegadores
(sala pública desde el buscador, sala privada por código, enlace, sala llena, retransmisión, abandono).
Arranca dos brokers MQTT locales (tests/mqtt_test_broker.mjs), así que no necesita Internet.
python3 tests/e2e_pong.py"""
import pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
PORTS = (18841, 18842)
BROKERS = [f'ws://localhost:{p}' for p in PORTS]
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

HOOK = """() => { const g = Nexus.games.registry.get('pong'); const m = g.mount; g.mount = (r) => (window.__pong = m(r)); }"""

brokers = [subprocess.Popen(['node', str(ROOT / 'tests/mqtt_test_broker.mjs'), str(p)], stdout=subprocess.DEVNULL) for p in PORTS]
time.sleep(0.6)

def player(browser, name, errs, relay=False, mobile=False):
    ctx = browser.new_context(**({'viewport': {'width': 390, 'height': 820}, 'has_touch': True, 'is_mobile': True} if mobile else {'viewport': {'width': 1366, 'height': 800}}))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(f'{name}: {m.text}'))
    local_mode(page, BROKERS, relay)
    page.goto(URL); register(page, name, 'secreta1')
    page.evaluate(HOOK)
    return page

def open_pong(page, suffix=''):
    if page.evaluate('location.hash').startswith('#/game/pong'): page.goto(URL + '#/home'); page.wait_for_timeout(150)
    page.goto(URL + '#/game/pong' + suffix); page.wait_for_timeout(400)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
        errs = []

        # ── Biblioteca y modo contra la máquina ─────────────
        A = player(b, 'Ana', errs)
        A.goto(URL + '#/library'); A.wait_for_timeout(300)
        check(A.locator('a.game-card[href="#/game/pong"]').count() == 1, 'Pong disponible en la biblioteca')
        check(A.locator('[data-soon]').count() == 0, 'ya no quedan juegos "próximamente"')
        open_pong(A)
        check(A.locator('.pg-choice').count() == 2, 'menú: contra la máquina / online')
        A.click('[data-do=go-cpu]'); A.wait_for_timeout(200)
        check(A.locator('.ax-mode').count() == 4, 'CPU: 4 niveles')
        A.click('.ax-mode[data-mode=hard]'); A.click('[data-do=start]'); A.wait_for_timeout(200)
        check(A.evaluate('__pong.state') == 'playing' and A.evaluate('__pong.level.id') == 'hard', 'CPU: arranca la partida en Difícil')
        y0 = A.evaluate('__pong.sim.pads[0].y')
        A.keyboard.down('ArrowUp'); A.wait_for_timeout(400); A.keyboard.up('ArrowUp')
        check(A.evaluate('__pong.sim.pads[0].y') < y0 - 60, 'CPU: la pala se mueve con el teclado')
        A.wait_for_timeout(3200)
        check(A.evaluate('__pong.sim.phase') in ('live', 'point'), 'CPU: tras la cuenta atrás la bola está en juego')
        A.evaluate('__pong.sim.pads[0].meter = 100'); A.keyboard.press('Space')
        check(A.evaluate('__pong.sim.pads[0].armed') is True, 'CPU: Espacio arma el Turbo con la barra llena')
        A.keyboard.press('p'); check(A.evaluate('__pong.state') == 'paused', 'CPU: P pausa'); A.keyboard.press('p')
        # Remate turbo directo que acaba la partida 7-0
        A.evaluate("""(() => { const G = __pong, s = G.sim; s.score = [6, 0]; s.phase = 'live'; s.st[0].maxDef = 0;
            s.maxRally = 16; s.maxSpd = 1400;
            s.ball.x = 600; s.ball.y = 270; s.ball.vx = 3000; s.ball.vy = 0; s.ball.turbo = true; s.lastHit = 0;
            s.pads[1].y = 60; return 1; })()""")
        A.wait_for_timeout(1500)
        check(A.locator('.modal-overlay.active').count() == 1 and 'VICTORIA' in A.inner_text('.modal-overlay.active'), 'CPU: modal de victoria al llegar a 7')
        A.screenshot(path=str(SHOTS / 'pong_cpu_result.png'))
        ach = A.evaluate("Object.keys(Nexus.services.users.data().achievements).filter(k => k.startsWith('pg_'))")
        for a in ('pg_first', 'pg_normal', 'pg_hard', 'pg_shutout', 'pg_rally15', 'pg_turbo', 'pg_speed'):
            check(a in ach, f'CPU: logro {a}')
        ms = A.evaluate("Nexus.services.progress.stats('pong').byMode.hard")
        check(ms['wins'] == 1 and ms['bestScore'] > 0, 'CPU: victoria y puntuación guardadas en el modo Difícil')
        A.evaluate('Nexus.ui.modal.closeAll()'); A.wait_for_timeout(200)

        # ── Online: sala pública desde el buscador ──────────
        B = player(b, 'Bruno', errs)
        open_pong(A); open_pong(B)
        A.click('[data-do=go-online]'); B.click('[data-do=go-online]')
        A.wait_for_selector('#pg-net-status[data-state=online]', timeout=8000)
        check(True, 'online: conectado a los brokers')
        A.click('[data-do=create]')
        A.wait_for_selector('.pg-code-big', timeout=8000)
        code = A.evaluate('__pong.net.code')
        check(len(code) == 5, f'anfitrión: sala creada con código {code}')
        A.screenshot(path=str(SHOTS / 'pong_host_wait.png'))
        B.wait_for_selector(f'[data-do=join][data-code="{code}"]', timeout=8000)
        check(True, 'invitado: la sala aparece en el buscador')
        B.screenshot(path=str(SHOTS / 'pong_lobby.png'))
        B.click(f'[data-do=join][data-code="{code}"]')
        A.wait_for_selector('.pg-seats', timeout=15000); B.wait_for_selector('.pg-seats', timeout=15000)
        check(A.evaluate('__pong.net.conn.mode') == 'p2p' and B.evaluate('__pong.net.conn.mode') == 'p2p', 'conexión directa P2P (WebRTC) establecida')
        check('Bruno' in A.inner_text('.pg-seats') and 'Ana' in B.inner_text('.pg-seats'), 'la sala muestra a los dos jugadores')
        B.click('[data-do=ready]'); A.wait_for_timeout(500)
        check(A.evaluate('__pong.net.ready[1]') is True, 'anfitrión ve al invitado listo')
        A.screenshot(path=str(SHOTS / 'pong_room.png'))
        A.click('[data-do=ready]'); A.wait_for_timeout(600)
        check(A.evaluate('__pong.state') == 'playing' and B.evaluate('__pong.state') == 'playing', 'los dos listos: empieza la partida en ambos')
        check(B.evaluate('__pong.meIdx()') == 1 and B.evaluate('__pong.mirrored()') is True, 'invitado: vista en espejo (su pala a la izquierda)')
        B.keyboard.down('ArrowDown'); B.wait_for_timeout(600); B.keyboard.up('ArrowDown'); B.wait_for_timeout(300)
        gy, hy = B.evaluate('__pong.sim.pads[1].y'), A.evaluate('__pong.sim.pads[1].y')
        check(gy > 330 and abs(gy - hy) < 25, f'la pala del invitado llega al anfitrión ({gy:.0f} vs {hy:.0f})')
        A.wait_for_timeout(3000)
        bx = [A.evaluate('__pong.sim.ball.x'), B.evaluate('__pong.sim.ball.x')]
        A.wait_for_function("__pong.sim.phase === 'live'", timeout=8000); B.wait_for_function("__pong.sim.phase === 'live'", timeout=8000)
        bx = [A.evaluate('__pong.sim.ball.x'), B.evaluate('__pong.sim.ball.x')]
        check(True, 'bola en juego en los dos navegadores')
        check(abs(bx[0] - bx[1]) < 120, f'la bola del invitado sigue a la del anfitrión ({bx[0]:.0f} / {bx[1]:.0f})')
        check(B.evaluate('__pong.net.conn.rtt') is not None, 'latencia medida')
        A.screenshot(path=str(SHOTS / 'pong_online_host.png')); B.screenshot(path=str(SHOTS / 'pong_online_guest.png'))
        # El invitado activa el turbo
        A.evaluate('__pong.sim.pads[1].meter = 100'); B.wait_for_timeout(300)
        B.keyboard.press('Space'); B.wait_for_timeout(400)
        check(A.evaluate('__pong.sim.pads[1].armed') is True, 'el Turbo del invitado se arma en el anfitrión')
        # Gana el invitado 7-5
        A.evaluate("""(() => { const s = __pong.sim; s.score = [5, 6]; s.phase = 'live';
            s.ball.x = 300; s.ball.y = 270; s.ball.vx = -3000; s.ball.vy = 0; s.ball.turbo = false; s.pads[0].y = 480; return 1; })()""")
        B.wait_for_selector('.modal-overlay.active', timeout=6000); A.wait_for_selector('.modal-overlay.active', timeout=6000)
        check('VICTORIA' in B.inner_text('.modal-overlay.active') and 'DERROTA' in A.inner_text('.modal-overlay.active'), 'fin online: victoria del invitado, derrota del anfitrión')
        B.screenshot(path=str(SHOTS / 'pong_online_result.png'))
        check(B.evaluate("Nexus.services.progress.stats('pong').byMode.online.wins") == 1, 'invitado: victoria online guardada')
        check(A.evaluate("Nexus.services.progress.stats('pong').byMode.online.played") == 1, 'anfitrión: partida online guardada')
        check('pg_online_win' in B.evaluate("Object.keys(Nexus.services.users.data().achievements)"), 'logro Rey de la red')
        # Revancha
        A.click('.modal-overlay.active .btn-primary'); B.click('.modal-overlay.active .btn-primary'); A.wait_for_timeout(900)
        check(A.evaluate('__pong.state') == 'playing' and B.evaluate('__pong.state') == 'playing', 'revancha: nueva partida al pulsarla los dos')

        # ── Sala llena y código inexistente ─────────────────
        C = player(b, 'Carla', errs)
        open_pong(C); C.click('[data-do=go-online]'); C.wait_for_selector('#pg-net-status[data-state=online]', timeout=8000)
        C.fill('#pg-code', code.lower()); C.press('#pg-code', 'Enter')
        C.wait_for_selector('.pg-error', timeout=8000)
        check('dos jugadores' in C.inner_text('.pg-error'), 'tercer jugador: "sala llena"')
        C.fill('#pg-code', 'ZZZZZ'); C.press('#pg-code', 'Enter')
        C.wait_for_selector('.pg-error', timeout=15000); C.wait_for_timeout(9500)
        check('ningun' in C.inner_text('.pg-error').lower() or 'ningún' in C.inner_text('.pg-error'), 'código inexistente: aviso de sala no encontrada')

        # ── Abandono: el anfitrión se va a mitad de partida ─
        A.goto(URL + '#/library')   # sale del juego → abandona (derrota para él)
        B.wait_for_selector('.modal-overlay.active', timeout=15000)
        check('abandono' in B.inner_text('.modal-overlay.active'), 'invitado: victoria por abandono cuando el anfitrión se va')
        check(A.evaluate("Nexus.services.progress.stats('pong').byMode.online.played") == 2, 'anfitrión: el abandono cuenta como partida jugada')
        B.evaluate('Nexus.ui.modal.closeAll()')
        B.wait_for_selector('#pg-code', timeout=5000)
        check(True, 'invitado vuelve al vestíbulo online al cerrar el resultado')
        A.close(); B.close()
        C.wait_for_timeout(1500)
        check(C.locator(f'[data-do=join][data-code="{code}"]').count() == 0, 'la sala cerrada desaparece del buscador')

        # ── Sala privada por enlace + retransmisión (sin P2P) ──
        D = player(b, 'Dani', errs, relay=True)
        E = player(b, 'Eva', errs, relay=True)
        open_pong(D); D.click('[data-do=go-online]'); D.wait_for_selector('#pg-net-status[data-state=online]', timeout=8000)
        D.uncheck('#pg-public'); D.click('[data-do=create]'); D.wait_for_selector('.pg-code-big', timeout=8000)
        pcode = D.evaluate('__pong.net.code')
        C.wait_for_timeout(800)
        check(C.locator(f'[data-do=join][data-code="{pcode}"]').count() == 0, 'sala privada: no sale en el buscador')
        open_pong(E, '/' + pcode)          # enlace compartido
        E.wait_for_selector('.pg-seats', timeout=20000); D.wait_for_selector('.pg-seats', timeout=20000)
        check(E.evaluate('__pong.net.conn.mode') == 'relay', 'sin P2P: la partida se retransmite por el broker')
        check(E.evaluate('location.hash') == '#/game/pong', 'el enlace de invitación se limpia de la barra de direcciones')
        E.click('[data-do=ready]'); D.wait_for_function('__pong.net.ready[1]', timeout=8000); D.click('[data-do=ready]')
        D.wait_for_function("__pong.sim.phase === 'live'", timeout=15000); E.wait_for_function("__pong.sim.phase === 'live'", timeout=8000)
        check(True, 'retransmisión: la partida avanza en los dos')
        bx = [D.evaluate('__pong.sim.ball.x'), E.evaluate('__pong.sim.ball.x')]
        check(abs(bx[0] - bx[1]) < 150, f'retransmisión: bola sincronizada ({bx[0]:.0f} / {bx[1]:.0f})')
        # El invitado abandona con el botón
        E.click('#pg-btn-leave'); E.click('[data-do=forfeit]')
        D.wait_for_selector('.modal-overlay.active', timeout=12000)
        check('VICTORIA' in D.inner_text('.modal-overlay.active'), 'abandono del invitado: victoria para el anfitrión')
        check(E.evaluate("Nexus.services.progress.stats('pong').byMode.online.wins") == 0 and
              E.evaluate("Nexus.services.progress.stats('pong').byMode.online.played") == 1, 'abandono: derrota para quien se va')

        # ── Ajustes, estadísticas y móvil ───────────────────
        D.evaluate('Nexus.ui.modal.closeAll()')
        D.goto(URL + '#/settings'); D.wait_for_timeout(300)
        check(D.locator('[data-choice="pong.defaultLevel"]').count() == 1, 'Ajustes: sección de Pong Turbo')
        D.goto(URL + '#/rankings'); D.wait_for_timeout(500)
        check('Pong' in D.inner_text('#view'), 'Rankings incluyen Pong Turbo')

        M = player(b, 'Movil', errs, mobile=True)
        open_pong(M); M.click('[data-do=go-cpu]'); M.click('[data-do=start]'); M.wait_for_timeout(300)
        check(M.locator('#pg-touch').is_visible(), 'móvil: controles táctiles visibles')
        box = M.locator('#pg-stage').bounding_box()
        M.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.9); M.wait_for_timeout(500)
        check(M.evaluate('__pong.sim.pads[0].y') > 330, 'móvil: tocar la pista mueve la pala')
        M.screenshot(path=str(SHOTS / 'pong_mobile.png'))
        M.evaluate('__pong.pause()')
        open_pong(M); M.click('[data-do=go-online]'); M.wait_for_timeout(1200)
        M.screenshot(path=str(SHOTS / 'pong_mobile_lobby.png'))

        real = [e for e in errs if 'fonts.g' not in e]
        check(not real, 'sin errores de JavaScript' + ('' if not real else ': ' + ' | '.join(real[:5])))
        b.close()
finally:
    for pr in brokers: pr.terminate()

print('\n' + ('TODO OK' if not bad else f'{len(bad)} FALLOS'))
sys.exit(1 if bad else 0)
