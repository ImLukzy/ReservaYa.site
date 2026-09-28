'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { logout as apiLogout } from '@/lib/api-client';
import { publicAppUrl } from '@/lib/public-app';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  ScanLine,
  Wallet,
  BarChart3,
  Target,
  TicketPercent,
  Tag,
  HandCoins,
  Building2,
  User,
  Users,
  Star,
  Settings,
  Trophy,
  Newspaper,
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

const GROUPS_ADMIN: NavGroup[] = [
  {
    label: '',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Operación',
    items: [
      { href: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
      { href: '/admin/agenda', label: 'Cronograma', icon: CalendarClock },
      { href: '/admin/caja', label: 'Caja', icon: Wallet },
      { href: '/admin/validar-codigo', label: 'Validar código', icon: ScanLine },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
      { href: '/admin/metas', label: 'Metas', icon: Target },
    ],
  },
  {
    label: 'Promociones',
    items: [
      { href: '/admin/descuentos', label: 'Descuentos', icon: TicketPercent },
      { href: '/admin/precios-especiales', label: 'Precios especiales', icon: Tag },
      { href: '/admin/abonos', label: 'Abonos', icon: HandCoins },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/admin/complejos', label: 'Complejos', icon: Building2 },
      { href: '/admin/canchas', label: 'Canchas', icon: Building2 },
      { href: '/admin/horarios', label: 'Horarios', icon: CalendarClock },
      { href: '/admin/equipo', label: 'Equipo', icon: Users },
      { href: '/admin/resenas', label: 'Reseñas', icon: Star },
      { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
  {
    label: '',
    items: [
      { href: '/admin/torneos', label: 'Torneos', icon: Trophy, beta: true },
      { href: '/admin/novedades', label: 'Novedades', icon: Newspaper },
      { href: '/admin/ayuda', label: '¿Cómo usar el panel?', icon: CircleHelp },
    ],
  },
];

const GROUPS_USUARIO: NavGroup[] = [
  {
    label: '',
    items: [
      { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
      { href: '/dashboard/reservas', label: 'Mis Reservas', icon: CalendarDays },
      { href: '/dashboard/canchas', label: 'Canchas', icon: Trophy },
      { href: '/dashboard/partidos', label: 'Mis partidos', icon: Users },
      { href: '/dashboard/mi-partido', label: 'Próxima reserva', icon: ScanLine },
      { href: '/dashboard/perfil', label: 'Mi perfil', icon: User },
    ],
  },
];

const GROUPS_ADMIN_TRABAJADOR: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { href: '/admin/agenda', label: 'Cronograma', icon: CalendarClock },
      { href: '/admin/caja', label: 'Caja', icon: Wallet },
      { href: '/admin/validar-codigo', label: 'Validar código', icon: ScanLine },
      { href: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
      { href: '/admin/torneos', label: 'Torneos', icon: Trophy, beta: true },
    ],
  },
  {
    label: '',
    items: [{ href: '/admin/ayuda', label: '¿Cómo usar el panel?', icon: CircleHelp }],
  },
];

const GROUPS_TECNICO: NavGroup[] = [
  {
    label: 'Plataforma',
    items: [
      { href: '/tecnico', label: 'Panel', icon: LayoutDashboard },
      { href: '/tecnico/suscripciones', label: 'Suscripciones', icon: TicketPercent },
      { href: '/tecnico/centros', label: 'Centros deportivos', icon: Building2 },
      { href: '/tecnico/usuarios', label: 'Usuarios', icon: Users },
    ],
  },
  {
    label: 'Operación',
    items: [
      { href: '/admin/canchas', label: 'Canchas', icon: Trophy },
      { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
      { href: '/admin/ayuda', label: '¿Cómo usar el panel?', icon: CircleHelp },
    ],
  },
];

function groupsFor(rol: RolSidebar): NavGroup[] {
  if (rol === 'USUARIO') return GROUPS_USUARIO;
  if (rol === 'TECNICO') return GROUPS_TECNICO;
  if (rol === 'ADMIN') return GROUPS_ADMIN_TRABAJADOR;
  if (rol === 'SUPERADMIN')
    return [
      {
        label: 'Operación',
        items: [
          { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/admin/clientes', label: 'Clientes', icon: Users },
        ],
      },
      ...GROUPS_ADMIN.filter((g) => g.label === 'Operación' || g.label === 'Gestión'),
    ];
  return GROUPS_ADMIN;
}

const rolLabel: Record<RolSidebar, string> = {
  USUARIO: 'Jugador',
  ADMIN: 'Trabajador',
  SUPERADMIN: 'Dueño',
  TECNICO: 'Plataforma',
};

export function Sidebar({ rol, nombre, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const groups = groupsFor(rol);

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
        className="fixed left-4 top-4 z-40 rounded-md bg-grafito p-2 text-tiza shadow-lg lg:hidden"
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
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-shrink-0 flex-col bg-grafito transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Cabecera */}
        <div className="flex h-[88px] shrink-0 items-center gap-2 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cesped text-xl" aria-hidden="true">
            🏟️
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold leading-none text-tiza">
              Reserva<span className="text-cesped">Ya</span>
            </p>
            <p className="mt-1 text-xs text-niebla">{rolLabel[rol]}</p>
          </div>
          <span className="ml-1 rounded-md bg-cesped/15 px-1.5 py-0.5 font-display text-xs font-semibold text-cesped">
            Panel
          </span>
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
            href={publicAppUrl}
            onClick={() => setOpen(false)}
            className="mx-3 flex items-center gap-3 border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-niebla transition-colors hover:text-tiza"
          >
            <House size={ICON.size} strokeWidth={ICON.strokeWidth} className="h-5 w-5 shrink-0" aria-hidden="true" />
            Página principal
          </Link>
          {groups.map((group, gi) => (
            <div key={`${group.label || 'g'}-${gi}`} className="mt-3 border-t border-white/10 pt-3">
              {group.label && (
                <p className="mb-2 px-6 font-display text-sm font-semibold text-niebla">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5 px-3">
                {group.items.map(({ href, label, icon: Icon, beta }) => {
                  const active = pathname === href;
                  const isTorneos = href === '/admin/torneos';
                  return (
                    <li key={href} className="relative">
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-r-md border-l-[3px] px-3 py-2.5 text-sm transition-colors',
                          active
                            ? 'border-cesped bg-white/[0.06] font-semibold text-tiza'
                            : isTorneos
                              ? 'border-transparent font-medium text-sol hover:bg-white/5'
                              : 'border-transparent font-medium text-niebla hover:bg-white/5 hover:text-tiza'
                        )}
                      >
                        <Icon size={ICON.size} strokeWidth={ICON.strokeWidth} className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                        {beta && (
                          <span className="ml-auto rounded-md bg-sol/20 px-1.5 py-0.5 font-display text-xs font-semibold text-sol">
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
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cesped font-display text-base font-bold text-grafito">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-tiza">{nombre}</p>
              <p className="truncate text-xs text-niebla">{email}</p>
            </div>
          </div>
          <a
            href={publicAppUrl}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-niebla transition-colors hover:bg-white/5 hover:text-tiza"
          >
            <House size={16} strokeWidth={2} aria-hidden="true" />
            Ir a la app
          </a>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-niebla transition-colors hover:bg-white/5 hover:text-tiza"
          >
            <LogOut size={16} strokeWidth={2} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
