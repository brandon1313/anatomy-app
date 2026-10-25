import { type Curso, Ejercicio, FichaMusculo, SalidaGenerador } from "@anatomia/contenido";
import { describe, expect, it } from "vitest";
import ejemplo from "../generador/ejemplo-generador.json";
import { armarPaquete, mismoContenido } from "./paquete";

const revision = { estado: "aprobada" as const, revisadoPor: "Revisora", fecha: "2026-10-25T12:00:00Z" };
const salida = SalidaGenerador.parse(ejemplo);
const fichas = salida.fichas.map((f) => FichaMusculo.parse({ ...f, revision, version: 1 }));
const ejercicios = salida.ejercicios.map((e) => Ejercicio.parse({ ...e, revision, version: 1 }));

const curso = (ejercicioIds: string[]): Curso => ({
  id: "miembro-inferior",
  titulo: "Miembro inferior",
  carreras: ["fisioterapia"],
  unidades: [{ id: "musculos-muslo", titulo: "Músculos del muslo", orden: 0, lecciones: [{ id: "cuadriceps", titulo: "Cuádriceps", orden: 0, ejercicioIds }] }],
});

describe("armarPaquete", () => {
  it("pide un curso antes de publicar", () => {
    expect(armarPaquete(1, { curso: null, fichas, imagenes: [], ejercicios })).toEqual({
      ok: false,
      errores: ["Todavía no hay curso: arma las lecciones antes de publicar"],
    });
  });

  it("arma un paquete válido y ordenado por id", () => {
    const r = armarPaquete(3, { curso: curso(["recto-femoral-ficha"]), fichas, imagenes: [], ejercicios: [...ejercicios].reverse() });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.paquete.version).toBe(3);
      expect(r.paquete.ejercicios.map((e) => e.id)).toEqual([...ejercicios.map((e) => e.id)].sort());
    }
  });

  it("explica con su estado lo que falta por aprobar", () => {
    const r = armarPaquete(
      1,
      { curso: curso(["recto-femoral-ficha", "recto-femoral-caso-nervio-femoral", "no-existe"]), fichas: [], imagenes: [], ejercicios: ejercicios.filter((e) => e.tipo === "emparejar") },
      {
        fichas: new Map([["recto-femoral", "en_revision"]]),
        ejercicios: new Map([["recto-femoral-caso-nervio-femoral", "borrador"]]),
      },
    );
    expect(r).toEqual({
      ok: false,
      errores: [
        "Lección cuadriceps: el ejercicio recto-femoral-caso-nervio-femoral está en borrador; apruébalo o quítalo de la lección",
        "Ejercicio recto-femoral-ficha: su ficha recto-femoral está en revisión; apruébala primero",
        "Lección cuadriceps: el ejercicio no-existe no existe",
      ],
    });
  });
});

describe("mismoContenido", () => {
  it("ignora la versión y detecta cambios", () => {
    const a = armarPaquete(1, { curso: curso(["recto-femoral-ficha"]), fichas, imagenes: [], ejercicios });
    const b = armarPaquete(2, { curso: curso(["recto-femoral-ficha"]), fichas, imagenes: [], ejercicios });
    const c = armarPaquete(2, { curso: curso(["recto-femoral-accion"]), fichas, imagenes: [], ejercicios });
    if (!a.ok || !b.ok || !c.ok) throw new Error("se esperaban paquetes válidos");
    expect(mismoContenido(a.paquete, b.paquete)).toBe(true);
    expect(mismoContenido(a.paquete, c.paquete)).toBe(false);
  });

  it("no depende del orden de las llaves (así vuelve el JSONB de Postgres)", () => {
    const a = armarPaquete(1, { curso: curso(["recto-femoral-ficha"]), fichas, imagenes: [], ejercicios });
    if (!a.ok) throw new Error("se esperaba un paquete válido");
    const invertir = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(invertir) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, invertir(x)])) : v;
    expect(mismoContenido(a.paquete, invertir(a.paquete) as typeof a.paquete)).toBe(true);
  });
});
