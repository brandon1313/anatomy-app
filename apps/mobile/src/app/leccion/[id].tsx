import type { Ejercicio, Imagen } from "@anatomia/contenido";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, type LayoutRectangle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Boton } from "../../componentes/Boton";
import { Ejercicio3D } from "../../ejercicios/Ejercicio3D";
import { Emparejar } from "../../ejercicios/Emparejar";
import { IdentificarImagen } from "../../ejercicios/IdentificarImagen";
import { OpcionMultiple } from "../../ejercicios/OpcionMultiple";
import { TocarEstructura } from "../../ejercicios/TocarEstructura";
import type { Eleccion } from "../../ejercicios/tipos";
import { actual, ejerciciosDeLeccion, iniciar, lecciones, progreso, resultado, responder, siguiente, terminada } from "../../leccion/flujo";
import { type MusculoPresentado, Presentacion3D } from "../../ejercicios/Presentacion3D";
import { guardarJson, leerJson } from "../../lib/almacen";
import { efecto } from "../../lib/efectos";
import { useApp } from "../../lib/estado";
import { uriImagen } from "../../lib/imagenes";
import { color, espacio, fuente, TOQUE_MINIMO } from "../../tema";
import { type ControlEscena, EscenaLeccion, type Toque } from "../../visor3d/EscenaLeccion";

const ELOGIOS = ["¡Excelente!", "¡Muy bien!", "¡Correcto!", "¡Así se hace!"];
/** Lecciones cuya presentación ya se vio en este teléfono. */
const CLAVE_PRESENTACIONES = "presentaciones-vistas";

function salirConConfirmacion() {
  const mensaje = "Si sales ahora, perderás el avance de esta lección.";
  if (Platform.OS === "web") {
    if (window.confirm(mensaje)) router.back();
    return;
  }
  Alert.alert("¿Salir de la lección?", mensaje, [
    { text: "Seguir", style: "cancel" },
    { text: "Salir", style: "destructive", onPress: () => router.back() },
  ]);
}

