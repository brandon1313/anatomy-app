import { describe, expect, it } from "vitest";
import { proximoRecordatorio } from "./recordatorio";
import { SIN_RACHA } from "./racha";

/** Hora del reloj del teléfono, en octubre de 2026 (vitest.config fija la zona de Guatemala). */
const local = (dia: number, hora: number, min = 0) => new Date(2026, 9, dia, hora, min);
const racha = (actual: number, ultimoDia: string) => ({ actual, maxima: actual, ultimoDia });

describe("proximoRecordatorio", () => {
  it("hoy a la hora elegida si todavía no se estudió; si ya pasó la hora, mañana", () => {
    expect(proximoRecordatorio("20:00", SIN_RACHA, local(27, 9))?.cuando).toEqual(local(27, 20));
    expect(proximoRecordatorio("20:00", SIN_RACHA, local(27, 21))?.cuando).toEqual(local(28, 20));
    expect(proximoRecordatorio("07:30", SIN_RACHA, local(27, 9))?.cuando).toEqual(local(28, 7, 30));
  });

  it("si hoy ya hubo lección o repaso, el próximo es mañana aunque no haya llegado la hora", () => {
    expect(proximoRecordatorio("20:00", racha(3, "2026-10-27"), local(27, 9))?.cuando).toEqual(local(28, 20));
  });

  it("una hora antes de las 4 a. m. es del día de estudio anterior", () => {
    // Estudió el 27: el aviso de la 1 a. m. del 28 todavía es del 27, así que va la madrugada del 29.
    expect(proximoRecordatorio("01:00", racha(1, "2026-10-27"), local(27, 22))?.cuando).toEqual(local(29, 1));
  });

  it("con racha pide no perderla; sin racha, invita a estudiar", () => {
    const enRiesgo = proximoRecordatorio("20:00", racha(4, "2026-10-27"), local(27, 21));
    expect(enRiesgo).toMatchObject({ titulo: "No pierdas tu racha", cuerpo: "Tu racha de 4 días te espera. Una lección toma 3 minutos." });
    // El 29 la racha que terminó el 27 ya se perdió.
    const perdida = proximoRecordatorio("20:00", racha(4, "2026-10-27"), local(29, 9));
    expect(perdida).toMatchObject({ titulo: "Hora de estudiar" });
    expect(proximoRecordatorio("20:00", racha(1, "2026-10-27"), local(27, 21))?.cuerpo).toMatch(/^Tu racha de 1 día te espera/);
  });

  it("sin una hora válida no programa nada", () => {
    expect(proximoRecordatorio("", SIN_RACHA, local(27, 9))).toBeNull();
  });
});
