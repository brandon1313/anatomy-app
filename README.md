# Palpa

App de lecciones cortas de anatomía con contenido redactado por IA y aprobado por una revisora. Especificación completa en [docs/PRD.md](docs/PRD.md).

| Paquete | Qué es |
| --- | --- |
| `packages/contenido` | Esquema zod (contrato de datos), `distanciaABorde`, regla del toque y validación de la salida del generador |
| `apps/api` | NestJS + Prisma + PostgreSQL: autenticación, cola de revisión, generador, láminas e imágenes |
| `contenido/laminas` | Láminas vectoriales (HTML con el dibujo en SVG): fuente de las imágenes, sus zonas y fichas |
| `apps/panel` | React + Vite: panel interno para la revisora y el admin |
| `apps/mobile` | Expo SDK 58 + Expo Router: registro, descarga del paquete y sus imágenes, ruta de lecciones, los 3 ejercicios de texto y los 2 de imagen |
| `packages/visor3d` | Visor 3D: la escena con three.js (`escena.ts`) y la página que la app abre en una WebView, armada en un solo HTML sin CDN (`scripts/construir.mjs`) |

## Arrancar en local

Requisitos: Node 24 (`nvm use` lee `.nvmrc`; las herramientas de React Native 0.88 piden 22.13 o más), pnpm 9 y Docker.

```bash
pnpm install
pnpm db:up                                          # Postgres 16 en el puerto 5433
cp apps/api/.env.example apps/api/.env              # y pon un JWT_SECRETO propio
pnpm --filter @anatomia/contenido build
pnpm --filter @anatomia/api prisma:deploy
pnpm --filter @anatomia/api dev                     # API en :3000
pnpm --filter @anatomia/panel dev                   # panel en :5174 (redirige /api a :3000)
```

`pnpm install` también arma la página del visor 3D (`packages/visor3d/src/generado/`, fuera de git). Para rehacerla después de cambiar el visor: `pnpm --filter @anatomia/visor3d build`. Metro no siempre ve ese archivo generado: si la app sigue con la página anterior, reinicia Expo con `--clear`.

El primer editor o admin se crea registrándose (`POST /auth/registro`) y cambiando el rol:

```bash
pnpm --filter @anatomia/api rol --email revisora@ejemplo.com --rol editor
```

## App

```bash
pnpm --filter @anatomia/mobile start   # QR para Expo Go; tecla w abre la versión web
```

- **En tu teléfono, con Expo Go:** la app tiene que llegar a la API por la red local. Arranca con `EXPO_PUBLIC_API_URL=http://<IP de tu computadora>:3000`.
- **En web** (solo para desarrollo): agrega `http://localhost:8081` a `CORS_ORIGENES` en `apps/api/.env`. En web, los tokens y el paquete se guardan en `localStorage` (`*.web.ts`). En el teléfono, los tokens van en el llavero del sistema (`expo-secure-store`) y el paquete en un archivo (`expo-file-system`).
- **Contenido local:** el paquete se valida con `PaqueteContenido` y se descargan sus imágenes. Solo entonces reemplaza la copia local. Sin conexión, la app sigue con la última copia. Las lecciones completadas se guardan por usuario en el dispositivo.
- **Ejercicios de imagen:**
  - La imagen va a todo el ancho y con su proporción, dentro de una ventana que se desliza.
  - **Identificar:** resalta la zona preguntada y centra la ventana en ella.
  - **Tocar:** califica con `esToqueCorrecto`. Al responder, resalta en verde la parte visible de la zona correcta (el contorno completo va punteado) y marca dónde tocó el estudiante. Si falló, dice qué tocó.
  - **Posición del toque:** en el teléfono viene en `locationX/Y`. En web se calcula con el rectángulo del elemento (`ejercicios/posicion.web.ts`), porque el clic del navegador no trae `locationX`.
  - **Sin imagen:** un ejercicio cuya imagen no se descargó se salta.
