"use client";
import { useEffect } from "react";
import { Select } from "@/components/ui/Select";
import { Input as Field } from "@/components/ui/Input";
import Icon from "@/components/public/ui/Icon";
import BandaCierre from "@/components/public/inicio/BandaCierre";
import { DISTRITOS, TIPOS } from "@/lib/public/arequipa";
import { APERTURA, ULTIMA, etiquetaHora } from "@/lib/public/horario";
import { APP } from "@/lib/public/entorno";
import { BOTON } from "@/lib/public/estilos";
const distritos = [{ valor: "", etiqueta: "Todo Arequipa" }, ...DISTRITOS.map((d) => ({ valor: d, etiqueta: d }))];
const tipos = [{ valor: "", etiqueta: "Todo deporte" }, ...TIPOS];
const dias = [{ valor: "hoy", etiqueta: "Hoy" }, { valor: "manana", etiqueta: "Mañana" }];
const horas = Array.from({ length: ULTIMA - APERTURA + 1 }, (_, i) => ({ valor: String(APERTURA + i), etiqueta: etiquetaHora(APERTURA + i) }));
const orden = [
    { valor: "precio", etiqueta: "Menor precio" },
    { valor: "precio-desc", etiqueta: "Mayor precio" },
    { valor: "valoracion", etiqueta: "Mejor valoradas" },
];
const vistas = [
    { valor: "canchas", etiqueta: "Por canchas" },
    { valor: "complejos", etiqueta: "Por complejos" },
];
import { iniciarCanchas } from "@/lib/public/scripts/canchas";
export default function PublicContent() {
    useEffect(() => iniciarCanchas(), []);
    return (<div className="pantallas pantallas-canchas">


    <>
  <div className="pantalla">
  <section className="fondo-verde canchas-buscar">
  <div className="mx-auto max-w-page px-4 pb-8 pt-8 md:px-6 lg:pt-12">
    {/* Cifras debajo del título: su posición no depende del ancho de la fuente (CLS, spec 47). */}
    <div className="grid gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-cesped/40 bg-cesped-suave px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-cesped pulso-inicial" aria-hidden="true"></span>
            <span className="eyebrow text-cesped-hondo">Tablero en vivo</span>
          </span>
          <span className="eyebrow">Arequipa</span>
        </div>
        <h1 className="gigante mt-3">
          Buscar canchas
        </h1>
        <p id="resumen" className="mt-2 min-h-14 text-base text-pizarra sm:text-lg lg:min-h-7">
          Canchas libres en los 29 distritos. Filtra por deporte, día, hora y precio.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-basalto">
        <span className="inline-flex items-center rounded-full border border-cal bg-tiza px-3 py-1">{DISTRITOS.length} distritos</span>
        <span className="inline-flex items-center rounded-full border border-cal bg-tiza px-3 py-1">{TIPOS.length} tipos de cancha</span>
        <span className="inline-flex items-center rounded-full border border-cal bg-tiza px-3 py-1">Precios publicados</span>
      </div>
    </div>

    <div className="card-tactil mt-6 bg-tiza p-4 shadow-suave-lg sm:p-5">
      <form id="filtros" action="/canchas" method="get" role="search" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
        <Field apariencia="publica" id="f-q" name="q" type="search" etiqueta="Complejo o cancha" placeholder="Nombre" autoComplete="off" className="sm:col-span-2 lg:col-span-1"/>
        <Select apariencia="publica" id="f-distrito" name="distrito" etiqueta="Distrito" opciones={distritos}/>
        <Select apariencia="publica" id="f-tipo" name="tipo" etiqueta="Deporte" opciones={tipos}/>
        <Select apariencia="publica" id="f-fecha" name="fecha" etiqueta="Día" opciones={dias}/>
        <Select apariencia="publica" id="f-hora" name="hora" etiqueta="Hora" opciones={horas}/>
        <noscript><button type="submit" className={BOTON.primario}>Buscar</button></noscript>
      </form>
    </div>
  </div>
  </section>

  <section className="fondo-noche canchas-resultados" aria-labelledby="resumen">
  <div className="mx-auto max-w-page px-4 pb-16 pt-6 md:px-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p id="conteo" className="min-h-6 text-sm font-bold text-basalto tabular-nums">Buscando…</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Vista de resultados" className="inline-flex rounded-full border border-borde bg-tiza p-0.5">
          {vistas.map((v) => (<button key={v.valor} type="button" data-vista={v.valor} aria-pressed={v.valor === "canchas"} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-pizarra transition-colors hover:text-basalto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped aria-pressed:bg-cesped aria-pressed:text-tiza">
              {v.etiqueta}
            </button>))}
        </div>
        <Select apariencia="publica" id="f-orden" etiqueta="Ordenar por" opciones={orden} className="flex items-center gap-2 [&_label]:mb-0 [&_label]:text-xs [&_label]:font-bold [&_label]:text-pizarra"/>
      </div>
    </div>
    <ul id="resultados" aria-live="polite" aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((index) => (<li className="card-tactil flex min-w-0 flex-col overflow-hidden p-0" aria-hidden="true" key={index}>
          <div className="esqueleto relative aspect-[16/10] w-full shrink-0 rounded-none"></div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <span className="esqueleto h-5 w-3/4"></span><span className="esqueleto h-4 w-1/2"></span><span className="esqueleto h-4 w-1/3"></span><span className="esqueleto my-3.5 h-4 w-2/5"></span>
            <div className="mt-auto flex items-center justify-between border-t border-cal pt-3"><span className="esqueleto h-7 w-20"></span><span className="esqueleto h-11 w-28 rounded-full"></span></div>
          </div>
        </li>))}
    </ul>
  </div>
  </section>
  </div>

  <BandaCierre id="canchas-cierre" foto="pichanga-sintetica" antetitulo="¿Te faltan jugadores?" titulo="Súmate a una pichanga" bajada="En Jugar encuentras partidos abiertos con cupos libres, armas equipos parejos y ves los torneos de tu complejo." primario={{ href: "/jugar#partidos", texto: "Ver partidos abiertos" }} secundario={{ href: "/ayuda", texto: "Cómo reservar" }}/>

  <dialog id="opiniones" aria-labelledby="opiniones-titulo" className="card-tactil m-auto w-[min(32rem,calc(100%-2rem))] p-0 text-basalto backdrop:bg-velo motion-safe:transition-all overscroll-contain">
    <div className="flex items-start justify-between gap-4 border-b border-cal/15 px-5 py-4">
      <h2 id="opiniones-titulo" className="text-xl font-bold">Opiniones</h2>
      <button type="button" data-cerrar className="btn-tactil flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cal bg-tiza text-pizarra hover:bg-piedra hover:text-basalto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped focus-visible:ring-offset-2" aria-label="Cerrar opiniones">
        <Icon nombre="cerrar"/>
      </button>
    </div>
    <ul id="opiniones-lista" className="max-h-[60vh] overflow-y-auto px-5 overscroll-contain"></ul>
    <div className="border-t border-cal/15 px-5 py-4 text-sm text-pizarra">
      ¿Jugaste aquí? Califica desde tu reserva completada.
      <a href={`${APP}/dashboard/reservas`} className={`${BOTON.texto} text-sm`}>Ir a mis reservas</a>
    </div>
  </dialog>
    </>



    </div>);}
