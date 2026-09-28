'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createReserva } from '@/lib/api-client'
import type { Cancha } from '@/lib/api'

// Horas ofertadas de 08:00 a 21:00 como minutos desde medianoche.
const HORAS = Array.from({ length: 14 }, (_, i) => {
  const hora = 8 + i
  return { value: hora * 60, label: `${String(hora).padStart(2, '0')}:00` }
})

// Textarea de notas: misma superficie clara del Modal (tono="claro", spec 24); Input/Select
// compartidos con la landing viven en components/ui (spec 26).
const flabel = 'block text-xs font-semibold text-pizarra mb-1.5'
const finput =
  'w-full rounded-xl border border-cal bg-tiza px-4 py-2.5 text-sm text-basalto placeholder:text-niebla focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25'

export function ReservaForm({
  cancha,
  onSuccess,
  fechaInicial = '',
  horaInicioInicial = 0,
  horaFinInicial = 0,
  totalInicial = null,
  reglaInicial = null,
}: {
  cancha: Cancha
  onSuccess: () => void
  fechaInicial?: string
  horaInicioInicial?: number
  horaFinInicial?: number
  totalInicial?: string | null
  reglaInicial?: string | null
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    fecha: fechaInicial,
    horaInicio: horaInicioInicial,
    horaFin: horaFinInicial,
    notas: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Cotización del backend ligada a los datos con que se pidió: si cambian, se muestra la base.
  const [cotizacion, setCotizacion] = useState<{ clave: string; total: string; regla: string | null } | null>(null)
  const [intentada, setIntentada] = useState<string | null>(null)

  const horasDisponiblesFin = form.horaInicio
    ? HORAS.filter((h) => h.value > form.horaInicio)
    : []

  const completo = Boolean(form.fecha && form.horaInicio && form.horaFin && form.horaFin > form.horaInicio)
  const clave = `${cancha.id}|${form.fecha}|${form.horaInicio}|${form.horaFin}`
  const base = totalInicial ? { total: totalInicial, regla: reglaInicial } : null
  const cotizado = completo && cotizacion?.clave === clave ? cotizacion : base
  const cotizando = completo && intentada !== clave

  const calcularTotal = () => {
    if (!form.horaInicio || !form.horaFin) return 0
    const horas = (form.horaFin - form.horaInicio) / 60
    return horas * Number(cancha.precioPorHora)
  }

  // Cotización real del backend (aplica tarifa nocturna/feriados). El total
  // final siempre lo calcula el servidor al crear la reserva.
  useEffect(() => {
    if (!completo) return
    let vivo = true
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/canchas/${cancha.id}/cotizar?fecha=${form.fecha}&horaInicio=${form.horaInicio}&horaFin=${form.horaFin}`,
          { credentials: 'include' }
        )
        const body = await res.json().catch(() => null)
        if (vivo && res.ok && body?.total) setCotizacion({ clave, total: String(body.total), regla: body.regla ?? null })
      } catch {
        // Se mantiene la estimación base.
      } finally {
        if (vivo) setIntentada(clave)
      }
    }, 350)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [completo, clave, cancha.id, form.fecha, form.horaInicio, form.horaFin])

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
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva')
      return
    }
    setLoading(false)
    onSuccess()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="reserva-fecha"
        type="date"
        required
        min={new Date().toISOString().split('T')[0]}
        value={form.fecha}
        onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        etiqueta="Fecha *"
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          id="reserva-hora-inicio"
          required
          value={form.horaInicio}
          onChange={(e) => setForm({ ...form, horaInicio: Number(e.target.value), horaFin: 0 })}
          etiqueta="Hora inicio *"
        >
          <option value="">Seleccionar</option>
          {HORAS.slice(0, -1).map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </Select>
        <Select
          id="reserva-hora-fin"
          required
          value={form.horaFin}
          disabled={!form.horaInicio}
          onChange={(e) => setForm({ ...form, horaFin: Number(e.target.value) })}
          etiqueta="Hora fin *"
        >
          <option value="">Seleccionar</option>
          {horasDisponiblesFin.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className={flabel}>
          Notas (opcional)
        </label>
        <textarea
          rows={2}
          value={form.notas}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
          className={`${finput} resize-none`}
          placeholder="Alguna indicación especial para el complejo..."
        />
      </div>

      {(cotizado ?? (calcularTotal() > 0 ? { total: String(calcularTotal()), regla: null } : null)) && (
        <div className="rounded-xl border border-cesped/30 bg-cesped-suave p-4 text-cesped-hondo">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Total estimado:</span>
            <span className="font-display text-2xl font-bold tabular-nums">
              S/ {(cotizado ?? { total: String(calcularTotal()) }).total}
              {cotizando ? '…' : ''}
            </span>
          </div>
          {cotizado?.regla && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold">
              <Moon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              Tarifa aplicada: {cotizado.regla}
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-error/30 bg-error-suave px-3.5 py-2.5 text-sm font-semibold text-error">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} variant="primary" className="w-full text-base font-bold" size="lg">
        Confirmar Reserva
      </Button>
    </form>
  )
}