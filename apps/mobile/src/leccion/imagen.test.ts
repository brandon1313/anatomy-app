import type { Zona } from "@anatomia/contenido";
import { describe, expect, it } from "vitest";
import { desplazamientoPara, normalizar, puntosEnPantalla } from "./imagen";

const zona = (y0: number, y1: number): Zona => ({ id: "z", fichaId: "f", puntos: [[0.2, y0], [0.6, y0], [0.6, y1], [0.2, y1]] });

describe("normalizar", () => {
  it("divide por el tamaño mostrado", () => {
    expect(normalizar(171.5, 497.5, 343, 995)).toEqual([0.5, 0.5]);
  });

  it("recorta a 0–1 un toque justo en el borde", () => {
    expect(normalizar(-2, 1000, 343, 995)).toEqual([0, 1]);
  });
});

describe("puntosEnPantalla", () => {
  it("multiplica cada punto por el tamaño mostrado", () => {
    expect(puntosEnPantalla(zona(0.1, 0.2), 300, 900)).toBe("60,90 180,90 180,180 60,180");
  });
});

describe("desplazamientoPara", () => {
  it("centra la zona en la ventana", () => {
    // Zona centrada en y=0.5 de una imagen de 1000 → centro en 500; ventana de 400 → 300.
    expect(desplazamientoPara(zona(0.45, 0.55), 1000, 400)).toBe(300);
  });

  it("no sube más allá del borde superior", () => {
    expect(desplazamientoPara(zona(0, 0.05), 1000, 400)).toBe(0);
  });

  it("no baja más allá del borde inferior", () => {
    expect(desplazamientoPara(zona(0.95, 1), 1000, 400)).toBe(600);
  });

  it("no se desplaza si la imagen cabe en la ventana", () => {
    expect(desplazamientoPara(zona(0.9, 1), 300, 400)).toBe(0);
  });

  it("incluye el punto tocado si cabe junto con la zona", () => {
    // Zona centrada en 500, toque en 300: se centra en 400 → 400 - 200 = 200.
    expect(desplazamientoPara(zona(0.45, 0.55), 1000, 400, 0.3)).toBe(200);
  });

  it("si el punto tocado no cabe, manda la zona", () => {
    expect(desplazamientoPara(zona(0.45, 0.55), 1000, 400, 0.05)).toBe(300);
  });
});
