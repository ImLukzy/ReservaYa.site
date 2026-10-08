export const SITIO = 'https://reservaya.site'
export function linkPublico(slug: string): string {
  return `${SITIO}/c/${encodeURIComponent(slug)}`
}
