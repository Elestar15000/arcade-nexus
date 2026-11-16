"""Póker y Mentiroso (contra la máquina y online con 2 navegadores + bots) y Solitario (tocar, arrastrar, deshacer,
pista, autocompletar, diario y partida guardada). Arranca dos brokers MQTT locales.
python3 tests/e2e_cards_more.py"""
import pathlib, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
PORTS = (18873, 18874)
BROKERS = [f'ws://localhost:{p}' for p in PORTS]
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m, flush=True); (not c) and bad.append(m)

HOOK = """() => {
  Nexus.games.cards.TableSession.speed = 0.05;
  for (const id of ['poker', 'mentiroso', 'solitaire']) { const g = Nexus.games.registry.get(id); const m = g.mount; g.mount = (r) => (window.__g = m(r)); }
  window.__autoOn = (on) => { clearInterval(window.__auto); if (!on) return; window.__auto = setInterval(() => {
    const g = window.__g; if (!g || !g.v || g.state !== 'playing') return;
    const v = g.v; if (v.turn !== v.me) return;
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
    if (v.game === 'poker') {
      const bs = qa('#cg-actions [data-act]'); if (!bs.length) return;
      const pick = Math.random() < 0.7 ? bs.find(b => /Igualar|Pasar/.test(b.textContent)) : bs[Math.floor(Math.random() * bs.length)];
      (pick || bs[0]).click(); return;
    }
    if (v.game === 'mentiroso') {
      const call = q('.mt-call'); if (call && Math.random() < 0.3) { call.click(); return; }
      if (!(g.ui.sel || []).length) { const cs = qa('#cg-hand .pc.playable'); if (cs.length) cs[Math.floor(Math.random() * cs.length)].click(); return; }
      const play = qa('#cg-actions [data-act]').filter(b => b.dataset.act.includes('"play"'));
      if (play.length) play[Math.floor(Math.random() * play.length)].click();
    }
  }, 80); };
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

def wait_over(page, timeout=180000):
    page.wait_for_function('window.__g && window.__g.state === "over"', timeout=timeout)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--disable-features=WebRtcHideLocalIpsWithMdns'])
        errs = []
        A = player(b, 'Ana', errs)
        A.goto(URL + '#/library'); A.wait_for_timeout(300)
        lib = A.inner_text('#page-content') if A.locator('#page-content').count() else A.inner_text('body')
        check(all(x in lib for x in ['Póker', 'Mentiroso', 'Solitario']), 'biblioteca: los tres juegos nuevos aparecen')
        check(A.evaluate("['poker','mentiroso','solitaire'].every(id => Nexus.games.collections.of(id).id === 'cartas')"), 'biblioteca: están en la colección Cartas')

        # ═════════ PÓKER contra la máquina ═════════
        open_game(A, 'poker')
        check('Texas' in A.inner_text('#cg-overlay'), 'póker: menú con ayuda')
        A.click('[data-do=go-cpu]'); A.click('[data-players="3"]'); A.click('[data-do=start]')
        A.wait_for_selector('#cg-hand .pc', timeout=5000)
        v = A.evaluate('__g.v')
        check(len(v['hand']) == 2 and v['hand'][0][0] in 'SHDC' and v['pot'] == 30, 'póker: 2 cartas francesas y ciegas 10/20 en el bote')
        check(A.locator('#cg-hand .pc.fr').count() == 2 and A.locator('.pk-board .pc.empty').count() == 5, 'póker: cartas francesas dibujadas y mesa vacía')
        check(all(p['cards'] is None for i, p in enumerate(v['players']) if i != v['me']), 'póker: no ves las cartas de los bots')
        A.wait_for_function('__g.v.turn === __g.v.me', timeout=8000)
        btns = A.inner_text('#cg-actions')
        check(('Igualar' in btns or 'Pasar' in btns) and 'All-in' in btns, 'póker: botones de igualar/pasar, subir y all-in')
        A.screenshot(path=str(SHOTS / 'poker_cpu.png'))
        A.click('#cg-actions [data-act*="raise"]')
        A.wait_for_function('__g.v.turn !== __g.v.me || __g.v.street !== "preflop"', timeout=8000)
        check(any('sube' in l or 'all-in' in l for l in A.evaluate('__g.v.log')), 'póker: subir queda en el registro')
        A.evaluate('__autoOn(true)')
        A.wait_for_function('__g.v && __g.v.board.length >= 3 || __g.state === "over"', timeout=60000)
        check(A.locator('.pk-board .pc.fr').count() >= 3 or A.evaluate('__g.state') == 'over', 'póker: sale el flop')
        A.wait_for_function('__g.v && (__g.v.showdown && !__g.v.showdown.uncontested) || __g.state === "over"', timeout=90000)
        if A.evaluate('__g.v.showdown && !__g.v.showdown.uncontested'):
            A.screenshot(path=str(SHOTS / 'poker_showdown.png'))
            check(A.evaluate('__g.v.showdown.results.every(r => r.cards.length === 2 && r.name)'), 'póker: showdown con las cartas y la jugada de cada uno')
        wait_over(A, 300000); A.evaluate('__autoOn(false)')
        A.wait_for_selector('.modal-overlay.active', timeout=8000)
        mt = A.inner_text('.modal-overlay.active')
        check('Puesto' in mt and 'Fichas' in mt, 'póker: resultado con puesto y fichas')
        check(A.evaluate("Nexus.services.progress.stats('poker').played") == 1, 'póker: la partida se registra')
        A.evaluate('Nexus.ui.modal.closeAll()')

        # ═════════ MENTIROSO contra la máquina ═════════
        open_game(A, 'mentiroso')
        A.click('[data-do=go-cpu]'); A.click('[data-players="3"]'); A.click('[data-do=start]')
        A.wait_for_selector('#cg-hand .pc', timeout=5000)
        v = A.evaluate('__g.v')
        check(sum(p['count'] for p in v['players']) + len(v['dead']) * 4 == 40, 'mentiroso: se reparten las 40 cartas (y se descartan los cuatro iguales)')
        A.evaluate('Nexus.games.cards.TableSession.speed = 1')       # a velocidad normal para ver el levantamiento
        A.wait_for_function('__g.v.turn === __g.v.me', timeout=20000)
        v = A.evaluate('__g.v')
        first = A.locator('#cg-hand .pc.playable').first
        card = first.get_attribute('data-card'); first.click()
        check(A.evaluate('__g.ui.sel.length') == 1 and A.locator('#cg-hand .pc.sel').count() == 1, 'mentiroso: tocar una carta la selecciona')
        if v['mustOpen']:
            check(A.locator('.mt-ranks button').count() == 10, 'mentiroso: al abrir eliges el número de entre los 10')
            A.screenshot(path=str(SHOTS / 'mentiroso_open.png'))
            A.click('.mt-ranks button >> nth=0')
        else:
            check('Mentiroso' in A.inner_text('#cg-actions'), 'mentiroso: botón «¡Mentiroso!» para acusar')
            A.click('#cg-actions [data-act*="play"]')
        A.wait_for_timeout(100)
        check(any(l.startswith('Ana abre') or l.startswith('Ana pone') for l in A.evaluate('__g.v.log')), 'mentiroso: la carta va al montón boca abajo')
        A.evaluate('__autoOn(true)')
        A.wait_for_selector('.mt-reveal .pc', timeout=90000)
        A.screenshot(path=str(SHOTS / 'mentiroso_reveal.png'))
        rc = A.evaluate("[document.querySelectorAll('.mt-reveal').length, document.querySelectorAll('.mt-reveal .pc').length]")
        check(rc[0] == 1 and rc[1] >= 1, f'mentiroso: al acusar se levantan las cartas {rc}')
        A.evaluate('Nexus.games.cards.TableSession.speed = 0.05')
        wait_over(A, 240000); A.evaluate('__autoOn(false)')
        A.wait_for_selector('.modal-overlay.active', timeout=8000)
        check('Mentiras pilladas' in A.inner_text('.modal-overlay.active'), 'mentiroso: resultado con estadísticas')
        A.evaluate('Nexus.ui.modal.closeAll()')

        # ═════════ PÓKER online: 2 personas + 1 bot ═════════
        B = player(b, 'Beto', errs, relay=True)
        for P in (A, B): open_game(P, 'poker'); P.click('[data-do=go-online]')
        A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
        A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
        A.click('[data-ol-do=seats][data-n="3"]')
        code = A.evaluate('__g.lobby.net.code')
        B.fill('.ol-code-input', code); B.click('.ol-join-form button[type=submit]')
        A.wait_for_function('document.querySelectorAll(".cg-seat-item.guest").length === 1', timeout=20000)
        A.click('[data-ol-do=start]')
        for P in (A, B): P.wait_for_selector('#cg-hand .pc', timeout=8000)
        va, vb = A.evaluate('__g.v'), B.evaluate('__g.v')
        check(vb['me'] == 1 and len(vb['hand']) == 2 and not set(va['hand']) & set(vb['hand']), 'póker online: cada uno recibe sus 2 cartas, distintas')
        check(vb['players'][0]['cards'] is None and va['hand'][0] not in str(vb), 'póker online: el invitado no ve las cartas del anfitrión')
        for P in (A, B): P.evaluate('__autoOn(true)')
        A.wait_for_function('__g.v.handNo >= 2 || __g.state === "over"', timeout=90000)
        same = A.evaluate('JSON.stringify(__g.v.players.map(p => p.chips))')
        try:
            B.wait_for_function(f"JSON.stringify(__g.v.players.map(p => p.chips)) === '{same}'", timeout=5000); ok = True
        except Exception: ok = A.evaluate('__g.state') == 'over'
        check(ok, 'póker online: las fichas coinciden en los dos navegadores')
        wait_over(A, 300000); wait_over(B, 30000)
        check(A.evaluate('__g.v.over.text') == B.evaluate('__g.v.over.text'), 'póker online: mismo resultado en anfitrión e invitado')
        for P in (A, B): P.evaluate('__autoOn(false)'); P.evaluate('Nexus.ui.modal.closeAll()')
        A.evaluate('__g.lobby.leave()'); B.evaluate('__g.lobby.leave()')

        # ═════════ MENTIROSO online: 2 personas + 2 bots ═════════
        for P in (A, B): open_game(P, 'mentiroso'); P.click('[data-do=go-online]')
        A.wait_for_selector('.ol-status[data-state=online]', timeout=8000)
        A.click('[data-ol-do=create]'); A.wait_for_selector('.ol-code-big', timeout=8000)
        code = A.evaluate('__g.lobby.net.code')
        B.fill('.ol-code-input', code); B.click('.ol-join-form button[type=submit]')
        A.wait_for_function('document.querySelectorAll(".cg-seat-item.guest").length === 1', timeout=20000)
        A.click('[data-ol-do=start]')
        for P in (A, B): P.wait_for_selector('#cg-hand .pc', timeout=8000)
        va, vb = A.evaluate('__g.v'), B.evaluate('__g.v')
        check(len(va['players']) == 4 and not set(va['hand']) & set(vb['hand']), 'mentiroso online: mesa de 4 con manos distintas y ocultas')
        for P in (A, B): P.evaluate('__autoOn(true)')
        wait_over(A, 300000); wait_over(B, 30000)
        check(A.evaluate('__g.v.over.text') == B.evaluate('__g.v.over.text'), 'mentiroso online: mismo resultado en los dos navegadores')
        B.screenshot(path=str(SHOTS / 'mentiroso_online_end.png'))
        for P in (A, B): P.evaluate('__autoOn(false)'); P.evaluate('Nexus.ui.modal.closeAll()')
        A.evaluate('__g.lobby.leave()'); B.evaluate('__g.lobby.leave()')

        # ═════════ SOLITARIO ═════════
        open_game(A, 'solitaire')
        check(A.locator('.ax-mode').count() == 3 or 'Robar 3' in A.inner_text('.pz-overlay'), 'solitario: modos robar 1, robar 3 y diario')
        A.click('.pz-overlay [data-do=new]'); A.wait_for_selector('.sol-col .sol-card', timeout=4000)
        check(A.locator('.sol-tab .sol-card').count() == 28 and A.locator('.sol-tab .sol-card.down').count() == 21, 'solitario: 7 columnas con 28 cartas (21 boca abajo)')
        A.click('#sol-stock')
        check(A.evaluate('__g.st.waste.length') == 1 and A.locator('#sol-waste .sol-card').count() == 1, 'solitario: tocar el mazo roba una carta')
        A.click('#sol-undo')
        check(A.evaluate('__g.st.waste.length') == 0 and A.evaluate('__g.st.stock.length') == 24, 'solitario: deshacer')
        A.screenshot(path=str(SHOTS / 'solitaire_start.png'))
        # Posición preparada: tocar mueve solo y arrastrar mueve una pila
        A.evaluate("""() => { const g = __g; g.st = { stock: ['C2'], waste: ['H1'], found: { S: [], H: [], D: [], C: ['C1'] },
            tab: [[{ c: 'S13', up: true }, { c: 'H12', up: true }], [{ c: 'D4', up: false }, { c: 'S11', up: true }], [{ c: 'C5', up: true }], [], [{ c: 'D13', up: true }], [], []], score: 0, moves: 0, recycles: 0 };
            g.hist = []; g.render(); }""")
        A.click('#sol-waste .sol-card')
        check(A.evaluate('__g.st.found.H.length') == 1 and A.evaluate('__g.st.score') == 10, 'solitario: tocar el As lo sube a su fundación (+10)')
        src = A.locator('[data-col="1"] .sol-card[data-idx="1"]').bounding_box(); dst = A.locator('[data-col="0"] .sol-card[data-idx="1"]').bounding_box()
        A.mouse.move(src['x'] + src['width'] / 2, src['y'] + 10); A.mouse.down()
        for k in range(1, 9): A.mouse.move(src['x'] + src['width'] / 2 + (dst['x'] - src['x']) * k / 8, src['y'] + 10 + (dst['y'] + 30 - src['y']) * k / 8)
        A.mouse.up(); A.wait_for_timeout(150)
        st = A.evaluate('__g.st')
        check(len(st['tab'][0]) == 3 and st['tab'][0][2]['c'] == 'S11' and st['tab'][1][0]['up'], 'solitario: arrastrar la J negra sobre la Q roja y se destapa la de debajo')
        A.click('#sol-hint'); A.wait_for_timeout(100)
        check(A.locator('.sol .hint, .sol .target').count() >= 1, 'solitario: la pista resalta un movimiento')
        A.click('[data-col="4"] .sol-card')
        check(A.evaluate('__g.st.tab[4].length') == 1, 'solitario: tocar un rey que ya está al fondo no lo mueve')
        # Casi resuelto: «Terminar» sube todo y se gana
        A.evaluate("""() => { const g = __g; const f = {}; for (const s of ['S','H','D','C']) f[s] = Array.from({ length: 11 }, (_, i) => s + (i + 1));
            g.st = { stock: [], waste: [], found: f, tab: [[{ c: 'S13', up: true }, { c: 'H12', up: true }], [{ c: 'H13', up: true }, { c: 'S12', up: true }], [{ c: 'D13', up: true }, { c: 'C12', up: true }], [{ c: 'C13', up: true }, { c: 'D12', up: true }], [], [], []], score: 400, moves: 120, recycles: 0 };
            g.hist = []; g.render(); }""")
        check(A.locator('#sol-auto:not([hidden])').count() == 1, 'solitario: aparece «Terminar» con todo a la vista')
        A.screenshot(path=str(SHOTS / 'solitaire_auto.png'))
        A.click('#sol-auto')
        A.wait_for_selector('.modal-overlay.active', timeout=8000)
        check('RESUELTO' in A.inner_text('.modal-overlay.active') and A.evaluate("Nexus.services.progress.stats('solitaire').wins") == 1, 'solitario: ganar registra la partida')
        A.screenshot(path=str(SHOTS / 'solitaire_win.png'))
        A.evaluate('Nexus.ui.modal.closeAll()')
        # Diario: el mismo reparto en otro navegador; partida guardada al salir
        A.evaluate('__g.showMenu()'); A.click('[data-mode=diario]'); A.click('.pz-overlay [data-do=new]'); A.wait_for_selector('.sol-col .sol-card')
        da = A.evaluate('JSON.stringify(__g.st.tab)')
        open_game(B, 'solitaire'); B.click('[data-mode=diario]'); B.click('.pz-overlay [data-do=new]'); B.wait_for_selector('.sol-col .sol-card')
        check(B.evaluate('JSON.stringify(__g.st.tab)') == da, 'solitario diario: mismo reparto para todos')
        B.click('#sol-stock')
        open_game(B, 'solitaire')
        check(B.locator('[data-do=resume]').count() == 1, 'solitario: la partida a medias se puede continuar')
        B.click('[data-do=resume]'); B.wait_for_selector('.sol-col .sol-card')
        check(B.evaluate('__g.st.waste.length') == 1, 'solitario: al continuar se recupera el estado')
        M = player(b, 'Movil', errs, mobile=True)
        open_game(M, 'solitaire'); M.click('.pz-overlay [data-do=new]'); M.wait_for_selector('.sol-col .sol-card')
        check(M.evaluate("document.querySelector('.sol').scrollWidth <= document.querySelector('.sol').clientWidth + 1"), 'solitario móvil: las 7 columnas caben a lo ancho')
        M.screenshot(path=str(SHOTS / 'solitaire_mobile.png'))
        open_game(M, 'poker'); M.click('[data-do=go-cpu]'); M.click('[data-players="4"]'); M.click('[data-do=start]')
        M.wait_for_selector('#cg-hand .pc', timeout=5000); M.wait_for_timeout(600)
        M.screenshot(path=str(SHOTS / 'poker_mobile.png'))

        check(not errs, 'sin errores de JavaScript: ' + '; '.join(errs[:4]))
        b.close()
finally:
    for br in brokers: br.terminate()

print(f'\n{len(bad)} FALLO(S)' if bad else '\nRESULT: OK')
sys.exit(1 if bad else 0)
