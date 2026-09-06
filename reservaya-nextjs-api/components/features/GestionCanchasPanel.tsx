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

// Estilos del formulario dentro del Modal oscuro (el Modal es bg-[#20263a]).
// Los <option> heredan fondo claro del SO: se fuerzan oscuros para que el
// desplegable sea legible.
const flabel = 'mb-1.5 block text-[13px] font-bold text-slate-300'
const finput =
  'w-full rounded-xl border border-[#303850] bg-[#151b2e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25'
const fselect = `${finput} sel-dark [color-scheme:dark] [&>option]:bg-[#151b2e] [&>option]:text-slate-100`

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
      const id = editando ? editando.id : (await createCancha(input)).cancha.id
      if (editando) await updateCancha(id, input)
      if (archivo) await subirImagen(id, archivo)
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Canchas</h1>
          <p className="text-gray-500 mt-1">Crea, edita y administra las canchas</p>
        </div>
        <Button onClick={abrirCrear}>+ Nueva Cancha</Button>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="a-q" className="mb-1 block text-xs font-bold text-gray-700">Texto</label>
            <input
              id="a-q"
              value={fq}
              onChange={(e) => setFq(e.target.value)}
              placeholder="Nombre de cancha o local…"
              maxLength={50}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25"
            />
          </div>
          <div>
            <label htmlFor="a-distrito" className="mb-1 block text-xs font-bold text-gray-700">Distrito</label>
            <select id="a-distrito" value={fdistrito} onChange={(e) => setFdistrito(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25">
              <option value="">Todos</option>
              {distritos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-ciudad" className="mb-1 block text-xs font-bold text-gray-700">Ciudad</label>
            <select id="a-ciudad" value={fciudad} onChange={(e) => setFciudad(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25">
              <option value="">Todas</option>
              {ciudades.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-complejo" className="mb-1 block text-xs font-bold text-gray-700">Local</label>
            <select id="a-complejo" value={fcomplejo} onChange={(e) => setFcomplejo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25">
              <option value="">Todos</option>
              {complejos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-tipo" className="mb-1 block text-xs font-bold text-gray-700">Deporte</label>
            <select id="a-tipo" value={ftipo} onChange={(e) => setFtipo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25">
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
              className="text-sm font-semibold text-gray-500 hover:text-gray-800"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          {hayFiltros
            ? `${filtradas.length} de ${canchas.length} canchas`
            : `${canchas.length} cancha${canchas.length === 1 ? '' : 's'} en total`}
        </p>
      </div>

      {filtradas.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🏟️</p>
          <p className="font-medium text-gray-600">Sin canchas con esos filtros</p>
          <p className="text-sm mt-1">Ajusta la búsqueda o crea una nueva cancha.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtradas.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
            {c.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imagen} alt={c.nombre} className="h-36 w-full object-cover" />
            ) : (
              <div className="bg-gradient-to-br from-[#0A3D22] via-[#14532D] to-[#060A08] p-5 text-center text-5xl">
                {tipoEmoji[c.tipo] ?? '🏟️'}
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{c.nombre}</h3>
                <Badge variant={c.activa ? 'green' : 'gray'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              {c.complejo ? (
                <p className="text-xs font-semibold text-gray-500">📍 {c.complejo.nombre}{c.complejo.distrito ? ` · ${c.complejo.distrito}` : ''}</p>
              ) : (
                <p className="text-xs text-gray-400">🌐 Global (sin complejo)</p>
              )}
              {!c.complejo && (
                <p className="mt-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  ⚠️ Sin complejo: invisible en filtros de lugar y dueño. Edítala y asígnale uno (obligatorio).
                </p>
              )}
              <p className="text-sm text-gray-500 mb-3">{c.descripcion}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {c.techada && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Techada</span>
                )}
                {c.superficie && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{c.superficie}</span>
                )}
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <span>👥 {c.capacidad} personas</span>
                <span className="font-semibold text-[#15803D]">S/ {c.precioPorHora}/hr</span>
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
      >
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <section aria-label="Datos básicos" className="space-y-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400">DATOS BÁSICOS</p>
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

            <div className="grid grid-cols-2 gap-3">
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
            <p className="text-xs text-slate-500">
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
            <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400">FOTO</p>
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Foto de la cancha"
                  className="h-44 w-full rounded-xl border border-[#303850] object-cover"
                  style={{ maxHeight: 176 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    fijarPreview(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-black/90"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#303850] bg-[#151b2e] px-4 py-8 text-center transition hover:border-[#22C55E]"
              >
                <span className="text-3xl" aria-hidden>📷</span>
                <span className="text-sm font-bold text-slate-200">Subir foto desde mis archivos</span>
                <span className="text-xs text-slate-500">JPG, PNG, WEBP o GIF · máximo 3 MB</span>
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
                className="text-xs font-bold text-[#4ADE80] hover:underline"
              >
                Cambiar foto…
              </button>
            )}
          </section>

          <section aria-label="Características" className="space-y-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400">CARACTERÍSTICAS</p>
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
            <div className="flex items-center gap-6 rounded-xl border border-[#303850] bg-[#151b2e] px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={form.techada}
                  onChange={(e) => setForm({ ...form, techada: e.target.checked })}
                  className="h-5 w-5 accent-[#22C55E]"
                />
                Techada
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                  className="h-5 w-5 accent-[#22C55E]"
                />
                Activa
              </label>
            </div>
          </section>

          <section aria-label="Precio y capacidad" className="space-y-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400">PRECIO Y CAPACIDAD</p>
            <div className="grid grid-cols-2 gap-3">
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
            <p className="text-xs text-slate-500">Para cobrar más de noche usa Precios especiales por franja.</p>
          </section>

          {error && <p role="alert" className="rounded-xl bg-rose-500/10 border border-rose-400/25 px-4 py-3 text-sm font-semibold text-rose-300">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1 border-[#303850] bg-transparent text-slate-200 hover:bg-white/5" onClick={() => setModalOpen(false)}>
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