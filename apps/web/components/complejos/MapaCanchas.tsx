'use client'
import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface PuntoMapa {
  latitud: number | null
  longitud: number | null
  titulo: string
  detalle?: string
}

// Mapa de complejos con coordenadas (spec 68): solo lectura, reutiliza el
// patrón Leaflet+OSM de MapaLeaflet (carga diferida vía dynamic ssr:false).
export default function MapaCanchas({ puntos }: { puntos: PuntoMapa[] }) {
  const caja = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const datos = useRef(puntos)
  useEffect(() => {
    datos.current = puntos
    const m = mapa.current
    if (!m) return
    m.eachLayer((capa) => { if (capa instanceof L.Marker) m.removeLayer(capa) })
    const validos = datos.current.filter((p) => p.latitud != null && p.longitud != null)
    for (const p of validos) {
      const simbolo = document.createElement('span')
      simbolo.className = 'block h-11 w-11 rounded-full border-4 border-white bg-cesped-hondo'
      const contenido = document.createElement('div')
      const titulo = document.createElement('strong')
      titulo.textContent = p.titulo
      contenido.append(titulo)
      if (p.detalle) {
        const linea = document.createElement('p')
        linea.textContent = p.detalle
        contenido.append(linea)
      }
      L.marker([p.latitud as number, p.longitud as number], { keyboard: true, title: p.titulo, icon: L.divIcon({ html: simbolo, className: '', iconSize: [44, 44], iconAnchor: [22, 22] }) })
        .bindPopup(contenido)
        .addTo(m)
    }
    if (validos.length > 1) m.fitBounds(L.latLngBounds(validos.map((p) => [p.latitud as number, p.longitud as number] as [number, number])), { padding: [24, 24] })
    else if (validos.length === 1) m.setView([validos[0].latitud as number, validos[0].longitud as number], 15)
  }, [puntos])
  useEffect(() => {
    if (!caja.current) return
    const m = L.map(caja.current, { scrollWheelZoom: false }).setView([-16.3989, -71.5369], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m)
    m.attributionControl.setPrefix(false)
    mapa.current = m
    const resize = new ResizeObserver(() => m.invalidateSize())
    resize.observe(caja.current)
    return () => { resize.disconnect(); m.remove(); mapa.current = null }
  }, [])
  return <div ref={caja} className="h-full w-full" aria-label="Mapa de complejos con coordenadas" />
}
