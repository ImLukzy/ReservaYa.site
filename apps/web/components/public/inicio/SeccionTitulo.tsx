import type { ReactNode } from "react";

interface Props {
  id: string;
  /** Antetítulo opcional: solo cuando aporta contexto (spec 54). */
  antetitulo?: string;
  titulo: string;
  bajada?: string;
  alinear?: "centro" | "izquierda";
  tono?: "claro" | "oscuro";
  nivel?: 1 | 2;
  /** Titular de marcador que llena la sección (páginas vivas). */
  gigante?: boolean;
}
export default function SeccionTitulo(props: Props & { children?: ReactNode; arriba?: ReactNode; pie?: ReactNode }) {


// Cabecera de sección (spec 54): título de marcador (Anybody estrecha), bajada en Instrument Sans.
// `nivel={1}` la usa como cabecera de página (h1).


const { id, antetitulo, titulo, bajada, alinear = "centro", tono = "claro", nivel = 2, gigante = false } = props;
const centro = alinear === "centro";
const oscuro = tono === "oscuro";
const Titulo = nivel === 1 ? "h1" : "h2";

return (<>


<div className={centro ? `mx-auto text-center ${gigante ? "max-w-5xl" : "max-w-2xl"}` : gigante ? "max-w-5xl" : "max-w-2xl"}>
  {antetitulo && <p className={`eyebrow mb-3 ${oscuro ? "!text-reflector" : ""}`.trim()}>{antetitulo}</p>}
  <Titulo id={id} className={`${gigante ? "gigante" : "titulo-seccion text-5xl md:text-6xl lg:text-7xl"} ${oscuro ? "text-blanco" : "text-basalto"}`}>
    {titulo}
  </Titulo>
  {bajada && <p className={`${gigante ? `bajada-viva ${centro ? "mx-auto" : ""}` : "mt-4 text-lg"} ${oscuro ? "text-blanco/90" : "text-pizarra"}`}>{bajada}</p>}
</div>

</>);
}
