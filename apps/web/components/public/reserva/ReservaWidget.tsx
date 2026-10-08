'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiRequest } from '@/lib/http'
import { ApiError } from '@/lib/api-types'
import { soles } from '@/lib/public/horario'
import { cambiarSeleccion, horaMinutos, resumenSeleccion, vueltaReserva, type Agenda } from '@/lib/public/reserva'
interface Cancha { id: string; nombre: string; precioPorHora: string }
interface Reglas { anticipacionMinMin: number; cancelacionMinMin: number; politica: string | null }
interface Inicial { cancha?: string; fecha?: string; inicio?: number; fin?: number }
export function ReservaWidget({ slug, canchas, dias, sesion, inicial, reglas }: { slug: string; canchas: Cancha[]; dias: string[]; sesion: boolean; inicial: Inicial; reglas: Reglas }) {
  const [cancha, setCancha] = useState(canchas.some(c => c.id === inicial.cancha) ? inicial.cancha! : canchas[0]?.id ?? '')
  const [fecha, setFecha] = useState(dias.includes(inicial.fecha ?? '') ? inicial.fecha! : dias[0])
  const [agenda, setAgenda] = useState<Agenda | null>(null)
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [reload, setReload] = useState(0)
  const [reserva, setReserva] = useState<{ codigo: string; estado: string; total: string } | null>(null)
  const [movil, setMovil] = useState(false)
  const restaurada = useRef(false)
  const cancelar = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!cancha) return
    const controller = new AbortController()
    apiRequest<Agenda>(`/api/canchas/${encodeURIComponent(cancha)}/agenda?fecha=${fecha}`, { signal: controller.signal })
      .then(datos => {
        if (controller.signal.aborted) return
        setAgenda(datos); setCargando(false)
        if (!restaurada.current) {
          restaurada.current = true
          const puntos = datos.franjas.filter(f => inicial.inicio !== undefined && inicial.fin !== undefined && f.inicio >= inicial.inicio && f.fin <= inicial.fin).map(f => f.inicio)
          if (cancha === inicial.cancha && fecha === inicial.fecha && inicial.inicio !== undefined && inicial.fin !== undefined) {
            if (resumenSeleccion(datos.franjas, puntos)) { setSeleccion(puntos); if (window.matchMedia('(max-width: 1023px)').matches) setMovil(true) }
            else setError('La selección anterior ya no está disponible. Elige otro horario.')
          }
        }
      }).catch(e => { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'No se pudo cargar la agenda.'); setCargando(false) } })
    return () => controller.abort()
  }, [cancha, fecha, reload, inicial])
  useEffect(() => () => cancelar.current?.abort(), [])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const cerrar = () => { if (media.matches) setMovil(false) }
    media.addEventListener('change', cerrar)
    return () => media.removeEventListener('change', cerrar)
  }, [])
  const anticipacion = agenda?.anticipacionMinMin ?? reglas.anticipacionMinMin
  const cancelacion = agenda?.cancelacionMinMin ?? reglas.cancelacionMinMin
  const politica = agenda?.politica ?? reglas.politica
  const resumen = agenda && resumenSeleccion(agenda.franjas, seleccion)
  const precio = canchas.length ? Math.min(...canchas.map(c => Number(c.precioPorHora))) : 0
  function reiniciar(id: string, dia: string) { setCancha(id); setFecha(dia); setSeleccion([]); setAgenda(null); setCargando(true); setError(''); setReserva(null) }
  function elegir(inicio: number) { if (!agenda) return; setReserva(null); const siguiente = cambiarSeleccion(agenda.franjas, seleccion, inicio); setSeleccion(siguiente.seleccion); setError(siguiente.error) }
  async function reservar() {
    if (!resumen || !agenda || guardando) return
    if (!sesion) { window.location.assign(`/login?returnUrl=${encodeURIComponent(vueltaReserva(slug, cancha, fecha, resumen.inicio, resumen.fin))}`); return }
    setGuardando(true); setError('')
    const controller = new AbortController(); cancelar.current = controller
    try {
      const data = await apiRequest<{ reserva: { codigo: string; estado: string; total: string } }>('/api/reservas', { method: 'POST', body: JSON.stringify({ canchaId: cancha, fecha, horaInicio: resumen.inicio, horaFin: resumen.fin }), signal: controller.signal })
      if (!controller.signal.aborted) { setReserva(data.reserva); setSeleccion([]) }
    } catch (e) {
      if (controller.signal.aborted) return
      if (e instanceof ApiError && e.status === 401) { window.location.assign(`/login?returnUrl=${encodeURIComponent(vueltaReserva(slug, cancha, fecha, resumen.inicio, resumen.fin))}`); return }
      setError(e instanceof Error ? e.message : 'No se pudo registrar la reserva.')
      if (e instanceof ApiError && e.status === 409) { setSeleccion([]); setAgenda(null); setCargando(true); setReload(n => n + 1) }
    } finally { if (!controller.signal.aborted) setGuardando(false) }
  }
  const tarjeta = <div className="min-w-0 space-y-4">
    {canchas.length > 1 && <label className="block text-sm">Cancha<select value={cancha} disabled={guardando} onChange={e => reiniciar(e.target.value, fecha)} className="mt-1 min-h-11 w-full rounded-control border border-borde bg-tiza px-3 text-basalto">{canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>}
    <p className="text-sm text-pizarra">Día</p>
    <div className="flex gap-1 overflow-x-auto pb-2" aria-label="Elegir día">{dias.map((dia, n) => <button key={dia} type="button" disabled={guardando} aria-pressed={fecha === dia} onClick={() => reiniciar(cancha, dia)} className={`min-h-16 min-w-14 shrink-0 rounded-control border px-2 text-sm ${fecha === dia ? 'border-cesped bg-cesped-suave text-basalto' : 'border-cal text-pizarra'}`}><span className="block text-xs">{n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : new Date(`${dia}T00:00:00Z`).toLocaleDateString('es-PE', { timeZone: 'UTC', weekday: 'short' })}</span><span className="block font-display text-lg">{dia.slice(8)}</span></button>)}</div>
    <p className="text-sm text-pizarra">Elige franjas seguidas de 30 min (entre 1 y 3 horas).</p>
    {anticipacion > 0 && <p className="text-sm text-alerta-hondo">Se reserva con al menos {Number((anticipacion / 60).toFixed(2))} h de anticipación.</p>}
    {cancelacion > 0 && <p className="text-sm text-pizarra">Solo puedes cancelar hasta {Number((cancelacion / 60).toFixed(2))} h antes; contacta al complejo.</p>}
    {politica && <p className="break-words text-sm text-pizarra">{politica}</p>}
    <div className="h-96 overflow-y-auto overscroll-contain" aria-busy={cargando}>
      {cargando ? <div className="grid grid-cols-3 gap-2" aria-label="Cargando agenda">{Array.from({ length: 12 }, (_, n) => <div key={n} className="esqueleto min-h-20 rounded-control" />)}</div> : agenda?.franjas.length ? <div className="grid grid-cols-3 gap-2">{agenda.franjas.map(f => {
        const elegida = seleccion.includes(f.inicio)
        return <button key={f.inicio} type="button" disabled={guardando || f.estado !== 'LIBRE'} aria-pressed={elegida} aria-label={`${horaMinutos(f.inicio)} a ${horaMinutos(f.fin)}, ${soles(f.precio)}, ${elegida ? 'Elegido' : f.estado === 'LIBRE' ? 'Libre' : f.estado === 'OCUPADA' ? 'Ocupado' : 'No disponible'}`} onClick={() => elegir(f.inicio)} className={`flex min-h-20 min-w-11 flex-col items-center justify-center rounded-control border px-1 py-2 text-sm ${elegida ? 'border-cesped bg-cesped-suave font-semibold' : f.estado === 'LIBRE' ? 'border-cal hover:border-cesped' : 'border-cal bg-piedra text-pizarra opacity-60'}`}><span>{horaMinutos(f.inicio)}</span><span className="text-xs">–{horaMinutos(f.fin)}</span><span className="text-xs">{f.estado === 'LIBRE' ? soles(f.precio) : f.estado === 'OCUPADA' ? 'Ocupado' : f.estado === 'ANTICIPACION' ? 'Muy pronto' : 'Pasada'}</span></button>
      })}</div> : <p className="text-pizarra">{agenda ? 'No hay horarios de atención este día.' : 'No se pudo cargar la agenda.'}</p>}
    </div>
    <p className="text-xs text-pizarra">Ocupado · Libre · Elegido · No disponible</p>
    {seleccion.length > 0 && <Button apariencia="publica" variante="secundario" disabled={guardando} onClick={() => { setSeleccion([]); setError('') }}>Limpiar selección</Button>}
    {resumen && <p className="font-semibold">{horaMinutos(resumen.inicio)}–{horaMinutos(resumen.fin)} · Total {soles(resumen.total)}</p>}
    {error && <p role="alert" className="text-error-hondo">{error}</p>}
    {reserva && <div role="status" className="rounded-control border border-cesped p-3"><p className="font-semibold">Reserva {reserva.codigo}</p><p>Estado: {reserva.estado} · {soles(reserva.total)}</p></div>}
    <Button apariencia="publica" className="w-full" disabled={!resumen || guardando} loading={guardando} onClick={() => void reservar()}>{sesion ? 'Reservar' : 'Iniciar sesión y reservar'}</Button>
    {!resumen && <p className="text-sm text-pizarra">Selecciona al menos 2 franjas seguidas.</p>}
  </div>
  if (!canchas.length) return <p>No hay canchas activas.</p>
  return <>
    <div className="hidden lg:block">{tarjeta}</div>
    <div className="lg:hidden"><Button apariencia="publica" onClick={() => setMovil(true)}>Elegir horario</Button></div>
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-cal bg-tiza px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden"><p className="min-w-0 font-semibold">{resumen ? soles(resumen.total) : `desde ${soles(precio)}`}<span className="block text-xs text-pizarra">{resumen ? 'Total seleccionado' : 'por 60 min'}</span></p><Button apariencia="publica" onClick={() => setMovil(true)}>Reservar</Button></div>
    <Modal open={movil} onClose={() => setMovil(false)} title="Reservar horario" tono="claro" className="fixed inset-x-0 bottom-0 mx-auto max-h-[90svh] max-w-lg rounded-b-none lg:hidden">{tarjeta}</Modal>
  </>
}
