import { describe, expect, it } from "vitest";
import ejemplo from "./ejemplo-generador.json";
import {
  distanciaABorde,
  erroresDeConsistencia,
  erroresDeSalidaGenerador,
  esToqueCorrecto,
  fusionarProgreso,
  PeticionSync,
  PaqueteContenido,
  ProgresoFicha,
  puntoEnZona,
  SalidaGenerador,
  type Zona,
} from "../src";

const cuadrado: Zona = { id: "zona-a", fichaId: "ficha-a", puntos: [[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.4]] };
const vecina: Zona = { id: "zona-b", fichaId: "ficha-b", puntos: [[0.405, 0.2], [0.6, 0.2], [0.6, 0.4], [0.405, 0.4]] };

describe("puntoEnZona", () => {
  it("detecta puntos dentro y fuera", () => {
    expect(puntoEnZona([0.3, 0.3], cuadrado)).toBe(true);
    expect(puntoEnZona([0.5, 0.3], cuadrado)).toBe(false);
    expect(puntoEnZona([0.1, 0.1], cuadrado)).toBe(false);
  });

  it("funciona con polígonos cóncavos", () => {
    const ele: Zona = { id: "ele", fichaId: "f", puntos: [[0, 0], [0.5, 0], [0.5, 0.2], [0.2, 0.2], [0.2, 0.5], [0, 0.5]] };
    expect(puntoEnZona([0.1, 0.4], ele)).toBe(true);
    expect(puntoEnZona([0.4, 0.4], ele)).toBe(false);
  });
});

describe("distanciaABorde", () => {
  it("mide al lado más cercano desde fuera", () => {
    expect(distanciaABorde([0.45, 0.3], cuadrado)).toBeCloseTo(0.05);
  });

  it("mide a la esquina cuando es lo más cercano", () => {
    expect(distanciaABorde([0.43, 0.44], cuadrado)).toBeCloseTo(0.05);
  });

  it("mide también desde dentro", () => {
    expect(distanciaABorde([0.3, 0.25], cuadrado)).toBeCloseTo(0.05);
  });

  it("da 0 sobre el borde", () => {
    expect(distanciaABorde([0.3, 0.2], cuadrado)).toBeCloseTo(0);
  });
});

describe("esToqueCorrecto", () => {
  const zonas = [cuadrado, vecina];

  it("acierta dentro de la zona", () => {
    expect(esToqueCorrecto([0.3, 0.3], "zona-a", zonas)).toBe(true);
  });

  it("acierta cerca del borde si no cae en otra zona", () => {
    expect(esToqueCorrecto([0.3, 0.19], "zona-a", zonas)).toBe(true);
  });

  it("falla cerca del borde si cae dentro de otra zona", () => {
    expect(esToqueCorrecto([0.41, 0.3], "zona-a", zonas)).toBe(false);
  });

  it("falla lejos de la zona", () => {
    expect(esToqueCorrecto([0.3, 0.17], "zona-a", zonas)).toBe(false);
  });

  it("falla si la zona correcta no existe", () => {
    expect(esToqueCorrecto([0.3, 0.3], "no-existe", zonas)).toBe(false);
  });

  describe("con zonas superpuestas (como el sartorio sobre el recto femoral)", () => {
    // Banda horizontal dibujada encima del cuadrado: lo cruza entre y=0.28 y y=0.32.
    const banda: Zona = { id: "banda", fichaId: "ficha-banda", puntos: [[0.1, 0.28], [0.5, 0.28], [0.5, 0.32], [0.1, 0.32]] };

    it("gana la zona de arriba donde se cubren", () => {
      expect(esToqueCorrecto([0.3, 0.3], "zona-a", [cuadrado, banda])).toBe(false);
      expect(esToqueCorrecto([0.3, 0.3], "banda", [cuadrado, banda])).toBe(true);
    });

    it("la parte visible de la zona de abajo sigue siendo acierto", () => {
      expect(esToqueCorrecto([0.3, 0.25], "zona-a", [cuadrado, banda])).toBe(true);
    });

    it("el orden de dibujo decide quién está encima", () => {
      expect(esToqueCorrecto([0.3, 0.3], "zona-a", [banda, cuadrado])).toBe(true);
    });

    it("la tolerancia no vale si el toque cae sobre otra zona, aunque esté debajo", () => {
      // Justo fuera de la banda (borde y=0.32) pero dentro del cuadrado, que está debajo.
      expect(esToqueCorrecto([0.3, 0.325], "banda", [cuadrado, banda])).toBe(false);
      // Justo fuera de la banda y fuera de todo: acierto por tolerancia.
      expect(esToqueCorrecto([0.45, 0.325], "banda", [cuadrado, banda])).toBe(true);
    });
  });
});

