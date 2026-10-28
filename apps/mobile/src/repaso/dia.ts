/**
 * El día de estudio, para el repaso y la racha, es el del reloj del teléfono y empieza a las 4 a. m. (como
 * en Anki): estudiar pasada la medianoche cuenta para el día anterior.
 */
export const HORA_DE_CORTE = 4;

/**
 * La hora del reloj local menos la hora de corte, escrita como si fuera UTC: su fecha UTC es la del día de
 * estudio. ts-fsrs cuenta los días transcurridos por fecha UTC (en Guatemala cambiaría a las 6 p. m.).
 */
export const aReloj = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000 - HORA_DE_CORTE * 3_600_000);

/** El inicio del día de estudio que cae `dias` días después del de `d`. */
export function inicioDelDia(d: Date, dias = 0): Date {
  const r = aReloj(d);
  return new Date(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate() + dias, HORA_DE_CORTE);
}

/** El día de estudio de `d`, "AAAA-MM-DD". */
export const diaDeEstudio = (d: Date) => aReloj(d).toISOString().slice(0, 10);
