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
  'ai',
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

// Solo plataforma ve dinero agregado global. El dueño ve lo suyo en sus páginas.
export function canSeeMoney(rol: Rol): boolean {
  return rol === 'TECNICO' || rol === 'SUPERADMIN';
}

export function fallbackPorRol(rol: Rol): string {
  if (rol === 'TECNICO') return '/tecnico';
  if (rol === 'SUPERADMIN') return '/admin';
  if (rol === 'ADMIN') return '/admin/agenda';
  return '/dashboard';
}
