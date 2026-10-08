'use client'
import { useEffect, useRef, useState } from 'react'
import { puntoEnArequipa, type Punto } from '@reservaya/shared'
import { MapaUbicacion } from './MapaUbicacion'
import { Button } from '@/components/ui/Button'
import { apiRequest } from '@/lib/http'
import { inputCls } from '@/lib/b2b-theme'
interface Lugar extends Punto { nombre: string; distrito: string | null }
export function UbicacionEditor({ punto, direccion, onChange, onDistrito }: { punto: Punto | null; direccion: string; onChange: (p: Punto | null) => void; onDistrito: (d: string) => void }) {
  const [busqueda, setBusqueda] = useState(direccion)
  const [lugares, setLugares] = useState<Lugar[]>([])
  const [distrito, setDistrito] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [buscando, setBuscando] = useState(false)
  const consulta = useRef(0)
  const cancelacion = useRef<AbortController | null>(null)
  useEffect(() => () => { consulta.current++; cancelacion.current?.abort() }, [])
  async function consultaLugares(params: URLSearchParams, secuencia: number) {
    cancelacion.current?.abort()
    const controller = new AbortController(); cancelacion.current = controller
    try { const data = await apiRequest<{ lugares: Lugar[] }>(`/api/ubicacion?${params}`, { signal: controller.signal }); return consulta.current === secuencia ? data.lugares : [] }
    catch (e) { if (!controller.signal.aborted && consulta.current === secuencia) setError(e instanceof Error ? e.message : 'No se pudo consultar la dirección.'); return [] }
  }
  async function elegir(p: Punto, sugerido?: string | null) {
    setError(''); setDistrito(null)
    if (!puntoEnArequipa(p.latitud, p.longitud)) { setError('El punto debe estar dentro del área de Arequipa.'); return }
    onChange(p)
    const secuencia = ++consulta.current
    if (sugerido) { setDistrito(sugerido); return }
    const resultados = await consultaLugares(new URLSearchParams({ latitud: String(p.latitud), longitud: String(p.longitud) }), secuencia)
    if (consulta.current === secuencia) setDistrito(resultados[0]?.distrito ?? null)
  }
  async function buscar() {
    setBuscando(true); setError(''); const secuencia = ++consulta.current
    const resultados = await consultaLugares(new URLSearchParams({ q: busqueda }), secuencia)
    if (consulta.current === secuencia) { setLugares(resultados); if (!resultados.length) setError(prev => prev || 'No se encontraron direcciones en Arequipa.') }
    setBuscando(false)
  }
  function localizar() {
    setError('')
    if (!navigator.geolocation) { setError('Tu navegador no permite obtener la ubicación.'); return }
    navigator.geolocation.getCurrentPosition(p => void elegir({ latitud: p.coords.latitude, longitud: p.coords.longitude }), () => setError('No se pudo obtener tu ubicación. Puedes marcarla en el mapa.'), { enableHighAccuracy: true, timeout: 10000 })
  }
  return <fieldset className="min-w-0 space-y-3"><legend className="font-semibold text-basalto">Ubicación del complejo</legend>
    <label htmlFor="complejo-busqueda" className="block text-sm">Buscar dirección en Arequipa</label>
    <input id="complejo-busqueda" className={inputCls} value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void buscar() } }} />
    <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={buscando} onClick={() => void buscar()}>Buscar dirección</Button><Button variant="secondary" onClick={localizar}>Usar mi ubicación actual</Button></div>
    <ul>{lugares.map((l, i) => <li key={i}><button type="button" className="min-h-11 w-full break-words rounded-control border border-cal p-2 text-left text-sm" onClick={() => { void elegir(l, l.distrito); setLugares([]) }}>{l.nombre}</button></li>)}</ul>
    <MapaUbicacion punto={punto} editable onChange={p => void elegir(p)} />
    <p className="text-sm text-pizarra">Marca el mapa o arrastra el pin. {punto ? `${punto.latitud.toFixed(5)}, ${punto.longitud.toFixed(5)}` : 'Aún no guardaste un punto.'}</p>
    {punto && <Button variant="secondary" onClick={() => { consulta.current++; setDistrito(null); onChange(null) }}>Quitar ubicación</Button>}
    {distrito && <div><p>Distrito sugerido: {distrito}</p><Button variant="secondary" onClick={() => { onDistrito(distrito); setDistrito(null) }}>Usar este distrito</Button></div>}
    {error && <p role="alert" className="text-error-hondo">{error}</p>}
  </fieldset>
}
