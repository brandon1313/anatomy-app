import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { color, espacio } from "../tema";

/** react-native-webview no funciona en web: la prueba del visor es solo para el teléfono. */
export function VisorPrueba() {
  return (
    <SafeAreaView style={estilos.centro}>
      <Text style={estilos.aviso}>La prueba del visor 3D es solo para el teléfono.</Text>
      <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", padding: espacio.l, gap: espacio.m },
  aviso: { fontSize: 17, color: color.tenue, textAlign: "center" },
});
