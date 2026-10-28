import { Imagen } from "@anatomia/contenido";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAPAS, fichasDeLamina, leerLamina, svgDeCapa, zonasDeCapa } from "./lamina";

const html = readFileSync(new URL("../../../../contenido/laminas/muslo-derecho-anterior.html", import.meta.url), "utf8");
const lamina = leerLamina(html);

describe("leerLamina", () => {
  it("lee el dibujo, su viewBox y el orden de dibujo", () => {
    expect(lamina.viewBox).toEqual([48, 44, 304, 882]);
    expect(lamina.orden).toHaveLength(18);
    expect(lamina.orden.indexOf("sartorio")).toBeGreaterThan(lamina.orden.indexOf("recto_femoral"));
  });

  it("explica qué falta si el HTML no es una lámina", () => {
    expect(() => leerLamina("<html></html>")).toThrow("const P");
  });
});

describe("zonasDeCapa", () => {
  it("da 10 zonas en la capa superficial y 9 en la profunda", () => {
    expect(zonasDeCapa(lamina, "superficial").map((z) => z.fichaId)).toEqual([
      "aductor-mayor", "vasto-lateral", "iliopsoas", "pectineo", "aductor-largo",
      "gracil", "vasto-medial", "recto-femoral", "tensor-fascia-lata", "sartorio",
    ]);
    expect(zonasDeCapa(lamina, "profunda").map((z) => z.fichaId)).toEqual([
      "vasto-intermedio", "aductor-mayor", "aductor-corto", "vasto-lateral", "iliopsoas",
      "pectineo", "gracil", "vasto-medial", "tensor-fascia-lata",
    ]);
  });

  it("con zonas por capa, usa la de cada capa y deja sin zona lo que esa capa no trae", () => {
    const conCapas = {
      ...lamina,
      datos: { ...lamina.datos, ghostsCapa: { superficial: { sartorio: "M48,44 L200,44 L200,485 Z" }, profunda: {} } },
    };
    const [zona, ...resto] = zonasDeCapa(conCapas, "superficial");
    expect(resto).toEqual([]);
    expect(zona).toEqual({ id: "zona-sartorio", fichaId: "sartorio", puntos: [[0, 0], [0.5, 0], [0.5, 0.5]] });
    expect(zonasDeCapa(conCapas, "profunda")).toEqual([]);
  });

  it("produce zonas válidas para el esquema Imagen", () => {
    for (const capa of CAPAS) {
      const r = Imagen.safeParse({
        id: `muslo-anterior-${capa}`,
        titulo: "Muslo",
        archivo: "imagenes/x.webp",
        ancho: 1200,
        alto: 3482,
        licencia: { tipo: "propia" },
        sinEtiquetas: true,
        zonas: zonasDeCapa(lamina, capa),
        revision: { estado: "borrador" },
        version: 1,
      });
      expect(r.success).toBe(true);
    }
  });
});

describe("svgDeCapa", () => {
  const ocultas = (svg: string) => [...svg.matchAll(/data-id="([^"]+)" display="none"/g)].map((m) => m[1]);

  it("oculta en cada capa lo que la lámina oculta", () => {
    expect(ocultas(svgDeCapa(lamina, "superficial"))).toEqual(["vasto_intermedio", "aductor_corto"]);
    expect(ocultas(svgDeCapa(lamina, "profunda"))).toEqual(["aductor_largo", "recto_femoral", "sartorio"]);
  });

  it("es un SVG independiente con los estilos del dibujo", () => {
    const svg = svgDeCapa(lamina, "superficial");
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="48 44 304 882"')).toBe(true);
    expect(svg).toContain(".sil{");
    expect(svg).not.toContain("tabindex");
  });
});

describe("fichasDeLamina", () => {
  const fichas = fichasDeLamina(lamina, "muslo");
  const ficha = (id: string) => fichas.find((f) => f.id === id)!;

  it("trae los 12 músculos", () => {
    expect(fichas).toHaveLength(12);
  });

  it("separa nervio y raíces", () => {
    expect(ficha("recto-femoral").inervacion).toEqual([{ nervio: "Nervio femoral", raices: "L2–L4" }]);
  });

  it("separa en elementos por punto y coma y por oración", () => {
    expect(ficha("recto-femoral").origen).toEqual([
      "Cabeza directa en la espina ilíaca anteroinferior",
      "Cabeza refleja en el surco supraacetabular",
    ]);
    expect(ficha("aductor-mayor").inervacion).toHaveLength(2);
  });

  it("deduce el compartimento del grupo", () => {
    expect(ficha("vasto-lateral").compartimento).toBe("anterior");
    expect(ficha("gracil").compartimento).toBe("medial");
    expect(ficha("iliopsoas").compartimento).toBeUndefined();
  });

  it("pide la referencia a Tortora", () => {
    expect(fichas.every((f) => f.referencias.some((r) => r.libro === "tortora"))).toBe(true);
  });
});
