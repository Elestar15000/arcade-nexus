"""Logros 2.0: Rombos, misiones, racha, temporada, tienda, cosméticos, escaleras, secretos y celebraciones.
python3 tests/e2e_rewards.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
OUT = pathlib.Path('/tmp/shots'); OUT.mkdir(exist_ok=True)
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

PLAY = "(o) => Nexus.services.progress.recordGame(Object.assign({game:'snake',mode:'classic',won:false,endless:true,score:120,time:40,xp:20}, o||{}))"

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1366, 'height': 860}); page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(m.text))
    page.goto(URL); register(page, 'Rombo')

    R = "Nexus.services.rewards"
    # Estado inicial
    check(page.evaluate(f"{R}.balance()") == 0, 'cuenta nueva con 0 Rombos')
    m = page.evaluate(f"{R}.missions()")
    check(len(m['daily']) == 3 and m['weekly'] is not None, '3 misiones diarias y 1 semanal')
    check([x['tier'] for x in m['daily']] == ['easy', 'medium', 'hard'], 'misiones fácil / media / difícil')
    # Deterministas: el mismo día da las mismas misiones
    same = page.evaluate(f"JSON.stringify({R}._daily(Nexus.util.dayKey()).map(x => x.id)) === JSON.stringify({R}.missions().daily.map(x => x.id))")
    check(same, 'misiones deterministas por día')
    check(page.evaluate(f"{R}.shopItems('2026-W47').map(i => i.id).join() === {R}.shopItems('2026-W47').map(i => i.id).join()"), 'tienda determinista por semana')
    check(page.evaluate(f"{R}.shopItems().length") == 6, 'tienda con 6 artículos')

    # Primera partida: logro «first_game» + Rombos
    res = page.evaluate(PLAY)
    check(any(u['id'] == 'first_game' for u in res['unlocked']), 'primera partida desbloquea «first_game»')
    bal = page.evaluate(f"{R}.balance()")
    check(bal >= 10, f'Rombos ganados con el logro ({bal})')
    check(page.evaluate(f"{R}.data().points") >= 10, 'puntos de logro actualizados')
    check(page.evaluate("!!Nexus.services.achievements.gradeOf('first_game') && !!Nexus.services.achievements.ladderOf('games_10')"), 'escalera de partidas con grados')

    # Misiones: la de jugar N partidas avanza
    for i in range(12): page.evaluate(PLAY, {'score': 100 + i})
    m = page.evaluate(f"{R}.missions()")
    check(any(x['prog'] > 0 or x['done'] for x in m['daily'] + [m['weekly']]), 'las misiones avanzan al jugar')
    check(page.evaluate(f"{R}.data().season.played") == 13, 'partidas de temporada contadas')
    check(page.evaluate(f"{R}.data().rombos >= 0 && {R}.data().earned >= {R}.data().rombos"), 'saldo coherente (sin negativos)')

    # Reroll: una vez al día
    page.evaluate(f"{R}.data().missions.rerolled = false; {R}.data().missions.list.forEach(m => {{ m.done = false; m.prog = 0; }})")
    r1 = page.evaluate(f"{R}.reroll(0)"); r2 = page.evaluate(f"{R}.reroll(1)")
    check(bool(r1) and not r2, 'cambiar misión: una vez al día')

    # Tienda: sin saldo no se compra; con saldo sí y una sola vez
    item = page.evaluate(f"{R}.shopItems()[0]")
    page.evaluate(f"{R}.data().rombos = 0")
    check(not page.evaluate(f"{R}.buy('{item['id']}').ok"), 'sin saldo no se compra')
    page.evaluate(f"{R}.data().rombos = 5000")
    before = page.evaluate(f"{R}.balance()")
    check(page.evaluate(f"{R}.buy('{item['id']}').ok") and page.evaluate(f"{R}.owns('{item['id']}')"), f"compra de {item['id']}")
    check(page.evaluate(f"{R}.balance()") == before - item['price'], 'el precio se descuenta')
    check(not page.evaluate(f"{R}.buy('{item['id']}').ok"), 'no se compra dos veces')

    # Temporada: los Rombos ganados suben niveles y entregan premios
    page.evaluate(f"{R}.earn(600, 'test')")
    st = page.evaluate(f"{R}.seasonState()")
    check(st['level'] >= 1 and st['max'] == 30, f"nivel de temporada {st['level']}/30")
    check(page.evaluate(f"{R}.data().log.length") > 0, 'historial de movimientos')

    # Cosméticos: título y marco equipables
    page.evaluate(f"{R}.grant('t-cazafantasmas', 'test'); {R}.grant('fr-gold', 'test')")
    page.evaluate(f"{R}.equip('title', 't-cazafantasmas'); {R}.equip('frame', 'fr-gold')")
    page.wait_for_timeout(200)
    check(page.inner_text('#user-title').strip() != '', 'título visible bajo el nombre')
    check(page.locator('.sidebar .avatar.frame-fr-gold, #sidebar .avatar.frame-fr-gold').count() + page.locator('.avatar.frame-fr-gold').count() >= 1, 'marco dorado en el avatar')
    check(not page.evaluate(f"{R}.equip('frame', 'fr-legend')"), 'no se equipa lo que no se tiene')

    # Escaparate: máximo 3
    ids = page.evaluate("Object.keys(Nexus.services.achievements.unlockedMap())")
    for i in ids[:4]: page.evaluate(f"{R}.toggleShowcase('{i}')")
    check(len(page.evaluate(f"{R}.showcase()")) <= 3, 'escaparate con máximo 3 logros')

    # Rareza real: con menos de 20 jugadores se usa la rareza de diseño
    check(page.evaluate("Nexus.services.achievements.rarityOf(Nexus.services.achievements.get('first_game'))") == 'common', 'rareza de diseño sin datos suficientes')
    page.evaluate("Nexus.services.achievements.setRealRarity({first_game: 3}, 50)")
    check(page.evaluate("Nexus.services.achievements.rarityOf(Nexus.services.achievements.get('first_game'))") == 'legendary', 'rareza real: 3 % → legendario')
    page.evaluate("Nexus.services.achievements.setRealRarity({}, 0)")

    # Curva de XP con tope
    check(page.evaluate("Nexus.services.progress.xpForLevel(80)") <= 1500, 'XP por nivel con tope (1500)')

    # Persistencia tras recargar
    bal = page.evaluate(f"{R}.balance()")
    page.evaluate("Nexus.services.users.saveData(); Nexus.services.users.flush && Nexus.services.users.flush()")
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    check(page.evaluate(f"{R}.balance()") == bal, 'saldo persistente tras recargar')
    check(page.evaluate(f"{R}.equipped('frame')") == 'fr-gold', 'cosmético equipado persistente')
    check(int(page.inner_text('#topbar-rombos-n').replace('.', '').replace(',', '') or 0) == bal, 'saldo en la barra superior')

    # Páginas
    page.goto(URL + '#/achievements'); page.wait_for_selector('.ac-hero')
    page.wait_for_timeout(700); page.screenshot(path=str(OUT / 'rw_1_logros.png'), full_page=True)
    check(page.locator('.ac-stat').count() == 4, 'logros: 4 cifras bajo la cabecera')
    check(page.locator('.ac-card.r-ladder').count() >= 10, 'escaleras visibles')
    check(page.locator('.ac-chip').count() == 4, 'filtros Todos · Por categoría · Por rareza · Secretos')
    n0 = page.locator('.ac-card').count()
    page.click('[data-more]'); page.wait_for_timeout(300)
    check(page.locator('.ac-card').count() > n0, '«Mostrar más» carga otra tanda')
    page.click('.ac-chip[data-mode=secretos]'); page.wait_for_timeout(300)
    check(page.locator('.ac-card.r-secret').count() >= 5, 'logros secretos ocultos (???)')
    page.click('.ac-chip[data-mode=rareza]'); page.wait_for_timeout(300)
    check(page.locator('.ac-sec').count() >= 3, 'agrupados por rareza')
    page.click('.ac-chip[data-mode=categoria]'); page.wait_for_timeout(300)
    check(page.locator('.ac-mastery').count() >= 5, 'por categoría, con Maestría por juego')
    page.screenshot(path=str(OUT / 'rw_1b_categoria.png'))
    page.select_option('.ac-select select', 'unlocked'); page.wait_for_timeout(300)
    check(page.locator('.ac-card.locked').count() == 0, 'filtro de estado: sólo desbloqueados')
    page.click('.ac-switch a[href="#/achievements/misiones"]'); page.wait_for_selector('.mx-tabs')
    page.wait_for_timeout(500); page.screenshot(path=str(OUT / 'rw_misiones.png'), full_page=True)
    check(page.locator('.mx-list .mx-row').count() == 3, 'misiones diarias: 3 filas')
    check(page.locator('.mx-feat').count() == 1, 'recompensa destacada')
    page.click('.mx-tab[data-mtab=semanales]'); page.wait_for_timeout(200)
    check(page.locator('.mx-list .mx-row').count() == 1, 'pestaña semanal')
    page.click('.mx-tab[data-mtab=especiales]'); page.wait_for_timeout(200)
    page.screenshot(path=str(OUT / 'rw_especiales.png'), full_page=True)
    check(page.locator('.mx-card').count() >= 2, 'pestaña de especiales')
    page.click('.mx-tab[data-mtab=diarias]'); page.wait_for_timeout(200)
    page.locator('.mx-go').first.click(); page.wait_for_timeout(400)
    check(page.evaluate("location.hash") == '#/library', '«Ir» lleva a la biblioteca')

    # Cosméticos: página propia con acceso en el menú lateral y en el de la cuenta
    check(page.locator('.sidebar [href="#/cosmetics"], #sidebar [href="#/cosmetics"], [data-route=cosmetics]').count() >= 1, 'acceso «Cosméticos» en el menú')
    page.click('#topbar-rombos'); page.wait_for_selector('.cos-page')
    check(page.locator('.rw-tab').count() == 3, 'Cosméticos: Pase de batalla, Tienda y Colección')
    for tab in ['pase', 'tienda', 'coleccion']:
        page.click(f'.rw-tab[data-tab={tab}]'); page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / f'rw_{tab}.png'), full_page=True)
    page.click('.rw-tab[data-tab=pase]'); page.wait_for_timeout(200)
    check(page.locator('.rw-tier').count() == 30, 'pase de batalla: 30 niveles')
    check(page.locator('.rw-tier.big, .rw-tier.premium').count() == 0, 'pase sin niveles premium')
    page.click('.rw-tab[data-tab=tienda]'); page.wait_for_timeout(200)
    check(page.locator('.rw-shop .rw-item').count() == 6, 'tienda: 6 artículos')
    page.goto(URL + '#/profile'); page.wait_for_timeout(400)
    page.click('[data-cos-tab=coleccion]'); page.wait_for_selector('.cos-page')
    check(page.locator('.rw-tab.active[data-tab=coleccion]').count() == 1, 'Perfil → Personalizar abre la Colección')

    page.goto(URL + '#/home'); page.wait_for_timeout(600)
    check(page.locator('.nh-goals').count() == 1, 'inicio: «Casi lo tienes» y misiones')
    page.screenshot(path=str(OUT / 'rw_home.png'), full_page=True)
    page.goto(URL + '#/profile'); page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / 'rw_profile.png'), full_page=True)
    page.goto(URL + '#/rankings'); page.wait_for_timeout(600)
    page.click('.tab[data-tab=points]'); page.wait_for_timeout(300)
    check(page.locator('.rk-player').count() >= 1, 'ranking por puntos de logro')
    page.click('.rk-player'); page.wait_for_selector('.modal-overlay.active')
    check(page.locator('.rk-cmp-head').count() == 1, 'comparar logros con otro jugador')
    page.screenshot(path=str(OUT / 'rw_compare.png'))
    page.keyboard.press('Escape'); page.wait_for_timeout(300)

    # Celebración legendaria fuera de partida
    page.evaluate("Nexus.ui.celebrate.achievement(Nexus.services.achievements.get('collector'))")
    page.wait_for_timeout(900)
    check(page.locator('.rw-celebrate').count() == 1, 'celebración a pantalla completa (épico)')
    page.screenshot(path=str(OUT / 'rw_celebrate.png'))

    # Móvil sin scroll horizontal
    page.set_viewport_size({'width': 390, 'height': 800})
    for url in ['achievements', 'achievements/misiones']:
        page.goto(URL + '#/' + url); page.wait_for_timeout(500)
        w = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(w <= 1, f'móvil {url}: sin scroll horizontal')
        page.screenshot(path=str(OUT / f"rw_m_{url.replace('/', '_')}.png"), full_page=True)
    for route, tabs in [('cosmetics', ['pase', 'tienda', 'coleccion'])]:
        page.goto(URL + '#/' + route); page.wait_for_timeout(500)
        for tab in tabs:
            page.click(f'.rw-tab[data-tab={tab}]'); page.wait_for_timeout(200)
            w = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check(w <= 1, f'móvil {tab}: sin scroll horizontal')
    page.screenshot(path=str(OUT / 'rw_mobile.png'), full_page=True)

    check(not errs, 'sin errores de JS: ' + ' | '.join(errs[:3]))
    b.close()

print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + str(len(bad)))
sys.exit(1 if bad else 0)
