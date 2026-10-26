import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { useApp } from "../lib/estado";
import { uriImagen } from "../lib/imagenes";
import { ejerciciosDeLeccion, estadoLeccion, lecciones } from "../leccion/flujo";
import { color, espacio, TOQUE_MINIMO } from "../tema";

const CIRCULO = {
  completada: { backgroundColor: color.verde },
  siguiente: { backgroundColor: color.acento },
  bloqueada: { backgroundColor: color.bloqueado },
};

export default function Inicio() {
  const { usuario, paquete, descarga, actualizar, completadas, salir } = useApp();

  if (!paquete) {
    return (
      <SafeAreaView style={estilos.centro}>
        {descarga === "descargando" ? (
          <>
            <ActivityIndicator size="large" />
            <Text style={estilos.aviso}>Descargando las lecciones…</Text>
          </>
        ) : (
          <>
            <Text style={estilos.aviso}>
              {descarga === "sin_conexion"
                ? "Conéctate a internet para descargar las lecciones. Después funcionan sin conexión."
                : descarga === "error"
                  ? "No pudimos descargar las lecciones."
                  : "Todavía no hay lecciones publicadas."}
            </Text>
            <Boton titulo="Reintentar" onPress={actualizar} />
          </>
        )}
      </SafeAreaView>
    );
  }

  const todas = lecciones(paquete);
  const unidad = paquete.curso.unidades[0];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.saludo}>Hola, {usuario?.nombre.split(" ")[0]}</Text>
        {descarga === "sin_conexion" && <Text style={estilos.offline}>Sin conexión: usando las lecciones guardadas.</Text>}
        <Text style={estilos.unidad} accessibilityRole="header">{unidad?.titulo}</Text>

        <View style={estilos.ruta}>
          {todas.map((l, i) => {
            const estado = estadoLeccion(todas, i, completadas);
            const n = ejerciciosDeLeccion(paquete, l, (archivo) => uriImagen(archivo) !== null).length;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityState={{ disabled: estado === "bloqueada" }}
                accessibilityLabel={`Lección ${i + 1}: ${l.titulo}. ${estado === "completada" ? "Completada" : estado === "bloqueada" ? "Bloqueada" : "Siguiente"}`}
                disabled={estado === "bloqueada" || n === 0}
                onPress={() => router.push({ pathname: "/leccion/[id]", params: { id: l.id } })}
                style={({ pressed }) => [estilos.leccion, estado === "siguiente" && estilos.siguiente, pressed && { opacity: 0.8 }]}
              >
                <View style={[estilos.circulo, CIRCULO[estado]]}>
                  <Text style={estilos.numero}>{estado === "completada" ? "✓" : i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.tituloLeccion, estado === "bloqueada" && { color: color.bloqueado }]}>{l.titulo}</Text>
                  <Text style={estilos.detalle}>
                    {estado === "bloqueada" ? "Completa la anterior para desbloquearla" : `${n} ejercicios`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: espacio.xl }}>
          <Boton titulo="Cerrar sesión" variante="secundario" onPress={async () => { await salir(); router.replace("/bienvenida"); }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "stretch", padding: espacio.l, gap: espacio.m },
  aviso: { fontSize: 17, color: color.tenue, textAlign: "center" },
  contenido: { padding: espacio.l, paddingBottom: espacio.xl },
  saludo: { fontSize: 28, fontWeight: "800", color: color.texto },
  offline: { marginTop: espacio.s, color: color.tenue, fontSize: 14 },
  unidad: { marginTop: espacio.l, marginBottom: espacio.m, fontSize: 20, fontWeight: "700", color: color.texto },
  ruta: { gap: espacio.s },
  leccion: { flexDirection: "row", alignItems: "center", gap: espacio.m, padding: espacio.m, minHeight: TOQUE_MINIMO + 24, borderRadius: 14, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  siguiente: { borderColor: color.acento, borderWidth: 2 },
  circulo: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, borderRadius: TOQUE_MINIMO / 2, alignItems: "center", justifyContent: "center" },
  numero: { color: "#fff", fontSize: 18, fontWeight: "700" },
  tituloLeccion: { fontSize: 17, fontWeight: "600", color: color.texto },
  detalle: { fontSize: 14, color: color.tenue, marginTop: 2 },
});
