// Genera láminas a partir de los modelos 3D, en el mismo formato que muslo-derecho-anterior.html, para
// importarlas con `importar-lamina`. Así el dibujo 2D y el 3D salen de las mismas mallas y las zonas
// coinciden con lo que se ve.
//
//   node contenido/laminas/generar.mjs [--lamina cadera-posterior]
//
// Lee laminas.json (vista, capa profunda y músculos con zona) y textos.json (los textos de cada músculo,
// que entran como borrador de su ficha). Escribe <id>.html junto a este archivo.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { deflateSync } from "node:zlib";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "../..");
const { values } = parseArgs({ options: { lamina: { type: "string" } } });
const laminas = JSON.parse(readFileSync(join(aqui, "laminas.json"), "utf8"));
const textos = JSON.parse(readFileSync(join(aqui, "textos.json"), "utf8"));

/** Alto del dibujo en px; se rasteriza al doble y se promedia (bordes suaves). */
const ALTO = 1800;
const SS = 2;
/**
 * Un músculo lleva zona en una capa solo si ahí se ve al menos esta fracción de él y este área (en px):
 * no se pregunta por lo que casi no se ve, como un tendón que asoma detrás de otro músculo.
 */
const FRACCION_MINIMA = 0.2;
const AREA_MINIMA = 600;

// ───────────── Modelo ─────────────

function leerModelo(base) {
  const datos = JSON.parse(readFileSync(join(raiz, `${base}.json`), "utf8"));
  const bin = readFileSync(join(raiz, `${base}.bin`));
  const { lo, hi } = datos.meta;
  // Solo músculos y huesos, como en la lámina dibujada a mano: vasos, nervios y fascias (que en 3D son
  // translúcidas) taparían los músculos.
  const piezas = datos.meta.meshes.filter((m) => m.kind === "muscle" || m.kind === "bone").map((m) => {
    const q = new Uint16Array(bin.buffer, bin.byteOffset + m.p, m.v * 3);
    const n = new Int8Array(bin.buffer, bin.byteOffset + m.n, m.v * 3);
    const posiciones = new Float32Array(m.v * 3);
    for (let i = 0; i < posiciones.length; i++) posiciones[i] = lo[i % 3] + (q[i] / 65535) * (hi[i % 3] - lo[i % 3]);
    const normales = new Float32Array(m.v * 3);
    for (let i = 0; i < normales.length; i++) normales[i] = n[i] / 127;
    return { id: m.id, tipo: m.kind, posiciones, normales, indices: new Uint16Array(bin.buffer, bin.byteOffset + m.x, m.i) };
  });
  return { datos, piezas };
}

// ───────────── Vista ─────────────

const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
};
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Ejes de una cámara ortográfica que mira desde `vista` (la de escena.ts: Y arriba). */
function ejes(vista) {
  const v = norm(vista);
  const r = norm(cruz([0, 1, 0], v));
  return { r, u: cruz(v, r), v };
}

// ───────────── Rasterizado ─────────────

/** Cada estructura en su propio búfer (profundidad y normal en pantalla), a resolución ×SS. */
function rasterizar(pieza, e, escala, x0, y0, ancho, alto) {
  const W = ancho * SS, H = alto * SS;
  const pantalla = (i) => {
    const p = [pieza.posiciones[i * 3], pieza.posiciones[i * 3 + 1], pieza.posiciones[i * 3 + 2]];
    return [(punto(p, e.r) - x0) * escala * SS, (y0 - punto(p, e.u)) * escala * SS, punto(p, e.v)];
  };
  const n = pieza.posiciones.length / 3;
  const s = Array.from({ length: n }, (_, i) => pantalla(i));
  const nv = Array.from({ length: n }, (_, i) => {
    const m = [pieza.normales[i * 3], pieza.normales[i * 3 + 1], pieza.normales[i * 3 + 2]];
    return [punto(m, e.r), punto(m, e.u), punto(m, e.v)];
  });
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (const [x, y] of s) {
    minX = Math.min(minX, Math.floor(x)); minY = Math.min(minY, Math.floor(y));
    maxX = Math.max(maxX, Math.ceil(x)); maxY = Math.max(maxY, Math.ceil(y));
  }
  minX = Math.max(0, minX); minY = Math.max(0, minY); maxX = Math.min(W - 1, maxX); maxY = Math.min(H - 1, maxY);
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const prof = new Float32Array(bw * bh).fill(-Infinity);
  const normal = new Float32Array(bw * bh * 3);
  const idx = pieza.indices;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [s[idx[t]], s[idx[t + 1]], s[idx[t + 2]]];
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-9) continue;
    const tx0 = Math.max(minX, Math.floor(Math.min(a[0], b[0], c[0]))), tx1 = Math.min(maxX, Math.ceil(Math.max(a[0], b[0], c[0])));
    const ty0 = Math.max(minY, Math.floor(Math.min(a[1], b[1], c[1]))), ty1 = Math.min(maxY, Math.ceil(Math.max(a[1], b[1], c[1])));
    const [na, nb, nc] = [nv[idx[t]], nv[idx[t + 1]], nv[idx[t + 2]]];
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
        const w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
        const k = (y - minY) * bw + (x - minX);
        if (z <= prof[k]) continue;
        prof[k] = z;
        for (let q = 0; q < 3; q++) normal[k * 3 + q] = w0 * na[q] + w1 * nb[q] + w2 * nc[q];
      }
    }
  }
  return { minX, minY, bw, bh, prof, normal };
}

