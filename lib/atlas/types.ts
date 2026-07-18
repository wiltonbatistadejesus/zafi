export type AtlasRule = {
  key: string
  attribute: 'debt_count' | 'total_debt' | 'monthly_income' | 'debt_to_income_ratio' | 'debt_types'
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains_any' | 'exists'
  expectedValue: unknown
  effect: 'require' | 'exclude' | 'score'
  scoreDelta: number | null
  explanation: string
  priority: number
}

export type AtlasProduct = {
  id: string
  partnerId: string
  name: string
  productName: string
  productType: string
  description: string
  reason: string
  tag: string
  tagTone: 'blue' | 'amber' | 'sky' | 'violet' | 'cyan' | 'emerald' | 'slate'
  icon: string
  baseScore: number
  featured: boolean
  section: 'renegotiation' | 'credit' | 'education' | 'other'
  displayOrder: number
  campaignId: string
  campaignName: string
  network: 'actionpay' | 'direct' | 'other'
  remuneration: { model: string; status: string; currency: string | null }
  metrics: {
    clicks: number
    clicks30d: number
    conversions: number
    approvedConversions: number
    revenue: number
    currency: string | null
    epc: number
    conversionRate: number
  }
  rules: AtlasRule[]
}

export type AtlasCatalog = {
  schemaVersion: number
  generatedAt: string
  products: AtlasProduct[]
}

export type AtlasContext = {
  debt_count: number
  total_debt: number
  monthly_income: number
  debt_to_income_ratio: number | null
  debt_types: string[]
}

export type RankedAtlasProduct = AtlasProduct & {
  eligible: boolean
  score: number
  matchedRules: string[]
}

