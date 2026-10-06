import { requireRole } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ADMIN (trabajador de la sede), SUPERADMIN (dueño) y TECNICO (plataforma).
  // Cada página filtra además con canAccess().
  await requireRole(['ADMIN', 'SUPERADMIN', 'TECNICO']);

  return <>{children}</>;
}
