# Identidad: Palpa

Decisión del dueño del producto (27-10-2026): nombre, colores y fuente propios, para no parecer una copia de Duolingo. La app los toma de `apps/mobile/src/tema.ts`.

## Nombre

- **Palpa.** Palpar es como los fisioterapeutas reconocen músculos y relieves óseos, y es lo que hace la app: tocar el músculo. Es corto y se lee igual en español y en inglés.
- **Lema:** "Anatomía que se toca".
- **Logotipo (29-10-2026, "Origen e inserción"):** el símbolo es una "p" hecha con un hueso en teal y un músculo en coral que sale de él, seguido del nombre "palpa" en Lexend Bold, convertido a trazos.
  - Los archivos están en [marca/](marca/LEEME.md): logo a color y en blanco (SVG y PNG), solo el símbolo y el avatar para redes (1080 × 1080, sirve recortado en círculo).
  - En la app, el componente `Logo` (`apps/mobile/src/componentes/Logo.tsx`) lo dibuja en la bienvenida.
  - El panel usa el símbolo como favicon.
- **Lo que no cambió en el código:** el `slug` y el `scheme` siguen siendo `anatomia`, igual que las carpetas internas `anatomia/`. Cambiarlos rompería el enlace con el proyecto de EAS, la firma de Expo Go y lo que ya se descargó en los teléfonos. Se cambian al preparar las tiendas.

## Colores

| Rol | Tokens | Hex | Dónde |
| --- | --- | --- | --- |
| Marca | `marca`, `marcaSombra`, `marcaTexto`, `marcaSuave` | `#009E8F`, `#007A6E`, `#00796D`, `#D6F5F0` | Botones principales, progreso, lección siguiente, unidad |
| Elegido | `acento`, `acentoSuave`, `acentoBorde` | `#5A4BF0`, `#EEEBFF`, `#B3A9FF` | Lo seleccionado antes de comprobar. En 3D, `#6A5CFF` |
| Músculo | `coral`, `coralTexto` | `#FF6650`, `#C23A26` | Lema, "Repasemos el que fallaste" |
| Hueso | `hueso`, `huesoTexto` | `#F8ECD0`, `#6E5A32` | Caso clínico; nombres de los huesos en 3D |
| Acierto | `verde`, `verdeSuave`, `verdeBoton`, `verdeSombra` | `#11733C`, `#D9F8E5`, `#10A050`, `#0B7F3E` | Banda y botón al acertar. En 3D, `#1FC46F` |
| Error | `rojo`, `rojoSuave`, `rojoBoton`, `rojoSombra` | `#B42318`, `#FFE2E2`, `#E5363C`, `#B0262B` | Banda y botón al fallar. En 3D, `#F0444B` |
| Logro | `logro`, `logroSombra`, `logroTexto` | `#FFB41F`, `#D99200`, `#5C3D00` | Lecciones completadas y resultado |
| Neutros | `texto`, `tenue`, `borde`, `bloqueado` | `#24323A`, `#5C6B73`, `#E3E6EA`, `#A7AEB3` | Texto, apoyo, bordes, lo bloqueado |

- El verde y el rojo son solo para acierto y error.
- Todo color que va como texto tiene contraste AA sobre su fondo. Los botones y el título de la unidad usan texto grande, que pide 3:1: el blanco sobre `marca` da 3.3:1.
- 28-10-2026: la paleta subió de saturación (la primera se veía apagada). Mismos tonos, más vivos.
- Los botones van en minúsculas normales ("Comprobar"), no en mayúsculas.

## Íconos

- **Phosphor** (`phosphor-react-native`, licencia MIT), en lugar de emojis: cada sistema dibuja los emojis distinto y no siguen la paleta.
- Todos pasan por `apps/mobile/src/componentes/Icono.tsx`, con nombres propios (`racha`, `candado`, `estrella`, `trofeo`, `check`, `cerrar`, `ver`, `reportar`, `atras`, `siguiente`) y colores de `tema.ts`. Se importan uno por uno, porque Metro no descarta los que no se usan.
- **Pesos:** relleno para la llama, las estrellas, el candado y el check (CheckFat, blanco sobre el dorado de lección completada); *duotone* para el trofeo; negrita para la X y las flechas.
- Son decorativos: el texto accesible va en el botón o la vista que los contiene.

## Tipografía

- **Lexend** (Google Fonts, licencia SIL OFL 1.1): se puede usar en una app comercial e incluir en ella. Está diseñada para facilitar la lectura.
- **Pesos:** 400 para texto, 500 para apoyo, 600 para enunciados y botones, y 700 para títulos.

## Distancia con Duolingo

No es asesoría legal: el registro de la marca necesita un abogado.

- **Lo que se quitó:**
  - El verde principal, casi igual al suyo (`#58CC02`).
  - Dos de sus colores oficiales exactos: Bee `#FFC800` y Fox `#FF9600`.
  - Nunito y los botones en mayúsculas.
- **Lo que no es de nadie y se queda:** verde y rojo para acierto y error, la racha, el camino de lecciones y el botón Comprobar. Los sonidos son propios (`apps/mobile/scripts/sonidos.mjs`).
- **Lo que no se usa:**
  - Un búho ni otra ave como mascota.
  - Sus fuentes (Feather Bold, que es suya, y DIN Next Rounded, de Monotype).
  - Sus sonidos.
  - Pantallas calcadas.

## Pendiente antes de publicar

- **Búsqueda de marcas:** en la WIPO Global Brand Database y en el Registro de la Propiedad Intelectual de Guatemala, clases 9 (software) y 41 (educación). Una búsqueda rápida en la web no encontró apps llamadas Palpa. Lo más cercano es PalpationMapp, en inglés.
- **Registros:** la marca (con abogado), el dominio y los usuarios en redes.
- **Ícono de la app:** ya está en `apps/mobile/assets` (`icon.png`, el adaptable de Android con fondo `#009E8F`, el monocromo y el de notificaciones). Se ve a partir del siguiente build; en Expo Go siempre sale el ícono de Expo Go.
- **Pantalla de carga:** `splash-icon.png` está en `assets`, pero falta el plugin `expo-splash-screen` para usarla.
- **Panel:** solo cambió su nombre. Su estilo es de herramienta interna.
- **Prototipos:** los de `prototipos/` conservan la paleta vieja como registro de cómo se llegó aquí.
