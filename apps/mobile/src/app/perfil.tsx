import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Boton } from "../componentes/Boton";
import { Campo } from "../componentes/Campo";
import { SinConexion } from "../lib/api";
import { useApp } from "../lib/estado";
import { type EstadoPermiso, estadoPermiso } from "../lib/notificaciones";
import { diaDeEstudio } from "../repaso/dia";
import { rachaVigente } from "../repaso/racha";
import { color, espacio, fuente, TOQUE_MINIMO } from "../tema";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
/** La política se publica en una URL (PRD, "Privacidad"); mientras no exista, no hay enlace. */
const URL_PRIVACIDAD = process.env.EXPO_PUBLIC_URL_PRIVACIDAD;

function confirmar(titulo: string, mensaje: string, accion: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((listo) =>
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: "Cancelar", style: "cancel", onPress: () => listo(false) },
        { text: accion, style: "destructive", onPress: () => listo(true) },
      ],
      { cancelable: true, onDismiss: () => listo(false) },
    ),
  );
}

/** Perfil (PRD): racha actual y máxima, hora del recordatorio, privacidad, cerrar sesión y borrar cuenta. */
/** Si la pantalla se abrió sin otra detrás (por ejemplo, al recargar en web), vuelve a Inicio. */
const volver = () => (router.canGoBack() ? router.back() : router.replace("/inicio"));

