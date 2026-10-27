import type { Ejercicio } from "@anatomia/contenido";
import { useEffect, useRef, useState } from "react";
import { type LayoutRectangle, StyleSheet, Text, View } from "react-native";
import { efecto } from "../lib/efectos";
import { espacio } from "../tema";
import type { ControlEscena, Toque } from "../visor3d/EscenaLeccion";
import { ListaOpciones } from "./ListaOpciones";
import { estilosTexto } from "./OpcionMultiple";
import type { PropsEjercicio } from "./tipos";

const AZUL = "#1aa3ec";
const VERDE = "#4fc21a";
const ROJO = "#f04848";

type TImagen = Extract<Ejercicio, { tipo: "tocar_estructura" | "identificar_imagen" }>;

/**
 * Los mismos ejercicios de tocar e identificar, sobre el modelo 3D. La escena es de la lección (dura
 * todos los ejercicios); este componente le dice qué mostrar y deja un hueco donde la lección la pone.
 *  - Tocar: tocar un músculo lo selecciona en azul (se puede cambiar). Al comprobar, el correcto queda
 *    en verde; si falló, el elegido en rojo, el resto translúcido y la cámara gira hasta el correcto.
 *  - Identificar: el músculo preguntado en su color con contorno y el resto translúcido.
 */
export function Ejercicio3D({
  ejercicio: e,
  estructura,
  ocultas,
  escena,
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
  registrarToque: (alTocar: ((t: Toque) => void) | null) => void;
  /** Dónde poner la escena, relativo a este componente. */
  onHueco: (hueco: LayoutRectangle) => void;
}) {
  const tocar = e.tipo === "tocar_estructura";
  const [elegida, setElegida] = useState<string | null>(null);
  const elegidaRef = useRef<string | null>(null);

  useEffect(() => {
    escena.enviar({ tipo: "ocultar", ids: ocultas });
    escena.enviar(tocar ? { tipo: "pintar", marcas: {} } : { tipo: "pintar", marcas: { [estructura]: AZUL }, aislar: true, tinte: 0 });
    escena.enviar({ tipo: "enfocar", id: estructura });
    // Solo al montar: cada ejercicio es un componente nuevo (la lección le pone `key`).
  }, []);

  useEffect(() => {
    if (!tocar || comprobado) return;
    registrarToque((t) => {
      elegidaRef.current = t.id;
      setElegida(t.id);
      escena.enviar({ tipo: "pintar", marcas: t.id ? { [t.id]: AZUL } : {} });
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
    const sel = elegidaRef.current;
    const ok = !tocar || sel === estructura;
    escena.enviar({ tipo: "pintar", marcas: ok || !sel ? { [estructura]: VERDE } : { [sel]: ROJO, [estructura]: VERDE }, aislar: !tocar || !ok });
    if (!ok) escena.enviar({ tipo: "enfocar", id: estructura });
  }, [comprobado, tocar, estructura, escena]);

  return (
    <View style={estilos.raiz}>
      <Text style={estilosTexto.enunciado} accessibilityRole="header">
        {tocar ? e.enunciado : "¿Qué músculo está resaltado?"}
      </Text>
      {tocar && (
        <Text style={estilosTexto.ayuda}>
          {elegida ? "Puedes tocar otro antes de comprobar." : "Gíralo con un dedo, pellizca para acercar y toca el músculo."}
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
