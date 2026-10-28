import type { ProgresoSync } from "@anatomia/contenido";
import { describe, expect, it } from "vitest";
import { aFila, aProgresoSync, aRacha } from "./sync.service";

describe("progreso entre /sync y la base", () => {
  it("va y vuelve sin perder nada, también sin revisión ni último ejercicio", () => {
    const completo: ProgresoSync = {
      fichaId: "sartorio",
      estado: "repaso",
      estabilidad: 3.17,
      dificultad: 5.28,
      diasProgramados: 3,
      pasosAprendizaje: 0,
      repeticiones: 2,
      lapsos: 1,
      ultimaRevision: "2026-10-27T15:00:00.000Z",
      proximaRevision: "2026-10-30T15:00:00.000Z",
      ultimoEjercicioId: "tocar-muslo-anterior-superficial-sartorio",
    };
    const minimo: ProgresoSync = { ...completo, ultimaRevision: undefined, ultimoEjercicioId: undefined };
    for (const p of [completo, minimo]) {
      const fila = { usuarioId: "8f1c2a8e-58e1-4b6b-9a0e-3c3a1d2b4c5d", ...aFila(p) };
      expect(aProgresoSync(fila)).toEqual(p);
    }
  });
});

describe("racha entre la base y /sync", () => {
  it("sin último día no manda el campo", () => {
    const usuarioId = "8f1c2a8e-58e1-4b6b-9a0e-3c3a1d2b4c5d";
    expect(aRacha({ usuarioId, actual: 3, maxima: 5, ultimoDia: "2026-10-27" })).toEqual({ actual: 3, maxima: 5, ultimoDia: "2026-10-27" });
    expect(aRacha({ usuarioId, actual: 0, maxima: 0, ultimoDia: null })).toStrictEqual({ actual: 0, maxima: 0, ultimoDia: undefined });
  });
});
