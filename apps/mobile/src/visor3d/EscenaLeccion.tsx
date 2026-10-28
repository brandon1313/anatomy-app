import type { Modelo3D } from "@anatomia/contenido";
import type { AvisoVisor, OrdenVisor } from "@anatomia/visor3d";
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { color, espacio, fuente } from "../tema";
import { carpetaApp, prepararPagina, rutaDesdeVisor } from "./archivos";

export interface ControlEscena {
  enviar(orden: OrdenVisor): void;
}

export type Toque = Omit<Extract<AvisoVisor, { tipo: "toque" }>, "tipo">;

/**
 * El modelo 3D de una lección, en una sola WebView que dura toda la lección (cargar el modelo en cada
 * ejercicio sería lento). Las órdenes que llegan antes de que cargue la página se guardan y se mandan
 * al cargar; la página, a su vez, guarda las que llegan antes de tener el modelo.
 */
export function EscenaLeccion({
  ref,
  modelo,
  region,
  onToque,
  onListo,
  onError,
}: {
  ref: Ref<ControlEscena>;
  modelo: Modelo3D;
  /** "muslo derecho": el visor lo muestra junto a la vista ("Vista anterior · muslo derecho"). */
  region?: string;
  onToque: (t: Toque) => void;
  /** El modelo terminó de cargar: quien muestra algo en la escena vuelve a mandar su estado completo. */
  onListo: () => void;
  onError: (mensaje: string) => void;
}) {
  const [pagina, setPagina] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  // WebView<object>: con el `P = undefined` por omisión de sus tipos, las props quedan en `never`.
  const web = useRef<WebView<object>>(null);
  const cargada = useRef(false);
  const cola = useRef<OrdenVisor[]>([]);

  useEffect(() => {
    prepararPagina().then(
      (p) => setPagina(p.pagina.uri),
      (e: unknown) => onError(String(e)),
    );
  }, [onError]);

  const inyectar = (o: OrdenVisor) => web.current?.injectJavaScript(`window.visor && window.visor.recibir(${JSON.stringify(o)}); true;`);

  useImperativeHandle(ref, () => ({
    enviar(o) {
      if (cargada.current) inyectar(o);
      else cola.current.push(o);
    },
  }));

  function alAvisar(e: WebViewMessageEvent) {
    const aviso = JSON.parse(e.nativeEvent.data) as AvisoVisor;
    if (__DEV__) console.log("visor3d:", aviso.tipo === "listo" ? `listo en ${Math.round(aviso.tiempos.primerCuadro)} ms` : JSON.stringify(aviso));
    if (aviso.tipo === "cargada") {
      // Si la página se recarga (iOS puede reiniciar el proceso de la WebView), vuelve a cargar el modelo.
      cargada.current = true;
      inyectar({ tipo: "iniciar", modo: "archivo", json: rutaDesdeVisor(modelo.datos), bin: rutaDesdeVisor(modelo.archivo), region });
      for (const o of cola.current) inyectar(o);
      cola.current = [];
    } else if (aviso.tipo === "listo") {
      setListo(true);
      onListo();
    }
    else if (aviso.tipo === "toque") onToque(aviso);
    else onError(aviso.mensaje);
  }

  return (
    <View style={estilos.marco}>
      {pagina && (
        <WebView<object>
          ref={web}
          source={{ uri: pagina }}
          originWhitelist={["*"]}
          allowingReadAccessToURL={carpetaApp.uri}
          allowFileAccess
          allowFileAccessFromFileURLs
          bounces={false}
          scrollEnabled={false}
          overScrollMode="never"
          setBuiltInZoomControls={false}
          webviewDebuggingEnabled={__DEV__}
          onMessage={alAvisar}
          onError={(ev) => onError(ev.nativeEvent.description)}
          style={estilos.web}
        />
      )}
      {!listo && <ActivityIndicator style={StyleSheet.absoluteFill} color={color.acento} />}
      {/* Crédito de la licencia (CC BY 4.0) en su propia franja: encima del modelo se cortaba y tapaba el dibujo. */}
      <View style={estilos.franja}>
        <Text style={estilos.credito} numberOfLines={2}>
          {modelo.licencia.atribucion}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { flex: 1, borderRadius: 18, borderWidth: 2, borderColor: color.borde, overflow: "hidden", backgroundColor: "#eef2f4" },
  web: { flex: 1, backgroundColor: "transparent" },
  franja: { paddingHorizontal: espacio.s, paddingVertical: 4, backgroundColor: color.superficie, borderTopWidth: 1, borderTopColor: color.borde },
  credito: { fontSize: 10, lineHeight: 13, fontFamily: fuente.normal, color: color.tenue, textAlign: "center" },
});
