# Plan de Premium sin vidas

Propuesta para decidir antes de construir (28-10-2026). La beta no cobra: la pantalla de Premium mide interés. Este plan dice qué queda gratis, qué sería Premium y en qué momentos aparece la oferta, para que la beta mida lo que importa y no haya que rehacer pantallas al empezar a cobrar.

## Punto de partida

- **Sin vidas** ([PLAN-UNIDADES.md](PLAN-UNIDADES.md)): equivocarse no castiga, así que Premium no puede vender "quitar un castigo". Tiene que vender **más contenido y mejores herramientas para estudiar**.
- **Lo que hay hoy:**
  - La pantalla de Premium (`apps/mobile/src/app/premium.tsx`) muestra el precio ($2.99 al mes o $19.99 al año) y 4 beneficios, que vienen de `configuracion` o de `OFERTA_PREMIUM`.
  - "Me interesa" guarda el interés y no cobra.
  - La pantalla aparece una sola vez, al completar la tercera lección, y desde Perfil.
  - Cada aparición registra `premium_visto` con su `origen`, y "Me interesa" registra `premium_interes`. El panel ya muestra el interés en Métricas.
- **Para quién:** estudiantes de fisioterapia. No pagan por jugar; pagan por aprobar anatomía. Premium tiene que sonar a "llego mejor al parcial".

## Qué es gratis

**El miembro inferior completo, sin límites.** Incluye:
- las 3 unidades y todas sus lecciones;
- los 5 tipos de ejercicio, con sus explicaciones;
- las estrellas, y repetir lecciones para mejorarlas;
- el repaso espaciado diario de las fichas vencidas;
- la racha, el recordatorio y los modelos 3D del miembro inferior;
- funcionar sin internet.

**Por qué no recortarlo:**
- Es la prueba de que la app sirve. Si el estudiante choca con un muro antes de engancharse, se va, y la beta no puede medir retención.
- Es la región que más se usa en fisioterapia. Ganarse la confianza ahí hace creíble el resto.

## Qué sería Premium

En orden de cuánto creemos que vende:

