/* ============================================================
   NEXUS ARCADE · games/pasapalabra/bank.js
   Banco de definiciones del Pasapalabra. 12 por letra y nivel (300 por nivel, 1.200 en total).
   Formato por línea:  LETRA|definición|respuesta[|alternativas separadas por coma]
   Letras: A B C D E F G H I J L M N Ñ O P Q R S T U V X Y Z (25).
   «Empieza por…» salvo Ñ y X, que son «Contiene la…».
   ============================================================ */
(function () {
    'use strict';

    const RAW = {
        basic: `
A|Líquido transparente e incoloro que bebemos para no tener sed.|agua
A|Insecto que fabrica miel y vive en colmenas.|abeja
A|Cuarto mes del año.|abril
A|Vehículo con alas y motores que transporta pasajeros por el aire.|avión|avion
B|Embarcación grande que navega por el mar.|barco
B|Mamífero marino más grande del mundo.|ballena
B|Establecimiento donde se guarda y gestiona el dinero.|banco
B|Lugar con muchos libros que se pueden leer o pedir prestados.|biblioteca
C|Lugar donde vive una familia.|casa
C|Animal con crines y cola largas que se monta.|caballo
C|Cubierto que se usa para tomar sopa.|cuchara
C|Prenda de vestir con cuello y botones que cubre el torso.|camisa
D|Cubo con puntos del uno al seis que se lanza en los juegos de mesa.|dado
D|Mamífero marino muy inteligente que salta y emite chasquidos.|delfín|delfin
D|Día de la semana que viene después del sábado.|domingo
D|Médico que cuida los dientes.|dentista
E|Animal enorme con trompa y colmillos.|elefante
E|Lugar al que van los niños a aprender.|escuela|colegio
E|Superficie de cristal en la que te ves reflejado.|espejo
E|Punto brillante que vemos en el cielo por la noche.|estrella
F|Deporte con balón y dos porterías.|fútbol|futbol
F|Fruta roja y pequeña con las semillas por fuera.|fresa
F|Tienda donde venden medicinas.|farmacia
F|Parte de la planta que tiene pétalos de colores y perfume.|flor
G|Felino doméstico que maúlla y caza ratones.|gato
G|Lentes que usan las personas que no ven bien.|gafas
G|Instrumento musical de seis cuerdas.|guitarra
G|Ave de corral que pone huevos.|gallina
H|Postre frío y cremoso que se toma en cucurucho.|helado
H|Edificio donde se atiende a los enfermos.|hospital
H|Lo que pone la gallina.|huevo
H|Insecto pequeño que vive en colonias y carga comida sobre su espalda.|hormiga
I|Porción de tierra rodeada de agua por todas partes.|isla
I|Templo cristiano.|iglesia
I|Estación más fría del año.|invierno
I|Objeto que atrae el hierro.|imán|iman
J|Animal africano de cuello larguísimo.|jirafa
J|Terreno con plantas y flores junto a una casa.|jardín|jardin
J|Se usa con agua para lavarse las manos.|jabón|jabon
J|Día de la semana entre el miércoles y el viernes.|jueves
L|Satélite natural de la Tierra.|luna
L|Rey de la selva.|león|leon
L|Conjunto de páginas encuadernadas para leer.|libro
L|Cítrico amarillo y muy ácido.|limón|limon
M|Fruta que según la leyenda cayó sobre la cabeza de Newton.|manzana
M|Insecto de alas coloridas que antes fue oruga.|mariposa
M|Primate que trepa a los árboles y adora los plátanos.|mono
M|Arte de combinar sonidos de forma agradable.|música|musica
N|Masa blanca o gris que flota en el cielo.|nube
N|Fruta cítrica dulce, de gajos jugosos, cuyo zumo se toma en el desayuno.|naranja
N|Parte de la cara con la que olemos.|nariz
N|Periodo del día en que no hay luz del sol.|noche
Ñ|Periodo de doce meses.|año|ano
Ñ|Persona de corta edad.|niño|nino
Ñ|País europeo cuya capital es Madrid.|España|espana
Ñ|Gran elevación natural del terreno.|montaña|montana
O|Animal grande y peludo que hiberna en invierno.|oso
O|Animal de granja que da lana.|oveja
O|Estación del año entre el verano y el invierno.|otoño|otono
O|Órgano de la vista.|ojo
P|Animal doméstico que ladra.|perro
P|Alimento que se hace con harina, agua y levadura y se hornea.|pan
P|Esfera que se usa en muchos deportes.|pelota
P|Fruta amarilla y alargada que gusta a los monos.|plátano|platano
Q|Alimento sólido que se obtiene al cuajar la leche.|queso
Q|Número que sigue al catorce.|quince
Q|Consumir o destruir algo con fuego.|quemar
Q|Ciencia que estudia la composición de la materia.|química|quimica
R|Pequeño roedor al que persigue el gato.|ratón|raton
R|Color de la sangre.|rojo
R|Anfibio verde que croa y salta.|rana
R|Instrumento que marca la hora.|reloj
S|Estrella que ilumina la Tierra durante el día.|sol
S|Asiento con respaldo para una sola persona.|silla
S|Reptil sin patas que se desplaza arrastrándose.|serpiente
S|Día de la semana anterior al domingo.|sábado|sabado
T|Vehículo que circula sobre raíles.|tren
T|Fruto rojo y redondo que se usa en ensaladas y salsas.|tomate
T|Felino de rayas negras que vive en la selva asiática.|tigre
T|Aparato que sirve para hablar con alguien a distancia.|teléfono|telefono
U|Fruto del que se obtiene el vino.|uva
U|Parte dura que protege la punta de los dedos.|uña|una
U|Caballo mitológico con un cuerno en la frente.|unicornio
U|Primer número natural.|uno
V|Animal que da leche y dice muu.|vaca
V|Estación más calurosa del año.|verano
V|Abertura en la pared por la que entra la luz.|ventana
V|Montaña que expulsa lava.|volcán|volcan
X|Coche con conductor que se alquila para un trayecto.|taxi
X|Prueba que se hace en la escuela para evaluar lo aprendido.|examen
X|Instrumento de viento metálico y curvo, típico del jazz.|saxofón|saxofon|saxo
X|Deporte de combate en el que se pelea con guantes.|boxeo
Y|Barco de lujo que se usa para recreo.|yate
Y|Parte amarilla del huevo.|yema
Y|Lácteo fermentado que se toma con cuchara.|yogur|yogurt
Y|Disciplina de origen indio con posturas y respiración.|yoga
Z|Calzado que cubre el pie.|zapato
Z|Animal astuto parecido a un perro, de cola poblada.|zorro
Z|Hortaliza naranja que le gusta a los conejos.|zanahoria
Z|Parque donde se exhiben animales salvajes.|zoológico|zoologico|zoo
A|Planta grande con tronco, ramas y hojas.|árbol
A|Color del cielo en un día despejado.|azul
A|Bulbo de sabor fuerte que se usa mucho en la cocina y aleja a los vampiros.|ajo
A|Pequeño roedor de cola peluda que vive en los árboles y come piñas y nueces.|ardilla
A|Cojín sobre el que apoyas la cabeza para dormir.|almohada
A|Padre de tu padre o de tu madre.|abuelo
A|Vehículo con sirena que lleva a los enfermos al hospital.|ambulancia
A|Sustancia dulce y blanca que se echa al café.|azúcar
B|Parte de la cara por la que comemos y hablamos.|boca
B|Vehículo de dos ruedas que se mueve pedaleando.|bicicleta|bici
B|Persona que apaga incendios.|bombero
B|Animal parecido al caballo, de orejas largas, que rebuzna.|burro
B|Instrumento para escribir con tinta que lleva una bolita en la punta.|bolígrafo|boli
B|Niño muy pequeño que todavía no anda.|bebé
B|Tela con colores que representa a un país.|bandera
B|Prenda larga que se enrolla al cuello para el frío.|bufanda
C|Mueble en el que dormimos.|cama
C|Animal africano parecido al caballo con rayas blancas y negras.|cebra
C|Habitación de la casa donde se preparan las comidas.|cocina
C|Vehículo de cuatro ruedas con motor para ir por carretera.|coche|carro
C|Molusco lento que lleva su casa a cuestas.|caracol
C|Animal de granja rosado que hace «oinc».|cerdo|cochino
C|Espacio azul que vemos sobre nuestras cabezas.|cielo
C|Animal de orejas largas que come zanahorias.|conejo
D|Cada una de las cinco partes en que termina la mano.|dedo
D|Pieza blanca y dura de la boca que sirve para masticar.|diente
D|Animal fabuloso que echa fuego por la boca.|dragón
D|Último mes del año.|diciembre
D|Agua que cae desde arriba para lavarse el cuerpo.|ducha
D|Monedas y billetes con los que se compran cosas.|dinero
D|Primera comida del día.|desayuno
D|Número que va después del nueve.|diez
E|Primer mes del año.|enero
E|Persona que cuida a los enfermos en el hospital junto al médico.|enfermera|enfermero
E|Utensilio con palo y cerdas para barrer.|escoba
E|Plato frío de lechuga, tomate y otras verduras aliñadas.|ensalada
E|Pequeño mamífero cubierto de púas que se hace una bola.|erizo
E|Deporte que se practica deslizándose por la nieve con tablas largas.|esquí
E|Arma blanca de hoja larga y afilada.|espada
E|Construcción grande con varios pisos.|edificio
F|Mamífero marino con bigotes que aplaude con las aletas en los acuarios.|foca
F|Llamas y calor que produce algo al arder.|fuego
F|Prenda que cuelga desde la cintura y no separa las piernas.|falda
F|Padres, hijos, hermanos, abuelos…|familia
F|Espíritu que se cubre con una sábana en los cuentos de miedo.|fantasma
F|Ave rosa de patas larguísimas que duerme sobre una sola pata.|flamenco
F|Segundo mes del año.|febrero
F|Alimento dulce que dan las plantas, como la pera o la manzana.|fruta
G|Bolsa de goma que se infla con aire en las fiestas.|globo
G|El mayor de los simios, muy fuerte, que se golpea el pecho.|gorila
G|Prenda que cubre la cabeza para el frío.|gorro
G|Lugar en el campo donde se crían animales y se cultiva.|granja
G|Prenda que cubre la mano con un hueco para cada dedo.|guante
G|Animal pequeño, blando y alargado sin patas que vive bajo tierra.|gusano
G|Ave marina blanca y gris que vuela sobre los puertos.|gaviota
G|Dulce pequeño, plano y crujiente hecho al horno.|galleta
H|Parte verde y plana de las plantas que cae en otoño.|hoja
H|Agua congelada.|hielo
H|Hijo de tus mismos padres.|hermano
H|Bocadillo redondo de carne picada típico de la comida rápida.|hamburguesa
H|Mamífero africano enorme que pasa el día dentro del agua.|hipopótamo
H|Ser mágico de los cuentos con alas y varita.|hada
H|Herramienta con mango y hoja afilada para cortar leña.|hacha
H|Polvo blanco que se obtiene del trigo y se usa para hacer pan.|harina
I|Reptil verde parecido a un lagarto grande con cresta.|iguana
I|Animal pequeño con seis patas, como la hormiga o la mosca.|insecto
I|Lengua que se habla en un país, como el inglés o el francés.|idioma
I|Aparato conectado al ordenador que saca los documentos en papel.|impresora
I|Persona a la que se llama para que acuda a una fiesta.|invitado|invitada
I|Fuego grande que destruye un edificio o un bosque.|incendio
I|Casa de bloques de hielo de los pueblos del Ártico.|iglú
I|Persona que diseña puentes, máquinas o carreteras.|ingeniero|ingeniera
J|Pata trasera del cerdo curada y salada.|jamón
J|Objeto con el que juegan los niños.|juguete
J|Recipiente con asa y pico para servir agua.|jarra
J|Caja con barrotes donde se encierra a un pájaro.|jaula
J|Adorno de oro, plata o piedras preciosas.|joya
J|Séptimo mes del año.|julio
J|Sexto mes del año.|junio
J|Persona que forma parte de un equipo deportivo.|jugador|jugadora
L|Barrita de madera con mina para escribir o dibujar.|lápiz
L|Líquido blanco que dan las vacas.|leche
L|Animal salvaje parecido a un perro que aúlla a la luna.|lobo
L|Agua que cae de las nubes.|lluvia
L|Verdura de hojas verdes que se come en ensalada.|lechuga
L|Órgano de la boca que sirve para saborear.|lengua
L|Primer día de la semana.|lunes
L|Insecto de cuerpo largo y cuatro alas transparentes que vuela sobre los estanques.|libélula
M|Mueble con patas y una tabla encima para comer o trabajar.|mesa
M|Mujer que tiene hijos.|madre|mamá,mama
M|Gran extensión de agua salada.|mar
M|Persona que cura a los enfermos.|médico|médica
M|Sustancia dulce que fabrican las abejas.|miel
M|Bolsa que se lleva a la espalda con los libros del colegio.|mochila
M|Mamífero que vuela de noche y duerme colgado boca abajo.|murciélago
M|Dibujo que representa la Tierra o una parte de ella.|mapa
N|Agua helada que cae del cielo en copos blancos.|nieve
N|Construcción de ramitas donde los pájaros ponen sus huevos.|nido
N|Moverse en el agua con brazos y piernas.|nadar
N|Signo con el que se cuentan las cosas, como 1, 2 o 3.|número
N|Número que va después del ocho.|nueve
N|Fruto seco de cáscara dura y arrugada.|nuez
N|Penúltimo mes del año.|noviembre
N|Electrodoméstico frío donde se guardan los alimentos.|nevera
Ñ|Fruta tropical con corona de hojas y cáscara rugosa.|piña
Ñ|Parte del día que va desde el amanecer hasta el mediodía.|mañana
Ñ|Juguete con forma de niña o de bebé.|muñeca
Ñ|Habitación de la casa con lavabo, ducha y retrete.|baño
Ñ|Madera que se quema en la chimenea.|leña
Ñ|Ganas de dormir.|sueño
Ñ|Fruto marrón que se asa en otoño y se vende en cucuruchos.|castaña
Ñ|Animal de ocho patas que teje telas.|araña
O|Parte de la cabeza con la que oímos.|oreja
O|Onda que forma el mar al romper en la playa.|ola
O|Metal precioso de color amarillo.|oro
O|Número que va después del siete.|ocho
O|Ave parecida al ganso que da nombre a un juego de mesa con dados.|oca
O|Máquina con pantalla y teclado para trabajar o jugar.|ordenador
O|Lugar donde trabajan personas con mesas y ordenadores.|oficina
O|Recipiente de cocina, redondo y hondo, para guisar.|olla
P|Animal con plumas y pico que vuela.|pájaro
P|Ave que nada en los estanques y hace «cuac».|pato
P|Animal que vive en el agua y respira por branquias.|pez
P|Artista de circo con nariz roja que hace reír.|payaso
P|Lugar con mucha agua para nadar.|piscina
P|Orilla del mar con arena.|playa
P|Hueco con hoja que se abre para entrar en una habitación.|puerta
P|Animal marino con ocho tentáculos.|pulpo
Q|Separar o apartar algo de su sitio.|quitar
Q|Amar o desear algo.|querer
Q|Que ocupa el lugar número cinco.|quinto
Q|Puesto pequeño en la calle donde se venden periódicos y chucherías.|quiosco
Q|Herida que se produce en la piel con el fuego.|quemadura
Q|Semilla andina muy nutritiva que se cocina como el arroz.|quinoa|quinua
Q|Bata japonesa de mangas anchas que se usa también en el judo.|quimono
Q|Expresión de dolor o de disgusto.|queja
R|Flor con espinas en el tallo, muy usada como regalo.|rosa
R|Pieza redonda que gira y permite moverse a los vehículos.|rueda
R|Corriente de agua que desemboca en el mar.|río
R|Lo que se da a alguien en su cumpleaños.|regalo
R|Hombre que reina en un país.|rey
R|Máquina que hace trabajos de forma automática.|robot
R|Articulación entre el muslo y la pierna.|rodilla
R|Chispa de luz muy potente que cae durante una tormenta.|rayo
S|Comida caliente y líquida que se toma con cuchara.|sopa
S|Fruta grande, verde por fuera y roja por dentro, típica del verano.|sandía
S|Condimento blanco que se obtiene del agua del mar o de minas.|sal
S|Prenda con ala que se pone en la cabeza para protegerse del sol.|sombrero
S|Anfibio parecido a la rana, de piel rugosa.|sapo
S|Conjunto de siete días.|semana
S|Ser fantástico, mitad mujer y mitad pez.|sirena
S|Instrumento pequeño que suena al soplar y que usa el árbitro.|silbato
T|Reptil con caparazón que camina muy despacio.|tortuga
T|Recipiente con asa para tomar el café o el té.|taza
T|Herramienta de dos hojas para cortar papel.|tijeras|tijera
T|Pez enorme y peligroso con muchos dientes afilados.|tiburón
T|Pieza de tela para secarse después de la ducha.|toalla
T|Instrumento de percusión que se toca con palillos.|tambor
T|Pastel de cumpleaños con velas.|tarta
T|Instrumento de viento de metal con tres pistones.|trompeta
U|Extender mantequilla o mermelada sobre el pan.|untar
U|Emplear algo para un fin.|usar|utilizar
U|Juntar dos o más cosas.|unir
U|Que va detrás de todos los demás.|último
U|Ave negra y blanca de cola larga que se lleva objetos brillantes.|urraca
U|Servicio del hospital que atiende los casos graves al momento.|urgencias|urgencia
U|Guitarrita hawaiana de cuatro cuerdas.|ukelele|ukulele
U|Que sirve para algo.|útil
V|Recipiente para beber agua.|vaso
V|Cilindro de cera con mecha que da luz.|vela
V|Aire en movimiento.|viento
V|Instrumento de cuerda que se toca con un arco apoyado en el hombro.|violín
V|Día de la semana que va antes del sábado.|viernes
V|Ser de las películas de miedo que chupa sangre.|vampiro
V|Prenda femenina de una sola pieza.|vestido
V|Color de la hierba.|verde
X|Gas que respiramos y que necesitan los seres vivos.|oxígeno
X|Que ocupa el lugar número seis.|sexto
X|Aparato rojo que sirve para apagar fuegos.|extintor
X|Persona que viaja para descubrir lugares desconocidos.|explorador|exploradora
X|Utensilio de cocina para sacar el zumo de las naranjas.|exprimidor
X|Hueco que hay debajo del brazo.|axila
X|Lámpara pequeña de mesa con brazo flexible.|flexo
X|Grito para pedir ayuda: «¡_____!».|auxilio
Y|Juguete de dos discos que sube y baja por una cuerda.|yoyó
Y|Material blanco con el que se inmoviliza un hueso roto.|yeso
Y|Marido de tu hija.|yerno
Y|Monstruo legendario y peludo del Himalaya.|yeti
Y|Arte marcial japonés que se practica con quimono y llaves.|yudo
Y|Moneda de Japón.|yen
Y|Juego al aire libre con pruebas y pistas por equipos.|yincana
Y|Pieza de madera que une a los bueyes para tirar del arado.|yugo
Z|Bebida que se obtiene al exprimir la fruta.|zumo
Z|Calzado deportivo.|zapatilla|zapatillas
Z|Parte de un lugar, como la del parque infantil.|zona
Z|Zapato de madera típico de Holanda.|zueco
Z|Fruto negro y silvestre de las zarzas.|zarzamora
Z|Globo dirigible con forma de puro.|zepelín
Z|Hoyo largo y estrecho que se cava en la tierra.|zanja
Z|Metal grisáceo con el que se cubren los tejados de algunos cobertizos.|zinc
`,
        medium: `
A|Profesional que defiende a otra persona ante un tribunal.|abogado
A|Ciencia que estudia la estructura del cuerpo de los seres vivos.|anatomía|anatomia
A|Piedra preciosa de color violeta.|amatista
A|Instrumento que mide la altura sobre el nivel del mar.|altímetro|altimetro
B|Instrumento que mide la presión atmosférica.|barómetro|barometro
B|Pieza metálica que permite que una puerta gire.|bisagra
B|Ave rapaz nocturna de grandes ojos y cabeza redonda.|búho|buho
B|Instrumento con una aguja imantada que señala el norte.|brújula|brujula
C|Persona que dibuja mapas.|cartógrafo|cartografo
C|Mecanismo de la puerta en el que se introduce la llave.|cerradura
C|Iglesia principal de una diócesis.|catedral
C|Astro con cola luminosa que orbita alrededor del Sol.|cometa
D|Reptil prehistórico gigante extinguido hace millones de años.|dinosaurio
D|Libro que recoge y define las palabras de una lengua.|diccionario
D|Lugar árido con muy pocas lluvias, como el Sáhara.|desierto
D|Piedra preciosa transparente, la más dura que existe.|diamante
E|Insecto de caparazón duro y fuerte, venerado en el Antiguo Egipto.|escarabajo
E|Sede oficial de un país en el territorio de otro.|embajada
E|Momento del año en que el día y la noche duran lo mismo.|equinoccio
E|Ocultación total o parcial de un astro por otro.|eclipse
F|Torre con una luz en lo alto que guía a los barcos.|faro
F|Resto de un ser vivo antiguo conservado en una roca.|fósil|fosil
F|Línea que separa dos países.|frontera
F|Proceso por el que las plantas fabrican su alimento con la luz.|fotosíntesis|fotosintesis
G|Gran masa de hielo que se desliza lentamente por una montaña.|glaciar
G|Parte de la lengua que estudia sus reglas.|gramática|gramatica
G|Enorme conjunto de estrellas, como la Vía Láctea.|galaxia
G|Luchador que combatía en los circos de la antigua Roma.|gladiador
H|Cada una de las dos mitades en que se divide la Tierra.|hemisferio
H|Pieza de hierro que se clava a los caballos en las pezuñas.|herradura
H|Línea donde parecen juntarse el cielo y la tierra.|horizonte
H|Mezcla de cemento, arena, grava y agua usada en construcción.|hormigón|hormigon
I|Gran bloque de hielo flotante en el mar.|iceberg
I|Máquina de Gutenberg que permitía reproducir textos.|imprenta
I|Lista detallada de los bienes de una persona o empresa.|inventario
I|Que no tiene fin ni límite.|infinito
J|Escritura egipcia que usa dibujos en lugar de letras.|jeroglífico|jeroglifico
J|Pájaro de canto melodioso con la cara roja.|jilguero
J|Grupo de ciudadanos que emite un veredicto en un juicio.|jurado
J|Tienda donde se venden alhajas.|joyería|joyeria
L|Lugar de caminos confusos del que es difícil salir; en él vivía el Minotauro.|laberinto
L|Aparato portátil que da luz.|linterna
L|Distancia en grados de un punto de la Tierra al ecuador.|latitud
L|Relato tradicional que mezcla hechos reales y fantásticos.|leyenda
M|Fragmento de roca espacial que cae sobre la Tierra.|meteorito
M|Elefante prehistórico cubierto de pelo.|mamut
M|Instrumento que permite ver cosas muy pequeñas.|microscopio
M|Lugar donde se compra y vende todo tipo de productos.|mercado
N|Planta acuática de grandes hojas flotantes y flores vistosas.|nenúfar|nenufar
N|Pueblo o persona que no tiene residencia fija.|nómada|nomada
N|Célula del sistema nervioso.|neurona
N|Persona que se salva de un naufragio.|náufrago|naufrago
Ñ|Celebración anual del día en que naciste.|cumpleaños|cumpleanos
Ñ|Cada uno de los pelos del borde del párpado.|pestaña|pestana
Ñ|Pieza de tela con la que uno se suena la nariz.|pañuelo|panuelo
Ñ|Casa pequeña y rústica en el campo.|cabaña|cabana
O|Conjunto de músicos con instrumentos diversos.|orquesta
O|Gran extensión de agua salada que cubre la Tierra.|océano|oceano
O|Monumento de piedra alargado y acabado en punta.|obelisco
O|Lugar con agua y vegetación en medio de un desierto.|oasis
P|Ave que no vuela y vive en el Polo Sur.|pingüino|pinguino
P|Monumento egipcio de base cuadrada y caras triangulares.|pirámide|piramide
P|Cuerpo celeste que gira alrededor de una estrella.|planeta
P|Artista que realiza cuadros.|pintor
Q|Sala donde se realizan las operaciones quirúrgicas.|quirófano|quirofano
Q|Monstruo mitológico; también, ilusión que se cree posible sin serlo.|quimera
Q|Grupo musical formado por cinco intérpretes.|quinteto
Q|Periodo de quince días.|quincena
R|Resplandor luminoso que precede al trueno.|relámpago|relampago
R|Edificio altísimo con muchos pisos.|rascacielos
R|Sistema que detecta objetos lejanos mediante ondas.|radar
R|Mamífero con un cuerno sobre el hocico y piel gruesa.|rinoceronte
S|Barco que navega bajo el agua.|submarino
S|Aparato con luces roja, amarilla y verde que regula el tráfico.|semáforo|semaforo
S|Aparato que registra los terremotos.|sismógrafo|sismografo
S|Momento del año en que el Sol alcanza su mayor o menor altura.|solsticio
T|Instrumento que mide la temperatura.|termómetro|termometro
T|Instrumento para observar astros lejanos.|telescopio
T|Fenómeno atmosférico con viento fuerte, lluvia, truenos y rayos.|tormenta
T|Figura geométrica de cuatro lados con dos paralelos.|trapecio
U|Centro de estudios superiores.|universidad
U|Herramienta de uso manual, como una cuchara o unas tijeras.|utensilio
U|Elemento químico radiactivo usado como combustible nuclear.|uranio
U|Traje igual para todos los miembros de un colegio o un cuerpo.|uniforme
V|Sensación de mareo que se siente ante una gran altura.|vértigo|vertigo
V|Persona que no come carne.|vegetariano
V|Viento muy fuerte que sopla con violencia.|vendaval
V|Armario con cristales para exponer objetos.|vitrina
X|Resultado muy favorable de una empresa o actividad.|éxito|exito
X|Persona nacida en otro país.|extranjero
X|Conjunto de palabras escritas que forma un escrito.|texto
X|Capa rojiza que se forma sobre el hierro con la humedad.|óxido|oxido
Y|Lugar con minerales o restos arqueológicos.|yacimiento
Y|Bloque de hierro sobre el que se forjan los metales.|yunque
Y|Hembra del caballo.|yegua
Y|Elemento químico usado como desinfectante, de color violeta.|yodo
Z|Piedra preciosa azul.|zafiro
Z|Franja del cielo con las doce constelaciones del horóscopo.|zodiaco|zodíaco
Z|Sonido continuo y grave, como el de una abeja.|zumbido
Z|Que usa preferentemente la mano izquierda.|zurdo
A|Construcción romana con arcos que llevaba agua a las ciudades.|acueducto
A|Conjunto de islas próximas entre sí.|archipiélago
A|Persona que viaja al espacio.|astronauta
A|Artista de circo que hace saltos y equilibrios difíciles.|acróbata
A|Traje de metal que protegía a los caballeros medievales.|armadura
A|Artesano que fabrica vasijas de barro.|alfarero|alfarera
A|Libro de mapas.|atlas
A|Juego de tablero con rey, reina, alfiles y peones.|ajedrez
B|Planta de tallo hueco y muy resistente que comen los pandas.|bambú
B|Persona que trabaja sumergida bajo el agua con escafandra.|buzo
B|Historia de la vida de una persona.|biografía
B|Gran bóvido de las praderas de Norteamérica, con joroba y mucho pelo.|bisonte
B|Pirata que atacaba las colonias españolas del Caribe.|bucanero
B|Esfera de aire o gas dentro de un líquido.|burbuja
B|Globo de cristal que da luz al pasar la corriente.|bombilla
B|Instrumento para pesar, con dos platillos.|balanza
C|Reptil que cambia de color para camuflarse.|camaleón
C|Fortaleza medieval con torres y murallas.|castillo
C|Hoyo en la superficie de la Luna o en la boca de un volcán.|cráter
C|Ave zancuda que anida en los campanarios.|cigüeña|ciguena
C|Grupo de estrellas que forman una figura, como la Osa Mayor.|constelación
C|Hoja o cuadernillo con los días, semanas y meses del año.|calendario
C|Persona que trabaja la madera.|carpintero|carpintera
C|Marsupial australiano que da grandes saltos.|canguro
D|Camello de una sola joroba.|dromedario
D|Escritor de obras de teatro.|dramaturgo|dramaturga
D|Desembocadura de un río en forma de triángulo.|delta
D|Muro que contiene las aguas del mar o de un río.|dique
D|Explosivo inventado por Alfred Nobel.|dinamita
D|Personaje mágico y pequeño de las leyendas, travieso y juguetón.|duende
D|Sistema de gobierno en el que el pueblo elige a sus representantes.|democracia
D|Título o certificado que acredita unos estudios.|diploma
E|Artista que hace estatuas.|escultor|escultora
E|Formación de roca que cuelga del techo de las cuevas.|estalactita
E|Línea imaginaria que divide la Tierra en dos hemisferios.|ecuador
E|Obra que reúne el saber de todas las materias, ordenado alfabéticamente.|enciclopedia
E|Desgaste del terreno producido por el agua o el viento.|erosión
E|Canal de mar angosto entre dos tierras, como el de Gibraltar.|estrecho
E|Lago artificial formado por una presa.|embalse
E|Monumento egipcio con cuerpo de león y cabeza humana.|esfinge
F|Relato breve con animales que deja una moraleja.|fábula
F|Barco de guerra de tamaño medio.|fragata
F|Ave mitológica que renace de sus cenizas.|fénix
F|Entrada estrecha del mar entre montañas, típica de Noruega.|fiordo
F|Afición a coleccionar sellos.|filatelia
F|Instrumento de viento con agujeros que se toca de lado.|flauta
F|Proceso por el que el mosto se transforma en vino.|fermentación
F|Médico que examina cadáveres para la justicia.|forense
G|Fuente de agua caliente que sale a chorro de la tierra.|géiser
G|Felino más veloz del mundo.|guepardo
G|Barca típica de los canales de Venecia.|góndola
G|Deportista que hace ejercicios en anillas, barras o suelo.|gimnasta
G|Lluvia de bolitas de hielo.|granizo
G|Flor amarilla que se orienta hacia el sol.|girasol
G|Instrumento de viento con un fuelle, típico de Galicia y Escocia.|gaita
G|Ciencia que estudia la herencia biológica y los genes.|genética
H|Ave rapaz muy veloz usada en cetrería.|halcón
H|Animal carroñero africano que parece reírse.|hiena
H|Elemento químico más ligero, de símbolo H.|hidrógeno
H|Pieza con aspas que hace avanzar a barcos y aviones.|hélice
H|Tormenta tropical con vientos muy fuertes que giran.|huracán
H|Polígono de seis lados.|hexágono
H|Animal que se alimenta solo de plantas.|herbívoro
H|Archivo donde se guardan periódicos y revistas.|hemeroteca
I|Artista que hace los dibujos de un libro.|ilustrador|ilustradora
I|Diente delantero que sirve para cortar.|incisivo
I|Recinto de cristal o plástico para cultivar plantas protegidas del frío.|invernadero
I|Franja estrecha de tierra que une dos continentes, como el de Panamá.|istmo
I|Prenda que no deja pasar el agua de la lluvia.|impermeable
I|Estado gobernado por un emperador.|imperio
I|Persona que vive de alquiler.|inquilino|inquilina
I|Persona que traduce de palabra de un idioma a otro.|intérprete
J|Gran felino americano de piel con manchas.|jaguar
J|Piedra verde muy apreciada en China.|jade
J|Persona que monta a caballo.|jinete
J|Cerdo salvaje con colmillos.|jabalí
J|Raíz picante usada en la cocina oriental y en infusiones.|jengibre
J|Medicina líquida y dulce para la tos.|jarabe
J|Tiempo que se dedica al trabajo cada día.|jornada
J|Artista ambulante medieval que recitaba y cantaba.|juglar
L|Roca fundida que sale de un volcán.|lava
L|Lengua de los antiguos romanos.|latín
L|Instrumento de cuerda medieval de caja abombada.|laúd
L|Especialista que trata los problemas del habla.|logopeda
L|Felino de orejas puntiagudas con pinceles negros, como el ibérico.|lince
L|Lente que aumenta el tamaño de lo que se mira.|lupa
L|Distancia en grados desde un punto al meridiano de Greenwich.|longitud
L|Fruto en vaina, como la lenteja o el garbanzo.|legumbre
M|Cadáver embalsamado del antiguo Egipto.|momia
M|Línea imaginaria que une los polos.|meridiano
M|Dibujo hecho con pequeñas piezas de colores.|mosaico
M|Roca fundida bajo la corteza terrestre.|magma
M|Edificio con aspas que muele el grano con la fuerza del viento.|molino
M|Animal marino gelatinoso con tentáculos que pican.|medusa
M|Mamífero cuya hembra lleva a las crías en una bolsa.|marsupial
M|Carrera a pie de algo más de 42 kilómetros.|maratón
N|Cetáceo del Ártico con un largo colmillo en espiral.|narval
N|Líquido dulce de las flores que liban las abejas.|néctar
N|Mamífero acuático de río, de pelo pardo y muy juguetón.|nutria
N|Cubierta de caucho de las ruedas.|neumático
N|Gas que forma la mayor parte del aire, de símbolo N.|nitrógeno
N|Funcionario que da fe de contratos y testamentos.|notario|notaria
N|Obra literaria extensa en prosa, como «Don Quijote».|novela
N|Sustancia brillante del interior de algunas conchas.|nácar
Ñ|Ave sudamericana parecida al avestruz.|ñandú
Ñ|Recipiente lleno de dulces que se rompe a palos en las fiestas.|piñata
Ñ|Persona que vive sola y aislada para rezar.|ermitaño
Ñ|Pieza de artillería que dispara balas grandes.|cañón
Ñ|Herramienta de hoja curva para segar hierba.|guadaña
Ñ|Persona que corta árboles en el bosque.|leñador
Ñ|Grupo de ovejas.|rebaño
Ñ|Cantidad que cabe en la mano cerrada.|puñado
O|Primate de pelo rojizo de Borneo y Sumatra.|orangután
O|Mamífero australiano con pico de pato que pone huevos.|ornitorrinco
O|Respuesta de los dioses en la Antigüedad, como el de Delfos.|oráculo
O|Trayectoria de un planeta alrededor del Sol.|órbita
O|Instrumento de viento de madera con lengüeta doble.|oboe
O|Capa de la atmósfera que nos protege de los rayos ultravioleta.|ozono
O|Nombre técnico del médico que cuida los dientes.|odontólogo|odontóloga
O|Competición deportiva internacional que se celebra cada cuatro años.|olimpiada|olimpiadas
P|Polígono de cinco lados.|pentágono
P|Soporte de escritura de los egipcios hecho con una planta.|papiro
P|Científico que estudia los fósiles.|paleontólogo|paleontóloga
P|Tierra rodeada de agua por todas partes menos por una.|península
P|Órgano con el que respiramos.|pulmón
P|Cuerpo de cristal que descompone la luz en colores.|prisma
P|Felino americano de color pardo, también llamado león de montaña.|puma
P|Cámara donde se reúnen los diputados elegidos.|parlamento
Q|Pieza que va de proa a popa por la parte inferior de un barco.|quilla
Q|Mandíbula de un animal.|quijada
Q|Apuesta en la que se pronostican los resultados del fútbol.|quiniela
Q|Ave sagrada de los mayas, de plumas verdes y cola larguísima.|quetzal
Q|Unidad que mide la pureza del oro.|quilate
Q|Ángel niño que aparece en cuadros religiosos.|querubín
Q|Peso antiguo de cien libras; «pesar un _____».|quintal
Q|Tortilla de maíz mexicana rellena de queso fundido.|quesadilla
R|Ciervo de los países fríos que tira del trineo de Papá Noel.|reno
R|Animal de sangre fría que se arrastra, como el lagarto o la serpiente.|reptil
R|Imagen de los huesos obtenida con rayos X.|radiografía
R|Agua o viento que gira rápidamente en círculos.|remolino
R|Piedra preciosa de color rojo.|rubí
R|Pájaro famoso por la belleza de su canto nocturno.|ruiseñor|ruisenor
R|Juego de piezas que hay que encajar para formar una imagen.|rompecabezas
R|Competición de barcos de vela o remo.|regata
S|Llanura tropical con hierba alta y pocos árboles.|sabana
S|Cuerpo que gira alrededor de un planeta.|satélite
S|Ataúd de piedra de los faraones.|sarcófago
S|Pez rosado que remonta los ríos para desovar.|salmón
S|Árbol de orilla de río; uno de ellos es «llorón».|sauce
S|Obra musical extensa para orquesta, como la Novena de Beethoven.|sinfonía
S|Cada golpe de voz en que se divide una palabra.|sílaba
S|Árbol gigante de California, de los más altos del mundo.|secuoya
T|Llanura helada sin árboles de las regiones árticas.|tundra
T|Torbellino de viento muy violento con forma de embudo.|tornado
T|Planta de hojas con tres foliolos; la de cuatro da suerte.|trébol
T|Ave tropical con un pico enorme y colorido.|tucán
T|Rampa de juego para deslizarse.|tobogán
T|Membrana del oído que vibra con el sonido.|tímpano
T|Ola gigantesca causada por un terremoto submarino.|tsunami
T|Voz masculina más aguda.|tenor
U|Radiación invisible del sol que broncea la piel.|ultravioleta
U|Caja donde se depositan los votos.|urna
U|Disciplina que planifica el crecimiento de las ciudades.|urbanismo
U|Mamífero con pezuñas, como el caballo o la vaca.|ungulado
U|Glándula mamaria de la vaca o de la cabra.|ubre
U|Que tiene el mismo tono que otro sonido: cantar al _____.|unísono
U|Gallinácea grande de los bosques que canta en primavera.|urogallo
U|Médico especialista en riñones y vías urinarias.|urólogo|uróloga
V|Figura giratoria en los tejados que indica la dirección del viento.|veleta
V|Preparado que protege contra una enfermedad.|vacuna
V|Artista que habla sin mover los labios con un muñeco.|ventrílocuo
V|Guerrero navegante escandinavo de la Edad Media.|vikingo
V|Serpiente venenosa de cabeza triangular.|víbora
V|Representante del rey en un territorio, como el de Nueva España.|virrey
V|Unidad de potencia eléctrica.|vatio
V|Baile de ritmo de tres por cuatro típico de Viena.|vals
X|Instrumento de percusión de láminas de madera.|xilófono
X|Parte del cuerpo entre el cuello y el abdomen.|tórax
X|Expulsión o salida forzosa de alguien de su patria.|exilio
X|Vocabulario de un idioma.|léxico
X|Hueso de la mandíbula.|maxilar
X|Máquina con pala para remover tierra.|excavadora
X|Persona que tiene entre sesenta y setenta años.|sexagenario|sexagenaria
X|Que procede de un país lejano y resulta extraño.|exótico
Y|Bóvido de pelo largo del Tíbet.|yak|yac
Y|Material muy seco que prende con facilidad.|yesca
Y|Pareja de bueyes que trabajan juntos.|yunta
Y|Medida inglesa de longitud de unos 91 centímetros.|yarda
Y|Fibra vegetal con la que se fabrican sacos.|yute
Y|Parte del intestino delgado entre el duodeno y el íleon.|yeyuno
Y|Embarcación ligera de remo muy estrecha.|yola
Y|Caimán de los ríos de Sudamérica.|yacaré
Z|Marsupial americano que se hace el muerto.|zarigüeya|zariguella
Z|Palo largo con apoyo para el pie que usan los artistas para parecer altos.|zanco|zancos
Z|Instrumento navideño de barro que suena frotando una caña.|zambomba
Z|Franja inferior de una pared, o plaza principal en México.|zócalo
Z|Entrada de una casa, entre la puerta y el patio.|zaguán
Z|Célula que resulta de la unión de dos gametos.|zigoto
Z|Última letra del abecedario.|zeta|zeda
Z|Científico que estudia los animales.|zoólogo|zoóloga
`,
        hard: `
A|Que no bebe alcohol.|abstemio
A|Plaza pública de las antiguas ciudades griegas.|ágora|agora
A|Error de situar un hecho en una época que no le corresponde.|anacronismo
A|Antigua práctica que buscaba convertir los metales en oro.|alquimia
B|Techo curvo de edificios como iglesias o catedrales.|bóveda|boveda
B|Relativo a la vida campestre y pastoril.|bucólico|bucolico
B|Que tiene buena voluntad hacia los demás.|benévolo|benevolo
B|Velero de dos palos con velas cuadradas.|bergantín|bergantin
C|Reunión de cardenales para elegir papa.|cónclave|conclave
C|Arte de escribir a mano con letra bella.|caligrafía|caligrafia
C|Punto del cielo situado en la vertical de un lugar.|cenit|cénit
C|Reloj antiguo que mide el tiempo con agua.|clepsidra
D|División de algo en dos partes opuestas.|dicotomía|dicotomia
D|Que muestra desagrado o indiferencia en el trato.|displicente
D|Dispersión de un pueblo por el mundo, como la del pueblo judío.|diáspora|diaspora
D|Cosa que se da con generosidad, como un regalo.|dádiva|dadiva
E|Que dura muy poco tiempo.|efímero|efimero
E|Algo difícil de comprender; misterio.|enigma
E|Que actúa con imparcialidad y serenidad.|ecuánime|ecuanime
E|Parte final de una obra que resume o cierra la historia.|epílogo|epilogo
F|Engaño o argumento falso con apariencia de verdad.|falacia
F|Que prueba algo de forma indudable.|fehaciente
F|Persona que ama a la humanidad y la ayuda con desinterés.|filántropo|filantropo
F|Antiguo soberano de Egipto.|faraón|faraon
G|Escultura de los tejados góticos por la que desagua la lluvia.|gárgola|gargola
G|Que sigue a la masa sin criterio propio.|gregario
G|Catálogo de palabras con su definición, al final de un libro.|glosario
G|Forma verbal terminada en -ando o -iendo.|gerundio
H|Supremacía de un Estado o grupo sobre otros.|hegemonía|hegemonia
H|Compuesto de partes de distinta naturaleza.|heterogéneo|heterogeneo
H|Exageración retórica de lo que se dice.|hipérbole|hiperbole
H|Que se cierra del todo, sin dejar pasar el aire.|hermético|hermetico
I|Conjunto de rasgos y carácter propios de una persona o colectivo.|idiosincrasia
I|Que permanece sin daño alguno.|incólume|incolume
I|Tan pequeño o ridículo que provoca risa.|irrisorio
I|Que no se puede expresar con palabras.|inefable
J|Poder de juzgar; territorio en el que se ejerce.|jurisdicción|jurisdiccion
J|Lamento exagerado y quejumbroso.|jeremiada
J|Oración breve y fervorosa.|jaculatoria
J|Alegría intensa y desbordante.|júbilo|jubilo
L|Que habla o escribe con brevedad y concisión.|lacónico|laconico
L|Hurto o robo, especialmente el que se hace con frecuencia.|latrocinio
L|Línea que marca el límite de un terreno.|lindero
L|Triste, sombrío y funesto.|lúgubre|lugubre
M|Generoso y noble de espíritu.|magnánimo|magnanimo
M|Que miente o tiene la costumbre de mentir.|mendaz
M|Que actúa con extremo cuidado en los detalles.|meticuloso
M|Capacidad de algunos animales para parecerse a su entorno.|mimetismo
N|Muy malo o funesto.|nefasto
N|Nube de gas y polvo cósmico donde nacen estrellas.|nebulosa
N|Palabra nueva que se incorpora a una lengua.|neologismo
N|Pena por el recuerdo de un tiempo pasado.|nostalgia
Ñ|Apocado y de poco carácter; remilgado en exceso.|ñoño|ñoña|nono
Ñ|Que escatima el dinero y no gusta de gastar.|tacaño|tacano
Ñ|Tratar con desprecio, considerar poco digno de aprecio.|desdeñar|desdenar
Ñ|Antílope africano de cabeza grande y cuernos curvos.|ñu|nu
O|Figura retórica que une dos términos contradictorios.|oxímoron|oximoron
O|Aislamiento al que se somete a una persona por rechazo.|ostracismo
O|Relativo a los sueños.|onírico|onirico
O|Que posee gran riqueza.|opulento
P|Ejemplo o modelo que sirve de norma.|paradigma
P|Falto de valor y de ánimo.|pusilánime|pusilanime
P|De inteligencia aguda, que se da cuenta de todo.|perspicaz
P|Remedio que se supone que cura todos los males.|panacea
Q|Fantástico, sin fundamento real.|quimérico|quimerico
Q|Que se detiene en cosas de poca importancia.|quisquilloso
Q|Número mínimo de miembros para que una sesión sea válida.|quórum|quorum
Q|Lo más puro y esencial de algo.|quintaesencia
R|Antiguo cantor griego que recitaba poemas épicos.|rapsoda
R|Obstinado en su opinión, que se resiste a obedecer.|recalcitrante
R|Rasgo o conjunto de rasgos que acompaña a la firma.|rúbrica|rubrica
R|Capacidad de adaptarse y recuperarse tras una adversidad.|resiliencia
S|Misterioso y oculto, de sentido difícil.|sibilino
S|Evitar hábilmente una dificultad o un problema.|soslayar
S|Figura retórica que designa el todo por la parte.|sinécdoque|sinecdoque
S|Que durará siempre.|sempiterno
T|Que se puede tocar.|tangible
T|Dar una interpretación forzada a lo dicho para falsearlo.|tergiversar
T|Callado y melancólico.|taciturno
T|Desplazamiento estacional del ganado en busca de pastos.|trashumancia
U|Que está en todas partes a la vez.|ubicuo
U|Que ocurre o se hace después de otra cosa.|ulterior
U|Plan o sistema ideal que se considera irrealizable.|utopía|utopia
U|Parte inferior del hueco de una puerta.|umbral
V|Cambio de fortuna; alternancia de sucesos prósperos y adversos.|vicisitud
V|Apasionado e impetuoso.|vehemente
V|Tratar con desprecio y denigrar.|vilipendiar
V|Que parece verdadero y creíble.|verosímil|verosimil
X|Parte de la gramática que estudia el orden de las palabras.|sintaxis
X|Rechazo u hostilidad hacia los extranjeros.|xenofobia
X|Explicación o interpretación de un texto, especialmente bíblico.|exégesis|exegesis
X|Conforme con la doctrina establecida.|ortodoxo
Y|Colocación de elementos uno al lado de otro, sin nexo que los una.|yuxtaposición|yuxtaposicion
Y|Planta tropical de raíz comestible, también llamada mandioca.|yuca
Y|Terreno inculto o deshabitado.|yermo
Y|Parte de la armadura que cubría la cabeza.|yelmo
Z|Inquietud, aflicción o pérdida de la tranquilidad.|zozobra
Z|Persona a la que se atribuye el don de descubrir aguas subterráneas.|zahorí|zahori
Z|Línea quebrada formada por ángulos alternados.|zigzag
Z|Mano o pata de ciertos animales, con uñas o garras.|zarpa
A|Sentencia breve que resume una enseñanza.|aforismo
A|Que no es auténtico; dicho de ciertos evangelios no reconocidos.|apócrifo
A|Que puede entenderse de varias maneras.|ambiguo
A|Interés desinteresado por el bien ajeno.|altruismo
A|Muy firme y apasionado en una opinión: enemigo _____.|acérrimo
A|Persona que recibe invitados en su casa.|anfitrión
A|Representación simbólica de una idea abstracta.|alegoría
A|Reunión nocturna de brujas.|aquelarre
B|Tiempo tranquilo en el mar; también, prosperidad.|bonanza
B|Que está en guerra o tiene actitud agresiva.|beligerante
B|De poca importancia, insignificante.|baladí
B|Dicho de un artista de vida libre y poco convencional.|bohemio|bohemia
B|Funcionario muy apegado a los trámites y papeleos.|burócrata
B|Palabra ofensiva contra lo sagrado.|blasfemia
B|Sustancia aromática que calma o cura.|bálsamo
B|Cosa sin importancia, fruslería.|bagatela
C|Purificación emocional, según Aristóteles en la tragedia.|catarsis
C|Mordaz, hiriente; también, que quema los tejidos.|cáustico
C|Significado añadido que tiene una palabra además del literal.|connotación
C|Que ha vivido en muchos países y se siente ciudadano del mundo.|cosmopolita
C|Combinación de circunstancias en un momento dado.|coyuntura
C|Recipiente para fundir metales; también, lugar donde se mezclan cosas.|crisol
C|Bastón de mando que llevan los reyes.|cetro
C|Deseo excesivo de riquezas.|codicia
D|Verdad que se considera indiscutible.|dogma
D|Alternativa entre dos opciones.|disyuntiva
D|Gobernante que abusa de su poder.|déspota
D|Práctica política que busca el favor del pueblo con halagos y promesas.|demagogia
D|Respeto y cortesía hacia alguien.|deferencia
D|Situación en la que hay que elegir entre dos opciones difíciles.|dilema
D|Cuidadoso y rápido al hacer las cosas.|diligente
D|Pieza horizontal sobre una puerta o ventana.|dintel
E|Que habla con fluidez y convence.|elocuente
E|Que duda de todo o no cree con facilidad.|escéptico
E|Que soporta la adversidad con entereza.|estoico
E|Expresión suave para decir algo duro, como «pasar a mejor vida».|eufemismo
E|Acontecimiento notable que se recuerda en su aniversario.|efeméride|efemérides,efemerides
E|Poema de lamento por una pérdida.|elegía
E|Basado en la experiencia y la observación.|empírico
E|Persona de amplios conocimientos.|erudito|erudita
F|Presumido sin motivo, lleno de vanidad.|fatuo
F|Que se hace a escondidas: caza _____.|furtivo|furtiva
F|Objeto al que se atribuye poder mágico.|fetiche
F|Que ocurre por casualidad.|fortuito
F|Sobrio en la comida.|frugal
F|Brillo intenso.|fulgor
F|Relativo al sistema medieval de señores y vasallos.|feudal
F|Trabajo de orfebrería con hilos finos; algo muy delicado.|filigrana
G|Hazaña memorable; cantar de _____.|gesta
G|Que come con exceso y ansia.|glotón
G|Origen o principio de algo; primer libro de la Biblia.|génesis
G|Corporación de artesanos de un mismo oficio.|gremio
G|Cifra o signo que expresa un número.|guarismo
G|Valiente y apuesto.|gallardo
G|Gracia y elegancia en los movimientos.|garbo
G|Muy frío, helado.|gélido
H|Risa ruidosa; cualidad de lo que hace reír.|hilaridad
H|Exagerado y teatral en sus gestos.|histriónico
H|Doctrina que considera el placer como fin de la vida.|hedonismo
H|Persona que finge sentimientos o virtudes que no tiene.|hipócrita
H|Perezoso, que no quiere trabajar.|holgazán
H|Noble de categoría inferior, como Don Quijote.|hidalgo
H|Palabra que se escribe o suena igual que otra con distinto significado.|homónimo
H|Producto del cruce de dos especies o tipos distintos.|híbrido
I|Persona que rechaza y combate las tradiciones e imágenes establecidas.|iconoclasta
I|Que no se puede evitar ni detener.|inexorable
I|Célebre, ilustre.|insigne
I|Que no tiene miedo ante el peligro.|intrépido
I|Figura que da a entender lo contrario de lo que se dice.|ironía
I|Propenso a la ira.|iracundo
I|Que no se altera ante el peligro.|impávido
I|Que no hace daño.|inocuo|innocuo
J|Organización por grados de importancia.|jerarquía
J|Alegre y de buen humor.|jovial
J|Sensato, que actúa con buen criterio.|juicioso
J|Grupo de perros que cazan juntos.|jauría
J|Lenguaje especial de un grupo o profesión.|jerga
J|Combate a caballo con lanzas entre caballeros.|justa
J|Persona que trabaja en el campo a cambio de un salario diario.|jornalero|jornalera
J|Fiesta bulliciosa y alegre.|jolgorio|jaleo
L|Sueño profundo y prolongado; también, inactividad.|letargo
L|Que vive muchos años.|longevo
L|Alabanza interesada para ganarse a alguien.|lisonja
L|Oscuro y tenebroso.|lóbrego
L|Que habla mucho.|locuaz
L|Que produce ganancias.|lucrativo
L|Lo que se deja en testamento; herencia cultural.|legado
L|Criado de librea; persona servil.|lacayo
M|Persona rica que protege a artistas y sabios.|mecenas
M|Figura que identifica dos cosas por su semejanza, como «perlas» por dientes.|metáfora
M|Moderación y prudencia.|mesura
M|Tacaño y miserable.|mezquino
M|Carta o mensaje escrito.|misiva
M|Que critica con ironía hiriente.|mordaz
M|Persona que inventa historias y miente de forma compulsiva.|mitómano
M|Monumento de piedra de una sola pieza.|monolito
N|Favoritismo hacia los familiares en los cargos públicos.|nepotismo
N|Nube baja y gris que trae lluvia.|nimbo
N|Claro y bien definido.|nítido
N|Punto opuesto al cenit en la esfera celeste.|nadir
N|Persona que se prepara en un convento antes de profesar.|novicio|novicia
N|Recién incorporado a una creencia o actividad.|neófito
N|En el budismo, estado de liberación y paz total.|nirvana
N|Que hace daño.|nocivo
Ñ|Tristeza por la ausencia de algo querido.|añoranza
Ñ|Deleitarse en causar daño a alguien indefenso.|ensañarse
Ñ|Mentira o noticia inventada.|patraña
Ñ|Trampa o engaño para conseguir algo.|artimaña
Ñ|Protestar entre dientes con enfado.|refunfuñar
Ñ|Afectuoso, que despierta cariño.|entrañable
Ñ|Roca grande y elevada.|peñasco
Ñ|Lindante, contiguo, que está al lado.|aledaño
O|Que presagia algo malo.|ominoso
O|Anticuado, que ya no se usa.|obsoleto
O|Que hace exhibición de lujo.|ostentoso
O|Gobierno de unos pocos poderosos.|oligarquía
O|Palabra que imita un sonido, como «guau» o «tictac».|onomatopeya
O|Que tiene su origen en un lugar.|oriundo
O|Que se mantiene en su error de forma ciega.|obcecado
O|Viaje largo lleno de aventuras, como el de Ulises.|odisea
P|Idea contraria a la lógica que encierra una verdad.|paradoja
P|Votación popular para aprobar o rechazar una propuesta.|plebiscito
P|Lentitud y calma al actuar.|parsimonia
P|Que dura siempre: hoja _____.|perenne
P|Práctico, que valora la utilidad.|pragmático
P|Persona ilustre y respetada de una nación.|prócer
P|Presuntuoso y engreído.|petulante
P|Redundancia expresiva, como «subir arriba».|pleonasmo
Q|Pérdida grave o daño.|quebranto
Q|Idealista y defensor de causas nobles, como el caballero de la Mancha.|quijotesco
Q|Inmovilidad, sosiego.|quietud
Q|Acusación ante un juez.|querella
Q|Situación de una empresa que no puede pagar sus deudas.|quiebra
Q|Lámpara antigua de aceite o petróleo con tubo de cristal.|quinqué
Q|Que se rompe con facilidad.|quebradizo
Q|Periodo de cinco años.|quinquenio
R|Escondido, muy oculto.|recóndito
R|Que muestra reserva o desconfianza.|reticente
R|Aparatoso y ostentoso en exceso.|rimbombante
R|Resentimiento persistente.|rencor
R|Arte de hablar bien para persuadir.|retórica
R|Que brilla mucho.|rutilante
R|Elemental, poco desarrollado.|rudimentario
R|Persona que gobierna mientras el rey es menor de edad.|regente
S|Astuto y perspicaz.|sagaz
S|Burla cruel e irónica.|sarcasmo
S|Obra que critica algo poniéndolo en ridículo.|sátira
S|Que hace poco ejercicio; dicho de pueblos, que no son nómadas.|sedentario
S|Acción conjunta que logra más que la suma de las partes.|sinergia
S|Que se hace a escondidas.|subrepticio
S|Lujoso y espléndido.|suntuoso
S|Innecesario, que sobra.|superfluo
T|Disposición de ánimo; buen o mal _____.|talante
T|Persistente, que no se rinde.|tenaz
T|Imprudente ante el peligro.|temerario
T|Que se sobreentiende sin decirse.|tácito
T|Banal, sin importancia.|trivial
T|Gobierno injusto y cruel de un solo hombre.|tiranía
T|Aburrimiento profundo.|tedio
T|Persona que pasa por la calle.|transeúnte
U|Interés excesivo en un préstamo.|usura
U|Última advertencia antes de tomar medidas.|ultimátum
U|Aprobado por todos sin excepción.|unánime
U|Ciudad grande.|urbe
U|Apoderarse de lo que pertenece a otro.|usurpar
U|Sombrío, con mucha sombra.|umbrío
U|Tramar o preparar algo en secreto.|urdir
U|Ofensa grave.|ultraje
V|Presunción y orgullo de los propios logros.|vanagloria
V|Que dice siempre la verdad.|veraz
V|Habla excesiva y vacía.|verborrea|verborragia
V|Resto que queda de algo pasado.|vestigio
V|Que domina con gran maestría un instrumento.|virtuoso|virtuosa
V|Que come mucho y con ansia; fuego _____.|voraz
V|Que se evapora con facilidad; también, inestable.|volátil
V|Súbdito de un señor feudal.|vasallo
X|Que trata un tema a fondo, sin dejarse nada.|exhaustivo
X|Escaso, insuficiente.|exiguo
X|Agravar o avivar un mal o un enfado.|exacerbar
X|Verdad evidente que no necesita demostración.|axioma
X|Desenterrar un cadáver.|exhumar
X|Dislocación de un hueso.|luxación
X|Salida de tono brusca e inesperada.|exabrupto
X|Que sucede fuera de su tiempo oportuno.|extemporáneo
Y|Equivocación, error.|yerro
Y|Que yace; estatua _____ sobre un sepulcro.|yacente
Y|Vena gruesa del cuello.|yugular
Y|Estar tendido, especialmente en la sepultura.|yacer
Y|Pronunciar igual la «ll» y la «y».|yeísmo
Y|Persona que practica el yoga.|yogui|yogi
Y|Otra forma de llamar a la hiedra, planta trepadora.|yedra
Y|Lengua de los judíos askenazíes de Europa central.|yidis|yiddish,yídish
Z|Limpieza a fondo, o preparación del barco para el combate.|zafarrancho
Z|Que halaga con zalamerías para conseguir algo.|zalamero|zalamera
Z|Acción de cruzar la pierna para que alguien tropiece.|zancadilla
Z|Mover a alguien de un lado a otro con violencia.|zarandear
Z|Persona entrometida e inquieta que no hace nada provechoso.|zascandil
Z|Persona torpe y tarda en entender.|zoquete
Z|Coser un roto en una prenda.|zurcir
Z|Macho de la abeja; también, holgazán.|zángano
`,
        pro: `
A|Aspereza en el trato o en el carácter.|acrimonia
A|Pérdida patológica del cabello.|alopecia
A|Sustitución de un nombre propio por un epíteto: «por _____».|antonomasia
A|Consentimiento o conformidad con una propuesta.|aquiescencia
B|Que tiene dos cabezas.|bicéfalo|bicefalo
B|Líquido amarillo-verdoso que segrega el hígado.|bilis
B|Color rojo vivo anaranjado.|bermellón|bermellon
B|Afabilidad y sencillez de carácter.|bonhomía|bonhomia
C|Deseo desmedido de bienes y placeres sensuales.|concupiscencia
C|Obstinado y tenaz en un error o una actitud.|contumaz
C|Monje que vive en comunidad.|cenobita
C|Dar apariencia de buena a una acción que no lo es.|cohonestar
D|Poco resistente; despreciable o de poco valor.|deleznable
D|Tendencia compulsiva e irresistible a beber alcohol.|dipsomanía|dipsomania
D|Discurso o escrito violento e injurioso contra alguien.|diatriba
D|Explicar y aclarar un asunto confuso.|dilucidar
E|Universal; que abarca a todas las confesiones cristianas.|ecuménico|ecumenico
E|Composición poética breve y mordaz.|epigrama
E|Oculto y reservado a los iniciados.|esotérico|esoterico
E|Que se origina o nace en el interior.|endógeno|endogeno
F|Engañoso y falso.|falaz
F|De poca importancia o utilidad.|fútil|futil
F|Morir, acabar la vida.|fenecer
F|Pirata que asaltaba los barcos en el Caribe en el siglo XVII.|filibustero
G|Rama de la filosofía que estudia el origen y la validez del conocimiento.|gnoseología|gnoseologia
G|Impuesto o tributo.|gabela
G|Nombre que expresa el origen geográfico de una persona.|gentilicio
G|Lenguaje o discurso oscuro y confuso, difícil de entender.|galimatías|galimatias
H|Biografía de un santo.|hagiografía|hagiografia
H|Teoría que sitúa al Sol en el centro del sistema planetario.|heliocéntrico|heliocentrico
H|Palabra que aparece una sola vez en un corpus.|hápax|hapax
H|Cubierto de pelo áspero y duro.|hirsuto
I|Vano, sin sustancia ni sentido.|inane
I|Afrenta pública que deshonra.|ignominia
I|Tan intrincado que resulta imposible de desenredar.|inextricable
I|Parte de la zoología que estudia los peces.|ictiología|ictiologia
J|Alabanza propia presuntuosa.|jactancia
J|Lenguaje difícil de entender.|jerigonza
J|Gracioso, chistoso.|jocoso
J|Clase o índole de algo, normalmente despectivo.|jaez
L|Burla o escarnio.|ludibrio
L|Discusión basada en palabras más que en razones.|logomaquia
L|Que ablanda o suaviza un dolor o una pena.|lenitivo
L|Dicho o inscripción concisa y solemne, propio de las lápidas.|lapidario
M|Aversión al trato con las personas.|misantropía|misantropia
M|Delirio de grandeza.|megalomanía|megalomania
M|Dulce y suave en exceso, empalagoso.|melifluo
M|Que huele mal y puede ser dañino por sus emanaciones.|mefítico|mefitico
N|Brujo que invoca a los muertos para adivinar el futuro.|nigromante
N|Que no sirve de nada, inútil.|nugatorio
N|Insignificante, sin importancia.|nimio
N|Que ve mejor de noche que de día.|nictálope|nictalope
Ñ|Artificio con que se atrae a alguien con engaño.|añagaza|anagaza
Ñ|Mala hierba que crece entre el trigo; discordia.|cizaña|cizana
Ñ|Disponer o ejecutar algo con cierta habilidad.|pergeñar|pergenar
Ñ|Destierro, pena que obliga a vivir fuera del país.|extrañamiento|extranamiento
O|Artífice que trabaja el oro, la plata y otros metales preciosos.|orfebre
O|Parte de la metafísica que estudia el ser en general.|ontología|ontologia
O|Ofuscar la razón; turbar el entendimiento.|obnubilar
O|Deshonra pública que sufre alguien.|oprobio
P|Suceso imprevisto que cambia el curso de una trama.|peripecia
P|Obstinado, persistente.|pertinaz
P|Largo, excesivamente detallado.|prolijo
P|Mar, o gran cantidad de algo.|piélago|pielago
Q|Adivinación por las líneas de la mano.|quiromancia
Q|Conjunto de objetos de metal de poco valor.|quincalla
Q|Orden de reptiles que incluye a las tortugas.|quelonio
Q|Árbol de la familia de los robles, de hojas caducas.|quejigo
R|Rechazar o no aceptar a un juez o a un testigo.|recusar
R|De color rojizo, que denota salud.|rubicundo
R|Juego de palabras que consiste en invertir los términos de una frase.|retruécano|retruecano
R|Pez que se adhiere a otros; obstáculo que retrasa algo.|rémora|remora
S|Unión de la vocal final de una palabra con la inicial de la siguiente.|sinalefa
S|Reflexión en voz alta que hace alguien a solas.|soliloquio
S|Razón aparente con la que se defiende una falsedad.|sofisma
S|Empleo bien retribuido y de poco trabajo.|sinecura
T|Repetición de un mismo pensamiento expresado de distintas maneras.|tautología|tautologia
T|Situación o actitud del ánimo; altura propia de una voz.|tesitura
T|Hacedor de milagros.|taumaturgo
T|Aflicción, pena o sufrimiento profundo.|tribulación|tribulacion
U|Reconstrucción de la historia sobre acontecimientos que no sucedieron.|ucronía|ucronia
U|Orgulloso y satisfecho.|ufano
U|Muy abundante y fértil.|ubérrimo|uberrimo
U|Sustancia grasa que se aplica sobre la piel como remedio.|ungüento|unguento
V|Defender a quien ha sido injuriado o calumniado.|vindicar
V|Muy antiguo, de mucha edad.|vetusto
V|Reprensión o censura severa.|vituperio
V|Que se deja sobornar.|venal
X|Persona que compila los términos de un diccionario.|lexicógrafo|lexicografo
X|Exaltación extrema de una pasión o un sentimiento.|paroxismo
X|Arte de disecar animales muertos.|taxidermia
X|Arte de grabar sobre madera.|xilografía|xilografia
Y|Sable turco de hoja curva, sin guarda.|yatagán|yatagan
Y|Comer; también, comida, en lenguaje antiguo.|yantar
Y|Cama pobre, o lugar donde se está acostado.|yacija
Y|Relativo al yambo, un pie de verso grecolatino.|yámbico|yambico
Z|Decir o hacer algo que mortifica a otro.|zaherir
Z|Arbusto cuyas hojas se usan para curtir pieles.|zumaque
Z|Crítico presuntuoso y malintencionado.|zoilo
Z|Grosero y tosco.|zafio
A|Despreciable, vil en extremo.|abyecto
A|Severo, serio y poco amable en el trato.|adusto
A|Presteza y alegría con que se hace algo.|alacridad
A|Maldición o condena solemne de la Iglesia.|anatema
A|Dicho breve y sentencioso de una persona célebre.|apotegma
A|Sacerdote romano que adivinaba examinando las entrañas de animales.|arúspice
A|De carácter destemplado y violento; malhumorado.|atrabiliario
A|Lavado ritual del cuerpo para purificarse.|ablución
B|Malo, pícaro y ruin.|bellaco
B|Hablar entre dientes, musitar.|bisbisear
B|Valiente, esforzado (no «raro», como a menudo se cree).|bizarro
B|Robar con habilidad, hurtar.|birlar
B|Aprieto, situación comprometida: estar en un _____.|brete
B|Embarcación, buque, en lenguaje poético.|bajel
B|Monje budista; también, quien se quema a lo _____.|bonzo
B|Borracho, ebrio.|beodo
C|Repetición desagradable de sonidos.|cacofonía
C|Empleo cómodo y bien pagado de poco trabajo.|canonjía
C|Columna con figura de mujer.|cariátide
C|Tacaño, que escatima lo que da.|cicatero
C|Prudente y serio en su comportamiento.|circunspecto
C|Ilustre, visible, sobresaliente.|conspicuo
C|Pena, aflicción, desventura.|cuita
C|Hombre de vida viciosa y libertina.|crápula
D|Laberinto, cosa enredada (por el arquitecto mítico de Creta).|dédalo
D|Valor, brío e intrepidez.|denuedo
D|Insulto o dicho muy ofensivo.|dicterio
D|Malgastar los bienes.|dilapidar|despilfarrar
D|Aficionado a las artes que las cultiva sin profundidad.|diletante
D|Disparate, dicho o hecho absurdo.|dislate
D|Gracia y soltura al hablar o moverse.|donaire
D|Que se deja trabajar o moldear con facilidad; también, condescendiente.|dúctil
E|Insigne, ilustre por su categoría.|egregio
E|Que provoca el vómito.|emético
E|Celestial, divino; el cielo más alto.|empíreo
E|Alabanza encarecida.|encomio
E|Cosa irreal que solo existe en la imaginación.|entelequia
E|Resumen o compendio; también, ejemplo perfecto de algo.|epítome
E|Burla tenaz que humilla.|escarnio
E|Necedad, tontería.|estulticia
F|Facilidad de palabra.|facundia
F|Criado, sirviente.|fámulo
F|Conjunto de cosas desordenadas y superfluas.|fárrago
F|Fértil, que da abundante fruto.|feraz
F|Discurso o escrito de censura violenta.|filípica
F|Cosa de poco valor.|fruslería
F|Que hace trampas en el juego.|fullero
F|Lujo y pompa extraordinarios.|fasto|fastos
G|Que afecta escrúpulos o devoción excesivos.|gazmoño|gazmono
G|Que habla mucho y sin sustancia; dicho de un ave, que canta mucho.|gárrulo
G|Persona que ocupa un alto cargo y lo ostenta.|gerifalte
G|De color amarillo dorado.|gualdo|gualda
G|Lenguaje confuso; griterío de gente que habla a la vez.|guirigay
G|Hombre zafio y tosco.|gañán|ganan
G|Condenado a remar en las galeras.|galeote
G|Que vive a costa ajena.|gorrón
H|Destino, fuerza que gobierna los acontecimientos.|hado
H|Irregular, extraño, que se aparta de la norma.|heteróclito
H|Alteración del orden lógico de las palabras de una frase.|hipérbaton
H|Áspero e intratable.|hosco
H|Arte o teoría de interpretar textos.|hermenéutica
H|Que halaga o promete algo favorable.|halagüeño|halagueno
H|Sermón o plática religiosa.|homilía
H|Granero de madera sobre pilares típico de Galicia y Asturias.|hórreo
I|Ignorante, que no tiene noticia de las cosas.|ignaro
I|Limpio, sin mancha.|impoluto
I|Malvado, injusto.|inicuo
I|Asechanza, trampa para dañar a alguien.|insidia
I|Ilustre, afamado.|ínclito
I|Indigencia, pobreza extrema: estar en la _____.|inopia
I|Comenzar un proceso o expediente.|incoar
I|Isla (palabra que Sancho Panza deseaba gobernar).|ínsula
J|Romance alegre que narra la vida de la gente maleante.|jácara
J|Aparejo y cabos de un barco.|jarcia
J|Matarife, persona que mata las reses.|jifero
J|Prenda antigua ajustada que cubría desde los hombros a la cintura.|jubón
J|Asno, burro.|jumento
J|Pedazo desgarrado de una tela.|jirón
J|Diversión bulliciosa.|jarana
J|Palangana, recipiente para lavarse.|jofaina
L|Que se desliza o resbala fácilmente; inestable.|lábil
L|Lastimar, herir.|lacerar
L|Falto de fuerzas, decaído.|lánguido
L|Lento y torpe para comprender.|lerdo
L|Escrito infamatorio contra alguien.|libelo
L|Trabajar con ahínco en obras de ingenio, a menudo de noche.|lucubrar
L|Que no tiene barba o tiene poco vello.|lampiño|lampino
L|Perro de caza delgado y veloz.|lebrel
M|Delgado, sin grasa.|magro
M|Antipatía, mala voluntad hacia alguien.|malquerencia
M|Manchar la honra o el buen nombre.|mancillar
M|Que engaña con mañas y halagos.|marrullero
M|Prosperar, mejorar de fortuna.|medrar
M|Trozo de pan duro.|mendrugo
M|Necio, tonto.|mentecato
M|De costumbres moderadas.|morigerado
N|Indigno de que se hable de ello por su maldad.|nefando
N|Falta de ciencia, ignorancia.|nesciencia
N|Pequeñez, cosa de poca importancia.|nonada
N|Que empieza en una actividad; principiante.|novel|novato
N|Inspiración del artista.|numen
N|Navegante, marinero.|nauta
N|Persona soñadora que anda en las nubes.|nefelibata
N|Planta carnívora con hojas en forma de jarro; bebida mítica del olvido.|nepente
Ñ|De gesto enfadado, con el entrecejo fruncido.|ceñudo
Ñ|Descuidado en el vestir y el aseo.|desaliñado
Ñ|Antigua compañía de dos cómicos ambulantes.|ñaque
Ñ|Compartimento del barco para guardar víveres o pertrechos.|pañol
Ñ|Hábito de robar; ave de _____.|rapiña
Ñ|Nuevo e inexperto en un oficio.|bisoño
Ñ|Mamífero carnicero pequeño que ataca a las gallinas.|garduña
Ñ|Vástago que echa una planta; también, hijo de corta edad.|retoño
O|Excesivamente complaciente, servil.|obsecuente
O|Obstáculo, impedimento.|óbice
O|Torpe para comprender.|obtuso
O|Trastornar la vista o el entendimiento.|ofuscar
O|Que supone una carga o un gasto excesivo.|oneroso
O|Grueso y redondo; también, satisfecho de sí mismo.|orondo
O|Cosa de mucha apariencia y poco valor.|oropel
O|En otro tiempo.|otrora
P|Manuscrito antiguo que conserva huellas de una escritura borrada.|palimpsesto
P|Discurso de alabanza.|panegírico
P|Persona excluida de las ventajas de los demás.|paria
P|Discurso largo e inoportuno.|perorata
P|Dicho de una victoria, obtenida con más daño para el vencedor que para el vencido.|pírrico
P|Figura que atribuye cualidades humanas a seres inanimados.|prosopopeya|personificación,personificacion
P|Desvergonzado, atrevido, insolente.|procaz
P|Linaje, ascendencia de una persona.|prosapia
Q|Que se queja continuamente.|quejumbroso
Q|Persona cualquiera, un sujeto indeterminado.|quídam
Q|Cosa difícil de adivinar, enigma.|quisicosa
Q|Figura que repite ideas cruzando el orden: «ni son todos los que están ni están todos los que son».|quiasmo
Q|Feria benéfica con rifas y juegos.|quermés
Q|Sombrilla grande.|quitasol
Q|Persona que tiene entre cincuenta y sesenta años.|quincuagenario|quincuagenaria
Q|Relativo a las operaciones del cirujano.|quirúrgico
R|Vulgar, chabacano.|ramplón
R|Que rehúsa cumplir una obligación; dicho de un material, que resiste el fuego.|refractario
R|Deleitarse en lo que gusta, a veces con malicia.|regodearse
R|Condenado a las penas eternas; malvado.|réprobo
R|Palabra superflua para completar un verso.|ripio
R|Hombre sin honor que vive de engaños.|rufián
R|Clase o calidad de una persona, en sentido despectivo.|ralea
R|Caballo de mala traza y poca alzada, como el de Don Quijote.|rocín
S|Muy sagrado.|sacrosanto
S|Calumniador, delator.|sicofanta|sicofante
S|Grosero, indigno, vil.|soez
S|Descanso o esparcimiento.|solaz
S|Sucio, miserable, indecente.|sórdido
S|Someter, dominar.|subyugar
S|Breve, conciso.|sucinto
S|Crueldad excesiva.|sevicia
T|Jugador profesional y tramposo.|tahúr
T|Cama nupcial.|tálamo
T|Persona alocada y de poco juicio.|tarambana
T|Obstinado, terco.|tozudo|testarudo
T|Cruel y atroz, que exagera los detalles macabros.|truculento
T|Espantoso, que hace temblar.|tremebundo
T|Imagen o representación fiel de algo.|trasunto
T|Pícaro, bribón.|tunante
U|Partidario de la autoridad absoluta del Papa; reaccionario.|ultramontano
U|Dar gritos o alaridos; dicho del búho, cantar.|ulular
U|Relativo al ombligo: cordón _____.|umbilical
U|Atar al yugo a las bestias de tiro.|uncir
U|Dicho de un hijo, que es el único de sus padres.|unigénito
U|Que produce comezón o picor, como la ortiga.|urticante
U|Derecho a disfrutar de un bien ajeno.|usufructo
U|Apéndice carnoso que cuelga del velo del paladar.|úvula
V|Enfermizo, de salud quebrada.|valetudinario
V|Poeta, adivino.|vate
V|Inconstancia, capricho.|veleidad
V|Vergüenza, timidez.|verecundia
V|Locura, furia.|vesania
V|Que sustituye a otro en sus funciones, especialmente en la Iglesia.|vicario
V|Penacho de pelos que llevan algunas semillas para volar con el viento.|vilano
V|Que grita mucho o habla dando voces.|vocinglero
X|Desangrado; agotado, sin fuerzas.|exangüe
X|Adornar, embellecer.|exornar
X|Principio de un discurso u obra.|exordio
X|Que muestra una alegría desbordante.|exultante
X|Dicho de una planta, adaptada a vivir en lugares secos.|xerófilo
X|Gas noble de símbolo Xe usado en faros de coche.|xenón
X|Flojedad, falta de tensión.|laxitud
X|Ciencia que clasifica a los seres vivos.|taxonomía
Y|Canción triste de origen indígena andino.|yaraví
Y|Planta parecida al saúco, de olor fétido.|yezgo
Y|Rebaño de yeguas.|yeguada
Y|Tierra que puede labrar una yunta de bueyes en un día.|yugada
Y|Bolsa en la que se lleva la yesca para encender fuego.|yesquero
Y|Jinete profesional de carreras de caballos.|yóquey
Y|Poner una cosa junto a otra sin nexo.|yuxtaponer
Y|Sonido semivocálico, letra del alfabeto hebreo.|yod
Z|Arisco, esquivo, difícil de tratar.|zahareño|zahareno
Z|Emboscada; también, alboroto o pendencia.|zalagarda
Z|Danza popular antigua; también, jaleo, bullicio.|zarabanda
Z|Golpe dado con un látigo o correa.|zurriagazo
Z|Persona torpe y necia.|zopenco
Z|Mover algo continuamente de un lado a otro sin rumbo.|zangolotear
Z|Piel curtida de oveja con su lana.|zalea
Z|Instrumento de viento rústico compuesto de varias flautas.|zampoña
`
    };

    const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z'];
    const CONTAINS = new Set(['Ñ', 'X']);

    /** Minúsculas sin tildes, conservando la ñ como letra propia. */
    function norm(s) {
        return String(s || '').toLowerCase().trim()
            .replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ')
            .replace(/[^a-zñ]/g, '');
    }

    function parse(raw, level) {
        const out = [];
        for (const line of raw.split('\n')) {
            if (!line.trim()) continue;
            const [l, d, a, alts] = line.split('|');
            out.push({ id: `${level}:${l}:${norm(a)}`, l, c: CONTAINS.has(l), d, a, x: alts ? alts.split(',') : [] });
        }
        return out;
    }

    const LEVELS = {};
    for (const k of Object.keys(RAW)) LEVELS[k] = parse(RAW[k], k);

    Nexus.games.pasapalabraBank = { LETTERS, CONTAINS, LEVELS, norm };
})();
