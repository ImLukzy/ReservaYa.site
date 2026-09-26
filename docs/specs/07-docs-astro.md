# Especificación: 07 - Docs de Astro sin duplicados y al día (backlog P2-14)

## 1. Objetivo
**Problema:** `reservaya-frontend-astro/README.md` (112 líneas) y `docs/*.md` repetían los mismos bloques y describían un estado que no existe:
- el árbol "estructura objetivo" aparecía 3 veces (README, `docs/README.md`, `architecture.md`), con carpetas que no existen (`features/`, `services/`, `store/`, `hooks/`, `config/`, `types/`, `utils/`);
- requisitos, instalación y comandos, 2 veces (README y `development.md`);
- variables, 3 veces (README, `api.md`, `deployment.md`);
- `api.md` listaba 6 endpoints antiguos, y Astro usa 15;
- el README listaba 6 rutas de 21;
- `deployment.md` citaba `deploy/nginx-https.conf`, que no existe.

**Resultado esperado:** cada dato en un solo archivo, solo el estado vigente y comprobado contra el código, sin enlaces rotos.

## 2. Fuera de alcance
`DEPLOY_GRATIS.md` y los READMEs del panel y la API (territorio del Agente 1 o raíz). No se resucita nada de Educlook.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/README.md` | reescribir | Qué es + arranque en 3 comandos + índice (112 → 21 líneas) |
| `reservaya-frontend-astro/docs/README.md` | eliminar | Índice duplicado del README |
| `reservaya-frontend-astro/docs/architecture.md` | reescribir | `src/` real, 21 rutas → endpoints, flujo de sesión |
| `reservaya-frontend-astro/docs/development.md` | reescribir | Comandos, validación (check + build + `node --check`), enlace a la skill |
| `reservaya-frontend-astro/docs/api.md` | reescribir | Única tabla de variables; 15 endpoints reales; errores |
| `reservaya-frontend-astro/docs/deployment.md` | reescribir | Enlaza `DEPLOY_GRATIS.md`; solo lo propio de Astro |

## 4. Diseño y lógica
Reglas de condensación de la metodología: un dato en un solo lugar, tablas antes que prosa, nombres exactos del código y solo el estado vigente. Endpoints sacados con `grep -rhoE "/api/..." src` y contrastados con `[Http*]` de los controladores .NET.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Sin duplicados | Árbol, variables y comandos | 1 aparición cada uno |
| A2 | Enlaces | Script de enlaces `.md` relativos (README, docs, CLAUDE.md, skills, specs) | 0 rotos |
| A3 | Veracidad | Rutas = `find src/pages`; endpoints = `grep` + controladores | coinciden |

## 6. Checklist
- [x] T1: reescribir README y docs; eliminar `docs/README.md`.
- [x] T2: verificar A1–A3 y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-25 | A1 | ✅ | Árbol solo en `architecture.md`; variables solo en `api.md`; comandos solo en `development.md`. Total README + docs: 302 → 129 líneas |
| 2026-09-25 | A2 | ✅ | Script de enlaces relativos → 0 rotos |
| 2026-09-25 | A3 | ✅ | 21 rutas (19 `.astro` + 2 `.md`, cuadra con "21 page(s) built"); 15 endpoints del `grep`, verificados en `AuthController`, `UsuariosController` y `PartidosController` (`GET /api/partidos` es `[AllowAnonymous]`) |

## 8. Detectado fuera de alcance
- ⛔ **BLOQUEO-API** `POST /api/auth/forgot-password`: lo llama `src/pages/forgot-password.astro:61`, pero `AuthController` solo expone `login`, `register`, `logout` y `me`, así que responde 404. La página se traga el error y muestra "revisa tu correo", y el usuario cree que recibirá un correo que nunca llega. Hace falta endpoint + envío de correo (Agente 1). Decisión de producto mientras tanto: dejarlo así o cambiar el texto por "escríbenos a soporte".
