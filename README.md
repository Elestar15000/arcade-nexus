# Nexus Arcade

Colección de minijuegos en JavaScript puro (sin dependencias ni build). Se ejecuta abriendo
`index.html` directamente en el navegador, o con cualquier servidor estático.

## Qué incluye

- **Cuentas con contraseña obligatoria**: registro e inicio de sesión (sin modo invitado), avatar y color. Usuario
  `A-Z a-z 0-9 _ -` (3–16, único sin distinguir mayúsculas) y contraseña de 6–64 caracteres.
- **Datos en el servidor de GitHub**: con el backend de `backend/` (Cloudflare Worker + repo privado de GitHub) las cuentas
  y el progreso viven en GitHub y los **rankings son globales**. Sin backend configurado funciona en **modo local**
  (cuentas y ranking sólo de este navegador), útil para desarrollo.
- **Sesión local y partidas persistentes**: al recargar sigues dentro de tu cuenta y las partidas de Tetris, Pac-Man y Snake
  (y las de Wordle) se restauran en pausa con «Continuar». El progreso se guarda al instante en local y se sincroniza en
  segundo plano (se reintenta solo si no hay conexión; indicador de estado junto al avatar).
- **Progreso por usuario**: XP, niveles y rangos, estadísticas por juego y modo, historial, racha de días. No hay exportación de datos.
- **81 logros** (generales, Buscaminas, Wordle, Tetris, Pac-Man y Snake) con rareza, progreso y XP.
- **Rankings globales** (general y por juego/modo/métrica).
- **Ajustes** por usuario: 4 temas, partículas, reducir animaciones, sonido y volumen, comportamiento
  de la barra lateral y opciones propias de cada juego.
- **Barra lateral desplegable**: se pliega a iconos con tooltips, cajón en móvil, atajo `Ctrl/Cmd + B`,
  se pliega sola al jugar (configurable) y recuerda su estado.
- **Juegos**: Buscaminas Quantum, **Wordle ES**, **Tetris Fusion**, **Pac-Man Nexus** y **Snake Neón**.

## Activar cuentas y rankings globales

1. Despliega el Worker siguiendo [`backend/README.md`](backend/README.md) (repo privado de datos + token + Worker).
2. Pon su URL en `config.js`: `window.NEXUS_CONFIG = { API_URL: 'https://nexus-arcade-api.<cuenta>.workers.dev' };`
3. Publica el sitio en GitHub Pages. Con `API_URL` vacío la web funciona en modo local.

Avisos: el cliente es de confianza (los rankings no son a prueba de trampas), las contraseñas no se pueden recuperar y las
cuentas del modo local no se migran al servidor.

## Wordle ES

- Palabras de 5 letras en español; la **Ñ** es una letra propia y las tildes se ignoran al escribir.
- Cada intento se valida contra un diccionario de ~10.800 palabras (`assets/data/words-es.js`).
- ~700 soluciones curadas de uso común. Modo **Aleatoria** (sin repetir las últimas 40) y **Diaria**
  (misma palabra para todos cada día).
- Modo difícil, alto contraste para daltonismo, teclado físico y en pantalla, compartir resultado,
  partida en curso guardada en el perfil.

## Tetris Fusion

- Tetris moderno (SRS con kicks, reserva, pieza fantasma, T-Spin, combos y back-to-back).
- **Bloques de poder** en las piezas: 💥 Bomba (5×5), ⚡ Rayo (columna), ❄️ Hielo (congela la caída) y ⭐ Estrella (×2); se activan
  al limpiar su línea y pueden encadenarse.
- **Energía** que se carga limpiando líneas: ⏪ Rebobinar (deshace la última pieza) y 🧹 Purga (borra las 3 filas de abajo).
- Modos: **Fusión**, **Cascada** (los bloques caen solos tras limpiar y las reacciones en cadena multiplican), **Caos**
  (evento aleatorio cada 18 piezas: marea, espejo, prisa, calma, lluvia de poderes) y **Sprint** de 40 líneas.

## Pac-Man Nexus

- **8 enemigos** con IA propia: Cazador, Emboscador, Flanqueador y Errático (los clásicos) más Espectro (casi invisible),
  Saltarín (se teletransporta), Sombra (sigue tu rastro) y Blindado (inmune a las píldoras de poder).
