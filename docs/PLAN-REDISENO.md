# Plan del rediseño visual y del modelo 3D

Propuesta para llevar a la app lo que se probó en los [prototipos](../prototipos/README.md). Las decisiones de la tabla le corresponden al dueño del producto.

## Qué ve el estudiante

- **Elegir y luego Comprobar.** En los 5 tipos de ejercicio, tocar una opción o una estructura solo la selecciona, y se puede cambiar hasta tocar **Comprobar**. Después aparece una banda abajo, verde o roja y con ícono, que dice:
  - si acertó;
  - qué eligió, si falló;
  - la explicación;
  - y el botón **Continuar**.
- **Sonidos y vibración.** Hay uno al acertar, otro al fallar y otro al terminar la lección.
- **Tocar en 2D.** El toque resalta la zona entera, no un punto. Al comprobar, la correcta queda en verde y, si falló, la elegida en rojo.
- **Imágenes a la medida de la pantalla.** La lámina cabe entera. **Ampliar** la pasa a todo el ancho y activa el scroll.
- **Modelo 3D.**
  - Se gira con un dedo y se acerca pellizcando.
  - Tiene botones de vista: anterior, lateral, medial y posterior.
  - Al tocar, se selecciona el músculo completo. Si falla, la cámara gira hasta el correcto.
- **Inicio y final.** El inicio muestra un camino de lecciones (completadas, siguiente y bloqueadas). Al final, una pantalla con trofeo, aciertos y tiempo.
- **Se mantiene:** los ejercicios fallados se repiten una vez al final.

## Decisiones

| # | Decisión | Recomendación |
| --- | --- | --- |
| 1 | ¿El 3D reemplaza a la lámina 2D? | Que convivan. El 3D se usa en el muslo, que es el único modelo. La lámina queda para las regiones sin modelo y para los teléfonos donde el 3D no corra bien. Lo 2D ya está hecho y se revisa en el panel. |
| 2 | Zoom y tamaño de la imagen | El PRD deja el zoom fuera de la fase 1, y Ampliar y el pellizco en 3D lo son. También pide la imagen a todo el ancho, y ajustarla al alto deja márgenes. Si se acepta, se anota el cambio de alcance en el PRD. Las coordenadas siguen normalizadas al tamaño mostrado. |
| 3 | Vista inicial de "tocar" en 3D | En las lecciones, la vista del músculo: es más fácil y ya indica si es anterior o posterior. En el repaso, siempre la anterior. |
| 4 | Vasos agrupados | `arteria_femoral` incluye la circunfleja femoral lateral y su rama descendente, y `vena_femoral`, la femoral profunda. Así, tocar la circunfleja contaría como "arteria femoral". Hay que separarlas antes de usarlas en ejercicios. |
| 5 | Nervio femoral | Es un trazado propio del autor del archivo, aproximado y que no viene de BodyParts3D. Queda fuera de los ejercicios hasta que la revisora lo apruebe. |
| 6 | Sonido | Respetar el modo silencio del teléfono y agregar un interruptor en Perfil. |
| 7 | Estilo | Inspirado en Duolingo, pero con paleta y nombre propios, sin copiar su marca ni su mascota. |

## Cómo llevarlo a la app

### Prueba técnica del visor

Antes de tocar el esquema, se monta el visor 3D dentro de la app, en Expo Go, y se prueba en un iPhone y en un Android de gama baja.

- **Cómo:** una WebView (`react-native-webview`, incluida en Expo Go) con un HTML local que trae three.js adentro (sin CDN, para que funcione sin conexión). El modelo se lee del almacenamiento del teléfono.
- **Qué medir:**
  - el tiempo hasta ver el modelo (el PRD pide que una lección abra en menos de 1 segundo);
  - la memoria;
  - que girar y tocar no se confundan.
- **Plan B:** si la WebView no alcanza, react-three-fiber con expo-gl. Es nativo y no pasa por un puente, pero hay que rehacer los gestos, los controles y los materiales.
- **Estado:**
  - La pantalla de prueba ya está en la app: Inicio → **Prueba del visor 3D**, solo en desarrollo; cómo usarla está en el README.
  - Mide por separado: preparar los archivos, abrir la WebView con three.js, leer el modelo, la luz de ambiente, armar las mallas y el primer cuadro.
  - En el navegador de la computadora funcionan los dos modos: leer el archivo y recibirlo por el puente.
  - Falta medir en el iPhone y en un Android de gama baja, y anotar aquí los resultados.
