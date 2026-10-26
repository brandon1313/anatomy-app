import { Ejercicio, erroresDeConsistencia, FichaMusculo, type Imagen, PaqueteContenido } from "@anatomia/contenido";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fichasDeLamina, leerLamina, zonasDeCapa } from "../laminas/lamina";
import { type DatosFicha, ejerciciosDeImagen, erroresParaAprobar, explicacion, fusionar } from "./ejercicios-imagen";

const lamina = leerLamina(readFileSync(new URL("../../../../contenido/laminas/muslo-derecho-anterior.html", import.meta.url), "utf8"));
const fichas = fichasDeLamina(lamina, "muslo");
const datos = new Map<string, DatosFicha>(fichas.map((f) => [f.id, { nombre: f.nombre.principal, compartimento: f.compartimento, acciones: f.acciones }]));
const revision = { estado: "aprobada" as const, revisadoPor: "Revisora", fecha: "2026-10-25T12:00:00Z" };

const imagen: Imagen = {
  id: "muslo-anterior-superficial",
  titulo: "Muslo derecho, vista anterior (capa superficial)",
  archivo: "imagenes/muslo-anterior-superficial-abc.webp",
  ancho: 1200,
  alto: 3482,
  licencia: { tipo: "propia" },
  sinEtiquetas: true,
  zonas: zonasDeCapa(lamina, "superficial"),
  revision,
  version: 1,
};

describe("ejerciciosDeImagen", () => {
  const ejercicios = ejerciciosDeImagen(imagen, datos);

  it("crea un tocar y un identificar por zona, con ids únicos y fijos", () => {
    expect(ejercicios).toHaveLength(20);
    expect(new Set(ejercicios.map((e) => e.id)).size).toBe(20);
    expect(ejercicios.map((e) => e.id)).toContain("tocar-muslo-anterior-superficial-recto-femoral");
    expect(ejercicios.map((e) => e.id)).toContain("identificar-muslo-anterior-superficial-recto-femoral");
    expect(ejerciciosDeImagen(imagen, datos)).toEqual(ejercicios);
  });

  it("redacta el tocar con el nombre del músculo", () => {
    const e = ejercicios.find((x) => x.id === "tocar-muslo-anterior-superficial-tensor-fascia-lata")!;
    expect(e).toMatchObject({ tipo: "tocar_estructura", enunciado: "Toca el tensor de la fascia lata", zonaCorrecta: "zona-tensor-fascia-lata" });
  });

  it("da 4 opciones distintas, con la correcta y 3 músculos de la misma imagen", () => {
    const nombres = new Set(fichas.map((f) => f.nombre.principal));
    for (const e of ejercicios) {
      if (e.tipo !== "identificar_imagen") continue;
      const textos = e.opciones.map((o) => o.texto);
      expect(textos).toHaveLength(4);
      expect(new Set(textos).size).toBe(4);
      expect(textos.every((t) => nombres.has(t))).toBe(true);
      expect(e.opciones.find((o) => o.id === e.correcta)!.texto).toBe(datos.get(e.fichaIds[0])!.nombre);
    }
  });

  it("arma un paquete sin errores de consistencia", () => {
    const paquete = PaqueteContenido.parse({
      version: 1,
      curso: {
        id: "miembro-inferior",
        titulo: "Miembro inferior",
        carreras: ["fisioterapia"],
        unidades: [{ id: "musculos-muslo", titulo: "Músculos del muslo", orden: 0, lecciones: [{ id: "anterior", titulo: "Vista anterior", orden: 0, ejercicioIds: ejercicios.map((e) => e.id) }] }],
      },
      fichas: fichas.map((f) => FichaMusculo.parse({ ...f, revision, version: 1 })),
      imagenes: [imagen],
      ejercicios: ejercicios.map((e) => Ejercicio.parse({ ...e, revision, version: 1 })),
    });
    expect(erroresDeConsistencia(paquete)).toEqual([]);
  });

  it("con una sola zona solo crea el de tocar", () => {
    const sola = { ...imagen, zonas: imagen.zonas.slice(0, 1) };
    expect(ejerciciosDeImagen(sola, datos).map((e) => e.tipo)).toEqual(["tocar_estructura"]);
  });
});

describe("explicacion", () => {
  it("dice el compartimento y la acción en máximo 2 oraciones", () => {
    expect(explicacion({ nombre: "Recto femoral", compartimento: "anterior", acciones: ["Extiende la rodilla y flexiona la cadera"] })).toBe(
      "El recto femoral está en el compartimento anterior. Acción: extiende la rodilla y flexiona la cadera.",
    );
    expect(explicacion({ nombre: "Iliopsoas", acciones: ["Flexiona la cadera"] })).toBe("Acción: flexiona la cadera.");
  });
});

describe("erroresParaAprobar", () => {
  it("exige la casilla de nombres borrados y una ficha existente por zona", () => {
    const existentes = new Set(fichas.map((f) => f.id).filter((id) => id !== "sartorio"));
    expect(erroresParaAprobar({ ...imagen, sinEtiquetas: false }, existentes)).toEqual([
      "Falta confirmar que se borraron los nombres impresos en la imagen",
      "La zona zona-sartorio apunta a la ficha sartorio, que no existe",
    ]);
    expect(erroresParaAprobar(imagen, new Set(fichas.map((f) => f.id)))).toEqual([]);
  });
});

describe("fusionar", () => {
  it("conserva lo que redactó la revisora y recalcula lo que depende de las zonas", () => {
    const [tocar, identificar] = ejerciciosDeImagen(imagen, datos);
    if (tocar.tipo !== "tocar_estructura" || identificar.tipo !== "identificar_imagen") throw new Error("orden inesperado");
    const editadoTocar = { ...tocar, enunciado: "Señala el aductor mayor", explicacion: "Texto de la revisora.", dificultad: 3 as const, zonaCorrecta: "zona-vieja" };
    expect(fusionar(tocar, editadoTocar)).toEqual({ ...tocar, enunciado: "Señala el aductor mayor", explicacion: "Texto de la revisora.", dificultad: 3 });
    const editadoIdentificar = { ...identificar, explicacion: "Otra.", opciones: identificar.opciones.slice(0, 2) };
    expect(fusionar(identificar, editadoIdentificar)).toEqual({ ...identificar, explicacion: "Otra." });
  });
});
