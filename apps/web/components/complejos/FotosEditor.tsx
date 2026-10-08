'use client'
import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { uploadToR2 } from '@/lib/upload-r2'
import { comprimirFoto } from '@/lib/comprimir-foto'
export function FotosEditor({ fotos, onChange, onBusy }: { fotos: string[]; onChange: (f: string[]) => void; onBusy: (b: boolean) => void }) {
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
    if (files.length + fotos.length > 6) { setError('Puedes guardar hasta 6 fotos.'); return }
    setSubiendo(true); onBusy(true)
    const nuevas = [...fotos]
    const controller = new AbortController(); cancelacion.current = controller
    try {
      for (let i = 0; i < files.length; i++) {
        const file = await comprimirFoto(files[i])
        if (controller.signal.aborted) return
        const url = await uploadToR2(file, 'complejo', n => { if (!controller.signal.aborted) setProgreso(Math.round((i * 100 + n) / files.length)) }, controller.signal)
        nuevas.push(url); onChange([...nuevas])
      }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudieron subir las fotos.') }
    finally { if (!controller.signal.aborted) { setSubiendo(false); onBusy(false); setProgreso(0) } }
  }
  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= fotos.length || subiendo) return
    const orden = [...fotos]; orden.splice(hasta, 0, orden.splice(desde, 1)[0]); onChange(orden)
  }
  return <fieldset disabled={subiendo} className="min-w-0 space-y-3">
    <legend className="font-semibold text-basalto">Fotos del complejo ({fotos.length}/6)</legend>
    <div className="rounded-control border border-cal p-3" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) void subir(Array.from(e.dataTransfer.files)) }}>
      <label className="flex min-h-11 cursor-pointer items-center text-sm" htmlFor="complejo-fotos">Seleccionar o arrastrar fotos (JPG, PNG, WebP; hasta 3 MB cada una)</label>
      <input id="complejo-fotos" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={subiendo || fotos.length >= 6} className="min-h-11 w-full min-w-0 text-sm" onChange={e => { void subir(Array.from(e.target.files ?? [])); e.target.value = '' }} />
    </div>
    {subiendo && <div role="status"><p>Subiendo fotos: {progreso}%</p><progress value={progreso} max={100} className="w-full" /></div>}
    {error && <p role="alert" className="text-error-hondo">{error}</p>}
    <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
      {fotos.map((foto, i) => <li key={foto} draggable={!subiendo} onDragStart={() => { arrastre.current = i }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); if (arrastre.current !== null) mover(arrastre.current, i); arrastre.current = null }} className="min-w-0 rounded-control border border-cal p-2">
        <div className="relative aspect-video overflow-hidden rounded-control"><Image src={foto} alt={`Foto ${i + 1} del complejo`} fill unoptimized className="object-cover" sizes="240px" /></div>
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