// ───────────── Color ─────────────

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
/** Los mismos tonos que el visor 3D; los músculos sin tono propio varían un poco alrededor del rojo base. */
function colorBase(id, tipo) {
  if (tipo !== "muscle") return hex("#e7dbc3");
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const k = (h % 1000) / 1000;
  return [0.64 + 0.13 * k, 0.23 + 0.08 * k, 0.28 + 0.08 * k];
}
const LUZ = norm([-0.45, 0.6, 1]), RELLENO = norm([0.6, 0.1, 0.5]), MEDIO = norm([LUZ[0], LUZ[1], LUZ[2] + 1]);

/** RGBA de una estructura, ya promediada a la resolución final, con su contorno oscuro. */
function pintar(r, tipo, base) {
  const { bw, bh, prof, normal } = r;
  const W = Math.ceil(bw / SS), H = Math.ceil(bh / SS);
  const acum = new Float32Array(W * H * 4);
  const lleno = (x, y) => x >= 0 && y >= 0 && x < bw && y < bh && prof[y * bw + x] > -Infinity;
  const borde = tipo === "muscle" ? [0.29, 0.09, 0.13] : [0.6, 0.55, 0.46];
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (!lleno(x, y)) continue;
      const k = y * bw + x;
      const n = norm([normal[k * 3], normal[k * 3 + 1], normal[k * 3 + 2]]);
      const dif = 0.32 + 0.62 * Math.max(0, punto(n, LUZ)) + 0.18 * Math.max(0, punto(n, RELLENO));
      const brillo = (tipo === "muscle" ? 0.16 : 0.08) * Math.pow(Math.max(0, punto(n, MEDIO)), 28);
      let c = base.map((b) => Math.min(1, b * dif + brillo));
      // Contorno: el píxel toca algo que no es de esta estructura (a 2 subpíxeles).
      if (!lleno(x - 2, y) || !lleno(x + 2, y) || !lleno(x, y - 2) || !lleno(x, y + 2)) c = c.map((v, i) => v * 0.35 + borde[i] * 0.65);
      const o = (Math.floor(y / SS) * W + Math.floor(x / SS)) * 4;
      acum[o] += c[0]; acum[o + 1] += c[1]; acum[o + 2] += c[2]; acum[o + 3] += 1;
    }
  }
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = acum[i * 4 + 3];
    if (!a) continue;
    for (let q = 0; q < 3; q++) rgba[i * 4 + q] = Math.round((acum[i * 4 + q] / a) * 255);
    rgba[i * 4 + 3] = Math.round((a / (SS * SS)) * 255);
  }
  return { rgba, W, H };
}

// ───────────── PNG ─────────────

const TABLA = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc(buf) {
  let c = -1;
  for (const b of buf) c = TABLA[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function trozo(tipo, datos) {
  const t = Buffer.concat([Buffer.from(tipo), datos]);
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(t));
  return Buffer.concat([largo, t, c]);
}
function png(rgba, W, H) {
  const filas = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) rgba.copy(filas, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(W, 0); cab.writeUInt32BE(H, 4); cab[8] = 8; cab[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo("IHDR", cab), trozo("IDAT", deflateSync(filas, { level: 9 })), trozo("IEND", Buffer.alloc(0))]);
}

// ───────────── Contornos ─────────────

