# Especificación: 20 - Sistema de diseño «Tablero de cancha» y rediseño de la landing

## 1. Objetivo
**Problema:** la interfaz actual es la estética genérica de interfaces generadas, y no la de un servicio de canchas en Arequipa. Datos medidos en `reservaya-frontend-astro/src` y en `app` + `components` del panel:

| Rasgo genérico | Landing | Panel |
|---|---|---|
| Fondo casi negro + verde ácido (`#040705`, `#060C08`, `#060A08`, `#4ADE80`) | 245 usos | 81 |
| Etiquetas en MAYÚSCULAS con tracking (`uppercase`, `tracking-[0.1x]`) | 82 | 88 |
| Cadenas unidas con « · » | 90 | 67 |
| «→» añadido al texto de botones y enlaces | 28 | 10 |
| Glifos o emoji como iconos (◉ ▤ ◔ ✨ …) | 197 | 114 |
| `backdrop-blur` decorativo | 12 | 8 |
| Datos inventados como prueba social: «+2,400 jugadores y 180+ canchas», testimonios con nombres y distritos de Lima (`index.astro:326-358`), «Miles de jugadores buscan cancha en el Perú» (`duenos.astro:57`) | sí | — |

Además, la tipografía es la de siempre (Manrope + Outfit en la landing, Nunito en el panel), cada pantalla define sus propios colores con hex sueltos y no hay tokens compartidos entre las dos apps.

**Resultado esperado:** un sistema de diseño propio y compartido (tokens + tipografía + componentes base), aplicado primero a la landing. La primera pantalla deja de ser un eslogan sobre una foto de stock: muestra las canchas **libres de verdad** en Arequipa. El resultado es cómodo en el móvil, accesible (AA) y sin datos inventados.

## 2. Fuera de alcance (y hoja de ruta)
- **Spec 21 — Panel:** aplicar el sistema al panel (shell con sidebar y topbar, dashboard del dueño, agenda, reservas, caja, formularios).
- **Spec 22 — Unificar el área del jugador (decisión aparte):**
  - Hoy la landing y el panel duplican login, registro, búsqueda de canchas, perfil, reservas y partidos (`/canchas` ↔ `/dashboard/canchas`, `/jugador/perfil` ↔ `/dashboard/perfil`, `/mis-partidos` ↔ `/dashboard/mi-partido`).
  - Además, en producción las cookies no se comparten entre dominios (ver `docs/PLAN_DESPLIEGUE_GRATUITO.md` §6).
  - Recomendación: la landing queda pública (buscar, ver, dueños, legal) y todo lo que requiere sesión vive en el panel.
- Sin cambios de API ni de BD.

**Decisiones de producto que requieren aprobación:**
1. **D1 — Dirección visual «Tablero de cancha»** (§4).
2. **D2 — Retirar el contenido inventado:** testimonios, cifras de usuarios y distritos de Lima. Solo se muestran datos reales de la API y el copy de Arequipa.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `reservaya-frontend-astro/src/styles/tokens.css` | crear | Tokens CSS (color, tipo, espacio, radio, sombra, motion) |
| `reservaya-frontend-astro/src/styles/global.css`, `motion.css` | reescribir | Base sobre tokens; fuera los overrides legacy |
| `reservaya-frontend-astro/src/layouts/BaseLayout.astro` | modificar | Fuentes Barlow + Barlow Condensed; header y footer nuevos; barra de anuncios reducida a un solo mensaje fijo o eliminada |
| `reservaya-frontend-astro/src/components/ui/{Button,Field,Select,Badge,SlotBoard,EmptyState}.astro` | crear | Componentes base (< 150 líneas cada uno) |
| `reservaya-frontend-astro/src/components/Footer.astro` | reescribir | |
| `reservaya-frontend-astro/src/pages/index.astro` | reescribir | Hero con buscador + «Tablero de hoy» con datos reales |
| `reservaya-frontend-astro/src/pages/canchas.astro` | reescribir | Resultados como tablero con filtros persistidos en la URL (`?distrito=&tipo=&fecha=`) |
| `reservaya-frontend-astro/src/pages/duenos.astro`, `precios.astro` | reescribir y unificar | Una sola tabla de planes (hoy duplicada en las dos páginas) |
| `reservaya-frontend-astro/src/pages/{login,register,forgot-password,reset-password}.astro` | reestilizar | Misma lógica, nuevo sistema |
| Resto de páginas (`torneos`, `sortear`, `completar-cuadro`, `mis-partidos`, `jugador/perfil`, `ayuda`, `mejoras`, `libro-reclamaciones`, `legal/*`, `404`, `500`) | reestilizar | Tokens y componentes; sin cambios de lógica |
| `docs/skills/astro-landing.md` | modificar | Regla 8 → «usa tokens de `tokens.css`, nunca hex sueltos; prohibidos los rasgos de la tabla del §1» |
| `PLAN_OTRO_AGENTE.md` | modificar | Filas 20, 21 y 22 |

