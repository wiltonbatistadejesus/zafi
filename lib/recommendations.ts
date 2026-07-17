import { Debt, DebtType } from './types'

type PartnerId = 'acordo-certo' | 'super-sim' | 'financia-tudo' | 'juros-baixos' | 'finanzero'

const HIGH_INTEREST: DebtType[] = ['cartao', 'rotativo', 'emprestimo', 'crediario']

/** Regras transparentes de ordenação. Não usa comissão ou clique como critério. */
export function rankPartnerIds(ids: PartnerId[], debts: Debt[], totalDebt: number, income: number): PartnerId[] {
  const hasExpensiveDebt = debts.some((debt) => HIGH_INTEREST.includes(debt.type))
  const paymentPressure = income > 0 && totalDebt / income > 4

  return [...ids].sort((a, b) => score(b) - score(a))

  function score(id: PartnerId) {
    if (id === 'acordo-certo') return hasExpensiveDebt || paymentPressure ? 100 : 80
    if (id === 'super-sim') return hasExpensiveDebt ? 55 : 45
    if (!hasExpensiveDebt || paymentPressure) return id === 'financia-tudo' ? 50 : 40
    if (id === 'juros-baixos') return 75
    if (id === 'financia-tudo') return 65
    if (id === 'finanzero') return 60
    return 55
  }
}
