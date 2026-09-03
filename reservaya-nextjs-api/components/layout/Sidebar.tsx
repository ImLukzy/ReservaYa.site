'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { logout as apiLogout } from '@/lib/api-client'
import { publicAppUrl } from '@/lib/public-app'
import {
  LayoutDashboard, Calendar, Home,
  Users, Building2, BarChart3, LogOut, Trophy, Menu, X
} from 'lucide-react'

interface SidebarProps {
  rol: 'USUARIO' | 'ADMIN' | 'SUPERADMIN'
  nombre: string
  email: string
  mostrarMiPartido?: boolean
}

const navPorRol = {
  USUARIO: [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/dashboard/reservas', label: 'Mis Reservas', icon: Calendar },
    { href: '/dashboard/canchas', label: 'Canchas', icon: Trophy },
  ],
  ADMIN: [
    { href: '/admin', label: 'Panel Admin', icon: LayoutDashboard },
    { href: '/admin/canchas', label: 'Canchas', icon: Building2 },
    { href: '/admin/reservas', label: 'Reservas', icon: Calendar },
  ],
  SUPERADMIN: [
    { href: '/superadmin', label: 'Panel General', icon: LayoutDashboard },
    { href: '/superadmin/usuarios', label: 'Usuarios', icon: Users },
    { href: '/superadmin/reportes', label: 'Reportes', icon: BarChart3 },
    { href: '/superadmin/canchas', label: 'Canchas', icon: Building2 },
  ],
}

const rolColors = {
  USUARIO: 'bg-[#a6192e]',
  ADMIN: 'bg-[#7d1728]',
  SUPERADMIN: 'bg-[#cf3048]',
}

const rolLabel = {
  USUARIO: 'Usuario',
  ADMIN: 'Administrador',
  SUPERADMIN: 'Super Admin',
}

export function Sidebar({ rol, nombre, email, mostrarMiPartido = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const nav = mostrarMiPartido && rol === 'USUARIO'
    ? [...navPorRol[rol], { href: '/dashboard/mi-partido', label: 'Mi partido', icon: Trophy }]
    : navPorRol[rol]

  useEffect(() => {
    const validateSessionAfterRestore = () => {
      void fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
        .then((response) => {
          if (!response.ok) window.location.replace('/login')
        })
        .catch(() => window.location.replace('/login'))
    }

    window.addEventListener('pageshow', validateSessionAfterRestore)
    return () => window.removeEventListener('pageshow', validateSessionAfterRestore)
  }, [])

  async function logout() {
    try {
      await apiLogout()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-xl bg-[#1b1112] p-2 text-white shadow-lg lg:hidden"
      >
        <Menu size={20} />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 min-h-screen bg-[#1b1112] flex flex-col border-r border-[#513238] transition-transform duration-200 lg:static lg:w-64 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
      {/* Logo */}
      <div className="p-6 border-b border-[#513238]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#cf3048] to-[#7d1728] rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-black/30">
            🏟️
          </div>
          <div>
            <p className="text-white font-bold text-sm">ReservaFácil</p>
            <p className="text-gray-400 text-xs">{rolLabel[rol]}</p>
          </div>
          <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="ml-auto p-2 text-gray-400 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <a
          href={publicAppUrl}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#c6b6aa] hover:bg-[#2a191b] hover:text-white transition"
        >
          <Home size={18} strokeWidth={1.8} />
          Página principal
        </a>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
                active
                  ? 'bg-[#a6192e] text-white shadow-lg shadow-black/30'
                  : 'text-[#c6b6aa] hover:bg-[#2a191b] hover:text-white'
              )}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-[#513238]">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold', rolColors[rol])}>
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{nombre}</p>
            <p className="text-gray-500 text-xs truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-[#c6b6aa] hover:text-[#ef9b9f] hover:bg-[#2a191b] rounded-lg text-sm transition"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
      </aside>
    </>
  )
}