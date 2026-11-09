/* ============================================================
   NEXUS ARCADE · games/escape/rooms-imposible.js
   Escape Room · 10 salas de nivel IMPOSIBLE.
   Más pasos, deducción, pistas falsas y pocas ayudas.
   ============================================================ */
(function () {
    'use strict';
    const R = (Nexus.games.escapeRooms = Nexus.games.escapeRooms || {});

    R.imposible = [
        // ─────────────────────────────────────────────────── 1
        {
            id: 'i1', name: 'El búnker', emoji: '☢️', bg: ['#26301f', '#0c100a'],
            intro: 'Has despertado en un búnker de la Guerra Fría. Las compuertas se han sellado y el reactor de reserva está apagado.',
            objs: [
                { id: 'pizarra', e: '🧮', n: 'Pizarra', x: 14, y: 22, look: 'En la pizarra: «UNO = 3 · DOS = 3 · TRES = 4 · CUATRO = 6 · CINCO = 5 · DIECISÉIS = ?».', note: 'Pizarra: UNO 3, DOS 3, TRES 4, CUATRO 6, CINCO 5, DIECISÉIS ¿?' },
                { id: 'taquilla', e: '🗃️', n: 'Taquilla', x: 14, y: 66, look: [['taquilla:open', 'La taquilla está abierta.'], 'Una taquilla oxidada con candado de 1 cifra.'],
                    lock: { k: 'digits', len: 1, ans: '9', q: 'Candado de la taquilla: 1 cifra.', then: { t: 'Dentro hay un disquete con la etiqueta «REACTOR».', give: ['disquete'] } } },
                { id: 'ordenador', e: '🖥️', n: 'Terminal', x: 36, y: 56, look: [['binario', 'La pantalla muestra: 01000001 · 01001100 · 01000110 · 01000001'], 'Una terminal verde que parpadea: «INSERTE DISCO».'],
                    use: [{ item: 'disquete', then: { t: 'La terminal lee el disquete: «CLAVE DEL REACTOR: 01000001 · 01001100 · 01000110 · 01000001».', set: ['binario'], note: 'Terminal: 01000001 · 01001100 · 01000110 · 01000001' } }] },
                { id: 'poster', e: '📃', n: 'Cartel técnico', x: 38, y: 20, look: '«Código ASCII: A = 65, B = 66, C = 67… (cada letra suma uno). Los bytes están en binario: 128 64 32 16 8 4 2 1.»' },
                { id: 'reactor', e: '⚛️', n: 'Reactor de reserva', x: 62, y: 60, look: [['reactor:open', 'El reactor zumba. Se han encendido las luces del pasillo.'], 'El reactor pide una clave de 4 letras.'],
                    lock: { k: 'word', ans: 'ALFA', q: 'Clave del reactor: 4 letras.', if: 'binario', then: { t: 'El reactor arranca. Las luces del pasillo de minas se encienden.', set: ['luz'] } } },
                { id: 'diario', e: '📓', n: 'Diario del sargento', x: 62, y: 20, show: 'luz', look: '«Escribí la ruta del pasillo volviendo desde la salida hasta aquí: ↓ ← ↓ ↓ →. Ojo: para ir hacia la salida, todo va al revés.»', note: 'Diario: ruta escrita desde la salida: ↓ ← ↓ ↓ →.' },
                { id: 'pasillo', e: '💣', n: 'Pasillo de minas', x: 84, y: 66, show: 'luz', look: [['pasillo:open', 'Cruzaste el pasillo. Al fondo había una llave.'], 'Un pasillo lleno de minas. Una placa de presión pide los 5 pasos seguros.'],
                    lock: { k: 'dirs', len: 5, ans: ['L', 'U', 'U', 'R', 'U'], q: 'Pasos seguros: 5 direcciones.', wrong: '¡Clic! Por suerte era una mina de prácticas. Vuelve a empezar.', then: { t: 'Cruzas el pasillo sin pisar ninguna mina. Al otro lado hay una llave de seguridad.', give: ['llave'] } } },
                { id: 'compuerta', e: '🚪', n: 'Compuerta', x: 88, y: 24, look: 'La compuerta principal, sellada. Tiene una cerradura de seguridad.',
                    use: [{ item: 'llave', then: { t: 'La compuerta se abre con un siseo. Aire fresco. ¡Has salido del búnker!', win: true } }] }
            ],
            items: {
                disquete: { e: '💾', n: 'Disquete', d: 'Un disquete con la etiqueta «REACTOR».' },
                llave: { e: '🗝️', n: 'Llave de seguridad', d: 'La llave de la compuerta principal.' }
            },
            hints: [
                { until: 'taquilla:open', t: 'El número es la cantidad de letras de la palabra.' },
                { until: 'binario', t: 'Mete el disquete en la terminal.' },
                { until: 'reactor:open', t: '01000001 = 64 + 1 = 65 = A. Haz lo mismo con los otros tres bytes.' },
                { until: 'got:llave', t: 'Invierte el orden de la ruta y cambia cada flecha por la contraria.' },
                { t: 'Usa la llave en la compuerta.' }
            ]
        },
        // ─────────────────────────────────────────────────── 2
        {
            id: 'i2', name: 'La abadía del códice', emoji: '📜', bg: ['#33291f', '#110d08'],
            intro: 'El abad te ha encerrado en el scriptorium: solo saldrá quien demuestre ser digno del códice prohibido.',
            objs: [
                { id: 'vitral', e: '⛪', n: 'Vitral del abad', x: 14, y: 22, look: 'Bajo el vitral, el abad dejó escrito: «El desplazamiento es el número de apóstoles menos el de evangelistas».', note: 'Desplazamiento = apóstoles − evangelistas.' },
                { id: 'pergamino', e: '📜', n: 'Pergamino', x: 36, y: 22, look: 'Un pergamino con una sola palabra cifrada: «KTIDM». Al margen: «alfabeto latino, sin Ñ; cada letra avanzó».', note: 'Pergamino: KTIDM (alfabeto sin Ñ, cada letra avanzó).' },
                { id: 'cofre', e: '🧰', n: 'Cofre', x: 18, y: 66, look: [['cofre:open', 'El cofre está abierto.'], 'Un cofre con cerradura de 5 letras.'],
                    lock: { k: 'word', ans: 'CLAVE', q: 'Cerradura del cofre: 5 letras.', then: { t: 'Dentro hay un anillo con el grabado «In vino veritas».', give: ['anillo'] } } },
                { id: 'barril', e: '🛢️', n: 'Barril de vino', x: 40, y: 66, look: [['barril_ok', 'En el fondo del barril vacío se lee: XLII.'], 'Un barril lleno de vino. La espita tiene una ranura con forma de anillo.'],
                    use: [{ item: 'anillo', then: { t: 'Giras el anillo en la espita. El vino se vacía y en el fondo del barril ves grabado: XLII.', set: ['barril_ok'], note: 'Fondo del barril: XLII.' } }] },
                { id: 'campana', e: '🔔', n: 'Campana', x: 60, y: 22, look: 'En el borde de la campana hay una inscripción: MCC.', note: 'Campana: MCC.' },
                { id: 'vela', e: '🕯️', n: 'Candelabro', x: 60, y: 66, look: [['got:vela', 'Ya cogiste una vela.'], 'Un candelabro con una vela encendida.'], take: { item: 'vela', gone: false } },
                { id: 'cripta', e: '⚱️', n: 'Hueco de la cripta', x: 78, y: 78, look: [['lapida', 'La lápida de la cripta dice: DCLX.'], 'Unas escaleras bajan a una cripta totalmente oscura.'],
                    use: [{ item: 'vela', then: { t: 'Con la vela bajas a la cripta. En una lápida lees: DCLX.', set: ['lapida'], note: 'Lápida: DCLX.' } }] },
                { id: 'puerta', e: '🚪', n: 'Puerta del scriptorium', x: 88, y: 36, look: 'La cerradura tiene 4 ruedas: «La suma de los tres números romanos de esta abadía».',
                    lock: { k: 'digits', len: 4, ans: '1902', q: 'Ruedas de la puerta: 4 cifras.', wrong: 'Las ruedas vuelven a cero. El abad tose detrás de la puerta.', then: { t: 'La puerta se abre. El abad inclina la cabeza: «Eres digno».', win: true } } },
                { id: 'libros', e: '📚', n: 'Estantería', x: 84, y: 60, look: 'Génesis, Éxodo, Levítico, Números... Los libros no ocultan nada (o eso parece).' }
            ],
            items: {
                anillo: { e: '💍', n: 'Anillo', d: 'Un anillo con el grabado «In vino veritas» (en el vino está la verdad).' },
                vela: { e: '🕯️', n: 'Vela', d: 'Una vela encendida.' }
            },
            hints: [
                { until: 'cofre:open', t: '12 apóstoles − 4 evangelistas = 8. Retrocede cada letra 8 posiciones.' },
                { until: 'barril_ok', t: '«In vino veritas»: el anillo sirve en el barril.' },
                { until: 'lapida', t: 'Hay una cripta a oscuras. Coge la vela.' },
                { t: 'XLII = 42, MCC = 1200, DCLX = 660. Súmalos.' }
            ]
        },
        // ─────────────────────────────────────────────────── 3
        {
            id: 'i3', name: 'La isla del náufrago', emoji: '🏝️', bg: ['#0e4d5c', '#04222a'],
            intro: 'Has naufragado en una isla diminuta. Un barco pasa cerca, pero solo responde a señales en código.',
            objs: [
                { id: 'botella', e: '🍾', n: 'Botella', x: 12, y: 74, look: [['got:mensaje', 'La botella está vacía.'], 'Una botella con un mensaje dentro.'], take: { item: 'mensaje', t: 'Sacas el papel de la botella.' } },
                { id: 'palmera', e: '🌴', n: 'Palmera', x: 18, y: 32, look: [['got:palo', 'Una palmera sin ramas bajas.'], 'Una palmera con un palo largo y recto caído junto al tronco.'], take: { item: 'palo', t: 'Coges el palo.' } },
                { id: 'playa', e: '🐚', n: 'Orilla', x: 36, y: 76, look: [['got:concha', 'Solo quedan conchas pequeñas.'], 'Hay conchas de todos los tamaños. Una es enorme y plana.'], take: { item: 'concha', t: 'Coges la concha grande.' } },
                { id: 'arena', e: '⛱️', n: 'Arena con una X', x: 52, y: 56, look: [['excavado', 'Un hoyo con un cofre dentro.'], 'Alguien dibujó una gran X en la arena.'],
                    use: [{ item: 'pala', then: { t: 'Cavas en la X y aparece un cofre enterrado.', set: ['excavado'] } }] },
                { id: 'cofre', e: '🧰', n: 'Cofre enterrado', x: 52, y: 80, show: 'excavado', look: [['cofre:open', 'El cofre está abierto.'], 'En la tapa: «⚓ = 2 · ⚓ + 🐚 = 9 · 🐚 − 🐟 = 3». Y abajo, la combinación: ⚓ 🐚 🐟 🐚.'],
                    lock: { k: 'digits', len: 4, ans: '2747', q: 'Candado del cofre: 4 cifras.', then: { t: 'Dentro hay un catalejo y un pedernal.', give: ['catalejo', 'pedernal'] } } },
                { id: 'acantilado', e: '🪨', n: 'Acantilado', x: 72, y: 28, look: [['barco', 'El barco muestra cuatro banderas: rojo, blanco, azul y amarillo.'], 'Desde el acantilado se ve un barco a lo lejos, demasiado pequeño para distinguir nada.'],
                    use: [{ item: 'catalejo', then: { t: 'Con el catalejo ves cuatro banderas en el mástil, de arriba abajo: rojo, blanco, azul y amarillo.', set: ['barco'], note: 'Banderas del barco (de arriba abajo): rojo, blanco, azul, amarillo.' } }] },
                { id: 'hoguera', e: '🪵', n: 'Hoguera', x: 86, y: 62, look: [['fuego', 'La hoguera arde. Con su luz puedes mostrar telas de colores.'], 'Un montón de leña preparado para una hoguera.'],
                    use: [{ item: 'pedernal', then: { t: 'Con el pedernal prendes la hoguera.', set: ['fuego'] } }] },
                { id: 'telas', e: '🏳️', n: 'Telas de colores', x: 88, y: 30, look: 'Telas de colores para hacer señales al barco.',
                    lock: { k: 'colors', len: 4, ans: ['amarillo', 'azul', 'blanco', 'rojo'], q: 'Muestra 4 telas en orden.', if: ['fuego', 'barco'], wrong: 'El barco no responde. Esa señal no es la correcta.', then: { t: 'El barco responde con su bocina y pone rumbo a la isla. ¡Te rescatan!', win: true } } }
            ],
            items: {
                mensaje: { e: '📃', n: 'Mensaje de la botella', d: '«Si un barco te habla con banderas, contéstale con las mismas, pero en orden inverso. Haz fuego para que te vea.»', note: 'Mensaje: contesta con las mismas banderas en orden inverso; haz fuego.' },
                palo: { e: '🪵', n: 'Palo', d: 'Un palo largo y recto.', combine: { with: 'concha', give: 'pala', t: 'Atas la concha al palo: ¡una pala improvisada!' } },
                concha: { e: '🐚', n: 'Concha grande', d: 'Una concha enorme y plana.' },
                pala: { e: '🪏', n: 'Pala improvisada', d: 'Un palo con una concha atada. Sirve para cavar.' },
                catalejo: { e: '🔭', n: 'Catalejo', d: 'Un catalejo.' },
                pedernal: { e: '🪨', n: 'Pedernal', d: 'Una piedra que hace chispas.' }
            },
            hints: [
                { until: 'excavado', t: 'Con un palo y una concha podrías fabricar algo para cavar. Prueba en la X.' },
                { until: 'cofre:open', t: '⚓ = 2, así que 🐚 = 7 y 🐟 = 4.' },
                { until: 'barco', t: 'Mira el barco desde el acantilado con el catalejo.' },
                { t: 'Haz fuego con el pedernal y contesta con las banderas al revés: amarillo, azul, blanco, rojo.' }
            ]
        },
        // ─────────────────────────────────────────────────── 4
        {
            id: 'i4', name: 'La casa de los espejos', emoji: '🪞', bg: ['#2c2f40', '#0f1018'],
            intro: 'En la feria entraste en la casa de los espejos y ya no encuentras la salida. Nada es lo que parece.',
            objs: [
                { id: 'espejo', e: '🪞', n: 'Espejo grande', x: 14, y: 30, look: 'En el espejo grande se refleja una palabra escrita en la pared que tienes a tu espalda: {{espejo:REFLEJO}}', note: 'Espejo grande: la pared refleja una palabra.' },
                { id: 'baul', e: '🧳', n: 'Baúl', x: 16, y: 72, look: [['baul:open', 'El baúl está abierto.'], 'Un baúl con cerradura de letras. Una etiqueta: «Lo que ves en el espejo grande».'],
                    lock: { k: 'word', ans: 'REFLEJO', q: 'Cerradura de letras del baúl.', then: { t: 'Dentro hay una nota: «El reloj del pasillo solo se puede ver en el espejo».', note: 'El reloj del pasillo solo se ve reflejado.', set: ['pista_reloj'] } } },
                { id: 'reloj', e: '🕰️', n: 'Reflejo del reloj', x: 40, y: 22, look: 'En un espejo ves reflejado el reloj del pasillo. En el reflejo marca las 2:50.', note: 'Reflejo del reloj: 2:50.' },
                { id: 'comoda', e: '🗄️', n: 'Cómoda', x: 40, y: 66, look: [['comoda:open', 'La cómoda está abierta.'], 'Una cómoda con candado de 3 cifras: «La hora real del reloj del pasillo».'],
                    lock: { k: 'digits', len: 3, ans: '910', q: 'Candado de la cómoda: 3 cifras.', if: 'pista_reloj', then: { t: 'Dentro hay un martillo de goma.', give: ['martillo'] } } },
                { id: 'grieta', e: '🧊', n: 'Espejo agrietado', x: 64, y: 30, look: [['roto', 'Detrás del espejo roto apareció una puerta oculta.'], 'Un espejo agrietado. Al golpearlo con los nudillos suena hueco.'],
                    use: [{ item: 'martillo', then: { t: 'Golpeas el espejo: se rompe y detrás aparece una puerta oculta.', set: ['roto'] } }] },
                { id: 'puerta', e: '🚪', n: 'Puerta oculta', x: 86, y: 52, show: 'roto', look: 'Una puerta con un acertijo: «Si me nombras, desaparezco. ¿Qué soy?».',
                    lock: { k: 'word', ans: 'SILENCIO', q: 'Respuesta del acertijo.', wrong: 'Tu voz rebota en todos los espejos. No es eso.', then: { t: 'La puerta se abre sin hacer ruido. ¡Fuera de la casa de los espejos!', win: true } } },
                { id: 'payaso', e: '🤡', n: 'Payaso de cartón', x: 64, y: 74, look: 'Un payaso de cartón con un cartel: «LA SALIDA ESTÁ A LA IZQUIERDA». A la izquierda solo hay espejos.' }
            ],
            items: { martillo: { e: '🔨', n: 'Martillo de goma', d: 'Un martillo de goma, suficiente para romper un espejo viejo.' } },
            hints: [
                { until: 'baul:open', t: 'La palabra del espejo está al revés: léela como si la vieras de frente.' },
                { until: 'comoda:open', t: 'Un reloj reflejado marca la hora simétrica: la hora real es 12:00 − 2:50.' },
                { until: 'roto', t: 'El espejo agrietado suena hueco. Usa el martillo.' },
                { t: 'Si dices su nombre, lo rompes: el SILENCIO.' }
            ]
        },
        // ─────────────────────────────────────────────────── 5
        {
            id: 'i5', name: 'Asesinato en el expreso', emoji: '🚃', bg: ['#3d1f1f', '#150909'],
            intro: 'Hay un crimen en el expreso nocturno y el revisor ha cerrado el vagón. Nadie saldrá hasta que se acuse al culpable.',
            objs: [
                { id: 'horario', e: '🕗', n: 'Horario', x: 14, y: 22, look: 'Horario del expreso: Madrid 08:15 · Zaragoza 10:40 · Barcelona 13:05.', note: 'Horario: Madrid 08:15, Zaragoza 10:40, Barcelona 13:05.' },
                { id: 'maleta', e: '💼', n: 'Maletín', x: 16, y: 66, look: [['maleta:open', 'El maletín está abierto.'], 'Un maletín con candado de 3 cifras y una etiqueta: «Duración total del viaje, en minutos».'],
                    lock: { k: 'digits', len: 3, ans: '290', q: 'Candado del maletín: 3 cifras.', then: { t: 'Dentro está la lista de pasajeros con anotaciones del revisor.', give: ['lista'] } } },
                { id: 'billetes', e: '🎟️', n: 'Caja de billetes', x: 40, y: 64, look: [['billetes:open', 'La caja de billetes está abierta.'], 'La caja del revisor: «Compartimento de la condesa y, a continuación, el del doctor». 2 cifras.'],
                    lock: { k: 'digits', len: 2, ans: '31', q: 'Caja de billetes: 2 cifras.', if: 'got:lista', then: { t: 'Dentro está la llave de los compartimentos.', give: ['llave'] } } },
                { id: 'comp2', e: '🚪', n: 'Compartimento 2', x: 60, y: 30, look: [['vaho', 'En la ventana empañada del compartimento 2: L E N O R O C.'], 'El compartimento 2 está cerrado con llave.'],
                    use: [{ item: 'llave', then: { t: 'Abres el compartimento 2. En el vaho de la ventana alguien escribió unas letras desordenadas: L E N O R O C.', set: ['vaho'], note: 'Vaho del compartimento 2: L E N O R O C.' } }] },
                { id: 'cadaver', e: '🕯️', n: 'Escena del crimen', x: 40, y: 22, look: 'La víctima sostiene un reloj parado a las 11:00. Hay olor a pipa... pero todos los pasajeros fuman.' },
                { id: 'freno', e: '🛑', n: 'Timbre del revisor', x: 86, y: 50, look: 'Para acusar al culpable, escribe su cargo o título.',
                    lock: { k: 'word', ans: 'CORONEL', q: '¿Quién es el culpable?', if: 'vaho', wrong: '«¡Una acusación falsa!», protesta alguien. Vuelve a pensarlo.', then: { t: 'El coronel confiesa. El revisor abre las puertas del vagón.', win: true } } },
                { id: 'pipa', e: '🧑‍🦳', n: 'Pasajeros', x: 80, y: 80, look: 'La condesa, el coronel, el doctor y la actriz te miran en silencio.' }
            ],
            items: {
                lista: { e: '📋', n: 'Lista de pasajeros', d: 'Compartimentos 1 a 4, uno por pasajero. «La condesa no va ni en el 1 ni en el 4. El coronel va justo en el siguiente al del doctor. La actriz va en el 4.» Y una línea: «El culpable viaja en el compartimento 2».', note: 'Lista: condesa ni 1 ni 4; coronel justo después del doctor; actriz en el 4; culpable en el 2.' },
                llave: { e: '🗝️', n: 'Llave de compartimentos', d: 'Abre los compartimentos del vagón.' }
            },
            hints: [
                { until: 'maleta:open', t: 'De 08:15 a 13:05 hay 4 horas y 50 minutos.' },
                { until: 'billetes:open', t: 'Actriz en el 4. Si doctor y coronel fueran el 2 y el 3, la condesa iría en el 1 (prohibido). Así que doctor 1, coronel 2, condesa 3.' },
                { until: 'vaho', t: 'Usa la llave en el compartimento 2.' },
                { t: 'Ordena las letras: es quien viaja en el 2.' }
            ]
        },
        // ─────────────────────────────────────────────────── 6
        {
            id: 'i6', name: 'El laberinto del Minotauro', emoji: '🐂', bg: ['#3b2a1a', '#140d07'],
            intro: 'Estás en Creta, a la entrada del laberinto. La única salida está en el centro, bajo el Minotauro dormido.',
            objs: [
                { id: 'estatua', e: '🗿', n: 'Estatua de Dédalo', x: 14, y: 30, look: [['estatua:open', 'La estatua dejó caer un ovillo de hilo.'], 'La estatua del arquitecto del laberinto pregunta: «¿Qué ser anda a cuatro patas por la mañana, a dos al mediodía y a tres por la noche?».'],
                    lock: { k: 'word', ans: ['HOMBRE', 'HUMANO', 'SERHUMANO', 'PERSONA'], q: 'Respuesta al acertijo.', then: { t: 'La estatua abre la mano y te entrega un ovillo con nudos de colores.', give: ['ovillo'] } } },
                { id: 'tablilla', e: '🪨', n: 'Tablilla de Ariadna', x: 38, y: 22, look: '«Nudo rojo: izquierda. Nudo azul: derecha. Nudo verde: adelante (↑). Nudo negro: atrás (↓).»', note: 'Nudos: rojo ←, azul →, verde ↑, negro ↓.' },
                { id: 'laberinto', e: '🌀', n: 'Entrada del laberinto', x: 50, y: 62, look: [['laberinto:open', 'Ya conoces el camino al centro.'], 'Pasillos y más pasillos. Sin una guía, te perderías para siempre (7 giros).'],
                    lock: { k: 'dirs', len: 7, ans: ['L', 'U', 'U', 'R', 'D', 'R', 'U'], q: 'Recorre el laberinto: 7 movimientos.', if: 'got:ovillo', wrong: 'Vuelves a la entrada después de un callejón sin salida.', then: { t: 'Siguiendo el hilo llegas al centro. El Minotauro ronca sobre una trampilla.', set: ['centro'] } } },
                { id: 'mural', e: '🏛️', n: 'Mural', x: 64, y: 22, look: 'Un mural cuenta que cada año Atenas enviaba siete jóvenes y siete doncellas como tributo al Minotauro.', note: 'Tributo: 7 jóvenes y 7 doncellas.' },
                { id: 'minotauro', e: '🐂', n: 'Minotauro', x: 84, y: 60, show: 'centro', look: 'Duerme sobre una trampilla con un candado: «El número de tributos que Atenas enviaba cada año».',
                    lock: { k: 'digits', len: 2, ans: '14', q: 'Candado de la trampilla: 2 cifras.', wrong: 'El Minotauro resopla en sueños. Cuidado...', then: { t: 'La trampilla se abre sin despertar a la bestia. ¡Escapas por el túnel!', win: true } } },
                { id: 'espada', e: '🗡️', n: 'Espada de Teseo', x: 84, y: 24, look: 'Una espada clavada en la roca. No sale, y pelear con el Minotauro no parece buena idea.' }
            ],
            items: { ovillo: { e: '🧶', n: 'Ovillo de Ariadna', d: 'Un hilo con nudos en este orden: rojo, verde, verde, azul, negro, azul, verde.', note: 'Ovillo: rojo, verde, verde, azul, negro, azul, verde.' } },
            hints: [
                { until: 'estatua:open', t: 'Es el famoso acertijo de la Esfinge: bebé, adulto y anciano con bastón.' },
                { until: 'centro', t: 'Traduce los nudos del ovillo con la tablilla: ← ↑ ↑ → ↓ → ↑.' },
                { t: '7 jóvenes + 7 doncellas.' }
            ]
        },
        // ─────────────────────────────────────────────────── 7
        {
            id: 'i7', name: 'El sótano del alquimista', emoji: '⚗️', bg: ['#22311f', '#0b1209'],
            intro: 'El alquimista buscaba la piedra filosofal y desapareció. Su sótano se cierra solo al anochecer.',
            objs: [
                { id: 'balanza', e: '⚖️', n: 'Balanza', x: 14, y: 22, look: 'Junto a la balanza: «Tengo 9 monedas iguales salvo una, que pesa más. ¿Cuántas pesadas necesito como mínimo para encontrarla con seguridad?».', note: 'Balanza: 9 monedas, una más pesada. ¿Pesadas mínimas?' },
                { id: 'armario', e: '🗄️', n: 'Armario', x: 14, y: 66, look: [['armario:open', 'El armario está abierto.'], 'Un armario con candado de 1 cifra: «la respuesta de la balanza».'],
                    lock: { k: 'digits', len: 1, ans: '2', q: 'Candado del armario: 1 cifra.', wrong: 'No. Piensa en dividir las monedas en grupos.', then: { t: 'Dentro hay una llave de bronce.', give: ['bronce'] } } },
                { id: 'cofre', e: '🧰', n: 'Cofre', x: 36, y: 66, look: [['got:grimorio', 'El cofre está vacío.'], 'Un cofre con cerradura de bronce.'],
                    use: [{ item: 'bronce', consume: true, then: { t: 'El cofre se abre. Dentro está el grimorio del alquimista.', give: ['grimorio'] } }] },
                { id: 'tabla', e: '🧪', n: 'Tabla de metales', x: 40, y: 22, look: 'Metales y planetas: Sol = oro (Au, 79) · Luna = plata (Ag, 47) · Marte = hierro (Fe, 26) · Venus = cobre (Cu, 29) · Saturno = plomo (Pb, 82).', note: 'Sol=oro 79, Luna=plata 47, Marte=hierro 26, Venus=cobre 29, Saturno=plomo 82.' },
                { id: 'atanor', e: '🔐', n: 'Atanor', x: 60, y: 62, look: [['atanor:open', 'El horno del alquimista está abierto.'], 'El atanor (horno alquímico) tiene un candado de 4 cifras.'],
                    lock: { k: 'digits', len: 4, ans: '2679', q: 'Candado del atanor: 4 cifras.', if: 'got:grimorio', then: { t: 'Dentro del horno brilla la piedra filosofal.', give: ['piedra'] } } },
                { id: 'frascos', e: '🧴', n: 'Frascos', x: 64, y: 22, look: 'Frascos de colores con símbolos: Saturno gris, Marte rojo, Sol amarillo, Luna blanco, Venus verde.', note: 'Frascos: Saturno gris, Marte rojo, Sol amarillo, Luna blanco, Venus verde.' },
                { id: 'caldero', e: '🫕', n: 'Caldero', x: 86, y: 54, look: 'Un caldero burbujeante. Hay que verter tres frascos en orden.',
                    lock: { k: 'colors', len: 3, ans: ['blanco', 'rojo', 'amarillo'], q: 'Vierte 3 frascos en orden.', if: 'got:piedra', wrong: 'La mezcla humea y se vuelve a vaciar. Orden incorrecto.', then: { t: 'Echas la piedra al caldero: un destello dorado abre la puerta del sótano. ¡Lo lograste!', win: true } } }
            ],
            items: {
                bronce: { e: '🔑', n: 'Llave de bronce', d: 'Una llave de bronce con forma de serpiente.' },
                grimorio: { e: '📕', n: 'Grimorio', d: '«El horno se abre con los números de Marte y del Sol. La gran obra: Luna, Marte y Sol, por este orden.»', note: 'Grimorio: horno = Marte + Sol; obra = Luna, Marte, Sol.' },
                piedra: { e: '💎', n: 'Piedra filosofal', d: 'Una piedra roja que brilla con luz propia.' }
            },
            hints: [
                { until: 'armario:open', t: 'Haz tres grupos de 3: una pesada te dice qué grupo pesa más, y otra qué moneda.' },
                { until: 'got:grimorio', t: 'La llave de bronce abre el cofre.' },
                { until: 'atanor:open', t: 'Marte = hierro = 26; Sol = oro = 79.' },
                { t: 'Luna = blanco, Marte = rojo, Sol = amarillo.' }
            ]
        },
        // ─────────────────────────────────────────────────── 8
        {
            id: 'i8', name: 'La cámara del banco', emoji: '🏦', bg: ['#1f2a33', '#0a0f13'],
            intro: 'Eres auditora en un banco suizo y te has quedado atrapada en la planta de la cámara acorazada. La salida está tras ella.',
            objs: [
                { id: 'ordenador', e: '💻', n: 'Ordenador', x: 14, y: 24, look: [['ordenador:open', 'El ordenador imprimió una tarjeta de acceso.'], 'El ordenador pide: «Siguiente número: 2, 3, 5, 9, 17, …».'],
                    lock: { k: 'digits', len: 2, ans: '33', q: 'Siguiente número de la serie.', wrong: 'ERROR. Observa cómo pasas de un número al siguiente.', then: { t: 'La impresora escupe una tarjeta de acceso.', give: ['tarjeta'] } } },
                { id: 'posit', e: '🟨', n: 'Pósit', x: 36, y: 22, look: 'Pistas del código de la caja (3 cifras): «682: una cifra correcta y bien colocada. 614: una correcta pero mal colocada. 206: dos correctas pero mal colocadas. 738: nada correcto. 780: una correcta pero mal colocada».', note: 'Caja (3 cifras): 682 ✓1 bien · 614 ✓1 mal · 206 ✓2 mal · 738 ✗ · 780 ✓1 mal.' },
                { id: 'caja', e: '🔐', n: 'Caja de seguridad', x: 22, y: 66, look: [['caja:open', 'La caja de seguridad está abierta.'], 'Una caja de seguridad de 3 cifras.'],
                    lock: { k: 'digits', len: 3, ans: '042', q: 'Caja de seguridad: 3 cifras.', wrong: 'Incorrecto. Empieza por lo que sabes seguro: 738.', then: { t: 'Dentro está el plano de los láseres.', give: ['plano'] } } },
                { id: 'laseres', e: '🔴', n: 'Pasillo de láseres', x: 54, y: 60, look: [['laseres:open', 'Has cruzado el pasillo de láseres.'], 'Un pasillo de 4 × 4 baldosas cruzado por láseres. Entras por la esquina de abajo a la izquierda (A1) y debes llegar a la de arriba a la derecha (D4).'],
                    lock: { k: 'dirs', len: 6, ans: ['U', 'R', 'U', 'U', 'R', 'R'], q: 'Cruza el pasillo: 6 pasos.', if: 'got:plano', wrong: '¡Alarma! Tocaste un láser. Vuelves al principio.', then: { t: 'Cruzas sin tocar ningún láser.', set: ['cruzado'] } } },
                { id: 'camara', e: '🏦', n: 'Cámara acorazada', x: 86, y: 46, look: 'La cámara acorazada (y la salida de emergencia de su interior) tiene un lector de tarjetas.',
                    use: [{ item: 'tarjeta', if: 'cruzado', no: 'Está al otro lado del pasillo de láseres. Primero tienes que cruzarlo.', then: { t: 'Lector en verde. La cámara se abre y sales por la escalera de emergencia.', win: true } }] },
                { id: 'cuadro', e: '🖼️', n: 'Cuadro del fundador', x: 70, y: 20, look: 'El fundador del banco, muy serio. Detrás no hay nada (ya lo comprobaste).' }
            ],
            items: {
                tarjeta: { e: '💳', n: 'Tarjeta de acceso', d: 'Abre la cámara acorazada.' },
                plano: { e: '🗺️', n: 'Plano de láseres', d: 'Cuadrícula de 4 × 4 (columnas A–D, filas 1–4; la fila 1 es la de abajo). X = láser. Solo puedes moverte ↑ ↓ ← →.',
                    pre: '4 │ ·  ·  ·  S\n3 │ X  ·  X  X\n2 │ ·  ·  X  X\n1 │ E  X  ·  ·\n    A  B  C  D', note: 'Plano de láseres: entrada A1, salida D4.' }
            },
            hints: [
                { until: 'ordenador:open', t: 'Cada número es el doble del anterior menos uno.' },
                { until: 'caja:open', t: '738 descarta 7, 3 y 8. Con 682 y 206, el 2 y el 6 aparecen... el código es 0-4-2.' },
                { until: 'cruzado', t: 'Desde A1: sube a A2, derecha a B2 y sigue subiendo por la columna B.' },
                { t: 'Usa la tarjeta en la cámara acorazada.' }
            ]
        },
        // ─────────────────────────────────────────────────── 9
        {
            id: 'i9', name: 'El templo maya', emoji: '🗿', bg: ['#1f3b26', '#0a170e'],
            intro: 'La selva se ha tragado la entrada del templo. Para salir tendrás que hablar el idioma de los antiguos mayas.',
            objs: [
                { id: 'mural', e: '🧱', n: 'Mural de números', x: 14, y: 22, look: 'Así contaban los mayas: un punto ● vale 1, una barra ▬ vale 5 y una concha 🐚 vale 0.', note: 'Números mayas: ● = 1, ▬ = 5, 🐚 = 0.' },
                { id: 'estela', e: '🪨', n: 'Estela', x: 18, y: 66, look: [['estela:open', 'La estela se ha girado.'], 'Una estela con tres glifos: [▬ ●●] · [●●●●] · [▬▬ ●]. Debajo, unas ruedas: 4 cifras.'],
                    lock: { k: 'digits', len: 4, ans: '7411', q: 'Ruedas de la estela: 4 cifras.', then: { t: 'La estela gira y deja caer una pieza de jade.', give: ['jade'] } } },
                { id: 'altar', e: '🛐', n: 'Altar', x: 42, y: 64, look: [['ofrenda', 'El jade está en el altar. Los braseros esperan su ofrenda.'], 'Un altar con un hueco verde.'],
                    use: [{ item: 'jade', consume: true, then: { t: 'Colocas el jade. Los cuatro braseros de las esquinas se iluminan débilmente.', set: ['ofrenda'] } }] },
                { id: 'rumbos', e: '🧭', n: 'Relieve de los rumbos', x: 40, y: 22, look: 'Cada punto cardinal tiene su color: norte blanco, este rojo, sur amarillo y oeste negro. «La ofrenda empieza por donde sale el sol y gira como el sol en el cielo, siempre hacia la derecha.»', note: 'Rumbos: N blanco, E rojo, S amarillo, O negro. Empieza donde sale el sol y gira a la derecha (como las agujas del reloj).' },
                { id: 'braseros', e: '🔥', n: 'Braseros', x: 64, y: 62, look: [['braseros:open', 'Los braseros arden con fuerza. Una máscara ha caído del techo.'], 'Cuatro braseros, uno por cada color.'],
                    lock: { k: 'colors', len: 4, ans: ['rojo', 'amarillo', 'negro', 'blanco'], q: 'Enciende los 4 braseros en orden.', if: 'ofrenda', wrong: 'Los braseros se apagan. Empieza otra vez.', then: { t: 'Los braseros arden. Del techo cae una máscara de jade.', give: ['mascara'] } } },
                { id: 'relieve', e: '🐍', n: 'Relieve de la serpiente', x: 66, y: 22, look: 'Una serpiente emplumada: Kukulkán para los mayas, Quetzalcóatl para los aztecas.', note: 'Serpiente emplumada: Kukulkán (maya) / Quetzalcóatl (azteca).' },
                { id: 'puerta', e: '🚪', n: 'Puerta del templo', x: 88, y: 44, look: 'Una puerta de piedra: «Solo quien lleve la máscara y diga el nombre maya del dios serpiente saldrá a la luz».',
                    lock: { k: 'word', ans: ['KUKULKAN', 'KUKULCAN'], q: 'Nombre maya del dios serpiente.', if: 'got:mascara', wrong: 'La piedra no se mueve. Quizá ese nombre es de otro pueblo.', then: { t: 'La puerta se desliza. La luz de la selva te ciega. ¡Libre!', win: true } } }
            ],
            items: {
                jade: { e: '🟢', n: 'Pieza de jade', d: 'Un disco de jade tallado.' },
                mascara: { e: '🎭', n: 'Máscara de jade', d: 'Una máscara funeraria de jade.' }
            },
            hints: [
                { until: 'estela:open', t: '▬●● = 7, ●●●● = 4, ▬▬● = 11.' },
                { until: 'ofrenda', t: 'El jade va en el altar.' },
                { until: 'braseros:open', t: 'El sol sale por el este (rojo) y gira hacia el sur (amarillo), oeste (negro) y norte (blanco).' },
                { t: 'El nombre maya es Kukulkán.' }
            ]
        },
        // ─────────────────────────────────────────────────── 10
        {
            id: 'i10', name: 'La última sala', emoji: '🧠', bg: ['#2b1f3d', '#0e0916'],
            intro: 'Has llegado a la sala final del Club de los Enigmas. Tres cajas y una puerta. Solo quien piensa con calma sale de aquí.',
            objs: [
                { id: 'cajaA', e: '📦', n: 'Caja A', x: 16, y: 60, look: [['cajaA:open', 'La caja A está abierta.'], 'Caja A, cierre de letras: «Si anteayer fue jueves, ¿qué día será pasado mañana?».'],
                    lock: { k: 'word', ans: 'LUNES', q: 'Caja A: un día de la semana.', wrong: 'No. Averigua primero qué día es hoy.', then: { t: 'Dentro hay un fragmento de papel.', give: ['frag1'] } } },
                { id: 'cajaB', e: '📦', n: 'Caja B', x: 38, y: 60, look: [['cajaB:open', 'La caja B está abierta.'], 'Caja B, 1 cifra: «Un caracol está en el fondo de un pozo de 10 m. Cada día sube 3 m y cada noche resbala 2 m. ¿Cuántos días tarda en salir?».'],
                    lock: { k: 'digits', len: 1, ans: '8', q: 'Caja B: 1 cifra.', wrong: 'Cuidado: el último día ya no resbala.', then: { t: 'Dentro hay otro fragmento de papel.', give: ['frag2'] } } },
                { id: 'cajaC', e: '📦', n: 'Caja C', x: 60, y: 60, look: [['cajaC:open', 'La caja C está abierta.'], 'Caja C, cierre de letras: «Te sigo a todas partes, pero desaparezco en la oscuridad. ¿Qué soy?».'],
                    lock: { k: 'word', ans: 'SOMBRA', q: 'Caja C: la respuesta del acertijo.', then: { t: 'Dentro está el último fragmento.', give: ['frag3'] } } },
                { id: 'cartel', e: '🪧', n: 'Cartel del club', x: 30, y: 20, look: '«Ningún candado de esta sala está puesto al azar. Lee bien cada fragmento.»' },
                { id: 'ladrillo', e: '🧱', n: 'Ladrillo', x: 60, y: 22, look: 'Un ladrillo sobre una báscula con una etiqueta: «Este ladrillo pesa 1 kg más medio ladrillo».', note: 'Ladrillo: pesa 1 kg + medio ladrillo.' },
                { id: 'calendario', e: '📅', n: 'Calendario', x: 80, y: 22, look: 'Un calendario con todos los meses. Febrero tiene 28 días este año; los demás, 30 o 31.' },
                { id: 'puerta', e: '🚪', n: 'Puerta final', x: 88, y: 60, look: 'Una puerta con 4 ruedas numeradas.',
                    lock: { k: 'digits', len: 4, ans: '3128', q: 'Puerta final: 4 cifras.', if: ['got:frag1', 'got:frag2', 'got:frag3'], wrong: 'Las ruedas se bloquean un instante. Revisa los fragmentos.', then: { t: 'La puerta se abre. El Club de los Enigmas te da la bienvenida como socio de honor.', win: true } } }
            ],
            items: {
                frag1: { e: '📄', n: 'Fragmento 1', d: '«La primera cifra de la salida: lo que pesa, en kilos, un ladrillo y medio.»', note: 'Fragmento 1: 1.ª cifra = kilos de ladrillo y medio.' },
                frag2: { e: '📄', n: 'Fragmento 2', d: '«Las dos siguientes: cuántos meses del año tienen 28 días.»', note: 'Fragmento 2: cifras 2–3 = meses con 28 días.' },
                frag3: { e: '📄', n: 'Fragmento 3', d: '«La última: los días que tardó el caracol.»', note: 'Fragmento 3: última cifra = días del caracol.' }
            },
            hints: [
                { until: 'cajaA:open', t: 'Si anteayer fue jueves, hoy es sábado.' },
                { until: 'cajaB:open', t: 'Tras 7 días ha subido 7 m; el 8.º día sube 3 y sale.' },
                { until: 'cajaC:open', t: 'Va contigo con luz y desaparece a oscuras.' },
                { t: 'Un ladrillo pesa 2 kg (1 kg + 1 kg): ladrillo y medio, 3. Los 12 meses tienen al menos 28 días. Y el caracol, 8.' }
            ]
        }
    ];
})();
