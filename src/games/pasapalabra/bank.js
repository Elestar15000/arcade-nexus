/* ============================================================
   NEXUS ARCADE · games/pasapalabra/bank.js
   Banco de definiciones del Pasapalabra. 4 por letra y nivel.
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
