import BandaCierre from "@/components/public/inicio/BandaCierre";
import SeccionTitulo from "@/components/public/inicio/SeccionTitulo";
import PreguntasTactiles from "@/components/public/inicio/PreguntasTactiles";
import { EMAIL } from "@/lib/public/contacto";
import { PREGUNTAS_AYUDA } from "@/lib/public/preguntas";
const pasos = [
    ["Crea tu cuenta", "Con tu nombre, correo, fecha de nacimiento y una contraseña."],
    ["Busca una cancha libre", "En Canchas eliges distrito, deporte, día y hora. Solo ves las que están libres, con su precio."],
    ["Envía la reserva", "Pulsas Reservar y la confirmas desde tu cuenta. Puedes dejar una nota para el complejo."],
    ["Espera la confirmación", "El complejo tiene que confirmarla. Cuando lo hace, ves tu código en Mi partido."],
    ["Juega con tu código", "Con la reserva confirmada ves tu código en Mi partido. Lo muestras al llegar a la cancha."],
];
export default function PublicContent() {
    return (<div className="pantallas pantallas-ayuda">


    <>
  <section aria-labelledby="ayuda-titulo" className="fondo-verde">
    <div className="mx-auto max-w-page px-4 pb-16 pt-8 md:px-6 lg:pt-12">
      <SeccionTitulo id="ayuda-titulo" nivel={1} gigante alinear="izquierda" antetitulo="Guía rápida" titulo="Cómo reservar una cancha" bajada="Busca, reserva y presenta tu código cuando el complejo confirme."/>
      <ol className="pasos-marcador pasos-marcador--cinco">
        {pasos.map(([t, d], i) => (<li key={i}>
            <span className="pasos-marcador__num" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0">
              <h2 className="pasos-marcador__titulo">{t}</h2>
              <p className="mt-2 leading-relaxed">{d}</p>
            </div>
          </li>))}
      </ol>
      <div className="pasos-marcador__acciones">
        <a href="/canchas" className="btn-tactil min-h-12 bg-cancha-noche px-6 text-base font-bold text-blanco hover:bg-cancha-noche/85">Buscar cancha</a>
        <a href="/jugar#partidos" className="enlace-vivo">¿Te faltan jugadores? Mira los partidos abiertos</a>
      </div>
    </div>
  </section>
  <section aria-labelledby="preguntas-titulo" className="fondo-cesped">
    <div className="revelar lado-a-lado mx-auto max-w-page px-4 py-8 md:px-6">
      <div>
        <SeccionTitulo id="preguntas-titulo" gigante alinear="izquierda" antetitulo="Ayuda" titulo="Preguntas frecuentes" bajada="Buscar, elegir el día, completar el equipo y recuperar tu acceso."/>
        <a href={`mailto:${EMAIL}`} className="enlace-vivo mt-5 inline-flex">¿Otra duda? Escríbenos</a>
      </div>
      <PreguntasTactiles preguntas={PREGUNTAS_AYUDA}/>
    </div>
  </section>
  <BandaCierre id="ayuda-contacto" foto="pelota-noche" antetitulo="Soporte" titulo="¿Dudas o problemas?" bajada={`Escríbenos a ${EMAIL} y te respondemos. Si ya sabes qué buscas, mira las canchas libres.`} primario={{ href: `mailto:${EMAIL}`, texto: "Escribir por correo" }} secundario={{ href: "/canchas", texto: "Buscar canchas" }}/>
    </>

    </div>);}
