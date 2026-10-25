import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { color, espacio } from "../tema";

export default function Bienvenida() {
  return (
    <SafeAreaView style={estilos.pantalla}>
      <View style={estilos.contenido}>
        <Text style={estilos.titulo} accessibilityRole="header">Anatomía</Text>
        <Text style={estilos.texto}>
          Aprende los músculos del muslo con lecciones de 3 minutos. Todo el contenido lo revisa una especialista antes de llegar a la app.
        </Text>
      </View>
      <View style={{ gap: espacio.s }}>
        <Boton titulo="Crear cuenta" onPress={() => router.push("/registro")} />
        <Boton titulo="Ya tengo cuenta" variante="secundario" onPress={() => router.push("/login")} />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, padding: espacio.l, justifyContent: "space-between" },
  contenido: { flex: 1, justifyContent: "center", gap: espacio.m },
  titulo: { fontSize: 36, fontWeight: "800", color: color.texto },
  texto: { fontSize: 18, color: color.tenue, lineHeight: 26 },
});
