import * as api from '@/lib/api'
import { CanchaCard } from '@/components/features/CanchaCard'
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
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25'
  const labelCls = 'mb-1 block text-xs font-bold text-gray-700'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buscar canchas</h1>
        <p className="text-gray-500 mt-1">
          Filtra por local, dueño o lugar y revisa disponibilidad por fecha y hora
        </p>
      </div>

      <form
        method="get"
        action="/dashboard/canchas"
        className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="f-q" className={labelCls}>Texto</label>
            <input
              id="f-q"
              name="q"
              defaultValue={p.q ?? ''}
              placeholder="Escribe y elige una sugerencia…"
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
              <option value="">Todos</option>
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
            <p className="mt-1 text-[11px] text-gray-400">Operamos en Arequipa 🌱</p>
          </div>
          <div>
            <label htmlFor="f-dueno" className={labelCls}>Dueño</label>
            <select id="f-dueno" name="duenoId" defaultValue={p.duenoId ?? ''} className={inputCls}>
              <option value="">Todos</option>
              {opciones.duenos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
            {opciones.duenos.length === 0 && (
              <p className="mt-1 text-[11px] text-gray-400">Aún nos estamos expandiendo 🌱</p>
            )}
          </div>
          <div>
            <label htmlFor="f-complejo" className={labelCls}>Local</label>
            <select id="f-complejo" name="complejoId" defaultValue={p.complejoId ?? ''} className={inputCls}>
              <option value="">Todos</option>
              {opciones.complejos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre} · {d.distrito}</option>
              ))}
            </select>
            {opciones.complejos.length === 0 && (
              <p className="mt-1 text-[11px] text-gray-400">Aún nos estamos expandiendo 🌱</p>
            )}
          </div>
          <div>
            <label htmlFor="f-tipo" className={labelCls}>Deporte</label>
            <select id="f-tipo" name="tipo" defaultValue={p.tipo ?? ''} className={inputCls}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <details className="mt-3 rounded-xl bg-gray-50 px-4 py-3" open={conHorario}>
          <summary className="cursor-pointer text-sm font-bold text-gray-700">
            📅 Fecha y hora (opcional, para ver disponibilidad y precio final)
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              <label htmlFor="f-hi" className={labelCls}>Desde</label>
              <select id="f-hi" name="horaInicio" defaultValue={p.horaInicio ?? ''} className={inputCls}>
                <option value="">—</option>
                {HORAS.slice(0, -1).map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-hf" className={labelCls}>Hasta</label>
              <select id="f-hf" name="horaFin" defaultValue={p.horaFin ?? ''} className={inputCls}>
                <option value="">—</option>
                {HORAS.slice(1).map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>
        </details>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#16A34A]"
          >
            🔍 Buscar canchas
          </button>
          <a href="/dashboard/canchas" className="text-sm font-semibold text-gray-500 hover:text-gray-800">
            Limpiar
          </a>
          <p className="w-full text-xs text-gray-400">
            Solo verás locales publicados con suscripción vigente. La fecha y hora son opcionales, pero con ellas ves disponibilidad y precio final (incluye tarifa nocturna).
          </p>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {!buscando && !error && resultados.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🏟️</p>
          <p className="font-medium text-gray-600">Aún no hay canchas publicadas</p>
          <p className="text-sm mt-1">Vuelve pronto: los locales aparecen aquí al publicar.</p>
        </div>
      )}

      {buscando && !error && resultados.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🏟️</p>
          <p className="font-medium text-gray-600">Sin resultados con esos filtros</p>
          <p className="text-sm mt-1">Prueba con otro distrito, fecha u horario.</p>
        </div>
      )}

      {!error && resultados.length > 0 && (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {resultado.limiteAplicado
              ? `Mostrando ${resultados.length} de ${resultado.total} canchas disponibles: usa los filtros para ver más`
              : `${resultado.total} cancha${resultado.total === 1 ? '' : 's'} encontrada${resultado.total === 1 ? '' : 's'}`}
            {conHorario ? ' · precios con tarifa aplicada' : ''}
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
