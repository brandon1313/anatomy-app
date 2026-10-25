import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../../componentes/Boton";
import { Emparejar } from "../../ejercicios/Emparejar";
import { OpcionMultiple } from "../../ejercicios/OpcionMultiple";
import { useApp } from "../../lib/estado";
import { actual, ejerciciosDeLeccion, iniciar, lecciones, progreso, resultado, responder, siguiente, terminada } from "../../leccion/flujo";
import { color, espacio, TOQUE_MINIMO } from "../../tema";

function salirConConfirmacion() {
  const mensaje = "Si sales ahora, perderás el avance de esta lección.";
  if (Platform.OS === "web") {
    if (window.confirm(mensaje)) router.back();
    return;
  }
  Alert.alert("¿Salir de la lección?", mensaje, [
    { text: "Seguir", style: "cancel" },
    { text: "Salir", style: "destructive", onPress: () => router.back() },
  ]);
}

function formatoTiempo(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Leccion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paquete, completar } = useApp();
  const leccion = useMemo(() => (paquete ? lecciones(paquete).find((l) => l.id === id) : undefined), [paquete, id]);
  const ejercicios = useMemo(() => (paquete && leccion ? ejerciciosDeLeccion(paquete, leccion) : []), [paquete, leccion]);
  const porId = useMemo(() => new Map(ejercicios.map((e) => [e.id, e])), [ejercicios]);

  const [sesion, setSesion] = useState(() => iniciar(ejercicios.map((e) => e.id)));
  const [respuesta, setRespuesta] = useState<boolean | null>(null);
  const inicio = useRef(Date.now());

  const fin = terminada(sesion);
  useEffect(() => {
    if (fin && leccion && ejercicios.length > 0) void completar(leccion.id);
  }, [fin, leccion, ejercicios.length, completar]);

  if (!leccion || ejercicios.length === 0) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.aviso}>Esta lección ya no está disponible.</Text>
        <Boton titulo="Volver" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (fin) {
    const r = resultado(sesion);
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.tituloResultado} accessibilityRole="header">¡Lección completada!</Text>
        <View style={estilos.cifras}>
          <View style={estilos.cifra}>
            <Text style={estilos.valor}>{r.aciertos}/{r.total}</Text>
            <Text style={estilos.etiqueta}>aciertos a la primera</Text>
          </View>
          <View style={estilos.cifra}>
            <Text style={estilos.valor}>{formatoTiempo(r.ms)}</Text>
            <Text style={estilos.etiqueta}>tiempo</Text>
          </View>
        </View>
        <Boton titulo="Continuar" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const ejercicio = porId.get(actual(sesion)!)!;
  const props = {
    onResponder: (correcto: boolean) => {
      setSesion((s) => responder(s, correcto, Date.now() - inicio.current));
      setRespuesta(correcto);
    },
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={estilos.barra}>
        <Pressable accessibilityRole="button" accessibilityLabel="Salir de la lección" onPress={salirConConfirmacion} style={estilos.cerrar} hitSlop={8}>
          <Text style={estilos.x}>✕</Text>
        </Pressable>
        <View
          style={estilos.progreso}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: sesion.cola.length, now: sesion.indice }}
        >
          <View style={[estilos.relleno, { width: `${progreso(sesion) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={estilos.ejercicio}>
        {sesion.indice >= sesion.original && <Text style={estilos.repaso}>Repasemos el que fallaste</Text>}
        {ejercicio.tipo === "emparejar" ? (
          <Emparejar key={sesion.indice} ejercicio={ejercicio} {...props} />
        ) : ejercicio.tipo === "opcion_multiple" || ejercicio.tipo === "caso_clinico" ? (
          <OpcionMultiple key={sesion.indice} ejercicio={ejercicio} {...props} />
        ) : null}
      </ScrollView>

      {respuesta !== null && (
        <View style={[estilos.retro, respuesta ? estilos.retroBien : estilos.retroMal]} accessibilityLiveRegion="polite">
          <Text style={[estilos.retroTitulo, { color: respuesta ? color.verde : color.rojo }]}>{respuesta ? "¡Correcto!" : "Incorrecto"}</Text>
          <Text style={estilos.explicacion}>{ejercicio.explicacion}</Text>
          <Boton
            titulo="Continuar"
            variante={respuesta ? "exito" : "error"}
            onPress={() => {
              setSesion(siguiente);
              setRespuesta(null);
              inicio.current = Date.now();
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", padding: espacio.l, gap: espacio.l },
  aviso: { fontSize: 17, color: color.tenue, textAlign: "center" },
  barra: { flexDirection: "row", alignItems: "center", gap: espacio.m, paddingHorizontal: espacio.m, paddingVertical: espacio.s },
  cerrar: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: "center", justifyContent: "center" },
  x: { fontSize: 22, color: color.tenue },
  progreso: { flex: 1, height: 12, borderRadius: 6, backgroundColor: color.borde, overflow: "hidden" },
  relleno: { height: "100%", backgroundColor: color.verde, borderRadius: 6 },
  ejercicio: { padding: espacio.l, paddingBottom: 240 },
  repaso: { fontSize: 14, fontWeight: "700", color: color.acento, marginBottom: espacio.s, textTransform: "uppercase" },
  retro: { position: "absolute", left: 0, right: 0, bottom: 0, padding: espacio.l, paddingBottom: espacio.xl, gap: espacio.s, borderTopWidth: 2 },
  retroBien: { backgroundColor: color.verdeSuave, borderTopColor: color.verde },
  retroMal: { backgroundColor: color.rojoSuave, borderTopColor: color.rojo },
  retroTitulo: { fontSize: 22, fontWeight: "800" },
  explicacion: { fontSize: 16, color: color.texto, lineHeight: 23, marginBottom: espacio.s },
  tituloResultado: { fontSize: 30, fontWeight: "800", color: color.texto, textAlign: "center" },
  cifras: { flexDirection: "row", gap: espacio.m },
  cifra: { flex: 1, backgroundColor: color.superficie, borderRadius: 14, padding: espacio.m, alignItems: "center", borderWidth: 1, borderColor: color.borde },
  valor: { fontSize: 32, fontWeight: "800", color: color.texto },
  etiqueta: { fontSize: 14, color: color.tenue, textAlign: "center" },
});
