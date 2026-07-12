'use client'

import Link from 'next/link'
import Card from '@/components/Card'
import Logo from '@/components/Logo'
import { Debt, DEBT_TYPE_LABELS } from '@/lib/types'
import { buildExitPlan, findMostDangerousDebt, formatBRL } from '@/lib/calculations'
import { rankPartnerIds } from '@/lib/recommendations'

interface SolutionsProps {
  name: string
  debts: Debt[]
  totalDebt: number
  estimatedMonths: number | null
  income: number
}

type Partner = {
  id: string
  name: string
  description: string
  reason: string
  tag: string
  tagClass: string
  icon: string
  url: string
  recommended?: boolean
}

const ACORDOS: Partner[] = [
  {
    id: 'acordo-certo',
    name: 'Acordo Certo',
    description: 'Uma opção para consultar acordos e negociar dívidas diretamente pela internet.',
    reason: 'É a primeira opção porque renegociar pode reduzir juros e encurtar seu caminho de saída sem criar uma nova dívida.',
    tag: 'Recomendado pela Zafi',
    tagClass: 'bg-blue-100 text-blue-800',
    icon: '✓',
    url: '/go/acordo-certo',
    recommended: true,
  },
  {
    id: 'super-sim',
    name: 'SuperSim',
    description: 'Alternativa digital para simular uma solução de crédito ou reorganização.',
    reason: 'Incluímos como alternativa para comparar condições antes de tomar qualquer decisão.',
    tag: 'Aprovação rápida',
    tagClass: 'bg-amber-100 text-amber-800',
    icon: '↗',
    url: '/go/super-sim',
  },
]

const CREDITO: Partner[] = [
  {
    id: 'financia-tudo',
    name: 'FinanciaTudo',
    description: 'Uma opção adicional para consultar soluções financeiras e comparar propostas.',
    reason: 'Incluímos para ampliar sua comparação. Avalie o custo total, o prazo e se a nova condição realmente reduz os juros da dívida atual.',
    tag: 'Compare propostas',
    tagClass: 'bg-sky-100 text-sky-800',
    icon: '↗',
    url: '/go/financia-tudo',
  },
  {
    id: 'juros-baixos',
    name: 'Juros Baixos',
    description: 'Comparador de crédito para avaliar propostas de diferentes instituições.',
    reason: 'Só vale considerar crédito se a taxa total for menor do que a da sua dívida atual. Compare o CET antes de contratar.',
    tag: 'Menor taxa',
    tagClass: 'bg-violet-100 text-violet-800',
    icon: '%',
    url: '/go/juros-baixos',
    recommended: true,
  },
  {
    id: 'finanzero',
    name: 'FinanZero',
    description: 'Plataforma para consultar e comparar ofertas de crédito.',
    reason: 'Foi incluída para você ter mais de uma proposta e não aceitar a primeira condição disponível.',
    tag: 'Compare propostas',
    tagClass: 'bg-cyan-100 text-cyan-800',
    icon: '≋',
    url: '/go/finanzero',
  },
  {
    id: 'bom-pra-credito',
    name: 'Bom Pra Crédito',
    description: 'Outra alternativa para buscar propostas adequadas ao seu perfil.',
    reason: 'Ter uma opção adicional melhora sua comparação de prazo, parcelas e custo total.',
    tag: 'Análise online',
    tagClass: 'bg-emerald-100 text-emerald-800',
    icon: '+',
    url: '/go/bom-pra-credito',
  },
]

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm ${partner.recommended ? 'border-blue-300 ring-1 ring-blue-100' : 'border-zafi-border'}`}>
      <div className="flex gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-black ${partner.recommended ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`} aria-hidden="true">
          {partner.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-zafi-text">{partner.name}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${partner.tagClass}`}>{partner.tag}</span>
          </div>
          <p className="text-sm leading-relaxed text-zafi-secondary">{partner.description}</p>
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-bold text-zafi-text">Por que esta opção apareceu para você</p>
            <p className="mt-1 text-xs leading-relaxed text-zafi-secondary">{partner.reason}</p>
          </div>
          <a
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-zafi-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Ver condições com {partner.name}
          </a>
        </div>
      </div>
    </article>
  )
}

