# Especificación: 54 - Identidad viva: fotos con gente, titulares de marcador y voz arequipeña

## 1. Objetivo
**Problema:** el humano ve el sitio público «básico», «generado con IA» y con «fotos sin vida». Base: spec 53 (`docs/specs/53-rediseno-limpio.md`), hero en `apps/web/components/public/HeroFondo.tsx`, tokens en `apps/web/app/globals.css`.
**Resultado esperado:** el sitio público tiene una identidad propia: fotos de gente jugando que se ven, tipografía con carácter (titulares de marcador), composición con ritmo y textos con voz local. El panel hereda tipografía y tokens sin cambios de clases. Encargo de god al temp Dwight-Diseño (worker-disenador-front-v3), 2026-10-05.

## 2. Fuera de alcance
API, datos, sesiones, permisos, consentimiento, validaciones, fetch, formularios (nombres, ids, handlers), migraciones y archivos protegidos. Sin dependencias npm nuevas, sin `next build` (hay un `next dev` del humano en :3000) y sin commits.

**Decisiones de producto que requieren aprobación:** el copy nuevo de la portada (titular «¿Sale pichanga hoy?», banda «¿Sales tarde de la chamba?», «Del chat del grupo a la cancha») cambia textos comerciales aprobados en specs anteriores. Lo pidió god en el encargo («textos con voz local arequipeña»); el humano puede pedir otro tono.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| apps/web/app/layout.tsx | modificar | Anybody + Instrument Sans locales; variables en `<html>` |
| apps/web/public/fonts/{anybody-variable,instrument-sans-variable}.woff2, OFL-Anybody.txt, OFL-InstrumentSans.txt | crear | subconjuntos latinos y licencias |
| apps/web/public/fonts/inter-variable.woff2, OFL.txt | borrar | Inter ya no se usa |
| apps/web/app/globals.css | modificar | tokens `reflector`, `cancha-noche`, familias, pesos, `.eyebrow` sin mayúsculas |
| apps/web/app/public.css | modificar | h1/h2/h3, `.titular`, `.titulo-seccion`, `.cifra`, escena, banda, mosaico, misti, velo de cuenta; retira CSS `.hero-fondo` |
| apps/web/components/public/HeroFondo.tsx | reescribir | escena con rótulos, progreso y pausa que funciona |
| apps/web/components/public/ui/Misti.tsx | crear | silueta SVG de un trazo |
| apps/web/app/(public)/content.tsx | modificar | portada nueva (4.2) |
| apps/web/app/(public)/duenos/content.tsx | modificar | hero como escena; sin `<style>` en línea |
| apps/web/components/public/{AuthCard,Footer}.tsx | modificar | foto de atardecer; Misti en el pie |
| apps/web/components/public/CookieConsent.tsx | modificar | solo clases del título (familia de lectura) |
| apps/web/components/public/inicio/{SeccionTitulo,BandaCierre,FilaFuncion}.tsx | modificar | antetítulo opcional, título de sección estrecho, banda con foto |
| apps/web/public/img/hero/*.webp, CREDITOS.md | reemplazar | 5 viejas fuera, 12 nuevas |
| docs/skills/panel-next.md | modificar | reglas 8 y 10 al sistema nuevo |

**Invariantes:** mismos formularios (`/canchas` GET, nombres `distrito`, `tipo`, `fecha`, `hora`), mismos ids y ARIA del tablero y del buscador, mismos handlers; consentimiento, Analytics y sesión intactos. Bloque motion generado sin tocar.

## 4. Diseño y lógica
Skills aplicadas: design-critique (4.1), frontend-design y frontend-ui-engineering (4.2), design-system (tokens, 4.2), ux-copy (copy, 4.2), accessibility-review (4.3).

### 4.1 Crítica de la portada actual (skill design-critique)
Capturas: `hive/agents/worker-disenador-front-v3/capturas/antes/` (1440 × 900, 390 × 844, página completa).

#### Impresión general
Ordenada y accesible, pero sin punto de vista: un rectángulo verde con un titular centrado y un buscador, igual a cualquier plantilla de reservas. La mayor oportunidad es dejar que las fotos y la tipografía cuenten que esto es fulbito en Arequipa.

#### Hallazgos
| Hallazgo | Severidad | Recomendación |
|---|---|---|
| **La fuente propia nunca se aplicaba.** `next/font` ponía `--ff-inter` en `<body>`, pero `--font-sans` se resuelve en `:root`, donde esa variable no existe; todo el sitio se veía en la fuente del sistema (Noto Sans en Linux, Segoe/Roboto en otros). Es la causa principal del aspecto genérico. | 🔴 Crítica | Declarar las variables de fuente en `<html>`. |
| El velo verde al 82 % sobre fotos cenitales de canchas vacías deja un rectángulo verde plano: las fotos no se perciben. | 🔴 Crítica | Fotos con personas en acción; velo solo bajo el texto, la foto respira en el resto. |
| La pausa no pausaba: el botón estaba fuera de `.hero-fondo` y el selector `.hero-fondo:has(#hero-pausa:checked)` nunca coincidía (WCAG 2.2.2). | 🔴 Crítica | La casilla vive dentro de la sección `.escena`, que es la que se consulta con `:has()`. |
| Titular centrado «Canchas libres en Arequipa» en Inter 700: correcto pero neutro; no hay nada memorable. | 🟡 Moderada | Titular grande y estrecho, alineado a la izquierda, con la pregunta que se hace un grupo de amigos. |
| Secciones repetidas: antetítulo en mayúsculas + título centrado + rejilla de tarjetas iguales («Cómo funciona», «Todos los deportes»). Es el patrón que el skill frontend-design llama plantilla. | 🟡 Moderada | Variar la composición: pasos con numeral grande sobre una línea, mosaico de fotos asimétrico, banda fotográfica a sangre, lista tipográfica de distritos. |
| Deportes como 8 tarjetas idénticas con el texto «Canchas» y una flecha. | 🟡 Moderada | Cuatro deportes con foto en mosaico; los otros cuatro como enlaces de texto. |
| Distritos como chips pequeños centrados: no transmiten «cerca de casa». | 🟢 Menor | Nombres en grande como enlaces. |
| Sin ningún detalle local más allá de la palabra Arequipa. | 🟢 Menor | Silueta de un trazo del Chachani, Misti y Pichu Pichu en el pie; voz con «pichanga», «chamba». |

#### Jerarquía
- Lo primero que se ve: el bloque verde y el buscador. Debería ser la escena (gente jugando) y la pregunta.
- Lectura: titular → subtítulo → buscador está bien; se conserva.

#### Consistencia
| Elemento | Problema | Recomendación |
|---|---|---|
| Tipografía | Una sola familia en un solo grosor máximo (700): títulos y texto se parecen. | Dos familias claramente distintas. |
| Antetítulos | Mayúsculas con espaciado en todas las secciones, aunque no aporten. | Opcionales y en minúsculas de frase. |

#### Accesibilidad
- Contraste: el texto pasaba (velo 82 %). Objetivos táctiles de 44 px: sí. Pausa: fallaba (ver arriba).

#### Lo que funciona
Paleta verde única, tablero «Libres hoy» con datos reales, buscador accesible, FAQ con acordeón, ausencia de sombras duras. Todo se conserva.

### 4.2 Dirección (skill frontend-design)
**Tema:** «noche de pichanga». El mundo del producto es el fulbito de barrio y la losa: la sintética con reflectores, el chat del grupo, el marcador. La identidad sale de ahí, no de una plantilla SaaS.

**Plan y revisión contra lo genérico.** Primera idea: fondo casi negro con un verde ácido de acento (rasgo 2 de la lista del skill). Revisada: el fondo oscuro se limita a escenas con foto y usa `cancha-noche` #0a2418, un verde muy hondo (no un negro teñido); el verde de acento `reflector` #7be3a0 es el color de una cancha bajo luces, y el resto del sitio sigue claro. Segunda idea: tarjetas iguales para pasos y deportes (rasgo 4). Revisada: pasos como columnas con numeral grande sobre una línea verde (es una secuencia real, por eso lleva números), deportes como mosaico de fotos de tamaños distintos. Antetítulos en mayúsculas (rasgo 5): retirados o en minúsculas de frase.

**Lo memorable (una sola cosa):** el titular de marcador, Anybody estrecha y pesada en tamaño muy grande, sobre fotos que se mueven despacio.

#### Tokens
**Color** (`globals.css :root`; panel y público los heredan):
| Token | Hex | Uso |
|---|---|---|
| `cesped` | #17804a | acción principal (blanco encima 4.97:1) |
| `cesped-hondo` | #0f5434 | hover, texto verde sobre claro (8.98:1 sobre blanco) |
| `cancha-noche` (nuevo) | #0a2418 | fondo de escenas con foto y velos |
| `reflector` (nuevo) | #7be3a0 | verde sobre noche: texto (10.43:1), botón con texto `cancha-noche` (10.43:1) |
| `sillar` / `tiza` | #f5f8f6 / #ffffff | fondos claros alternos |
| `basalto` / `pizarra` | #14261c / #4d5f55 | texto y texto secundario |
Amarillo y rojo siguen solo para estado.

**Tipografía** (locales por `next/font/local`, OFL, subconjunto latino con pyftsubset):
- `--font-display`: **Anybody** variable (ejes wdth 50–150, wght 100–900; 55 KB). Titulares grandes (`.titular`, `h1`, `.titulo-seccion`) a wdth 58–68 y peso 800–850; a ancho normal para cifras, horas y títulos pequeños (`font-display` del panel).
- `--font-sans`: **Instrument Sans** variable (wdth 75–100, wght 400–700; 76 KB). Texto, formularios y panel.
- Los pesos `extrabold`/`black` del tema pasan a 800/850 (Instrument se queda en su máximo 700).
- Escala sin cambios (raíz 16 px). Hero 68 px en celular, 136 px en escritorio; títulos de sección 48/60/72 px.

**Composición:** texto alineado a la izquierda en todas las secciones salvo FAQ (columna estrecha centrada). Ritmo de fondos: escena oscura → claro → claro → blanco → banda oscura con foto → claro → blanco → claro → banda oscura con foto → pie con el Misti.

```
┌ escena (foto que se mueve, velo a la izquierda) ────────────────┐
│ ¿Sale                                                            │
│ pichanga hoy?        ← Anybody estrecha 136 px                  │
│ subtítulo con 3 distritos + «26 más»                            │
│ [Distrito][Deporte][Día][Buscar cancha]                         │
│ Pichanga en sintética          ▬ ─ ─ ─ ─   (⏸)                 │
└──────────────────────────────────────────────────────────────────┘
  [ Libres hoy · tablero real ]
  Del chat del grupo a la cancha   1───── 2───── 3─────
  ¿Qué se juega hoy?   ┌──────┬─────────┐   Fútbol 7 · Pádel …
                       │Fútbol│ Fútbol 5│
                       │      ├────┬────┤
                       │      │Vóley│Básq│
  ███ ¿Sales tarde de la chamba?  (pelota bajo reflectores) ███
  Juega cerca de casa: Arequipa  Cayma  Cerro Colorado …
  Para el resto del partido (filas alternas)
  Preguntas frecuentes
  ███ ¿Tienes canchas en Arequipa? (futsal con luz) ███
  ╱╲__╱‾‾‾╲__  pie con la silueta de un trazo
```

**Movimiento** (una sola orquestación): fundido cruzado de 5 fotos en 40 s con acercamiento 1.06→1.16 y desplazamiento lento; rótulo de la foto y tramo de progreso con el mismo reloj; entrada escalonada del bloque del titular con el resorte. Interacción: el mosaico acerca la foto 4 % y mueve la flecha al pasar. Todo bucle lleva `/* motion: ambiental */`; con `prefers-reduced-motion: reduce` queda la primera foto fija, sin rótulos rotando, sin progreso ni botón de pausa.

**Detalles locales sin cliché:** voz («pichanga», «chamba», «del chat del grupo a la cancha»), distritos con nombre propio, y una silueta de un solo trazo (Chachani, Misti, Pichu Pichu) en el pie, una vez por página. Sin llamas, sin «Ciudad Blanca» y sin texturas de sillar.

#### Copy (skill ux-copy)
| Elemento | Antes | Ahora |
|---|---|---|
| H1 portada | Canchas libres en Arequipa | ¿Sale pichanga hoy? |
| Subtítulo | Elige la hora, mira el precio y reserva en un minuto. | Mira qué canchas quedan libres en Cayma, Yanahuara, Cerro Colorado y 26 distritos más de Arequipa. Ves la hora y el precio; reservas en un minuto. |
| Botón del buscador | Buscar canchas | Buscar cancha |
| Cómo funciona | Cómo funciona | Del chat del grupo a la cancha |
| Deportes | Todos los deportes | ¿Qué se juega hoy? |
| Banda nueva | — | ¿Sales tarde de la chamba? Igual hay partido. Elige la hora en el buscador y mira qué canchas quedan libres en la noche, con su precio. [Buscar cancha de noche] |
| Distritos | Distritos de Arequipa | Juega cerca de casa. Busca por tu zona: ReservaYa cubre los 29 distritos de Arequipa. |
| Login (panel lateral) | Tu cancha lista para el pitazo inicial | La cancha lista antes del pitazo |
| Pie | Reservas de canchas deportivas en Arequipa. | …en Arequipa, a la sombra del Misti. |
Los pasos, extras, FAQ, /duenos y legales conservan su texto verificado. El título SEO de `/` sigue siendo «ReservaYa | Canchas libres en Arequipa» (metadata sin cambios). Ninguna frase nueva promete disponibilidad, horarios nocturnos o precios que la API no dé.

#### Fotos
12 WebP de 11 fotos de Pexels con personas en acción (fulbito en sintética, futsal bajo techo, vóley, básquet, gol con tribuna, atardecer, pelota bajo reflectores). Autoría, enlaces y transformación en `apps/web/public/img/hero/CREDITOS.md`. Las descargó el propio temp (images.pexels.com permitido por el sandbox); los originales de 2000 px quedan en `hive/assets/hero-v3/`.

### 4.3 Accesibilidad (skill accessibility-review, WCAG 2.1 AA)
| # | Punto | Criterio | Resultado |
|---|---|---|---|
| 1 | Texto blanco sobre foto con velo | 1.4.3 | Velo ≥ 0.7 de `cancha-noche` bajo todo texto: blanco ≥ 6.14:1, `tiza/90` ≥ 5.35:1 en el peor píxel (blanco puro). Celular: velo de abajo hacia arriba 0.94→0.72; escritorio: 0.9→0.82 hasta el 36 % del ancho. |
| 2 | `reflector` como texto | 1.4.3 | 10.43:1 sobre noche; 6.35:1 sobre el velo de /duenos en celular (0.84); 4.97:1 sobre el velo de cuenta (subido a 0.8). |
| 3 | Botón `reflector` | 1.4.3 | texto `cancha-noche` 10.43:1 |
| 4 | Numerales de pasos `cesped` sobre `sillar` | 1.4.3 | 4.65:1 (texto grande, decorativo `aria-hidden`) |
| 5 | Movimiento automático > 5 s | 2.2.2 | Pausa nativa (casilla) que detiene fotos, rótulos y progreso; verificado. |
| 6 | Movimiento reducido | 2.3.3 | Una foto fija, sin rótulos rotando, sin progreso ni pausa; verificado. |
| 7 | Imágenes | 1.1.1 | Fotos decorativas `alt=""` y `aria-hidden`; los enlaces del mosaico tienen el nombre del deporte como texto. |
| 8 | Objetivos táctiles | 2.5.5 | Pausa 44 px, enlaces de distrito y deporte `min-h-11`. |
| 9 | Foco visible | 2.4.7 | Foco de la pausa con contorno `reflector`; resto heredado. |
| 10 | Encabezados | 1.3.1 | Un h1 por página; h2 por sección; el h1 de la portada sigue con `id="hero-titulo"`. |
Hallazgos abiertos: ninguno. Pendiente: lector de pantalla real y zoom 200 % por Pam.

### 4.4 Parentesco con canchasgo (encargo de god, 2026-10-05, temp worker-disenador-front-v4)
Pedido del humano: parentesco visual claro con canchasgo.com. **Inspiración, no copia:** nada de su logo, nombre, textos ni fotos; referencia en `hive/assets/referencia/canchasgo-1440.png`. Skills aplicadas: frontend-design (dirección y lo memorable), frontend-ui-engineering (componente sin JS, estados y bucles), design-system (tokens y regla 10 de `docs/skills/panel-next.md`), accessibility-review (contraste, pausa, movimiento reducido).

**Qué se toma y qué no**
| Rasgo de la referencia | En ReservaYa |
|---|---|
| Sitio público oscuro, verde casi negro con cuadrícula y resplandor | `.public-site` redefine los tokens base: `sillar` #06120a (fondo), `tiza` #0c1d13 (superficie), `basalto` #e8f3ec (texto), `pizarra` #a3b8ab. Las clases de los componentes no cambian. Cuadrícula de 56 px y dos resplandores verdes solo en `.vitrina`. |
| Un verde vivo de acento | `cesped-vivo` #22c55e (= `reflector`, = `cesped` dentro del público). CTA, palabra central del titular, chip, puntos de la cinta, «Ver horas libres» de las fichas. Texto oscuro encima (8.39:1); nunca blanco. |
| Titular de tres tiempos con la palabra central en verde | Frase propia: «Junta a la mancha. **Reserva.** A la cancha.» («mancha» = el grupo de amigos). «¿Sale pichanga hoy?» queda en el chip. |
| Hero en 2 columnas, chip con punto, CTA sólido + contorno, 4 garantías | Chip «¿Sale pichanga hoy? Canchas libres en Arequipa»; CTA «Buscar cancha →» (salta al buscador) y «Soy dueño de cancha» (/duenos); garantías verificables: solo horas libres, precio a la vista, código para entrar, 29 distritos. |
| Mosaico de fotos en 3 columnas que se desplazan | `components/public/inicio/Vitrina.tsx`: 12 fichas con las fotos propias de la spec 54, 3 columnas desfasadas, velocidades 54/66/60 s (la del medio en sentido contrario), máscara de desvanecido arriba y abajo. **La portada no recibe complejos ni precios del servidor**, así que cada ficha dice deporte + distrito + «Ver horas libres»; no se inventan complejos ni «desde S/ X». Mosaico decorativo (`aria-hidden`). |
| Cabecera oscura con «Registrarse» verde | Cabecera `bg-sillar/95`; sin sesión: «Iniciar sesión» (texto, desde sm; en el menú en celular) + «Registrarse» (/register) verde vivo. |
| Cinta inferior en movimiento | «Se juega en» + los 29 distritos en bucle de 70 s; lector de pantalla oye una frase fija. |
| Barra de anuncio | **No se pone:** no hay un anuncio real que dar. |
| Buscador | Sigue en la portada justo debajo de la vitrina (`#buscar`, «¿Dónde y cuándo juegas?»), mismo formulario GET /canchas, mismos ids y nombres. |
| Panel | Queda claro (formularios densos); comparte tipografía y tokens. `cesped-vivo` #22c55e llega al panel por la barra lateral (logo, ítem activo). El botón del panel sigue en `cesped` #17804a porque lleva texto blanco. |

