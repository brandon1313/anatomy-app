import { describe, expect, it } from "vitest";
import { deBase64, distanciaParaVer, giroMasCorto, puntosDeBusqueda } from "../src/geometria";

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
