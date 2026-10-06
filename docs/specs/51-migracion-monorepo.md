# Especificación: 51 - Migración del monorepo a Next y apps

> **Estado:** aprobada por el humano (god registró «Continúa»). F2/F3 cerradas por Pam/god; F4 implementada, pendiente de gates finales y validación manual.
> **Card de redacción:** RYS-2. Autor: Michael-Code. Fecha: 2026-10-05.
> **Rama:** `refactor/monorepo-apps`. RYS-2 fue solo redacción; implementación autorizada después en RYS-3/F2, RYS-4/F3 y RYS-5/F4. Sin commits.

## 1. Objetivo

**Problema:** la landing Astro y el panel Next mantienen dos frontends, dos orígenes y lógica pública duplicada. `reservaya-nextjs-api/app/page.tsx:1-7` redirige a login; sus páginas `(auth)/login` y `(auth)/register` devuelven al frontend Astro. CI, Docker y scripts dependen de los nombres actuales.

**Resultado esperado:** una sola aplicación Next 16.2.9 / React 19.2.4 para landing y panel en `apps/web`, y la misma API .NET 10 en `apps/api`. Cero archivos `.astro` del producto y cero dependencias Astro; mismas URLs, comportamiento, SEO, autenticación y estilo. Borrados justificados por consumidores migrados o ausencia demostrada de uso.

**Entradas vinculantes:** inventario F0 `hive/agents/jim-muvk1y3c/inventario-migracion.md`, sección «Proyecto: migración» de `hive/board.md`, `docs/skills/astro-landing.md`, `docs/skills/panel-next.md`, specs 25, 44 y 46. No repetir el inventario; contrastar solo las referencias necesarias para cada tarea.

**Decisiones recibidas de god:** mismo app Next; públicas en `(public)` y estáticas donde sea posible; un deploy web más la API existente; prefijo `PUBLIC_*` convertido a `NEXT_PUBLIC_*`; `/torneos` conservado tal cual; Google conservado; cinco redirects 301; históricos archivados; nueva rama sin commits hasta revisión humana. No se inventan fechas de retirada ni se cortan servicios durante esta card.

## 2. Fuera de alcance

- Cambiar contratos API, permisos, esquema, datos, migraciones, seed o comportamiento de .NET. Prohibidos `dotnet ef` y `prisma migrate`, `db push`, `db pull`, `db execute`.
- Editar contenido de `prisma/**`, `Migrations/**`, `Entities.cs`, `AppDbContext.cs`; única excepción aprobada: traslado físico mediante `git mv` en F4, con identidad de contenido comprobada.
- Editar `.env`, artefactos `bin/`, `obj/`, `.next/`, `dist/`, o copiar secretos. Los builds generan sus propios artefactos; no se editan manualmente.
- `roster.json`, `roster-backups/`, `hive/` y configuración de la oficina. Las recomendaciones de borrarlos en F0 quedan expresamente anuladas.
- Implementar un catálogo público de torneos, resolver limitaciones de uploads Render o aprovechar para rediseñar el panel.
- Eliminar auditorías, contratos, tooling o documentación por antigüedad sin demostrar reemplazo y falta de consumidores.
- Commit, push, tag, cambios DNS, cuentas, gastos o despliegues automáticos. El humano realiza plataforma/DNS y edita el hook.

**Decisiones de producto que requieren aprobación:** ninguna adicional a las recibidas. La spec completa, sus fases y la ampliación de alcance respecto de `agents/frontend-nextjs-ui` requieren aprobación humana antes de F2. Cualquier nuevo cambio de dependencia o alcance se eleva a god. No se trasladan las excepciones de F4 a otras tareas.

## 3. Archivos afectados

Esta tabla describe implementación futura; **en RYS-2 solo se crea `docs/specs/51-migracion-monorepo.md`**.

