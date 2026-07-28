import type { Metadata } from 'next'
import ContentFactoryReview from '@/components/ceo/ContentFactoryReview'
import { contentFactoryPilots } from '@/lib/content-factory/pilots'

export const metadata: Metadata = {
  title: 'Content Factory · CEO Review · Zafi',
  robots: { index: false, follow: false },
}

export default function ContentFactoryPage() {
  return <ContentFactoryReview pilots={contentFactoryPilots} />
}
