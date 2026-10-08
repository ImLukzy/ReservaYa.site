// Reglas de imágenes compartidas por la firma R2 (servidor) y la subida (cliente).
// Mismo criterio que la API .NET (Services/ImagenArchivo): JPG/PNG/WEBP/GIF, tope 3 MB.
export const MEDIA_TIPOS = ['cancha', 'perfil', 'partido', 'complejo'] as const
export type MediaTipo = (typeof MEDIA_TIPOS)[number]

export const TIPOS_IMAGEN = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const

export const TOPE_IMAGEN_BYTES = 3 * 1024 * 1024

/** Imagen propia: subida histórica en disco de la API (/uploads/...) o en R2. */
export function esImagenPropia(url: string | null | undefined): url is string {
  if (!url) return false
  const mediaUrl = (process.env.NEXT_PUBLIC_MEDIA_URL ?? '').replace(/\/+$/, '')
  return url.startsWith('/uploads/') || (mediaUrl !== '' && url.startsWith(`${mediaUrl}/`))
}
