# Especificación: 53 - Rediseño limpio: hero con fotos de fondo, verde único e Inter

## 1. Objetivo
Sustituir el rediseño de la spec 52 (rechazado por el humano, card RYS-13) por un sistema visual limpio y actual en público y panel: fotos reales como fondo del hero con movimiento suave, una sola paleta verde y una sola familia tipográfica. Encargo del humano vía god (temp worker-disenador-front, 2026-10-05).

## 2. Fuera de alcance
API, datos, sesiones, permisos, consentimiento, validaciones, fetch, migraciones y archivos protegidos. Sin dependencias npm nuevas ni commits. Textos comerciales sin cambios (solo se añade el distintivo «29 distritos de Arequipa» en el hero, que ya está en el copy).

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| apps/web/app/layout.tsx | modificar | Inter variable local por next/font/local |
| apps/web/public/fonts/inter-variable.woff2, OFL.txt | crear/reemplazar | subconjunto latino 64 KB, licencia OFL de Inter |
| apps/web/public/fonts/barlow-*.woff2 | borrar | ya no se usan |
| apps/web/app/globals.css | modificar | tokens, sombras suaves, radios, pesos, .eyebrow, componentes base |
| apps/web/app/public.css | modificar | títulos, prosa, CSS del hero de fondo |
| apps/web/components/public/HeroFondo.tsx | crear | fotos de fondo + velo + pausa |
| apps/web/components/public/{HeroFotos,CintaPitazo}.tsx, ui/PatronCancha.tsx | borrar | tira de fotos, cinta y patrón de cancha |
| apps/web/app/(public)/content.tsx, duenos/content.tsx, torneos/content.tsx | modificar | hero, secciones, sin franjas rayadas |
| apps/web/components/public/{Header,Footer,AuthCard}.tsx, inicio/{SeccionTitulo,BandaCierre}.tsx | modificar | cabecera, pie, login/registro, títulos |
| apps/web/components/ui/{Button,Input,Select,Card,Marca}.tsx, lib/public/estilos.ts, lib/b2b-theme.ts | modificar | primitivas compartidas |
| apps/web/{app,components}/**/*.tsx | modificar | barrido de clases visuales (ver §4) |
| apps/web/public/img/hero/*.webp, CREDITOS.md | reemplazar | 1200 × 675 desde originales |
| docs/skills/panel-next.md | modificar | reglas 8, 9 y 10 al nuevo sistema |

## 4. Diseño y lógica
**Hero (portada y /duenos).** Las 5 fotos Pexels ocupan todo el fondo del hero (`object-cover`, 100vw). Fundido cruzado CSS de 40 s (8 s por foto: entra 2 s, se queda con acercamiento 1.04→1.12 y paneo lento, sale 2 s); la primera arranca visible (retardo negativo) y se precarga. Velo sólido `cesped-hondo` al 82 %: blanco encima da ≥5.58:1 aun sobre un píxel blanco de la foto; subtítulo `tiza/90` ≥4.55:1. Titular, subtítulo y buscador encima; buscador en tarjeta blanca con sombra suave. Fotos decorativas (`alt=""`, `aria-hidden`), sin pie de «fotos ilustrativas» porque ya no se presentan como contenido (los créditos siguen en CREDITOS.md).
- Pausa: botón redondo discreto (44 px) abajo a la derecha, casilla nativa oculta con nombre accesible «Pausar el movimiento de las fotos de fondo»; sustituye al checkbox visible «Pausar movimiento». Cumple WCAG 2.2.2 sin JS.
- `prefers-reduced-motion: reduce`: solo la primera foto, quieta; botón de pausa oculto.
- El tablero «Libres hoy» pasa a una sección propia bajo el hero. Se retira la cinta de texto en movimiento.

**Paleta única verde.** Tokens en `:root` de globals.css; panel y público los heredan. Verde principal `#17804a`, hover `#126b3d`, hondo `#0f5434`, suave `#e6f4ec`, vivo `#3fbf6f` (solo sobre fondos oscuros). Neutros con tinte verde: fondo `#f5f8f6`, superficie `#ffffff`, línea `#dde6e0`, borde de control `#7a8e81`, texto `#14261c`, secundario `#4d5f55`, noche `#0b2117`. Amarillo y rojo solo comunican estado (pendiente, error). Botones y estados seleccionados oscuros (`bg-basalto`) pasan a verde; el elemento «Torneos» del menú lateral deja el amarillo.

**Tipografía.** Una sola familia: Inter variable (OFL, subconjunto latino, ejes wght 100–900 y opsz) por `next/font/local`, sin red en build. Títulos 700 con `letter-spacing: -0.02em` e interlineado 1.12; pesos `extrabold`/`black` limitados a 700 en el tema, así la jerarquía la da el tamaño. Antetítulo `.eyebrow` (13 px, 600, mayúsculas, verde hondo) es la única mayúscula decorativa. Escala base 16 px sin cambios.

**Superficies.** Se retira el estilo de sombra dura: `shadow-dura*` y sombras desplazadas arbitrarias → `shadow-suave-sm|suave|suave-lg` (sombras difusas teñidas de verde oscuro); `border-2`/`border-4` → 1 px/2 px; `border-basalto` → `border-cal`; controles de formulario → `border-borde` (3.49:1, WCAG 1.4.11). Radios: control 10 px, superficie 16 px, botones y campos públicos en píldora. `card-tactil`, `btn-tactil`, `chip-tactil` y `searchbar-tactil` conservan el nombre y cambian su estilo; `btn-tactil--claro` para el botón secundario con borde fino. Pulsado: `scale(0.98)` con los tokens del resorte.

**Invariantes.** Ninguna lógica cambiada: mismos handlers, fetch, formularios, nombres de campos, ids y atributos ARIA existentes. Bloque motion generado intacto; los bucles nuevos llevan `/* motion: ambiental */`.

Contraste WCAG AA (luminancia sRGB):
- texto/fondo 14.84:1; secundario/superficie 6.81:1; secundario/fondo 6.37:1; secundario/verde suave 6.0:1
- blanco/verde 4.97:1; blanco/hover 6.57:1; blanco/hondo 8.98:1; hondo/suave 7.92:1
- vivo/noche 7.15:1; niebla/noche 10.43:1; blanco sobre velo (peor caso) 5.58:1
- borde de control/superficie 3.49:1, /fondo 3.27:1 (no textual ≥3:1)

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos, lint y tests | `npm --prefix apps/web run typecheck`, `run lint`, `test` | 0 errores (aviso previo de seed) |
| A2 | Motion | `node scripts/motion-tokens.mjs --check` y su test | PASS |
| A3 | Build | `next build` lo corre god (hay un `next dev` del humano en :3000) | 0 errores |
| A4 | Visual | capturas 1440 y 390 px de /, /duenos, /login, /canchas; panel por roles | sin sombras duras, sin desborde a 375 px |
| A5 | Reduced-motion y pausa | emulación del navegador | foto fija; pausa detiene el fundido |
| A6 | CLS | `node apps/web/scripts/cls.mjs --landing` y panel | público <0.02, panel ≤0.02 |

## 6. Checklist
- [x] T1: fuente Inter, tokens y componentes base.
- [x] T2: barrido de clases en público y panel; primitivas compartidas.
- [x] T3: hero de fondo en portada y /duenos; panel de login con foto; sin franjas ni patrones.
- [ ] T4: build, CLS y revisión visual del panel con sesión (god/Pam).

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
