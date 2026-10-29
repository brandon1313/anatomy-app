import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { Icono, type NombreIcono } from "../componentes/Icono";
import { Logo } from "../componentes/Logo";
import { color, espacio, fuente } from "../tema";

/** Un pedazo del camino de lecciones de Inicio, como adelanto de la app. Es decorativo. */
const CAMINO: { icono: NombreIcono; fondo: string; sombra: string; desplazamiento: number }[] = [
  { icono: "check", fondo: color.logro, sombra: color.logroSombra, desplazamiento: -44 },
  { icono: "estrella", fondo: color.marca, sombra: color.marcaSombra, desplazamiento: 28 },
  { icono: "candado", fondo: color.borde, sombra: "#cfd5da", desplazamiento: -12 },
];

const BENEFICIOS: { icono: NombreIcono; texto: string }[] = [
  { icono: "tiempo", texto: "Lecciones de 3 minutos" },
  { icono: "tocar", texto: "Toca los músculos en 3D" },
  { icono: "memoria", texto: "Repasos para no olvidar" },
];

export default function Bienvenida() {
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  return (
    <SafeAreaView style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        {aviso === "cuenta-borrada" && (
          <Text style={estilos.aviso} accessibilityLiveRegion="polite">
            Tu cuenta y tus datos se borraron.
          </Text>
        )}
        <View style={estilos.portada} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={estilos.racha}>
            <Icono nombre="racha" tam={20} peso="fill" color={color.coral} />
            <Text style={estilos.rachaTexto}>3</Text>
          </View>
          {CAMINO.map((c, i) => (
            <View
              key={i}
              style={[estilos.circulo, { backgroundColor: c.fondo, borderColor: c.sombra, transform: [{ translateX: c.desplazamiento }] }]}
            >
              <Icono nombre={c.icono} tam={30} peso="fill" color={c.icono === "candado" ? color.bloqueado : "#fff"} />
            </View>
          ))}
        </View>

        <View style={estilos.cabecera}>
          <View accessible accessibilityRole="header" accessibilityLabel="Palpa">
            <Logo alto={60} />
          </View>
          <Text style={estilos.lema}>Anatomía que se toca</Text>
        </View>

        <View style={estilos.beneficios}>
          {BENEFICIOS.map((b) => (
            <View key={b.icono} style={estilos.beneficio}>
              <View style={estilos.burbuja}>
                <Icono nombre={b.icono} tam={22} peso="duotone" color={color.marcaTexto} />
              </View>
              <Text style={estilos.texto}>{b.texto}</Text>
            </View>
          ))}
        </View>

        <View style={estilos.botones}>
          <Boton titulo="Crear cuenta" onPress={() => router.push("/registro")} />
          <Boton titulo="Ya tengo cuenta" variante="secundario" onPress={() => router.push("/login")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: color.fondo },
  contenido: { flexGrow: 1, padding: espacio.l, gap: espacio.l },
  aviso: { padding: espacio.m, borderRadius: 12, backgroundColor: color.marcaSuave, color: color.marcaTexto, fontSize: 15, fontFamily: fuente.media },
  portada: { flexGrow: 1, minHeight: 240, borderRadius: 28, backgroundColor: color.marcaSuave, alignItems: "center", justifyContent: "center", gap: espacio.m, paddingVertical: espacio.l },
  racha: {
    position: "absolute",
    top: espacio.m,
    left: espacio.m,
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.xs,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.xs,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: color.logro,
    backgroundColor: color.hueso,
  },
  rachaTexto: { fontSize: 16, fontFamily: fuente.titulo, color: color.logroTexto },
  circulo: { width: 64, height: 64, borderRadius: 32, borderBottomWidth: 5, alignItems: "center", justifyContent: "center" },
  cabecera: { gap: espacio.s },
  lema: { fontSize: 22, fontFamily: fuente.negrita, color: color.coralTexto },
  beneficios: { gap: espacio.m },
  beneficio: { flexDirection: "row", alignItems: "center", gap: espacio.m },
  burbuja: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.marcaSuave, alignItems: "center", justifyContent: "center" },
  texto: { flex: 1, fontSize: 17, fontFamily: fuente.media, color: color.texto },
  botones: { gap: espacio.s },
});
