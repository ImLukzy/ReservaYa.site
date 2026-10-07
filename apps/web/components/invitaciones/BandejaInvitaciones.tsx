'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { anuncioNuevas, contador, etiquetaBandeja } from '@/lib/invitaciones';
import { useInvitaciones } from './useInvitaciones';
import { ListaInvitaciones } from './ListaInvitaciones';

// Bandeja de invitaciones de equipo: campana con contador (solo si hay
// pendientes) y panel desplegable con Aceptar/Rechazar. Va en el Header
// público y en el Sidebar del panel para cualquier usuario con sesión.
export function BandejaInvitaciones({
  tono = 'claro',
  abreHacia = 'abajo',
  onCambio,
  className,
}: {
  tono?: 'claro' | 'noche';
  /** 'arriba' se posiciona respecto al contenedor relativo más cercano (pasar className="static"). */
  abreHacia?: 'abajo' | 'arriba';
  /** Número de pendientes, p. ej. para marcar el botón de menú móvil. */
  onCambio?: (pendientes: number) => void;
  className?: string;
}) {
  const { invitaciones, quitar } = useInvitaciones();
  const [abierta, setAbierta] = useState(false);
  const [estado, setEstado] = useState('');
  const [anuncio, setAnuncio] = useState('');
  const previo = useRef(0);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const tituloId = useId();
  const n = invitaciones.length;

  // Anuncia solo las que llegan nuevas y avisa al contenedor.
  useEffect(() => {
    const texto = anuncioNuevas(previo.current, n);
    previo.current = n;
    onCambio?.(n);
    if (!texto) return;
    const t = setTimeout(() => setAnuncio(texto), 0);
    return () => clearTimeout(t);
  }, [n, onCambio]);

  useEffect(() => {
    if (!abierta) return;
    const fuera = (event: MouseEvent) => {
      if (event.target instanceof Node && !raiz.current?.contains(event.target)) setAbierta(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setAbierta(false);
      boton.current?.focus();
    };
    document.addEventListener('click', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierta]);

  const cifra = contador(n);
  return (
    <div ref={raiz} className={cn('relative', className)}>
      <button
        ref={boton}
        type="button"
        aria-label={etiquetaBandeja(n)}
        aria-expanded={abierta}
        aria-controls={panelId}
        onClick={() => {
          setEstado('');
          setAbierta((v) => !v);
        }}
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped',
          tono === 'noche' ? 'text-niebla hover:bg-tiza/5 hover:text-tiza' : 'border border-cal text-pizarra hover:text-basalto'
        )}
      >
        <Bell size={20} strokeWidth={1.85} aria-hidden="true" />
        {cifra && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[0.6875rem] font-bold leading-none text-sillar"
          >
            {cifra}
          </span>
        )}
      </button>
      <p className="sr-only" aria-live="polite">{anuncio}</p>
      <div
        id={panelId}
        role="region"
        aria-labelledby={tituloId}
        hidden={!abierta}
        className={cn(
          'card-tactil absolute z-50 w-[min(22rem,calc(100vw-2rem))] p-4 text-left shadow-suave-lg',
          abreHacia === 'abajo' ? 'right-0 top-12' : 'bottom-full left-3 mb-2'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={tituloId} className="text-sm font-bold text-basalto">Invitaciones de equipo</h2>
          <button
            type="button"
            aria-label="Cerrar invitaciones"
            onClick={() => {
              setAbierta(false);
              boton.current?.focus();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-pizarra hover:bg-piedra hover:text-basalto"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <p role="status" className="text-xs text-pizarra empty:hidden">{estado}</p>
        {abierta && (n === 0 ? (
          <p className="py-4 text-sm text-pizarra">No tienes invitaciones pendientes.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <ListaInvitaciones idBase={`${panelId}-i`} invitaciones={invitaciones} onQuitar={quitar} onEstado={setEstado} />
          </div>
        ))}
      </div>
    </div>
  );
}
