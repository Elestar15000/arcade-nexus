"""Wordle · Frase del día: huecos, letras verdes fijadas, cambio de hueco, límite de intentos, persistencia y logros.
python3 tests/e2e_wordle_phrase.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, local_mode
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)
HOOK = """() => { const g = Nexus.games.registry.get('wordle'); const m = g.mount; g.mount = (r) => (window.__w = m(r)); }"""
# La frase de hoy se sustituye por una de 3 huecos conocida
FORCE = """() => { const L = Nexus.games.wordleLogic; const i = L.phraseIndexFor(Nexus.util.dayKey()); Nexus.games.wordlePhrases[i] = 'Del [dicho] al [hecho] hay [mucho] trecho.'; }"""

with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1366, 'height': 860}); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    local_mode(page); page.goto(URL); register(page, 'Tester', 'secreta1')
    page.evaluate(HOOK); page.evaluate(FORCE)
    L = 'Nexus.games.wordleLogic'
    check(page.evaluate(f"{L}.phraseIndexFor('2026-11-04') === {L}.phraseIndexFor('2026-11-04') && {L}.phraseIndexFor('2026-11-04') !== {L}.phraseIndexFor('2026-11-05')"), 'frase diaria determinista y distinta cada día')
    check(page.evaluate(f"{L}.parsePhrase('A [quién] le [ayuda].').holes.map(h => h.word).join()") == 'quien,ayuda', 'los huecos se normalizan (sin tildes)')

    page.goto(URL + '#/home'); page.wait_for_timeout(300)
    check(page.locator('a.quick-card[href="#/game/wordle/frase"]').count() == 1, 'acceso directo a la Frase del día en Inicio')
    page.click('a.quick-card[href="#/game/wordle/frase"]'); page.wait_for_timeout(500)
    check(page.evaluate('__w.mode') == 'phrase' and page.evaluate('location.hash') == '#/game/wordle', 'el enlace abre el modo Frase del día')
    check(page.locator('.wp-hole').count() == 3, 'la frase muestra 3 huecos')
    check(page.inner_text('[data-el=attempt]') == '1/12', 'límite de intentos: 3 por hueco + 3 = 12')
    check(page.locator('[data-el=board]').is_hidden() and page.locator('[data-el=hard]').is_hidden(), 'oculta el tablero clásico y el modo difícil')
    # Hueco 1 (dicho): un intento con letras verdes
    page.keyboard.type('techo'); page.keyboard.press('Enter'); page.wait_for_timeout(1900)
    greens = page.evaluate("Array.from(document.querySelectorAll('.wp-hole[data-hole=\"0\"] .tile')).map(t => t.textContent).join('')")
    check(greens == 'CHO', f'las letras verdes se fijan en el hueco ({greens})')
    page.keyboard.type('zzzzz'); page.keyboard.press('Enter'); page.wait_for_timeout(300)
    check('diccionario' in page.inner_text('[data-el=msg]'), 'rechaza palabras que no existen')
    for _ in range(5): page.keyboard.press('Backspace')
    page.keyboard.type('dicho'); page.keyboard.press('Enter'); page.wait_for_timeout(1900)
    check(page.evaluate('__w.holeSolved(0)') and page.evaluate('__w.st.active') == 1, 'hueco resuelto y pasa al siguiente')
    # Cambiar de hueco tocándolo
    page.click('.wp-hole[data-hole="2"]'); page.wait_for_timeout(150)
    check(page.evaluate('__w.st.active') == 2, 'tocar un hueco lo selecciona')
    page.keyboard.type('mucho'); page.keyboard.press('Enter'); page.wait_for_timeout(1900)
    page.screenshot(path=str(SHOTS / 'wordle_phrase.png'))
    # Persistencia
    page.goto(URL + '#/library'); page.goto(URL + '#/game/wordle'); page.wait_for_timeout(400)
    if page.evaluate('__w.mode') != 'phrase': page.click('[data-mode=phrase]'); page.wait_for_timeout(300)
    check(page.evaluate('__w.st.guesses.length') == 3 and page.evaluate('__w.st.active') == 1, 'la Frase del día se guarda y se recupera')
    page.keyboard.type('hecho'); page.keyboard.press('Enter'); page.wait_for_timeout(2600)
    check(page.evaluate('__w.st.status') == 'won' and page.locator('.modal-overlay.active').count() == 1, 'completar todos los huecos gana')
    check('Frase completa' in page.inner_text('.modal-overlay.active'), 'modal de frase completa')
    page.screenshot(path=str(SHOTS / 'wordle_phrase_win.png'))
    ach = page.evaluate("Object.keys(Nexus.services.users.data().achievements)")
    check('wd_phrase' in ach and 'wd_phrase_sharp' in ach, 'logros Refranero y Sabiduría popular')
    check('wd_first_try' not in ach and 'wd_fast3' not in ach, 'no dispara logros del Wordle clásico')
    check(page.evaluate("Nexus.services.progress.stats('wordle').byMode.phrase.wins") == 1, 'victoria registrada en el modo Frase del día')
    page.evaluate('Nexus.ui.modal.closeAll()')
    # Derrota por intentos (nueva frase forzada en otra cuenta)
    page.evaluate("() => { const sv = Nexus.services.users.data().saves.wordle; sv.phrase = null; }")
    page.click('[data-mode=random]'); page.wait_for_timeout(200); page.click('[data-mode=phrase]'); page.wait_for_timeout(300)
    for w in ['techo', 'pecho', 'lecho', 'mecha', 'fecha', 'leche', 'noche', 'coche', 'broma', 'carta', 'perro', 'gatos']:
        if page.evaluate('__w.st.status') != 'playing': break
        page.keyboard.type(w); page.keyboard.press('Enter'); page.wait_for_timeout(1500)
    page.wait_for_timeout(1200)
    check(page.evaluate('__w.st.status') == 'lost', 'agotar los 12 intentos pierde')
    check(page.locator('.modal-overlay.active .wp-answer').count() == 1, 'al perder se muestra la frase completa')
    page.evaluate('Nexus.ui.modal.closeAll()')
    page.goto(URL + '#/settings'); page.wait_for_timeout(300)
    check('Frase del día' in page.inner_text('[data-choice="wordle.defaultMode"]'), 'ajuste: Frase del día como modo inicial')
    m = b.new_page(viewport={'width': 390, 'height': 820}, has_touch=True, is_mobile=True)
    local_mode(m); m.goto(URL); register(m, 'Mov', 'secreta1'); m.evaluate(FORCE)
    m.goto(URL + '#/game/wordle/frase'); m.wait_for_timeout(500)
    check(m.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'móvil: sin scroll horizontal')
    m.screenshot(path=str(SHOTS / 'wordle_phrase_mobile.png'))
    check(not errs, 'sin errores de JS: ' + '; '.join(errs))
    b.close()
print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + ', '.join(bad))
sys.exit(1 if bad else 0)
