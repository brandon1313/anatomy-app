import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";
import { Icono, type NombreIcono } from "./Icono";

/**
 * Campo de formulario con ícono a la izquierda. El borde se pinta de la marca al escribir, y las
 * contraseñas (secureTextEntry) llevan un ojo para mostrarlas.
 */
export function Campo({ etiqueta, ayuda, icono, secureTextEntry, ...props }: TextInputProps & { etiqueta: string; ayuda?: string; icono?: NombreIcono }) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={[estilos.caja, enfocado && estilos.cajaEnfocada]}>
        {icono && <Icono nombre={icono} tam={22} color={enfocado ? color.marcaTexto : color.tenue} />}
        <TextInput
          accessibilityLabel={etiqueta}
          placeholderTextColor={color.tenue}
          style={estilos.entrada}
          secureTextEntry={secureTextEntry && !visible}
          {...props}
          onFocus={(e) => {
            setEnfocado(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            props.onBlur?.(e);
          }}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            style={estilos.ojo}
          >
            <Icono nombre={visible ? "ocultar" : "mostrar"} tam={22} color={color.tenue} />
          </Pressable>
        )}
      </View>
      {ayuda && <Text style={estilos.ayuda}>{ayuda}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { gap: espacio.xs, marginBottom: espacio.m },
  etiqueta: { fontSize: 15, fontFamily: fuente.negrita, color: color.texto },
  caja: {
    minHeight: TOQUE_MINIMO + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.s,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: color.borde,
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    backgroundColor: color.superficie,
  },
  cajaEnfocada: { borderColor: color.marca, backgroundColor: color.marcaSuave },
  /** Sin el contorno del navegador en la web: el borde de la caja ya marca el foco. */
  entrada: { flex: 1, alignSelf: "stretch", fontSize: 17, fontFamily: fuente.normal, color: color.texto, outlineWidth: 0 },
  ojo: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: "center", justifyContent: "center" },
  ayuda: { fontSize: 13, fontFamily: fuente.normal, color: color.tenue },
});
