/* ============================================================
   NEXUS ARCADE · ui/legal.js — Política de privacidad y
   Términos y condiciones.
     · Páginas #/privacy y #/terms (con sesión iniciada)
     · Ventana con el texto desde la pantalla de acceso
     · Aceptación: casilla obligatoria al crear la cuenta y aviso
       único para las cuentas existentes cuando cambia la versión
       (se guarda en data.meta.legal = VERSION).
   Los datos del responsable salen de config.js (NEXUS_CONFIG.LEGAL).
   ============================================================ */
(function () {
    'use strict';

    const { esc } = Nexus.util;
    const VERSION = '2026-11-26';
    const UPDATED = '26 de noviembre de 2026';

    const cfg = () => Object.assign({ OWNER: '', EMAIL: '', CITY: '' }, (window.NEXUS_CONFIG && window.NEXUS_CONFIG.LEGAL) || {});
    const owner = () => esc(cfg().OWNER || 'el administrador de Nexus Arcade');
    const contact = () => cfg().EMAIL
        ? `<a href="mailto:${esc(cfg().EMAIL)}">${esc(cfg().EMAIL)}</a>`
        : 'la dirección de contacto indicada por el administrador del sitio';

    const sec = (n, title, body) => `<section class="lg-sec"><h3><span>${n}.</span> ${title}</h3>${body}</section>`;

    function privacy() {
        return `
            <p class="lg-lead">En Nexus Arcade sólo tratamos los datos imprescindibles para que puedas jugar, guardar tu progreso y competir con otros jugadores. No hay publicidad, no vendemos datos y no usamos cookies de seguimiento ni analítica.</p>
            ${sec(1, 'Responsable del tratamiento', `<p>El responsable es ${owner()}${cfg().CITY ? ` (${esc(cfg().CITY)})` : ''}. Para cualquier cuestión sobre tus datos puedes escribir a ${contact()}.</p>`)}
            ${sec(2, 'Qué datos tratamos', `<ul>
                <li><b>Cuenta:</b> nombre de usuario, avatar y color, fecha de creación y del último inicio de sesión. La contraseña nunca se guarda: sólo una huella cifrada (PBKDF2 con sal) que no permite recuperarla.</li>
                <li><b>Progreso:</b> experiencia y nivel, estadísticas e historial de partidas, logros, partidas en curso y ajustes.</li>
                <li><b>Recompensas:</b> Rombos (saldo, ganados, gastados y movimientos), cosméticos que tienes y llevas puestos, y la racha y los datos de Nexito.</li>
                <li><b>Administración:</b> avisos (pop-ups) que te enviamos y si los has leído, posibles suspensiones y su motivo, ajustes de recompensas y correcciones automáticas del servidor.</li>
                <li><b>Datos técnicos:</b> la dirección IP se usa de forma transitoria para limitar intentos de acceso y no se guarda con tu cuenta.</li>
            </ul>`)}
            ${sec(3, 'Para qué y con qué base legal', `<ul>
                <li><b>Prestarte el servicio</b> (cuenta, guardado del progreso, rankings, multijugador y recompensas): es necesario para cumplir los Términos y condiciones que aceptas al registrarte (art. 6.1.b del RGPD).</li>
                <li><b>Seguridad y juego limpio</b> (límite de intentos de acceso, control de Rombos, cosméticos y rachas, suspensiones): interés legítimo en proteger el servicio y a los demás jugadores (art. 6.1.f del RGPD).</li>
            </ul><p>No tomamos decisiones automatizadas con efectos jurídicos sobre ti. El control automático del servidor sólo corrige datos de juego que no son posibles.</p>`)}
            ${sec(4, 'Qué ven los demás jugadores', `<p>En los rankings, en tu perfil público y en las partidas online se muestran tu nombre de usuario, avatar, nivel, estadísticas, logros (incluido tu escaparate), título y marco equipados, y el nombre, la racha y el sombrero de tu Nexito (salvo que lo ocultes). Nunca se muestran tu contraseña, tu historial completo ni tus ajustes.</p>
                <p>En las partidas online la conexión entre jugadores es directa (WebRTC), por lo que tu dirección IP puede ser visible para tu rival. Para encontrar salas se usan servidores públicos de mensajería (MQTT) que sólo reciben el código de sala, tu nombre y los mensajes de la partida.</p>`)}
            ${sec(5, 'Dónde se guardan y quién nos ayuda', `<p>Tus datos se guardan en un repositorio privado de <b>GitHub</b> (GitHub, Inc.), al que se accede a través de un servidor de <b>Cloudflare Workers</b> (Cloudflare, Inc.). La web se sirve desde <b>GitHub Pages</b> y las tipografías desde <b>Google Fonts</b> (Google LLC), que recibe tu IP al cargarlas. Estos proveedores actúan como encargados del tratamiento y pueden tratar datos en Estados Unidos, al amparo del Marco de Privacidad de Datos UE-EE. UU. o de cláusulas contractuales tipo de la Comisión Europea.</p>`)}
            ${sec(6, 'Almacenamiento en tu navegador', `<p>Usamos el almacenamiento local del navegador (localStorage) para mantener tu sesión, una copia de tus datos para jugar sin conexión y el estado de la barra lateral. Es estrictamente necesario para el funcionamiento del sitio, por eso no pedimos consentimiento. No usamos cookies publicitarias ni de analítica.</p>`)}
            ${sec(7, 'Cuánto tiempo los conservamos', `<p>Mientras tengas la cuenta. Puedes eliminarla cuando quieras desde <b>Perfil → Eliminar cuenta</b>: se borran tu carpeta de datos y tu puesto en el ranking. El registro de acciones de administración puede conservar tu nombre de usuario en las últimas 200 acciones. Como el repositorio guarda un historial de versiones, si lo pides eliminaremos también las copias antiguas de tus datos de ese historial.</p>`)}
            ${sec(8, 'Tus derechos', `<p>Puedes pedir el acceso, la rectificación, la supresión, la limitación, la oposición y la portabilidad de tus datos escribiendo a ${contact()}. Te responderemos en el plazo de un mes. Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).</p>`)}
            ${sec(9, 'Menores', `<p>Para crear una cuenta debes tener al menos 14 años. Si tienes menos, necesitas que tu madre, padre o tutor lo autorice. No pedimos tu nombre real, tu edad ni tu correo electrónico.</p>`)}
            ${sec(10, 'Seguridad', `<p>Las comunicaciones van cifradas (HTTPS), las contraseñas se guardan como huella cifrada, las sesiones caducan y el panel de administración exige contraseña y un código temporal de Google Authenticator. Aun así, ningún sistema es infalible: usa una contraseña que no utilices en otros sitios.</p>`)}
            ${sec(11, 'Cambios en esta política', `<p>Si la cambiamos de forma relevante, te lo avisaremos al entrar y te pediremos que la vuelvas a aceptar.</p>`)}`;
    }

    function terms() {
        return `
            <p class="lg-lead">Estos términos regulan el uso de Nexus Arcade, una colección gratuita de minijuegos web. Al crear una cuenta o usar el sitio los aceptas, junto con la <a href="#/privacy" data-legal="privacy">Política de privacidad</a>.</p>
            ${sec(1, 'Quién ofrece el servicio', `<p>Nexus Arcade lo ofrece ${owner()} de forma gratuita y sin ánimo de lucro. Contacto: ${contact()}.</p>`)}
            ${sec(2, 'Tu cuenta', `<ul>
                <li>Debes tener al menos 14 años, o la autorización de tu madre, padre o tutor.</li>
                <li>La cuenta es personal. Eres responsable de lo que se haga con ella y de guardar tu contraseña: no podemos recuperarla.</li>
                <li>El nombre de usuario no puede ser ofensivo, suplantar a otra persona ni hacerse pasar por el equipo de Nexus Arcade.</li>
            </ul>`)}
            ${sec(3, 'Juego limpio y uso aceptable', `<p>No está permitido:</p><ul>
                <li>Hacer trampas, usar programas externos o manipular los datos, la aplicación o la API para obtener ventajas, puntuaciones, Rombos, cosméticos o rachas.</li>
                <li>Abandonar o sabotear partidas online a propósito, acosar a otros jugadores o usar el multijugador para enviar contenido ofensivo.</li>
                <li>Intentar acceder a cuentas ajenas, al panel de administración o a los servidores, o sobrecargarlos.</li>
            </ul><p>Si incumples estas normas podemos corregir o retirar puntuaciones, Rombos y cosméticos, suspender la cuenta de forma temporal o indefinida o eliminarla. Siempre que sea posible te lo explicaremos con un aviso.</p>`)}
            ${sec(4, 'Rombos, cosméticos y Nexito', `<ul>
                <li>Los Rombos son una moneda virtual del juego: no tienen valor económico, no se compran con dinero real, no se pueden canjear por dinero ni transferir a otras cuentas.</li>
                <li>Los cosméticos y los premios son una licencia de uso dentro de Nexus Arcade, no una propiedad. Podemos cambiarlos, retirarlos o sustituirlos (en ese caso intentaremos darte otro equivalente o devolverte los Rombos).</li>
                <li>El servidor comprueba que los Rombos, las compras, lo equipado y la racha de Nexito sean posibles, y corrige lo que no lo es.</li>
            </ul>`)}
            ${sec(5, 'Modos BETA', `<p>Los modos BETA son funciones experimentales que se desbloquean con un código. Se ofrecen tal cual, pueden contener errores y pueden cambiar o desaparecer en cualquier momento.</p>`)}
            ${sec(6, 'Contenido y propiedad intelectual', `<p>El código, el diseño, los personajes (incluido Nexito), los iconos y los textos de Nexus Arcade pertenecen a su autor. Los juegos de cartas, de tablero y de palabras son versiones propias de juegos tradicionales o populares; sus nombres y marcas pertenecen a sus respectivos titulares, que no participan en este proyecto ni lo patrocinan.</p>`)}
            ${sec(7, 'Disponibilidad', `<p>El servicio es gratuito y se ofrece «tal cual». Puede haber periodos de mantenimiento, cambios en los juegos o interrupciones, y aunque hacemos lo posible por conservarlos, no podemos garantizar que nunca se pierdan datos de juego.</p>`)}
            ${sec(8, 'Responsabilidad', `<p>En la medida en que lo permita la ley, no respondemos de daños indirectos derivados del uso del servicio o de su indisponibilidad. Nada de lo anterior limita los derechos que te reconoce la normativa de consumidores y usuarios.</p>`)}
            ${sec(9, 'Baja', `<p>Puedes dejar de usar Nexus Arcade y eliminar tu cuenta cuando quieras desde <b>Perfil → Eliminar cuenta</b>.</p>`)}
            ${sec(10, 'Cambios en estos términos', `<p>Podemos actualizar estos términos. Si los cambios son relevantes te avisaremos al entrar y te pediremos que los vuelvas a aceptar; si no estás de acuerdo, puedes eliminar tu cuenta.</p>`)}
            ${sec(11, 'Ley aplicable', `<p>Estos términos se rigen por la legislación española. Si eres consumidor, podrás acudir a los juzgados de tu domicilio.</p>`)}`;
    }

    const DOCS = {
        privacy: { title: 'Política de privacidad', icon: '🔒', html: privacy },
        terms: { title: 'Términos y condiciones', icon: '📜', html: terms }
    };
    const docHtml = (kind) => `<article class="legal-doc"><p class="lg-meta">Última actualización: ${UPDATED} · versión ${VERSION}</p>${DOCS[kind].html()}</article>`;

    /** Muestra un documento en una ventana (pantalla de acceso, casilla de registro…). */
    function open(kind) {
        const d = DOCS[kind]; if (!d) return;
        const m = Nexus.ui.modal.open({ icon: d.icon, title: d.title, className: 'modal-wide legal-modal', body: docHtml(kind), actions: [{ label: 'Cerrar', kind: 'primary' }] });
        if (m && m.body) m.body.addEventListener('click', (e) => {
            const a = e.target.closest('[data-legal]'); if (!a) return;
            e.preventDefault(); m.close(); setTimeout(() => open(a.dataset.legal), 150);
        });
    }

    const page = (kind) => ({
        title: DOCS[kind].title,
        render(root) {
            root.innerHTML = `<div class="page-body narrow">
                <div class="page-head"><div><h2 class="page-title">${DOCS[kind].title}</h2></div></div>
                <div class="card-surface legal-card">${docHtml(kind)}</div>
                <p class="muted small center">${kind === 'privacy' ? '<a href="#/terms">Términos y condiciones</a>' : '<a href="#/privacy">Política de privacidad</a>'} · <a href="#/settings">Ajustes</a></p>
            </div>`;
        }
    });
    Nexus.ui.pages.privacy = page('privacy');
    Nexus.ui.pages.terms = page('terms');

    const accepted = () => { const d = Nexus.services.users.data(); return !!d && d.meta && d.meta.legal === VERSION; };
    function markAccepted() {
        const U = Nexus.services.users, d = U.data(); if (!d) return;
        d.meta.legal = VERSION; d.meta.legalAt = Date.now(); U.saveData();
    }

    /** Cuentas existentes: aviso único (hasta aceptarlo) cuando hay una versión nueva. */
    function ensureAccepted() {
        if (accepted() || document.querySelector('.legal-accept')) return;
        const body = document.createElement('div');
        body.innerHTML = `<p class="modal-text">Hemos publicado nuestra <a href="#" data-legal="privacy">Política de privacidad</a> y nuestros <a href="#" data-legal="terms">Términos y condiciones</a>. Explican qué datos guardamos, qué ven los demás jugadores, las normas de juego limpio y cómo funcionan los Rombos y los cosméticos.</p>
            <p class="muted small">Para seguir jugando necesitamos que los aceptes. Si no estás de acuerdo, puedes cerrar sesión y pedir la eliminación de tu cuenta.</p>`;
        body.addEventListener('click', (e) => { const a = e.target.closest('[data-legal]'); if (a) { e.preventDefault(); open(a.dataset.legal); } });
        Nexus.ui.modal.open({
            icon: '📜', title: 'Privacidad y condiciones', className: 'modal-sm legal-accept', body, dismissable: false,
            actions: [{ label: 'Cerrar sesión', kind: 'ghost', onClick: () => { Nexus.app.logout(); } },
                { label: 'Acepto', kind: 'primary', onClick: () => { markAccepted(); Nexus.ui.toast('¡Gracias! Ya puedes seguir jugando', { type: 'success', icon: '📜' }); } }]
        });
    }
    let acceptOnLogin = false;   // la casilla del registro: se apunta en cuanto exista la cuenta
    Nexus.bus.on('user:login', () => {
        if (acceptOnLogin) { acceptOnLogin = false; markAccepted(); return; }
        setTimeout(() => { if (Nexus.services.users.data() && !document.querySelector('#shell[hidden]')) ensureAccepted(); }, 600);
    });
    Nexus.bus.on('user:logout', () => { const m = document.querySelector('.legal-accept'); if (m && Nexus.ui.modal.closeAll) Nexus.ui.modal.closeAll(); });

    Nexus.ui.legal = { VERSION, open, markAccepted, ensureAccepted, accepted, docHtml, acceptNextLogin: (v = true) => { acceptOnLogin = !!v; } };
})();
