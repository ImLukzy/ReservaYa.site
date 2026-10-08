import { serverFetch } from '@/lib/server-fetch'
import { urlResenas, type PaginaResenas } from '@/lib/public/resenas'
import { ResenasCliente } from './ResenasCliente'

// Sección de reseñas del perfil /c/[slug] (spec 64). La primera página llega del servidor
// (SEO y sin salto al cargar); orden, "Ver más" y la reseña propia son del cliente.
export async function ResenasSeccion({ slug, complejoNombre }: { slug: string; complejoNombre: string }) {
  let inicial: PaginaResenas | null = null
  try {
    const r = await serverFetch(urlResenas(slug, 'recientes'), { next: { revalidate: 60 } })
    if (r.ok) inicial = await r.json()
  } catch {
    inicial = null
  }
  return <ResenasCliente slug={slug} complejoNombre={complejoNombre} inicial={inicial} />
}
