import Image from "next/image";
import Icon from "@/components/public/ui/Icon";
import { DISTRITOS } from "@/lib/public/arequipa";

// Vitrina del inicio (spec 54, parentesco con canchasgo): titular en tres tiempos,
// CTA verde vivo, garantías y mosaico de fotos que baja solo. La portada no recibe
// complejos ni precios del servidor, así que las fichas muestran deporte y distrito
// (rótulos verificables), nunca complejos o precios inventados.
interface Ficha { foto: string; deporte: string; distrito: string; foco?: string; alta?: boolean }

const COLUMNAS: Ficha[][] = [
  [
    { foto: "pichanga-sintetica", deporte: "Fútbol 7", distrito: "Cerro Colorado", foco: "38% 50%", alta: true },
    { foto: "voley-remate", deporte: "Vóley", distrito: "Cayma", foco: "62% 40%" },
    { foto: "deporte-basquet", deporte: "Básquet", distrito: "Paucarpata", foco: "50% 20%", alta: true },
    { foto: "cuenta-atardecer", deporte: "Fútbol", distrito: "Sachaca" },
  ],
  [
    { foto: "futsal-luz", deporte: "Fútbol 5", distrito: "Yanahuara", foco: "55% 50%" },
    { foto: "gol-tribuna", deporte: "Fútbol", distrito: "José Luis Bustamante y Rivero", foco: "35% 60%", alta: true },
    { foto: "deporte-voley", deporte: "Vóley", distrito: "Miraflores", foco: "50% 30%" },
    { foto: "atardecer-ribera", deporte: "Fútbol 7", distrito: "Arequipa", foco: "60% 55%", alta: true },
  ],
  [
    { foto: "deporte-futbol", deporte: "Fútbol", distrito: "Mariano Melgar", alta: true },
    { foto: "pelota-noche", deporte: "Fútbol 5", distrito: "Socabaya", foco: "60% 60%" },
    { foto: "deporte-futsal", deporte: "Fútbol 5", distrito: "Jacobo Hunter", foco: "50% 72%", alta: true },
    { foto: "cierre-futsal", deporte: "Losa deportiva", distrito: "Alto Selva Alegre" },
  ],
];

const GARANTIAS = [
  { icono: "reloj", texto: "Solo horas libres" },
  { icono: "billete", texto: "Precio a la vista" },
  { icono: "ticket", texto: "Código para entrar" },
  { icono: "lugar", texto: `${DISTRITOS.length} distritos` },
] as const;

function FichaViva({ ficha, primera }: { ficha: Ficha; primera: boolean }) {
  return <div className={`ficha-viva${ficha.alta ? " ficha-viva--alta" : ""}`}>
    <Image src={`/img/hero/${ficha.foto}.webp`} alt="" fill sizes="(min-width: 64rem) 16vw, (min-width: 40rem) 33vw, 50vw" preload={primera} loading={primera ? undefined : "lazy"} className="object-cover" style={{ objectPosition: ficha.foco }} />
    <span className="block min-w-0">
      <span className="block truncate text-sm font-bold text-blanco">{ficha.deporte}</span>
      <span className="block truncate text-xs text-blanco/80">{ficha.distrito}</span>
      <span className="mt-0.5 block text-xs font-semibold text-cesped-vivo">Ver horas libres</span>
    </span>
  </div>;
}

export default function Vitrina() {
  return <section aria-labelledby="hero-titulo" className="vitrina">
    <div className="mx-auto grid max-w-page grid-cols-1 items-center gap-10 px-4 pb-10 pt-12 md:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12 lg:pb-14 lg:pt-16">
      <div className="escena__entra">
        <p className="vitrina__vivo"><span className="vitrina__punto" aria-hidden="true" />¿Sale pichanga hoy? Canchas libres en Arequipa</p>
        <h1 id="hero-titulo" className="titular mt-6 text-[3.75rem] text-blanco sm:text-8xl lg:text-[6.75rem]">
          Junta a la mancha.<br /><span className="text-cesped-vivo">Reserva.</span><br />A la cancha.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-blanco/85 md:text-xl">
          Mira qué canchas quedan libres en Cayma, Yanahuara, Cerro Colorado y {DISTRITOS.length - 3} distritos más. Ves la hora y el precio; reservas en un minuto.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#buscar" className="btn-tactil btn-vivo min-h-12 gap-2 px-6 text-base font-bold">Buscar cancha <Icon nombre="flecha" className="h-4 w-4" /></a>
          <a href="/duenos" className="btn-tactil min-h-12 gap-2 border-blanco/40 bg-transparent px-6 text-base text-blanco shadow-none hover:border-blanco hover:bg-blanco/10"><Icon nombre="usuario" className="h-4 w-4" />Soy dueño de cancha</a>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-blanco/80">
          {GARANTIAS.map(g => <li key={g.texto} className="flex items-center gap-2"><Icon nombre={g.icono} className="h-4 w-4 text-cesped-vivo" />{g.texto}</li>)}
        </ul>
      </div>
      <div className="mosaico-vivo" aria-hidden="true">
        {COLUMNAS.map((col, c) => <div key={c} className="mosaico-vivo__col">
          <div className="mosaico-vivo__pista">
            {[0, 1].map(copia => <div key={copia} className="mosaico-vivo__copia">
              {col.map((f, i) => <FichaViva key={f.foto} ficha={f} primera={copia === 0 && i === 0 && c < 2} />)}
            </div>)}
          </div>
        </div>)}
      </div>
    </div>
    <div className="cinta-viva">
      <div className="mx-auto flex max-w-page items-center gap-4 px-4 py-3 md:px-6">
        <p className="shrink-0 text-xs font-semibold text-cesped-vivo">Se juega en</p>
        <div className="min-w-0 flex-1 overflow-hidden" aria-hidden="true">
          <div className="cinta-viva__pista">
            {[0, 1].map(copia => <ul key={copia}>
              {DISTRITOS.map(d => <li key={d} className="flex items-center gap-3 pr-3 text-sm font-semibold text-blanco/85">{d}<span className="h-1 w-1 rounded-full bg-cesped-vivo" /></li>)}
            </ul>)}
          </div>
        </div>
        <span className="sr-only">Los {DISTRITOS.length} distritos de Arequipa.</span>
      </div>
    </div>
  </section>;
}
