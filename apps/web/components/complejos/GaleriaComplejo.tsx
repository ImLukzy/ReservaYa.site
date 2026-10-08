'use client'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
export function GaleriaComplejo({ fotos, nombre }: { fotos: string[]; nombre: string }) {
  const [indice, setIndice] = useState(0)
  const [abierta, setAbierta] = useState(false)
  const inicio = useRef<number | null>(null)
  const seleccionar = (n: number) => setIndice((n + fotos.length) % fotos.length)
  if (!fotos.length) return <p className="text-pizarra">Este complejo aún no tiene fotos.</p>
  const contenido = (pantalla = false) => <>
    <div className={`relative overflow-hidden rounded-surface ${pantalla ? 'h-[65svh]' : 'aspect-[4/3] sm:aspect-video'}`} onTouchStart={e => { inicio.current = e.touches[0].clientX }} onTouchEnd={e => { if (inicio.current !== null) { const delta = e.changedTouches[0].clientX - inicio.current; if (Math.abs(delta) > 45) seleccionar(indice + (delta < 0 ? 1 : -1)) }; inicio.current = null }}>
      <Image src={fotos[indice]} alt={`${nombre}, foto ${indice + 1}`} fill unoptimized sizes="(min-width: 1024px) 65vw, 100vw" className={pantalla ? 'object-contain' : 'object-cover'} />
      <p className="absolute right-3 top-3 rounded-full bg-cancha-noche/85 px-3 py-1 text-blanco" aria-live="polite">{indice + 1}/{fotos.length}</p>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <Button apariencia="publica" variante="secundario" aria-label="Foto anterior" onClick={() => seleccionar(indice - 1)}><ChevronLeft size={20} /></Button>
        {!pantalla && <Button apariencia="publica" variante="secundario" aria-label="Ver foto en pantalla completa" onClick={() => setAbierta(true)}><Maximize size={18} /><span className="hidden sm:inline">Ver en pantalla completa</span></Button>}
        <Button apariencia="publica" variante="secundario" aria-label="Foto siguiente" onClick={() => seleccionar(indice + 1)}><ChevronRight size={20} /></Button>
      </div>
    </div>
    <div className="mt-2 flex flex-wrap gap-1" aria-label="Elegir foto">{fotos.map((_, n) => <button key={n} type="button" aria-label={`Ver foto ${n + 1}`} aria-current={n === indice ? 'true' : undefined} onClick={() => seleccionar(n)} className="flex min-h-11 min-w-11 flex-1 items-center"><span className={`h-1 w-full rounded-full ${n === indice ? 'bg-cesped' : 'bg-cal'}`} /></button>)}</div>
  </>
  return <>{contenido()}<Modal open={abierta} onClose={() => setAbierta(false)} title={`Fotos de ${nombre}`} className="max-w-5xl" tono="claro">{abierta && contenido(true)}</Modal></>
}