- **7 poderes** que se recogen en el mapa y se guardan en 2 ranuras: ⚡ Turbo, 🧲 Imán, 👻 Fase, ❄️ Hielo, 🛡️ Escudo, 💥 Onda y 🌀 Salto.
- Modos: **Clásico** (4 fantasmas, sin poderes), **Nexus** (poderes y enemigos nuevos nivel a nivel) y **Horda** (los 8 desde el inicio).

## Snake Neón

- **Energía**: mantén `Espacio` para el ⚡ Turbo (el doble de rápido y puntos ×1,5) y usa 🦘 **Salto** (`Z`) para saltar 3 casillas
  por encima de tu cuerpo, rocas o rivales (el aterrizaje debe estar libre).
- **Frutas y poderes**: 🌟 dorada, 🍄 seta (+puntos pero invierte los controles), 👻 Fantasma, 🧲 Imán, 🐢 Lento, 💰 Doble,
  ✂️ Tijeras (la cola cortada se convierte en fragmentos) y 💣 Bomba (destruye rocas y corta rivales).
- **Racha**: comer seguido sube el multiplicador hasta ×3. **Portales** 🌀 (el cuerpo también los atraviesa) y rocas que aparecen con el tiempo.
- Modos: **Clásico**, **Evolución**, **Rival** (serpientes enemigas con IA por BFS que compiten por la comida, te cierran el paso y,
  si chocan con tu cuerpo, mueren y sueltan fragmentos; cara a cara gana la más larga) y **Zona** (la lava avanza desde los bordes y
  quema la cola; se avisa antes).
- Controles: flechas/WASD, deslizar en móvil, botones táctiles.

## Estructura

```
index.html
assets/
  css/        base · layout · components · pages · games/{minesweeper,wordle,arcade,tetris,pacman,snake}
  data/       words-es.js (diccionario)
src/
  core/       namespace, utils, events, storage, hash, schema, audio, backend (servidor / local)
  services/   settings, users, progress, achievements, leaderboard
  ui/         toast, modal, fx, particles, components, sidebar, router, auth, pages/*
  games/      registry.js · minesweeper/ · wordle/{dictionary,game}.js
              shared/kit.js (canvas, bucle, táctil) · tetris/ · pacman/ · snake/   app.js  arranque
backend/      Cloudflare Worker (API sobre repo privado de GitHub) + README de despliegue
config.js     URL del backend (API_URL)
tests/        pruebas E2E (Playwright) y prueba del Worker (Node)
```

## Añadir un juego

1. Crea `src/games/<id>/game.js` y llama a `Nexus.games.registry.register({ id, name, emoji, tagline,
   description, tags, modes, metrics, mount(root) → { destroy() } })`.
2. Al terminar una partida llama a `Nexus.services.progress.recordGame({ game, mode, won, score, time })`
   y muestra `Nexus.ui.modal.resultModal(...)`.
3. Registra sus logros con `Nexus.services.achievements.register([...])`.
4. Añade el `<script>` en `index.html`. Aparece solo en biblioteca, sidebar, stats, logros y rankings.

## Datos y privacidad

- Con backend: cuentas y progreso en un repo **privado** de GitHub (contraseñas con PBKDF2-SHA256, 100.000 iteraciones y sal; el token de
  GitHub sólo existe como *secret* del Worker). Sesión de 30 días firmada con HMAC.
- En el navegador se guarda la sesión, una caché de tus datos y la partida en curso (`localStorage`, prefijo `nexus:v2:`).
- Cerrar sesión borra la sesión y la caché; la cuenta sólo se elimina desde Perfil → «Eliminar cuenta».

## Pruebas

```
pip install playwright && playwright install chromium
python3 tests/e2e_smoke.py        # flujo completo + capturas
python3 tests/e2e_accounts.py     # registro/login, sesión, partidas persistentes, ranking, borrar cuenta
python3 tests/e2e_minesweeper.py
python3 tests/e2e_arcade.py       # Tetris, Pac-Man y Snake
node tests/worker_test.mjs        # API del Worker contra un GitHub falso en memoria
```

Las fuentes (Bricolage Grotesque, Manrope) se cargan de Google Fonts; sin conexión se usan fuentes del sistema.