describe("SalidaGenerador", () => {
  it("acepta el ejemplo del contrato", () => {
    const salida = SalidaGenerador.parse(ejemplo);
    expect(erroresDeSalidaGenerador(salida)).toEqual([]);
  });

  it("rechaza ejercicios de imagen", () => {
    const conImagen = {
      ...ejemplo,
      ejercicios: [{ id: "x", tipo: "tocar_estructura", fichaIds: ["recto-femoral"], dificultad: 1, explicacion: "e", imagenId: "muslo-anterior", enunciado: "Toca", zonaCorrecta: "z" }],
    };
    expect(SalidaGenerador.safeParse(conImagen).success).toBe(false);
  });

  it("detecta respuesta fuera de las opciones y fichas inexistentes", () => {
    const salida = SalidaGenerador.parse(ejemplo);
    const malo = structuredClone(salida);
    const om = malo.ejercicios[0];
    if (om.tipo !== "opcion_multiple") throw new Error("se esperaba opción múltiple");
    om.correcta = "z";
    om.fichaIds = ["vasto-lateral"];
    expect(erroresDeSalidaGenerador(malo)).toEqual([
      "Ejercicio recto-femoral-inervacion: la ficha vasto-lateral no existe",
      "Ejercicio recto-femoral-inervacion: la respuesta correcta no está entre las opciones",
    ]);
    expect(erroresDeSalidaGenerador(malo, ["vasto-lateral"])).toHaveLength(1);
  });
});

describe("erroresDeConsistencia", () => {
  const revision = { estado: "aprobada" as const, revisadoPor: "Revisora", fecha: "2026-10-25T12:00:00Z" };
  const salida = SalidaGenerador.parse(ejemplo);
  const base = () =>
    PaqueteContenido.parse({
      version: 1,
      curso: {
        id: "miembro-inferior",
        titulo: "Miembro inferior",
        carreras: ["fisioterapia"],
        unidades: [{ id: "musculos-muslo", titulo: "Músculos del muslo", orden: 0, lecciones: [{ id: "l1", titulo: "Cuádriceps", orden: 0, ejercicioIds: salida.ejercicios.map((e) => e.id) }] }],
      },
      fichas: salida.fichas.map((f) => ({ ...f, revision, version: 1 })),
      imagenes: [
        {
          id: "muslo-anterior",
          titulo: "Muslo, vista anterior",
          archivo: "muslo-anterior.png",
          ancho: 800,
          alto: 1600,
          licencia: { tipo: "dominio_publico" },
          sinEtiquetas: true,
          zonas: [{ id: "zona-recto-femoral", fichaId: "recto-femoral", puntos: [[0.4, 0.2], [0.6, 0.2], [0.5, 0.6]] }],
          revision,
          version: 1,
        },
      ],
      ejercicios: salida.ejercicios.map((e) => ({ ...e, revision, version: 1 })),
    });

  it("no reporta nada en un paquete correcto", () => {
    expect(erroresDeConsistencia(base())).toEqual([]);
  });

  it("bloquea elementos sin aprobar, imágenes con etiquetas y lecciones rotas", () => {
    const p = base();
    p.fichas[0].revision = { estado: "en_revision" };
    p.imagenes[0].sinEtiquetas = false;
    p.curso.unidades[0].lecciones[0].ejercicioIds.push("no-existe");
    expect(erroresDeConsistencia(p)).toEqual([
      "Imagen muslo-anterior: falta borrar los nombres impresos",
      "Lección l1: el ejercicio no-existe no existe",
      "Sin aprobar (no pueden ir a la app): recto-femoral",
    ]);
  });

  it("detecta zonas de otra ficha en ejercicios de imagen", () => {
    const p = base();
    p.fichas.push({ ...p.fichas[0], id: "vasto-lateral" });
    p.ejercicios.push({
      id: "tocar-zona-recto-femoral",
      tipo: "tocar_estructura",
      fichaIds: ["vasto-lateral"],
      dificultad: 1,
      explicacion: "e",
      imagenId: "muslo-anterior",
      enunciado: "Toca el vasto lateral",
      zonaCorrecta: "zona-recto-femoral",
      revision,
      version: 1,
    });
    expect(erroresDeConsistencia(p)).toEqual([
      "Ejercicio tocar-zona-recto-femoral: la zona zona-recto-femoral es de otra ficha (recto-femoral)",
    ]);
  });

  it("revisa que las fichas del modelo 3D existan", () => {
    const p = base();
    p.imagenes[0].modelo3d = {
      archivo: "modelos/muslo-derecho-abc.bin",
      datos: "modelos/muslo-derecho-abc.json",
      estructuras: { "recto-femoral": "recto_femoral", sartorio: "sartorio" },
      ocultas: [],
      licencia: { tipo: "cc_by", atribucion: "BodyParts3D, © The Database Center for Life Science, CC BY 4.0" },
    };
    expect(erroresDeConsistencia(p)).toEqual(["Imagen muslo-anterior, modelo 3D: la ficha sartorio no existe"]);
  });
});

