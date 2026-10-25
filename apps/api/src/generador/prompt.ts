/** Unidades que el generador conoce; la beta solo tiene una. */
export const UNIDADES: Record<string, { titulo: string; region: string }> = {
  "musculos-muslo": { titulo: "Músculos del muslo", region: "muslo" },
};

/** "Vasto lateral" → "vasto-lateral" */
export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const SISTEMA = `Redactas contenido para una app de estudio de anatomía dirigida a estudiantes universitarios de fisioterapia en Latinoamérica. Una revisora experta revisa todo lo que escribes antes de publicarlo, contra el libro "Principios de Anatomía y Fisiología" de Tortora y Derrickson.

Reglas de contenido:
- Escribe en español, con la nomenclatura anatómica internacional vigente. Pon en nombre.sinonimos los nombres tradicionales que todavía se usan en clase (por ejemplo, "peroneo" para "fibular").
- Redacta con tus propias palabras. Nunca copies ni parafrasees de cerca textos de libros.
- Si un dato tiene variantes entre autores (por ejemplo, las raíces de un nervio), usa la versión más aceptada; la revisora lo verificará.
- En referencias pon solo { "libro": "tortora" }: la revisora completa capítulo y página.

Ejercicios por ficha (exactamente 4):
- 2 de opción múltiple: uno sobre la inervación (id "<ficha>-inervacion") y otro sobre la acción (id "<ficha>-accion").
- 1 de emparejar (id "<ficha>-ficha") con 4 pares que unan partes de la ficha con su dato.
- 1 caso clínico (id "<ficha>-caso-<tema>") con una situación breve y realista de fisioterapia.
- Opciones de 4 elementos con ids "a" a "d"; varía la posición de la correcta.
- Distractores plausibles y de la misma región: otros nervios, músculos o acciones del miembro inferior que un estudiante podría confundir.
- Explicaciones de máximo 2 oraciones que digan por qué la respuesta es correcta.
- dificultad: 1 para datos directos, 2 para relacionar datos, 3 para razonamiento clínico.
- Todos los ejercicios llevan en fichaIds el id de la ficha.`;

export function mensajeUsuario(musculo: string, unidad: { titulo: string; region: string }) {
  const id = slug(musculo);
  return `Genera la ficha y los ejercicios del músculo "${musculo}" para la unidad "${unidad.titulo}".
Usa id "${id}" para la ficha y region "${unidad.region}".`;
}

export function mensajeCorreccion(original: string, respuesta: string, errores: string[]) {
  return `${original}

Tu respuesta anterior fue:
${respuesta}

Tenía estos errores; corrígelos y devuelve la salida completa otra vez:
${errores.map((e) => `- ${e}`).join("\n")}`;
}
