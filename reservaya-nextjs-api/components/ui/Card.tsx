import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-[#20263a] rounded-2xl shadow-[0_12px_32px_rgba(3,7,18,0.2)] border border-[#303850] p-6', className)}>
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
    green: 'bg-emerald-500/15 text-emerald-300',
    blue: 'bg-indigo-500/20 text-indigo-300',
    yellow: 'bg-amber-500/15 text-amber-300',
    red: 'bg-rose-500/15 text-rose-300',
  }
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl', colors[color])}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-100">{value}</p>
        </div>
      </div>
    </Card>
  )
}