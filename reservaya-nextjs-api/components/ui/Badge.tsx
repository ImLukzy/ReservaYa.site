import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  className?: string
}

// Estados del tablero; todos ≥ 4.5:1 (verde 5.7, rojo 5.75, gris 4.9).
const variants = {
  green: 'bg-cesped-suave text-cesped-hondo',
  yellow: 'bg-[#FEF9C3] text-[#A16207]',
  red: 'bg-error-suave text-error',
  blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
  gray: 'bg-piedra text-pizarra',
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md font-display text-sm font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