**Movimiento:** mosaico, cinta y punto del chip son bucles `/* motion: ambiental */`. Una casilla de pausa nativa (44 px) en la cinta detiene los tres (WCAG 2.2.2); el mosaico también se detiene al pasar el puntero. Con `prefers-reduced-motion: reduce` todo queda quieto y la pausa desaparece. El crossfade `HeroFondo` deja la portada y se conserva en /duenos.

**Contraste (1.4.3 / 1.4.11):** basalto/sillar 16.8:1; pizarra/tiza 8.33:1; verde vivo/sillar 8.39:1; texto sillar sobre verde vivo 8.39:1; `cesped-hondo` #4ade80 sobre `cesped-suave` #0f2c1c 8.62:1; borde de campos #5b7a67 / tiza 3.68:1; error #f87171 / #3a1414 5.88:1; aviso #fcd34d / #33270b 10.1:1. Texto de las fichas: blanco sobre velo ≥0.6 de noche al pie de la foto.

**Archivos:** `app/globals.css` (tokens `cesped-vivo` #22c55e, `reflector` = vivo, `cancha-noche` #06120a, nuevo `blanco`), `app/public.css` (tema oscuro, `var(--token)` en lugar de `var(--color-token)`, `.vitrina`, `.mosaico-vivo`, `.ficha-viva`, `.cinta-viva`, `.btn-vivo`), `components/public/inicio/Vitrina.tsx` (nuevo), `app/(public)/content.tsx`, `components/public/Header.tsx`, `components/public/inicio/{BandaCierre,SeccionTitulo}.tsx`, `app/(public)/duenos/content.tsx`, `components/public/AuthCard.tsx`, `components/ui/Modal.tsx` (texto sobre `noche` → `text-blanco`, mismo blanco en panel), `docs/skills/panel-next.md` (regla 10).

**Evidencia:** `hive/agents/worker-disenador-front-v4/capturas/{antes,despues}/` (Firefox headless contra :3000, fuentes cargadas) y `capturas/verificacion.txt`: pausa → 4 animaciones `paused`; movimiento reducido → mosaico y cinta sin animación, pausa oculta; desborde 0 px a 375 px en 9 páginas públicas.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Tipos, lint, tests | `npm --prefix apps/web run typecheck`, `run lint`, `test` | 0 errores (aviso previo de seed) |
| A2 | Motion | `node scripts/motion-tokens.mjs --check` y su test | PASS |
| A3 | Build | `next build` lo corre god con el dev del humano parado | 0 errores |
| A4 | Visual | capturas 1440 y 390 px de /, /duenos, /login, /canchas, /torneos, /sortear, /completar-cuadro, /ayuda | fuentes Anybody/Instrument visibles, fotos con personas visibles |
| A5 | Desborde | `scrollWidth − clientWidth` a 375 px en 9 páginas públicas | 0 px |
| A6 | Pausa y movimiento reducido | Firefox: pulsar la pausa; perfil con `ui.prefersReducedMotion` | `paused` en las 3 animaciones; 1 foto fija |
| A7 | CLS | `node apps/web/scripts/cls.mjs --landing` y panel | público <0.02, panel ≤0.02 |

## 6. Checklist
- [x] T1: crítica con capturas (4.1) y dirección (4.2).
- [x] T2: fotos seleccionadas, descargadas, recortadas y acreditadas.
- [x] T3: fuentes, tokens y CSS de escena/banda/mosaico.
- [x] T4: portada, /duenos, login/registro, pie; resto de páginas heredan h1/h2, fuentes y tokens.
- [x] T5: gates locales (A1, A2), desborde (A5), pausa y movimiento reducido (A6) con evidencia en `hive/agents/worker-disenador-front-v3/capturas/`.
- [x] T7: parentesco con canchasgo (4.4): tema oscuro público, vitrina, cabecera; gates A1, A2, A5, A6 verdes.
- [ ] T6: build, CLS y revisión del panel con sesión (god/Pam).

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
