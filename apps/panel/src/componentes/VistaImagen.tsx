import { type Imagen, type Zona, zonaTocada } from "@anatomia/contenido";
import { urlArchivo } from "../api";

const puntos = (z: Zona) => z.puntos.map((p) => p.join(",")).join(" ");

/**
 * La imagen con sus zonas encima. La zona resaltada se pinta solo en su parte visible (las zonas
 * dibujadas después la tapan) y su contorno completo va punteado, como lo mostrará la app.
 */
export function VistaImagen({
  imagen,
  resaltada,
  verZonas = false,
  onElegir,
}: {
  imagen: Pick<Imagen, "id" | "titulo" | "archivo" | "ancho" | "alto" | "zonas">;
  resaltada?: string;
  verZonas?: boolean;
  /** Al tocar la imagen: la zona de más arriba bajo el toque, como en la app. */
  onElegir?: (zonaId: string | undefined) => void;
}) {
  const k = imagen.zonas.findIndex((z) => z.id === resaltada);
  const correcta = k >= 0 ? imagen.zonas[k] : undefined;
  const mascara = `visible-${imagen.id}-${resaltada}`;

  return (
    <div className="vista-imagen" style={{ aspectRatio: `${imagen.ancho} / ${imagen.alto}` }}>
      <img src={urlArchivo(imagen.archivo)} alt={imagen.titulo} />
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className={onElegir ? "elegible" : undefined}
        onClick={
          onElegir &&
          ((e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onElegir(zonaTocada([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height], imagen.zonas)?.id);
          })
        }
      >
        {verZonas && imagen.zonas.map((z) => <polygon key={z.id} points={puntos(z)} className="zona" />)}
        {correcta && (
          <>
            <mask id={mascara} maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1">
              <rect width="1" height="1" fill="black" />
              <polygon points={puntos(correcta)} fill="white" />
              {imagen.zonas.slice(k + 1).map((z) => (
                <polygon key={z.id} points={puntos(z)} fill="black" />
              ))}
            </mask>
            <polygon points={puntos(correcta)} className="zona-relleno" mask={`url(#${mascara})`} />
            <polygon points={puntos(correcta)} className="zona-contorno" />
          </>
        )}
      </svg>
    </div>
  );
}
