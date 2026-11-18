# Nexus Arcade

Colección de minijuegos en JavaScript puro (sin dependencias ni build). Se ejecuta abriendo
`index.html` directamente en el navegador, o con cualquier servidor estático.

## Qué incluye

- **Cuentas con contraseña obligatoria**: registro e inicio de sesión (sin modo invitado) y avatar de imagen. Usuario
  `A-Z a-z 0-9 _ -` (3–16, único sin distinguir mayúsculas) y contraseña de 6–64 caracteres.
- **Datos en el servidor de GitHub**: con el backend de `backend/` (Cloudflare Worker + repo privado de GitHub) las cuentas
  y el progreso viven en GitHub, **una carpeta por usuario** (`users/<nombre>/` con `account`, `progress`, `stats`, `achievements`,
  `history`, `settings` y `saves`), y los **rankings son globales**. Sólo se puede iniciar sesión con cuentas existentes en ese
  repositorio. El modo local (sin servidor) existe únicamente para desarrollo (`file://` o `localhost`).
- **Sesión local y partidas persistentes**: al recargar sigues dentro de tu cuenta y las partidas de Tetris, Pac-Man y Snake
  (y las de Wordle y Pasapalabra) se restauran en pausa con «Continuar». El progreso se guarda al instante en local y se sincroniza en
  segundo plano (se reintenta solo si no hay conexión; indicador de estado junto al avatar).
- **Progreso por usuario**: XP, niveles y rangos, estadísticas por juego y modo, historial, racha de días. No hay exportación de datos.
- **189 logros** (generales y de cada juego) con rareza, progreso y XP.
- **Rankings globales** (general y por juego/modo/métrica).
- **Ajustes** por usuario: 4 temas, partículas, reducir animaciones, sonido y volumen, comportamiento
  de la barra lateral y opciones propias de cada juego.
- **Barra lateral desplegable**: se pliega a iconos con tooltips, cajón en móvil, atajo `Ctrl/Cmd + B`,
  se pliega sola al jugar (configurable) y recuerda su estado.
- **Juegos**: Buscaminas Quantum, **Wordle ES**, **Pasapalabra**, **Tetris Fusion**, **Pac-Man Nexus**, **Snake Neón**, los puzles **Sudoku**, **Crucigrama**,
  **Sopa de letras**, **Conexiones** y **2048**, el **Solitario**, y los multijugador online sin servidor propio: **Pong Turbo**, **Ajedrez**, **Hundir la flota** y los de cartas **Brisca**,
  **Guiñote**, **Chinchón**, **Póker** y **Mentiroso**.

## Iconos

La interfaz no usa emojis: `src/ui/icons.js` tiene una librería de ~370 iconos de línea SVG (24×24, trazo 2, color del texto)
y un mapa emoji → icono. El código puede seguir escribiendo emojis como identificadores (avatares guardados, pistas de las
salas, logros…): un observador del DOM los cambia al vuelo por `<nx-ic>`, que guarda el emoji original oculto para que
`textContent` no cambie. Los títulos, `aria-label`, `<option>` y `document.title` se limpian de emojis, los juegos de
`<canvas>` dibujan los iconos con `Nexus.ui.icons.draw()` / `fillRich()`, y cada juego tiene su logotipo propio
(`LOGOS`). Los textos para compartir (p. ej. la cuadrícula de Wordle) conservan sus emojis porque se pegan fuera de la web.
Para un icono nuevo: dibújalo en `GLYPHS` y apúntalo en `EMOJI`.

## Avatares

Cada cuenta lleva un avatar PNG de un catálogo de 42 en 7 colecciones (`assets/avatars/`, ver su
[README](assets/avatars/README.md)). Se eligen en un selector a pantalla completa con una fila por colección, al estilo
Netflix (`src/ui/avatar-picker.js`): desde «Cambiar avatar» en el perfil o en el menú de la cuenta, y una vez al
crear la cuenta. Al elegir uno se confirma con el actual y el nuevo lado a lado. La cuenta guarda el id (`fa-fox`) y el
color de la cuenta es el del avatar. Las cuentas antiguas con emoji se traducen solas a su avatar equivalente, en la
web y en el Worker. Si una imagen todavía no existe se ve el rombo de Nexus sobre el color de su colección.

