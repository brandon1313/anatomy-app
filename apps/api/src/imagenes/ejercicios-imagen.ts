import { EjercicioBase, type Imagen, type Zona } from "@anatomia/contenido";

/**
 * Ejercicios de imagen generados por código (PRD, "Flujo de contenido", paso 2): por cada zona un
 * `tocar_estructura` y un `identificar_imagen` con hasta 3 distractores de otras zonas de la misma imagen.
 * Los ids son fijos por imagen y zona, así que volver a generar actualiza en vez de duplicar.
 */

/** Lo que se usa de cada ficha para redactar los ejercicios. */
export interface DatosFicha {
  nombre: string;
  compartimento?: string;
  acciones: string[];
}

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const sufijo = (imagen: Imagen, zona: Zona) => `${imagen.id}-${zona.id.replace(/^zona-/, "")}`;

export const idTocar = (imagen: Imagen, zona: Zona) => `tocar-${sufijo(imagen, zona)}`;
export const idIdentificar = (imagen: Imagen, zona: Zona) => `identificar-${sufijo(imagen, zona)}`;

function centro(z: Zona): [number, number] {
  const n = z.puntos.length;
  return [z.puntos.reduce((s, p) => s + p[0], 0) / n, z.puntos.reduce((s, p) => s + p[1], 0) / n];
}

/** Máximo 2 oraciones (PRD). La revisora la puede reescribir; regenerar no pisa su versión. */
export function explicacion(f: DatosFicha): string {
  const donde = f.compartimento ? `El ${minuscula(f.nombre)} está en el compartimento ${f.compartimento}. ` : "";
  return `${donde}Acción: ${f.acciones.map(minuscula).join("; ")}.`;
}

/** Las zonas más cercanas con otra ficha: distractores de la misma región. */
function distractores(zona: Zona, zonas: Zona[], fichas: Map<string, DatosFicha>, cuantos: number): Zona[] {
  const [cx, cy] = centro(zona);
  const usadas = new Set([zona.fichaId]);
  return zonas
    .filter((z) => z.fichaId !== zona.fichaId && fichas.has(z.fichaId))
    .map((z) => ({ z, d: Math.hypot(centro(z)[0] - cx, centro(z)[1] - cy) }))
    .sort((a, b) => a.d - b.d || a.z.id.localeCompare(b.z.id))
    .map(({ z }) => z)
    .filter((z) => !usadas.has(z.fichaId) && Boolean(usadas.add(z.fichaId)))
    .slice(0, cuantos);
}

export function ejerciciosDeImagen(imagen: Imagen, fichas: Map<string, DatosFicha>): EjercicioBase[] {
  const ejercicios: EjercicioBase[] = [];
  for (const zona of imagen.zonas) {
    const f = fichas.get(zona.fichaId);
    if (!f) continue;
    const comun = { fichaIds: [zona.fichaId], imagenId: imagen.id, explicacion: explicacion(f) };
    ejercicios.push(
      EjercicioBase.parse({
        ...comun,
        id: idTocar(imagen, zona),
        tipo: "tocar_estructura",
        dificultad: 2,
        enunciado: `Toca el ${minuscula(f.nombre)}`,
        zonaCorrecta: zona.id,
      }),
    );
    const otras = distractores(zona, imagen.zonas, fichas, 3);
    // Con una sola zona no hay a qué contraponerla: el esquema pide al menos 2 opciones.
    if (otras.length === 0) continue;
    ejercicios.push(
      EjercicioBase.parse({
        ...comun,
        id: idIdentificar(imagen, zona),
        tipo: "identificar_imagen",
        dificultad: 1,
        zonaResaltada: zona.id,
        // La app baraja las opciones al mostrarlas.
        opciones: [f, ...otras.map((z) => fichas.get(z.fichaId)!)].map((x, i) => ({ id: "abcd"[i], texto: x.nombre })),
        correcta: "a",
      }),
    );
  }
  return ejercicios;
}

/** PRD: una imagen no se aprueba si no confirmó que borró los nombres impresos o si una zona no tiene ficha. */
export function erroresParaAprobar(imagen: Imagen, fichasExistentes: Set<string>): string[] {
  const errores: string[] = [];
  if (!imagen.sinEtiquetas) errores.push("Falta confirmar que se borraron los nombres impresos en la imagen");
  for (const z of imagen.zonas) {
    if (!fichasExistentes.has(z.fichaId)) errores.push(`La zona ${z.id} apunta a la ficha ${z.fichaId}, que no existe`);
  }
  return errores;
}

/**
 * Al regenerar, lo que depende de las zonas se recalcula y lo que pudo redactar la revisora
 * (enunciado, explicación y dificultad) se conserva.
 */
export function fusionar(generado: EjercicioBase, existente: EjercicioBase): EjercicioBase {
  const redactado: Partial<Record<"enunciado" | "explicacion" | "dificultad", unknown>> = {
    explicacion: existente.explicacion,
    dificultad: existente.dificultad,
  };
  if ("enunciado" in existente) redactado.enunciado = existente.enunciado;
  return EjercicioBase.parse({ ...generado, ...redactado });
}
