# DUSTFALL — Visual Overhaul V1

## Base e integración

Base inspeccionada: `main`, `2dcc8fd870f3e0117eddd965a691c1f5b7d34f14`.
Rama: `feature/visual-overhaul-v1`. Sin motor nuevo, build, claves ni servicios de pago.
La referencia de imagen mencionada no estaba adjunta en la conversación disponible.
La dirección implementada utiliza geometría industrial original, verdes desaturados,
metal envejecido, arena y señalización ámbar. El resultado debe revisarse visualmente;
no equivale a una producción artística comercial terminada.

## Arquitectura conservada

- `game.js`: estado, economía, mejoras, construcciones con temporizador, tecnologías,
  expediciones, carga y guardado local. Una hora de simulación cada cuatro segundos.
- `survival-v02.js`: objetivos, eventos, tormentas, integridad y protocolo de refugio.
- `survival-v03.js`: distribución de personal, defensa, asaltos y tratamiento adicional.
- `city-renderer.js`: nueva proyección, sprites procedurales, profundidad, selección,
  cámara, habitantes, vehículos, iluminación y ampliación de fichas. Utiliza el reloj
  visual ya existente de v0.2, sin añadir un segundo reloj de simulación.
- `styles.css`: conserva los componentes funcionales y añade la composición de ciudad
  a pantalla completa, HUD y panel de gestión desplegable.

No se cambian IDs (`core`, `water`, `food`, `energy`, `scrap`, `housing`, `clinic`,
`radar`, `wall`), `version: 1`, ni la clave `dustfall-sim-v1`. No hace falta migración.
Los campos `v02` y `v03` siguen inicializándose mediante sus módulos existentes.
Las recompensas de objetivos al cargar partidas anteriores mantienen su comportamiento.

## Fases implementadas

1. Terreno con grano y ruinas, proyección 2:1, cámara con arrastre, zoom con rueda,
   botones y pinza multitáctil. Orden de entidades por profundidad compartido.
2. Nueve edificios, cada uno con tres etapas, materiales y detalles propios. Núcleo
   con conductos, depósitos, columna de filtración y bastidor avanzado; invernaderos,
   central de baterías/solar, grúa, alojamientos, clínica, radar y defensas.
3. Red de calles y conexiones a las entradas. Los personajes recorren esa misma red.
   Personal de trabajo, sanitarios, guardias, exploradores y saqueadores diferenciados.
   Vehículo de recuperación condicionado al taller y su personal.
4. Tormentas con polvo y filtro ocre; luces apagadas sin energía; saqueadores sólo
   durante un asalto pendiente; grietas si integridad <40; atención a pacientes reales;
   suspensión del trabajo exterior durante el protocolo. Reparadores cuando hay daño
   o una construcción activa. El humo del núcleo requiere energía.
5. HUD de recursos con pictogramas SVG originales, controles funcionales de supervivencia,
   accesos a los nueve edificios, fichas, trabajadores, tecnologías y expediciones.
   Panel lateral en horizontal y hoja inferior en vertical; cierre, Escape y controles
   de zoom por teclado. Se mantienen los menús existentes y sus acciones.
6. Sprites prerenderizados en Canvas fuera de pantalla con caché LRU de 24 entradas;
   terreno cacheado; densidad de píxeles limitada a 2; recursos locales y service worker.

## Evolución real de edificios

| Nivel real | Etapa | Tratamiento |
| --- | --- | --- |
| 0 | Parcela | Plinto vacío con señal de construcción |
| 1–2 | 1 · Improvisada | Instalación básica, cubierta de lona, equipos expuestos |
| 3–4 | 2 · Reforzada | Depósitos, módulos, soportes o equipos adicionales específicos |
| 5+ | 3 · Consolidada | Expansión avanzada, estructuras mayores y nuevos volúmenes |

Los umbrales son comunes a los nueve IDs. El cambio se calcula en cada dibujo a partir
 del nivel guardado. La mejora actualiza el sprite y genera un pulso transitorio sin
