# Especificación: NN - <Título corto>

## 1. Objetivo
**Problema:** qué falla hoy o qué falta (con archivo y líneas).
**Resultado esperado:** qué garantiza el sistema al terminar, en 1–3 frases.

## 2. Fuera de alcance
Lo que no se toca aunque parezca relacionado.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `ruta/real/verificada` | crear / modificar / eliminar | … |

## 4. Diseño y lógica
- **UI:** …
- **API:** endpoints usados; `BLOQUEO-API` si hace falta cambiar la API.
- **Invariantes:** …

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos panel | `npm --prefix reservaya-nextjs-api run typecheck` | 0 errores |
| A2 | Lint panel | `npm --prefix reservaya-nextjs-api run lint` | 0 errores |
| A3 | Astro | `astro check` + `astro build` | 0 errores |
| A4 | Comportamiento | "<pasos> → <resultado observable>" | pasa |

## 6. Checklist
- [ ] T1: …
- [ ] TN: verificar criterios y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
