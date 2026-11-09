/* ============================================================
   NEXUS ARCADE · games/connections/bank.js
   Categorías de Conexiones. Cada línea: nivel|familia|nombre|palabras
   Nivel 0 = amarillo (fácil) · 1 = verde · 2 = azul · 3 = morado
   (juegos de palabras). Dos categorías de la misma familia, o que
   compartan alguna palabra, nunca salen juntas.
   Opcional al final: |oculta:A,B,C (ninguna otra palabra del tablero
   puede contener esas letras seguidas), |palindromo, |anagrama:AMOR
   ============================================================ */
(function () {
    'use strict';
    const RAW = `
0|fruta|Frutas|MANZANA,PERA,PLÁTANO,UVA,MELÓN,SANDÍA,CEREZA,KIWI
0|color|Colores|ROJO,AZUL,VERDE,AMARILLO,NEGRO,BLANCO,GRIS,MORADO
0|tiempo|Días de la semana|LUNES,MARTES,MIÉRCOLES,JUEVES,VIERNES,SÁBADO,DOMINGO
0|tiempo|Meses del año|ENERO,FEBRERO,MARZO,ABRIL,MAYO,JUNIO,JULIO,AGOSTO,OCTUBRE
0|musica|Instrumentos de cuerda|GUITARRA,VIOLÍN,ARPA,CHELO,BANJO,LAÚD,CONTRABAJO,BANDURRIA
0|cuerpo|Partes del cuerpo|BRAZO,PIERNA,CODO,RODILLA,HOMBRO,CUELLO,TOBILLO,CADERA
0|espacio|Planetas|MERCURIO,VENUS,TIERRA,MARTE,JÚPITER,SATURNO,URANO,NEPTUNO
0|deporte|Deportes con balón|FÚTBOL,BALONCESTO,BALONMANO,VOLEIBOL,RUGBY,WATERPOLO,BÉISBOL
0|animal|Animales de granja|VACA,CERDO,GALLINA,OVEJA,CABRA,CABALLO,PATO,BURRO
0|casa|Muebles|MESA,SILLA,SOFÁ,ARMARIO,CAMA,ESTANTERÍA,CÓMODA,TABURETE
0|ropa|Prendas de ropa|CAMISA,PANTALÓN,FALDA,JERSEY,ABRIGO,CHAQUETA,VESTIDO,BUFANDA
0|comida|Verduras|LECHUGA,TOMATE,ZANAHORIA,PEPINO,CEBOLLA,PIMIENTO,BERENJENA,CALABACÍN
0|geo|Países de Europa|FRANCIA,ITALIA,ALEMANIA,PORTUGAL,GRECIA,SUECIA,NORUEGA,POLONIA
0|trabajo|Profesiones sanitarias|MÉDICO,ENFERMERO,DENTISTA,FARMACÉUTICO,FISIOTERAPEUTA,CIRUJANO,MATRONA
0|transporte|Medios de transporte|COCHE,AUTOBÚS,TREN,AVIÓN,BARCO,MOTO,BICICLETA,METRO
0|cocina|Utensilios de cocina|SARTÉN,OLLA,CUCHARA,TENEDOR,CUCHILLO,ESPÁTULA,CAZO,COLADOR
0|escuela|Material escolar|LÁPIZ,GOMA,REGLA,CUADERNO,ESTUCHE,MOCHILA,ROTULADOR,COMPÁS
0|clima|Fenómenos del tiempo|LLUVIA,NIEVE,GRANIZO,NIEBLA,TORMENTA,VIENTO,HELADA,TRUENO
1|geo|Capitales de Europa|PARÍS,ROMA,LISBOA,BERLÍN,VIENA,ATENAS,DUBLÍN,PRAGA
1|geo2|Ríos de España|EBRO,TAJO,DUERO,GUADALQUIVIR,GUADIANA,MIÑO,JÚCAR,SEGURA
1|geo2|Provincias andaluzas|SEVILLA,CÁDIZ,MÁLAGA,HUELVA,JAÉN,CÓRDOBA,ALMERÍA
1|musica|Notas musicales|DO,RE,MI,FA,SOL,LA,SI
1|arte|Pintores españoles|GOYA,VELÁZQUEZ,PICASSO,DALÍ,MIRÓ,SOROLLA,MURILLO,ZURBARÁN
1|arte|Escritores españoles|CERVANTES,LORCA,QUEVEDO,MACHADO,UNAMUNO,GALDÓS,BÉCQUER,GÓNGORA
1|animal|Mamíferos marinos|BALLENA,DELFÍN,FOCA,ORCA,MORSA,MANATÍ,NARVAL,CACHALOTE
1|animal|Aves|ÁGUILA,GORRIÓN,PALOMA,CIGÜEÑA,BÚHO,LORO,HALCÓN,GAVIOTA
1|animal|Insectos|HORMIGA,ABEJA,MOSCA,MARIPOSA,ESCARABAJO,GRILLO,LIBÉLULA,MOSQUITO
1|juego|Piezas de ajedrez|REY,DAMA,TORRE,ALFIL,CABALLO,PEÓN
1|juego|Palos de la baraja española|OROS,COPAS,ESPADAS,BASTOS
1|dinero|Monedas|EURO,DÓLAR,LIBRA,YEN,PESO,RUBLO,RUPIA,FRANCO
1|ciencia|Unidades de medida|METRO,LITRO,GRAMO,KILO,SEGUNDO,VATIO,VOLTIO,AMPERIO
1|ciencia|Elementos químicos|HIERRO,ORO,PLATA,COBRE,ZINC,HELIO,NEÓN,CARBONO
1|astro|Signos del zodiaco|ARIES,TAURO,GÉMINIS,CÁNCER,LEO,VIRGO,LIBRA,ESCORPIO
1|musica|Bailes|SALSA,TANGO,VALS,FLAMENCO,JOTA,SAMBA,BACHATA,MERENGUE
1|comida|Postres|FLAN,NATILLAS,TARTA,HELADO,MERENGUE,BROWNIE,TIRAMISÚ,CUAJADA
1|herram|Herramientas|MARTILLO,DESTORNILLADOR,SIERRA,LLAVE,ALICATES,TALADRO,LIMA,SERRUCHO
1|deporte|Deportes de raqueta|TENIS,PÁDEL,BÁDMINTON,SQUASH,FRONTENIS,PIMPÓN
2|geo|Capitales de América|LIMA,QUITO,BOGOTÁ,CARACAS,SANTIAGO,MONTEVIDEO,ASUNCIÓN,MANAGUA
2|fruta|Cítricos|LIMÓN,NARANJA,LIMA,MANDARINA,POMELO,CIDRA,BERGAMOTA
2|comida|Tipos de pasta|ESPAGUETI,MACARRÓN,LASAÑA,RAVIOLI,TALLARÍN,ÑOQUI,FIDEO,CANELÓN
2|comida|Quesos|MANCHEGO,CABRALES,IDIAZÁBAL,TETILLA,BRIE,GOUDA,MOZZARELLA,ROQUEFORT
2|astro|Constelaciones|ORIÓN,CASIOPEA,ANDRÓMEDA,PEGASO,PERSEO,LIRA,HÉRCULES,CENTAURO
2|mito|Dioses griegos|ZEUS,HERA,ATENEA,APOLO,ARES,HERMES,POSEIDÓN,AFRODITA
2|mito|Dioses romanos|JÚPITER,MARTE,VENUS,NEPTUNO,MERCURIO,JUNO,MINERVA,VULCANO
2|cuerpo|Huesos|FÉMUR,TIBIA,PERONÉ,CÚBITO,RADIO,HÚMERO,ESTERNÓN,CLAVÍCULA
2|clima|Tipos de nube|CIRRO,CÚMULO,ESTRATO,NIMBO,CIRROCÚMULO,ESTRATOCÚMULO
2|animal|Razas de perro|CANICHE,DÁLMATA,BÓXER,BEAGLE,CHIHUAHUA,GALGO,MASTÍN,CARLINO
2|natura|Árboles|ROBLE,PINO,ENCINA,HAYA,CASTAÑO,OLMO,ABETO,CHOPO
2|geo2|Islas españolas|MALLORCA,MENORCA,IBIZA,TENERIFE,LANZAROTE,FORMENTERA,HIERRO,GOMERA
2|geo2|Lenguas de España|CASTELLANO,CATALÁN,GALLEGO,EUSKERA,ARANÉS,ASTURIANO,VALENCIANO
2|barco|Partes de un barco|PROA,POPA,BABOR,ESTRIBOR,QUILLA,MÁSTIL,TIMÓN,ANCLA
2|cafe|Tipos de café|SOLO,CORTADO,BOMBÓN,CARAJILLO,CAPUCHINO,MANCHADO,AMERICANO,MOCA
2|juego|Juegos de cartas|MUS,TUTE,BRISCA,CHINCHÓN,GUIÑOTE,PÓKER,CINQUILLO,SOLITARIO
2|ciencia|Partes de la célula|NÚCLEO,MEMBRANA,CITOPLASMA,RIBOSOMA,MITOCONDRIA,VACUOLA,LISOSOMA
2|musica|Instrumentos de viento|FLAUTA,TROMPETA,CLARINETE,OBOE,FAGOT,TROMBÓN,TUBA,GAITA
3|oculto|Esconden un número|SEISMO,DIEZMO,BRONCE,DOSEL,CIENCIA,TRESILLO,MILANO|oculta:UNO,DOS,TRES,CUATRO,CINCO,SEIS,SIETE,OCHO,NUEVE,DIEZ,ONCE,DOCE,CIEN,MIL
3|marplus|___ de mar|ESTRELLA,CABALLITO,ERIZO,LOBO,LEÓN,PEPINO,ANÉMONA
3|nombres|También son nombres de mujer|ROSA,PILAR,DOLORES,LUZ,SOLEDAD,MERCEDES,CONSUELO,ESPERANZA
3|palind|Se leen igual al revés|RADAR,RECONOCER,SOMOS,OSO,SALAS,NADAN,ANILINA|palindromo
3|anag|Anagramas de AMOR|ROMA,MORA,RAMO,OMAR|anagrama:AMOR
3|oculto|Esconden un animal|ZAPATO,GRANADA,HERMOSO,VACACIONES,PIRATA,MONOPATÍN,ESCORPIÓN?,TOROIDE|oculta:PATO,RANA,OSO,VACA,RATA,MONO,TORO,GATO,LORO,PERRO,LOBO,MOSCA,FOCA,PAVO,CERDO,BURRO,CABRA,CIERVO
3|oculto|Esconden un color|CERROJO,AZULEJO,GRISÚ,ROSARIO,VERDEJO,AMARILLEAR?|oculta:ROJO,AZUL,GRIS,ROSA,VERDE,NEGRO,BLANCO
3|cosas|Tienen agujas|RELOJ,PINO,BRÚJULA,ERIZO,JERINGUILLA,TOCADISCOS
3|cosas|Tienen teclas|PIANO,ORDENADOR,CALCULADORA,ACORDEÓN,ÓRGANO,TELÉFONO,CAJERO
3|expr|___ de oro|BODAS,REGLA,BALÓN,MEDALLA,SIGLO,EDAD,LINGOTE
3|expr|Banco de ___|PECES,DATOS,SANGRE,ARENA,PRUEBAS,ALIMENTOS,NIEBLA
3|marplus|Pez ___|ESPADA,GLOBO,PAYASO,MARTILLO,LUNA,SIERRA
3|cosas|Tienen corona|REY,REINA,DIENTE,PIÑA,SOL,MUELA
3|cosas|Tienen ojos pero no ven|AGUJA,PATATA,HURACÁN,QUESO,PUENTE,TORMENTA
3|expr|Media ___|NARANJA,LUNA,PENSIÓN,VUELTA,NOCHE,DOCENA,MARATÓN,HORA
3|expr|Palabras que siguen a «sin»|EMBARGO,DUDA,FIN,TECHO,SENTIDO,QUERER,PAPELES,RODEOS
`;
    const up = (s) => String(s).toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ');
    const CATS = [];
    for (const line of RAW.split('\n')) {
        if (!line.trim()) continue;
        const [lv, fam, name, words, rule] = line.split('|');
        const ws = words.split(',').filter(w => !w.endsWith('?'));      // «?» = descartada al revisar
        const c = { id: CATS.length, lv: +lv, fam, name, words: ws, keys: ws.map(up) };
        if (rule) {
            if (rule.startsWith('oculta:')) c.hides = rule.slice(7).split(',');
            else if (rule === 'palindromo') c.palindrome = true;
            else if (rule.startsWith('anagrama:')) c.anagram = rule.slice(9);
        }
        CATS.push(c);
    }
    Nexus.games.connectionsBank = { CATS, up };
})();
