/* ============================================================
   NEXUS ARCADE · games/escape/rooms-dificil.js
   Escape Room · 10 salas de nivel DIFÍCIL.
   ============================================================ */
(function () {
    'use strict';
    const R = (Nexus.games.escapeRooms = Nexus.games.escapeRooms || {});

    R.dificil = [
        // ─────────────────────────────────────────────────── 1
        {
            id: 'd1', name: 'La cripta del faraón', emoji: '🏺', bg: ['#4a3a1a', '#1d1608'],
            intro: 'La losa de la entrada se ha cerrado tras de ti. Estás en la cámara funeraria de un faraón olvidado y la antorcha se ha apagado.',
            objs: [
                { id: 'tabla', e: '📜', n: 'Tablilla de jeroglíficos', x: 14, y: 22, look: 'Una tablilla que explica los números sagrados: 🐍 = 1, 🦅 = 2, 👁️ = 3, 🪲 = 4, ☀️ = 5.', note: 'Jeroglíficos: 🐍1 🦅2 👁️3 🪲4 ☀️5.' },
                { id: 'sarcofago', e: '⚰️', n: 'Sarcófago', x: 40, y: 64, look: [['sarcofago:open', 'La tapa del sarcófago está desplazada.'], 'Sobre la tapa del sarcófago hay tres símbolos grabados: ☀️ 🪲 🦅. Un mecanismo de tres ruedas numeradas la mantiene cerrada.'],
                    lock: { k: 'digits', len: 3, ans: '542', q: 'Ruedas del sarcófago: 3 cifras.', then: { t: 'La tapa se desliza. Junto a la momia brilla un escarabajo de oro.', give: ['escarabajo'] } } },
                { id: 'altar', e: '🛕', n: 'Altar', x: 66, y: 66, look: [['altar_ok', 'El hueco del altar ya tiene su escarabajo.'], 'Un altar con un hueco en forma de escarabajo.'],
                    use: [{ item: 'escarabajo', consume: true, then: { t: 'Encajas el escarabajo. Se abre un compartimento con un pedernal.', set: ['altar_ok'], give: ['pedernal'] } }] },
                { id: 'antorcha', e: '🪔', n: 'Antorcha', x: 22, y: 50, look: [['got:antorcha', 'El soporte de la antorcha está vacío.'], 'Una antorcha apagada en su soporte.'], take: { item: 'antorcha', gone: false } },
                { id: 'muro', e: '🧱', n: 'Muro oscuro', x: 62, y: 24, look: [['luz', 'En el muro, a la luz de la antorcha: «PTJSJT». Debajo: «Cada letra, un paso atrás en el alfabeto».'], 'Un muro en completa oscuridad. Parece que hay algo escrito.'],
                    use: [{ item: 'antorcha_lit', then: { t: 'A la luz de la antorcha lees: «PTJSJT». Y debajo: «Cada letra, un paso atrás en el alfabeto».', set: ['luz'], note: 'Muro: «PTJSJT» — cada letra un paso atrás.' } }] },
                { id: 'vasos', e: '🏺', n: 'Vasos canopos', x: 38, y: 24, look: 'Cuatro vasos canopos con cabezas de animales. Están sellados y vacíos. Nada útil.' },
                { id: 'losa', e: '🚪', n: 'Losa de salida', x: 88, y: 46, look: 'Una losa enorme con una cerradura de letras: «Pronuncia el nombre del dios de los muertos».',
                    lock: { k: 'word', ans: 'OSIRIS', q: 'Cerradura de letras de la losa.', if: 'luz', then: { t: 'La losa retumba y se abre hacia el desierto. ¡Has salido de la cripta!', win: true } } }
            ],
            items: {
                escarabajo: { e: '🪲', n: 'Escarabajo de oro', d: 'Un escarabajo sagrado de oro macizo.' },
                pedernal: { e: '🪨', n: 'Pedernal', d: 'Una piedra para hacer chispas.', combine: { with: 'antorcha', give: 'antorcha_lit', t: 'Golpeas el pedernal: ¡la antorcha prende!' } },
                antorcha: { e: '🪔', n: 'Antorcha apagada', d: 'Necesita fuego.' },
                antorcha_lit: { e: '🔥', n: 'Antorcha encendida', d: 'Ilumina los rincones oscuros.' }
            },
            hints: [
                { until: 'sarcofago:open', t: 'Traduce los símbolos del sarcófago con la tablilla: ☀️ = 5, 🪲 = 4, 🦅 = 2.' },
                { until: 'altar_ok', t: 'El escarabajo de oro encaja en algún sitio de la cripta.' },
                { until: 'got:antorcha_lit', t: 'Coge la antorcha y combínala con el pedernal.' },
                { until: 'luz', t: 'Ilumina el muro oscuro con la antorcha encendida.' },
                { t: 'Retrocede cada letra: P→O, T→S, J→I, S→R, J→I, T→S.' }
            ]
        },
        // ─────────────────────────────────────────────────── 2
        {
            id: 'd2', name: 'El submarino averiado', emoji: '🌊', bg: ['#0f3443', '#04131b'],
            intro: 'Una avería ha dejado el submarino a la deriva y la tripulación ya ha evacuado. Te quedan tú y la cápsula de escape.',
            objs: [
                { id: 'sonar', e: '📡', n: 'Sonar', x: 14, y: 22, look: 'La pantalla del sonar: «Profundidad actual: 240 m».', note: 'Sonar: 240 m.' },
                { id: 'caja', e: '🧰', n: 'Caja de herramientas', x: 18, y: 66, look: [['caja:open', 'La caja de herramientas está abierta.'], 'Una caja con candado. En la tapa pone: «La profundidad a la que estamos».'],
                    lock: { k: 'digits', len: 3, ans: '240', q: 'Candado de la caja: 3 cifras.', then: { t: 'Dentro hay una llave inglesa enorme.', give: ['inglesa'] } } },
                { id: 'manometros', e: '⏲️', n: 'Manómetros', x: 40, y: 22, look: 'Tres manómetros: válvula A = 7 bar, válvula B = 3 bar, válvula C = 9 bar.', note: 'Presiones: A 7, B 3, C 9.' },
                { id: 'manual', e: '📘', n: 'Manual de emergencia', x: 62, y: 22, look: '«Para purgar el sistema, abre las válvulas de mayor a menor presión.» Más abajo, una tabla Morse de números: 1 ·−−−−, 2 ··−−−, 3 ···−−, 4 ····−, 5 ·····, 6 −····, 7 −−···, 8 −−−··, 9 −−−−·, 0 −−−−−.', note: 'Morse: 1 ·−−−− · 3 ···−− · 7 −−··· (tabla completa en el manual).' },
                { id: 'valvulas', e: '🔧', n: 'Panel de válvulas', x: 42, y: 66, look: [['valvulas:open', 'El sistema está purgado: la escotilla de proa ya no está bloqueada.'], ['libres', 'Las válvulas ya giran. Escribe el orden de apertura (letras).'], 'Tres válvulas oxidadas, A, B y C. Están tan duras que no giran con la mano.'],
                    use: [{ item: 'inglesa', then: { t: 'Con la llave inglesa aflojas las tres válvulas. Ya podrías abrirlas en el orden correcto.', set: ['libres'] } }],
                    lock: { k: 'word', ans: 'CAB', q: 'Orden de apertura de las válvulas (3 letras).', if: 'libres', then: { t: 'Silbido de aire... El sistema se purga y la escotilla de proa se desbloquea.', set: ['purgado'] } } },
                { id: 'proa', e: '🚪', n: 'Escotilla de proa', x: 64, y: 66, look: [['got:tarjeta', 'La escotilla de proa está abierta.'], ['purgado', 'La escotilla de proa se ha desbloqueado.'], 'Bloqueada por la presión del agua.'],
                    take: { item: 'tarjeta', if: 'purgado', t: 'Abres la escotilla de proa: en el suelo hay una tarjeta plastificada.' } },
                { id: 'capsula', e: '🛟', n: 'Cápsula de escape', x: 88, y: 46, look: 'La cápsula de escape pide un código de lanzamiento de 3 cifras.',
                    lock: { k: 'digits', len: 3, ans: '317', q: 'Código de lanzamiento: 3 cifras.', if: 'got:tarjeta', then: { t: 'La cápsula se suelta y sube hacia la superficie. ¡Sol!', win: true } } },
                { id: 'extintor', e: '🧯', n: 'Extintor', x: 84, y: 82, look: 'Un extintor. Por suerte, no hay ningún fuego.' }
            ],
            items: {
                inglesa: { e: '🔧', n: 'Llave inglesa', d: 'Una llave inglesa enorme para tuercas y válvulas.' },
                tarjeta: { e: '💳', n: 'Tarjeta de lanzamiento', d: 'Una tarjeta con el código de la cápsula en Morse: ···−− ·−−−− −−···', note: 'Tarjeta: ···−− ·−−−− −−···' }
            },
            hints: [
                { until: 'caja:open', t: 'La tapa de la caja pide la profundidad: mira el sonar.' },
                { until: 'libres', t: 'Las válvulas están duras: usa la llave inglesa en el panel.' },
                { until: 'purgado', t: 'De mayor a menor presión: C (9), A (7), B (3).' },
                { until: 'got:tarjeta', t: 'Ya puedes abrir la escotilla de proa.' },
                { t: 'Traduce la tarjeta con la tabla Morse del manual: ···−− = 3, ·−−−− = 1, −−··· = 7.' }
            ]
        },
        // ─────────────────────────────────────────────────── 3
        {
            id: 'd3', name: 'El casino clandestino', emoji: '🎰', bg: ['#3a0f1e', '#17050b'],
            intro: 'Te has colado en un casino clandestino para buscar pruebas y te han descubierto. El portero no te dejará salir así como así.',
            objs: [
                { id: 'cartas', e: '🃏', n: 'Mesa de cartas', x: 14, y: 26, look: 'Cuatro cartas boca arriba: As de corazones ♥, 7 de picas ♠, Rey de tréboles ♣ y 3 de diamantes ♦. Un cartelito: «As = 1, J = 11, Q = 12, K = 13».', note: 'Cartas: A♥, 7♠, K♣, 3♦ (A=1, K=13).' },
                { id: 'caja', e: '🧰', n: 'Caja del crupier', x: 20, y: 66, look: [['caja:open', 'La caja del crupier está abierta.'], 'Una caja con candado de 3 cifras y una inscripción: «Suma de las cartas rojas, seguida de la suma de las negras».'],
                    lock: { k: 'digits', len: 3, ans: '420', q: 'Candado de la caja: 3 cifras.', then: { t: 'Dentro hay una ficha dorada.', give: ['ficha'] } } },
                { id: 'ruleta', e: '🎡', n: 'Ruleta', x: 40, y: 24, look: 'La ruleta se ha detenido en el 17 negro. Una pizarra con los últimos números: 32, 5, 17.' },
                { id: 'tragaperras', e: '🎰', n: 'Tragaperras', x: 44, y: 66, look: [['jugado', 'La tragaperras muestra 🍒 🍋 🔔 y un mensaje: «Premio: cereza = 2, limón = 9, campana = 6».'], 'Una tragaperras antigua. Solo acepta fichas doradas.'],
                    use: [{ item: 'ficha', consume: true, then: { t: 'Echas la ficha. Los rodillos se paran en 🍒 🍋 🔔 y la pantalla dice: «La cámara del jefe: cereza = 2, limón = 9, campana = 6».', set: ['jugado'], note: 'Tragaperras: 🍒2 🍋9 🔔6 → cámara del jefe.' } }] },
                { id: 'camara', e: '🔐', n: 'Cámara del jefe', x: 66, y: 64, look: [['camara:open', 'La cámara está abierta.'], 'Una pequeña cámara acorazada con 3 ruedas numeradas.'],
                    lock: { k: 'digits', len: 3, ans: '296', q: 'Ruedas de la cámara: 3 cifras.', then: { t: 'Dentro, entre fajos de billetes, encuentras un pase VIP.', give: ['pase'] } } },
                { id: 'crupieres', e: '🎩', n: 'Tres crupieres', x: 64, y: 22, look: 'Exactamente uno de los tres miente. Ana: «Yo no miento». Bruno: «Ana miente». Carla: «Bruno dice la verdad».', note: 'Ana: «Yo no miento». Bruno: «Ana miente». Carla: «Bruno dice la verdad». Solo uno miente.' },
                { id: 'portero', e: '🕴️', n: 'Portero', x: 88, y: 48, look: '«Con pase VIP puedes salir... si me dices el nombre del crupier que miente.»',
                    lock: { k: 'word', ans: 'ANA', q: '¿Quién miente?', if: 'got:pase', wrong: '«Te equivocas. Piénsalo mejor.»', then: { t: '«Correcto.» El portero se aparta y sales a la calle.', win: true } } }
            ],
            items: {
                ficha: { e: '🪙', n: 'Ficha dorada', d: 'Una ficha del casino de color oro.' },
                pase: { e: '🎟️', n: 'Pase VIP', d: 'Un pase VIP con el sello del jefe.' }
            },
            hints: [
                { until: 'caja:open', t: 'Rojas: A♥ (1) + 3♦ (3) = 4. Negras: 7♠ (7) + K♣ (13) = 20.' },
                { until: 'jugado', t: 'Juega la ficha en la tragaperras.' },
                { until: 'camara:open', t: 'Los rodillos salieron en este orden: 🍒 🍋 🔔.' },
                { t: 'Si Ana mintiera, Bruno y Carla dirían la verdad: un solo mentiroso. Cualquier otra opción da dos.' }
            ]
        },
        // ─────────────────────────────────────────────────── 4
        {
            id: 'd4', name: 'La mansión del relojero', emoji: '⏰', bg: ['#2f2418', '#140f09'],
            intro: 'El viejo relojero te invitó a tomar el té y desapareció. Todos los relojes de la casa se han parado a la vez.',
            objs: [
                { id: 'reloj', e: '🕰️', n: 'Reloj de pie', x: 14, y: 40, look: 'El reloj de pie no tiene números, solo marcas. La aguja corta señala la 2.ª marca y la larga, la 7.ª.', note: 'Reloj de pie: aguja corta en 2, aguja larga en 7.' },
                { id: 'nota', e: '✉️', n: 'Carta del relojero', x: 34, y: 22, look: '«Querido invitado: la vitrina se abre con la hora del reloj de pie (sin los dos puntos). Recuerda que la aguja larga cuenta minutos.»' },
                { id: 'vitrina', e: '🗄️', n: 'Vitrina', x: 34, y: 66, look: [['vitrina:open', 'La vitrina está abierta.'], 'Una vitrina con candado de 3 cifras. Dentro se ve una llave de cuerda.'],
                    lock: { k: 'digits', len: 3, ans: '235', q: 'Candado de la vitrina: 3 cifras.', then: { t: 'Coges la llave de cuerda.', give: ['cuerda'] } } },
                { id: 'cuco', e: '🐦', n: 'Reloj de cuco', x: 58, y: 22, look: [['cuco_ok', 'El cuco dejó caer un papel con números romanos: XIV · VII · XXI.'], 'Un reloj de cuco parado. Necesita cuerda.'],
                    use: [{ item: 'cuerda', then: { t: 'Das cuerda al cuco. El pájaro sale, canta y deja caer un papel: «XIV · VII · XXI — escribe cada número con dos cifras».', set: ['cuco_ok'], note: 'Papel del cuco: XIV · VII · XXI (dos cifras cada uno).' } }] },
                { id: 'caja', e: '🎁', n: 'Caja de música', x: 60, y: 66, look: [['caja:open', 'La caja de música está abierta.'], 'Una caja de música con un candado de 6 cifras.'],
                    lock: { k: 'digits', len: 6, ans: '140721', q: 'Candado de la caja de música: 6 cifras.', if: 'cuco_ok', then: { t: 'Suena una melodía. En el fondo de la caja hay un engranaje dorado.', give: ['engranaje'] } } },
                { id: 'puerta', e: '🚪', n: 'Puerta mecánica', x: 86, y: 44, look: 'Una puerta llena de engranajes. Falta uno en el centro.',
                    use: [{ item: 'engranaje', consume: true, then: { t: 'Colocas el engranaje. Todos los relojes vuelven a sonar y la puerta se abre.', win: true } }] },
                { id: 'pendulo', e: '⚖️', n: 'Péndulo', x: 84, y: 82, look: 'Un péndulo quieto. «Tic... tac...», murmuras para ti.' }
            ],
            items: {
                cuerda: { e: '🔑', n: 'Llave de cuerda', d: 'Una llave para dar cuerda a relojes.' },
                engranaje: { e: '⚙️', n: 'Engranaje dorado', d: 'Un engranaje con muchos dientes.' }
            },
            hints: [
                { until: 'vitrina:open', t: 'La aguja larga en la 7.ª marca son 35 minutos; la corta en la 2 es la hora: 2:35.' },
                { until: 'cuco_ok', t: 'Usa la llave de cuerda en el reloj de cuco.' },
                { until: 'got:engranaje', t: 'XIV = 14, VII = 07, XXI = 21.' },
                { t: 'Coloca el engranaje en la puerta mecánica.' }
            ]
        },
        // ─────────────────────────────────────────────────── 5
        {
            id: 'd5', name: 'La estación polar', emoji: '❄️', bg: ['#1c3b52', '#0a1824'],
            intro: 'Una ventisca ha cortado la luz de la estación polar. La radio no funciona y el helicóptero de rescate no te verá a oscuras.',
            objs: [
                { id: 'termometro', e: '🌡️', n: 'Termómetro', x: 14, y: 22, look: 'Fuera estamos a −15 °C.', note: 'Temperatura: −15 °C.' },
                { id: 'diario', e: '📓', n: 'Diario del explorador', x: 34, y: 22, look: '«Día 1: salimos con 4 perros. Día 2: uno se escapó. Día 3: encontramos 3 perros perdidos que se unieron al trineo.»', note: 'Perros: 4, −1, +3.' },
                { id: 'generador', e: '⚡', n: 'Generador', x: 22, y: 64, look: [['generador:open', 'El generador ronronea. Hay luz.'], 'El generador pide un código de 4 cifras. Una etiqueta: «Número de perros del trineo × 2, seguido de los grados bajo cero».'],
                    lock: { k: 'digits', len: 4, ans: '1215', q: 'Código del generador: 4 cifras.', then: { t: 'El generador arranca y se encienden las luces. Ahora ves un mapa clavado en la pared.', set: ['luz'] } } },
                { id: 'mapa', e: '🗺️', n: 'Mapa de la base', x: 56, y: 22, show: 'luz', look: 'Un mapa de la base: «Desde la puerta, para llegar a los suministros: sur, sur, oeste, norte».', note: 'Mapa: sur, sur, oeste, norte.' },
                { id: 'suministros', e: '📦', n: 'Caja de suministros', x: 54, y: 66, show: 'luz', look: [['suministros:open', 'La caja está abierta.'], 'Una caja con cierre de flechas de 4 pasos (el norte es ↑).'],
                    lock: { k: 'dirs', len: 4, ans: ['D', 'D', 'L', 'U'], q: 'Cierre de flechas: 4 direcciones.', then: { t: 'Dentro hay una bengala de emergencia.', give: ['bengala'] } } },
                { id: 'ventana', e: '🪟', n: 'Ventana', x: 86, y: 40, look: 'Se oye el ruido de un helicóptero sobrevolando la zona. Si te viera...',
                    use: [{ item: 'bengala', consume: true, then: { t: 'Enciendes la bengala junto a la ventana. ¡El helicóptero te ve y aterriza!', win: true } }] },
                { id: 'radio', e: '📻', n: 'Radio', x: 80, y: 76, look: 'La radio está rota: le faltan las válvulas. No sirve.' }
            ],
            items: { bengala: { e: '🧨', n: 'Bengala', d: 'Una bengala roja muy brillante.' } },
            hints: [
                { until: 'generador:open', t: '4 − 1 + 3 = 6 perros; 6 × 2 = 12. Después, los 15 grados bajo cero.' },
                { until: 'suministros:open', t: 'Sur = ↓, oeste = ←, norte = ↑.' },
                { t: 'Usa la bengala en la ventana para que te vean.' }
            ]
        },
        // ─────────────────────────────────────────────────── 6
        {
            id: 'd6', name: 'El museo de arte', emoji: '🖼️', bg: ['#33243f', '#150f1b'],
            intro: 'Te has quedado encerrado en la sala de pintura del museo al sonar la alarma. Las puertas de seguridad han bajado.',
            objs: [
                { id: 'cuadros', e: '🖼️', n: 'Cuatro cuadros', x: 22, y: 22, look: '«Tormenta» (1850), «Amanecer» (1500), «Eclipse» (1920) y «Río» (1700).', note: 'Cuadros: Tormenta 1850, Amanecer 1500, Eclipse 1920, Río 1700.' },
                { id: 'placa', e: '🪧', n: 'Placa', x: 44, y: 22, look: '«Ordena las obras de la más antigua a la más reciente: sus iniciales abren la vitrina.»' },
                { id: 'vitrina', e: '🗄️', n: 'Vitrina', x: 24, y: 66, look: [['vitrina:open', 'La vitrina está abierta.'], 'Una vitrina con cierre de 4 letras.'],
                    lock: { k: 'word', ans: 'ARTE', q: 'Cierre de letras: 4 letras.', then: { t: 'Dentro de la vitrina hay una linterna de luz ultravioleta.', give: ['uv'] } } },
                { id: 'escultura', e: '🗿', n: 'Escultura', x: 52, y: 62, look: [['uv_ok', 'Bajo la luz UV, en la escultura brillan unos números: 7 · 1 · 9.'], 'Una escultura de mármol blanco. Muy limpia... sospechosamente limpia.'],
                    use: [{ item: 'uv', then: { t: 'Bajo la luz ultravioleta aparecen números pintados con tinta invisible: 7 · 1 · 9.', set: ['uv_ok'], note: 'Escultura (luz UV): 7 · 1 · 9.' } }] },
                { id: 'caja', e: '🔐', n: 'Caja fuerte', x: 72, y: 70, look: [['caja:open', 'La caja fuerte está abierta.'], 'Una caja fuerte del guarda con 3 cifras.'],
                    lock: { k: 'digits', len: 3, ans: '719', q: 'Caja fuerte: 3 cifras.', then: { t: 'Dentro está la tarjeta de seguridad del guarda.', give: ['tarjeta'] } } },
                { id: 'puerta', e: '🚪', n: 'Puerta de seguridad', x: 88, y: 36, look: 'La puerta de seguridad tiene un lector de tarjetas.',
                    use: [{ item: 'tarjeta', then: { t: 'Pitido verde. La puerta de seguridad sube. ¡Libre!', win: true } }] },
                { id: 'guarda', e: '💤', n: 'Guarda dormido', x: 66, y: 24, look: 'El guarda duerme profundamente. Murmura en sueños: «la tinta invisible... qué buena idea...».' }
            ],
            items: {
                uv: { e: '🔦', n: 'Linterna UV', d: 'Una linterna de luz ultravioleta. Revela tinta invisible.' },
                tarjeta: { e: '💳', n: 'Tarjeta de seguridad', d: 'La tarjeta del guarda.' }
            },
            hints: [
                { until: 'vitrina:open', t: 'Del más antiguo al más reciente: Amanecer (1500), Río (1700), Tormenta (1850), Eclipse (1920).' },
                { until: 'uv_ok', t: 'Busca tinta invisible con la linterna UV.' },
                { until: 'got:tarjeta', t: 'Los números de la escultura abren la caja fuerte.' },
                { t: 'Usa la tarjeta en la puerta de seguridad.' }
            ]
        },
        // ─────────────────────────────────────────────────── 7
        {
            id: 'd7', name: 'La nave espacial', emoji: '🚀', bg: ['#16163a', '#05051a'],
            intro: 'Un fallo eléctrico ha dejado la nave a oscuras y la cápsula de escape no tiene energía. El oxígeno se acaba.',
            objs: [
                { id: 'ordenador', e: '🖥️', n: 'Ordenador central', x: 18, y: 24, look: [['ordenador:open', 'El ordenador ha expulsado un fusible de repuesto.'], 'El ordenador pide: «Introduce el siguiente número de la secuencia: 1, 1, 2, 3, 5, 8, 13, …».'],
                    lock: { k: 'digits', len: 2, ans: '21', q: 'Siguiente número de la secuencia.', then: { t: 'Correcto. Una ranura expulsa un fusible de repuesto.', give: ['fusible'] } } },
                { id: 'cuadro', e: '🔌', n: 'Cuadro eléctrico', x: 22, y: 66, look: [['energia', 'El cuadro eléctrico funciona. Hay energía.'], 'Al cuadro eléctrico le falta un fusible.'],
                    use: [{ item: 'fusible', consume: true, then: { t: 'Colocas el fusible. ¡Vuelve la energía!', set: ['energia'] } }] },
                { id: 'manual', e: '📙', n: 'Manual de la cápsula', x: 46, y: 22, look: '«Conecta los cuatro cables en orden. El amarillo va justo después del rojo. El azul va el último. El verde no va el primero.»', note: 'Cables: amarillo justo tras rojo; azul el último; verde no el primero.' },
                { id: 'capsula', e: '🛸', n: 'Cápsula de escape', x: 84, y: 54, look: [['energia', 'La cápsula tiene energía: hay que conectar 4 cables de colores.'], 'La cápsula está muerta: no tiene energía.'],
                    lock: { k: 'colors', len: 4, ans: ['rojo', 'amarillo', 'verde', 'azul'], q: 'Conecta los 4 cables en orden.', if: 'energia', then: { t: 'Los motores rugen. La cápsula se desacopla... ¡rumbo a casa!', win: true } } },
                { id: 'astronauta', e: '🧑‍🚀', n: 'Traje espacial', x: 60, y: 66, look: 'Un traje espacial colgado. En el bolsillo: un bolígrafo que escribe boca abajo.' },
                { id: 'ventana', e: '🌍', n: 'Ventana', x: 66, y: 24, look: 'La Tierra se ve azul y lejana. Hay que volver.' }
            ],
            items: { fusible: { e: '🔌', n: 'Fusible', d: 'Un fusible de repuesto.' } },
            hints: [
                { until: 'ordenador:open', t: 'Cada número es la suma de los dos anteriores: 8 + 13.' },
                { until: 'energia', t: 'Pon el fusible en el cuadro eléctrico.' },
                { t: 'Azul al final. Si rojo-amarillo fueran 2.º y 3.º, el verde sería el 1.º (no vale). Así que: rojo, amarillo, verde, azul.' }
            ]
        },
        // ─────────────────────────────────────────────────── 8
        {
            id: 'd8', name: 'La granja misteriosa', emoji: '🐄', bg: ['#3f3218', '#1a140a'],
            intro: 'Has entrado en el granero buscando refugio de la tormenta y el viento ha cerrado la puerta. La granja guarda secretos.',
            objs: [
                { id: 'corral', e: '🐖', n: 'Corral', x: 16, y: 26, look: 'En el corral hay gallinas y cerdos. Cuentas 10 cabezas y 32 patas.', note: 'Corral: 10 cabezas, 32 patas (gallinas y cerdos).' },
                { id: 'espantapajaros', e: '🎃', n: 'Espantapájaros', x: 38, y: 22, look: 'El espantapájaros lleva un cartel: «Mi candado: primero las gallinas, después los cerdos. Las patas no mienten».' },
                { id: 'arcon', e: '🧰', n: 'Arcón', x: 22, y: 66, look: [['arcon:open', 'El arcón está abierto.'], 'Un arcón con candado de 2 cifras.'],
                    lock: { k: 'digits', len: 2, ans: '46', q: 'Candado del arcón: 2 cifras.', then: { t: 'Dentro hay la llave del tractor.', give: ['llave_tractor'] } } },
                { id: 'tractor', e: '🚜', n: 'Tractor', x: 52, y: 64, look: [['movido', 'El tractor ya no tapa la trampilla.'], 'Un tractor viejo aparcado sobre unas tablas sueltas.'],
                    use: [{ item: 'llave_tractor', then: { t: 'Arrancas el tractor y lo mueves. Debajo había una trampilla.', set: ['movido'] } }] },
                { id: 'trampilla', e: '🕳️', n: 'Trampilla', x: 66, y: 80, show: 'movido', look: [['trampilla:open', 'La trampilla está abierta.'], 'La trampilla tiene un cierre de letras con un acertijo: «Cuanto más le quitas, más grande se hace. ¿Qué es?».'],
                    lock: { k: 'word', ans: ['AGUJERO', 'HOYO', 'AGUJERO'], q: 'Cierre de letras: la respuesta del acertijo.', then: { t: 'La trampilla se abre. Dentro está la llave del granero.', give: ['llave'] } } },
                { id: 'puerta', e: '🚪', n: 'Portón', x: 88, y: 40, look: 'El portón del granero, cerrado con llave.',
                    use: [{ item: 'llave', then: { t: 'Abres el portón. La tormenta ha pasado. ¡Libre!', win: true } }] },
                { id: 'vaca', e: '🐄', n: 'Vaca', x: 70, y: 24, look: '«Muuu.» La vaca te mira como si supiera algo, pero no dice nada más.' }
            ],
            items: {
                llave_tractor: { e: '🔑', n: 'Llave del tractor', d: 'Una llave con un llavero de tractor.' },
                llave: { e: '🗝️', n: 'Llave del granero', d: 'Una llave grande.' }
            },
            hints: [
                { until: 'arcon:open', t: 'Si fueran 10 gallinas habría 20 patas; cada cerdo añade 2 más: 12 / 2 = 6 cerdos, 4 gallinas.' },
                { until: 'movido', t: 'Usa la llave del tractor en el tractor.' },
                { until: 'got:llave', t: 'Si le quitas tierra, se hace más grande: un agujero.' },
                { t: 'Usa la llave en el portón.' }
            ]
        },
        // ─────────────────────────────────────────────────── 9
        {
            id: 'd9', name: 'El hotel abandonado', emoji: '🏨', bg: ['#2b2b33', '#111116'],
            intro: 'El Gran Hotel Aurora lleva décadas cerrado. Entraste por curiosidad y la puerta giratoria se ha bloqueado.',
            objs: [
                { id: 'telefono', e: '☎️', n: 'Teléfono antiguo', x: 14, y: 24, look: 'Un teléfono con letras en las teclas: 2 ABC · 3 DEF · 4 GHI · 5 JKL · 6 MNO · 7 PQRS · 8 TUV · 9 WXYZ.', note: 'Teléfono: 2 ABC, 3 DEF, 4 GHI, 5 JKL, 6 MNO, 7 PQRS, 8 TUV, 9 WXYZ.' },
                { id: 'recepcion', e: '🛎️', n: 'Mostrador', x: 34, y: 26, look: 'Sobre el mostrador, una nota del recepcionista: «La caja fuerte se abre con la palabra que se marca así: 5-5-2-8-3».', note: 'Recepción: palabra 5-5-2-8-3.' },
                { id: 'caja', e: '🔐', n: 'Caja fuerte', x: 22, y: 66, look: [['caja:open', 'La caja fuerte está abierta.'], 'Una caja fuerte con teclado de letras (5 letras).'],
                    lock: { k: 'word', ans: 'LLAVE', q: 'Caja fuerte: palabra de 5 letras.', then: { t: 'Dentro hay una tarjeta de la habitación 404.', give: ['tarjeta'] } } },
                { id: 'hab404', e: '🚪', n: 'Habitación 404', x: 52, y: 60, look: [['espejo', 'En el espejo empañado: «SALIDA = AÑO DE INAUGURACIÓN, AL REVÉS».'], 'La puerta de la habitación 404. Tiene lector de tarjetas.'],
                    use: [{ item: 'tarjeta', then: { t: 'Entras en la 404. En el espejo empañado del baño alguien escribió: «SALIDA = AÑO DE INAUGURACIÓN, AL REVÉS».', set: ['espejo'], note: 'Espejo 404: salida = año de inauguración al revés.' } }] },
                { id: 'placa', e: '🏷️', n: 'Placa dorada', x: 62, y: 22, look: '«Gran Hotel Aurora · Inaugurado en 1927».', note: 'Hotel inaugurado en 1927.' },
                { id: 'salida', e: '🚪', n: 'Puerta de servicio', x: 88, y: 50, look: 'La puerta de servicio tiene un teclado de 4 cifras.',
                    lock: { k: 'digits', len: 4, ans: '7291', q: 'Teclado de la salida: 4 cifras.', if: 'espejo', then: { t: 'La puerta de servicio se abre a un callejón. ¡Fuera!', win: true } } },
                { id: 'ascensor', e: '🛗', n: 'Ascensor', x: 80, y: 80, look: 'El ascensor está averiado desde 1984. Un cartel dice «Fuera de servicio».' }
            ],
            items: { tarjeta: { e: '🪪', n: 'Tarjeta 404', d: 'Tarjeta magnética de la habitación 404.' } },
            hints: [
                { until: 'caja:open', t: 'Cada número es una tecla del teléfono: 5 = L, 5 = L, 2 = A, 8 = V, 3 = E.' },
                { until: 'espejo', t: 'Usa la tarjeta en la habitación 404.' },
                { t: 'El hotel se inauguró en 1927. Al revés: 7291.' }
            ]
        },
        // ─────────────────────────────────────────────────── 10
        {
            id: 'd10', name: 'El club de ajedrez', emoji: '♟️', bg: ['#2a2a2a', '#0e0e0e'],
            intro: 'El gran maestro te ha retado: o resuelves sus problemas, o pasarás la noche en el club de ajedrez.',
            objs: [
                { id: 'valores', e: '📋', n: 'Tabla de valores', x: 14, y: 22, look: '«Peón 1 · Caballo 3 · Alfil 3 · Torre 5 · Dama 9.»', note: 'Valores: peón 1, caballo 3, alfil 3, torre 5, dama 9.' },
                { id: 'capturadas', e: '♛', n: 'Piezas capturadas', x: 36, y: 22, look: 'Junto al tablero, las piezas capturadas: una dama, dos torres y un peón.', note: 'Capturadas: dama, 2 torres, peón.' },
                { id: 'cajon', e: '🗄️', n: 'Cajón', x: 22, y: 66, look: [['cajon:open', 'El cajón está abierto.'], 'Un cajón con candado: «El valor total de las piezas capturadas». 2 cifras.'],
                    lock: { k: 'digits', len: 2, ans: '20', q: 'Candado del cajón: 2 cifras.', then: { t: 'Dentro hay un rey blanco de madera.', give: ['rey'] } } },
                { id: 'tablero', e: '♟️', n: 'Tablero', x: 50, y: 60, look: [['problema', 'El problema: «Blancas juegan y dan mate en una. Dama a la casilla correcta». Hay una marca de tiza en h7.'], 'Al tablero le falta el rey blanco.'],
                    use: [{ item: 'rey', consume: true, then: { t: 'Colocas el rey. Se abre un compartimento con una nota: «Blancas juegan y dan mate en una: la dama va a h7».', set: ['problema'], note: 'Mate en una: la dama va a h7.' } }] },
                { id: 'reloj', e: '⏱️', n: 'Reloj de ajedrez', x: 66, y: 22, look: 'El reloj de ajedrez marca 5:00 a 3:00. Al gran maestro le sobra tiempo.' },
                { id: 'puerta', e: '🚪', n: 'Puerta del club', x: 86, y: 50, look: 'La puerta pide una casilla del tablero (letra y número).',
                    lock: { k: 'word', ans: 'H7', q: 'Casilla (letra y número).', if: 'problema', then: { t: '«Jaque mate.» La puerta se abre y el gran maestro aplaude.', win: true } } },
                { id: 'maestro', e: '🧔', n: 'Gran maestro', x: 82, y: 82, look: '«El tablero está incompleto. Sin rey no hay partida.»' }
            ],
            items: { rey: { e: '♔', n: 'Rey blanco', d: 'Un rey blanco de madera.' } },
            hints: [
                { until: 'cajon:open', t: 'Dama 9 + torre 5 + torre 5 + peón 1.' },
                { until: 'problema', t: 'El gran maestro dice que al tablero le falta el rey.' },
                { t: 'La nota del tablero dice la casilla: H7.' }
            ]
        }
    ];
})();
