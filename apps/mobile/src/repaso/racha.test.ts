import { describe, expect, it } from "vitest";
import { diaDeEstudio } from "./dia";
import { rachaVigente, registrarActividad, SIN_RACHA } from "./racha";

describe("registrarActividad", () => {
  it("empieza en 1, no suma dos veces el mismo día y suma el día siguiente", () => {
    const r = registrarActividad(SIN_RACHA, "2026-10-27");
    expect(r).toEqual({ actual: 1, maxima: 1, ultimoDia: "2026-10-27" });
    expect(registrarActividad(r, "2026-10-27")).toBe(r);
    expect(registrarActividad(r, "2026-10-28")).toEqual({ actual: 2, maxima: 2, ultimoDia: "2026-10-28" });
  });

  it("un día completo sin actividad la reinicia, y la máxima se conserva", () => {
    expect(registrarActividad({ actual: 5, maxima: 7, ultimoDia: "2026-10-25" }, "2026-10-27")).toEqual({ actual: 1, maxima: 7, ultimoDia: "2026-10-27" });
  });

  it("cruza meses y años", () => {
    expect(registrarActividad({ actual: 3, maxima: 3, ultimoDia: "2026-12-31" }, "2027-01-01").actual).toBe(4);
  });
});

describe("rachaVigente", () => {
  it("dura hasta el final del día siguiente; después es 0", () => {
    const r = { actual: 4, maxima: 6, ultimoDia: "2026-10-27" };
    expect(rachaVigente(r, "2026-10-27")).toBe(4);
    expect(rachaVigente(r, "2026-10-28")).toBe(4);
    expect(rachaVigente(r, "2026-10-29")).toBe(0);
    expect(rachaVigente(SIN_RACHA, "2026-10-27")).toBe(0);
  });
});

describe("la racha con la zona horaria del teléfono", () => {
  const enZona = <T,>(zona: string, f: () => T): T => {
    const antes = process.env.TZ;
    process.env.TZ = zona;
    try {
      return f();
    } finally {
      process.env.TZ = antes;
    }
  };

  it("cuenta el día local, no el UTC, con el corte a las 4 a. m.", () => {
    // Las 11 p. m. en Guatemala ya son el 28 en UTC; la 1 a. m. todavía es el día de estudio anterior.
    expect(diaDeEstudio(new Date(2026, 9, 27, 23))).toBe("2026-10-27");
    expect(diaDeEstudio(new Date(2026, 9, 28, 1))).toBe("2026-10-27");
    expect(diaDeEstudio(new Date(2026, 9, 28, 8))).toBe("2026-10-28");
  });

  it("al cambiar de zona horaria, cada actividad cuenta en el día local de ese momento", () => {
    // El mismo instante es la noche del 27 en Guatemala y la madrugada del 28 en Madrid.
    const instante = new Date("2026-10-28T03:30:00Z");
    expect(enZona("America/Guatemala", () => diaDeEstudio(instante))).toBe("2026-10-27");
    expect(enZona("Europe/Madrid", () => diaDeEstudio(instante))).toBe("2026-10-28");
    // Una lección esa noche en Guatemala y otra al día siguiente, ya en Madrid: dos días seguidos.
    const enMadrid = enZona("Europe/Madrid", () => diaDeEstudio(new Date("2026-10-28T20:00:00Z")));
    expect(registrarActividad(registrarActividad(SIN_RACHA, "2026-10-27"), enMadrid).actual).toBe(2);
  });

  it("si la fecha local retrocede (el reloj o la zona cambiaron), ni suma ni reinicia", () => {
    const r = { actual: 3, maxima: 3, ultimoDia: "2026-10-28" };
    expect(registrarActividad(r, "2026-10-27")).toBe(r);
    expect(rachaVigente(r, "2026-10-27")).toBe(3);
  });
});
