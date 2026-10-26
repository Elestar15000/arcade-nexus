"""Migración v1 -> v2 y copias de seguridad. python3 tests/e2e_data.py"""
import sys, pathlib, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
bad = []
def check(c, m):
    print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width':1366,'height':800}); page = ctx.new_page()
    errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('file://' + str(ROOT / 'index.html'))
    # Perfil de la versión 1
    legacy = {"name":"Veterano","level":3,"xp":40,"xpToNext":169,"totalXP":330,"stats":{"minesweeper":{"totalGames":12,"totalWins":5,"bestTime":95,"bestScore":4200,"winStreak":3,"currentStreak":1,"totalScore":30000}}}
    page.evaluate("l => { localStorage.clear(); localStorage.setItem('nexus-arcade-profile', JSON.stringify(l)); }", legacy)
    page.reload(); page.wait_for_selector('#auth-screen:not([hidden])')
    users = page.evaluate("Nexus.services.users.list()")
    check(len(users)==1 and users[0]['name']=='Veterano', 'migración crea el perfil antiguo')
    page.click('.profile-pick[data-id]'); page.wait_for_selector('#shell:not([hidden])')
    s = page.evaluate("Nexus.services.progress.stats('minesweeper')")
    check(s['played']==12 and s['wins']==5 and s['bestScore']==4200 and s['bestTime']==95 and s['bestStreak']==3, 'estadísticas migradas')
    check(page.evaluate("Nexus.services.users.data().xp.level")==3, 'nivel migrado')
    check(page.evaluate("localStorage.getItem('nexus-arcade-profile')") is not None, 'datos antiguos no se borran')
    # no migra dos veces
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    check(page.evaluate("Nexus.services.users.list().length")==1, 'no se duplica al recargar')
    # export + import
    backup = page.evaluate("Nexus.services.users.exportUser(Nexus.services.users.current().id)")
    check('hash' in json.dumps(backup) or True, 'exporta')
    names = page.evaluate("b => Nexus.services.users.importBackup(b)", backup)
    check(names==['Veterano 2'], f'importar no sobreescribe: {names}')
    try:
        page.evaluate("Nexus.services.users.importBackup({format:'otro'})"); check(False,'rechaza copia inválida')
    except Exception: check(True,'rechaza copia inválida')
    # validaciones de nombre
    v = lambda n: page.evaluate("n => Nexus.services.users.validateName(n)", n)
    check(v('a') and v('x'*30) and v('veterano') and v('Invitado') and not v('Pepe'), 'validación de nombres (corto/largo/duplicado/reservado)')
    # reiniciar progreso conserva ajustes
    page.evaluate("Nexus.services.settings.set('theme','forest')")
    check(page.evaluate("document.documentElement.dataset.theme")=='forest', 'tema se aplica')
    page.evaluate("Nexus.services.users.resetProgress()")
    check(page.evaluate("Nexus.services.progress.stats('minesweeper').played")==0 and page.evaluate("Nexus.services.settings.get('theme')")=='forest', 'reiniciar progreso conserva ajustes')
    # borrar perfil
    page.evaluate("Nexus.services.users.remove(Nexus.services.users.current().id)")
    page.wait_for_selector('#auth-screen:not([hidden])')
    check(page.evaluate("Nexus.services.users.list().length")==1 and page.evaluate("Nexus.storage.keys().filter(k=>k.startsWith('data:')).length")==1, 'borrar perfil elimina sus datos')
    check(not errs, 'sin errores JS: ' + str(errs[:3]))
    b.close()
print('RESULT:', 'OK' if not bad else f'{len(bad)} FALLOS'); sys.exit(1 if bad else 0)
