import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getSession } from '@/lib/session'
import { crearLimite } from '@/lib/limite-subidas'
import { MEDIA_TIPOS, TIPOS_IMAGEN, TOPE_IMAGEN_BYTES, type MediaTipo } from '@/lib/media'

// Firma de subida directa a Cloudflare R2 (PUT prefirmado, 5 min). Este route
// handler estático se sirve antes del rewrite /api/:path* → BACKEND_URL
// (afterFiles), así que no llega a la API .NET. La URL pública resultante se
// persiste después con los endpoints PUT de la API, que validan MEDIA_PUBLIC_URL.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cancha: mismos roles que POST /api/canchas/{id}/imagen; la propiedad de la
// cancha la vuelve a decidir la API al persistir la URL.
const ROLES_POR_TIPO: Record<MediaTipo, readonly string[] | null> = {
  cancha: ['ADMIN', 'SUPERADMIN', 'TECNICO'],
  complejo: ['ADMIN', 'SUPERADMIN', 'TECNICO'],
  perfil: null,
  partido: null,
}

// 20 firmas / 10 min por usuario. En memoria y por instancia (ver lib/limite-subidas).
const limite = crearLimite()

let cliente: S3Client | null = null
function s3(endpoint: string, accessKeyId: string, secretAccessKey: string): S3Client {
  // WHEN_REQUIRED: sin checksum CRC32 por defecto en la firma (R2 y el PUT del
  // navegador no lo envían y la firma fallaría).
  cliente ??= new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return cliente
}

function slug(nombre: string): string {
  const base = nombre.replace(/\.[^.]*$/, '')
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return limpio || 'imagen'
}

function error(status: number, mensaje: string) {
  return NextResponse.json({ error: mensaje }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return error(401, 'Inicia sesión para subir imágenes')
  if (!limite.permitir(session.id)) {
    return error(429, 'Demasiadas subidas seguidas. Espera unos minutos e inténtalo de nuevo')
  }

  const bucket = process.env.R2_BUCKET_NAME
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, '')
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !mediaUrl) {
    return error(503, 'La subida de imágenes no está configurada')
  }

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return error(400, 'Solicitud inválida')
  const { filename, contentType, tipo, size } = body as Record<string, unknown>

  if (typeof tipo !== 'string' || !(MEDIA_TIPOS as readonly string[]).includes(tipo)) {
    return error(400, 'Tipo de imagen inválido')
  }
  const roles = ROLES_POR_TIPO[tipo as MediaTipo]
  if (roles && !roles.includes(session.rol)) return error(403, 'Sin permisos')

  if (typeof contentType !== 'string' || !(contentType in TIPOS_IMAGEN)) {
    return error(400, 'Solo se aceptan imágenes JPG, PNG, WEBP o GIF')
  }
  if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0) {
    return error(400, 'Tamaño de archivo inválido')
  }
  if (size > TOPE_IMAGEN_BYTES) return error(400, 'La imagen no puede superar 3 MB')

  const ext = TIPOS_IMAGEN[contentType as keyof typeof TIPOS_IMAGEN]
  const nombre = typeof filename === 'string' ? filename : ''
  const key = `uploads/${tipo}/${session.id.replace(/[^A-Za-z0-9_-]/g, '')}/${Date.now()}-${randomUUID().slice(0, 8)}-${slug(nombre)}.${ext}`

  try {
    // ContentType y ContentLength van firmados: R2 rechaza un PUT con otro tipo o tamaño.
    const uploadUrl = await getSignedUrl(
      s3(endpoint, accessKeyId, secretAccessKey),
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size }),
      { expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length']) },
    )
    return NextResponse.json(
      { uploadUrl, publicUrl: `${mediaUrl}/${key}`, key },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return error(500, 'No se pudo preparar la subida de la imagen')
  }
}
