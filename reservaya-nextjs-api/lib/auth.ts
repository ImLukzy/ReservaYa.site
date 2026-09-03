import { SignJWT, jwtVerify } from 'jose'
import { config } from './config'

const SECRET = new TextEncoder().encode(config.jwtSecret)

export type Rol = 'USUARIO' | 'ADMIN' | 'SUPERADMIN'

export interface JWTPayload {
  id: string
  email: string
  nombre: string
  rol: Rol
  tv: number
}

function isJWTPayload(payload: unknown): payload is JWTPayload {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.email === 'string' &&
    typeof p.nombre === 'string' &&
    (p.rol === 'USUARIO' || p.rol === 'ADMIN' || p.rol === 'SUPERADMIN') &&
    typeof p.tv === 'number'
  )
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiration)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
    })
    if (!isJWTPayload(payload)) return null
    return payload
  } catch {
    return null
  }
}