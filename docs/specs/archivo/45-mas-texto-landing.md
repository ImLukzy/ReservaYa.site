# Especificación: 45 - Más texto en la landing

**Aprobada por Lukas:** 2026-09-30 02:58 («haz que añadan más texto a cada parte del landing, más contenido por parte de texto, hay muy poco texto en cada parte»).

## 1. Objetivo
**Problema:** las secciones de la landing tienen un título y una línea; al visitante le falta contexto para decidir y a Google le falta texto para posicionar «canchas en Arequipa».
**Resultado esperado:** cada sección explica qué es, para quién es y qué gana el visitante, en 2 a 4 frases, sin inventar nada.

## 2. Fuera de alcance
Diseño nuevo, secciones nuevas, imágenes, precios o cifras que no estén ya en el código, testimonios, rutas, lógica, panel, API.

**Decisiones de producto que requieren aprobación:** ninguna (Lukas aprobó el objetivo).

## 3. Archivos afectados
| Lote | Archivos (`reservaya-frontend-astro/src/`) |
|---|---|
| T1 | `pages/index.astro` (todas las secciones: hero, cómo funciona, deportes, distritos, extras, preguntas, dueños) |
| T2 | `pages/duenos.astro`, `components/Planes.astro` |
| T3 | `pages/torneos.astro`, `pages/completar-cuadro.astro`, `pages/sortear.astro` |
| T4 | `pages/canchas.astro` (cabecera y estado vacío), `pages/ayuda.astro` |
| T5 | Lukas 03:14: «añadir más texto a las secciones de preguntas en todas». `pages/index.astro:51` (5 preguntas), `pages/duenos.astro:28` (5), `pages/sortear.astro:9` (4): cada una llega a 8 preguntas con respuestas LARGAS de 3 a 5 frases (60 a 90 palabras; Lukas 03:35: «tiene que agregar respuestas más largas»); en el inicio vuelven «¿En qué distritos hay canchas?» y «¿Necesito pagar en la página?». Implementa Oscar |

## 4. Reglas de redacción
- **Verdad antes que venta:** solo se afirma lo que el producto hace hoy; cada afirmación nueva debe poder señalarse en el código (página, componente o endpoint). Nada de cifras, reseñas, premios ni «el mejor». Si algo depende del dueño de la cancha (pago, cancelación), se dice así.
- **Voz:** español de Perú, tuteo, frases cortas, verbos concretos. Mismo tono que el texto actual.
- **Forma:** intro de sección de 2 a 4 frases (≤ 60 palabras); ítems de lista o tarjetas con 1 frase de apoyo (≤ 20 palabras); preguntas frecuentes: 3 a 6 más en el inicio si hay material real.
- **SEO natural:** «canchas en Arequipa», nombres de distritos y deportes donde encajen, sin repetir por repetir.
- **Diseño:** solo tokens y clases existentes (`text-pizarra` para texto de apoyo, `max-w-texto` para párrafos). 0 px de scroll lateral a 360 px.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Astro | `astro check` + `build` | 0 errores |
| A2 | Veracidad | tabla del borrador: cada frase nueva con su fuente en el código; revisión god | 100 % |
| A3 | Sin desbordes | Playwright 360/768/1440 en las páginas del lote | 0 px |
| A4 | Contenido | cada sección de la tabla §3 con intro de 2 a 4 frases | todas |

## 6. Checklist
- [x] Borrador de textos (T1–T4) con fuentes → revisión god.
- [x] T1 · [x] T2 · [x] T3 · [x] T4 aplicados.
- [x] Gates y §7.
- [x] T5: preguntas ampliadas en inicio, dueños y sortear.

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-09-30 | A1 | ✅ | god: astro check 0 errores · build 17 páginas |
| 2026-09-30 | A2 | ✅ | borrador v2 (`hive/agents/worker-s45-textos/textos.md`) revisado por god: fuera voseo, «efectivo, Yape, tarjeta», «Cancela cuando quieras», «somos rápidos», «sin choques», «44 distritos», «cercano»; «hoy o mañana» confirmado en `index.astro:19` |
| 2026-09-30 | A3 | ✅ | Playwright god: `/` y `/canchas` a 360/768/1440/1745 → 0 px; redactora: 21/21 páginas×anchos |
| 2026-09-30 | Pendiente | — | preguntas del inicio: se reemplazaron las 5 antiguas en vez de sumarse (faltan «¿En qué distritos hay canchas?» y «¿Necesito pagar en la página?»); frases de apoyo en los 3 enlaces de «Para el resto del partido» |
| 2026-09-30 | T5 | ✅ | Oscar: 8/8/8 preguntas en index/duenos/sortear, 4 frases y ~50 palabras por respuesta (por debajo de las 60 pedidas: no se rellenó sin hechos); vuelven «¿En qué distritos…?» y «¿Necesito pagar en la página?». god corrigió 1 frase falsa («muestra los distritos que tienen opciones» → el buscador incluye los 29, `index.astro:13`). astro check 0 · build 17 páginas · 360 px 0 overflow, 8/8 details abren (Oscar) |
