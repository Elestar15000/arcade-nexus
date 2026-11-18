"""Escape Room: menú, sala completa jugada con la interfaz, candados de cifras/letras/colores/flechas, inventario,
combinación, pistas, penalización, continuar tras recargar, sala diaria, fin de tiempo y móvil.
python3 tests/e2e_escape.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
URL = f'file://{ROOT}/index.html'
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m, flush=True); (not c) and bad.append(m)
HOOK = "() => { const g = Nexus.games.registry.get('escape'); const m = g.mount; g.mount = (r) => (window.__e = m(r)); }"

def obj(page, oid): page.click(f'.er-obj[data-obj="{oid}"]'); page.wait_for_timeout(60)
def code(page, value):
    page.fill('#er-detail input', value); page.click('#er-detail form button[type=submit]'); page.wait_for_timeout(120)
def item(page, iid): page.click(f'.er-inv-it[data-item="{iid}"]'); page.wait_for_timeout(60)

with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    ctx = b.new_context(viewport={'width': 1366, 'height': 860})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(m.text))
    page.goto(URL); register(page, 'Escapista', 'secreta1')
    page.evaluate(HOOK)
    page.goto(URL + '#/library'); page.wait_for_timeout(300)
    check(page.locator('a.game-card[href="#/game/escape"]').count() == 1, 'escape en la biblioteca')
    page.goto(URL + '#/game/escape'); page.wait_for_timeout(400)
    check(page.locator('.er-tabs [data-tab]').count() == 4, 'menú con medio, difícil, imposible y diaria')
    check(page.locator('.er-grid .er-card').count() == 10 and page.locator('.er-grid .er-card.locked').count() == 9, 'medio: 10 salas, solo la primera abierta')
    for t in ('dificil', 'imposible'):
        page.click(f'[data-tab={t}]'); page.wait_for_timeout(80)
        check(page.locator('.er-grid .er-card').count() == 10, f'{t}: 10 salas')
    page.click('[data-tab=medio]')
    page.screenshot(path=str(SHOTS / 'escape_menu.png'))

    # ── Sala 1 completa con la interfaz ──
    page.click('.er-card[data-room=m1]'); page.wait_for_selector('[data-do=start]')
    page.click('[data-do=start]'); page.wait_for_timeout(200)
    check(page.locator('.er-obj').count() == 7, 'sala 1: 7 objetos en escena')
    t0 = page.evaluate('__e.run.left')
    obj(page, 'reloj')
    check('9:45' in page.inner_text('#er-detail') and '9:45' in page.inner_text('#er-notes'), 'mirar el reloj: texto y nota en el cuaderno')
    obj(page, 'escritorio')
    code(page, '123')
    check('no es correcta' in page.inner_text('#er-msg').lower(), 'código incorrecto: mensaje de error')
    code(page, '945')
    check(page.locator('.er-inv-it[data-item=lupa]').count() == 1, 'código correcto: la lupa va al inventario')
    page.screenshot(path=str(SHOTS / 'escape_room.png'))
    item(page, 'lupa')
    check(page.locator('.er-obj.usable').count() == 1, 'con la lupa seleccionada se marca dónde usarla')
    obj(page, 'periodico')
    check('PLANTA' in page.inner_text('#er-msg'), 'usar la lupa en el periódico revela el mensaje')
    obj(page, 'planta'); page.click('#er-detail [data-take]'); page.wait_for_timeout(80)
    check(page.locator('.er-inv-it[data-item=llave]').count() == 1, 'coger la llave de la planta')
    page.click('#er-hint'); page.wait_for_timeout(80)
    t1 = page.evaluate('__e.run.left')
    check(t0 - t1 >= 30 and 'puerta' in page.inner_text('#er-msg').lower(), 'la pista orienta según el progreso y resta 30 s')
    item(page, 'llave'); obj(page, 'puerta')
    page.wait_for_selector('.modal-result', timeout=4000)
    check('ESCAPADO' in page.inner_text('.modal-result'), 'escapar: modal de victoria')
    check(page.locator('.modal-result nx-ic[data-i=starFill]').count() > 0, 'la victoria muestra estrellas')
    page.screenshot(path=str(SHOTS / 'escape_win.png'))
    page.click('.modal-result button:has-text("Siguiente sala")'); page.wait_for_timeout(250)
    check(page.locator('[data-do=start][data-room=m2]').count() == 1, '«Siguiente sala» abre la sala 2')
    page.click('[data-do=menu]'); page.wait_for_timeout(100)
    check(page.locator('.er-grid .er-card.locked').count() == 8 and page.locator('.er-card.done').count() == 1, 'la sala 2 queda desbloqueada y la 1 resuelta')

    # ── Flechas (m4) y colores (m5) ──
    page.evaluate("__e.start('m4')"); page.wait_for_timeout(150)
    obj(page, 'cofre')
    for d in 'URRD': page.click(f'#er-detail [data-dir={d}]'); page.wait_for_timeout(40)
    page.wait_for_timeout(400)
    check(page.locator('.er-inv-it[data-item=catalejo]').count() == 1, 'cerradura de flechas: se abre con ↑ → → ↓')
    page.evaluate("__e.start('m5')"); page.wait_for_timeout(150)
    obj(page, 'atril')
    for c in ['azul', 'verde', 'amarillo', 'rojo']: page.click(f'#er-detail [data-col={c}]'); page.wait_for_timeout(40)
    page.wait_for_timeout(400)
    check(page.locator('.er-inv-it').count() == 0, 'cerradura de colores: orden incorrecto no abre')
    for c in ['rojo', 'amarillo', 'verde', 'azul']: page.click(f'#er-detail [data-col={c}]'); page.wait_for_timeout(40)
    page.wait_for_timeout(400)
    check(page.locator('.er-inv-it[data-item=marcapaginas]').count() == 1, 'cerradura de colores: rojo, amarillo, verde, azul')

    # ── Combinar (d1) y texto en espejo (i4) ──
    page.evaluate("__e.start('d1')"); page.wait_for_timeout(150)
    page.evaluate("(() => { const s = __e.run.st; s.inv.push('pedernal'); s.flags['got:pedernal'] = true; __e.render(); })()")
    obj(page, 'antorcha'); page.click('#er-detail [data-take]'); page.wait_for_timeout(60)
    item(page, 'pedernal'); page.click('#er-item [data-combine=antorcha]'); page.wait_for_timeout(80)
    check(page.locator('.er-inv-it[data-item=antorcha_lit]').count() == 1, 'combinar pedernal + antorcha = antorcha encendida')
    page.evaluate("__e.start('i4')"); page.wait_for_timeout(150)
    obj(page, 'espejo')
    check(page.locator('#er-detail .er-mirror').count() == 1, 'el espejo muestra texto reflejado')
    page.screenshot(path=str(SHOTS / 'escape_mirror.png'))
    # Penalización en imposible
    obj(page, 'baul'); before = page.evaluate('__e.run.left'); code(page, 'ESPEJO')
    check(before - page.evaluate('__e.run.left') >= 10, 'imposible: un intento fallido resta 10 s')
    code(page, 'reflejo')
    check('reloj' in page.inner_text('#er-notes').lower(), 'imposible: respuesta correcta (sin importar mayúsculas)')

    # ── Continuar tras recargar ──
    page.reload(); page.evaluate(HOOK); page.goto(URL + '#/home'); page.goto(URL + '#/game/escape'); page.wait_for_timeout(400)
    check(page.locator('[data-do=resume]').count() == 1, 'al volver se ofrece continuar la sala a medias')
    page.click('[data-do=resume]'); page.wait_for_timeout(200)
    check(page.evaluate('__e.run.roomId') == 'i4' and page.evaluate("__e.run.st.flags['baul:open']") is True, 'continuar recupera la sala y lo resuelto')

    # ── Fin de tiempo ──
    page.evaluate('__e.run.left = 2'); page.wait_for_selector('.modal-result', timeout=6000)
    check('TIEMPO' in page.inner_text('.modal-result'), 'si se acaba el tiempo, se pierde')
    page.keyboard.press('Escape'); page.wait_for_timeout(200)
    page.evaluate("Nexus.ui.modal.closeAll && Nexus.ui.modal.closeAll()"); page.wait_for_timeout(150)

    # ── Diaria ──
    page.click('[data-tab=diaria]'); page.wait_for_timeout(100)
    check(page.locator('.er-daily-card').count() == 1 and 'sala diaria #' in page.inner_text('.er-daily-card').lower(), 'pestaña diaria con la sala del día')
    rid = page.get_attribute('.er-daily-card', 'data-room')
    page.click('.er-daily-card'); page.click('[data-do=start]'); page.wait_for_timeout(200)
    path = page.evaluate("Nexus.games.escapeEngine.solve(__e.room).path")
    check(len(path) >= 2, f'la sala diaria tiene solución ({len(path)} pasos)')
    # Resolver la diaria con el motor y comprobar que se registra
    page.evaluate("""(() => { const E = Nexus.games.escapeEngine, r = __e.room, st = __e.run.st;
        for (const step of E.solve(r).path) {
          const [a, ...rest] = step.split(' ');
          if (a === 'abrir') { const o = r.objs.find(x => x.id === rest[0]); E.tryLock(r, st, o.id, o.lock.k === 'colors' || o.lock.k === 'dirs' ? o.lock.ans : [].concat(o.lock.ans)[0]); }
          else if (a === 'coger') E.take(r, st, rest[0]);
          else if (a === 'usar') E.useItem(r, st, rest[2], rest[0]);
          else if (a === 'combinar') { const [x, y] = rest[0].split('+'); E.combine(r, st, x, y); }
        }
        __e.after(); })()""")
    page.wait_for_selector('.modal-result', timeout=4000)
    page.evaluate("Nexus.ui.modal.closeAll && Nexus.ui.modal.closeAll()"); page.wait_for_timeout(200)
    page.click('[data-tab=diaria]'); page.wait_for_timeout(100)
    check('Racha diaria: 1' in page.inner_text('.er-daily') and page.locator('.er-daily-card.done').count() == 1, 'la diaria resuelta suma racha')

    # ── Móvil ──
    m = b.new_context(viewport={'width': 390, 'height': 840}, has_touch=True, is_mobile=True)
    mp = m.new_page(); mp.on('pageerror', lambda e: errs.append('móvil: ' + str(e)))
    mp.goto(URL); register(mp, 'Movil', 'secreta1'); mp.evaluate(HOOK)
    mp.goto(URL + '#/game/escape'); mp.wait_for_timeout(400)
    mp.tap('.er-card[data-room=m1]'); mp.tap('[data-do=start]'); mp.wait_for_timeout(200)
    mp.tap('.er-obj[data-obj=escritorio]'); mp.wait_for_timeout(100)
    mp.screenshot(path=str(SHOTS / 'escape_mobile.png'))
    check(mp.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'móvil: sin scroll horizontal')
    check(mp.locator('#er-detail input').is_visible(), 'móvil: el candado es usable')
    check(not errs, 'sin errores de JavaScript' + (': ' + ' | '.join(errs[:5]) if errs else ''))
    b.close()

print('\nRESULT:', 'OK' if not bad else f'{len(bad)} FAIL(S)')
sys.exit(1 if bad else 0)
