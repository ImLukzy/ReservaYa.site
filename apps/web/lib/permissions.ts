import type { Rol } from './api';

// Modelo de roles:
// - USUARIO: jugador (solo /dashboard).
// - ADMIN: trabajador (operación diaria de la sede de su dueño).
// - SUPERADMIN: dueño (gestión de sus complejos + clientes que reservaron).
// - TECNICO: plataforma (poder total: usuarios, suscripciones, centros).
const MODULOS_ADMIN_TRABAJADOR = [
  'agenda',
  'caja',
  'validar-codigo',
  'reservas',
  'torneos',
  'ayuda',
] as const;

const MODULOS_DUENO: readonly string[] = [
  ...MODULOS_ADMIN_TRABAJADOR,
  'complejos',
  'canchas',
  'equipo',
  'descuentos',
  'precios-especiales',
  'abonos',
  'resenas',
  'reportes',
  'metas',
  'configuracion',
  'novedades',
  'clientes',
  'horarios',
];

export function canAccess(modulo: string, rol: Rol): boolean {
  if (rol === 'TECNICO') return true;
  if (rol === 'SUPERADMIN') return (MODULOS_DUENO as readonly string[]).includes(modulo);
  if (rol === 'ADMIN')
    return (MODULOS_ADMIN_TRABAJADOR as readonly string[]).includes(modulo);
  return false;
}

export function fallbackPorRol(rol: Rol): string {
  if (rol === 'TECNICO') return '/tecnico';
  if (rol === 'SUPERADMIN') return '/admin';
  if (rol === 'ADMIN') return '/admin/agenda';
  return '/dashboard';
}

// "Mi perfil" vive dentro del panel de cada rol (proxy.ts deja /dashboard solo a USUARIO).
export function perfilPorRol(rol: Rol): string {
  if (rol === 'TECNICO') return '/tecnico/perfil';
  if (rol === 'ADMIN' || rol === 'SUPERADMIN') return '/admin/perfil';
  return '/dashboard/perfil';
}
