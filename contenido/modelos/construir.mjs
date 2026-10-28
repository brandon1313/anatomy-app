// Arma los modelos 3D de las regiones de regiones.json a partir de las mallas de BodyParts3D, en el mismo
// formato que el del muslo (prototipos/modelo.json y .bin), para importarlos con `importar-modelo`.
//
//   node contenido/modelos/construir.mjs --obj <carpeta isa_BP3D_4.0_obj_99> [--region cadera-derecha]
//
// Las mallas salen del paquete oficial isa_BP3D_4.0_obj_99.zip (ver FUENTES.md); no se guardan en el repo.
// Escribe <region>.json y <region>.bin junto a este archivo.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const aqui = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({ options: { obj: { type: "string" }, region: { type: "string" } } });
if (!values.obj) {
  console.error("Uso: node contenido/modelos/construir.mjs --obj <carpeta con los .obj> [--region <id>]");
  process.exit(1);
}
const regiones = JSON.parse(readFileSync(join(aqui, "regiones.json"), "utf8"));

/**
 * BodyParts3D está en milímetros, con Z hacia arriba y Y hacia atrás. El modelo del muslo está en metros,
 * con Y hacia arriba y Z hacia adelante, y corrido: los desplazamientos salen de comparar el glúteo medio,
 * el fémur y el hueso coxal, que están en los dos. Así las regiones quedan en el mismo marco que el muslo.
 */
const aModelo = ([x, y, z]) => [x / 1000, z / 1000 + 0.0781, -y / 1000 - 0.0999];

/**
 * Vértices y triángulos de un .obj. Con `desdeZmm` o `hastaZmm` quedan solo los triángulos dentro de esa
 * altura (en mm de BodyParts3D): así un hueso largo se recorta a lo que importa en la región.
 */
function leerObj(ruta, desdeZmm = -Infinity, hastaZmm = Infinity) {
  const crudos = [];
  const caras = [];
  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
    if (linea.startsWith("v ")) crudos.push(linea.trim().split(/\s+/).slice(1, 4).map(Number));
    else if (linea.startsWith("f ")) {
      const idx = linea.trim().split(/\s+/).slice(1).map((t) => Number(t.split("/")[0]) - 1);
      for (let k = 1; k + 1 < idx.length; k++) caras.push([idx[0], idx[k], idx[k + 1]]);
    }
  }
  const usadas = caras.filter((c) => c.every((i) => crudos[i][2] >= desdeZmm && crudos[i][2] <= hastaZmm));
  // Solo los vértices que usan los triángulos que quedan, renumerados.
  const nuevo = new Map();
  const vertices = [];
  const triangulos = usadas.map((c) =>
    c.map((i) => {
      if (!nuevo.has(i)) {
        nuevo.set(i, vertices.length);
        vertices.push(aModelo(crudos[i]));
      }
      return nuevo.get(i);
    }),
  );
  return { vertices, triangulos };
}

/** Normal de cada vértice: el promedio de las de sus triángulos, ponderado por área. */
function normales(vertices, triangulos) {
  const n = vertices.map(() => [0, 0, 0]);
  for (const [a, b, c] of triangulos) {
    const [pa, pb, pc] = [vertices[a], vertices[b], vertices[c]];
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
    const v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
    const cruz = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const i of [a, b, c]) for (let e = 0; e < 3; e++) n[i][e] += cruz[e];
  }
  return n.map((m) => {
    const largo = Math.hypot(...m) || 1;
    return m.map((x) => x / largo);
  });
}

function construir(id, region) {
  const mallas = region.piezas.map((p) => ({ ...p, ...leerObj(join(values.obj, p.archivo), p.desdeZmm, p.hastaZmm) }));
  for (const m of mallas) if (m.vertices.length > 65535) throw new Error(`${m.archivo} tiene más de 65535 vértices`);
  const todos = mallas.flatMap((m) => m.vertices);
  const lo = [0, 1, 2].map((e) => Math.min(...todos.map((p) => p[e])));
  const hi = [0, 1, 2].map((e) => Math.max(...todos.map((p) => p[e])));

  // Por malla: posiciones cuantizadas a 16 bits dentro de lo–hi, normales de 8 bits e índices de 16, como
  // las lee packages/visor3d (escena.ts). Los índices van alineados a 2 bytes.
  const partes = [];
  const meshes = [];
  let desplazamiento = 0;
  for (const m of mallas) {
    const pos = new Uint16Array(m.vertices.length * 3);
    m.vertices.forEach((p, i) => p.forEach((x, e) => (pos[i * 3 + e] = Math.round(((x - lo[e]) / (hi[e] - lo[e])) * 65535))));
    const nor = new Int8Array(m.vertices.length * 3);
    normales(m.vertices, m.triangulos).forEach((v, i) => v.forEach((x, e) => (nor[i * 3 + e] = Math.round(x * 127))));
    const idx = new Uint16Array(m.triangulos.flat());
    const p = desplazamiento;
    const n = p + pos.byteLength;
    const relleno = (n + nor.byteLength) % 2;
    const x = n + nor.byteLength + relleno;
    desplazamiento = x + idx.byteLength;
    partes.push(Buffer.from(pos.buffer), Buffer.from(nor.buffer), Buffer.alloc(relleno), Buffer.from(idx.buffer));
    meshes.push({ id: m.id, kind: region.data[m.id].kind, src: m.fuente, v: m.vertices.length, i: idx.length, p, n, x });
  }

  const data = Object.fromEntries(Object.entries(region.data).map(([k, d]) => [k, { short: d.name, rows: [], ...d }]));
  const grupos = new Map();
  for (const [k, d] of Object.entries(region.data)) grupos.set(d.group, [...(grupos.get(d.group) ?? []), k]);
  const json = { data, groups: [...grupos], views: region.views, hide: region.hide, meta: { lo, hi, meshes } };
  writeFileSync(join(aqui, `${id}.json`), JSON.stringify(json));
  writeFileSync(join(aqui, `${id}.bin`), Buffer.concat(partes));
  const triangulos = meshes.reduce((t, m) => t + m.i / 3, 0);
  console.log(`${id}: ${meshes.length} mallas, ${triangulos} triángulos, ${(desplazamiento / 1024 / 1024).toFixed(2)} MB`);
}

for (const [id, region] of Object.entries(regiones)) if (!values.region || values.region === id) construir(id, region);
