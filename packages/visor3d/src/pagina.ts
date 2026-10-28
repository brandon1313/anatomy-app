// Código de la página del visor dentro de la WebView. Habla con la app solo por mensajes (protocolo.ts).
import { crearVisor, type DatosModelo, type Visor } from "./escena";
import { deBase64 } from "./geometria";
import type { AvisoVisor, OrdenVisor, TiemposVisor } from "./protocolo";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(mensaje: string): void };
    visor?: { recibir(orden: OrdenVisor): void };
  }
}

const tiempos: TiemposVisor = { script: performance.now(), modelo: 0, entorno: 0, mallas: 0, primerCuadro: 0 };

/** Fuera de la app (probando en un navegador) el aviso solo queda en la consola. */
function avisar(aviso: AvisoVisor) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(aviso));
  else console.log("visor →", aviso);
}

addEventListener("error", (e) => avisar({ tipo: "error", mensaje: e.message || "Error en la página del visor" }));
addEventListener("unhandledrejection", (e) => avisar({ tipo: "error", mensaje: String(e.reason) }));

/** Lee un archivo del teléfono, relativo a la página. Con XMLHttpRequest: WebKit no deja usar fetch con file://. */
function leer<T>(ruta: string, tipo: "json" | "arraybuffer"): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const x = new XMLHttpRequest();
    x.open("GET", ruta);
    x.responseType = tipo;
    // Con file:// el estado es 0 aunque la lectura salga bien: lo que cuenta es que haya respuesta.
    x.onload = () => (x.response ? resolver(x.response as T) : rechazar(new Error(`No se pudo leer ${ruta} (estado ${x.status})`)));
    x.onerror = () => rechazar(new Error(`No se pudo leer ${ruta}`));
    x.send();
  });
}

let visor: Visor | null = null;
let vistas: DatosModelo["views"] = {};
/** Órdenes que llegan antes de que el modelo esté listo; se aplican al terminar de cargarlo. */
let pendientes: OrdenVisor[] = [];

function aplicar(v: Visor, orden: OrdenVisor) {
  if (orden.tipo === "vista") v.verDesde(orden.vista);
  else if (orden.tipo === "enfocar") v.verDesde(vistas[orden.id] ?? "ant");
  else if (orden.tipo === "ocultar") v.ocultar(orden.ids);
  else if (orden.tipo === "girar") v.girar(orden.activo);
  else if (orden.tipo === "pintar") v.pintar(new Map(Object.entries(orden.marcas)), orden);
}

let iniciando = false;

async function iniciar(orden: Extract<OrdenVisor, { tipo: "iniciar" }>) {
  // Una sola escena: un segundo "iniciar" crearía otra encima, sin las órdenes que ya recibió la primera.
  if (visor || iniciando) return;
  iniciando = true;
  const [datos, bin] =
    orden.modo === "archivo"
      ? await Promise.all([leer<DatosModelo>(orden.json, "json"), leer<ArrayBuffer>(orden.bin, "arraybuffer")])
      : [JSON.parse(orden.json) as DatosModelo, deBase64(orden.bin)];
  tiempos.modelo = performance.now();

  const v = crearVisor(document.getElementById("escena")!, datos, bin, { region: orden.region });
  v.alTocar = (id) => avisar({ tipo: "toque", id, nombre: id ? datos.data[id]?.name : undefined, articulo: id ? datos.data[id]?.art : undefined });
  v.lienzo.addEventListener("webglcontextlost", () => avisar({ tipo: "error", mensaje: "El teléfono liberó el contexto WebGL" }));
  v.verDesde("ant", true);
  tiempos.entorno = v.entornoListo;
  tiempos.mallas = performance.now();
  v.dibujar();
  visor = v;
  vistas = datos.views;
  for (const orden of pendientes) aplicar(v, orden);
  pendientes = [];

  // El cuadro ya se mandó a pantalla cuando llega el siguiente requestAnimationFrame.
  requestAnimationFrame(() => {
    tiempos.primerCuadro = performance.now();
    // Solo Chromium (Android) da el uso de memoria de JavaScript.
    const memoria = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    avisar({
      tipo: "listo",
      tiempos,
      mallas: v.mallas,
      triangulos: v.triangulos,
      memoriaMB: memoria ? Math.round(memoria.usedJSHeapSize / 1048576) : undefined,
    });
  });
}

window.visor = {
  recibir(orden) {
    if (orden.tipo === "iniciar") iniciar(orden).catch((e: unknown) => avisar({ tipo: "error", mensaje: String(e) }));
    else if (visor) aplicar(visor, orden);
    else pendientes.push(orden);
  },
};
avisar({ tipo: "cargada" });