## 4. Diseño y lógica

**Tema:** reservar una cancha en Arequipa (fútbol 5/7, vóley, pádel, tenis). El usuario principal es un jugador de 18-35 años en el móvil, que busca hora libre para hoy con sus amigos. Su trabajo es encontrar una cancha libre y reservarla en menos de un minuto.

**Concepto: «Tablero de cancha».** La identidad sale del mundo real del producto:
- Las **líneas de cal** de una cancha organizan la página: se usan como estructura, no como adorno.
- El **horario por franjas** (el tablero de la cancha) es el elemento protagonista.
- La **señalética deportiva** fija el tono de la tipografía.
- La **piedra de sillar** de Arequipa da el color del fondo.

### Color (tokens)
| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `--sillar` | `#F3F4F1` | Fondo de página (piedra fría, no crema) | — |
| `--tiza` | `#FFFFFF` | Superficies y tarjetas del tablero | — |
| `--cesped` | `#17804A` | **Único acento de acción**: botones primarios, franja libre, foco | Blanco encima 4.97 ✅ · como texto sobre blanco 4.97 ✅ |
| `--cesped-hondo` | `#116A3C` | Hover y active del acento; texto de badges sobre `--cesped-suave` | Blanco encima 6.67 ✅ |
| `--cesped-suave` | `#E3F1E8` | Fondo de la franja libre y de los badges | `--basalto` encima 12.7 ✅ |
| `--basalto` | `#1F2A24` | Texto principal (roca volcánica) | Sobre sillar 13.4 ✅ |
| `--pizarra` | `#5A6660` | Texto secundario | Sobre sillar 5.43 ✅ · sobre blanco 5.99 ✅ |
| `--cal` | `#D6DBD3` | Líneas de estructura (no texto) | Decorativo; los bordes de input usan `#8A948E` (≥ 3:1) |
| `--sol` | `#F0B429` | Un solo uso: valoraciones y avisos | `--basalto` encima 7.96 ✅ |
| `--error` | `#B42318` | Errores | Sobre blanco 6.57 ✅ |

Sin fondos oscuros de página, sin degradados decorativos ni blur. El verde se reserva para acciones y estados «libre».

### Tipografía
- **Barlow Condensed** (600/700, números tabulares): titulares, horas, precios y cabeceras del tablero. Viene de la señalética vial y de transporte, y encaja con un horario.
- **Barlow** (400/500/600): cuerpo, formularios y botones. Es la misma familia en otro ancho, así que el contraste es claro sin mezclar estilos.
- **Escala** (tercera mayor 1.25): 14 · 16 · 20 · 25 · 31 · 39 · 49 px. Móvil: titular 39 px; escritorio: 49 px.
- Líneas de ≤ 70 caracteres; `line-height` de 1.5 en el cuerpo y 1.05 en el display.
- Sin MAYÚSCULAS decorativas, sin cejas sobre los títulos, sin «→» en los botones y sin cadenas con « · ».

### Layout (landing, alineado a la izquierda, 1120 px máximo)
```
┌ ReservaYa ──────────────────────── Canchas  Dueños  [Entrar] ┐
│                                                               │
│  Cancha libre hoy en Arequipa                                  │  ← Barlow Condensed 49/39 px
│  Elige distrito y deporte; reservas en un minuto.             │
│  [Distrito ▾] [Deporte ▾] [Hoy ▾]            [Buscar canchas] │
│                                                               │
│  Libres hoy     18:00 │ 19:00 │ 20:00         (pestañas)      │
│  ─────────────────────┼───────┼──────────────────────────────  │  ← líneas de cal
│  18:00  Complejo Los Andes   Fútbol 7   Cayma      S/ 80  [Reservar] │
│  18:00  Sport Center         Pádel      Yanahuara  S/ 60  [Reservar] │
│  Ver todas las canchas libres a las 18:00                      │
├───────────────────────────────────────────────────────────────┤
│  Cómo funciona   1 Busca · 2 Reserva · 3 Juega (secuencia real, numerada) │
├───────────────────────────────────────────────────────────────┤
│  ¿Tienes canchas? Recibe reservas sin llamadas.  [Publicar mis canchas] │
└ Footer: legal · libro de reclamaciones · contacto ────────────┘
```
- **Tablero de hoy:** llama a `GET /api/canchas/disponibles?fecha=HOY&horaInicio=H&horaFin=H+1` para las 3 horas siguientes (API existente).
  - **Carga:** esqueleto de altura fija (CLS 0).
  - **Sin datos:** «No quedan canchas libres a las 20:00. Prueba otra hora», con las pestañas activas.
  - **Error:** el mensaje y el botón «Reintentar».
  - «Reservar» lleva a la reserva existente del panel (`/dashboard/canchas?complejoId=`).
