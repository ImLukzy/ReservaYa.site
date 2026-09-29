import { cn } from '@/lib/utils'

// Firma visual compartida con la landing (spec 24): croquis de cancha en líneas de
// cal (perímetro, línea media, círculo central) cuando no hay foto o la foto no carga,
// y firma de estados vacíos/error en todo el producto (spec 31).
// Sin SVG ni imagen, sin icono forzado por deporte.
export function CroquisCancha({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden rounded-xl bg-cesped-suave', className)}
      aria-hidden="true"
    >
      <div className="absolute inset-4 rounded-sm border border-cesped/40" />
      <div className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-cesped/40" />
      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cesped/40" />
    </div>
  )
}
