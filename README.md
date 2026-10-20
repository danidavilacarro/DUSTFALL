# DUSTFALL — Survival City · prototipo v0.2

Juego original de **supervivencia, construcción y progresión**, inspirado en las dinámicas de gestión de asentamientos de juegos como *Whiteout Survival*, sin utilizar gráficos, código ni elementos de identidad de otros juegos.

## Qué incluye esta versión

- **Ciudad isométrica jugable:** nueve tipos de edificios, selección táctil, zoom, arrastre y mejora visible de niveles. Animación procedural de habitantes, partículas de polvo y balizas del perímetro.
- **Supervivencia persistente:** agua, comida, energía, chatarra, medicinas, población, enfermedad, moral y calidad del aire. Los recursos se producen y consumen continuamente.
- **Integridad del refugio:** las tormentas dañan conductos; repararlos consume chatarra y energía. Si caen por debajo de 40%, la calidad del aire y la moral se resienten.
- **Protocolo de refugio:** activa refugios sellados para reducir daños por tormenta y proteger el aire, a cambio de energía y menor recuperación de chatarra.
- **Eventos narrativos con decisiones:** fugas tóxicas, refugiados y rescate de un convoy, con alternativas que afectan recursos y estado de la colonia.
- **Capítulo de introducción:** cinco objetivos encadenados, recompensas y progresión visible dentro del escenario.
- **Exploración:** mapa sectorial de páramo, tres rutas desbloqueables por nivel de radar, provisiones necesarias, temporizador y recompensas.
- **Investigación:** cuatro mejoras tecnológicas y producción priorizada.
- **Guardado:** partida persistente en `localStorage`, compatible con el formato `dustfall-sim-v1` de la v0.1.
- **Interfaz:** móvil, tablet y PC. Manifiesto PWA y service worker para acceso offline después de la primera visita en HTTPS.

## Cómo jugar

Una hora de juego dura cuatro segundos reales en este prototipo acelerado para probar la mecánica. Toca un edificio para gestionarlo, aumenta el nivel del núcleo, construye un puesto médico y resiste las tormentas del día 2. Gestiona la energía y activa el protocolo durante los temporales. Mejora el radar para salir al exterior. Puedes ver el estado con «Informe de supervivencia».

## Publicación

**GitHub:** crea un repositorio nuevo `DUSTFALL` (inicializado con README). Después se pueden subir a la raíz los archivos de este directorio usando GitHub o herramientas conectadas. **No incluyas las capturas `preview-*.png` ni `play-*.png`** si editas a partir de un directorio de trabajo.

**Cloudflare Pages:** conecta el repo `DUSTFALL`. Framework: `None`. Build command: vacío. Output directory: `/` (raíz). También es posible cargar directamente el contenido de la carpeta con Cloudflare Pages Direct Upload, sin comandos de build.

No necesitas dominio, claves, base de datos ni servicios de pago para ejecutar esta demo.

## Qué está validado y qué falta

- Sintaxis JS validada con Node.
- Pruebas funcionales con Chromium/Playwright sobre HTML, CSS y JS integrados: menú inicial, selección de pestañas, mejora del núcleo, misión y recompensa, evento con elección, reparación, protocolo de refugio y reinicio, sin errores JS.
- Comprobación de desbordamiento horizontal y controles accesibles en 390, 768 y 1440 px.
- *Limitación del entorno de pruebas*: navegación real a servidores locales o `file://` bloqueada por políticas del navegador; no se valida aquí una URL de Cloudflare/producción.
- Pendiente: pruebas reales en iOS/Android, equilibrio de economía en partidas prolongadas, ilustraciones de producción, más capítulos, combate real, enemigos del mapa, exploración libre y backend multijugador.

**Importante:** es un prototipo jugable local, no un juego multijugador final ni una copia visual exacta de Whiteout Survival.
