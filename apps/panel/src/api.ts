import type { Ejercicio, EstadoRevision, FichaMusculo, Imagen, MotivoReporte } from "@anatomia/contenido";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: "estudiante" | "editor" | "admin";
}

interface Sesion {
  usuario: Usuario;
  tokenAcceso: string;
  tokenRenovacion: string;
}

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
    readonly errores: { ruta: string; mensaje: string }[] = [],
  ) {
    super(mensaje);
  }
}

const CLAVE = "anatomia.sesion";

export function sesionGuardada(): Sesion | null {
  try {
    const s = localStorage.getItem(CLAVE);
    return s ? (JSON.parse(s) as Sesion) : null;
  } catch {
    return null;
  }
}

function guardarSesion(s: Sesion | null) {
  try {
    if (s) localStorage.setItem(CLAVE, JSON.stringify(s));
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento la sesión dura lo que la pestaña.
  }
  window.dispatchEvent(new Event("sesion"));
}

async function aError(r: Response): Promise<ErrorApi> {
  const cuerpo = await r.json().catch(() => ({}));
  const mensaje = cuerpo.mensaje ?? (typeof cuerpo.message === "string" ? cuerpo.message : `Error ${r.status}`);
  return new ErrorApi(r.status, mensaje, cuerpo.errores);
}

let renovando: Promise<boolean> | null = null;

/** Renueva una sola vez aunque varias peticiones reciban 401 a la vez. */
function renovar(): Promise<boolean> {
  renovando ??= (async () => {
    const s = sesionGuardada();
    if (!s) return false;
    const r = await fetch("/api/auth/renovar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenRenovacion: s.tokenRenovacion }),
    });
    if (!r.ok) {
      // Otra pestaña pudo renovar con el mismo token: si la sesión guardada ya cambió, vale esa.
      if (sesionGuardada()?.tokenRenovacion !== s.tokenRenovacion) return sesionGuardada() !== null;
      // Solo un rechazo del servidor cierra la sesión; un error pasajero no.
      if (r.status === 401) guardarSesion(null);
      return false;
    }
    guardarSesion(await r.json());
    return true;
  })().finally(() => (renovando = null));
  return renovando;
}

export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}, reintento = true): Promise<T> {
  const r = await fetch(`/api${ruta}`, {
    method: opciones.metodo ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sesionGuardada()?.tokenAcceso ?? ""}`,
    },
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });
  if (r.status === 401 && reintento && (await renovar())) return api(ruta, opciones, false);
  if (!r.ok) throw await aError(r);
  return r.status === 204 ? (undefined as T) : r.json();
}

export async function iniciarSesion(email: string, contrasena: string): Promise<Usuario> {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, contrasena }),
  });
  if (!r.ok) throw await aError(r);
  const s = (await r.json()) as Sesion;
  if (s.usuario.rol === "estudiante") throw new ErrorApi(403, "El panel es solo para revisoras y administradores");
  guardarSesion(s);
  return s.usuario;
}

export async function cerrarSesion() {
  const s = sesionGuardada();
  guardarSesion(null);
  if (s) {
    await fetch("/api/auth/salir", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenRenovacion: s.tokenRenovacion }),
    }).catch(() => undefined);
  }
}

// ───────────── Tipos de respuesta ─────────────

export type Coleccion = "fichas" | "ejercicios" | "imagenes";

export interface ElementoCola {
  coleccion: Coleccion;
  id: string;
  tipo: string;
  estado: EstadoRevision;
  version: number;
  titulo: string;
  notas?: string;
  fichaIds?: string[];
  actualizado: string;
}

export interface RespuestaCola {
  elementos: ElementoCola[];
  conteos: Record<EstadoRevision, number>;
}

export interface RespuestaFicha {
  ficha: FichaMusculo;
  ejercicios: Ejercicio[];
}

export interface RespuestaEjercicio {
  ejercicio: Ejercicio;
  fichas: { id: string; nombre: string; estado: EstadoRevision }[];
}

export interface RespuestaImagen {
  imagen: Imagen;
  fichas: { id: string; nombre: string; estado: EstadoRevision }[];
  ejercicios: Ejercicio[];
}

export type EstadoReporte = "abierto" | "resuelto";

export interface ReportePanel {
  id: string;
  ejercicioId: string;
  motivo: MotivoReporte;
  comentario: string | null;
  creado: string;
  estado: EstadoReporte;
  /** null si el ejercicio ya no existe. */
  ejercicio: { tipo: string; titulo: string; estado: EstadoRevision } | null;
}

export interface RespuestaReportes {
  reportes: ReportePanel[];
  conteos: Record<EstadoReporte, number>;
}

/** URL de un archivo del almacén (el proxy de Vite manda /api a la API). */
export const urlArchivo = (clave: string) => `/api/archivos/${clave}`;

export interface Conteos {
  lecciones: number;
  fichas: number;
  imagenes: number;
  ejercicios: number;
}

export interface RespuestaPaquetes {
  siguiente: { version: number; errores: string[]; sinCambios: boolean; conteos?: Conteos };
  historial: { version: number; publicadoPor: string; publicadoEn: string; conteos: Conteos }[];
}

export type ResultadoGeneracion =
  | { musculo: string; estado: "creado"; fichaId: string; ejercicioIds: string[]; intentos: number }
  | { musculo: string; estado: "omitido"; fichaId: string; motivo: string }
  | { musculo: string; estado: "fallido"; fichaId: string; errores: string[]; intentos: number };

export interface Retencion {
  elegibles: number;
  retenidos: number;
}

export interface Metricas {
  estudiantes: {
    total: number;
    nuevos7d: number;
    activos7d: number;
    diasActivosPorSemana: number | null;
    retencionD1: Retencion;
    retencionD7: Retencion;
  };
  lecciones: { total: number; usuarios: number };
  repasos: { total: number; usuarios: number };
  respuestas: { total: number; correctas: number };
  reportes: number;
  premium: {
    vieron: number;
    interesados: number;
    porPlan: Record<string, number>;
    /** Por momento en que apareció la oferta; "sin_dato" es el interés de antes de guardarlo. */
    porOrigen: { origen: string; vieron: number; interesados: number }[];
  };
  ejercicios: {
    ejercicioId: string;
    tipo: string | null;
    titulo: string | null;
    intentos: number;
    correctos: number;
    acierto: number;
    revisar: boolean;
  }[];
}
