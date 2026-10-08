'use client'
import { useEffect, useRef, type MouseEvent } from 'react'
import type { ComplejoPublico } from '@/lib/public/complejo-publico'
import { reservaCanchaHref, SELECCION_CANCHA_PERFIL } from '@/lib/public/complejo-publico'
import { Button } from '@/components/ui/Button'
import { soles } from '@/lib/public/horario'
import { tarjetaCancha } from '@/lib/public/scripts/tarjetas'
export function CanchasPerfil({ datos }: { datos: ComplejoPublico }) {
  const lista = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!lista.current) return
    const { complejo, canchas, valoracion } = datos
    lista.current.replaceChildren(...canchas.map(cancha => {
      const tarjeta = tarjetaCancha({ cancha: { ...cancha, complejoId: null, complejo: null }, disponible: false, totalEstimado: null }, { reservarHref: reservaCanchaHref(complejo.slug, cancha.id), valoracion, fotos: cancha.fotos?.length ? cancha.fotos : cancha.imagen ? [cancha.imagen] : [] })
      tarjeta.classList.add('min-h-[480px]')
      return tarjeta
    }))
  }, [datos])
  function elegir(event: MouseEvent<HTMLUListElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return
    const enlace = event.target.closest('a')
    if (!enlace) return
    const url = new URL(enlace.href)
    const id = url.searchParams.get('cancha')
    if (url.origin !== window.location.origin || !datos.canchas.some(c => c.id === id)) return
    event.preventDefault()
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    window.dispatchEvent(new CustomEvent(SELECCION_CANCHA_PERFIL, { detail: id }))
    document.getElementById('reservar')?.scrollIntoView({ block: 'start' })
  }
  return <ul onClick={elegir} ref={lista} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1" aria-label="Canchas de este complejo">{datos.canchas.map(c => <li key={c.id} className="min-h-[480px] rounded-surface border border-cal bg-tiza p-4"><h3 className="font-semibold">{c.nombre}</h3><p className="my-3">{soles(c.precioPorHora)} /60 min</p><Button apariencia="publica" href={reservaCanchaHref(datos.complejo.slug, c.id)}>Reservar</Button></li>)}</ul>
}
