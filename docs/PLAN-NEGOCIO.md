# Plan de negocio: llegar a $3,000 al mes

Propuesta del 28-10-2026, para revisar después de la beta. Los números son estimaciones: la beta los reemplaza por datos reales (retención, interés en Premium por momento y por beneficio, y plan elegido), que ya se ven en el panel, en Métricas.

Relacionados: [PLAN-PREMIUM.md](PLAN-PREMIUM.md) (qué es gratis y qué es Premium) y [PRD.md](PRD.md) (medición de la beta).

## Las cuentas

**Lo que queda por suscriptor**, después del 15% de comisión de las tiendas (programa de pequeñas empresas) y unos impuestos aproximados:

| Plan | Precio | Queda por mes |
| --- | --- | --- |
| Mensual | $2.99 | ~$2.30 |
| Anual | $19.99 | ~$1.30 (unos $15.50 al año) |
| Mezcla mitad y mitad | — | ~$1.80 |

**$3,000 netos al mes ÷ $1.80 ≈ 1,650 suscriptores.**

**Usuarios activos que hacen falta** para tener esos suscriptores:

| Si paga el… | Usuarios activos al mes |
| --- | --- |
| 3% (típico en apps gratuitas con opción paga) | ~55,000 |
| 5% (bueno, con la oferta en el momento justo) | ~33,000 |
| 8% (muy bueno; las apps de estudio suben en época de exámenes) | ~20,000 |

**Costos fijos** (ver la lista de requisitos de la beta): unos $27 al mes el primer año, contando las cuentas de las tiendas, el dominio y el servidor. Se cubren con unos 11 suscriptores mensuales o 20 anuales. El problema no son los costos: es llegar a suficientes estudiantes.

**Conclusión:** con anatomía para fisioterapia sola y el precio actual, $3,000 al mes es difícil, porque harían falta muchísimos estudiantes de esa carrera. Hay que combinar varias palancas.

## Las 4 palancas

1. **Precio.**
   - Un estudiante paga por aprobar el parcial, no por entretenerse.
   - Con $4.99 al mes y $29.99 al año, lo que queda por suscriptor sube a ~$2.80 al mes, y alcanza con **~1,070 suscriptores**.
   - Se puede probar el precio con la misma prueba A/B que hoy prueba el primer beneficio.
2. **Más carreras con el mismo contenido.**
   - Anatomía se cursa en medicina, enfermería, odontología, kinesiología y nutrición, y medicina sola tiene muchos más estudiantes que fisioterapia.
   - Las fichas de músculo sirven igual. Cambian el tono de los casos clínicos y, quizás, la marca.
   - Necesita [varios cursos](#lo-que-hay-que-construir).
3. **Más países.**
   - En español: México, Colombia, Argentina, Perú y Chile.
   - **Brasil**, en portugués, es de los mercados de fisioterapia más grandes del mundo. Necesita traducir la interfaz y el contenido, con revisión de una especialista local.
4. **Venta a instituciones.**
   - Licencias para universidades o academias, por ejemplo de $3 a $5 por estudiante por semestre.
   - Una facultad con 400 estudiantes da de $1,200 a $2,000 por semestre: una sola venta equivale a cientos de suscripciones individuales.
   - Para venderlo hace falta un panel para el docente, con el avance del grupo y los ejercicios que más fallan, armado sobre las métricas que ya existen.

## Plan por etapas

| Etapa | Cuándo | Qué | Meta para pasar a la siguiente |
| --- | --- | --- | --- |
| **1. Beta** | Nov–dic 2026 | 1 universidad, el miembro inferior gratis. Medir retención, interés en Premium por momento y por beneficio, y el plan elegido | Retención a 7 días de 25–30% o más, e interés en Premium del 10% o más de quienes ven la oferta |
| **2. Cobrar** | Ene–mar 2027 | Miembro superior como primera región Premium (o modo examen, si gana la prueba A/B), cobro real dentro de la app y lanzamiento en las tiendas | Primeros 100 suscriptores, y que pague entre el 3% y el 5% de los activos |
| **3. Crecer sin publicidad** | Abr–dic 2027 | Ver el detalle debajo | 10,000 activos y ~500 suscriptores (~$1,000 al mes) |
| **4. Ampliar** | 2027 en adelante | Tronco, cabeza y cuello; versión para medicina y enfermería; primeras licencias a instituciones; Brasil | **$3,000 al mes**: ~1,100–1,650 suscriptores, o el equivalente con instituciones |

Las metas de retención son una propuesta. Los umbrales de éxito los fija el dueño del producto antes de la beta (PRD, "Medición de la beta").

**Qué incluye "crecer sin publicidad" (etapa 3):**
- **Embajadores por universidad:** Premium gratis a cambio de difundir la app.
- **Docentes:** que la recomienden en clase.
- **Videos cortos:** clips del 3D en TikTok e Instagram.
- **Época de parciales:** campañas en esas fechas.
- **Referidos:** "invita a un amigo y los dos ganan un mes".

## Escenarios

| Escenario | Supuestos | Cuándo llega a $3,000 al mes |
| --- | --- | --- |
| Optimista | Precio de $4.99, buena retención, 2 o 3 instituciones, medicina además de fisioterapia | ~12 meses después de empezar a cobrar (inicios de 2028) |
| Base | Precio actual o algo más alto, crecimiento sin publicidad, una carrera más | ~18–24 meses |
| Conservador | Solo fisioterapia, solo suscripciones, sin publicidad | Puede no llegar: quedaría en $500–1,000 al mes |

## Lo que no conviene

- **Pagar publicidad antes de conocer la retención.**
  - Cada suscriptor deja unos $15–25 en todo el tiempo que paga.
  - Si conseguir una instalación cuesta entre $0.50 y $1 y paga el 5%, cada suscriptor cuesta $10–20 en anuncios, y casi no queda margen.
  - La publicidad tiene sentido recién con buena retención, y como impulso en época de exámenes.
- **Llenar todas las regiones antes de cobrar.**
  - El miembro superior alcanza para lanzar Premium.
  - El resto puede salir por partes, y así cada mes hay una razón para seguir pagando.
- **Bajar el precio para crecer.**
  - Con la comisión y los impuestos, un precio más bajo exige muchos más suscriptores.
  - Es mejor ofrecer un descuento en el plan anual o el programa de embajadores.

## Lo que hay que construir

Además de lo que ya lista [PLAN-PREMIUM.md](PLAN-PREMIUM.md) (modo examen, regiones con candado, cobro real):

| Qué | Para qué palanca | Tamaño |
| --- | --- | --- |
| Prueba A/B de precio | Precio | Chico, igual a la del primer beneficio |
| Varios cursos (API, paquete, app y panel) | Carreras y regiones | Mediano, 1–2 días |
| Referidos ("invita a un amigo") | Crecimiento sin publicidad | Mediano |
| Traducción a portugués | Países | Mediano en código; el contenido necesita revisión local |
| Panel para docentes y licencias por institución | Instituciones | Grande |

## El dato que manda

**La retención de la beta.** Si los estudiantes vuelven solos, el resto es distribución y contenido. Si no vuelven, primero hay que arreglar eso: ni el precio ni la publicidad lo compensan. Métricas, en el panel, ya muestra la retención a 1 y 7 días, los días activos por semana, el interés en Premium por momento y la prueba A/B.
