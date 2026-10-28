import { fusionarProgreso, type PaqueteContenido } from "@anatomia/contenido";
import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { aplicarSesion, calificacionesDeSesion, type Progreso } from "../repaso/espaciado";
import { cargarSesion, cerrarSesion, iniciarSesion, registrarse, SinConexion, type Usuario } from "./api";
import { guardarJson, leerJson } from "./almacen";
import { actualizarPaquete, paqueteLocal } from "./paquete";
import { guardarIntento, guardarProgresoPropio, leerProgreso } from "./registro";
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
  /** Al terminar una lección o un repaso: una calificación por ficha con ts-fsrs, y a subir. */
  terminarSesion: (respuestas: readonly { ejercicioId: string; correcto: boolean }[]) => void;
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
  // El progreso más reciente, para terminarSesion (que corre después de muchos renders de la lección).
  const progresoRef = useRef(progreso);
  progresoRef.current = progreso;

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
      (p) => setProgreso((actual) => fusionarProgreso(actual, p)),
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
      const ejercicios = new Map(paquete.ejercicios.map((e) => [e.id, e]));
      const calificaciones = calificacionesDeSesion(respuestas, ejercicios);
      const actual = new Map(progresoRef.current.map((p) => [p.fichaId, p]));
      const nuevo = aplicarSesion(actual, calificaciones, new Date());
      setProgreso((p) => fusionarProgreso(p, nuevo));
      const usuarioId = usuario.id;
      guardarProgresoPropio(usuarioId, nuevo).then(
        () => sincronizarAhora(usuarioId),
        () => {},
      );
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
