import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

// Botón táctil / mecánico Universo Agustino: píldora con borde 2px basalto y sombra dura
const variants = {
  primary: 'btn-tactil bg-cesped hover:bg-cesped-hover active:bg-cesped-hover text-tiza',
  secondary: 'btn-tactil bg-tiza hover:bg-piedra active:bg-piedra text-basalto',
  danger: 'btn-tactil bg-error hover:bg-error-hondo active:bg-error-hondo text-tiza',
  ghost: 'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-colors duration-150 hover:bg-piedra active:bg-piedra text-pizarra hover:text-basalto',
}

const sizes = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'min-h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
}
