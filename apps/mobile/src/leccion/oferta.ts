import type { PaqueteContenido } from "@anatomia/contenido";
import { unidadesConLecciones } from "./flujo";

/** Un momento en que la oferta de Premium aparece sola (docs/PLAN-PREMIUM.md, "Dónde aparece la oferta"). */
export interface Oferta {
  /** Va en los eventos premium_visto y premium_interes. */
  origen: "fin_region" | "fin_unidad" | "tercera_leccion";
  /** Cada momento aparece una sola vez: la unidad terminada tiene la suya. */
  clave: string;
  /** Lo que se acaba de lograr, arriba de la oferta. */
  logro?: string;
}

/** Las ofertas que se ven en el teléfono y el día de estudio de la última. */
export interface RegistroOfertas {
  dia?: string;
  vistas: string[];
}

/**
 * Los momentos que abre terminar esta lección, del más fuerte al más débil: completar el curso, completar
 * una unidad y la tercera lección. Repetir una lección ya completada no termina nada.
 */
export function ofertasAlTerminar(p: PaqueteContenido, leccionId: string, completadasAntes: readonly string[]): Oferta[] {
  const antes = new Set(completadasAntes);
  const despues = new Set([...antes, leccionId]);
  const unidades = unidadesConLecciones(p);
  const completa = (hechas: Set<string>, u: (typeof unidades)[number]) => u.lecciones.every((l) => hechas.has(l.id));
  const ofertas: Oferta[] = [];
  if (unidades.length > 0 && unidades.every((u) => completa(despues, u)) && !unidades.every((u) => completa(antes, u))) {
    ofertas.push({ origen: "fin_region", clave: "fin_region", logro: `¡Completaste el curso ${p.curso.titulo}!` });
  }
  const unidad = unidades.find((u) => u.lecciones.some((l) => l.id === leccionId));
  if (unidad && completa(despues, unidad) && !completa(antes, unidad)) {
    ofertas.push({ origen: "fin_unidad", clave: `fin_unidad:${unidad.id}`, logro: `¡Terminaste ${unidad.titulo}!` });
  }
  if (despues.size >= 3) ofertas.push({ origen: "tercera_leccion", clave: "tercera_leccion" });
  return ofertas;
}

/** La primera oferta que todavía no se vio, si hoy no apareció ninguna: a lo sumo una por día. */
export function elegirOferta(ofertas: readonly Oferta[], registro: RegistroOfertas, hoy: string): Oferta | null {
  if (registro.dia === hoy) return null;
  return ofertas.find((o) => !registro.vistas.includes(o.clave)) ?? null;
}
