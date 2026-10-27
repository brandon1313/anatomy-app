import type { Modelo3D } from "@anatomia/contenido";
import type { AvisoVisor, OrdenVisor } from "@anatomia/visor3d";
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { color, fuente } from "../tema";
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
  onToque,
  onError,
}: {
  ref: Ref<ControlEscena>;
  modelo: Modelo3D;
  onToque: (t: Toque) => void;
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
    if (aviso.tipo === "cargada") {
      cargada.current = true;
      inyectar({ tipo: "iniciar", modo: "archivo", json: rutaDesdeVisor(modelo.datos), bin: rutaDesdeVisor(modelo.archivo) });
      for (const o of cola.current) inyectar(o);
      cola.current = [];
    } else if (aviso.tipo === "listo") setListo(true);
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
      <Text style={estilos.credito} numberOfLines={1} pointerEvents="none">
        {modelo.licencia.atribucion}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { flex: 1, borderRadius: 18, borderWidth: 2, borderColor: color.borde, overflow: "hidden", backgroundColor: "#eef2f4" },
  web: { flex: 1, backgroundColor: "transparent" },
  credito: { position: "absolute", left: 8, right: 8, bottom: 4, fontSize: 9, fontFamily: fuente.normal, color: "#8a969b", textAlign: "center" },
});