- **Hecho después (sin esperar la medición, a pedido del dueño del producto):**
  - Rediseño común en los 5 tipos, camino de inicio y pantalla final.
  - Lecciones con 3D. Se tomó un atajo sobre lo propuesto abajo: en lugar de una entidad `Modelo3D` aparte, el modelo va como `modelo3d` dentro de cada imagen. Así se revisa con ella, no hace falta otra tabla y los ejercicios de tocar e identificar son los mismos.

### Contenido y API

- **`Modelo3D` en `packages/contenido`.** Se revisa igual que una imagen. Lleva:
  - id y título;
  - el archivo (clave en el almacén);
  - las estructuras (id, tipo y ficha) y la vista de cada una;
  - las capas (la profunda oculta el sartorio, el recto femoral y el aductor largo);
  - la licencia, el estado y la versión.
- **Ejercicios.** Se mantienen los 5 tipos del PRD. `tocar_estructura` e `identificar_imagen` apuntan a una imagen y una zona, o a un modelo y una estructura (más la vista y la capa).
- **Regla del toque en 3D.**
  - Es acierto si la estructura tocada es la correcta.
  - Si el dedo no cae sobre nada, se busca hasta 18 px alrededor, el equivalente del 0.015 del 2D.
  - Gana lo sólido: por ejemplo, el vasto lateral que está bajo el tracto iliotibial.
- **Importador.** `importar-modelo` funciona como `importar-lamina`:
  - lee el HTML 3D y guarda el `.bin` en el almacén;
  - enlaza cada estructura con su ficha;
  - crea un ejercicio de tocar y uno de identificar por estructura, como borradores;
  - los distractores son las 3 estructuras más cercanas del mismo tipo.
- **Paquete.** El modelo (1.5 MB) se descarga con el contenido, igual que las imágenes, antes de reemplazar la copia local.
- **Panel.** Una página del modelo con el visor: la revisora toca cada estructura, ve su nombre y su ficha, y la aprueba. Un ejercicio 3D no se aprueba antes que su modelo.

### App

- **Tema.** Nunito (`@expo-google-fonts/nunito`), colores, botones con borde inferior y barra de progreso.
- **Ejercicios.**
  - En los 5 tipos se separa "elegido" de "comprobado", con Comprobar fijo abajo y la banda de resultado.
  - En emparejar, los pares se arman y se deshacen libremente, y Comprobar marca en rojo los incorrectos.
- **Sonidos y vibración.**
  - Sonidos: `expo-audio` con 3 archivos propios generados por código, sin licencias de terceros.
  - Vibración: `expo-haptics`, al acertar, al fallar y un toque leve al elegir.
- **3D en la lección.**
  - Una sola WebView dura toda la lección: se crea al abrirla y se oculta en los ejercicios sin 3D, para no recargar el modelo en cada uno.
  - La app le manda el ejercicio y recibe la estructura tocada.
- **Accesibilidad.**
  - El rojo y el verde siempre van con ícono y texto.
  - En 3D se agrega una etiqueta sobre la estructura correcta, porque con daltonismo un músculo rojo y uno verde se confunden.
  - Los botones de vista miden al menos 44 px; en el prototipo miden 34.

## Licencia y textos

- **Atribución.** BodyParts3D es de The Database Center for Life Science, con licencia CC BY 4.0 (según su página de licencia, actualizada el 27-02-2025). La licencia pide dar crédito y avisar que se modificó: "Modelo: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Simplificado y agrupado". El aviso va en cada ejercicio 3D y en Perfil → Créditos.
- **Versión.** Hay que confirmar que las mallas vienen de la versión actual. Las anteriores eran CC BY-SA 2.1 JP, que obliga a compartir las obras derivadas con la misma licencia.
- **Textos.** Los del archivo 3D no pasan a la app: ahí se usan las fichas aprobadas. Además, repiten el error de la lámina en el iliopsoas: dicen "apófisis transversas de T12 a L5", y son de L1 a L5.

## Orden

1. Prueba técnica del visor 3D. Decide si se sigue con la WebView.
2. Rediseño común en los 5 tipos: tema, Comprobar, banda, sonidos y vibración. No depende del 3D.
3. Tocar en 2D con la zona resaltada, y Ampliar con scroll.
4. `Modelo3D`, importador y panel.
5. Ejercicios 3D en la app.
6. Camino de inicio y pantalla final.
