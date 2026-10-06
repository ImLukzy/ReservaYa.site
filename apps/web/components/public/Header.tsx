'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { apiRequest } from '@/lib/http'
import { logout } from '@/lib/api-client'
import { ApiError, type UsuarioSesion } from '@/lib/api-types'
import { fallbackPorRol } from '@/lib/permissions'
import { Marca } from '@/components/ui/Marca'
import Icon from './ui/Icon'

const menus = [
  { titulo: 'Dueños', items: [['/duenos', 'Publicar mis canchas'], ['/duenos#planes', 'Planes y precios'], ['/login', 'Entrar al panel']] },
]
const linkClass = 'flex min-h-11 items-center rounded-control px-3 font-medium text-pizarra hover:bg-cesped-suave hover:text-basalto aria-[current=page]:text-cesped-hondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped'

export default function Header() {
  const path = usePathname()
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saliendo, setSaliendo] = useState(false)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<{ usuario: UsuarioSesion }>('/api/auth/me', { signal: controller.signal })
      .then(body => setUsuario(body.usuario))
      .catch(cause => {
        if (controller.signal.aborted) return
        if (cause instanceof ApiError && cause.status === 401) return
        setError('No pudimos comprobar tu sesión. Puedes volver a entrar.')
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setAbierto(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      ref.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus()
      setAbierto(null)
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', escape) }
  }, [])
  async function salir() {
    setSaliendo(true)
    try { await logout(); setUsuario(null); setAbierto(null); setError('') }
    catch { setError('No pudimos cerrar tu sesión. Inténtalo de nuevo.') }
    finally { setSaliendo(false) }
  }
  const active = (href: string) => path === href ? 'page' : undefined
  const toggle = (name: string) => setAbierto(abierto === name ? null : name)
  const account = usuario && <>
    <p className="truncate px-3 font-semibold">{usuario.nombre}</p>
    <p className="truncate px-3 text-sm text-pizarra">{usuario.email}</p>
    <a href="/dashboard/perfil" className={linkClass}>Mi perfil</a>
    <a href="/dashboard/reservas" className={linkClass}>Mis reservas</a>
    <a href={fallbackPorRol(usuario.rol)} className={linkClass}>Mi panel</a>
    <button type="button" onClick={salir} disabled={saliendo} className={`${linkClass} w-full`}>Salir</button>
  </>
  return <header ref={ref} className="sticky top-0 z-40 border-b border-cal bg-sillar/95">
    <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6" aria-label="Principal">
      <div className="flex items-center gap-6"><Marca />
        <ul className="hidden items-center gap-1 lg:flex">
          <li><a href="/canchas" aria-current={active('/canchas')} className={linkClass}>Canchas</a></li>
          <li><a href="/jugar" aria-current={active('/jugar')} className={linkClass}>Jugar</a></li>
          {menus.map(menu => <li key={menu.titulo} className="relative">
            <button type="button" className={linkClass} aria-expanded={abierto === menu.titulo} aria-controls={`menu-${menu.titulo}`} onClick={() => toggle(menu.titulo)}>{menu.titulo}<Icon nombre="abajo" className="ml-1 h-4 w-4" /></button>
            <div id={`menu-${menu.titulo}`} hidden={abierto !== menu.titulo} className="card-tactil absolute left-0 top-14 min-w-56 p-2 shadow-suave-lg">
              {menu.items.map(([href, text]) => <a key={href} href={href} className={linkClass} aria-current={active(href)}>{text}</a>)}
            </div>
          </li>)}
          <li><a href="/ayuda" aria-current={active('/ayuda')} className={linkClass}>Ayuda</a></li>
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <a href="/duenos" className="btn-tactil btn-tactil--claro hidden min-h-11 bg-tiza px-5 text-sm text-basalto xl:inline-flex">Publicar mis canchas</a>
        {!usuario && <>
          <a href="/login" className={`${linkClass} hidden sm:flex`}>Iniciar sesión</a>
          <a href="/register" className="btn-tactil btn-vivo min-h-11 px-3.5 text-sm font-bold sm:px-5">Registrarse</a>
        </>}
        {usuario && <div className="relative hidden lg:block">
          <button type="button" aria-expanded={abierto === 'cuenta'} aria-controls="cuenta-menu" onClick={() => toggle('cuenta')} className="flex min-h-11 items-center gap-2 rounded-full border border-cal px-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cesped-hondo text-xs font-bold text-tiza">{usuario.nombre?.split(/\s+/).slice(0, 2).map(p => p[0]).join('')}</span><span className="max-w-32 truncate text-xs font-bold">{usuario.nombre}</span><Icon nombre="abajo" />
          </button>
          <div id="cuenta-menu" hidden={abierto !== 'cuenta'} className="card-tactil absolute right-0 top-12 w-64 p-2 shadow-suave-lg">{account}</div>
        </div>}
        <button type="button" aria-label={abierto === 'movil' ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto === 'movil'} aria-controls="menu-movil-principal" onClick={() => toggle('movil')} className="flex h-11 w-11 items-center justify-center rounded-control hover:bg-piedra lg:hidden"><Icon nombre="menu" className="h-6 w-6" /></button>
      </div>
    </nav>
    <div id="menu-movil-principal" hidden={abierto !== 'movil'} className="border-t border-cal px-4 pb-4 lg:hidden">
      <a href="/canchas" className={linkClass}>Canchas</a>
      <a href="/jugar" className={linkClass} aria-current={active('/jugar')}>Jugar</a>
      {menus.map(menu => <section key={menu.titulo}><h2 className="px-3 py-2 text-sm font-semibold text-pizarra">{menu.titulo}</h2>{menu.items.map(([href, text]) => <a key={href} href={href} className={linkClass}>{text}</a>)}</section>)}
      <a href="/ayuda" className={linkClass}>Ayuda</a>
      {!usuario && <a href="/login" className={`${linkClass} sm:hidden`}>Iniciar sesión</a>}{account}
    </div>
    {error && <p role="status" className="absolute inset-x-0 top-full bg-error-suave px-4 text-sm text-error">{error}</p>}
  </header>
}
