import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";

const VARIANTES = {
  principal: { fondo: color.marca, sombra: color.marcaSombra, texto: "#fff" },
  secundario: { fondo: color.superficie, sombra: color.borde, texto: color.marcaTexto },
  exito: { fondo: color.verdeBoton, sombra: color.verdeSombra, texto: "#fff" },
  error: { fondo: color.rojoBoton, sombra: color.rojoSombra, texto: "#fff" },
};

/** Botón con relieve: un borde inferior más oscuro que se hunde al presionarlo. */
export function Boton(props: {
  titulo: string;
  onPress: () => void;
  variante?: keyof typeof VARIANTES;
  deshabilitado?: boolean;
  cargando?: boolean;
}) {
  const v = VARIANTES[props.variante ?? "principal"];
  const inactivo = props.deshabilitado || props.cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.titulo}
      accessibilityState={{ disabled: !!inactivo, busy: !!props.cargando }}
      disabled={inactivo}
      onPress={props.onPress}
    >
      {({ pressed }) => (
        <View
          style={[
            estilos.base,
            { backgroundColor: v.fondo, borderColor: v.sombra },
            props.variante === "secundario" && estilos.contorno,
            inactivo && estilos.inactivo,
            pressed && !inactivo && estilos.presionado,
          ]}
        >
          {props.cargando ? (
            <ActivityIndicator color={v.texto} />
          ) : (
            <Text style={[estilos.texto, { color: inactivo ? color.bloqueado : v.texto }]}>{props.titulo}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: TOQUE_MINIMO + 8, borderRadius: 16, paddingHorizontal: espacio.m, alignItems: "center", justifyContent: "center", borderBottomWidth: 4 },
  contorno: { borderWidth: 2, borderBottomWidth: 4 },
  inactivo: { backgroundColor: color.borde, borderColor: color.borde },
  presionado: { borderBottomWidth: 0, marginTop: 4 },
  texto: { fontSize: 18, fontFamily: fuente.negrita },
});
