# Especificación: 22 - Área del jugador bajo arquitectura desacoplada

> **Estado:** ✅ Aprobada (2026-09-27) — implementación en `feature/22-unificar-jugador`.  
> **Alcance:** Preservación de la arquitectura desacoplada existente (landing pública en Astro y panel autenticado en Next.js separados), canalización de reservas, redirección directa de perfil y auditoría de contratos de API.

---

## 1. Objetivo

**Problema:**
Inicialmente se evaluó si convenía unificar el área del jugador (login, búsqueda, perfil, reservas) en un solo dominio/aplicación o mantener la separación actual. En producción (`reservaya.pages.dev` vs `reservaya-panel.vercel.app`), las cookies no se comparten de forma transparente entre orígenes distintos sin configuración de subdominios propios (`PLAN_DESPLIEGUE_GRATUITO.md` §6). Además, mantener una pantalla de perfil funcional en Astro (`src/pages/jugador/perfil.astro`) duplicaba 300+ líneas de lógica cliente, llamadas directas a `/api/auth/me` y mutaciones con credenciales de terceros.

**Decisión Humana (ILK-3):**
1. **Arquitectura desacoplada:**
   - La **landing pública en Astro** se enfoca exclusivamente en la vitrina pública, marketing, SEO, búsqueda rápida de canchas libres y herramientas abiertas.
   - El **panel en Next.js** concentra toda la operativa autenticada de reservas, perfil deportivo, carné digital y gestión transaccional.
2. **Tratamiento de `/jugador/perfil`:**
   - Se elimina la duplicación de interfaz en Astro: `/jugador/perfil` pasa a ser una redirección inmediata hacia `${APP}/dashboard/perfil`, siguiendo el mismo patrón arquitectónico de `/mis-reservas`.

**Resultado esperado:**
Reglas claras y limpias de frontera entre ambas aplicaciones:
1. La landing en Astro no fuerza ni asume sesión para explorar o buscar canchas. Al pulsar «Reservar», canaliza al jugador al panel mediante enlaces profundos (`/dashboard/canchas?fecha=...&horaInicio=...&complejoId=...`).
2. Rutas de sesión en Astro (`/mis-reservas` y `/jugador/perfil`) ejecutan redirección inmediata y limpia al panel (`${APP}/dashboard/reservas` y `${APP}/dashboard/perfil`).
3. Los contratos de API compartidos (`/api/canchas/disponibles`, `/api/resenas/publicas`, `/api/reservas`, etc.) se mantienen invariables y protegidos mediante la especificación OpenAPI (`docs/contracts/openapi-area-jugador.yaml`) y pruebas automáticas de contrato (`reservaya-nextjs-api/lib/contratos-jugador.test.mjs`).

---

## 2. Fuera de alcance

- Unificación de dominios o implementación de cookies compartidas entre subdominios (`.reservaya.pe`) en esta etapa de plan gratuito.
- Cambios de firma o migraciones en la base de datos PostgreSQL.
- Resolución de los bloqueadores de API del backend (`BLOQUEO-API #3` torneos públicos y `BLOQUEO-API #4` disponibilidad sin horario), asignados en la tarjeta `ILK-4`.

**Decisiones de producto cerradas (Aprobadas por el humano en ASK ME ILK-3, 2026-09-27):**
1. **Arquitectura desacoplada:** ✅ Aprobada. Mantener separación entre landing pública (Astro) y panel autenticado (Next.js).
2. **Redirección de `/jugador/perfil`:** ✅ Aprobada. `/jugador/perfil` en Astro se convierte en redirección inmediata hacia `${APP}/dashboard/perfil`, eliminando la duplicación de UI y mutaciones en Astro, replicando el patrón probado de `src/pages/mis-reservas.astro`.

---

## 3. Archivos y componentes afectados

| Archivo | Acción | Propósito |
|---|---|---|
| `docs/contracts/openapi-area-jugador.yaml` | Creado | Contrato formal OpenAPI 3.1 para el área de jugador y vitrina pública |
| `reservaya-nextjs-api/lib/contratos-jugador.test.mjs` | Creado | Suite de tests de contrato automatizados (39/39 passing) |
| `docs/audits/22-contratos-api-area-jugador.md` | Creado | Reporte exhaustivo de auditoría técnica y alineación de contratos |
| `reservaya-frontend-astro/src/pages/jugador/perfil.astro` | Modificar | Reemplazar vista cliente por redirección inmediata a `${APP}/dashboard/perfil` |
| `reservaya-frontend-astro/src/pages/mis-reservas.astro` | Mantener | Redirección inmediata a `${APP}/dashboard/reservas` (patrón de referencia) |
| `reservaya-frontend-astro/src/scripts/filas.ts` | Verificar | Generación de enlaces seguros `urlReservar` hacia `${APP}/dashboard/canchas` |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx` | Mantener | Recepción de query params (`fecha`, `horaInicio`, `complejoId`) para abrir formulario de reserva |

---

## 4. Diseño y lógica de la frontera desacoplada

### 4.1 Patrón de Redirección Canónica (`src/pages/jugador/perfil.astro`)
Siguiendo la regla estricta de scripts inline de `docs/skills/astro-landing.md`:
```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { APP } from "../../lib/entorno";
import { BOTON } from "../../lib/estilos";

const destino = `${APP}/dashboard/perfil`;
---

<BaseLayout title="Mi perfil | ReservaYa" robots="noindex, follow">
  <meta http-equiv="refresh" content={`0;url=${destino}`} slot="head" />
  <section class="mx-auto max-w-texto px-4 py-16 text-center">
    <h1 class="text-2xl">Te llevamos a tu perfil</h1>
    <p class="mt-2 text-pizarra">Si no pasa nada en unos segundos, entra desde aquí.</p>
    <a href={destino} class={`${BOTON.primario} mt-5`}>Ver mi perfil</a>
  </section>
