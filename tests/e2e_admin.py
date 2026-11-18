"""Panel de administración (modo local): acceso seguro, cuentas, ficha, pop-ups, mantenimiento, suspensión y borrado.
python3 tests/e2e_admin.py"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from helpers import register, login
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = f'file://{ROOT}/index.html'
SHOTS = pathlib.Path('/tmp/shots'); SHOTS.mkdir(exist_ok=True)
bad = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (not c) and bad.append(m)
ADMIN = "window.NEXUS_LOCAL_ADMIN = { users: ['Jefe'], key: 'llave-maestra' };"

SECRET = {'v': None, 'last': -10}
import cv2

def next_code(pg):
    """Código de Google Authenticator nuevo (cada uno sólo vale una vez: si ya se usó el de este intervalo, el siguiente)."""
    import time
    while True:
        now = int(time.time() // 30)
        step = max(SECRET['last'] + 1, now - 1)
        if step <= now + 1: break
        time.sleep(1)
    SECRET['last'] = step
    return pg.evaluate("([s, k]) => Nexus.backend.totpNow(s, k)", [SECRET['v'], step - now])

def admin_login(pg, code=None, pw='clave-jefe', expect_ok=True):
    pg.fill('#adm-name', 'Jefe'); pg.fill('#adm-pass', pw)
    pg.fill('#adm-code', code or next_code(pg))        # al completar las 6 cifras el formulario se envía solo
    if expect_ok:
        try: pg.wait_for_selector('.adm-head', timeout=5000)
        except Exception:
            pg.screenshot(path=str(SHOTS / 'dbg_fail.png'))
            print('DBG', pg.evaluate("[document.querySelector('#adm-error') && document.querySelector('#adm-error').textContent]")); raise

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1366, 'height': 820})
    ctx.add_init_script(ADMIN)
    errs = []
    P = ctx.new_page()
    P.on('pageerror', lambda e: errs.append(str(e)))
    P.goto(URL); register(P, 'Ana', 'secreta1')
    # Otras cuentas creadas directamente en el «servidor» local
    P.evaluate("""async () => {
        await Nexus.backend.register({ name: 'Beto', password: 'secreta2', avatar: '🐼', color: '#00b894' });
        await Nexus.backend.register({ name: 'Jefe', password: 'clave-jefe', avatar: '👑', color: '#fdcb6e' });
        const s = await Nexus.backend.login({ name: 'Beto', password: 'secreta2' });
        const d = s.data; d.xp = { level: 4, xp: 10, total: 950 };
        d.stats.snake = { played: 7, wins: 3, bestScore: 420, bestTime: null, bestStreak: 2, byMode: {} };
        d.stats.tetris = { played: 2, wins: 0, bestScore: 9000, bestTime: null, bestStreak: 0, byMode: {} };
        await Nexus.backend.saveData(s.token, d); return 1; }""")
    check(P.locator('.nav-item[data-route=admin]').count() == 0, 'un jugador normal no ve el enlace de administración')

    A = ctx.new_page()
    A.on('pageerror', lambda e: errs.append(str(e)))
    A.goto(URL); A.wait_for_selector('#shell:not([hidden])')
    A.click('#btn-switch-user'); login(A, 'Jefe', 'clave-jefe')
    check(A.locator('.nav-item[data-route=admin]').count() == 1, 'la cuenta administradora ve «Administración» en la barra lateral')
    A.click('.nav-item[data-route=admin]'); A.wait_for_selector('#adm-login-form')
    check(A.input_value('#adm-name') == 'Jefe', 'admin: el acceso propone la cuenta actual')
    # Sin Google Authenticator vinculado no se puede entrar: lleva a configurarlo
    A.fill('#adm-name', 'Jefe'); A.fill('#adm-pass', 'clave-jefe'); A.fill('#adm-code', '123456'); A.wait_for_selector('#adm-setup-form', timeout=4000)
    check('aún no tiene Google Authenticator' in A.inner_text('.adm-setup'), 'authenticator: sin vincular, el acceso lleva a configurarlo')
    A.fill('#ads-pass', 'clave-jefe'); A.fill('#ads-key', 'mala'); A.click('#ads-submit'); A.wait_for_timeout(300)
    check('no válidas' in A.inner_text('#ads-error'), 'authenticator: vincular exige la clave de alta')
    A.fill('#ads-pass', 'clave-jefe'); A.fill('#ads-key', 'llave-maestra'); A.click('#ads-submit'); A.wait_for_selector('.adm-qr svg')
    SECRET['v'] = A.text_content('#ads-secret').replace(' ', '')
    check(len(SECRET['v']) == 32, 'authenticator: muestra el QR y la clave para introducirla a mano')
    A.locator('.adm-qr').screenshot(path='/tmp/qr_admin.png')
    val, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.imread('/tmp/qr_admin.png'))
    check(val.startswith('otpauth://totp/Nexus%20Arcade%3AJefe?secret=' + SECRET['v']), 'authenticator: el QR contiene el enlace otpauth correcto (lo lee una cámara)')
    A.screenshot(path=str(SHOTS / 'admin_totp_setup.png'))
    A.fill('#ads-code', '000000' if next_code(A) != '000000' else '111111'); SECRET['last'] -= 1; A.click('#ads-enable'); A.wait_for_timeout(300)
    check('no coincide' in A.inner_text('#ads-error2'), 'authenticator: un código erróneo no lo vincula')
    A.fill('#ads-code', next_code(A)); A.click('#ads-enable'); A.wait_for_selector('#adm-login-form')
    check('Listo' in A.inner_text('.adm-login-card'), 'authenticator: vinculado con el primer código')
    check(A.input_value('#adm-name') == 'Jefe', 'authenticator: vuelve al acceso con la cuenta puesta')
    # Acceso
    A.fill('#adm-pass', 'clave-jefe'); A.fill('#adm-code', '000000' if next_code(A) != '000000' else '111111'); SECRET['last'] -= 1
    A.wait_for_timeout(400)
    check('incorrecto' in A.inner_text('#adm-error'), 'admin: código de Google Authenticator erróneo rechazado')
    P.evaluate("() => sessionStorage.clear()")
    r = P.evaluate("async () => { try { await Nexus.backend.admin.login({ name: 'Ana', password: 'secreta1', code: '123456' }); return 'ok'; } catch (e) { return e.status; } }")
    check(r == 401, 'admin: una cuenta normal no entra')
    r = P.evaluate("async () => { try { await Nexus.backend.admin.login({ name: 'Jefe', password: 'clave-jefe', key: 'llave-maestra' }); return 'ok'; } catch (e) { return e.status; } }")
    check(r == 401, 'admin: la clave de alta ya no sirve para entrar')
    used = next_code(A)
    A.fill('#adm-name', 'Jefe'); A.fill('#adm-pass', 'clave-jefe'); A.fill('#adm-code', used)       # al completar las 6 cifras entra solo
    A.wait_for_selector('.adm-kpis')
    r = P.evaluate("async (c) => { try { await Nexus.backend.admin.login({ name: 'Jefe', password: 'clave-jefe', code: c }); return 'ok'; } catch (e) { return e.message; } }", used)
    check('ya se ha usado' in r, 'admin: un código no se puede usar dos veces')
    check(A.locator('.adm-kpi').first.locator('nx-ic[data-i=users]').count() == 1 and '3' in A.locator('.adm-kpi').first.inner_text(), 'admin: el resumen cuenta las 3 cuentas')
    check('Serpiente' in A.inner_text('.adm-bars') or 'Snake' in A.inner_text('.adm-bars'), 'admin: juegos más jugados')
    check(A.evaluate("JSON.parse(sessionStorage.getItem('nexus-admin')).expiresAt - Date.now()") <= 30 * 60000, 'admin: sesión de 30 min en sessionStorage')
    A.screenshot(path=str(SHOTS / 'admin_overview.png'))

    # Cuentas
    A.click('[data-tab=accounts]'); A.wait_for_selector('#adm-rows tr')
    check(A.locator('#adm-rows tr').count() == 3, 'admin: tabla con las 3 cuentas')
    check(A.locator('tr[data-row=jefe] [data-del]').count() == 0 and A.locator('tr[data-row=jefe] [data-susp]').count() == 0, 'admin: no se puede suspender ni borrar a un administrador')
    A.fill('#adm-q', 'bet'); check(A.locator('#adm-rows tr').count() == 1, 'admin: buscar cuentas')
    A.fill('#adm-q', '')
    A.click('tr[data-row=beto] .adm-who'); A.wait_for_selector('.adm-user-head')
    t = A.inner_text('.adm-user')
    check('Beto' in t and '9000' in t.replace('.', '') and '420' in t, 'admin: ficha de cuenta con estadísticas por juego')
    A.screenshot(path=str(SHOTS / 'admin_user.png'))
    A.evaluate('Nexus.ui.modal.closeAll()'); A.wait_for_timeout(300)
    A.screenshot(path=str(SHOTS / 'admin_accounts.png'))

    # Pop-up a una cuenta concreta
    A.click('tr[data-row=ana] [data-msg]'); A.wait_for_selector('#adm-title')
    check('Ana' in A.inner_text('#adm-to'), 'admin: «enviar pop-up» abre el editor con el destinatario')
    A.fill('#adm-title', 'Torneo de Tetris'); A.fill('#adm-text', 'Este sábado a las 18:00. ¡Te esperamos!')
    A.click('[data-kind=warn]')
    A.screenshot(path=str(SHOTS / 'admin_messages.png'))
    A.click('#adm-send'); A.wait_for_selector('.adm-sent li')
    check('0/1' in A.inner_text('.adm-sent'), 'admin: pop-up enviado y pendiente de leer')
    P.wait_for_selector('.notice-modal', timeout=8000)
    check('Torneo de Tetris' in P.inner_text('.notice-modal') and 'Este sábado' in P.inner_text('.notice-modal'), 'el jugador recibe el pop-up mientras juega')
    check(P.locator('.notice-modal.notice-warn').count() == 1, 'el pop-up tiene el tipo elegido (importante)')
    check(A.locator('.notice-modal').count() == 0, 'el pop-up sólo le llega a la cuenta elegida')
    P.screenshot(path=str(SHOTS / 'admin_popup_player.png'))
    P.click('.notice-modal .btn-primary'); P.wait_for_timeout(400)
    A.click('[data-act=refresh]'); A.wait_for_timeout(400)
    check('1/1' in A.inner_text('.adm-sent'), 'admin: ve que el jugador leyó el pop-up')
    P.wait_for_timeout(4500)
    check(P.locator('.notice-modal').count() == 0, 'un pop-up leído no vuelve a salir')

    # Mantenimiento
    A.click('[data-tab=maintenance]'); A.fill('#adm-mmsg', 'Volvemos a las 18:00')
    A.click('[data-m=on]'); A.click('.modal-buttons .btn-danger'); A.wait_for_selector('.adm-maint.on')
    P.wait_for_selector('#maint-screen', timeout=8000)
    check('Volvemos a las 18:00' in P.inner_text('#maint-screen'), 'mantenimiento: el jugador ve la pantalla fija con el mensaje')
    P.keyboard.press('Escape'); P.mouse.click(30, 30)
    check(P.locator('#maint-screen').count() == 1, 'mantenimiento: la pantalla no se puede cerrar')
    check(A.locator('#maint-screen').count() == 0 and A.locator('#maint-band').count() == 1, 'mantenimiento: el administrador sólo ve una franja')
    r = P.evaluate("async () => { try { await Nexus.backend.login({ name: 'Beto', password: 'secreta2' }); return 'ok'; } catch (e) { return e.code; } }")
    check(r == 'maintenance', 'mantenimiento: no se puede iniciar sesión')
    P.screenshot(path=str(SHOTS / 'admin_maint_player.png'))
    A.screenshot(path=str(SHOTS / 'admin_maint.png'))
    A.click('[data-m=off]'); A.wait_for_selector('.adm-maint:not(.on)')
    P.wait_for_selector('#maint-screen', state='detached', timeout=8000)
    check(True, 'mantenimiento: al desactivarlo la página se abre sola')
    check(A.locator('#maint-band').count() == 0, 'mantenimiento: la franja desaparece')

    # Suspensión
    A.click('[data-tab=accounts]'); A.click('tr[data-row=ana] [data-susp]')
    A.click('[data-days="1"]'); A.fill('#adm-reason', 'Insultos en el chat')
    A.click('.modal-buttons .btn-danger'); A.wait_for_selector('tr[data-row=ana].is-susp')
    check('Suspendida' in A.inner_text('tr[data-row=ana]'), 'admin: la cuenta aparece suspendida')
    P.wait_for_selector('#auth-screen:not([hidden])', timeout=8000)
    P.wait_for_selector('.notice-modal.notice-alert')
    check('Insultos en el chat' in P.inner_text('.notice-modal'), 'suspensión: el jugador es expulsado y ve el motivo')
    P.screenshot(path=str(SHOTS / 'admin_suspended.png'))
    P.click('.notice-modal .btn-primary'); P.wait_for_timeout(300)
    P.fill('#au-name', 'Ana'); P.fill('#au-pass', 'secreta1'); P.click('#au-submit'); P.wait_for_timeout(400)
    check('suspendida' in P.inner_text('#au-error'), 'suspensión: no puede volver a entrar')
    A.click('tr[data-row=ana] [data-unsusp]'); A.click('.modal-buttons .btn-primary'); A.wait_for_selector('tr[data-row=ana]:not(.is-susp)')
    P.click('#au-submit'); P.wait_for_selector('#shell:not([hidden])', timeout=5000)
    check(True, 'reactivación: vuelve a entrar')

    # Eliminación
    A.click('tr[data-row=beto] [data-del]'); A.fill('.modal-overlay.active input', 'otro'); A.click('.modal-overlay.active .btn-primary')
    check(A.locator('.modal-overlay.active .field-error:not([hidden])').count() == 1, 'borrar: exige escribir el nombre')
    A.fill('.modal-overlay.active input', 'Beto'); A.click('.modal-overlay.active .btn-primary')
    A.wait_for_function("document.querySelectorAll('#adm-rows tr').length === 2")
    check(P.evaluate("Nexus.storage.get('ldb').users.every(u => u.name !== 'Beto')"), 'borrar: la cuenta desaparece')

    # Registro
    A.click('[data-tab=log]')
    lt = A.inner_text('.adm-log')
    check(all(x in lt for x in ['Acceso al panel', 'Pop-up enviado', 'Mantenimiento activado', 'Suspensión', 'Reactivación', 'Cuenta eliminada']), 'registro de todas las acciones')
    A.screenshot(path=str(SHOTS / 'admin_log.png'))

    # Acceso a pantalla completa desde la pantalla de mantenimiento (sin sesión en el juego)
    P.click('#btn-switch-user'); P.wait_for_selector('#auth-screen:not([hidden])')
    A.click('[data-tab=maintenance]'); A.click('[data-m=on]'); A.click('.modal-buttons .btn-danger'); A.wait_for_selector('.adm-maint.on')
    P.wait_for_selector('#maint-screen', timeout=8000)
    P.click('[data-maint=admin]'); P.wait_for_selector('#admin-screen #adm-login-form')
    check(P.locator('#admin-screen').is_visible(), 'el panel se abre a pantalla completa por encima del mantenimiento')
    admin_login(P); P.wait_for_selector('#admin-screen .adm-kpis')
    check(P.locator('#maint-screen').count() == 0, 'con la sesión de admin desaparece la pantalla bloqueante')
    P.click('#admin-screen [data-tab=maintenance]'); P.click('#admin-screen [data-m=off]'); P.wait_for_selector('#admin-screen .adm-maint:not(.on)')
    P.click('#admin-screen [data-close]'); P.wait_for_timeout(300)
    check(P.locator('#admin-screen').count() == 0 and P.locator('#maint-screen').count() == 0, 'cerrar el panel vuelve al acceso con la página abierta')

    # Móvil
    M = ctx.new_page(); M.set_viewport_size({'width': 390, 'height': 844})
    M.goto(URL); M.wait_for_selector('#auth-screen:not([hidden]), #shell:not([hidden])')
    M.evaluate("() => Nexus.ui.admin.openStandalone()"); admin_login(M); M.wait_for_selector('#admin-screen .adm-kpis')
    M.screenshot(path=str(SHOTS / 'admin_mobile.png'))
    sw = M.evaluate("document.querySelector('#admin-screen').scrollWidth <= window.innerWidth + 1")
    check(sw, 'móvil: el panel no desborda en horizontal')
    M.click('#admin-screen [data-tab=accounts]'); M.wait_for_timeout(200)
    M.screenshot(path=str(SHOTS / 'admin_mobile_accounts.png'))

    check(not errs, 'sin errores de JavaScript: ' + '; '.join(errs[:3]))
    b.close()

print(f'\n{len(bad)} FALLOS' if bad else '\nRESULT: OK')
sys.exit(1 if bad else 0)
