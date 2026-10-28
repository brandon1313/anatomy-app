import type { PaqueteContenido } from "@anatomia/contenido";
import { describe, expect, it } from "vitest";
import {
  actual,
  barajar,
  calificarEmparejar,
  ejerciciosDeLeccion,
  estadoLeccion,
  iniciar,
  lecciones,
  progreso,
  responder,
  resultado,
  siguiente,
  terminada,
  type Sesion,
  unidadesConLecciones,
} from "./flujo";

describe("ejerciciosDeLeccion", () => {
  // Solo lo que usa la función: ejercicios (id, tipo, imagenId) e imágenes (id, archivo).
  const paquete = {
    imagenes: [{ id: "muslo", archivo: "imagenes/muslo-1.webp" }],
    ejercicios: [
      { id: "texto", tipo: "opcion_multiple" },
      { id: "tocar", tipo: "tocar_estructura", imagenId: "muslo" },
      { id: "identificar", tipo: "identificar_imagen", imagenId: "muslo" },
      { id: "sin-imagen", tipo: "tocar_estructura", imagenId: "otra" },
    ],
  } as unknown as PaqueteContenido;
  const leccion = { id: "l1", titulo: "L1", orden: 0, ejercicioIds: ["texto", "tocar", "identificar", "sin-imagen", "borrado"] };

  it("incluye los de imagen cuando su imagen está disponible", () => {
    expect(ejerciciosDeLeccion(paquete, leccion).map((e) => e.id)).toEqual(["texto", "tocar", "identificar"]);
  });

  it("salta los de imagen si la imagen no se descargó", () => {
    expect(ejerciciosDeLeccion(paquete, leccion, () => false).map((e) => e.id)).toEqual(["texto"]);
  });
});

/** Responde la sesión entera según `aciertos` (por id) y devuelve los ids en el orden mostrado. */
function jugar(s: Sesion, acierta: (id: string, vez: number) => boolean) {
  const vistos: string[] = [];
  while (!terminada(s)) {
    const id = actual(s)!;
    const vez = vistos.filter((v) => v === id).length;
    vistos.push(id);
    s = siguiente(responder(s, acierta(id, vez), 1000));
  }
  return { s, vistos };
}

describe("flujo de la lección", () => {
  it("sin fallos termina en una pasada", () => {
    const { s, vistos } = jugar(iniciar(["a", "b", "c"]), () => true);
    expect(vistos).toEqual(["a", "b", "c"]);
    expect(resultado(s)).toEqual({ aciertos: 3, total: 3, ms: 3000 });
  });

  it("repite los fallados una sola vez al final, aunque se vuelvan a fallar", () => {
    const { s, vistos } = jugar(iniciar(["a", "b", "c"]), (id) => id !== "a" && id !== "c");
    expect(vistos).toEqual(["a", "b", "c", "a", "c"]);
    expect(s.respuestas.map((r) => r.repeticion)).toEqual([false, false, false, true, true]);
    expect(resultado(s)).toEqual({ aciertos: 1, total: 3, ms: 5000 });
  });

  it("el progreso avanza al comprobar y llega a 1 con la última respuesta, también con repeticiones", () => {
    let s = iniciar(["a", "b"]);
    expect(progreso(s)).toBe(0);
    s = responder(s, false, 1);
    // Fallar alarga el camino: falta también la repetición de "a".
    expect(progreso(s)).toBeCloseTo(1 / 3);
    s = responder(siguiente(s), true, 1);
    expect(progreso(s)).toBeCloseTo(2 / 3);
    s = siguiente(s);
    expect(s.cola).toEqual(["a", "b", "a"]);
    s = responder(s, true, 1);
    expect(progreso(s)).toBe(1);
    expect(terminada(siguiente(s))).toBe(true);
  });

  it("la barra nunca retrocede cuando las repeticiones se agregan al final", () => {
    // 10 ejercicios con 3 fallados: contando por posición en la cola, bajaba de 90 % a 77 %.
    let s = iniciar(Array.from({ length: 10 }, (_, i) => `e${i}`));
    const valores = [progreso(s)];
    while (!terminada(s)) {
      s = responder(s, ![0, 3, 6].includes(s.indice), 1);
      valores.push(progreso(s));
      s = siguiente(s);
      valores.push(progreso(s));
    }
    expect(valores.every((v, i) => i === 0 || v >= valores[i - 1])).toBe(true);
  });

  it("una lección vacía ya está terminada", () => {
    expect(terminada(iniciar([]))).toBe(true);
  });
});

describe("estadoLeccion", () => {
  const ls = [{ id: "l1" }, { id: "l2" }, { id: "l3" }].map((l, i) => ({ ...l, titulo: l.id, orden: i, ejercicioIds: ["x"] }));
  it("desbloquea en orden", () => {
    expect([0, 1, 2].map((i) => estadoLeccion(ls, i, []))).toEqual(["siguiente", "bloqueada", "bloqueada"]);
    expect([0, 1, 2].map((i) => estadoLeccion(ls, i, ["l1"]))).toEqual(["completada", "siguiente", "bloqueada"]);
  });
});

describe("unidadesConLecciones", () => {
  const leccion = (id: string, orden: number) => ({ id, titulo: id, orden, ejercicioIds: ["x"] });
  const p = {
    curso: {
      unidades: [
        { id: "pierna", titulo: "Pierna", orden: 2, lecciones: [leccion("p1", 0)] },
        { id: "muslo", titulo: "Muslo", orden: 1, lecciones: [leccion("m2", 1), leccion("m1", 0)] },
      ],
    },
  } as unknown as PaqueteContenido;

  it("ordena unidades y lecciones, y da la posición de cada unidad en el camino completo", () => {
    const us = unidadesConLecciones(p);
    expect(us.map((u) => [u.id, u.lecciones.map((l) => l.id), u.desde])).toEqual([
      ["muslo", ["m1", "m2"], 0],
      ["pierna", ["p1"], 2],
    ]);
    // La primera lección de la pierna se abre al terminar la última del muslo.
    expect(estadoLeccion(lecciones(p), us[1].desde, ["m1", "m2"])).toBe("siguiente");
  });
});

describe("barajar", () => {
  it("conserva los elementos y no muta el original", () => {
    const xs = [1, 2, 3, 4, 5];
    const b = barajar(xs, () => 0);
    expect([...b].sort()).toEqual(xs);
    expect(xs).toEqual([1, 2, 3, 4, 5]);
    expect(b).not.toEqual(xs);
  });
});

describe("calificarEmparejar", () => {
  const pares = [
    { izquierda: "Origen", derecha: "EIAI" },
    { izquierda: "Inervación", derecha: "Nervio femoral" },
    { izquierda: "Acción", derecha: "Flexión" },
  ];
  it("acierta si todos los pares coinciden", () => {
    expect(calificarEmparejar(pares, [0, 1, 2])).toEqual({ correcto: true, incorrectos: [] });
  });
  it("marca los pares incorrectos", () => {
    expect(calificarEmparejar(pares, [0, 2, 1])).toEqual({ correcto: false, incorrectos: [1, 2] });
  });
  it("acepta derechas repetidas en cualquier orden", () => {
    const iguales = [{ izquierda: "A", derecha: "X" }, { izquierda: "B", derecha: "X" }, { izquierda: "C", derecha: "Y" }];
    expect(calificarEmparejar(iguales, [1, 0, 2]).correcto).toBe(true);
  });
});
