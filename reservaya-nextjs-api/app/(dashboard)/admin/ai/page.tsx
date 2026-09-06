import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';

export const dynamic = 'force-dynamic';

// Sin backend: tarjeta informativa + sugerencias estáticas de uso futuro.
const SUGERENCIAS = [
  '¿Cuál fue mi mejor día del mes y por qué?',
  '¿Qué cancha me deja más plata por hora?',
  '¿A qué hora debería subir mis precios?',
  'Resume mis reservas pendientes de hoy.',
] as const;

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!canAccess('ai', session.rol)) redirect(fallbackPorRol(session.rol));

  return (
    <div>
      <div>
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#15803D]">✨ ANÁLISIS</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">ReservaYa AI</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Tu asistente para entender tus números sin mirar planillas.
        </p>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl bg-[#060C08] p-8 text-center text-white md:p-12">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-[420px] -translate-x-1/2 rounded-full bg-[#22C55E]/25 blur-3xl" />
        <span className="rounded-full border border-[#22C55E]/40 px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-[#4ADE80]">
          ✨ PRÓXIMAMENTE
        </span>
        <p className="mt-4 text-3xl font-black">
          Reserva<span className="text-[#4ADE80]">Ya</span> AI
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
          Pregúntale por tus números y te responde al toque: ocupación, hora pico,
          cancha estrella y qué hacer mañana.
        </p>
        <div className="mx-auto mt-6 grid max-w-lg gap-2 text-left">
          {SUGERENCIAS.map((s) => (
            <p key={s} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70">
              “{s}”
            </p>
          ))}
        </div>
        <Link
          href="/admin/reportes"
          className="mx-auto mt-6 block max-w-lg rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Explorar reportes →
        </Link>
      </div>

      <WhatsAppFloat />
    </div>
  );
}
