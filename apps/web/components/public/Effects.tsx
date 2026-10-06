'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function Effects() {
  const pathname = usePathname()
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>('.public-site .revelar')
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -80px 0px' })
    blocks.forEach(block => observer.observe(block))
    return () => observer.disconnect()
  }, [pathname])
  return null
}
