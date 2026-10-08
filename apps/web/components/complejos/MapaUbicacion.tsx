'use client'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { Punto } from '@reservaya/shared'
const Leaflet = dynamic(() => import('./MapaLeaflet'), { ssr: false, loading: () => <p className="p-4 text-pizarra">Cargando mapa…</p> })
export function MapaUbicacion(props: { punto: Punto | null; editable?: boolean; onChange?: (p: Punto) => void }) {
  const caja = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect() } })
    if (caja.current) observer.observe(caja.current)
    return () => observer.disconnect()
  }, [])
  return <div>
    <div ref={caja} className="relative isolate z-0 h-80 w-full overflow-hidden rounded-surface border border-cal bg-piedra">{visible ? <Leaflet {...props} /> : <p className="p-4 text-pizarra">Mapa de ubicación</p>}</div>
    <p className="text-xs text-pizarra"><a className="inline-flex min-h-11 items-center underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></p>
  </div>
}
