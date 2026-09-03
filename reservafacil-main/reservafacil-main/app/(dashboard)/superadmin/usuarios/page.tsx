import * as api from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { ToggleUsuarioBtn } from '@/components/features/ToggleUsuarioBtn'
import { CambiarRolBtn } from '@/components/features/CambiarRolBtn'
export const dynamic = 'force-dynamic'
const rolBadge: Record<string, 'green' | 'blue' | 'red'> = {
  USUARIO: 'green', ADMIN: 'blue', SUPERADMIN: 'red',
}

export default async function UsuariosPage() {
  const usuarios = await api.getUsuarios()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="text-gray-500 mt-1">Administra roles y accesos</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Registro</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{u.nombre}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-6 py-4"><Badge variant={rolBadge[u.rol]}>{u.rol}</Badge></td>
                <td className="px-6 py-4">
                  <Badge variant={u.activo ? 'green' : 'red'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(u.creadoEn).toLocaleDateString('es-PE')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <CambiarRolBtn id={u.id} rolActual={u.rol} />
                    <ToggleUsuarioBtn id={u.id} activo={u.activo} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}