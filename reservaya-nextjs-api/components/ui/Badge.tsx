import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  className?: string
}

// Etiquetas de estado con formato píldora y bordes nítidos de contraste
const variants = {
  green: 'border-cesped/40 bg-cesped-suave text-cesped-hondo',
  yellow: 'border-sol/40 bg-sol-suave text-sol-hondo',
  red: 'border-error/40 bg-error-suave text-error',
  blue: 'border-cielo/40 bg-cielo-suave text-cielo-hondo',
  gray: 'border-borde bg-piedra text-pizarra',
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 font-display text-xs font-bold tabular-nums', variants[variant], className)}>
      {children}
    </span>
  )
}
