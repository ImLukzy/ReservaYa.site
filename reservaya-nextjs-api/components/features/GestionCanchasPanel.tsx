'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { createCancha, deleteCancha, updateCancha } from '@/lib/api-client'
import type { Cancha, CanchaInput, TipoCancha } from '@/lib/api'

const tipoEmoji: Record<string, string> = {
  FUTBOL: '⚽', FUTBOL5: '⚽', FUTBOL7: '⚽', PADEL: '🎾',
  TENIS: '🎾', BASQUET: '🏀', VOLLEYBALL: '🏐', LOZA: '🏟️',
}

const TIPOS = ['FUTBOL', 'FUTBOL5', 'FUTBOL7', 'PADEL', 'TENIS', 'BASQUET', 'VOLLEYBALL', 'LOZA']

const SUPERFICIES = ['', 'Sintético', 'Natural', 'Arcilla', 'Loza', 'Parquet', 'Cemento']

export interface ComplejoOpcion {
  id: string
  nombre: string
}

const formVacio = {
  nombre: '', tipo: 'FUTBOL', descripcion: '',
  precioPorHora: '', capacidad: '', activa: true,
  complejoId: '', techada: false, superficie: '', imagen: '',
}

const flabel = 'mb-1.5 block font-display text-[0.8125rem] font-bold text-basalto'
const finput =
  'w-full rounded-xl border-2 border-basalto bg-tiza px-4 py-2.5 font-display text-sm font-bold text-basalto placeholder:text-pizarra transition focus:border-cesped focus:shadow-dura-sm focus:outline-none'
const fselect = finput