/** Contorno exterior (pixeles del borde, en orden) de la mancha más grande de la máscara. */
function contorno(mascara, W, H) {
  const vista = new Uint8Array(W * H);
  let mejor = null;
  for (let i = 0; i < W * H; i++) {
    if (!mascara[i] || vista[i]) continue;
    const pila = [i], comp = [];
    vista[i] = 1;
    while (pila.length) {
      const k = pila.pop();
      comp.push(k);
      const x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = ny * W + nx;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && mascara[nk] && !vista[nk]) {
          vista[nk] = 1;
          pila.push(nk);
        }
      }
    }
    if (!mejor || comp.length > mejor.length) mejor = comp;
  }
  if (!mejor) return [];
  const en = new Uint8Array(W * H);
  for (const k of mejor) en[k] = 1;
  const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H && en[y * W + x] === 1;
  // Moore: se arranca en el primer pixel (arriba a la izquierda) y se recorre el borde en sentido horario.
  const inicio = mejor.reduce((a, b) => (b < a ? b : a));
  const sx = inicio % W, sy = (inicio / W) | 0;
  const vecinos = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const camino = [[sx, sy]];
  let [x, y] = [sx, sy], atras = 0;
  for (let paso = 0; paso < W * H * 4; paso++) {
    let hallado = false;
    for (let j = 0; j < 8; j++) {
      const d = (atras + 1 + j) % 8;
      const [dx, dy] = vecinos[d];
      if (dentro(x + dx, y + dy)) {
        x += dx; y += dy;
        atras = (d + 4) % 8;
        hallado = true;
        break;
      }
    }
    if (!hallado || (x === sx && y === sy)) break;
    camino.push([x, y]);
  }
  return camino;
}

/** Douglas–Peucker: menos puntos, con el mismo contorno a `eps` px. */
function simplificar(p, eps) {
  if (p.length < 3) return p;
  const lejos = (a, b, c) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(dx, dy) || 1;
    return Math.abs(dy * c[0] - dx * c[1] + b[0] * a[1] - b[1] * a[0]) / l;
  };
  let maxD = 0, idx = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = lejos(p[0], p[p.length - 1], p[i]);
    if (d > maxD) [maxD, idx] = [d, i];
  }
  if (maxD <= eps) return [p[0], p[p.length - 1]];
  return [...simplificar(p.slice(0, idx + 1), eps).slice(0, -1), ...simplificar(p.slice(idx), eps)];
}

// ───────────── Lámina ─────────────

