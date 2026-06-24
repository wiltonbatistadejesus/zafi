// -----------------------------------------------
// Step 2 — Debt Registration
// -----------------------------------------------
'use client'

import { useState } from 'react'
import { Debt, DebtType, DEBT_TYPE_LABELS } from '@/lib/types'
import { maskBRL, parseBRL, formatBRL, calcTotalDebt } from '@/lib/calculations'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CurrencyInput from '@/components/CurrencyInput'

interface DebtRegistrationProps {
  debts: Debt[]
  onAddDebt: (debt: Debt) => void
  onRemoveDebt: (id: string) => void
  onNext: () => void
}

// A blank form state
const emptyForm = { type: 'cartao' as DebtType, maskedAmount: '', creditor: '' }

export default function DebtRegistration({
  debts,
  onAddDebt,
  onRemoveDebt,
  onNext,
}: DebtRegistrationProps) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  function handleAdd() {
    const amount = parseBRL(form.maskedAmount)
    if (amount <= 0) {
      setError('Informe um valor válido maior que zero.')
      return
    }
    setError('')
    onAddDebt({
      id: crypto.randomUUID(),
      type: form.type,
      amount,
      creditor: form.creditor.trim() || undefined,
    })
    setForm(emptyForm)
  }

  const total = calcTotalDebt(debts)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-zafi-secondary text-sm font-medium mb-1">Passo 1 de 4</p>
        <h2 className="text-2xl font-extrabold text-zafi-text">Suas dívidas</h2>
        <p className="text-zafi-secondary mt-1 text-sm">
          Adicione todas as suas dívidas para recebermos o diagnóstico completo.
        </p>
      </div>

      {/* Add debt form */}
      <Card className="mb-4">
        <div className="flex flex-col gap-4">
          {/* Debt type selector */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zafi-text">
              Tipo de dívida <span className="text-red-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as DebtType })}
              className="w-full px-4 py-3 rounded-xl border border-zafi-border text-zafi-text
                         focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
            >
              {(Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((key) => (
                <option key={key} value={key}>
                  {DEBT_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <CurrencyInput
            label="Valor total da dívida"
            value={form.maskedAmount}
            onChange={(masked) => setForm({ ...form, maskedAmount: masked })}
            required
          />

          {/* Creditor (optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zafi-text">
              Credor <span className="text-zafi-secondary font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.creditor}
              onChange={(e) => setForm({ ...form, creditor: e.target.value })}
              placeholder="Ex: Nubank, CEF, Magazine Luiza..."
              className="w-full px-4 py-3 rounded-xl border border-zafi-border text-zafi-text
                         placeholder-zafi-secondary focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <Button onClick={handleAdd} fullWidth>
            + Adicionar dívida
          </Button>
        </div>
      </Card>

      {/* List of added debts */}
      {debts.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-zafi-secondary mb-2 uppercase tracking-wide">
            Dívidas adicionadas
          </h3>
          <div className="flex flex-col gap-2">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between bg-white border border-zafi-border rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-zafi-text font-semibold text-sm">
                    {DEBT_TYPE_LABELS[debt.type]}
                    {debt.creditor && (
                      <span className="text-zafi-secondary font-normal"> · {debt.creditor}</span>
                    )}
                  </p>
                  <p className="text-zafi-blue font-bold">{formatBRL(debt.amount)}</p>
                </div>
                <button
                  onClick={() => onRemoveDebt(debt.id)}
                  className="text-red-400 hover:text-red-600 text-lg ml-4 transition-colors"
                  aria-label="Remover dívida"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Running total */}
          <div className="mt-3 flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }}>
            <span className="text-white font-semibold text-sm">Total das dívidas</span>
            <span className="text-white font-extrabold text-lg">{formatBRL(total)}</span>
          </div>
        </div>
      )}

      {/* Next step CTA */}
      <Button
        onClick={onNext}
        disabled={debts.length === 0}
        fullWidth
        size="lg"
        variant={debts.length === 0 ? 'secondary' : 'primary'}
      >
        Ver meu Raio-X →
      </Button>

      {debts.length === 0 && (
        <p className="text-center text-zafi-secondary text-xs mt-2">
          Adicione ao menos uma dívida para continuar.
        </p>
      )}
    </div>
  )
}
