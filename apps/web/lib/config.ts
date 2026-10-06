const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET no está definida o tiene menos de 32 caracteres. Configúrala en el archivo .env'
  )
}

export const config = {
  jwtSecret,
  jwtCookieName: 'token',
  jwtExpiration: '7d',
  cookieMaxAge: 60 * 60 * 24 * 7,
  rateLimit: {
    login: { limit: 5, windowMs: 15 * 60 * 1000 },
    register: { limit: 5, windowMs: 60 * 60 * 1000 },
  },
} as const