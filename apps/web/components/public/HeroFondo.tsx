import Image from 'next/image'

// Escena del hero (spec 54): fotos con gente jugando, fundido cruzado lento con acercamiento,
// velo de noche de cancha solo donde va el texto. Decorativa: el hero se entiende sin ella.
export interface FotoEscena {
  archivo: string
  rotulo: string
  /** object-position para que el recorte en celular no corte la jugada. */
  foco?: string
}

export const FOTOS_JUGADOR: FotoEscena[] = [
  { archivo: 'pichanga-sintetica', rotulo: 'Pichanga en sintética', foco: '38% 50%' },
  { archivo: 'futsal-luz', rotulo: 'Fulbito bajo techo', foco: '55% 50%' },
  { archivo: 'voley-remate', rotulo: 'Vóley, el remate', foco: '62% 40%' },
  { archivo: 'gol-tribuna', rotulo: 'Gol con la tribuna llena', foco: '35% 60%' },
  { archivo: 'atardecer-ribera', rotulo: 'El último partido de la tarde', foco: '60% 55%' },
]

// /duenos abre con la tribuna: el mismo material, otro orden.
export const FOTOS_DUENO: FotoEscena[] = [3, 0, 1, 2, 4].map(i => FOTOS_JUGADOR[i])

export default function HeroFondo({ fotos = FOTOS_JUGADOR }: { fotos?: FotoEscena[] }) {
  return <div className="escena__fondo" aria-hidden="true">
    {fotos.map((foto, index) => <div key={foto.archivo} className="escena__foto">
      <Image src={`/img/hero/${foto.archivo}.webp`} alt="" fill sizes="100vw" preload={index === 0} loading={index === 0 ? undefined : 'lazy'} className="object-cover" style={{ objectPosition: foto.foco }} />
    </div>)}
    <div className="escena__velo" />
  </div>
}

/** Pie decorativo de la escena: rótulos y progreso. */
export function HeroPie({ fotos = FOTOS_JUGADOR }: { fotos?: FotoEscena[] }) {
  return <div className="escena__pie">
    <div className="escena__rotulos" aria-hidden="true">
      {fotos.map(foto => <span key={foto.archivo} className="escena__rotulo">{foto.rotulo}</span>)}
    </div>
    <div className="escena__progreso" aria-hidden="true">
      {fotos.map(foto => <span key={foto.archivo} className="escena__tramo" />)}
    </div>
  </div>
}
