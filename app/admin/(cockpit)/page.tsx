import type { Metadata } from 'next'
import Cockpit from '@/components/ceo/Cockpit'
import { getCockpitData } from '@/lib/ceo/data'
import CockpitLiveRefresh from '@/components/ceo/CockpitLiveRefresh'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'CEO Cockpit · Zafi', robots: { index: false, follow: false } }

export default async function AdminCockpitPage() {
  const data = await getCockpitData()
  return <><CockpitLiveRefresh /><Cockpit data={data} /></>
}
