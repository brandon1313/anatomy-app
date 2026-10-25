import { describe, expect, it } from "vitest";
import { actual, barajar, calificarEmparejar, estadoLeccion, iniciar, progreso, responder, resultado, siguiente, terminada, type Sesion } from "./flujo";

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

  it("el progreso llega a 1 al terminar, también con repeticiones", () => {
    let s = iniciar(["a", "b"]);
    expect(progreso(s)).toBe(0);
    s = siguiente(responder(s, false, 1));
    expect(progreso(s)).toBe(0.5);
    s = siguiente(responder(s, true, 1));
    expect(s.cola).toEqual(["a", "b", "a"]);
    s = siguiente(responder(s, true, 1));
    expect(progreso(s)).toBe(1);
    expect(terminada(s)).toBe(true);
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
