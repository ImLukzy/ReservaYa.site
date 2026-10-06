'use client';
import { useEffect, useRef } from 'react';
import { iniciarTablero } from '@/lib/public/scripts/tablero';
import { BOTON } from "../../../lib/public/estilos";


export default function SlotBoard() {


// Tablero «Libres hoy»: pestañas por hora y filas separadas por líneas de cal.
// El script pinta los datos reales; aquí va la estructura con alto fijo (CLS 0).

const ref = useRef<HTMLElement>(null);
useEffect(() => ref.current ? iniciarTablero(ref.current) : undefined, []);
return (<>


<section ref={ref} id="tablero" aria-labelledby="tablero-titulo" className="card-tactil overflow-hidden shadow-suave bg-tiza border border-cal">
  <div className="flex flex-wrap items-end justify-between gap-x-4 border-b border-cal px-4 pt-3 sm:px-6">
    <div className="flex items-center gap-2 pb-3">
      <span className="h-2 w-2 rounded-full bg-cesped pulso-inicial" aria-hidden="true"></span>
      <h2 id="tablero-titulo" data-titulo className="font-display text-2xl font-black tracking-tight text-basalto">Libres hoy</h2>
    </div>
    <div role="tablist" aria-label="Hora de inicio" className="-mb-px flex">
      {[0, 1, 2].map((i) => (
        <button key={i}
          type="button"
          role="tab"
          data-hora=""
          aria-selected={i === 0 ? "true" : "false"}
          aria-controls="tablero-panel"
          tabIndex={i === 0 ? 0 : -1}
          className="h-12 w-20 border-b border-transparent font-display text-lg font-black tabular-nums text-pizarra transition-colors hover:text-basalto aria-selected:border-cesped aria-selected:text-basalto"
        >--:--</button>
      ))}
    </div>
  </div>

  <div id="tablero-panel" data-panel role="tabpanel" aria-labelledby="tablero-titulo" className="overflow-hidden sm:min-h-0 sm:h-auto">
    <ul aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="grid min-h-24 grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 border-b border-cal px-4 sm:min-h-16 sm:grid-cols-[4rem_3.5rem_minmax(0,1fr)_5rem] sm:gap-x-4 sm:px-6">
          <span className="esqueleto hidden h-9 w-16 rounded-control sm:block"></span>
          <span className="esqueleto h-6 w-12"></span>
          <span className="esqueleto h-5 w-3/4"></span>
          <span className="esqueleto h-9 w-20 justify-self-end"></span>
        </li>
      ))}
    </ul>
  </div>
  <p data-estado className="sr-only" aria-live="polite"></p>

  <div className="flex items-center justify-between border-t border-cal px-4 sm:px-6">
    <a data-todas href="/canchas" className={`${BOTON.texto} font-display text-sm`}>Buscar otro día u hora <span aria-hidden="true">→</span></a>
    <span className="hidden font-display text-xs font-bold uppercase tracking-wider text-pizarra sm:inline">Tablero en vivo</span>
  </div>
</section>



</>);
}
