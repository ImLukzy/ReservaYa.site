'use client'

import { useEffect, useId } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

// La superficie sigue oscura: los formularios que viven dentro (select.sel-dark,
// textos claros) están pintados para ella. Sin backdrop-blur (spec 21 §4.1).
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-velo" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('relative z-10 w-full max-w-lg max-h-[90dvh] overflow-y-auto [scrollbar-gutter:stable] rounded-xl border border-[#303850] bg-[#20263a] p-4 text-slate-100 shadow-2xl sm:p-6', className)}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-semibold text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-2 transition-colors hover:bg-[#2b334d]">
            <X size={20} className="text-slate-400" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
