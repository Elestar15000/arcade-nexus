# Nexus Arcade

Colección de minijuegos en JavaScript puro (sin dependencias ni build). Se ejecuta abriendo
`index.html` directamente en el navegador, o con cualquier servidor estático.

## Qué incluye

- **Perfiles locales**: varios usuarios, avatar y color, contraseña opcional (hash SHA-256 con sal),
  "recordarme", modo invitado, exportar/importar copias de seguridad en JSON y migración automática
  del perfil de la versión anterior.
- **Progreso por usuario**: XP, niveles y rangos, estadísticas por juego y modo, historial, racha de días.
- **Más de 85 logros** (generales, Buscaminas, Wordle, Kernel Defense, Tetris, Pac-Man y Snake) con rareza, progreso y XP.
- **Rankings** entre los perfiles del navegador (general y por juego/modo/métrica).
- **Ajustes** por usuario: tema (4), partículas, reducir animaciones, sonido y volumen, comportamiento
  de la barra lateral y opciones propias de cada juego.
- **Barra lateral desplegable**: se pliega a iconos con tooltips, cajón en móvil, atajo `Ctrl/Cmd + B`,
  se pliega sola al jugar (configurable) y recuerda su estado.
- **Juegos**: Buscaminas Quantum (mejorado), **Wordle ES**, **Kernel Defense** (tower defense), **Tetris Fusion**,
  **Pac-Man Nexus** y **Snake Neón**.

## Wordle ES

- Palabras de 5 letras en español; la **Ñ** es una letra propia y las tildes se ignoran al escribir.
- Cada intento se valida contra un diccionario de ~10.800 palabras (`assets/data/words-es.js`).
- ~700 soluciones curadas de uso común. Modo **Aleatoria** (sin repetir las últimas 40) y **Diaria**
  (misma palabra para todos cada día).
- Modo difícil, alto contraste para daltonismo, teclado físico y en pantalla, compartir resultado,
  partida en curso guardada en el perfil.

## Kernel Defense (tower defense de programación)

- **Un único mapa** (la placa base: bus de datos, chips, entrada INTERNET y CORE) y **rondas infinitas**: se juega
  hasta que el CORE cae. Pasada la ronda 40 todas las amenazas ganan vida y velocidad sin límite; cada 10 rondas
  (desde la 20) llega un jefe **Zero-Day**.
- **Amenazas**: Virus (Bug, Macro virus, Gusano) y Malware (Spyware, Adware, Rootkit, Ransomware, Troyano, Botnet,
  Cryptolocker, Zero-Day). Se descomponen en capas y algunas son inmunes (Rootkit → Java, Ransomware → Rust,
  Troyano → Python hasta Cython).
- **4 torres-lenguaje**: Python 🐍, Java ☕, C++ ⚙️ y Rust 🦀. Cada una tiene 4 niveles y, **en cada nivel, 3 opciones**:
  rama A, rama B o híbrida (AB). Las ramas se combinan libremente (atajos `Q` `W` `E`), estrategias de objetivo y venta al 70 %.
- Velocidad 1×/2×/3×, pausa, ronda automática, atajos de teclado, autoguardado al terminar cada ronda.
- Puntuación = ronda × 100 + amenazas/5. Al ser infinito no hay victoria: cada partida cuenta como récord de puntuación
  (`recordGame({ endless: true })`).
- La lógica (`data.js`, `engine.js`) no usa el DOM: `node tests/td_sim.js` simula una partida con un bot para
  calibrar el equilibrio (`TD.BUDGET_K`, `TD.ROUND_BONUS_K`).

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
  css/        base · layout · components · pages · games/{minesweeper,wordle,towerdefense,arcade,tetris,pacman,snake}
  data/       words-es.js (diccionario)
src/
  core/       namespace, utils, events, storage, hash, schema, audio
  services/   settings, users, progress, achievements, leaderboard
  ui/         toast, modal, fx, particles, components, sidebar, router, auth, pages/*
  games/      registry.js · minesweeper/ · wordle/{dictionary,game}.js
              towerdefense/{data,engine,game}.js
              shared/kit.js (canvas, bucle, táctil) · tetris/ · pacman/ · snake/   app.js  arranque
tests/        pruebas E2E (Playwright)
```

## Añadir un juego

1. Crea `src/games/<id>/game.js` y llama a `Nexus.games.registry.register({ id, name, emoji, tagline,
   description, tags, modes, metrics, mount(root) → { destroy() } })`.
2. Al terminar una partida llama a `Nexus.services.progress.recordGame({ game, mode, won, score, time })`
   y muestra `Nexus.ui.modal.resultModal(...)`.
3. Registra sus logros con `Nexus.services.achievements.register([...])`.
4. Añade el `<script>` en `index.html`. Aparece solo en biblioteca, sidebar, stats, logros y rankings.

## Datos y privacidad

Todo se guarda en `localStorage` bajo el prefijo `nexus:v2:`. La contraseña de un perfil es una
comodidad local, no seguridad real: quien tenga acceso al navegador puede leer los datos.

## Pruebas

```
pip install playwright && playwright install chromium
python3 tests/e2e_smoke.py      # flujo completo + capturas
python3 tests/e2e_data.py       # migración, copias de seguridad, borrado
python3 tests/e2e_minesweeper.py
python3 tests/e2e_towerdefense.py
python3 tests/e2e_arcade.py     # Tetris, Pac-Man y Snake
node tests/td_sim.js            # simulación de equilibrio (sin navegador)
```

Las fuentes (Inter, Orbitron) se cargan de Google Fonts; sin conexión se usan fuentes del sistema.
