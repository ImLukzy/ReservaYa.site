'use client'
import { useState } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
export function AccionesPerfil({ direccion, telefono, url }: { direccion?: string; telefono?: string; url?: string }) {
  const [mensaje, setMensaje] = useState('')
  async function copiar(texto: string) { try { await navigator.clipboard.writeText(texto); setMensaje('Copiado.') } catch { setMensaje('No se pudo copiar. Selecciona el texto para copiarlo.') } }
  async function compartir() { if (!url) return; try { if (navigator.share) await navigator.share({ title: 'ReservaYa', url }); else await copiar(url) } catch { setMensaje('No se compartió el enlace.') } }
  return <><div className="flex flex-wrap gap-2">
    {direccion && <Button apariencia="publica" variante="secundario" onClick={() => void copiar(direccion)}><Copy size={16} />Copiar dirección</Button>}
    {telefono && <Button apariencia="publica" variante="secundario" onClick={() => void copiar(telefono)}><Copy size={16} />Copiar número</Button>}
    {url && <Button apariencia="publica" variante="secundario" onClick={() => void compartir()}><Share2 size={16} />Compartir</Button>}
  </div><p role="status" className="min-h-6 text-sm text-pizarra">{mensaje}</p></>
}
