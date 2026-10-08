import { TOPE_IMAGEN_BYTES } from './media'
export async function comprimirFoto(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Usa JPG, PNG o WebP.')
  if (!file.size || file.size > TOPE_IMAGEN_BYTES) throw new Error('Cada foto debe pesar como máximo 3 MB.')
  let image: ImageBitmap
  try { image = await createImageBitmap(file) }
  catch { throw new Error('No se pudo leer la imagen. Prueba con otra foto JPG, PNG o WebP.') }
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la foto.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo comprimir la foto.')), 'image/webp', 0.82))
    if (blob.type !== 'image/webp' || blob.size > TOPE_IMAGEN_BYTES) throw new Error('No se pudo comprimir a WebP de menos de 3 MB.')
    return new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.webp`, { type: 'image/webp' })
  } catch { throw new Error('No se pudo preparar la foto. Prueba con otra imagen JPG, PNG o WebP.') }
  finally { image.close() }
}
