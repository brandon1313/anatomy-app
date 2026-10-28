/** Vistas de cámara; el modelo trae la mejor para cada estructura. */
export type Vista = "ant" | "lat" | "med" | "post";

/** Órdenes de la app al visor. La app las ejecuta con `injectJavaScript("window.visor.recibir(...)")`. */
export type OrdenVisor =
  /**
   * Carga el modelo. Con `modo: "archivo"`, `json` y `bin` son rutas relativas a la página y el visor
   * los lee del teléfono. Con `modo: "puente"`, la app manda el JSON como texto y el `.bin` en base64.
   */
  | { tipo: "iniciar"; modo: "archivo" | "puente"; json: string; bin: string; /** "muslo derecho", para el indicador de vista. */ region?: string }
  | { tipo: "vista"; vista: Vista }
  /** Gira la cámara a la mejor vista de esa estructura (la que trae el modelo). */
  | { tipo: "enfocar"; id: string }
  /** Oculta estas estructuras y muestra las demás (la capa profunda quita las superficiales). */
  | { tipo: "ocultar"; ids: string[] }
  /** El modelo gira despacio solo (la presentación de la lección). */
  | { tipo: "girar"; activo: boolean }
  /**
   * `marcas`: id de la estructura → color. Con `aislar`, los demás músculos se vuelven translúcidos y los
   * huesos quedan sólidos, con su nombre.
   */
  | { tipo: "pintar"; marcas: Record<string, string>; aislar?: boolean; tinte?: number };

/** Avisos del visor a la app, por `window.ReactNativeWebView.postMessage`. */
export type AvisoVisor =
  /** La página y three.js ya cargaron: espera "iniciar". */
  | { tipo: "cargada" }
  | { tipo: "listo"; tiempos: TiemposVisor; mallas: number; triangulos: number; memoriaMB?: number }
  /** El estudiante tocó sin arrastrar: la estructura que quedó bajo el dedo, o null. */
  | { tipo: "toque"; id: string | null; nombre?: string; articulo?: string }
  | { tipo: "error"; mensaje: string };

/** Milisegundos desde que la WebView empezó a cargar la página (el `performance.now()` de la página). */
export interface TiemposVisor {
  /** HTML leído y three.js listo. */
  script: number;
  /** Modelo leído, del archivo o del puente. */
  modelo: number;
  /** WebGL y la luz de ambiente (RoomEnvironment prefiltrado) listos. */
  entorno: number;
  /** Mallas armadas. */
  mallas: number;
  /** Primer cuadro dibujado. */
  primerCuadro: number;
}
