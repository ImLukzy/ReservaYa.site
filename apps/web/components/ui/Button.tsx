import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { BOTON } from '@/lib/public/estilos'
import { cn } from '@/lib/utils'

interface ButtonOptions {
  apariencia?: 'panel' | 'publica'
  variante?: keyof typeof BOTON
  className?: string
  children?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

type ButtonProps = ButtonOptions & (
  | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined })
  | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; type?: 'button' | 'submit' | 'reset' })
)

// Botón en píldora: verde sólido, claro con borde fino o fantasma; sombra suave (spec 53)
const variants = {
  primary: 'btn-tactil bg-cesped hover:bg-cesped-hover active:bg-cesped-hover text-tiza',
  secondary: 'btn-tactil btn-tactil--claro bg-tiza hover:bg-piedra active:bg-piedra text-basalto',
  danger: 'btn-tactil bg-error hover:bg-error-hondo active:bg-error-hondo text-tiza',
  ghost: 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-colors hover:bg-piedra active:bg-piedra text-pizarra hover:text-basalto',
}

const sizes = {
  sm: 'min-h-[2.75rem] min-w-[2.75rem] px-3.5 text-xs',
  md: 'min-h-[2.75rem] min-w-[2.75rem] px-5 text-sm',
  lg: 'min-h-[3rem] min-w-[3rem] px-6 text-base',
}

export function Button(props: ButtonProps) {
  const {
    apariencia = 'panel', variante = 'primario', variant = 'primary',
    size = 'md', loading, className, children, ...rest
  } = props
  const clase = apariencia === 'publica'
    ? `${BOTON[variante]} ${className ?? ''}`.trim()
    : cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        variants[variant], sizes[size], className
      )
  const contenido = <>
    {loading && (
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    )}
    {children}
  </>
  if (rest.href) return <a className={clase} {...rest}>{contenido}</a>
  const { disabled, ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return <button
    type={apariencia === 'publica' ? 'button' : undefined}
    disabled={disabled || loading} aria-busy={loading || undefined}
    className={clase} {...buttonProps}
  >{contenido}</button>
}
