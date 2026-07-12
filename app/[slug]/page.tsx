import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const articles = {
  'como-limpar-o-nome': {
    title: 'Como limpar o nome: um passo a passo para negociar dívidas',
    description: 'Entenda como organizar pendências, falar com credores e escolher um acordo que cabe no seu orçamento.',
    intro: 'Ter o nome negativado pode limitar escolhas, mas não define o seu futuro financeiro. O primeiro passo é transformar a preocupação em informação e plano.',
    steps: [
      ['Liste todas as pendências', 'Anote credor, valor, vencimento e tipo de dívida. Priorize as que têm juros mais altos.'],
      ['Confira sua capacidade de pagamento', 'Defina um valor mensal que cabe no orçamento sem comprometer itens essenciais.'],
      ['Negocie com o credor', 'Peça o custo total do acordo, entrada, número de parcelas e data de vencimento antes de aceitar.'],
      ['Compare antes de fechar', 'Desconto é importante, mas a parcela precisa ser sustentável. Não assuma uma condição que você não conseguirá manter.'],
    ],
  },
  'divida-cartao': {
    title: 'Dívida de cartão de crédito: como sair do rotativo',
    description: 'Veja como organizar uma dívida de cartão e por que renegociar costuma vir antes de contratar novo crédito.',
    intro: 'O rotativo e o parcelamento do cartão costumam ter custo alto. Por isso, agir cedo reduz a chance de a dívida crescer mais rápido que o seu pagamento.',
    steps: [
      ['Pare de usar o limite por enquanto', 'Evite que novas compras se misturem à dívida que você está tentando organizar.'],
      ['Entenda o saldo e os juros', 'Peça ao emissor do cartão o valor atualizado e as opções disponíveis de acordo.'],
      ['Busque uma renegociação viável', 'Prefira uma parcela realista. Quitar um acordo em dia costuma ser melhor do que aceitar uma parcela impossível.'],
      ['Só compare crédito se reduzir custo', 'Avalie o CET, o valor total e o prazo. Crédito novo não resolve se for mais caro que a dívida atual.'],
    ],
  },
  'o-que-fazer-quando-estou-endividado': {
    title: 'Estou endividado: o que fazer agora?',
    description: 'Um plano prático para sair do modo de urgência, organizar dívidas e decidir o próximo passo com mais segurança.',
    intro: 'Quando as contas acumulam, o objetivo não é resolver tudo em um dia. É ganhar clareza, impedir que a situação piore e avançar uma decisão de cada vez.',
    steps: [
      ['Proteja o essencial', 'Moradia, alimentação, saúde e transporte vêm antes de qualquer acordo.'],
      ['Faça um diagnóstico', 'Some as dívidas e identifique as que cobram juros maiores.'],
      ['Defina uma ordem', 'Negocie primeiro as dívidas que crescem mais rápido ou têm maior impacto no seu dia a dia.'],
      ['Não aceite pressão', 'Peça propostas por escrito, leia as condições e decida apenas quando a parcela couber no orçamento.'],
    ],
  },
  'renegociar-divida-itau': {
    title: 'Como renegociar dívida com o Itaú com segurança',
    description: 'Veja como organizar sua proposta e acessar os canais oficiais do Itaú para renegociar uma dívida.',
    intro: 'Antes de aceitar um acordo, entenda o saldo, defina quanto cabe no mês e use somente os canais oficiais do banco.',
    source: { label: 'Canal oficial de renegociação do Itaú', url: 'https://www.itau.com.br/renegociacao' },
    steps: [
      ['Separe os dados da dívida', 'Tenha em mãos o contrato, o saldo atualizado e as parcelas em atraso.'],
      ['Defina seu limite mensal', 'Proteja despesas essenciais e escolha uma parcela que você consiga manter até o fim.'],
      ['Consulte o canal oficial', 'O Itaú disponibiliza opções digitais de renegociação. Confira a proposta diretamente no ambiente do banco.'],
      ['Compare o custo total', 'Verifique entrada, prazo, juros, CET e valor final antes de confirmar.'],
    ],
  },
  'renegociar-divida-santander': {
    title: 'Como renegociar dívida com o Santander com segurança',
    description: 'Organize sua negociação e consulte propostas pelos canais oficiais do Santander.',
    intro: 'Uma boa renegociação reduz a pressão do mês sem criar uma parcela impossível. Prepare seu orçamento antes de consultar as ofertas.',
    source: { label: 'Portal oficial de renegociação do Santander', url: 'https://www.santander.com.br/renegocie/home?ic=homepf-menu-renegociacao' },
    steps: [
      ['Confirme o valor atualizado', 'Consulte quais contratos e parcelas estão em aberto antes de negociar.'],
      ['Calcule uma parcela possível', 'Considere renda, despesas essenciais e uma margem para imprevistos.'],
      ['Entre pelo portal oficial', 'Informe seus dados somente no domínio do Santander e veja as propostas disponíveis para o seu perfil.'],
      ['Leia todas as condições', 'Compare entrada, número de parcelas, custo total e vencimentos antes de concluir.'],
    ],
  },
} as const

type Slug = keyof typeof articles

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = articles[params.slug as Slug]
  return article ? { title: article.title, description: article.description, alternates: { canonical: `/${params.slug}` } } : {}
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = articles[params.slug as Slug]
  if (!article) notFound()

  const source = 'source' in article ? article.source : null
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><article className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm sm:p-10"><Link href="/guias" className="text-sm font-bold text-blue-700">← Guias Zafi</Link><p className="mt-8 text-xs font-bold uppercase tracking-widest text-blue-700">Guia Zafi</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">{article.title}</h1><p className="mt-4 text-lg leading-relaxed text-slate-600">{article.intro}</p><ol className="mt-10 space-y-6">{article.steps.map(([title, text], index) => <li key={title} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</span><div><h2 className="font-bold">{title}</h2><p className="mt-1 leading-relaxed text-slate-600">{text}</p></div></li>)}</ol>{source && <p className="mt-8 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">Para consultar ofertas, acesse somente o <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline">{source.label}</a>.</p>}<div className="mt-10 rounded-2xl bg-blue-50 p-5"><p className="font-bold text-blue-950">Quer organizar seu próximo passo?</p><p className="mt-1 text-sm text-blue-900">Faça um diagnóstico gratuito e receba uma ordem para lidar com suas dívidas.</p><Link href="/" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Fazer diagnóstico</Link></div></article></main>
}
