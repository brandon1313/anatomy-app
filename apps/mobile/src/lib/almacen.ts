import { Directory, File, Paths } from "expo-file-system";

/** Datos locales como archivos JSON en el directorio de documentos de la app. */
const carpeta = new Directory(Paths.document, "anatomia");

function archivo(clave: string) {
  return new File(carpeta, `${clave}.json`);
}

export async function leerJson<T>(clave: string): Promise<T | null> {
  const f = archivo(clave);
  if (!f.exists) return null;
  try {
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

/** Escribe primero un temporal y luego lo mueve: si la app se cierra a medias, queda el archivo anterior. */
export async function guardarJson(clave: string, valor: unknown): Promise<void> {
  if (!carpeta.exists) carpeta.create({ intermediates: true });
  const temporal = new File(carpeta, `${clave}.tmp`);
  temporal.create({ overwrite: true });
  await temporal.write(JSON.stringify(valor));
  await temporal.move(archivo(clave), { overwrite: true });
}

export async function borrarJson(clave: string): Promise<void> {
  const f = archivo(clave);
  if (f.exists) f.delete();
}
