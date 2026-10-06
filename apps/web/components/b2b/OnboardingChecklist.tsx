import Link from 'next/link';
import { Check } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { PASOS_GUIA } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

/** `completados[i]` = paso i hecho (ver `pasosOnboarding` en lib/onboarding.ts). `accion`: botón de la guía. */
export function OnboardingChecklist({
  completados = [],
  accion,
}: {
  completados?: readonly boolean[];
  accion?: React.ReactNode;
}) {
  const actual = PASOS_GUIA.findIndex((_, i) => !completados[i]);
  const hechos = PASOS_GUIA.filter((_, i) => completados[i]).length;
  return (
    <div>
      <TopBar breadcrumb="Guía para empezar" title="Deja listo tu centro en 5 pasos" />
      <div className="card-tactil mx-auto mt-6 max-w-2xl p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-pizarra">
            {hechos} de {PASOS_GUIA.length} pasos completados
          </p>
          {accion}
        </div>
        <ol className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[0.9375rem] before:w-px before:bg-cal">
          {PASOS_GUIA.map((s, i) => {
            const ok = Boolean(completados[i]);
            const current = i === actual;
            return (
              <li key={s.titulo} className="relative flex gap-4 pl-1">
                <span
                  className={cn(
                    'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                    ok ? 'border-cesped bg-cesped text-tiza' : 'border-cal bg-tiza text-pizarra'
                  )}
                >
                  {ok ? <Check size={18} strokeWidth={2.5} aria-label="Hecho" /> : <span className="text-sm font-bold">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] font-semibold text-basalto">{s.titulo}</p>
                  <p className="text-[0.875rem] leading-relaxed text-pizarra">{s.texto}</p>
                  {!ok && (
                    <Link
                      href={s.href}
                      className={cn(
                        'btn-tactil mt-2 px-4 py-2 text-sm font-bold',
                        current
                          ? 'bg-cesped text-tiza hover:bg-cesped-hover'
                          : 'btn-tactil--claro bg-tiza text-basalto hover:bg-piedra'
                      )}
                    >
                      {s.accion}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <WhatsAppFloat />
    </div>
  );
}
