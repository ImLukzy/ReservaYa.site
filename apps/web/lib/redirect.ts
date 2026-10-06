// Valida el `returnUrl` de login/registro para evitar open redirects.
// Pura y sin imports: se prueba con `node --test` (lib/redirect.test.mjs).

const PELIGROSO = /[\\\u0000-\u001F\u007F]/

function origenDe(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/**
 * Devuelve una URL de retorno segura o `null`.
 * - Ruta local (`/x`): se resuelve contra `origen` y se devuelve relativa.
 * - URL absoluta: solo `http(s)` cuyo origen sea `origen` o uno de `extras`.
 */
export function returnUrlSeguro(
  raw: string | null | undefined,
  origen: string,
  extras: readonly string[] = []
): string | null {
  if (!raw || PELIGROSO.test(raw) || raw.startsWith('//')) return null
  const propio = origenDe(origen)
  if (!propio) return null

  if (raw.startsWith('/')) {
    const url = new URL(raw, propio)
    return url.origin === propio ? url.pathname + url.search + url.hash : null
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const permitidos = [propio, ...extras.map(origenDe)]
  return permitidos.includes(url.origin) ? url.href : null
}
