'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Compass } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PASOS_GUIA } from '@/lib/onboarding';
import { claveGuia, guiaAbierta } from '@/lib/solicitudes';
import { cn } from '@/lib/utils';

// Marca en localStorage: 'omitida' (cerró antes de terminar) o 'vista' (llegó al final).
// Un evento propio avisa a otras instancias de la misma pestaña.
const EVENTO = 'ry-guia-dueno';
function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return 'sin-almacenamiento'; // modo privado o bloqueado: no se abre sola cada vez
  }
}
function guardar(clave: string, valor: 'omitida' | 'vista') {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento: la guía no se recuerda, pero se puede seguir usando.
  }
  window.dispatchEvent(new Event(EVENTO));
}
function suscribir(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener('storage', aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener('storage', aviso);
  };
}

interface GuiaDuenoProps {
  usuarioId: string;
  /** `completados[i]` = paso i hecho (`pasosOnboarding`). */
  completados: readonly boolean[];
  /** `?guia=1`: abrir aunque ya se haya visto. */
  pedida?: boolean;
  /** Abrir sola si nunca se vio (solo en el inicio del dueño). */
  primeraVez?: boolean;
  /** Mostrar el botón para reabrirla. */
  boton?: boolean;
}

/** Guía del dueño en 5 pasos (spec 55 F4): se abre sola la primera vez, se puede omitir y reabrir. */
export function GuiaDueno({ usuarioId, completados, pedida = false, primeraVez = false, boton = false }: GuiaDuenoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const clave = claveGuia(usuarioId);
  // En el servidor no hay marca: se asume vista para no pintar el diálogo y luego quitarlo.
  const marca = useSyncExternalStore(suscribir, () => leer(clave), () => 'servidor');
  const [manual, setManual] = useState<boolean | null>(null);
  const primera = PASOS_GUIA.findIndex((_, i) => !completados[i]);
  const [paso, setPaso] = useState(primera === -1 ? 0 : primera);

  const automatica = guiaAbierta(primeraVez ? marca : 'no-aplica', pedida);
  const abierta = manual ?? automatica;
  const ultimo = paso === PASOS_GUIA.length - 1;
  const actual = PASOS_GUIA[paso];
  const hecho = Boolean(completados[paso]);
  const hechos = PASOS_GUIA.filter((_, i) => completados[i]).length;

  function cerrar(valor: 'omitida' | 'vista') {
    guardar(clave, valor);
    setManual(false);
    if (pedida) router.replace(pathname, { scroll: false });
  }

  return (
    <>
      {boton && (
        <Button variant="secondary" onClick={() => { setPaso(primera === -1 ? 0 : primera); setManual(true); }}>
          <Compass size={18} strokeWidth={2} aria-hidden="true" />
          Abrir la guía paso a paso
        </Button>
      )}
      <Modal open={abierta} onClose={() => cerrar('omitida')} title="Deja listo tu centro" tono="claro">
        <p className="text-sm text-pizarra">
          Paso {paso + 1} de {PASOS_GUIA.length} · {hechos} hechos
        </p>
        <ol className="mt-2 flex gap-1.5" aria-hidden="true">
          {PASOS_GUIA.map((p, i) => (
            <li
              key={p.titulo}
              className={cn('h-1.5 flex-1 rounded-full', i === paso ? 'bg-cesped' : completados[i] ? 'bg-cesped/40' : 'bg-piedra')}
            />
          ))}
        </ol>

        <div className="mt-5 min-h-[9.5rem]" aria-live="polite">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-basalto">
            {actual.titulo}
            {hecho && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cesped-suave px-2 py-0.5 text-xs font-bold text-cesped-hondo">
                <Check size={14} strokeWidth={2.5} aria-hidden="true" /> Hecho
              </span>
            )}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-pizarra">{actual.texto}</p>
          <Link
            href={actual.href}
            onClick={() => cerrar(ultimo ? 'vista' : 'omitida')}
            className="btn-tactil mt-4 bg-cesped px-5 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover"
          >
            {actual.accion}
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-cal pt-4">
          <Button variant="ghost" size="sm" onClick={() => cerrar('omitida')}>
            Omitir guía
          </Button>
          <div className="flex gap-2">
            {paso > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setPaso(paso - 1)}>
                Anterior
              </Button>
            )}
            {ultimo ? (
              <Button size="sm" onClick={() => cerrar('vista')}>Terminar</Button>
            ) : (
              <Button size="sm" onClick={() => setPaso(paso + 1)}>Siguiente</Button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-pizarra">Puedes volver a abrirla cuando quieras desde «Guía para empezar».</p>
      </Modal>
    </>
  );
}