## Activar cuentas y rankings globales

1. Despliega el Worker siguiendo [`backend/README.md`](backend/README.md) (repo privado de datos + token + Worker).
2. Pon su URL en `config.js`: `window.NEXUS_CONFIG = { API_URL: 'https://nexus-arcade-api.<cuenta>.workers.dev' };`
3. Publica el sitio en GitHub Pages. Con `API_URL` vacío la web funciona en modo local.

Avisos: el cliente es de confianza (los rankings no son a prueba de trampas), las contraseñas no se pueden recuperar y las
cuentas del modo local no se migran al servidor.

## Buscaminas Quantum

- 4 poderes **limitados**, sin recarga durante la partida (los orbes del tablero sólo dan puntos): 🛡️ Escudo (×1: se activa y
  destapa la casilla que elijas sin riesgo; si es mina, no explota), 🔍 Scanner (×2, área 3×3), 🎯 Francotirador (×3, casilla
  segura) y ⚡ EMP (×1, marca minas).

## Ajustes de cada juego

La página **Ajustes** sólo tiene lo general (tema, sonido, animaciones, interfaz). Las opciones de cada juego (pieza fantasma,
modo difícil y alto contraste de Wordle, cuadrícula de Snake, jugadas legales del ajedrez, salas públicas…) están dentro del
propio juego, en el botón ⚙️ de su cabecera (`src/ui/game-settings.js`). Los juegos ya no tienen un «modo inicial» configurable:
siempre abren en su modo por defecto.

## Wordle ES

- Palabras de 5 letras en español; la **Ñ** es una letra propia y las tildes se ignoran al escribir.
- Se puede **escribir o corregir en cualquier casilla** de la fila: tócala (o usa ← → / Inicio / Fin) y escribe encima;
  `⌫` borra la casilla seleccionada (o la de su izquierda si está vacía) y `Supr` la borra sin moverse. Sólo se envía con las 5 letras.
- Cada intento se valida contra un diccionario de ~10.800 palabras (`assets/data/words-es.js`).
- ~700 soluciones curadas de uso común. Modo **Aleatoria** (sin repetir las últimas 40), **Diaria**
  (misma palabra para todos cada día) y **🧩 Frase del día**.
- **Frase del día**: el tablero normal de **6 intentos** y, debajo, una frase entera oculta (lugares, obras, comidas, refranes y
  expresiones), la misma para todos cada día. Cada palabra de 5 letras que pruebas descubre en la frase **todas** las apariciones de
  sus letras: 🟩 letra nueva de la frase, verde apagado = de la frase pero ya descubierta, gris = no está. Se gana al descubrir todas
  las letras. Banco de 104 frases en `src/games/wordle/phrases.js`; `node tests/wordle_phrases_test.mjs` comprueba que ninguna tiene
  más de 14 letras distintas y que todas se pueden completar con 4 palabras del diccionario. Acceso directo desde Inicio
  (`#/game/wordle/frase`).
- Modo difícil, alto contraste para daltonismo, teclado físico y en pantalla, compartir resultado,
  partida en curso guardada en el perfil.

## Pasapalabra

- Rosco de **25 letras** (A–Z con Ñ, sin K ni W) **sin cuenta atrás**: acierta, falla o di «pasapalabra» (botón o escribiéndolo) para dejar la
  letra para la siguiente vuelta. «Empieza por…», salvo Ñ y X que son «Contiene la…». Tildes ignoradas; la Ñ se acepta también con N.
- **Rosco diario**: el mismo para todos los jugadores cada día (se genera de forma determinista a partir de la fecha) y un solo intento.
- **Roscos aleatorios** ilimitados con 4 dificultades, cada una con su propio banco de definiciones (300 por nivel, 12 por letra: 1.200 en total):

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
- Banco: `src/games/pasapalabra/bank.js` (formato `LETRA|definición|respuesta|alternativas`). `node tests/pasapalabra_bank_test.mjs` valida que cada respuesta empiece/contenga su letra, que no se repitan y que haya 12 por letra y nivel. Un rosco aleatorio evita repetir las definiciones de tus 10 últimos roscos de esa dificultad.

