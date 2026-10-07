import { cn } from '@/lib/utils'

export function inicialesDe(nombre: string | null | undefined): string {
  const iniciales = (nombre ?? '')
    .trim()
    .split(/\s+/)
    .map((parte) => parte[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return iniciales || 'R'
}

interface AvatarProps {
  nombre: string | null | undefined
  fotoUrl?: string | null
  /** Tamaño, forma y colores del círculo de iniciales. */
  className?: string
}

// Foto de perfil si existe; si no, las iniciales del nombre.
export function Avatar({ nombre, fotoUrl, className }: AvatarProps) {
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full', className)}>
      {fotoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        inicialesDe(nombre)
      )}
    </span>
  )
}
