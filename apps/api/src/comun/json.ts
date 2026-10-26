/** JSON con las llaves ordenadas: Postgres guarda el JSONB con otro orden que el original. */
export function jsonCanonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonCanonico).join(",")}]`;
  if (v && typeof v === "object") {
    const pares = Object.entries(v)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${pares.map(([k, x]) => `${JSON.stringify(k)}:${jsonCanonico(x)}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** ¿Mismo contenido, sin importar el orden de las llaves? */
export const mismoJson = (a: unknown, b: unknown) => jsonCanonico(a) === jsonCanonico(b);
