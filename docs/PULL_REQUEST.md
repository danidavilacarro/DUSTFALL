# art: nueva colonia con sprites originales y soporte vital v0.4

La ciudad sustituye los bloques geométricos por 27 sprites originales detallados: nueve edificios con etapas en niveles 1–2, 3–4 y 5+. Añade cinco roles con dos poses de marcha, nueve props de entorno y suelo desértico texturizado. Los edificios, personajes y vehículos se renderizan como entidades independientes; se mantienen selección por transparencia, cámara táctil, mejoras, rutas y emergencias reales de la partida.

Se integra `main` hasta `dbad42b`, incluyendo `survival-v04.js` íntegro, sus políticas y sus campos guardados. Se corrige el callback del reloj para que invoque la función horaria ampliada por ese módulo. Se conservan los nueve IDs y `dustfall-sim-v1`.

Los atlas originales WebP y metadatos ocupan unos 4 MB, llevan manifiesto con SHA-256 y funcionan sin servicios externos. El caché `dustfall-visual-art-v2` precarga todos los recursos y elimina cachés anteriores del juego. No hay cambios de build para Cloudflare Pages.

Validación: 13 pruebas funcionales con Chromium/Playwright; construcción, evolución, economía, personal, tormenta, asalto, clínica, expediciones, tecnología, guardados antiguos y actuales con trabajos/políticas pendientes, selección, arrastre, pinza, cinco tamaños de pantalla, diferencias entre las 27 imágenes y diez poses, actualización del caché y arranque offline. La prueba de políticas ejecuta el callback real del reloj y verifica agua, comida y energía. Sintaxis JS y `git diff --check` sin errores.

Límites: las figuras usan dos poses y parte de la iluminación está dibujada en los sprites; no hay iluminación 3D física ni combate táctico nuevo. Falta validación física en iOS/Android, revisión artística final y comprobación del despliegue real de Cloudflare. Capturas del juego y detalles de implementación en `docs/ART-REVISION.md`; se generan en `/tmp/dustfall-validation` al ejecutar las pruebas.
