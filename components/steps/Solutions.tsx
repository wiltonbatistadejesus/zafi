// -----------------------------------------------
// Step 6 — Solutions / Partner Cards
// -----------------------------------------------
'use client'

import { formatBRL } from '@/lib/calculations'
import Card from '@/components/Card'
import Logo from '@/components/Logo'
import Link from 'next/link'

interface SolutionsProps {
  name: string
  totalDebt: number
  estimatedMonths: number | null
}

// ── Parceiros de renegociação / acordos ──────────────────────
const ACORDOS = [
  {
    id: 'acordo-certo',
    name: 'Acordo Certo',
    description: 'Negocie suas dívidas com descontos reais, diretamente com os credores. Tudo online, sem sair de casa.',
    tag: 'Mais popular',
    tagColor: 'bg-emerald-100 text-emerald-700',
    icon: '✅',
    url: 'https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount',
    highlight: true,
  },
  {
    id: 'santander-acordo',
    name: 'Santander Acordo',
    description: 'Regularize dívidas no Santander com condições especiais e descontos exclusivos para quem está em atraso.',
    tag: 'Banco oficial',
    tagColor: 'bg-red-100 text-red-700',
    icon: '🏦',
    url: 'https://apretailer.com.br/click/6a3f408e2bfa813ab73f7f95/187700/359422/subaccount',
    highlight: false,
  },
  {
    id: 'super-sim',
    name: 'Super Sim',
    description: 'Solução rápida para regularizar seu CPF e renegociar dívidas, com simulação gratuita e sem burocracia.',
    tag: 'Sem burocracia',
    tagColor: 'bg-blue-100 text-blue-700',
    icon: '⚡',
    url: 'https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount',
    highlight: false,
  },
]

// ── Parceiros de crédito / empréstimo ───────────────────────
const CREDITO = [
  {
    id: 'juros-baixos',
    name: 'Empréstimo com Juros Baixos',
    description: 'Compare ofertas de empréstimo pessoal e encontre a taxa mais baixa do mercado. Simule agora, sem compromisso.',
    tag: 'Menor taxa',
    tagColor: 'bg-purple-100 text-purple-700',
    icon: '📉',
    url: 'https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount',
    highlight: true,
  },
  {
    id: 'finanzero',
    name: 'Finanzero',
    description: 'Marketplace de crédito que compara ofertas de vários bancos em segundos. Gratuito e sem consulta ao SPC/Serasa.',
    tag: 'Vários bancos',
    tagColor: 'bg-cyan-100 text-cyan-700',
    icon: '🔍',
    url: 'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount',
    highlight: false,
  },
  {
    id: 'bom-pra-credito',
    name: 'Bom Pra Crédito',
    description: 'Encontre a melhor linha de crédito para o seu perfil, mesmo com restrições. Análise rápida e aprovação online.',
    tag: 'Para negativados',
    tagColor: 'bg-amber-100 text-amber-700',
    icon: '💛',
    url: 'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount',
    highlight: false,
  },
  {
    id: 'consiga-mais',
    name: 'Consiga Mais',
    description: 'Crédito rápido e desburocratizado para quitar dívidas caras e reorganizar seu orçamento com parcelas menores.',
    tag: 'Aprovação rápida',
    tagColor: 'bg-green-100 text-green-700',
    icon: '🚀',
    url: 'https://apretailer.com.br/click/6a3f408d2bfa813ab73f7f94/184986/359422/subaccount',
    highlight: false,
  },
]

function PartnerCard({ partner }: { partner: typeof ACORDOS[0] }) {
  return (
    <Card
      accent={partner.highlight ? 'blue' : 'none'}
      className={partner.highlight ? 'ring-2 ring-blue-300' : ''}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{partner.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-bold text-zafi-text">{partner.name}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${partner.tagColor}`}>
              {partner.tag}
            </span>
          </div>
          <p className="text-zafi-secondary text-sm mb-3">{partner.description}</p>
          <a
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center justify-center w-full font-semibold rounded-xl
                       px-4 py-2.5 text-sm transition-all duration-200 text-white shadow-sm hover:shadow-md active:scale-95"
            style={{ background: partner.highlight ? 'linear-gradient(135deg, #1565ff, #0d47d9)' : 'linear-gradient(135deg, #374151, #1f2937)' }}
          >
            Ver oferta →
          </a>
        </div>
      </div>
    </Card>
  )
}

export default function Solutions({ name, totalDebt, estimatedMonths }: SolutionsProps) {
  const firstName = name.split(' ')[0]

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-16">

      {/* Header */}
      <div className="text-center mb-8">
        <Logo size="md" />
        <h2 className="text-2xl font-extrabold text-zafi-text mt-4">
          {firstName ? `${firstName}, seu plano está pronto! 🎉` : 'Seu plano está pronto! 🎉'}
        </h2>
        <p className="text-zafi-secondary mt-2 text-sm">
          Você tem <strong className="text-zafi-text">{formatBRL(totalDebt)}</strong> em dívidas.
          {estimatedMonths && (
            <>
              {' '}Com as opções abaixo, você pode quitar em muito menos que{' '}
              <strong className="text-zafi-text">{estimatedMonths} meses</strong>.
            </>
          )}
        </p>
      </div>

      {/* ── Seção 1: Acordos e renegociação ── */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🤝</span>
          <h3 className="text-sm font-bold text-zafi-text uppercase tracking-wide">
            Negocie sua dívida agora
          </h3>
        </div>
        <p className="text-xs text-zafi-secondary mb-4">
          Renegociação direta com os credores. Muitas vezes você quita com descontos de até 90%.
        </p>
        <div className="flex flex-col gap-4 mb-8">
          {ACORDOS.map((p) => <PartnerCard key={p.id} partner={p} />)}
        </div>
      </div>

      {/* Divisor */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-zafi-border" />
        <span className="text-xs text-zafi-secondary font-semibold">OU SE PREFERIR</span>
        <div className="flex-1 h-px bg-zafi-border" />
      </div>

      {/* ── Seção 2: Linhas de crédito ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💳</span>
          <h3 className="text-sm font-bold text-zafi-text uppercase tracking-wide">
            Crédito com juros menores
          </h3>
        </div>
        <p className="text-xs text-zafi-secondary mb-4">
          Use crédito mais barato para quitar dívidas caras (cartão, cheque especial) e reduzir juros.
        </p>
        <div className="flex flex-col gap-4 mb-4">
          {CREDITO.map((p) => <PartnerCard key={p.id} partner={p} />)}
        </div>
      </div>

      {/* Transparência */}
      <div className="rounded-2xl bg-gray-50 border border-zafi-border p-4 mb-6 flex items-start gap-3">
        <span className="text-xl">ℹ️</span>
        <div>
          <p className="text-zafi-text font-semibold text-sm">Como a Zafi funciona</p>
          <p className="text-zafi-secondary text-xs mt-1 leading-relaxed">
            A Zafi é 100% gratuita para você. Podemos receber uma comissão dos parceiros quando
            você contrata um serviço — sem custo extra para o usuário. Isso nos permite manter
            a ferramenta gratuita.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-zafi-secondary text-xs space-y-1.5">
        <p>Valores e condições sujeitos à análise de cada parceiro.</p>
        <p>
          <Link href="/privacy" className="underline text-zafi-blue">
            Política de Privacidade (LGPD)
          </Link>
        </p>
        <p className="mt-3 font-medium text-zafi-text">Zafi · Sua vida financeira mais leve. ✦</p>
      </div>
    </div>
  )
}
