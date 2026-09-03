import * as api from '@/lib/api'
import type { DashboardSuperadmin } from '@/lib/api'
import { StatCard } from '@/components/ui/Card'
import Link from 'next/link'
export const dynamic = 'force-dynamic'
export default async function SuperAdminPage() {
  const dashboard = (await api.getDashboard()) as DashboardSuperadmin
  const usuarios = dashboard.usuarios
  const admins = dashboard.administradores
  const reservas = dashboard.reservas
  const ingresos = dashboard.ingresos

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel Superadmin</h1>
        <p className="text-gray-500 mt-1">Vista global del sistema</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Usuarios" value={usuarios} icon="👤" color="blue" />
        <StatCard label="Admins" value={admins} icon="🛡️" color="yellow" />
        <StatCard label="Reservas" value={reservas} icon="📅" color="green" />
        <StatCard label="Ingresos (S/)" value={Number(ingresos)} icon="💰" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/superadmin/usuarios" className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-semibold text-gray-900">Gestionar Usuarios</h3>
          <p className="text-gray-500 text-sm mt-1">Crea admins, desactiva cuentas</p>
        </Link>
        <Link href="/superadmin/canchas" className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition">
          <div className="text-3xl mb-3">🏟️</div>
          <h3 className="font-semibold text-gray-900">Gestionar Canchas</h3>
          <p className="text-gray-500 text-sm mt-1">Crea y edita canchas del sistema</p>
        </Link>
        <Link href="/superadmin/reportes" className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-gray-900">Reportes</h3>
          <p className="text-gray-500 text-sm mt-1">Estadísticas y métricas globales</p>
        </Link>
      </div>
    </div>
  )
}