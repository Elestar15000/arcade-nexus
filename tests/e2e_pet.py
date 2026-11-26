"""Nexito, la mascota de racha: regla del día, necesidades, escudos, rescate, rotura, vacaciones,
hitos, forma única (sin evolución), comida de misiones, migración de las rachas antiguas, Worker y la interfaz.
python3 tests/e2e_pet.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
OUT = pathlib.Path('/tmp/shots'); OUT.mkdir(exist_ok=True)
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

# Reloj simulado: T(d, h) = día d a la hora h, contado desde hoy a mediodía. Los escudos semanales se
# desactivan fijando shieldWeek a la semana de cada momento, salvo en la prueba de los escudos.
JS = """
window.T = (d, h = 12) => { const x = new Date(); x.setHours(h, 0, 0, 0); x.setDate(x.getDate() + d); return x.getTime(); };
window.P = Nexus.services.pet;
window.noWeekly = (t) => { const x = new Date(t); x.setDate(x.getDate() - (x.getDay() + 6) % 7); P.data().streak.shieldWeek = Nexus.util.dayKey(x); };
window.care = (d, game = 'snake') => { const t = T(d); noWeekly(t); P.tick(t); noWeekly(t); P.onGame({ game, at: t, time: 60 }); return P.feed('merienda', t + 60e3); };
window.st = () => JSON.parse(JSON.stringify(P.data().streak));
"""

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1366, 'height': 900}); page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(m.text))
    page.goto(URL); register(page, 'Cuidador')
    page.evaluate(JS)

    # ── Estado inicial ──
    s = page.evaluate("st()")
    check(s['count'] == 0 and s['shields'] == 1, 'cuenta nueva: racha 0 y 1 escudo')
    check(page.evaluate("P.STAGES.length") == 1 and page.evaluate("P.stage().id") == 'nexito', 'Nexito tiene una sola forma (sin crecimiento)')
    check(page.evaluate("P.data().today.snack") is True, 'merienda gratis disponible')

    # ── Regla del día: 1 partida + 1 comida ──
    page.evaluate("noWeekly(T(0)); P.onGame({ game: 'snake', at: T(0), time: 60 })")
    check(page.evaluate("st().count") == 0 and page.evaluate("P.todo().played"), 'sólo jugar no suma el día')
    r = page.evaluate("P.feed('merienda', T(0) + 6e4)")
    check(r['ok'] and r['credited']['count'] == 1, 'jugar + comer = día cuidado (racha 1)')
    check(not page.evaluate("P.feed('merienda', T(0) + 7e4).ok"), 'una sola merienda al día')
    check(page.evaluate("P.data().caredDays") == 1, 'días cuidados: 1')

    # ── Días seguidos e hito de 3 días ──
    bal = page.evaluate("Nexus.services.rewards.balance()")
    page.evaluate("care(1); care(2)")
    s = page.evaluate("st()")
    check(s['count'] == 3 and s['best'] == 3, 'tres días seguidos: racha 3')
    check(3 in s['milestones'] and page.evaluate("Nexus.services.rewards.balance()") >= bal + 60, 'hito de 3 días: 60 Rombos')
    check(page.evaluate("P.stage().id") == 'nexito' and page.evaluate("P.data().caredDays") == 3, '3 días cuidados: sigue siendo el mismo Nexito')
    check(page.evaluate("Nexus.services.achievements.isUnlocked('days_3')"), 'logro «Constancia» con la racha de Nexito')

    # ── Necesidades con el tiempo real ──
    page.evaluate("P.data().needs.food = 80")
    f0 = page.evaluate("P.data().needs.food")
    page.evaluate("noWeekly(T(2, 22)); P.tick(T(2, 22))")
    f1 = page.evaluate("P.data().needs.food")
    check(abs((f0 - f1) - 40) <= 1, f'la comida baja 4 por hora ({f0} → {f1} en 10 h)')
    check(page.evaluate("P.mood(T(3, 3)).id") == 'sleepy', 'de madrugada está dormido')
    check(page.evaluate("P.data().needs.fun >= 0 && P.data().needs.rest <= 100"), 'necesidades entre 0 y 100')

    # ── Escudo: un día sin cuidar gasta un escudo y la racha sigue ──
    page.evaluate("noWeekly(T(4)); P.tick(T(4))")           # el día 3 pasa sin cuidar
    s = page.evaluate("st()")
    check(s['count'] == 3 and s['shields'] == 0 and s['danger'] == '', 'día perdido con escudo: la racha sigue y se gasta el escudo')
    page.evaluate("care(4)")
    check(page.evaluate("st().count") == 4, 'tras el escudo la racha continúa (4)')

    # ── Peligro y rescate con las 3 misiones ──
    page.evaluate("noWeekly(T(6)); P.tick(T(6))")           # el día 5 pasa sin cuidar y sin escudos
    s = page.evaluate("st()")
    check(s['danger'] != '' and s['count'] == 4, 'sin escudos: racha en peligro (no se rompe aún)')
    page.evaluate("care(6)")
    check(page.evaluate("st().count") == 4, 'cuidar en peligro no suma hasta rescatar')
    check(page.evaluate("P.onAllMissions(T(6) + 1e5)"), 'las 3 misiones diarias rescatan la racha')
    s = page.evaluate("st()")
    check(s['danger'] == '' and s['count'] == 5 and s['rescueUsed'] != '', 'rescatada: el día cuidado ya cuenta (5)')

    # ── Rotura: otra vez sin escudos y con el rescate gastado ──
    page.evaluate("noWeekly(T(8)); P.tick(T(8))")
    s = page.evaluate("st()")
    check(s['count'] == 0 and s['best'] == 5, 'sin escudo ni rescate: la racha vuelve a 0 y se guarda la mejor')
    page.evaluate("care(8)")
    check(page.evaluate("st().count") == 1, 'empieza una racha nueva')

    # ── Escudo semanal (cada lunes, máx. 2) ──
    page.evaluate("P.data().streak.shields = 0; P.data().streak.shieldWeek = '2000-01-03'; P.tick(T(8) + 1e5)")
    check(page.evaluate("st().shields") == 1, 'cada lunes se regala un escudo')
    page.evaluate("Nexus.services.rewards.data().rombos = 1000")
    check(page.evaluate("P.buyShield().ok") and page.evaluate("st().shields") == 2, 'comprar escudo con Rombos')
    check(not page.evaluate("P.buyShield().ok"), 'máximo 2 escudos')

    # ── Vacaciones: la racha se congela sin gastar escudos ──
    v = page.evaluate("P.startVacation(2, T(8))")
    check(v['ok'], 'empezar 2 días de vacaciones')
    page.evaluate("noWeekly(T(11)); P.tick(T(11))")           # días 9 y 10 de vacaciones
    s = page.evaluate("st()")
    check(s['count'] == 1 and s['shields'] == 2 and s['danger'] == '', 'en vacaciones no se gasta escudo ni se rompe')
    check(page.evaluate("P.vacationLeft(T(11))") == 12, 'quedan 12 días de vacaciones este año')

    # ── Comida de misiones ──
    page.evaluate("P.giveFood('easy'); P.giveFood('hard'); P.giveFood('weekly')")
    fd = page.evaluate("P.data().food")
    check(fd['galleta'] >= 1 and fd['tarta'] >= 1 and fd['banquete'] >= 1, 'misiones: galleta, tarta y banquete')
    check(page.evaluate("P.feed('banquete', T(11) + 1e5).ok") and page.evaluate("P.mood(T(11) + 2e5).id") == 'happy', 'el banquete lo pone feliz')
    check(not page.evaluate("P.feed('pizza', T(11)).ok"), 'no se puede dar comida que no tienes')
    check(page.evaluate("P.buyTreat('pizza').ok") and page.evaluate("P.data().food.pizza") == 1, 'comprar un capricho con Rombos')

    # ── Hitos sin repetirse y avatar/logros ──
    page.evaluate("P.data().streak.milestones = []; P._milestone(7)")
    check(page.evaluate("Nexus.services.rewards.owns('nx-bufanda')"), 'hito de 7 días: bufanda')
    page.evaluate("Nexus.services.rewards.data().rombos = 0; P._milestone(7)")
    check(page.evaluate("Nexus.services.rewards.balance()") == 0, 'un hito no se cobra dos veces')

    # ── Vestir y logro secreto ──
    for it in ['nx-gorra', 'nx-gafas-sol', 'nx-cupula-navidad']: page.evaluate(f"Nexus.services.rewards.grant('{it}', 'test')")
    page.evaluate("['pet-hat','nx-gorra','pet-glasses','nx-gafas-sol','pet-scarf','nx-bufanda','pet-dome','nx-cupula-navidad'].forEach((v, i, a) => { if (i % 2 === 0) P.equip(v, a[i + 1]); })")
    check(page.evaluate("Object.keys(P.SLOTS).join()") == 'pet-hat,pet-glasses,pet-scarf,pet-dome', 'Nexito: sombrero, accesorio, ropa y cúpula')
    check(page.evaluate("Object.values(P.outfit()).filter(Boolean).length") == 4, 'Nexito vestido con 4 prendas')
    check(page.evaluate("Nexus.services.achievements.isUnlocked('sx_pet_dress')"), 'logro secreto «De punta en blanco»')
    check(not page.evaluate("P.equip('pet-hat', 'nx-corona')"), 'no se equipa lo que no se tiene')

    # ── Nombre ──
    check(not page.evaluate("P.rename('x').ok"), 'nombre demasiado corto rechazado')
    check(page.evaluate("P.rename('Rombito').ok") and page.evaluate("P.name()") == 'Rombito', 'renombrar a Nexito')

    # ── Migración de las rachas antiguas ──
    mig = page.evaluate("""(() => { const d = Nexus.util.dayKey(), raw = JSON.parse(JSON.stringify(Nexus.services.users.data()));
        delete raw.rewards.pet; raw.meta.dayStreak = 6; raw.meta.bestDayStreak = 9; raw.meta.lastDay = d; raw.meta.daysPlayed = 40;
        raw.rewards.missions.streak.best = 7; const n = Nexus.schema.normalize(raw); return n.rewards.pet; })()""")
    check(mig['streak']['count'] == 6 and mig['streak']['best'] == 9, 'migración: racha de días 6 (mejor 9)')
    check(mig['caredDays'] == 40 and sorted(mig['streak']['milestones']) == [3, 7], 'migración: días jugados y premios ya cobrados')

    # ── Resumen público ──
    sm = page.evaluate("Nexus.backend && Nexus.backend.summarize ? null : null")
    lb = page.evaluate("Nexus.services.leaderboard.load().then(() => Nexus.services.leaderboard.byStreak().length)")
    check(lb >= 1, 'ranking de rachas de Nexito')

    # ── Interfaz ──
    page.evaluate("Nexus.services.pet.data().streak.count = 12; Nexus.services.pet.data().caredDays = 30; Nexus.services.users.saveData()")
    page.goto(URL + '#/pet'); page.wait_for_selector('.nxt-scene'); page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / 'pet_1.png'))
    check(page.locator('.nxt-need').count() == 3, 'página: 3 necesidades')
    check('12' in page.inner_text('.nxt-streak'), 'página: racha actual visible')
    check(page.locator('.nav-item[data-route="pet"]').count() == 1, 'entrada «Nexito» en el menú')
    page.click('.nxt-act[data-panel=dress]'); page.wait_for_timeout(300)
    check(page.locator('.nxt-slot').count() == 4, 'vestir: 4 huecos')
    check(page.locator('.nxt-wear-it.locked').count() == 0 and page.locator('.nxt-wear-it[data-id=nx-corona]').count() == 0, 'vestir: solo lo que tiene')
    check(page.locator('.nxt-scene .nxp-snow').count() > 10, 'cúpula de Navidad con nieve')
    page.screenshot(path=str(OUT / 'pet_dress.png'), full_page=True)
    check(page.locator('.nxt-act[data-panel=evo]').count() == 0 and page.locator('.nxt-act[data-panel=rules]').count() == 1, 'sin panel de evolución')
    check(page.locator('.nxt-scene svg.nx-scene .nxp-face').count() == 1 and page.locator('.nxt-scene .nxp-egg').count() == 0, 'nuevo diseño en la cúpula')
    page.click('.nxt-act[data-panel=food]'); page.wait_for_timeout(300)
    check(page.locator('.nxt-food').count() == 7, 'despensa: 7 comidas')
    page.click('.nxt-gear'); page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'pet_settings.png'), full_page=True)
    page.check('[data-hidden]'); page.wait_for_timeout(300)
    check(not page.locator('.nav-item[data-route="pet"]').is_visible(), 'ocultar a Nexito lo quita del menú')
    page.goto(URL + '#/home'); page.wait_for_timeout(500)
    check(page.locator('.nh-pet').count() == 0, 'oculto: sin tarjeta en Inicio')
    page.evaluate("P.setHidden(false)"); page.goto(URL + '#/stats'); page.goto(URL + '#/home'); page.wait_for_timeout(500)
    check(page.locator('.nh-pet').count() == 1, 'tarjeta de Nexito en Inicio')
    page.screenshot(path=str(OUT / 'pet_home.png'))

    # Merienda desde el modal de resultados
    page.evaluate("""(() => { const P = Nexus.services.pet, d = P.data(); d.today = { day: Nexus.util.dayKey(), played: false, fed: false, cared: false, snack: true };
        const r = Nexus.services.progress.recordGame({ game: 'snake', mode: 'classic', won: false, endless: true, score: 50, time: 30, xp: 10 });
        Nexus.ui.modal.resultModal({ title: 'Fin', result: r, game: 'snake' }); })()""")
    page.wait_for_selector('.modal-pet')
    page.screenshot(path=str(OUT / 'pet_modal.png'))
    page.click('.modal-pet [data-pet-snack]'); page.wait_for_timeout(300)
    check(page.evaluate("P.todo().cared"), 'la merienda del modal cuida el día')
    page.keyboard.press('Escape'); page.wait_for_timeout(300)

    # Ajustes generales
    page.goto(URL + '#/settings'); page.wait_for_timeout(400)
    check(page.locator('#st-pet-show').count() == 1, 'ajustes: sección Nexito')

    check(page.evaluate("typeof Nexus.ui.nexito.evolveOverlay") == 'undefined', 'sin celebración de evolución')
    page.goto(URL + '#/home'); page.wait_for_timeout(300)

    # Persistencia
    c = page.evaluate("st().count")
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    check(page.evaluate("Nexus.services.pet.streak().count") == c and page.evaluate("Nexus.services.pet.name()") == 'Rombito', 'Nexito persiste tras recargar')

    # Móvil
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(URL + '#/pet'); page.wait_for_timeout(600)
    w = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check(w <= 1, 'móvil: sin scroll horizontal')
    page.screenshot(path=str(OUT / 'pet_mobile.png'), full_page=True)

    check(not errs, 'sin errores de JS: ' + ' | '.join(errs[:3]))
    b.close()

print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + str(len(bad)))
sys.exit(1 if bad else 0)
