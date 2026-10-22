# DUSTFALL — Visual Overhaul V1

La ciudad jugable usa sprites originales detallados sobre Canvas 2D, con selección,
profundidad, habitantes y cámara. No se sustituye el juego por una ilustración completa.
[Recursos, procedencia y límites del arte](ART-REVISION.md).

## Integración y persistencia

Base original inspeccionada: `2dcc8fd`. La rama integra además el `main` posterior hasta
`dbad42b`, preservando `survival-v04.js` íntegro y sus políticas. No se cambian los IDs
`core`, `water`, `food`, `energy`, `scrap`, `housing`, `clinic`, `radar`, `wall`,
`version:1`, ni la clave `dustfall-sim-v1`. No hace falta migración del guardado.

`game.js` conserva economía, mejoras, construcción y expediciones. v0.2 conserva
objetivos, eventos e integridad; v0.3 conserva personal, asaltos y clínica; v0.4 conserva
racionamiento, filtración y recuperación hídrica. El callback horario invoca la función
`processHour` actual en lugar de capturar la referencia anterior a esos módulos.

## Renderizado y evolución

`city-art.js` carga los atlas WebP y sus contornos alfa desde `assets/art/atlas.json`.
`city-renderer.js` prepara sprites en Canvas, con caché LRU de 24 entradas, y ordena
edificios, habitantes y vehículos por profundidad. La selección lee el alfa visible
en orden inverso de profundidad. La cámara admite arrastre, rueda, botones y pinza;
Escape cierra la ficha, Home centra y +/- ajustan el zoom.

| Nivel real | Etapa | Aspecto |
| --- | --- | --- |
| 0 | Parcela | Señal de construcción y estacas |
| 1–2 | Improvisada | Equipamiento recuperado y estructuras iniciales |
| 3–4 | Reforzada | Más equipos, módulos y soportes |
| 5+ | Consolidada | Grandes volúmenes, instalaciones y expansiones avanzadas |

Los nueve edificios cambian de sprite al mejorar, sin recargar. Los niveles intermedios
conservan su número real. El suelo es un material repetido bajo las rutas calculadas.
Los residentes recorren rutas de calles y accesos; el personal se reduce proporcionalmente
si faltan colonos por enfermedad o expedición. El vehículo requiere taller y personal.

La tormenta altera polvo y visibilidad; un apagón oscurece instalaciones; el refugio
suspende trabajo exterior; la clínica muestra pacientes reales y el asalto muestra
saqueadores sólo si está pendiente. El combate conserva las decisiones existentes.
La filtración y la calidad del aire afectan a los indicadores del Núcleo.

## Interfaz, carga y rendimiento

La ciudad ocupa el viewport, con HUD de recursos, accesos a edificios y fichas
funcionales. La gestión se despliega como panel lateral en horizontal y hoja inferior
en vertical. Se conserva el soporte vital nuevo, con controles accesibles en móvil.
Los botones principales tienen superficie de al menos 44 px y se reservan áreas seguras.

Los recursos originales están documentados en `assets/manifest.json`, con dimensiones,
procedencia, bytes y SHA-256. El conjunto de arte comprimido ocupa aproximadamente 4 MB.
No requiere generación remota, backend, claves ni dependencias de ejecución externas.
La densidad de píxeles se limita a 2. La pantalla de carga espera el arte y comunica
fallos explícitamente. El service worker `dustfall-visual-art-v2` precarga el arte,
permite arrancar offline y sólo elimina cachés anteriores del juego.

## Ejecutar y validar

```sh
python -m http.server 8000 --directory /workspace/DUSTFALL
python tests/visual_overhaul.py
```

El runner requiere Python Playwright y Chromium (`CHROMIUM_PATH`, por defecto
`/usr/bin/chromium`). No son dependencias del juego. Genera capturas y medidas en
`/tmp/dustfall-validation` (`DUSTFALL_ARTIFACTS` permite otro destino).

Trece pruebas cubren construcción, evolución, recursos y consumo, personal, tormenta,
refugio, reparación, asalto, clínica, expedición, tecnología, guardados antiguos y
actuales con trabajos/políticas pendientes, selección, arrastre, pinza real mediante CDP,
pantallas 667×375 / 844×390 / 1024×768 / 1440×900 / 390×844, distinción de imágenes y
poses, carga de recursos, actualización de caché, arranque offline y políticas v0.4
mediante el callback horario real. Se capturan errores JS y respuestas HTTP fallidas.
Las capturas avanzadas usan partidas de prueba con niveles reales 1, 3 y 5; no montajes.

Falta validación física iOS/Android, medición de batería/memoria y partidas prolongadas.
No se afirma equivalencia con un juego comercial terminado. El despliegue real de
Cloudflare se debe verificar tras integrar: framework None, sin build y salida raíz.
