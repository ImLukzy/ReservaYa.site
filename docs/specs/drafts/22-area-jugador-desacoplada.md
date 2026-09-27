# Especificación: 22 - Área del jugador bajo arquitectura desacoplada

> **Estado:** 📝 Borrador (requiere aprobación del orquestador/humano antes de iniciar implementación).  
> **Alcance:** Preservación de la arquitectura desacoplada existente (landing pública en Astro y panel autenticado en Next.js separados), canalización de reservas y auditoría de contratos de API.

---

## 1. Objetivo

**Problema:**
Inicialmente se evaluó si convenía unificar el área del jugador (login, búsqueda, perfil, reservas) en un solo dominio/aplicación o mantener la separación actual. En producción (`reservaya.pages.dev` vs `reservaya-panel.vercel.app`), las cookies no se comparten de forma transparente entre orígenes distintos sin configuración de subdominios propios (`PLAN_DESPLIEGUE_GRATUITO.md` §6).

**Decisión Humana (ILK-3):**
Mantener la arquitectura desacoplada existente:
- La **landing pública en Astro** se enfoca exclusivamente en la vitrina pública, marketing, SEO, búsqueda rápida de canchas libres y herramientas abiertas.
- El **panel en Next.js** concentra toda la operativa autenticada de reservas, perfil deportivo, carné digital y gestión transaccional.

**Resultado esperado:**
Reglas claras de frontera entre ambas aplicaciones:
1. La landing en Astro no fuerza ni asume sesión para explorar o buscar canchas. Al pulsar «Reservar», canaliza al jugador al panel mediante enlaces profundos (`/dashboard/canchas?fecha=...&horaInicio=...&complejoId=...`).
2. Rutas legacy como `/mis-reservas` redirigen limpiamente al panel (`${APP}/dashboard/reservas`).
3. Los contratos de API compartidos (`/api/canchas/disponibles`, `/api/resenas/publicas`, `/api/reservas`, etc.) se mantienen invariables y protegidos mediante la especificación OpenAPI (`docs/contracts/openapi-area-jugador.yaml`) y pruebas automáticas de contrato (`reservaya-nextjs-api/lib/contratos-jugador.test.mjs`).

---

## 2. Fuera de alcance

- Unificación de dominios o implementación de cookies compartidas entre subdominios (`.reservaya.pe`) en esta etapa de plan gratuito.
- Cambios de firma o migraciones en la base de datos PostgreSQL.
- Resolución de los bloqueadores de API del backend (`BLOQUEO-API #3` torneos públicos y `BLOQUEO-API #4` disponibilidad sin horario), los cuales están asignados por separado en la tarjeta `ILK-4`.

**Decisiones de producto que requieren aprobación antes de pasar a «Aprobada»:**
1. **Tratamiento de `/jugador/perfil` en Astro:** Se propone mantener la vista informativa de perfil existente en Astro pero con un enlace prominente al panel (`/dashboard/perfil`), o alternativamente convertir `/jugador/perfil` en una redirección directa al panel, eliminando la duplicación de interfaz.

---

## 3. Archivos y componentes afectados

| Archivo | Acción | Propósito |
|---|---|---|
| `docs/contracts/openapi-area-jugador.yaml` | Creado | Contrato formal OpenAPI 3.1 para el área de jugador |
| `reservaya-nextjs-api/lib/contratos-jugador.test.mjs` | Creado | Suite de tests de contrato automatizados (39/39 passing) |
| `docs/audits/22-contratos-api-area-jugador.md` | Creado | Reporte exhaustivo de auditoría técnica y alineación de contratos |
| `reservaya-frontend-astro/src/scripts/filas.ts` | Verificar | Generación de enlaces seguros `urlReservar` hacia `${APP}/dashboard/canchas` |
| `reservaya-frontend-astro/src/pages/mis-reservas.astro` | Mantener | Redirección inmediata a `${APP}/dashboard/reservas` |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx` | Mantener | Recepción de query params (`fecha`, `horaInicio`, `complejoId`) para abrir formulario de reserva |

---

## 4. Diseño y lógica de la frontera desacoplada

### 4.1 Navegación entre aplicaciones (Deep Linking)
- El enlace de reserva generado por Astro en `src/scripts/filas.ts` (`urlReservar`):
  ```typescript
  urlReservar(app: string, cancha: CanchaApi, fecha: string, hora: number): string
  ```
  Produce una URL segura:
  `${APP}/dashboard/canchas?fecha=YYYY-MM-DD&horaInicio=MINUTOS&horaFin=MINUTOS&complejoId=ID`
- Nunca viajan credenciales, tokens ni datos sensibles en la URL.
- Si el usuario no tiene sesión en el panel Next.js al llegar, el middleware de Next.js (`proxy.ts` / edge) redirige a `/login?returnUrl=...`, y tras autenticarse vuelve con los parámetros intactos al formulario de reserva.

### 4.2 Invarianza de Contratos
- Ambos frontends consumen `GET /api/canchas/disponibles` con los mismos parámetros de tiempo en minutos desde la medianoche (`horaInicio: 480` para 08:00, `horaFin: 540` para 09:00).
- La respuesta de la API contiene `{ canchas: [{ cancha, disponible, totalEstimado }], total, limiteAplicado }`, compatible con la estructura esperada por los scripts de Astro y las funciones de Next.js.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Pruebas de contrato OpenAPI | `npm --prefix reservaya-nextjs-api test` | 100% pasando (suite `contratos-jugador.test.mjs`) |
| A2 | Deep link de reserva | Ejecución de test unitario de URL sin fuga de tokens | Pasa |
| A3 | Build de ambos paquetes | `npm --prefix reservaya-frontend-astro run build` y `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A4 | Redirecciones de navegación | Paso por `/mis-reservas` conduce a `/dashboard/reservas` | Observable |

---

## 6. Checklist de verificación

- [x] Contrato OpenAPI 3.1 formal documentado (`docs/contracts/openapi-area-jugador.yaml`).
- [x] Tests automáticos de contrato implementados y pasando (`lib/contratos-jugador.test.mjs`).
- [x] Reporte de auditoría de contratos publicado (`docs/audits/22-contratos-api-area-jugador.md`).
- [x] Redacción de borrador de spec 22 (`docs/specs/drafts/22-area-jugador-desacoplada.md`).
- [ ] Aprobación de god/humano para marcar como Aprobada.

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-27 | Pruebas de contrato | ✅ 39/39 PASS | `lib/contratos-jugador.test.mjs` pasando en `npm test` |
| 2026-09-27 | Redacción de borrador | 📝 Borrador completo | Archivo en `docs/specs/drafts/22-area-jugador-desacoplada.md` |
