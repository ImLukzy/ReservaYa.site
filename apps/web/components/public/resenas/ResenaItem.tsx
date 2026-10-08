import { Star } from 'lucide-react'
import { fechaPeru, indiceColor, inicial, type ResenaPublica } from '@/lib/public/resenas'
import { cn } from '@/lib/utils'

// Círculos de inicial con tokens de la paleta (sin colores nuevos); el índice sale del nombre.
const CIRCULOS = [
  'bg-cesped-suave text-cesped-hondo',
  'bg-sol-suave text-sol-hondo',
  'bg-piedra text-basalto',
  'bg-error-suave text-error-hondo',
] as const

export function Estrellas({ n, tamano = 16, className }: { n: number; tamano?: number; className?: string }) {
  const redondeo = Math.round(n)
  return (
    <span role="img" aria-label={`${Number.isInteger(n) ? n : n.toFixed(1)} de 5`} className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={tamano} strokeWidth={0} aria-hidden="true" className={i <= redondeo ? 'fill-sol' : 'fill-niebla'} />
      ))}
    </span>
  )
}

export function ResenaItem({ resena, complejoNombre, etiqueta, children }: {
  resena: ResenaPublica
  complejoNombre: string
  etiqueta?: string
  children?: React.ReactNode
}) {
  return (
    <article className="flex gap-3">
      <span aria-hidden="true" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-base font-bold', CIRCULOS[indiceColor(resena.autor, CIRCULOS.length)])}>
        {inicial(resena.autor)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-basalto">
          <span className="break-words">{resena.autor}</span>
          {etiqueta && <span className="rounded-full bg-cesped-suave px-2 py-0.5 text-xs font-semibold text-cesped-hondo">{etiqueta}</span>}
        </p>
        <p className="text-sm text-pizarra"><time dateTime={resena.creadoEn}>{fechaPeru(resena.creadoEn)}</time></p>
        <Estrellas n={resena.puntuacion} className="mt-1" />
        {resena.comentario && <p className="mt-2 whitespace-pre-line break-words text-basalto">{resena.comentario}</p>}
        {resena.respuestaDueno && (
          <div className="mt-3 border-l-2 border-cesped pl-4">
            <p className="text-sm font-semibold text-basalto">Respuesta de {complejoNombre}</p>
            <p className="mt-1 whitespace-pre-line break-words text-pizarra">{resena.respuestaDueno}</p>
          </div>
        )}
        {children}
      </div>
    </article>
  )
}
