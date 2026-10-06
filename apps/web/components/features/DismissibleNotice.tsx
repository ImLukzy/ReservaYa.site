'use client'

import { useEffect, useState } from 'react'

export function DismissibleNotice() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 10000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="mb-6 rounded-2xl border border-sol/25 bg-sol/10 px-5 py-4 text-sol-hondo">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">Solicitud no confirmada</p>
          <p className="mt-1 text-sm text-sol-hondo/75">
            Otro usuario obtuvo ese horario. Puedes elegir otra fecha u hora desde Canchas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg px-2 py-1 text-sm text-sol-hondo/80 hover:bg-sol-suave/15 hover:text-sol-hondo"
          aria-label="Descartar aviso"
        >
          ×
        </button>
      </div>
    </div>
  )
}
