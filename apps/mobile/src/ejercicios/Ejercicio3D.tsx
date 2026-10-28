import type { Ejercicio } from "@anatomia/contenido";
import type { OrdenVisor } from "@anatomia/visor3d";
import { useEffect, useRef, useState } from "react";
import { type LayoutRectangle, StyleSheet, Text, View } from "react-native";
import { efecto } from "../lib/efectos";
import { espacio } from "../tema";
import type { ControlEscena, Toque } from "../visor3d/EscenaLeccion";
import { ListaOpciones } from "./ListaOpciones";
import { estilosTexto } from "./OpcionMultiple";
import type { PropsEjercicio } from "./tipos";

/** Colores sobre el modelo (más vivos que los de la interfaz, porque tiñen músculo rojo). */
const ELEGIDO = "#5b5bd6";
const VERDE = "#2fbf71";
const ROJO = "#e5484d";

type TImagen = Extract<Ejercicio, { tipo: "tocar_estructura" | "identificar_imagen" }>;

/**
 * Los mismos ejercicios de tocar e identificar, sobre el modelo 3D. La escena es de la lección (dura
 * todos los ejercicios); este componente le dice qué mostrar y deja un hueco donde la lección la pone.
 *  - Tocar: tocar un músculo lo selecciona en azul (se puede cambiar). Al comprobar, el correcto queda
 *    en verde; si falló, el elegido en rojo, el resto translúcido y la cámara gira hasta el correcto.
 *  - Identificar: el músculo preguntado teñido de azul con contorno y el resto translúcido.
 */
export function Ejercicio3D({
  ejercicio: e,
  estructura,
  ocultas,
  escena,
  escenaLista,
  registrarToque,
  onHueco,
  comprobado,
  onElegir,
}: PropsEjercicio & {
  ejercicio: TImagen;
  /** Id en el modelo de la estructura que se pregunta. */
  estructura: string;
  ocultas: string[];
  escena: ControlEscena;
  /** Sube cada vez que la escena termina de cargar el modelo: entonces se vuelve a mandar todo. */
  escenaLista: number;
  registrarToque: (alTocar: ((t: Toque) => void) | null) => void;
  /** Dónde poner la escena, relativo a este componente. */
  onHueco: (hueco: LayoutRectangle) => void;
}) {
  const tocar = e.tipo === "tocar_estructura";
  const [elegida, setElegida] = useState<string | null>(null);
  const elegidaRef = useRef<string | null>(null);
  const comprobadoRef = useRef(comprobado);
  comprobadoRef.current = comprobado;

  /** Lo que la escena debe pintar según lo elegido y si ya se comprobó. */
  function pintura(sel: string | null, comp: boolean): OrdenVisor {
    if (!comp) {
      // Identificar: en su color y con solo el contorno, el músculo no se distinguía en el teléfono.
      return tocar ? { tipo: "pintar", marcas: sel ? { [sel]: ELEGIDO } : {} } : { tipo: "pintar", marcas: { [estructura]: ELEGIDO }, aislar: true };
    }
    const ok = !tocar || sel === estructura;
    return { tipo: "pintar", marcas: ok || !sel ? { [estructura]: VERDE } : { [sel]: ROJO, [estructura]: VERDE }, aislar: !tocar || !ok };
  }

  // Al montar y cada vez que la escena termina de cargar el modelo: estado completo. Si una orden se
  // perdió mientras la página cargaba, esta lo repone.
  useEffect(() => {
    escena.enviar({ tipo: "ocultar", ids: ocultas });
    escena.enviar(pintura(elegidaRef.current, comprobadoRef.current));
    escena.enviar({ tipo: "enfocar", id: estructura });
  }, [escenaLista]);

  useEffect(() => {
    if (!tocar || comprobado) return;
    registrarToque((t) => {
      elegidaRef.current = t.id;
      setElegida(t.id);
      escena.enviar(pintura(t.id, false));
      if (!t.id) return onElegir(null);
      efecto("elegir");
      const ok = t.id === estructura;
      const nombre = `${t.articulo ?? "el"} ${(t.nombre ?? t.id).toLowerCase()}`;
      onElegir({ correcto: ok, detalle: ok ? undefined : `Tocaste ${nombre}. El correcto está en verde.` });
    });
    return () => registrarToque(null);
  }, [tocar, comprobado, estructura, escena, registrarToque, onElegir]);

  useEffect(() => {
    if (!comprobado) return;
    escena.enviar(pintura(elegidaRef.current, true));
    if (tocar && elegidaRef.current !== estructura) escena.enviar({ tipo: "enfocar", id: estructura });
  }, [comprobado]);

  return (
    <View style={estilos.raiz}>
      <Text style={estilosTexto.enunciado} accessibilityRole="header">
        {tocar ? e.enunciado : "¿Qué músculo está resaltado?"}
      </Text>
      {tocar && (
        <Text style={estilosTexto.ayuda}>
          {elegida ? "Puedes tocar otro antes de comprobar." : "Gíralo con un dedo, pellizca para acercar, arrastra con dos dedos y toca el músculo."}
        </Text>
      )}
      <View style={estilos.hueco} onLayout={(ev) => onHueco(ev.nativeEvent.layout)} />
      {e.tipo === "identificar_imagen" && (
        <ListaOpciones opciones={e.opciones} correcta={e.correcta} dosColumnas comprobado={comprobado} onElegir={onElegir} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, paddingHorizontal: espacio.m, paddingTop: espacio.s, paddingBottom: espacio.m, gap: espacio.s },
  hueco: { flex: 1, minHeight: 220 },
});
