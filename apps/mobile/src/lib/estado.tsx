import { fusionarProgreso, fusionarRacha, type PaqueteContenido, type Racha } from "@anatomia/contenido";
import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { diaDeEstudio } from "../repaso/dia";
import { aplicarSesion, calificacionesDeSesion, type Progreso } from "../repaso/espaciado";
import { registrarActividad, SIN_RACHA } from "../repaso/racha";
import { cargarSesion, cerrarSesion, iniciarSesion, registrarse, SinConexion, type Usuario } from "./api";
import { guardarJson, leerJson } from "./almacen";
import { actualizarPaquete, paqueteLocal } from "./paquete";
import { guardarIntento, guardarProgresoPropio, guardarRachaPropia, leerProgreso, leerRacha } from "./registro";
import { sincronizar } from "./sync";

interface Estado {
  cargando: boolean;
  usuario: Usuario | null;
  entrar: (email: string, contrasena: string) => Promise<void>;
  registrar: (datos: Parameters<typeof registrarse>[0]) => Promise<void>;
  salir: () => Promise<void>;

  paquete: PaqueteContenido | null;
  /** "sin_conexion" con paquete local significa que se está usando la copia guardada. */
  descarga: "descargando" | "al_dia" | "sin_conexion" | "error";
  actualizar: () => Promise<void>;

  /** Ids de las lecciones completadas por este usuario en este dispositivo. */
  completadas: string[];
  completar: (leccionId: string) => Promise<void>;

  /** Progreso del repaso espaciado de cada ficha que ya apareció en una lección. */
  progreso: Progreso[];
  /** Guarda una respuesta en cuanto se comprueba (si la app se cierra, no se pierde). */
  registrarIntento: (r: { ejercicioId: string; correcto: boolean; ms: number }) => void;
  /** Al terminar una lección o un repaso: una calificación por ficha con ts-fsrs, el día cuenta para la racha, y a subir. */
  terminarSesion: (respuestas: readonly { ejercicioId: string; correcto: boolean }[]) => void;
  /** Días seguidos con una lección o un repaso terminado; lo que se muestra hoy sale de rachaVigente. */
  racha: Racha;
}

const Contexto = createContext<Estado | null>(null);

export function useApp(): Estado {
  const c = useContext(Contexto);
  if (!c) throw new Error("useApp fuera de <ProveedorApp>");
  return c;
}

/** El progreso se guarda por usuario: dos cuentas en el mismo teléfono no se mezclan. */
const claveProgreso = (usuarioId: string) => `completadas-${usuarioId}`;

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [paquete, setPaquete] = useState<PaqueteContenido | null>(null);
  const [descarga, setDescarga] = useState<Estado["descarga"]>("descargando");
  const [completadas, setCompletadas] = useState<string[]>([]);
  const [progreso, setProgreso] = useState<Progreso[]>([]);
  const [racha, setRacha] = useState<Racha>(SIN_RACHA);
  // Lo más reciente, para terminarSesion (que corre después de muchos renders de la lección).
  const progresoRef = useRef(progreso);
  progresoRef.current = progreso;
  const rachaRef = useRef(racha);
  rachaRef.current = racha;

  const actualizar = useCallback(async () => {
    setDescarga("descargando");
    const local = await paqueteLocal();
    if (local) setPaquete(local);
    try {
      setPaquete(await actualizarPaquete(local));
      setDescarga("al_dia");
    } catch (e) {
      setDescarga(e instanceof SinConexion ? "sin_conexion" : "error");
    }
  }, []);

  /** Sube lo pendiente y trae lo de otros dispositivos. Sin conexión no pasa nada: queda para después. */
  const sincronizarAhora = useCallback((usuarioId: string) => {
    // Se une con lo que ya está en pantalla: una sesión que terminó durante la subida no se pierde.
    sincronizar(usuarioId).then(
      ({ progreso: p, racha: r }) => {
        setProgreso((actual) => fusionarProgreso(actual, p));
        if (r) setRacha((actual) => fusionarRacha(actual, r));
      },
      () => {},
    );
  }, []);

  useEffect(() => {
    cargarSesion()
      .then(setUsuario)
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!usuario) return;
    void actualizar();
    leerJson<string[]>(claveProgreso(usuario.id)).then((c) => setCompletadas(c ?? []));
    leerProgreso(usuario.id).then((p) => setProgreso((actual) => fusionarProgreso(p, actual)), () => {});
    leerRacha(usuario.id).then((r) => r && setRacha((actual) => fusionarRacha(r, actual)), () => {});
    sincronizarAhora(usuario.id);
    // Al volver a la app (por ejemplo, con conexión otra vez) se reintenta la subida.
    const s = AppState.addEventListener("change", (estado) => estado === "active" && sincronizarAhora(usuario.id));
    return () => s.remove();
  }, [usuario, actualizar, sincronizarAhora]);

  const valor: Estado = {
    cargando,
    usuario,
    entrar: async (email, contrasena) => setUsuario(await iniciarSesion(email, contrasena)),
    registrar: async (datos) => setUsuario(await registrarse(datos)),
    salir: async () => {
      await cerrarSesion();
      setUsuario(null);
      setCompletadas([]);
      setProgreso([]);
      setRacha(SIN_RACHA);
    },
    paquete,
    descarga,
    actualizar,
    completadas,
    completar: async (leccionId) => {
      if (!usuario || completadas.includes(leccionId)) return;
      const nuevas = [...completadas, leccionId];
      setCompletadas(nuevas);
      await guardarJson(claveProgreso(usuario.id), nuevas);
    },
    progreso,
    registrarIntento: ({ ejercicioId, correcto, ms }) => {
      if (!usuario || !paquete) return;
      const intento = { id: randomUUID(), ejercicioId, correcto, msRespuesta: Math.round(ms), respondidoEn: new Date().toISOString(), paqueteVersion: paquete.version };
      guardarIntento(usuario.id, intento).catch(() => {});
    },
    terminarSesion: (respuestas) => {
      if (!usuario || !paquete) return;
      const ahora = new Date();
      const ejercicios = new Map(paquete.ejercicios.map((e) => [e.id, e]));
      const calificaciones = calificacionesDeSesion(respuestas, ejercicios);
      const actual = new Map(progresoRef.current.map((p) => [p.fichaId, p]));
      const nuevo = aplicarSesion(actual, calificaciones, ahora);
      setProgreso((p) => fusionarProgreso(p, nuevo));
      const usuarioId = usuario.id;
      const guardados = [guardarProgresoPropio(usuarioId, nuevo)];
      const nuevaRacha = registrarActividad(rachaRef.current, diaDeEstudio(ahora));
      if (nuevaRacha !== rachaRef.current) {
        setRacha((r) => fusionarRacha(r, nuevaRacha));
        guardados.push(guardarRachaPropia(usuarioId, nuevaRacha));
      }
      Promise.all(guardados).then(
        () => sincronizarAhora(usuarioId),
        () => {},
      );
    },
    racha,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
