import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { Campo } from "../componentes/Campo";
import { BarraAtras, Cabecera, Enlace, Errores } from "../componentes/Cuenta";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <BarraAtras />
          <Cabecera icono="saludo" titulo="¡Hola de nuevo!" detalle="Entra para seguir con tus lecciones y tu racha." />
          <Campo etiqueta="Correo" icono="correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
          <Campo etiqueta="Contraseña" icono="candado" value={contrasena} onChangeText={setContrasena} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={enviar} />
          <Errores errores={error ? [error] : []} />
          <Boton titulo="Entrar" onPress={enviar} cargando={enviando} deshabilitado={!email || !contrasena} />
          <Enlace pregunta="¿No tienes cuenta?" accion="Crear cuenta" onPress={() => router.replace("/registro")} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenido: { flexGrow: 1, padding: espacio.l, paddingTop: espacio.s },
});
