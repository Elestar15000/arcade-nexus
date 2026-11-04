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

def local_mode(page, brokers=None, force_relay=False):
    """Fuerza el modo local (sin servidor de cuentas) aunque config.js tenga API_URL, y opcionalmente
    apunta el multijugador a brokers MQTT de prueba (tests/mqtt_test_broker.mjs)."""
    js = """(() => { let v; Object.defineProperty(window, 'NEXUS_CONFIG', { configurable: true,
        get() { return v; }, set(x) { v = Object.assign({}, x, { API_URL: '' }); } }); })();"""
    if brokers:
        import json
        js += "window.NEXUS_P2P_OVERRIDE = %s;" % json.dumps({'BROKERS': brokers, 'FORCE_RELAY': force_relay})
    page.add_init_script(js)


# Todas las páginas que creen las pruebas arrancan en modo local (las cuentas no tocan el servidor real
# aunque config.js tenga API_URL). Las pruebas multijugador añaden sus brokers con local_mode(page, brokers).
def _auto_local():
    from playwright.sync_api._generated import Browser, BrowserContext
    if getattr(Browser, '_nexus_local', False): return
    ob, oc = Browser.new_page, BrowserContext.new_page
    def bp(self, *a, **k): pg = ob(self, *a, **k); local_mode(pg); return pg
    def cp(self, *a, **k): pg = oc(self, *a, **k); local_mode(pg); return pg
    Browser.new_page = bp; BrowserContext.new_page = cp; Browser._nexus_local = True
_auto_local()