</BaseLayout>

<script is:inline define:vars={{ destino }}>
  window.location.replace(destino);
</script>
```

### 4.2 Navegación entre aplicaciones (Deep Linking)
- El enlace de reserva generado por Astro en `src/scripts/filas.ts` (`urlReservar`):
  ```typescript
  urlReservar(app: string, cancha: CanchaApi, fecha: string, hora: number): string
  ```
  Produce una URL segura:
  `${APP}/dashboard/canchas?fecha=YYYY-MM-DD&horaInicio=MINUTOS&horaFin=MINUTOS&complejoId=ID`
- Nunca viajan credenciales, tokens ni datos sensibles en la URL.
- Si el usuario no tiene sesión en el panel Next.js al llegar, el middleware de Next.js (`proxy.ts` / edge) redirige a `/login?returnUrl=...`, y tras autenticarse vuelve con los parámetros intactos al formulario de reserva.

### 4.3 Invarianza de Contratos
- Ambos frontends consumen `GET /api/canchas/disponibles` con los mismos parámetros de tiempo en minutos desde la medianoche (`horaInicio: 480` para 08:00, `horaFin: 540` para 09:00).
- La respuesta de la API contiene `{ canchas: [{ cancha, disponible, totalEstimado }], total, limiteAplicado }`, compatible con la estructura esperada por los scripts de Astro y las funciones de Next.js.

---

## 5. Criterios de aceptación

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Pruebas de contrato OpenAPI | `npm --prefix reservaya-nextjs-api test` | 100% pasando (suite `contratos-jugador.test.mjs`) |
| A2 | Deep link de reserva | Ejecución de test unitario de URL sin fuga de tokens | Pasa |
| A3 | Build de ambos paquetes | `npm --prefix reservaya-frontend-astro run build` y `npm --prefix reservaya-nextjs-api run build` | 0 errores |
| A4 | Redirección `/mis-reservas` | Paso por `/mis-reservas` conduce a `/dashboard/reservas` | Observable |
| A5 | Redirección `/jugador/perfil` | Paso por `/jugador/perfil` conduce a `/dashboard/perfil` | Observable |

---

## 6. Checklist de verificación

- [x] Contrato OpenAPI 3.1 formal documentado (`docs/contracts/openapi-area-jugador.yaml`).
- [x] Tests automáticos de contrato implementados y pasando (`lib/contratos-jugador.test.mjs`).
- [x] Reporte de auditoría de contratos publicado (`docs/audits/22-contratos-api-area-jugador.md`).
- [x] Decisión humana de `/jugador/perfil` cerrada y plasmada en la spec (redirección a `${APP}/dashboard/perfil`).
- [x] Spec 22 lista para promover a `docs/specs/` tras visto bueno final.
- [x] Implementar redirección en `src/pages/jugador/perfil.astro` (commit local `2861c00`).

---

## 7. Registro de verificación

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-27 | Pruebas de contrato | ✅ 39/39 PASS | `lib/contratos-jugador.test.mjs` pasando en `npm test` |
| 2026-09-27 | Redacción de borrador | 📝 Borrador completo | Archivo en `docs/specs/drafts/22-area-jugador-desacoplada.md` |
| 2026-09-27 | Cierre de decisiones ILK-3 | ✅ Decisiones cerradas | Decisión ASK ME de Lukas plasmada en la spec; promovida a `docs/specs/` |
| 2026-09-27 | Redirección `/jugador/perfil` | ✅ PASS (Commit `2861c00`) | `src/pages/jugador/perfil.astro` redirige a `${APP}/dashboard/perfil`. Gates JIM-QA (1/3): `astro check` 0 errores, Astro build 22 páginas OK, Next.js typecheck y tests 39/39 passing |

---

## 8. Hallazgos post-implementación y análisis de riesgos (Bloqueo de fusión)

- **Hallazgo (Dwight-Explora, 2026-09-27 22:15 UTC):**
  La pantalla retirada en Astro (`src/pages/jugador/perfil.astro`) contaba con funcionalidad activa para editar número de teléfono, cambiar nombre de usuario (username con límite anual), fecha de nacimiento (por única vez) y subida de avatar/foto (`PATCH /api/usuarios/me` y `POST /api/usuarios/me/foto`).
- **Regresión detectada:**
  La pantalla de destino en Next.js (`reservaya-nextjs-api/app/(dashboard)/dashboard/perfil/page.tsx`), tras el retiro de datos RPG en commit `67a51ab`, es actualmente de **solo lectura**. Muestra las métricas operativas reales (reservas totales, completadas y confirmadas), pero no incluye formularios ni botones de acción para editar datos personales o subir fotos (`api-client.ts` carece de métodos cliente para dichas mutaciones).
- **Riesgo:**
  Pérdida temporal de la capacidad del jugador para actualizar sus datos de contacto y avatar.
- **Acción mitigadora y estado:**
  La rama `feature/22-unificar-jugador` queda en estado **bloqueada para fusión** (`blocked` en kanban `ILK-3`) hasta que Lukas apruebe la vía de resolución en la tarjeta ASK ME:
  1. *Opción 1 (Recomendada):* Incorporar los formularios de edición en `/dashboard/perfil/page.tsx` dentro de la Fase 2 de Spec 21 (`feature/21-panel-operativo`), fusionando `feature/22` únicamente tras restablecer la paridad funcional.
  2. *Opción 2:* Revertir temporalmente la redirección en Astro y conservar la vista cliente.
  3. *Opción 3:* Aceptar la degradación funcional a solo lectura de forma permanente.

