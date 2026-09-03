'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/api-client'
import { publicAppUrl } from '@/lib/public-app'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const errorVisible = error &&
    !error.includes('Demasiados intentos') &&
    error !== 'No se pudo iniciar sesión. Verifica tus datos e inténtalo nuevamente.'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await login(form.email, form.password)
      setLoading(false)
      const rol = data.usuario.rol
      if (rol === 'SUPERADMIN') router.push('/superadmin')
      else if (rol === 'ADMIN') router.push('/admin')
      else router.push('/dashboard')
    } catch (error) {
      setLoading(false)
      const message = error instanceof Error ? error.message : ''
      if (message.includes('Demasiados intentos')) {
        setError('')
      } else {
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
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#cf3048] to-[#7d1728] rounded-2xl mb-4 shadow-lg shadow-black/30">
            <span className="text-3xl">🏟️</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fff8f1]">ReservaYa</h1>
          <p className="text-[#c6b6aa] mt-1">Inicia sesión en tu cuenta</p>
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
            className="w-full bg-[#a6192e] hover:bg-[#cf3048] disabled:bg-[#7d1728] text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg shadow-black/25"
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

        {/* Credenciales de prueba */}
        {/* <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">🧪 Credenciales de prueba:</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p><span className="font-medium">Superadmin:</span> superadmin@reservafacil.com / superadmin123</p>
            <p><span className="font-medium">Admin:</span> admin@reservafacil.com / admin123</p>
            <p><span className="font-medium">Usuario:</span> usuario@reservafacil.com / usuario123</p>
          </div>
        </div> */}
      </div>
    </div>
  )
}