- **Lección (rediseño, docs/PLAN-REDISENO.md):** en los 5 tipos, tocar una opción o una estructura solo la selecciona y se puede cambiar. **Comprobar** califica y abre una banda verde o roja con el detalle y la explicación. Hay sonidos (`expo-audio`, archivos propios hechos con `scripts/sonidos.mjs`; respetan el modo silencio) y vibración (`expo-haptics`). La identidad (nombre Palpa, colores y la fuente Lexend) está en [docs/IDENTIDAD.md](docs/IDENTIDAD.md).
- **En 3D:** si la imagen de un ejercicio de tocar o identificar trae `modelo3d` y el modelo tiene su ficha, el ejercicio va sobre el modelo (`ejercicios/Ejercicio3D.tsx`). La escena es una sola WebView por lección (`visor3d/EscenaLeccion.tsx`) que lee la página y el modelo del teléfono. En web, o si el 3D falla, el ejercicio va con la imagen.
  - **Referencias:** al aislar un músculo (identificar, el resultado de un fallo, la presentación), los demás músculos quedan translúcidos y los huesos sólidos, con su nombre. El nombre va en un punto visible del hueso que no tape lo resaltado. El músculo resaltado se dibuja después de los translúcidos, así un músculo profundo se ve completo y no detrás del velo de los que lo cubren.
  - **Indicador de vista:** arriba a la izquierda, "Vista anterior · muslo derecho". Cambia al girar el modelo, y la región sale del título de la imagen.
- **Prueba del visor 3D** (solo en desarrollo y en el teléfono; botón al final de Inicio):
  - Guarda la página del visor y el modelo del muslo en el teléfono, los abre en una WebView y mide cuánto tarda en verse el modelo.
  - **Leer archivo:** la página lee el modelo del teléfono. **Por el puente:** la app se lo manda en base64. **Repetir** mide otra vez con todo ya guardado.
  - El modelo se baja de la API. Hasta que venga en el paquete, se copia a mano al almacén:

    ```bash
    mkdir -p apps/api/almacen/modelos
    cp prototipos/modelo.json apps/api/almacen/modelos/muslo-derecho.json
    cp prototipos/modelo.bin apps/api/almacen/modelos/muslo-derecho.bin
    ```
- **Pendiente para la semana 3:** el repaso con ts-fsrs, la racha, los recordatorios, los intentos en SQLite con `/sync`, reportar error, el perfil, borrar la cuenta y la pantalla de Premium.

## Generador

```bash
pnpm --filter @anatomia/api generar --unidad musculos-muslo --musculos "Recto femoral, Vasto lateral"
```

También desde el panel, en **Generar**. Cada músculo produce 1 ficha y 4 ejercicios (2 de opción múltiple, 1 de emparejar y 1 caso clínico), validados con `SalidaGenerador` y con las reglas del prompt. Si algo no valida, se reintenta hasta 2 veces pasando los errores al modelo. Todo entra como `borrador`, versión 1, y nunca pisa una ficha que ya existe.

- `LLM_PROVEEDOR=anthropic` usa Claude (`LLM_MODELO`, por defecto `claude-opus-5-5`) con salida estructurada. Las credenciales salen de `ANTHROPIC_API_KEY` o del perfil de `ant auth login`.
- `LLM_PROVEEDOR=ejemplo` devuelve la salida de ejemplo del recto femoral, sin llamar a ningún LLM. Sirve para probar el flujo.

## Láminas e imágenes

```bash
pnpm --filter @anatomia/api importar-lamina --archivo ../../contenido/laminas/muslo-derecho-anterior.html \
  --id muslo-anterior --titulo "Muslo derecho, vista anterior"
```

- **Qué importa.** Una lámina es un HTML con el dibujo en SVG, donde cada estructura es un `<g class="part" data-id>`, y sus datos en `const P = {...}`. El importador crea:
  - Las fichas de sus músculos, como borrador. Nunca pisa una ficha que ya existe.
  - Una imagen por capa (superficial y profunda), renderizada a WebP de 1200 px (unos 230 KB), con una zona por músculo sacada del contorno del dibujo.
  - Los ejercicios de tocar e identificar de cada zona, como borrador.
