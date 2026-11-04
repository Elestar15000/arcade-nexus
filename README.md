# Nexus Arcade

Colección de minijuegos en JavaScript puro (sin dependencias ni build). Se ejecuta abriendo
`index.html` directamente en el navegador, o con cualquier servidor estático.

## Qué incluye

- **Cuentas con contraseña obligatoria**: registro e inicio de sesión (sin modo invitado), avatar y color. Usuario
  `A-Z a-z 0-9 _ -` (3–16, único sin distinguir mayúsculas) y contraseña de 6–64 caracteres.
- **Datos en el servidor de GitHub**: con el backend de `backend/` (Cloudflare Worker + repo privado de GitHub) las cuentas
  y el progreso viven en GitHub, **una carpeta por usuario** (`users/<nombre>/` con `account`, `progress`, `stats`, `achievements`,
  `history`, `settings` y `saves`), y los **rankings son globales**. Sólo se puede iniciar sesión con cuentas existentes en ese
  repositorio. El modo local (sin servidor) existe únicamente para desarrollo (`file://` o `localhost`).
- **Sesión local y partidas persistentes**: al recargar sigues dentro de tu cuenta y las partidas de Tetris, Pac-Man y Snake
  (y las de Wordle y Pasapalabra) se restauran en pausa con «Continuar». El progreso se guarda al instante en local y se sincroniza en
  segundo plano (se reintenta solo si no hay conexión; indicador de estado junto al avatar).
- **Progreso por usuario**: XP, niveles y rangos, estadísticas por juego y modo, historial, racha de días. No hay exportación de datos.
- **131 logros** (generales, Buscaminas, Wordle, Pasapalabra, Tetris, Pac-Man, Snake, Pong, Ajedrez y Hundir la flota) con rareza, progreso y XP.
- **Rankings globales** (general y por juego/modo/métrica).
- **Ajustes** por usuario: 4 temas, partículas, reducir animaciones, sonido y volumen, comportamiento
  de la barra lateral y opciones propias de cada juego.
- **Barra lateral desplegable**: se pliega a iconos con tooltips, cajón en móvil, atajo `Ctrl/Cmd + B`,
  se pliega sola al jugar (configurable) y recuerda su estado.
- **Juegos**: Buscaminas Quantum, **Wordle ES**, **Pasapalabra**, **Tetris Fusion**, **Pac-Man Nexus**, **Snake Neón** y los
  multijugador online sin servidor propio: **Pong Turbo**, **Ajedrez** y **Hundir la flota**.

## Activar cuentas y rankings globales

1. Despliega el Worker siguiendo [`backend/README.md`](backend/README.md) (repo privado de datos + token + Worker).
2. Pon su URL en `config.js`: `window.NEXUS_CONFIG = { API_URL: 'https://nexus-arcade-api.<cuenta>.workers.dev' };`
3. Publica el sitio en GitHub Pages. Con `API_URL` vacío la web funciona en modo local.

Avisos: el cliente es de confianza (los rankings no son a prueba de trampas), las contraseñas no se pueden recuperar y las
cuentas del modo local no se migran al servidor.

## Wordle ES

- Palabras de 5 letras en español; la **Ñ** es una letra propia y las tildes se ignoran al escribir.
- Cada intento se valida contra un diccionario de ~10.800 palabras (`assets/data/words-es.js`).
- ~700 soluciones curadas de uso común. Modo **Aleatoria** (sin repetir las últimas 40), **Diaria**
  (misma palabra para todos cada día) y **🧩 Frase del día**.
- **Frase del día**: un refrán con 1–3 huecos de 5 letras, igual para todos cada día. Eliges un hueco y pruebas palabras: los
  colores se refieren a ese hueco y sus **letras verdes se quedan fijadas en la frase**; un hueco acertado se rellena y se pasa al
  siguiente. Hay que completar la frase antes de agotar los intentos (**3 por hueco + 3**: 6, 9 o 12). Banco de 70 refranes en
  `src/games/wordle/phrases.js` (`[palabra]` = hueco); `node tests/wordle_phrases_test.mjs` comprueba que cada hueco tiene 5 letras y
  está en el diccionario. Acceso directo desde Inicio (`#/game/wordle/frase`).
- Modo difícil, alto contraste para daltonismo, teclado físico y en pantalla, compartir resultado,
  partida en curso guardada en el perfil.

## Pasapalabra

- Rosco de **25 letras** (A–Z con Ñ, sin K ni W) **sin cuenta atrás**: acierta, falla o di «pasapalabra» (botón o escribiéndolo) para dejar la
  letra para la siguiente vuelta. «Empieza por…», salvo Ñ y X que son «Contiene la…». Tildes ignoradas; la Ñ se acepta también con N.
