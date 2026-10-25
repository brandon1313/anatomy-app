# PRD — App de anatomía verificada (Fase 1: beta)

Oct 25, 2026 · @Brandon Gomez

Especificación para que un agente construya la beta. Entrégala junto con `esquema-contenido.ts` y `ejemplo-generador.json`, que son parte del contrato.

## Objetivo

Construir en 4 semanas una beta mobile (iOS y Android) para aprender los músculos del muslo con lecciones cortas, y probarla 2 semanas con 15–20 estudiantes de fisioterapia para medir si vuelven solos, si el contenido es confiable y si pagarían.

- **Producto:** app de lecciones cortas tipo Duolingo, en español, con contenido redactado por IA y aprobado por una revisora experta antes de publicarse.
- **Fuente de verificación:** *Principios de Anatomía y Fisiología* (Tortora y Derrickson). Ningún texto, cuadro ni ilustración del libro se copia a la app.
- **Contrato de datos:** `esquema-contenido.ts` (zod 4) es la fuente de verdad; ya compila en modo estricto y trae validación entre colecciones y detección de toques. `ejemplo-generador.json` muestra la salida esperada del generador.
- **Nombres en el código:** los conceptos del dominio usan los nombres en español del esquema (ficha, zona, ejercicio, revisión).

## Alcance

La beta cubre una sola unidad, "Músculos del muslo", con los músculos que defina la revisora (alrededor de 12) y 2 imágenes: muslo en vista anterior y en vista posterior.

**Incluye**

- App mobile: registro con correo y contraseña, ruta de lecciones, 5 tipos de ejercicio, repaso espaciado, racha, recordatorio diario, reportar error, modo sin internet, borrar cuenta y una pantalla de interés en Premium sin cobro.
- API con NestJS y PostgreSQL.
- Panel web interno: cola de revisión, edición y aprobación, editor de zonas, reportes, publicación de paquetes y métricas.
- Generador con IA para fichas y ejercicios de texto; generación por código de los ejercicios de imagen.

**No incluye (Fase 2 o después)**

- Pagos y suscripciones, vidas, XP, ligas.
- Inicio de sesión con Google o Apple.
- Otras unidades y los ejercicios "completar la ficha" y "terminología".
- Zoom sobre las imágenes.
- Panel para catedráticos y licencias por universidad.
- Notificaciones enviadas desde el servidor y otros idiomas.

## Roles

Hay tres roles, guardados en `usuarios.rol`; el panel solo acepta editor y admin.

| Rol | Dónde trabaja | Puede |
| --- | --- | --- |
| Estudiante | App | Registrarse, tomar lecciones y repasos, reportar errores, mostrar interés en Premium, borrar su cuenta |
| Editor (revisora) | Panel | Generar contenido, editar, aprobar o rechazar, dibujar zonas, atender reportes |
| Admin | Panel | Todo lo del editor, más publicar paquetes, ver métricas y cambiar roles |

## Arquitectura y repositorio

Un monorepo con pnpm workspaces; el esquema vive en un paquete que importan la app, la API y el panel, sin duplicar tipos.

```text
/
├─ apps/
│  ├─ mobile/      Expo + Expo Router (TypeScript)
│  ├─ api/         NestJS + PostgreSQL + generador (script)
│  └─ panel/       React + Vite (web interna)
├─ packages/
│  └─ contenido/   esquema-contenido.ts + utilidades compartidas
└─ docs/
   └─ PRD.md
```

| Pieza | Tecnología |
| --- | --- |
| App | Expo SDK estable más reciente, Expo Router, react-native-svg, expo-notifications, expo-file-system, expo-sqlite |
| Repaso espaciado | ts-fsrs |
| API | NestJS, Prisma, PostgreSQL 16 o superior, argon2, JWT |
| Panel | React + Vite |
| Archivos | Almacenamiento tipo S3 para imágenes y paquetes publicados |
| Builds y tiendas | EAS Build y EAS Submit |

- Copiar `esquema-contenido.ts` tal cual a `packages/contenido/src/` y agregar ahí `distanciaABorde(punto, zona)` (sección de ejercicios).
- Si Metro tiene problemas con pnpm, usar `node-linker=hoisted` en `.npmrc`.
- Variables de entorno para todo lo sensible (base de datos, JWT, almacenamiento, clave del LLM); nada de secretos en el repositorio.

