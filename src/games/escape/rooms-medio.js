/* ============================================================
   NEXUS ARCADE · games/escape/rooms-medio.js
   Escape Room · 10 salas de nivel MEDIO.
   ============================================================ */
(function () {
    'use strict';
    const R = (Nexus.games.escapeRooms = Nexus.games.escapeRooms || {});

    R.medio = [
        // ─────────────────────────────────────────────────── 1
        {
            id: 'm1', name: 'El despacho del detective', emoji: '🕵️', bg: ['#3b2f2a', '#1c1512'],
            intro: 'Te has quedado encerrado en el despacho del inspector Ramos la noche del robo. La puerta está cerrada con llave y el conserje no volverá hasta mañana.',
            objs: [
                { id: 'reloj', e: '🕰️', n: 'Reloj de pared', x: 14, y: 22, look: 'El reloj de pared se detuvo y ya no hace tictac. Sus agujas marcan las 9:45.', note: 'El reloj se paró a las 9:45.' },
                { id: 'cuadro', e: '🖼️', n: 'Retrato', x: 42, y: 18, look: 'Un retrato del inspector Ramos con su gabardina. En el marco hay una plaquita grabada: «Todo empieza por la hora del crimen».', note: 'Retrato: «Todo empieza por la hora del crimen».' },
                { id: 'escritorio', e: '🗄️', n: 'Escritorio', x: 30, y: 66, look: [['escritorio:open', 'El cajón del escritorio está abierto y vacío.'], 'Un escritorio de roble. El cajón tiene un candado de 3 cifras.'],
                    lock: { k: 'digits', len: 3, ans: '945', q: 'Candado del cajón: 3 cifras.', then: { t: '¡Clic! El cajón se abre. Dentro hay una lupa de detective.', give: ['lupa'] } } },
                { id: 'periodico', e: '📰', n: 'Periódico', x: 58, y: 64, look: [['leido', 'Con la lupa leíste: «LA LLAVE DUERME BAJO LA PLANTA».'], 'Un periódico viejo sobre la mesita. En una esquina hay un texto tan diminuto que no se puede leer a simple vista.'],
                    use: [{ item: 'lupa', then: { t: 'Con la lupa consigues leer la letra diminuta: «LA LLAVE DUERME BAJO LA PLANTA».', set: ['leido'], note: 'Periódico: «La llave duerme bajo la planta».' } }] },
                { id: 'planta', e: '🪴', n: 'Planta', x: 82, y: 62, look: [['got:llave', 'Una planta en una maceta pesada. Debajo ya no queda nada.'], ['leido', 'La maceta pesa mucho, pero podrías levantarla.'], 'Una planta en una maceta pesada. Parece bien cuidada.'],
                    take: { item: 'llave', if: 'leido', t: 'Levantas la maceta con esfuerzo... ¡debajo hay una llave!' } },
                { id: 'puerta', e: '🚪', n: 'Puerta', x: 88, y: 26, look: 'La puerta del despacho. Está cerrada con llave.',
                    use: [{ item: 'llave', then: { t: 'La llave gira con un chasquido. ¡La puerta se abre!', win: true } }] },
                { id: 'perchero', e: '🧥', n: 'Perchero', x: 66, y: 24, look: 'La gabardina del inspector. En los bolsillos solo hay migas de galleta.' }
            ],
            items: {
                lupa: { e: '🔍', n: 'Lupa', d: 'Una lupa de detective. Sirve para leer letra muy pequeña.' },
                llave: { e: '🗝️', n: 'Llave de latón', d: 'Una llave con una etiqueta: «Despacho».' }
            },
            hints: [
                { until: 'escritorio:open', t: 'La plaquita del retrato dice que todo empieza por la hora del crimen. ¿Qué hora marca el reloj?' },
                { until: 'leido', t: 'Selecciona la lupa en tu inventario y úsala sobre algo con letra muy pequeña.' },
                { until: 'got:llave', t: 'El periódico dice dónde está la llave: mira la planta.' },
                { t: 'Selecciona la llave y úsala en la puerta.' }
            ]
        },
        // ─────────────────────────────────────────────────── 2
        {
            id: 'm2', name: 'La cocina de la abuela', emoji: '🍲', bg: ['#4a3b22', '#241a0d'],
            intro: 'La abuela te ha dejado encerrado en su cocina «hasta que encuentres la receta secreta». Se ha ido al mercado con la llave.',
            objs: [
                { id: 'receta', e: '📋', n: 'Receta en la nevera', x: 15, y: 30, look: 'Sujeta con un imán: «Bizcocho de la abuela: primero la harina, después los huevos, luego el azúcar y por último la sal. El candado de la despensa guarda las cantidades en ese mismo orden».', note: 'Receta: harina → huevos → azúcar → sal (cantidades = candado de la despensa).' },
                { id: 'tarros', e: '🫙', n: 'Tarros', x: 38, y: 26, look: 'Tres tarros con etiquetas escritas a mano: «Azúcar: 4 cucharadas», «Sal: 1 pizca», «Harina: 2 tazas».', note: 'Tarros: azúcar 4, sal 1, harina 2.' },
                { id: 'huevera', e: '🥚', n: 'Huevera', x: 60, y: 30, look: 'Una huevera con una nota: «Para el bizcocho, 3 huevos. ¡Ni uno más!».', note: 'Huevos: 3.' },
                { id: 'despensa', e: '🚪', n: 'Despensa', x: 82, y: 32, look: [['despensa:open', 'La despensa está abierta. Huele a canela.'], 'La puerta de la despensa tiene un candado de 4 cifras.'],
                    lock: { k: 'digits', len: 4, ans: '2341', q: 'Candado de la despensa: 4 cifras.', then: { t: 'La despensa se abre. Entre botes de conserva encuentras una caja de cerillas.', give: ['cerillas'] } } },
                { id: 'vela', e: '🕯️', n: 'Vela', x: 22, y: 70, look: [['luz', 'La vela ilumina el rincón de la alacena.'], 'Una vela apagada en un rincón muy oscuro de la cocina.'],
                    use: [{ item: 'cerillas', then: { t: 'Enciendes la vela. ¡En el rincón oscuro aparece un baúl!', set: ['luz'] } }] },
                { id: 'baul', e: '🧰', n: 'Baúl', x: 45, y: 72, show: 'luz', look: [['baul:open', 'El baúl está abierto.'], 'Un baúl con un candado de letras. En la tapa, la abuela escribió: «Las abejas la fabrican y yo la echo en la leche caliente».'],
                    lock: { k: 'word', ans: 'MIEL', q: 'Candado de letras del baúl.', then: { t: 'El baúl se abre: ¡ahí está la llave de la cocina!', give: ['llave'] } } },
                { id: 'horno', e: '🔥', n: 'Horno', x: 66, y: 70, look: 'El horno de leña está frío. Dentro solo hay una bandeja vacía.' },
                { id: 'puerta', e: '🚪', n: 'Puerta de la cocina', x: 88, y: 70, look: 'La puerta que da al patio. Cerrada con llave.',
                    use: [{ item: 'llave', then: { t: 'Abres la puerta y sales al patio. ¡Libre!', win: true } }] }
            ],
            items: {
                cerillas: { e: '🔥', n: 'Cerillas', d: 'Una caja de cerillas. Sirven para encender algo.' },
                llave: { e: '🗝️', n: 'Llave de la cocina', d: 'Una llave grande de hierro.' }
            },
            hints: [
                { until: 'despensa:open', t: 'La receta da el orden (harina, huevos, azúcar, sal); los tarros y la huevera, las cantidades.' },
                { until: 'luz', t: 'Hay un rincón muy oscuro. Usa las cerillas en la vela.' },
                { until: 'baul:open', t: 'El acertijo del baúl habla de algo dulce que hacen las abejas.' },
                { t: 'Usa la llave en la puerta de la cocina.' }
            ]
        },
        // ─────────────────────────────────────────────────── 3
        {
            id: 'm3', name: 'El aula de ciencias', emoji: '🧪', bg: ['#1f3a3a', '#0e1d1d'],
            intro: 'Te has quedado dentro del laboratorio del instituto después de clase. La profesora ha dejado un reto para salir.',
            objs: [
                { id: 'pizarra', e: '🧮', n: 'Pizarra', x: 30, y: 20, look: 'En la pizarra: «Reto 1 · Completa la serie: 2, 4, 8, 16, …». Debajo, una flecha que apunta a las taquillas.', note: 'Serie: 2, 4, 8, 16, ¿?' },
                { id: 'taquilla', e: '🗃️', n: 'Taquilla', x: 12, y: 58, look: [['taquilla:open', 'La taquilla está abierta y vacía.'], 'Una taquilla con candado de 2 cifras.'],
                    lock: { k: 'digits', len: 2, ans: '32', q: 'Candado de la taquilla: 2 cifras.', then: { t: 'Dentro hay una pila nueva.', give: ['pila'] } } },
                { id: 'mesa', e: '🔦', n: 'Linterna', x: 38, y: 66, look: [['got:linterna_vacia', 'Ya cogiste la linterna.'], 'Una linterna sobre la mesa de prácticas. No tiene pilas.'], take: { item: 'linterna_vacia', gone: false } },
                { id: 'armario', e: '🚪', n: 'Armario oscuro', x: 62, y: 56, look: [['visto', 'Dentro del armario hay un cartel: «Para salir: O, C, H».'], 'Un armario profundo y completamente a oscuras. No ves nada dentro.'],
                    use: [{ item: 'linterna', then: { t: 'Iluminas el armario. Pegado al fondo hay un cartel: «Para salir: O, C, H».', set: ['visto'], note: 'Armario: «Para salir: O, C, H».' } }] },
                { id: 'tabla', e: '⚛️', n: 'Póster de elementos', x: 62, y: 18, look: 'Un póster de la tabla periódica con algunos números atómicos destacados: H = 1, He = 2, C = 6, N = 7, O = 8.', note: 'Números atómicos: H 1, C 6, N 7, O 8.' },
                { id: 'puerta', e: '🚪', n: 'Puerta del aula', x: 88, y: 40, look: [['puerta:open', 'La puerta está abierta.'], 'La puerta tiene un teclado: «Escribe el número atómico de cada elemento, en orden». Son 3 cifras.'],
                    lock: { k: 'digits', len: 3, ans: '861', q: 'Teclado de la puerta: 3 cifras.', if: 'visto', then: { t: 'Luz verde. ¡La puerta se abre!', win: true } } },
                { id: 'esqueleto', e: '💀', n: 'Esqueleto', x: 84, y: 76, look: 'El esqueleto del aula, «Pepe». Lleva unas gafas de natación puestas.' }
            ],
            items: {
                pila: { e: '🔋', n: 'Pila', d: 'Una pila nueva.', combine: { with: 'linterna_vacia', give: 'linterna', t: 'Pones la pila en la linterna. ¡Funciona!' } },
                linterna_vacia: { e: '🔦', n: 'Linterna sin pilas', d: 'Una linterna. Le falta la pila.' },
                linterna: { e: '🔦', n: 'Linterna', d: 'Una linterna que funciona.' }
            },
            hints: [
                { until: 'taquilla:open', t: 'Cada número de la serie es el doble del anterior.' },
                { until: 'got:linterna', t: 'Coge la linterna y combínala con la pila en el inventario.' },
                { until: 'visto', t: 'Usa la linterna en el armario oscuro.' },
                { t: 'El cartel dice O, C, H. Busca sus números atómicos en el póster: 8, 6, 1.' }
            ]
        },
        // ─────────────────────────────────────────────────── 4
        {
            id: 'm4', name: 'El camarote del capitán', emoji: '⚓', bg: ['#1e3a5f', '#0b1a2e'],
            intro: 'Te despiertas en el camarote de un viejo velero. El capitán ha desaparecido y la escotilla está bloqueada.',
            objs: [
                { id: 'mapa', e: '🗺️', n: 'Carta náutica', x: 18, y: 22, look: 'Una carta náutica con una ruta dibujada desde el puerto: «Norte, Este, Este, Sur». Una X marca el final.', note: 'Ruta del mapa: Norte, Este, Este, Sur.' },
                { id: 'brujula', e: '🧭', n: 'Brújula', x: 40, y: 18, look: 'La brújula del capitán: el norte está arriba (↑), el este a la derecha (→).' },
                { id: 'cofre', e: '🧳', n: 'Cofre', x: 26, y: 66, look: [['cofre:open', 'El cofre está abierto y vacío.'], 'Un cofre con un cierre de flechas: hay que introducir 4 direcciones.'],
                    lock: { k: 'dirs', len: 4, ans: ['U', 'R', 'R', 'D'], q: 'Cierre de flechas: 4 direcciones.', then: { t: 'El cofre se abre. Dentro hay un catalejo de latón.', give: ['catalejo'] } } },
                { id: 'ojo', e: '🪟', n: 'Ojo de buey', x: 62, y: 28, look: [['faro', 'A lo lejos el faro destella: 3, pausa, 1, pausa, 4.'], 'Por el ojo de buey se ve el mar de noche y una lucecita muy lejana.'],
                    use: [{ item: 'catalejo', then: { t: 'Con el catalejo ves un faro. Destella 3 veces, pausa, 1 vez, pausa, 4 veces. Y vuelve a empezar.', set: ['faro'], note: 'El faro destella: 3 · 1 · 4.' } }] },
                { id: 'diario', e: '📔', n: 'Diario de a bordo', x: 50, y: 66, look: 'La última entrada del diario: «Si me pierdo, que me busquen siguiendo la luz del faro. Su ritmo abre la escotilla».', note: 'Diario: el ritmo del faro abre la escotilla.' },
                { id: 'escotilla', e: '🛟', n: 'Escotilla', x: 84, y: 60, look: 'La escotilla de salida tiene una rueda con números: 3 cifras.',
                    lock: { k: 'digits', len: 3, ans: '314', q: 'Rueda de la escotilla: 3 cifras.', then: { t: 'La escotilla se desbloquea. Subes a cubierta... ¡estás fuera!', win: true } } },
                { id: 'loro', e: '🦜', n: 'Loro', x: 82, y: 22, look: '«¡Crrr! ¡Mira por la ventana! ¡Mira por la ventana!»' }
            ],
            items: { catalejo: { e: '🔭', n: 'Catalejo', d: 'Un catalejo de latón. Sirve para ver cosas lejanas.' } },
            hints: [
                { until: 'cofre:open', t: 'Convierte la ruta del mapa en flechas con la brújula: Norte = ↑, Este = →, Sur = ↓.' },
                { until: 'faro', t: 'Usa el catalejo en el ojo de buey.' },
                { t: 'La escotilla se abre con el ritmo del faro: 3, 1, 4.' }
            ]
        },
        // ─────────────────────────────────────────────────── 5
        {
            id: 'm5', name: 'La biblioteca encantada', emoji: '📚', bg: ['#2e1f47', '#150d24'],
            intro: 'Las puertas de la vieja biblioteca se han cerrado solas a medianoche. Un fantasma bibliotecario te observa.',
            objs: [
                { id: 'fantasma', e: '👻', n: 'Fantasma', x: 14, y: 24, look: '«Uuuh... Los colores de la vidriera hay que leerlos de abajo arriba, como suben las almas...»' },
                { id: 'vidriera', e: '🪟', n: 'Vidriera', x: 40, y: 22, look: 'Una vidriera con cuatro franjas de colores. De arriba abajo: azul, verde, amarillo y rojo.', note: 'Vidriera (de arriba abajo): azul, verde, amarillo, rojo.' },
                { id: 'atril', e: '📖', n: 'Atril', x: 30, y: 66, look: [['atril:open', 'El atril está abierto.'], 'Un atril con un cajón cerrado por cuatro botones de colores.'],
                    lock: { k: 'colors', len: 4, ans: ['rojo', 'amarillo', 'verde', 'azul'], q: 'Cajón del atril: pulsa 4 colores en orden.', then: { t: 'El cajón se abre. Dentro hay un marcapáginas que dice «Pág. 7».', give: ['marcapaginas'] } } },
                { id: 'libro', e: '📕', n: 'Libro gigante', x: 58, y: 64, look: [['leido', 'En la página 7 hay un acertijo.'], 'Un libro enorme de cientos de páginas. Sin saber qué página buscar, tardarías horas.'],
                    use: [{ item: 'marcapaginas', then: { t: 'Abres por la página 7. Hay un acertijo subrayado: «Tengo hojas y no soy árbol, tengo lomo y no soy animal. ¿Qué soy?».', set: ['leido'], note: 'Acertijo: «Tengo hojas y no soy árbol, tengo lomo y no soy animal».' } }] },
                { id: 'estanteria', e: '🗄️', n: 'Estantería', x: 66, y: 24, look: 'Estanterías hasta el techo. Algunos títulos: «Cien años de polvo», «El fantasma que no sabía leer», «Manual de puertas encantadas».' },
                { id: 'puerta', e: '🚪', n: 'Puerta encantada', x: 86, y: 52, look: 'Una puerta con una cerradura de letras: «Di la respuesta del acertijo y te dejaré marchar».',
                    lock: { k: 'word', ans: 'LIBRO', q: 'Cerradura de letras: la respuesta del acertijo.', if: 'leido', then: { t: 'La puerta cruje y se abre. El fantasma se despide con la mano.', win: true } } }
            ],
            items: { marcapaginas: { e: '🔖', n: 'Marcapáginas', d: 'Un marcapáginas de tela: «Pág. 7».' } },
            hints: [
                { until: 'atril:open', t: 'El fantasma dice que se lee de abajo arriba: rojo, amarillo, verde, azul.' },
                { until: 'leido', t: 'Usa el marcapáginas en el libro gigante.' },
                { t: 'Hojas, lomo, en una biblioteca... es un LIBRO.' }
            ]
        },
        // ─────────────────────────────────────────────────── 6
        {
            id: 'm6', name: 'El tren nocturno', emoji: '🚂', bg: ['#3a2a1e', '#1a120b'],
            intro: 'Viajas en el tren nocturno y te has quedado encerrado en el compartimento. Tienes que bajar en la próxima parada.',
            objs: [
                { id: 'billete', e: '🎫', n: 'Billete', x: 16, y: 28, look: 'Tu billete: «Vagón 4 · Asiento 12 · Salida 23:10».', note: 'Billete: vagón 4, asiento 12, salida 23:10.' },
                { id: 'maleta', e: '🧳', n: 'Maleta', x: 34, y: 68, look: [['maleta:open', 'La maleta está abierta.'], 'Tu maleta. El candado tiene una etiqueta: «Combinación: vagón y asiento». Son 3 cifras.'],
                    lock: { k: 'digits', len: 3, ans: '412', q: 'Candado de la maleta: 3 cifras.', then: { t: 'Abres la maleta. Entre la ropa hay un destornillador.', give: ['destornillador'] } } },
                { id: 'rejilla', e: '🔲', n: 'Rejilla de ventilación', x: 58, y: 18, look: [['got:nota', 'La rejilla está abierta.'], 'Una rejilla atornillada. Detrás parece que hay un papel.'],
                    use: [{ item: 'destornillador', then: { t: 'Quitas los tornillos. Detrás de la rejilla hay una nota del revisor.', give: ['nota'] } }] },
                { id: 'revisor', e: '🧑‍✈️', n: 'Foto del revisor', x: 36, y: 22, look: 'Una foto del revisor con una frase: «En mi tren, todo se abre a su hora».' },
                { id: 'freno', e: '🛑', n: 'Freno de emergencia', x: 84, y: 40, look: 'El freno de emergencia está bloqueado con un teclado de 4 cifras.',
                    lock: { k: 'digits', len: 4, ans: '2310', q: 'Teclado del freno: 4 cifras.', if: 'got:nota', then: { t: 'El tren se detiene suavemente en un andén. Las puertas se abren. ¡Has llegado!', win: true } } },
                { id: 'ventana', e: '🌙', n: 'Ventanilla', x: 66, y: 60, look: 'Afuera todo es oscuridad y, de vez en cuando, las luces de un pueblo.' }
            ],
            items: {
                destornillador: { e: '🪛', n: 'Destornillador', d: 'Un destornillador de estrella.' },
                nota: { e: '📝', n: 'Nota del revisor', d: '«El freno de emergencia se desbloquea con la hora de salida del tren (sin los dos puntos)».', note: 'Nota: el freno se abre con la hora de salida.' }
            },
            hints: [
                { until: 'maleta:open', t: 'Mira el billete: vagón 4 y asiento 12.' },
                { until: 'got:nota', t: 'Usa el destornillador en la rejilla.' },
                { t: 'La nota dice que el freno se abre con la hora de salida: 23:10.' }
            ]
        },
        // ─────────────────────────────────────────────────── 7
        {
            id: 'm7', name: 'El taller del inventor', emoji: '🤖', bg: ['#26323f', '#10161d'],
            intro: 'La inventora Hedy te ha encerrado en su taller para probar su nuevo sistema de seguridad. Si escapas, el prototipo es tuyo.',
            objs: [
                { id: 'tablon', e: '📌', n: 'Tablón de corcho', x: 16, y: 22, look: 'Dos pósits clavados: «1001» y «1100». Debajo: «Están en binario. Súmalos en decimal».', note: 'Pósits en binario: 1001 y 1100.' },
                { id: 'chuleta', e: '📄', n: 'Chuleta', x: 38, y: 22, look: 'Una chuleta: «Binario: cada cifra vale el doble que la de su derecha: 8, 4, 2, 1. Ej.: 0101 = 4 + 1 = 5».' },
                { id: 'caja', e: '🧰', n: 'Caja fuerte', x: 22, y: 66, look: [['caja:open', 'La caja fuerte está abierta.'], 'Una caja fuerte pequeña de 2 cifras.'],
                    lock: { k: 'digits', len: 2, ans: '21', q: 'Caja fuerte: 2 cifras.', then: { t: 'Dentro hay una batería de robot.', give: ['bateria'] } } },
                { id: 'robot', e: '🤖', n: 'Robot', x: 52, y: 60, look: [['robot_on', '«La puerta pide el nombre de mi creadora. Lo tienes delante, firmado en su obra maestra.»'], 'Un robot apagado. En el pecho tiene un hueco para una batería.'],
                    use: [{ item: 'bateria', consume: true, then: { t: 'El robot se enciende: «Bip. La puerta pide el nombre de mi creadora. Lo tienes delante, firmado en su obra maestra».', set: ['robot_on'] } }] },
                { id: 'plano', e: '📐', n: 'Plano', x: 66, y: 22, look: 'El plano del robot, su obra maestra. Abajo a la derecha, una firma: «Hedy».', note: 'El plano está firmado por «Hedy».' },
                { id: 'puerta', e: '🚪', n: 'Puerta blindada', x: 86, y: 54, look: 'Una puerta con teclado de letras: «Nombre de la creadora».',
                    lock: { k: 'word', ans: 'HEDY', q: 'Teclado de letras de la puerta.', if: 'robot_on', wrong: 'Pitido de error. Ese no es el nombre.', then: { t: 'La puerta se abre con un zumbido. ¡Lo lograste!', win: true } } },
                { id: 'engranajes', e: '⚙️', n: 'Engranajes', x: 82, y: 82, look: 'Una caja de engranajes de todos los tamaños. Ninguno parece importante.' }
            ],
            items: { bateria: { e: '🔋', n: 'Batería de robot', d: 'Una batería grande con un rayo dibujado.' } },
            hints: [
                { until: 'caja:open', t: '1001 = 8 + 1 = 9; 1100 = 8 + 4 = 12. Suma 9 + 12.' },
                { until: 'robot_on', t: 'Usa la batería en el robot.' },
                { t: 'El plano está firmado: la creadora se llama HEDY.' }
            ]
        },
        // ─────────────────────────────────────────────────── 8
        {
            id: 'm8', name: 'La juguetería', emoji: '🧸', bg: ['#4a2240', '#22101d'],
            intro: 'Te has quedado dormido en el almacén de la juguetería y la tienda ha cerrado. Los juguetes parecen tener vida propia.',
            objs: [
                { id: 'bloques', e: '🔤', n: 'Bloques de letras', x: 16, y: 26, look: 'Cuatro bloques de madera desordenados: N, E, R, T.', note: 'Bloques: N, E, R, T.' },
                { id: 'muneca', e: '🪆', n: 'Muñeca', x: 36, y: 22, look: 'La muñeca sostiene un cartel: «Los bloques forman algo que va por raíles».' },
                { id: 'caja', e: '🎁', n: 'Caja de regalo', x: 24, y: 66, look: [['caja:open', 'La caja está abierta.'], 'Una caja de regalo con un candado de letras.'],
                    lock: { k: 'word', ans: 'TREN', q: 'Candado de letras de la caja.', then: { t: 'Dentro hay una llave de cuerda dorada.', give: ['cuerda'] } } },
                { id: 'soldado', e: '💂', n: 'Soldadito de cuerda', x: 52, y: 64, look: [['marcha', 'El soldadito marchó: ↑ ↑ → ↓ y se paró sobre una baldosa.'], 'Un soldadito de hojalata con un agujero en la espalda para darle cuerda.'],
                    use: [{ item: 'cuerda', then: { t: 'Das cuerda al soldadito. Marcha: arriba, arriba, derecha, abajo... y se para junto a una trampilla.', set: ['marcha'], note: 'El soldadito marcha: ↑ ↑ → ↓.' } }] },
                { id: 'trampilla', e: '🕳️', n: 'Trampilla', x: 72, y: 74, show: 'marcha', look: [['trampilla:open', 'La trampilla está abierta.'], 'Una trampilla en el suelo con un cierre de flechas de 4 pasos.'],
                    lock: { k: 'dirs', len: 4, ans: ['U', 'U', 'R', 'D'], q: 'Cierre de flechas: 4 direcciones.', then: { t: 'La trampilla se abre. Dentro está la llave de la tienda.', give: ['llave'] } } },
                { id: 'puerta', e: '🚪', n: 'Puerta de la tienda', x: 86, y: 34, look: 'La puerta de la tienda, con el cartel de «Cerrado».',
                    use: [{ item: 'llave', then: { t: 'Abres la puerta. Los juguetes te dicen adiós desde el escaparate.', win: true } }] },
                { id: 'peluche', e: '🧸', n: 'Osito', x: 64, y: 24, look: 'Un osito de peluche gigante. Tiene una etiqueta: «No me aprietes la barriga». Mejor no.' }
            ],
            items: {
                cuerda: { e: '🔑', n: 'Llave de cuerda', d: 'Una llave dorada para dar cuerda a los juguetes.' },
                llave: { e: '🗝️', n: 'Llave de la tienda', d: 'La llave de la puerta principal.' }
            },
            hints: [
                { until: 'caja:open', t: 'Ordena N, E, R, T para formar algo que va por raíles.' },
                { until: 'marcha', t: 'Usa la llave de cuerda en el soldadito.' },
                { until: 'got:llave', t: 'Repite en la trampilla los pasos del soldadito: ↑ ↑ → ↓.' },
                { t: 'Usa la llave en la puerta de la tienda.' }
            ]
        },
        // ─────────────────────────────────────────────────── 9
        {
            id: 'm9', name: 'El jardín secreto', emoji: '🌻', bg: ['#1f3d23', '#0d1e10'],
            intro: 'Entraste en un jardín amurallado persiguiendo a un gato y la verja se cerró a tu espalda.',
            objs: [
                { id: 'solar', e: '☀️', n: 'Reloj de sol', x: 16, y: 26, look: 'Un reloj de sol de piedra. La sombra señala justo el número 4.', note: 'Reloj de sol: 4.' },
                { id: 'flores', e: '🌷', n: 'Parterre', x: 40, y: 26, look: 'Un parterre con 3 rosas, 5 tulipanes y 2 margaritas.', note: 'Flores: 3 rosas, 5 tulipanes, 2 margaritas.' },
                { id: 'cartel', e: '🪧', n: 'Cartel', x: 62, y: 22, look: 'Un cartel en la caseta: «Mi candado: tulipanes, rosas, margaritas y la hora del reloj de sol».', note: 'Caseta: tulipanes, rosas, margaritas, hora del reloj de sol.' },
                { id: 'caseta', e: '🛖', n: 'Caseta', x: 24, y: 66, look: [['caseta:open', 'La caseta está abierta.'], 'La caseta de herramientas tiene un candado de 4 cifras.'],
                    lock: { k: 'digits', len: 4, ans: '5324', q: 'Candado de la caseta: 4 cifras.', then: { t: 'Dentro hay una pala.', give: ['pala'] } } },
                { id: 'tierra', e: '🟫', n: 'Tierra removida', x: 52, y: 70, look: [['got:llave', 'Un hoyo vacío.'], 'Un trozo de tierra removida hace poco. El gato la olfatea.'],
                    use: [{ item: 'pala', then: { t: 'Cavas un poco y aparece una llave oxidada.', give: ['llave'] } }] },
                { id: 'gato', e: '🐈', n: 'Gato', x: 72, y: 62, look: '«Miau.» El gato no deja de mirar la tierra removida.' },
                { id: 'verja', e: '⛩️', n: 'Verja', x: 88, y: 40, look: 'La verja de hierro del jardín, cerrada con llave.',
                    use: [{ item: 'llave', then: { t: 'La llave encaja en la verja. ¡Fuera!', win: true } }] }
            ],
            items: {
                pala: { e: '🪏', n: 'Pala', d: 'Una pala de jardín.' },
                llave: { e: '🗝️', n: 'Llave oxidada', d: 'Una llave vieja de hierro.' }
            },
            hints: [
                { until: 'caseta:open', t: 'Sigue el orden del cartel: 5 tulipanes, 3 rosas, 2 margaritas y la sombra en el 4.' },
                { until: 'got:llave', t: 'Usa la pala en la tierra removida.' },
                { t: 'Usa la llave en la verja.' }
            ]
        },
        // ─────────────────────────────────────────────────── 10
        {
            id: 'm10', name: 'El observatorio', emoji: '🔭', bg: ['#141b3a', '#070a1a'],
            intro: 'El observatorio de la montaña ha cerrado su cúpula contigo dentro. Para salir hay que mirar las estrellas.',
            objs: [
                { id: 'planetas', e: '🪐', n: 'Póster de planetas', x: 16, y: 22, look: 'Los planetas en orden desde el Sol: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno.', note: 'Orden: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano, Neptuno.' },
                { id: 'nota', e: '📝', n: 'Nota', x: 38, y: 24, look: '«El código de la caja: la posición de Marte, la de la Tierra y la de Saturno».', note: 'Caja: posición de Marte, Tierra y Saturno.' },
                { id: 'caja', e: '📦', n: 'Caja', x: 24, y: 66, look: [['caja:open', 'La caja está abierta.'], 'Una caja metálica con un candado de 3 cifras.'],
                    lock: { k: 'digits', len: 3, ans: '436', q: 'Candado de la caja: 3 cifras.', then: { t: 'Dentro hay una lente de telescopio.', give: ['lente'] } } },
                { id: 'telescopio', e: '🔭', n: 'Telescopio', x: 54, y: 52, look: [['visto', 'En el telescopio se ve una constelación con forma de W.'], 'El gran telescopio. Le falta la lente.'],
                    use: [{ item: 'lente', consume: true, then: { t: 'Colocas la lente y miras: ves una constelación que forma una W perfecta.', set: ['visto'], note: 'Telescopio: constelación con forma de W.' } }] },
                { id: 'atlas', e: '✨', n: 'Atlas del cielo', x: 66, y: 22, look: 'Constelaciones: Orión (un cinturón de 3 estrellas), Osa Mayor (un cazo) y Casiopea (una W).', note: 'Casiopea tiene forma de W.' },
                { id: 'puerta', e: '🚪', n: 'Puerta de la cúpula', x: 86, y: 60, look: 'Una pantalla en la puerta: «¿Qué constelación ves por el telescopio?».',
                    lock: { k: 'word', ans: 'CASIOPEA', q: 'Pantalla de la puerta: nombre de la constelación.', if: 'visto', then: { t: 'La cúpula se abre y la puerta también. ¡Qué noche tan bonita!', win: true } } }
            ],
            items: { lente: { e: '🔘', n: 'Lente', d: 'Una lente pulida para el telescopio.' } },
            hints: [
                { until: 'caja:open', t: 'Marte es el 4.º planeta, la Tierra el 3.º y Saturno el 6.º.' },
                { until: 'visto', t: 'Usa la lente en el telescopio.' },
                { t: 'Según el atlas, la constelación con forma de W es Casiopea.' }
            ]
        }
    ];
})();
