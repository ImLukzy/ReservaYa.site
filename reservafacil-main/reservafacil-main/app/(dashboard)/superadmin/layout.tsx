import { requireRole } from '@/lib/session'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['SUPERADMIN'])

  return <>{children}</>
}