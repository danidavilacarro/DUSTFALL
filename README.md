# DUSTFALL — Survival City · prototipo v0.4

Juego original de **supervivencia, construcción y progresión**, inspirado en las dinámicas de gestión de asentamientos de juegos como *Whiteout Survival*, sin utilizar gráficos, código ni elementos de identidad de otros juegos.

## Cambios de v0.4 — supervivencia activa

- **Mando de soporte vital:** acceso desde la ciudad a tres decisiones persistentes: racionamiento de comida (limitado/normal/generoso), potencia de filtrado (ahorro/normal/máxima) y recuperación de agua.
- **Costes y consecuencias de verdad:** ahorro de comida a cambio de menor moral y posibles enfermedades; filtración reforzada a cambio de energía; recuperación hídrica a cambio de electricidad. Todas las políticas afectan a las cifras de la simulación por hora.
- **Balance y alertas:** el mando muestra el balance neto de agua, comida y energía; la barra de estado indica si la supervivencia es crítica. El Núcleo reacciona visualmente a la calidad del aire.
- **Partidas conservadas:** añade solamente el campo opcional \`state.v04\`, preservando \`dustfall-sim-v1\` y los campos de v0.2 y v0.3.
- **Despliegue estático:** se incluye \`survival-v04.js\` en la caché PWA y se renueva su versión.

**Limitaciones:** esto no convierte aún la ciudad en un juego de calidad comercial ni implementa multijugador, cadenas logísticas avanzadas o arte 3D final. Falta validar en móvil físico, partidas largas y el despliegue Cloudflare.

## Cambios de v0.3

- **Turnos de trabajo asignables:** seis áreas (agua, comida, energía, recuperación, guardias y medicina), con botones para mover colonos entre instalaciones y efecto directo sobre la producción. El personal enfermo y expedicionario no está disponible.
- **Asaltos de saqueadores:** empieza el día 4 y se repite cada cuatro días. Decide resistir, fortificar o negociar. Defensa calculada con murallas, guardias y núcleo; heridas y daños persistentes al refugio.
- **Ciudad día/noche:** iluminación nocturna, faros encendidos y balizas visibles durante una incursión.
- **Guardado compatible con la v0.2:** los datos de v0.3 se guardan dentro de `dustfall-sim-v1`, sin reiniciar el progreso.
- **Caché offline renovada:** `sw.js` incluye el nuevo módulo y actualiza su versión de caché.

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

**GitHub:** repositorio existente [danidavilacarro/DUSTFALL](https://github.com/danidavilacarro/DUSTFALL), rama `main`. El directorio raíz contiene el juego estático. Mantén las partidas existentes y evita sustituir el código por versiones locales antiguas sin revisar las diferencias.

**Cloudflare Pages:** utiliza la integración con GitHub del repositorio existente si está conectada. Framework: `None`; build command: vacío; directorio de salida: `/` (raíz). Las modificaciones en `main` pueden generar un despliegue automático si la integración está correctamente configurada. **El despliegue de producción debe verificarse en Cloudflare: no está confirmado solo por el commit en GitHub.**

No necesitas dominio, claves, base de datos ni servicios de pago para ejecutar esta demo.

## Qué está validado y qué falta

- Sintaxis JS validada con Node.
- Pruebas funcionales con Chromium/Playwright sobre HTML, CSS y JS integrados: menú inicial, selección de pestañas, mejora del núcleo, misión y recompensa, evento con elección, reparación, protocolo de refugio y reinicio, sin errores JS.
- Comprobación de desbordamiento horizontal y controles accesibles en 390, 768 y 1440 px.
- *Limitación del entorno de pruebas*: navegación real a servidores locales o `file://` bloqueada por políticas del navegador; no se valida aquí una URL de Cloudflare/producción.
- Pendiente: pruebas reales en iOS/Android, equilibrio de economía en partidas prolongadas, ilustraciones de producción, más capítulos, combate real, enemigos del mapa, exploración libre y backend multijugador.

**Importante:** es un prototipo jugable local, no un juego multijugador final ni una copia visual exacta de Whiteout Survival.

## Visual Overhaul V1

La rama `feature/visual-overhaul-v1` incorpora una ciudad Canvas de pantalla completa,
nueve edificios originales con tres etapas por niveles reales, cámara táctil con pinza,
habitantes vinculados al personal y emergencias de la simulación. Conserva las partidas
`dustfall-sim-v1` y el despliegue estático. Véanse [implementación, pruebas y límites](docs/VISUAL-OVERHAUL-V1.md)
y [manifiesto de recursos originales](assets/manifest.json).

Ejecutar localmente: `python -m http.server 8000` desde la raíz. Validación funcional:
`python tests/visual_overhaul.py` (Python Playwright y Chromium). No hay build ni
instalación de dependencias para jugar. Los scripts de prueba no forman parte del juego.
