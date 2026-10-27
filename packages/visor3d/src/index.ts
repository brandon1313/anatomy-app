// Lo que usa la app: la página armada y los mensajes. La escena (three.js) va dentro de la página;
// no se importa desde aquí para que Metro no la meta en el bundle de React Native.
export { HTML_VISOR, VERSION_VISOR } from "./generado/html";
export type { AvisoVisor, OrdenVisor, TiemposVisor, Vista } from "./protocolo";
