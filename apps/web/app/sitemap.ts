import type { MetadataRoute } from 'next'
import { getJson } from '@/lib/server-fetch'

// Sitemap dinámico (spec 67): rutas públicas + /c/<slug> de complejos
// visibles. Si la API no responde (build sin BACKEND_URL), sale solo con
// las estáticas para no romper el build.
export const revalidate = 3600

const SITIO = 'https://reservaya.site'

const ESTATICAS: MetadataRoute.Sitemap = [
  { url: `${SITIO}/`, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITIO}/canchas`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${SITIO}/jugar`, changeFrequency: 'daily', priority: 0.8 },
  { url: `${SITIO}/duenos`, changeFrequency: 'weekly', priority: 0.9 },
  { url: `${SITIO}/libro-reclamaciones`, changeFrequency: 'yearly', priority: 0.5 },
  { url: `${SITIO}/ayuda`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITIO}/legal/terms`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITIO}/legal/privacy`, changeFrequency: 'yearly', priority: 0.3 },
]

interface SlugVisible {
  slug: string
  actualizadoEn: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const slugs = await getJson<SlugVisible[]>('/api/complejos/publicos/slugs', { next: { revalidate: 3600 } })
    const dinamicas: MetadataRoute.Sitemap = slugs
      .filter((c) => typeof c.slug === 'string' && c.slug.length > 0)
      .map((c) => ({
        url: `${SITIO}/c/${encodeURIComponent(c.slug)}`,
        lastModified: c.actualizadoEn,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    return [...ESTATICAS, ...dinamicas]
  } catch {
    return ESTATICAS
  }
}
