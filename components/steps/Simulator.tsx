// -----------------------------------------------
// Step 5 — Installment Simulator + Lead Capture
// -----------------------------------------------
'use client'

import { useState } from 'react'
import { Debt } from '@/lib/types'
import { simulate, formatBRL, maskBRL, parseBRL } from '@/lib/calculations'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CurrencyInput from '@/components/CurrencyInput'

interface SimulatorProps {
  debts: Debt[]
  onNext: (lead: { name: string; email: string; income: number; estimatedMonths: number | null; contactConsent: boolean }) => void
  onBack: () => void
}

export default function Simulator({ debts, onNext, onBack }: SimulatorProps) {
  const [incomeMasked, setIncomeMasked] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contactConsent, setContactConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const income = parseBRL(incomeMasked)
  const result = income > 0 ? simulate(income, debts) : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setSubmitted(true)
    onNext({
      name: name.trim(),
      email: email.trim(),
      income,
      estimatedMonths: result?.estimatedMonths ?? null,
      contactConsent,
    })
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-zafi-secondary text-sm font-medium mb-1">Passo 4 de 4</p>
        <h2 className="text-2xl font-extrabold text-zafi-text">Simule sua parcela</h2>
        <p className="text-zafi-secondary mt-1 text-sm">
          Informe sua renda para calcular quanto você pode comprometer sem prejudicar o orçamento.
        </p>
      </div>

      {/* Income input */}
      <Card className="mb-4">
        <CurrencyInput
          label="Sua renda mensal líquida"
          value={incomeMasked}
          onChange={(masked) => setIncomeMasked(masked)}
          placeholder="0,00"
          required
        />
        <p className="text-zafi-secondary text-xs mt-2">
          Valor que você recebe na conta por mês (salário, freelance, etc.)
        </p>
      </Card>

      {/* Simulation result */}
      {result && (
        <div className="mb-4 space-y-3">
          {/* Healthy installment */}
          <div
            className="rounded-2xl p-5 text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }}
          >
            <p className="text-blue-200 text-xs mb-1">Parcela saudável recomendada (30% da renda)</p>
            <p className="text-3xl font-extrabold">{formatBRL(result.healthyInstallment)}</p>
            <p className="text-blue-200 text-xs mt-1">/mês</p>
          </div>

          {/* Timeline estimate */}
          {result.estimatedMonths && (
            <Card accent="green" className="flex items-center gap-4">
              <span className="text-3xl">📅</span>
              <div>
                <p className="text-emerald-700 font-bold text-sm">Estimativa de quitação</p>
                <p className="text-zafi-text font-extrabold text-xl">
                  ~{result.estimatedMonths} meses
                </p>
                <p className="text-zafi-secondary text-xs">
                  pagando {formatBRL(result.healthyInstallment)}/mês. Com renegociação, pode ser bem menos!
                </p>
              </div>
            </Card>
          )}

          {/* Warning */}
          <Card accent="yellow" className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-zafi-secondary text-xs">
              Esta é uma estimativa sem considerar juros futuros. <strong>Renegociar com os parceiros</strong> pode zerar os juros e reduzir muito esse prazo.
            </p>
          </Card>
        </div>
      )}

      {/* Lead capture form */}
      <Card className="mb-4">
        <h3 className="text-zafi-text font-bold mb-1">Receba seu plano completo</h3>
        <p className="text-zafi-secondary text-xs mb-4">
          Informe seus dados para acessar as soluções de renegociação personalizadas.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            required
            className="w-full px-4 py-3 rounded-xl border border-zafi-border text-zafi-text
                       placeholder-zafi-secondary focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            required
            className="w-full px-4 py-3 rounded-xl border border-zafi-border text-zafi-text
                       placeholder-zafi-secondary focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
          {/* Consentimento de contato — LGPD */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={contactConsent}
              onChange={(e) => setContactConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zafi-border accent-blue-600 cursor-pointer flex-shrink-0"
            />
            <span className="text-zafi-secondary text-xs leading-relaxed">
              Aceito ser contactado por parceiros financeiros com ofertas de crédito e renegociação de dívidas adequadas ao meu perfil. (opcional)
            </span>
          </label>

          <p className="text-zafi-secondary text-xs">
            Seus dados são protegidos pela LGPD.{' '}
            <a href="/privacy" target="_blank" className="underline text-zafi-blue">
              Política de privacidade
            </a>
          </p>

          <div className="flex gap-3 mt-1">
            <Button variant="outline" onClick={onBack} type="button" className="flex-1">
              ← Voltar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !email.trim() || submitted}
              className="flex-grow"
            >
              {submitted ? 'Carregando...' : 'Ver soluções →'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