- **Rosco diario**: el mismo para todos los jugadores cada día (se genera de forma determinista a partir de la fecha) y un solo intento.
- **Roscos aleatorios** ilimitados con 4 dificultades, cada una con su propio banco de definiciones (100 por nivel, 4 por letra):

  | Dificultad | Pistas | Tiempo de referencia | Otros |
  |---|---|---|---|
  | 🌱 Básico | 3 | 6:00 | tolera una errata en palabras de 6+ letras |
  | ⚔️ Medio | 1 | 5:00 | tolera una errata |
  | 🔥 Difícil | 0 | 4:30 | ortografía exacta |
  | 💀 Profesional | 0 | 4:00 | no muestra la longitud; cada fallo **suma 10 s** a tu marca |

- Se gana con **18 aciertos**; las 25 dan un rosco perfecto (+500). La puntuación se multiplica por la dificultad (×1 a ×2).
- No hay reloj durante la partida: al terminar se muestra **tu marca** (tiempo tardado) y si es tu mejor marca en ese modo (sólo
  cuentan los roscos superados). Terminar por debajo del tiempo de referencia da puntos extra. El ranking tiene la métrica «Mejor marca».
- La marca se calcula desde una hora de inicio absoluta guardada en la cuenta: recargar o salir de la página **no la detiene**.
  Las partidas guardadas con la versión anterior (cuenta atrás) se convierten solas.
- Banco: `src/games/pasapalabra/bank.js` (formato `LETRA|definición|respuesta|alternativas`). `node tests/pasapalabra_bank_test.mjs` valida que cada respuesta empiece/contenga su letra y que haya 4 por letra y nivel.

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

## Pong Turbo

- Modo único **Turbo**: la bola acelera un 5 % con cada golpe; el punto de contacto decide el ángulo y mover la pala al golpear le da
  efecto. Cada devolución carga un 25 % el **⚡ Turbo**; lleno, `Espacio` lo arma y el siguiente golpe es un remate ×1,55. Gana quien llegue a 7.
- **Contra la máquina**, 4 niveles (la puntuación se multiplica por la dificultad):

  | Nivel | Velocidad de la IA | Reflejos | Predice rebotes | Busca ángulos / usa Turbo | Multiplicador |
  |---|---|---|---|---|---|
  | 🌱 Fácil | lenta | 0,30 s | no | no | ×1 |
  | ⚔️ Normal | media | 0,20 s | sí | poco | ×1,5 |
  | 🔥 Difícil | rápida | 0,13 s | sí | a menudo | ×2,2 |
  | 💀 Maestro | muy rápida | 0,075 s | sí | casi siempre | ×3 |

  La IA falla más cuanto más rápida va la bola, así que los peloteos largos siempre acaban decidiéndose.
- **Online 1 contra 1** (modo `online` en estadísticas y rankings): un jugador **crea una sala** y su navegador hace de servidor
  (simula la partida); el otro entra con el **código de 5 caracteres**, con el **enlace** `#/game/pong/CÓDIGO` o desde el
  **buscador de salas** públicas. Cada jugador ve su pala a la izquierda. Se empieza cuando los dos pulsan «Listo» y hay revancha.
  Abandonar (o cerrar la pestaña) cuenta como derrota y da la victoria al rival.
- Controles: flechas/`W` `S`, ratón o dedo sobre la pista, botones táctiles. Mientras estás en los menús, dos IA juegan de fondo.

### Multijugador sin servidor (GitHub Pages)

`src/core/net.js` es genérico, para que futuros juegos multijugador lo reutilicen (`RoomHost`, `RoomGuest`, `RoomBrowser`):

- **Señalización y salas**: brokers **MQTT públicos** por WebSocket seguro (por defecto EMQX y HiveMQ, a la vez; basta con que
  responda uno). Cada sala pública es un mensaje *retenido*; el «último deseo» (LWT) del anfitrión la borra si cierra la pestaña.
- **Partida**: **WebRTC** (DataChannel P2P) entre los dos navegadores, con un canal fiable para eventos y otro sin reenvíos para
  el estado (30 Hz). El anfitrión es autoritativo; el invitado mueve su pala en local y extrapola la bola para no notar la latencia.
- **Plan B**: si en 9 s no hay conexión directa (NAT estricta, redes corporativas…), los mensajes se **retransmiten por el broker**
  (15 Hz, algo más de latencia). Para mejorar la conexión directa se puede añadir un servidor TURN en `config.js` (`P2P.ICE_SERVERS`).
- Privacidad: los brokers públicos son abiertos; por ellos sólo pasan el código de sala, nombre, avatar y nivel del anfitrión y
  los datos de la partida. Ni contraseñas ni progreso. Las partidas online, como el resto, se registran en el cliente (no son a prueba de trampas).

## Ajedrez

- Reglas completas (enroques, captura al paso, promoción con selector, jaque mate, ahogado, 50 jugadas, triple repetición y material
  insuficiente) con motor propio en `src/games/chess/engine.js`, validado con **perft** en 5 posiciones de referencia.
- Notación algebraica con letras españolas (R, D, T, A, C), arrastrar o tocar-y-tocar, jugadas legales marcadas, piezas animadas,
  última jugada y jaque resaltados, material capturado y ventaja, tablero girado si llevas negras.
