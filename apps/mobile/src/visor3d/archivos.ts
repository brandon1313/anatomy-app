import { HTML_VISOR, VERSION_VISOR } from "@anatomia/visor3d";
import { Directory, File, Paths } from "expo-file-system";
import { descargarImagen } from "../lib/imagenes";

/**
 * Prueba técnica del visor 3D (docs/PLAN-REDISENO.md). La página del visor y el modelo quedan en el
 * teléfono, dentro de documentos/anatomia, y la WebView recibe permiso para leer solo esa carpeta.
 */
export const carpetaApp = new Directory(Paths.document, "anatomia");
const carpetaVisor = new Directory(carpetaApp, "visor3d");

/**
 * Claves del modelo en el almacén de la API. Hasta que el modelo venga en el paquete (paso 4 del plan),
 * se copia a mano: prototipos/modelo.json y modelo.bin → ALMACEN_DIR/modelos/muslo-derecho.json y .bin.
 */
const MODELO = { json: "modelos/muslo-derecho.json", bin: "modelos/muslo-derecho.bin" };

/** Rutas del modelo vistas desde la página: visor3d/ y archivos/ son carpetas hermanas. */
export const RUTAS_MODELO = { json: `../archivos/${MODELO.json}`, bin: `../archivos/${MODELO.bin}` };

export interface Preparacion {
  pagina: File;
  json: File;
  bin: File;
  /** No estaba guardada esta versión de la página. */
  escribioPagina: boolean;
  /** El modelo no estaba en el teléfono y se bajó de la API. */
  descargoModelo: boolean;
}

/** Deja en el teléfono la página del visor (un archivo por versión) y el modelo. */
export async function prepararVisor(): Promise<Preparacion> {
  const pagina = new File(carpetaVisor, `visor-${VERSION_VISOR}.html`);
  const escribioPagina = !pagina.exists;
  if (escribioPagina) {
    carpetaVisor.create({ intermediates: true, idempotent: true });
    // Borra las versiones anteriores y un temporal que haya quedado a medias.
    for (const vieja of carpetaVisor.list()) vieja.delete();
    const temporal = new File(carpetaVisor, "visor.html.escribiendo");
    temporal.create();
    await temporal.write(HTML_VISOR);
    await temporal.move(pagina);
  }
  const json = new File(carpetaApp, "archivos", ...MODELO.json.split("/"));
  const bin = new File(carpetaApp, "archivos", ...MODELO.bin.split("/"));
  const descargoModelo = !json.exists || !bin.exists;
  // Es la misma descarga segura de las imágenes (a un temporal y después se mueve) y sirve para
  // cualquier archivo del almacén. Si el archivo ya está, no hace nada.
  await descargarImagen(MODELO.json);
  await descargarImagen(MODELO.bin);
  return { pagina, json, bin, escribioPagina, descargoModelo };
}
