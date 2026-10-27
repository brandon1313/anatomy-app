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
import { distanciaParaVer, giroMasCorto, puntosDeBusqueda, suavizar } from "./geometria";
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
  /** Tiñe (`tinte` de 0 a 1) y contornea estructuras: id → color. Con `aislar`, el resto se vuelve translúcido. */
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

/** Arma la escena del modelo dentro de `contenedor`. La escena, la luz y los materiales son los del archivo original. */
export function crearVisor(contenedor: HTMLElement, datos: DatosModelo, bin: ArrayBuffer): Visor {
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
    // Contorno propio por malla (caras traseras infladas), para poder pintarlo de azul, verde o rojo.
    const contorno = new Mesh(g, new ShaderMaterial({
      uniforms: { color: { value: new Color("#1aa3ec") }, w: { value: 0.003 } },
      vertexShader: "uniform float w; void main(){ vec3 p = position + normalize(normal) * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
      fragmentShader: "uniform vec3 color; void main(){ gl_FragColor = vec4(color, 1.0); }",
      side: BackSide,
    }));
    contorno.visible = false;
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
  function pintar(marcas: Map<string, string>, { aislar = false, tinte = 0.72 } = {}) {
    for (const p of piezas) {
      const mat = p.malla.material, color = marcas.get(p.id);
      mat.color.copy(p.base.color);
      if (color) {
        mat.color.lerp(tono.set(color), tinte);
        p.contorno.material.uniforms.color.value.set(color);
      }
      p.contorno.visible = !!color;
      if (aislar && !color) {
        mat.transparent = true;
        mat.opacity = p.tipo === "bone" ? 0.28 : 0.16;
        mat.depthWrite = false;
      } else {
        mat.transparent = p.base.transparent;
        mat.opacity = p.base.opacity;
        mat.depthWrite = p.base.depthWrite;
      }
      p.malla.renderOrder = color ? 3 : mat.transparent ? 2 : 0;
      mat.needsUpdate = true;
    }
    pedirCuadro();
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
      const elegido = hits.find((h) => !porMalla.get(h.object)?.malla.material.transparent) ?? hits[0];
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
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  return visor;
}
