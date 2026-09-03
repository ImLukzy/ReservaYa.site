import { defineConfig } from 'prisma/config'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

// El CLI de Prisma no carga .env por sí solo porque el datasource se define
// aquí. Cargarlo explícitamente evita fallos en generate/migrate/seed.
if (existsSync('.env')) {
  loadEnvFile('.env')
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL no está definida')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Se prefiere la conexión directa para operaciones del CLI (migraciones),
    // tal como recomienda Neon para Prisma Migrate.
    url: databaseUrl,
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
})