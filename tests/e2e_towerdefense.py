"""Kernel Defense: menú, mapa único, colocar/mejorar (3 opciones por nivel)/vender, ronda,
guardado/continuar, derrota (rondas infinitas), logros, stats y móvil.
python3 tests/e2e_towerdefense.py"""
import sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
bad=[]
def check(c,m): print(('PASS ' if c else 'FAIL ')+m); (not c) and bad.append(m)

def click_map(page, x, y):
    box = page.locator('canvas[data-el=cv]').bounding_box()
    page.mouse.click(box['x']+x*box['width']/900, box['y']+y*box['height']/600)

with sync_playwright() as p:
    b=p.chromium.launch(); page=b.new_page(viewport={'width':1366,'height':800}); errs=[]
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(f'file://{ROOT}/index.html'); page.wait_for_selector('#auth-screen:not([hidden])')
    page.click('#auth-add'); page.fill('#pf-name','Tester'); page.click('.modal-buttons .btn-primary'); page.wait_for_selector('#shell:not([hidden])')
    page.evaluate("""() => { const g = Nexus.games.registry.get('towerdefense'); const m = g.mount; g.mount = (r) => (window.__td = m(r)); }""")
    check(page.evaluate("!!Nexus.games.registry.get('towerdefense')"), 'juego registrado')
    page.goto(f'file://{ROOT}/index.html#/game/towerdefense'); page.wait_for_timeout(500)
    check(page.locator('.td-lang').count()==4, 'menú con 4 lenguajes (Python, Java, C++, Rust)')
    check(page.locator('.td-map').count()==0 and page.locator('.td-diff').count()==0, 'sin selector de mapas ni dificultades (mapa único)')
    check(page.locator('.td-threat').count()==11, 'bestiario de amenazas (Virus y Malware)')
    check(page.locator('.td-fam.virus').count()>=1 and page.locator('.td-fam.malware').count()>=1, 'familias Virus y Malware')
    page.screenshot(path=str(SHOTS/'td_menu.png'), full_page=True)
    page.click('[data-act=play]'); page.wait_for_timeout(500)
    check(page.locator('canvas[data-el=cv]').count()==1, 'canvas presente')
    check(page.locator('.td-shop-btn').count()==4, 'tienda con 4 torres')
    cash0 = page.evaluate("__td.engine.cash")
    # colocar torre: sobre el bus debe fallar; fuera debe funcionar
    page.click('.td-shop-btn[data-type=python]'); click_map(page, 400, 250)
    check(page.evaluate("__td.engine.towers.length")==0, 'no se puede construir sobre el bus de datos')
    click_map(page, 300, 180)
    check(page.evaluate("__td.engine.towers.length")==1, 'torre colocada')
    check(page.evaluate("__td.engine.cash")==cash0-200, 'coste de Python = 200')
    page.wait_for_timeout(200)
    check(page.locator('.td-up').count()==3, 'panel con 3 opciones de mejora por nivel')
    page.click('.td-up >> nth=2'); page.wait_for_timeout(100)
    check(page.evaluate("__td.engine.towers[0].picks")==[2], 'opción híbrida (AB) aplicada en el nivel 1')
    page.evaluate("__td.engine.cash=99999"); page.keyboard.press('w'); page.wait_for_timeout(100)
    check(page.evaluate("__td.engine.towers[0].picks")==[2,1], 'atajo W = opción B del nivel 2 (ramas combinables)')
    page.keyboard.press('q'); page.keyboard.press('e'); page.wait_for_timeout(100)
    check(page.evaluate("__td.engine.towers[0].picks")==[2,1,0,2], 'mezcla libre A/B/AB hasta el nivel 4')
    check(page.locator('.td-up').count()==0 and 'máximo' in page.inner_text('[data-el=sel]'), 'torre al máximo tras 4 niveles')
    check(page.evaluate("__td.engine.towers[0].stats.breaksArmor")==True, 'efectos de las opciones acumulados (Cython)')
    # resto de torres con atajos
    page.keyboard.press('2'); click_map(page, 560, 180)
    page.keyboard.press('3'); click_map(page, 300, 340)
    page.keyboard.press('4'); click_map(page, 520, 330)
    check([t['type'] for t in page.evaluate("__td.engine.towers")]==['python','java','cpp','rust'], 'atajos 1-4 → Python, Java, C++, Rust')
    page.screenshot(path=str(SHOTS/'td_build.png'))
    # vender
    n=page.evaluate("__td.engine.towers.length"); page.evaluate("__td.selId=__td.engine.towers[3].id"); page.wait_for_timeout(150)
    page.click('[data-act=sell]'); page.wait_for_timeout(100)
    check(page.evaluate("__td.engine.towers.length")==n-1, 'vender torre')
    # ronda
    page.click('[data-act=go]'); page.wait_for_timeout(1500)
    check(page.evaluate("__td.engine.roundActive") and page.evaluate("__td.engine.enemies.length")>0, 'ronda en curso con amenazas')
    page.screenshot(path=str(SHOTS/'td_play.png'))
    page.click('[data-act=speed]'); page.click('[data-act=speed]')
    check(page.evaluate("__td.speedIdx")==2, 'velocidad 3×')
    page.keyboard.press('p'); check(page.evaluate("__td.paused"), 'pausa'); page.keyboard.press('p')
    page.wait_for_function("!__td.engine.roundActive", timeout=60000)
    check(page.evaluate("__td.engine.round")==1 and page.evaluate("__td.engine.stats.pops")>=1, 'ronda completada con amenazas eliminadas')
    check(not page.evaluate("__td.engine.won") and not page.evaluate("__td.engine.over"), 'sin condición de victoria: la partida sigue')
    save = page.evaluate("Nexus.services.users.data().saves.towerdefense")
    check(save and save['round']==1 and save['v']==2 and len(save['towers'])>=1, 'autoguardado al terminar la ronda')
    # volver al menú y continuar
    page.evaluate("void __td.leave()"); page.wait_for_timeout(300); page.click('.modal-buttons .btn-primary'); page.wait_for_timeout(300)
    check(page.locator('.td-resume').count()==1, 'menú ofrece continuar')
    page.click('[data-act=resume]'); page.wait_for_timeout(400)
    check(page.evaluate("__td.engine.round")==1 and page.evaluate("__td.engine.towers.length")==len(save['towers']), 'continuar restaura torres y ronda')
    check(page.evaluate("__td.engine.towers[0].picks")==save['towers'][0]['picks'], 'continuar restaura mejoras elegidas')
    check(page.evaluate("__td.engine.towers[0].stats.breaksArmor")==True, 'continuar recalcula estadísticas de la build')
    # rondas infinitas: saltar a la ronda 150 sin límite
    page.evaluate("(() => { const e=__td.engine; e.round=149; e.startRound(); })()")
    check(page.evaluate("__td.engine.round")==150 and page.evaluate("__td.engine.queue.length")>0, 'rondas infinitas: la ronda 150 existe y genera amenazas')
    # fin de partida (derrota) — ronda alta para comprobar récord
    page.evaluate("(() => { const e=__td.engine; e.round=11; e.roundActive=false; e.queue.length=0; e.enemies.length=0; e.lives=1; e.towers.length=0; e.startRound(); })()")
    page.wait_for_selector('.modal-overlay.active .modal-result', timeout=90000)
    st=page.evaluate("Nexus.services.progress.stats('towerdefense')")
    check(st['played']==1 and st['wins']==0 and st['losses']==0 and st['byMode']['endless']['played']==1, 'partida infinita registrada (sin victoria/derrota)')
    check(st['bestScore']>=1200 and st['extra']['bestRound']==12, 'récord de puntuación y mejor ronda guardados')
    check(page.evaluate("Nexus.services.users.data().saves.towerdefense")is None, 'se borra el guardado al terminar')
    check(page.evaluate("Nexus.services.achievements.isUnlocked('td_r5')"), 'logro "Hello, World!" (ronda 5)')
    page.screenshot(path=str(SHOTS/'td_end.png'))
    page.click('.modal-buttons .btn-ghost'); page.wait_for_timeout(500)
    # rankings / stats / biblioteca
    page.goto(f'file://{ROOT}/index.html#/stats'); page.wait_for_timeout(500)
    check('Kernel Defense' in page.inner_text('#view'), 'estadísticas incluyen Kernel Defense')
    page.goto(f'file://{ROOT}/index.html#/rankings'); page.wait_for_timeout(300)
    page.goto(f'file://{ROOT}/index.html#/library'); page.wait_for_timeout(300)
    check('Kernel Defense' in page.inner_text('#view'), 'biblioteca incluye Kernel Defense')
    page.goto(f'file://{ROOT}/index.html#/home'); page.wait_for_timeout(300)
    check(page.evaluate("__td.destroyed"), 'destroy() al salir')
    check(not errs, 'sin errores JS: '+str(errs[:3]))
    # móvil
    m=b.new_page(viewport={'width':390,'height':780}); m.on('pageerror', lambda e: errs.append(str(e)))
    m.goto(f'file://{ROOT}/index.html'); m.wait_for_selector('#auth-screen:not([hidden])'); m.click('#auth-add'); m.fill('#pf-name','Mov'); m.click('.modal-buttons .btn-primary'); m.wait_for_selector('#shell:not([hidden])')
    m.goto(f'file://{ROOT}/index.html#/game/towerdefense'); m.wait_for_timeout(400); m.screenshot(path=str(SHOTS/'td_menu_m.png'))
    m.click('[data-act=play]'); m.wait_for_timeout(500); m.screenshot(path=str(SHOTS/'td_play_m.png'))
    check(m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), 'móvil: sin scroll horizontal')
    check(not errs, 'sin errores JS (móvil)')
    b.close()
print('RESULT:', 'OK' if not bad else f'{len(bad)} FALLOS'); sys.exit(1 if bad else 0)
