'use client'
import { useEffect, useRef } from 'react'
import type { ComplejoPublico } from '@/lib/public/complejo-publico'
import { reservaPublicaHref } from '@/lib/public/complejo-publico'
import { Button } from '@/components/ui/Button'
import { soles } from '@/lib/public/horario'
import { tarjetaCancha } from '@/lib/public/scripts/tarjetas'
export function CanchasPerfil({ datos }: { datos: ComplejoPublico }) {
  const lista = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!lista.current) return
    const { complejo, canchas, valoracion } = datos
    lista.current.replaceChildren(...canchas.map(cancha => {
      const tarjeta = tarjetaCancha({ cancha: { ...cancha, complejoId: null, complejo: null }, disponible: false, totalEstimado: null }, { reservarHref: reservaPublicaHref(cancha.nombre, complejo.distrito, cancha.tipo), valoracion })
      tarjeta.classList.add('min-h-[480px]')
      return tarjeta
    }))
  }, [datos])
  return <ul ref={lista} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1" aria-label="Canchas de este complejo">{datos.canchas.map(c => <li key={c.id} className="min-h-[480px] rounded-surface border border-cal bg-tiza p-4"><h3 className="font-semibold">{c.nombre}</h3><p className="my-3">{soles(c.precioPorHora)} /60 min</p><Button apariencia="publica" href={reservaPublicaHref(c.nombre, datos.complejo.distrito, c.tipo)}>Reservar</Button></li>)}</ul>
}
