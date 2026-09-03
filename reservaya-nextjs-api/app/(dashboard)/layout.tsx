import { requireAuth } from '@/lib/session'
import { Sidebar } from '@/components/layout/Sidebar'
import * as api from '@/lib/api'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const reservasConfirmadas = session.rol === 'USUARIO'
    ? (await api.getReservas()).some((reserva) => reserva.estado === 'CONFIRMADA')
    : false

  return (
    <div className="dashboard-shell flex min-h-screen">
      <Sidebar
        rol={session.rol}
        nombre={session.nombre}
        email={session.email}
        mostrarMiPartido={reservasConfirmadas}
      />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}