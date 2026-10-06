'use client';

import { useEffect, useState } from 'react';
import type { Solicitud } from '@/lib/api-types';
import { getMiSolicitud } from '@/lib/solicitudes-client';

const CADA_MS = 30_000;

/**
 * Estado de la solicitud del jugador. Mientras está pendiente consulta
 * `GET /api/solicitudes/mias` cada 30 s y al volver a la pestaña (spec 55 §8.2).
 */
export function useMiSolicitud(inicial: Solicitud | null) {
  const [solicitud, setSolicitud] = useState<Solicitud | null>(inicial);
  const pendiente = solicitud?.estado === 'PENDIENTE';

  useEffect(() => {
    if (!pendiente) return;
    const abort = new AbortController();
    const consultar = () => {
      if (document.visibilityState !== 'visible') return;
      getMiSolicitud(abort.signal)
        .then((s) => {
          if (!abort.signal.aborted) setSolicitud(s);
        })
        .catch(() => {
          // Sin red o API reiniciando: el próximo intento vuelve a consultar.
        });
    };
    const id = window.setInterval(consultar, CADA_MS);
    document.addEventListener('visibilitychange', consultar);
    return () => {
      abort.abort();
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', consultar);
    };
  }, [pendiente]);

  return [solicitud, setSolicitud] as const;
}
