import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { seoArticleMap, seoArticles } from '@/lib/seo-content'

export function generateStaticParams() {
  return seoArticles.map(({ slug }) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = seoArticleMap[params.slug]
  return article ? { title: article.title, description: article.description, alternates: { canonical: `/${article.slug}` }, openGraph: { title: article.title, description: article.description, type: 'article', url: `/${article.slug}` } } : {}
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = seoArticleMap[params.slug]
  if (!article) notFound()
  const related = seoArticles.filter((item) => item.category === article.category && item.slug !== article.slug).slice(0, 3)
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.description, inLanguage: 'pt-BR', author: { '@type': 'Organization', name: 'Zafi', url: 'https://meuzafi.com.br' }, publisher: { '@type': 'Organization', name: 'Zafi', url: 'https://meuzafi.com.br' }, mainEntityOfPage: `https://meuzafi.com.br/${article.slug}` }

  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><article className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm sm:p-10"><Link href="/guias" className="text-sm font-bold text-blue-700">← Guias Zafi</Link><p className="mt-8 text-xs font-bold uppercase tracking-widest text-blue-700">{article.category}</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">{article.title}</h1><p className="mt-4 text-lg leading-relaxed text-slate-600">{article.intro}</p><ol className="mt-10 space-y-6">{article.steps.map(([title, text], index) => <li key={title} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</span><div><h2 className="font-bold">{title}</h2><p className="mt-1 leading-relaxed text-slate-600">{text}</p></div></li>)}</ol>{article.source && <p className="mt-8 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">Para consultar ofertas, acesse somente o <a href={article.source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline">{article.source.label}</a>.</p>}{related.length > 0 && <section className="mt-10 border-t border-slate-200 pt-8"><h2 className="font-bold">Continue aprendendo</h2><div className="mt-3 flex flex-col gap-2">{related.map((item) => <Link key={item.slug} href={`/${item.slug}`} className="text-sm font-semibold text-blue-700 hover:underline">{item.title} →</Link>)}</div></section>}<div className="mt-10 rounded-2xl bg-blue-50 p-5"><p className="font-bold text-blue-950">Quer organizar seu próximo passo?</p><p className="mt-1 text-sm text-blue-900">Faça um diagnóstico gratuito e receba uma ordem para lidar com suas dívidas.</p><Link href="/" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Fazer diagnóstico</Link></div><p className="mt-8 text-xs leading-relaxed text-slate-500">Conteúdo educativo. Condições financeiras dependem da análise e das regras de cada credor.</p></article></main>
}
