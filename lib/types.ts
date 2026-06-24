// -----------------------------------------------
// Zafi — Shared TypeScript types
// -----------------------------------------------

/** The debt categories we support, each with a known monthly interest rate */
export type DebtType =
  | 'cartao'          // Cartão de crédito
  | 'rotativo'        // Rotativo do cartão
  | 'emprestimo'      // Empréstimo pessoal
  | 'crediario'       // Crediário/Loja
  | 'conta_atrasada'  // Conta atrasada (utilities)
  | 'financiamento'   // Financiamento

/** Human-readable labels for each debt type */
export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  cartao: 'Cartão de crédito',
  rotativo: 'Rotativo do cartão',
  emprestimo: 'Empréstimo pessoal',
  crediario: 'Crediário/Loja',
  conta_atrasada: 'Conta atrasada',
  financiamento: 'Financiamento',
}

/**
 * Monthly interest rates (decimal) for each debt type.
 * Source: Brazilian Central Bank average rates, used for illustrative purposes.
 * Always remind users that actual rates vary by institution.
 */
export const MONTHLY_INTEREST_RATES: Record<DebtType, number> = {
  cartao: 0.14,         // 14%/month
  rotativo: 0.16,       // 16%/month
  emprestimo: 0.08,     // 8%/month
  crediario: 0.07,      // 7%/month
  conta_atrasada: 0.03, // 3%/month
  financiamento: 0.02,  // 2%/month
}

/** A single debt entry added by the user */
export interface Debt {
  id: string
  type: DebtType
  amount: number       // value in BRL (e.g. 1500.00)
  creditor?: string    // e.g. "Nubank", "CEF" — optional
}

/** Data collected at the lead-capture step */
export interface LeadData {
  name: string
  email: string
  totalDebt: number
  income?: number
  estimatedMonths?: number
}

/** Summary card shown in Raio-X step */
export interface RaioXSummary {
  totalDebt: number
  estimatedMonthlyInterest: number
  mostDangerousDebt: Debt | null
}

/** An exit plan item (debt + calculated priority) */
export interface ExitPlanItem extends Debt {
  monthlyInterestRate: number   // e.g. 0.14
  monthlyInterestAmount: number // e.g. 210.00
  label: string                 // human-readable type name
}
