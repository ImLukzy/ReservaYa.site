import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

// Superficie blanca: borde fino, radio 16 px y sombra suave (spec 53).
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('card-tactil p-6', className)}>
      {children}
    </div>
  )
}
