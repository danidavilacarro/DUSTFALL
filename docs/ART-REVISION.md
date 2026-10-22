# Corrección gráfica — sprites originales integrados

La primera entrega utilizaba geometría Canvas estilizada y no alcanzaba el salto de
calidad solicitado. Esta revisión cambia el arte que se ve al jugar, manteniendo la
ciudad interactiva y las mecánicas. No utiliza una ilustración completa del escenario.

## Recursos incluidos

- 27 sprites de edificios: nueve IDs con tres etapas, metal oxidado, hormigón, lona,
  equipos industriales, cristales, cultivos y detalles de habitación.
- Tres evoluciones de radar en un atlas independiente para evitar solapamientos del
  material de origen al recortar las antenas.
- Nueve elementos de entorno: dos orientaciones de muralla, torre de vigilancia,
  chatarra, ruina, camión, poste eléctrico, barreras y foco.
- Cinco roles de supervivientes, con dos poses de marcha cada uno: trabajadores,
  sanitarios, guardias, exploradores y saqueadores.
- Material de suelo desértico, repetido bajo caminos e instalaciones independientes.

El arte se generó expresamente para DUSTFALL y se optimizó en WebP con canal alfa.
`assets/manifest.json` registra procedencia, tamaños, dimensiones y SHA-256. No se
requieren servicios de generación, pagos, peticiones externas ni claves al jugar.
Los originales de trabajo se conservan fuera del checkout, en `/workspace/generated_images`.

## Renderizado

`city-art.js` carga y valida el manifiesto de recortes y los atlas. Los contornos alfa
recortan cada sprite individual. `city-renderer.js` coloca cada pieza en su ubicación,
la ordena junto a habitantes y vehículos, y conserva las selecciones por transparencia.
El suelo es una textura de material repetida: no incluye edificios ni calles pintadas.
El mapa, las rutas y el estado de cada instalación siguen siendo código interactivo.

La pantalla de carga cubre la transición inicial hasta que el arte está disponible.
Un fallo de carga se comunica explícitamente y no se presenta como el nuevo aspecto.
El service worker precarga también todos los atlas para poder recuperar la partida sin red.

Etapas conservadas: niveles 1–2, 3–4 y 5+. Las mejoras sustituyen el sprite dentro del
juego sin recargar. No se cambia el formato `dustfall-sim-v1` ni los nueve IDs.
El apagón oscurece los sprites y suprime los focos dinámicos. El polvo de las tormentas,
los daños, el protocolo, pacientes, guardias y saqueadores siguen las condiciones reales.

## Límites

Las figuras usan dos poses, no animación esquelética. Los brillos dibujados dentro de
los sprites se atenúan mediante filtro durante un apagón; no son luces 3D independientes.
Las paredes y parte del decorado comparten recursos repetidos. La calidad debe juzgarse
con capturas del juego y en un dispositivo físico; no se afirma equivalencia con un
juego comercial terminado ni se sustituye una revisión artística por pruebas automáticas.

## Integración con main v0.4

Se incorpora `origin/main` hasta `dbad42b`, preservando `survival-v04.js` íntegro,
sus políticas de raciones, filtración y reciclaje, su acceso y sus campos persistentes.
El reloj horario ahora invoca `processHour` a través de una función intermediaria: el
callback anterior conservaba una referencia a la función previa a los módulos y no
aplicaba las políticas v0.4 en los ticks automáticos. La prueba de políticas utiliza
el callback real del temporizador, comprobando agua, comida y energía con las tres
políticas activas. No se alteran los costes ni el equilibrio del módulo.

La validación actual contiene 13 pruebas: mecánicas, guardado de políticas/trabajos
pendientes, selección, entrada táctil, cinco tamaños de pantalla, distinción de las
27 imágenes y diez poses, recursos, eliminación de cachés anteriores y arranque offline.
Las capturas `art-stage-1.png`, `art-stage-2.png` y `art-stage-3.png` se toman del juego
en ejecución con niveles 1, 3 y 5 respectivamente; son partidas de prueba avanzadas.
