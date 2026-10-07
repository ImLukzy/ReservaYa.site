'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-types';
import type { Invitacion } from '@/lib/invitaciones';
import { getMisInvitaciones } from '@/lib/invitaciones-client';

const SONDEO_MS = 60_000;
// Avisa a las demás bandejas montadas (campana + tarjeta) que la lista cambió.
export const EVENTO_INVITACIONES = 'ry:invitaciones';

export function avisarCambioInvitaciones() {
  window.dispatchEvent(new Event(EVENTO_INVITACIONES));
}

/**
 * Invitaciones pendientes del usuario con sesión. Consulta al montar, al volver
 * la pestaña a primer plano y, con `sondeo`, cada 60 s solo mientras está visible.
 * 401/404 (sin sesión o API sin el endpoint) se tratan como lista vacía.
 */
export function useInvitaciones({ sondeo = true }: { sondeo?: boolean } = {}) {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [cargada, setCargada] = useState(false);

  const consultar = useCallback(async (signal?: AbortSignal) => {
    try {
      const lista = await getMisInvitaciones(signal);
      if (!signal?.aborted) setInvitaciones(lista);
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        setInvitaciones([]);
      }
      // Fallo de red: se conserva la última lista conocida y se reintenta en el próximo ciclo.
    } finally {
      if (!signal?.aborted) setCargada(true);
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const ciclo = () => {
      controller.abort();
      controller = new AbortController();
      void consultar(controller.signal);
    };
    const detener = () => {
      if (intervalo) clearInterval(intervalo);
      intervalo = undefined;
    };
    const arrancar = () => {
      detener();
      if (sondeo) intervalo = setInterval(ciclo, SONDEO_MS);
    };
    const onVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        ciclo();
        arrancar();
      } else {
        detener();
      }
    };
    ciclo();
    if (document.visibilityState === 'visible') arrancar();
    document.addEventListener('visibilitychange', onVisibilidad);
    window.addEventListener(EVENTO_INVITACIONES, ciclo);
    return () => {
      controller.abort();
      detener();
      document.removeEventListener('visibilitychange', onVisibilidad);
      window.removeEventListener(EVENTO_INVITACIONES, ciclo);
    };
  }, [consultar, sondeo]);

  const quitar = useCallback((id: string) => {
    setInvitaciones((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { invitaciones, cargada, quitar };
}
