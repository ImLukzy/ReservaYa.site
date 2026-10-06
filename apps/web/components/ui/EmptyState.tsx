import type { LucideIcon } from 'lucide-react'
import { CroquisCancha } from './CroquisCancha'

interface EmptyStateProps {
  apariencia?: 'panel' | 'publica'
  icon?: LucideIcon
  title?: string
  description?: string
  action?: React.ReactNode
  titulo?: string
  texto?: string
  id?: string
  oculto?: boolean
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  apariencia = 'panel', icon: Icon, title, description, action,
  titulo, texto, id, oculto, className, children,
}: EmptyStateProps) {
  const publico = apariencia === 'publica'
  const detalle = publico ? texto : description
  return (
    <div id={id} hidden={oculto} className={publico
      ? `card-dashed px-6 py-10 text-center ${className ?? ''}`.trim()
      : 'card-dashed flex flex-col items-center justify-center p-12 text-center'}>
      {Icon ? (
        <Icon className="mb-4 h-12 w-12 text-borde" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <CroquisCancha apariencia={apariencia} className={publico ? 'mx-auto mb-4 h-24 w-24' : 'mb-4 h-24 w-24'} />
      )}
      <p className={publico ? 'font-display text-xl font-bold text-basalto' : 'font-display text-xl font-semibold text-basalto'}>{publico ? titulo : title}</p>
      {(!publico || detalle) && <p className={publico ? 'mx-auto mt-2 max-w-md text-pizarra' : 'mb-6 mt-1 max-w-sm text-sm text-pizarra'}>{detalle}</p>}
      {publico ? <div className="mt-5 flex flex-wrap justify-center gap-3 empty:hidden">{children}</div> : action}
    </div>
  )
}
