import type { Modelo3D } from "@anatomia/contenido";
import type { OrdenVisor } from "@anatomia/visor3d";
import type { Ref } from "react";

export interface ControlEscena {
  enviar(orden: OrdenVisor): void;
}

export interface Toque {
  id: string | null;
  nombre?: string;
  articulo?: string;
}

/** En web no hay WebView: la lección nunca pide 3D ahí y usa las imágenes. */
export function EscenaLeccion(_props: {
  ref: Ref<ControlEscena>;
  modelo: Modelo3D;
  onToque: (t: Toque) => void;
  onListo: () => void;
  onError: (m: string) => void;
}) {
  return null;
}