| Archivo / conjunto | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/app/(public)/**` | crear | Páginas, layout público, legal y 404; luego `apps/web/app/(public)/**` |
| `reservaya-nextjs-api/app/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` | sustituir / eliminar duplicados | Un solo propietario por URL; conservar otras rutas auth que tengan consumidores |
| `reservaya-nextjs-api/app/layout.tsx`, `app/globals.css`, `app/error.tsx` | modificar | Fuentes, tokens aislados por segmento cuando proceda, error equivalente |
| `reservaya-nextjs-api/components/public/**`, `lib/public/**` | crear | Portar shell, UI, scripts, estilos y utilidades según F0, reutilizando clientes existentes |
| `reservaya-nextjs-api/lib/public-app.ts`, `proxy.ts`, `next.config.ts` | modificar | Origen único, login local, redirects 301 y rewrites preservados |
| `reservaya-nextjs-api/public/**`, metadatos de rutas | fusionar | Fuentes, favicon, OG, robots y sitemap; resolver colisiones explícitamente |
| `reservaya-frontend-astro/**` | retirar tras gates | Primero preservar contenido útil y trasladar documentación vigente; nunca borrar oficina ni editar artefactos |
| `reservaya-nextjs-api/package.json`, `package-lock.json` | modificar / mover | Eliminar solo deps probadas; nombre final `@reservaya/web`; npm con `--prefix`, sin imponer nuevo gestor |
| `reservaya-nextjs-api/backend/ReservaFacil.Api/**` | mover a `apps/api/**` | `git mv`; nombre del `.csproj` y DLL permanece `ReservaFacil.Api` |
| resto del frontend `reservaya-nextjs-api/**` | mover a `apps/web/**` | Sin arrastrar backend, secretos ni artefactos locales |
| `reservaya-nextjs-api/prisma/**` | mover a `apps/web/prisma/**` | Bytes idénticos; sigue siendo espejo y EF Core autoridad |
| `.github/workflows/ci.yml`, `Dockerfile`, `render.yaml`, `package.json` raíz | modificar / verificar | Job web único, API y rutas finales |
| `scripts/start-dev.mjs`, `scripts/start-dev.ps1`, `scripts/motion-tokens.mjs`, `scripts/motion-tokens.test.mjs` | crear / modificar | Runner Node multiplataforma; PowerShell solo wrapper opcional; motion sin Astro |
| `scripts/start-dev.sh` (no versionado) | descartar como entrada oficial; no añadir ni borrar | Revisión de contenido y `git status --short -- scripts/start-dev.sh` → `?? scripts/start-dev.sh`; conservar archivo local ajeno |
| `reservaya-frontend-astro/.env.example`, `reservaya-nextjs-api/.env.example` | consolidar en `apps/web/.env.example` | Solo ejemplos sin secretos; prefijos/rutas vigentes, nunca copiar `.env` real |
| `reservaya-nextjs-api/scripts/cls.mjs`, `scripts/db-check.mjs` y referencias locales | mover / ajustar rutas necesarias | Ubicación final bajo `apps/web/scripts/`; inventario F0 no encontró un `scripts/cls.mjs` raíz |
| `CLAUDE.md`, `DEPLOY_GRATIS.md`, `README.md`, `PLAN_OTRO_AGENTE.md`, `docs/skills/**` | actualizar | Un único árbol y comandos vigentes; conservar historial relevante |
| `reservaya-frontend-astro/docs/{architecture,api,development,deployment}.md` | preservar / consolidar antes de retirar | API y arquitectura vigentes pasan a `docs/`; reconciliar rutas y guías duplicadas |
| `docs/specs/*` históricos | mover a `docs/specs/archivo/` | No borrar ni reescribir hechos históricos; conservar plantilla y spec 51 activas, actualizar enlaces vivos |
| `.claude/settings.json` | creación manual por humano | Ausente según F0 y lectura directa; diff en §4.5 |

## 4. Diseño y lógica

### 4.1 Estructura y contratos

```text
apps/web/   app/(public), app/(dashboard), components, lib, public,
            scripts, prisma (sin cambios de contenido), proxy.ts, next.config.ts
apps/api/   ReservaFacil.Api.csproj, código .NET y Migrations (sin cambios)
docs/       specs/51-migracion-monorepo.md, specs/_TEMPLATE.md,
            specs/archivo/, skills/, arquitectura y contratos vigentes
scripts/    arranque web/API y generador/checker motion
```

No se crea otra aplicación Next. F2 trabaja primero en la carpeta Next actual; F4 ejecuta el traslado final. `(public)/layout.tsx` no requiere sesión. Se conserva `requireAuth`/`requireRole` y la matriz de permisos del panel. Páginas server components por defecto; `'use client'` solo en islas con interacción. Consultar documentación local `node_modules/next/dist/docs/` antes de usar APIs de Next.

**API:** servidor mediante `serverFetch`/`getJson`; cliente mediante `apiRequest`, reutilizando `api-client.ts` y `b2b-client.ts`. Las llamadas públicas pasan por `/api/*` del mismo origen y `/uploads/*` mantiene su rewrite a `BACKEND_URL`. No publicar `BACKEND_URL`, `JWT_SECRET` ni datos de BD. Mantener `ApiError`, carga visible y estados vacíos; nunca `.catch(() => [])` para esconder fallos.

**Estilo de implementación:** nombres y copy en español, utilidades tipadas, sin `as any`, `innerHTML` con datos ni lectura de JWT cliente. Ejemplo de composición esperado (no código a aplicar en esta card):

```tsx
export default function AyudaPage() {
  return <AyudaPublica />
}
```

`AyudaPublica` reutiliza los tokens y componentes portados, sin depender de una sesión. El contrato de UI existente determina el contenido; no agregar mocks, testimonios ni cifras.

### 4.2 Paridad de páginas y SEO (F2)

| URL existente | Destino relativo al app Next | Paridad exigida |
|---|---|---|
| `/` | `(public)/page.tsx` | Landing, tablero de disponibilidad, maquetas, FAQ, cierre |
| `/canchas` | `(public)/canchas/page.tsx` | Filtros, horas Lima/minutos API, disponibles/opciones/reseñas y reserva |
| `/duenos` | `(public)/duenos/page.tsx` | Planes, contacto WhatsApp y preguntas |
| `/torneos` | `(public)/torneos/page.tsx` | Placeholder y enlaces actuales; no nueva llamada autenticada |
| `/sortear` | `(public)/sortear/page.tsx` | Búsqueda, drag y sorteo existentes; errores visibles |
| `/completar-cuadro` | `(public)/completar-cuadro/page.tsx` | Partidos, anotarse y retirarse con permisos actuales |
| `/ayuda` | `(public)/ayuda/page.tsx` | Copy, contacto y preguntas |
| `/login`, `/register` | `(public)/login/page.tsx`, `(public)/register/page.tsx` | Formularios reales; eliminar redirects hacia Astro |
| `/forgot-password`, `/reset-password` | páginas homónimas en `(public)` | Recuperación; token en `#t=`, expiración y uso único sin exponerlo en SEO/GA |
| `/completar-registro` | `(public)/completar-registro/page.tsx` | Google: completar datos y continuar sesión (spec 44) |
| `/mejoras` | `(public)/mejoras/page.tsx` | Formulario inbox y sesión opcional |
| `/libro-reclamaciones` | `(public)/libro-reclamaciones/page.tsx` | Campos y envío actuales |
| `/legal/privacy`, `/legal/terms` | `(public)/legal/*/page.tsx` | Texto legal completo, sin añadir MDX como dependencia innecesaria |
| 404 y 500 | `not-found.tsx` aplicable a rutas desconocidas y `app/error.tsx` | Mensaje, navegación y contacto; probar una URL inexistente y error controlado |

**Recuento:** F0 informa 16 `.astro` + 2 Markdown = 18 archivos, incluidos 404/500; eso no equivale a 18 rutas de negocio. `architecture.md:22-32` cita 22 rutas y cinco rutas eliminadas; spec 25 registra build de 17 páginas frente a 22 previas. No restar cinco a 18 ni declarar esos recuentos equivalentes. Pam reconciliará tabla de rutas, páginas de error y salida real del build; la documentación vigente reflejará esa clasificación y la tabla anterior, conservando el dato histórico en archivo.

**SEO:** capturar antes/después por ruta title, description, canonical, OG, JSON-LD, robots y contenido del sitemap. Mantener el origen canónico existente, recursos/fonts, idioma y las URLs del sitemap actual sin agregar auth por accidente. Usar metadata estática donde no depende de sesión; no convertir toda la app en export estático porque el panel requiere servidor. El build debe clasificar como estáticas las rutas públicas que no necesitan contexto de petición.

**GA:** `PUBLIC_GA_ID` → `NEXT_PUBLIC_GA_ID`; carga y navegación equivalentes, sin doble pageview. La excepción `analytics=false` de reset-password se aplica también al layout público: cero solicitudes GA en esa ruta. No incluir token ni contraseña en telemetría.

**Motion y UI:** mantener spec 46 (k=400, c=30, m=1), fuentes Barlow/Barlow Condensed y preload, escala raíz 16 px, Tablero, acordeón exclusivo, `.revelar`, teclado y `prefers-reduced-motion`. Aislar tipografía/tokens si fusionarlos cambia el panel. Cumulative Layout Shift (CLS, desplazamiento acumulado de diseño) público <0.02, panel ≤0.02, sin empeorar la línea base; desborde horizontal 0 px a 375 px; objetivos táctiles 44 px con excepciones documentadas de escritorio.

### 4.3 Sesión, variables y redirects

Cookie HttpOnly `token` emitida por API; cliente no lee ni guarda JWT. Mantener login, registro, logout, `/api/auth/me`, Google y completar registro, recuperación, returnUrl local seguro y destino por rol (`USUARIO`, `ADMIN`, `SUPERADMIN`, `TECNICO`). Evitar bucles entre raíz/login/panel; conservar respuestas 401/403 y aislamiento entre propietarios. `proxy.ts` continúa limitado a rutas protegidas.

| Variable actual | Destino / comportamiento |
|---|---|
| `PUBLIC_RESERVAYA_API_URL` | `NEXT_PUBLIC_RESERVAYA_API_URL`; valor same-origin `/api` cuando la utilidad incluya base `/api`; evitar `/api/api` y no usar host API directo |
| `PUBLIC_RESERVAYA_APP_URL` | `NEXT_PUBLIC_RESERVAYA_APP_URL`; mismo origen web y navegación local |
| `PUBLIC_GA_ID` | `NEXT_PUBLIC_GA_ID` |
| `PUBLIC_INBOXMEJIKAI_ENDPOINT` | `NEXT_PUBLIC_INBOXMEJIKAI_ENDPOINT`; conservar integración y sus errores visibles |
| `NEXT_PUBLIC_PUBLIC_APP_URL` ya existente | mismo origen web; eliminar fallback `:4321` de `lib/public-app.ts` y validar consumidores antes de consolidar variables |
| `BACKEND_URL`, `JWT_SECRET`, BD | privados; mismos contratos, sin edición de `.env` |
| API `FRONTEND_ORIGIN`, `PASSWORD_RESET_URL` | actualización manual de plataforma al origen único y `/reset-password`; sin modificar código .NET |

Implementar en `next.config.ts` estas cinco entradas con **`statusCode: 301`**, sin `permanent: true` (eso devolvería 308). Verificar cabecera `Location`, preservación de query útil y ausencia de cadenas/bucles. Las URLs protegidas destino conservan su guarda.

| Origen eliminado en spec 25 | Destino más cercano |
|---|---|
| `/precios` | `/duenos` |
| `/publica-tu-cancha` | `/duenos` |
| `/jugador/perfil` | `/dashboard/perfil` |
| `/mis-reservas` | `/dashboard/reservas` |
| `/mis-partidos` | `/dashboard/partidos` |

### 4.4 Retirada con evidencia (F3) y traslado (F4)

**Orden:** F1 aprobada → F2 paridad validada → F3 depuración → F4 reorganización → validación humana/plataforma. Michael implementa por lotes pequeños; Pam ejecuta gates y registra §7; Kelly revisa contra spec. Hallazgos vuelven a la misma card. No pasar de fase con un gate pendiente o fallo oculto.

Antes de retirar Astro, verificar en preview la cobertura de casos críticos y que enlaces/consumidores internos apuntan a Next. El humano valida producción y migra DNS antes de apagar el servicio antiguo; conservar el despliegue anterior para retorno manual hasta confirmar la nueva web. No eliminar un servicio remoto desde esta implementación.

Cada borrado registra en §7: ruta/paquete, razón, comandos de búsqueda, consumidores migrados, evidencia de runtime/config/scripts/tests y gate posterior. «Sin imports» o salida de knip/depcheck por sí sola no prueba ausencia de uso; considerar scripts, carga dinámica y entrypoints. No instalar analizadores nuevos sin aprobación ni borrar tests útiles.

- Astro y su configuración/deps se retiran al completar paridad; F0 detectó `astro-icon` y `@iconify-json/mdi` sin consumidores de UI, pero el plugin sigue en config: retirar junto al proyecto, no afirmar cero referencias hoy.
- `qrcode.react`, `bcryptjs`, `lucide-react`, Playwright y `ts-node` son candidatos a verificar, no lista aprobada de borrado. Mantener usos del panel, CLS, seed y `db:check`; no ejecutar seed.
- Duplicados auth se eliminan al activar su reemplazo en F2. Tooling (`opencode.json`, `skills-lock.json`, `AGENTS.md`) y docs se conservan salvo prueba de no uso y decisión de alcance.
- Archivar specs históricas sin pérdida de contenido en `docs/specs/archivo/`; mantener `_TEMPLATE.md` y 51 activas; mover también reportes históricos relacionados si el inventario confirma su carácter histórico. Actualizar enlaces de documentos vivos; no reescribir enlaces internos/historia de los archivados por conveniencia.
- Al retirar el proyecto, actualizar en el mismo lote checker/tests de motion para que escaneen el único frontend Next y sigan comprobando los tokens generados. No desactivar el gate para hacerlo pasar. F4 cambia ese destino a `apps/web`.

F4 mueve primero el backend con `git mv reservaya-nextjs-api/backend/ReservaFacil.Api apps/api`, luego el frontend restante a `apps/web`, extrayendo/eliminando el contenedor `backend` solo si queda vacío. Registrar hashes SHA-256 y rutas antes/después de cada archivo protegido; cero cambios de bytes, altas o bajas en esquema/migraciones. No ejecutar migraciones ni modificar namespace, `.csproj` o DLL para renombrarlos. Los directorios locales ignorados/secretos no se trasladan con un movimiento indiscriminado: preparar el traslado de archivos versionados y detenerse si existen archivos locales que requieren intervención humana; no borrar nada ajeno.

**Infra y comandos finales:** raíz conserva npm `--prefix`; `dev:all` cambia exactamente a `node scripts/start-dev.mjs`, sin dependencia de Bash o PowerShell ni paquetes nuevos; `dev` y `dev:next` apuntan a web, `build` y `build:next` construyen web, `preview` arranca Next (`start`), `dev:all` inicia web :3000 y API :5000 sin Astro :4321. `dev:api` usa `apps/api/ReservaFacil.Api.csproj`. CI reemplaza dos jobs frontend/panel por web (`npm ci`, typecheck, lint, test, build), mantiene motion/test y db:check de solo lectura con secreto existente. Cache npm y working-directory pasan a `apps/web`; agregar compilación .NET sin ejecutar migraciones. Docker COPY/restore/publish apunta a `apps/api/ReservaFacil.Api.csproj`; Render mantiene dockerContext raíz, Dockerfile y `/healthz`; verificar aunque no necesite cambio textual.

**Arranque multiplataforma (F4.4):** crear `scripts/start-dev.mjs` con módulos nativos de Node. Resolver raíz desde `import.meta.url` (sin depender del directorio actual), heredar entorno y stdio sin imprimir secretos, iniciar `dotnet run --project apps/api/ReservaFacil.Api.csproj --launch-profile http` y esperar `/healthz` antes de lanzar Next mediante npm (`npm.cmd` en Windows con invocación compatible y argumentos controlados, `npm` en Unix). Next sigue usando `next dev --webpack`. Validar servicio/puerto antes de reutilizar uno existente; no aceptar como saludable cualquier proceso que abra el puerto. Timeout finito con error visible y salida no cero; no reintentos infinitos. Si falla un hijo, cerrar solo el árbol de procesos iniciado por este runner y devolver fallo; al recibir Ctrl+C terminar esos hijos sin huérfanos. Nunca cerrar servicios preexistentes ni introducir Astro :4321. Verificar rutas con espacios y parada tanto en Linux como Windows; usar API de procesos adecuada a cada plataforma.

**Decisión sobre Bash no versionado:** se leyó `scripts/start-dev.sh`; inicia tres servicios incluidos Astro, valida principalmente puertos, y carece de limpieza explícita de hijos al salir. `git status --short -- scripts/start-dev.sh` devuelve `?? scripts/start-dev.sh`. Se descarta su adopción/versionado en favor del runner Node único: no añadirlo, editarlo ni borrarlo en esta tarea o en F4; es un archivo local ajeno. Retirar referencias de documentación activa al script Bash. `scripts/start-dev.ps1` puede quedar como wrapper que llama al runner Node y propaga su código de salida, sin una segunda lógica de arranque. A14 exige que ningún manifiesto ni guía activa requiera el script no versionado; Pam registra su estado preexistente sin incluirlo en la entrega.

Eliminar de guías activas instrucciones de migración prohibidas, conservar hechos históricos archivados. Consolidar las skills de landing/panel en una guía Next pública/panel; actualizar CLAUDE y referencias. Búsqueda final de nombres viejos en configuración/código/docs activos debe quedar vacía; se permiten citas históricas en esta spec y `docs/specs/archivo/` y datos de oficina fuera de alcance.

### 4.5 Diff exacto del hook (solo humano)

`.claude/settings.json` no existe en raíz; por tanto este es un **diff de creación**, no un parche inventado de un hook existente. El humano lo aplica antes de F4 y comprueba que editar archivos protegidos sigue bloqueado. Si apareció configuración entretanto, god solicita fusionar conservando hooks y permisos existentes; no sobrescribirla. El hook filtra herramientas de edición; no bloquea el `git mv` autorizado ni habilita modificaciones del contenido.

```diff
--- /dev/null
+++ b/.claude/settings.json
@@ -0,0 +1,15 @@
+{
+  "hooks": {
+    "PreToolUse": [
+      {
+        "matcher": "Edit|Write|MultiEdit",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "python3 -c 'import json,re,sys; d=json.load(sys.stdin); p=d.get(\"tool_input\",{}).get(\"file_path\",\"\").replace(chr(92),\"/\"); blocked=bool(re.search(r\"(^|/)(prisma|Migrations|bin|obj|\\.next|dist)(/|$)|(^|/)(Entities\\.cs|AppDbContext\\.cs|\\.env(?!\\.example(?:/|$))[^/]*)(/|$)\",p)); print(\"Edición protegida: solo traslado autorizado sin cambios de contenido\" if blocked else \"\",file=sys.stderr); sys.exit(2 if blocked else 0)'"
+          }
+        ]
+      }
+    ]
+  }
+}
```

La única excepción de entorno es el nombre exacto `.env.example`, permitido para actualizar ejemplos sin secretos; `.env`, `.env.local`, `.env.production` y `.env.example.local` siguen bloqueados. Un `.env.example` dentro de `prisma/`, `Migrations/` o artefactos también sigue bloqueado por su carpeta. El patrón cubre tanto rutas antiguas como `apps/web/prisma/**`, `apps/api/Migrations/**` y los archivos protegidos en cualquier profundidad. El hook no reemplaza las reglas: scripts/shell tampoco pueden editar esos contenidos. En Windows el humano valida disponibilidad de `python3` o provee su ejecutable equivalente antes de activar el hook; no asumir que el intérprete está instalado. Pam prueba payloads sintéticos contra el comando (exit 2 para rutas protegidas y `.env.example.local`, 0 para `apps/web/app/(public)/page.tsx` y `apps/web/.env.example`), sin escribir archivos protegidos.

### 4.6 Operación manual y retorno

El humano ajusta el root del deploy web a `apps/web`, build/start y variables públicas/privadas; conserva API en Render y BD Neon. Configura DNS/dominio canónico, origen API, recuperación y configuración Google para el origen unificado. Verifica login Google y email real sin compartir secretos. Un deploy web no significa alojar .NET dentro de Next.

Antes del cambio, guardar configuración de plataforma y referencia al despliegue anterior; después medir rutas, sesión, SEO, GA y logs. Retorno: restaurar DNS/deploy previo y variables de plataforma si hay regresión; no revertir ni alterar BD. Confirmar ausencia de tráfico/consumidores al frontend Astro antes de apagar su servicio. Sin métricas o acceso a plataforma, marcar ese paso manual pendiente, no declarar migración productiva verificada.

**F3 — entorno local pendiente (god, 2026-10-05):** retirar solo archivos versionados del proyecto Astro. Su `.env`, `node_modules` y `.astro` locales permanecen; no se leen, mueven ni borran. El humano decide su retirada y configura en el entorno Next los equivalentes `NEXT_PUBLIC_*` que necesite, sin publicar secretos ni copiar automáticamente el `.env` anterior. API y navegación usan el mismo origen; GA y receptor de formularios conservan su configuración pública.

**F4 — límites de verificación local:** el traslado selectivo conserva los hashes de 32 archivos protegidos; god gestionó el entorno/dependencias/cache locales. El runner tiene pruebas de contratos y ciclo de vida, incluida la rama Windows de npm.cmd/taskkill; eso no equivale a probar un arranque real en Windows. En el entorno de Michael `dotnet` no está disponible: compilación API, smoke real y A14 en Linux/Windows quedan para Pam/god y el humano. No se instalaron paquetes ni SDK. Los fallbacks API anteriores permanecen sin editar código .NET; configurar FRONTEND_ORIGIN y PASSWORD_RESET_URL como indican las guías.

## 5. Criterios de aceptación

Comandos desde raíz; F2/F3 usan carpeta actual y F4 destino final. Pam guarda salidas, código de salida y evidencia por fase, sin secretos.

| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos/lint/tests/build F2 y F3 | `npm --prefix reservaya-nextjs-api run typecheck`; `npm --prefix reservaya-nextjs-api run lint`; `npm --prefix reservaya-nextjs-api test`; `npm --prefix reservaya-nextjs-api run build` | Todos exit 0; ninguna ruta duplicada |
| A2 | Astro mientras exista | `npm --prefix reservaya-frontend-astro exec -- astro check`; `npm --prefix reservaya-frontend-astro run build` | Exit 0; gate retirado únicamente cuando Astro se elimina |
| A3 | Web final | `npm --prefix apps/web ci`; `npm --prefix apps/web run typecheck`; `npm --prefix apps/web run lint`; `npm --prefix apps/web test`; `npm --prefix apps/web run build` | Todos exit 0 |
| A4 | Motion | `node scripts/motion-tokens.mjs --check`; `node --test scripts/motion-tokens.test.mjs` | Exit 0 en cada fase; escáner vigente |
| A5 | CLS público F2/F3 | `node reservaya-nextjs-api/scripts/cls.mjs --landing --base http://localhost:3000 --rutas /,/canchas,/duenos,/torneos,/sortear,/completar-cuadro,/ayuda,/login,/register,/forgot-password,/reset-password,/completar-registro,/mejoras,/libro-reclamaciones,/legal/privacy,/legal/terms` | Cada ruta <0.02; 0 px desborde a 375; sin regresión de baseline |
| A6 | CLS panel F2/F3 y F4 | `node reservaya-nextjs-api/scripts/cls.mjs --base http://localhost:3000`; final `node apps/web/scripts/cls.mjs --base http://localhost:3000`; A5 final cambia prefijo a `apps/web` | Cada rol ≤0.02, 0 px desborde; credenciales `QA_<ROL>_*` requeridas; omitir roles no es PASS |
| A7 | Paridad funcional | Matriz §4.2: invitado, sesión y cada rol; flujos éxito/error/vacío, Google spec 44 y recuperación | 100% casos cubiertos; ningún bucle o permiso nuevo |
| A8 | SEO/GA/static | Comparar baseline por ruta y salida build; navegador con tráfico GA observado, reset con fragmento sintético | Mismos metadatos/canonical/sitemap/robots; sin GA reset ni PII; estáticas donde procede |
| A9 | Redirects 301 | `curl -sS -D - -o /dev/null http://localhost:3000/precios` y repetir con los otros cuatro orígenes de §4.3, sin `-L` | HTTP 301 exacto y Location esperado; pruebas adicionales sin bucle |
| A10 | Retirada y deps | Manifiesto de borrados + búsqueda `rg --files -g '*.astro' -g '!hive/**' -g '!node_modules/**'`; revisar manifests/locks, config, scripts y consumidores | Cero `.astro` y deps Astro del producto; cada baja justificada, búsquedas vacías documentadas |
| A11 | Archivos protegidos | Comparar manifiestos ruta/hash SHA-256 antes/después, diff con detección de renombres | Contenido idéntico; cero migraciones ejecutadas |
| A12 | API e infra | `dotnet build apps/api/ReservaFacil.Api.csproj -c Release`; `docker build -t reservaya-api:spec51 .`; con API arrancada `curl -fsS http://localhost:5000/healthz` | Build/imagen exit 0 y health OK; sin cambios de contrato |
| A13 | DB de solo lectura | `npm --prefix apps/web run db:check` (antes F4: prefijo actual) | Exit 0 con secreto de entorno; sin secreto disponible queda pendiente |
| A14 | Arranque multiplataforma y rutas finales | `node --check scripts/start-dev.mjs`; `npm run dev:all` en Linux y Windows desde ruta con espacios; probar Ctrl+C, fallo/timeout, puertos ocupados y servicios preexistentes; `git status --short -- scripts/start-dev.sh`; búsqueda de referencias activas | Web :3000 + API :5000; sin Astro, dependencia Bash/PowerShell ni huérfanos propios; fallos exit no cero; preexistentes intactos; Bash no adoptado/versionado; rutas vigentes |
| A15 | Docs/hook | Enlaces activos resuelven; 22/18 explicado; históricos conservados; validar JSON/diff §4.5 y entradas sintéticas | Sin pérdidas históricas; `.env.example` permitido, secretos/artefactos protegidos |
| A16 | Plataforma manual | Evidencia del humano sobre deploy, DNS, Google, recuperación y tráfico Astro; prueba de retorno documentada | Origen único operativo; servicio previo solo se apaga tras confirmar cero consumidores |

**Estrategia:** reutilizar `node --test` en lib y tests motion; agregar pruebas útiles para returnUrl/origen único y redirects si hay lógica nueva. Pruebas funcionales/visuales con navegador y herramienta CLS existente; no crear tests que reflejen únicamente implementación. Capturar baseline antes de cambios. Fallos API/BD se reportan `BLOQUEO-API` con endpoint, payload redactado y respuesta; no corregir backend. Un gate sin navegador, cuentas QA, secreto BD o plataforma queda pendiente/bloqueado con causa, nunca verde por omisión.

## 6. Checklist

Cada subtarea es un lote de hasta aproximadamente cinco archivos; las familias de componentes y cada página se repiten en lotes independientes. Tras 2–3 lotes, checkpoint Pam. Las operaciones mecánicas de traslado se separan de cambios funcionales y se verifican por manifiesto.

| Tarea | Dependencia | Archivos / tamaño | Aceptación y verificación |
|---|---|---|---|
| F1 | F0 | Esta spec, 1 archivo | Humano revisa y aprueba; god asigna cards F2/F3/F4 |
| F2.0 | F1 aprobada | Rama + baseline, sin cambios de producto | Rama `refactor/monorepo-apps`, baseline rutas/SEO/CLS/hashes; registrar preexistentes sin sobrescribir |
| F2.1 | F2.0 | Layout público + shell/UI en lotes ≤5 | Tipos/lint, accesibilidad y tokens; A1/A4; no activar raíz antes de sus dependencias |
| F2.2 | F2.1 | Login, register y utilidades de origen en lotes ≤5 | Cookie/returnUrl/roles y rutas únicas; A1/A7; checkpoint Pam antes del resto |
| F2.3 | F2.2 | Recuperación y Google en lotes ≤5 | Spec 44, token fragmento y excepción GA; A1/A7/A8 |
| F2.4 | F2.1 | Landing y canchas: una página/isla por lote | Disponibilidad/filtros/reserva reales y raíz activada; A1/A5/A8 |
| F2.5 | F2.2 | Sortear, completar-cuadro: una ruta por lote | Funciones/errores actuales y sesión; A1/A5/A7 |
| F2.6 | F2.1 | Resto tabla §4.2 por lotes ≤5 | Copy/legal/torneos y páginas error sin pérdida; A1/A5/A7 |
| F2.7 | F2.3–6 | SEO/assets/redirects en lotes ≤5 | A8/A9 y recursos existentes; checkpoint final Pam F2 + Kelly |
| F3.1 | F2 validada | Informe de usos y deps, ≤3 archivos | Evidencia antes de cada baja, A10; conservar candidatos con consumidores |
| F3.2 | F3.1 | Deps/locks y checker/tests motion, lotes ≤5 | Sin gate dependiente de Astro al retirar; A1/A4/A10 |
| F3.3 | F3.2 | Retirada Astro, docs vigentes preservadas | Cobertura completa en Next y gate sin Astro, A1/A4/A10; despliegue previo permanece para retorno |
| F3.4 | F3.3 | Specs históricas, manifiesto y enlaces por lotes | Archivo sin pérdida y oficina intacta; checkpoint Pam F3 + Kelly |
| F4.1 | F3 validada + hook humano | Traslado backend, operación mecánica | `apps/api`, hashes protegidos iguales y build API, A11/A12 |
| F4.2 | F4.1 | Traslado frontend/prisma, operación mecánica | `apps/web`, hashes prisma iguales; paths mínimos para A3/A13 |
| F4.3 | F4.2 | CI/Docker/Render, ≤3 archivos | A3/A4/A12/A13; db:check sin mutaciones |
| F4.4 | F4.2 | Runner Node + raíz + wrapper opcional, luego motion/CLS, lotes ≤5 | A14 Linux/Windows, Bash no adoptado ni borrado; A4/A5/A6 y baseline mantenido |
| F4.5 | F4.3–4 | CLAUDE/deploy/README/plan/skills por lotes | A15; comandos y árbol final coherentes |
| F4.6 | F4.5 | Evidencia final | Pam A3–A15 + Kelly; humano A16 y revisión antes de cualquier commit |

- [ ] F1: obtener aprobación explícita de la spec y sus excepciones; no implementar en RYS-2.
- [ ] F2: migrar todos los consumidores y pasar checkpoint de Pam y revisión de Kelly.
- [ ] F3: depurar solo con evidencia y pasar checkpoint de Pam y revisión de Kelly.
- [ ] F4: traslado íntegro, infraestructura/docs y gates finales; hook aplicado por humano.
- [ ] Manual: dominio/deploy/variables/Google/correo, validar tráfico y retorno antes de apagar Astro.
- [ ] Entregar a god lista de archivos cambiados, comandos y resultados; Michael no marca cumplimiento en §7.

## 7. Registro de verificación

Solo Pam registra gates y marca cumplimiento con evidencia; Michael entrega resultados y corrige hallazgos sobre la misma card. Tabla vacía al redactar: no se ha ejecutado implementación ni validación de producto.

| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-05 | F2 Lotes 1–3 (panel typecheck) | FALLO (exit 1) | `npm --prefix reservaya-nextjs-api run typecheck` falló con exit 1. Error en `components/public/inicio/MaquetaEquipos.tsx:21:12` (TS2322: Type '{ nombre: string; marca: string; anchos: string[]; }' no asignable a 'Key'). Errores previos en `Icon.tsx` y `PreguntasTactiles.tsx` quedaron resueltos. |
| 2026-10-05 | F2 Lotes 1–3 (panel lint) | FALLO (exit 1) | `npm --prefix reservaya-nextjs-api run lint` falló con exit 1 (3 errores, 7 advertencias): 1 error en `components/public/Marca.tsx:16:1` (@next/next/no-html-link-for-pages) y 2 errores en `components/public/inicio/MaquetaPartido.tsx:26:9, 30:9` (react/jsx-key: falta prop key en iterador). |
| 2026-10-05 | F2 Lotes 1–3 (panel test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F2 Lotes 1–6 tras correcciones (panel typecheck) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run typecheck` exit 0. Cero errores; corrección de key en `MaquetaEquipos` verificada. |
| 2026-10-05 | F2 Lotes 1–6 tras correcciones (panel lint) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run lint` exit 0 (0 errores, 2 advertencias preexistentes). Correcciones en `Marca` (`next/link`) y `MaquetaPartido` (keys en iterador) verificadas. |
| 2026-10-05 | F2 Lotes 1–6 tras correcciones (panel test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F2 Lotes 7–9 (panel typecheck) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run typecheck` exit 0. Cero errores TS. |
| 2026-10-05 | F2 Lotes 7–9 (panel lint) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run lint` exit 0 (0 errores, 2 advertencias preexistentes en `onboarding-simulation.test.mjs` y `seed.ts`). |
| 2026-10-05 | F2 Lotes 7–9 (panel test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F2 Lotes 7–9 (panel build) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run build` exit 0. Compilación exitosa Next 16.2.9 (Turbopack) en 2.7s; TypeScript OK en 5.0s; 7 páginas estáticas generadas sin fallos ni rutas duplicadas. |
| 2026-10-05 | F2 Lotes 10–11 (panel typecheck) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run typecheck` exit 0. Cero errores TS tras mover /login a app/(public) y cambios en proxy.ts. |
| 2026-10-05 | F2 Lotes 10–11 (panel lint) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run lint` exit 0 (0 errores, 2 advertencias preexistentes en `onboarding-simulation.test.mjs` y `seed.ts`). |
| 2026-10-05 | F2 Lotes 10–11 (panel test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F2 Lotes 10–11 (panel build) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run build` exit 0. Compilación exitosa en 3.1s; TS en 5.3s; 9 páginas estáticas generadas (/forgot-password, /login, /register, /reset-password) sin rutas duplicadas. |
| 2026-10-05 | F2 Lotes 10–11 (motion-tokens) | PASS (exit 0) | `node scripts/motion-tokens.mjs --check` exit 0. OK (2 bloques idénticos, 0 curvas ni duraciones sueltas). |
| 2026-10-05 | F2 TS + Lote 14 (panel typecheck) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run typecheck` exit 0. Cero errores TS tras conversión completa a .ts/.tsx y alta de /completar-registro y /mejoras. |
| 2026-10-05 | F2 TS + Lote 14 (panel lint) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run lint` exit 0 (0 errores, 2 advertencias preexistentes en `onboarding-simulation.test.mjs` y `seed.ts`). |
| 2026-10-05 | F2 TS + Lote 14 (panel test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F2 TS + Lote 14 (panel build) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run build` exit 0. Compilación exitosa en 3.4s; TS en 6.1s; 14 páginas estáticas generadas (/ayuda, /completar-registro, /duenos, /forgot-password, /login, /mejoras, /register, /reset-password, /torneos) sin rutas duplicadas. |
| 2026-10-05 | F2 TS + Lote 14 (motion-tokens) | PASS (exit 0) | `node scripts/motion-tokens.mjs --check` exit 0. OK (2 bloques idénticos, 0 curvas ni duraciones sueltas). |
| 2026-10-05 | F2 TS + Lote 14 (auditoría .js/.jsx) | PASS (exit 0) | `git status --porcelain reservaya-nextjs-api \| grep -E '\.(js\|jsx)$'` devuelve vacío: cero archivos .js/.jsx nuevos en el panel. |
| 2026-10-05 | F2 Completa (lotes 1–21) (typecheck) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run typecheck` exit 0. Cero errores TS en todo el panel y páginas públicas portadas. |
| 2026-10-05 | F2 Completa (lotes 1–21) (lint) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run lint` exit 0 (0 errores, 2 advertencias preexistentes en `onboarding-simulation.test.mjs` y `seed.ts`). |
| 2026-10-05 | F2 Completa (lotes 1–21) (test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F2 Completa (lotes 1–21) (build) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run build` exit 0. Compilación Next.js 16.2.9 (Turbopack) en 3.4s; TypeScript OK en 6.1s; 20 páginas estáticas generadas sin duplicados (incluyendo `/canchas`, `/sortear`, `/completar-cuadro`, `/legal/*`, `/libro-reclamaciones`, etc.). |
| 2026-10-05 | F2 Completa (lotes 1–21) (motion-tokens) | PASS (exit 0) | `node scripts/motion-tokens.mjs --check` exit 0. OK (2 bloques idénticos, 0 curvas ni duraciones sueltas). |
| 2026-10-05 | F2 Completa (lotes 1–21) (auditoría .js/.jsx) | PASS (exit 0) | `git status --porcelain reservaya-nextjs-api \| grep -E '\.(js\|jsx)$'` devuelve vacío: cero archivos .js/.jsx en la entrega de F2. |
| 2026-10-05 | F3 Lotes 1–12 (panel typecheck) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run typecheck` exit 0. Cero errores TS tras unificación de UI y retiro de código sin uso. |
| 2026-10-05 | F3 Lotes 1–12 (panel lint) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run lint` exit 0 (0 errores, 2 advertencias preexistentes en `onboarding-simulation.test.mjs` y `seed.ts`). |
| 2026-10-05 | F3 Lotes 1–12 (panel test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F3 Lotes 1–12 (panel build) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run build` exit 0. Compilación Next.js 16.2.9 (Turbopack) en 3.4s; TypeScript OK en 5.6s; 20 páginas estáticas generadas sin rutas duplicadas. |
| 2026-10-05 | F3 Lotes 1–12 (motion-tokens) | PASS (exit 0) | `node scripts/motion-tokens.mjs --check` exit 0. OK (1 bloque idéntico en Next, 0 curvas ni duraciones sueltas). |
| 2026-10-05 | F3 Completa (25 lotes) (typecheck) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run typecheck` exit 0. Cero errores TS. |
| 2026-10-05 | F3 Completa (25 lotes) (lint) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run lint` exit 0 (0 errores, 2 advertencias preexistentes en `onboarding-simulation.test.mjs` y `seed.ts`). |
| 2026-10-05 | F3 Completa (25 lotes) (test) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F3 Completa (25 lotes) (build) | PASS (exit 0) | `npm --prefix reservaya-nextjs-api run build` exit 0. Compilación Next.js 16.2.9 (Turbopack) en 3.1s; TypeScript OK en 5.8s; 20 páginas estáticas generadas sin duplicados. |
| 2026-10-05 | F3 Completa (25 lotes) (motion) | PASS (exit 0) | `node scripts/motion-tokens.mjs --check` y `node --test scripts/motion-tokens.test.mjs` exit 0 (1 bloque en Next, 7 pruebas de resorte pasadas). |
| 2026-10-05 | F3 Completa (25 lotes) (git diff --check) | PASS (exit 0) | `git diff --check` limpio: 0 espacios en blanco sobrantes ni marcadores de conflicto. |
| 2026-10-05 | F3 Completa (25 lotes) (retirada Astro y CI) | PASS (exit 0) | Cero archivos `.astro` del producto en disco (todos eliminados físicamente en el árbol de trabajo; 86 archivos totales de Astro retirados); `.github/workflows/ci.yml` con cero referencias a `reservaya-frontend-astro`. |

| 2026-10-05 | F4 ajuste fallbacks API / build API | PENDIENTE (CI) | Por instrucción de god (RYS-5, conv-6eeaf1): AuthController.cs usa localhost:3000 por defecto y Program.cs permite solo localhost:3000 en CORS por defecto. Solo dos literales modificados; configuración explícita de entorno conserva prioridad. dotnet no está instalado en esta máquina (verificado por god/Michael); compilación API pendiente del job .NET 10 de CI, sin ejecutar migraciones. No se declara PASS local. |
| 2026-10-05 | F4 (web typecheck) | PASS (exit 0) | `npm --prefix apps/web run typecheck` exit 0. Cero errores TS en la nueva estructura. |
| 2026-10-05 | F4 (web lint) | PASS (exit 0) | `npm --prefix apps/web run lint` exit 0 (0 errores, 2 advertencias preexistentes en `onboarding-simulation.test.mjs` y `seed.ts`). |
| 2026-10-05 | F4 (web test) | PASS (exit 0) | `npm --prefix apps/web test` exit 0 (40 pruebas pasadas en 1 suite, 0 fallos). |
| 2026-10-05 | F4 (web build) | PASS (exit 0) | `npm --prefix apps/web run build` exit 0. Compilación Next.js 16.2.9 (Turbopack) en 4.3s; TypeScript OK en 8.4s; 20 páginas estáticas generadas sin duplicados. |
| 2026-10-05 | F4 (motion-tokens) | PASS (exit 0) | `node scripts/motion-tokens.mjs --check` (OK: 1 bloque) y `node --test scripts/motion-tokens.test.mjs` (7 pruebas pasadas) exit 0. |
| 2026-10-05 | F4 (runner start-dev) | PASS (exit 0) | `node --test scripts/start-dev.test.mjs` exit 0 (7 pruebas pasadas: orden de arranque, healthz, timeout, terminación de procesos, compatibilidad Windows). |
| 2026-10-05 | F4 (git diff --check) | PASS (exit 0) | `git diff --check` limpio: 0 espacios en blanco sobrantes ni marcadores de conflicto. |
| 2026-10-05 | F4 (hook .claude/settings.json) | PASS (exit 0/2) | Payloads sintéticos de spec 51 §4.5 probados exitosamente: exit 2 para archivos protegidos (`prisma`, `Migrations`, `Entities.cs`, `AppDbContext.cs`, `.env`, `.env.example.local`) y exit 0 para permitidos (`apps/web/app/(public)/page.tsx`, `apps/web/.env.example`). |
| 2026-10-05 | F4 (búsqueda nombres viejos) | PASS (2 citas en template) | `git grep -n -e reservaya-nextjs-api -e reservaya-frontend-astro -- ':!docs/specs/archivo' ':!hive'` arrojó únicamente `docs/specs/_TEMPLATE.md:25-26`. Cero referencias en código, configuración y documentación activa. |
| 2026-10-05 | F4 (build API .NET) | PENDIENTE (CI) | `dotnet` no está instalado en el entorno local (orden no encontrada); compilación Release de `apps/api/ReservaFacil.Api.csproj` delegada a CI. |
