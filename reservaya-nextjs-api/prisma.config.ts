import { defineConfig } from 'prisma/config'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

// El CLI de Prisma no carga .env por sí solo porque el datasource se define
// aquí. Cargarlo explícitamente evita fallos en generate/migrate/seed.
if (existsSync('.env')) {
  loadEnvFile('.env')
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: databaseUrl
    ? {
        // Se prefiere la conexión directa para operaciones del CLI (migraciones),
        // tal como recomienda Neon para Prisma Migrate.
        url: databaseUrl,
      }
    : undefined,
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
})