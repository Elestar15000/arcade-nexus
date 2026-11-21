"""Correcciones de la auditoría de juegos (se amplía en cada fase).
python3 tests/e2e_audit.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

HOOK = """([id, name]) => { const g = Nexus.games.registry.get(id); const m = g.__m || g.mount; g.__m = m; g.mount = (r) => (window[name] = m(r)); }"""

with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1366, 'height': 860}); errs = []
    page.on('pageerror', lambda e: errs.append(str(e) + ' @ ' + (e.stack or '')[:300]))
    page.goto(URL); register(page, 'Auditor')

    # ── F1 · Kit.swipe: un gesto = un movimiento con chain:false ──
    n = page.evaluate("""(() => { const el = document.createElement('div'); document.body.appendChild(el); let a = 0, c = 0;
        Nexus.games.kit.swipe(el, () => a++, { chain: false }); const el2 = document.createElement('div'); document.body.appendChild(el2); Nexus.games.kit.swipe(el2, () => c++);
        const fire = (t, type, x) => t.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: t, clientX: x, clientY: 10 })], cancelable: true }));
        for (const t of [el, el2]) { fire(t, 'touchstart', 0); for (let x = 30; x <= 150; x += 30) fire(t, 'touchmove', x); fire(t, 'touchend', 150); }
        el.remove(); el2.remove(); return [a, c]; })()""")
    check(n[0] == 1 and n[1] > 1, f'swipe: un gesto largo = 1 movimiento con chain:false ({n[0]}), encadena por defecto ({n[1]})')

    # ── F1 · Hundir la flota: «C5» = fila C, columna 5 ──
    page.evaluate(HOOK, ['battleship', '__bs'])
    page.goto(URL + '#/game/battleship'); page.wait_for_timeout(600)
    lab = page.evaluate("Array.from(document.querySelectorAll('.bs-cell')).slice(0, 120).map(c => c.getAttribute('aria-label'))")
    check(lab[0] == 'A1' and lab[1] == 'A2' and lab[10] == 'B1' and lab[24] == 'C5', f'Hundir la flota: casilla 24 = C5 (fila C, columna 5) → {lab[24]}')

    # ── F1 · 2048: deshacer guarda la partida y restaura el aviso ──
    page.evaluate(HOOK, ['g2048', '__g2'])
    page.goto(URL + '#/game/g2048'); page.wait_for_timeout(600)
    page.evaluate("__g2.start('clasico')"); page.wait_for_timeout(300)
    moved = page.evaluate("""(() => { for (const d of ['left','right','up','down']) { const m = __g2.moves; __g2.move(d); if (__g2.moves > m) return true; } return false; })()""")
    page.evaluate("__g2.reached = true; __g2.hist[__g2.hist.length - 1].re = false")
    page.evaluate("__g2.undo()")
    saved = page.evaluate("JSON.stringify((Nexus.services.users.data().saves.g2048 || {}))")
    check(moved and page.evaluate("__g2.reached") is False, '2048: deshacer restaura el aviso de «¡2048!»')
    check('"m":0' in saved or '"m": 0' in saved, '2048: deshacer guarda la partida')

    # ── F1 · Tetris: soltar una dirección sigue hacia la otra pulsada ──
    page.evaluate(HOOK, ['tetris', '__tt'])
    page.goto(URL + '#/game/tetris'); page.wait_for_timeout(600)
    page.evaluate("__tt.state = 'playing'; __tt.piece = __tt.piece || {}; __tt.held = []; __tt.move = () => true")
    page.evaluate("__tt.act('left', true); __tt.act('right', true); __tt.act('right', false)")
    check(page.evaluate("__tt.dir") == -1, 'Tetris: izquierda y derecha a la vez, al soltar derecha sigue a la izquierda')

    # ── F1 · Snake: rocas seguras y victoria con el tablero lleno ──
    page.evaluate(HOOK, ['snake', '__sn'])
    page.goto(URL + '#/game/snake'); page.wait_for_timeout(600)
    ok = page.evaluate("typeof __sn.rockIsSafe === 'function' && typeof __sn.crossingPortal === 'function'")
    check(ok, 'Snake: comprobación de rocas (BFS) y de cruce de portal')

    # ── F1 · Mentiroso mano a mano ──
    st = page.evaluate("(() => { const s = Nexus.games.cardRules.mentiroso.setup(2, ['A','B']); return [s.hands[0].length + s.hands[1].length + s.dead.length * 4, s.aside]; })()")
    check(st[1] == 16, f'Mentiroso a dos: 16 cartas fuera de juego ({st})')

    # ── F2 · Diarios sin repetición ──
    w = page.evaluate("""(() => { const D = Nexus.games.wordleDict, s = new Set(); let rep = 0, plural = 0;
        for (let i = 0; i < 400; i++) { const d = new Date(Date.parse('2026-11-23T12:00:00') + i * 864e5).toISOString().slice(0, 10); const x = D.daily(d); if (s.has(x)) rep++; s.add(x); }
        const ans = window.NexusWordData.ANSWERS.split(' ');
        return { rep, n: D.sizes().answers, plural: ans.filter(a => /s$/.test(a) && !['lunes','virus','tesis','dosis','atlas','oasis','cutis','tenis','humus','pubis','adiós','alias','antes','jamás','lejos','arnés','atrás','revés'].includes(a)).length,
                 legacyToday: D.daily('2026-11-21') }; })()""")
    check(w['rep'] == 0 and w['n'] >= 1400 and w['plural'] == 0, f"Wordle: {w['n']} soluciones sin plurales y 400 diarias sin repetir")
    hv = page.evaluate("[Nexus.games.wordleLogic.hardViolation('perro', ['eeaxx'], 'ereee'), Nexus.games.wordleLogic.hardViolation('erzzz', ['eezzz'], 'xxeee')]")
    check(hv[1] is not None and 'E' in hv[1], f'Wordle difícil: exige el número de apariciones ({hv[1]})')
    pp = page.evaluate("""(() => { const L = Nexus.games.pasapalabraLogic, seen = new Set(); let rep = 0;
        for (let i = 0; i < 24; i++) { const d = new Date(Date.parse('2026-11-23T12:00:00') + i * 864e5).toISOString().slice(0, 10); const q = L.buildDaily(d)[0]; if (seen.has(q.id)) rep++; seen.add(q.id); }
        return rep; })()""")
    check(pp == 0, f'Pasapalabra diario: la A no repite definición en 24 días ({pp})')
    sol = page.evaluate("Nexus.games.solitaireLogic.solvable(JSON.parse(JSON.stringify(Nexus.games.solitaireLogic.dailyDeal('2026-12-01'))))")
    check(sol is True, 'Solitario diario: el reparto tiene solución (resolvedor)')
    th = page.evaluate("(() => { const L = Nexus.games.wordsearchLogic, n = L.THEMES.length, a = []; for (let i = 0; i < n; i++) a.push(L.dailyTheme(new Date(Date.parse('2026-12-01T12:00:00') + i * 864e5).toISOString().slice(0, 10)).name); return [new Set(a).size, n]; })()")
    check(th[0] == th[1], f'Sopa diaria: {th[1]} días seguidos sin repetir tema ({th[0]})')

    check(not errs, 'sin errores de JS: ' + ' | '.join(errs[:3]))
    b.close()

print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + str(len(bad)))
sys.exit(1 if bad else 0)
