import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";
import { Icono, type NombreIcono } from "./Icono";

/** Piezas comunes de las pantallas de la cuenta: login y registro. */

/** Flecha para volver. Si se abrió la pantalla directo (en la web), vuelve a la bienvenida. */
export function BarraAtras() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/bienvenida"))}
      hitSlop={8}
      style={estilos.atras}
    >
      <Icono nombre="atras" tam={26} />
    </Pressable>
  );
}

/** Ícono en una burbuja de la marca, título y una línea de apoyo. */
export function Cabecera({ icono, titulo, detalle }: { icono: NombreIcono; titulo: string; detalle: string }) {
  return (
    <View style={estilos.cabecera}>
      <View style={estilos.burbuja}>
        <Icono nombre={icono} tam={34} peso="duotone" color={color.marcaTexto} />
      </View>
      <Text style={estilos.titulo} accessibilityRole="header">{titulo}</Text>
      <Text style={estilos.detalle}>{detalle}</Text>
    </View>
  );
}

export function Errores({ errores }: { errores: string[] }) {
  if (!errores.length) return null;
  return (
    <View style={estilos.errores} accessibilityLiveRegion="polite">
      <Icono nombre="alerta" tam={22} peso="fill" color={color.rojo} />
      <View style={{ flex: 1, gap: espacio.xs }}>
        {errores.map((e, i) => (
          <Text key={i} style={estilos.error}>{e}</Text>
        ))}
      </View>
    </View>
  );
}

/** "¿No tienes cuenta? Crear cuenta": pregunta en gris y el enlace en la marca. */
export function Enlace({ pregunta, accion, onPress }: { pregunta: string; accion: string; onPress: () => void }) {
  return (
    <View style={estilos.pie}>
      <Text style={estilos.pregunta}>{pregunta}</Text>
      <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={estilos.enlace}>
        <Text style={estilos.accion}>{accion}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  atras: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, justifyContent: "center", marginLeft: -espacio.xs },
  cabecera: { gap: espacio.xs, marginTop: espacio.m, marginBottom: espacio.l },
  burbuja: { width: 64, height: 64, borderRadius: 20, backgroundColor: color.marcaSuave, alignItems: "center", justifyContent: "center", marginBottom: espacio.s },
  titulo: { fontSize: 30, fontFamily: fuente.titulo, color: color.texto },
  detalle: { fontSize: 17, fontFamily: fuente.normal, color: color.tenue, lineHeight: 25 },
  errores: { flexDirection: "row", gap: espacio.s, padding: espacio.m, borderRadius: 16, backgroundColor: color.rojoSuave, marginBottom: espacio.m },
  error: { color: color.rojo, fontSize: 15, fontFamily: fuente.media, lineHeight: 21 },
  pie: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: espacio.xs, marginTop: espacio.l },
  pregunta: { fontSize: 16, fontFamily: fuente.normal, color: color.tenue },
  enlace: { minHeight: TOQUE_MINIMO, justifyContent: "center" },
  accion: { fontSize: 16, fontFamily: fuente.negrita, color: color.marcaTexto },
});
