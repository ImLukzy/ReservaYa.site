# Especificación: 25 - Código muerto en la landing Astro

> **Estado:** ✅ Aprobada por Lukas (2026-09-28, «limpia código muerto»).

## 1. Objetivo
Quitar de `reservaya-frontend-astro` el código que ya no cumple ninguna función.

Mapeo (script de referencias sobre `src/`):
- `components/`, `lib/`, `scripts/`, `styles/`, `layouts/`: 0 archivos sin referencias.
- 5 páginas que solo redirigen (meta refresh) y a las que nada enlaza: `mis-partidos`, `mis-reservas`, `jugador/perfil` (→ panel, specs 22/22b), `precios`, `publica-tu-cancha` (→ `/duenos`).

## 2. Fuera de alcance
- Exports usados solo dentro de su archivo (`lib/horario.ts`, `lib/contacto.ts`, `scripts/filas.ts`): no son código muerto.
- Specs históricas que nombran esas rutas: se conservan como registro.

## 3. Riesgo aceptado
Las URLs antiguas pasan a 404 (página 404 propia). Nada interno las enlaza.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-28 | astro check | PASS | 0 errores |
| 2026-09-28 | build Astro | PASS | 17 páginas (antes 22) |
| 2026-09-28 | tests panel | PASS | 40/40 |
