import { borrarSecreto, guardarSecreto, leerSecreto } from "./secreto";

/** En un teléfono con Expo Go, pon la IP de tu computadora: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 */
export const URL_API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: "estudiante" | "editor" | "admin";
  /** "HH:MM" del recordatorio diario, en la hora del teléfono. Falta en sesiones guardadas antes de que existiera. */
  horaRecordatorio?: string | null;
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

/** Sin conexión o servidor caído: la app sigue con la copia local. */
export class SinConexion extends Error {
  constructor() {
    super("Sin conexión");
  }
}

const CLAVE = "anatomia.sesion";
let sesion: Sesion | null = null;

export async function cargarSesion(): Promise<Usuario | null> {
  const s = await leerSecreto(CLAVE);
  sesion = s ? (JSON.parse(s) as Sesion) : null;
  return sesion?.usuario ?? null;
}

async function guardarSesion(s: Sesion | null) {
  sesion = s;
  if (s) await guardarSecreto(CLAVE, JSON.stringify(s));
  else await borrarSecreto(CLAVE);
}

async function pedir(ruta: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${URL_API}${ruta}`, { ...init, headers: { "content-type": "application/json", ...init.headers } });
  } catch {
    throw new SinConexion();
  }
}

async function aError(r: Response): Promise<ErrorApi> {
  const cuerpo = await r.json().catch(() => ({}));
  const mensaje = cuerpo.mensaje ?? (typeof cuerpo.message === "string" ? cuerpo.message : `Error ${r.status}`);
  return new ErrorApi(r.status, mensaje, cuerpo.errores);
}

let renovando: Promise<boolean> | null = null;

function renovar(): Promise<boolean> {
  renovando ??= (async () => {
    if (!sesion) return false;
    const r = await pedir("/auth/renovar", { method: "POST", body: JSON.stringify({ tokenRenovacion: sesion.tokenRenovacion }) });
    if (!r.ok) {
      // Solo un rechazo del servidor cierra la sesión; sin conexión se conserva.
      if (r.status === 401) await guardarSesion(null);
      return false;
    }
    await guardarSesion(await r.json());
    return true;
  })().finally(() => (renovando = null));
  return renovando;
}

export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}, reintento = true): Promise<T> {
  const r = await pedir(ruta, {
    method: opciones.metodo ?? "GET",
    headers: { authorization: `Bearer ${sesion?.tokenAcceso ?? ""}` },
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });
  if (r.status === 401 && reintento && (await renovar())) return api(ruta, opciones, false);
  if (!r.ok) throw await aError(r);
  return r.status === 204 ? (undefined as T) : r.json();
}

async function entrar(ruta: string, cuerpo: unknown): Promise<Usuario> {
  const r = await pedir(ruta, { method: "POST", body: JSON.stringify(cuerpo) });
  if (!r.ok) throw await aError(r);
  const s = (await r.json()) as Sesion;
  await guardarSesion(s);
  return s.usuario;
}

export const iniciarSesion = (email: string, contrasena: string) => entrar("/auth/login", { email, contrasena });

export const registrarse = (datos: {
  email: string;
  contrasena: string;
  nombre: string;
  universidad?: string;
  horaRecordatorio?: string;
  zonaHoraria?: string;
}) => entrar("/auth/registro", datos);

export async function cerrarSesion() {
  const s = sesion;
  await guardarSesion(null);
  if (s) await pedir("/auth/salir", { method: "POST", body: JSON.stringify({ tokenRenovacion: s.tokenRenovacion }) }).catch(() => undefined);
}

/** Si la sesión se cerró en otra parte (token de renovación rechazado). */
export const haySesion = () => sesion !== null;

/** El usuario de la sesión vigente: al renovarla llega con los datos al día del servidor. */
export const usuarioActual = () => sesion?.usuario ?? null;
