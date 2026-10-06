import HeroFondo, { HeroPie, FOTOS_DUENO } from "@/components/public/HeroFondo";
import { Button } from "@/components/ui/Button";
import Planes from "@/components/public/Planes";
import Icon from "@/components/public/ui/Icon";
import SeccionTitulo from "@/components/public/inicio/SeccionTitulo";
import PreguntasTactiles from "@/components/public/inicio/PreguntasTactiles";
import BandaCierre from "@/components/public/inicio/BandaCierre";
import { whatsappUrl } from "@/lib/public/contacto";
import { NUMERO_PASO } from "@/lib/public/estilos";
import { PREGUNTAS_DUENO } from "@/lib/public/preguntas";
const pasos = [
    "Crea tu cuenta en ReservaYa.",
    "Envía tu centro con una cancha y acepta el convenio de prueba.",
    "Nuestro equipo lo revisa y te avisa por correo.",
    "Al aprobarlo tienes 30 días gratis con una cancha; después la suscripción es obligatoria.",
];
const introEmpiezas = "Crea tu cuenta, envía tu centro con una cancha y nosotros lo revisamos. Tu prueba gratis empieza el día que lo aprobamos.";
const ventajas = ["Prueba gratis 1 mes con 1 cancha", "Funciona en el navegador, sin instalar", "Soporte directo por WhatsApp"];
const whatsapp = whatsappUrl("Hola, quiero publicar mis canchas en ReservaYa");
const modulos = [
    { id: "reservas", icono: "ticket", titulo: "Reservas", texto: "Confirmas o rechazas cada reserva. La confirmada trae un código que el jugador muestra al llegar." },
    { id: "precios", icono: "calendario", titulo: "Horarios y precios", texto: "Defines el horario de cada día, precios especiales por franja y descuentos." },
    { id: "caja", icono: "billete", titulo: "Caja", texto: "Abres y cierras caja, vendes productos y registras cada cobro con su método." },
    { id: "equipo", icono: "grupo", titulo: "Trabajadores", texto: "Cada trabajador entra con su cuenta a la agenda, las reservas y la caja. No ve tus reportes ni tus ingresos." },
    { id: "reportes", icono: "grafico", titulo: "Reportes", texto: "Ingresos, reservas y metas del mes de cada complejo." },
    { id: "resenas", icono: "mensaje", titulo: "Opiniones", texto: "Solo opinan jugadores con una reserva completada, y tú puedes responder." },
    { id: "torneos", icono: "trofeo", titulo: "Torneos", texto: "Inscribes equipos, armas los partidos y registras los resultados." },
] as const;
export default function PublicContent() {
    return (<div className="pantallas pantallas-duenos">


    <>
  <section aria-labelledby="duenos-hero-titulo" className="escena escena--plena">
    <HeroFondo fotos={FOTOS_DUENO} />
    <div className="relative z-10 mx-auto grid max-w-page gap-10 px-4 pb-14 pt-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16 lg:pb-20 lg:pt-14">
      <div className="escena__entra">
        <p className="font-semibold text-reflector">Panel de gestión para dueños de canchas en Arequipa</p>
        <h1 id="duenos-hero-titulo" className="titular mt-4 text-6xl text-blanco sm:text-7xl lg:text-8xl">
          Publica tus canchas y recibe reservas sin llamadas
        </h1>
        <p className="mt-4 max-w-xl text-lg text-blanco/90 sm:text-xl leading-relaxed">
          Los jugadores de Arequipa ven tus horas libres con su precio y te envían la reserva. Tú la confirmas desde el panel.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button apariencia="publica" href="/register?returnUrl=%2Fdashboard%2Fpublicar-centro" className="shadow-suave-sm">Crear mi cuenta</Button>
          <Button apariencia="publica" href={whatsapp} variante="secundario" target="_blank" rel="noopener">Escribir por WhatsApp</Button>
        </div>
        <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-blanco/90">
          {ventajas.map((v, index) => (<li className="inline-flex items-center gap-2" key={index}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cesped text-tiza"><Icon nombre="ok" className="h-3 w-3"/></span>{v}
            </li>))}
        </ul>
      </div>

      <div className="card-tactil relative z-10 bg-tiza p-6 shadow-suave-lg sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-cal pb-3">
          <div>
            <h2 className="text-xl font-semibold text-basalto">Cómo empiezas</h2>
            <p className="mt-2 text-sm text-pizarra">{introEmpiezas}</p>
          </div>
          <span className="shrink-0 rounded-full bg-cesped-suave px-2.5 py-0.5 font-display text-xs font-extrabold text-cesped-hondo">{pasos.length} pasos</span>
        </div>
        <ol className="mt-5 space-y-4">
          {pasos.map((p, i) => (<li className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3" key={i}>
              <span className={NUMERO_PASO}>{i + 1}</span>
              <span className="pt-1 text-sm font-medium leading-snug text-basalto sm:text-base">{p}</span>
            </li>))}
        </ol>
      </div>
    </div>

    <div className="relative z-10 mx-auto w-full max-w-page px-4 pb-5 md:px-6"><HeroPie fotos={FOTOS_DUENO} /></div>
  </section>


  <section aria-labelledby="panel-titulo" className="fondo-verde">
    <div className="revelar mx-auto max-w-page px-4 py-16 md:px-6 lg:py-24">
      <SeccionTitulo id="panel-titulo" gigante alinear="izquierda" antetitulo="Módulos del panel" titulo="Qué haces desde el panel" bajada="Gestiona 7 módulos sin instalar nada en el navegador: reservas confirmadas, agenda, caja del día, trabajadores con su acceso, reportes de ingresos, opiniones de jugadores, torneos. Un complejo o varios."/>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
        {modulos.map((m, i) => (<article id={m.id} className={`card-tactil flex gap-4 p-5 ${i === 0 ? "bg-cesped-suave sm:col-span-2" : i === modulos.length - 1 ? "bg-cesped-suave lg:col-span-2" : "bg-tiza"}`} key={i}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-surface border border-cal bg-cesped text-tiza">
              <Icon nombre={m.icono} className="h-5 w-5"/>
            </span>
            <div>
              <h3 className="font-display text-xl font-black text-basalto">{m.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-pizarra sm:text-base">{m.texto}</p>
            </div>
          </article>))}
      </div>
    </div>
  </section>

  <Planes />

  <section aria-labelledby="preguntas-titulo" className="fondo-cesped">
    <div className="revelar lado-a-lado mx-auto max-w-page px-4 py-16 md:px-6 lg:py-24">
      <SeccionTitulo id="preguntas-titulo" gigante alinear="izquierda" antetitulo="Ayuda para dueños" titulo="Preguntas de dueños" bajada="Dudas reales antes de registrarte: ¿sin contratos?, ¿sin instalar?, ¿funciona con varias sedes?, ¿cómo cobro?, ¿qué pasa con reservas pendientes? Aquí están las respuestas."/>
      <PreguntasTactiles preguntas={PREGUNTAS_DUENO}/>
    </div>
  </section>

  <BandaCierre id="empezar-titulo" antetitulo="Empieza hoy" titulo="Recibe reservas de tus canchas" bajada="Envía tu centro y, al aprobarlo, recibe reservas gratis 30 días con una cancha. Después la suscripción es obligatoria." primario={{ href: "/register?returnUrl=%2Fdashboard%2Fpublicar-centro", texto: "Crear mi cuenta" }} secundario={{ href: whatsapp, texto: "Escribir por WhatsApp", externo: true }}/>
    </>

    </div>);}
