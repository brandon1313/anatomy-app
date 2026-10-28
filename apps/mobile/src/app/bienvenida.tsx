import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { color, espacio, fuente } from "../tema";

export default function Bienvenida() {
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  return (
    <SafeAreaView style={estilos.pantalla}>
      {aviso === "cuenta-borrada" && (
        <Text style={estilos.aviso} accessibilityLiveRegion="polite">
          Tu cuenta y tus datos se borraron.
        </Text>
      )}
      <View style={estilos.contenido}>
        <Text style={estilos.marca} accessibilityRole="header" accessibilityLabel="Palpa">palpa</Text>
        <Text style={estilos.lema}>Anatomía que se toca</Text>
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
  aviso: { padding: espacio.m, borderRadius: 12, backgroundColor: color.marcaSuave, color: color.marcaTexto, fontSize: 15, fontFamily: fuente.media },
  contenido: { flex: 1, justifyContent: "center", gap: espacio.s },
  /** Logotipo provisional: el nombre en minúsculas, en el teal de la marca. */
  marca: { fontSize: 56, fontFamily: fuente.titulo, color: color.marca, letterSpacing: -1 },
  lema: { fontSize: 22, fontFamily: fuente.negrita, color: color.coralTexto, marginBottom: espacio.s },
  texto: { fontSize: 18, fontFamily: fuente.normal, color: color.tenue, lineHeight: 27 },
});
