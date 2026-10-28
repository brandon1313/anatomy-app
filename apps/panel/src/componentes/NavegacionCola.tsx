import type { EstadoRevision } from "@anatomia/contenido";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Coleccion, type RespuestaCola } from "../api";

export interface PosicionEnCola {
  /** La cola con su filtro, para volver a ella. */
  cola: string;
  anterior?: string;
  siguiente?: string;
  /** "3 de 57", o cuántos quedan si este elemento ya salió de la cola. */
  texto?: string;
}

/**
 * Dónde está este elemento en la cola de la que vino (estado y tipo van en la URL). Al aprobarlo o
 * rechazarlo sale de la cola; Siguiente sigue desde el lugar que ocupaba.
 */
export function usePosicionEnCola(coleccion: Coleccion, id: string, estadoPropio: EstadoRevision): PosicionEnCola {
  const [params] = useSearchParams();
  // Sin filtro en la URL, la cola es la del estado con que se abrió, no la del estado después de revisarlo.
  const inicial = useRef(estadoPropio);
  const estado = (params.get("estado") as EstadoRevision | null) ?? inicial.current;
  const tipo = params.get("tipo") ?? "";
  const filtro = new URLSearchParams({ estado, ...(tipo && { tipo }) });
  const { data } = useQuery({
    queryKey: ["cola", { estado, tipo }],
    queryFn: () => api<RespuestaCola>(`/admin/cola?${filtro}`),
  });

  const lista = data?.elementos.map((e) => `/${e.coleccion}/${e.id}`) ?? [];
  const actual = `/${coleccion}/${id}`;
  const vista = useRef<string[]>([]);
  if (lista.includes(actual)) vista.current = lista;
  const orden = vista.current.includes(actual) ? vista.current : lista;
  const i = orden.indexOf(actual);
  const quedan = new Set(lista);
  const conFiltro = (ruta?: string) => ruta && `${ruta}?${filtro}`;

  return {
    cola: `/cola?${filtro}`,
    siguiente: conFiltro(i < 0 ? lista[0] : orden.slice(i + 1).find((r) => quedan.has(r))),
    anterior: conFiltro(i < 0 ? undefined : orden.slice(0, i).reverse().find((r) => quedan.has(r))),
    texto: !data ? undefined : quedan.has(actual) ? `${lista.indexOf(actual) + 1} de ${lista.length}` : `quedan ${lista.length}`,
  };
}
