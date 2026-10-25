import { describe, expect, it } from "vitest";
import ejemplo from "./ejemplo-generador.json";
import { slug } from "./prompt";
import { validarSalida } from "./validar";

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
