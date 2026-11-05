"""Lógica del Buscaminas: escudo, victoria y registro. python3 tests/e2e_minesweeper.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
bad=[]
def check(c,m): print(('PASS ' if c else 'FAIL ')+m); (not c) and bad.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); page=b.new_page(viewport={'width':1366,'height':800}); errs=[]
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(f'file://{ROOT}/index.html'); register(page, 'Tester', 'secreta1')
    page.evaluate("""() => { const g = Nexus.games.registry.get('minesweeper'); const m = g.mount; g.mount = (r) => (window.__ms = m(r)); }""")
    page.goto(f'file://{ROOT}/index.html#/game/minesweeper'); page.wait_for_timeout(500)
    # poderes antes de la primera casilla
    page.click('.power-btn[data-power=scanner]'); page.wait_for_timeout(100)
    check(page.evaluate("__ms.activePower") is None, 'poderes bloqueados antes de la primera casilla')
    page.click('.cell[data-row="0"][data-col="0"]'); page.wait_for_timeout(200)
    # poderes: sin Rayos X, escudo no pasivo y sin recarga
    check(page.locator('.power-btn').count() == 4 and page.locator('.power-btn[data-power=xray]').count() == 0, 'sin Rayos X: 4 poderes')
    check(page.locator('.power-btn.passive').count() == 0, 'el escudo ya no es pasivo')
    # escudo activado: destapar una mina con él no termina la partida y no cuenta como casilla segura
    mine = page.evaluate("(() => { for (let r=0;r<__ms.rows;r++) for (let c=0;c<__ms.cols;c++) if (__ms.board[r][c]===-1 && !__ms.revealed[r][c]) return [r,c]; })()")
    before = page.evaluate("__ms.cellsRevealed")
    page.click('.power-btn[data-power=shield]'); page.wait_for_timeout(100)
    page.click(f'.cell[data-row="{mine[0]}"][data-col="{mine[1]}"]'); page.wait_for_timeout(200)
    check(not page.evaluate("__ms.gameOver") and page.evaluate("__ms.powers.shield.charges")==0, 'el escudo activado protege la casilla elegida')
    check(page.evaluate("__ms.cellsRevealed")==before, 'mina desactivada no cuenta como casilla segura')
    page.click('.power-btn[data-power=shield]'); page.wait_for_timeout(100)
    check(page.evaluate("__ms.activePower") is None, 'el escudo sólo se puede usar una vez por partida')
    page.evaluate("(() => { for (let r=0;r<__ms.rows;r++) for (let c=0;c<__ms.cols;c++) if (__ms.orbs[r][c]) { __ms.collectOrb(r,c); } return 1; })()")
    check(page.evaluate("__ms.powers.shield.charges")==0, 'los orbes no recargan poderes')
    # sin escudo activado, pisar una mina pierde
    mine2 = page.evaluate("(() => { for (let r=0;r<__ms.rows;r++) for (let c=0;c<__ms.cols;c++) if (__ms.board[r][c]===-1 && !__ms.revealed[r][c]) return [r,c]; })()")

    # ganar: revelar todas las casillas seguras
    page.evaluate("""() => { for (let r=0;r<__ms.rows;r++) for (let c=0;c<__ms.cols;c++) if (__ms.board[r][c]!==-1 && !__ms.revealed[r][c]) __ms.revealCell(r,c); }""")
    page.wait_for_timeout(1500)
    check(page.evaluate("__ms.gameWon"), 'victoria detectada')
    st=page.evaluate("Nexus.services.progress.stats('minesweeper')")
    check(st['wins']==1 and st['byMode']['easy']['wins']==1 and st['bestScore']>0, 'victoria registrada por dificultad')
    check(page.evaluate("Nexus.services.achievements.isUnlocked('ms_easy')"), 'logro "Recluta graduado"')
    check(page.locator('.modal-overlay.active .modal-unlocks').count()==1, 'modal lista los logros')
    # cerrar con Escape y comprobar que no queda nada colgado al salir
    page.keyboard.press('Escape'); page.goto(f'file://{ROOT}/index.html#/home'); page.wait_for_timeout(400)
    check(page.evaluate("__ms.destroyed"), 'destroy() al salir del juego')
    check(not errs, 'sin errores JS: '+str(errs[:3]))
    b.close()
print('RESULT:', 'OK' if not bad else f'{len(bad)} FALLOS'); sys.exit(1 if bad else 0)
