import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { Campo } from "../componentes/Campo";
import { SinConexion } from "../lib/api";
import { useApp } from "../lib/estado";
import { color, espacio } from "../tema";

export default function Login() {
  const { entrar } = useApp();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await entrar(email.trim(), contrasena);
      router.replace("/inicio");
    } catch (e) {
      setError(e instanceof SinConexion ? "No hay conexión. Inténtalo de nuevo." : (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo} accessibilityRole="header">Iniciar sesión</Text>
          <Campo etiqueta="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
          <Campo etiqueta="Contraseña" value={contrasena} onChangeText={setContrasena} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={enviar} />
          {error && <Text style={estilos.error} accessibilityLiveRegion="polite">{error}</Text>}
          <Boton titulo="Entrar" onPress={enviar} cargando={enviando} deshabilitado={!email || !contrasena} />
          <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.l, gap: espacio.s },
  titulo: { fontSize: 28, fontWeight: "800", color: color.texto, marginBottom: espacio.m },
  error: { color: color.rojo, fontSize: 15, marginBottom: espacio.s },
});
