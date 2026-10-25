/** En web (solo para desarrollo) no hay llavero: se usa localStorage. */
export async function leerSecreto(clave: string): Promise<string | null> {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export async function guardarSecreto(clave: string, valor: string): Promise<void> {
  localStorage.setItem(clave, valor);
}

export async function borrarSecreto(clave: string): Promise<void> {
  localStorage.removeItem(clave);
}
