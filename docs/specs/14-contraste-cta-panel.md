# Especificación: 14 - Contraste AA de CTA verdes en el panel Next (incluido el login)

## 1. Objetivo
**Problema:** el panel (`reservaya-nextjs-api/app|components|lib`) usa texto blanco sobre verde sólido: 2.28:1 sobre `#22C55E` y 3.30:1 en hover sobre `#16A34A`, cuando AA pide 4.5:1. Salió en la spec 13 (§7): `/mis-reservas` sin sesión redirige a `localhost:3000/login`, y su botón «Iniciar Sesión» es blanco sobre #22C55E.

Inventario del escaneo de segmentos de clases (cortes en comillas y llaves, con prefijos de variante) de `app/`, `components/` y `lib/`:

| Grupo | Cantidad | Detalle |
|---|---|---|
| `bg-[#22C55E] … text-white` | **45 cadenas** en 22 archivos | 37 con `hover:bg-[#16A34A]`, 8 sin hover |
| Tokens compartidos | 2 de esas 45 | `lib/b2b-theme.ts:25` (`btnPrimary`, que consumen 7 archivos: `AbonosPanel`, `CajaPanel`, `ComplejosGrid`, `DescuentosPanel`, `MetasPanel`, `PreciosEspecialesPanel` y `B2BModulePage`) y `components/ui/Button.tsx:10` (variante `primary`) |
| Texto blanco en otra cadena de `cn()` | 1 | `components/b2b/CronogramaView.tsx:1004-1005`: `text-white` en la base y `bg-[#22C55E]` en una rama del ternario (la otra rama es naranja `#F97316`) |
| Estado `active` que no llega a AA con texto oscuro | 1 | `Button.tsx:10`: `active:bg-[#15803D]` (#060C08 sobre #15803D = 3.94:1) |
| CSS global | 1 | `app/globals.css:142-150`: `.btn-accent` (#22C55E + `color: #fff`; hover #16A34A). Hoy no se usa en el markup |

**Ya correctos, no se tocan:** `dashboard/perfil/page.tsx:35` (`bg-[#22C55E] text-[#071c10]`), `dashboard/perfil/page.tsx:85` (`bg-emerald-500 text-[#071c10]`) y `::selection` (`globals.css:78-81`, #071c10).

**Sin texto, no aplican:** 15 barras, puntos e interruptores (`admin/page.tsx:162,240,262`, `CajaPanel.tsx:234,716`, `ConfigPanel.tsx:324`, `CronogramaView.tsx:588,708,1152`, `DescuentosPanel.tsx:450`, `EquipoPanel.tsx:304`, `MetasPanel.tsx:270`, `ReportesPanel.tsx:266`, `TorneosPanel.tsx:392`) y el emoji del logo en `Sidebar.tsx:237`.

**Resultado esperado:** todo texto sobre verde sólido del panel queda ≥ 4.5:1 en reposo, hover y active, con la misma solución que la landing: texto **#060C08** (8.66:1 sobre #22C55E, 5.99:1 sobre #16A34A).

## 2. Fuera de alcance
- Otros colores de CTA con texto blanco: naranja `#F97316` (2.80:1, `CronogramaView.tsx:1005`) y los azules, ámbar o violeta de estados. Van en otra spec, con el mismo método.
- Texto verde sobre fondo claro (p. ej. `text-[#22C55E]` sobre blanco, 2.28:1).
- Estados `disabled:`: WCAG exime los controles deshabilitados. `disabled:bg-[#86EFAC]` con texto oscuro queda igualmente legible.
- Unificar `#071c10` y `#060C08`: los dos son casi negros de marca (≥ 8.5:1).
- `proxy.ts`, `lib/session.ts`, API, `prisma/**`. Cero migraciones.

**Decisiones de producto que requieren aprobación:** ninguna nueva. Es la misma decisión aprobada en la spec 13, extendida al panel.

## 3. Archivos afectados
Reglas, solo en segmentos cuyo token base (con el mismo prefijo de variante) es `bg-[#22C55E]` o `bg-[#16A34A]`:
- **R1:** `text-white` → `text-[#060C08]`.
- **R3:** `active:bg-[#15803D]` → `active:bg-[#16A34A]` (5.99:1).
- `hover:bg-[#16A34A]` se mantiene (5.99:1).

| Archivo | Líneas / cambio |
|---|---|
| `reservaya-nextjs-api/lib/b2b-theme.ts` | 25 (`btnPrimary`): R1 |
| `reservaya-nextjs-api/components/ui/Button.tsx` | 10 (`primary`): R1 + R3 |
| `reservaya-nextjs-api/app/(auth)/login/page.tsx` | 104: R1 (login del panel) |
| `reservaya-nextjs-api/app/(auth)/register/page.tsx` | 148: R1 |
| `reservaya-nextjs-api/app/(dashboard)/admin/page.tsx` | 109, 139: R1 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/page.tsx` | 71: R1 |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/canchas/page.tsx` | 198: R1 |
| `reservaya-nextjs-api/components/b2b/CajaPanel.tsx` | 124, 419: R1 |
| `reservaya-nextjs-api/components/b2b/ComplejosGrid.tsx` | 519: R1 |
| `reservaya-nextjs-api/components/b2b/ConfigPanel.tsx` | 284: R1 |
| `reservaya-nextjs-api/components/b2b/CronogramaView.tsx` | 514, 529, 699, 789, 859, 1039: R1. En 1004-1005, `text-white` sale de la base y pasa a cada rama: `'bg-[#22C55E] text-[#060C08] hover:bg-[#16A34A]'` / `'bg-[#F97316] text-white hover:bg-[#EA580C]'` (el naranja no cambia) |
| `reservaya-nextjs-api/components/b2b/EquipoPanel.tsx` | 198, 259, 274, 284, 393: R1 |
| `reservaya-nextjs-api/components/b2b/HorariosPanel.tsx` | 239: R1 |
| `reservaya-nextjs-api/components/b2b/MetasPanel.tsx` | 58: R1 |
| `reservaya-nextjs-api/components/b2b/OnboardingChecklist.tsx` | 35, 50: R1 |
| `reservaya-nextjs-api/components/b2b/ReportesPanel.tsx` | 212: R1 |
| `reservaya-nextjs-api/components/b2b/ResenasPanel.tsx` | 223, 309: R1 |
| `reservaya-nextjs-api/components/b2b/ReservasPanel.tsx` | 265, 335, 379, 533: R1 |
| `reservaya-nextjs-api/components/b2b/TorneosPanel.tsx` | 319, 358, 427, 484, 506, 530, 561, 577: R1 |
| `reservaya-nextjs-api/components/features/SuscripcionesPanel.tsx` | 112: R1 |
| `reservaya-nextjs-api/components/layout/Sidebar.tsx` | 316: R1 |
| `reservaya-nextjs-api/components/ui/ErrorPanel.tsx` | 30: R1 |
| `reservaya-nextjs-api/app/globals.css` | 142-146 `.btn-accent`: `color: #fff` → `#060C08` |
| `docs/skills/panel-next.md` | Nueva regla 9, Estilo: «Sobre verde sólido (#22C55E/#16A34A) el texto va en #060C08; nunca `active:bg-[#15803D]` con texto oscuro» |
| `PLAN_OTRO_AGENTE.md` | §6: fila del ítem |

## 4. Diseño y lógica
- **UI:** solo cambian tokens de color dentro de `className`, `cn()` o constantes. Estructura, props, sombras (`shadow-green-900/20`, `hover:shadow-[…]`) y `active:scale-[0.98]` no cambian.
  - `btnPrimary` y `Button` propagan el cambio a sus consumidores sin tocarlos.
  - Los iconos SVG con `currentColor` dentro de los botones heredan el nuevo color.
- **Next 16:** no se usa ninguna API de Next, solo cambian cadenas de clase. Server y client components siguen igual (skill `panel-next.md`, reglas 1 y 5).
- **API:** ninguna. Sin `BLOQUEO-API`.
- **Invariantes:**
  - Sin cambios de comportamiento.
  - `typecheck`, `lint` y `test` en verde.
  - Ningún color fuera de superficies verdes cambia.
  - Sin scroll horizontal a 375 px en `/login`.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Tests | `npm --prefix reservaya-nextjs-api test` | todos pasan |
| A4 | Build | `npm --prefix reservaya-nextjs-api run build` | OK |
| A5 | Inventario estático | Reejecutar el escaneo de segmentos, con variantes | 0 segmentos con verde sólido + `text-white`; 0 `active:bg-[#15803D]` sobre verde; `CronogramaView.tsx:1004-1005` sin `text-white` en la base |
| A6 | Contraste en reposo | Playwright contra `next start -p 3099`, con backend falso :5999 y cookie `token` firmada con un `JWT_SECRET` de prueba (no el de `.env`) para `USUARIO`, `ADMIN`, `SUPERADMIN` y `TECNICO`. Todas las rutas de `app/**/page.tsx` a 375 y 1280 px: nodos de texto cuyo primer fondo opaco es #22C55E o #16A34A | ≥ 4.5:1 en el 100 % |
| A7 | Hover y active | Playwright: `hover()` y `mouse.down()` sobre cada `a`/`button` con fondo verde sólido | ≥ 4.5:1 en el 100 % |
| A8 | Login del panel | `/login` a 375 y 1280 px: color del submit | rgb(6, 12, 8); sin scroll horizontal |
| A9 | Sin regresión | Snapshot del color computado antes y después, mismas rutas y roles | El diff solo contiene nodos sobre fondo verde sólido |
| A10 | BD intacta | `npm --prefix reservaya-nextjs-api run db:check` | OK, 0 migraciones pendientes |
| A11 | Alcance | `git status --short` | Solo los archivos de §3 |

## 6. Checklist
- [x] T1: Línea base: backend falso :5999 (auth/me por rol y endpoints b2b con respuestas vacías), `BACKEND_URL=http://localhost:5999` y `JWT_SECRET` de prueba en `build` + `next start -p 3099` (no se toca el servidor del usuario en :3000). Snapshot A9 y medición A6/A7 (debe fallar).
- [x] T2: R1/R3 con un script por segmentos que valide el token base. Revisar el diff línea a línea.
- [x] T3: `CronogramaView.tsx:1004-1005` (mover `text-white` a las ramas) y `.btn-accent` en `globals.css`.
- [x] T4: `docs/skills/panel-next.md`, regla 9.
- [x] T5: A1–A11, anotar en §7 y `PLAN_OTRO_AGENTE.md` §6. Rebuild del panel sin las variables de prueba y parar :3099/:5999.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-26 | Línea base (T1) | — | `next start -p 3099` + backend falso :5999 + `JWT_SECRET` de prueba, sin leer `.env`. 72/72 vistas (anónimo y los 4 roles, 375/1280 px): 132 de 204 nodos sobre verde < 4.5:1 y 64 controles fallan en hover/active |
| 2026-09-26 | T2–T4 | ✅ | R1 = 45 y R3 = 1 en las líneas exactas de §3. `CronogramaView.tsx:1004-1005`: `text-white` movido a las ramas. `.btn-accent`: `color: #060C08`. Regla 9 en `panel-next.md` |
| 2026-09-26 | A1 | ✅ | `typecheck`: 0 errores |
| 2026-09-26 | A2 | ✅ | `lint`: 0 errores. Hay 2 warnings que ya existían, en archivos no tocados (`dashboard/perfil/page.tsx` `<img>` y `prisma/seed.ts`) |
| 2026-09-26 | A3 | ✅ | `npm test`: 21/21 |
| 2026-09-26 | A4 | ✅ | `npm run build` OK. Build final sin las variables de prueba (0 apariciones de `localhost:5999` en los manifests) |
| 2026-09-26 | A5 | ✅ | Escaneo por segmentos: 0 segmentos con verde sólido + `text-white`; 0 `active:bg-[#15803D]`; `CronogramaView.tsx:1004` sin `text-white` |
| 2026-09-26 | A6 | ✅ | 0 de 204 nodos sobre verde por debajo de 4.5:1 (72/72 vistas) |
| 2026-09-26 | A7 | ✅ | 64 controles verdes: 0 textos por debajo de 4.5:1 en hover ni en active (medido tras la transición, 400 ms) |
| 2026-09-26 | A8 | ✅ | Submit de `/login`: rgb(6, 12, 8). 0 px de scroll horizontal a 375 px |
| 2026-09-26 | A9 | ✅ | Diff de 132 nodos, todos sobre superficie verde. 0 fuera |
| 2026-09-26 | A10 | ✅ | `db:check` OK: 198 columnas, 0 migraciones pendientes |
| 2026-09-26 | A11 | ✅ | `git status`: 23 archivos del panel (§3), `panel-next.md`, `PLAN_OTRO_AGENTE.md` y esta spec. :3099 y :5999 detenidos; el servidor del usuario en :3000 no se tocó |
