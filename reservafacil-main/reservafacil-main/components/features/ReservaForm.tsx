'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { createReserva } from '@/lib/api-client'
import type { Cancha } from '@/lib/api'

// Horas ofertadas de 08:00 a 21:00 como minutos desde medianoche.
const HORAS = Array.from({ length: 14 }, (_, i) => {
  const hora = 8 + i
  return { value: hora * 60, label: `${String(hora).padStart(2, '0')}:00` }
})

export function ReservaForm({ cancha, onSuccess }: { cancha: Cancha; onSuccess: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({ fecha: '', horaInicio: 0, horaFin: 0, notas: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const horasDisponiblesFin = form.horaInicio
    ? HORAS.filter((h) => h.value > form.horaInicio)
    : []

  const calcularTotal = () => {
    if (!form.horaInicio || !form.horaFin) return 0
    const horas = (form.horaFin - form.horaInicio) / 60
    return horas * Number(cancha.precioPorHora)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.fecha || !form.horaInicio || !form.horaFin || form.horaFin <= form.horaInicio) {
      setError('Selecciona una fecha y un horario válido')
      return
    }
    setLoading(true)
    try {
      await createReserva({ ...form, canchaId: cancha.id })
    } catch (error) {
      setLoading(false)
      setError(error instanceof Error ? error.message : 'No se pudo crear la reserva')
      return
    }
    setLoading(false)
    onSuccess()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Fecha *</label>
        <input
          type="date"
          required
          min={new Date().toISOString().split('T')[0]}
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Hora inicio *</label>
          <select
            required
            value={form.horaInicio}
            onChange={(e) => setForm({ ...form, horaInicio: Number(e.target.value), horaFin: 0 })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value="">Seleccionar</option>
            {HORAS.slice(0, -1).map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Hora fin *</label>
          <select
            required
            value={form.horaFin}
            disabled={!form.horaInicio}
            onChange={(e) => setForm({ ...form, horaFin: Number(e.target.value) })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-50"
          >
            <option value="">Seleccionar</option>
            {horasDisponiblesFin.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Notas (opcional)</label>
        <textarea
          rows={2}
          value={form.notas}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
          placeholder="Alguna indicación especial..."
        />
      </div>

      {calcularTotal() > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm text-emerald-300">Total estimado:</span>
          <span className="font-bold text-emerald-300 text-lg">S/ {calcularTotal()}</span>
        </div>
      )}

      {error && <p className="text-rose-300 text-sm">{error}</p>}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Confirmar Reserva
      </Button>
    </form>
  )
}