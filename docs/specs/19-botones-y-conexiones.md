# Especificación: 19 - Todos los botones funcionan y las conexiones son correctas

## 1. Objetivo
**Problema:** hay botones que no hacen nada y llamadas a la API que fallan. Se detectaron con un escaneo estático de `<button>` sin manejador y un cruce de las 136 llamadas `/api/...` del frontend con las 89 rutas de los controladores .NET.

| # | Dónde | Qué pasa hoy |
|---|---|---|
| C1 | `components/b2b/TorneosPanel.tsx:284` | «Registrar resultado» hace `PUT /api/torneos/{id}/partidos/{pid}`, pero la API expone `PUT /api/torneos/partidos/{partidoId}` (`TorneosController.cs:393`) → **404** |
| C2 | `components/b2b/ConfigPanel.tsx:155-192` | Envía a `PATCH /api/usuarios/me` campos que la API rechaza (`nombre`, `fechaNacimiento` ya fijada → 400) o ignora (`nombreNegocio`). Luego reintenta un `PATCH /api/auth/me` que no existe, guarda los datos personales en `localStorage` y muestra un mensaje falso («el servidor aún no expone…») |
| C3 | `components/ui/WhatsAppFloat.tsx:6` | Enlaza a `https://wa.me/51999999999`, un número inventado |
| B1 | `app/(dashboard)/admin/page.tsx:93`, `components/layout/TopBar.tsx:33` y landing `BaseLayout.astro:330-338` | Campana «Notificaciones»: la API no tiene notificaciones. En el panel no hace nada; en la landing siempre dice «No tienes avisos» |
| B2 | `admin/page.tsx:100`, `ReservasPanel.tsx:246`, `TopBar.tsx:25` | «Ayuda» y «Tutoriales» sin `onClick` |
| B3 | `app/(dashboard)/dashboard/carne/page.tsx:12` | «Editar perfil» sin acción |
| B4 | `ConfigPanel.tsx`, pestaña «Cobros» | Los interruptores Yape/Tarjeta/Efectivo solo se guardan en `localStorage` (`ry_cobros`); la API no los recibe |

**Resultado esperado:** cada botón visible hace lo que dice su etiqueta (navega, envía o abre algo) o no existe. Cada llamada a la API coincide en ruta y método con un endpoint real. Ningún dato personal se guarda en `localStorage`.

## 2. Fuera de alcance
- Crear un sistema de notificaciones o de medios de cobro en la API: haría falta modelo y migración, que están prohibidos.
- El rediseño visual (spec 20) y la limpieza (spec 18).

**Decisiones de producto que requieren aprobación:**
1. **B1:** quitar las campanas mientras no exista un sistema de notificaciones.
2. **C3:** el botón de WhatsApp pasa a depender de `NEXT_PUBLIC_WHATSAPP_NUMBER` y se oculta si no está definida. Si me das el número, lo dejo configurado.
3. **B4:** quitar la pestaña «Cobros». No hay backend que la guarde y hoy engaña al dueño.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-nextjs-api/components/b2b/TorneosPanel.tsx` | modificar | C1: `/api/torneos/partidos/${fResultado.id}` |
| `reservaya-nextjs-api/components/b2b/ConfigPanel.tsx` | modificar | C2: lee `GET /api/auth/me`; nombre, email y nacimiento de solo lectura; edita `telefono` y `username`; guardado solo en la API; sin `localStorage`; sin `nombreNegocio`; mensaje según la respuesta real. B4: sin pestaña Cobros |
| `reservaya-nextjs-api/components/ui/WhatsAppFloat.tsx` | modificar | C3 |
| `reservaya-nextjs-api/.env.example`, `DEPLOY_GRATIS.md`/`docs/PLAN_DESPLIEGUE_GRATUITO.md` | modificar | Añadir `NEXT_PUBLIC_WHATSAPP_NUMBER` (opcional) |
| `reservaya-nextjs-api/app/(dashboard)/admin/page.tsx`, `components/layout/TopBar.tsx`, `components/b2b/ReservasPanel.tsx` | modificar | B1: fuera la campana. B2: «Ayuda» pasa a `<Link href="/admin/ayuda">` |
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | modificar | B1: fuera la campana, su panel y su script |
| `reservaya-nextjs-api/app/(dashboard)/dashboard/carne/page.tsx` | modificar | B3: `<Link href="/dashboard/perfil">` |

## 4. Diseño y lógica
- **C2:** el flujo queda cargar (`/me`) → editar → `PATCH /api/usuarios/me { telefono, username }`.
  - 200 → «Perfil guardado».
  - 400 → se muestra el mensaje de la API.
  - Error de red → «No se pudo guardar. Revisa tu conexión».
  - Al cargar, se borra una sola vez cualquier `ry_perfil` o `ry_cobros` antiguo.
- **Auditoría en navegador** (criterio A3): un script de Playwright recorre todas las rutas de la landing y del panel (backend falso + JWT de prueba por rol) y pulsa cada botón o enlace visible. Luego comprueba que hubo un efecto: navegación, petición de red, cambio del DOM, foco o diálogo.
- **API:** sin cambios. **Invariantes:** cero migraciones.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Contrato | Cruce estático frontend ↔ controladores (ruta + método) | 0 discrepancias |
| A2 | Sin botones mudos (estático) | Escaneo de `<button>` sin `onClick`, `type=submit` ni referencia en script | 0 |
| A3 | Sin botones mudos (en vivo) | Recorrido de clics en todas las rutas, 1280 px | 100 % con efecto |
| A4 | C1 en vivo | Contra la API de prueba: registrar un resultado → 200 y se ve en la tabla | OK |
| A5 | C2 | Guardar teléfono → `PATCH /api/usuarios/me` 200; `localStorage` sin `ry_perfil` ni `ry_cobros` | OK |
| A6 | Gates | `typecheck`, `lint`, `test` y `build` del panel; `astro check` y `build` | 0 errores |

## 6. Checklist
- [ ] T1: C1 y C2.
- [ ] T2: C3 y B1–B4.
- [ ] T3: Script de recorrido de clics (A3) en el scratchpad.
- [ ] T4: A1–A6 y §7; borrar los datos de prueba.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
