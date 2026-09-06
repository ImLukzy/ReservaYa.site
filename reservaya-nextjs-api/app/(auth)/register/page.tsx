'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/lib/api-client'
import { publicAppUrl } from '@/lib/public-app'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '', fechaNacimiento: '', username: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!form.fechaNacimiento) {
      setError('La fecha de nacimiento es obligatoria')
      return
    }
    if (!/^[a-z0-9_.-]{3,20}$/.test(form.username.trim().toLowerCase())) {
      setError('Tu usuario: 3-20 caracteres (letras, números, _ . -)')
      return
    }

    setLoading(true)
    try {
      await register(form.nombre, form.email, form.password, form.fechaNacimiento, form.username.trim().toLowerCase())
    } catch (error) {
      setLoading(false)
      setError(error instanceof Error ? error.message : 'No se pudo crear la cuenta')
      return
    }
    setLoading(false)
    const params = new URLSearchParams(window.location.search)
    const returnUrl = params.get('returnUrl')
    if (returnUrl && (/^\/[^/]/.test(returnUrl) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(returnUrl))) {
      window.location.href = returnUrl
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center p-4">
      <div className="auth-card rounded-3xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <a href={publicAppUrl} className="auth-home-link mb-6 flex w-fit items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true">←</span>
            ReservaYa
          </a>
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#22C55E] to-[#14532D] rounded-2xl mb-4 shadow-lg shadow-black/30">
            <span className="text-3xl">🏟️</span>
          </div>
          <h1 className="text-2xl font-bold text-[#101613]">ReservaYa</h1>
          <p className="text-[#5B6660] mt-1">Crea tu cuenta gratis</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-400/25 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="auth-label block text-sm font-medium mb-1">Nombre completo (no se podrá cambiar)</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="auth-input w-full px-4 py-3 rounded-lg focus:outline-none transition"
              placeholder="Juan Pérez"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="auth-label block text-sm font-medium mb-1">Nacimiento (no editable)</label>
              <input
                type="date"
                required
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                className="auth-input w-full px-4 py-3 rounded-lg focus:outline-none transition"
              />
            </div>
            <div>
              <label className="auth-label block text-sm font-medium mb-1">Usuario (1 cambio/año)</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="auth-input w-full px-4 py-3 rounded-lg focus:outline-none transition"
                placeholder="tucrack10"
              />
            </div>
          </div>

          <div>
            <label className="auth-label block text-sm font-medium mb-1">Email</label>
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
            <label className="auth-label block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="auth-input w-full px-4 py-3 rounded-lg focus:outline-none transition"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="auth-label block text-sm font-medium mb-1">Confirmar contraseña</label>
            <input
              type="password"
              required
              value={form.confirmar}
              onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
              className="auth-input w-full px-4 py-3 rounded-lg focus:outline-none transition"
              placeholder="Repite tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:bg-[#86EFAC] text-white font-semibold py-3 rounded-lg transition duration-200 mt-2 shadow-lg shadow-green-900/25"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="auth-link font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}