describe("ProgresoFicha", () => {
  it("acepta una tarjeta nueva de ts-fsrs (dificultad 0)", () => {
    const r = ProgresoFicha.safeParse({
      usuarioId: "6f1c2a1e-4b7d-4c38-9d39-2f7f3b1e9a10",
      fichaId: "recto-femoral",
      estado: "nuevo",
      estabilidad: 0,
      dificultad: 0,
      repeticiones: 0,
      lapsos: 0,
      proximaRevision: "2026-10-25T12:00:00Z",
    });
    expect(r.success).toBe(true);
  });
});

describe("fusionarProgreso", () => {
  const p = (fichaId: string, ultimaRevision?: string, repeticiones = 1) => ({ fichaId, ultimaRevision, repeticiones });

  it("de cada ficha gana la revisión más reciente", () => {
    const servidor = [p("sartorio", "2026-10-20T10:00:00Z", 3), p("gracil", "2026-10-25T10:00:00Z", 2)];
    const telefono = [p("sartorio", "2026-10-26T09:00:00Z", 4), p("gracil", "2026-10-21T10:00:00Z", 1), p("pectineo", "2026-10-26T09:00:00Z")];
    const r = new Map(fusionarProgreso(servidor, telefono).map((x) => [x.fichaId, x.repeticiones]));
    expect(r).toEqual(new Map([["sartorio", 4], ["gracil", 2], ["pectineo", 1]]));
  });

  it("sin revisión pierde, y con la misma fecha queda la primera lista", () => {
    const a = [p("sartorio", undefined, 0), p("gracil", "2026-10-25T10:00:00Z", 7)];
    const b = [p("sartorio", "2026-10-25T10:00:00Z", 1), p("gracil", "2026-10-25T10:00:00Z", 9)];
    expect(fusionarProgreso(a, b).map((x) => x.repeticiones)).toEqual([1, 7]);
  });
});

describe("PeticionSync", () => {
  it("acepta intentos y progreso sin usuario, y limita el lote", () => {
    const intento = { id: "8f1c2a8e-58e1-4b6b-9a0e-3c3a1d2b4c5d", ejercicioId: "tocar-sartorio", correcto: true, msRespuesta: 4200, respondidoEn: "2026-10-27T15:00:00Z", paqueteVersion: 3 };
    const progreso = { fichaId: "sartorio", estado: "repaso", estabilidad: 3.2, dificultad: 5.1, repeticiones: 1, lapsos: 0, proximaRevision: "2026-10-30T15:00:00Z" };
    expect(PeticionSync.safeParse({ intentos: [intento], progreso: [progreso] }).success).toBe(true);
    expect(PeticionSync.safeParse({ intentos: Array(201).fill(intento), progreso: [] }).success).toBe(false);
  });
});
