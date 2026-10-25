import {
  type Curso,
  type Ejercicio,
  erroresDeConsistencia,
  type FichaMusculo,
  type Imagen,
  PaqueteContenido,
} from "@anatomia/contenido";

export interface ContenidoAprobado {
  curso: Curso | null;
  fichas: FichaMusculo[];
  imagenes: Imagen[];
  ejercicios: Ejercicio[];
}

export type ResultadoPaquete = { ok: true; paquete: PaqueteContenido } | { ok: false; errores: string[] };

/** Estado de revisión de todo lo que existe (aprobado o no), para explicar por qué falta algo. */
export interface Estados {
  fichas: Map<string, string>;
  ejercicios: Map<string, string>;
}

const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
/** El estado concuerda con el sustantivo: "el ejercicio está rechazado", "la ficha está rechazada". */
const ESTADO_EJERCICIO: Record<string, string> = { borrador: "en borrador", en_revision: "en revisión", rechazada: "rechazado" };
const ESTADO_FICHA: Record<string, string> = { borrador: "en borrador", en_revision: "en revisión", rechazada: "rechazada" };

/**
 * Lo que existe pero no está aprobado no entra al paquete, y erroresDeConsistencia lo reportaría
 * como "no existe". Esto lo dice con su estado real; devuelve también los mensajes que reemplaza.
 */
function sinAprobar(c: ContenidoAprobado & { curso: Curso }, estados: Estados) {
  const errores: string[] = [];
  const reemplazados = new Set<string>();
  const ejercicios = new Set(c.ejercicios.map((e) => e.id));
  const fichas = new Set(c.fichas.map((f) => f.id));

  for (const unidad of c.curso.unidades) {
    for (const l of unidad.lecciones) {
      for (const id of l.ejercicioIds) {
        const estado = estados.ejercicios.get(id);
        if (!ejercicios.has(id) && estado) {
          errores.push(`Lección ${l.id}: el ejercicio ${id} está ${ESTADO_EJERCICIO[estado] ?? estado}; apruébalo o quítalo de la lección`);
          reemplazados.add(`Lección ${l.id}: el ejercicio ${id} no existe`);
        }
      }
    }
  }
  for (const e of c.ejercicios) {
    for (const id of e.fichaIds) {
      const estado = estados.fichas.get(id);
      if (!fichas.has(id) && estado) {
        errores.push(`Ejercicio ${e.id}: su ficha ${id} está ${ESTADO_FICHA[estado] ?? estado}; apruébala primero`);
        reemplazados.add(`Ejercicio ${e.id}: la ficha ${id} no existe`);
      }
    }
  }
  return { errores, reemplazados };
}

/**
 * Arma el paquete con lo aprobado y corre las dos validaciones del PRD: el esquema
 * (PaqueteContenido.parse) y las referencias entre colecciones (erroresDeConsistencia).
 * Ordena por id para que dos paquetes con el mismo contenido sean idénticos.
 */
export function armarPaquete(
  version: number,
  c: ContenidoAprobado,
  estados: Estados = { fichas: new Map(), ejercicios: new Map() },
): ResultadoPaquete {
  if (!c.curso) return { ok: false, errores: ["Todavía no hay curso: arma las lecciones antes de publicar"] };

  const r = PaqueteContenido.safeParse({
    version,
    curso: c.curso,
    fichas: porId(c.fichas),
    imagenes: porId(c.imagenes),
    ejercicios: porId(c.ejercicios),
  });
  if (!r.success) return { ok: false, errores: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };

  const previos = sinAprobar({ ...c, curso: c.curso }, estados);
  const errores = [...previos.errores, ...erroresDeConsistencia(r.data).filter((e) => !previos.reemplazados.has(e))];
  return errores.length ? { ok: false, errores } : { ok: true, paquete: r.data };
}

/** JSON con las llaves ordenadas: Postgres guarda el JSONB con otro orden que el original. */
function jsonCanonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonCanonico).join(",")}]`;
  if (v && typeof v === "object") {
    const pares = Object.entries(v)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${pares.map(([k, x]) => `${JSON.stringify(k)}:${jsonCanonico(x)}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Compara contenido sin la versión, para no publicar dos veces lo mismo. */
export function mismoContenido(a: PaqueteContenido, b: PaqueteContenido): boolean {
  const sinVersion = ({ version: _v, ...resto }: PaqueteContenido) => jsonCanonico(resto);
  return sinVersion(a) === sinVersion(b);
}
