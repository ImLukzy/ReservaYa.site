'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api-types';
import { logout } from '@/lib/api-client';
import { refrescarSesion } from '@/lib/solicitudes-client';
import { aceptarInvitacion, rechazarInvitacion } from '@/lib/invitaciones-client';
import { CLAVE_AVISO_UNION, avisoUnion, haceCuanto, type Invitacion } from '@/lib/invitaciones';
import { avisarCambioInvitaciones } from './useInvitaciones';

const DESTINO = '/admin';

type Fase = 'idle' | 'confirmar' | 'aceptando' | 'rechazando';

// Tras aceptar: cookie nueva con el rol de BD (POST /api/auth/refrescar) y
// navegación dura al panel, donde AvisoUnion muestra la confirmación.
async function entrarAlPanel(complejo: string) {
  try {
    sessionStorage.setItem(CLAVE_AVISO_UNION, avisoUnion(complejo));
  } catch {
    // Sin almacenamiento el aviso se pierde; la navegación sigue.
  }
  try {
    await refrescarSesion();
    window.location.assign(DESTINO);
  } catch {
    await logout().catch(() => undefined);
    window.location.assign(`/login?sesion=cambio&returnUrl=${encodeURIComponent(DESTINO)}`);
  }
}

function Item({ inv, idBase, onQuitar, onEstado }: {
  inv: Invitacion;
  idBase: string;
  onQuitar: (id: string) => void;
  onEstado: (mensaje: string) => void;
}) {
  const [fase, setFase] = useState<Fase>('idle');
  const [error, setError] = useState('');
  const titulo = `${idBase}-${inv.id}`;
  const volverFoco = useRef(false);
  const ocupado = fase === 'aceptando' || fase === 'rechazando';

  useEffect(() => {
    if (fase === 'confirmar') document.getElementById(`${titulo}-si`)?.focus();
    else if (fase === 'idle' && volverFoco.current) {
      volverFoco.current = false;
      document.getElementById(`${titulo}-rechazar`)?.focus();
    }
  }, [fase, titulo]);

  function noDisponible(error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      onQuitar(inv.id);
      onEstado(`La invitación de ${inv.complejo.nombre} ya no está disponible.`);
      avisarCambioInvitaciones();
      return true;
    }
    return false;
  }

  async function aceptar() {
    setFase('aceptando');
    setError('');
    try {
      const res = await aceptarInvitacion(inv.id);
      onEstado(`Uniéndote al equipo de ${res.complejo?.nombre ?? inv.complejo.nombre}…`);
      await entrarAlPanel(res.complejo?.nombre ?? inv.complejo.nombre);
    } catch (e) {
      if (noDisponible(e)) return;
      setError(e instanceof Error ? e.message : 'No se pudo aceptar. Inténtalo de nuevo.');
      setFase('idle');
    }
  }

  async function rechazar() {
    setFase('rechazando');
    setError('');
    try {
      await rechazarInvitacion(inv.id);
      onQuitar(inv.id);
      onEstado(`Rechazaste la invitación de ${inv.complejo.nombre}.`);
      avisarCambioInvitaciones();
    } catch (e) {
      if (noDisponible(e)) return;
      setError(e instanceof Error ? e.message : 'No se pudo rechazar. Inténtalo de nuevo.');
      volverFoco.current = true;
      setFase('idle');
    }
  }

  return (
    <li className="py-3" aria-labelledby={titulo} aria-busy={ocupado || undefined}>
      <p id={titulo} className="text-sm font-bold text-basalto">{inv.complejo.nombre}</p>
      <p className="mt-0.5 text-xs text-pizarra">
        {inv.invitadoPor ? `${inv.invitadoPor.nombre} te invitó` : 'Te invitaron'} a su equipo
        {inv.complejo.distrito && ` · ${inv.complejo.distrito}`}
        {' · '}
        <time dateTime={inv.creadoEn}>{haceCuanto(inv.creadoEn)}</time>
      </p>
      {fase === 'confirmar' ? (
        <div className="mt-2" role="group" aria-label={`Confirmar rechazo de ${inv.complejo.nombre}`}>
          <p className="text-xs font-semibold text-basalto">¿Rechazar la invitación? El dueño tendría que invitarte de nuevo.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button id={`${titulo}-si`} size="sm" variant="danger" onClick={() => void rechazar()}>
              Sí, rechazar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                volverFoco.current = true;
                setFase('idle');
              }}
            >
              No
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void aceptar()} loading={fase === 'aceptando'} disabled={ocupado}>
            Aceptar
          </Button>
          <Button
            id={`${titulo}-rechazar`}
            size="sm"
            variant="secondary"
            onClick={() => setFase('confirmar')}
            loading={fase === 'rechazando'}
            disabled={ocupado}
          >
            Rechazar
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-error">{error}</p>}
    </li>
  );
}

/** Lista accionable de invitaciones; `onEstado` recibe mensajes para una región aria-live. */
export function ListaInvitaciones({ invitaciones, idBase, onQuitar, onEstado }: {
  invitaciones: Invitacion[];
  /** Prefijo de ids: la campana y la tarjeta pueden mostrar la misma invitación a la vez. */
  idBase: string;
  onQuitar: (id: string) => void;
  onEstado: (mensaje: string) => void;
}) {
  return (
    <ul className="divide-y divide-cal">
      {invitaciones.map((inv) => (
        <Item key={inv.id} inv={inv} idBase={idBase} onQuitar={onQuitar} onEstado={onEstado} />
      ))}
    </ul>
  );
}
