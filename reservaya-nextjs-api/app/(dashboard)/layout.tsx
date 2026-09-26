import { requireAuth } from '@/lib/session';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      <Sidebar
        rol={session.rol}
        nombre={session.nombre}
        email={session.email}
      />
      <main className="relative min-w-0 flex-1 overflow-y-auto">
        {/* pt-16 hasta lg: deja libre el botón de menú fijo (Sidebar, left-4 top-4). */}
        <div className="px-4 pb-4 pt-16 sm:px-6 sm:pb-6 md:px-8 md:pb-8 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
