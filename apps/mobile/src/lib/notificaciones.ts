import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Recordatorio } from "../repaso/recordatorio";

/**
 * Notificaciones locales con expo-notifications. Solo existe el recordatorio diario: programar uno borra el
 * anterior, así nunca hay más de uno (PRD). El permiso se pide la primera vez que hay algo que programar.
 */
const CANAL = "recordatorio";
let cola: Promise<void> = Promise.resolve();
let permiso: Promise<boolean> | null = null;

function conPermiso(): Promise<boolean> {
  permiso ??= (async () => {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted || !actual.canAskAgain) return actual.granted;
    return (await Notifications.requestPermissionsAsync()).granted;
  })().catch(() => false);
  return permiso;
}

async function programar(r: Recordatorio | null): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!r) return;
  // En Android 13+ el permiso solo se puede pedir si ya existe un canal.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL, { name: "Recordatorio diario", importance: Notifications.AndroidImportance.DEFAULT });
  }
  if (!(await conPermiso())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: r.titulo, body: r.cuerpo },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.cuando, channelId: CANAL },
  });
}

/** Deja programado solo `r` (o nada, con null). Las llamadas van en fila: dos seguidas no dejan dos avisos. */
export function programarRecordatorio(r: Recordatorio | null): Promise<void> {
  cola = cola.then(() => programar(r)).catch(() => {});
  return cola;
}
