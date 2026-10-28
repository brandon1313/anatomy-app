# Plan de contenido: 3 unidades del miembro inferior

Decisión del dueño del producto (28-10-2026): la beta pasa de 1 unidad a 3, todas del miembro inferior, y no lleva vidas. Los músculos de cada unidad son una propuesta: la revisora decide la lista final.

## Por qué

- **Una unidad no alcanza.** El muslo son 3 lecciones de unos 3 minutos: un estudiante lo terminaba en menos de una hora y después solo quedaba el repaso. Con unos 37 músculos hay contenido para 3 o 4 semanas a una lección por día, más que las 2 semanas de la beta.
- **Miembro inferior completo, no regiones sueltas.** Comparte el modelo de BodyParts3D, el generador, la revisión y el editor de zonas; a un estudiante de fisioterapia le sirve dominar el miembro inferior entero, y el repaso mezcla fichas de las 3 unidades.
- **Publicarlas por partes.** Las unidades 2 y 3 pueden salir durante la beta: el paquete nuevo se descarga solo al abrir la app, y "hay una unidad nueva" es una razón para volver.

## Sin vidas

- Castigan el error, y en anatomía equivocarse y leer la explicación es como se aprende: quien más falla, que es quien más necesita practicar, es quien se queda sin poder seguir.
- Son el mecanismo más reconocible de Duolingo ([IDENTIDAD.md](IDENTIDAD.md)).
- Ensucian la medición: si alguien no vuelve, no se sabría si fue por el contenido o por la frustración.
- Existen para vender "vidas ilimitadas", y la beta no cobra.

Ideas que dan algo en juego sin castigar, para decidir después de la beta: la mejor marca por lección (repetirla para mejorarla) y un modo examen opcional por unidad, sin explicaciones, para practicar antes de un parcial.

## Unidades

### 1. Muslo (existe; falta el compartimento posterior)

| Lección | Músculos | Lámina |
| --- | --- | --- |
| Capa superficial: reconocer | Sartorio, recto femoral, vasto lateral, vasto medial, tensor de la fascia lata, grácil, aductor largo, pectíneo, iliopsoas | Muslo anterior, superficial (existe) |
| Capa superficial: tocar | Los mismos | Muslo anterior, superficial (existe) |
| Capa profunda | Vasto intermedio, aductor corto, aductor mayor y los que quedan debajo | Muslo anterior, profunda (existe) |
| **Muslo posterior (nueva)** | Bíceps femoral (cabeza larga y corta), semitendinoso, semimembranoso | **Muslo posterior (falta)** |

El PRD ya pedía la vista posterior del muslo; sin ella faltan los isquiotibiales.

### 2. Glúteo y cadera (nueva)

| Lección | Músculos | Lámina |
| --- | --- | --- |
| Capa superficial | Glúteo mayor, glúteo medio | Región glútea, superficial |
| Capa profunda | Glúteo menor, piriforme | Región glútea, profunda |
| Rotadores laterales | Gemelo superior, gemelo inferior, obturador interno, obturador externo, cuadrado femoral | Región glútea, profunda |

9 músculos. El iliopsoas y el tensor de la fascia lata ya están en el muslo; el repaso los vuelve a traer.

### 3. Pierna (nueva)

| Lección | Músculos | Lámina |
| --- | --- | --- |
| Compartimento anterior | Tibial anterior, extensor largo de los dedos, extensor largo del dedo gordo, fibular (peroneo) tercero | Pierna, anterolateral |
| Compartimento lateral | Fibular (peroneo) largo, fibular (peroneo) corto | Pierna, anterolateral |
| Posterior superficial | Gastrocnemio, sóleo, plantar | Pierna, posterior superficial |
| Posterior profundo | Poplíteo, tibial posterior, flexor largo de los dedos, flexor largo del dedo gordo | Pierna, posterior profunda |

13 músculos. **Para la revisora:** decidir si el nombre principal es "fibular" (Terminologia Anatomica) o "peroneo" (el que más se usa en clase); el otro va como sinónimo en la ficha.

**Total:** 12 + 3 + 9 + 13 = 37 músculos, 11 lecciones y 6 láminas nuevas (1 del muslo, 2 de la región glútea y 3 de la pierna).

## Cómo se hace cada unidad

Con las herramientas que ya existen, en este orden:

1. **Fichas y ejercicios de texto.** `pnpm --filter api generar --unidad <unidad> --musculos "..."`, o el botón Generar del panel. Quedan en borrador.
2. **Revisión.** La revisora corrige y aprueba cada ficha y sus ejercicios en el panel. Es el cuello de botella: unas 12 fichas por unidad.
3. **Láminas.** Imágenes de dominio público o con licencia abierta, con los nombres impresos borrados; se importan y en el editor de zonas se dibuja una zona por músculo con su ficha. Los ejercicios de imagen se generan por código al aprobarlas.
4. **Modelo 3D (opcional por unidad).** Hoy solo existe el del muslo, que vino de un archivo armado a mano. Para la región glútea y la pierna hace falta un proceso nuevo que tome las mallas de BodyParts3D (CC BY 4.0, confirmar la versión), las simplifique y las agrupe por músculo para `importar-modelo`. Sin modelo, la unidad funciona con las láminas 2D.
5. **Curso.** En el panel (Curso) se crean la unidad y sus lecciones.
6. **Publicar.** El admin publica y la app descarga el paquete nuevo.

## Cambios en la app

- **Inicio con varias unidades.** Hoy muestra solo el encabezado de la primera unidad; el camino ya sigue por todas las lecciones, pero cada unidad necesita su encabezado ("Unidad 2 · Glúteo y cadera").
- **Premium.** El primer beneficio por defecto decía "no solo el muslo"; ahora habla de las regiones que quedan fuera de la beta.

## Orden propuesto

1. Muslo posterior: completa la unidad que ya está y solo pide 1 lámina.
2. Encabezados de unidad en Inicio.
3. Glúteo y cadera, en 2D.
4. Pierna, en 2D.
5. Modelos 3D de la región glútea y de la pierna, si el tiempo alcanza.