## Tetris Fusion

- Tetris moderno (SRS con kicks, reserva, pieza fantasma, T-Spin, combos y back-to-back).
- **Bloques de poder** en las piezas: 💥 Bomba (5×5), ⚡ Rayo (columna), ❄️ Hielo (congela la caída) y ⭐ Estrella (×2); se activan
  al limpiar su línea y pueden encadenarse.
- **Energía** que se carga limpiando líneas: ⏪ Rebobinar (deshace la última pieza) y 🧹 Purga (borra las 3 filas de abajo).
- Modo **Normal**: el Tetris de siempre, sin bloques de poder ni energía.
- Velocidad progresiva rápida en todos los modos: se sube de nivel cada **5 líneas** y la caída pasa de 0,75 s (nivel 1) a ~0,26 s
  (nivel 5) y ~0,05 s (nivel 10).
- Modos con poderes: **Fusión**, **Cascada** (los bloques caen solos tras limpiar y las reacciones en cadena multiplican), **Caos**
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

- 10×10 con **dos variantes** (contra la máquina y online; en online la elige el anfitrión):
  - **Clásica**: Portaaviones (5), Acorazado (4), Crucero (3), Submarino (3) y Destructor (2).
  - **Libre (18 casillas)**: cada jugador reparte 18 casillas en los barcos que quiera, de 1 a 10 de largo; cada uno puede tener
    un número y tamaño de barcos distinto. El rival solo ve cuántas casillas te quedan a flote.
- Los barcos **pueden ir pegados** (solo no se pueden solapar); por eso al hundir un barco **no se revela el agua de alrededor**.
  Si aciertas **repites turno**.
- Al terminar, el resultado muestra **los dos tableros finales**: dónde estaba cada barco y todos los disparos (agua, tocado, hundido).
  En online el del rival sale de su flota revelada y verificada.
- Colocación tocando el tablero (vista previa verde/roja), `R`/clic derecho/botón para girar, «Aleatorio» y «Vaciar».
- **Contra la máquina** (disparos medios para hundir una flota, medidos con `node tests/battleship_ai_test.mjs`):

  | Nivel | Estrategia | Disparos medios | Multiplicador |
  |---|---|---|---|
  | 🌱 Fácil | al azar, remata a veces | ~66 | ×1 |
  | ⚔️ Normal | busca al azar, remata siempre | ~60 | ×1,5 |
  | 🔥 Difícil | damero según el barco más pequeño | ~49 | ×2,2 |
  | 💀 Maestro | mapa de probabilidad de todas las flotas posibles | ~45 | ×3 |

- **Online con verificación anti-trampas**: cada jugador guarda su propio tablero. Al pulsar «Listo» envía un **compromiso SHA-256**
  de su flota con una sal secreta; al acabar la partida ambos revelan flota y sal, y cada navegador comprueba que coincide con el
  compromiso y con todas las respuestas («agua», «tocado», «hundido») que dio el rival. Si no, el resultado lo avisa.

### Vestíbulo online compartido

`src/games/shared/online.js` (`Nexus.games.OnlineLobby`) da a cualquier juego por turnos el vestíbulo completo: crear sala pública o
privada, unirse con código, enlace (`#/game/<juego>/<CÓDIGO>`) o buscador, sala con «¡Listo!» y revancha, y aviso si el rival se
va. Lo usan Ajedrez y Hundir la flota sobre la misma red de `src/core/net.js` que Pong.

## Panel de administración

Una o varias cuentas pueden ser **administradoras**. Desde el panel de control (`🛡️ Administración` en la barra lateral, o
«🛡️ Panel de administración» en la pantalla de acceso y en la de mantenimiento) pueden:

- **Ver cuentas y estadísticas**: resumen global (cuentas, suspendidas, partidas, % de victorias, XP, nivel medio, logros, pop-ups sin
  leer, juegos más jugados y top de XP), tabla de cuentas con búsqueda, filtros y orden, y la **ficha** de cada cuenta (alta, último
  inicio de sesión, última sincronización, días y racha, tiempo jugado, estadísticas por juego, últimas partidas y pop-ups recibidos).
