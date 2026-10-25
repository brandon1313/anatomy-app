import type { PaqueteContenido } from "@anatomia/contenido";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { cargarSesion, cerrarSesion, iniciarSesion, registrarse, SinConexion, type Usuario } from "./api";
import { guardarJson, leerJson } from "./almacen";
import { actualizarPaquete, paqueteLocal } from "./paquete";

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

  useEffect(() => {
    cargarSesion()
      .then(setUsuario)
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!usuario) return;
    void actualizar();
    leerJson<string[]>(claveProgreso(usuario.id)).then((c) => setCompletadas(c ?? []));
  }, [usuario, actualizar]);

  const valor: Estado = {
    cargando,
    usuario,
    entrar: async (email, contrasena) => setUsuario(await iniciarSesion(email, contrasena)),
    registrar: async (datos) => setUsuario(await registrarse(datos)),
    salir: async () => {
      await cerrarSesion();
      setUsuario(null);
      setCompletadas([]);
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
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