recargar. Los niveles 2, 4 y superiores a 5 conservan el número real en la etiqueta,
pero comparten arte con su etapa. No se limita la progresión de la simulación.

## Correspondencia visual con la simulación

El reparto visual usa los trabajadores asignados, reducido proporcionalmente cuando
faltan colonos sanos por enfermedad o expedición, con distribución de restos enteros.
No se inventan nuevos habitantes. El personal sanitario requiere clínica. Los tres
exploradores aparecen sólo con expedición activa. Los saqueadores aparecen únicamente
con `v03.pendingRaid`; el combate sigue resolviéndose mediante las decisiones existentes,
no se ha añadido un sistema táctico. Los guardias patrullan el perímetro. El personal
exterior desaparece al sellar refugios; médicos y guardias siguen en servicio.

La ficha muestra producción bruta por hora con personal, tecnología y penalización de
tormenta; la recuperación de chatarra incluye la penalización del protocolo. El informe
de supervivencia y la simulación originales siguen siendo la fuente de la economía.

## Recursos y rendimiento

`assets/manifest.json` documenta los recursos originales y su licencia CC0. No hay
imágenes extraídas de otros juegos. Los 27 diseños construidos se generan por código y
se almacenan como sprites al usarse; no se descarga una imagen de la colonia.
La selección lee la transparencia del sprite en orden inverso de profundidad para
seleccionar la superficie visible. El terreno no participa en el hit test.

El caché `dustfall-visual-v1` incorpora el módulo, textura y manifiesto. El service
worker actualiza desde red y recupera recursos locales sin red; sólo elimina cachés
con prefijo `dustfall-`. Las peticiones de assets fallidas no devuelven HTML como imagen.

## Ejecutar y comprobar

```sh
python -m http.server 8000 --directory /workspace/DUSTFALL
python tests/visual_overhaul.py
node --check city-renderer.js
git diff --check
```

El runner necesita Python Playwright y Chromium. Por defecto usa `/usr/bin/chromium`;
se puede indicar `CHROMIUM_PATH`. Son herramientas de desarrollo, no dependencias del
juego. Los resultados y capturas se escriben fuera del checkout en
`/tmp/dustfall-validation` (`DUSTFALL_ARTIFACTS` permite otro destino).

Las once pruebas cubren construcción y mejoras por niveles reales, recursos y consumo,
personal, tormenta, refugio y reparación, asalto y heridas, clínica, expedición,
investigación, recuperación de un guardado v0.1 y recarga v0.3 con trabajos pendientes, selección con ratón, arrastre y pinza
real mediante CDP, tamaños 667×375 / 844×390 / 1024×768 / 1440×900 / 390×844, recursos, actualización
de caché y arranque offline. Se capturan errores JS y respuestas HTTP fallidas.
El benchmark mide 30 llamadas a draw en Chromium headless, no FPS en un teléfono.

Las capturas `city-stage-3.png` y `city-night-raid.png` usan partidas de prueba avanzadas
con niveles y amenazas reales; las demás vistas empiezan con la partida inicial.
No son montajes ni fondos de pantalla. No incorporar las capturas de validación al
bundle de Cloudflare.

## Límites pendientes

- Arte procedural con geometría estilizada; falta la revisión artística contra la
  referencia ausente y una producción de sprites de mayor detalle para alcanzar el
  objetivo comercial planteado. No se afirma aceptación artística definitiva.
- Sin validación física en iOS/Android ni medición de batería/GPU/memoria en esos equipos.
  Las pruebas táctiles se ejecutan en Chromium emulado.
- Animaciones de figuras pequeñas, sin esqueletos ni atlas de animación dibujada.
- El asalto conserva la resolución por decisiones del juego; no hay combate táctico.
- La simulación y sus balances acelerados existentes no se han reequilibrado.
- No se ha verificado un despliegue real de Cloudflare Pages ni sus ajustes remotos.

La integración debe hacerse mediante PR después de revisar las capturas y ejecutar las
pruebas. No se modifica ni publica `main` directamente. Cloudflare Pages conserva el
flujo estático: framework None, sin comando de build y directorio de salida raíz.
