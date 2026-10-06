'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { logout as apiLogout } from '@/lib/api-client';
import { publicAppUrl } from '@/lib/public-app';
import { Marca } from '@/components/ui/Marca';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Clock,
  ClipboardCheck,
  ScanLine,
  Search,
  Wallet,
  BarChart3,
  TicketPercent,
  Building2,
  Store,
  User,
  UserPlus,
  Users,
  Star,
  Settings,
  Trophy,
  CircleHelp,
  House,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';

export type RolSidebar = 'USUARIO' | 'ADMIN' | 'SUPERADMIN' | 'TECNICO';

interface SidebarProps {
  rol: RolSidebar;
  nombre: string;
  email: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  beta?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ICON = { size: 20, strokeWidth: 1.85 } as const;

// Menús finales por rol (spec 55 §4). Lo que no está aquí sigue accesible por enlace
// directo si el rol tiene permiso (permissions.ts), pero no compite en el menú.
const MENU: Record<RolSidebar, NavGroup[]> = {
  USUARIO: [
    {
      label: '',
      items: [
        { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
        { href: '/dashboard/canchas', label: 'Reservar cancha', icon: Search },
        { href: '/dashboard/reservas', label: 'Mis reservas', icon: CalendarDays },
        { href: '/dashboard/partidos', label: 'Mis partidos', icon: Users },
        { href: '/dashboard/perfil', label: 'Mi perfil', icon: User },
      ],
    },
    {
      label: '',
      items: [{ href: '/dashboard/publicar-centro', label: 'Publica tu centro', icon: Store }],
    },
  ],
  ADMIN: [
    {
      label: 'Operación',
      items: [
        { href: '/admin/agenda', label: 'Cronograma', icon: CalendarClock },
        { href: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
        { href: '/admin/caja', label: 'Caja', icon: Wallet },
        { href: '/admin/validar-codigo', label: 'Validar código', icon: ScanLine },
        { href: '/admin/torneos', label: 'Torneos', icon: Trophy, beta: true },
      ],
    },
    {
      label: '',
      items: [{ href: '/admin/ayuda', label: 'Cómo usar el panel', icon: CircleHelp }],
    },
  ],
  SUPERADMIN: [
    {
      label: '',
      items: [{ href: '/admin', label: 'Inicio', icon: LayoutDashboard }],
    },
    {
      label: 'Operación',
      items: [
        { href: '/admin/agenda', label: 'Cronograma', icon: CalendarClock },
        { href: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
        { href: '/admin/caja', label: 'Caja', icon: Wallet },
        { href: '/admin/validar-codigo', label: 'Validar código', icon: ScanLine },
      ],
    },
    {
      label: 'Negocio',
      items: [
        { href: '/admin/clientes', label: 'Clientes', icon: Users },
        { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
    {
      label: 'Gestión',
      items: [
        { href: '/admin/complejos', label: 'Mis centros', icon: Building2 },
        { href: '/admin/canchas', label: 'Canchas', icon: Trophy },
        { href: '/admin/horarios', label: 'Horarios', icon: Clock },
        { href: '/admin/equipo', label: 'Trabajadores', icon: UserPlus },
        { href: '/admin/resenas', label: 'Opiniones', icon: Star },
        { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
      ],
    },
    {
      label: '',
      items: [{ href: '/admin/ayuda', label: 'Guía para empezar', icon: CircleHelp }],
    },
  ],
  TECNICO: [
    {
      label: 'Revisión',
      items: [
        { href: '/tecnico', label: 'Resumen', icon: LayoutDashboard },
        { href: '/tecnico/solicitudes', label: 'Solicitudes', icon: ClipboardCheck },
        { href: '/tecnico/suscripciones', label: 'Suscripciones', icon: TicketPercent },
      ],
    },
    {
      label: 'Plataforma',
      items: [
        { href: '/tecnico/centros', label: 'Centros deportivos', icon: Building2 },
        { href: '/admin/canchas', label: 'Canchas', icon: Trophy },
        { href: '/tecnico/usuarios', label: 'Usuarios', icon: Users },
        { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
  ],
};

// Las raíces (/dashboard, /admin, /tecnico) solo se marcan en su propia ruta.
const RAICES = new Set(['/dashboard', '/admin', '/tecnico']);
const esActivo = (pathname: string, href: string) =>
  pathname === href || (!RAICES.has(href) && pathname.startsWith(href + '/'));

const rolLabel: Record<RolSidebar, string> = {
  USUARIO: 'Jugador',
  ADMIN: 'Trabajador',
  SUPERADMIN: 'Dueño',
  TECNICO: 'Supervisor',
};

export function Sidebar({ rol, nombre, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const groups = MENU[rol];

  useEffect(() => {
    const onRestore = () => {
      void fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
        .then((r) => {
          if (!r.ok) window.location.replace('/login');
        })
        .catch(() => window.location.replace('/login'));
    };
    window.addEventListener('pageshow', onRestore);
    return () => window.removeEventListener('pageshow', onRestore);
  }, []);

  async function logout() {
    try {
      await apiLogout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  const initial = (nombre.trim().charAt(0) || 'R').toUpperCase();

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md bg-noche p-2 text-tiza shadow-lg lg:hidden"
      >
        <Menu size={ICON.size} strokeWidth={ICON.strokeWidth} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-velo lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[16.25rem] flex-shrink-0 flex-col bg-noche transition-transform ease-resorte duration-(--dur-resorte) lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Cabecera */}
        <div className="flex h-[5.5rem] shrink-0 items-center gap-2 border-b border-tiza/10 px-6">
          {/* Misma Marca que la cabecera pública; rol y "Panel" debajo, alineados con el nombre. */}
          <div className="min-w-0">
            <Marca tono="noche" href={`${publicAppUrl}/`} />
            <p className="-mt-2 flex items-center gap-2 pl-9 text-xs text-niebla">
              <span className="truncate">{rolLabel[rol]}</span>
              <span className="rounded-md bg-cesped/15 px-1.5 py-0.5 font-semibold text-cesped-vivo">Panel</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-md p-2 text-niebla hover:text-tiza lg:hidden"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Nav agrupada: cada grupo separado por una línea de cal */}
        <nav className="flex-1 overflow-y-auto py-2">
          <Link
            href={`${publicAppUrl}/`}
            onClick={() => setOpen(false)}
            className="mx-3 flex items-center gap-3 border-l-[0.1875rem] border-transparent px-3 py-2.5 text-sm font-medium text-niebla transition-colors hover:text-tiza"
          >
            <House size={ICON.size} strokeWidth={ICON.strokeWidth} className="h-5 w-5 shrink-0" aria-hidden="true" />
            Página principal
          </Link>
          {groups.map((group, gi) => (
            <div
              key={`${group.label || 'g'}-${gi}`}
              className={cn('mt-4 pt-1', gi > 0 && !group.label && 'border-t border-tiza/10 pt-4')}
            >
              {group.label && (
                <p className="mb-2 px-6 font-display text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-niebla">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5 px-3">
                {group.items.map(({ href, label, icon: Icon, beta }) => {
                  const active = esActivo(pathname, href);
                  return (
                    <li key={href} className="relative">
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-r-md border-l-[0.1875rem] px-3 py-2.5 text-sm transition-colors',
                          active
                            ? 'border-cesped-vivo bg-cesped/20 font-semibold text-tiza'
                            : 'border-transparent font-medium text-niebla hover:bg-tiza/5 hover:text-tiza'
                        )}
                      >
                        <Icon size={ICON.size} strokeWidth={ICON.strokeWidth} className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                        {beta && (
                          <span className="ml-auto rounded-md bg-cesped/20 px-1.5 py-0.5 font-display text-xs font-semibold text-cesped-suave">
                            BETA
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Usuario */}
        <div className="border-t border-tiza/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cesped font-display text-base font-bold text-tiza">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-tiza">{nombre}</p>
              <p className="truncate text-xs text-niebla">{email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-niebla transition-colors hover:bg-tiza/5 hover:text-tiza"
          >
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
