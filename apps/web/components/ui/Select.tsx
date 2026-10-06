import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import Icon from '@/components/public/ui/Icon'
import { CAMPO, ETIQUETA } from '@/lib/public/estilos'
import { cn } from '@/lib/utils'

interface Opcion {
  valor: string
  etiqueta: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  apariencia?: 'panel' | 'publica'
  valor?: string
  etiqueta: string
  etiquetaOculta?: boolean
  opciones?: readonly Opcion[]
  claseCampo?: string
}

// Espejo de Select.astro: alto 44, flecha, foco cesped (spec 26).
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { apariencia = 'panel', valor = '', id, etiqueta, etiquetaOculta, opciones, className, claseCampo, children, ...props },
  ref
) {
  const publico = apariencia === 'publica'
  const flecha = 'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra'
  return (
    <div className={className}>
      <label htmlFor={id} className={etiquetaOculta ? 'sr-only' : publico ? ETIQUETA : 'mb-1.5 block text-sm font-medium text-basalto'}>
        {etiqueta}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          defaultValue={publico ? valor : undefined}
          className={publico ? `${CAMPO} h-11 appearance-none pr-10 ${claseCampo ?? ''}`.trim() : cn(
            'h-11 w-full appearance-none rounded-control border border-borde bg-tiza px-3 pr-10 text-sm text-basalto transition-colors hover:border-pizarra focus:border-cesped focus:outline-none disabled:cursor-not-allowed disabled:bg-piedra disabled:text-pizarra',
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
        {publico ? <Icon nombre="abajo" className={flecha} /> : (
          <ChevronDown className={flecha} strokeWidth={2} aria-hidden="true" />
        )}
      </div>
    </div>
  )
})
