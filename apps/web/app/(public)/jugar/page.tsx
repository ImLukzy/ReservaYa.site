import { publicMetadata } from "@/lib/public/metadata";
import Image from "next/image";
import Icon from "@/components/public/ui/Icon";
import PartidosAbiertos from "@/components/public/jugar/PartidosAbiertos";
import ArmarEquipos from "@/components/public/jugar/ArmarEquipos";
import TorneosPublicos from "@/components/public/jugar/TorneosPublicos";
const partes = [
  { id: "partidos", titulo: "Partidos abiertos", texto: "Súmate a una pichanga o publica la tuya.", foto: "futsal-luz", foco: "55% 50%" },
  { id: "equipos", titulo: "Armar equipos", texto: "Agrega jugadores y repártelos al azar.", foto: "voley-remate", foco: "62% 40%" },
  { id: "torneos", titulo: "Torneos", texto: "Consulta cómo competir en tu complejo.", foto: "gol-tribuna", foco: "35% 60%" },
];

export const metadata = publicMetadata("Jugar | ReservaYa", "Encuentra partidos abiertos en Arequipa, arma equipos y consulta cómo participar en torneos.", "/jugar");

export default function Page() {
  return <div className="pantallas pantallas-jugar">
    <section aria-labelledby="jugar-titulo" className="vitrina jugar-entrada">
      <div className="jugar-entrada__contenido mx-auto grid max-w-page items-center gap-10 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p className="vitrina__vivo">La pichanga empieza aquí</p>
          <h1 id="jugar-titulo" className="titular mt-5 text-6xl text-blanco sm:text-7xl lg:text-8xl">Junta a tu equipo.<br /><span className="text-cesped-vivo">Y juega.</span></h1>
          <p className="mt-5 max-w-md text-lg text-blanco/85">Encuentra con quién jugar, arma los equipos y entra a la competencia. Elige por dónde empezar.</p>
        </div>
        <nav aria-label="Qué quieres jugar" className="grid gap-3">
          {partes.map((parte, i) => <a key={parte.id} href={`#${parte.id}`} className="ficha-viva jugar-acceso items-end focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cesped-vivo">
            <Image src={`/img/hero/${parte.foto}.webp`} alt="" fill sizes="(min-width: 64rem) 45vw, 100vw" preload={i === 0} className="object-cover" style={{ objectPosition: parte.foco }} />
            <span className="flex w-full items-end justify-between gap-4">
              <span>
                <span className="titular block text-3xl text-blanco sm:text-4xl">{parte.titulo}</span>
                <span className="mt-2 block text-sm text-blanco/90">{parte.texto}</span>
              </span>
              <Icon nombre="flecha" className="h-6 w-6 shrink-0 text-cesped-vivo" />
            </span>
          </a>)}
        </nav>
      </div>
    </section>
    <PartidosAbiertos />
    <ArmarEquipos />
    <TorneosPublicos />
  </div>;
}
