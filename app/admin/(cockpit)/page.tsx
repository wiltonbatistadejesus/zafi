import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Cockpit from '@/components/ceo/Cockpit'
import { getCockpitData } from '@/lib/ceo/data'
import CockpitLiveRefresh from '@/components/ceo/CockpitLiveRefresh'
import { hasValidCeoSession } from '@/lib/ceo/auth'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'CEO Cockpit · Zafi', robots: { index: false, follow: false } }

type SearchParams = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined) {
  return typeof value === 'string' ? value.slice(0, 200) : ''
}

export default async function AdminCockpitPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  if (!hasValidCeoSession()) redirect('/admin/login')
  const fromDate = one(searchParams.from)
  const toDate = one(searchParams.to)
  const data = await getCockpitData({
    from: /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? `${fromDate}T00:00:00-03:00` : undefined,
    to: /^\d{4}-\d{2}-\d{2}$/.test(toDate) ? `${toDate}T23:59:59-03:00` : undefined,
    channel: one(searchParams.channel) || null,
    campaign: one(searchParams.campaign) || null,
    source: one(searchParams.source) || null,
    eventType: one(searchParams.event_type) || null,
  })
  return <><CockpitLiveRefresh /><Cockpit data={data} /></>
}
