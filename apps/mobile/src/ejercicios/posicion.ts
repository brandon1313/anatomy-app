import type { GestureResponderEvent } from "react-native";

/** Posición del toque relativa al elemento que lo recibe. En iOS y Android viene en locationX/Y. */
export function posicionDelToque(e: GestureResponderEvent): [number, number] {
  return [e.nativeEvent.locationX, e.nativeEvent.locationY];
}
