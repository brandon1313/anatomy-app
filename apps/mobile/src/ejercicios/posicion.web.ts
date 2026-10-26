import type { GestureResponderEvent } from "react-native";

/**
 * En web, Pressable entrega el clic del navegador (MouseEvent), que no trae locationX/Y: la posición
 * se calcula con el rectángulo del elemento que recibió el clic.
 */
export function posicionDelToque(e: GestureResponderEvent): [number, number] {
  const clic = e.nativeEvent as unknown as MouseEvent;
  const r = (e.currentTarget as unknown as Element).getBoundingClientRect();
  return [clic.clientX - r.left, clic.clientY - r.top];
}