- **Suspender / reactivar** una cuenta (1, 7 o 30 días o indefinida, con motivo). Se cierran al momento todas sus sesiones, no puede
  volver a entrar ni guardar, y el jugador ve el motivo y la fecha de fin. Las suspensiones temporales caducan solas.
- **Eliminar** una cuenta (hay que escribir su nombre para confirmar): se borra su carpeta y su puesto en el ranking.
- **Enviar pop-ups** a cuentas concretas (o a varias seleccionadas, o a todas), de tipo aviso, importante o urgente, con vista previa.
  Al jugador le aparece en menos de un minuto si está conectado, o al entrar; al cerrarlo queda como leído y el panel lo muestra.
  Los pendientes se pueden retirar.
- **Mantenimiento**: con un clic todas las cuentas ven una **pantalla fija que no se puede cerrar** con el mensaje que pongas; mientras
  dure no se puede iniciar sesión ni crear cuentas. Se quita sola en cuanto se desactiva. Los administradores ven sólo una franja.
- **Registro** de todos los accesos y acciones del panel.

**Seguridad** (todo se comprueba en el servidor; el navegador no decide quién es administrador):
- Las cuentas administradoras se definen en el Worker con la variable `ADMIN_USERS` (nombres separados por comas).
- **Doble factor con Google Authenticator**: para entrar al panel hace falta la contraseña de la cuenta y el **código de 6 cifras**
  que da la app (TOTP estándar, RFC 6238: cambia cada 30 s, se acepta ±30 s de desfase y **cada código sólo sirve una vez**).
  También vale cualquier app compatible (Microsoft Authenticator, Authy, 1Password…).
- **Vincular el móvil** (una vez, o para cambiarlo si lo pierdes): en el acceso al panel, «📱 Configurar Google Authenticator» →
  cuenta + contraseña + **clave de alta** (`ADMIN_KEY`, un *secret* del Worker) → escaneas el **QR** (o escribes la clave a mano) →
  confirmas con el primer código. Hasta confirmar no se guarda nada; al volver a vincular, el móvil anterior deja de servir.
  La clave de alta ya **no** sirve para entrar.
- El secreto de cada administrador se guarda **cifrado** (AES-GCM con una clave derivada de `SESSION_SECRET`) en su `account.json`.
  Si cambias `SESSION_SECRET`, hay que volver a vincular el móvil.
- La sesión de administrador es un token aparte de **30 minutos**, guardado sólo en la pestaña (`sessionStorage`); no sirve como sesión de
  juego ni un token de juego sirve para el panel. Se revalida la cuenta en cada petición. Intentos de acceso limitados (por IP y por cuenta).
- No se puede suspender ni borrar a otra cuenta administradora.
- Los datos viven en `admin.json` del repo de datos (mantenimiento, suspensiones, pop-ups, registro y último código usado por cada
  administrador); la suspensión se guarda también en el `account.json` de la cuenta.
- En modo local (desarrollo) se activa con `LOCAL_ADMIN: { users: ['TuCuenta'], key: 'clave-de-alta' }` en `config.js` y funciona igual
  (vinculas Google Authenticator con esa clave y entras con los códigos).
- El QR se genera en el navegador sin librerías externas (`src/ui/qr.js`).

## Launcher

La interfaz funciona como un launcher de juegos:

- **Barra lateral** con «Mi biblioteca» agrupada por colecciones plegables (Clásicos, Cartas, Retos mentales, Tablero y
  estrategia) y tus favoritos arriba. Se pliega a iconos (Ctrl + B) y en móvil es un cajón.
- **Barra superior**: buscador global (atajo `/`), botón de **Retos de hoy** con el número de retos pendientes y su lista,
  y nivel con anillo de XP.
- **Inicio**: carrusel de destacados (seguir jugando, reto pendiente, online, sin estrenar), retos de hoy, filas desplazables
  de portadas (seguir jugando, favoritos, sin estrenar), colecciones, logros y actividad.
- **Ficha de juego** (`#/info/<id>`): portada, jugar, modos con tus récords, tus números, logros del juego, últimas partidas
  y más juegos de su colección.
- Colecciones y retos diarios en `src/games/collections.js`; piezas comunes (portadas, filas, barra superior) en `src/ui/launcher.js`.

