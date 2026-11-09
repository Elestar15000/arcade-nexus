/* ============================================================
   NEXUS ARCADE · games/escape/daily.js
   Escape Room · 10 salas diarias. Cada día toca una de las 10
   (rotan) y sus códigos, palabras y colores se generan con una
   semilla de la fecha: todos los jugadores tienen la misma sala
   ese día, pero cambia de un día a otro.
   ============================================================ */
(function () {
    'use strict';
    const E = () => Nexus.games.escapeEngine;

    const RIDDLES = [
        ['Tiene dientes y no come, tiene cabeza y no es hombre.', 'AJO'],
        ['Blanca por dentro, verde por fuera; si quieres que te lo diga, espera.', 'PERA'],
        ['Vuela sin alas, silba sin boca y no se ve.', 'VIENTO'],
        ['Cuanto más se seca, más mojada está.', 'TOALLA'],
        ['Tiene agujas y no sabe coser, tiene números y no sabe leer.', 'RELOJ'],
        ['Oro parece, plata no es; el que no lo adivine bien tonto es.', 'PLATANO'],
        ['Lleva años en la playa y todavía no sabe nadar.', 'ARENA'],
        ['Sube llena y baja vacía; si no se da prisa, la sopa se enfría.', 'CUCHARA'],
        ['Tengo ciudades pero no casas, montañas pero no árboles y agua pero no peces.', 'MAPA'],
        ['Cuanto más grande es, menos se ve.', 'OSCURIDAD'],
        ['Tiene ojos y no ve, tiene agua y no la bebe, tiene carne y no la come.', 'COCO'],
        ['Se rompe con solo decir su nombre.', 'SILENCIO']
    ];
    const WORDS = ['FARO', 'PIRATA', 'CASTILLO', 'DRAGON', 'TESORO', 'COMETA', 'GALAXIA', 'BRUJULA', 'VOLCAN', 'SELVA', 'TIGRE', 'ROBOT', 'PLANETA', 'MOLINO', 'CABALLO', 'PALACIO', 'GLOBO', 'ISLA', 'BOSQUE', 'TRUENO'];
    const PALETTE = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'morado', 'blanco', 'negro'];
    const OBJ_COLORS = { rojo: 'roja', naranja: 'naranja', amarillo: 'amarilla', verde: 'verde', azul: 'azul', morado: 'morada', blanco: 'blanca', negro: 'negra' };
    const ROMAN = (n) => { const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s; };
    const ROMAN_FULL = (n) => { const t = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s; };
    const MORSE = ['−−−−−', '·−−−−', '··−−−', '···−−', '····−', '·····', '−····', '−−···', '−−−··', '−−−−·'];
    const T9 = { A: 2, B: 2, C: 2, D: 3, E: 3, F: 3, G: 4, H: 4, I: 4, J: 5, K: 5, L: 5, M: 6, N: 6, O: 6, P: 7, Q: 7, R: 7, S: 7, T: 8, U: 8, V: 8, W: 9, X: 9, Y: 9, Z: 9 };
    const DIRW = { U: 'norte', D: 'sur', L: 'oeste', R: 'este' };
    const pad2 = (n) => String(n).padStart(2, '0');
    const caesar = (w, k) => w.split('').map(c => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + k) % 26 + 26) % 26)).join('');
    const maya = (n) => { const bars = Math.floor(n / 5), dots = n % 5; return (dots ? '●'.repeat(dots) + ' ' : '') + '▬'.repeat(bars) || '🐚'; };

    /** Puerta de salida común: se abre con la llave final. */
    const door = (x = 88, y = 44) => ({ id: 'puerta', e: '🚪', n: 'Puerta', x, y, look: 'La puerta de salida, cerrada con llave.',
        use: [{ item: 'llave', then: { t: 'La llave gira. ¡Has escapado de la sala del día!', win: true } }] });
    const KEY = { e: '🗝️', n: 'Llave de salida', d: 'La llave de la puerta de salida.' };

    const T = [];

    // 1 · La sala de los colores
    T.push((r) => {
        const cols = r.sample(PALETTE.filter(c => c !== 'blanco' && c !== 'negro'), 3);
        const digits = cols.map(() => r.int(1, 9));
        const order = r.shuffle([0, 1, 2]);
        const code = order.map(i => digits[i]).join('');
        const [rq, ra] = r.pick(RIDDLES);
        const things = [['📕', 'Libro'], ['☕', 'Taza'], ['💡', 'Lámpara']];
        return {
            name: 'La sala de los colores', emoji: '🎨', bg: ['#3a2747', '#140d19'],
            intro: 'Cada objeto de esta sala esconde un número. La nota de la pared te dice en qué orden usarlos.',
            objs: [
                ...things.map(([e, n], i) => ({ id: 'o' + i, e, n: `${n} ${OBJ_COLORS[cols[i]]}`, x: 14 + i * 22, y: 24, look: `Es de color ${cols[i]}. Tiene pintado un ${digits[i]}.`, note: `${n} ${cols[i]}: ${digits[i]}.` })),
                { id: 'nota', e: '📝', n: 'Nota', x: 78, y: 22, look: `«El cajón: ${order.map(i => cols[i]).join(', ')}.»`, note: `Nota: ${order.map(i => cols[i]).join(' → ')}.` },
                { id: 'cajon', e: '🗄️', n: 'Cajón', x: 24, y: 66, look: [['cajon:open', 'El cajón está abierto.'], 'Un cajón con candado de 3 cifras.'],
                    lock: { k: 'digits', len: 3, ans: code, q: 'Candado del cajón: 3 cifras.', then: { t: 'Dentro hay una llave pequeña.', give: ['llavecita'] } } },
                { id: 'baul', e: '🧰', n: 'Baúl', x: 54, y: 66, look: [['baul:open', 'El baúl está abierto.'], 'Un baúl con dos cerraduras: una pequeña de llave y otra de letras.'],
                    use: [{ item: 'llavecita', then: { t: 'Abres la cerradura pequeña. Queda la de letras, con un acertijo grabado: «' + rq + '».', set: ['baul_llave'], note: 'Acertijo del baúl: «' + rq + '»' } }],
                    lock: { k: 'word', ans: ra, q: 'Cerradura de letras: la respuesta del acertijo.', if: 'baul_llave', then: { t: 'El baúl se abre: ¡la llave de salida!', give: ['llave'] } } },
                door()
            ],
            items: { llavecita: { e: '🔑', n: 'Llave pequeña', d: 'Una llave diminuta.' }, llave: KEY },
            hints: [
                { until: 'cajon:open', t: `Sigue el orden de la nota: ${order.map(i => `${cols[i]} (${digits[i]})`).join(', ')}.` },
                { until: 'baul_llave', t: 'Usa la llave pequeña en el baúl.' },
                { until: 'got:llave', t: `La respuesta del acertijo es ${ra}.` },
                { t: 'Usa la llave en la puerta.' }
            ]
        };
    });

    // 2 · El mensaje cifrado
    T.push((r) => {
        const w = r.pick(WORDS), k = r.int(1, 5), enc = caesar(w, k);
        const n = r.int(3, 9), m = r.int(2, 9);
        return {
            name: 'El mensaje cifrado', emoji: '🔏', bg: ['#1f2f45', '#0b121c'],
            intro: 'Un espía dejó un mensaje cifrado en esta sala antes de huir. Descífralo para salir.',
            objs: [
                { id: 'mensaje', e: '✉️', n: 'Mensaje', x: 16, y: 24, look: `Un mensaje en clave: «${enc}». Debajo: «cada letra avanzó lo que marca el reloj; alfabeto sin Ñ».`, note: `Mensaje: ${enc} (cada letra avanzó; alfabeto sin Ñ).` },
                { id: 'reloj', e: '🕰️', n: 'Reloj', x: 40, y: 22, look: `El reloj está parado a las ${k} en punto.`, note: `Reloj: las ${k} en punto.` },
                { id: 'estante', e: '🗄️', n: 'Estante', x: 64, y: 22, look: `En el estante hay ${n} libros y ${m} velas.`, note: `Estante: ${n} libros, ${m} velas.` },
                { id: 'caja', e: '📦', n: 'Caja', x: 22, y: 66, look: [['caja:open', 'La caja está abierta.'], 'Una caja con candado de 2 cifras: «primero los libros, después las velas».'],
                    lock: { k: 'digits', len: 2, ans: `${n}${m}`, q: 'Candado de la caja: 2 cifras.', then: { t: 'Dentro hay una lupa.', give: ['lupa'] } } },
                { id: 'cofre', e: '🧰', n: 'Cofre', x: 52, y: 66, look: [['cofre:open', 'El cofre está abierto.'], ['lupa_ok', 'Con la lupa viste que la cerradura de letras pide la palabra descifrada.'], 'Un cofre con cerradura de letras. Junto a ella hay algo escrito en letra minúscula.'],
                    use: [{ item: 'lupa', then: { t: 'Con la lupa lees: «Escribe aquí el mensaje del espía, ya descifrado».', set: ['lupa_ok'] } }],
                    lock: { k: 'word', ans: w, q: 'Cerradura de letras.', if: 'lupa_ok', then: { t: 'El cofre se abre: dentro está la llave de salida.', give: ['llave'] } } },
                door()
            ],
            items: { lupa: { e: '🔍', n: 'Lupa', d: 'Una lupa para leer letra pequeña.' }, llave: KEY },
            hints: [
                { until: 'caja:open', t: `Libros y velas: ${n}${m}.` },
                { until: 'lupa_ok', t: 'Usa la lupa en el cofre.' },
                { until: 'got:llave', t: `Retrocede cada letra ${k} posiciones: la palabra es ${w}.` },
                { t: 'Usa la llave en la puerta.' }
            ]
        };
    });

    // 3 · La serie y la vidriera
    T.push((r) => {
        const a = r.int(2, 9), d = r.int(3, 9);
        const seq = [a, a + d, a + 2 * d, a + 3 * d], next = a + 4 * d;
        const cols = r.sample(PALETTE, 4);
        return {
            name: 'La serie y la vidriera', emoji: '⛪', bg: ['#2d2140', '#110c18'],
            intro: 'Una capilla con una vidriera de colores. Para salir hay que entender los números y la luz.',
            objs: [
                { id: 'pizarra', e: '🧮', n: 'Pizarra', x: 16, y: 22, look: `En la pizarra: ${seq.join(', ')}, …`, note: `Serie: ${seq.join(', ')}, ¿?` },
                { id: 'caja', e: '📦', n: 'Caja', x: 22, y: 66, look: [['caja:open', 'La caja está abierta.'], `Una caja con candado de ${String(next).length} cifras: «el siguiente número de la pizarra».`],
                    lock: { k: 'digits', len: String(next).length, ans: String(next), q: 'Candado de la caja.', then: { t: 'Dentro hay una vela y cerillas.', give: ['vela'] } } },
                { id: 'vidriera', e: '🪟', n: 'Vidriera', x: 46, y: 22, look: [['luz', `Con la vela ves los colores de la vidriera, de arriba abajo: ${cols.join(', ')}.`], 'La vidriera está a oscuras: no se distinguen los colores.'],
                    use: [{ item: 'vela', then: { t: `A la luz de la vela ves los colores, de arriba abajo: ${cols.join(', ')}.`, set: ['luz'], note: `Vidriera (de arriba abajo): ${cols.join(', ')}.` } }] },
                { id: 'atril', e: '📖', n: 'Atril', x: 66, y: 22, look: '«La puerta se abre con los colores de la vidriera, leídos de abajo arriba.»', note: 'Puerta: colores de la vidriera de abajo arriba.' },
                { id: 'puerta', e: '🚪', n: 'Puerta', x: 86, y: 54, look: 'Una puerta con cuatro botones de colores.',
                    lock: { k: 'colors', len: 4, ans: cols.slice().reverse(), q: 'Pulsa 4 colores en orden.', if: 'luz', then: { t: 'La puerta se abre con un acorde de órgano. ¡Libre!', win: true } } }
            ],
            items: { vela: { e: '🕯️', n: 'Vela encendida', d: 'Una vela encendida.' } },
            hints: [
                { until: 'caja:open', t: `Cada número suma ${d}: el siguiente es ${next}.` },
                { until: 'luz', t: 'Ilumina la vidriera con la vela.' },
                { t: `Al revés: ${cols.slice().reverse().join(', ')}.` }
            ]
        };
    });

    // 4 · El mapa y el reloj
    T.push((r) => {
        const path = Array.from({ length: 5 }, () => r.pick(['U', 'D', 'L', 'R']));
        const h = r.int(1, 9), mm = r.int(1, 11) * 5;
        return {
            name: 'El mapa del explorador', emoji: '🧭', bg: ['#2e3a24', '#10150c'],
            intro: 'La tienda del explorador está cerrada a cal y canto. Su mapa y su reloj guardan el camino.',
            objs: [
                { id: 'mapa', e: '🗺️', n: 'Mapa', x: 16, y: 22, look: `Ruta hasta el cofre: ${path.map(p => DIRW[p]).join(', ')}.`, note: `Ruta: ${path.map(p => DIRW[p]).join(', ')}.` },
                { id: 'brujula', e: '🧭', n: 'Brújula', x: 38, y: 22, look: 'Norte = ↑, sur = ↓, este = →, oeste = ←.' },
                { id: 'cofre', e: '🧰', n: 'Cofre', x: 22, y: 66, look: [['cofre:open', 'El cofre está abierto.'], 'Un cofre con cierre de 5 flechas.'],
                    lock: { k: 'dirs', len: 5, ans: path, q: 'Cierre de flechas: 5 direcciones.', then: { t: 'Dentro hay una llave de cuerda.', give: ['cuerda'] } } },
                { id: 'reloj', e: '🕰️', n: 'Reloj', x: 52, y: 60, look: [['reloj_ok', `El reloj marca: aguja corta en el ${h}, aguja larga en el ${mm / 5}.`], 'Un reloj parado, sin cuerda.'],
                    use: [{ item: 'cuerda', then: { t: `Das cuerda al reloj. Se mueve un poco y se para con la aguja corta en el ${h} y la larga en el ${mm / 5}.`, set: ['reloj_ok'], note: `Reloj: corta en ${h}, larga en ${mm / 5} (la larga son minutos).` } }] },
                { id: 'caja', e: '🔐', n: 'Caja fuerte', x: 70, y: 70, look: [['caja:open', 'La caja fuerte está abierta.'], 'Una caja fuerte de 3 cifras: «la hora del reloj, sin los dos puntos».'],
                    lock: { k: 'digits', len: 3, ans: `${h}${pad2(mm)}`, q: 'Caja fuerte: 3 cifras.', if: 'reloj_ok', then: { t: 'Dentro está la llave de salida.', give: ['llave'] } } },
                door(88, 30)
            ],
            items: { cuerda: { e: '🔑', n: 'Llave de cuerda', d: 'Para dar cuerda a un reloj.' }, llave: KEY },
            hints: [
                { until: 'cofre:open', t: `En flechas: ${path.map(p => E().DIRS[p]).join(' ')}.` },
                { until: 'reloj_ok', t: 'Da cuerda al reloj.' },
                { until: 'got:llave', t: `Aguja larga en el ${mm / 5} = ${pad2(mm)} minutos: ${h}:${pad2(mm)}.` },
                { t: 'Usa la llave en la puerta.' }
            ]
        };
    });

    // 5 · El corral
    T.push((r) => {
        const g = r.int(2, 9), p = r.int(2, 9);
        const [rq, ra] = r.pick(RIDDLES);
        return {
            name: 'El corral', emoji: '🐓', bg: ['#3d3018', '#171208'],
            intro: 'Te has quedado encerrado en el corral de la granja. El granjero es muy aficionado a los acertijos.',
            objs: [
                { id: 'corral', e: '🐖', n: 'Gallinas y cerdos', x: 16, y: 26, look: `Cuentas ${g + p} cabezas y ${2 * g + 4 * p} patas entre gallinas y cerdos.`, note: `Corral: ${g + p} cabezas, ${2 * g + 4 * p} patas.` },
                { id: 'arcon', e: '🧰', n: 'Arcón', x: 22, y: 66, look: [['arcon:open', 'El arcón está abierto.'], 'Un arcón con candado de 2 cifras: «gallinas y, después, cerdos».'],
                    lock: { k: 'digits', len: 2, ans: `${g}${p}`, q: 'Candado del arcón: 2 cifras.', then: { t: 'Dentro hay una pala.', give: ['pala'] } } },
                { id: 'paja', e: '🌾', n: 'Montón de paja', x: 46, y: 64, look: [['got:caja', 'Ya no hay nada bajo la paja.'], 'Un montón de paja muy alto. Algo duro asoma debajo, pero está muy enterrado.'],
                    use: [{ item: 'pala', then: { t: 'Apartas la paja con la pala: hay una cajita con un acertijo.', give: ['caja'] } }] },
                { id: 'granjero', e: '👨‍🌾', n: 'Retrato del granjero', x: 46, y: 22, look: '«Para salir de mi corral, resuelve mis acertijos.»' },
                { id: 'cerradura', e: '🔒', n: 'Cerradura de letras', x: 70, y: 66, look: 'Una cerradura de letras junto a un gancho donde cuelga la llave.',
                    lock: { k: 'word', ans: ra, q: 'Cerradura de letras.', if: 'got:caja', then: { t: 'La cerradura cede y coges la llave.', give: ['llave'] } } },
                door()
            ],
            items: { pala: { e: '🪏', n: 'Pala', d: 'Una pala.' }, caja: { e: '📦', n: 'Cajita', d: `Dentro hay un papel: «${rq}».`, note: `Acertijo: «${rq}»` }, llave: KEY },
            hints: [
                { until: 'arcon:open', t: `Si todos fueran gallinas habría ${2 * (g + p)} patas; cada cerdo suma 2 más.` },
                { until: 'got:caja', t: 'Usa la pala en la paja.' },
                { until: 'got:llave', t: `La respuesta es ${ra}.` },
                { t: 'Usa la llave en la puerta.' }
            ]
        };
    });

    // 6 · Romanos y espejos
    T.push((r) => {
        const nums = [r.int(11, 39), r.int(11, 39), r.int(11, 39)];
        const w = r.pick(WORDS);
        return {
            name: 'Romanos y espejos', emoji: '🏛️', bg: ['#2f2a24', '#12100c'],
            intro: 'Una sala romana llena de espejos. Las inscripciones y los reflejos esconden la salida.',
            objs: [
                { id: 'columnas', e: '🏛️', n: 'Columnas', x: 16, y: 22, look: `Tres columnas con inscripciones: ${nums.map(ROMAN_FULL).join(' · ')}.`, note: `Columnas: ${nums.map(ROMAN_FULL).join(' · ')}.` },
                { id: 'placa', e: '🪧', n: 'Placa', x: 38, y: 22, look: '«El arca se abre con los números de las columnas, cada uno con dos cifras.»' },
                { id: 'arca', e: '🧰', n: 'Arca', x: 22, y: 66, look: [['arca:open', 'El arca está abierta.'], 'Un arca con candado de 6 cifras.'],
                    lock: { k: 'digits', len: 6, ans: nums.map(pad2).join(''), q: 'Candado del arca: 6 cifras.', then: { t: 'Dentro hay un paño para limpiar espejos.', give: ['pano'] } } },
                { id: 'espejo', e: '🪞', n: 'Espejo empañado', x: 56, y: 30, look: [['limpio', `En el espejo limpio se refleja una palabra: {{espejo:${w}}}`], 'Un espejo tan empañado que no refleja nada.'],
                    use: [{ item: 'pano', then: { t: 'Limpias el espejo. Ahora refleja una palabra escrita en la pared de enfrente.', set: ['limpio'] } }] },
                { id: 'puerta', e: '🚪', n: 'Puerta', x: 86, y: 54, look: '«Di lo que refleja el espejo.»',
                    lock: { k: 'word', ans: w, q: 'Cerradura de letras.', if: 'limpio', then: { t: 'La puerta se abre. ¡Salve, libre!', win: true } } }
            ],
            items: { pano: { e: '🧽', n: 'Paño', d: 'Un paño suave.' } },
            hints: [
                { until: 'arca:open', t: `Los números son ${nums.join(', ')}.` },
                { until: 'limpio', t: 'Limpia el espejo con el paño.' },
                { t: `La palabra reflejada es ${w}.` }
            ]
        };
    });

    // 7 · La radio y las letras
    T.push((r) => {
        const ds = [r.int(0, 9), r.int(0, 9), r.int(0, 9)];
        let w = r.pick(WORDS), mix = w;
        for (let i = 0; i < 10 && mix === w; i++) mix = r.shuffle(w.split('')).join('');
        return {
            name: 'La radio del faro', emoji: '📻', bg: ['#1c2c3a', '#0a1017'],
            intro: 'La tormenta te ha dejado encerrado en el faro. La vieja radio todavía emite un mensaje.',
            objs: [
                { id: 'radio', e: '📻', n: 'Radio', x: 16, y: 26, look: `La radio repite: ${ds.map(d => MORSE[d]).join('   ')}`, note: `Radio: ${ds.map(d => MORSE[d]).join(' / ')}` },
                { id: 'libro', e: '📘', n: 'Libro de Morse', x: 38, y: 22, look: `Números en Morse: ${MORSE.map((m, i) => `${i} ${m}`).join(' · ')}.` },
                { id: 'baul', e: '🧰', n: 'Baúl', x: 22, y: 66, look: [['baul:open', 'El baúl está abierto.'], 'Un baúl con candado de 3 cifras: «lo que dice la radio».'],
                    lock: { k: 'digits', len: 3, ans: ds.join(''), q: 'Candado del baúl: 3 cifras.', then: { t: 'Dentro hay unas fichas de letras.', give: ['fichas'] } } },
                { id: 'farol', e: '🏮', n: 'Farol', x: 60, y: 22, look: '«Ordena las fichas para formar la contraseña de la puerta.»' },
                { id: 'puerta', e: '🚪', n: 'Puerta del faro', x: 86, y: 54, look: 'Una puerta con cerradura de letras.',
                    lock: { k: 'word', ans: w, q: 'Cerradura de letras.', if: 'got:fichas', then: { t: 'La puerta se abre. La tormenta ya ha pasado.', win: true } } }
            ],
            items: { fichas: { e: '🔠', n: 'Fichas de letras', d: `Fichas desordenadas: ${mix.split('').join(' · ')}.`, note: `Fichas: ${mix.split('').join(' ')}` } },
            hints: [
                { until: 'baul:open', t: `Traduce cada grupo con el libro: ${ds.join(', ')}.` },
                { t: `Ordenadas, las fichas forman ${w}.` }
            ]
        };
    });

    // 8 · Binario y teléfono
    T.push((r) => {
        const a = r.int(5, 15), b = r.int(5, 15);
        const bin = (n) => n.toString(2).padStart(4, '0');
        const w = r.pick(WORDS);
        const code = w.split('').map(c => T9[c]).join('-');
        return {
            name: 'La centralita', emoji: '☎️', bg: ['#262a36', '#0e1015'],
            intro: 'Una vieja centralita telefónica. Los números hablan en binario y las teclas tienen letras.',
            objs: [
                { id: 'tarjetas', e: '🗂️', n: 'Tarjetas perforadas', x: 16, y: 22, look: `Dos tarjetas: «${bin(a)}» y «${bin(b)}». «Súmalas en decimal.»`, note: `Binario: ${bin(a)} y ${bin(b)}.` },
                { id: 'chuleta', e: '📄', n: 'Chuleta', x: 38, y: 22, look: 'Binario: de derecha a izquierda las cifras valen 1, 2, 4 y 8.' },
                { id: 'caja', e: '🔐', n: 'Caja', x: 22, y: 66, look: [['caja:open', 'La caja está abierta.'], 'Una caja con candado de 2 cifras.'],
                    lock: { k: 'digits', len: 2, ans: pad2(a + b), q: 'Candado de la caja: 2 cifras.', then: { t: `Dentro hay una nota: «La puerta: la palabra que se marca ${code}».`, note: `Puerta: palabra que se marca ${code}.`, set: ['nota'] } } },
                { id: 'telefono', e: '☎️', n: 'Teléfono', x: 56, y: 60, look: 'Teclas: 2 ABC · 3 DEF · 4 GHI · 5 JKL · 6 MNO · 7 PQRS · 8 TUV · 9 WXYZ.' },
                { id: 'puerta', e: '🚪', n: 'Puerta', x: 86, y: 54, look: 'Una puerta con cerradura de letras.',
                    lock: { k: 'word', ans: w, q: 'Cerradura de letras.', if: 'nota', then: { t: '¡Conectado! La puerta se abre.', win: true } } }
            ],
            items: {},
            hints: [
                { until: 'caja:open', t: `${bin(a)} = ${a} y ${bin(b)} = ${b}.` },
                { t: `Con las letras del teléfono, ${code} es ${w}.` }
            ]
        };
    });

    // 9 · Las cajas que pesan
    T.push((r) => {
        const cols = r.sample(['rojo', 'azul', 'verde', 'amarillo', 'morado'], 3);   // de más pesada a más ligera
        const [h, m, l] = cols;
        const clues = r.shuffle([`La ${OBJ_COLORS[h]} pesa más que la ${OBJ_COLORS[m]}.`, `La ${OBJ_COLORS[l]} pesa menos que la ${OBJ_COLORS[m]}.`]);
        const n1 = r.int(2, 6), n2 = r.int(2, 6), n3 = r.int(2, 6);
        return {
            name: 'El almacén de cajas', emoji: '📦', bg: ['#3a2f22', '#15110b'],
            intro: 'Un almacén portuario con cajas de colores. La salida es un montacargas que necesita orden y números.',
            objs: [
                { id: 'cajas', e: '📦', n: 'Cajas de colores', x: 16, y: 26, look: `Tres cajas: ${cols.slice().sort().map(c => OBJ_COLORS[c]).join(', ')}. Un papel: «${clues.join(' ')}».`, note: `Cajas: ${clues.join(' ')}` },
                { id: 'bascula', e: '⚖️', n: 'Báscula', x: 26, y: 66, look: [['bascula:open', 'La báscula se ha desbloqueado.'], 'La báscula pide los colores de la caja más pesada a la más ligera.'],
                    lock: { k: 'colors', len: 3, ans: cols, q: 'De la más pesada a la más ligera.', then: { t: 'La báscula suelta una ficha del montacargas.', give: ['ficha'] } } },
                { id: 'estante', e: '🗄️', n: 'Estantería', x: 46, y: 22, look: `En la estantería hay ${n1} cuerdas, ${n2} cascos y ${n3} linternas.`, note: `Estantería: ${n1} cuerdas, ${n2} cascos, ${n3} linternas.` },
                { id: 'panel', e: '🎛️', n: 'Panel del montacargas', x: 66, y: 66, look: 'Una ranura para fichas y un teclado: «cascos, linternas, cuerdas». 3 cifras.',
                    lock: { k: 'digits', len: 3, ans: `${n2}${n3}${n1}`, q: 'Teclado del montacargas: 3 cifras.', if: 'got:ficha', then: { t: 'El montacargas sube y te deja en la calle. ¡Libre!', win: true } } }
            ],
            items: { ficha: { e: '🪙', n: 'Ficha', d: 'Una ficha del montacargas.' } },
            hints: [
                { until: 'bascula:open', t: `De más pesada a más ligera: ${cols.join(', ')}.` },
                { t: `Cascos ${n2}, linternas ${n3}, cuerdas ${n1}.` }
            ]
        };
    });

    // 10 · El calendario maya
    T.push((r) => {
        const nums = [r.int(6, 19), r.int(6, 19), r.int(6, 19)];
        const [rq, ra] = r.pick(RIDDLES);
        return {
            name: 'El calendario maya', emoji: '🗿', bg: ['#1f3a28', '#0b160f'],
            intro: 'Una cámara del templo con un calendario de piedra. Los mayas contaban con puntos y barras.',
            objs: [
                { id: 'mural', e: '🧱', n: 'Mural', x: 16, y: 22, look: 'Números mayas: ● = 1, ▬ = 5.' },
                { id: 'calendario', e: '🌀', n: 'Calendario', x: 40, y: 22, look: `Tres glifos: [${nums.map(maya).join('] · [')}].`, note: `Glifos: [${nums.map(maya).join('] [')}]` },
                { id: 'estela', e: '🪨', n: 'Estela', x: 22, y: 66, look: [['estela:open', 'La estela se ha abierto.'], 'Unas ruedas de 6 cifras: «cada glifo con dos cifras».'],
                    lock: { k: 'digits', len: 6, ans: nums.map(pad2).join(''), q: 'Ruedas de la estela: 6 cifras.', then: { t: 'Se abre un hueco con un códice.', give: ['codice'] } } },
                { id: 'puerta', e: '🚪', n: 'Puerta de piedra', x: 86, y: 54, look: 'Una puerta de piedra con letras talladas.',
                    lock: { k: 'word', ans: ra, q: 'Puerta: la respuesta del códice.', if: 'got:codice', then: { t: 'La piedra se desliza y sales a la selva.', win: true } } }
            ],
            items: { codice: { e: '📜', n: 'Códice', d: `Un acertijo pintado: «${rq}».`, note: `Códice: «${rq}»` } },
            hints: [
                { until: 'estela:open', t: `Los glifos valen ${nums.join(', ')}.` },
                { t: `La respuesta es ${ra}.` }
            ]
        };
    });

    const EPOCH = Date.UTC(2026, 0, 1);
    const dayIndex = (date) => Math.round((Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) - EPOCH) / 86400000);

    /** Sala diaria de una fecha «AAAA-MM-DD». */
    function build(date, forceTemplate) {
        const idx = forceTemplate !== undefined ? forceTemplate : ((dayIndex(date) % T.length) + T.length) % T.length;
        const r = E().rng('escape:' + date + ':' + idx);
        const room = T[idx](r);
        room.id = 'daily-' + date;
        room.tpl = idx;
        room.number = dayIndex(date) + 1;
        return room;
    }

    Nexus.games.escapeDaily = { build, count: T.length, dayIndex, ROMAN, caesar };
})();
