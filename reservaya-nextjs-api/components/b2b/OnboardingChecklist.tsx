import { Check } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn } from '@/lib/utils';

const STEPS = [
  { t: 'Crea tu complejo', d: 'Registra sede, dirección y WhatsApp', href: '/admin/complejos/nuevo' },
  { t: 'Agrega tus canchas', d: 'Tipo, precio por hora y formato', href: '/admin/canchas' },
  { t: 'Configura tus horarios', d: 'Turnos sin solapamientos automáticos', href: '/admin/horarios' },
  { t: 'Sube tus fotos', d: '5+ fotos = +40% reservas', href: '/admin/canchas' },
  { t: 'Comparte tu página', d: 'QR + link para WhatsApp', href: '/admin/complejos' },
] as const;

/** `completados[i]` = paso i hecho (ver `pasosOnboarding` en lib/onboarding.ts). */
export function OnboardingChecklist({ completados = [] }: { completados?: readonly boolean[] }) {
  const actual = STEPS.findIndex((_, i) => !completados[i]);
  const hechos = STEPS.filter((_, i) => completados[i]).length;
  return (
    <div>
      <TopBar breadcrumb="Extras / Centro de ayuda" title="Activa tu negocio en 5 pasos" />
      <div className="card-tactil mx-auto mt-6 max-w-2xl p-8">
        <p className="mb-6 text-sm font-semibold text-pizarra">
          {hechos} de {STEPS.length} pasos completados
        </p>
        <ol className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[0.9375rem] before:w-px before:bg-cal">
          {STEPS.map((s, i) => {
            const ok = Boolean(completados[i]);
            const current = i === actual;
            return (
              <li key={s.t} className="relative flex gap-4 pl-1">
                <span
                  className={cn(
                    'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    ok
                      ? 'border-cesped bg-cesped text-tiza'
                      : 'border-cal bg-tiza text-pizarra'
                  )}
                >
                  {ok ? <Check size={18} strokeWidth={2.5} /> : <span className="text-sm font-bold">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] font-semibold text-basalto">{s.t}</p>
                  <p className="text-[0.875rem] leading-relaxed text-pizarra">{s.d}</p>
                  {!ok && (
                    <a
                      href={s.href}
                      className={cn(
                        'btn-tactil mt-2 inline-block px-4 py-2 text-sm font-bold',
                        current
                          ? 'bg-cesped text-tiza hover:bg-cesped-hover'
                          : 'border-cal bg-tiza text-pizarra hover:bg-piedra hover:text-basalto'
                      )}
                    >
                      {current ? 'Empezar' : 'Ver guía'}
                    </a>
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
