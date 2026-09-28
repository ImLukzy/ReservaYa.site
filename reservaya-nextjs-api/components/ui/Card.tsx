import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

// Superficie táctil del tablero Universo Agustino: borde 2px basalto y sombra dura 4px.
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('card-tactil p-6', className)}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  color = 'green',
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: 'green' | 'blue' | 'yellow' | 'red'
}) {
  const colors = {
    green: 'bg-cesped-suave text-cesped-hondo border border-cesped/30',
    blue: 'bg-cielo-suave text-cielo-hondo border border-cielo/30',
    yellow: 'bg-sol-suave text-sol-hondo border border-sol/30',
    red: 'bg-error-suave text-error border border-error/30',
  }
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 shrink-0 rounded-xl flex items-center justify-center', colors[color])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pizarra">{label}</p>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-basalto">{value}</p>
        </div>
      </div>
    </Card>
  )
}
