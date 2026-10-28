import type { Ejercicio } from "@anatomia/contenido";
import { describe, expect, it } from "vitest";
import { aplicarSesion, calificacionesDeSesion, diasHastaElProximo, ejerciciosDeRepaso, type Progreso, vencidas } from "./espaciado";

const AHORA = new Date("2026-10-27T15:00:00Z");
const dias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000).toISOString();
/** Hora del reloj del teléfono, en octubre de 2026 (vitest.config fija la zona de Guatemala). */
const local = (dia: number, hora: number) => new Date(2026, 9, dia, hora);
const ejercicio = (id: string, fichaIds: string[]) => ({ id, fichaIds }) as Ejercicio;
const sartorio = (correcto: boolean, ultimoEjercicioId = "oa") => new Map([["sartorio", { correcto, ultimoEjercicioId }]]);

describe("calificacionesDeSesion", () => {
  const ejercicios = new Map([
    ["oa", ejercicio("oa", ["sartorio"])],
    ["ob", ejercicio("ob", ["sartorio"])],
    ["empareja", ejercicio("empareja", ["sartorio", "gracil"])],
  ]);

  it("Good si acertó todo, Again si falló algo, aunque después acierte la repetición", () => {
    const c = calificacionesDeSesion(
      [
        { ejercicioId: "oa", correcto: false },
        { ejercicioId: "empareja", correcto: true },
        { ejercicioId: "oa", correcto: true },
      ],
      ejercicios,
    );
    expect(c.get("sartorio")).toEqual({ correcto: false, ultimoEjercicioId: "oa" });
    expect(c.get("gracil")).toEqual({ correcto: true, ultimoEjercicioId: "empareja" });
  });

  it("ignora ejercicios que el paquete ya no trae", () => {
    expect(calificacionesDeSesion([{ ejercicioId: "viejo", correcto: true }], ejercicios).size).toBe(0);
  });
});

describe("aplicarSesion", () => {
  it("una ficha nueva entra al repaso y vence al empezar otro día; acertar la programa más lejos", () => {
    const [bien] = aplicarSesion(new Map(), sartorio(true), local(27, 21));
    const [mal] = aplicarSesion(new Map(), sartorio(false), local(27, 21));
    expect(bien).toMatchObject({ fichaId: "sartorio", repeticiones: 1, ultimaRevision: local(27, 21).toISOString(), ultimoEjercicioId: "oa" });
    // Sin pasos de minutos: aun fallando se repasa otro día, y lo de la noche ya a la mañana siguiente.
    expect(mal.proximaRevision).toBe(local(28, 4).toISOString());
    expect(bien.proximaRevision).toBe(local(30, 4).toISOString());
  });

  it("los días transcurridos se cuentan en hora local, con el corte a las 4 a. m.", () => {
    const [primera] = aplicarSesion(new Map(), sartorio(true), local(27, 20));
    const repasar = (cuando: Date) => aplicarSesion(new Map([["sartorio", primera]]), sartorio(true, "ob"), cuando)[0];
    // De las 8 p. m. a las 8 a. m. pasó un día (por fecha UTC sería el mismo: allí cambia a las 6 p. m.)…
    expect(repasar(local(28, 8)).estabilidad).toBeGreaterThan(primera.estabilidad);
    // …y a la 1 de la madrugada todavía es el mismo día: repasar enseguida no fortalece la memoria.
    expect(repasar(local(28, 1)).estabilidad).toBeCloseTo(primera.estabilidad);
  });

  it("seguir acertando alarga el intervalo y fallar suma un lapso", () => {
    const [primera] = aplicarSesion(new Map(), sartorio(true), AHORA);
    const despues = new Date(primera.proximaRevision);
    const [bien] = aplicarSesion(new Map([["sartorio", primera]]), sartorio(true, "ob"), despues);
    const [mal] = aplicarSesion(new Map([["sartorio", primera]]), sartorio(false, "ob"), despues);
    const intervalo = (p: Progreso) => Date.parse(p.proximaRevision) - Date.parse(p.ultimaRevision!);
    expect(intervalo(bien)).toBeGreaterThan(Date.parse(primera.proximaRevision) - AHORA.getTime());
    expect(bien.repeticiones).toBe(2);
    expect(mal.lapsos).toBe(1);
  });
});

describe("vencidas y ejerciciosDeRepaso", () => {
  const progreso = (fichaId: string, proxima: string, ultimoEjercicioId?: string): Progreso => ({
    fichaId,
    estado: "repaso",
    estabilidad: 3,
    dificultad: 5,
    diasProgramados: 3,
    pasosAprendizaje: 0,
    repeticiones: 1,
    lapsos: 0,
    ultimaRevision: dias(-5),
    proximaRevision: proxima,
    ultimoEjercicioId,
  });

  it("toma solo las vencidas, de la más atrasada a la menos", () => {
    const p = [progreso("a", dias(-1)), progreso("b", dias(2)), progreso("c", dias(-3))];
    expect(vencidas(p, AHORA).map((x) => x.fichaId)).toEqual(["c", "a"]);
  });

  it("un ejercicio por ficha, distinto al de la última vez, sin repetir y hasta el máximo", () => {
    const mostrables = [ejercicio("a1", ["a"]), ejercicio("a2", ["a"]), ejercicio("b1", ["b"]), ejercicio("ab", ["a", "b"])];
    const p = [progreso("a", dias(-2), "a1"), progreso("b", dias(-1), "b1"), progreso("sin-ejercicios", dias(-4))];
    expect(ejerciciosDeRepaso(p, mostrables, AHORA)).toEqual(["a2", "ab"]);
    expect(ejerciciosDeRepaso(p, mostrables, AHORA, 1)).toEqual(["a2"]);
  });

  it("diasHastaElProximo cuenta días de repaso hasta la próxima que vence", () => {
    const p = [progreso("a", local(30, 4).toISOString()), progreso("b", local(29, 4).toISOString()), progreso("c", dias(-1))];
    expect(diasHastaElProximo(p, local(27, 21))).toBe(2);
    // Antes de las 4 a. m. todavía es el día anterior.
    expect(diasHastaElProximo(p, local(28, 2))).toBe(2);
    expect(diasHastaElProximo(p, local(28, 9))).toBe(1);
    expect(diasHastaElProximo([progreso("c", dias(-1))], AHORA)).toBeNull();
  });
});
