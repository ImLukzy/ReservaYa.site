'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { logout } from '@/lib/api-client';
import { refrescarSesion } from '@/lib/solicitudes-client';

const PANEL_CON_GUIA = '/admin?guia=1';

// Tras la aprobación, pide a la API una cookie con el rol nuevo (spec 55 §8.2) y entra
// al panel de dueño con la guía abierta. Si no se puede, cierra sesión y vuelve al login
// con un aviso claro en vez de un error.
export function IrAPanelDueno({ className }: { className?: string }) {
  const [cargando, setCargando] = useState(false);

  async function ir() {
    setCargando(true);
    try {
      const { usuario } = await refrescarSesion();
      if (usuario?.rol !== 'SUPERADMIN') throw new Error('rol');
      window.location.assign(PANEL_CON_GUIA);
    } catch {
      await logout().catch(() => undefined);
      window.location.assign(`/login?sesion=cambio&returnUrl=${encodeURIComponent(PANEL_CON_GUIA)}`);
    }
  }

  return (
    <Button onClick={ir} loading={cargando} className={className}>
      Ir a mi panel de dueño
      {!cargando && <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />}
    </Button>
  );
}