## Puzles: Sudoku, Crucigrama, Sopa de letras, Conexiones y 2048

Los cinco comparten una base (`src/games/shared/puzzle.js`): menú de modos, reloj, pausa, **partida guardada para continuar**,
**reto diario** generado con una semilla de la fecha (el mismo para todos ese día, con racha) y registro de resultados.

- **Sudoku** — fácil (40 números), medio (32), difícil (27), experto (~24) y sudoku diario. Se generan al momento y siempre
  tienen **solución única** (se comprueba con un resolvedor). Notas, deshacer, pistas, resaltado de fila/columna/caja y de
  números iguales; con 3 errores se pierde. Teclado: 1–9, flechas, N (notas), Retroceso, Ctrl+Z.
- **Crucigrama** — se construye en cada partida con las **1.200 definiciones del Pasapalabra**: fácil (9 palabras), medio (11),
  difícil (13) y diario (12). Toda secuencia de letras de la cuadrícula es una palabra definida. Teclado físico o en pantalla
  (con Ñ), comprobar, revelar letra o palabra.
- **Sopa de letras** — 24 temas. Fácil 10×10 (→ ↓), medio 12×12 (+ diagonales), difícil 14×14 (8 direcciones, también al revés)
  y sopa diaria. Arrastrar o tocar primera y última letra; cada palabra aparece una sola vez.
- **Conexiones** — 16 palabras en 4 grupos (🟨 🟩 🟦 🟪) a partir de 71 categorías, con juegos de palabras en el morado
  (esconden un número, un animal o un color; palíndromos; anagramas; «___ de mar», «media ___»…). El generador evita grupos que
  compartan palabras o familia y comprueba las reglas de los juegos de palabras. Partida libre (4 fallos), difícil (2) y diario.
- **2048** — clásico 4×4, grande 5×5 (meta 4096), contrarreloj de 3 minutos y reto diario (misma secuencia de fichas para todos,
  150 movimientos). Deslizar o flechas/WASD, animaciones y 3 «deshacer» en los modos sin tiempo.

## Juegos de cartas: Brisca, Guiñote y Chinchón

Baraja española de 40 cartas (sin ochos, nueves ni comodines), dibujada en SVG propio. Los tres se juegan **contra la máquina**
(bots en los demás asientos) u **online** en mesas de varios jugadores.

- **Brisca** (sólo 1 contra 1): 3 cartas en mano, triunfo por la muestra, orden As-3-Rey-Caballo-Sota-7…2 y valores 11/10/4/3/2.
  Sin obligación de asistir. Cambio del 7 de triunfo (o del 2 si la muestra es baja) al salir mientras quede mazo. Gana quien pase
  de 60 de 120; a 60, empate.
- **Guiñote** (sólo 4 jugadores, **2 parejas: 2 contra 2**; el compañero se sienta enfrente): 6 cartas, orden As-3-Rey-Sota-Caballo-7…2,
  valores 11/10/4/3/2 y 10 de últimas. Cantes de 20 y las 40 (Rey + Sota) tras ganar una baza (uno por baza, también en el
  arrastre); cambio del 7 de triunfo por la muestra (si vale puntos) tras ganar baza mientras queda mazo; **arrastre** al acabarse
  el mazo (asistir y montar; si no, fallar con un triunfo que gane; si gana el compañero, basta con asistir).
  **Malas y buenas** (a 101): los primeros 50 puntos son malas y, al pasarlas, se cuentan las buenas; gana quien pasa de 50 buenas.
  El marcador se actualiza en vivo con cada baza y cada cante. La primera mano (idas) se juega entera (si las dos parejas pasan,
  gana la que más tiene; a igualdad, la de las últimas); si nadie llega se juegan **vueltas**, en las que gana al instante la
  primera pareja que sobrepasa el límite.
