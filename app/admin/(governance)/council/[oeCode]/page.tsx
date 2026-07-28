import type { Metadata } from 'next'
import ExecutiveOrderDetail from '@/components/council/ExecutiveOrderDetail'
import { getAdminSession } from '@/lib/ceo/auth'
import { getExecutiveOrder } from '@/lib/council/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Ordem Executiva · Conselho Estratégico · Zafi',
  robots: { index: false, follow: false },
}

export default async function ExecutiveOrderPage({
  params,
  searchParams,
}: {
  params: { oeCode: string }
  searchParams: { notice?: string }
}) {
  const session = getAdminSession()!
  const order = await getExecutiveOrder(decodeURIComponent(params.oeCode))
  const privateStorageConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  return (
    <ExecutiveOrderDetail
      order={order}
      session={session}
      notice={searchParams.notice}
      privateStorageConfigured={privateStorageConfigured}
    />
  )
}
