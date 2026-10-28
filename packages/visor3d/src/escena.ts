import {
  ACESFilmicToneMapping,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  ColorManagement,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShaderMaterial,
  Spherical,
  sRGBEncoding,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { distanciaParaVer, giroMasCorto, Ocupacion, ordenDesdeElCentro, puntosDeBusqueda, suavizar, vistaDeAngulo } from "./geometria";
import type { Vista } from "./protocolo";

/** Tipos de estructura. El modelo conserva las claves del archivo "Muslo derecho en 3D". */
export type TipoEstructura = "muscle" | "bone" | "artery" | "vein" | "nerve" | "fascia";

export interface DatosModelo {
  data: Record<string, { name: string; art: string; kind: TipoEstructura }>;
  views: Record<string, Vista>;
  hide: Record<string, string[]>;
  meta: {
    lo: [number, number, number];
    hi: [number, number, number];
    /** Por malla: vértices (v), índices (i) y en qué byte del .bin empiezan sus posiciones (p), normales (n) e índices (x). */
    meshes: { id: string; kind: TipoEstructura; v: number; i: number; p: number; n: number; x: number }[];
  };
}

export interface Visor {
  lienzo: HTMLCanvasElement;
  mallas: number;
  triangulos: number;
  /** `performance.now()` al quedar lista la luz de ambiente, para medir. */
  entornoListo: number;
  verDesde(vista: Vista, inmediato?: boolean): void;
  /**
   * Tiñe (`tinte` de 0 a 1) y contornea estructuras: id → color. Con `aislar`, los demás músculos se
   * vuelven translúcidos; los huesos quedan sólidos y con su nombre, como referencia de dónde se está.
   */
  pintar(marcas: Map<string, string>, opciones?: { aislar?: boolean; tinte?: number }): void;
  /** Oculta estas estructuras y muestra las demás; lo oculto no se puede tocar. */
  ocultar(ids: string[]): void;
  /** Gira despacio alrededor del eje vertical, aunque nadie lo toque. */
  girar(activo: boolean): void;
  /** Se llama cuando el estudiante toca sin arrastrar, con la estructura que quedó bajo el dedo o null. */
  alTocar: (id: string | null) => void;
  /** Dibuja un cuadro ya, para medir el primero. */
  dibujar(): void;
}

const TONOS: Record<string, string> = {
  sartorio: "#c45563", recto_femoral: "#bd4957", vasto_lateral: "#b1404f", vasto_medial: "#ba4553", vasto_intermedio: "#a63a48",
  tensor_fascia_lata: "#b94a5b", iliopsoas: "#ac404f", pectineo: "#bd4858", aductor_largo: "#c24e5c", aductor_corto: "#b14352",
  aductor_mayor: "#a63d4c", gracil: "#c55260", semitendinoso: "#a93e4c", semimembranoso: "#a33a48", biceps_femoral: "#ad414f",
  gluteo_mayor: "#a9404e", gluteo_medio: "#b24654",
};

const VISTAS: Record<Vista, [number, number, number]> = { ant: [0, 0, 1], med: [1, 0, 0.15], lat: [-1, 0, 0.15], post: [0, 0, -1] };
const NOMBRE_VISTA: Record<Vista, string> = { ant: "anterior", lat: "lateral", med: "medial", post: "posterior" };

/**
 * Dónde puede ir el nombre de un hueso, en orden de preferencia: primero el eje (los centros de 7 tramos
 * de su altura, del centro hacia los extremos) y después puntos de su superficie, también del centro
 * hacia los extremos. Así, si lo resaltado tapa el eje (el fémur detrás del recto femoral), el nombre
 * va en lo que sí se ve del hueso, como el trocánter o los cóndilos.
 */
function puntosDelHueso(g: BufferGeometry): Vector3[] {
  const superficie = muestraDeVertices(g, 60);
  const ys = superficie.map((p) => p.y);
  const medio = (Math.min(...ys) + Math.max(...ys)) / 2;
  superficie.sort((a, b) => Math.abs(a.y - medio) - Math.abs(b.y - medio));
  return [...puntosDelEje(g), ...superficie];
}

/** Centros de 7 tramos de la altura de un hueso, del centro hacia los extremos. */
function puntosDelEje(g: BufferGeometry, tramos = 7): Vector3[] {
  const pos = g.getAttribute("position");
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    min = Math.min(min, pos.getY(i));
    max = Math.max(max, pos.getY(i));
  }
  const suma = Array.from({ length: tramos }, () => [0, 0, 0, 0]);
  for (let i = 0; i < pos.count; i++) {
    const s = suma[Math.min(tramos - 1, Math.floor(((pos.getY(i) - min) / (max - min || 1)) * tramos))];
    s[0] += pos.getX(i);
    s[1] += pos.getY(i);
    s[2] += pos.getZ(i);
    s[3]++;
  }
  const centros = suma.filter((s) => s[3] > 0).map((s) => new Vector3(s[0] / s[3], s[1] / s[3], s[2] / s[3]));
  return ordenDesdeElCentro(centros.length).map((k) => centros[k]);
}

