import * as SecureStore from "expo-secure-store";

/** Tokens en el llavero del sistema (Keychain / Keystore). */
export const leerSecreto = (clave: string) => SecureStore.getItemAsync(clave);
export const guardarSecreto = (clave: string, valor: string) => SecureStore.setItemAsync(clave, valor);
export const borrarSecreto = (clave: string) => SecureStore.deleteItemAsync(clave);
