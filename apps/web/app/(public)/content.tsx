import SlotBoard from "@/components/public/ui/SlotBoard";
import Vitrina from "@/components/public/inicio/Vitrina";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import PreguntasTactiles from "@/components/public/inicio/PreguntasTactiles";
import BandaCierre from "@/components/public/inicio/BandaCierre";
import { DISTRITOS, TIPOS } from "@/lib/public/arequipa";
import { PREGUNTAS_JUGADOR } from "@/lib/public/preguntas";
const distritos = [{ valor: "", etiqueta: "Todo Arequipa" }, ...DISTRITOS.map((d) => ({ valor: d, etiqueta: d }))];
const tipos = [{ valor: "", etiqueta: "Todo deporte" }, ...TIPOS];
const dias = [{ valor: "hoy", etiqueta: "Hoy" }, { valor: "manana", etiqueta: "Mañana" }];
const pasos = [
    { titulo: "Busca", texto: "Elige distrito, deporte y hora. Solo ves canchas libres, con su precio." },
    { titulo: "Reserva", texto: "Envía la reserva desde tu cuenta. El complejo la confirma en su panel." },
    { titulo: "Juega", texto: "Con la reserva confirmada tienes un código. Lo muestras al llegar y entras a jugar." },
];
export default function PublicContent() {
    return (<div className="pantallas portada-pantallas">
  {/* Vitrina (spec 54, parentesco con canchasgo): titular en tres tiempos y mosaico vivo. */}
  <Vitrina />

  {/* Pantalla 2 · verde vivo con texto oscuro: titular gigante + buscador (mismo GET /canchas y mismos ids) y tablero real. */}
  <section className="portada-busqueda fondo-verde" aria-labelledby="buscar-titulo">
  <div className="portada-busqueda__grid mx-auto max-w-page px-4 md:px-6">
  <div id="buscar" aria-labelledby="buscar-titulo" className="relative z-10 scroll-mt-24">
    <h2 id="buscar-titulo" className="gigante">¿Dónde y cuándo juegas?</h2>
    <p className="bajada-viva">Elige distrito, deporte y día: solo ves horas libres, con su precio.</p>
    <form action="/canchas" method="get" className="mt-6 grid grid-cols-1 gap-3 rounded-surface border border-cal bg-tiza p-3 shadow-suave-lg sm:grid-cols-2 sm:p-4 sm:items-end" role="search" aria-label="Buscar canchas">
      <Select apariencia="publica" id="buscar-distrito" name="distrito" etiqueta="Distrito" opciones={distritos}/>
      <Select apariencia="publica" id="buscar-tipo" name="tipo" etiqueta="Deporte" opciones={tipos}/>
      <Select apariencia="publica" id="buscar-dia" name="fecha" etiqueta="Día" opciones={dias}/>
      <input id="buscar-hora" type="hidden" name="hora" value=""/>
      <Button apariencia="publica" type="submit" className="w-full">Buscar cancha</Button>
    </form>
  </div>

  <div aria-label="Canchas libres hoy" className="relative z-10 min-w-0">
    <SlotBoard />
  </div>
  </div>
  </section>

  {/* Pantalla 3 · claro de sillar: titular a todo el ancho y numerales de marcador. */}
  <section id="como-funciona" className="fondo-sillar" aria-labelledby="como-titulo">
    <div className="revelar mx-auto max-w-page px-4 md:px-6">
      <h2 id="como-titulo" className="gigante">Del chat del grupo a la cancha</h2>
      <p className="bajada-viva">Tres pasos y tienes el código para entrar a jugar.</p>
      <ol className="pasos-marcador">
        {pasos.map((p, i) => (<li key={i}>
            <span className="pasos-marcador__num" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0">
              <h3 className="pasos-marcador__titulo">{p.titulo}</h3>
              <p className="mt-2 max-w-xs">{p.texto}</p>
            </div>
          </li>))}
      </ol>
      <div className="pasos-marcador__acciones">
        <a href="#buscar" className="btn-tactil min-h-12 bg-cancha-noche px-6 text-base font-bold text-blanco hover:bg-cancha-noche/85">Buscar cancha</a>
        <a href="/jugar#equipos" className="enlace-vivo">¿Son muchos? Arma los equipos en Jugar</a>
      </div>
    </div>
  </section>

  {/* Pantalla 4 · verde profundo con franjas de césped cortado. */}
  <section id="preguntas" className="fondo-cesped" aria-labelledby="preguntas-titulo">
    <div className="revelar lado-a-lado mx-auto max-w-page px-4 md:px-6">
      <div>
        <h2 id="preguntas-titulo" className="gigante">Preguntas frecuentes</h2>
        <p className="bajada-viva">Lo esencial sobre tu cuenta, la confirmación y el pago.</p>
        <a href="/ayuda" className="enlace-vivo mt-5 inline-flex">¿Otra duda? Revisa la ayuda</a>
      </div>
      <PreguntasTactiles preguntas={PREGUNTAS_JUGADOR}/>
    </div>
  </section>

  {/* Pantalla 5 · foto a sangre con velo verde (estilo en public.css, solo portada). */}
  <BandaCierre id="duenos-titulo" foto="cierre-futsal" titulo="¿Tienes canchas en Arequipa?" bajada="Publica tus horarios y recibe reservas sin contestar llamadas. Gestiona agenda, precios, caja y trabajadores desde un solo panel en el navegador; las confirmas cuando quieras." primario={{ href: "/duenos", texto: "Publicar mis canchas" }} secundario={{ href: "/duenos#planes", texto: "Ver planes" }}/>
    </div>);
}
