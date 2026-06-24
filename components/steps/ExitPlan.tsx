// -----------------------------------------------
// Step 4 — Exit Plan (Avalanche Method)
// -----------------------------------------------
'use client'

import { Debt } from '@/lib/types'
import { buildExitPlan, formatBRL } from '@/lib/calculations'
import Button from '@/components/Button'
import Card from '@/components/Card'

interface ExitPlanProps {
  debts: Debt[]
  onNext: () => void
  onBack: () => void
}

export default function ExitPlan({ debts, onNext, onBack }: ExitPlanProps) {
  // buildExitPlan sorts highest → lowest interest rate
  const plan = buildExitPlan(debts)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-zafi-secondary text-sm font-medium mb-1">Passo 3 de 4</p>
        <h2 className="text-2xl font-extrabold text-zafi-text">Seu plano de saída</h2>
        <p className="text-zafi-secondary mt-1 text-sm">
          Método avalanche: pague o mínimo em todas e concentre o extra na dívida mais cara. Isso minimiza o total de juros pagos.
        </p>
      </div>

      {/* How it works */}
      <Card accent="blue" className="mb-5 flex items-start gap-3">
        <span className="text-2xl">📌</span>
        <div>
          <p className="text-blue-700 font-bold text-sm">Por que essa ordem?</p>
          <p className="text-zafi-secondary text-sm mt-0.5">
            Dívidas com juros maiores crescem mais rápido. Eliminando a mais cara primeiro, você economiza dinheiro no longo prazo.
          </p>
        </div>
      </Card>

      {/* Debt list ordered by interest */}
      <div className="flex flex-col gap-3 mb-6">
        {plan.map((item, index) => (
          <div
            key={item.id}
            className={`relative rounded-2xl border p-4 ${
              index === 0
                ? 'border-blue-400 bg-blue-50 shadow-md'
                : 'border-zafi-border bg-white'
            }`}
          >
            {/* "COMECE AQUI" badge on first item */}
            {index === 0 && (
              <span
                className="absolute -top-3 left-4 text-xs font-bold text-white px-3 py-0.5 rounded-full shadow"
                style={{ background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }}
              >
                COMECE AQUI
              </span>
            )}

            <div className="flex items-start justify-between gap-3">
              {/* Priority number */}
              <div
                className="w-8 h-8 min-w-[2rem] rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5"
                style={{
                  background:
                    index === 0
                      ? 'linear-gradient(135deg, #1565ff, #0d47d9)'
                      : '#94a3b8',
                }}
              >
                {index + 1}
              </div>

              {/* Debt info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-zafi-text font-bold text-sm">{item.label}</p>
                  {item.creditor && (
                    <span className="text-zafi-secondary text-xs">· {item.creditor}</span>
                  )}
                </div>
                <p className="text-zafi-blue font-extrabold text-lg">{formatBRL(item.amount)}</p>
                <p className="text-zafi-secondary text-xs mt-0.5">
                  Juros: {(item.monthlyInterestRate * 100).toFixed(0)}%/mês ·{' '}
                  <span className="text-red-500 font-medium">
                    {formatBRL(item.monthlyInterestAmount)}/mês em juros
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          ← Voltar
        </Button>
        <Button onClick={onNext} className="flex-grow">
          Simular parcela →
        </Button>
      </div>
    </div>
  )
}
