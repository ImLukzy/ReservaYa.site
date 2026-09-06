import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  className?: string
}

const variants = {
  green: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
  yellow: 'bg-[#FEF9C3] text-[#A16207] border border-[#FDE68A]',
  red: 'bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3]',
  blue: 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]',
  gray: 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide', variants[variant], className)}>
      {children}
    </span>
  )
}
