import type { Modelo3D } from "@anatomia/contenido";
import { z } from "zod";

/** Lo que se usa del JSON del modelo (las claves vienen del archivo "Muslo derecho en 3D"). */
export const DatosModelo = z.object({
  data: z.record(z.string(), z.object({ name: z.string(), kind: z.string() })),
  views: z.record(z.string(), z.string()),
  hide: z.record(z.string(), z.array(z.string())),
  meta: z.object({ meshes: z.array(z.object({ id: z.string() })).min(1) }),
});
export type DatosModelo = z.infer<typeof DatosModelo>;

export const LICENCIA_BODYPARTS3D: Modelo3D["licencia"] = {
  tipo: "cc_by",
  fuente: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html",
  atribucion: "Modelo: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Simplificado y agrupado.",
};

/**
 * El modelo 3D de una imagen de lámina.
 *  - Capa: sale del final del id de la imagen ("muslo-anterior-profunda" → "profunda"), y con ella las
 *    estructuras que se ocultan.
 *  - Estructuras: solo los músculos con una ficha existente (la ficha es el id con guiones). Vasos y
 *    nervio quedan fuera de los ejercicios (docs/PLAN-REDISENO.md, decisiones 4 y 5), y una estructura
 *    oculta en esta capa no se puede preguntar.
 */
export function modelo3dParaImagen(
  datos: DatosModelo,
  imagenId: string,
  fichas: Set<string>,
  claves: { archivo: string; datos: string },
): Modelo3D {
  const capa = Object.keys(datos.hide).find((c) => imagenId.endsWith(`-${c}`));
  const ocultas = capa ? datos.hide[capa] : [];
  const estructuras: Record<string, string> = {};
  for (const [id, d] of Object.entries(datos.data)) {
    const fichaId = id.replaceAll("_", "-");
    if (d.kind === "muscle" && fichas.has(fichaId) && !ocultas.includes(id)) estructuras[fichaId] = id;
  }
  return { ...claves, estructuras, ocultas, licencia: LICENCIA_BODYPARTS3D };
}
