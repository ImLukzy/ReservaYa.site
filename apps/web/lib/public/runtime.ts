import { apiRequest } from '../http'
import { ApiError } from '../api-types'

// Retains the response contract of the existing public interactions while using
// the same authenticated request helper as the rest of the Next application.
export function createScriptScope() {
  const controller = new AbortController()
  const listen = <K extends keyof (HTMLElementEventMap & WindowEventMap)>(target: EventTarget | null | undefined, name: K, callback: (event: (HTMLElementEventMap & WindowEventMap)[K]) => void, options?: AddEventListenerOptions | boolean) => {
    target?.addEventListener(name, callback as EventListener, { ...(typeof options === 'object' ? options : { capture: options }), signal: controller.signal })
  }
  const request = async (path: string, options?: RequestInit): Promise<Pick<Response, "ok" | "status" | "json">> => {
    const signal = options?.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal
    if (!path.startsWith("/api/")) return globalThis.fetch(path, { ...options, credentials: "omit", signal })
    try {
      const body = await apiRequest<unknown>(path, { ...options, signal })
      return { ok: true, status: 200, json: async () => body }
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
      return { ok: false, status: error.status, json: async () => ({ error: error.message }) }
    }
  }
  return { listen, request, dispose: () => controller.abort() }
}
