import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Guias para sair das dívidas | Zafi', description: 'Orientações práticas para organizar, negociar e sair das dívidas com mais segurança.', alternates: { canonical: '/guias' } }

const guides = [
  ['Como limpar o nome', 'Organize pendências e avalie acordos sustentáveis.', '/como-limpar-o-nome'],
  ['Dívida de cartão', 'Entenda como lidar com rotativo e juros altos.', '/divida-cartao'],
  ['Estou endividado: o que fazer?', 'Comece pelo essencial e crie uma ordem de ação.', '/o-que-fazer-quando-estou-endividado'],
  ['Renegociar dívida Itaú', 'Prepare o orçamento e use o canal oficial.', '/renegociar-divida-itau'],
  ['Renegociar dívida Santander', 'Compare propostas no portal oficial.', '/renegociar-divida-santander'],
]

export default function GuidesPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-bold text-blue-700">← Zafi</Link><p className="mt-8 text-xs font-bold uppercase tracking-widest text-blue-700">Conteúdo gratuito</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Guias para retomar o controle</h1><p className="mt-3 max-w-2xl text-slate-600">Informação clara para entender a dívida, comparar condições e decidir sem pressão.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{guides.map(([title, description, href]) => <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p><span className="mt-4 inline-block text-sm font-bold text-blue-700">Ler guia →</span></Link>)}</div></div></main>
}
