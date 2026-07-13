import type { MetadataRoute } from 'next'
import { seoArticles } from '@/lib/seo-content'

const baseUrl = 'https://meuzafi.com.br'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/guias`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...seoArticles.map((article) => ({ url: `${baseUrl}/${article.slug}`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 })),
  ]
}
