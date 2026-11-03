/* ============================================================
   NEXUS ARCADE · config.js
   Configuración del sitio. Tras desplegar el Worker de /backend
   (ver backend/README.md) pon aquí su URL, sin barra final:
       API_URL: 'https://nexus-arcade-api.TU-CUENTA.workers.dev'
   Con API_URL vacío la web funciona en "modo local": las cuentas y
   el ranking viven sólo en este navegador (útil para desarrollar).
   ============================================================ */
window.NEXUS_CONFIG = {
    API_URL: 'https://nexus-arcade-api.elestar150.workers.dev'

    // Multijugador (opcional). Por defecto se usan brokers MQTT públicos y STUN de Google/Cloudflare.
    // Si muchos jugadores no logran conexión directa, añade un servidor TURN en ICE_SERVERS.
    // , P2P: {
    //     BROKERS: ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'],
    //     ICE_SERVERS: [{ urls: 'stun:stun.l.google.com:19302' },
    //                   { urls: 'turn:TU-SERVIDOR:3478', username: 'usuario', credential: 'clave' }]
    // }
};
