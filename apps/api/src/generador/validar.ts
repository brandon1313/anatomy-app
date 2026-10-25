import { erroresDeSalidaGenerador, SalidaGenerador } from "@anatomia/contenido";

/** Cuántos ejercicios de cada tipo pide el PRD por ficha. */
const POR_FICHA = { opcion_multiple: 2, emparejar: 1, caso_clinico: 1 } as const;

export type ResultadoValidacion =
  | { ok: true; salida: SalidaGenerador }
  | { ok: false; errores: string[] };

/**
 * Valida la respuesta del LLM para un músculo: JSON, esquema zod, referencias entre colecciones
 * y las reglas del prompt que se pueden comprobar por código.
 */
export function validarSalida(
  texto: string,
  idFicha: string,
  existentes: { fichas: Iterable<string>; ejercicios: Iterable<string> },
): ResultadoValidacion {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, errores: ["La respuesta no es JSON válido"] };
  }

  const r = SalidaGenerador.safeParse(json);
  if (!r.success) {
    return { ok: false, errores: r.error.issues.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`) };
  }
  const salida = r.data;
  const errores = erroresDeSalidaGenerador(salida, existentes.fichas);

  if (salida.fichas.length !== 1 || salida.fichas[0].id !== idFicha) {
    errores.push(`Debe haber exactamente una ficha, con id "${idFicha}"`);
  }
  const ejerciciosExistentes = new Set(existentes.ejercicios);
  for (const e of salida.ejercicios) {
    if (ejerciciosExistentes.has(e.id)) errores.push(`Ya existe un ejercicio con id "${e.id}"; usa otro`);
    if (!e.fichaIds.includes(idFicha)) errores.push(`Ejercicio ${e.id}: fichaIds debe incluir "${idFicha}"`);
  }
  for (const [tipo, cantidad] of Object.entries(POR_FICHA)) {
    const n = salida.ejercicios.filter((e) => e.tipo === tipo).length;
    if (n !== cantidad) errores.push(`Se esperaban ${cantidad} ejercicios de tipo ${tipo} y hay ${n}`);
  }

  return errores.length ? { ok: false, errores } : { ok: true, salida };
}
