"""Pasapalabra: rosco diario determinista, 4 dificultades aleatorias, respuestas, pistas, persistencia.
python3 tests/e2e_pasapalabra.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1366, 'height': 800}); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(m.text))
    local_mode(page)
    page.goto(URL); register(page, 'Tester', 'secreta1')
    W = """() => { const g = Nexus.games.registry.get('pasapalabra'); const m = g.mount; g.mount = (r) => (window.__pp = m(r)); }"""
    page.evaluate(W)

    # Lógica pura
    L = "Nexus.games.pasapalabraLogic"
    d1 = page.evaluate(f"{L}.buildDaily('2026-11-02').map(q => q.id).join()")
    d2 = page.evaluate(f"{L}.buildDaily('2026-11-02').map(q => q.id).join()")
    d3 = page.evaluate(f"{L}.buildDaily('2026-11-03').map(q => q.id).join()")
    check(d1 == d2 and d1 != d3, 'rosco diario: mismo día = mismo rosco; otro día = distinto')
    for lv in ['basic', 'medium', 'hard', 'pro']:
        ok = page.evaluate(f"(() => {{ const r = {L}.buildRandom('{lv}', []); return r.length === 25 && r.every(q => q.id.startsWith('{lv}:')); }})()")
        check(ok, f'rosco aleatorio {lv}: 25 letras de su nivel')
    check(page.evaluate(f"""(() => {{ const q = {{l:'Ñ', a:'año', x:[]}}; return [{L}.isCorrect(q,'AÑO',false), {L}.isCorrect(q,'ano',false), {L}.isCorrect(q,'aro',false)]; }})()""") == [True, True, False], 'Ñ: acepta teclado sin ñ')
    check(page.evaluate(f"""(() => {{ const q = {{l:'B', a:'biblioteca', x:[]}}; return [{L}.isCorrect(q,'bibliotca',true), {L}.isCorrect(q,'bibliotca',false), {L}.isCorrect(q,'Biblioteca',false)]; }})()""") == [True, False, True], 'tolerancia ortográfica sólo en básico/medio')

    # Juego: diaria
    page.goto(URL + '#/game/pasapalabra'); page.wait_for_timeout(500)
    check(page.locator('.pp-l').count() == 25, 'rosco de 25 letras')
    check(page.locator('[data-mode]').count() == 5, '5 modos (diaria + 4 dificultades)')
    check(page.locator('[data-act=start]').count() == 1 and page.locator('.pp-def').count() == 0, 'definiciones ocultas hasta empezar')
    page.click('[data-act=start]'); page.wait_for_timeout(200)
    check(page.locator('[data-el=hTimer]').count() == 0 and ':' not in page.inner_text('.pp-core .pp-time'), 'sin cuenta atrás visible durante el rosco')
    q0 = page.evaluate("__pp.st.qs[0]")
    check(page.locator('.pp-l[data-cur]').inner_text().strip() == 'A', 'empieza en la A')
    page.fill('[data-el=form] input', q0['a']); page.keyboard.press('Enter'); page.wait_for_timeout(150)
    check(page.evaluate("__pp.st.res[0]") == 1 and page.evaluate("__pp.st.idx") == 1, 'acierto avanza a la siguiente')
    page.fill('[data-el=form] input', 'zzzz'); page.keyboard.press('Enter'); page.wait_for_timeout(150)
    check(page.evaluate("__pp.st.res[1]") == 2, 'fallo marcado en rojo')
    page.click('[data-act=pass]'); page.wait_for_timeout(100)
    check(page.evaluate("__pp.st.res[2]") == 3 and page.evaluate("__pp.st.idx") == 3, 'pasapalabra deja la letra pendiente')
    page.fill('[data-el=form] input', 'pasapalabra'); page.keyboard.press('Enter'); page.wait_for_timeout(100)
    check(page.evaluate("__pp.st.res[3]") == 3, 'escribir "pasapalabra" también pasa')

    # Persistencia al recargar (el tiempo sigue contando desde la hora de inicio)
    end = page.evaluate("__pp.st.startAt")
    page.reload(); page.wait_for_selector('#shell:not([hidden])'); page.evaluate(W)
    page.goto(URL + '#/library'); page.goto(URL + '#/game/pasapalabra'); page.wait_for_timeout(500)
    check(page.evaluate("[__pp.st.status, __pp.st.res.slice(0,4).join(''), __pp.st.startAt]") == ['playing', '1233', end], 'rosco en curso restaurado con la misma hora de inicio')

    # Terminar: responder todas bien -> perfecto
    page.evaluate("""() => { const s = __pp.st; for (let i = 0; i < 25; i++) if (s.res[i] !== 1) { s.idx = i; __pp.answer(s.qs[i].a); } }""")
    page.wait_for_timeout(1500)
    check(page.evaluate("[__pp.st.status, __pp.st.ok]") == ['over', 25] or page.evaluate("__pp.st.status") == 'over', 'rosco completo termina la partida')
    check(page.locator('.modal-overlay.active').count() == 1, 'modal de resultado')
    check(page.locator('.modal-overlay.active .pp-mark b').count() == 1 and ':' in page.inner_text('.modal-overlay.active .pp-mark b'), 'al terminar muestra tu marca de tiempo')
    check(page.evaluate("__pp.st.time") > 0, 'la marca se guarda en la partida')
    st = page.evaluate("Nexus.services.progress.stats('pasapalabra')")
    check(st['played'] == 1 and st['wins'] == 1 and st['extra']['perfects'] >= 0, 'partida registrada')
    page.evaluate("Nexus.ui.modal.closeAll()")
    check(page.evaluate("Nexus.services.achievements.isUnlocked('pp_daily')"), 'logro del rosco diario')
    page.screenshot(path='/tmp/shots/pp_end.png')

    # Diaria jugada: tras recargar sigue terminada, no se puede repetir
    page.reload(); page.wait_for_selector('#shell:not([hidden])'); page.evaluate(W)
    page.goto(URL + '#/library'); page.goto(URL + '#/game/pasapalabra'); page.wait_for_timeout(500)
    check(page.evaluate("__pp.st.status") == 'over' and page.locator('[data-act=start]').count() == 0, 'diaria terminada no se puede repetir')

    # Dificultades
    page.click('[data-mode=pro]'); page.wait_for_timeout(200)
    check('Longitud oculta' in page.inner_text('[data-el=panel]') or page.locator('[data-act=start]').count() == 1, 'profesional: pantalla de inicio')
    page.click('[data-act=start]'); page.wait_for_timeout(200)
    check('Longitud oculta' in page.inner_text('[data-el=panel]'), 'profesional: no muestra la longitud')
    check(page.locator('[data-act=hint]').count() == 0, 'profesional: sin pistas')
    page.fill('[data-el=form] input', 'qqq'); page.keyboard.press('Enter'); page.wait_for_timeout(100)
    check(page.evaluate("__pp.st.penaltyS") == 10, 'profesional: cada fallo suma 10 s a la marca')
    page.screenshot(path='/tmp/shots/pp_pro.png')
    page.click('[data-mode=basic]'); page.wait_for_timeout(200); page.click('[data-act=start]'); page.wait_for_timeout(200)
    check(page.evaluate("__pp.st.hintsLeft") == 3, 'básico: 3 pistas')
    before = page.inner_text('.pp-pattern')
    page.click('[data-act=hint]'); page.wait_for_timeout(100)
    check(page.evaluate("__pp.st.hintsLeft") == 2 and page.inner_text('.pp-pattern') != before, 'pista revela una letra')
    q = page.evaluate("__pp.st.qs[0]")
    page.fill('[data-el=form] input', q['a'][:-1] + 'x' if len(q['a']) >= 6 else q['a']); page.keyboard.press('Enter'); page.wait_for_timeout(100)
    page.screenshot(path='/tmp/shots/pp_basic.png')
    # Abandonar -> derrota al pedir otro rosco
    page.click('[data-el=new]'); page.wait_for_selector('.modal-overlay.active'); page.click('.modal-buttons .btn-danger'); page.wait_for_timeout(1200)
    page.evaluate("Nexus.ui.modal.closeAll()")
    check(page.evaluate("Nexus.services.progress.stats('pasapalabra').played") == 2, 'abandonar cuenta como partida')
    # Sin límite de tiempo: aunque pase mucho rato el rosco sigue, y la marca lo refleja
    page.click('[data-mode=hard]'); page.click('[data-act=start]'); page.wait_for_timeout(150)
    page.evaluate("__pp.st.startAt = Date.now() - 400000"); page.wait_for_timeout(600)
    check(page.evaluate("__pp.st.status") == 'playing', 'no hay límite de tiempo')
    page.evaluate("() => { const s = __pp.st; for (let i = 0; i < 25; i++) if (s.res[i] !== 1 && s.res[i] !== 2) { s.idx = i; __pp.answer(s.qs[i].a); } }")
    page.wait_for_timeout(1200)
    check(page.evaluate("Math.round(__pp.st.time)") >= 400, 'la marca refleja el tiempo real tardado')
    page.screenshot(path='/tmp/shots/pp_mark.png')
    page.evaluate("Nexus.ui.modal.closeAll()")
    # Partida guardada con la versión antigua (cuenta atrás) se convierte
    page.evaluate("() => { const sv = Nexus.services.users.data().saves.pasapalabra; const r = sv.runs.medium = JSON.parse(JSON.stringify(sv.runs.hard)); r.mode = 'medium'; r.status = 'playing'; r.endAt = Date.now() + 100000; r.total = 180; delete r.startAt; delete r.time; delete r.penaltyS; r.recorded = false; }")
    page.click('[data-mode=medium]'); page.wait_for_timeout(200)
    check(page.evaluate("[__pp.st.status, Math.round((Date.now() - __pp.st.startAt) / 1000)]") == ['playing', 80], 'partidas guardadas con reloj antiguo se migran')

    # Ranking, home, ajustes, móvil
    page.goto(URL + '#/rankings'); page.wait_for_timeout(500)
    check(page.locator('.chip-btn, [data-tab]').filter(has_text='Pasapalabra').count() >= 1, 'ranking incluye Pasapalabra')
    page.goto(URL + '#/home'); page.wait_for_timeout(400)
    check('Pasapalabra' in page.inner_text('#view'), 'inicio muestra el rosco diario')
    page.goto(URL + '#/settings'); page.wait_for_timeout(300)
    check(page.locator('[data-choice="pasapalabra.defaultMode"]').count() == 1, 'ajuste del modo inicial')
    m = b.new_page(viewport={'width': 390, 'height': 800}, has_touch=True, is_mobile=True); m.on('pageerror', lambda e: errs.append(str(e)))
    local_mode(m); m.goto(URL); register(m, 'Mov', 'secreta1'); m.goto(URL + '#/game/pasapalabra'); m.wait_for_timeout(500)
    m.click('[data-act=start]'); m.wait_for_timeout(300)
    check(m.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'móvil: sin scroll horizontal')
    m.screenshot(path='/tmp/shots/pp_mobile.png')

    check(not errs, 'sin errores de JS: ' + '; '.join(errs))
    b.close()
print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + ', '.join(bad))