- **Ordenar la mano** (Brisca y Guiñote): arrastra las cartas para colocarlas donde quieras o usa «Por palo» / «Por valor».
- **Chinchón** (2 a 4 jugadores): 7 cartas, robar del mazo o del descarte y descartar. Grupos de 3–4 iguales y escaleras de 3+ del
  mismo palo (el 7 enlaza con la sota). Se cierra con 5 o menos sin combinar; −10 si se cierra con todo combinado; 7 seguidas del
  mismo palo = **chinchón** y gana la partida. Quien pasa de 100 queda eliminado. La mesa ordena sola tus combinaciones.
  Si en 40 turnos por jugador nadie cierra, la ronda es nula y se reparte de nuevo.

- **Parejas en el Guiñote online**: el anfitrión las elige en la sala tocando ⇄ en un jugador y luego en otro para
  intercambiarlos (también con los bots), o con «🔀 Parejas al azar». Los invitados ven las parejas en vivo; juegan alternos
  (Pareja A, B, A, B), así que cada uno queda enfrente de su compañero.

**Online**: `src/games/cardgames/table.js` monta una mesa **multiasiento** sobre la misma red de `src/core/net.js` (la sala ahora
admite hasta 8 invitados; `RoomHost({ maxPlayers })`). El anfitrión crea la mesa (pública o privada, con código, enlace o buscador
que muestra la ocupación «2/4»), ve los asientos, y al pulsar **Empezar** los huecos libres los ocupa un bot y la sala se cierra
a nuevos jugadores. El navegador del anfitrión es la autoridad: baraja, valida cada jugada y manda a cada jugador **sólo su vista**
(nunca las cartas de los demás). Si un invitado se va, un bot ocupa su sitio y la partida sigue; si se va el anfitrión, la mesa
se cierra. Al acabar, todos vuelven a la mesa para jugar otra.

Las reglas son módulos puros (`rules-tricks.js` para Brisca y Guiñote, `rules-chinchon.js`) con la misma interfaz
(`setup / validate / apply / step / view / bot / turn`) y se prueban con `node tests/cardgames_rules_test.mjs`, que juega cientos de
partidas completas entre bots.

## Póker, Mentiroso y Solitario