function generar(cfg) {
  const { datos, piezas } = leerModelo(cfg.modelo);
  const e = ejes(cfg.vista);
  // Caja en pantalla de todo el modelo; el dibujo mide ALTO px y deja un 3 % de margen.
  let x0 = Infinity, x1 = -Infinity, y0 = -Infinity, y1 = Infinity;
  for (const p of piezas) {
    for (let i = 0; i < p.posiciones.length; i += 3) {
      const q = [p.posiciones[i], p.posiciones[i + 1], p.posiciones[i + 2]];
      x0 = Math.min(x0, punto(q, e.r)); x1 = Math.max(x1, punto(q, e.r));
      y0 = Math.max(y0, punto(q, e.u)); y1 = Math.min(y1, punto(q, e.u));
    }
  }
  const margen = 0.03 * (y0 - y1);
  x0 -= margen; x1 += margen; y0 += margen; y1 -= margen;
  const escala = ALTO / (y0 - y1);
  const ancho = Math.ceil((x1 - x0) * escala), alto = ALTO;

  // Una estructura puede tener varias mallas (las dos cabezas del gastrocnemio): se rasterizan juntas.
  const ids = [...new Set(piezas.map((p) => p.id))];
  const estructuras = ids.map((id) => {
    const mallas = piezas.filter((p) => p.id === id);
    const tipo = mallas[0].tipo;
    const W = ancho * SS, H = alto * SS;
    const prof = new Float32Array(W * H).fill(-Infinity);
    const normal = new Float32Array(W * H * 3);
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (const m of mallas) {
      const r = rasterizar(m, e, escala, x0, y0, ancho, alto);
      for (let y = 0; y < r.bh; y++) {
        for (let x = 0; x < r.bw; x++) {
          const k = y * r.bw + x, z = r.prof[k];
          if (z === -Infinity) continue;
          const gx = x + r.minX, gy = y + r.minY, g = gy * W + gx;
          if (z <= prof[g]) continue;
          prof[g] = z;
          normal.set(r.normal.subarray(k * 3, k * 3 + 3), g * 3);
          minX = Math.min(minX, gx); minY = Math.min(minY, gy); maxX = Math.max(maxX, gx); maxY = Math.max(maxY, gy);
        }
      }
    }
    // Recorte a su caja, alineada a SS para que el promedio caiga en píxeles enteros.
    minX -= minX % SS; minY -= minY % SS;
    const bw = maxX - minX + 1 + ((SS - ((maxX - minX + 1) % SS)) % SS), bh = maxY - minY + 1 + ((SS - ((maxY - minY + 1) % SS)) % SS);
    const p = new Float32Array(bw * bh).fill(-Infinity), n = new Float32Array(bw * bh * 3);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const gx = x + minX, gy = y + minY;
        if (gx >= W || gy >= H) continue;
        p[y * bw + x] = prof[gy * W + gx];
        n.set(normal.subarray((gy * W + gx) * 3, (gy * W + gx) * 3 + 3), (y * bw + x) * 3);
      }
    }
    return { id, tipo, r: { minX, minY, bw, bh, prof: p, normal: n } };
  });

  // Orden de dibujo: donde dos estructuras se pisan, la más cercana va encima. Se dibuja primero la que
  // más veces queda detrás de las que faltan.
  const delante = new Map();
  const clave = (a, b) => `${a}|${b}`;
  for (const A of estructuras) {
    for (const B of estructuras) {
      if (A === B) continue;
      const xa = Math.max(A.r.minX, B.r.minX), xb = Math.min(A.r.minX + A.r.bw, B.r.minX + B.r.bw);
      const ya = Math.max(A.r.minY, B.r.minY), yb = Math.min(A.r.minY + A.r.bh, B.r.minY + B.r.bh);
      let cuenta = 0;
      for (let y = ya; y < yb; y += 2) {
        for (let x = xa; x < xb; x += 2) {
          const za = A.r.prof[(y - A.r.minY) * A.r.bw + (x - A.r.minX)], zb = B.r.prof[(y - B.r.minY) * B.r.bw + (x - B.r.minX)];
          if (za > -Infinity && zb > -Infinity && za > zb) cuenta++;
        }
      }
      delante.set(clave(A.id, B.id), cuenta);
    }
  }
  const restantes = [...estructuras], orden = [];
  while (restantes.length) {
    let mejor = 0, puntaje = Infinity;
    restantes.forEach((A, i) => {
      const s = restantes.reduce((t, B) => (A === B ? t : t + delante.get(clave(A.id, B.id)) - delante.get(clave(B.id, A.id))), 0);
      if (s < puntaje) [puntaje, mejor] = [s, i];
    });
    orden.push(restantes.splice(mejor, 1)[0]);
  }

  // Qué se ve en cada capa (z-búfer real, a resolución final) y la zona de cada músculo.
  const musculos = cfg.zonas;
  const visible = {};
  const mascaras = {};
  for (const capa of ["superficial", "profunda"]) {
    const ocultas = new Set(capa === "profunda" ? cfg.profunda : []);
    const W = ancho, H = alto;
    const z = new Float32Array(W * H).fill(-Infinity), quien = new Int16Array(W * H).fill(-1);
    orden.forEach((s, i) => {
      if (ocultas.has(s.id)) return;
      for (let y = 0; y < s.r.bh; y += SS) {
        for (let x = 0; x < s.r.bw; x += SS) {
          const zz = s.r.prof[y * s.r.bw + x];
          if (zz === -Infinity) continue;
          const g = ((y + s.r.minY) / SS) * W + (x + s.r.minX) / SS;
          if (zz > z[g]) [z[g], quien[g]] = [zz, i];
        }
      }
    });
    visible[capa] = {};
    mascaras[capa] = {};
    orden.forEach((s, i) => {
      if (!musculos.includes(s.id) || ocultas.has(s.id)) return;
      let total = 0;
      for (let y = 0; y < s.r.bh; y += SS) for (let x = 0; x < s.r.bw; x += SS) if (s.r.prof[y * s.r.bw + x] > -Infinity) total++;
      const m = new Uint8Array(W * H);
      let ven = 0;
      for (let g = 0; g < W * H; g++) if (quien[g] === i) (m[g] = 1), ven++;
      visible[capa][s.id] = { fraccion: total ? ven / total : 0, pixeles: ven };
      mascaras[capa][s.id] = m;
    });
  }

  // Hide: solo lo que la configuración saca en la capa profunda. Las zonas van por capa (ghostsCapa): el
  // contorno de lo que se ve del músculo en esa capa, y solo si se ve lo suficiente. `ghosts` guarda la
  // zona de la capa donde más se ve, para el panel y para quien lea el formato sin capas.
  const hide = { superficial: [], profunda: cfg.profunda };
  const ghostsCapa = { superficial: {}, profunda: {} };
  const ghosts = {};
  const trazo = (m) => {
    const puntos = simplificar(contorno(m, ancho, alto), 1.2);
    return `M${puntos.map(([x, y]) => `${(x / 2).toFixed(1)},${(y / 2).toFixed(1)}`).join(" L")} Z`;
  };
  for (const id of musculos) {
    let mejor = null;
    for (const capa of ["superficial", "profunda"]) {
      const v = visible[capa][id];
      if (!v || v.fraccion < FRACCION_MINIMA || v.pixeles < AREA_MINIMA) continue;
      ghostsCapa[capa][id] = trazo(mascaras[capa][id]);
      if (!mejor || v.pixeles > visible[mejor][id].pixeles) mejor = capa;
    }
    if (mejor) ghosts[id] = ghostsCapa[mejor][id];
  }
  const sinZona = musculos.filter((id) => !ghosts[id]);

  // Dibujo: cada estructura es una imagen (PNG con transparencia) en su grupo `part`; el viewBox está a la
  // mitad de la resolución, así que al pasar a 1200 px de ancho las imágenes quedan nítidas.
  const art = orden
    .map((s) => {
      const { rgba, W, H } = pintar(s.r, s.tipo, colorBase(s.id, s.tipo));
      const x = s.r.minX / SS / 2, y = s.r.minY / SS / 2;
      const datosPng = png(rgba, W, H).toString("base64");
      return `<g class="part ${s.tipo === "muscle" ? "m" : "s"}" data-id="${s.id}"><image href="data:image/png;base64,${datosPng}" x="${x}" y="${y}" width="${W / 2}" height="${H / 2}"/></g>`;
    })
    .join("\n");

  const data = {};
  for (const s of orden) {
    const t = textos[s.id];
    // Un músculo de la lista lleva sus textos (de ahí sale el borrador de su ficha) aunque no se vea lo
    // suficiente para tener zona: así igual tiene ficha y ejercicios de texto.
    const esZona = musculos.includes(s.id);
    if (esZona && !t) throw new Error(`Falta el texto de ${s.id} en textos.json`);
    const d = datos.data[s.id] ?? { name: s.id };
    data[s.id] = esZona
      ? { name: t.name ?? d.name, art: d.art ?? "el", latin: t.latin, kind: "muscle", group: t.group, rows: t.rows, short: t.name ?? d.name }
      : { name: d.name, art: d.art ?? "el", latin: "", kind: "struct", group: d.group ?? "Referencia", rows: [], short: d.name };
  }
  const grupos = new Map();
  for (const [id, d] of Object.entries(data)) grupos.set(d.group, [...(grupos.get(d.group) ?? []), id]);
  const P = { data, groups: [...grupos], anchors: {}, ghosts, ghostsCapa, hide };

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${cfg.titulo}</title>
<!-- Generada con contenido/laminas/generar.mjs desde ${cfg.modelo} (BodyParts3D, CC BY 4.0). No editar a mano. -->
<style>
body{margin:0;background:#f4f1ea}
svg{display:block;margin:0 auto;max-height:100vh}
/* drawing */
.part image{image-rendering:auto}
.part{cursor:pointer}
</style>
</head>
<body>
<svg id="fig" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho / 2} ${alto / 2}">
<defs></defs>
<g id="art">
${art}
</g>
<g id="focus"></g>
</svg>
<script>
const P = ${JSON.stringify(P)};
</script>
</body>
</html>
`;
  writeFileSync(join(aqui, `${cfg.id}.html`), html);
  const zonas = (capa) => Object.keys(ghostsCapa[capa]).length;
  console.log(
    `${cfg.id}: ${ancho / 2}×${alto / 2}, ${orden.length} estructuras, zonas superficial ${zonas("superficial")} y profunda ${zonas("profunda")}` +
      (sinZona.length ? `; sin zona (no se ven): ${sinZona.join(", ")}` : "") +
      `, ${(html.length / 1024 / 1024).toFixed(1)} MB`,
  );
}

for (const cfg of laminas) if (!values.lamina || values.lamina === cfg.id) generar(cfg);
