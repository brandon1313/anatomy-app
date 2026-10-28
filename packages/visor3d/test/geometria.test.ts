import { describe, expect, it } from "vitest";
import { corrimientoAlAcercar, deBase64, dentroDeLaCaja, distanciaParaVer, giroMasCorto, Ocupacion, ordenDesdeElCentro, puntosDeBusqueda, vistaDeAngulo } from "../src/geometria";

describe("giroMasCorto", () => {
  it("gira por el lado más corto, también al cruzar los 180°", () => {
    expect(giroMasCorto(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(giroMasCorto(-0.9 * Math.PI, 0.9 * Math.PI)).toBeCloseTo(-0.2 * Math.PI);
    expect(giroMasCorto(0.9 * Math.PI, -0.9 * Math.PI)).toBeCloseTo(0.2 * Math.PI);
  });

  it("de anterior a posterior da media vuelta", () => {
    expect(Math.abs(giroMasCorto(0, Math.PI))).toBeCloseTo(Math.PI);
  });
});

describe("distanciaParaVer", () => {
  it("deja el modelo entero, con margen, incluso en su cara más cercana", () => {
    const [alto, ancho, fov] = [0.74, 0.17, 28];
    const d = distanciaParaVer(alto, ancho, fov, 0.64);
    const altoVisible = 2 * (d - ancho / 2) * Math.tan((fov * Math.PI) / 360);
    expect(altoVisible).toBeGreaterThan(alto);
    expect(altoVisible).toBeLessThan(alto * 1.1);
  });

  it("en una pantalla muy angosta manda el ancho", () => {
    expect(distanciaParaVer(0.1, 1, 28, 0.2)).toBeGreaterThan(distanciaParaVer(0.1, 1, 28, 1));
  });
});

describe("puntosDeBusqueda", () => {
  it("empieza por el punto exacto y no se aleja más de 18 px", () => {
    const puntos = puntosDeBusqueda(100, 200);
    expect(puntos[0]).toEqual([100, 200]);
    expect(puntos).toHaveLength(17);
    for (const [x, y] of puntos) expect(Math.hypot(x - 100, y - 200)).toBeLessThanOrEqual(18 + 1e-9);
  });
});

describe("deBase64", () => {
  it("devuelve los mismos bytes", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 254, 255]);
    expect(new Uint8Array(deBase64(btoa(String.fromCharCode(...bytes))))).toEqual(bytes);
  });
});

describe("vistaDeAngulo", () => {
  it("reconoce las cuatro vistas, también después de dar vueltas", () => {
    expect(vistaDeAngulo(0)).toBe("ant");
    expect(vistaDeAngulo(Math.atan2(1, 0.15))).toBe("med");
    expect(vistaDeAngulo(Math.atan2(-1, 0.15))).toBe("lat");
    expect(vistaDeAngulo(Math.PI)).toBe("post");
    expect(vistaDeAngulo(-Math.PI)).toBe("post");
    expect(vistaDeAngulo(2 * Math.PI + 0.1)).toBe("ant");
  });
});

describe("ordenDesdeElCentro", () => {
  it("va del centro hacia los extremos", () => {
    expect(ordenDesdeElCentro(7)).toEqual([3, 2, 4, 1, 5, 0, 6]);
    expect(ordenDesdeElCentro(2)).toEqual([0, 1]);
    expect(ordenDesdeElCentro(0)).toEqual([]);
  });
});

describe("Ocupacion", () => {
  it("no deja poner nada encima de lo marcado ni fuera de la pantalla", () => {
    const o = new Ocupacion(300, 200);
    o.marcar(100, 100, 40, 20);
    expect(o.libre(110, 105, 30, 10)).toBe(false);
    expect(o.libre(10, 10, 50, 18)).toBe(true);
    expect(o.libre(280, 10, 50, 18)).toBe(false);
    expect(o.libre(-5, 10, 20, 10)).toBe(false);
  });
});

describe("corrimientoAlAcercar y dentroDeLaCaja", () => {
  const cerca = (a: number[], b: number[]) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i]));

  it("al acercar a la mitad, se corre la mitad del camino hacia el punto; al alejar, se aleja", () => {
    cerca(corrimientoAlAcercar([0, 0, 0], [0.2, -0.1, 0], 1, 0.5), [0.1, -0.05, 0]);
    cerca(corrimientoAlAcercar([0, 0, 0], [0.2, 0, 0], 1, 2), [-0.2, 0, 0]);
    cerca(corrimientoAlAcercar([0.1, 0, 0], [0.1, 0, 0], 1, 0.5), [0, 0, 0]);
  });

  it("no deja que el objetivo salga de la caja del modelo", () => {
    cerca(dentroDeLaCaja([0.5, -0.9, 0.01], [0.2, 0.8, 0.2]), [0.1, -0.4, 0.01]);
  });
});
