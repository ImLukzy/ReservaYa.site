# Especificación: 52 - Rediseño verde y hero fotográfico

> **Sustituida por la spec 53** (`53-rediseno-limpio.md`): el humano rechazó este diseño el 2026-10-05.

## 1. Objetivo
Unificar las superficies públicas y panel en una familia verde, neutros y Barlow, con portada fotográfica de desplazamiento continuo. Autorización de implementación: despacho humano vía god, conv-ff50e3, card RYS-13.

## 2. Fuera de alcance
API, datos, sesiones, permisos, formularios, migraciones, textos comerciales y archivos protegidos. Sin dependencias ni commits. No atribuir las fotos a Arequipa sin evidencia.

**Decisiones de producto que requieren aprobación:** ninguna adicional al encargo; Kelly revisa y Pam valida la entrega.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| apps/web/app/globals.css | modificar | única paleta y escala16px |
| apps/web/app/public.css | modificar | hereda tokens/fuente, heroCSS |
| apps/web/app/layout.tsx y (dashboard)/layout.tsx | modificar | Barlow local única |
| apps/web/components/public/HeroFotos.tsx | crear | next/image local, pausa |
| apps/web/app/(public)/content.tsx | modificar | fotos, texto sobre superficie sólida |
| apps/web/{app,components,lib}/**/*.{ts,tsx} | modificar | solo utilidades de color/sombra visuales |
| apps/web/public/img/hero/* | crear |5fotosWebP yCREDITOS.md |

## 4. Diseño y lógica
- Paleta única en :root de globals.css; Tailwind y público heredan. Principal #17804a; hover #126b3d; oscuro #105238; suave #e5f2ea. Neutros fondo #f4f7f4, superficie #ffffff, texto #182b21, secundario #52645a, bordecontrol #7a8e81. Estados error #b42318/#fdecea y aviso #805d0f/#fff5dc solo cuando comunican estado; no acentos decorativos azules, naranjas o morados. Logo Google mantiene identidad, fotos mantienen colores reales.
- Tipografía Barlow local400/500/600 mediante next/font/local, cuerpo y títulos de misma familia; escala12/14/16/18/20/24/30/36/48/60/72px y base16px compartida. Sin carga GoogleFonts ni fuente nueva.
- Hero: fondo forzado/patrón fuera;5fotos reales licenciadas de canchas, desplazamiento CSS de dos grupos idénticos. Texto/buscador sobre superficies sólidas, sin texto superpuesto a fotos. next/image con tamaño/sizes y primera imagen preload. Alt español en grupo original; copia aria-hidden con alt vacío. Dimensiones reservadas, sin JS de autoplay.
- Pausa mediante control checkbox, hover y foco; reduced-motion muestra solo grupo original quieto con scroll manual. Ningún movimiento de texto ni saltos al cambiar imagen.
- Créditos autor/URL/licencia Pexels y transformación. Fotos ilustrativas de otros lugares, nunca catálogo de complejos locales; sin marcas/personas identificables en recorte.
- API: sin cambios. Invariantes: misma lógica y motion generado existente sin edición manual.

Contraste WCAG AA calculado con luminancia sRGB:
- basalto/sillar: 13.84:1 (texto ≥4.5:1)
- pizarra/tiza: 6.31:1 (texto ≥4.5:1)
- tiza/cesped: 4.97:1 (texto ≥4.5:1)
- tiza/cesped-hover: 6.57:1 (texto ≥4.5:1)
- cesped-hondo/cesped-suave: 7.97:1 (texto ≥4.5:1)
- niebla/noche: 10.64:1 (texto ≥4.5:1)
- error/error-suave: 5.75:1 (texto ≥4.5:1)
- sol-hondo/sol-suave: 5.54:1 (texto ≥4.5:1)
- borde/tiza: 3.49:1 (borde no textual ≥3:1)

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos/lint/tests/build web | npm --prefix apps/web run typecheck/lint/build; npm test |0errores (seed warning previo) |
| A2 | Motion | node scripts/motion-tokens.mjs --check |PASS |
| A3 | Fotos | WebP dimensiones/peso/créditos e inspección |5–8, ≤200KBcadauna |
| A4 | Paridad | público y panel por roles,375px/desktop; pausa/reduced-motion |sin cambios de lógica, sin desborde |
| A5 | CLS | medición Pam | público<0.02, panel≤0.02 |

## 6. Checklist
- [ ] T1: tokens/fuentes comunes.
- [ ] T2: colores sueltos y fotos licenciadas.
- [ ] T3: hero/pausa y gates, entregar a Kelly/Pam.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