- **Póker** (Texas Hold'em sin límite, **baraja francesa**, 2 a 4 jugadores, contra bots u online): 1000 fichas para cada uno,
  ciegas 10/20 que suben cada 6 manos, botón rotatorio (en mano a mano el botón pone la ciega pequeña y habla primero antes del flop).
  Pasar, igualar, subir (mínimo la última subida; botones de mínimo, ½ bote, bote y all-in) o retirarse. **Botes secundarios** con
  all-in, reparto en empates y showdown con las cartas a la vista en cada asiento. Quien se queda sin fichas queda eliminado; contra la
  máquina, si te quedas sin fichas la partida acaba. Los bots calculan su probabilidad de ganar (Monte Carlo) contra las pot odds y
  farolean de vez en cuando. Reglas en `src/games/cardgames/rules-poker.js`.
- **Mentiroso** (baraja española, 2 a 4 jugadores, contra bots u online): se reparte todo; quien junta los cuatro de un número los
  descarta. Quien abre pone de 1 a 4 cartas boca abajo y dice un número; los demás tienen que poner cartas «de ese número», sea verdad
  o no. En tu turno puedes acusar («**¡Mentiroso!**»: se levantan las últimas cartas; si mentía se lleva el montón, si no, te lo
  llevas tú y abre él), jugar o pasar (si todos pasan, el montón se retira). Gana el primero sin cartas si el siguiente no le pilla.
  Tocas las cartas para elegirlas. Los bots cuentan lo que tienen y lo que ya ha salido para saber cuándo una jugada es imposible.
  Reglas en `src/games/cardgames/rules-mentiroso.js`.
- **Solitario** (Klondike, baraja francesa, un jugador): **robar 1**, **robar 3** y **solitario diario** (el mismo reparto para todos).
  Toca una carta para mandarla sola a su mejor sitio o **arrástrala** (también pilas). Deshacer (`Ctrl+Z`), pista (`H`), robar
  (`Espacio`) y «⚡ Terminar» cuando todo está a la vista. Puntuación clásica (+5/+10/−15/−100) con bonus de tiempo; partida guardada
  para continuar. En `src/games/solitaire/game.js`.
- Baraja francesa en `src/games/cardgames/french.js` (cartas `S/H/D/C` + número; la mesa común las dibuja junto a las españolas).

## Estructura

```
index.html
assets/
  css/        base · layout · components · pages · games/{minesweeper,wordle,pasapalabra,arcade,tetris,pacman,snake,pong,
              online,chess,battleship,cards,puzzles,solitaire} · icons · avatars
  data/       words-es.js (diccionario)
  avatars/    manifest.js (catálogo) · una carpeta de PNG por colección
src/
  core/       namespace, utils, events, storage, hash, schema, audio, backend (servidor / local), net (multijugador P2P)
  services/   settings, users, avatars, progress, achievements, leaderboard, notices
  ui/         icons, avatar, avatar-picker, toast, modal, fx, particles, components, sidebar, router, auth, pages/*
  games/      registry.js · minesweeper/ · wordle/{dictionary,phrases,game}.js
              pasapalabra/{bank,game}.js
              shared/kit.js (canvas, bucle, táctil) · shared/online.js (vestíbulo online)
              tetris/ · pacman/ · snake/ · pong/ · chess/{engine,game}.js · battleship/
              cardgames/{core,rules-tricks,rules-chinchon,table,games}.js
              shared/puzzle.js · sudoku/ · crossword/ · wordsearch/ · connections/{bank,game}.js · g2048/   app.js  arranque
backend/      Cloudflare Worker (API sobre repo privado de GitHub) + README de despliegue
config.js     URL del backend (API_URL)
tests/        pruebas E2E (Playwright) y prueba del Worker (Node)
tools/        avatars/export.mjs (prepara los PNG de avatar y sincroniza la lista con el Worker)
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
python3 tests/e2e_wordle_phrase.py  # Frase del día: frase oculta, letras reveladas, 6 intentos, logros
node tests/wordle_phrases_test.mjs  # valida que todas las frases se pueden resolver
node tests/pasapalabra_bank_test.mjs  # valida el banco de definiciones
python3 tests/e2e_arcade.py       # Tetris, Pac-Man y Snake
python3 tests/e2e_pong.py         # Pong: CPU y online entre navegadores (P2P, retransmisión, sala llena, abandono…)
python3 tests/e2e_admin.py       # panel de administración: Google Authenticator (QR leído con OpenCV), cuentas, pop-ups, mantenimiento, suspensión y borrado
python3 tests/e2e_turnbased.py    # Ajedrez y Hundir la flota: CPU y online (sincronía, tablas, revancha, anti-trampas, abandono)
python3 tests/e2e_cards.py        # Brisca, Guiñote y Chinchón: CPU y online con 2 y 3 navegadores + bot, sustitución, vuelta a la mesa
python3 tests/e2e_cards_more.py   # Póker y Mentiroso (CPU y online) y Solitario (tocar, arrastrar, deshacer, pista, terminar, diario)
                                  # (las tres anteriores arrancan brokers MQTT locales: tests/mqtt_test_broker.mjs; sin Internet)
node tests/chess_engine_test.mjs  # perft, reglas especiales, SAN, FEN y búsqueda del motor de ajedrez
node tests/battleship_ai_test.mjs # flotas válidas y fuerza de los 4 niveles de IA
python3 tests/e2e_puzzles.py      # Sudoku, Crucigrama, Sopa, Conexiones y 2048: partidas con la interfaz, diarios, continuar, móvil
node tests/puzzles_logic_test.mjs # generadores: sudoku único, crucigramas válidos, sopas, conexiones sin ambigüedad, lógica de 2048
node tests/cardgames_rules_test.mjs # reglas de Brisca, Guiñote y Chinchón con cientos de partidas entre bots
node tests/cards_more_test.mjs     # Póker (manos, botes secundarios, partidas de bots), Mentiroso y lógica del Solitario
node tests/worker_test.mjs        # API del Worker contra un GitHub falso en memoria
node tests/avatars_test.mjs       # catálogo de avatares, equivalencias, lista del Worker e imágenes (--strict: exige todas)
```

Las pruebas arrancan siempre en modo local (`tests/helpers.py` lo aplica a cada página), aunque `config.js` tenga `API_URL`.

Las fuentes (Bricolage Grotesque, Manrope) se cargan de Google Fonts; sin conexión se usan fuentes del sistema.