# Especificación: 65 - "Dueños" como enlace directo en la cabecera

Estado: aprobada 2026-10-08 (humano: "no quiero que la sección de dueño salga desplegable, solo eso").

## 1. Objetivo
**Problema:** en la cabecera pública, "Dueños" abre un desplegable con "Publicar mis canchas", "Planes y precios" y "Entrar al panel" (`apps/web/components/public/Header.tsx:15-17`, render en `:76-84` y en el menú móvil `:106`).
**Resultado esperado:** "Dueños" es un enlace normal a `/duenos`, igual que "Canchas", "Jugar" y "Ayuda", en escritorio y en móvil.

## 2. Fuera de alcance
La página `/duenos`, el resto de la cabecera y el menú de cuenta.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/web/components/public/Header.tsx` | modificar | quitar el desplegable de "Dueños"; si `menus` queda vacío, eliminar su código y su estado sin uso |

## 4. Diseño y lógica
- **UI:** mismo `linkClass` y el mismo `aria-current` que los demás enlaces; posición igual a la actual.
- **Invariantes:** objetivos ≥ 44 px; 0 px de desborde; el menú móvil sigue funcionando.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos, lint y tests web | `npm --prefix apps/web run typecheck`, `run lint`, `test` | 0 errores |
| A2 | Comportamiento | escritorio y móvil: "Dueños" lleva a `/duenos` con un clic, sin desplegable | pasa |

## 6. Checklist
- [ ] T1: cambiar `Header.tsx`.
- [ ] T2: verificar y anotar en §7.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
