import { ahorroAnual, OFERTA_PREMIUM, OfertaPremium, type PlanPremium } from "@anatomia/contenido";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { api, SinConexion } from "../lib/api";
import { useApp } from "../lib/estado";
import { guardarInteresPremium, leerInteresPremium } from "../lib/premium";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";

/**
 * Interés en Premium (PRD): beneficios y precio propuesto. "Me interesa" registra el interés y avisa que
 * todavía no está disponible. No cobra nada. Sin conexión se muestra la oferta por defecto.
 */
/** Si la pantalla se abrió sin otra detrás (por ejemplo, al recargar en web), vuelve a Inicio. */
const volver = () => (router.canGoBack() ? router.back() : router.replace("/inicio"));

export default function Premium() {
  const { usuario, registrarEvento } = useApp();
  const { origen, logro } = useLocalSearchParams<{ origen?: string; logro?: string }>();
  const [oferta, setOferta] = useState<OfertaPremium>(OFERTA_PREMIUM);
  const [plan, setPlan] = useState<PlanPremium>("anual");
  const [interes, setInteres] = useState<PlanPremium | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un evento por apertura de la pantalla, con de dónde vino.
  const vista = useRef(false);
  useEffect(() => {
    if (vista.current || !usuario) return;
    vista.current = true;
    void registrarEvento("premium_visto", { origen: origen ?? "otro" });
  }, [usuario, origen, registrarEvento]);

  useEffect(() => {
    api<unknown>("/premium").then(
      (o) => {
        const r = OfertaPremium.safeParse(o);
        if (r.success) setOferta(r.data);
      },
      () => {},
    );
    if (usuario) {
      leerInteresPremium(usuario.id).then(
        (p) => {
          if (p) {
            setInteres(p);
            setPlan(p);
          }
        },
        () => {},
      );
    }
  }, [usuario]);

  async function meInteresa() {
    if (!usuario) return;
    setEnviando(true);
    setError(null);
    try {
      await api("/interes-premium", { metodo: "POST", cuerpo: { plan, origen: origen ?? "otro" } });
      await guardarInteresPremium(usuario.id, plan);
      setInteres(plan);
    } catch (e) {
      setError(e instanceof SinConexion ? "No hay conexión. Inténtalo de nuevo." : "No pudimos registrarlo. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const precio = (v: number) => `${oferta.simbolo}${v.toFixed(2)}`;
  const ahorro = ahorroAnual(oferta);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={estilos.barra}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => volver()} hitSlop={8} style={estilos.cerrar}>
          <Text style={estilos.x}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.encabezado} accessible accessibilityRole="header" accessibilityLabel="Palpa Premium">
          <Text style={estilos.marca}>palpa</Text>
          <Text style={estilos.etiqueta}>premium</Text>
        </View>
        {logro && (
          <Text style={estilos.logro} accessibilityRole="header">
            {logro}
          </Text>
        )}
        <Text style={estilos.titulo}>{logro ? "Sigue con toda la anatomía, con el mismo método." : "Toda la anatomía, con el mismo método."}</Text>
        <View style={{ gap: espacio.s }}>
          {oferta.beneficios.map((b) => (
            <View key={b} style={estilos.beneficio}>
              <Text style={estilos.check}>✓</Text>
              <Text style={estilos.texto}>{b}</Text>
            </View>
          ))}
        </View>
        <View accessibilityRole="radiogroup" style={{ gap: espacio.s }}>
          {(["anual", "mensual"] as const).map((p) => {
            const elegido = plan === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ checked: elegido, disabled: interes !== null }}
                disabled={interes !== null}
                onPress={() => setPlan(p)}
                style={[estilos.plan, elegido && estilos.planElegido]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.planNombre, elegido && { color: color.acento }]}>{p === "anual" ? "Anual" : "Mensual"}</Text>
                  <Text style={estilos.tenue}>{p === "anual" ? `${precio(oferta.anual)} al año` : `${precio(oferta.mensual)} al mes`}</Text>
                </View>
                {p === "anual" && ahorro > 0 && <Text style={estilos.ahorro}>Ahorra {ahorro}%</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={estilos.pie}>
        {interes ? (
          <View style={estilos.gracias} accessibilityLiveRegion="polite">
            <Text style={estilos.graciasTitulo}>¡Gracias!</Text>
            <Text style={estilos.texto}>Aún no está disponible; te avisaremos.</Text>
          </View>
        ) : (
          <>
            {error && <Text style={estilos.error}>{error}</Text>}
            <Boton titulo="Me interesa" onPress={meInteresa} cargando={enviando} />
            <Text style={estilos.nota}>No se cobra nada: todavía no está disponible y queremos saber si te interesa.</Text>
          </>
        )}
        <Boton titulo={interes ? "Volver" : "Ahora no"} variante="secundario" onPress={() => volver()} />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: { paddingHorizontal: espacio.m, paddingVertical: espacio.s },
  cerrar: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: "center", justifyContent: "center" },
  x: { fontSize: 24, color: color.bloqueado },
  contenido: { padding: espacio.l, paddingTop: 0, gap: espacio.l },
  encabezado: { flexDirection: "row", alignItems: "center", gap: espacio.s },
  marca: { fontSize: 34, fontFamily: fuente.titulo, color: color.marca, letterSpacing: -1 },
  etiqueta: { paddingHorizontal: espacio.s, paddingVertical: 2, borderRadius: 999, backgroundColor: color.logro, color: color.logroTexto, fontSize: 14, fontFamily: fuente.titulo },
  logro: { fontSize: 18, fontFamily: fuente.titulo, color: color.logroTexto },
  titulo: { fontSize: 26, fontFamily: fuente.titulo, color: color.texto },
  beneficio: { flexDirection: "row", gap: espacio.s, alignItems: "flex-start" },
  check: { fontSize: 18, fontFamily: fuente.titulo, color: color.marca },
  texto: { flex: 1, fontSize: 16, fontFamily: fuente.normal, color: color.texto, lineHeight: 22 },
  tenue: { fontSize: 14, fontFamily: fuente.normal, color: color.tenue },
  plan: { flexDirection: "row", alignItems: "center", minHeight: TOQUE_MINIMO, padding: espacio.m, borderRadius: 16, borderWidth: 2, borderColor: color.borde },
  planElegido: { borderColor: color.acento, backgroundColor: color.acentoSuave },
  planNombre: { fontSize: 18, fontFamily: fuente.titulo, color: color.texto },
  ahorro: { paddingHorizontal: espacio.s, paddingVertical: 2, borderRadius: 999, backgroundColor: color.hueso, color: color.logroTexto, fontSize: 13, fontFamily: fuente.negrita },
  pie: { padding: espacio.l, paddingTop: espacio.m, gap: espacio.s, borderTopWidth: 2, borderTopColor: color.borde },
  gracias: { padding: espacio.m, borderRadius: 16, backgroundColor: color.marcaSuave, gap: espacio.xs },
  graciasTitulo: { fontSize: 20, fontFamily: fuente.titulo, color: color.marcaTexto },
  nota: { fontSize: 13, fontFamily: fuente.normal, color: color.tenue, textAlign: "center" },
  error: { fontSize: 14, fontFamily: fuente.media, color: color.rojo },
});
