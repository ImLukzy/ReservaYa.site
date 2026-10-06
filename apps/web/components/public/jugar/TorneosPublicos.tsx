// La API no publica torneos para jugadores (TorneosController exige ADMIN/SUPERADMIN/TECNICO):
// sin lista pública no se muestran torneos. BLOQUEO-API anotado en la spec 20.
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import BandaCierre from "@/components/public/inicio/BandaCierre";
export default function TorneosPublicos() {
    return (<div className="pantallas pantallas-torneos">


    <>
  <section id="torneos" aria-labelledby="torneos-titulo" className="fondo-noche">
  <div className="lado-a-lado mx-auto max-w-page px-4 pb-12 pt-8 md:px-6 lg:pt-12">
    <div>
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-cesped/40 bg-cesped-suave px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-cesped pulso-inicial" aria-hidden="true"></span>
        <span className="eyebrow text-cesped-hondo">Competencias locales</span>
      </span>
      <span className="eyebrow">Arequipa</span>
    </div>
    <h2 id="torneos-titulo" className="gigante torneos-titulo mt-3 text-basalto">
      Torneos
    </h2>
    <p className="mt-3 max-w-xl text-base text-pizarra sm:text-lg">
      Los complejos de Arequipa organizan sus torneos en ReservaYa: inscribes equipos, armas los partidos y registras los resultados. Todavía sin lista pública.
    </p>
    </div>

    <div className="mt-8 lg:mt-0">
      <EmptyState apariencia="publica" titulo="Todavía no hay torneos con inscripción en línea" texto="Por ahora te inscribes en el complejo que organiza el torneo. Pregunta en tu cancha de siempre o arma una pichanga abierta en Completar cuadro.">
        <Button apariencia="publica" href="/canchas" variante="secundario" className="shadow-suave-sm">Buscar canchas disponibles</Button>
      </EmptyState>
    </div>
  </div>
  </section>

  <BandaCierre id="organiza-titulo" antetitulo="Para dueños y administradores" titulo="¿Organizas un torneo en tu complejo?" bajada="Desde el panel inscribes equipos, armas fechas y partidos, registras resultados y ves quién ganó." primario={{ href: "/duenos#torneos", texto: "Ver cómo funciona" }}/>
    </>

    </div>);}
