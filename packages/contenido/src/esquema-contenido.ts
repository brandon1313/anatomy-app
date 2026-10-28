/**
 * Esquema de contenido — App de anatomía verificada (Fase 1)
 *
 * Requiere zod 4:   npm i zod
 *
 * Un solo archivo para tres usos:
 *  - Generador con IA: z.toJSONSchema(SalidaGenerador) es el formato que se le pide al LLM.
 *  - Backend (NestJS): valida todo lo que entra antes de guardarlo.
 *  - App (Expo): tipos para dibujar cada ejercicio.
 *
 * Conviene ponerlo en un paquete compartido del monorepo (por ejemplo packages/contenido).
 *
 * Cambios respecto al contrato original (aprobados por el dueño del producto, 25-oct-2026):
 *  - SalidaGenerador solo acepta los 3 tipos de ejercicio de texto; los de imagen se generan por código.
 *  - ProgresoFicha: `dificultad` acepta 0 (ts-fsrs crea las tarjetas nuevas con difficulty 0) y se
 *    agregan `diasProgramados`, `pasosAprendizaje` (necesarios para reconstruir la tarjeta de ts-fsrs)
 *    y `ultimoEjercicioId` (el repaso usa un ejercicio distinto al de la última vez).
 *  - Imagen.zonas va en orden de dibujo (la última queda encima). Con zonas superpuestas, el toque
 *    lo recibe la de más arriba (ver `esToqueCorrecto` en utilidades.ts).
 *  - Imagen.modelo3d (opcional): el modelo 3D de la misma región. Si la ficha de un ejercicio de
 *    tocar o identificar está en el modelo, la app lo muestra en 3D; si no, con la imagen.
 */
import { z } from "zod";

// ───────────────────────── Básicos ─────────────────────────

/** Slug legible y estable: "recto-femoral", "muslo-anterior". */
export const Id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones");

export const EstadoRevision = z.enum(["borrador", "en_revision", "aprobada", "rechazada"]);

export const Revision = z.object({
  estado: EstadoRevision,
  revisadoPor: z.string().optional(),
  fecha: z.iso.datetime().optional(),
  notas: z.string().optional(),
});

/** Campos que agrega el servidor; el generador nunca los produce. */
const Revisable = {
  revision: Revision,
  version: z.number().int().positive(),
};

/** Dónde verificar el dato. Solo la ubicación: nunca se copia texto del libro. */
export const Referencia = z.object({
  libro: z.enum(["tortora", "kendall"]),
  edicion: z.string().optional(),
  capitulo: z.string().optional(),
  pagina: z.string().optional(),
});

/** Nombre oficial + sinónimos que también se aceptan como respuesta (fibular / peroneo). */
export const Nombre = z.object({
  principal: z.string().min(1),
  latin: z.string().optional(),
  sinonimos: z.array(z.string()).default([]),
});

// ───────────────────────── Fichas ─────────────────────────

export const Inervacion = z.object({
  nervio: z.string().min(1), // "Nervio femoral"
  raices: z.string().optional(), // "L2–L4"
});

/**
 * Ficha de músculo. Para huesos, nervios y articulaciones se agregan otras fichas
 * con su propio `tipo` y se unen con z.discriminatedUnion("tipo", [...]).
 */
export const FichaMusculoBase = z.object({
  id: Id,
  tipo: z.literal("musculo"),
  nombre: Nombre,
  region: z.string().min(1), // "muslo"
  compartimento: z.string().optional(), // "anterior"
  origen: z.array(z.string().min(1)).min(1),
  insercion: z.array(z.string().min(1)).min(1),
  inervacion: z.array(Inervacion).min(1),
  acciones: z.array(z.string().min(1)).min(1),
  notaClinica: z.string().optional(),
  referencias: z.array(Referencia).min(1),
});

export const FichaMusculo = FichaMusculoBase.extend(Revisable);

// ───────────────────────── Imágenes y zonas ─────────────────────────

/** Punto normalizado: [x, y] entre 0 y 1 sobre el ancho y el alto de la imagen. */
export const Punto = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]);

/**
 * Zona tocable: un polígono sobre la imagen. La misma zona sirve para resaltar
 * ("¿qué músculo es este?") y para detectar el toque ("toca el recto femoral").
 * Las coordenadas normalizadas no dependen del tamaño de la pantalla.
 */
export const Zona = z.object({
  id: Id, // "zona-recto-femoral"
  fichaId: Id,
  puntos: z.array(Punto).min(3),
});

