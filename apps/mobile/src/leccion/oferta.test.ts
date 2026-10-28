import type { PaqueteContenido } from "@anatomia/contenido";
import { describe, expect, it } from "vitest";
import { elegirOferta, ofertasAlTerminar } from "./oferta";

const leccion = (id: string, orden: number) => ({ id, titulo: id, orden, ejercicioIds: ["x"] });
const p = {
  curso: {
    titulo: "Miembro inferior",
    unidades: [
      { id: "muslo", titulo: "Músculos del muslo", orden: 0, lecciones: [leccion("m1", 0), leccion("m2", 1)] },
      { id: "pierna", titulo: "Músculos de la pierna", orden: 1, lecciones: [leccion("p1", 0), leccion("p2", 1)] },
    ],
  },
} as unknown as PaqueteContenido;
const origenes = (os: { origen: string }[]) => os.map((o) => o.origen);

describe("ofertasAlTerminar", () => {
  it("la primera lección no abre nada; la tercera, sí", () => {
    expect(ofertasAlTerminar(p, "m1", [])).toEqual([]);
    expect(origenes(ofertasAlTerminar(p, "p1", ["m1", "m2"]))).toEqual(["tercera_leccion"]);
  });

  it("terminar una unidad la nombra, y terminar la última también completa el curso", () => {
    expect(ofertasAlTerminar(p, "m2", ["m1"])).toEqual([{ origen: "fin_unidad", clave: "fin_unidad:muslo", logro: "¡Terminaste Músculos del muslo!" }]);
    const alFinal = ofertasAlTerminar(p, "p2", ["m1", "m2", "p1"]);
    expect(origenes(alFinal)).toEqual(["fin_region", "fin_unidad", "tercera_leccion"]);
    expect(alFinal[0].logro).toBe("¡Completaste el curso Miembro inferior!");
  });

  it("repetir una lección de una unidad ya completa no termina nada", () => {
    expect(origenes(ofertasAlTerminar(p, "m2", ["m1", "m2", "p1", "p2"]))).toEqual(["tercera_leccion"]);
  });
});

describe("elegirOferta", () => {
  const ofertas = ofertasAlTerminar(p, "p2", ["m1", "m2", "p1"]);

  it("elige la más fuerte que todavía no se vio", () => {
    expect(elegirOferta(ofertas, { vistas: [] }, "2026-10-28")?.origen).toBe("fin_region");
    expect(elegirOferta(ofertas, { vistas: ["fin_region"] }, "2026-10-28")?.clave).toBe("fin_unidad:pierna");
    expect(elegirOferta(ofertas, { vistas: ["fin_region", "fin_unidad:pierna", "tercera_leccion"] }, "2026-10-28")).toBeNull();
  });

  it("a lo sumo una por día", () => {
    expect(elegirOferta(ofertas, { dia: "2026-10-28", vistas: [] }, "2026-10-28")).toBeNull();
    expect(elegirOferta(ofertas, { dia: "2026-10-27", vistas: [] }, "2026-10-28")).not.toBeNull();
  });
});
