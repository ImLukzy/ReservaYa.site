'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { createCancha, deleteCancha, updateCancha } from '@/lib/api-client'
import type { Cancha, CanchaInput, TipoCancha } from '@/lib/api'

const tipoEmoji: Record<string, string> = {
  FUTBOL: '⚽', TENIS: '🎾', BASQUET: '🏀', VOLLEYBALL: '🏐',
}

const TIPOS = ['FUTBOL', 'TENIS', 'BASQUET', 'VOLLEYBALL']

const formVacio = {
  nombre: '', tipo: 'FUTBOL', descripcion: '',
  precioPorHora: '', capacidad: '', activa: true,
}

export function GestionCanchasPanel({ canchas, esSuperAdmin = false }: { canchas: Cancha[]; esSuperAdmin?: boolean }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cancha | null>(null)
  const [form, setForm] = useState(formVacio)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function abrirCrear() {
    setEditando(null)
    setForm(formVacio)
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
    })
    setError('')
    setModalOpen(true)
  }

  async function guardar() {
    setError('')
    const precio = Number(form.precioPorHora)
    const capacidad = Number(form.capacidad)
    if (!form.nombre.trim() || !Number.isFinite(precio) || precio <= 0 || !Number.isInteger(capacidad) || capacidad <= 0) {
      setError('Completa los campos con valores válidos')
      return
    }
    setLoading(true)

    const input: CanchaInput = {
      ...form,
      tipo: form.tipo as TipoCancha,
      precioPorHora: precio,
      capacidad,
    }
    try {
      if (editando) await updateCancha(editando.id, input)
      else await createCancha(input)
    } catch (error) {
      setLoading(false)
      setError(error instanceof Error ? error.message : 'No se pudo guardar la cancha')
      return
    }
    setLoading(false)
    setModalOpen(false)
    router.refresh()
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {canchas.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-[#5964d8] p-5 text-center text-5xl">
              {tipoEmoji[c.tipo]}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{c.nombre}</h3>
                <Badge variant={c.activa ? 'green' : 'gray'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">{c.descripcion}</p>
              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <span>👥 {c.capacidad} personas</span>
                <span className="font-semibold text-indigo-300">S/ {c.precioPorHora}/hr</span>
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              placeholder="Cancha Fútbol 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>{tipoEmoji[t]} {t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
              placeholder="Descripción de la cancha..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio/hora (S/) *</label>
              <input
                type="number"
                min="1"
                value={form.precioPorHora}
                onChange={(e) => setForm({ ...form, precioPorHora: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad *</label>
              <input
                type="number"
                min="1"
                value={form.capacidad}
                onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="10"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
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