/** Hasta ~160 vértices de una malla: dónde está en pantalla lo resaltado, para no tapar con etiquetas. */
function muestraDeVertices(g: BufferGeometry, cuantos = 160): Vector3[] {
  const pos = g.getAttribute("position");
  const paso = Math.max(1, Math.ceil(pos.count / cuantos));
  const puntos: Vector3[] = [];
  for (let i = 0; i < pos.count; i += paso) puntos.push(new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
  return puntos;
}

interface Pieza {
  id: string;
  tipo: TipoEstructura;
  malla: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  contorno: Mesh<BufferGeometry, ShaderMaterial>;
  base: { color: Color; opacity: number; transparent: boolean; depthWrite: boolean };
}

function material(id: string, tipo: TipoEstructura): MeshPhysicalMaterial {
  const p: MeshPhysicalMaterialParameters =
    tipo === "muscle" ? { color: TONOS[id] ?? "#b4434f", roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.5 }
    : tipo === "bone" ? { color: "#e7dbc3", roughness: 0.62, clearcoat: 0.1 }
    : tipo === "artery" ? { color: "#c3242e", roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }
    : tipo === "vein" ? { color: id === "vena_safena_mayor" ? "#5a82c8" : "#3a63b0", roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.3 }
    : tipo === "nerve" ? { color: "#e3c25a", roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35 }
    : { color: "#efe7da", roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2, transparent: true, opacity: 0.62, depthWrite: false, side: DoubleSide };
  return new MeshPhysicalMaterial({ ...p, envMapIntensity: 0.35 });
}

/**
 * Arma la escena del modelo dentro de `contenedor`. La escena, la luz y los materiales son los del archivo
 * original. `region` ("muslo derecho") acompaña al indicador de vista.
 */
export function crearVisor(contenedor: HTMLElement, datos: DatosModelo, bin: ArrayBuffer, { region }: { region?: string } = {}): Visor {
  // Colores en espacio lineal, como en el archivo original (three r147). Va antes de crear cualquier color.
  ColorManagement.legacyMode = false;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  const lienzo = renderer.domElement;
  contenedor.append(lienzo);

  const escena = new Scene();
  escena.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const entornoListo = performance.now();
  const camara = new PerspectiveCamera(28, 1, 0.01, 10);
  const controles = new OrbitControls(camara, lienzo);
  Object.assign(controles, { enableDamping: true, dampingFactor: 0.09, rotateSpeed: 0.8, minDistance: 0.35, maxDistance: 3.2, enablePan: false });
  escena.add(new HemisphereLight(0xfff6f2, 0x3a2224, 0.35));
  const luces = [[0xffffff, 1.15, [-1.2, 2.2, 2.4]], [0xffe6e0, 0.3, [2.2, 0.4, 1.2]], [0xffffff, 0.55, [0.5, 1.5, -2.5]]] as const;
  for (const [color, intensidad, [x, y, z]] of luces) {
    const luz = new DirectionalLight(color, intensidad);
    luz.position.set(x, y, z);
    camara.add(luz);
  }
  escena.add(camara);

  // Mallas: posiciones cuantizadas a 16 bits dentro de la caja lo–hi, normales de 8 bits e índices de 16.
  const { lo, hi } = datos.meta;
  const tam = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  const centro = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const piezas: Pieza[] = [];
  let triangulos = 0;
  for (const m of datos.meta.meshes) {
    const q = new Uint16Array(bin, m.p, m.v * 3);
    const posiciones = new Float32Array(m.v * 3);
    for (let i = 0; i < posiciones.length; i++) {
      const e = i % 3;
      posiciones[i] = lo[e] + (q[i] / 65535) * tam[e] - centro[e];
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(posiciones, 3));
    g.setAttribute("normal", new BufferAttribute(new Int8Array(bin, m.n, m.v * 3), 3, true));
    g.setIndex(new BufferAttribute(new Uint16Array(bin, m.x, m.i), 1));
    g.computeBoundingSphere();
    const malla = new Mesh(g, material(m.id, m.kind));
    // Contorno propio por malla (caras traseras infladas), para poder pintarlo de azul, verde o rojo. Va
    // entre lo transparente y al final (renderOrder 4): ningún músculo translúcido lo cubre con su velo.
    const contorno = new Mesh(g, new ShaderMaterial({
      uniforms: { color: { value: new Color("#1aa3ec") }, w: { value: 0.003 } },
      vertexShader: "uniform float w; void main(){ vec3 p = position + normalize(normal) * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
      fragmentShader: "uniform vec3 color; void main(){ gl_FragColor = vec4(color, 1.0); }",
      side: BackSide,
      transparent: true,
    }));
    contorno.visible = false;
    contorno.renderOrder = 4;
    malla.add(contorno);
    escena.add(malla);
    const mat = malla.material;
    piezas.push({ id: m.id, tipo: m.kind, malla, contorno, base: { color: mat.color.clone(), opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite } });
    triangulos += m.i / 3;
  }
  const porMalla = new Map<Object3D, Pieza>(piezas.map((p) => [p.malla, p]));

  // Solo se dibuja cuando algo cambió: la cámara, una animación, los colores o el tamaño.
  let sucio = true;
  const pedirCuadro = () => (sucio = true);
  controles.addEventListener("change", pedirCuadro);

  // Distancia a la que el modelo entero cabe en pantalla; `ajustar` la recalcula al cambiar el tamaño.
  const ALTO = tam[1], ANCHO = Math.max(tam[0], tam[2]);
  let distancia = 1.6;
  let animacion: ((ahora: number) => void) | null = null;
  function verDesde(vista: Vista, inmediato = false) {
    // Gira alrededor del eje vertical, por el lado más corto, en vez de pasar por encima del modelo.
    const s0 = new Spherical().setFromVector3(camara.position.clone().sub(controles.target));
    const s1 = new Spherical().setFromVector3(new Vector3(...VISTAS[vista]));
    const giro = giroMasCorto(s0.theta, s1.theta);
    const objetivo0 = controles.target.clone(), t0 = performance.now(), s = new Spherical();
    animacion = (ahora) => {
      const k = inmediato ? 1 : Math.min(1, (ahora - t0) / 600), e = suavizar(k);
      s.set(s0.radius + (distancia - s0.radius) * e, s0.phi + (s1.phi - s0.phi) * e, s0.theta + giro * e);
      controles.target.copy(objetivo0).multiplyScalar(1 - e);
      camara.position.setFromSpherical(s).add(controles.target);
      if (k >= 1) animacion = null;
    };
    if (inmediato) animacion(t0);
    pedirCuadro();
  }

  function ajustar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    distancia = distanciaParaVer(ALTO, ANCHO, camara.fov, camara.aspect);
    pedirCuadro();
  }
  new ResizeObserver(ajustar).observe(contenedor);
  ajustar();

  const tono = new Color();
  let resaltadas: Pieza[] = [];
  let conReferencias = false;
  function pintar(marcas: Map<string, string>, { aislar = false, tinte = 0.72 } = {}) {
    resaltadas = piezas.filter((p) => marcas.has(p.id));
    conReferencias = aislar;
    for (const p of piezas) {
      const mat = p.malla.material, color = marcas.get(p.id);
      mat.color.copy(p.base.color);
      if (color) {
        mat.color.lerp(tono.set(color), tinte);
        p.contorno.material.uniforms.color.value.set(color);
      }
      p.contorno.visible = !!color;
      if (aislar && !color && p.tipo !== "bone") {
        mat.transparent = true;
        mat.opacity = 0.16;
        mat.depthWrite = false;
      } else if (aislar && color) {
        // Se dibuja después de los translúcidos (que no escriben profundidad): un músculo de una capa
        // profunda se ve completo, no detrás del velo de los que lo tapan. Un hueso delante sí lo tapa.
        mat.transparent = true;
        mat.opacity = p.base.opacity;
        mat.depthWrite = true;
      } else {
        // Sin aislar, o un hueso al aislar: tal cual, sólido.
        mat.transparent = p.base.transparent;
        mat.opacity = p.base.opacity;
        mat.depthWrite = p.base.depthWrite;
      }
      p.malla.renderOrder = color ? 3 : mat.transparent ? 2 : 0;
      mat.needsUpdate = true;
    }
    pedirCuadro();
  }

  // Referencias (al aislar): el nombre de cada hueso, donde no tape lo resaltado. Siempre: desde dónde se mira.
  const capaEtiquetas = document.createElement("div");
  capaEtiquetas.className = "etiquetas";
  const indicador = document.createElement("div");
  indicador.className = "vista";
  const guiasSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  guiasSvg.setAttribute("class", "guias");
  capaEtiquetas.append(guiasSvg);
  contenedor.append(capaEtiquetas, indicador);
  const etiquetas = piezas
    .filter((p) => p.tipo === "bone")
    .map((p) => {
      const el = document.createElement("div");
      el.className = "etiqueta";
      el.textContent = datos.data[p.id]?.name ?? p.id;
      capaEtiquetas.append(el);
      return { pieza: p, el, candidatos: puntosDelHueso(p.malla.geometry), vertices: muestraDeVertices(p.malla.geometry, Infinity) };
    });
  const muestras = new Map<Pieza, Vector3[]>();
  const proyectado = new Vector3(), orbita = new Spherical();

  function anotar() {
    orbita.setFromVector3(proyectado.copy(camara.position).sub(controles.target));
    const texto = `Vista ${NOMBRE_VISTA[vistaDeAngulo(orbita.theta)]}${region ? ` · ${region}` : ""}`;
    if (indicador.textContent !== texto) indicador.textContent = texto;

    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    capaEtiquetas.style.display = conReferencias ? "" : "none";
    if (!conReferencias || !w || !h) return;
    const enPantalla = (q: Vector3): [number, number] => {
      proyectado.copy(q).project(camara);
      return [((proyectado.x + 1) / 2) * w, ((1 - proyectado.y) / 2) * h];
    };
    const ocupado = new Ocupacion(w, h);
    ocupado.marcar(0, 0, indicador.offsetWidth + 16, indicador.offsetHeight + 16);
    for (const p of resaltadas) {
      if (!muestras.has(p)) muestras.set(p, muestraDeVertices(p.malla.geometry));
      for (const q of muestras.get(p)!) {
        const [x, y] = enPantalla(q);
        ocupado.marcar(x - 9, y - 9, 18, 18);
      }
    }
    // Profundidad aproximada de los huesos (la distancia más corta a la cámara por celda de 10 px): un punto
    // de un hueso tapado por otro (la rótula, mirando desde atrás) no lleva nombre.
    const celda = (x: number, y: number) => Math.floor(y / 10) * 100000 + Math.floor(x / 10);
    const cercania = new Map<number, number>();
    for (const e of etiquetas) {
      if (!e.pieza.malla.visible) continue;
      for (const q of e.vertices) {
        const [x, y] = enPantalla(q);
        const c = celda(x, y), d = q.distanceTo(camara.position);
        if (!(cercania.get(c)! <= d)) cercania.set(c, d);
      }
    }
    const seVe = (q: Vector3, x: number, y: number) => q.distanceTo(camara.position) <= (cercania.get(celda(x, y)) ?? Infinity) + 0.02;

    // Cada nombre va sobre un punto visible del hueso que lo resaltado no tapa: encima del punto si cabe y,
    // si no, a un lado, con un punto en el hueso y una línea hasta el nombre.
    const guias: string[] = [];
    for (const e of etiquetas) {
      const ew = e.el.offsetWidth || 60, eh = e.el.offsetHeight || 18;
      let lugar: { x: number; y: number; px: number; py: number } | undefined;
      for (const q of e.pieza.malla.visible ? e.candidatos : []) {
        const [px, py] = enPantalla(q);
        if (!seVe(q, px, py) || !ocupado.libre(px - 3, py - 3, 6, 6)) continue;
        const opciones: [number, number][] = [
          [px - ew / 2, py - eh / 2],
          [px + 14, py - eh / 2],
          [px - 14 - ew, py - eh / 2],
          [px - ew / 2, py - 14 - eh],
          [px - ew / 2, py + 14],
        ];
        const libre = opciones.find(([x, y]) => ocupado.libre(x, y, ew, eh));
        if (libre) {
          lugar = { x: libre[0], y: libre[1], px, py };
          break;
        }
      }
      e.el.style.visibility = lugar ? "visible" : "hidden";
      if (!lugar) continue;
      e.el.style.transform = `translate(${Math.round(lugar.x)}px, ${Math.round(lugar.y)}px)`;
      ocupado.marcar(lugar.x - 4, lugar.y - 2, ew + 8, eh + 4);
      const cx = lugar.x + ew / 2, cy = lugar.y + eh / 2;
      if (Math.hypot(cx - lugar.px, cy - lugar.py) > 4) {
        // La línea llega al borde del nombre más cercano al punto, no a su centro.
        const bx = Math.min(Math.max(lugar.px, lugar.x), lugar.x + ew), by = Math.min(Math.max(lugar.py, lugar.y), lugar.y + eh);
        guias.push(`<line x1="${lugar.px}" y1="${lugar.py}" x2="${bx}" y2="${by}"/><circle cx="${lugar.px}" cy="${lugar.py}" r="2.5"/>`);
        ocupado.marcar(Math.min(lugar.px, bx) - 2, Math.min(lugar.py, by) - 2, Math.abs(bx - lugar.px) + 4, Math.abs(by - lugar.py) + 4);
      }
    }
    guiasSvg.innerHTML = guias.join("");
  }

  const visor: Visor = {
    lienzo,
    mallas: piezas.length,
    triangulos,
    entornoListo,
    verDesde,
    pintar,
    ocultar(ids) {
      for (const p of piezas) p.malla.visible = !ids.includes(p.id);
      pedirCuadro();
    },
    girar(activo) {
      // Una vuelta cada ~50 s: se nota el volumen sin que el músculo mostrado salga de la vista.
      Object.assign(controles, { autoRotate: activo, autoRotateSpeed: 1.2 });
    },
    alTocar: () => {},
    dibujar: () => renderer.render(escena, camara),
  };

  // Toque: arrastrar o usar dos dedos es girar o acercar, no tocar.
  const rayo = new Raycaster(), ndc = new Vector2(), objetos = piezas.map((p) => p.malla);
  let abajo: { x: number; y: number; t: number; giro: boolean } | null = null, dedos = 0;
  lienzo.addEventListener("pointerdown", (e) => {
    if (++dedos > 1) {
      if (abajo) abajo.giro = true;
      return;
    }
    abajo = { x: e.clientX, y: e.clientY, t: performance.now(), giro: false };
  });
  lienzo.addEventListener("pointermove", (e) => {
    if (abajo && !abajo.giro && Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > 8) {
      abajo.giro = true;
      animacion = null;
    }
  });
  lienzo.addEventListener("pointercancel", () => {
    dedos = Math.max(0, dedos - 1);
    abajo = null;
  });
  lienzo.addEventListener("pointerup", (e) => {
    dedos = Math.max(0, dedos - 1);
    if (!abajo) return;
    const { giro, t } = abajo;
    abajo = null;
    if (giro || performance.now() - t > 600) return;
    visor.alTocar(estructuraEn(e.clientX, e.clientY));
  });
  lienzo.addEventListener("wheel", () => (animacion = null), { passive: true });

  /** Lo que queda bajo el punto, primero lo sólido (el vasto lateral antes que el tracto iliotibial translúcido). */
  function estructuraEn(x: number, y: number): string | null {
    const r = lienzo.getBoundingClientRect();
    for (const [px, py] of puntosDeBusqueda(x, y)) {
      ndc.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
      rayo.setFromCamera(ndc, camara);
      const hits = rayo.intersectObjects(objetos.filter((o) => o.visible), false);
      // Sólido es opacidad completa: lo resaltado al aislar va en la pasada transparente, pero no es translúcido.
      const elegido = hits.find((h) => (porMalla.get(h.object)?.malla.material.opacity ?? 0) >= 0.99) ?? hits[0];
      if (elegido) return porMalla.get(elegido.object)?.id ?? null;
    }
    return null;
  }

  function bucle(ahora: number) {
    if (animacion) {
      animacion(ahora);
      sucio = true;
    }
    if (controles.update()) sucio = true;
    if (sucio) {
      sucio = false;
      renderer.render(escena, camara);
      anotar();
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  return visor;
}
