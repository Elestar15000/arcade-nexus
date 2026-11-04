"""Wordle · Frase del día: frase entera oculta, cada intento revela todas las apariciones de sus letras,
6 intentos, persistencia, derrota, logros y vista móvil. Reproduce el ejemplo LA PUERTA DE ALCALÁ.
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
FORCE = """(t) => { const L = Nexus.games.wordleLogic; const i = L.phraseIndexFor(Nexus.util.dayKey()); Nexus.games.wordlePhrases[i] = t; }"""
ROW = "(r) => Array.from(document.querySelectorAll(`.tile[data-r='${r}']`)).map(t => t.dataset.state || '-').join(',')"
SHOWN = "() => Array.from(document.querySelectorAll('[data-el=phrase] .wp-phrase .tile')).map(t => t.textContent || '_').join('')"

with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1366, 'height': 900}); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); register(page, 'Tester', 'secreta1')
    page.evaluate(HOOK); page.evaluate(FORCE, 'La puerta de Alcalá')
    L = 'Nexus.games.wordleLogic'
    check(page.evaluate(f"{L}.phraseIndexFor('2026-11-04') !== {L}.phraseIndexFor('2026-11-05')"), 'una frase distinta cada día (igual para todos)')
    check(page.evaluate(f"[...{L}.parsePhrase('La puerta de Alcalá').letters].sort().join('')") == 'acdelprtu', 'letras a descubrir sin tildes')

    page.goto(URL + '#/home'); page.wait_for_timeout(300)
    page.click('a.quick-card[href="#/game/wordle/frase"]'); page.wait_for_timeout(500)
    check(page.evaluate('__w.mode') == 'phrase', 'acceso directo desde Inicio abre la Frase del día')
    check(page.locator('[data-el=board]').is_visible() and page.locator('.wordle-row').count() >= 6, 'tablero normal de 6 intentos')
    check(page.locator('.wp-word').count() == 4 and [page.locator('.wp-word').nth(i).locator('.tile').count() for i in range(4)] == [2, 6, 2, 6], 'frase oculta: 4 palabras de 2, 6, 2 y 6 letras')
    check(page.evaluate(SHOWN) == '_' * 16, 'al empezar toda la frase está oculta')
    check(page.locator('.wp').evaluate("e => e.compareDocumentPosition(document.querySelector('[data-el=board]')) & Node.DOCUMENT_POSITION_PRECEDING") > 0, 'la frase está debajo del tablero')
    page.screenshot(path=str(SHOTS / 'wordle_phrase_start.png'))

    def guess(w):
        page.keyboard.type(w); page.keyboard.press('Enter'); page.wait_for_timeout(2000)
    guess('hielo')
    check(page.evaluate(ROW, 0) == 'absent,absent,correct,correct,absent', 'HIELO: E y L verdes (están en la frase), H I O grises')
    shown = page.evaluate(SHOWN)
    check(shown == 'L___E____E_L__L_', f'se revelan TODAS las apariciones de E y L ({shown})')
    guess('abeja')
    check(page.evaluate(ROW, 1) == 'correct,absent,known,absent,correct', 'ABEJA: A verde (las dos), E ya descubierta')
    page.keyboard.type('zzzzz'); page.keyboard.press('Enter'); page.wait_for_timeout(300)
    check('diccionario' in page.inner_text('[data-el=msg]'), 'rechaza palabras que no existen')
    for _ in range(5): page.keyboard.press('Backspace')
    guess('prado')
    check(page.evaluate(ROW, 2) == 'correct,correct,known,correct,absent', 'PRADO: P R D nuevas, A ya descubierta')
    page.screenshot(path=str(SHOTS / 'wordle_phrase_mid.png'))
    # Persistencia
    page.goto(URL + '#/library'); page.goto(URL + '#/game/wordle'); page.wait_for_timeout(400)
    if page.evaluate('__w.mode') != 'phrase': page.click('[data-mode=phrase]'); page.wait_for_timeout(300)
    check(page.evaluate('__w.st.guesses') == ['hielo', 'abeja', 'prado'] and page.evaluate(ROW, 2) == 'correct,correct,known,correct,absent', 'la partida se guarda y se recupera con sus colores')
    guess('truco'); page.wait_for_timeout(1500)
    shown = page.evaluate(SHOWN)
    check(shown == 'LAPUERTADEALCALÁ', f'TRUCO completa la frase con su tilde ({shown})')
    check(page.evaluate('__w.st.status') == 'won' and page.locator('.modal-overlay.active').count() == 1, 'frase completa en 4 intentos: victoria')
    page.screenshot(path=str(SHOTS / 'wordle_phrase_win.png'))
    page.evaluate('Nexus.ui.modal.closeAll()'); page.wait_for_timeout(200)
    page.screenshot(path=str(SHOTS / 'wordle_phrase_done.png'))
    ach = page.evaluate("Object.keys(Nexus.services.users.data().achievements)")
    check('wd_phrase' in ach and 'wd_phrase_sharp' not in ach, 'logro Refranero (y no el de 3 intentos)')
    check('wd_first_try' not in ach and 'wd_enye' not in ach, 'no dispara logros del Wordle clásico')
    check(page.evaluate("Nexus.services.progress.stats('wordle').byMode.phrase.wins") == 1, 'victoria registrada en el modo Frase del día')
    check('Frase del día' in page.evaluate('__w.shareText()') and '🟢' in page.evaluate('__w.shareText()'), 'compartir: cuadrícula con letras nuevas y ya descubiertas')

    # Derrota: 6 intentos sin completar
    page.evaluate("() => { Nexus.services.users.data().saves.wordle.phrase = null; }"); page.evaluate(FORCE, 'Feliz cumpleaños')
    page.click('[data-mode=random]'); page.wait_for_timeout(200); page.click('[data-mode=phrase]'); page.wait_for_timeout(300)
    for w in ['perro', 'gatos', 'mosca', 'noche', 'barco', 'dedos']: guess(w)
    page.wait_for_timeout(1000)
    check(page.evaluate('__w.st.status') == 'lost', 'agotar los 6 intentos pierde')
    check(page.locator('.modal-overlay.active .wp-answer').count() == 1 and 'CUMPLEAÑOS' in page.inner_text('.modal-overlay.active .wp-answer').replace('\n', ''), 'al perder se muestra la frase completa')
    page.evaluate('Nexus.ui.modal.closeAll()')
    page.goto(URL + '#/settings'); page.wait_for_timeout(300)
    check('Frase del día' in page.inner_text('[data-choice="wordle.defaultMode"]'), 'ajuste: Frase del día como modo inicial')
    m = b.new_page(viewport={'width': 390, 'height': 820}, has_touch=True, is_mobile=True)
    m.goto(URL); register(m, 'Mov', 'secreta1'); m.evaluate(FORCE, 'La Concha de San Sebastián')
    m.goto(URL + '#/game/wordle/frase'); m.wait_for_timeout(500)
    m.keyboard.type('canto'); m.keyboard.press('Enter'); m.wait_for_timeout(2000)
    check(m.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), 'móvil: sin scroll horizontal')
    m.screenshot(path=str(SHOTS / 'wordle_phrase_mobile.png'))
    check(not errs, 'sin errores de JS: ' + '; '.join(errs))
    b.close()
print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + ', '.join(bad))
sys.exit(1 if bad else 0)