## Modelo de datos

El contenido se guarda como JSONB validado con zod antes de cada escritura; las columnas aparte sirven para filtrar y ordenar.

| Tabla | Columnas clave | Contenido de `data` o nota |
| --- | --- | --- |
| `usuarios` | id (uuid), email (único), hash, nombre, universidad, rol, zona\_horaria, creado | rol: estudiante, editor, admin |
| `fichas` | id (slug), estado, version, data, revisado\_por, revisado\_en, actualizado | `FichaMusculo` |
| `imagenes` | id, estado, version, data, archivo\_url | `Imagen`, con sus zonas |
| `ejercicios` | id, tipo, estado, version, data | `Ejercicio` |
| `cursos` | id, data | `Curso`, con unidades y lecciones |
| `paquetes` | version (entero), contenido, publicado\_por, publicado\_en | `PaqueteContenido`; nunca se modifica |
| `intentos` | id (uuid generado en el dispositivo), usuario\_id, ejercicio\_id, correcto, ms\_respuesta, respondido\_en, paquete\_version | Base de las métricas |
| `progreso_ficha` | usuario\_id + ficha\_id (llave), campos de `ProgresoFicha` | Un registro por usuario y ficha |
| `rachas` | usuario\_id (llave), actual, maxima, ultimo\_dia |  |
| `reportes_error` | campos de `ReporteError` + estado (abierto, resuelto) |  |
| `eventos` | id, usuario\_id, nombre, propiedades (jsonb), creado | Ver medición de la beta |
| `interes_premium` | usuario\_id, plan, creado | Pantalla de interés en Premium |

- Cualquier cambio a un elemento aprobado lo regresa a `en_revision` y sube su `version`.
- Cada publicación crea un paquete nuevo con la versión siguiente; los anteriores quedan intactos.

## Flujo de contenido

Nada se aprueba solo: la IA y el código producen borradores, la revisora decide y el admin publica.

1. **Generar.** Un comando (`pnpm --filter api generar --unidad musculos-muslo --musculos "Recto femoral, Vasto lateral"`) o un botón del panel arma el prompt, pide al LLM una salida con el formato `z.toJSONSchema(SalidaGenerador)` y la valida con `SalidaGenerador`. Si no valida, reintenta hasta 2 veces pasando los errores. Todo se guarda como `borrador`, versión 1.
2. **Ejercicios de imagen por código.** Al aprobar una imagen, por cada zona se crean un `tocar_estructura` y un `identificar_imagen`, este con 3 distractores tomados de otras zonas de la misma imagen. Entran como `borrador`.
3. **Revisar.** La revisora edita, aprueba o rechaza en el panel. Aprobar llena `revisadoPor` y `fecha`; rechazar exige una nota.
4. **Publicar.** El admin arma el `PaqueteContenido` solo con elementos aprobados y corre `PaqueteContenido.parse` y `erroresDeConsistencia`. Con errores no se publica y se muestran; sin errores se guarda la versión nueva.
5. **Corregir.** Un reporte de error abierto aparece en el panel junto a su ejercicio; la corrección pasa por revisión y entra en la siguiente publicación.

**Reglas del prompt del generador**

- Español, con la nomenclatura anatómica actual y los nombres comunes en `nombre.sinonimos` (por ejemplo, fibular y peroneo).
- Nunca copiar ni parafrasear de cerca textos de libros; redactar con palabras propias.
- Por ficha: 2 de opción múltiple (inervación y acción), 1 de emparejar y 1 caso clínico.
- Distractores plausibles y de la misma región; explicaciones de máximo 2 oraciones.
- `referencias` con `libro: "tortora"`; la revisora completa capítulo y página.
- Proveedor de LLM configurable por variable de entorno, usando la función de salida estructurada o de herramientas del proveedor, y siempre validando con zod.

## Pantallas de la app

Nueve pantallas; las lecciones se desbloquean en orden y todo funciona con la copia local del contenido.

