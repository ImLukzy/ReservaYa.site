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
        <div className="p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
