import type { Metadata } from 'next'
import CouncilDashboard from '@/components/council/CouncilDashboard'
import { getAdminSession } from '@/lib/ceo/auth'
import { getCouncilDashboard } from '@/lib/council/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Conselho Estratégico · Zafi',
  robots: { index: false, follow: false },
}

export default async function CouncilPage() {
  const session = getAdminSession()!
  const dashboard = await getCouncilDashboard()
  return <CouncilDashboard dashboard={dashboard} session={session} />
}
