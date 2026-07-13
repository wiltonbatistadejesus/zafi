import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/oraculo/Breadcrumbs'
import KnowledgeCard from '@/components/oraculo/KnowledgeCard'
import { categoryMap, entries, entryHref, entryMap, relatedEntries, SITE_URL } from '@/lib/oraculo'

export const generateStaticParams = () => entries.map(({ category, slug }) => ({ category, slug }))
const findEntry = (category: string, slug: string) => entryMap[slug]?.category === category ? entryMap[slug] : undefined

export function generateMetadata({ params }: { params: { category: string; slug: string } }): Metadata {
  const entry = findEntry(params.category, params.slug); if (!entry) return {}; const path = entryHref(entry)
  return { title: `${entry.title} | ORÁCULO Zafi`, description: entry.description, alternates: { canonical: path }, openGraph: { type: 'article', url: path, title: entry.title, description: entry.description, siteName: 'Zafi', locale: 'pt_BR', publishedTime: entry.reviewedAt, modifiedTime: entry.reviewedAt }, twitter: { card: 'summary_large_image', title: entry.title, description: entry.description } }
}

export default function Page({ params }: { params: { category: string; slug: string } }) {
  const entry = findEntry(params.category, params.slug); if (!entry) notFound()
  const category = categoryMap[entry.category]; const related = relatedEntries(entry); const url = `${SITE_URL}${entryHref(entry)}`
  const crumbs = [{ name: 'Zafi', href: '/' }, { name: 'ORÁCULO', href: '/oraculo' }, { name: category.name, href: `/oraculo/${category.slug}` }, { name: entry.title }]
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', '@id': `${url}#article`, headline: entry.title, description: entry.description, datePublished: entry.reviewedAt, dateModified: entry.reviewedAt, inLanguage: 'pt-BR', author: { '@type': 'Organization', name: 'Zafi', url: SITE_URL }, publisher: { '@type': 'Organization', name: 'Zafi', url: SITE_URL }, mainEntityOfPage: url, citation: entry.sources.map((source) => source.url), articleSection: category.name },
    { '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: entry.faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) },
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.href ? `${SITE_URL}${crumb.href}` : url })) },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: entry.title, isPartOf: { '@id': `${SITE_URL}/oraculo#webpage` } },
  ] }
  return <main className="min-h-screen bg-[#f6f8fc] text-slate-950"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="mx-auto max-w-6xl px-5 py-8"><Breadcrumbs items={crumbs} /></div>
    <article><header className="border-y border-slate-200 bg-white"><div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1fr_15rem]"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-700">{category.icon} {category.name}</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">{entry.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{entry.description}</p></div><aside className="self-end border-l-2 border-blue-600 pl-5 text-sm text-slate-600"><p className="font-bold text-slate-950">Conteúdo Zafi</p><p className="mt-2">Revisado em {new Date(`${entry.reviewedAt}T12:00:00`).toLocaleDateString('pt-BR')}</p><p className="mt-1">{entry.sources.length} fonte{entry.sources.length === 1 ? '' : 's'}</p></aside></div></header>
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 lg:grid-cols-[minmax(0,46rem)_1fr]"><div>
      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-700">Resposta direta</p><p className="mt-3 text-lg font-bold leading-8">{entry.answer}</p></section>
      <div className="mt-12 space-y-12">{entry.sections.map((section) => <section key={section.title}><h2 className="text-2xl font-black tracking-tight">{section.title}</h2><p className="mt-4 leading-8 text-slate-700">{section.text}</p>{section.items && <ul className="mt-5 space-y-3">{section.items.map((item) => <li key={item} className="flex gap-3 text-slate-700"><span className="text-blue-600">●</span>{item}</li>)}</ul>}</section>)}</div>
      <section className="mt-14 border-t border-slate-200 pt-10"><h2 className="text-2xl font-black">Perguntas frequentes</h2><div className="mt-6 divide-y divide-slate-200 rounded-2xl border bg-white px-6">{entry.faqs.map((faq) => <details key={faq.question} className="group py-5"><summary className="cursor-pointer list-none font-extrabold">{faq.question}<span className="float-right text-blue-700 group-open:rotate-45">＋</span></summary><p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p></details>)}</div></section>
      <section className="mt-12 rounded-2xl bg-slate-100 p-6"><h2 className="text-lg font-black">Fontes consultadas</h2><p className="mt-2 text-sm leading-6 text-slate-600">Priorizamos instituições oficiais e fontes primárias.</p><ol className="mt-5 space-y-3">{entry.sources.map((source) => <li key={source.url} className="text-sm"><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline underline-offset-4">{source.title}</a><span className="text-slate-500"> — {source.publisher}</span></li>)}</ol></section>
    </div><aside className="lg:sticky lg:top-6 lg:self-start"><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Nesta resposta</p><nav className="mt-4 space-y-3">{entry.sections.map((section, index) => <div key={section.title} className="flex gap-3 text-sm"><span className="font-black text-blue-700">{String(index + 1).padStart(2, '0')}</span><span>{section.title}</span></div>)}</nav></div><div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><p className="font-extrabold">Precisa de um plano pessoal?</p><p className="mt-2 text-sm leading-6 text-slate-300">Faça o diagnóstico gratuito da Zafi.</p><Link href="/" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold">Começar diagnóstico</Link></div></aside></div></article>
    <section className="border-t bg-white"><div className="mx-auto max-w-6xl px-5 py-14"><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Conhecimento conectado</p><h2 className="mt-2 text-3xl font-black">Próximas respostas</h2><div className="mt-7 grid gap-5 md:grid-cols-3">{related.map((item) => <KnowledgeCard key={item.slug} entry={item} />)}</div></div></section>
  </main>
}
