'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function Countdown({ target }: { target: string }) {
  const router = useRouter()
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(target).getTime() - Date.now()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, new Date(target).getTime() - Date.now()))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [target])

  useEffect(() => {
    if (remaining === 0) router.replace('/dashboard')
  }, [remaining, router])

  const totalMinutes = Math.floor(remaining / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  return <span>{remaining === 0 ? 'Finalizado' : days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`}</span>
}
