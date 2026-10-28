# Identidad: Palpa

Decisión del dueño del producto (27-10-2026): nombre, colores y fuente propios, para no parecer una copia de Duolingo. La app los toma de `apps/mobile/src/tema.ts`.

## Nombre

- **Palpa.** Palpar es como los fisioterapeutas reconocen músculos y relieves óseos, y es lo que hace la app: tocar el músculo. Es corto y se lee igual en español y en inglés.
- **Lema:** "Anatomía que se toca".
- **Logotipo provisional:** "palpa" en minúsculas, Lexend Bold, en el teal de la marca (pantalla de bienvenida).
- **Lo que no cambió en el código:** el `slug` y el `scheme` siguen siendo `anatomia`, igual que las carpetas internas `anatomia/`. Cambiarlos rompería el enlace con el proyecto de EAS, la firma de Expo Go y lo que ya se descargó en los teléfonos. Se cambian al preparar las tiendas.

## Colores

| Rol | Tokens | Hex | Dónde |
| --- | --- | --- | --- |
| Marca | `marca`, `marcaSombra`, `marcaTexto`, `marcaSuave` | `#0E8C80`, `#0A6B62`, `#0B7369`, `#E0F4F1` | Botones principales, progreso, lección siguiente, unidad |
| Elegido | `acento`, `acentoSuave`, `acentoBorde` | `#4F4FCF`, `#ECEBFF`, `#B9B6FF` | Lo seleccionado antes de comprobar. En 3D, `#5B5BD6` |
| Músculo | `coral`, `coralTexto` | `#F26D5B`, `#B8412F` | Lema, "Repasemos el que fallaste" |
| Hueso | `hueso`, `huesoTexto` | `#F3E9D2`, `#6E5A32` | Caso clínico; nombres de los huesos en 3D |
| Acierto | `verde`, `verdeSuave`, `verdeBoton`, `verdeSombra` | `#16743F`, `#DFF6E8`, `#1F9D55`, `#177A42` | Banda y botón al acertar. En 3D, `#2FBF71` |
| Error | `rojo`, `rojoSuave`, `rojoBoton`, `rojoSombra` | `#B42318`, `#FDE4E4`, `#D93A3A`, `#A82C2C` | Banda y botón al fallar. En 3D, `#E5484D` |
| Logro | `logro`, `logroSombra`, `logroTexto` | `#E8A317`, `#C48810`, `#5C3D00` | Lecciones completadas y resultado |
| Neutros | `texto`, `tenue`, `borde`, `bloqueado` | `#24323A`, `#5C6B73`, `#E3E6EA`, `#A7AEB3` | Texto, apoyo, bordes, lo bloqueado |

- El verde y el rojo son solo para acierto y error.
- Todo color que va como texto tiene contraste AA sobre su fondo. Los botones usan texto grande.
- Los botones van en minúsculas normales ("Comprobar"), no en mayúsculas.

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
- **Ícono y logotipo:** hoy el ícono de la app es el de Expo.
- **Panel:** solo cambió su nombre. Su estilo es de herramienta interna.
- **Prototipos:** los de `prototipos/` conservan la paleta vieja como registro de cómo se llegó aquí.
