export type RecommendationReason = {
  code: string
  detail: string
  ruleId?: string
  scoreDelta?: number
}

export type AppliedRecommendationRule = {
  ruleId: string
  key: string
  attribute: string
  operator: string
  actualValue: unknown
  expectedValue: unknown
  effect: 'require' | 'exclude' | 'score'
  scoreDelta: number | null
  matched: boolean
  explanation: string
  priority: number
}

export type RecommendationDecision = {
  decisionId: string
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
  featured: boolean
  section: 'renegotiation' | 'credit' | 'education' | 'other'
  displayOrder: number
  campaignId?: string
  campaignName?: string
  network?: 'actionpay' | 'direct' | 'other'
  eligible: boolean
  score: number
  rank?: number
  recommendationReasons?: RecommendationReason[]
  exclusionReasons?: RecommendationReason[]
  appliedRules: AppliedRecommendationRule[]
}

export type RecommendationImpressionReceipt = {
  impressionId: string
  runId: string
  decisionCount: number
  duplicate: boolean
  persistedAt: string
}

export type RecommendationResult = {
  schemaVersion: number
  runId: string
  engineVersion: string
  atlasVersion: string
  generatedAt: string
  reused: boolean
  dataUsed: {
    schemaVersion: number
    financialContextUpdatedAt: string
    intelligenceVersion: string | null
    intelligenceCalculatedAt: string | null
    attributes: Record<string, unknown>
  }
  recommendations: RecommendationDecision[]
  exclusions: RecommendationDecision[]
}
