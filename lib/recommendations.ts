import type { AtlasContext, AtlasProduct, AtlasRule, RankedAtlasProduct } from '@/lib/atlas/types'
import type { Debt } from '@/lib/types'

function compare(actual: unknown, operator: AtlasRule['operator'], expected: unknown): boolean {
  if (operator === 'exists') return actual !== null && actual !== undefined
  if (operator === 'contains_any') {
    return Array.isArray(actual) && Array.isArray(expected) && expected.some((value) => actual.includes(value))
  }
  if (operator === 'in') return Array.isArray(expected) && expected.includes(actual)
  if (operator === 'eq') return actual === expected
  if (operator === 'neq') return actual !== expected

  if (typeof actual !== 'number' || typeof expected !== 'number' || !Number.isFinite(actual) || !Number.isFinite(expected)) return false
  if (operator === 'gt') return actual > expected
  if (operator === 'gte') return actual >= expected
  if (operator === 'lt') return actual < expected
  if (operator === 'lte') return actual <= expected
  return false
}

export function buildAtlasContext(debts: Debt[], totalDebt: number, income: number): AtlasContext {
  return {
    debt_count: debts.length,
    total_debt: totalDebt,
    monthly_income: income,
    debt_to_income_ratio: income > 0 ? totalDebt / income : null,
    debt_types: Array.from(new Set(debts.map((debt) => debt.type))),
  }
}

/** Avaliador genérico: atributos, operadores, limites e pesos vêm exclusivamente do Atlas. */
export function rankAtlasProducts(products: AtlasProduct[], context: AtlasContext): RankedAtlasProduct[] {
  return products
    .map((product) => {
      let eligible = true
      let score = product.baseScore
      const matchedRules: string[] = []

      for (const rule of [...product.rules].sort((a, b) => a.priority - b.priority)) {
        const matched = compare(context[rule.attribute], rule.operator, rule.expectedValue)
        if (matched) matchedRules.push(rule.key)
        if (rule.effect === 'require' && !matched) eligible = false
        if (rule.effect === 'exclude' && matched) eligible = false
        if (rule.effect === 'score' && matched) score += rule.scoreDelta ?? 0
      }

      return { ...product, eligible, score, matchedRules }
    })
    .filter((product) => product.eligible)
    .sort((a, b) => b.score - a.score || a.displayOrder - b.displayOrder)
}