| Pantalla | Contenido y comportamiento |
| --- | --- |
| Bienvenida | Qué es la app; botones para crear cuenta o iniciar sesión |
| Registro e inicio de sesión | Correo, contraseña, nombre, universidad (opcional) y hora del recordatorio diario |
| Inicio | Ruta de lecciones (completadas, siguiente, bloqueadas), racha actual y botón "Repaso" con el número de fichas pendientes |
| Lección | Un ejercicio por pantalla con barra de progreso. Al responder: correcto o incorrecto, explicación y botón "Continuar". Los fallados se repiten una vez al final |
| Resultado | Aciertos, tiempo y racha actualizada |
| Repaso | Sesión de hasta 10 ejercicios de fichas vencidas |
| Perfil | Racha actual y máxima, hora del recordatorio, política de privacidad, cerrar sesión y borrar cuenta |
| Premium (interés) | Beneficios y precio propuesto. "Me interesa" registra el interés y muestra "Aún no está disponible; te avisaremos". No cobra nada. Aparece al completar la tercera lección y desde Perfil |
| Reportar error (ventana) | Disponible en cada ejercicio: motivo (4 opciones del esquema) y comentario opcional |

## Reglas de los ejercicios

Cada tipo del esquema tiene una forma fija de mostrarse y de calificarse; las opciones siempre se barajan.

| Tipo | Cómo se muestra | Cuándo es correcto |
| --- | --- | --- |
| `opcion_multiple` | Enunciado y opciones | Elige la opción `correcta` |
| `caso_clinico` | Caso, pregunta y opciones | Elige la opción `correcta` |
| `emparejar` | Dos columnas, la derecha barajada; se toca un elemento de cada lado para unirlos | Todos los pares coinciden; los incorrectos se marcan en rojo |
| `identificar_imagen` | Imagen con la zona resaltada (relleno semitransparente y borde) y opciones | Elige la opción `correcta` |
| `tocar_estructura` | Imagen sin resaltar y enunciado | Regla del toque (abajo) |

**Imágenes y toques**

- Mostrar la imagen a todo el ancho y con su proporción (alto mostrado = ancho mostrado × `alto` / `ancho`), sin bordes vacíos, para que las coordenadas normalizadas coincidan directo.
- Dibujar las zonas con react-native-svg encima de la imagen, multiplicando cada punto por el tamaño mostrado.
- Normalizar el toque: x / ancho mostrado, y / alto mostrado.
- Es acierto si `puntoEnZona` da verdadero para la zona correcta, o si el toque está a menos de 0.015 del borde de la zona correcta y no cae dentro de otra zona. `distanciaABorde` se agrega a `packages/contenido` con pruebas.
- Después de responder, resaltar en verde la zona correcta y, si falló, marcar dónde tocó.
- Áreas táctiles de opciones y botones de 44 × 44 como mínimo.

## Repaso, racha y recordatorios

El repaso se calcula por ficha con ts-fsrs en el dispositivo, para que funcione sin internet.

**Repaso espaciado**

- Cada ficha empieza en estado `nuevo` y entra al repaso cuando aparece por primera vez en una lección.
- En una sesión, cada ficha recibe una sola calificación: `Again` si falló algún ejercicio de esa ficha, `Good` si acertó todos.
- Sesión de repaso: fichas con `proximaRevision` vencida, de la más atrasada a la menos; un ejercicio por ficha, distinto al de la última vez; máximo 10.

**Racha**

- Un día cuenta si se completa al menos una lección o una sesión de repaso, según la zona horaria del dispositivo.
- Si pasa un día completo sin actividad, la racha vuelve a 0. Se guardan la actual y la máxima.

**Recordatorio diario**

- Notificación local con expo-notifications, a la hora que eligió el estudiante.
- Solo hay una programada a la vez: la próxima hora del recordatorio en un día sin actividad. Se reprograma al abrir la app y al terminar una sesión.
- Texto de ejemplo: "Tu racha de 4 días te espera. Una lección toma 3 minutos."

## Sin internet y sincronización

Después de la primera descarga, lecciones y repasos funcionan sin conexión; el servidor se entera al reconectar.

1. Al abrir, la app llama a `GET /paquete/actual?desde=<versión local>`. Si hay una versión nueva, descarga el JSON y las imágenes, valida con `PaqueteContenido` y reemplaza la copia local solo si todo llegó completo.
2. Intentos, progreso y racha se guardan en expo-sqlite y se envían en lote a `POST /sync` al recuperar conexión.
3. Cada intento lleva un id generado en el dispositivo, así un reenvío no crea duplicados.
4. En el progreso de una ficha gana el registro con `ultimaRevision` más reciente.
5. Si un paquete nuevo ya no trae un ejercicio, sus datos locales se ignoran sin romper la app.

