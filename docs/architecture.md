# Arquitectura

La web pública y el panel comparten Next.js 16 (:3000). El navegador llama a `/api/*` en ese mismo origen; Next lo reenvía a la API NestJS (:5200). Las imágenes van a R2 vía `apps/web/app/api/upload/route.ts`. La API controla datos, disponibilidad, permisos y sesión HttpOnly; Neon conserva su esquema existente.

## Árbol vigente tras el corte (F8)

- `apps/web/app/(public)`: web pública; sin guarda de sesión en su layout.
- `apps/web/app/(dashboard)`: zonas protegidas `/dashboard`, `/admin`, `/tecnico` (las mismas que protege `apps/web/proxy.ts`).
- `apps/web/components/ui`: componentes compartidos con props de apariencia pública/panel.
- `apps/web/lib`: cliente/servidor API y utilidades públicas; contrato en [api.md](./api.md).
- `apps/api`: API NestJS de producción (todas las rutas).
- `apps/api-dotnet`: API .NET solo rollback hasta 2026-10-21.

## Rutas vigentes

16 rutas públicas: `/`, `/canchas`, `/duenos`, `/torneos`, `/sortear`, `/completar-cuadro`, `/ayuda`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/completar-registro`, `/mejoras`, `/libro-reclamaciones`, `/legal/privacy`, `/legal/terms`.

404 es una respuesta para URLs desconocidas y 500 usa el boundary de error; no son dos rutas de negocio adicionales. El inventario anterior tenía 16 archivos `.astro` (incluidos 404/500) y dos Markdown: 18 archivos. La cifra de 22 rutas documentada antes de spec 25 pertenecía a otra versión y no se obtiene restando cinco a esos 18 archivos.

Cinco rutas heredadas responden 301: `/precios` y `/publica-tu-cancha` → `/duenos`; `/jugador/perfil` → `/dashboard/perfil`; `/mis-reservas` → `/dashboard/reservas`; `/mis-partidos` → `/dashboard/partidos`. El destino del panel conserva su guarda.

## Sesión

La API emite la cookie HttpOnly `token`. Las solicitudes autenticadas incluyen cookies; el cliente no lee ni guarda el JWT. Login/registro validan retorno local con `returnUrlSeguro` y usan `fallbackPorRol`. El proxy se limita a las zonas protegidas.

El inventario previo se conserva en [el archivo histórico](./specs/archivo/astro-architecture.md).
