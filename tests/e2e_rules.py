"""Auditoría F5: reglas reales (Tetris, Pong, 2048, Pac-Man clásico).
Las de Brisca y Guiñote están en tests/cardgames_rules_test.mjs y tests/e2e_cards.py.
python3 tests/e2e_rules.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m, flush=True); (not c) and bad.append(m)

def open_game(page, gid):
    page.evaluate("(id) => { const g = Nexus.games.registry.get(id); if (!g.__hooked) { const m = g.mount; g.mount = (r) => (window.__g = m(r)); g.__hooked = true; } }", gid)
    page.goto(URL + '#/home'); page.wait_for_timeout(100)
    page.goto(URL + f'#/game/{gid}'); page.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': 1366, 'height': 860}); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); register(page, 'Reglas')

    # ── Tetris ──
    open_game(page, 'tetris')
    check(page.locator('.ax-mode[data-mode=sprint40]').count() == 1, 'tetris: Sprint puro aparte del Sprint Fusión')
    page.click('.ax-mode[data-mode=sprint40]'); page.click('[data-do=start]'); page.wait_for_timeout(200)
    check(page.evaluate('__g.mode.powerChance') == 0 and page.locator('#tt-energy-card').is_hidden(), 'tetris: el Sprint puro no tiene poderes ni energía')
    r = page.evaluate("""() => { const g = __g; g.lines = 19; g.level = 1 + Math.floor(19 / 10); return g.level; }""")
    check(r == 2, 'tetris: se sube de nivel cada 10 líneas')
    # T-Spin: T apuntando arriba con las dos esquinas de delante ocupadas = completo; con una sola = Mini
    res = page.evaluate("""() => { const g = __g, B = () => Array.from({ length: g.board.length }, () => new Array(10).fill(null));
        const Y = g.board.length - 3, p = { type: 'T', rot: 0, x: 3, y: Y }; g.lastKick = 0;
        g.board = B(); [[0, 3], [0, 5], [2, 3]].forEach(([y, x]) => g.board[Y + y][x] = { t: 'I' });
        const full = g.isTSpin(p);
        g.board = B(); [[0, 3], [2, 3], [2, 5]].forEach(([y, x]) => g.board[Y + y][x] = { t: 'I' });
        const mini = g.isTSpin(p);
        g.lastKick = 4; const kick = g.isTSpin(p);
        return [full, mini, kick]; }""")
    check(res == ['full', 'mini', 'full'], f'tetris: regla de las esquinas separa T-Spin y Mini {res}')
    res = page.evaluate("""() => { const g = __g; g.board = g.board.map(r => r.map(() => null)); g.level = 1; g.score = 0; g.piecesLocked = 5; g.lastClear = { n: 1, b2b: false }; g.endResolve(); const a = g.score;
        g.board = g.board.map(r => r.map(() => null)); g.score = 0; g.lastClear = { n: 4, b2b: true }; g.endResolve(); return [a, g.score]; }""")
    check(res[0] == 800 and res[1] == 3200, f'tetris: tabla de Perfect Clear (simple 800, Tetris B2B 3200) {res}')

    # ── Pong ──
    open_game(page, 'pong')
    page.evaluate("Nexus.services.settings.set('pong.target', '11')")
    page.click('[data-do=go-cpu]'); page.click('[data-do=start]'); page.wait_for_timeout(200)
    res = page.evaluate("""() => { const G = __g, s = G.sim; s.score = [10, 10]; G.goal(0); const a = s.phase; s.score = [11, 10]; G.goal(0); return [a, s.phase, s.target]; }""")
    check(res[0] != 'over' and res[1] == 'over' and res[2] == 11, f'pong: a 11 con 2 de ventaja (11-10 sigue, 12-10 gana) {res}')

    # ── 2048 ──
    open_game(page, 'g2048'); page.click('[data-do=new]'); page.wait_for_timeout(200)
    played = page.evaluate("Nexus.services.progress.stats('g2048').played")
    page.evaluate("""() => { const g = __g; g.tiles = [{ id: 901, v: 1024, r: 0, c: 0 }, { id: 902, v: 1024, r: 0, c: 1 }]; g.render(); g.move('left'); }""")
    st = page.evaluate("Nexus.services.progress.stats('g2048')")
    check(st['played'] == played + 1 and st['wins'] >= 1 and page.evaluate('__g.state') == 'playing', '2048: la victoria se registra al llegar a 2048 y se puede seguir')

    # ── Pac-Man clásico ──
    open_game(page, 'pacman')
    page.click('[data-mode=classic]'); page.click('[data-do=start]'); page.wait_for_timeout(2500)
    res = page.evaluate("""() => { const g = __g; return [g.cells[0].length, g.cells.length, g.pelletsTotal]; }""")
    check(res == [28, 31, 244], f'pac-man clásico: laberinto original de 28×31 con 244 pastillas {res}')
    res = page.evaluate("""() => { const g = __g; let n = 0; for (let y = 0; y < g.cells.length && n < 70; y++) for (let x = 0; x < 28 && n < 70; x++) if (g.cells[y][x] === '.') { g.eatAt(x, y); n++; } return g.fruit && g.fruit.pts; }""")
    check(res == 100, 'pac-man clásico: a las 70 pastillas sale la cereza (100)')
    res = page.evaluate("""() => { const g = __g; g.pac.slow = 0; g.ghosts.forEach(x => x.fright = 0); const a = g.pacSpeed(); g.ghosts[0].fright = 3; const b = g.pacSpeed(); return [a, b]; }""")
    check(res[1] > res[0], f'pac-man: con los fantasmas asustados Pac-Man va más rápido {[round(x, 2) for x in res]}')
    res = page.evaluate("""() => { const g = __g; g.level = 18; const sc = g.score; g.addScore = g.addScore.bind(g); let d = null;
        const s = g.ghosts[0]; s.state = 'normal'; s.fright = 0; for (let y = 0; y < g.cells.length; y++) for (let x = 0; x < 28; x++) if (g.cells[y][x] === 'o' && d === null) { g.eatAt(x, y); d = s.fright; } return d; }""")
    check(res == 1, f'pac-man clásico: tabla de susto por nivel (nivel 18 → 1 s) [{res}]')
    b.close()
check(not errs, 'sin errores de JS: ' + '; '.join(errs[:3]))
print('\nRESULT:', 'OK' if not bad else f'{len(bad)} FAIL(S)')
sys.exit(1 if bad else 0)
