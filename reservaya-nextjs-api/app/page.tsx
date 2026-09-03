import { redirect } from 'next/navigation'
import { publicAppUrl } from '@/lib/public-app'

export default function HomePage() {
  redirect(publicAppUrl)
}