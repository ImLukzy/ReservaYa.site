import * as api from '@/lib/api'
import { GestionCanchasPanel } from '@/components/features/GestionCanchasPanel'
export const dynamic = 'force-dynamic'
export default async function AdminCanchasPage() {
  const canchas = await api.getCanchas()
  return <GestionCanchasPanel canchas={canchas} />
}