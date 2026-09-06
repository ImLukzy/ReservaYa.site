import { Check } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { cn } from '@/lib/utils';

const STEPS = [
  { t: 'Crea tu complejo', d: 'Registra sede, dirección y WhatsApp', href: '/admin/complejos/nuevo' },
  { t: 'Agrega tus canchas', d: 'Tipo, precio por hora y formato', href: '/admin/canchas' },
  { t: 'Configura tus horarios', d: 'Turnos sin solapamientos automáticos', href: '/admin/configuracion' },
  { t: 'Sube tus fotos', d: '5+ fotos = +40% reservas', href: '/admin/complejos' },
  { t: 'Comparte tu página', d: 'QR + link para WhatsApp', href: '/admin/complejos' },
] as const;

export function OnboardingChecklist({ done = 0 }: { done?: number }) {
  return (
    <div>
      <TopBar breadcrumb="Extras / Centro de ayuda" title="Activa tu negocio en 5 pasos" />
      <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
        <ol className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-[#E2E8F0]">
          {STEPS.map((s, i) => {
            const ok = i < done;
            const current = i === done;
            return (
              <li key={s.t} className="relative flex gap-4 pl-1">
                <span
                  className={cn(
                    'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    ok
                      ? 'border-[#22C55E] bg-[#22C55E] text-white'
                      : 'border-[#E2E8F0] bg-white text-[#94A3B8]'
                  )}
                >
                  {ok ? <Check size={18} strokeWidth={2.5} /> : <span className="text-sm font-bold">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#0F172A]">{s.t}</p>
                  <p className="text-[14px] leading-relaxed text-[#475569]">{s.d}</p>
                  {!ok && (
                    <a
                      href={s.href}
                      className={cn(
                        'mt-2 inline-block rounded-lg px-4 py-2 text-sm font-bold transition-all active:scale-[0.98]',
                        current
                          ? 'bg-[#22C55E] text-white hover:bg-[#16A34A] hover:shadow-md'
                          : 'border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
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
