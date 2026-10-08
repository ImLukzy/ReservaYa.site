'use client'
import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { uploadToR2 } from '@/lib/upload-r2'
import { comprimirFoto } from '@/lib/comprimir-foto'
export function FotosEditor({ fotos, onChange, onBusy, max = 6, tipo = 'complejo' }: { max?: number; tipo?: 'complejo' | 'cancha'; fotos: string[]; onChange: (f: string[]) => void; onBusy: (b: boolean) => void }) {
  const id = useId()
  const entidad = tipo === 'cancha' ? 'la cancha' : 'el complejo'
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [quitar, setQuitar] = useState<number | null>(null)
  const cancelacion = useRef<AbortController | null>(null)
  useEffect(() => () => cancelacion.current?.abort(), [])
  const arrastre = useRef<number | null>(null)
  async function subir(files: File[]) {
    if (subiendo) return
    setError('')
    if (files.length + fotos.length > max) { setError(`Puedes guardar hasta ${max} fotos.`); return }
    setSubiendo(true); onBusy(true)
    const nuevas = [...fotos]
    const controller = new AbortController(); cancelacion.current = controller
    let preparando = true
    try {
      for (let i = 0; i < files.length; i++) {
        preparando = true
        const file = await comprimirFoto(files[i])
        preparando = false
        if (controller.signal.aborted) return
        const url = await uploadToR2(file, tipo, n => { if (!controller.signal.aborted) setProgreso(Math.round((i * 100 + n) / files.length)) }, controller.signal)
        nuevas.push(url); onChange([...nuevas])
      }
    } catch { if (!controller.signal.aborted) setError(preparando ? 'No se pudo leer o preparar la imagen. Usa otra foto JPG, PNG o WebP de hasta 3 MB.' : 'No se pudieron subir las fotos. Revisa tu conexión e inténtalo de nuevo.') }
    finally { if (!controller.signal.aborted) { setSubiendo(false); onBusy(false); setProgreso(0) } }
  }
  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= fotos.length || subiendo) return
    const orden = [...fotos]; orden.splice(hasta, 0, orden.splice(desde, 1)[0]); onChange(orden)
  }
  return <fieldset disabled={subiendo} className="min-w-0 space-y-3">
    <legend className="font-semibold text-basalto">Fotos de {entidad} ({fotos.length}/{max})</legend>
    <div className="rounded-control border border-cal p-3" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) void subir(Array.from(e.dataTransfer.files)) }}>
      <label className="flex min-h-11 cursor-pointer items-center text-sm" htmlFor={id}>Seleccionar o arrastrar fotos (JPG, PNG, WebP; hasta 3 MB cada una)</label>
      <input id={id} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={subiendo || fotos.length >= max} className="min-h-11 w-full min-w-0 text-sm" onChange={e => { void subir(Array.from(e.target.files ?? [])); e.target.value = '' }} />
    </div>
    {subiendo && <div role="status"><p>Subiendo fotos: {progreso}%</p><progress value={progreso} max={100} className="w-full" /></div>}
    {error && <p role="alert" className="text-error-hondo">{error}</p>}
    <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
      {fotos.map((foto, i) => <li key={foto} draggable={!subiendo} onDragStart={() => { arrastre.current = i }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); if (arrastre.current !== null) mover(arrastre.current, i); arrastre.current = null }} className="min-w-0 rounded-control border border-cal p-2">
        <div className="relative aspect-video overflow-hidden rounded-control"><Image src={foto} alt={`Foto ${i + 1} de ${entidad}`} fill unoptimized className="object-cover" sizes="240px" /></div>
        <p className="mt-2 text-sm">{i === 0 ? 'Portada' : `Foto ${i + 1}`}</p>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" aria-label={`Mover foto ${i + 1} antes`} disabled={i === 0} onClick={() => mover(i, i - 1)}><ArrowLeft size={18} /></Button>
          <Button size="sm" variant="secondary" aria-label={`Mover foto ${i + 1} después`} disabled={i === fotos.length - 1} onClick={() => mover(i, i + 1)}><ArrowRight size={18} /></Button>
          {i !== 0 && <Button size="sm" variant="secondary" onClick={() => mover(i, 0)}>Usar como portada</Button>}
          <Button size="sm" variant="secondary" onClick={() => setQuitar(i)}>Eliminar</Button>
        </div>
        {quitar === i && <div className="mt-2" role="group" aria-label="Confirmar eliminación"><p>¿Eliminar esta foto de la galería?</p><Button size="sm" variant="danger" onClick={() => { onChange(fotos.filter((_, n) => n !== i)); setQuitar(null) }}>Eliminar foto</Button><Button size="sm" variant="secondary" onClick={() => setQuitar(null)}>Cancelar</Button></div>}
      </li>)}
    </ul>
  </fieldset>
}
