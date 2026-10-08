'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api-types'
import { borrarResena, crearResena, miResena, resenasPublicas } from '@/lib/api-client'
import {
  ORDENES, estadoCalificar, loginHref, porcentaje, textoTotal, unirPaginas, urlResenas,
  type EstadoCalificar, type OrdenResenas, type PaginaResenas,
} from '@/lib/public/resenas'
import { BOTON } from '@/lib/public/estilos'
import { Estrellas, ResenaItem } from './ResenaItem'
import { FormResena } from './FormResena'

const ERROR_LISTA = 'No se pudieron cargar las reseñas.'

async function consultarMia(slug: string): Promise<EstadoCalificar> {
  try {
    return estadoCalificar({ status: 200, body: await miResena(slug) })
  } catch (e) {
    return estadoCalificar({ status: e instanceof ApiError ? e.status : 0 })
  }
}

export function ResenasCliente({ slug, complejoNombre, inicial }: { slug: string; complejoNombre: string; inicial: PaginaResenas | null }) {
  const [datos, setDatos] = useState<PaginaResenas | null>(inicial)
  const [orden, setOrden] = useState<OrdenResenas>('recientes')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(inicial ? '' : ERROR_LISTA)
  const [estado, setEstado] = useState<EstadoCalificar>({ tipo: 'cargando' })
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState('')

  const cargarPrimera = useCallback((o: OrdenResenas) => {
    setCargando(true)
    return resenasPublicas(urlResenas(slug, o))
      .then((p) => { setDatos(p); setError('') }, () => setError(ERROR_LISTA))
      .finally(() => setCargando(false))
  }, [slug])

  useEffect(() => {
    let vivo = true
    void consultarMia(slug).then((e) => {
      if (!vivo) return
      setEstado(e)
      // La primera página del servidor se cachea 60 s: si aún no incluye la reseña propia, se refresca.
      if (e.tipo === 'ya-califico' && !inicial?.resenas.some((r) => r.id === e.resena.id)) void cargarPrimera('recientes')
    })
    return () => { vivo = false }
  }, [slug, inicial, cargarPrimera])

  function ordenar(o: OrdenResenas) {
    setOrden(o)
    void cargarPrimera(o)
  }

  function verMas() {
    if (!datos?.siguiente) return
    setCargando(true)
    void resenasPublicas(urlResenas(slug, orden, datos.siguiente))
      .then((p) => { setDatos((d) => (d ? unirPaginas(d, p) : p)); setError('') }, () => setError(ERROR_LISTA))
      .finally(() => setCargando(false))
  }

  async function tras(mensaje: string) {
    setEditando(false)
    setConfirmando(false)
    setAviso(mensaje)
    setEstado(await consultarMia(slug))
    await cargarPrimera(orden)
  }

  async function guardar(complejoId: string, puntuacion: number, comentario: string) {
    await crearResena(complejoId, puntuacion, comentario || undefined)
    await tras('Tu reseña quedó publicada.')
  }

  async function eliminar(id: string) {
    try {
      await borrarResena(id)
      await tras('Eliminaste tu reseña.')
    } catch (e) {
      setConfirmando(false)
      setAviso(e instanceof Error ? e.message : 'No se pudo eliminar tu reseña.')
    }
  }

  const total = datos?.total ?? 0
  const propia = estado.tipo === 'ya-califico' ? estado.resena.id : null

  return (
    <section id="resenas" aria-labelledby="resenas-titulo" className="scroll-mt-24 rounded-surface border border-cal bg-tiza p-4 sm:p-6">
      <h2 id="resenas-titulo" className="text-xl font-semibold">Reseñas</h2>
      <div className="mt-5 grid gap-8 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-surface border border-cal bg-tiza p-5">
            <p className="font-display text-5xl font-bold tabular-nums text-basalto">{total ? datos!.promedio.toFixed(1) : '—'}</p>
            <Estrellas n={datos?.promedio ?? 0} tamano={18} className="mt-2" />
            <p className="mt-1 text-sm text-pizarra">{total ? textoTotal(total) : 'Aún no tiene reseñas'}</p>
            <ul className="mt-4 space-y-1.5" aria-label="Distribución de puntuaciones">
              {(['5', '4', '3', '2', '1'] as const).map((k) => {
                const n = datos?.distribucion[k] ?? 0
                return (
                  <li key={k} className="flex items-center gap-2 text-sm text-pizarra">
                    <span className="w-3 tabular-nums">{k}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-piedra" aria-hidden="true">
                      <span className="block h-full rounded-full bg-sol" style={{ width: `${porcentaje(n, total)}%` }} />
                    </span>
                    <span className="w-8 text-right tabular-nums">{n}</span>
                    <span className="sr-only">{`${n} con ${k} de 5`}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="min-h-[6.5rem] rounded-surface border border-cal bg-tiza p-5" aria-live="polite">
            {aviso && <p role="status" className="mb-3 text-sm font-semibold text-cesped-hondo">{aviso}</p>}
            {estado.tipo === 'cargando' && <p className="text-sm text-pizarra">Comprobando si puedes calificar…</p>}
            {estado.tipo === 'error' && <p className="text-sm text-pizarra">No pudimos comprobar si puedes calificar. Recarga la página para intentarlo de nuevo.</p>}
            {estado.tipo === 'sin-sesion' && <>
              <p className="text-sm text-pizarra">¿Jugaste aquí? Cuéntale a otros jugadores cómo te fue.</p>
              <a href={loginHref(slug)} className={`${BOTON.secundario} mt-3`}>Inicia sesión para calificar</a>
            </>}
            {estado.tipo === 'no-jugo' && <p className="text-sm text-pizarra">Podrás calificar después de jugar aquí.</p>}
            {estado.tipo === 'puede' && (editando
              ? <FormResena textoEnviar="Publicar reseña" onEnviar={(p, c) => guardar(estado.complejoId, p, c)} onCancelar={() => setEditando(false)} />
              : <>
                <p className="text-sm text-pizarra">Ya jugaste aquí. ¿Cómo te fue?</p>
                <button type="button" onClick={() => { setAviso(''); setEditando(true) }} className={`${BOTON.primario} mt-3`}>Escribir una reseña</button>
              </>)}
            {estado.tipo === 'ya-califico' && (editando
              ? <FormResena
                  puntuacionInicial={estado.resena.puntuacion}
                  comentarioInicial={estado.resena.comentario ?? ''}
                  textoEnviar="Guardar cambios"
                  onEnviar={(p, c) => guardar(estado.complejoId, p, c)}
                  onCancelar={() => setEditando(false)}
                />
              : <>
                <h3 className="mb-3 text-base font-semibold text-basalto">Tu reseña</h3>
                <ResenaItem resena={estado.resena} complejoNombre={complejoNombre} />
                {confirmando
                  ? <div className="mt-4" role="group" aria-label="Confirmar eliminación">
                    <p className="text-sm font-semibold text-basalto">¿Eliminar tu reseña? No se puede deshacer.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void eliminar(estado.resena.id)} className={BOTON.peligro}>Sí, eliminar</button>
                      <button type="button" onClick={() => setConfirmando(false)} className={BOTON.secundario}>Cancelar</button>
                    </div>
                  </div>
                  : <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setAviso(''); setEditando(true) }} className={BOTON.secundario}>Editar</button>
                    <button type="button" onClick={() => { setAviso(''); setConfirmando(true) }} className={BOTON.secundario}>Eliminar</button>
                  </div>}
              </>)}
          </div>
        </div>

        <div className="min-w-0">
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-pizarra">{textoTotal(total)}</p>
              <label className="flex items-center gap-2 text-sm text-pizarra">
                Ordenar
                <select
                  value={orden}
                  onChange={(e) => ordenar(e.target.value as OrdenResenas)}
                  className="min-h-11 rounded-full border border-borde bg-tiza px-4 text-sm text-basalto focus:border-cesped focus:outline-none"
                >
                  {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                </select>
              </label>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-4 text-pizarra">
              {error}{' '}
              <button type="button" onClick={() => void cargarPrimera(orden)} className={BOTON.texto}>Reintentar</button>
            </div>
          )}
          {datos && total === 0 && !error && <p className="mt-1 text-pizarra">Todavía nadie ha opinado sobre {complejoNombre}.</p>}
          {datos && datos.resenas.length > 0 && (
            <ul className={`mt-4 divide-y divide-cal ${cargando ? 'opacity-60' : ''}`} aria-busy={cargando}>
              {datos.resenas.map((r) => (
                <li key={r.id} className="py-5 first:pt-0">
                  <ResenaItem resena={r} complejoNombre={complejoNombre} etiqueta={r.id === propia ? 'Tu reseña' : undefined} />
                </li>
              ))}
            </ul>
          )}
          {datos?.siguiente && (
            <button type="button" onClick={verMas} disabled={cargando} className={`${BOTON.secundario} mt-2 w-full sm:w-auto`}>
              {cargando ? 'Cargando…' : 'Ver más reseñas'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
