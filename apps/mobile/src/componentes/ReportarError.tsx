import type { MotivoReporte } from "@anatomia/contenido";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../lib/estado";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";
import { Boton } from "./Boton";

const MOTIVOS: [MotivoReporte, string][] = [
  ["respuesta_incorrecta", "La respuesta correcta está mal"],
  ["texto_confuso", "El texto no se entiende"],
  ["imagen", "Problema con la imagen o el 3D"],
  ["otro", "Otra cosa"],
];

/**
 * Ventana para reportar un error en un ejercicio (PRD, "Reportar error"): uno de los 4 motivos del esquema
 * y un comentario opcional. El reporte se guarda en el teléfono y sale en cuanto hay conexión.
 */
export function ReportarError({ ejercicioId, visible, onCerrar, onEnviado }: { ejercicioId: string; visible: boolean; onCerrar: () => void; onEnviado: () => void }) {
  const { reportarError } = useApp();
  const insets = useSafeAreaInsets();
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!motivo) return;
    setEnviando(true);
    try {
      await reportarError({ ejercicioId, motivo, comentario });
      setMotivo(null);
      setComentario("");
      onEnviado();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={estilos.fondo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[estilos.ventana, { paddingBottom: insets.bottom + espacio.l }]} accessibilityViewIsModal>
          <Text style={estilos.titulo} accessibilityRole="header">Reportar un error</Text>
          <Text style={estilos.ayuda}>¿Qué está mal en este ejercicio?</Text>
          <View accessibilityRole="radiogroup" style={{ gap: espacio.s }}>
            {MOTIVOS.map(([valor, texto]) => {
              const elegido = motivo === valor;
              return (
                <Pressable key={valor} accessibilityRole="radio" accessibilityState={{ checked: elegido }} onPress={() => setMotivo(valor)} style={[estilos.opcion, elegido && estilos.elegida]}>
                  <Text style={[estilos.opcionTexto, elegido && { color: color.acento }]}>{texto}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            accessibilityLabel="Comentario (opcional)"
            placeholder="Cuéntanos más (opcional)"
            placeholderTextColor={color.tenue}
            value={comentario}
            onChangeText={setComentario}
            maxLength={500}
            multiline
            style={estilos.comentario}
          />
          <Boton titulo="Enviar reporte" onPress={enviar} deshabilitado={!motivo} cargando={enviando} />
          <Boton titulo="Cancelar" variante="secundario" onPress={onCerrar} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(36, 50, 58, 0.45)" },
  ventana: { backgroundColor: color.fondo, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: espacio.l, gap: espacio.m },
  titulo: { fontSize: 22, fontFamily: fuente.titulo, color: color.texto },
  ayuda: { fontSize: 15, fontFamily: fuente.normal, color: color.tenue },
  opcion: { minHeight: TOQUE_MINIMO, justifyContent: "center", paddingHorizontal: espacio.m, paddingVertical: espacio.s, borderRadius: 12, borderWidth: 2, borderColor: color.borde },
  elegida: { borderColor: color.acento, backgroundColor: color.acentoSuave },
  opcionTexto: { fontSize: 16, fontFamily: fuente.media, color: color.texto },
  comentario: { minHeight: 72, borderWidth: 2, borderColor: color.borde, borderRadius: 12, padding: espacio.m, fontSize: 16, fontFamily: fuente.normal, color: color.texto, textAlignVertical: "top" },
});