## API

REST con JSON; todo cuerpo de entrada se valida con los esquemas de `packages/contenido` y las rutas de inicio de sesión tienen límite de intentos.

| Método y ruta | Rol | Qué hace |
| --- | --- | --- |
| `POST /auth/registro` | Público | Crea la cuenta como estudiante y devuelve tokens |
| `POST /auth/login` | Público | Devuelve token de acceso y de renovación |
| `POST /auth/renovar` | Público | Renueva los tokens |
| `DELETE /me` | Estudiante | Borra la cuenta y todos sus datos |
| `GET /paquete/actual?desde=N` | Estudiante | Versión vigente; trae el contenido solo si es más nueva que N |
| `POST /sync` | Estudiante | Recibe intentos, progreso y racha; devuelve el progreso consolidado |
| `POST /reportes` | Estudiante | Crea un reporte de error |
| `POST /eventos` | Estudiante | Recibe eventos de uso en lote |
| `POST /interes-premium` | Estudiante | Registra el interés en Premium |
| `POST /admin/generar` | Editor | Corre el generador para una lista de músculos |
| `GET /admin/cola?estado=` | Editor | Lista elementos por estado y tipo |
| `GET` y `PUT /admin/{fichas,ejercicios,imagenes}/:id` | Editor | Lee y edita, validando con zod |
| `POST /admin/{fichas,ejercicios,imagenes}/:id/aprobar` | Editor | Aprueba |
| `POST /admin/{fichas,ejercicios,imagenes}/:id/rechazar` | Editor | Rechaza con nota obligatoria |
| `POST /admin/imagenes` | Editor | Sube el archivo y crea la imagen en borrador |
| `GET` y `PUT /admin/reportes` | Editor | Lista y resuelve reportes |
| `POST /admin/publicar` | Admin | Valida y publica; devuelve la versión nueva o la lista de errores |
| `GET /admin/metricas` | Admin | Métricas de la beta |

## Panel web y editor de zonas

El panel es para la revisora y el admin; prioriza que revisar sea rápido, no que se vea bonito.

| Vista | Qué permite |
| --- | --- |
| Cola de revisión | Pestañas por estado (borrador, en revisión, rechazada, aprobada) y filtro por tipo |
| Editor de ficha | Formulario con todos los campos del esquema, listas editables, ejercicios vinculados y botones Guardar, Aprobar y Rechazar |
| Editor de ejercicio | Formulario según el tipo y vista previa parecida a la app |
| Editor de zonas | Subir imagen; licencia (tipo, fuente, atribución); casilla "Ya borré los nombres impresos"; dibujar polígonos con clics y cerrarlos en el primer punto; mover y borrar puntos; asignar la ficha de cada zona; guardar en coordenadas de 0 a 1 |
| Reportes | Reportes abiertos con su ejercicio, motivo y comentario; abrir el ejercicio para corregir y marcar como resuelto |
| Publicar | Muestra los errores de consistencia o confirma la versión nueva |
| Métricas | Tabla con las métricas de la beta |

Una imagen no se puede aprobar si `sinEtiquetas` es falso o si alguna zona no tiene ficha asignada.

## Medición de la beta

La beta existe para decidir si seguir; estas métricas salen de `intentos`, `eventos` e `interes_premium` y se ven en el panel.

| Métrica | Cómo se calcula |
| --- | --- |
| Retención día 1 y día 7 | % de usuarios con actividad 1 y 7 días después de registrarse |
| Días activos por semana | Promedio de días con actividad por usuario |
| Lecciones y repasos completados | Total y por usuario |
| Acierto por ejercicio | % de intentos correctos; marcar los de menos de 30% como posible error o mala redacción |
| Reportes por cada 100 respuestas | Reportes de error ÷ intentos × 100 |
| Interés en Premium | % de usuarios que tocó "Me interesa" |

**Eventos a registrar:** `registro`, `app_abierta`, `leccion_iniciada`, `leccion_completada`, `repaso_completado`, `reporte_creado`, `premium_visto`, `premium_interes`, `notificacion_abierta`.

Los umbrales de éxito los fija el dueño del producto antes de la beta; no van en el código.

## Requisitos no funcionales

Lo que debe cumplirse en toda la beta, además de las funciones.

