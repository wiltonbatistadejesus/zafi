// -----------------------------------------------
// Step 6 — Solutions / Partner Cards
// -----------------------------------------------
'use client'

import { formatBRL } from '@/lib/calculations'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Logo from '@/components/Logo'
import AdBanner from '@/components/AdBanner'
import Link from 'next/link'

interface SolutionsProps {
  name: string
  totalDebt: number
  estimatedMonths: number | null
}

// Affiliate partners — replace URLs with real affiliate links before launch
const PARTNERS = [
  {
    id: 'serasa',
    name: 'Serasa Limpa Nome',
    description:
      'Negocie dívidas com descontos de até 99% diretamente com os credores cadastrados no Serasa.',
    tag: 'Descontos especiais',
    tagColor: 'bg-emerald-100 text-emerald-700',
    icon: '🏦',
    url: 'https://www.serasa.com.br/limpa-nome-online/', // TODO: replace with affiliate URL
    highlight: true,
  },
  {
    id: 'quiteja',
    name: 'QuiteJá',
    description:
      'Plataforma de renegociação online. Simule, negocie e quite suas dívidas em parcelas que cabem no bolso.',
    tag: 'Parcelas flexíveis',
    tagColor: 'bg-blue-100 text-blue-700',
    icon: '💳',
    url: 'https://www.quiteja.com.br/', // TODO: replace with affiliate URL
    highlight: false,
  },
  {
    id: 'portabilidade',
    name: 'Portabilidade de Dívida',
    description:
      'Transfira seu empréstimo ou financiamento para outra instituição com taxas menores. Simples e sem custo.',
    tag: 'Taxa menor',
    tagColor: 'bg-purple-100 text-purple-700',
    icon: '🔄',
    url: 'https://www.bcb.gov.br/estabilidadefinanceira/portabilidadecredito', // TODO: replace with affiliate URL
    highlight: false,
  },
]

export default function Solutions({ name, totalDebt, estimatedMonths }: SolutionsProps) {
  const firstName = name.split(' ')[0]

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <Logo size="md" />
        <h2 className="text-2xl font-extrabold text-zafi-text mt-4">
          {firstName}, seu plano está pronto! 🎉
        </h2>
        <p className="text-zafi-secondary mt-2 text-sm">
          Você tem <strong className="text-zafi-text">{formatBRL(totalDebt)}</strong> em dívidas.
          {estimatedMonths && (
            <>
              {' '}Com renegociação, pode quitar em muito menos que{' '}
              <strong className="text-zafi-text">{estimatedMonths} meses</strong>.
            </>
          )}
        </p>
      </div>

      {/* Partner cards */}
      <h3 className="text-sm font-semibold text-zafi-secondary uppercase tracking-wide mb-3">
        Opções recomendadas para você
      </h3>

      <div className="flex flex-col gap-4 mb-6">
        {PARTNERS.map((partner) => (
          <Card
            key={partner.id}
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
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full font-semibold rounded-xl
                             px-4 py-2.5 text-sm transition-all duration-200 text-white shadow-sm hover:shadow-md active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }}
                >
                  Acessar agora →
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* How Zafi makes money — transparency */}
      <Card accent="none" className="bg-zafi-bg border-none mb-6">
        <div className="flex items-start gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <p className="text-zafi-text font-semibold text-sm">Como a Zafi funciona</p>
            <p className="text-zafi-secondary text-xs mt-1">
              A Zafi é 100% gratuita para você. Ganhamos uma comissão dos parceiros quando você fecha um acordo — sem custo extra para o usuário. Isso nos permite manter o serviço gratuito.
            </p>
          </div>
        </div>
      </Card>

      {/* AdSense banner — aparece após os cards de parceiros */}
      <AdBanner
        adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SOLUTIONS || 'XXXXXXXXXX'}
        adFormat="auto"
        className="mb-4 rounded-xl overflow-hidden"
      />

      {/* Footer */}
      <div className="text-center text-zafi-secondary text-xs space-y-1">
        <p>Valores e condições sujeitos à análise dos parceiros.</p>
        <p>
          <Link href="/privacy" className="underline text-zafi-blue">
            Política de Privacidade (LGPD)
          </Link>
        </p>
        <p className="mt-3 font-medium">Zafi · Sua vida financeira mais leve. ✦</p>
      </div>
    </div>
  )
}