- **Móvil (375 px):** una columna. Cada fila del tablero es un bloque de 2 líneas: hora y precio arriba; nombre, deporte y distrito debajo. Botones de 44 px de alto.

### Principios
1. **El tablero es la marca:** la hora, las líneas y los números tabulares llevan la identidad. Un solo elemento protagonista por página; el resto, silencioso.
2. **Un solo acento:** el verde césped significa «acción» o «libre», nada más.
3. **Datos reales o nada:** sin cifras ni testimonios inventados. Los estados vacíos invitan a actuar.
4. **Movimiento solo como respuesta:** seleccionar una franja o confirmar una reserva. Sin fade-up en cada sección, sin carruseles automáticos ni marquesinas.
5. **Copy llano en español:** verbos concretos, en minúscula de frase; el botón dice lo que pasa («Reservar», «Buscar canchas»).

### Revisión contra los rasgos por defecto (segunda pasada)
- *Oscuro + verde ácido* (el diseño actual) → se reemplaza por sillar claro + verde césped profundo. ✔
- *Crema + terracota* → evitado: el sillar es frío y no se usa arcilla. ✔
- *Kit de tarjetas SaaS* → el protagonista es un tablero con líneas, no tarjetas iguales. El radio varía por jerarquía: 6 px en controles, 12 px en superficies y 0 en las filas del tablero. ✔
- *Diario con filetes* → las líneas solo aparecen en el tablero y los controles son redondeados; no hay columnas de periódico. ✔
- *Cromo de plantilla* (cejas, « · », «→», mono) → prohibido en la skill. ✔
- *Hero con número grande y estadísticas* → sustituido por datos reales de disponibilidad. ✔
- **Riesgo que queda:** «claro + verde» es habitual en apps de reservas. Lo compensan la tipografía condensada de señalética y el tablero con líneas de cal. **Cambio respecto al primer borrador:** quité el amarillo de pelota de pádel (`#E3F24F`), que volvía a un acento ácido, y dejé `--sol` para un solo uso.

### Accesibilidad y calidad
- AA en todo el texto.
- Foco visible: anillo de 2 px en `--cesped` con 2 px de separación.
- Se respeta `prefers-reduced-motion`.
- Objetivos táctiles ≥ 44 px.
- 0 px de scroll horizontal a 375 px y CLS ≈ 0.
- Iconos SVG (Lucide, ya presente en el panel; en la landing, inline) en lugar de glifos.

- **API:** solo endpoints existentes (`/api/canchas/disponibles`, `/api/canchas/opciones`).
- **Invariantes:** la lógica de login, registro y recuperación no cambia; cero migraciones.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gates | `astro check` y `build`; `node --check` de los scripts inline | 0 errores |
| A2 | Sin rasgos genéricos | Recuento de la tabla del §1 en la landing | 0 hex sueltos fuera de `tokens.css`; 0 `uppercase` decorativos; 0 «→»; 0 « · » en el copy; 0 glifos-icono; 0 `backdrop-blur` |
| A3 | Sin datos inventados | `grep` de «2,400», «180+», «Miles de jugadores» y los distritos de Lima | 0 |
| A4 | Tablero real | Playwright contra la API de prueba: las pestañas cambian de hora, y los estados de carga, vacío y error se ven | OK |
| A5 | Contraste | Script de contraste sobre todos los nodos de texto de 10 páginas | 100 % ≥ 4.5 (≥ 3 en texto grande) |
| A6 | Móvil | 375 px: scroll horizontal y CLS en todas las páginas | 0 px; CLS < 0.02 |
| A7 | Revisión visual | Capturas a 1280 y 375 px de `/`, `/canchas`, `/duenos` y `/login`, revisadas | Anotadas en §7 |
| A8 | Rendimiento | Peso de la home (HTML + CSS + JS + fuentes) antes y después | Menor que hoy |

## 6. Checklist
- [ ] T1: `tokens.css` + fuentes + base (`global.css`, `motion.css`).
- [ ] T2: Componentes base.
- [ ] T3: Header y footer.
- [ ] T4: Home con el tablero real.
- [ ] T5: `/canchas` con filtros en la URL.
- [ ] T6: `/duenos` + `/precios` unificados.
- [ ] T7: Autenticación (4 páginas).
- [ ] T8: Resto de páginas.
- [ ] T9: A1–A8, capturas y §7; skill y PLAN.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
