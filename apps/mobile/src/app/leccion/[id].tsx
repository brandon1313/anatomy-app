import { type Ejercicio, esMejorMarca, estrellas, type Imagen, type Modelo3D } from "@anatomia/contenido";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, type LayoutRectangle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Boton } from "../../componentes/Boton";
import { Estrellas } from "../../componentes/Estrellas";
import { Icono } from "../../componentes/Icono";
import { ReportarError } from "../../componentes/ReportarError";
import { Ejercicio3D } from "../../ejercicios/Ejercicio3D";
import { Emparejar } from "../../ejercicios/Emparejar";
import { IdentificarImagen } from "../../ejercicios/IdentificarImagen";
import { OpcionMultiple } from "../../ejercicios/OpcionMultiple";
import { TocarEstructura } from "../../ejercicios/TocarEstructura";
import type { Eleccion } from "../../ejercicios/tipos";
import { actual, agruparPorModelo, ejerciciosDeLeccion, ejerciciosMostrables, iniciar, lecciones, progreso, resultado, responder, siguiente, terminada } from "../../leccion/flujo";
import { ofertasAlTerminar } from "../../leccion/oferta";
import { diaDeEstudio } from "../../repaso/dia";
import { ejerciciosDeRepaso } from "../../repaso/espaciado";
import { rachaVigente, registrarActividad } from "../../repaso/racha";
import { type MusculoPresentado, Presentacion3D } from "../../ejercicios/Presentacion3D";
import { guardarJson, leerJson } from "../../lib/almacen";
import { efecto } from "../../lib/efectos";
import { useApp } from "../../lib/estado";
import { alDescargarArchivo, descargarImagen, uriImagen } from "../../lib/imagenes";
import { ofertaParaMostrar } from "../../lib/premium";
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

