'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CLAVE_AVISO_UNION } from '@/lib/invitaciones';

// Muestra una sola vez «Ya eres parte del equipo de …» tras aceptar una
// invitación (lo deja ListaInvitaciones en sessionStorage antes de navegar).
export function AvisoUnion() {
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    let texto = '';
    try {
      texto = sessionStorage.getItem(CLAVE_AVISO_UNION) ?? '';
      sessionStorage.removeItem(CLAVE_AVISO_UNION);
    } catch {
      return;
    }
    if (!texto) return;
    const t = setTimeout(() => setAviso(texto), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div role="status" aria-live="polite">
      {aviso && (
        <p className="card-tactil mb-4 flex items-center justify-between gap-3 border-cesped p-4 text-sm font-semibold text-basalto">
          {aviso}
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setAviso('')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-pizarra hover:bg-piedra hover:text-basalto"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </p>
      )}
    </div>
  );
}