| Tema | Requisito |
| --- | --- |
| Plataformas | iOS y Android desde un solo código |
| Idioma | Español en toda la interfaz |
| Privacidad | Política de privacidad en una URL, enlazada desde la app y las tiendas. Solo se recolectan correo, nombre, universidad y uso. Sin SDKs de publicidad ni de rastreo de terceros |
| Borrar cuenta | Desde la app y con confirmación (Apple lo exige); borra los datos personales del servidor |
| Seguridad | Contraseñas con argon2, HTTPS, tokens de acceso de corta duración con renovación, límite de intentos de inicio de sesión, validación con zod de toda entrada |
| Rendimiento | Una lección abre en menos de 1 segundo desde la copia local |
| Accesibilidad | Respeta el tamaño de letra del sistema, contraste suficiente, áreas táctiles de 44 × 44 como mínimo |
| Pruebas | Unitarias para `puntoEnZona`, `distanciaABorde`, `erroresDeConsistencia`, la calificación a ts-fsrs, el cálculo de la racha con cambios de zona horaria y la fusión de `/sync` |
| Distribución | EAS Build; TestFlight (los testers externos requieren la revisión beta de Apple, que puede tardar uno o más días) y prueba interna de Google Play |
| Contenido | Nunca subir PDFs, escaneos ni textos de Tortora o Kendall al repositorio, al generador ni a la app. Imágenes solo de dominio público o con licencia abierta, con los nombres impresos borrados |

## Criterios de aceptación

La beta está lista cuando todo esto se cumple en dispositivos reales con iOS y Android.

- [ ] Un estudiante crea su cuenta, completa una lección y ve su racha actualizada.
- [ ] Los 5 tipos de ejercicio funcionan, incluidos los toques con la tolerancia definida.
- [ ] Sin conexión se completan lecciones y repasos; al reconectar, `/sync` sube todo sin duplicados.
- [ ] El repaso muestra las fichas vencidas según ts-fsrs, con una sola calificación por ficha en cada sesión.
- [ ] El recordatorio llega a la hora elegida y solo en días sin actividad.
- [ ] Ningún elemento sin aprobar llega a un paquete, y publicar con errores de consistencia está bloqueado.
- [ ] Toda salida del generador se valida con zod y entra como borrador.
- [ ] Al aprobar una imagen se crean sus ejercicios de tocar e identificar como borradores.
- [ ] La revisora dibuja, edita y asigna zonas en el panel, y se ven bien alineadas en la app.
- [ ] Un reporte de error aparece en el panel junto a su ejercicio.
- [ ] Borrar la cuenta elimina los datos del usuario en el servidor.
- [ ] El panel muestra las métricas de la beta.
- [ ] Hay builds instalables por TestFlight y por la prueba interna de Google Play.

## Hitos

Cuatro semanas, en este orden; al final de cada una debe haber una demo funcionando y una lista de pendientes.

1. **Semana 1:** monorepo y `packages/contenido`; base de datos y autenticación; generador; panel con cola de revisión y editor de fichas. Generar y revisar las primeras 10 fichas para validar el flujo IA + revisión antes de seguir.
2. **Semana 2:** editor de zonas y ejercicios de imagen por código; publicación de paquetes; app con registro, descarga del paquete, ruta de lecciones y los 3 ejercicios de texto.
3. **Semana 3:** ejercicios de imagen en la app, repaso con ts-fsrs, racha, recordatorio, reportar error, sincronización sin conexión, borrar cuenta, pantalla de Premium y eventos.
4. **Semana 4:** métricas en el panel, pruebas en dispositivos reales, builds con EAS, TestFlight y Google Play, y arranque de la beta.

## Decisiones abiertas

El agente usa el valor por defecto mientras el dueño del producto no decida otra cosa.

| Decisión | Valor por defecto |
| --- | --- |
| Nombre de la app y dominio | Nombre provisional "Anatomía" |
| Hosting de API, base de datos y archivos | AWS, que el dueño conoce; un servicio más simple como Render o Railway es aceptable |
| ORM | Prisma; cambiar solo con un motivo concreto |
| Proveedor de LLM del generador | Configurable por variable de entorno |
| Quién firma la revisión en la app | Nombre y título del revisor, configurables desde el panel |
| Precio en la pantalla de interés en Premium | $2.99 al mes o $19.99 al año, configurable |
| Universidad y grupo de la beta | Lo define el dueño del producto |