/** Un modelo 3D listo para la escena, con su región ("muslo derecho") para el indicador de vista. */
type EscenaModelo = { modelo: Modelo3D; region: string };

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
  const { usuario, paquete, completar, completadas, marcas, progreso: progresoFichas, racha, registrarIntento, registrarEvento, terminarSesion } = useApp();
  const rachaAlEmpezar = useRef(racha);
  // La mejor marca antes de esta vez: el resultado dice si se superó.
  const marcaAlEmpezar = useRef(marcas.find((m) => m.leccionId === id));
  // Las lecciones completadas antes de esta vez: terminarla puede completar una unidad o el curso.
  const completadasAlEmpezar = useRef(completadas);
  const insets = useSafeAreaInsets();
  // "/leccion/repaso" es la sesión de repaso: se arma una vez, al abrir, con las fichas vencidas. Junta las de
  // cada región para cambiar de modelo 3D lo menos posible.
  const esRepaso = id === "repaso";
  const [idsRepaso] = useState(() =>
    esRepaso && paquete
      ? agruparPorModelo(paquete, ejerciciosDeRepaso(progresoFichas, ejerciciosMostrables(paquete, (a) => uriImagen(a) !== null), new Date()))
      : [],
  );
  const leccion = useMemo(() => {
    if (esRepaso) return idsRepaso.length > 0 ? { id: "repaso", titulo: "Repaso", orden: 0, ejercicioIds: idsRepaso } : undefined;
    return paquete ? lecciones(paquete).find((l) => l.id === id) : undefined;
  }, [paquete, id, esRepaso, idsRepaso]);
  const ejercicios = useMemo(
    () => (paquete && leccion ? ejerciciosDeLeccion(paquete, leccion, (archivo) => uriImagen(archivo) !== null) : []),
    [paquete, leccion],
  );
  const porId = useMemo(() => new Map(ejercicios.map((e) => [e.id, e])), [ejercicios]);
  const imagenes = useMemo(() => new Map((paquete?.imagenes ?? []).map((i) => [i.id, i])), [paquete]);
  const nombres = useMemo(() => new Map((paquete?.fichas ?? []).map((f) => [f.id, f.nombre.principal])), [paquete]);

  // Archivos que terminan de bajar con la lección abierta: el 3D se suma en cuanto llega su modelo.
  const [descargados, setDescargados] = useState(0);
  useEffect(() => alDescargarArchivo(() => setDescargados((n) => n + 1)), []);
  // Si falta algún modelo de la lección, se pide ya, sin esperar su turno en la descarga de fondo.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const claves = new Set(ejercicios.flatMap((e) => {
      const m = "imagenId" in e ? imagenes.get(e.imagenId)?.modelo3d : undefined;
      return m ? [m.datos, m.archivo] : [];
    }));
    for (const c of claves) descargarImagen(c).catch(() => {});
  }, [ejercicios, imagenes]);
  // El modelo 3D de cada ejercicio de imagen cuyos dos archivos ya están en el teléfono. En web va todo con
  // imágenes. La región para el indicador de vista sale del título de la imagen ("Muslo derecho, vista anterior…").
  // Si nada cambió devuelve el mismo Map: bajar otros archivos no debe reiniciar la presentación.
  const anteriores = useRef(new Map<string, EscenaModelo>());
  const disponibles = useMemo(() => {
    const m = new Map<string, EscenaModelo>();
    if (Platform.OS !== "web") {
      for (const e of ejercicios) {
        const imagen = "imagenId" in e ? imagenes.get(e.imagenId) : undefined;
        const modelo = imagen?.modelo3d;
        if (modelo && uriImagen(modelo.archivo) && uriImagen(modelo.datos)) m.set(e.id, { modelo, region: imagen.titulo.split(",")[0].trim().toLowerCase() });
      }
    }
    const antes = anteriores.current;
    if (m.size !== antes.size || [...m].some(([id, v]) => antes.get(id)?.modelo !== v.modelo)) anteriores.current = m;
    return anteriores.current;
    // `descargados` no se lee: avisa que uriImagen puede responder distinto.
  }, [ejercicios, imagenes, descargados]);
  // Los que usa la lección: `disponibles`, pero un modelo que llega cuando ya se eligió una respuesta espera a la pregunta siguiente.
  const [modelos, setModelos] = useState(disponibles);
  // El de la lección, para la presentación (el repaso no tiene).
  const modeloLeccion = useMemo(() => (esRepaso ? undefined : ejercicios.map((e) => modelos.get(e.id)).find((m) => m !== undefined)), [esRepaso, ejercicios, modelos]);
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
      const d = modeloLeccion ? en3D(e, imagen, modeloLeccion.modelo.archivo) : null;
      if (!d || !imagen || musculos.has(d.estructura)) continue;
      const fichaId = Object.entries(imagen.modelo3d?.estructuras ?? {}).find(([, s]) => s === d.estructura)?.[0];
      musculos.set(d.estructura, { estructura: d.estructura, nombre: (fichaId && nombres.get(fichaId)) || d.estructura });
      ocultas = d.ocultas;
    }
    return { musculos: [...musculos.values()], ocultas };
  }, [ejercicios, imagenes, nombres, modeloLeccion]);
  /** null mientras se lee si ya se vio. Sale sola la primera vez; después, con el ▶ de la barra. */
  const [presentando, setPresentando] = useState<boolean | null>(null);
  /** Ya se respondió algo: si el modelo llega después, la presentación queda para el ▶ de la barra. */
  const empezada = useRef(false);
  useEffect(() => {
    if (!leccion || esRepaso || recorrido.musculos.length === 0) return setPresentando(false);
    if (empezada.current) return;
    leerJson<string[]>(CLAVE_PRESENTACIONES).then(
      (vistas) => setPresentando(!(vistas ?? []).includes(leccion.id)),
      () => setPresentando(false),
    );
  }, [leccion, recorrido, esRepaso]);
  // Si el 3D falla, no hay presentación: la lección sigue con las imágenes.
  useEffect(() => {
    if (fallo3D) setPresentando(false);
  }, [fallo3D]);

  const [sesion, setSesion] = useState(() => iniciar(ejercicios.map((e) => e.id)));
  // Al abrir la lección antes de que cargue el paquete (por ejemplo, al recargar en web), la sesión
  // empieza vacía: se arma cuando llegan los ejercicios.
  useEffect(() => {
    if (sesion.cola.length === 0 && ejercicios.length > 0) setSesion(iniciar(ejercicios.map((e) => e.id)));
  }, [ejercicios, sesion.cola.length]);
  const [eleccion, setEleccion] = useState<Eleccion | null>(null);
  const [comprobado, setComprobado] = useState(false);
  const [elogio, setElogio] = useState(ELOGIOS[0]);
  const [reportando, setReportando] = useState(false);
  /** Ejercicios ya reportados en esta sesión: en la repetición del final no se ofrece de nuevo. */
  const [reportados, setReportados] = useState<string[]>([]);
  const inicio = useRef(Date.now());
  empezada.current = sesion.indice > 0 || comprobado;
  useEffect(() => {
    if (!eleccion && !comprobado) setModelos(disponibles);
  }, [disponibles, eleccion, comprobado]);

  // Una sesión vacía no está terminada: todavía no empezó.
  const fin = sesion.cola.length > 0 && terminada(sesion);
  // Eventos de uso (PRD, "Medición de la beta"): una vez al empezar la lección y una al terminar.
  const sesionIniciada = useRef(false);
  useEffect(() => {
    if (esRepaso || !leccion || ejercicios.length === 0 || sesionIniciada.current) return;
    sesionIniciada.current = true;
    void registrarEvento("leccion_iniciada", { leccionId: leccion.id });
  }, [esRepaso, leccion, ejercicios.length, registrarEvento]);
  const sesionCerrada = useRef(false);
  useEffect(() => {
    if (!fin || !leccion || ejercicios.length === 0 || sesionCerrada.current) return;
    sesionCerrada.current = true;
    const r = resultado(sesion);
    void registrarEvento(esRepaso ? "repaso_completado" : "leccion_completada", {
      ...(!esRepaso && { leccionId: leccion.id }),
      aciertos: r.aciertos,
      total: r.total,
      ms: r.ms,
    });
    // Una calificación por ficha con ts-fsrs (también en el repaso), y la lección queda completada.
    terminarSesion(sesion.respuestas);
    if (!esRepaso) void completar(leccion.id, { aciertos: r.aciertos, total: r.total });
    efecto("fin");
  }, [fin, leccion, ejercicios.length, completar, terminarSesion, registrarEvento, esRepaso, sesion]);

  if (!paquete || (ejercicios.length > 0 && sesion.cola.length === 0)) {
    return (
      <SafeAreaView style={estilos.centro}>
        <ActivityIndicator size="large" color={color.marca} />
      </SafeAreaView>
    );
  }

  if (!leccion || ejercicios.length === 0) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.aviso}>{esRepaso ? "No tienes fichas por repasar ahora." : "Esta lección ya no está disponible."}</Text>
        <Boton titulo="Volver" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (fin) {
    const r = resultado(sesion);
    const hoy = diaDeEstudio(new Date());
    // Con esta sesión ya contada: terminarSesion corre después de este render (y contar dos veces no suma).
    const dias = rachaVigente(registrarActividad(racha, hoy), hoy);
    const subio = dias > rachaVigente(rachaAlEmpezar.current, hoy);
    const ganadas = estrellas(r.aciertos, r.total);
    const antes = marcaAlEmpezar.current;
    const record = !!antes && esMejorMarca({ leccionId: leccion.id, ...r, logrado: new Date().toISOString() }, antes);
    // Otra vuelta a la misma lección, para mejorar la marca: la sesión empieza de cero.
    const repetir = () => {
      marcaAlEmpezar.current = record || !antes ? { leccionId: leccion.id, aciertos: r.aciertos, total: r.total, logrado: new Date().toISOString() } : antes;
      rachaAlEmpezar.current = racha;
      completadasAlEmpezar.current = [...completadasAlEmpezar.current, leccion.id];
      sesionIniciada.current = false;
      sesionCerrada.current = false;
      setSesion(iniciar(ejercicios.map((e) => e.id)));
      setEleccion(null);
      setComprobado(false);
      setReportados([]);
      inicio.current = Date.now();
    };
    return (
      <SafeAreaView style={estilos.centro}>
        {esRepaso ? (
          <Icono nombre="trofeo" tam={96} peso="duotone" color={color.logro} />
        ) : (
          <Estrellas cuantas={ganadas} tam={64} />
        )}
        <Text style={estilos.tituloResultado} accessibilityRole="header">{esRepaso ? "¡Repaso completado!" : "¡Lección completada!"}</Text>
        {!esRepaso && antes && (
          <Text style={[estilos.marca, record && estilos.record]} accessibilityLiveRegion="polite">
            {record ? `¡Nuevo récord! Antes: ${antes.aciertos}/${antes.total}` : `Tu mejor marca: ${antes.aciertos}/${antes.total}`}
          </Text>
        )}
        <View style={estilos.cifras}>
          <View style={[estilos.cifra, { borderColor: color.logro }]}>
            <Text style={[estilos.etiqueta, { backgroundColor: color.logro, color: color.logroTexto }]}>Aciertos</Text>
            <Text style={[estilos.valor, { color: color.logroTexto }]}>{r.aciertos}/{r.total}</Text>
          </View>
          <View style={[estilos.cifra, { borderColor: color.marca }]}>
            <Text style={[estilos.etiqueta, { backgroundColor: color.marcaSombra }]}>Tiempo</Text>
            <Text style={[estilos.valor, { color: color.marcaTexto }]}>{formatoTiempo(r.ms)}</Text>
          </View>
        </View>
        <View style={estilos.filaRacha}>
          <Icono nombre="racha" tam={subio ? 24 : 20} peso="fill" color={color.coral} />
          <Text style={[estilos.racha, subio && estilos.rachaSubio]} accessibilityLiveRegion="polite">
            {subio ? (dias === 1 ? "¡Empezaste una racha!" : `¡${dias} días seguidos!`) : `Racha de ${dias} ${dias === 1 ? "día" : "días"}`}
          </Text>
        </View>
        <Boton
          titulo="Continuar"
          onPress={async () => {
            // Premium aparece sola al terminar el curso, una unidad o la tercera lección (docs/PLAN-PREMIUM.md).
            const oferta =
              !esRepaso && usuario ? await ofertaParaMostrar(usuario.id, ofertasAlTerminar(paquete, leccion.id, completadasAlEmpezar.current), hoy) : null;
            if (oferta) router.replace({ pathname: "/premium", params: { origen: oferta.origen, ...(oferta.logro && { logro: oferta.logro }) } });
            else router.back();
          }}
        />
        {!esRepaso && ganadas < 3 && <Boton titulo="Repetir para sumar estrellas" variante="secundario" onPress={repetir} />}
      </SafeAreaView>
    );
  }

  const ejercicio = porId.get(actual(sesion)!)!;
  const imagen = "imagenId" in ejercicio ? imagenes.get(ejercicio.imagenId) : undefined;
  // La escena carga el modelo del ejercicio actual o, si este no es 3D, el del próximo que lo sea, para que
  // esté listo al llegar. En la presentación, el de la lección. En el repaso cambia de región entre ejercicios.
  const escenaModelo = presentando ? modeloLeccion : sesion.cola.slice(sesion.indice).map((i) => modelos.get(i)).find((m) => m !== undefined);
  const d3 = escenaModelo && !fallo3D ? en3D(ejercicio, imagen, escenaModelo.modelo.archivo) : null;
  const props = { comprobado, onElegir: setEleccion };

  function comprobar() {
    if (!eleccion) return;
    const ms = Date.now() - inicio.current;
    setSesion((s) => responder(s, eleccion.correcto, ms));
    registrarIntento({ ejercicioId: ejercicio.id, correcto: eleccion.correcto, ms });
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
          <Icono nombre="cerrar" tam={26} color={color.tenue} />
        </Pressable>
        <View style={estilos.progreso} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progreso(sesion) * 100) }}>
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
              <Icono nombre="ver" tam={14} peso="fill" color={color.marcaTexto} />
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
        {escenaModelo && !fallo3D && (
          <View
            style={(presentando || (d3 && presentando === false)) && hueco ? { position: "absolute", left: hueco.x, top: hueco.y, width: hueco.width, height: hueco.height } : estilos.escondida}
            pointerEvents={presentando || d3 ? "auto" : "none"}
          >
            <EscenaLeccion
              key={escenaModelo.modelo.archivo}
              ref={escena}
              modelo={escenaModelo.modelo}
              region={escenaModelo.region}
              onToque={(t) => alTocar.current?.(t)}
              onListo={onListo3D}
              onError={onError3D}
            />
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
                <Icono nombre={eleccion.correcto ? "check" : "cerrar"} tam={20} peso={eleccion.correcto ? "fill" : "bold"} color="#fff" />
              </View>
              <Text style={[estilos.retroTitulo, { color: eleccion.correcto ? color.verde : color.rojo }]}>
                {eleccion.correcto ? elogio : "Casi…"}
              </Text>
              <View style={{ flex: 1 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={reportados.includes(ejercicio.id) ? "Reporte enviado" : "Reportar un error en este ejercicio"}
                disabled={reportados.includes(ejercicio.id)}
                onPress={() => setReportando(true)}
                hitSlop={8}
                style={estilos.botonReportar}
              >
                <View style={estilos.filaReportar}>
                  <Icono
                    nombre={reportados.includes(ejercicio.id) ? "check" : "reportar"}
                    tam={16}
                    peso={reportados.includes(ejercicio.id) ? "fill" : "bold"}
                    color={color.tenue}
                  />
                  <Text style={estilos.reportar}>{reportados.includes(ejercicio.id) ? "Reportado" : "Reportar"}</Text>
                </View>
              </Pressable>
            </View>
            {!eleccion.correcto && eleccion.detalle && <Text style={estilos.detalle}>{eleccion.detalle}</Text>}
            <Text style={estilos.explicacion}>{ejercicio.explicacion}</Text>
          </View>
        )}
        <Boton
          titulo={comprobado ? "Continuar" : "Comprobar"}
          variante={comprobado && eleccion ? (eleccion.correcto ? "exito" : "error") : "principal"}
          deshabilitado={!comprobado && !eleccion}
          onPress={comprobado ? continuar : comprobar}
        />
      </View>}
      <ReportarError
        ejercicioId={ejercicio.id}
        visible={reportando}
        onCerrar={() => setReportando(false)}
        onEnviado={() => {
          setReportando(false);
          setReportados((r) => [...r, ejercicio.id]);
        }}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", padding: espacio.l, gap: espacio.l, backgroundColor: color.fondo },
  aviso: { fontSize: 17, fontFamily: fuente.media, color: color.tenue, textAlign: "center" },
  barra: { flexDirection: "row", alignItems: "center", gap: espacio.s, paddingHorizontal: espacio.m, paddingVertical: espacio.s },
  cerrar: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: "center", justifyContent: "center" },
  botonVer: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.marcaSuave, borderWidth: 2, borderColor: color.marca, alignItems: "center", justifyContent: "center" },
  progreso: { flex: 1, height: 16, borderRadius: 8, backgroundColor: color.borde, overflow: "hidden" },
  relleno: { height: "100%", backgroundColor: color.marca, borderRadius: 8 },
  brillo: { position: "absolute", left: 8, right: 8, top: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" },
  repaso: { fontSize: 14, fontFamily: fuente.negrita, color: color.coralTexto, paddingHorizontal: espacio.m },
  ejercicio: { padding: espacio.m, paddingBottom: espacio.l },
  escondida: { position: "absolute", left: -10, top: 0, width: 1, height: 1, opacity: 0 },
  pie: { paddingHorizontal: espacio.m, paddingTop: espacio.m, borderTopWidth: 2, borderTopColor: color.borde, backgroundColor: color.fondo, gap: espacio.m },
  pieBien: { backgroundColor: color.verdeSuave, borderTopColor: "transparent" },
  pieMal: { backgroundColor: color.rojoSuave, borderTopColor: "transparent" },
  retro: { gap: espacio.xs },
  filaTitulo: { flexDirection: "row", alignItems: "center", gap: espacio.s },
  sello: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  retroTitulo: { fontSize: 22, fontFamily: fuente.titulo },
  detalle: { fontSize: 16, fontFamily: fuente.negrita, color: color.rojo },
  explicacion: { fontSize: 15, fontFamily: fuente.normal, color: color.texto, lineHeight: 21 },
  botonReportar: { minHeight: TOQUE_MINIMO, justifyContent: "center", paddingHorizontal: espacio.xs },
  filaReportar: { flexDirection: "row", alignItems: "center", gap: espacio.xs },
  reportar: { fontSize: 14, fontFamily: fuente.negrita, color: color.tenue },
  tituloResultado: { fontSize: 28, fontFamily: fuente.titulo, color: color.marcaTexto, textAlign: "center" },
  cifras: { flexDirection: "row", gap: espacio.m },
  cifra: { flex: 1, borderWidth: 2, borderRadius: 16, overflow: "hidden", alignItems: "stretch" },
  etiqueta: { color: "#fff", fontSize: 14, fontFamily: fuente.negrita, textAlign: "center", paddingVertical: 4 },
  valor: { fontSize: 26, fontFamily: fuente.titulo, textAlign: "center", paddingVertical: espacio.m },
  filaRacha: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: espacio.xs },
  racha: { fontSize: 17, fontFamily: fuente.negrita, color: color.tenue, textAlign: "center" },
  rachaSubio: { fontSize: 20, fontFamily: fuente.titulo, color: color.logroTexto },
  marca: { fontSize: 16, fontFamily: fuente.negrita, color: color.tenue, textAlign: "center" },
  record: { fontSize: 18, fontFamily: fuente.titulo, color: color.logroTexto },
});
