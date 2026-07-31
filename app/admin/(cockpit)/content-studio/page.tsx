import type { Metadata } from 'next'
import ContentStudioDashboard from '@/components/content-studio/ContentStudioDashboard'
import { getStudioDashboard } from '@/lib/content-studio/server'
import type { StudioFilters } from '@/lib/content-studio/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Content Studio · Zafi', robots: { index: false, follow: false } }

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ContentStudioPage({ searchParams }: { searchParams: SearchParams }) {
  const filters: StudioFilters = {
    status: first(searchParams.status), network: first(searchParams.network),
    category: first(searchParams.category), format: first(searchParams.format),
    query: first(searchParams.query), created: first(searchParams.created),
  }
  const dashboard = await getStudioDashboard(filters)
  return <ContentStudioDashboard dashboard={dashboard} filters={filters} notice={first(searchParams.notice)} />
}