1. **El resto del cuerpo.** Miembro superior, tronco, cabeza y cuello. Es el corte más claro: el estudiante lo va a necesitar en el semestre, y el miembro inferior gratis le muestra que el formato funciona. *Hay que construirlo:* cada región es como las 3 unidades de esta beta (fichas, láminas, modelos 3D y revisión), y además hace falta [varios cursos o unidades bloqueadas](#lo-que-hay-que-construir).
2. **Modo examen.** Por unidad o por región, sin explicaciones hasta el final, con tiempo y una nota. Sirve para practicar antes del parcial. Se arma con los ejercicios que ya existen.
3. **Repaso a demanda.** El repaso gratis trae solo las fichas vencidas del día. Premium deja repasar lo que uno elija ("todo el muslo", "los aductores") cuando quiera, por ejemplo la noche antes del examen.
4. **Mis errores.** Una sesión con los ejercicios que el estudiante más falla, sacados de sus intentos.
5. **Lecciones nuevas cada mes.** Es el beneficio que ya está en la pantalla; mantiene la suscripción viva después de cubrir el cuerpo.

**Lo que no se cobra:**
- Las explicaciones, porque es como se aprende.
- Las lecciones por día. Limitarlas sería una vida disfrazada.
- Quitar anuncios: no hay anuncios, y el PRD prohíbe SDKs de publicidad.
- Las estrellas o la racha: son de todos.

**Ajustes a los beneficios que muestra hoy la pantalla:**
- **"Modelos 3D de cada región":** el 3D del miembro inferior es gratis. Hay que aclarar que se trata del 3D de las regiones Premium.
- **"Ejercicios nuevos: completar la ficha y terminología":** esos tipos de ejercicio no existen. Conviene cambiarlo por "Modo examen", que se puede construir con lo que ya hay.

## Dónde aparece la oferta

Regla general: la oferta aparece **cuando el estudiante acaba de querer algo que Premium da**, nunca en medio de un ejercicio ni al abrir la app. "Ahora no" nunca cuesta nada. Las que aparecen solas (`apps/mobile/src/leccion/oferta.ts`):

- a lo sumo una por día de estudio;
- cada momento una sola vez (cada unidad terminada cuenta aparte);
- si coinciden varios, gana el más fuerte: terminar el curso, después terminar una unidad, después la tercera lección;
- ninguna después de que el estudiante tocó "Me interesa".

| Momento | Qué dice | `origen` | Estado |
| --- | --- | --- | --- |
| Al completar la 3.ª lección | La pantalla de Premium completa, una sola vez | `tercera_leccion` | Existe |
| Desde Perfil | La pantalla completa | `perfil` | Existe |
| **Al terminar una unidad** | "¡Terminaste Músculos del muslo!" arriba de la pantalla de Premium. Cuando exista el modo examen: "Ponte a prueba en modo examen" | `fin_unidad` | Existe |
| **Al terminar el miembro inferior** | "¡Completaste el curso Miembro inferior!" arriba de la pantalla de Premium. Es el momento de mayor ganas | `fin_region` | Existe |
| **Unidades Premium en Inicio** | Debajo de la última unidad gratis, las regiones Premium con candado 👑. Se ven sus títulos y cuántas lecciones tienen; al tocarlas se abre la pantalla de Premium | `unidad_bloqueada` | Propuesto |
| **Resultado con 3 estrellas** | Una línea: "¿Listo para el modo examen?" | `tres_estrellas` | Propuesto |
| **Repaso al día** | En la tarjeta de Repaso, cuando dice "Al día": "Repasa lo que quieras con Premium" | `repaso_al_dia` | Propuesto |
| **Antes de los parciales** | Si se conocen las fechas de la universidad de la beta, un recordatorio de modo examen la semana anterior | `parciales` | Para después de la beta |

**Por qué estos y no otros:**
- **Al terminar algo**, el estudiante está contento y con ganas de seguir: es cuando más vende "hay más".
- **Al ver lo que falta**, con las unidades con candado en Inicio, da curiosidad sin interrumpir.
- **El modo examen se ofrece después de 3 estrellas**, cuando el estudiante siente que ya domina la lección y quiere comprobarlo.
- **No se muestra** al fallar ni al abrir la app: asociar Premium al error es justamente lo que hacen las vidas.

## Qué medir en la beta

La beta no cobra, así que se mide **interés**: `premium_visto` y `premium_interes` por `origen`, y qué beneficio atrae más.

1. **Interés por momento.** De cada `origen`, el porcentaje de estudiantes que vio la oferta y tocó "Me interesa". Así se sabe qué momentos conservar.
2. **Interés por beneficio**, con una prueba A/B simple (hecha):
   - La variante sale del primer carácter del id del estudiante (`varianteOferta`), así que cada uno ve siempre la misma, también sin conexión.
   - La **A** muestra los beneficios en el orden configurado, con "Todo el cuerpo" primero. La **B** pone el segundo, "Modo examen", primero.
   - El primer beneficio va destacado en una tarjeta. El título de la pantalla es el mismo en las dos variantes.
   - `premium_visto` y `premium_interes` guardan la variante, y Métricas muestra la tabla "Prueba A/B del primer beneficio".
   - El ganador dice qué construir primero para cobrar: regiones nuevas (mucho contenido) o modo examen (poco código).
3. **Anual o mensual.** El "Me interesa" ya guarda el plan elegido, y dice qué precio poner primero.
4. **Que no espante.** Se compara la retención a 7 días entre quienes vieron la oferta en un momento nuevo y quienes no.

La pantalla de Métricas del panel ya muestra el interés total. Habría que sumar el desglose por `origen` y por variante.

## Lo que hay que construir

En orden, para decidir hasta dónde llegar en la beta:

| Paso | Qué | Tamaño | Para |
| --- | --- | --- | --- |
| 1 | ✓ Beneficios corregidos en la pantalla (sin "terminología", con "Modo examen") | Hecho, en `OFERTA_PREMIUM` | Beta |
| 2 | ✓ Oferta al terminar unidad y región, con su `origen` | Hecho | Beta |
| 3 | ✓ Desglose por `origen` en Métricas ("Premium por momento"); "Me interesa" guarda el `origen` desde ahora | Hecho | Beta |
| 4 | ✓ Prueba A/B del primer beneficio | Hecho | Beta |
| 5 | Regiones Premium con candado en Inicio. Necesita unidades marcadas como Premium en el curso, aunque todavía no tengan lecciones | Mediano | Beta, si se decide mostrar lo que viene |
| 6 | Modo examen | Mediano | Primer beneficio cobrable |
| 7 | Repaso a demanda y "Mis errores" | Mediano | Después |
| 8 | **Cobro real** | Grande | Al lanzar |

**El cobro real (paso 8):**
- **Compras dentro de la app.** Apple y Google exigen que el contenido digital se cobre con su sistema de compras. Lo más simple con Expo es RevenueCat.
- **Comisión.** Si se entra al programa de pequeñas empresas, las tiendas se quedan con el 15%.
- **Servidor.** Tiene que saber quién es Premium, para no mandar las regiones pagas en el paquete de quien no pagó.
- **Pantalla de Premium.** "Me interesa" pasa a ser "Suscribirme", con "Restaurar compras", que Apple exige.

## Decisiones para el dueño del producto

| Decisión | Propuesta |
| --- | --- |
| Qué queda gratis | Todo el miembro inferior, sin límites |
| Primer beneficio pago | Lo decide la prueba A/B: todo el cuerpo o modo examen |
| Mostrar en Inicio las regiones que vienen, con candado | Sí, aunque todavía no tengan lecciones ("Muy pronto") |
| Frecuencia máxima de la oferta | Una vez por día y nunca al fallar |
| Precio | $2.99 al mes o $19.99 al año (el actual); revisar con el interés por plan |
| Precio por país | Usar los precios por país de las tiendas cuando se cobre; en la beta, el mismo para todos |
| Fechas de parciales | Pedirlas a la universidad de la beta, para el recordatorio de modo examen |