- **Orden de las zonas.** Van en orden de dibujo. Donde se superponen (por ejemplo, el sartorio sobre el recto femoral), el toque lo recibe la de más arriba. Sin superposiciones, el resultado es el mismo que la regla del PRD.
- **Archivos.** En local se guardan en `apps/api/almacen` (`ALMACEN_DIR`) y la API los sirve en `/archivos/<clave>`. La clave lleva el hash del contenido, así que se cachean para siempre. En producción irán a S3.
- **Aprobar una imagen** exige la casilla "Ya borré los nombres impresos" y que cada zona tenga una ficha existente. Al aprobarla se crean o actualizan sus ejercicios: se recalcula lo que depende de las zonas (zona, opciones, correcta) y se conserva lo que escribió la revisora (enunciado, explicación, dificultad).
- **Orden de aprobación.** Un ejercicio de imagen no se puede aprobar antes que su imagen.
- **Distractores.** En los de identificar son las 3 zonas más cercanas con otra ficha.
- **Pendiente:** subir imágenes raster y dibujar zonas a mano en el panel (`POST /admin/imagenes`). Por ahora las imágenes salen de láminas.

### Modelo 3D

```bash
pnpm --filter @anatomia/api importar-modelo --datos ../../prototipos/modelo.json --bin ../../prototipos/modelo.bin \
  --id muslo-derecho --imagenes muslo-anterior-superficial,muslo-anterior-profunda
```

- Guarda el modelo en el almacén (claves con hash) y lo pone como `modelo3d` en cada imagen.
- **Capa:** sale del final del id de la imagen. En la profunda se ocultan las estructuras superficiales, y esas no se preguntan.
- **Estructuras:** solo los músculos con una ficha existente (el id del modelo con guiones). Vasos y nervio quedan fuera de los ejercicios.
- **Revisión:** editar la imagen la regresa a revisión. El modelo llega a la app cuando la revisora vuelve a aprobar la imagen y se publica.
- **Licencia:** BodyParts3D, CC BY 4.0, con el aviso de que se modificó. Se muestra en cada ejercicio 3D.

## Pruebas

```bash
pnpm test        # contenido + api
pnpm typecheck
```

## Decisiones tomadas sobre el PRD

- **Cambios al esquema** (marcados al inicio de `esquema-contenido.ts`):
  - `SalidaGenerador` solo acepta los 3 tipos de ejercicio de texto.
  - `ProgresoFicha.dificultad` acepta 0, como en las tarjetas nuevas de ts-fsrs.
  - `ProgresoFicha` agrega `diasProgramados`, `pasosAprendizaje` y `ultimoEjercicioId`.
- **Estados:**
  - Editar algo aprobado lo regresa a `en_revision` y sube su versión.
  - Editar algo rechazado lo regresa a `en_revision` y conserva la nota.
  - "Enviar a revisión" pasa un borrador a `en_revision`.
  - Se puede aprobar desde borrador, en revisión o rechazada.
- **Tablas extra:** `tokens_renovacion` (se guarda solo el hash y se rotan en cada renovación) y `configuracion` (firma del revisor y precio de Premium).
- **Borrar la cuenta** borra en cascada todos los datos del usuario, incluidos intentos y eventos.
- **Curso:** el PRD no decía dónde se arma. El panel tiene la página **Curso** (lecciones y sus ejercicios) y la API `GET`/`PUT /admin/curso`. La beta tiene un solo curso. El id de cada lección sale de su título al crearla y no cambia, porque el progreso del estudiante depende de él.
- **Publicar** (solo admin, `POST /admin/publicar`):
  - Arma el paquete solo con lo aprobado y corre `PaqueteContenido.parse` y `erroresDeConsistencia`.
  - Si una lección incluye algo sin aprobar, el error dice su estado en vez de "no existe".
  - No publica una versión idéntica a la anterior (409).
- **Paquete actual:** la app lo pide con `GET /paquete/actual?desde=N`, que trae el contenido solo si hay una versión más nueva que N.
