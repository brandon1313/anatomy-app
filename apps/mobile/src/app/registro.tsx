import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { Campo } from "../componentes/Campo";
import { ErrorApi, SinConexion } from "../lib/api";
import { useApp } from "../lib/estado";
import { color, espacio, fuente } from "../tema";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function Registro() {
  const { registrar } = useApp();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [universidad, setUniversidad] = useState("");
  const [hora, setHora] = useState("20:00");
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!HORA.test(hora)) return setErrores(["La hora del recordatorio va como HH:MM, por ejemplo 20:00"]);
    if (contrasena.length < 8) return setErrores(["La contraseña necesita al menos 8 caracteres"]);
    setEnviando(true);
    setErrores([]);
    try {
      await registrar({
        nombre: nombre.trim(),
        email: email.trim(),
        contrasena,
        universidad: universidad.trim() || undefined,
        horaRecordatorio: hora,
        zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      router.replace("/inicio");
    } catch (e) {
      if (e instanceof SinConexion) setErrores(["No hay conexión. Inténtalo de nuevo."]);
      else if (e instanceof ErrorApi && e.errores.length) setErrores(e.errores.map((x) => x.mensaje));
      else setErrores([(e as Error).message]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Text style={estilos.titulo} accessibilityRole="header">Crear cuenta</Text>
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoComplete="name" textContentType="name" />
          <Campo etiqueta="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Campo etiqueta="Contraseña" value={contrasena} onChangeText={setContrasena} secureTextEntry autoComplete="new-password" textContentType="newPassword" ayuda="Mínimo 8 caracteres" />
          <Campo etiqueta="Universidad (opcional)" value={universidad} onChangeText={setUniversidad} />
          <Campo etiqueta="Hora del recordatorio diario" value={hora} onChangeText={setHora} keyboardType="numbers-and-punctuation" maxLength={5} ayuda="Te avisaremos a esta hora los días que no hayas estudiado." />
          {errores.map((e, i) => <Text key={i} style={estilos.error} accessibilityLiveRegion="polite">{e}</Text>)}
          <Boton titulo="Crear cuenta" onPress={enviar} cargando={enviando} deshabilitado={!nombre.trim() || !email.trim() || !contrasena} />
          <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.l, gap: espacio.s },
  titulo: { fontSize: 28, fontFamily: fuente.titulo, color: color.texto, marginBottom: espacio.m },
  error: { color: color.rojo, fontSize: 15, fontFamily: fuente.media },
});
