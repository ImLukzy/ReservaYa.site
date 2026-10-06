import { cn } from '@/lib/utils'

// Firma visual compartida con la landing (spec 24): croquis de cancha en líneas de
// cal (perímetro, línea media, círculo central) cuando no hay foto o la foto no carga,
// y firma de estados vacíos/error en todo el producto (spec 31).
// Sin SVG ni imagen, sin icono forzado por deporte.
export function CroquisCancha({ apariencia = 'panel', className }: { apariencia?: 'panel' | 'publica'; className?: string }) {
  const publico = apariencia === 'publica'
  const Linea = publico ? 'span' : 'div'
  const clase = publico
    ? `relative flex items-center justify-center overflow-hidden rounded-surface bg-cesped-suave ${className ?? 'h-24 w-24'}`.trim()
    : cn('relative flex items-center justify-center overflow-hidden rounded-xl bg-cesped-suave', className ?? 'h-full w-full')
  return (
    <div
      className={clase}
      aria-hidden="true"
    >
      <Linea className={`absolute inset-4 ${publico ? 'rounded-control' : 'rounded-sm'} border border-cesped/40`} />
      <Linea className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-cesped/40" />
      <Linea className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cesped/40" />
    </div>
  )
}
