import { describe, expect, it } from "vitest";
import { trasEditar } from "./revision";

describe("trasEditar", () => {
  it("un aprobado editado vuelve a revisión y sube de versión", () => {
    expect(trasEditar("aprobada", 3, { estado: "aprobada", revisadoPor: "R" })).toEqual({
      estado: "en_revision",
      version: 4,
      revision: { estado: "en_revision" },
    });
  });

  it("un rechazado corregido vuelve a revisión con la nota", () => {
    expect(trasEditar("rechazada", 1, { estado: "rechazada", notas: "Corrige X" })).toEqual({
      estado: "en_revision",
      version: 1,
      revision: { estado: "en_revision", notas: "Corrige X" },
    });
  });

  it("un borrador sigue en borrador", () => {
    expect(trasEditar("borrador", 1, { estado: "borrador" })).toEqual({ estado: "borrador", version: 1, revision: { estado: "borrador" } });
  });
});
