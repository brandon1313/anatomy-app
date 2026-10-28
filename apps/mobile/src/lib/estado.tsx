import { fusionarProgreso, fusionarRacha, type MotivoReporte, type PaqueteContenido, type Racha } from "@anatomia/contenido";
import { randomUUID } from "expo-crypto";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { diaDeEstudio } from "../repaso/dia";
import { aplicarSesion, calificacionesDeSesion, type Progreso } from "../repaso/espaciado";
import { registrarActividad, SIN_RACHA } from "../repaso/racha";
import { proximoRecordatorio } from "../repaso/recordatorio";
import {
  actualizarPerfil,
  borrarCuenta as borrarCuentaEnServidor,
  cargarSesion,
  cerrarSesion,
  iniciarSesion,
  registrarse,
  SinConexion,
  type Usuario,
  usuarioActual,
} from "./api";
import { borrarJson, guardarJson, leerJson } from "./almacen";
import { programarRecordatorio } from "./notificaciones";
import { borrarDatosPremium } from "./premium";
import { actualizarPaquete, paqueteLocal } from "./paquete";
import { borrarDatosLocales, guardarIntento, guardarProgresoPropio, guardarRachaPropia, guardarReporte, leerProgreso, leerRacha } from "./registro";
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
  /** "HH:MM" del recordatorio diario, o null si el estudiante no eligió hora. */
  horaRecordatorio: string | null;
  /** Guarda un reporte de error en el teléfono y lo envía; sin conexión sale con la próxima sincronización. */
  reportarError: (r: { ejercicioId: string; motivo: MotivoReporte; comentario?: string }) => Promise<void>;
  /** Guarda en el servidor la hora del recordatorio ("HH:MM", o null para apagarlo). Necesita conexión. */
  cambiarHoraRecordatorio: (hora: string | null) => Promise<void>;
  /** Borra la cuenta en el servidor y todo lo del usuario en este teléfono. Necesita conexión. */
  borrarCuenta: () => Promise<void>;
}

const Contexto = createContext<Estado | null>(null);

export function useApp(): Estado {
  const c = useContext(Contexto);
  if (!c) throw new Error("useApp fuera de <ProveedorApp>");
  return c;
}

/** El progreso se guarda por usuario: dos cuentas en el mismo teléfono no se mezclan. */
const claveProgreso = (usuarioId: string) => `completadas-${usuarioId}`;

/** fusionarRacha que conserva el mismo objeto si nada cambió: así no se reprograma el recordatorio en cada subida. */
function unirRacha(actual: Racha, otra: Racha): Racha {
  const r = fusionarRacha(actual, otra);
  return JSON.stringify(r) === JSON.stringify(actual) ? actual : r;
}

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [paquete, setPaquete] = useState<PaqueteContenido | null>(null);
  const [descarga, setDescarga] = useState<Estado["descarga"]>("descargando");
  const [completadas, setCompletadas] = useState<string[]>([]);
  const [progreso, setProgreso] = useState<Progreso[]>([]);
  const [racha, setRacha] = useState<Racha>(SIN_RACHA);
  const [horaRecordatorio, setHoraRecordatorio] = useState<string | null>(null);
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
        if (r) setRacha((actual) => unirRacha(actual, r));
        // Si la sesión se renovó durante la subida, el usuario llegó al día (por ejemplo, con la hora del recordatorio).
        setHoraRecordatorio(usuarioActual()?.horaRecordatorio ?? null);
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
    leerRacha(usuario.id).then((r) => r && setRacha((actual) => unirRacha(actual, r)), () => {});
    setHoraRecordatorio(usuario.horaRecordatorio ?? null);
    sincronizarAhora(usuario.id);
    // Al volver a la app (por ejemplo, con conexión otra vez) se reintenta la subida.
    const s = AppState.addEventListener("change", (estado) => estado === "active" && sincronizarAhora(usuario.id));
    return () => s.remove();
  }, [usuario, actualizar, sincronizarAhora]);

  // Recordatorio diario (PRD): se reprograma al abrir la app, al volver a ella y cuando cambia la racha.
  useEffect(() => {
    if (!usuario) return;
    const reprogramar = () => void programarRecordatorio(horaRecordatorio ? proximoRecordatorio(horaRecordatorio, racha, new Date()) : null);
    reprogramar();
    const s = AppState.addEventListener("change", (estado) => estado === "active" && reprogramar());
    return () => s.remove();
  }, [usuario, horaRecordatorio, racha]);

  /** Lo que queda al cerrar sesión o borrar la cuenta: nada en pantalla y ningún recordatorio. */
  const limpiar = () => {
    setUsuario(null);
    setCompletadas([]);
    setProgreso([]);
    setRacha(SIN_RACHA);
    setHoraRecordatorio(null);
    void programarRecordatorio(null);
  };

  const valor: Estado = {
    cargando,
    usuario,
    entrar: async (email, contrasena) => setUsuario(await iniciarSesion(email, contrasena)),
    registrar: async (datos) => setUsuario(await registrarse(datos)),
    salir: async () => {
      await cerrarSesion();
      limpiar();
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
        setRacha((r) => unirRacha(r, nuevaRacha));
        guardados.push(guardarRachaPropia(usuarioId, nuevaRacha));
      }
      Promise.all(guardados).then(
        () => sincronizarAhora(usuarioId),
        () => {},
      );
    },
    racha,
    horaRecordatorio,
    reportarError: async ({ ejercicioId, motivo, comentario }) => {
      if (!usuario) return;
      const usuarioId = usuario.id;
      await guardarReporte(usuarioId, { id: randomUUID(), ejercicioId, motivo, comentario: comentario?.trim() || undefined, creado: new Date().toISOString() });
      sincronizarAhora(usuarioId);
    },
    cambiarHoraRecordatorio: async (hora) => {
      const u = await actualizarPerfil({ horaRecordatorio: hora });
      setHoraRecordatorio(u.horaRecordatorio ?? null);
    },
    borrarCuenta: async () => {
      if (!usuario) return;
      const usuarioId = usuario.id;
      await borrarCuentaEnServidor();
      // En el servidor ya no existe: lo local se borra aunque algo falle aquí.
      await Promise.all([borrarDatosLocales(usuarioId), borrarJson(claveProgreso(usuarioId)), borrarDatosPremium(usuarioId)]).catch(() => {});
      limpiar();
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
