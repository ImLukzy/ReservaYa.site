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
  Sparkles,
  BarChart3,
  Target,
  TicketPercent,
  Tag,
  HandCoins,
  Building2,
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
      { href: '/admin/ai', label: 'ReservaYa AI', icon: Sparkles },
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
    label: 'Operación',
    items: [
      { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
      { href: '/dashboard/reservas', label: 'Mis Reservas', icon: CalendarDays },
      { href: '/dashboard/canchas', label: 'Canchas', icon: Trophy },
      { href: '/dashboard/mi-partido', label: 'Mi partido', icon: ScanLine },
      { href: '/dashboard/perfil', label: 'Mi perfil', icon: Users },
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
        className="fixed left-4 top-4 z-40 rounded-lg bg-[#060C08] p-2 text-white shadow-lg lg:hidden"
      >
        <Menu size={ICON.size} strokeWidth={ICON.strokeWidth} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-shrink-0 flex-col bg-[#060C08] transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Cabecera */}
        <div className="flex items-center gap-2 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E] text-xl shadow-lg shadow-black/30">
            🏟️
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-white">
              Reserva<span className="text-[#22C55E]">Ya</span>
            </p>
            <p className="text-xs text-[#94A3B8]">{rolLabel[rol]}</p>
          </div>
          <span className="ml-1 rounded-md bg-[#22C55E]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#4ADE80]">
            Panel
          </span>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-2 text-[#94A3B8] hover:text-white lg:hidden"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Nav agrupada */}
        <nav className="flex-1 overflow-y-auto pb-4">
          <Link
            href={publicAppUrl}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-6 py-2.5 text-[14px] font-medium text-[#94A3B8] transition-colors hover:text-white"
          >
            <House size={ICON.size} strokeWidth={ICON.strokeWidth} className="h-5 w-5 shrink-0" />
            Página principal
          </Link>
          {groups.map((group, gi) => (
            <div key={`${group.label || 'g'}-${gi}`}>
              {group.label ? (
                <p className="mb-3 mt-6 px-6 text-[11px] font-bold uppercase tracking-[0.1em] text-[#475569]">
                  {group.label}
                </p>
              ) : (
                <div className="mt-4" aria-hidden />
              )}
              <ul className="space-y-1 px-3">
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
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold transition-colors',
                          active
                            ? 'bg-[#22C55E]/20 text-[#4ADE80]'
                            : isTorneos
                              ? 'text-[#EAB308] hover:bg-white/5 hover:text-[#FACC15]'
                              : 'font-medium text-[#94A3B8] hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <Icon size={ICON.size} strokeWidth={ICON.strokeWidth} className="h-5 w-5 shrink-0" />
                        <span className="truncate">{label}</span>
                        {beta && (
                          <span className="ml-auto rounded bg-[#EAB308]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#EAB308]">
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{nombre}</p>
              <p className="truncate text-xs text-[#94A3B8]">{email}</p>
            </div>
          </div>
          <a
            href={publicAppUrl}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
          >
            <House size={16} strokeWidth={2} />
            Ir a la app
          </a>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} strokeWidth={2} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
