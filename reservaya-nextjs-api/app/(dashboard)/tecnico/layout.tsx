import { requireRole } from '@/lib/session';

export default async function TecnicoLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['TECNICO']);

  return <>{children}</>;
}
