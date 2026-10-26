/* ============================================================
   NEXUS ARCADE · namespace.js
   Espacio de nombres global. Los scripts se cargan como scripts
   clásicos (sin módulos ES) para que la app funcione abriendo
   index.html directamente desde el disco (file://).
   ============================================================ */
(function (global) {
    'use strict';

    const Nexus = global.Nexus = global.Nexus || {};

    Nexus.VERSION = '2.0.0';
    Nexus.core = {};      // utilidades de bajo nivel (storage, eventos, hash…)
    Nexus.services = {};  // lógica de negocio (usuarios, progreso, logros…)
    Nexus.ui = { pages: {} }; // componentes de interfaz y páginas
    Nexus.games = {};     // registro y módulos de juegos
})(window);
