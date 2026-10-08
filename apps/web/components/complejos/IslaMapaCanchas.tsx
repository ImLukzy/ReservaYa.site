'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { PuntoMapa } from './MapaCanchas'

// Isla que pinta el mapa cuando el script de /canchas publica resultados
// (evento ry:mapa-canchas). Carga diferida: Leaflet solo se descarga si hay
// puntos que mostrar.
const Mapa = dynamic(() => import('./MapaCanchas'), { ssr: false, loading: () => <p className="p-4 text-pizarra">Cargando mapa…</p> })

export function IslaMapaCanchas() {
  const [puntos, setPuntos] = useState<PuntoMapa[]>([])
  useEffect(() => {
    const alLlegar = (e: Event) => setPuntos((e as CustomEvent<PuntoMapa[]>).detail ?? [])
    window.addEventListener('ry:mapa-canchas', alLlegar)
    return () => window.removeEventListener('ry:mapa-canchas', alLlegar)
  }, [])
  if (!puntos.length) return <p className="p-4 text-pizarra">Busca canchas para verlas en el mapa.</p>
  return <Mapa puntos={puntos} />
}
