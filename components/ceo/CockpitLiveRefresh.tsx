'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CockpitLiveRefresh() {
  const router = useRouter()
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 10_000)
    return () => window.clearInterval(timer)
  }, [router])
  return null
}
