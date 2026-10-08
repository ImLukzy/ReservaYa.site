# Especificación: 68 - Canchas cerca de mí

Estado: aprobada 2026-10-08 (humano: "trabaja en todas las mejoras sin coste"). Depende de la spec 62 (coordenadas del complejo).

## 1. Objetivo
**Problema:** `/canchas` filtra por distrito, pero no por distancia.
**Resultado esperado:**
- Botón "Cerca de mí" en `/canchas`: con permiso de ubicación del navegador, ordena por distancia y muestra "a 1,2 km" en cada tarjeta.
- Mapa opcional "Ver en mapa" (Leaflet + OSM, el mismo componente que en la spec 62) con los complejos.

## 2. Fuera de alcance
Rutas, tráfico y tiempo de viaje.

**Decisiones de producto que requieren aprobación:** ninguna.

## 3. Archivos afectados
| Archivo | Acción | Nota |
|---|---|---|
| `apps/api/src/public/read.service.ts` (`disponibles`) | modificar | devolver `latitud`/`longitud` del complejo; parámetros opcionales `lat`/`lng` para ordenar por distancia (Haversine en SQL o en memoria, porque son pocos) |
| `apps/web/lib/public/scripts/canchas.ts`, `tarjetas.ts`, `canchas/content.tsx` | modificar | botón, distancia en la tarjeta, orden "Más cerca" y vista de mapa con carga diferida |
| tests | crear | distancia y orden |

## 4. Diseño y lógica
- La ubicación del usuario nunca se envía a terceros ni se guarda; solo viaja a nuestra API en la consulta.
- Los complejos sin coordenadas van al final, con "distancia no disponible".
- Si el usuario niega el permiso, se muestra un aviso y la búsqueda sigue como hoy.
- Objetivos táctiles ≥ 44 px; CLS ≤ 0,1.

## 5. Criterios de aceptación
| # | Criterio | Cómo se verifica | Umbral |
|---|---|---|---|
| A1 | Gate | turbo (god) | 18/18 |
| A2 | Orden | test: con lat/lng ordena por distancia; sin coordenadas, al final | pasa |
| A3 | UI | Playwright con geolocalización simulada en Arequipa: tarjetas con "a N km" y orden correcto; permiso denegado → aviso | pasa |

## 6. Checklist
- [x] T1 API · [ ] T2 UI · [ ] T3 mapa · [ ] T4 tests/§7

## 7. Registro de verificación
| Fecha | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 2026-10-08 | A2, A3 | Pasa | Jim: `disponibles-cerca.test.ts` 3/3, shared `distanciaKm` 2/2; Playwright local con geolocalización simulada 15/15 (orden por distancia, permiso denegado, mapa con marcador); capturas en `hive/agents/jim-muvk1y3c/cerca-de-mi/`. |
| 2026-10-08 | A1 | Pasa | god con 68 y 69 en main: `turbo run build typecheck lint test --force` 18/18 (API 208, web 97). |
