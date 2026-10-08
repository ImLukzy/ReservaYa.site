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
  const { complejo, canchas, valoracion } = await perfil(slug)
  const telefono = complejo.telefono?.replace(/[^\d+]/g, '')
  const whatsapp = telefono ? whatsappUrl(`Hola, quiero reservar una cancha en ${complejo.nombre}.`, telefono) : null
  return <div className="mx-auto w-full max-w-page px-4 py-8 md:px-6">
    <section aria-labelledby="complejo-titulo" className="grid gap-6 md:grid-cols-2">
      <div className="relative aspect-video overflow-hidden rounded-surface bg-tiza">
        <Image src={complejo.imagen || '/img/hero/futsal-luz.webp'} alt={complejo.imagen ? complejo.nombre : ''} fill unoptimized sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className="min-w-0">
        <h1 id="complejo-titulo" className="titular break-words text-4xl text-basalto">{complejo.nombre}</h1>
        <p className="mt-3 text-pizarra">{complejo.distrito}, {complejo.ciudad}</p>
        <p className="mt-2 break-words text-pizarra">{complejo.direccion}</p>
        {complejo.descripcion && <p className="mt-4 break-words text-pizarra">{complejo.descripcion}</p>}
        <p className="mt-4 text-pizarra">{valoracion.total ? `${valoracion.promedio.toFixed(1)} de 5 · ${valoracion.total} reseñas` : 'Aún no tiene reseñas'}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {telefono && <Button apariencia="publica" variante="secundario" href={`tel:${telefono}`}>Llamar</Button>}
          {whatsapp && <Button apariencia="publica" variante="secundario" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</Button>}
        </div>
      </div>
    </section>
    <section aria-labelledby="canchas-titulo" className="mt-10">
      <h2 id="canchas-titulo" className="titulo-seccion text-3xl text-basalto">Canchas</h2>
      {!canchas.length && <p className="mt-4 text-pizarra">Este complejo aún no tiene canchas activas.</p>}
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {canchas.map(cancha => <li key={cancha.id} className="min-w-0 overflow-hidden rounded-surface border border-cal bg-tiza">
          <div className="relative aspect-video bg-sillar">
            <Image src={cancha.imagen || '/img/hero/futsal-luz.webp'} alt={cancha.imagen ? cancha.nombre : ''} fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="p-4">
            <h3 className="break-words text-xl font-semibold text-basalto">{cancha.nombre}</h3>
            <p className="mt-2 text-pizarra">{tipoCanchaLabel[cancha.tipo] ?? cancha.tipo} · {cancha.techada ? 'Techada' : 'Al aire libre'}</p>
            <p className="mt-2 text-sm text-pizarra">{cancha.superficie ? `${cancha.superficie} · ` : ''}{cancha.capacidad} jugadores</p>
            <p className="mt-3 font-semibold text-basalto">{soles(cancha.precioPorHora)} / 60 min</p>
            <Button apariencia="publica" className="mt-4 w-full" href={reservaPublicaHref(cancha.nombre, complejo.distrito, cancha.tipo)}>Reservar</Button>
          </div>
        </li>)}
      </ul>
    </section>
  </div>
}