function formatoTiempo(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** La estructura del modelo 3D que pregunta un ejercicio de imagen, o null si va con la imagen. */
function en3D(e: Ejercicio, imagen: Imagen | undefined, archivoModelo: string | undefined) {
  if (!imagen?.modelo3d || imagen.modelo3d.archivo !== archivoModelo) return null;
  if (e.tipo !== "tocar_estructura" && e.tipo !== "identificar_imagen") return null;
  const zonaId = e.tipo === "tocar_estructura" ? e.zonaCorrecta : e.zonaResaltada;
  const fichaId = imagen.zonas.find((z) => z.id === zonaId)?.fichaId;
  const estructura = fichaId ? imagen.modelo3d.estructuras[fichaId] : undefined;
  return estructura ? { estructura, ocultas: imagen.modelo3d.ocultas } : null;
}

export default function Leccion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paquete, completar } = useApp();
  const insets = useSafeAreaInsets();
  const leccion = useMemo(() => (paquete ? lecciones(paquete).find((l) => l.id === id) : undefined), [paquete, id]);
  const ejercicios = useMemo(
    () => (paquete && leccion ? ejerciciosDeLeccion(paquete, leccion, (archivo) => uriImagen(archivo) !== null) : []),
    [paquete, leccion],
  );
  const porId = useMemo(() => new Map(ejercicios.map((e) => [e.id, e])), [ejercicios]);
  const imagenes = useMemo(() => new Map((paquete?.imagenes ?? []).map((i) => [i.id, i])), [paquete]);
  const nombres = useMemo(() => new Map((paquete?.fichas ?? []).map((f) => [f.id, f.nombre.principal])), [paquete]);

  // El modelo 3D de la lección: el de sus imágenes, si ya está en el teléfono. En web va todo con imágenes.
  // La región para el indicador de vista sale del título de esa imagen ("Muslo derecho, vista anterior…").
  const { modelo, region } = useMemo(() => {
    if (Platform.OS === "web") return {};
    for (const e of ejercicios) {
      const imagen = "imagenId" in e ? imagenes.get(e.imagenId) : undefined;
      const m = imagen?.modelo3d;
      if (m && uriImagen(m.archivo) && uriImagen(m.datos)) return { modelo: m, region: imagen.titulo.split(",")[0].trim().toLowerCase() };
    }
    return {};
  }, [ejercicios, imagenes]);
  const [fallo3D, setFallo3D] = useState(false);
  const escena = useRef<ControlEscena>(null);
  const control = useMemo<ControlEscena>(() => ({ enviar: (o) => escena.current?.enviar(o) }), []);
  const alTocar = useRef<((t: Toque) => void) | null>(null);
  const registrarToque = useCallback((f: ((t: Toque) => void) | null) => (alTocar.current = f), []);
  const [hueco, setHueco] = useState<LayoutRectangle | null>(null);
  const onError3D = useCallback(() => setFallo3D(true), []);
  const [escenaLista, setEscenaLista] = useState(0);
  const onListo3D = useCallback(() => setEscenaLista((n) => n + 1), []);

  // Presentación: los músculos de los ejercicios 3D, sin repetir y en el orden en que aparecen.
  const recorrido = useMemo(() => {
    const musculos = new Map<string, MusculoPresentado>();
    let ocultas: string[] = [];
    for (const e of ejercicios) {
      const imagen = "imagenId" in e ? imagenes.get(e.imagenId) : undefined;
      const d = modelo ? en3D(e, imagen, modelo.archivo) : null;
      if (!d || !imagen || musculos.has(d.estructura)) continue;
      const fichaId = Object.entries(imagen.modelo3d?.estructuras ?? {}).find(([, s]) => s === d.estructura)?.[0];
      musculos.set(d.estructura, { estructura: d.estructura, nombre: (fichaId && nombres.get(fichaId)) || d.estructura });
      ocultas = d.ocultas;
    }
    return { musculos: [...musculos.values()], ocultas };
  }, [ejercicios, imagenes, nombres, modelo]);
  /** null mientras se lee si ya se vio. Sale sola la primera vez; después, con el ▶ de la barra. */
  const [presentando, setPresentando] = useState<boolean | null>(null);
  useEffect(() => {
    if (!leccion || recorrido.musculos.length === 0) return setPresentando(false);
    leerJson<string[]>(CLAVE_PRESENTACIONES).then(
      (vistas) => setPresentando(!(vistas ?? []).includes(leccion.id)),
      () => setPresentando(false),
    );
  }, [leccion, recorrido]);
  // Si el 3D falla, no hay presentación: la lección sigue con las imágenes.
  useEffect(() => {
    if (fallo3D) setPresentando(false);
  }, [fallo3D]);

  const [sesion, setSesion] = useState(() => iniciar(ejercicios.map((e) => e.id)));
  const [eleccion, setEleccion] = useState<Eleccion | null>(null);
  const [comprobado, setComprobado] = useState(false);
  const [elogio, setElogio] = useState(ELOGIOS[0]);
  const inicio = useRef(Date.now());

  const fin = terminada(sesion);
  useEffect(() => {
    if (!fin || !leccion || ejercicios.length === 0) return;
    void completar(leccion.id);
    efecto("fin");
  }, [fin, leccion, ejercicios.length, completar]);

  if (!leccion || ejercicios.length === 0) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.aviso}>Esta lección ya no está disponible.</Text>
        <Boton titulo="Volver" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (fin) {
    const r = resultado(sesion);
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.trofeo} accessibilityElementsHidden>🏆</Text>
        <Text style={estilos.tituloResultado} accessibilityRole="header">¡Lección completada!</Text>
        <View style={estilos.cifras}>
          <View style={[estilos.cifra, { borderColor: color.oro }]}>
            <Text style={[estilos.etiqueta, { backgroundColor: color.oro }]}>Aciertos</Text>
            <Text style={[estilos.valor, { color: color.ambar }]}>{r.aciertos}/{r.total}</Text>
          </View>
          <View style={[estilos.cifra, { borderColor: color.verdeBoton }]}>
            <Text style={[estilos.etiqueta, { backgroundColor: color.verdeBoton }]}>Tiempo</Text>
            <Text style={[estilos.valor, { color: color.verde }]}>{formatoTiempo(r.ms)}</Text>
          </View>
        </View>
        <Boton titulo="Continuar" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const ejercicio = porId.get(actual(sesion)!)!;
  const imagen = "imagenId" in ejercicio ? imagenes.get(ejercicio.imagenId) : undefined;
  const d3 = modelo && !fallo3D ? en3D(ejercicio, imagen, modelo.archivo) : null;
  const props = { comprobado, onElegir: setEleccion };

  function comprobar() {
    if (!eleccion) return;
    setSesion((s) => responder(s, eleccion.correcto, Date.now() - inicio.current));
    setComprobado(true);
    setElogio(ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)]);
    efecto(eleccion.correcto ? "acierto" : "error");
  }

  function terminarPresentacion() {
    setPresentando(false);
    inicio.current = Date.now();
    if (!leccion) return;
    const lid = leccion.id;
    leerJson<string[]>(CLAVE_PRESENTACIONES)
      .then((vistas) => (vistas?.includes(lid) ? undefined : guardarJson(CLAVE_PRESENTACIONES, [...(vistas ?? []), lid])))
      .catch(() => {});
  }

  function continuar() {
    setSesion(siguiente);
    setEleccion(null);
    setComprobado(false);
    inicio.current = Date.now();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }} edges={["top", "left", "right"]}>
      <View style={estilos.barra}>
        <Pressable accessibilityRole="button" accessibilityLabel="Salir de la lección" onPress={salirConConfirmacion} style={estilos.cerrar} hitSlop={8}>
          <Text style={estilos.x}>✕</Text>
        </Pressable>
        <View style={estilos.progreso} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: sesion.cola.length, now: sesion.indice }}>
          <View style={[estilos.relleno, { width: `${Math.max(progreso(sesion) * 100, 4)}%` }]}>
            <View style={estilos.brillo} />
          </View>
        </View>
        {/* Volver a ver la presentación en cualquier pregunta, mientras no se haya comprobado. */}
        {presentando === false && recorrido.musculos.length > 0 && !fallo3D && !comprobado && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver otra vez la presentación de la lección"
            onPress={() => {
              // Al volver, el ejercicio empieza de nuevo: la elección anterior ya no vale.
              setEleccion(null);
              setPresentando(true);
            }}
            style={estilos.cerrar}
            hitSlop={8}
          >
            <View style={estilos.botonVer}>
              <Text style={estilos.ver}>▶</Text>
            </View>
          </Pressable>
        )}
      </View>
      {sesion.indice >= sesion.original && <Text style={estilos.repaso}>Repasemos el que fallaste</Text>}

      <View style={{ flex: 1, paddingBottom: presentando ? insets.bottom : 0 }}>
        {presentando === null ? null : presentando ? (
          <Presentacion3D
            musculos={recorrido.musculos}
            ocultas={recorrido.ocultas}
            escena={control}
            escenaLista={escenaLista}
            onHueco={setHueco}
            onTerminar={terminarPresentacion}
          />
        ) : d3 && (ejercicio.tipo === "tocar_estructura" || ejercicio.tipo === "identificar_imagen") ? (
          <Ejercicio3D
            key={sesion.indice}
            ejercicio={ejercicio}
            estructura={d3.estructura}
            ocultas={d3.ocultas}
            escena={control}
            escenaLista={escenaLista}
            registrarToque={registrarToque}
            onHueco={setHueco}
            {...props}
          />
        ) : (
          <ScrollView contentContainerStyle={estilos.ejercicio}>
            {ejercicio.tipo === "emparejar" ? (
              <Emparejar key={sesion.indice} ejercicio={ejercicio} {...props} />
            ) : ejercicio.tipo === "opcion_multiple" || ejercicio.tipo === "caso_clinico" ? (
              <OpcionMultiple key={sesion.indice} ejercicio={ejercicio} {...props} />
            ) : ejercicio.tipo === "tocar_estructura" && imagen ? (
              <TocarEstructura key={sesion.indice} ejercicio={ejercicio} imagen={imagen} nombres={nombres} {...props} />
            ) : ejercicio.tipo === "identificar_imagen" && imagen ? (
              <IdentificarImagen key={sesion.indice} ejercicio={ejercicio} imagen={imagen} {...props} />
            ) : null}
          </ScrollView>
        )}
        {/* La escena 3D vive toda la lección; se coloca sobre el hueco de la presentación o del ejercicio 3D, o se esconde. */}
        {modelo && !fallo3D && (
          <View
            style={(presentando || (d3 && presentando === false)) && hueco ? { position: "absolute", left: hueco.x, top: hueco.y, width: hueco.width, height: hueco.height } : estilos.escondida}
            pointerEvents={presentando || d3 ? "auto" : "none"}
          >
            <EscenaLeccion ref={escena} modelo={modelo} region={region} onToque={(t) => alTocar.current?.(t)} onListo={onListo3D} onError={onError3D} />
          </View>
        )}
      </View>

      {presentando === false && <View
        style={[
          estilos.pie,
          comprobado && eleccion && (eleccion.correcto ? estilos.pieBien : estilos.pieMal),
          { paddingBottom: insets.bottom + espacio.m },
        ]}
      >
        {comprobado && eleccion && (
          <View style={estilos.retro} accessibilityLiveRegion="polite">
            <View style={estilos.filaTitulo}>
              <View style={[estilos.sello, { backgroundColor: eleccion.correcto ? color.verdeBoton : color.rojoBoton }]}>
                <Text style={estilos.selloTexto}>{eleccion.correcto ? "✓" : "✕"}</Text>
              </View>
              <Text style={[estilos.retroTitulo, { color: eleccion.correcto ? color.verde : color.rojo }]}>
                {eleccion.correcto ? elogio : "Casi…"}
              </Text>
            </View>
            {!eleccion.correcto && eleccion.detalle && <Text style={estilos.detalle}>{eleccion.detalle}</Text>}
            <Text style={estilos.explicacion}>{ejercicio.explicacion}</Text>
          </View>
        )}
        <Boton
          titulo={comprobado ? "Continuar" : "Comprobar"}
          variante={comprobado && eleccion && !eleccion.correcto ? "error" : "principal"}
          deshabilitado={!comprobado && !eleccion}
          onPress={comprobado ? continuar : comprobar}
        />
      </View>}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", padding: espacio.l, gap: espacio.l, backgroundColor: color.fondo },
  aviso: { fontSize: 17, fontFamily: fuente.media, color: color.tenue, textAlign: "center" },
  barra: { flexDirection: "row", alignItems: "center", gap: espacio.s, paddingHorizontal: espacio.m, paddingVertical: espacio.s },
  cerrar: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: "center", justifyContent: "center" },
  x: { fontSize: 24, color: color.bloqueado },
  botonVer: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.acentoSuave, borderWidth: 2, borderColor: color.acentoBorde, alignItems: "center", justifyContent: "center" },
  ver: { fontSize: 14, color: color.acento, marginLeft: 2 },
  progreso: { flex: 1, height: 16, borderRadius: 8, backgroundColor: color.borde, overflow: "hidden" },
  relleno: { height: "100%", backgroundColor: color.verdeBoton, borderRadius: 8 },
  brillo: { position: "absolute", left: 8, right: 8, top: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" },
  repaso: { fontSize: 14, fontFamily: fuente.negrita, color: color.ambar, paddingHorizontal: espacio.m, textTransform: "uppercase" },
  ejercicio: { padding: espacio.m, paddingBottom: espacio.l },
  escondida: { position: "absolute", left: -10, top: 0, width: 1, height: 1, opacity: 0 },
  pie: { paddingHorizontal: espacio.m, paddingTop: espacio.m, borderTopWidth: 2, borderTopColor: color.borde, backgroundColor: color.fondo, gap: espacio.m },
  pieBien: { backgroundColor: color.verdeSuave, borderTopColor: "transparent" },
  pieMal: { backgroundColor: color.rojoSuave, borderTopColor: "transparent" },
  retro: { gap: espacio.xs },
  filaTitulo: { flexDirection: "row", alignItems: "center", gap: espacio.s },
  sello: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  selloTexto: { color: "#fff", fontSize: 18, fontFamily: fuente.titulo },
  retroTitulo: { fontSize: 22, fontFamily: fuente.titulo },
  detalle: { fontSize: 16, fontFamily: fuente.negrita, color: color.rojo },
  explicacion: { fontSize: 15, fontFamily: fuente.normal, color: color.texto, lineHeight: 21 },
  trofeo: { fontSize: 84, textAlign: "center" },
  tituloResultado: { fontSize: 28, fontFamily: fuente.titulo, color: color.ambar, textAlign: "center" },
  cifras: { flexDirection: "row", gap: espacio.m },
  cifra: { flex: 1, borderWidth: 2, borderRadius: 16, overflow: "hidden", alignItems: "stretch" },
  etiqueta: { color: "#fff", fontSize: 13, fontFamily: fuente.titulo, textAlign: "center", paddingVertical: 4, textTransform: "uppercase", letterSpacing: 0.6 },
  valor: { fontSize: 26, fontFamily: fuente.titulo, textAlign: "center", paddingVertical: espacio.m },
});