export function GestionCanchasPanel({
  canchas,
  complejos = [],
  esSuperAdmin = false,
}: {
  canchas: Cancha[]
  complejos?: ComplejoOpcion[]
  esSuperAdmin?: boolean
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cancha | null>(null)
  const [form, setForm] = useState(formVacio)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [fq, setFq] = useState('')
  const [fdistrito, setFdistrito] = useState('')
  const [fciudad, setFciudad] = useState('')
  const [fcomplejo, setFcomplejo] = useState('')
  const [ftipo, setFtipo] = useState('')

  const distritos = [...new Set(canchas.map((c) => c.complejo?.distrito).filter((d): d is string => !!d))].sort()
  const ciudades = [...new Set(canchas.map((c) => c.complejo?.ciudad).filter((d): d is string => !!d))].sort()

  const filtradas = canchas.filter((c) => {
    if (fq.trim() !== '') {
      const q = fq.trim().toLowerCase()
      const hay = `${c.nombre} ${c.descripcion ?? ''} ${c.complejo?.nombre ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (fdistrito !== '' && c.complejo?.distrito !== fdistrito) return false
    if (fciudad !== '' && c.complejo?.ciudad !== fciudad) return false
    if (fcomplejo !== '' && c.complejoId !== fcomplejo) return false
    if (ftipo !== '' && c.tipo !== ftipo) return false
    return true
  })
  const hayFiltros = fq.trim() !== '' || fdistrito !== '' || fciudad !== '' || fcomplejo !== '' || ftipo !== ''

  function limpiarFiltros() {
    setFq('')
    setFdistrito('')
    setFciudad('')
    setFcomplejo('')
    setFtipo('')
  }

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function fijarPreview(url: string | null, file: File | null = null) {
    setPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return url
    })
    setArchivo(file)
  }

  function abrirCrear() {
    setEditando(null)
    setForm(formVacio)
    fijarPreview(null)
    setError('')
    setModalOpen(true)
  }

  function abrirEditar(cancha: Cancha) {
    setEditando(cancha)
    setForm({
      nombre: cancha.nombre,
      tipo: cancha.tipo,
      descripcion: cancha.descripcion ?? '',
      precioPorHora: cancha.precioPorHora.toString(),
      capacidad: cancha.capacidad.toString(),
      activa: cancha.activa,
      complejoId: cancha.complejoId ?? '',
      techada: cancha.techada,
      superficie: cancha.superficie ?? '',
      imagen: cancha.imagen ?? '',
    })
    fijarPreview(cancha.imagen ?? null)
    setError('')
    setModalOpen(true)
  }

  function elegirArchivo(file: File | null) {
    if (!file) {
      fijarPreview(editando?.imagen ?? null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen (JPG, PNG, WEBP o GIF).')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('La imagen no puede superar 3 MB.')
      return
    }
    setError('')
    fijarPreview(URL.createObjectURL(file), file)
  }

  async function guardar() {
    setError('')
    const precio = Number(form.precioPorHora)
    const capacidad = Number(form.capacidad)
    if (!form.nombre.trim() || !Number.isFinite(precio) || precio <= 0 || !Number.isInteger(capacidad) || capacidad <= 0) {
      setError('Completa los campos con valores válidos')
      return
    }
    if (!esSuperAdmin && form.complejoId === '' && (!editando || editando.complejoId)) {
      setError('Asignar un complejo es obligatorio: sin complejo tu cancha no aparece en búsquedas por lugar ni dueño.')
      return
    }
    setLoading(true)

    // complejoId: en creación '' = global; en edición solo se envía si cambió
    // ('' explícito = desasignar del complejo).
    const complejoIdInicial = editando?.complejoId ?? ''
    // imagen: la foto viaja por archivo; aquí solo se indica quitar ('' = limpiar).
    const quitarFoto = editando?.imagen != null && editando.imagen !== '' && preview === null && archivo === null
    const input: CanchaInput = {
      nombre: form.nombre.trim(),
      tipo: form.tipo as TipoCancha,
      descripcion: form.descripcion.trim(),
      precioPorHora: precio,
      capacidad,
      activa: form.activa,
      techada: form.techada,
      superficie: form.superficie || null,
      ...(quitarFoto ? { imagen: '' } : {}),
      ...(editando
        ? (form.complejoId !== complejoIdInicial ? { complejoId: form.complejoId } : {})
        : { complejoId: form.complejoId === '' ? null : form.complejoId }),
    }
    try {
      if (editando) {
        await Promise.all([
          updateCancha(editando.id, input),
          ...(archivo ? [subirImagen(editando.id, archivo)] : []),
        ])
      } else {
        const id = (await createCancha(input)).cancha.id
        if (archivo) await subirImagen(id, archivo)
      }
    } catch (error) {
      setLoading(false)
      setError(error instanceof Error ? error.message : 'No se pudo guardar la cancha')
      return
    }
    setLoading(false)
    setModalOpen(false)
    router.refresh()
  }

  async function subirImagen(id: string, file: File) {
    const datos = new FormData()
    datos.append('archivo', file)
    const res = await fetch(`/api/canchas/${id}/imagen`, {
      method: 'POST',
      credentials: 'include',
      body: datos,
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw new Error(body?.error ?? `No se pudo subir la imagen (error ${res.status})`)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta cancha? Esta acción no se puede deshacer.')) return
    try { await deleteCancha(id); router.refresh() }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo eliminar la cancha') }
  }

  async function toggleActiva(cancha: Cancha) {
    try { await updateCancha(cancha.id, { activa: !cancha.activa }); router.refresh() }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo actualizar la cancha') }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-basalto">Gestión de Canchas</h1>
          <p className="mt-1 text-sm text-pizarra">Crea, edita y administra las canchas</p>
        </div>
        <Button onClick={abrirCrear}>+ Nueva Cancha</Button>
      </div>

      <div className="card-tactil mb-6 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="a-q" className="mb-1 block font-display text-xs font-bold text-pizarra">Texto</label>
            <input
              id="a-q"
              value={fq}
              onChange={(e) => setFq(e.target.value)}
              placeholder="Nombre de cancha o local…"
              maxLength={50}
              className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 font-display text-sm font-bold text-basalto transition focus:border-cesped focus:shadow-dura-sm focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="a-distrito" className="mb-1 block font-display text-xs font-bold text-pizarra">Distrito</label>
            <select id="a-distrito" value={fdistrito} onChange={(e) => setFdistrito(e.target.value)} className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 font-display text-sm font-bold text-basalto transition focus:border-cesped focus:shadow-dura-sm focus:outline-none">
              <option value="">Todos</option>
              {distritos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-ciudad" className="mb-1 block font-display text-xs font-bold text-pizarra">Ciudad</label>
            <select id="a-ciudad" value={fciudad} onChange={(e) => setFciudad(e.target.value)} className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 font-display text-sm font-bold text-basalto transition focus:border-cesped focus:shadow-dura-sm focus:outline-none">
              <option value="">Todas</option>
              {ciudades.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-complejo" className="mb-1 block font-display text-xs font-bold text-pizarra">Local</label>
            <select id="a-complejo" value={fcomplejo} onChange={(e) => setFcomplejo(e.target.value)} className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 font-display text-sm font-bold text-basalto transition focus:border-cesped focus:shadow-dura-sm focus:outline-none">
              <option value="">Todos</option>
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-tipo" className="mb-1 block font-display text-xs font-bold text-pizarra">Deporte</label>
            <select id="a-tipo" value={ftipo} onChange={(e) => setFtipo(e.target.value)} className="w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 font-display text-sm font-bold text-basalto transition focus:border-cesped focus:shadow-dura-sm focus:outline-none">
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="font-display text-sm font-bold text-pizarra hover:text-basalto"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-pizarra">
          {hayFiltros
            ? `${filtradas.length} de ${canchas.length} canchas`
            : `${canchas.length} cancha${canchas.length === 1 ? '' : 's'} en total`}
        </p>
      </div>

      {filtradas.length === 0 && (
        <div className="py-16 text-center text-pizarra">
          <p className="mb-4 text-5xl">🏟️</p>
          <p className="font-display font-bold text-basalto">Sin canchas con esos filtros</p>
          <p className="mt-1 text-sm text-pizarra">Ajusta la búsqueda o crea una nueva cancha.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtradas.map((c) => (
          <div key={c.id} className="card-tactil overflow-hidden transition hover:-translate-y-0.5 hover:shadow-dura-lg">
            {c.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imagen} alt={c.nombre} className="h-36 w-full border-b-2 border-basalto object-cover" />
            ) : (
              <div className="flex h-36 items-center justify-center border-b-2 border-basalto bg-piedra text-5xl">
                {tipoEmoji[c.tipo] ?? '🏟️'}
              </div>
            )}
            <div className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-display font-bold text-basalto">{c.nombre}</h3>
                <Badge variant={c.activa ? 'green' : 'gray'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              {c.complejo ? (
                <p className="text-xs font-semibold text-pizarra">📍 {c.complejo.nombre}{c.complejo.distrito ? ` · ${c.complejo.distrito}` : ''}</p>
              ) : (
                <p className="text-xs text-pizarra">🌐 Global (sin complejo)</p>
              )}
              {!c.complejo && (
                <p className="mt-1 rounded-lg border border-alerta/40 bg-alerta-suave px-2.5 py-1 text-[0.6875rem] font-semibold text-alerta-hondo">
                  ⚠️ Sin complejo: invisible en filtros de lugar y dueño. Edítala y asígnale uno (obligatorio).
                </p>
              )}
              <p className="mb-3 text-sm text-pizarra">{c.descripcion}</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {c.techada && (
                  <span className="rounded-full border border-cal bg-piedra px-2.5 py-0.5 font-display text-[0.6875rem] font-bold text-basalto">Techada</span>
                )}
                {c.superficie && (
                  <span className="rounded-full border border-cal bg-piedra px-2.5 py-0.5 font-display text-[0.6875rem] font-bold text-basalto">{c.superficie}</span>
                )}
              </div>
              <div className="mb-4 flex justify-between text-sm text-pizarra">
                <span className="font-display font-medium">👥 {c.capacidad} personas</span>
                <span className="font-display font-bold text-cesped-hondo">S/ {c.precioPorHora}/hr</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => abrirEditar(c)}>
                  ✏️ Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActiva(c)}>
                  {c.activa ? '🔒' : '🔓'}
                </Button>
                {esSuperAdmin && (
                  <Button size="sm" variant="danger" onClick={() => eliminar(c.id)}>🗑️</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Cancha' : 'Nueva Cancha'}
        tono="claro"
      >
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <section aria-label="Datos básicos" className="space-y-3">
            <p className="font-display text-[0.6875rem] font-bold tracking-[0.12em] text-pizarra">DATOS BÁSICOS</p>
            <div>
              <label htmlFor="cancha-nombre" className={flabel}>Nombre *</label>
              <input
                id="cancha-nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={finput}
                placeholder="Cancha Fútbol 1"
                maxLength={80}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cancha-tipo" className={flabel}>Tipo *</label>
                <select
                  id="cancha-tipo"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className={fselect}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{tipoEmoji[t] ?? '🏟️'} {t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cancha-complejo" className={flabel}>Complejo {!esSuperAdmin && '*'}</label>
                <select
                  id="cancha-complejo"
                  value={form.complejoId}
                  onChange={(e) => setForm({ ...form, complejoId: e.target.value })}
                  className={fselect}
                >
                  <option value="">Sin complejo (global)</option>
                  {complejos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-pizarra">
              {esSuperAdmin
                ? 'Solo las canchas de complejos publicados con suscripción vigente aparecen en el buscador.'
                : 'Obligatorio: sin complejo tu cancha no aparece en búsquedas por lugar ni dueño.'}
            </p>

            <div>
              <label htmlFor="cancha-descripcion" className={flabel}>Descripción</label>
              <textarea
                id="cancha-descripcion"
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className={`${finput} resize-none`}
                placeholder="Descripción de la cancha..."
                maxLength={500}
              />
            </div>
          </section>

          <section aria-label="Foto" className="space-y-3">
            <p className="font-display text-[0.6875rem] font-bold tracking-[0.12em] text-pizarra">FOTO</p>
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Foto de la cancha"
                  className="h-44 w-full rounded-xl border-2 border-basalto object-cover"
                  style={{ maxHeight: 176 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    fijarPreview(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="btn-tactil absolute top-2 right-2 bg-basalto px-3 py-1.5 text-xs font-bold text-tiza hover:bg-basalto/90"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-basalto bg-piedra/50 px-4 py-8 text-center transition hover:bg-piedra"
              >
                <span className="text-3xl" aria-hidden>📷</span>
                <span className="font-display text-sm font-bold text-basalto">Subir foto desde mis archivos</span>
                <span className="text-xs text-pizarra">JPG, PNG, WEBP o GIF · máximo 3 MB</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              aria-label="Elegir foto de la cancha"
              onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
            />
            {preview && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="font-display text-xs font-bold text-cesped-hondo hover:underline"
              >
                Cambiar foto…
              </button>
            )}
          </section>

          <section aria-label="Características" className="space-y-3">
            <p className="font-display text-[0.6875rem] font-bold tracking-[0.12em] text-pizarra">CARACTERÍSTICAS</p>
            <div>
              <label htmlFor="cancha-superficie" className={flabel}>Superficie</label>
              <select
                id="cancha-superficie"
                value={form.superficie}
                onChange={(e) => setForm({ ...form, superficie: e.target.value })}
                className={fselect}
              >
                {SUPERFICIES.map((s) => (
                  <option key={s} value={s}>{s === '' ? '— Sin especificar —' : s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-6 rounded-xl border-2 border-basalto bg-piedra/50 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5 font-display text-sm font-bold text-basalto">
                <input
                  type="checkbox"
                  checked={form.techada}
                  onChange={(e) => setForm({ ...form, techada: e.target.checked })}
                  className="h-5 w-5 accent-cesped"
                />
                Techada
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 font-display text-sm font-bold text-basalto">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                  className="h-5 w-5 accent-cesped"
                />
                Activa
              </label>
            </div>
          </section>

          <section aria-label="Precio y capacidad" className="space-y-3">
            <p className="font-display text-[0.6875rem] font-bold tracking-[0.12em] text-pizarra">PRECIO Y CAPACIDAD</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cancha-precio" className={flabel}>Precio/hora (S/) *</label>
                <input
                  id="cancha-precio"
                  type="number"
                  min="1"
                  value={form.precioPorHora}
                  onChange={(e) => setForm({ ...form, precioPorHora: e.target.value })}
                  className={finput}
                  placeholder="50"
                />
              </div>
              <div>
                <label htmlFor="cancha-capacidad" className={flabel}>Capacidad *</label>
                <input
                  id="cancha-capacidad"
                  type="number"
                  min="1"
                  value={form.capacidad}
                  onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
                  className={finput}
                  placeholder="10"
                />
              </div>
            </div>
            <p className="text-xs text-pizarra">Para cobrar más de noche usa Precios especiales por franja.</p>
          </section>

          {error && <p role="alert" className="rounded-xl border border-error/40 bg-error-suave px-4 py-3 text-sm font-semibold text-error">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" loading={loading} onClick={guardar}>
              {editando ? 'Guardar cambios' : 'Crear cancha'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
