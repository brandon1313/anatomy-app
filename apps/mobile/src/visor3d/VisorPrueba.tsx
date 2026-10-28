import type { AvisoVisor, OrdenVisor, TiemposVisor, Vista } from "@anatomia/visor3d";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { color, espacio, TOQUE_MINIMO } from "../tema";
import { carpetaApp, prepararVisor, type Preparacion, RUTAS_MODELO } from "./archivos";

type Modo = "archivo" | "puente";

/** Milisegundos desde que se abrió la pantalla o se tocó "Repetir". */
interface Medicion {
  preparar: number;
  cargada?: number;
  listo?: number;
  pagina?: TiemposVisor;
  mallas?: number;
  triangulos?: number;
  memoriaMB?: number;
}

const VISTAS: [Vista, string][] = [["ant", "Anterior"], ["lat", "Lateral"], ["med", "Medial"], ["post", "Posterior"]];
const AZUL = "#5b5bd6";

/**
 * Prueba técnica del visor 3D: la página (con three.js adentro) y el modelo se leen del teléfono y se
 * mide cuánto tarda en verse el modelo. "Por el puente" compara con mandar el modelo desde la app en base64.
 */
export function VisorPrueba() {
  const [modo, setModo] = useState<Modo>("archivo");
  const [intento, setIntento] = useState(0);
  const [prep, setPrep] = useState<Preparacion | null>(null);
  const [medicion, setMedicion] = useState<Medicion | null>(null);
  const [tocado, setTocado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // WebView<object>: con el `P = undefined` por omisión de sus tipos, las props quedan en `never`.
  const web = useRef<WebView<object>>(null);
  const inicio = useRef(0);
  const modeloEnBase64 = useRef<Promise<{ json: string; bin: string }> | null>(null);

  useEffect(() => {
    let vigente = true;
    inicio.current = performance.now();
    setPrep(null);
    setMedicion(null);
    setTocado(null);
    setError(null);
    prepararVisor().then(
      (p) => {
        if (!vigente) return;
        // Por el puente, la lectura del modelo empieza ya, mientras carga la WebView.
        modeloEnBase64.current =
          modo === "puente" ? Promise.all([p.json.text(), p.bin.base64()]).then(([json, bin]) => ({ json, bin })) : null;
        setMedicion({ preparar: performance.now() - inicio.current });
        setPrep(p);
      },
      (e: unknown) => vigente && setError(`No se pudo preparar el visor: ${String(e)}`),
    );
    return () => {
      vigente = false;
    };
  }, [modo, intento]);

  const enviar = (orden: OrdenVisor) =>
    web.current?.injectJavaScript(`window.visor && window.visor.recibir(${JSON.stringify(orden)}); true;`);

  async function alAvisar(e: WebViewMessageEvent) {
    const aviso = JSON.parse(e.nativeEvent.data) as AvisoVisor;
    const ms = performance.now() - inicio.current;
    try {
      if (aviso.tipo === "cargada") {
        setMedicion((m) => m && { ...m, cargada: ms });
        if (modo === "archivo") enviar({ tipo: "iniciar", modo, ...RUTAS_MODELO });
        else if (modeloEnBase64.current) enviar({ tipo: "iniciar", modo, ...(await modeloEnBase64.current) });
      } else if (aviso.tipo === "listo") {
        const { tiempos, mallas, triangulos, memoriaMB } = aviso;
        setMedicion((m) => m && { ...m, listo: ms, pagina: tiempos, mallas, triangulos, memoriaMB });
      } else if (aviso.tipo === "toque") {
        // Ida y vuelta por el puente: el visor avisa el toque y la app le pide pintar la selección.
        setTocado(aviso.id ? (aviso.nombre ?? aviso.id) : "nada");
        enviar({ tipo: "pintar", marcas: aviso.id ? { [aviso.id]: AZUL } : {} });
      } else {
        setError(aviso.mensaje);
      }
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <View style={estilos.fila}>
        <Chip texto="‹ Volver" onPress={() => router.back()} />
        <Text style={estilos.titulo} accessibilityRole="header">Prueba del visor 3D</Text>
      </View>
      <View style={estilos.fila}>
        <Chip texto="Leer archivo" activo={modo === "archivo"} onPress={() => setModo("archivo")} />
        <Chip texto="Por el puente" activo={modo === "puente"} onPress={() => setModo("puente")} />
        <Chip texto="Repetir" onPress={() => setIntento((n) => n + 1)} />
      </View>
      <View style={estilos.escena}>
        {prep ? (
          <WebView<object>
            key={`${modo}-${intento}`}
            ref={web}
            source={{ uri: prep.pagina.uri }}
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
            onError={(e) => setError(`La WebView no abrió la página: ${e.nativeEvent.description}`)}
            style={estilos.web}
          />
        ) : (
          !error && <ActivityIndicator style={{ flex: 1 }} />
        )}
      </View>
      <View style={estilos.fila}>
        {VISTAS.map(([vista, nombre]) => (
          <Chip key={vista} texto={nombre} onPress={() => enviar({ tipo: "vista", vista })} />
        ))}
      </View>
      <View style={estilos.fila}>
        <Chip
          texto="Resaltar recto femoral"
          onPress={() => enviar({ tipo: "pintar", marcas: { recto_femoral: AZUL }, aislar: true, tinte: 0 })}
        />
        <Chip texto="Limpiar" onPress={() => enviar({ tipo: "pintar", marcas: {} })} />
      </View>
      <Resultados medicion={medicion} prep={prep} tocado={tocado} error={error} />
    </SafeAreaView>
  );
}

function Resultados(props: { medicion: Medicion | null; prep: Preparacion | null; tocado: string | null; error: string | null }) {
  const { medicion: m, prep } = props;
  if (props.error) return <Text style={[estilos.resultado, { color: color.rojo }]}>{props.error}</Text>;
  if (!m) return <Text style={estilos.resultado}>Preparando…</Text>;
  const ms = (n?: number) => (n === undefined ? "…" : `${Math.round(n)} ms`);
  const hizo = prep && [prep.escribioPagina && "guardó la página", prep.descargoModelo && "bajó el modelo"].filter(Boolean).join(" y ");
  return (
    <View style={estilos.resultados}>
      <Text style={estilos.total}>
        Hasta ver el modelo: {ms(m.listo)}
        {m.listo !== undefined && (m.listo < 1000 ? "  ✓ menos de 1 s" : "  ✗ más de 1 s")}
      </Text>
      <Text style={estilos.resultado}>Preparar archivos: {ms(m.preparar)} ({hizo || "ya estaba todo en el teléfono"})</Text>
      <Text style={estilos.resultado}>
        WebView y three.js: {ms(m.cargada === undefined ? undefined : m.cargada - m.preparar)} · modelo y primer cuadro:{" "}
        {ms(m.listo === undefined || m.cargada === undefined ? undefined : m.listo - m.cargada)}
      </Text>
      {m.pagina && (
        <Text style={estilos.detalle}>
          Dentro de la página: script {Math.round(m.pagina.script)} · modelo {Math.round(m.pagina.modelo)} · luz{" "}
          {Math.round(m.pagina.entorno)} · mallas {Math.round(m.pagina.mallas)} · cuadro {Math.round(m.pagina.primerCuadro)} ms
        </Text>
      )}
      {m.mallas !== undefined && (
        <Text style={estilos.detalle}>
          {m.mallas} mallas · {m.triangulos?.toLocaleString("es")} triángulos
          {m.memoriaMB !== undefined ? ` · memoria JS ${m.memoriaMB} MB` : ""}
        </Text>
      )}
      <Text style={estilos.resultado}>Tocaste: {props.tocado ?? "—"}</Text>
    </View>
  );
}

function Chip(props: { texto: string; onPress: () => void; activo?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!props.activo }}
      onPress={props.onPress}
      style={({ pressed }) => [estilos.chip, props.activo && estilos.chipActivo, pressed && { opacity: 0.7 }]}
    >
      <Text style={[estilos.chipTexto, props.activo && { color: "#fff" }]}>{props.texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, paddingHorizontal: espacio.m, gap: espacio.s },
  fila: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: espacio.s },
  titulo: { fontSize: 18, fontWeight: "700", color: color.texto },
  escena: { flex: 1, minHeight: 260, borderRadius: 16, borderWidth: 1, borderColor: color.borde, overflow: "hidden", backgroundColor: "#eef2f4" },
  web: { flex: 1, backgroundColor: "transparent" },
  chip: { minHeight: TOQUE_MINIMO, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: color.borde, backgroundColor: color.superficie, justifyContent: "center" },
  chipActivo: { backgroundColor: color.acento, borderColor: color.acento },
  chipTexto: { fontSize: 15, fontWeight: "600", color: color.texto },
  resultados: { gap: 2, paddingBottom: espacio.s },
  total: { fontSize: 17, fontWeight: "700", color: color.texto },
  resultado: { fontSize: 14, color: color.texto },
  detalle: { fontSize: 13, color: color.tenue },
});
