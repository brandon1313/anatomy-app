import { numeroDeDia, type Racha } from "@anatomia/contenido";

/**
 * Racha de días seguidos (PRD, "Racha"): un día cuenta si se termina al menos una lección o un repaso, y si
 * pasa un día completo sin actividad vuelve a 0. Los días son días de estudio ("AAAA-MM-DD", dia.ts).
 */
export const SIN_RACHA: Racha = { actual: 0, maxima: 0 };

/** La racha después de terminar una lección o un repaso en el día `hoy`. */
export function registrarActividad(r: Racha, hoy: string): Racha {
  const dias = r.ultimoDia ? numeroDeDia(hoy) - numeroDeDia(r.ultimoDia) : Infinity;
  // Ese día ya contó. Uno anterior al último (el reloj o la zona horaria retrocedieron) tampoco cambia nada.
  if (dias <= 0) return r;
  const actual = dias === 1 ? r.actual + 1 : 1;
  return { actual, maxima: Math.max(r.maxima, actual), ultimoDia: hoy };
}

/** Los días que se muestran hoy: si ayer tampoco hubo actividad, la racha ya se perdió. */
export const rachaVigente = (r: Racha, hoy: string) => (r.ultimoDia && numeroDeDia(hoy) - numeroDeDia(r.ultimoDia) <= 1 ? r.actual : 0);
