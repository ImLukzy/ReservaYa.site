import { Barlow, Barlow_Condensed } from 'next/font/google';
import { requireAuth } from '@/lib/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

// Tipografía «Tablero de cancha» (spec 21 §4): Barlow cuerpo, Barlow Condensed señalética.
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--ff-barlow',
});
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--ff-barlow-condensed',
});

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <div
      className={cn(
        barlow.variable,
        barlowCondensed.variable,
        'flex h-screen overflow-hidden bg-sillar font-cuerpo text-basalto'
      )}
    >
      <Sidebar
        rol={session.rol}
        nombre={session.nombre}
        email={session.email}
      />
      <main className="relative min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {/* pt-16 hasta lg: deja libre el botón de menú fijo (Sidebar, left-4 top-4). */}
        <div className="px-4 pb-4 pt-16 sm:px-6 sm:pb-6 md:px-8 md:pb-8 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
