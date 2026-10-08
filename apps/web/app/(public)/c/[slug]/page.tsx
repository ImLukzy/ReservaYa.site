import { ArrowLeft, Banknote, Building2, CalendarDays, CircleDot, Images, Layers, MapPin, Phone, Star, Warehouse } from 'lucide-react'
import { GaleriaComplejo } from '@/components/complejos/GaleriaComplejo'
import { MapaUbicacion } from '@/components/complejos/MapaUbicacion'
import { AccionesPerfil } from '@/components/complejos/AccionesPerfil'
import { CanchasPerfil } from '@/components/complejos/CanchasPerfil'
import { linkPublico } from '@/lib/public/sitio'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { serverFetch } from '@/lib/server-fetch'
import { ApiError } from '@/lib/api-types'
import { publicMetadata } from '@/lib/public/metadata'
import { soles } from '@/lib/public/horario'
import { reservaPublicaHref, type ComplejoPublico } from '@/lib/public/complejo-publico'
import { tipoCanchaLabel } from '@/components/features/etiquetasJugador'
import { whatsappUrl } from '@/lib/whatsapp'
import { Button } from '@/components/ui/Button'

type Props = { params: Promise<{ slug: string }> }
const perfil = cache(async (slug: string): Promise<ComplejoPublico> => {
  const response = await serverFetch(`/api/complejos/publico/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
  if (response.status === 404) notFound()
  if (!response.ok) throw new ApiError(response.status, 'No se pudo cargar el complejo')
  return response.json()
})
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { complejo, canchas } = await perfil(slug)
  const description = complejo.descripcion || `Reserva canchas en ${complejo.nombre}, ${complejo.distrito}, ${complejo.ciudad}.`
  const metadata = publicMetadata(`${complejo.nombre} | ReservaYa`, description, `/c/${encodeURIComponent(complejo.slug)}`)
  const image = complejo.imagen || canchas.find(cancha => cancha.imagen)?.imagen
  if (image) {
    metadata.openGraph = { ...metadata.openGraph, images: [{ url: image, alt: complejo.nombre }] }
    metadata.twitter = { ...metadata.twitter, images: [image] }
  }
  return metadata
}
export default async function Page({ params }: Props) {
  const { slug } = await params
  const datos = await perfil(slug)
  const { complejo, canchas, valoracion } = datos
  const telefono = complejo.telefono?.replace(/[^\d+]/g, '')
  const whatsapp = telefono ? whatsappUrl(`Hola, quiero reservar una cancha en ${complejo.nombre}.`, telefono) : null
  const fotos = complejo.fotos.length ? complejo.fotos : complejo.imagen ? [complejo.imagen] : []
  const deportes = [...new Set(canchas.map(c => tipoCanchaLabel[c.tipo] ?? c.tipo))]
  const superficies = [...new Set(canchas.flatMap(c => c.superficie ? [c.superficie] : []))]
  const desde = canchas.length ? Math.min(...canchas.map(c => Number(c.precioPorHora))) : null
  const precio = desde === null ? 'Consultar precio' : `desde ${soles(desde)}`
  const reserva = canchas[0] ? reservaPublicaHref(canchas[0].nombre, complejo.distrito, canchas[0].tipo) : '/canchas'
  const punto = complejo.latitud !== null && complejo.longitud !== null ? { latitud: complejo.latitud, longitud: complejo.longitud } : null
  const detalles = [
    { Icono: CircleDot, titulo: 'Deportes', texto: deportes.join(', ') || 'Por confirmar' },
    { Icono: Layers, titulo: 'Superficies', texto: superficies.join(', ') || 'Por confirmar' },
    { Icono: Banknote, titulo: 'Precio por 60 min', texto: precio },
    { Icono: MapPin, titulo: 'Distrito', texto: complejo.distrito },
    { Icono: Warehouse, titulo: 'Techada', texto: canchas.some(c => c.techada) ? 'Sí, hay canchas techadas' : 'No' },
    { Icono: Building2, titulo: 'Canchas', texto: String(canchas.length) },
  ]
  const schema = { '@context': 'https://schema.org', '@type': 'SportsActivityLocation', name: complejo.nombre, url: linkPublico(complejo.slug), image: fotos,
    address: { '@type': 'PostalAddress', streetAddress: complejo.direccion, addressLocality: complejo.distrito, addressRegion: complejo.ciudad, addressCountry: 'PE' },
    ...(punto ? { geo: { '@type': 'GeoCoordinates', latitude: punto.latitud, longitude: punto.longitud } } : {}),
    ...(telefono ? { telephone: telefono } : {}),
  }
  return <div className="pb-24 lg:pb-10">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <section aria-labelledby="complejo-titulo" className="relative isolate min-h-[28rem] overflow-hidden bg-cancha-noche">
      <Image src={fotos[0] || '/img/hero/futsal-luz.webp'} alt="" fill unoptimized priority sizes="100vw" className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-cancha-noche from-20% via-cancha-noche/75 to-cancha-noche/75" />
      <div className="mx-auto max-w-page px-4 py-8 text-blanco md:px-6 md:py-12">
        <a href="/canchas" className="mb-4 inline-flex min-h-11 items-center gap-2 underline underline-offset-4"><ArrowLeft size={18} />Volver a canchas</a>
        <ul className="mb-4 flex flex-wrap gap-2" aria-label="Deportes y superficies">{[...deportes, ...superficies].map(t => <li key={t} className="rounded-full border border-blanco/40 bg-cancha-noche/75 px-3 py-1 text-sm">{t}</li>)}</ul>
        <h1 id="complejo-titulo" className="titular max-w-texto break-words text-4xl sm:text-6xl">{complejo.nombre}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4"><p className="inline-flex items-center gap-2"><MapPin size={18} />{complejo.distrito}, {complejo.ciudad}</p><p className="inline-flex flex-wrap items-center gap-1"><Estrellas promedio={valoracion.promedio} /><span>{valoracion.total ? `${valoracion.promedio.toFixed(1)} (${valoracion.total})` : 'Sin reseñas'}</span></p></div>
        <p className="mt-5 font-display text-3xl font-bold">{precio}<span className="ml-2 text-sm font-normal">/60 min</span></p>
        <a href="#fotos" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-control border border-blanco/40 bg-cancha-noche/75 px-4"><Images size={18} />Ver fotos</a>
      </div>
    </section>
    <div className="mx-auto grid max-w-page items-start gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-surface border border-cal bg-tiza p-4 sm:p-6" aria-labelledby="detalles-titulo">
          <h2 id="detalles-titulo" className="text-xl font-semibold">Detalles del complejo</h2>
          <dl className="mt-5 grid grid-cols-1 gap-5 min-[390px]:grid-cols-2 sm:grid-cols-3">{detalles.map(({ Icono, titulo, texto }) => <div key={titulo} className="flex min-w-0 gap-3"><Icono className="mt-1 h-5 w-5 shrink-0 text-cesped-hondo" /><div className="min-w-0"><dt className="text-sm text-pizarra">{titulo}</dt><dd className="break-words font-semibold">{texto}</dd></div></div>)}</dl>
          <p className="mt-5 break-words text-pizarra">{complejo.direccion}</p>{complejo.descripcion && <p className="mt-3 break-words text-pizarra">{complejo.descripcion}</p>}
        </section>
        <section id="fotos" className="scroll-mt-24 rounded-surface border border-cal bg-tiza p-4 sm:p-6" aria-labelledby="fotos-titulo"><h2 id="fotos-titulo" className="mb-4 text-xl font-semibold">Fotos de {complejo.nombre} ({fotos.length})</h2><GaleriaComplejo fotos={fotos} nombre={complejo.nombre} /></section>
        <section className="rounded-surface border border-cal bg-tiza p-4 sm:p-6" aria-labelledby="ubicacion-titulo"><h2 id="ubicacion-titulo" className="mb-4 text-xl font-semibold">Ubicación</h2>{punto ? <><MapaUbicacion punto={punto} /><Button apariencia="publica" variante="secundario" href={`https://www.google.com/maps/dir/?api=1&destination=${punto.latitud},${punto.longitud}`} target="_blank" rel="noopener noreferrer"><MapPin size={18} />Cómo llegar · Abrir en Maps</Button></> : <p className="text-pizarra">El complejo aún no ha marcado su ubicación en el mapa.</p>}<p className="my-3 break-words text-pizarra">{complejo.direccion}</p><AccionesPerfil direccion={complejo.direccion} url={linkPublico(complejo.slug)} /></section>
        <section className="rounded-surface border border-cal bg-tiza p-4 sm:p-6" aria-labelledby="contacto-titulo"><h2 id="contacto-titulo" className="flex items-center gap-2 text-xl font-semibold"><Phone size={22} />¿Un problema con tu reserva?</h2><p className="my-3 text-pizarra">Contacta directamente con {complejo.nombre}.</p><div className="mb-2 flex flex-wrap gap-2">{whatsapp && <Button apariencia="publica" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</Button>}{telefono && <Button apariencia="publica" variante="secundario" href={`tel:${telefono}`}><Phone size={18} />{complejo.telefono}</Button>}</div>{telefono ? <AccionesPerfil telefono={complejo.telefono ?? telefono} /> : <p className="text-pizarra">Este complejo aún no tiene teléfono público.</p>}</section>
        {/* Punto de montaje de ResenasSeccion (spec 64, trabajo paralelo). */}
        <section id="resenas" aria-label="Reseñas del complejo" />
      </div>
      <aside id="reservar" className="min-w-0 rounded-surface border border-cal bg-tiza p-4 lg:sticky lg:top-24" aria-labelledby="reservar-titulo"><h2 id="reservar-titulo" className="mb-3 flex items-center gap-2 text-xl font-semibold"><CalendarDays size={22} />Reservar horario</h2><p className="mb-4 text-sm text-pizarra">Canchas de este complejo. Elige una cancha y continúa para consultar sus horarios.</p>{canchas.length ? <CanchasPerfil datos={datos} /> : <p className="text-pizarra">Aún no hay canchas activas.</p>}</aside>
    </div>
    {canchas.length > 0 && <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-cal bg-tiza px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden"><p className="min-w-0 font-semibold">{precio}<span className="block text-xs text-pizarra">por 60 min</span></p><Button apariencia="publica" href={reserva}>Reservar</Button></div>}
  </div>
}
function Estrellas({ promedio }: { promedio: number }) {
  return <span className="inline-flex" aria-label={`${promedio.toFixed(1)} de 5`}>{[1,2,3,4,5].map(n => <Star key={n} size={16} className={n <= Math.round(promedio) ? 'fill-sol text-sol' : 'text-blanco/50'} />)}</span>
}
