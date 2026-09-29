import { forwardRef, type ComponentType } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  nota?: string
  etiquetaOculta?: boolean
  icon?: ComponentType<{ className?: string }>
  claseCampo?: string
}

// Espejo de Field.astro: alto 44, icono opcional, foco cesped (spec 26).
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, etiqueta, nota, etiquetaOculta, icon: Icon, className, claseCampo, ...props },
  ref
) {
  const notaId = nota ? `${id}-nota` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className={etiquetaOculta ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-basalto'}>
        {etiqueta}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra" />
        )}
        <input
          ref={ref}
          id={id}
          aria-describedby={notaId}
          className={cn(
            'h-11 w-full rounded-md border-2 border-basalto bg-tiza px-3 text-sm text-basalto placeholder:text-pizarra focus:border-cesped focus:outline-none focus:shadow-[2px_2px_0_0_#1f2a24] disabled:cursor-not-allowed disabled:bg-piedra disabled:text-pizarra',
            Icon && 'pl-9',
            claseCampo
          )}
          {...props}
        />
      </div>
      {nota && (
        <p id={notaId} className="mt-1.5 text-[0.6875rem] text-pizarra">
          {nota}
        </p>
      )}
    </div>
  )
})
