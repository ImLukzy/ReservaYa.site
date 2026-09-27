'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { UsuarioSesion } from '@/lib/api-types'
import { updatePerfil, subirFotoPerfil } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface PerfilFormProps {
  usuario: UsuarioSesion
}

export function PerfilForm({ usuario }: PerfilFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [username, setUsername] = useState(usuario.username ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(
    usuario.fechaNacimiento ? usuario.fechaNacimiento.slice(0, 10) : ''
  )
  const [fotoUrl, setFotoUrl] = useState(usuario.fotoUrl ?? null)

  const [loading, setLoading] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const iniciales = usuario.nombre
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const fechaNacFija = Boolean(usuario.fechaNacimiento)
  const usernameBloqueado = Boolean(usuario.username && usuario.proximoCambioUsername)
  const fechaProximo = usuario.proximoCambioUsername
    ? new Date(usuario.proximoCambioUsername).toLocaleDateString('es-PE')
    : null

  const limpiarAlertas = () => {
    setMensaje(null)
    setError(null)
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    limpiarAlertas()
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      if (fileRef.current) fileRef.current.value = ''
      setError('La imagen no puede superar 3 MB.')
      return
    }

    setSubiendoFoto(true)
    try {
      const res = await subirFotoPerfil(file)
      setFotoUrl(res.fotoUrl)
      setMensaje('Foto de perfil actualizada.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto')
    } finally {
      setSubiendoFoto(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    limpiarAlertas()

    const payload: { telefono?: string; username?: string; fechaNacimiento?: string } = {}
    const telTrim = telefono.trim()
    const userTrim = username.trim().toLowerCase()

    if (telTrim !== (usuario.telefono ?? '')) {
      payload.telefono = telTrim
    }
    if (!usernameBloqueado && userTrim && userTrim !== (usuario.username ?? '').toLowerCase()) {
      payload.username = userTrim
    }
    if (!fechaNacFija && fechaNacimiento) {
      payload.fechaNacimiento = fechaNacimiento
    }

    if (Object.keys(payload).length === 0) {
      setMensaje('No hay cambios pendientes para guardar.')
      return
    }

    setLoading(true)
    try {
      const res = await updatePerfil(payload)
      setMensaje('Datos actualizados correctamente.')
      if (res.usuario) {
        if (res.usuario.telefono !== undefined) setTelefono(res.usuario.telefono ?? '')
        if (res.usuario.username !== undefined) setUsername(res.usuario.username ?? '')
        if (res.usuario.fechaNacimiento) setFechaNacimiento(res.usuario.fechaNacimiento.slice(0, 10))
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-cal bg-tiza">
      <div className="border-b border-cal pb-4">
        <h2 className="font-display text-xl font-bold tracking-tight text-basalto">Editar perfil deportivo</h2>
        <p className="mt-1 text-sm text-pizarra">Actualiza tus datos de contacto y personaliza tu carné de jugador.</p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center border-b border-cal pb-6">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-cal bg-piedra">
          {fotoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={fotoUrl} alt="Foto de perfil" width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cesped-suave font-display text-xl font-bold text-cesped-hondo">
              {iniciales}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFotoChange}
            className="hidden"
            aria-label="Subir foto de perfil"
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={subiendoFoto}
              disabled={subiendoFoto}
              onClick={() => fileRef.current?.click()}
            >
              Cambiar foto
            </Button>
            <span className="text-xs text-pizarra">JPG, PNG, WEBP o GIF (máx. 3 MB)</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mensaje && (
          <div role="status" className="rounded-md border border-cesped/30 bg-cesped-suave px-3 py-2 text-sm font-semibold text-cesped-hondo">
            {mensaje}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-md border border-error/30 bg-error-suave px-3 py-2 text-sm font-semibold text-error">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="perfil-nombre" className="block text-xs font-semibold text-pizarra uppercase tracking-wider">
              Nombre
            </label>
            <input
              id="perfil-nombre"
              type="text"
              disabled
              value={usuario.nombre}
              className="mt-1.5 w-full rounded-md border border-cal bg-piedra px-3 py-2 text-sm text-pizarra cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-pizarra">Nombre de la cuenta de acceso.</p>
          </div>

          <div>
            <label htmlFor="perfil-email" className="block text-xs font-semibold text-pizarra uppercase tracking-wider">
              Correo electrónico
            </label>
            <input
              id="perfil-email"
              type="email"
              disabled
              value={usuario.email}
              className="mt-1.5 w-full rounded-md border border-cal bg-piedra px-3 py-2 text-sm text-pizarra cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-pizarra">Identificador único de sesión.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="perfil-telefono" className="block text-xs font-semibold text-basalto uppercase tracking-wider">
              Teléfono de contacto
            </label>
            <input
              id="perfil-telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 987654321"
              className="mt-1.5 w-full rounded-md border border-cal bg-tiza px-3 py-2 text-sm text-basalto placeholder:text-niebla focus:border-cesped focus:outline-none focus:ring-1 focus:ring-cesped"
            />
            <p className="mt-1 text-[11px] text-pizarra">Para coordinar avisos de reservas y partidos.</p>
          </div>

          <div>
            <label htmlFor="perfil-fecha" className="block text-xs font-semibold text-basalto uppercase tracking-wider">
              Fecha de nacimiento
            </label>
            <input
              id="perfil-fecha"
              type="date"
              disabled={fechaNacFija}
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className={`mt-1.5 w-full rounded-md border border-cal px-3 py-2 text-sm ${
                fechaNacFija
                  ? 'bg-piedra text-pizarra cursor-not-allowed'
                  : 'bg-tiza text-basalto focus:border-cesped focus:outline-none focus:ring-1 focus:ring-cesped'
              }`}
            />
            <p className="mt-1 text-[11px] text-pizarra">
              {fechaNacFija ? 'No se puede cambiar una vez fijada.' : 'Fíjala una vez: luego no se podrá modificar.'}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="perfil-username" className="block text-xs font-semibold text-basalto uppercase tracking-wider">
            Nombre de usuario (@username)
          </label>
          <input
            id="perfil-username"
            type="text"
            disabled={usernameBloqueado}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ej. lukzy99"
            className={`mt-1.5 w-full rounded-md border border-cal px-3 py-2 text-sm ${
              usernameBloqueado
                ? 'bg-piedra text-pizarra cursor-not-allowed'
                : 'bg-tiza text-basalto placeholder:text-niebla focus:border-cesped focus:outline-none focus:ring-1 focus:ring-cesped'
            }`}
          />
          <p className="mt-1 text-[11px] text-pizarra">
            {usernameBloqueado
              ? `Podrás cambiarlo el ${fechaProximo}. Se puede cambiar una vez al año.`
              : 'De 3 a 20 caracteres (letras, números, _ . -). Se puede cambiar una vez al año.'}
          </p>
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" loading={loading} disabled={loading || subiendoFoto}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  )
}
