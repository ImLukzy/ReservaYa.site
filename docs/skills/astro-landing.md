# SKILL: Landing Astro (`reservaya-frontend-astro/`)
**Cuándo usar:** cualquier cambio en `src/pages/**`, `src/layouts/BaseLayout.astro`, `src/components/**`, `src/scripts/**`, `public/**`.

## Reglas Estrictas:
1. **Scripts inline = JS plano.** `<script is:inline>` y cualquier `<script define:vars>` (implícitamente inline) no se transforman: prohibido `as X`, `!`, genéricos, `: tipo`. Leer atributos con `getAttribute`/`dataset` sin casts.
2. **Scripts procesados (`<script>` sin atributos) sí son TS:** tipar con `querySelector<HTMLElement>()` / `instanceof`, nunca `as any`. Deben pasar `astro check`.
3. **Nada de `innerHTML` con datos de API o usuario.** Usar `textContent`/`createElement`. `innerHTML` solo con literales fijos o valores pasados por `esc()`.
4. **URLs:** API = `import.meta.env.PUBLIC_RESERVAYA_API_URL`, panel = `PUBLIC_RESERVAYA_APP_URL`; nunca `http://localhost:*` fuera del fallback de esas dos.
5. **Redirecciones:** `returnUrl` pasa por `getSafeReturnUrl` (`src/pages/login.astro`): solo rutas `/…` locales o mismo origen.
6. **Sin PII hardcodeada** ni mocks de datos reales; estados vacíos/skeleton neutros.
7. **Sin `alert()`** ni `console.*` sueltos: mensajes en la UI (toast o texto de error).
8. **Estilo:** fondo `#FAFAF9`/blanco, texto `#101613`/`#5B6660`/`#8A938D`, acento verde `#22C55E`; bordes `#E7E5E4`. Móvil primero, sin scroll horizontal a 375 px. Contenedor oscuro: color explícito en cada texto o `on-dark` en el contenedor; la capa base de `global.css` fija color en `h1–h5, p, span, li, em, strong` y corta la herencia, salvo `span/em/strong` dentro de headings (spec 10) y de enlaces o botones (spec 12). Sobre verde sólido (`#22C55E`/`#16A34A`) el texto va en `#060C08`, nunca blanco (spec 13).
9. **Verificación:** `npx astro check` (0 errores) + `npm run build` + `node --check` sobre el JS inline emitido en `dist/` cuando se toca un script inline.
