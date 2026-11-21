"""Auditoría F3: tiempo de turno online.
  · Mesa de cartas: jugada automática al agotarse el tiempo y bot tras 3 turnos sin jugar.
  · Ajedrez online: control de tiempo elegido por el anfitrión, incremento y derrota por tiempo
    (tablas si el rival no tiene material para dar mate).
  · Hundir la flota online: disparo automático al agotarse el tiempo.
Arranca dos brokers MQTT locales. python3 tests/e2e_timers.py"""
import pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
PORTS = (18871, 18872)
BROKERS = [f'ws://localhost:{p}' for p in PORTS]
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m, flush=True); (not c) and bad.append(m)

HOOK = """() => { for (const [id, v] of [['chess', '__c'], ['battleship', '__b']]) { const g = Nexus.games.registry.get(id); const m = g.mount; g.mount = (r) => (window[v] = m(r)); } }"""
brokers = [subprocess.Popen(['node', str(ROOT / 'tests/mqtt_test_broker.mjs'), str(p)], stdout=subprocess.DEVNULL) for p in PORTS]
time.sleep(0.6)

def player(browser, name, errs):
    ctx = browser.new_context(viewport={'width': 1366, 'height': 860})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(f'{name}: {m.text}'))
    local_mode(page, BROKERS, False)
    page.goto(URL); register(page, name, 'secreta1')
    page.evaluate(HOOK)
    return page

def open_game(page, gid):
    if page.evaluate('location.hash').startswith('#/game/'): page.goto(URL + '#/home'); page.wait_for_timeout(150)
    page.goto(URL + f'#/game/{gid}'); page.wait_for_timeout(400)

