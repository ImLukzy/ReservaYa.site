import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

// Superficie del tablero: tiza con línea de cal, sin sombras ni degradados.
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-tiza rounded-xl border border-cal p-6', className)}>
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
  icon: string
  color?: 'green' | 'blue' | 'yellow' | 'red'
}) {
  const colors = {
    green: 'bg-cesped-suave text-cesped-hondo',
    blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
    yellow: 'bg-[#FEF9C3] text-[#A16207]',
    red: 'bg-error-suave text-error',
  }
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 shrink-0 rounded-md flex items-center justify-center text-2xl', colors[color])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-pizarra">{label}</p>
          <p className="font-display text-3xl font-bold tabular-nums text-basalto">{value}</p>
        </div>
      </div>
    </Card>
  )
}
