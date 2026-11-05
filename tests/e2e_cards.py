"""Brisca, Guiñote y Chinchón: contra la máquina y online (mesas de 2 y de 4 navegadores con bots en los huecos,
información oculta, sustitución por bot de quien se va, vuelta a la mesa). Arranca dos brokers MQTT locales.
python3 tests/e2e_cards.py"""
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

HOOK = """() => {
  Nexus.games.cards.TableSession.speed = 0.06;
  for (const id of ['brisca', 'guinote', 'chinchon']) { const g = Nexus.games.registry.get(id); const m = g.mount; g.mount = (r) => (window.__g = m(r)); }
  const CH = Nexus.games.cardRules.chinchon;
  window.__autoOn = (on) => { clearInterval(window.__auto); if (!on) return; window.__auto = setInterval(() => {
    const g = window.__g; if (!g || !g.v || g.state !== 'playing') return;
    const v = g.v; if (v.turn !== v.me) return;
    const q = (s) => document.querySelector(s);
    if (v.game === 'chinchon') {
      if (v.canDraw) { const b = q('.cg-pile.can'); if (b) b.click(); return; }
      if (v.phase !== 'discard') return;
      if (v.closeWith.length) { if (!g.ui.close) { q('#cg-actions [data-ui=close]').click(); return; } q(`#cg-hand [data-card="${v.closeWith[0]}"]`).click(); return; }
      const loose = [...document.querySelectorAll('#cg-hand .cg-loose .pc.playable')].sort((a, b) => CH.value(b.dataset.card) - CH.value(a.dataset.card));
      (loose[0] || q('#cg-hand .pc.playable')).click();
      return;
    }
    const btn = q('#cg-actions [data-act]'); if (btn && Math.random() < 0.6) { btn.click(); return; }
    const cs = document.querySelectorAll('#cg-hand .pc.playable'); if (cs.length) cs[Math.floor(Math.random() * cs.length)].click();
  }, 90); };
}"""
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

def open_game(page, gid):
    if page.evaluate('location.hash').startswith('#/game/'): page.goto(URL + '#/home'); page.wait_for_timeout(150)
    page.goto(URL + f'#/game/{gid}'); page.wait_for_timeout(400)