- **Contra la máquina** (4 niveles; la IA piensa en un Web Worker para no congelar la interfaz):

  | Nivel | Cálculo | Multiplicador |
  |---|---|---|
  | 🌱 Fácil | 1 jugada con mucho ruido | ×1 |
  | ⚔️ Normal | 2 jugadas con algo de ruido | ×1,6 |
  | 🔥 Difícil | 4 jugadas (alfa-beta + quiescencia) | ×2,5 |
  | 💀 Maestro | profundización iterativa hasta 2,5 s | ×4 |

  Eliges color, puedes deshacer y ofrecer tablas (la CPU acepta si no va ganando). La partida se guarda y se recupera.
- **Online**: jugadas con número de orden por canal fiable; un latido cada 4 s detecta jugadas perdidas y resincroniza. Rendirse,
  ofrecer tablas, revancha alternando colores. Salir a mitad cuenta como derrota.

## Hundir la flota

- 10×10, flota clásica: Portaaviones (5), Acorazado (4), Crucero (3), Submarino (3) y Destructor (2). Los barcos **no pueden tocarse**
  (ni en diagonal); si aciertas **repites turno**; al hundir un barco se descubre el agua de alrededor.
- Colocación tocando el tablero (vista previa verde/roja), `R`/clic derecho/botón para girar, «Aleatorio» y «Vaciar».
- **Contra la máquina** (disparos medios para hundir una flota, medidos con `node tests/battleship_ai_test.mjs`):

  | Nivel | Estrategia | Disparos medios | Multiplicador |
  |---|---|---|---|
  | 🌱 Fácil | al azar, remata a veces | ~61 | ×1 |
  | ⚔️ Normal | busca al azar, remata siempre | ~49 | ×1,5 |
  | 🔥 Difícil | damero según el barco más pequeño + descarta diagonales | ~44 | ×2,2 |
  | 💀 Maestro | mapa de probabilidad de todas las flotas posibles | ~39 | ×3 |

- **Online con verificación anti-trampas**: cada jugador guarda su propio tablero. Al pulsar «Listo» envía un **compromiso SHA-256**
  de su flota con una sal secreta; al acabar la partida ambos revelan flota y sal, y cada navegador comprueba que coincide con el
  compromiso y con todas las respuestas («agua», «tocado», «hundido») que dio el rival. Si no, el resultado lo avisa.

### Vestíbulo online compartido

`src/games/shared/online.js` (`Nexus.games.OnlineLobby`) da a cualquier juego por turnos el vestíbulo completo: crear sala pública o
privada, unirse con código, enlace (`#/game/<juego>/<CÓDIGO>`) o buscador, sala con «¡Listo!» y revancha, y aviso si el rival se
va. Lo usan Ajedrez y Hundir la flota sobre la misma red de `src/core/net.js` que Pong.

## Estructura

```
index.html
assets/
  css/        base · layout · components · pages · games/{minesweeper,wordle,pasapalabra,arcade,tetris,pacman,snake,pong,
              online,chess,battleship}
  data/       words-es.js (diccionario)
src/
  core/       namespace, utils, events, storage, hash, schema, audio, backend (servidor / local), net (multijugador P2P)
  services/   settings, users, progress, achievements, leaderboard
  ui/         toast, modal, fx, particles, components, sidebar, router, auth, pages/*
  games/      registry.js · minesweeper/ · wordle/{dictionary,phrases,game}.js
              pasapalabra/{bank,game}.js
              shared/kit.js (canvas, bucle, táctil) · shared/online.js (vestíbulo online)
              tetris/ · pacman/ · snake/ · pong/ · chess/{engine,game}.js · battleship/   app.js  arranque
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
python3 tests/e2e_pasapalabra.py  # rosco diario, dificultades, marca de tiempo, persistencia y migración
python3 tests/e2e_wordle_phrase.py  # Frase del día: huecos, verdes fijados, límite de intentos, logros
node tests/wordle_phrases_test.mjs  # valida el banco de refranes
node tests/pasapalabra_bank_test.mjs  # valida el banco de definiciones
python3 tests/e2e_arcade.py       # Tetris, Pac-Man y Snake
python3 tests/e2e_pong.py         # Pong: CPU y online entre navegadores (P2P, retransmisión, sala llena, abandono…)
python3 tests/e2e_turnbased.py    # Ajedrez y Hundir la flota: CPU y online (sincronía, tablas, revancha, anti-trampas, abandono)
                                  # (las dos anteriores arrancan brokers MQTT locales: tests/mqtt_test_broker.mjs; sin Internet)
node tests/chess_engine_test.mjs  # perft, reglas especiales, SAN, FEN y búsqueda del motor de ajedrez
node tests/battleship_ai_test.mjs # flotas válidas y fuerza de los 4 niveles de IA
node tests/worker_test.mjs        # API del Worker contra un GitHub falso en memoria
```

Las pruebas arrancan siempre en modo local (`tests/helpers.py` lo aplica a cada página), aunque `config.js` tenga `API_URL`.

Las fuentes (Bricolage Grotesque, Manrope) se cargan de Google Fonts; sin conexión se usan fuentes del sistema.
