'use client'

import { useEffect, useId, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  /** Tono de la superficie. Por defecto oscura (formularios admin ya pintados para ella). */
  tono?: 'oscuro' | 'claro'
}

// La superficie por defecto sigue oscura: los formularios que viven dentro (select.sel-dark,
// textos claros) están pintados para ella. tono="claro" usa los tokens claros del tablero
// (spec 24, lado jugador). Sin backdrop-blur (spec 21 §4.1).
export function Modal({ open, onClose, title, children, className, tono = 'oscuro' }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const prevFocusedRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    prevFocusedRef.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    // Foco inicial accesible
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable && focusable.length > 0) {
      focusable[0].focus()
    } else {
      dialogRef.current?.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const elements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (elements.length === 0) return
        const first = elements[0]
        const last = elements[elements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
      prevFocusedRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const superficie =
    tono === 'claro'
      ? 'border-2 border-basalto bg-tiza text-basalto shadow-dura-lg'
      : 'border-2 border-basalto bg-[#20263a] text-slate-100 shadow-dura-lg'
  const tituloCls = tono === 'claro' ? 'text-basalto' : 'text-slate-100'
  const cerrarCls =
    tono === 'claro'
      ? 'hover:bg-piedra focus-visible:ring-basalto'
      : 'hover:bg-[#2b334d] focus-visible:ring-slate-300'
  const iconoCls = tono === 'claro' ? 'text-pizarra' : 'text-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-velo" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('relative z-10 w-full max-w-lg max-h-[90dvh] overflow-y-auto [scrollbar-gutter:stable] rounded-2xl p-4 sm:p-6 outline-none', superficie, className)}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 id={titleId} className={cn('font-display text-xl font-semibold', tituloCls)}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={cn('inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', cerrarCls)}
          >
            <X size={20} className={iconoCls} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