/**
 * Modelo 3D de la región de una imagen. Se revisa y se aprueba con la imagen: los ejercicios de
 * tocar e identificar son los mismos y la app elige 3D cuando el modelo tiene la ficha.
 */
export const Modelo3D = z.object({
  /** Claves en el almacén: mallas (.bin) y nombres, vistas y capas (.json). */
  archivo: z.string().min(1),
  datos: z.string().min(1),
  /** fichaId → id de la estructura en el modelo, solo para las fichas que el modelo tiene. */
  estructuras: z.record(Id, z.string().min(1)),
  /** Estructuras que se ocultan con esta imagen (la capa profunda quita las superficiales). */
  ocultas: z.array(z.string().min(1)),
  licencia: z.object({
    tipo: z.enum(["dominio_publico", "cc_by", "cc_by_sa", "propia"]),
    fuente: z.url().optional(),
    atribucion: z.string().min(1),
  }),
});

export const Imagen = z.object({
  id: Id, // "muslo-anterior"
  titulo: z.string().min(1), // "Muslo, vista anterior"
  archivo: z.string().min(1), // ruta o URL del archivo
  ancho: z.number().int().positive(), // píxeles del archivo original
  alto: z.number().int().positive(),
  licencia: z.object({
    tipo: z.enum(["dominio_publico", "cc_by", "cc_by_sa", "propia"]),
    fuente: z.url().optional(),
    atribucion: z.string().optional(),
  }),
  /** Confirma que se borraron los nombres impresos en la ilustración (si no, regalan la respuesta). */
  sinEtiquetas: z.boolean(),
  /** En orden de dibujo: la última queda encima y recibe el toque donde se superponen. */
  zonas: z.array(Zona).min(1),
  modelo3d: Modelo3D.optional(),
  ...Revisable,
});

// ───────────────────────── Ejercicios ─────────────────────────

export const Opcion = z.object({
  id: z.string().min(1), // "a", "b", "c"…
  texto: z.string().min(1),
});

const ComunEjercicio = {
  id: Id,
  /** Fichas que evalúa; el repaso espaciado se calcula por ficha. */
  fichaIds: z.array(Id).min(1),
  dificultad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Se muestra después de responder, acierte o no. */
  explicacion: z.string().min(1),
};

const OpcionMultipleBase = z.object({
  ...ComunEjercicio,
  tipo: z.literal("opcion_multiple"),
  enunciado: z.string().min(1),
  opciones: z.array(Opcion).min(2).max(5),
  correcta: z.string().min(1), // id de la opción correcta
});

const EmparejarBase = z.object({
  ...ComunEjercicio,
  tipo: z.literal("emparejar"),
  enunciado: z.string().min(1),
  /** La app baraja la columna derecha. */
  pares: z
    .array(z.object({ izquierda: z.string().min(1), derecha: z.string().min(1) }))
    .min(3)
    .max(5),
});

const CasoClinicoBase = z.object({
  ...ComunEjercicio,
  tipo: z.literal("caso_clinico"),
  caso: z.string().min(1),
  pregunta: z.string().min(1),
  opciones: z.array(Opcion).min(2).max(5),
  correcta: z.string().min(1),
});

/**
 * "¿Qué músculo está resaltado?" Este tipo y el siguiente se pueden generar por código
 * a partir de las zonas (los distractores salen de las otras zonas de la imagen), sin IA.
 */
const IdentificarImagenBase = z.object({
  ...ComunEjercicio,
  tipo: z.literal("identificar_imagen"),
  imagenId: Id,
  zonaResaltada: Id,
  opciones: z.array(Opcion).min(2).max(5),
  correcta: z.string().min(1),
});

/** "Toca el recto femoral." */
const TocarEstructuraBase = z.object({
  ...ComunEjercicio,
  tipo: z.literal("tocar_estructura"),
  imagenId: Id,
  enunciado: z.string().min(1),
  zonaCorrecta: Id,
});

export const EjercicioBase = z.discriminatedUnion("tipo", [
  OpcionMultipleBase,
  EmparejarBase,
  CasoClinicoBase,
  IdentificarImagenBase,
  TocarEstructuraBase,
]);

export const Ejercicio = z.discriminatedUnion("tipo", [
  OpcionMultipleBase.extend(Revisable),
  EmparejarBase.extend(Revisable),
  CasoClinicoBase.extend(Revisable),
  IdentificarImagenBase.extend(Revisable),
  TocarEstructuraBase.extend(Revisable),
]);

