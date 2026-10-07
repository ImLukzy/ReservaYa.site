'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { UsuarioSesion } from '@/lib/api-types'
import { updatePerfil, subirFotoPerfil } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface PerfilFormProps {
  usuario: UsuarioSesion
  /** Textos del jugador (carné deportivo); el resto de roles ve textos de cuenta. */
  jugador?: boolean
}

export function PerfilForm({ usuario, jugador = true }: PerfilFormProps) {
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
        <h2 className="font-display text-xl font-bold tracking-tight text-basalto">{jugador ? 'Editar perfil deportivo' : 'Editar perfil'}</h2>
        <p className="mt-1 text-sm text-pizarra">
          {jugador ? 'Actualiza tus datos de contacto y personaliza tu carné de jugador.' : 'Actualiza tus datos de contacto y tu foto de perfil.'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center border-b border-cal pb-6">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-cal bg-piedra shadow-suave-sm">
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
          <div role="status" className="rounded-md border border-cesped-hondo bg-cesped-suave px-3 py-2 text-sm font-bold text-cesped-hondo shadow-suave-sm">
            {mensaje}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-md border border-error bg-error-suave px-3 py-2 text-sm font-bold text-error shadow-suave-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="perfil-nombre"
            type="text"
            disabled
            value={usuario.nombre}
            etiqueta="Nombre"
            nota="Nombre de la cuenta de acceso."
          />
          <Input
            id="perfil-email"
            type="email"
            disabled
            value={usuario.email}
            etiqueta="Correo electrónico"
            nota="Identificador único de sesión."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="perfil-telefono"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej. 987654321"
            etiqueta="Teléfono de contacto"
            nota="Para coordinar avisos de reservas y partidos."
          />
          <Input
            id="perfil-fecha"
            type="date"
            disabled={fechaNacFija}
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            etiqueta="Fecha de nacimiento"
            nota={fechaNacFija ? 'No se puede cambiar una vez fijada.' : 'Fíjala una vez: luego no se podrá modificar.'}
          />
        </div>

        <Input
          id="perfil-username"
          type="text"
          disabled={usernameBloqueado}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ej. lukzy99"
          etiqueta="Nombre de usuario (@username)"
          nota={
            usernameBloqueado
              ? `Podrás cambiarlo el ${fechaProximo}. Se puede cambiar una vez al año.`
              : 'De 3 a 20 caracteres (letras, números, _ . -). Se puede cambiar una vez al año.'
          }
        />

        <div className="pt-2">
          <Button type="submit" variant="primary" loading={loading} disabled={loading || subiendoFoto}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  )
}
