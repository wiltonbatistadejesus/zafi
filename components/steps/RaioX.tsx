// -----------------------------------------------
// Step 3 — Raio-X (Financial X-Ray)
// -----------------------------------------------
'use client'

import { Debt } from '@/lib/types'
import { buildRaioX, formatBRL } from '@/lib/calculations'
import { DEBT_TYPE_LABELS, MONTHLY_INTEREST_RATES } from '@/lib/types'
import Button from '@/components/Button'
import Card from '@/components/Card'

interface RaioXProps {
  debts: Debt[]
  onNext: () => void
  onBack: () => void
}

export default function RaioX({ debts, onNext, onBack }: RaioXProps) {
  const { totalDebt, estimatedMonthlyInterest, mostDangerousDebt } = buildRaioX(debts)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-zafi-secondary text-sm font-medium mb-1">Passo 2 de 4</p>
        <h2 className="text-2xl font-extrabold text-zafi-text">Seu Raio-X financeiro</h2>
        <p className="text-zafi-secondary mt-1 text-sm">
          Veja o diagnóstico completo das suas dívidas.
        </p>
      </div>

      {/* Total hero card */}
      <div
        className="rounded-2xl p-6 mb-4 text-white text-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }}
      >
        <p className="text-blue-200 text-sm font-medium mb-1">Total em dívidas</p>
        <p className="text-4xl font-extrabold mb-1">{formatBRL(totalDebt)}</p>
        <p className="text-blue-200 text-xs">soma de {debts.length} dívida{debts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Two info cards side-by-side */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Monthly interest */}
        <Card accent="red" className="text-center">
          <p className="text-zafi-secondary text-xs mb-1">Juros pagos/mês (est.)</p>
          <p className="text-2xl font-extrabold text-red-500">
            {formatBRL(estimatedMonthlyInterest)}
          </p>
          <p className="text-zafi-secondary text-xs mt-1">
            Valor que vai embora todo mês sem quitar nada
          </p>
        </Card>

        {/* Most dangerous debt */}
        <Card accent="yellow" className="text-center">
          <p className="text-zafi-secondary text-xs mb-1">Dívida mais perigosa</p>
          {mostDangerousDebt ? (
            <>
              <p className="text-base font-extrabold text-zafi-text leading-tight">
                {DEBT_TYPE_LABELS[mostDangerousDebt.type]}
              </p>
              <p className="text-amber-500 font-bold text-sm mt-1">
                {(MONTHLY_INTEREST_RATES[mostDangerousDebt.type] * 100).toFixed(0)}% ao mês
              </p>
            </>
          ) : (
            <p className="text-zafi-secondary text-sm">—</p>
          )}
        </Card>
      </div>

      {/* Motivational green card */}
      <Card accent="green" className="mb-6 flex items-start gap-3">
        <span className="text-2xl">💚</span>
        <div>
          <p className="text-emerald-700 font-bold text-sm">A boa notícia</p>
          <p className="text-zafi-secondary text-sm mt-0.5">
            Quem entende as próprias dívidas já está na frente. O próximo passo é criar um plano inteligente para sair delas — e vamos te mostrar exatamente como.
          </p>
        </div>
      </Card>

      {/* Disclaimer */}
      <p className="text-zafi-secondary text-xs text-center mb-4">
        * Estimativas baseadas em taxas médias do mercado. Sujeito à análise do credor.
      </p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          ← Voltar
        </Button>
        <Button onClick={onNext} className="flex-2 flex-grow">
          Ver plano de saída →
        </Button>
      </div>
    </div>
  )
}
