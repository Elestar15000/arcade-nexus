"""Sudoku, 2048, Sopa de letras, Crucigrama y Conexiones: partidas jugadas con la interfaz, retos diarios, continuar y móvil.
python3 tests/e2e_puzzles.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m, flush=True); (not c) and bad.append(m)
HOOK = """() => { for (const id of ['sudoku','g2048','wordsearch','crossword','connections']) { const g = Nexus.games.registry.get(id); if (g.__h) continue; const m = g.mount; g.__h = 1; g.mount = (r) => (window.__g = m(r)); } }"""

def open_game(page, gid, mode):
    page.goto(URL + '#/home'); page.wait_for_timeout(100)
    page.goto(URL + f'#/game/{gid}'); page.wait_for_timeout(350)
    page.click(f'.pz-overlay [data-mode="{mode}"]'); page.click('.pz-overlay [data-do=new]'); page.wait_for_timeout(250)

def win_modal(page, m):
    page.wait_for_selector('.modal-result', timeout=6000)
    check(True, m)
    page.evaluate("Nexus.ui.modal.closeAll && Nexus.ui.modal.closeAll()"); page.wait_for_timeout(150)

with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    ctx = b.new_context(viewport={'width': 1366, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(m.text))
    page.goto(URL); register(page, 'Puzlero', 'secreta1'); page.evaluate(HOOK)
    page.goto(URL + '#/library'); page.wait_for_timeout(300)
    for g in ('sudoku', 'g2048', 'wordsearch', 'crossword', 'connections'):
        check(page.locator(f'a.game-card[href="#/game/{g}"]').count() == 1, f'{g} en la biblioteca')

    # ═════ SUDOKU ═════
    open_game(page, 'sudoku', 'medio')
    check(page.locator('.sd-cell').count() == 81, 'sudoku: 81 casillas')
    givens = page.evaluate('__g.puzzle.filter(Boolean).length')
    check(31 <= givens <= 33, f'sudoku medio: {givens} números de partida')
    empty = page.evaluate('__g.puzzle.findIndex(v => !v)')
    sol = page.evaluate(f'__g.solution[{empty}]')
    wrong = 1 if sol != 1 else 2
    page.click(f'.sd-cell[data-i="{empty}"]'); page.click(f'#sd-pad [data-n="{wrong}"]'); page.wait_for_timeout(80)
    check(page.evaluate('__g.errors') == 1 and page.locator('.sd-cell.bad').count() == 1, 'sudoku: número incorrecto cuenta como error')
    page.click('[data-t="undo"]')
    page.click('[data-t="notes"]'); page.click('#sd-pad [data-n="5"]'); page.click('#sd-pad [data-n="7"]'); page.wait_for_timeout(60)
    check(page.locator(f'.sd-cell[data-i="{empty}"] .sd-notes').count() == 1, 'sudoku: notas')
    page.click('[data-t="notes"]')
    page.keyboard.press(str(sol)); page.wait_for_timeout(60)
    check(page.evaluate(f'__g.board[{empty}]') == sol, 'sudoku: número correcto con el teclado')
    page.screenshot(path=str(SHOTS / 'sudoku.png'))
    page.click('[data-t="hint"]'); page.wait_for_timeout(60)
    check(page.evaluate('__g.hints') == 1, 'sudoku: pista')
    page.evaluate("(() => { const g = __g; const last = g.board.findIndex((v, i) => v !== g.solution[i]); for (let i = 0; i < 81; i++) if (i !== last) g.board[i] = g.solution[i]; g.sel = last; g.render(); window.__last = last; })()")
    last = page.evaluate('__last'); page.click(f'.sd-cell[data-i="{last}"]'); page.click(f'#sd-pad [data-n="{page.evaluate(f"__g.solution[{last}]")}"]')
    win_modal(page, 'sudoku: resolver muestra la victoria')
    # Continuar tras recargar
    open_game(page, 'sudoku', 'facil')
    page.evaluate("(() => { const i = __g.puzzle.findIndex(v => !v); __g.sel = i; __g.input(__g.solution[i]); window.__i = i; })()")
    i = page.evaluate('__i'); page.wait_for_timeout(100)
    page.goto(URL + '#/home'); page.reload(); page.evaluate(HOOK); page.goto(URL + '#/game/sudoku'); page.wait_for_timeout(400)
    check(page.locator('.pz-overlay [data-do=resume]').count() == 1, 'sudoku: se ofrece continuar la partida')
    page.click('.pz-overlay [data-do=resume]'); page.wait_for_timeout(150)
    check(page.evaluate(f'__g.board[{i}] === __g.solution[{i}]'), 'sudoku: continuar conserva lo jugado')

    # ═════ 2048 ═════
    open_game(page, 'g2048', 'clasico')
    check(page.locator('.g2-tile').count() == 2, '2048: empieza con 2 fichas')
    for k in ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'] * 3: page.keyboard.press(k); page.wait_for_timeout(40)
    check(page.evaluate('__g.moves') >= 4 and page.locator('.g2-tile').count() >= 3, '2048: las flechas mueven y salen fichas nuevas')
    page.evaluate("(() => { const g = __g; g.tiles = [{id: 900, v: 1024, r: 0, c: 0}, {id: 901, v: 1024, r: 0, c: 1}]; g.buildBg(); g.render(); })()")
    page.keyboard.press('ArrowLeft'); page.wait_for_timeout(250)
    check(page.evaluate('__g.reached') and page.evaluate('__g.score') >= 2048, '2048: fusionar 1024 + 1024 llega a 2048')
    page.screenshot(path=str(SHOTS / 'g2048.png'))
    u = page.evaluate('__g.undos'); page.click('#g2-undo'); page.wait_for_timeout(80)
    check(page.evaluate('__g.undos') == u - 1, '2048: deshacer')
    page.evaluate("(() => { const g = __g; g.tiles = []; let id = 1000; const v = [[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,8]]; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.tiles.push({id: id++, v: v[r][c], r, c}); g.tiles[15].v = 4; g.tiles[14].v = 8; g.buildBg(); g.render(); })()")
    page.keyboard.press('ArrowRight'); page.wait_for_timeout(200)
    page.keyboard.press('ArrowLeft'); page.wait_for_timeout(200)
    st = page.evaluate('__g.state')
    check(st in ('over', 'playing'), '2048: tablero casi lleno no rompe nada')
    page.evaluate("Nexus.ui.modal.closeAll && Nexus.ui.modal.closeAll()")
    # Diario: misma secuencia para todos
    open_game(page, 'g2048', 'diario')
    d1 = page.evaluate('JSON.stringify(__g.tiles.map(t => [t.v, t.r, t.c]))')
    page2 = ctx.new_page(); page2.goto(URL); page2.evaluate(HOOK); open_game(page2, 'g2048', 'diario')
    check(page2.evaluate('JSON.stringify(__g.tiles.map(t => [t.v, t.r, t.c]))') == d1, '2048 diario: mismas fichas iniciales')
    page2.close()

    # ═════ SOPA DE LETRAS ═════
    open_game(page, 'wordsearch', 'facil')
    n = page.evaluate('__g.words.length')
    check(n == 8 and page.locator('.ws-cell').count() == 100, 'sopa fácil: 10×10 con 8 palabras')
    def cell_center(r, c):
        bb = page.locator(f'.ws-cell[data-r="{r}"][data-c="{c}"]').bounding_box(); return bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    w0 = page.evaluate('__g.words[0]')
    x1, y1 = cell_center(w0['r'], w0['c']); x2, y2 = cell_center(w0['r'] + w0['dr'] * (len(w0['w']) - 1), w0['c'] + w0['dc'] * (len(w0['w']) - 1))
    page.mouse.move(x1, y1); page.mouse.down()
    for k in range(1, 9): page.mouse.move(x1 + (x2 - x1) * k / 8, y1 + (y2 - y1) * k / 8)
    page.mouse.up(); page.wait_for_timeout(100)
    check(page.evaluate('__g.found.length') == 1 and page.locator('.ws-found').count() == 1, 'sopa: arrastrar marca la palabra')
    w1 = page.evaluate('__g.words[1]')
    page.click(f'.ws-cell[data-r="{w1["r"]}"][data-c="{w1["c"]}"]'); page.wait_for_timeout(60)
    page.click(f'.ws-cell[data-r="{w1["r"] + w1["dr"] * (len(w1["w"]) - 1)}"][data-c="{w1["c"] + w1["dc"] * (len(w1["w"]) - 1)}"]'); page.wait_for_timeout(100)
    check(page.evaluate('__g.found.length') == 2, 'sopa: tocar la primera y la última letra también vale')
    page.screenshot(path=str(SHOTS / 'wordsearch.png'))
    page.evaluate("(() => { const g = __g; g.words.slice(0, -1).forEach(w => { if (!g.found.includes(w.w)) g.found.push(w.w); }); g.render(); })()")
    wl = page.evaluate('__g.words[__g.words.length - 1]')
    x1, y1 = cell_center(wl['r'], wl['c']); x2, y2 = cell_center(wl['r'] + wl['dr'] * (len(wl['w']) - 1), wl['c'] + wl['dc'] * (len(wl['w']) - 1))
    page.mouse.move(x2, y2); page.mouse.down()
    for k in range(1, 9): page.mouse.move(x2 + (x1 - x2) * k / 8, y2 + (y1 - y2) * k / 8)
    page.mouse.up()
    win_modal(page, 'sopa: seleccionar al revés también vale y se completa la sopa')

    # ═════ CRUCIGRAMA ═════
    open_game(page, 'crossword', 'facil')
    words = page.evaluate('__g.cw.words.length')
    check(words >= 8, f'crucigrama fácil: {words} palabras')
    check(page.locator('#cw-across li').count() + page.locator('#cw-down li').count() == words, 'crucigrama: una definición por palabra')
    page.click('#cw-across li >> nth=0'); page.wait_for_timeout(60)
    w = page.evaluate('__g.curWord()')
    for ch in w['w']: page.keyboard.press(ch if ch != 'Ñ' else 'ñ'); page.wait_for_timeout(15)
    page.wait_for_timeout(80)
    check(page.locator('#cw-across li.done').count() >= 1, 'crucigrama: escribir una palabra la completa')
    page.screenshot(path=str(SHOTS / 'crossword.png'))
    page.click('#cw-down li >> nth=0'); page.wait_for_timeout(60)
    page.click('#cw-kbd [data-k="Q"]'); page.click('#cw-kbd [data-k="Q"]')
    page.click('.cw-tools [data-t="check"]'); page.wait_for_timeout(60)
    check(page.locator('.cw-c.bad').count() >= 1 or page.evaluate("__g.curWord().w.startsWith('QQ')"), 'crucigrama: comprobar marca letras incorrectas')
    page.click('.cw-tools [data-t="word"]'); page.wait_for_timeout(60)
    check(page.evaluate('__g.reveals') >= 1, 'crucigrama: revelar palabra')
    page.evaluate("(() => { const g = __g; let last = null; for (const [k, ch] of g.sol) { if (g.fill[k] !== ch) { if (!last) { last = k; continue; } g.fill[k] = ch; } } if (last) { delete g.fill[last]; g.cur = last.split(',').map(Number); g.fixDir(); } g.render(); window.__lastk = last; })()")
    lk = page.evaluate('__lastk')
    if lk:
        page.keyboard.press(page.evaluate(f"__g.sol.get('{lk}')").replace('Ñ', 'ñ'))
    win_modal(page, 'crucigrama: completar todas las casillas da la victoria')

    # ═════ CONEXIONES ═════
    open_game(page, 'connections', 'libre')
    check(page.locator('.cx-tile').count() == 16, 'conexiones: 16 palabras')
    g0 = page.evaluate('__g.groups[0].words')
    for w in g0: page.click(f'.cx-tile[data-w="{w}"]')
    page.click('[data-c="submit"]'); page.wait_for_timeout(150)
    check(page.locator('.cx-row.c-amarillo').count() == 1 and page.locator('.cx-tile').count() == 12, 'conexiones: acertar un grupo lo resuelve')
    g1, g2 = page.evaluate('__g.groups[1].words'), page.evaluate('__g.groups[2].words')
    for w in g1[:3] + g2[:1]: page.click(f'.cx-tile[data-w="{w}"]')
    page.click('[data-c="submit"]'); page.wait_for_timeout(150)
    check(page.evaluate('__g.misses') == 1 and 'A una' in page.inner_text('.pz-toast'), 'conexiones: tres de cuatro avisa «¡A una!» y resta una vida')
    page.click('[data-c="submit"]'); page.wait_for_timeout(100)
    check(page.evaluate('__g.misses') == 1, 'conexiones: repetir la misma combinación no penaliza')
    page.screenshot(path=str(SHOTS / 'connections.png'))
    page.click('[data-c="clear"]')
    for gi in (1, 2, 3):
        for w in page.evaluate(f'__g.groups[{gi}].words'): page.click(f'.cx-tile[data-w="{w}"]')
        page.click('[data-c="submit"]'); page.wait_for_timeout(120)
    win_modal(page, 'conexiones: resolver los 4 grupos da la victoria')
    open_game(page, 'connections', 'dificil')
    for k in range(2):
        tiles = page.evaluate(f'__g.groups[0].words.slice(0, 2).concat(__g.groups[1].words.slice({k}, {k} + 2))')
        for w in tiles: page.click(f'.cx-tile[data-w="{w}"]')
        page.click('[data-c="submit"]'); page.wait_for_timeout(120)
        page.click('[data-c="clear"]')
    page.wait_for_selector('.modal-result', timeout=6000)
    check('SIN VIDAS' in page.inner_text('.modal-result') and page.locator('.cx-row').count() == 4, 'conexiones difícil: 2 fallos y se revelan los grupos')
    page.evaluate("Nexus.ui.modal.closeAll && Nexus.ui.modal.closeAll()")

    # ═════ Diarios iguales ═════
    for gid, expr in [('sudoku', '__g.puzzle.join("")'), ('wordsearch', '__g.grid.flat().join("")'), ('crossword', '__g.cw.words.map(w => w.w).join()'), ('connections', '__g.order.join()')]:
        open_game(page, gid, 'diario'); a = page.evaluate(expr)
        p2 = ctx.new_page(); p2.goto(URL); p2.evaluate(HOOK); open_game(p2, gid, 'diario')
        check(p2.evaluate(expr) == a, f'{gid}: el reto diario es el mismo en otra pestaña'); p2.close()

    # ═════ Móvil ═════
    m = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    mp = m.new_page(); mp.on('pageerror', lambda e: errs.append('móvil: ' + str(e)))
    mp.goto(URL); register(mp, 'Movil', 'secreta1'); mp.evaluate(HOOK)
    for gid, mode in [('sudoku', 'facil'), ('g2048', 'clasico'), ('wordsearch', 'medio'), ('crossword', 'medio'), ('connections', 'libre')]:
        mp.goto(URL + '#/home'); mp.goto(URL + f'#/game/{gid}'); mp.wait_for_timeout(350)
        mp.tap(f'.pz-overlay [data-mode="{mode}"]'); mp.tap('.pz-overlay [data-do=new]'); mp.wait_for_timeout(300)
        mp.screenshot(path=str(SHOTS / f'{gid}_mobile.png'))
        check(mp.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{gid} móvil: sin scroll horizontal')
    mp.goto(URL + '#/home'); mp.goto(URL + '#/game/g2048'); mp.wait_for_timeout(300)
    mp.tap('.pz-overlay [data-do=new]'); mp.wait_for_timeout(200)
    bb = mp.locator('#g2-board').bounding_box()
    mv0 = mp.evaluate('__g.moves')
    for dx in (-120, 120, -120, 120):
        cx, cy = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
        mp.evaluate(f"""(() => {{ const el = document.querySelector('#g2-board'); const t = (x, y) => new Touch({{identifier: 1, target: el, clientX: x, clientY: y}});
            el.dispatchEvent(new TouchEvent('touchstart', {{touches: [t({cx}, {cy})], bubbles: true}}));
            el.dispatchEvent(new TouchEvent('touchmove', {{touches: [t({cx + dx}, {cy})], bubbles: true, cancelable: true}}));
            el.dispatchEvent(new TouchEvent('touchend', {{touches: [], bubbles: true}})); }})()""")
        mp.wait_for_timeout(120)
    check(mp.evaluate('__g.moves') > mv0, '2048 móvil: deslizar mueve las fichas')
    check(not errs, 'sin errores de JavaScript' + (': ' + ' | '.join(errs[:5]) if errs else ''))
    b.close()

print('\nRESULT:', 'OK' if not bad else f'{len(bad)} FAIL(S)')
sys.exit(1 if bad else 0)
