"""Cuentas, sesión persistente, persistencia de partidas en curso y ranking (modo local).
python3 tests/e2e_accounts.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, login, skip_avatar_onboarding
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
bad = []
WRAP = """() => { for (const id of ['snake','tetris','pacman']) { const g = Nexus.games.registry.get(id); const m = g.mount; g.mount = (r) => (window['__'+id] = m(r)); } }"""
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1366, 'height': 800}); page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and errs.append(m.text))
    page.goto(URL); page.wait_for_selector('#auth-screen:not([hidden])')

    # Sin invitado ni exportación
    check(page.locator('#auth-guest').count() == 0, 'no existe modo invitado')
    # Validación del registro
    page.click('.auth-tab[data-tab=register]')
    page.fill('#au-name', 'a b'); page.fill('#au-pass', 'secreta1'); page.fill('#au-pass2', 'secreta1'); page.click('#au-submit')
    check(page.locator('#au-error').inner_text().strip() != '', 'nombre con espacios rechazado')
    page.fill('#au-name', 'Ana_01'); page.fill('#au-pass', '123'); page.fill('#au-pass2', '123'); page.click('#au-submit')
    check('6' in page.locator('#au-error').inner_text(), 'contraseña corta rechazada')
    page.fill('#au-pass', 'secreta1'); page.fill('#au-pass2', 'otra-cosa'); page.click('#au-submit')
    check(page.locator('#au-error').inner_text().strip() != '', 'contraseñas distintas rechazadas')
    page.fill('#au-pass2', 'secreta1'); page.click('#au-submit'); page.wait_for_timeout(200)
    check('Términos' in page.locator('#au-error').inner_text() and page.locator('#shell').is_hidden(), 'sin aceptar los términos no se crea la cuenta')
    page.click('.auth-accept a[data-legal=privacy]'); page.wait_for_selector('.legal-modal')
    check('Responsable del tratamiento' in page.inner_text('.legal-modal') and 'Agencia Española de Protección de Datos' in page.inner_text('.legal-modal'), 'la política de privacidad se puede leer antes de registrarse')
    page.click('.legal-modal .modal-buttons .btn-primary'); page.wait_for_timeout(300)
    page.check('#au-accept'); page.click('#au-submit'); page.wait_for_selector('#shell:not([hidden])')
    check(page.inner_text('#user-name') == 'Ana_01', 'registro correcto')

    # Avatares PNG: bienvenida tras el registro, filas por colección y confirmación antes → después
    page.wait_for_selector('.avp', timeout=4000)
    check(page.locator('.avp-row').count() == 8 and page.locator('.avp-opt').count() == 51, 'selector: 8 colecciones y 51 avatares')
    check(page.evaluate("Nexus.services.users.current().avatar") == 'nx-nexo', 'cuenta nueva con el avatar por defecto')
    page.click('.avp-opt[data-id=fa-fox]'); page.wait_for_selector('.avp-confirm:not([hidden])')
    check(page.locator('.avp-confirm [data-av=nx-nexo]').count() == 1 and page.locator('.avp-confirm [data-av=fa-fox]').count() == 1, 'confirmación con el avatar actual y el nuevo')
    page.click('[data-c-cancel]'); page.wait_for_timeout(100)
    check(page.evaluate("Nexus.services.users.current().avatar") == 'nx-nexo', '«Volver» no cambia nada')
    page.click('.avp-opt[data-id=fa-fox]'); page.click('[data-c-save]'); page.wait_for_selector('.avp', state='detached')
    check(page.evaluate("Nexus.services.users.current().avatar") == 'fa-fox', 'avatar guardado como id')
    check(page.locator('#user-avatar nx-av[data-av=fa-fox]').count() == 1 and page.locator('#topbar-avatar nx-av[data-av=fa-fox]').count() == 1, 'barra lateral y superior con el avatar nuevo')
    page.wait_for_timeout(300)
    check(page.locator('#user-avatar nx-av.is-missing').count() == 1, 'sin PNG todavía: se ve el rombo de reserva')
    page.goto(URL + '#/profile'); page.wait_for_timeout(300); page.click('#pf-edit'); page.wait_for_selector('.avp')
    page.keyboard.press('ArrowRight'); page.keyboard.press('Escape'); page.wait_for_selector('.avp', state='detached')
    check(page.evaluate("Nexus.services.users.current().avatar") == 'fa-fox', 'Esc cierra el selector sin guardar')
    # Una cuenta antigua con emoji se ve con su avatar equivalente
    check(page.evaluate("Nexus.services.avatars.resolve('🐼')") == 'fa-panda' and page.evaluate("Nexus.services.avatars.resolve('xx')") == 'nx-nexo', 'emojis antiguos → id equivalente')

    # Sesión persistente al recargar
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    check(page.inner_text('#user-name') == 'Ana_01', 'la sesión sobrevive a la recarga')

    # Ajustes sin exportar/importar
    page.goto(URL + '#/settings'); page.wait_for_timeout(300)
    txt = page.inner_text('#view').lower()
    check('exportar' not in txt and 'importar' not in txt, 'ajustes sin exportar/importar datos')
    check(page.locator('text=Kernel').count() == 0 and 'kernel' not in page.inner_text('body').lower(), 'sin rastro de Kernel Defense en la UI')

    # Partida en curso: Tetris, Snake, Pac-Man se restauran en pausa
    page.evaluate(WRAP)
    page.goto(URL + '#/game/tetris'); page.wait_for_timeout(400)
    page.click('[data-do=start]'); page.wait_for_timeout(200)
    for k in ['ArrowLeft', 'Space', 'Space']: page.keyboard.press(k); page.wait_for_timeout(80)
    page.evaluate("__tetris.score = 4321"); page.evaluate("__tetris.run.save()")
    snap_t = page.evaluate("[__tetris.piecesLocked, JSON.stringify(__tetris.board)]")
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    page.evaluate(WRAP)
    page.goto(URL + '#/library'); page.goto(URL + '#/game/tetris'); page.wait_for_timeout(500)
    check(page.evaluate("__tetris.state") == 'paused' and page.evaluate("__tetris.score") == 4321, 'Tetris: partida restaurada en pausa con su puntuación')
    check(page.evaluate("[__tetris.piecesLocked, JSON.stringify(__tetris.board)]") == snap_t, 'Tetris: tablero idéntico tras recargar')
    page.click('[data-do=resume]'); page.wait_for_timeout(300)
    check(page.evaluate("__tetris.state") == 'playing', 'Tetris: Continuar reanuda')
    page.evaluate("__tetris.gameOver(false,'x')"); page.wait_for_timeout(300)
    check(page.evaluate("Nexus.storage.get('run:' + Nexus.services.users.current().id + ':tetris')") is None, 'Tetris: partida guardada se borra al terminar')
    page.evaluate("Nexus.ui.modal.closeAll()")

    page.goto(URL + '#/game/snake'); page.wait_for_timeout(400)
    page.click('.ax-mode[data-mode=rival]'); page.click('[data-do=start]'); page.keyboard.press('ArrowUp'); page.wait_for_timeout(250)
    page.evaluate("__snake.score = 777; __snake.run.save()")
    n = page.evaluate("__snake.snake.length")
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    page.evaluate(WRAP)
    page.goto(URL + '#/library'); page.goto(URL + '#/game/snake'); page.wait_for_timeout(500)
    check(page.evaluate("[__snake.state, __snake.score, __snake.snake.length, __snake.mode.id]") == ['paused', 777, n, 'rival'], 'Snake: partida restaurada (modo, puntos, longitud)')
    check(page.evaluate("__snake.kinds instanceof Set"), 'Snake: Set restaurado como Set')
    page.click('[data-do=resume]'); page.wait_for_timeout(250)
    check(page.evaluate("__snake.state") == 'playing', 'Snake: continúa sin errores')

    page.goto(URL + '#/game/pacman'); page.wait_for_timeout(400)
    page.click('.ax-mode[data-mode=nexus]'); page.click('[data-do=start]'); page.wait_for_timeout(3200); page.keyboard.press('ArrowLeft'); page.wait_for_timeout(1500)
    page.evaluate("__pacman.run.save()")
    sc = page.evaluate("[__pacman.score, __pacman.pelletsLeft, __pacman.ghosts.length]")
    page.reload(); page.wait_for_selector('#shell:not([hidden])')
    page.evaluate(WRAP)
    page.goto(URL + '#/library'); page.goto(URL + '#/game/pacman'); page.wait_for_timeout(500)
    check(page.evaluate("[__pacman.score, __pacman.pelletsLeft, __pacman.ghosts.length]") == sc and page.evaluate("__pacman.state") == 'paused', 'Pac-Man: partida restaurada en pausa')
    page.click('[data-do=resume]'); page.wait_for_timeout(1200)
    check(page.evaluate("__pacman.state") in ('playing', 'dying', 'ready'), 'Pac-Man: continúa tras restaurar')

    # Perfil: cambio de contraseña, cierre de sesión y acceso
    page.goto(URL + '#/profile'); page.wait_for_timeout(300)
    page.evaluate("Nexus.services.progress.recordGame({game:'snake',mode:'classic',won:false,endless:true,score:50,time:30,xp:20})")
    page.evaluate("Nexus.services.users.flush()")
    page.evaluate("Nexus.services.users.logout()"); page.wait_for_selector('#auth-screen:not([hidden])')
    check(page.evaluate("Nexus.storage.get('session')") is None, 'cerrar sesión borra la sesión')
    page.fill('#au-name', 'Ana_01'); page.fill('#au-pass', 'mala-clave'); page.click('#au-submit'); page.wait_for_timeout(500)
    check(page.locator('#au-error').inner_text().strip() != '', 'contraseña incorrecta rechazada')
    login(page, 'ana_01', 'secreta1')
    check(page.inner_text('#user-name') == 'Ana_01', 'login insensible a mayúsculas')
    check(page.evaluate("Nexus.services.users.data().xp.total") > 0, 'progreso conservado entre sesiones')

    # Segundo usuario: nombres únicos y ranking
    page.evaluate("Nexus.services.users.logout()"); page.wait_for_selector('#auth-screen:not([hidden])')
    page.click('.auth-tab[data-tab=register]'); page.fill('#au-name', 'ANA_01'); page.fill('#au-pass', 'secreta1'); page.fill('#au-pass2', 'secreta1'); page.check('#au-accept'); page.click('#au-submit'); page.wait_for_timeout(400)
    check('uso' in page.locator('#au-error').inner_text().lower() or page.locator('#au-error').inner_text().strip() != '', 'nombre duplicado (sin distinguir mayúsculas) rechazado')
    page.fill('#au-name', 'Beto'); page.click('#au-submit'); page.wait_for_selector('#shell:not([hidden])')
    skip_avatar_onboarding(page)
    page.goto(URL + '#/rankings'); page.wait_for_timeout(600)
    check('Ana_01' in page.inner_text('#view') and 'Beto' in page.inner_text('#view'), 'ranking muestra ambas cuentas')

    # Borrar cuenta
    page.evaluate("Nexus.services.users.deleteAccount('secreta1')"); page.wait_for_selector('#auth-screen:not([hidden])')
    page.fill('#au-name', 'Beto'); page.fill('#au-pass', 'secreta1'); page.click('#au-submit'); page.wait_for_timeout(500)
    check(page.locator('#auth-screen:not([hidden])').count() == 1, 'cuenta borrada ya no puede entrar')

    # Login sólo con cuentas existentes
    page.goto(URL); page.wait_for_selector('#auth-screen:not([hidden])')
    page.fill('#au-name', 'nadie_existe'); page.fill('#au-pass', 'secreta1'); page.click('#au-submit'); page.wait_for_timeout(400)
    check('No existe ninguna cuenta' in page.locator('#au-error').inner_text(), 'login con usuario inexistente: «No existe ninguna cuenta»')
    check(page.evaluate("Nexus.backend.kind") == 'local' and page.evaluate("(Nexus.storage.get('ldb',{users:[]})).users.some(u => u.name === 'nadie_existe')") is False, 'el login fallido no crea la cuenta')

    # Sitio publicado sin servidor configurado (p. ej. GitHub Pages sin API_URL): no se puede entrar
    import mimetypes
    pub = b.new_context(); pg = pub.new_page()
    def serve(route):
        rel = route.request.url.split('demo.github.io/', 1)[1].split('?')[0].split('#')[0] or 'index.html'
        f = ROOT / rel
        if f.is_file(): route.fulfill(body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or 'text/plain')
        else: route.fulfill(status=404, body='')
    pub.route('https://demo.github.io/**', serve)
    pg.goto('https://demo.github.io/index.html'); pg.wait_for_selector('#auth-screen:not([hidden])')
    check(pg.evaluate("Nexus.backend.unavailable") is True, 'sitio publicado sin API_URL: backend no disponible')
    check(pg.locator('#au-submit').is_disabled() and 'no configurado' in pg.inner_text('#au-status'), 'el formulario de acceso queda bloqueado con aviso')
    pub.close()

    check(not errs, 'sin errores de JS: ' + '; '.join(errs))
    b.close()
print('\nRESULT:', 'OK' if not bad else 'FALLOS: ' + ', '.join(bad))