/** Los tipos que produce el generador con IA. */
export const EjercicioTextoBase = z.discriminatedUnion("tipo", [OpcionMultipleBase, EmparejarBase, CasoClinicoBase]);

// ───────────────────────── Estructura del curso ─────────────────────────

export const Leccion = z.object({
  id: Id,
  titulo: z.string().min(1),
  orden: z.number().int().nonnegative(),
  ejercicioIds: z.array(Id).min(1),
});

export const Unidad = z.object({
  id: Id,
  titulo: z.string().min(1), // "Músculos del muslo"
  orden: z.number().int().nonnegative(),
  lecciones: z.array(Leccion).min(1),
});

export const Curso = z.object({
  id: Id,
  titulo: z.string().min(1), // "Miembro inferior"
  carreras: z.array(z.string().min(1)).min(1), // ["fisioterapia"]
  unidades: z.array(Unidad).min(1),
});

/** Lo que descarga la app (y guarda para usar sin internet). Solo contenido aprobado. */
export const PaqueteContenido = z.object({
  version: z.number().int().positive(),
  curso: Curso,
  fichas: z.array(FichaMusculo),
  imagenes: z.array(Imagen),
  ejercicios: z.array(Ejercicio),
});

// ───────────────────────── Generador con IA ─────────────────────────

/**
 * Lo que devuelve el LLM. Todo entra como "borrador" y va a la cola de revisión.
 * Formato para el modelo:  z.toJSONSchema(SalidaGenerador)
 */
export const SalidaGenerador = z.object({
  fichas: z.array(FichaMusculoBase).min(1),
  ejercicios: z.array(EjercicioTextoBase).min(1),
});

// ───────────────────────── Datos del usuario (solo backend) ─────────────────────────

/** Por qué un estudiante reporta un ejercicio (PRD, "Reportar error"). */
export const MotivoReporte = z.enum(["respuesta_incorrecta", "texto_confuso", "imagen", "otro"]);

export const ReporteError = z.object({
  id: z.uuid(),
  ejercicioId: Id,
  usuarioId: z.uuid(),
  motivo: MotivoReporte,
  comentario: z.string().max(500).optional(),
  creado: z.iso.datetime(),
});

/** POST /reportes: el id y la fecha los pone el teléfono (reenviarlo no lo duplica); el usuario sale del token. */
export const NuevoReporte = ReporteError.omit({ usuarioId: true });

/**
 * La oferta de Premium que muestra la app (PRD, "Premium (interés)"): solo mide el interés, no cobra nada.
 * Se guarda en `configuracion` con la clave "premium" para cambiarla sin publicar otra versión de la app.
 */
export const OfertaPremium = z.object({
  simbolo: z.string().min(1).max(4),
  mensual: z.number().positive(),
  anual: z.number().positive(),
  beneficios: z.array(z.string().min(1).max(120)).min(1).max(6),
});

export const PlanPremium = z.enum(["mensual", "anual"]);

/**
 * Eventos de uso que manda el teléfono (PRD, "Medición de la beta"). `registro`, `reporte_creado` y
 * `premium_interes` los anota la API al recibir esas acciones, así que no se aceptan desde aquí.
 */
export const NombreEvento = z.enum(["app_abierta", "leccion_iniciada", "leccion_completada", "repaso_completado", "premium_visto", "notificacion_abierta"]);

/** Un evento: id y fecha del teléfono (reenviarlo no lo duplica) y propiedades simples. */
export const EventoUso = z.object({
  id: z.uuid(),
  nombre: NombreEvento,
  propiedades: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
  creado: z.iso.datetime(),
});

/** POST /eventos: un lote de eventos pendientes. */
export const PeticionEventos = z.object({ eventos: z.array(EventoUso).min(1).max(200) });

/**
 * POST /interes-premium: el plan que el estudiante tenía elegido al tocar "Me interesa" y dónde apareció
 * la oferta ("tercera_leccion", "fin_unidad", "perfil"…), para medir qué momento funciona.
 */
export const PeticionInteresPremium = z.object({ plan: PlanPremium, origen: z.string().min(1).max(40).optional() });

/** Los valores por defecto del PRD ("Decisiones abiertas"); los beneficios salen de lo que deja para la fase 2. */
export const OFERTA_PREMIUM: z.infer<typeof OfertaPremium> = {
  simbolo: "$",
  mensual: 2.99,
  anual: 19.99,
  beneficios: [
    "Todo el cuerpo: miembro superior, tronco, cabeza y cuello.",
    "Modo examen para practicar antes del parcial.",
    "Modelos 3D de las regiones nuevas, con su presentación.",
    "Lecciones nuevas cada mes, revisadas por especialistas.",
  ],
};

