import { Button } from "@/components/ui/Button";
import Icon from "./ui/Icon";
import { Badge } from "@/components/ui/Badge";
import SeccionTitulo from "./inicio/SeccionTitulo";


export default function Planes() {


// Tabla única de planes (/duenos#planes; /precios redirige aquí).
// Precios y límites comerciales vigentes en el copy anterior (spec 20 §7).




const planes = [
  { nombre: "Prueba", precio: "0", nota: "1 mes", texto: "30 días gratis con una cancha desde que aprobamos tu centro; después la suscripción es obligatoria.", incluye: ["Revisión de tu centro por nuestro equipo", "Perfil público y reservas durante la prueba", "Máximo 1 complejo con 1 cancha", "Bloqueo al vencer sin suscripción activa"], principal: false },
  { nombre: "Gestión total", precio: "89.90", nota: "al mes", texto: "Para llevar el día a día del complejo.", incluye: ["Perfil público y reservas en línea", "Agenda, caja y trabajadores", "Reportes de ingresos", "Suscripción requerida tras la prueba"], principal: true },
  { nombre: "Red de sedes", precio: "199", nota: "al mes", texto: "Para dueños con varias sedes.", incluye: ["Todo lo de Gestión total", "Sedes sin límite", "Reportes de todas tus sedes", "Atención prioritaria"], principal: false },
];

return (<>


<section id="planes" aria-labelledby="planes-titulo" className="fondo-sillar">
<div className="revelar mx-auto max-w-page px-4 py-16 md:px-6 lg:py-24">
  <SeccionTitulo
    id="planes-titulo"
    gigante
    alinear="izquierda"
    antetitulo="Tarifas transparentes"
    titulo="Planes y precios"
    bajada="Prueba gratis un mes con una cancha desde que aprobamos tu centro; después la suscripción es obligatoria. Paga mensual o anual: con pago anual pagas 20 % menos (S/ 71.92 al mes en Gestión total y S/ 159.20 en Red de sedes)."
  />
  <div className="mt-10 grid gap-6 md:grid-cols-3 lg:mt-12">
    {planes.map((p) => (
      <article key={p.nombre} className={`card-tactil relative flex flex-col p-6 sm:p-7 ${p.principal ? "border-2 border-cesped-hondo bg-cesped-suave/20 shadow-suave-lg ring-2 ring-cesped/30" : "bg-tiza shadow-suave"}`}>
        {p.principal && (
          <span className="chip-tactil active eyebrow absolute -top-3.5 right-6 text-tiza shadow-suave-sm">
            Recomendado
          </span>
        )}
        <h3 className="font-display text-2xl font-black text-basalto">{p.nombre}</h3>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-4xl font-black tabular-nums tracking-tight text-basalto sm:text-5xl">S/ {p.precio}</span>
          {p.precio === "0" ? <Badge apariencia="publica" tono="libre">{p.nota}</Badge> : <span className="font-display text-sm font-bold text-pizarra">{p.nota}</span>}
        </p>
        <p className="mt-2 text-sm text-pizarra leading-relaxed">{p.texto}</p>
        <div className="my-5 border-t border-cal"></div>
        <ul className="flex-1 space-y-2.5 text-sm">
          {p.incluye.map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cesped-suave text-cesped-hondo">
                <Icon nombre="ok" className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium text-basalto">{i}</span>
            </li>
          ))}
        </ul>
        <Button apariencia="publica" href="/register?returnUrl=%2Fdashboard%2Fpublicar-centro" variante={p.principal ? "primario" : "secundario"} className="mt-6 w-full shadow-suave-sm">
          Empezar con {p.nombre}
        </Button>
      </article>
    ))}
  </div>
</div>
</section>

</>);
}
