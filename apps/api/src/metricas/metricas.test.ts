import { describe, expect, it } from "vitest";
import { aciertoPorEjercicio, resumenActividad } from "./metricas";

describe("resumenActividad", () => {
  const hoy = "2026-10-28";
  const estudiantes = [
    // Volvió al día siguiente y a la semana.
    { registro: "2026-10-01", hoy, dias: ["2026-10-01", "2026-10-02", "2026-10-08", "2026-10-27", "2026-10-28"] },
    // Nunca volvió.
    { registro: "2026-10-10", hoy, dias: ["2026-10-10"] },
    // Se registró ayer: su día 1 (hoy) todavía no termina.
    { registro: "2026-10-27", hoy, dias: ["2026-10-27", "2026-10-28"] },
  ];
  const r = resumenActividad(estudiantes);

  it("cuenta la retención solo de quienes ya cumplieron el día", () => {
    expect(r.retencionD1).toEqual({ elegibles: 2, retenidos: 1 });
    expect(r.retencionD7).toEqual({ elegibles: 2, retenidos: 1 });
  });

  it("promedia los días activos de la última semana entre los activos", () => {
    expect(r.activos7d).toBe(2);
    expect(r.diasActivosPorSemana).toBe(2);
    expect(r.nuevos7d).toBe(1);
    expect(r.total).toBe(3);
  });

  it("sin estudiantes no divide por cero", () => {
    expect(resumenActividad([]).diasActivosPorSemana).toBeNull();
  });
});

describe("aciertoPorEjercicio", () => {
  it("ordena del más bajo y marca los de menos de 30% con intentos suficientes", () => {
    const r = aciertoPorEjercicio([
      { ejercicioId: "facil", intentos: 10, correctos: 9 },
      { ejercicioId: "dificil", intentos: 10, correctos: 2 },
      { ejercicioId: "pocos", intentos: 2, correctos: 0 },
    ]);
    expect(r.map((f) => [f.ejercicioId, f.revisar])).toEqual([["pocos", false], ["dificil", true], ["facil", false]]);
  });
});
