import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  className?: string
}

const variants = {
  green: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/20',
  yellow: 'bg-amber-400/15 text-amber-300 border border-amber-400/20',
  red: 'bg-rose-400/15 text-rose-300 border border-rose-400/20',
  blue: 'bg-indigo-400/15 text-indigo-300 border border-indigo-400/20',
  gray: 'bg-slate-400/15 text-slate-300 border border-slate-400/20',
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide', variants[variant], className)}>
      {children}
    </span>
  )
}