import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Opcion {
  valor: string
  etiqueta: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string
  etiquetaOculta?: boolean
  opciones?: readonly Opcion[]
  claseCampo?: string
}

// Espejo de Select.astro: alto 44, flecha, foco cesped (spec 26).
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, etiqueta, etiquetaOculta, opciones, className, claseCampo, children, ...props },
  ref
) {
  return (
    <div className={className}>
      <label htmlFor={id} className={etiquetaOculta ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-basalto'}>
        {etiqueta}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            'h-11 w-full appearance-none rounded-md border border-cal bg-tiza px-3 pr-10 text-sm text-basalto focus:border-cesped focus:outline-none focus:ring-1 focus:ring-cesped disabled:cursor-not-allowed disabled:bg-piedra disabled:text-pizarra',
            claseCampo
          )}
          {...props}
        >
          {opciones
            ? opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra"
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>
    </div>
  )
})
