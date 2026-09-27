import Link from 'next/link'
import * as api from '@/lib/api'
import { CanchaCard } from '@/components/features/CanchaCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchX } from 'lucide-react'
import type { ResultadoBusqueda } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Horas ofertadas de 08:00 a 21:00 como minutos desde medianoche.
const HORAS = Array.from({ length: 14 }, (_, i) => {
  const hora = 8 + i
  return { value: hora * 60, label: `${String(hora).padStart(2, '0')}:00` }
})

const TIPOS = ['FUTBOL', 'FUTBOL5', 'FUTBOL7', 'PADEL', 'TENIS', 'BASQUET', 'VOLLEYBALL', 'LOZA']

interface Params {
  q?: string
  distrito?: string
  ciudad?: string
  duenoId?: string
  complejoId?: string
  tipo?: string
  fecha?: string
  horaInicio?: string
  horaFin?: string
}

function tieneBusqueda(p: Params): boolean {
  return Boolean(p.q || p.distrito || p.ciudad || p.duenoId || p.complejoId || p.tipo)
}

export default async function CanchasPage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const p = await searchParams
  const opciones = await api.getOpcionesBusqueda().catch(() => ({
    distritos: [],
    ciudades: ['Arequipa'],
    duenos: [],
    complejos: [],
    sugerencias: [],
  }))

  let resultado: ResultadoBusqueda = { canchas: [], total: 0, limiteAplicado: false }
  let error: string | null = null
  const buscando = tieneBusqueda(p)
  try {
    resultado = await api.getDisponibles({
      q: p.q || undefined,
      distrito: p.distrito || undefined,
      ciudad: p.ciudad || undefined,
      duenoId: p.duenoId || undefined,
      complejoId: p.complejoId || undefined,
      tipo: p.tipo || undefined,
      fecha: p.fecha || undefined,
      horaInicio: p.horaInicio ? Number(p.horaInicio) : undefined,
      horaFin: p.horaFin ? Number(p.horaFin) : undefined,
    })
  } catch (e) {
    error = e instanceof Error ? e.message : 'No se pudo buscar'
  }
  const resultados = resultado.canchas

  const conHorario = Boolean(p.fecha && p.horaInicio && p.horaFin)
  const inputCls =
    'w-full rounded-md border border-cal bg-tiza px-3 py-2 text-sm text-basalto placeholder:text-niebla focus:border-cesped focus:outline-none focus:ring-1 focus:ring-cesped'
  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-pizarra'

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 border-b border-cal pb-4">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-cesped-hondo">Vitrina de canchas</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-basalto">Buscar canchas</h1>
        <p className="mt-1 text-sm text-pizarra">
          Filtra por local, dueño o lugar y revisa disponibilidad por fecha y hora.
        </p>
      </div>

      <form
        method="get"
        action="/dashboard/canchas"
        className="mb-8 rounded-xl border border-cal bg-tiza p-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="f-q" className={labelCls}>Texto de búsqueda</label>
            <input
              id="f-q"
              name="q"
              defaultValue={p.q ?? ''}
              placeholder="Nombre de cancha o sede…"
              maxLength={50}
              autoComplete="off"
              list="sugerencias-canchas"
              className={inputCls}
            />
            <datalist id="sugerencias-canchas">
              {opciones.sugerencias.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="f-distrito" className={labelCls}>Distrito</label>
            <select id="f-distrito" name="distrito" defaultValue={p.distrito ?? ''} className={inputCls}>
              <option value="">Todos los distritos</option>
              {opciones.distritos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-ciudad" className={labelCls}>Ciudad</label>
            <select id="f-ciudad" name="ciudad" defaultValue={p.ciudad ?? 'Arequipa'} className={inputCls}>
              {opciones.ciudades.length === 0 ? (
                <option value="Arequipa">Arequipa</option>
              ) : (
                opciones.ciudades.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label htmlFor="f-dueno" className={labelCls}>Dueño</label>
            <select id="f-dueno" name="duenoId" defaultValue={p.duenoId ?? ''} className={inputCls}>
              <option value="">Todos los dueños</option>
              {opciones.duenos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-complejo" className={labelCls}>Complejo / Sede</label>
            <select id="f-complejo" name="complejoId" defaultValue={p.complejoId ?? ''} className={inputCls}>
              <option value="">Todos los locales</option>
              {opciones.complejos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre} · {d.distrito}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-tipo" className={labelCls}>Deporte</label>
            <select id="f-tipo" name="tipo" defaultValue={p.tipo ?? ''} className={inputCls}>
              <option value="">Todos los deportes</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <details className="mt-4 rounded-lg border border-cal bg-piedra/40 px-4 py-3" open={conHorario}>
          <summary className="cursor-pointer font-display text-sm font-semibold text-basalto">
            📅 Horario y fecha de juego (opcional, calcula cotización en tiempo real)
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="f-fecha" className={labelCls}>Fecha</label>
              <input
                id="f-fecha"
                name="fecha"
                type="date"
                defaultValue={p.fecha ?? ''}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="f-hi" className={labelCls}>Hora desde</label>
              <select id="f-hi" name="horaInicio" defaultValue={p.horaInicio ?? ''} className={inputCls}>
                <option value="">Cualquiera</option>
                {HORAS.slice(0, -1).map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-hf" className={labelCls}>Hora hasta</label>
              <select id="f-hf" name="horaFin" defaultValue={p.horaFin ?? ''} className={inputCls}>
                <option value="">Cualquiera</option>
                {HORAS.slice(1).map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>
        </details>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-cesped px-6 py-2.5 font-display text-sm font-bold text-grafito transition hover:bg-cesped-hover"
          >
            Buscar canchas
          </button>
          <Link
            href="/dashboard/canchas"
            className="rounded-md border border-borde bg-tiza px-4 py-2.5 font-display text-sm font-semibold text-basalto transition hover:bg-piedra"
          >
            Limpiar filtros
          </Link>
          <p className="w-full text-xs text-pizarra mt-1">
            Solo verás locales publicados con suscripción vigente. La fecha y hora son opcionales, pero con ellas ves disponibilidad y precio final (incluye tarifa nocturna).
          </p>
        </div>
      </form>

      {error && (
        <div role="alert" className="mb-6 rounded-md border border-error/30 bg-error-suave px-4 py-3 text-sm font-semibold text-error">
          {error}
        </div>
      )}

      {!buscando && !error && resultados.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="Aún no hay canchas disponibles"
          description="Vuelve pronto: los locales aparecen en esta vitrina conforme abren sus horarios."
        />
      )}

      {buscando && !error && resultados.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="Sin resultados para tu búsqueda"
          description="Prueba seleccionando otro distrito, deporte o ampliando el rango de horario."
          action={
            <Link
              href="/dashboard/canchas"
              className="inline-flex items-center justify-center rounded-md border border-borde bg-tiza px-4 py-2 font-display text-sm font-semibold text-basalto transition hover:bg-piedra"
            >
              Restablecer filtros
            </Link>
          }
        />
      )}

      {!error && resultados.length > 0 && (
        <>
          <p className="mb-4 font-display tabular-nums text-xs font-semibold uppercase tracking-wider text-pizarra">
            {resultado.limiteAplicado
              ? `Mostrando ${resultados.length} de ${resultado.total} canchas disponibles: usa los filtros para acotar`
              : `${resultado.total} cancha${resultado.total === 1 ? '' : 's'} encontrada${resultado.total === 1 ? '' : 's'}`}
            {conHorario ? ' · cotización calculada' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resultados.map((r) => (
              <CanchaCard
                key={r.cancha.id}
                cancha={r.cancha}
                disponible={r.disponible}
                motivo={r.motivo}
                fecha={p.fecha}
                horaInicio={p.horaInicio ? Number(p.horaInicio) : undefined}
                horaFin={p.horaFin ? Number(p.horaFin) : undefined}
                totalEstimado={r.totalEstimado}
                reglaPrecio={r.reglaPrecio}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
