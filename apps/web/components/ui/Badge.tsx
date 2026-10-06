import { INSIGNIA, INSIGNIA_BASE } from '@/lib/public/estilos'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children?: React.ReactNode
  apariencia?: 'panel' | 'publica'
  tono?: keyof typeof INSIGNIA
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'futbol' | 'voley' | 'basquet' | 'padel' | 'tenis' | 'losa'
  className?: string
}

// Etiquetas de estado con formato píldora y bordes nítidos de contraste
const variants = {
  green: 'border-cesped/40 bg-cesped-suave text-cesped-hondo',
  yellow: 'border-sol/40 bg-sol-suave text-sol-hondo',
  red: 'border-error/40 bg-error-suave text-error',
  blue: 'border-cielo/40 bg-cielo-suave text-cielo-hondo',
  gray: 'border-borde bg-piedra text-pizarra',
  futbol: 'border-cesped bg-cesped-suave text-basalto',
  voley: 'border-cesped bg-cesped-suave text-basalto',
  basquet: 'border-cesped bg-cesped-suave text-basalto',
  padel: 'border-cesped bg-cesped-suave text-basalto',
  tenis: 'border-cesped bg-cesped-suave text-basalto',
  losa: 'border-cesped bg-cesped-suave text-basalto',
}

export function Badge({ children, variant = 'gray', className, apariencia = 'panel', tono = 'neutro' }: BadgeProps) {
  return (
    <span className={apariencia === 'publica' ? `${INSIGNIA_BASE} ${INSIGNIA[tono]} ${className ?? ''}`.trim() : cn('inline-flex items-center rounded-full border px-2.5 py-0.5 font-display text-xs font-bold tabular-nums', variants[variant], className)}>
      {children}
    </span>
  )
}
