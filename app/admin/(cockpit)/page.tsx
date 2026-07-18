import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Cockpit from '@/components/ceo/Cockpit'
import { getCockpitData } from '@/lib/ceo/data'
import CockpitLiveRefresh from '@/components/ceo/CockpitLiveRefresh'
import { hasValidCeoSession } from '@/lib/ceo/auth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'CEO Cockpit · Zafi', robots: { index: false, follow: false } }

export default async function AdminCockpitPage() {
  if (!hasValidCeoSession()) redirect('/admin/login')
  const data = await getCockpitData()
  return <><CockpitLiveRefresh /><Cockpit data={data} /></>
}
