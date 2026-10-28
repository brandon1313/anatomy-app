import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ejemplo from "./ejemplo-generador.json";
import { slug } from "./prompt";
import { validarEjerciciosTexto, validarSalida } from "./validar";

const vacio = { fichas: [], ejercicios: [] };

describe("validarSalida", () => {
  it("acepta la salida de ejemplo completa", () => {
    expect(validarSalida(JSON.stringify(ejemplo), "recto-femoral", vacio)).toMatchObject({ ok: true });
  });

  it("rechaza texto que no es JSON", () => {
    expect(validarSalida("hola", "recto-femoral", vacio)).toEqual({ ok: false, errores: ["La respuesta no es JSON válido"] });
  });

  it("devuelve los errores del esquema con su ruta", () => {
    const r = validarSalida(JSON.stringify({ fichas: [], ejercicios: [] }), "recto-femoral", vacio);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0]).toMatch(/^fichas:/);
  });

  it("exige el id de ficha pedido, la cantidad por tipo y ids nuevos", () => {
    const sinCaso = { ...ejemplo, ejercicios: ejemplo.ejercicios.filter((e) => e.tipo !== "caso_clinico") };
    const r = validarSalida(JSON.stringify(sinCaso), "vasto-lateral", { fichas: [], ejercicios: ["recto-femoral-ficha"] });
    expect(r).toEqual({
      ok: false,
      errores: [
        'Debe haber exactamente una ficha, con id "vasto-lateral"',
        'Ejercicio recto-femoral-inervacion: fichaIds debe incluir "vasto-lateral"',
        'Ejercicio recto-femoral-accion: fichaIds debe incluir "vasto-lateral"',
        'Ya existe un ejercicio con id "recto-femoral-ficha"; usa otro',
        'Ejercicio recto-femoral-ficha: fichaIds debe incluir "vasto-lateral"',
        "Se esperaban 1 ejercicios de tipo caso_clinico y hay 0",
      ],
    });
  });
});

describe("slug", () => {
  it("quita tildes y espacios", () => {
    expect(slug(" Músculo   Tensor de la fascia lata ")).toBe("musculo-tensor-de-la-fascia-lata");
    expect(slug("Pectíneo")).toBe("pectineo");
  });
});

describe("validarEjerciciosTexto", () => {
  const archivos = ["muslo", "cadera", "pierna"].map(
    (r) => JSON.parse(readFileSync(new URL(`../../../../contenido/ejercicios-texto/${r}.json`, import.meta.url), "utf8")) as { fichaIds: string[] }[],
  );
  const escritos = archivos.flat();
  const fichas = new Set(escritos.flatMap((e) => e.fichaIds));

  it("acepta los ejercicios de contenido/ejercicios-texto: 4 por cada una de las 37 fichas", () => {
    expect(fichas.size).toBe(37);
    expect(validarEjerciciosTexto(escritos, fichas)).toMatchObject({ ok: true });
  });

  it("rechaza una ficha que no existe y una ficha a la que le falta un ejercicio", () => {
    const r = validarEjerciciosTexto(escritos.slice(1), [...fichas].filter((f) => f !== "sartorio"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.some((e) => e.includes("la ficha sartorio no existe"))).toBe(true);
      expect(r.errores.some((e) => e.startsWith("Ficha aductor-corto:"))).toBe(true);
    }
  });
});
