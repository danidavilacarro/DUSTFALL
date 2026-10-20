# feat: reconstruir la ciudad isométrica interactiva de DUSTFALL

La colonia pasa a ocupar la pantalla completa con nueve edificios originales que evolucionan en tres etapas (niveles 1–2, 3–4 y 5+), cámara con arrastre y pinza, selección por transparencia y habitantes que recorren caminos según el personal real. Tormentas, apagones, refugio, heridos y asaltos alteran la escena. Se mantienen la economía, los IDs y el guardado `dustfall-sim-v1`.

Incluye HUD y gestión móvil desplegable, materiales y pictogramas originales, caché de sprites limitada y actualización del service worker con arranque offline. Sigue siendo un sitio estático compatible con Cloudflare Pages, sin build ni claves.

Validación: 11 pruebas funcionales con Chromium/Playwright, sintaxis de los cinco JS y `git diff --check`. Pantallas de 667×375, 844×390, 1024×768, 1440×900 y 390×844; construcción, evolución, economía, personal, emergencias, expediciones, tecnología, guardados antiguos/actuales, entrada táctil y actualización offline.

Límites: arte procedural estilizado pendiente de revisión comercial contra la imagen de referencia, que no estaba disponible; sin pruebas físicas iOS/Android ni despliegue de Cloudflare verificado. El asalto conserva las decisiones existentes, sin combate táctico nuevo. Detalles en `docs/VISUAL-OVERHAUL-V1.md`.
