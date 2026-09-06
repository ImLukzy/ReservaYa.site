import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E7E5E4] p-6', className)}>
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
    green: 'bg-[#DCFCE7] text-[#15803D]',
    blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
    yellow: 'bg-[#FEF9C3] text-[#A16207]',
    red: 'bg-[#FFE4E6] text-[#BE123C]',
  }
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl', colors[color])}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-[#64748B]">{label}</p>
          <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
      </div>
    </Card>
  )
}
