import * as api from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { ToggleUsuarioBtn } from '@/components/features/ToggleUsuarioBtn';
import { CambiarRolBtn } from '@/components/features/CambiarRolBtn';
import { HistorialUsuarioBtn } from '@/components/features/HistorialUsuarioBtn';

export const dynamic = 'force-dynamic';

const rolBadge: Record<string, 'green' | 'blue' | 'red' | 'gray'> = {
  USUARIO: 'green',
  ADMIN: 'blue',
  SUPERADMIN: 'red',
  TECNICO: 'gray',
};

export default async function UsuariosPage() {
  const usuarios = await api.getUsuarios();

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cesped-hondo">Plataforma ReservaYa</p>
        <h1 className="mt-2 text-3xl font-black text-basalto">Gestión de Usuarios</h1>
        <p className="text-pizarra mt-1">Activa, desactiva, cambia roles y revisa historiales.</p>
      </div>

      <div className="bg-tiza rounded-2xl shadow-sm border border-cal/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-tiza border-b border-cal">
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Usuario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Rol</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-pizarra uppercase">Registro</th>
                <th className="px-6 py-3 text-xs font-semibold text-pizarra uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-tiza">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-basalto">{u.nombre}</p>
                    <p className="text-xs text-pizarra">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={rolBadge[u.rol] ?? 'gray'}>{u.rol}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.activo ? 'green' : 'red'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-pizarra">
                    {new Date(u.creadoEn).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <CambiarRolBtn id={u.id} rolActual={u.rol} />
                      <ToggleUsuarioBtn id={u.id} activo={u.activo} />
                      <HistorialUsuarioBtn id={u.id} nombre={u.nombre} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