export default function Perfil() {
  const { usuario, racha, horaRecordatorio, cambiarHoraRecordatorio, salir, borrarCuenta } = useApp();
  const dias = rachaVigente(racha, diaDeEstudio(new Date()));
  const [activo, setActivo] = useState(horaRecordatorio !== null);
  const [hora, setHora] = useState(horaRecordatorio ?? "20:00");
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permiso, setPermiso] = useState<EstadoPermiso | null>(null);

  // La hora puede llegar después de abrir la pantalla (al cargar la sesión) o cambiar al guardar: el
  // formulario la sigue. Al guardar, además, se programa el recordatorio y se pide el permiso: se vuelve a mirar.
  useEffect(() => {
    setActivo(horaRecordatorio !== null);
    if (horaRecordatorio) setHora(horaRecordatorio);
    void estadoPermiso().then(setPermiso);
  }, [horaRecordatorio]);

  const hayCambios = activo ? hora !== horaRecordatorio : horaRecordatorio !== null;

  async function guardar() {
    if (activo && !HORA.test(hora)) return setError("La hora va como HH:MM, por ejemplo 20:00.");
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      await cambiarHoraRecordatorio(activo ? hora : null);
      setAviso(activo ? `Listo: te avisaremos a las ${hora} los días que no hayas estudiado.` : "Listo: ya no te enviaremos recordatorios.");
    } catch (e) {
      setError(e instanceof SinConexion ? "No hay conexión. Inténtalo de nuevo." : "No pudimos guardar el cambio. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    const seguro = await confirmar(
      "¿Borrar tu cuenta?",
      "Se borran tu cuenta, tu progreso, tu racha y tus reportes, en este teléfono y en el servidor. No se puede deshacer.",
      "Borrar",
    );
    if (!seguro) return;
    setBorrando(true);
    setError(null);
    try {
      await borrarCuenta();
      router.replace({ pathname: "/bienvenida", params: { aviso: "cuenta-borrada" } });
    } catch (e) {
      setError(e instanceof SinConexion ? "Necesitas conexión para borrar tu cuenta." : "No pudimos borrar la cuenta. Inténtalo de nuevo.");
      setBorrando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }} edges={["top", "left", "right"]}>
      <View style={estilos.barra}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => volver()} hitSlop={8} style={estilos.volver}>
          <Text style={estilos.flecha}>←</Text>
        </Pressable>
        <Text style={estilos.titulo} accessibilityRole="header">Perfil</Text>
      </View>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.usuario}>
          <View style={estilos.avatar}>
            <Text style={estilos.inicial}>{usuario?.nombre.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.nombre}>{usuario?.nombre}</Text>
            <Text style={estilos.tenue}>{usuario?.email}</Text>
          </View>
        </View>

        <Text style={estilos.seccion} accessibilityRole="header">Racha</Text>
        <View style={[estilos.tarjeta, estilos.cifras]}>
          <View style={estilos.cifra} accessible accessibilityLabel={`Racha actual: ${dias} ${dias === 1 ? "día" : "días"}`}>
            <Text style={estilos.valor}>🔥 {dias}</Text>
            <Text style={estilos.tenue}>{dias === 1 ? "día seguido" : "días seguidos"}</Text>
          </View>
          <View style={estilos.cifra} accessible accessibilityLabel={`Racha máxima: ${racha.maxima} ${racha.maxima === 1 ? "día" : "días"}`}>
            <Text style={estilos.valor}>{racha.maxima}</Text>
            <Text style={estilos.tenue}>tu récord</Text>
          </View>
        </View>

        <Text style={estilos.seccion} accessibilityRole="header">Recordatorio diario</Text>
        <View style={estilos.tarjeta}>
          <View style={estilos.fila}>
            <Text style={[estilos.texto, { flex: 1 }]}>Avisarme los días que no haya estudiado</Text>
            <Switch
              accessibilityLabel="Recordatorio diario"
              value={activo}
              onValueChange={(v) => {
                setActivo(v);
                setAviso(null);
              }}
              trackColor={{ true: color.marca, false: color.borde }}
            />
          </View>
          {activo && (
            <Campo etiqueta="Hora" value={hora} onChangeText={setHora} keyboardType="numbers-and-punctuation" maxLength={5} ayuda="Formato de 24 horas, por ejemplo 20:00." />
          )}
          {activo && permiso === "denegado" && (
            <View style={{ gap: espacio.s }}>
              <Text style={estilos.alerta}>Las notificaciones de esta app están apagadas en el teléfono: el recordatorio no va a sonar.</Text>
              <Boton titulo="Abrir Ajustes" variante="secundario" onPress={() => void Linking.openSettings()} />
            </View>
          )}
          {permiso === "no_disponible" && <Text style={estilos.tenue}>En la web no hay recordatorios: llegan en la app del teléfono.</Text>}
          {hayCambios && <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />}
          {aviso && (
            <Text style={estilos.ok} accessibilityLiveRegion="polite">
              {aviso}
            </Text>
          )}
        </View>

        <Text style={estilos.seccion} accessibilityRole="header">Premium</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/premium")} style={[estilos.tarjeta, estilos.fila]}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.texto}>Palpa Premium</Text>
            <Text style={estilos.tenue}>Todo el cuerpo y ejercicios nuevos. Pronto.</Text>
          </View>
          <Text style={estilos.flecha}>›</Text>
        </Pressable>

        <Text style={estilos.seccion} accessibilityRole="header">Privacidad</Text>
        <View style={estilos.tarjeta}>
          <Text style={estilos.texto}>Guardamos tu correo, tu nombre, tu universidad y cómo usas la app. No hay publicidad ni rastreo de terceros.</Text>
          {URL_PRIVACIDAD && (
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(URL_PRIVACIDAD)} hitSlop={8} style={estilos.enlace}>
              <Text style={estilos.enlaceTexto}>Política de privacidad</Text>
            </Pressable>
          )}
        </View>

        {error && (
          <Text style={estilos.error} accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}
        <View style={{ gap: espacio.s, marginTop: espacio.l }}>
          <Boton
            titulo="Cerrar sesión"
            variante="secundario"
            onPress={async () => {
              await salir();
              router.replace("/bienvenida");
            }}
          />
          <Pressable accessibilityRole="button" onPress={borrar} disabled={borrando} style={estilos.peligro}>
            <Text style={estilos.peligroTexto}>{borrando ? "Borrando la cuenta…" : "Borrar cuenta"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: "row", alignItems: "center", gap: espacio.s, paddingHorizontal: espacio.m, paddingVertical: espacio.s },
  volver: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: "center", justifyContent: "center" },
  flecha: { fontSize: 26, color: color.texto },
  titulo: { fontSize: 22, fontFamily: fuente.titulo, color: color.texto },
  contenido: { padding: espacio.l, paddingTop: espacio.s, paddingBottom: espacio.xl },
  usuario: { flexDirection: "row", alignItems: "center", gap: espacio.m },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.marcaSuave, borderWidth: 2, borderColor: color.marca, alignItems: "center", justifyContent: "center" },
  inicial: { fontSize: 24, fontFamily: fuente.titulo, color: color.marcaTexto },
  nombre: { fontSize: 20, fontFamily: fuente.titulo, color: color.texto },
  tenue: { fontSize: 14, fontFamily: fuente.normal, color: color.tenue },
  seccion: { marginTop: espacio.l, marginBottom: espacio.s, fontSize: 15, fontFamily: fuente.negrita, color: color.tenue },
  tarjeta: { padding: espacio.m, borderRadius: 16, borderWidth: 2, borderColor: color.borde, backgroundColor: color.superficie, gap: espacio.m },
  cifras: { flexDirection: "row" },
  cifra: { flex: 1, alignItems: "center", gap: 2 },
  valor: { fontSize: 26, fontFamily: fuente.titulo, color: color.logroTexto },
  fila: { flexDirection: "row", alignItems: "center", gap: espacio.m },
  texto: { fontSize: 16, fontFamily: fuente.normal, color: color.texto, lineHeight: 22 },
  alerta: { fontSize: 14, fontFamily: fuente.media, color: color.rojo },
  ok: { fontSize: 14, fontFamily: fuente.media, color: color.verde },
  enlace: { minHeight: TOQUE_MINIMO, justifyContent: "center", alignSelf: "flex-start" },
  enlaceTexto: { fontSize: 16, fontFamily: fuente.negrita, color: color.marcaTexto, textDecorationLine: "underline" },
  error: { marginTop: espacio.l, fontSize: 15, fontFamily: fuente.media, color: color.rojo },
  peligro: { minHeight: TOQUE_MINIMO, alignItems: "center", justifyContent: "center" },
  peligroTexto: { fontSize: 16, fontFamily: fuente.negrita, color: color.rojo },
});
