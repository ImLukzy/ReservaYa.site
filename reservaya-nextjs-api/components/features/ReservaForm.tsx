'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { createReserva } from '@/lib/api-client'
import type { Cancha } from '@/lib/api'

// Horas ofertadas de 08:00 a 21:00 como minutos desde medianoche.
const HORAS = Array.from({ length: 14 }, (_, i) => {
  const hora = 8 + i
  return { value: hora * 60, label: `${String(hora).padStart(2, '0')}:00` }
})

// Estilos de formulario adaptados a la superficie oscura del Modal (bg-[#20263a]).
const flabel = 'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5'
const finput =
  'w-full rounded-xl border border-[#303850] bg-[#151b2e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25'
const fselect = `${finput} sel-dark [color-scheme:dark] [&>option]:bg-[#151b2e] [&>option]:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed`

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
      <div>
        <label className={flabel}>
          Fecha *
        </label>
        <input
          type="date"
          required
          min={new Date().toISOString().split('T')[0]}
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          className={finput}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={flabel}>
            Hora inicio *
          </label>
          <select
            required
            value={form.horaInicio}
            onChange={(e) => setForm({ ...form, horaInicio: Number(e.target.value), horaFin: 0 })}
            className={fselect}
          >
            <option value="">Seleccionar</option>
            {HORAS.slice(0, -1).map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={flabel}>
            Hora fin *
          </label>
          <select
            required
            value={form.horaFin}
            disabled={!form.horaInicio}
            onChange={(e) => setForm({ ...form, horaFin: Number(e.target.value) })}
            className={fselect}
          >
            <option value="">Seleccionar</option>
            {horasDisponiblesFin.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
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
        <div className="rounded-xl border border-cesped/30 bg-[#162720] p-4 text-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-emerald-300">Total estimado:</span>
            <span className="font-display text-2xl font-bold tabular-nums text-cesped">
              S/ {(cotizado ?? { total: String(calcularTotal()) }).total}
              {cotizando ? '…' : ''}
            </span>
          </div>
          {cotizado?.regla && (
            <p className="mt-1 text-xs font-semibold text-emerald-400">🌙 Tarifa aplicada: {cotizado.regla}</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-error/40 bg-error/15 px-3.5 py-2.5 text-sm font-semibold text-red-200">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} variant="primary" className="w-full text-base font-bold" size="lg">
        Confirmar Reserva
      </Button>
    </form>
  )
}