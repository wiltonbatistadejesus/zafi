// -----------------------------------------------
// Main page — orchestrates the 6-step flow
// -----------------------------------------------
// Steps:
//   0 → Hero
//   1 → DebtRegistration
//   2 → RaioX
//   3 → ExitPlan
//   4 → Simulator
//   5 → Solutions
// -----------------------------------------------
'use client'

import { useState } from 'react'
import { Debt } from '@/lib/types'
import { calcTotalDebt } from '@/lib/calculations'

import Hero from '@/components/steps/Hero'
import DebtRegistration from '@/components/steps/DebtRegistration'
import RaioX from '@/components/steps/RaioX'
import ExitPlan from '@/components/steps/ExitPlan'
import Simulator from '@/components/steps/Simulator'
import Solutions from '@/components/steps/Solutions'

// Progress indicator — shown above each step except Hero
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div className="w-full bg-zafi-border h-1.5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #1565ff, #0d47d9)',
        }}
      />
    </div>
  )
}

export default function Home() {
  const [step, setStep] = useState(0)
  const [debts, setDebts] = useState<Debt[]>([])
  const [leadName, setLeadName] = useState('')
  const [leadEstMonths, setLeadEstMonths] = useState<number | null>(null)

  // ── Debt helpers ──────────────────────────────────
  function addDebt(debt: Debt) {
    setDebts((prev) => [...prev, debt])
  }

  function removeDebt(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id))
  }

  // ── Lead capture ─────────────────────────────────
  async function handleSimulatorNext(lead: {
    name: string
    email: string
    income: number
    estimatedMonths: number | null
    contactConsent: boolean
  }) {
    setLeadName(lead.name)
    setLeadEstMonths(lead.estimatedMonths)

    // Save lead to Supabase via API route
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          totalDebt: calcTotalDebt(debts),
          income: lead.income,
          estimatedMonths: lead.estimatedMonths,
          contactConsent: lead.contactConsent,
        }),
      })
    } catch (err) {
      // Non-blocking — user still advances even if Supabase is unavailable
      console.error('Lead save failed:', err)
    }

    setStep(5)
  }

  // ── Step renderer ─────────────────────────────────
  function renderStep() {
    switch (step) {
      case 0:
        return <Hero onStart={() => setStep(1)} />

      case 1:
        return (
          <DebtRegistration
            debts={debts}
            onAddDebt={addDebt}
            onRemoveDebt={removeDebt}
            onNext={() => setStep(2)}
          />
        )

      case 2:
        return (
          <RaioX
            debts={debts}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )

      case 3:
        return (
          <ExitPlan
            debts={debts}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )

      case 4:
        return (
          <Simulator
            debts={debts}
            onNext={handleSimulatorNext}
            onBack={() => setStep(3)}
          />
        )

      case 5:
        return (
          <Solutions
            name={leadName}
            totalDebt={calcTotalDebt(debts)}
            estimatedMonths={leadEstMonths}
          />
        )

      default:
        return null
    }
  }

  return (
    <main className="min-h-screen" style={{ background: '#e9f0ff' }}>
      {/* Progress bar (hidden on Hero and Solutions) */}
      {step > 0 && step < 5 && (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zafi-border px-4 py-2">
          <div className="max-w-lg mx-auto">
            <ProgressBar step={step} total={4} />
          </div>
        </div>
      )}

      {renderStep()}
    </main>
  )
}
