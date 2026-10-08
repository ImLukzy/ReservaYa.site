import { ApiError } from './api-types'
import { TIPOS_IMAGEN, TOPE_IMAGEN_BYTES, type MediaTipo } from './media'

/** Sube una imagen directo a Cloudflare R2 con URL prefirmada y devuelve su URL pública.
 *  La URL todavía hay que persistirla con el endpoint PUT de la API que corresponda. */
export async function uploadToR2(file: File, tipo: MediaTipo, progreso?: (porcentaje: number) => void, signal?: AbortSignal): Promise<string> {
  if (!(file.type in TIPOS_IMAGEN)) throw new ApiError(400, 'Solo se aceptan imágenes JPG, PNG, WEBP o GIF.')
  if (file.size === 0) throw new ApiError(400, 'El archivo está vacío.')
  if (file.size > TOPE_IMAGEN_BYTES) throw new ApiError(400, 'La imagen no puede superar 3 MB.')

  const firma = await fetch('/api/upload', {
    method: 'POST', signal,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, tipo }),
  })
  const datos = await firma.json().catch(() => null)
  if (!firma.ok) throw new ApiError(firma.status, datos?.error ?? `No se pudo preparar la subida (error ${firma.status})`)
  const { uploadUrl, publicUrl } = datos as { uploadUrl: string; publicUrl: string }

  if (progreso) {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException('Subida cancelada', 'AbortError')); return }
      const xhr = new XMLHttpRequest()
      const abortar = () => xhr.abort()
      signal?.addEventListener('abort', abortar, { once: true })
      xhr.onloadend = () => signal?.removeEventListener('abort', abortar)
      xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'))
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.upload.onprogress = e => { if (e.lengthComputable) progreso(Math.round(e.loaded / e.total * 100)) }
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, 'No se pudo subir la imagen.'))
      xhr.onerror = () => reject(new ApiError(0, 'No se pudo subir la imagen. Revisa tu conexión.'))
      xhr.ontimeout = () => reject(new ApiError(0, 'La subida tardó demasiado. Inténtalo de nuevo.'))
      xhr.timeout = 120000
      xhr.send(file)
    })
    progreso(100)
    return publicUrl
  }
  let subida: Response
  try {
    subida = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file, signal })
  } catch {
    throw new ApiError(0, 'No se pudo subir la imagen. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!subida.ok) throw new ApiError(subida.status, `No se pudo subir la imagen (error ${subida.status})`)
  return publicUrl
}
