'use client';

import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

export function NovedadCard() {
  const [cerrada, setCerrada] = useState(false);
  if (cerrada) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E7E5E4] bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DCFCE7] text-lg">
        💳
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#3F4A44]">
        <strong className="font-bold text-[#101613]">
          Novedad: desde octubre tus jugadores podrán pagarte online
        </strong>
        <br />
        Se suma el pago con tarjeta y Yape por Culqi. El pago con captura sigue igual.{' '}
        <a href="/admin/novedades" className="font-bold text-[#15803D] hover:underline">
          Ver más
        </a>
      </p>
      <a
        href="/admin/novedades"
        aria-label="Ver novedad"
        className="shrink-0 p-1 text-[#15803D]"
      >
        <ArrowRight size={18} strokeWidth={2} />
      </a>
      <button
        onClick={() => setCerrada(true)}
        aria-label="Descartar"
        className="shrink-0 p-1 text-[#94A3B8] hover:text-[#101613]"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
