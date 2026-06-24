// -----------------------------------------------
// Zafi — Financial calculation helpers
// -----------------------------------------------
// All rates are monthly and illustrative.
// Actual rates depend on creditor negotiation.

import {
  Debt,
  ExitPlanItem,
  MONTHLY_INTEREST_RATES,
  DEBT_TYPE_LABELS,
  RaioXSummary,
} from './types'

/** Total debt across all entries */
export function calcTotalDebt(debts: Debt[]): number {
  return debts.reduce((sum, d) => sum + d.amount, 0)
}

/**
 * Estimated monthly interest for a single debt.
 * Formula: amount × monthly_rate
 */
export function calcMonthlyInterest(debt: Debt): number {
  const rate = MONTHLY_INTEREST_RATES[debt.type]
  return debt.amount * rate
}

/** Sum of monthly interest across all debts */
export function calcTotalMonthlyInterest(debts: Debt[]): number {
  return debts.reduce((sum, d) => sum + calcMonthlyInterest(d), 0)
}

/** Returns the debt with the highest interest rate (the "most dangerous") */
export function findMostDangerousDebt(debts: Debt[]): Debt | null {
  if (debts.length === 0) return null
  return debts.reduce((worst, d) =>
    MONTHLY_INTEREST_RATES[d.type] > MONTHLY_INTEREST_RATES[worst.type]
      ? d
      : worst
  )
}

/** Build the full Raio-X summary object */
export function buildRaioX(debts: Debt[]): RaioXSummary {
  return {
    totalDebt: calcTotalDebt(debts),
    estimatedMonthlyInterest: calcTotalMonthlyInterest(debts),
    mostDangerousDebt: findMostDangerousDebt(debts),
  }
}

/**
 * Sort debts highest-to-lowest interest rate (Avalanche method).
 * Returns enriched ExitPlanItem objects with calculated fields.
 */
export function buildExitPlan(debts: Debt[]): ExitPlanItem[] {
  return [...debts]
    .sort(
      (a, b) =>
        MONTHLY_INTEREST_RATES[b.type] - MONTHLY_INTEREST_RATES[a.type]
    )
    .map((d) => ({
      ...d,
      monthlyInterestRate: MONTHLY_INTEREST_RATES[d.type],
      monthlyInterestAmount: calcMonthlyInterest(d),
      label: DEBT_TYPE_LABELS[d.type],
    }))
}

/**
 * Simulator: given monthly income and debts, compute:
 * - healthyInstallment: 30% of income (safe commitment threshold)
 * - estimatedMonths: rough payoff estimate using the healthy installment
 *
 * NOTE: This is a simplified estimate. Real payoff depends on negotiated rates.
 * We always show this as "estimativa sujeita à análise do parceiro."
 */
export function simulate(income: number, debts: Debt[]) {
  const totalDebt = calcTotalDebt(debts)
  const healthyInstallment = income * 0.3

  // Rough payoff: total debt / healthy installment (ignores compounding on purpose
  // — we want a best-case motivating number, and negotiated debts lose interest)
  const estimatedMonths =
    healthyInstallment > 0
      ? Math.ceil(totalDebt / healthyInstallment)
      : null

  return { healthyInstallment, estimatedMonths, totalDebt }
}

/** Format a number as Brazilian Real: R$ 1.234,56 */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/**
 * Parse a BRL-masked string (e.g. "1.234,56") to a plain number.
 * Removes dots (thousands separator) and replaces comma with period.
 */
export function parseBRL(masked: string): number {
  const cleaned = masked.replace(/\./g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? 0 : value
}

/**
 * Apply a BRL currency mask as the user types.
 * Input: raw digits string (e.g. "150000")
 * Output: formatted string (e.g. "1.500,00")
 */
export function maskBRL(rawDigits: string): string {
  // Keep only digits
  const digits = rawDigits.replace(/\D/g, '')
  if (!digits) return ''

  // Treat last 2 digits as cents
  const cents = parseInt(digits, 10)
  const reais = cents / 100

  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
