"""Política de privacidad y Términos: casilla al registrarse, enlaces en el acceso, páginas #/privacy y #/terms,
aviso único para cuentas existentes; y el nuevo reparto de menús y Ajustes (sin apariencia).
python3 tests/e2e_legal.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, skip_avatar_onboarding
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1366, 'height': 860}); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector('#auth-screen:not([hidden])')
    check(page.locator('.auth-legal a[data-legal=privacy]').count() == 1 and page.locator('.auth-legal a[data-legal=terms]').count() == 1, 'acceso: enlaces a privacidad y términos')
    page.click('.auth-legal a[data-legal=terms]'); page.wait_for_selector('.legal-modal')
    t = page.inner_text('.legal-modal')
    check('Rombos' in t and 'Juego limpio' in t and 'legislación española' in t, 'términos legibles sin cuenta')
    page.screenshot(path=str(SHOTS / 'legal_terms_modal.png'))
    page.click('.legal-modal .modal-buttons .btn-primary'); page.wait_for_timeout(300)

    register(page, 'Lia', 'secreta1')
    page.wait_for_timeout(900)
    check(page.locator('.legal-accept').count() == 0 and page.evaluate("Nexus.services.users.data().meta.legal") == page.evaluate("Nexus.ui.legal.VERSION"), 'registro: la aceptación queda guardada en la cuenta')

    for r, txt in [('privacy', 'Responsable del tratamiento'), ('terms', 'Tu cuenta')]:
        page.goto(URL + '#/' + r); page.wait_for_timeout(300)
        check(txt in page.inner_text('.legal-card'), f'página #/{r}')
    page.screenshot(path=str(SHOTS / 'legal_privacy_page.png'), full_page=True)

    # Ajustes: sólo sonido y modos BETA, con enlaces legales
    page.goto(URL + '#/settings'); page.wait_for_timeout(300)
    titles = page.locator('.page-settings .section-title').all_inner_texts()
    check(len(titles) == 2 and 'Sonido' in titles[0] and 'BETA' in titles[1], f'ajustes: sólo sonido y modos BETA {titles}')
    check(page.locator('[data-choice=theme], [data-setting=particles], [data-setting=reduceMotion], [data-setting=autoCollapseSidebar], #st-pet-show, #st-reset').count() == 0, 'ajustes: sin tema, partículas, animaciones, interfaz, Nexito ni restablecer')
    check(page.locator('.st-legal a[href="#/privacy"]').count() == 1 and page.locator('.st-legal a[href="#/terms"]').count() == 1, 'ajustes: enlaces a privacidad y términos')
    check(page.evaluate("document.documentElement.dataset.theme") is None and 'THEMES' not in page.evaluate("Object.keys(Nexus.services.settings)"), 'estilo único: sin temas')
    page.evaluate("Nexus.services.users.data().settings.theme = 'sunset'; Nexus.services.settings.apply()")
    check(page.evaluate("document.documentElement.dataset.theme") is None, 'un tema guardado de antes ya no se aplica')

    # Navegación: Nexito en la barra; estadísticas en el menú del usuario
    check(page.locator('#sidebar .nav-item[data-route=pet]').count() == 1 and page.locator('#sidebar .nav-item[data-route=stats]').count() == 0, 'barra: Nexito sí, estadísticas no')
    page.click('#topbar-user-btn'); page.wait_for_timeout(150)
    check(page.locator('#topbar-menu a[href="#/stats"]').count() == 1 and page.locator('#topbar-menu a[href="#/pet"]').count() == 0, 'menú del usuario: estadísticas sí, Nexito no')
    page.keyboard.press('Escape')

    # Cuenta existente sin aceptar: aviso único que bloquea hasta aceptar
    page.evaluate("Nexus.backend.register({ name: 'Viejo', password: 'secreta2', avatar: 'nx-nexo', color: '#00b894' })"); page.wait_for_timeout(200)
    page.evaluate("Nexus.app.logout()"); page.wait_for_selector('#auth-screen:not([hidden])')
    page.fill('#au-name', 'Viejo'); page.fill('#au-pass', 'secreta2'); page.click('#au-submit'); page.wait_for_selector('#shell:not([hidden])')
    page.wait_for_selector('.legal-accept', timeout=3000)
    check(page.locator('.legal-accept .modal-x').count() == 0, 'cuenta existente: aviso de privacidad y términos que no se puede cerrar sin decidir')
    page.screenshot(path=str(SHOTS / 'legal_accept.png'))
    page.click('.legal-accept .modal-buttons .btn-primary'); page.wait_for_timeout(300)
    check(page.evaluate("Nexus.services.users.data().meta.legal") == page.evaluate("Nexus.ui.legal.VERSION"), 'cuenta existente: aceptado y guardado')

    check(not errs, 'sin errores de JavaScript' + ('' if not errs else ': ' + ' | '.join(errs[:3])))
    b.close()
print('\n' + ('TODO OK' if not bad else f'{len(bad)} FALLOS'))
sys.exit(1 if bad else 0)