/** Estado del repaso espaciado por usuario y ficha (los campos que usa FSRS). */
export const ProgresoFicha = z.object({
  usuarioId: z.uuid(),
  fichaId: Id,
  estado: z.enum(["nuevo", "aprendiendo", "repaso", "reaprendiendo"]),
  estabilidad: z.number().nonnegative(),
  dificultad: z.number().min(0).max(10),
  diasProgramados: z.number().int().nonnegative().default(0),
  pasosAprendizaje: z.number().int().nonnegative().default(0),
  repeticiones: z.number().int().nonnegative(),
  lapsos: z.number().int().nonnegative(),
  ultimaRevision: z.iso.datetime().optional(),
  proximaRevision: z.iso.datetime(),
  ultimoEjercicioId: Id.optional(),
});

// ───────────────────────── Sincronización ─────────────────────────

/** Una respuesta del estudiante. El id lo genera el dispositivo: reenviarla no la duplica. */
export const Intento = z.object({
  id: z.uuid(),
  ejercicioId: Id,
  correcto: z.boolean(),
  msRespuesta: z.number().int().nonnegative(),
  respondidoEn: z.iso.datetime(),
  paqueteVersion: z.number().int().positive(),
});

/** El progreso de una ficha tal como viaja en /sync: el usuario sale del token, no del cuerpo. */
export const ProgresoSync = ProgresoFicha.omit({ usuarioId: true });

/**
 * Racha de días seguidos con una lección o un repaso terminado (PRD, "Racha"). `ultimoDia` es el día de
 * estudio del teléfono ("AAAA-MM-DD", en su zona horaria) de la última actividad, y `actual` cuenta los
 * días seguidos que terminan en él.
 */
export const Racha = z.object({
  actual: z.number().int().nonnegative(),
  maxima: z.number().int().nonnegative(),
  ultimoDia: z.iso.date().optional(),
});

/**
 * La mejor marca de una lección: aciertos a la primera sobre el total de ejercicios de esa vez. Repetir
 * la lección la mejora; las estrellas salen de ella (`estrellas`).
 */
export const MarcaLeccion = z
  .object({
    leccionId: Id,
    aciertos: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    logrado: z.iso.datetime(),
  })
  .refine((m) => m.aciertos <= m.total, { message: "aciertos no puede pasar de total", path: ["aciertos"] });

/** POST /sync: los intentos que faltan subir, el progreso que cambió en el dispositivo, la racha y las marcas, si cambiaron. */
export const PeticionSync = z.object({
  intentos: z.array(Intento).max(200),
  progreso: z.array(ProgresoSync).max(500),
  racha: Racha.optional(),
  marcas: z.array(MarcaLeccion).max(500).optional(),
});

/** Respuesta de /sync: el progreso consolidado del usuario, de todas sus fichas, su racha si ya tiene y sus marcas. */
export const RespuestaSync = z.object({ progreso: z.array(ProgresoSync), racha: Racha.optional(), marcas: z.array(MarcaLeccion).optional() });

// ───────────────────────── Tipos ─────────────────────────

export type FichaMusculo = z.infer<typeof FichaMusculo>;
export type Imagen = z.infer<typeof Imagen>;
export type Zona = z.infer<typeof Zona>;
export type Modelo3D = z.infer<typeof Modelo3D>;
export type Ejercicio = z.infer<typeof Ejercicio>;
export type EjercicioBase = z.infer<typeof EjercicioBase>;
export type FichaMusculoBase = z.infer<typeof FichaMusculoBase>;
export type Revision = z.infer<typeof Revision>;
export type EstadoRevision = z.infer<typeof EstadoRevision>;
export type Curso = z.infer<typeof Curso>;
export type PaqueteContenido = z.infer<typeof PaqueteContenido>;
export type SalidaGenerador = z.infer<typeof SalidaGenerador>;
export type ReporteError = z.infer<typeof ReporteError>;
export type MotivoReporte = z.infer<typeof MotivoReporte>;
export type NuevoReporte = z.infer<typeof NuevoReporte>;
export type OfertaPremium = z.infer<typeof OfertaPremium>;
export type PlanPremium = z.infer<typeof PlanPremium>;
export type NombreEvento = z.infer<typeof NombreEvento>;
export type EventoUso = z.infer<typeof EventoUso>;
export type ProgresoFicha = z.infer<typeof ProgresoFicha>;
export type Intento = z.infer<typeof Intento>;
export type ProgresoSync = z.infer<typeof ProgresoSync>;
export type Racha = z.infer<typeof Racha>;
export type MarcaLeccion = z.infer<typeof MarcaLeccion>;
export type PeticionSync = z.infer<typeof PeticionSync>;
export type RespuestaSync = z.infer<typeof RespuestaSync>;

