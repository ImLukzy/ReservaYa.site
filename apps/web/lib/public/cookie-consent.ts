type CookieDecision = 'accepted' | 'rejected' | null
export const COOKIE_KEY = 'reservaya-analytics-consent-v1'
export const COOKIE_OPEN = 'reservaya-cookie-preferences'
const COOKIE_CHANGE = 'reservaya-cookie-change'
let memory: CookieDecision = null

export function cookieDecision(): CookieDecision {
  if (memory !== null) return memory
  try {
    const value = window.localStorage.getItem(COOKIE_KEY)
    return value === 'accepted' || value === 'rejected' ? value : null
  } catch { return memory }
}
export function serverCookieDecision(): CookieDecision { return null }
export function subscribeCookies(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === COOKIE_KEY || event.key === null) {
      memory = null
      listener()
    }
  }
  window.addEventListener(COOKIE_CHANGE, listener)
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener(COOKIE_CHANGE, listener)
    window.removeEventListener('storage', storage)
  }
}
export function chooseCookies(value: Exclude<CookieDecision, null>) {
  memory = value
  let persisted = false
  try { window.localStorage.setItem(COOKIE_KEY, value); persisted = true } catch { /* Solo esta sesión. */ }
  window.dispatchEvent(new Event(COOKIE_CHANGE))
  return persisted
}