type HelpIcon = 'blog' | 'guide' | 'calculator'

function HelpIconGraphic({ icon }: { icon: HelpIcon }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (icon === 'blog') {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path {...common} d="M5 4.5h14v15H5zM8 8h8M8 11.5h8M8 15h5" /></svg>
  }
  if (icon === 'guide') {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path {...common} d="M4.5 5.5A2.5 2.5 0 0 1 7 3h4.5v16H7A2.5 2.5 0 0 0 4.5 21zM19.5 5.5A2.5 2.5 0 0 0 17 3h-5.5v16H17a2.5 2.5 0 0 1 2.5 2z" /></svg>
  }
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><rect {...common} x="5" y="3.5" width="14" height="17" rx="2" /><path {...common} d="M8 7.5h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></svg>
}

function HelpItem({ icon, title, text, href }: { icon: HelpIcon; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zafi-border bg-white p-3 transition hover:border-blue-300 hover:shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-zafi-blue"><HelpIconGraphic icon={icon} /></span>
      <p className="mt-1 text-sm font-bold text-zafi-text">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-zafi-secondary">{text}</p>
    </Link>
  )
}

export default function Solutions({ name, debts, totalDebt, estimatedMonths, income }: SolutionsProps) {
  const firstName = name.split(' ')[0]
  const mostDangerousDebt = findMostDangerousDebt(debts)
  const plan = buildExitPlan(debts)
  const firstPriority = plan[0]
  const financialSituation = debts.length === 1 ? 'Você registrou uma dívida.' : `Você registrou ${debts.length} dívidas.`
  const rankedAgreements = rankPartnerIds(ACORDOS.map((partner) => partner.id) as ('acordo-certo' | 'super-sim')[], debts, totalDebt, income)
  const rankedCredit = rankPartnerIds(CREDITO.map((partner) => partner.id) as ('financia-tudo' | 'juros-baixos' | 'finanzero' | 'bom-pra-credito')[], debts, totalDebt, income)
  const agreements = rankedAgreements.map((id) => ACORDOS.find((partner) => partner.id === id)!).filter(Boolean)
  const credit = rankedCredit.map((id) => CREDITO.find((partner) => partner.id === id)!).filter(Boolean)

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-16">
      <header className="mb-7 text-center">
        <Logo size="md" />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-zafi-blue">Análise concluída</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zafi-text">
          {firstName ? `${firstName}, este é o seu caminho mais seguro.` : 'Este é o seu caminho mais seguro.'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zafi-secondary">
          Primeiro entenda a situação. Depois escolha, com calma, a melhor condição para você.
        </p>
      </header>

      <section aria-labelledby="diagnostico" className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="diagnostico" className="text-base font-extrabold text-zafi-text">Diagnóstico financeiro</h2>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800">Personalizado</span>
        </div>
        <Card className="overflow-hidden p-0">
          <dl className="divide-y divide-zafi-border">
            <div className="flex items-center justify-between gap-4 p-4">
              <dt className="text-sm text-zafi-secondary">Valor da dívida</dt>
              <dd className="text-lg font-extrabold text-zafi-text">{formatBRL(totalDebt)}</dd>
            </div>
            <div className="p-4">
              <dt className="text-sm text-zafi-secondary">Objetivo</dt>
              <dd className="mt-1 font-bold text-zafi-text">Reduzir juros e recuperar o controle do orçamento</dd>
            </div>
            <div className="p-4">
              <dt className="text-sm text-zafi-secondary">Situação financeira</dt>
              <dd className="mt-1 text-sm leading-relaxed text-zafi-text">
                {financialSituation} {mostDangerousDebt && <>A maior pressão vem de <strong>{DEBT_TYPE_LABELS[mostDangerousDebt.type].toLowerCase()}</strong>, que tende a acumular juros mais rápido.</>}
              </dd>
            </div>
            <div className="bg-blue-50 p-4">
              <dt className="text-sm font-bold text-blue-900">Recomendação</dt>
              <dd className="mt-1 text-sm leading-relaxed text-blue-900">
                {firstPriority ? <>Negocie primeiro <strong>{firstPriority.label.toLowerCase()}</strong>. Antes de usar crédito, compare o custo total e só avance se os juros realmente caírem.</> : 'Comece negociando diretamente com o credor antes de considerar crédito.'}
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      <section aria-labelledby="plano" className="mb-7">
        <h2 id="plano" className="mb-3 text-base font-extrabold text-zafi-text">Plano da Zafi</h2>
        <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-md">
          <ol className="space-y-4">
            {[
              ['1', 'Negocie primeiro', 'Busque desconto, entrada possível e parcelas que cabem no mês.'],
              ['2', 'Priorize a dívida mais cara', firstPriority ? `Comece por ${firstPriority.label.toLowerCase()} para frear os juros primeiro.` : 'Comece pela dívida com juros mais altos.'],
              ['3', 'Compare propostas', 'Olhe CET, prazo e valor total pago — não só a parcela.'],
              ['4', 'Use crédito apenas se reduzir juros', 'Trocar uma dívida cara por outra ainda mais cara não ajuda.'],
            ].map(([number, title, description]) => (
              <li key={number} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-black">{number}</span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{description}</p>
                </div>
              </li>
            ))}
          </ol>
          {estimatedMonths && <p className="mt-5 border-t border-slate-700 pt-4 text-xs text-slate-300">Sua estimativa inicial é de cerca de {estimatedMonths} meses. Uma boa negociação pode reduzir esse prazo.</p>}
        </div>
      </section>

      <section aria-labelledby="acordos" className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zafi-blue">Seu primeiro movimento</p>
        <h2 id="acordos" className="mt-1 text-xl font-extrabold text-zafi-text">Comece pela negociação</h2>
        <p className="mt-1 text-sm leading-relaxed text-zafi-secondary">Priorize acordos com o credor. É a forma mais direta de tentar reduzir o saldo e os juros.</p>
        <div className="mt-4 space-y-3">{agreements.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}</div>
      </section>

      <section aria-labelledby="credito" className="mb-8 border-t border-zafi-border pt-7">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Somente se fizer sentido</p>
        <h2 id="credito" className="mt-1 text-xl font-extrabold text-zafi-text">Crédito para trocar juros caros</h2>
        <p className="mt-1 text-sm leading-relaxed text-zafi-secondary">Considere apenas se o custo total for menor que o da dívida atual. Nunca contrate sem comparar.</p>
        <div className="mt-4 space-y-3">{credit.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}</div>
      </section>

      <section aria-labelledby="ajuda" className="mb-6">
        <h2 id="ajuda" className="mb-3 text-base font-extrabold text-zafi-text">Ainda precisa de ajuda?</h2>
        <div className="grid grid-cols-3 gap-2">
          <HelpItem href="/guias" icon="blog" title="Blog" text="Explicações simples para decisões do dia a dia." />
          <HelpItem href="/guias" icon="guide" title="Guias" text="Passo a passo para negociar sem se perder." />
          <HelpItem href="/" icon="calculator" title="Calculadoras" text="Use sua simulação para comparar cenários." />
        </div>
      </section>

      <aside className="mb-6 rounded-2xl border border-zafi-border bg-slate-50 p-4">
        <p className="text-sm font-bold text-zafi-text">Transparência Zafi</p>
        <p className="mt-1 text-xs leading-relaxed text-zafi-secondary">A Zafi é gratuita para você. Podemos receber comissão quando você contrata com um parceiro, sem aumentar o seu custo. Isso não muda nossa orientação: compare sempre e escolha apenas o que melhora sua situação.</p>
      </aside>

      <footer className="text-center text-xs text-zafi-secondary">
        <p>Condições e aprovação dependem da análise de cada instituição.</p>
        <Link href="/privacy" className="mt-2 inline-block font-semibold text-zafi-blue underline">Política de Privacidade</Link>
        <p className="mt-4 font-medium text-zafi-text">Zafi · Sua vida financeira mais leve.</p>
      </footer>
    </div>
  )
}
