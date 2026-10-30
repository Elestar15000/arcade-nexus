"""Utilidades comunes de las pruebas E2E (acceso con cuenta)."""
def register(page, name='Tester', pw='secreta1'):
    """Crea una cuenta nueva desde la pantalla de acceso y espera a ver la aplicación."""
    page.wait_for_selector('#auth-screen:not([hidden])')
    page.click('.auth-tab[data-tab=register]')
    page.fill('#au-name', name); page.fill('#au-pass', pw); page.fill('#au-pass2', pw)
    page.click('#au-submit')
    page.wait_for_selector('#shell:not([hidden])')

def login(page, name='Tester', pw='secreta1'):
    page.wait_for_selector('#auth-screen:not([hidden])')
    page.fill('#au-name', name); page.fill('#au-pass', pw)
    page.click('#au-submit')
    page.wait_for_selector('#shell:not([hidden])')
