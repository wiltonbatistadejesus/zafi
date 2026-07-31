import type { Metadata } from 'next'
import ContentStudioDetail from '@/components/content-studio/ContentStudioDetail'
import { getStudioContent } from '@/lib/content-studio/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Revisão de conteúdo · Zafi', robots: { index: false, follow: false } }

export default async function ContentDetailPage({ params, searchParams }: { params: { contentId: string }; searchParams: { notice?: string } }) {
  const content = await getStudioContent(params.contentId)
  return <ContentStudioDetail content={content} notice={searchParams.notice} />
}
