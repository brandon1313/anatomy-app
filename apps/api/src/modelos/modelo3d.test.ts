import { describe, expect, it } from "vitest";
import { type DatosModelo, modelo3dParaImagen } from "./modelo3d";

const datos: DatosModelo = {
  data: {
    recto_femoral: { name: "Recto femoral", kind: "muscle" },
    vasto_intermedio: { name: "Vasto intermedio", kind: "muscle" },
    biceps_femoral: { name: "Bíceps femoral", kind: "muscle" },
    arteria_femoral: { name: "Arteria femoral", kind: "artery" },
  },
  views: { recto_femoral: "ant" },
  hide: { superficial: [], profunda: ["recto_femoral"] },
  meta: { meshes: [{ id: "recto_femoral" }] },
};
const fichas = new Set(["recto-femoral", "vasto-intermedio", "arteria-femoral"]);
const claves = { archivo: "modelos/m.bin", datos: "modelos/m.json" };

describe("modelo3dParaImagen", () => {
  it("enlaza solo los músculos que tienen ficha", () => {
    const m = modelo3dParaImagen(datos, "muslo-anterior-superficial", fichas, claves);
    expect(m.estructuras).toEqual({ "recto-femoral": "recto_femoral", "vasto-intermedio": "vasto_intermedio" });
    expect(m.ocultas).toEqual([]);
    expect(m.licencia.tipo).toBe("cc_by");
  });

  it("en la capa profunda oculta lo superficial y no lo enlaza", () => {
    const m = modelo3dParaImagen(datos, "muslo-anterior-profunda", fichas, claves);
    expect(m.ocultas).toEqual(["recto_femoral"]);
    expect(m.estructuras).toEqual({ "vasto-intermedio": "vasto_intermedio" });
  });

  it("con una capa por vista, gana la clave más específica", () => {
    const conVistas = { ...datos, hide: { ...datos.hide, "posterior-profunda": ["biceps_femoral"] } };
    expect(modelo3dParaImagen(conVistas, "muslo-posterior-profunda", fichas, claves).ocultas).toEqual(["biceps_femoral"]);
    expect(modelo3dParaImagen(conVistas, "muslo-anterior-profunda", fichas, claves).ocultas).toEqual(["recto_femoral"]);
  });
});
