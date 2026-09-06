'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/api-client'
import { ApiError } from '@/lib/api-types'
import { publicAppUrl } from '@/lib/public-app'

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
      const returnUrl = params.get('returnUrl')
      if (returnUrl && (/^\/[^/]/.test(returnUrl) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(returnUrl))) {
        window.location.href = returnUrl
        return
      }
      const rol = data.usuario.rol
      if (rol === 'SUPERADMIN') router.push('/superadmin')
      else if (rol === 'TECNICO') router.push('/tecnico')
      else if (rol === 'ADMIN') router.push('/admin')
      else router.push('/dashboard')
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
          <a href={publicAppUrl} className="auth-home-link mb-6 flex w-fit items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true">←</span>
            ReservaYa
          </a>
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#22C55E] to-[#14532D] rounded-2xl mb-4 shadow-lg shadow-black/30">
            <span className="text-3xl">🏟️</span>
          </div>
          <h1 className="text-2xl font-bold text-[#101613]">ReservaYa</h1>
          <p className="text-[#5B6660] mt-1">Inicia sesión en tu cuenta</p>
        </div>

        {errorVisible && (
          <div className="bg-rose-500/10 border border-rose-400/25 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm">
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:bg-[#86EFAC] text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg shadow-green-900/25"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="auth-link font-medium hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}