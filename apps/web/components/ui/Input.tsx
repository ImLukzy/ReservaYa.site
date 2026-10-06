import { forwardRef, type ComponentType, type InputHTMLAttributes, type TextareaHTMLAttributes, type Ref } from 'react'
import { cn } from '@/lib/utils'
import { CAMPO, ETIQUETA } from '@/lib/public/estilos'

interface FieldOptions {
  apariencia?: 'panel' | 'publica'
  etiqueta: string
  nota?: string
  etiquetaOculta?: boolean
  icon?: ComponentType<{ className?: string }>
  claseCampo?: string
  filas?: number
  minLength?: string | number
  maxLength?: string | number
}

type InputProps = FieldOptions & (
  | (Omit<InputHTMLAttributes<HTMLInputElement>, 'minLength' | 'maxLength'> & { multilinea?: false })
  | (Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'minLength' | 'maxLength'> & { multilinea: true })
)

// Un campo etiquetado: panel, variante pública redonda y texto multilínea.
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(function Input(
  { apariencia = 'panel', id, etiqueta, nota, etiquetaOculta, icon: Icon, className,
    claseCampo = '', multilinea = false, filas = 4, children, value, minLength, maxLength, ...props },
  ref
) {
  const publico = apariencia === 'publica'
  const notaId = nota ? `${id}-nota` : undefined
  const clase = publico
    ? `${CAMPO} ${multilinea ? 'resize-y py-2.5' : 'h-11'} ${claseCampo}`
    : cn(
        'h-11 w-full rounded-control border border-borde bg-tiza px-3 text-sm text-basalto placeholder:text-pizarra transition-colors hover:border-pizarra focus:border-cesped focus:outline-none disabled:cursor-not-allowed disabled:bg-piedra disabled:text-pizarra',
        Icon && 'pl-9', claseCampo
      )
  const limites = {
    minLength: minLength === undefined ? undefined : Number(minLength),
    maxLength: maxLength === undefined ? undefined : Number(maxLength),
  }
  const valor = publico ? { defaultValue: value } : { value }
  return (
    <div className={className}>
      <label htmlFor={id} className={etiquetaOculta ? 'sr-only' : publico ? ETIQUETA : 'mb-1.5 block text-sm font-medium text-basalto'}>
        {etiqueta}
      </label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra" />}
        {multilinea ? (
          <textarea ref={ref as Ref<HTMLTextAreaElement>} id={id} rows={filas}
            aria-describedby={notaId} className={clase} {...limites} {...valor} {...props as TextareaHTMLAttributes<HTMLTextAreaElement>} />
        ) : (
          <input ref={ref as Ref<HTMLInputElement>} id={id}
            aria-describedby={notaId} className={clase} {...limites} {...valor} {...props as InputHTMLAttributes<HTMLInputElement>} />
        )}
        {children}
      </div>
      {nota && <p id={notaId} className={publico ? 'mt-1.5 text-sm text-pizarra' : 'mt-1.5 text-[0.6875rem] text-pizarra'}>{nota}</p>}
    </div>
  )
})
