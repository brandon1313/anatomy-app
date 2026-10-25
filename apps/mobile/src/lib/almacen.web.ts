/** En web (solo para desarrollo) no hay sistema de archivos: se usa localStorage. */
const prefijo = "anatomia.";

export async function leerJson<T>(clave: string): Promise<T | null> {
  try {
    const v = localStorage.getItem(prefijo + clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export async function guardarJson(clave: string, valor: unknown): Promise<void> {
  localStorage.setItem(prefijo + clave, JSON.stringify(valor));
}

export async function borrarJson(clave: string): Promise<void> {
  localStorage.removeItem(prefijo + clave);
}