def pair(A, B, gid, before_ready=None):
    open_game(A, gid); open_game(B, gid)
    A.click('[data-do=go-online]'); B.click('[data-do=go-online]')
    A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
    A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
    v = '__c' if gid == 'chess' else '__b'
    code = A.evaluate(f'{v}.lobby.code')
    B.wait_for_selector(f'[data-ol-do=join][data-code="{code}"]', timeout=8000)
    B.click(f'[data-ol-do=join][data-code="{code}"]')
    A.wait_for_selector('.ol-seats', timeout=15000); B.wait_for_selector('.ol-seats', timeout=15000)
    if before_ready: before_ready()
    B.click('[data-ol-do=ready]'); A.wait_for_function(f'{v}.lobby.net.ready[1]', timeout=6000); A.click('[data-ol-do=ready]')

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
        errs = []
        A = player(b, 'Ana', errs)

        # ═════════ Mesa de cartas: sesión con un asiento remoto que no juega ═════════
        res = A.evaluate("""() => new Promise((ok) => {
            const T = Nexus.games.cards.TableSession; T.speed = 0.02; T.turnScale = 0.01;   // 30 s → 0,3 s
            const sent = [];
            const s = new T(Nexus.games.cardRules.poker, [
                { kind: 'bot', name: 'Bot' }, { kind: 'remote', name: 'Remo', guestId: 'g1' }],
                { onView: () => {}, send: (g, m) => sent.push(m) });
            let afk = null; s.onAfk = (seat) => { afk = seat; };
            s.start();
            setTimeout(() => {
                const st = s.state, log = st.log.join('\\n');
                ok({ auto: sent.filter(m => m.v && m.v.log && m.v.log.some(l => l.includes('Se acabó el tiempo'))).length, afk, kind: s.seats[1].kind, tl: sent.some(m => m.v && typeof m.v.tl === 'number'),
                     fold: sent.some(m => m.v && m.v.log && m.v.log.some(l => /Remo.*(se retira|pasa)/.test(l))) });
                s.destroy(); T.speed = 1; T.turnScale = 1;
            }, 4000);
        })""")
        check(res['tl'], 'cartas online: cada vista lleva el tiempo de turno restante')
        check(res['auto'] >= 3 and res['fold'], f'cartas online: al agotarse el tiempo se juega solo (póker: pasa o se retira) ({res["auto"]})')
        check(res['afk'] == 1 and res['kind'] == 'bot', 'cartas online: tras 3 turnos sin jugar le sustituye un bot')
        res = A.evaluate("""() => { const T = Nexus.games.cards.TableSession;
            const s = new T(Nexus.games.cardRules.poker, [{ kind: 'me', name: 'Yo' }, { kind: 'bot', name: 'Bot' }], { onView: () => {} });
            s.start(); const d = s.deadline; s.destroy(); return d; }""")
        check(res == 0, 'cartas contra la CPU: sin límite de tiempo')

        # ═════════ Ajedrez online con reloj ═════════
        B = player(b, 'Bruno', errs)
        def pick_clock():
            check(A.locator('.ol-setting [data-ol-do=setting]').count() == 5, 'ajedrez: el anfitrión ve 5 controles de tiempo')
            A.click('.ol-setting [data-v="3+2"]')
            B.wait_for_function("document.querySelector('.ol-chip.on') && document.querySelector('.ol-chip.on').textContent.includes('3+2')", timeout=6000)
            check(B.locator('.ol-setting .ol-chip:disabled').count() == 5, 'ajedrez: el invitado ve el control elegido (sin poder cambiarlo)')
            A.screenshot(path=str(SHOTS / 'chess_clock_room.png'))
        pair(A, B, 'chess', pick_clock)
        A.wait_for_function("__c.state === 'playing' && __c.kind === 'online'", timeout=8000); B.wait_for_function("__c.state === 'playing'", timeout=8000)
        check(A.evaluate('__c.tc && __c.tc.id') == '3+2' and B.evaluate('__c.tc && __c.tc.id') == '3+2', 'ajedrez: los dos juegan a 3+2')
        A.wait_for_timeout(300)
        check(A.locator('.ch-clock:not([hidden])').count() == 2, 'ajedrez: se ven los dos relojes')
        W, K = (A, B) if A.evaluate('__c.myColor') == 0 else (B, A)
        W.wait_for_timeout(1200)
        t0 = W.evaluate('__c.clockNow()[0]')
        check(179600 > t0 > 176000, f'ajedrez: el reloj de blancas corre ({t0})')
        W.evaluate("(() => { __c.commit(__c.pos.fromUci('e2e4'), 'me'); return 1; })()")
        K.wait_for_function('__c.moves.length === 1', timeout=6000)
        cw = K.evaluate('__c.clock[0]')
        check(cw > 179000, f'ajedrez: incremento de 2 s tras jugar y el rival adopta el reloj ({cw})')
        W.screenshot(path=str(SHOTS / 'chess_clock.png'))
        # Las negras se quedan sin tiempo
        K.evaluate("(() => { __c.clock[1] = 300; __c.clockStart = Date.now(); return 1; })()")
        for P in (W, K): P.wait_for_selector('.modal-overlay.active', timeout=8000)
        check('Sin tiempo' in K.inner_text('.modal-overlay.active') and 'DERROTA' in K.inner_text('.modal-overlay.active'), 'ajedrez: sin tiempo, derrota')
        check('VICTORIA' in W.inner_text('.modal-overlay.active'), 'ajedrez: el rival gana por tiempo')
        # Revancha: el reloj del rival llega a cero sin que avise → se reclama
        W.click('.modal-overlay.active .btn-primary'); K.click('.modal-overlay.active .btn-primary')
        W.wait_for_function("__c.state === 'playing'", timeout=8000); K.wait_for_function("__c.state === 'playing'", timeout=8000)
        W, K = K, W   # colores alternados
        check(W.evaluate('__c.myColor') == 0, 'ajedrez: revancha con colores cambiados')
        # Material: sólo reyes y un caballo de las negras → si a blancas se les acaba el tiempo, tablas
        FEN = '4k3/8/8/8/8/8/8/1n2K3 w - - 0 1'
        for P in (W, K): P.evaluate(f"(() => {{ __c.startFen = '{FEN}'; __c.pos = Nexus.games.ChessCore().Position.fromFen('{FEN}'); return 1; }})()")
        W.evaluate("(() => { __c.clock[0] = 200; __c.clockStart = Date.now(); return 1; })()")
        for P in (W, K): P.wait_for_selector('.modal-overlay.active', timeout=8000)
        check('TABLAS' in W.inner_text('.modal-overlay.active') and 'material' in W.inner_text('.modal-overlay.active'), 'ajedrez: sin tiempo pero el rival no puede dar mate → tablas')
        for P in (A, B): P.evaluate('Nexus.ui.modal.closeAll()')

        # ═════════ Hundir la flota online: disparo automático ═════════
        pair(A, B, 'battleship')
        A.wait_for_function("__b.phase === 'place'", timeout=8000); B.wait_for_function("__b.phase === 'place'", timeout=8000)
        for P in (A, B): P.click('[data-dock=random]'); P.click('[data-dock=ready]')
        A.wait_for_function("__b.phase === 'battle'", timeout=6000); B.wait_for_function("__b.phase === 'battle'", timeout=6000)
        S_, R_ = (A, B) if A.evaluate('__b.myTurn') else (B, A)
        txt = S_.inner_text('[data-pill="clock"]')
        check(txt.endswith(' s') and 30 <= int(txt.split()[0]) <= 35, f'flota: cuenta atrás del disparo ({txt})')
        check('·' in R_.inner_text('[data-pill="clock"]'), 'flota: el rival ve la cuenta atrás de quien dispara')
        S_.evaluate("(() => { __b.shotDeadline = Date.now() - 1; return 1; })()")
        S_.wait_for_function('__b.stats.shots === 1', timeout=4000)
        R_.wait_for_function('__b.foeStats.shots === 1', timeout=6000)
        check(True, 'flota: al agotarse el tiempo se dispara solo y el rival recibe el disparo')
        S_.screenshot(path=str(SHOTS / 'bs_clock.png'))
        b.close()
        check(not errs, 'sin errores de consola: ' + '; '.join(errs[:4]))
finally:
    for br in brokers: br.kill()

print('\nRESULT:', 'OK' if not bad else f'{len(bad)} FAIL(S)')
sys.exit(1 if bad else 0)
