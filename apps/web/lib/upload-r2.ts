import { ApiError } from './api-types'
import { TIPOS_IMAGEN, TOPE_IMAGEN_BYTES, type MediaTipo } from './media'

/** Sube una imagen directo a Cloudflare R2 con URL prefirmada y devuelve su URL pública.
 *  La URL todavía hay que persistirla con el endpoint PUT de la API que corresponda. */
export async function uploadToR2(file: File, tipo: MediaTipo): Promise<string> {
  if (!(file.type in TIPOS_IMAGEN)) throw new ApiError(400, 'Solo se aceptan imágenes JPG, PNG, WEBP o GIF.')
  if (file.size === 0) throw new ApiError(400, 'El archivo está vacío.')
  if (file.size > TOPE_IMAGEN_BYTES) throw new ApiError(400, 'La imagen no puede superar 3 MB.')

  const firma = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, tipo }),
  })
  const datos = await firma.json().catch(() => null)
  if (!firma.ok) throw new ApiError(firma.status, datos?.error ?? `No se pudo preparar la subida (error ${firma.status})`)
  const { uploadUrl, publicUrl } = datos as { uploadUrl: string; publicUrl: string }

  let subida: Response
  try {
    subida = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  } catch {
    throw new ApiError(0, 'No se pudo subir la imagen. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!subida.ok) throw new ApiError(subida.status, `No se pudo subir la imagen (error ${subida.status})`)
  return publicUrl
}
