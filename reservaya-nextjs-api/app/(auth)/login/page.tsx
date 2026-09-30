'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/api-client'
import { ApiError } from '@/lib/api-types'
import { publicAppUrl } from '@/lib/public-app'
import { fallbackPorRol } from '@/lib/permissions'
import { returnUrlSeguro } from '@/lib/redirect'
import { Marca } from '@/components/ui/Marca'

const MSG_BLOQUEO = 'Demasiados intentos. Espera 15 minutos antes de reintentar.'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const errorVisible = !!error

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await login(form.email, form.password)
      setLoading(false)
      // Si viene de la web pública (Astro /mis-reservas), vuelve ahí tras entrar.
      const params = new URLSearchParams(window.location.search)
      const returnUrl = returnUrlSeguro(params.get('returnUrl'), window.location.origin, [publicAppUrl])
      if (returnUrl) {
        window.location.href = returnUrl
        return
      }
      router.push(fallbackPorRol(data.usuario.rol))
    } catch (error) {
      setLoading(false)
      if (error instanceof ApiError && error.status === 429) {
        setError(MSG_BLOQUEO)
      } else {
        const message = error instanceof Error ? error.message : ''
        setError(message || 'No se pudo iniciar sesión')
      }
      return
    }
  }

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center p-4">
      <div className="auth-card rounded-3xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href={publicAppUrl} className="auth-home-link mb-6 inline-flex w-fit items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true">←</span>
            Volver a inicio
          </a>
          <div className="mx-auto mb-2 flex justify-center">
            <Marca href={publicAppUrl} />
          </div>
          <p className="text-sm font-medium text-pizarra mt-2">Inicia sesión en tu cuenta</p>
        </div>

        {errorVisible && (
          <div className="mb-6 rounded-lg border border-error bg-error-suave px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="auth-label block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="auth-input w-full px-4 py-3 rounded-lg focus:outline-none transition"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="auth-label block text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="auth-input w-full px-4 py-3 rounded-lg focus:outline-none transition"
              placeholder="••••••••"
            />
            <p className="mt-2 text-right">
              <a
                href={`${publicAppUrl.replace(/\/$/, '')}/forgot-password`}
                className="auth-link text-sm font-medium hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-tactil w-full bg-cesped text-tiza hover:bg-cesped-hover disabled:opacity-50 font-bold py-3 text-base"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-pizarra mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="auth-link font-medium hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
