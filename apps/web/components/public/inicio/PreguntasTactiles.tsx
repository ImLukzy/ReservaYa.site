import type { ReactNode } from "react";
import type { ComponentProps } from "react";
import Icon from "../ui/Icon";

const CABEZA = "flex min-h-16 items-center gap-4 px-5 py-4";
const RESPUESTA = "px-5 pb-5 leading-relaxed sm:pl-15";

export interface Pregunta {
  categoria: string;
  icono: ComponentProps<typeof Icon>["nombre"];
  pregunta: string;
  respuesta: string;
}
interface Props {
  preguntas: readonly Pregunta[];
  grupo?: string;
}
export default function PreguntasTactiles(props: Props & { children?: ReactNode; arriba?: ReactNode; pie?: ReactNode }) {


// Preguntas frecuentes como el Accordion de Universo (specs 47 y 50): tarjeta táctil con
// icono, categoría y pregunta. <details name> nativo: una abierta a la vez y la primera
// abierta al cargar; abrir y cerrar animan con el resorte (styles/motion.css).






const { preguntas, grupo = "preguntas" } = props;

return (<>


{/* Alto estable: una copia invisible con todas las preguntas cerradas y la respuesta más larga
    reserva el alto; la lista real va encima. Abrir o cerrar no cambia el alto de la sección,
    así el encuadre (snap) y el centrado vertical no mueven la página. */}
<div className="preguntas mx-auto mt-10 max-w-3xl">
  <div className="preguntas__reserva space-y-3" aria-hidden="true" inert>
    {preguntas.map((p, i) => (
      <div key={p.pregunta} className="card-tactil">
        <div className={`pregunta__cabeza ${CABEZA}`}>
          <span className="h-6 w-6 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="eyebrow block">{p.categoria}</span>
            <span className="mt-0.5 block font-bold">{p.pregunta}</span>
          </span>
          <span className="h-5 w-5 shrink-0" />
        </div>
        {i === 0 && <div className="grid">{preguntas.map((q) => <p key={q.pregunta} className={`pregunta__respuesta ${RESPUESTA} [grid-area:1/1]`}>{q.respuesta}</p>)}</div>}
      </div>
    ))}
  </div>
  <div className="preguntas__lista space-y-3">
  {preguntas.map((p, i) => (
    <details key={p.pregunta} name={grupo} open={i === 0} className="card-tactil group">
      <summary className={`pregunta__cabeza ${CABEZA} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        <Icon nombre={p.icono} className="h-6 w-6 shrink-0 text-cesped-hondo" />
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">{p.categoria}</span>
          <span className="mt-0.5 block font-bold text-basalto">{p.pregunta}</span>
        </span>
        <Icon nombre="abajo" className="h-5 w-5 shrink-0 text-basalto transition-transform ease-resorte duration-(--dur-resorte) group-open:rotate-180" />
      </summary>
      <p className={`pregunta__respuesta ${RESPUESTA} text-pizarra`}>{p.respuesta}</p>
    </details>
  ))}
  </div>
</div>

</>);
}
