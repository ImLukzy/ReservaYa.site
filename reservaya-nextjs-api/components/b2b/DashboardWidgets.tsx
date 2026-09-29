'use client';

import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

export function NovedadCard() {
  const [cerrada, setCerrada] = useState(false);
  if (cerrada) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cal bg-tiza p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cesped-suave text-lg">
        💳
      </span>
      <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-pizarra">
        <strong className="font-bold text-basalto">
          Novedad: desde octubre tus jugadores podrán pagarte online
        </strong>
        <br />
        Se suma el pago con tarjeta y Yape por Culqi. El pago con captura sigue igual.{' '}
        <a href="/admin/novedades" className="font-bold text-cesped-hondo hover:underline">
          Ver más
        </a>
      </p>
      <a
        href="/admin/novedades"
        aria-label="Ver novedad"
        className="shrink-0 p-1 text-cesped-hondo"
      >
        <ArrowRight size={18} strokeWidth={2} />
      </a>
      <button
        onClick={() => setCerrada(true)}
        aria-label="Descartar"
        className="shrink-0 p-1 text-pizarra hover:text-basalto"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
