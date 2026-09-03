import { requireRole } from '@/lib/session'

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['USUARIO'])

  return <>{children}</>
}