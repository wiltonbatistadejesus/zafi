import type { Metadata } from 'next'
import Link from 'next/link'
import { seoArticles } from '@/lib/seo-content'

export const metadata: Metadata = { title: 'Guias para sair das dívidas | Zafi', description: 'Orientações práticas para organizar, negociar e sair das dívidas com mais segurança.', alternates: { canonical: '/guias' } }
const categories = ['Primeiros passos', 'Tipos de dívida', 'Renegociação', 'Bancos'] as const

export default function GuidesPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Guias Zafi', url: 'https://meuzafi.com.br/guias', hasPart: seoArticles.map((article) => ({ '@type': 'Article', name: article.title, url: `https://meuzafi.com.br/${article.slug}` })) }
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm font-bold text-blue-700">← Zafi</Link><p className="mt-8 text-xs font-bold uppercase tracking-widest text-blue-700">Conteúdo gratuito</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Guias para retomar o controle</h1><p className="mt-3 max-w-2xl text-slate-600">Informação clara para entender a dívida, comparar condições e decidir sem pressão.</p>{categories.map((category) => <section key={category} className="mt-10"><h2 className="text-lg font-extrabold text-slate-900">{category}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{seoArticles.filter((article) => article.category === category).map((article) => <Link key={article.slug} href={`/${article.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"><h3 className="font-bold text-slate-900">{article.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{article.description}</p><span className="mt-4 inline-block text-sm font-bold text-blue-700">Ler guia →</span></Link>)}</div></section>)}</div></main>
}