def wait_over(page, timeout=120000):
    page.wait_for_function('window.__g && window.__g.state === "over"', timeout=timeout)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
        errs = []
        A = player(b, 'Ana', errs)
        A.goto(URL + '#/library'); A.wait_for_timeout(300)
        for gid in ('brisca', 'guinote', 'chinchon'):
            check(A.locator(f'a.game-card[href="#/game/{gid}"]').count() == 1, f'{gid} en la biblioteca')

        # ═════════ BRISCA contra la máquina ═════════
        open_game(A, 'brisca')
        check(A.locator('.cg-choice').count() == 2, 'brisca: menú con máquina / online')
        A.click('[data-do=go-cpu]')
        A.wait_for_selector('#cg-hand .pc', timeout=4000)
        v = A.evaluate('__g.v')
        check(v['n'] == 2 and len(v['hand']) == 3, 'brisca: 2 jugadores, 3 cartas en mano')
        check(A.locator('.cg-stock .cg-muestra').count() == 1, 'brisca: muestra visible bajo el mazo')
        check('hands' not in v and all('count' in pl for pl in v['players']), 'brisca: la vista no incluye las manos ajenas')
        A.screenshot(path=str(SHOTS / 'cards_brisca.png'))
        A.evaluate('__autoOn(true)')
        wait_over(A, 90000)
        A.wait_for_selector('.modal-result, .modal', timeout=6000)
        v = A.evaluate('__g.v')
        check(sum(v['pts']) == 120, f'brisca: se reparten los 120 puntos ({v["pts"]})')
        A.screenshot(path=str(SHOTS / 'cards_brisca_end.png'))
        A.evaluate('__autoOn(false)')

        # ═════════ CHINCHÓN contra la máquina (3 jugadores) ═════════
        open_game(A, 'chinchon')
        A.click('[data-do=go-cpu]')
        A.click('[data-players="3"]'); A.click('[data-do=start]')
        A.wait_for_selector('#cg-hand .pc', timeout=4000)
        v = A.evaluate('__g.v')
        check(v['n'] == 3 and len(v['hand']) == 7, 'chinchón: 3 jugadores, 7 cartas')
        check(A.locator('.cg-seat:not([hidden])').count() == 3, 'chinchón: 3 asientos en la mesa')
        # Robar y descartar a mano una vez
        A.wait_for_function('__g.v.turn === __g.v.me', timeout=15000)
        A.click('.cg-pile.can >> nth=0')
        A.wait_for_function('__g.v.phase === "discard"', timeout=3000)
        check(len(A.evaluate('__g.v.hand')) == 8, 'chinchón: tras robar tengo 8 cartas')
        A.screenshot(path=str(SHOTS / 'cards_chinchon.png'))
        A.click('#cg-hand .pc.playable >> nth=0')
        A.wait_for_function('__g.v.turn !== __g.v.me || __g.v.phase === "draw"', timeout=3000)
        check(len(A.evaluate('__g.v.hand')) == 7, 'chinchón: tras descartar vuelvo a 7')
        A.evaluate('__autoOn(true)')
        A.wait_for_function('__g.v.roundResult || __g.v.over', timeout=60000)
        A.screenshot(path=str(SHOTS / 'cards_chinchon_round.png'))
        check(A.locator('.cg-round').count() == 1, 'chinchón: se muestra el recuento de la ronda')
        wait_over(A, 240000)
        v = A.evaluate('__g.v')
        check(len(v['over']['winners']) == 1, f'chinchón: hay un ganador ({v["over"]["text"]})')
        A.evaluate('__autoOn(false)')

        # ═════════ GUIÑOTE online: 3 personas + 1 bot ═════════
        B = player(b, 'Beto', errs, relay=True)
        C = player(b, 'Carla', errs, mobile=True)
        for P in (A, B, C): open_game(P, 'guinote')
        for P in (A, B, C): P.click('[data-do=go-online]')
        A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
        A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
        code = A.evaluate('__g.lobby.net.code')
        B.fill('.ol-code-input', code); B.click('.ol-join-form button[type=submit]')
        C.wait_for_selector(f'[data-ol-do=join][data-code="{code}"]', timeout=8000)
        check('1/4' in C.inner_text('.ol-rooms') or '2/4' in C.inner_text('.ol-rooms'), 'guiñote: el buscador muestra ocupación de la mesa')
        C.click(f'[data-ol-do=join][data-code="{code}"]')
        A.wait_for_function('document.querySelectorAll(".cg-seat-item.guest").length === 2', timeout=20000)
        B.wait_for_function('document.querySelectorAll(".cg-seat-item").length === 4', timeout=6000)
        check(A.locator('.cg-seat-item.bot').count() == 1, 'guiñote: el hueco libre lo ocupa un bot')
        check('Carla' in C.inner_text('.cg-seats-list') and 'Beto' in C.inner_text('.cg-seats-list'), 'guiñote: los invitados ven la lista de asientos')
        A.screenshot(path=str(SHOTS / 'cards_guinote_room.png'))
        A.click('[data-ol-do=start]')
        for P in (A, B, C): P.wait_for_selector('#cg-hand .pc', timeout=8000)
        vb = B.evaluate('__g.v'); vc = C.evaluate('__g.v')
        check(vb['me'] == 1 and vc['me'] == 2 and len(vb['hand']) == 6, 'guiñote: cada invitado recibe su asiento y 6 cartas')
        check(not set(vb['hand']) & set(vc['hand']) and not set(vb['hand']) & set(A.evaluate('__g.v.hand')), 'guiñote: manos distintas y ocultas')
        check(C.locator('.cg-seat.mate').count() == 1, 'guiñote: se marca al compañero')
        C.screenshot(path=str(SHOTS / 'cards_guinote_mobile.png'))
        for P in (A, B, C): P.evaluate('__autoOn(true)')
        A.wait_for_function('__g.v.handNo > 1 || __g.v.over || __g.v.deck < 10', timeout=60000)
        # Carla se va: la sustituye un bot y la partida sigue
        C.evaluate('__autoOn(false)'); C.context.close()
        A.wait_for_function('__g.pub[2].bot === true', timeout=15000)
        check(True, 'guiñote: quien se va es sustituido por un bot')
        wait_over(A, 240000); wait_over(B, 20000)
        check(A.evaluate('__g.v.over.text') == B.evaluate('__g.v.over.text'), 'guiñote: el resultado coincide en anfitrión e invitado')
        A.wait_for_selector('.modal button:has-text("Volver a la mesa")', timeout=8000)
        A.screenshot(path=str(SHOTS / 'cards_guinote_end.png'))
        A.click('.modal button:has-text("Volver a la mesa")')
        A.wait_for_selector('.cg-seats-list', timeout=6000)
        B.click('.modal button:has-text("Volver a la mesa")')
        B.wait_for_selector('.cg-seats-list', timeout=6000)
        check(A.locator('.cg-seat-item.guest').count() == 1, 'guiñote: tras la partida vuelven a la mesa los que siguen')
        for P in (A, B): P.evaluate('__autoOn(false)')
        A.click('[data-ol-do=cancel]')
        B.wait_for_selector('.ol-error, .ol-join-form', timeout=10000)
        check(True, 'guiñote: cerrar la mesa devuelve al invitado al vestíbulo')

        # ═════════ BRISCA online 1 contra 1 (con relevo) ═════════
        for P in (A, B): open_game(P, 'brisca'); P.click('[data-do=go-online]')
        A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
        A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
        code = A.evaluate('__g.lobby.net.code')
        B.fill('.ol-code-input', code); B.click('.ol-join-form button[type=submit]')
        A.wait_for_function('document.querySelectorAll(".cg-seat-item.guest").length === 1', timeout=20000)
        check(A.locator('.ol-seg').count() == 0, 'brisca online: mesa fija de 2')
        A.click('[data-ol-do=start]')
        for P in (A, B): P.wait_for_selector('#cg-hand .pc', timeout=8000)
        # Jugada ilegal del invitado (fuera de turno) se rechaza
        t = A.evaluate('__g.v.turn')
        if t == 0:
            B.evaluate("__g.lobby.send({ type: 'play', card: __g.v.hand[0] })"); B.wait_for_timeout(400)
            check(A.evaluate('__g.v.trick.length') == 0, 'brisca online: el anfitrión rechaza jugadas fuera de turno')
        for P in (A, B): P.evaluate('__autoOn(true)')
        wait_over(A, 120000); wait_over(B, 20000)
        va, vb = A.evaluate('__g.v'), B.evaluate('__g.v')
        check(va['pts'] == vb['pts'][::-1] or va['pts'] == vb['pts'], 'brisca online: mismos puntos en los dos navegadores')
        won_a = 0 in va['over']['winners']; won_b = 1 in vb['over']['winners']
        check(va['over']['draw'] or won_a != won_b, 'brisca online: un ganador y un perdedor')
        A.wait_for_timeout(1600)

        # Logros registrados
        ids = A.evaluate("Nexus.services.achievements.all ? Nexus.services.achievements.all().map(a => a.id) : []")
        if ids: check(all(x in ids for x in ('br_first', 'gu_40', 'ch_chinchon')), 'logros de cartas registrados')
        check(not errs, 'sin errores de JavaScript' + (': ' + ' | '.join(errs[:5]) if errs else ''))
        b.close()
finally:
    for br in brokers: br.terminate()

print('\nRESULT:', 'OK' if not bad else f'{len(bad)} FAIL(S)')
sys.exit(1 if bad else 0)