// ───────────────────────── Validación entre colecciones ─────────────────────────

/**
 * Zod valida cada objeto por separado. Esto revisa que las referencias cuadren
 * entre colecciones antes de publicar un paquete. Devuelve [] si todo está bien.
 */
export function erroresDeConsistencia(p: PaqueteContenido): string[] {
  const errores: string[] = [];

  const duplicados = (ids: string[], tipo: string) => {
    const vistos = new Set<string>();
    for (const id of ids) {
      if (vistos.has(id)) errores.push(`${tipo} duplicado: ${id}`);
      vistos.add(id);
    }
  };
  duplicados(p.fichas.map((f) => f.id), "Ficha");
  duplicados(p.imagenes.map((i) => i.id), "Imagen");
  duplicados(p.ejercicios.map((e) => e.id), "Ejercicio");

  const fichas = new Set(p.fichas.map((f) => f.id));
  const ejercicios = new Set(p.ejercicios.map((e) => e.id));
  const zonasPorImagen = new Map(p.imagenes.map((i) => [i.id, new Map(i.zonas.map((z) => [z.id, z]))]));

  for (const img of p.imagenes) {
    if (!img.sinEtiquetas) errores.push(`Imagen ${img.id}: falta borrar los nombres impresos`);
    for (const zona of img.zonas) {
      if (!fichas.has(zona.fichaId)) {
        errores.push(`Imagen ${img.id}, zona ${zona.id}: la ficha ${zona.fichaId} no existe`);
      }
    }
    for (const fichaId of Object.keys(img.modelo3d?.estructuras ?? {})) {
      if (!fichas.has(fichaId)) errores.push(`Imagen ${img.id}, modelo 3D: la ficha ${fichaId} no existe`);
    }
  }

  for (const e of p.ejercicios) {
    for (const id of e.fichaIds) {
      if (!fichas.has(id)) errores.push(`Ejercicio ${e.id}: la ficha ${id} no existe`);
    }

    if ("opciones" in e) {
      const ids = e.opciones.map((o) => o.id);
      if (new Set(ids).size !== ids.length) errores.push(`Ejercicio ${e.id}: hay opciones con el mismo id`);
      if (!ids.includes(e.correcta)) errores.push(`Ejercicio ${e.id}: la respuesta correcta no está entre las opciones`);
    }

    if (e.tipo === "identificar_imagen" || e.tipo === "tocar_estructura") {
      const zonaId = e.tipo === "identificar_imagen" ? e.zonaResaltada : e.zonaCorrecta;
      const zonas = zonasPorImagen.get(e.imagenId);
      const zona = zonas?.get(zonaId);
      if (!zonas) errores.push(`Ejercicio ${e.id}: la imagen ${e.imagenId} no existe`);
      else if (!zona) errores.push(`Ejercicio ${e.id}: la zona ${zonaId} no está en la imagen ${e.imagenId}`);
      else if (!e.fichaIds.includes(zona.fichaId)) {
        errores.push(`Ejercicio ${e.id}: la zona ${zonaId} es de otra ficha (${zona.fichaId})`);
      }
    }
  }

  for (const unidad of p.curso.unidades) {
    for (const leccion of unidad.lecciones) {
      for (const id of leccion.ejercicioIds) {
        if (!ejercicios.has(id)) errores.push(`Lección ${leccion.id}: el ejercicio ${id} no existe`);
      }
    }
  }

  const sinAprobar = [...p.fichas, ...p.imagenes, ...p.ejercicios]
    .filter((x) => x.revision.estado !== "aprobada")
    .map((x) => x.id);
  if (sinAprobar.length > 0) errores.push(`Sin aprobar (no pueden ir a la app): ${sinAprobar.join(", ")}`);

  return errores;
}

/** ¿El toque cae dentro de la zona? (algoritmo de ray casting, coordenadas normalizadas 0–1). */
export function puntoEnZona([x, y]: [number, number], zona: Zona): boolean {
  let dentro = false;
  const pts = zona.puntos;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const cruza = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}
