'use client'
import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { puntoEnArequipa, type Punto } from '@reservaya/shared'
export default function MapaLeaflet({ punto, editable = false, onChange }: { punto: Punto | null; editable?: boolean; onChange?: (p: Punto) => void }) {
  const caja = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const pin = useRef<L.Marker | null>(null)
  const cambio = useRef(onChange)
  const actual = useRef(punto)
  useEffect(() => { cambio.current = onChange }, [onChange])
  useEffect(() => { actual.current = punto; if (punto) { pin.current?.setLatLng([punto.latitud, punto.longitud]); mapa.current?.panTo([punto.latitud, punto.longitud]) } }, [punto])
  useEffect(() => {
    if (!caja.current) return
    const inicio = actual.current ?? { latitud: -16.3989, longitud: -71.5369 }
    const m = L.map(caja.current, { scrollWheelZoom: false }).setView([inicio.latitud, inicio.longitud], 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m)
    m.attributionControl.setPrefix(false)
    const simbolo = document.createElement('span')
    simbolo.className = 'block h-11 w-11 rounded-full border-4 border-white bg-cesped-hondo'
    const marker = L.marker([inicio.latitud, inicio.longitud], { draggable: editable, keyboard: true, title: 'Ubicación del complejo', icon: L.divIcon({ html: simbolo, className: '', iconSize: [44, 44], iconAnchor: [22, 22] }) }).addTo(m)
    const elegir = (latlng: L.LatLng) => {
      const p = { latitud: latlng.lat, longitud: latlng.lng }
      // El padre muestra el aviso; el marcador nunca queda guardado fuera del área.
      cambio.current?.(p)
      if (!puntoEnArequipa(p.latitud, p.longitud)) { const previo = actual.current ?? inicio; marker.setLatLng([previo.latitud, previo.longitud]) }
    }
    if (editable) { marker.on('dragend', () => elegir(marker.getLatLng())); m.on('click', e => { marker.setLatLng(e.latlng); elegir(e.latlng) }) }
    mapa.current = m; pin.current = marker
    const resize = new ResizeObserver(() => m.invalidateSize())
    resize.observe(caja.current)
    return () => { resize.disconnect(); m.remove(); mapa.current = null; pin.current = null }
  }, [editable])
  return <div ref={caja} className="h-full w-full" aria-label={editable ? 'Mapa: marca o arrastra el punto del complejo' : 'Mapa de ubicación del complejo'} />
}
