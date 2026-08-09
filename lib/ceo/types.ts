export type Signal = 'healthy' | 'attention' | 'critical' | 'neutral'

export type Metric = {
  label: string
  value: string
  change?: string
  signal?: Signal
  detail?: string
}

export type FunnelStep = {
  label: string
  value: string
  conversion?: string
}

export type ExecutiveAction = {
  priority: 'critical' | 'attention' | 'opportunity'
  title: string
  reason: string
  owner: string
}

export type CompanyHealth = {
  label: string
  signal: Signal
  detail: string
}

export type CockpitData = {
  generatedAt: string
  mode: 'live' | 'unavailable'
  northStar: {
    completed: string
    dayGoal: string
    monthGoal: string
    change: string
    progress: number
  }
  acquisition: Metric[]
  trafficSources: Metric[]
  googleIntegration: {
    signal: Signal
    label: string
    detail: string
  }
  google: Metric[]
  queries: { label: string; direction: 'up' | 'down'; detail: string }[]
  content: {
    topPages: Metric[]
    published: string[]
  }
  funnel: FunnelStep[]
  partners: Metric[]
  revenue: Metric[]
  operations: {
    status: Signal
    hasActivity: boolean
    statusLabel: string
    score: string
    window: string
    schedulerSignal: Signal
    schedulerLabel: string
    chain: Array<{
      key: string
      label: string
      count: string
      status: Signal
      coverage: string
      detail: string
    }>
    quality: Array<{
      key: string
      label: string
      value: string
      numerator: string
      denominator: string
      signal: Signal
    }>
    diagnostics: Array<{
      code: string
      severity: 'attention' | 'critical'
      title: string
      detail: string
      count: string
    }>
    reconciliation: Metric[]
  }
  attribution: {
    summary: Metric[]
    conversionStates: Metric[]
    finance: Metric[]
    topDecisions: Array<{
      id: string
      product: string
      partner: string
      impressions: string
      clicks: string
      conversions: string
      approvedRevenue: string
      paidRevenue: string
    }>
  }
  eventIntelligence: {
    available: boolean
    timezone: string
    filters: { from: string; to: string; channel: string; campaign: string; source: string; eventType: string }
    comparison: Metric[]
    weekdays: Array<{ label: string; value: string }>
    hours: Array<{ label: string; value: string }>
    origins: Array<{ origin: string; visitors: string; sessions: string; completions: string }>
    campaigns: Array<{ campaign: string; channel: string; visitors: string; analyses: string; clicks: string }>
    recentEvents: Array<{
      id: string; event: string; date: string; time: string; weekday: string; origin: string
      campaign: string; channel: string; device: string; session: string; conversion: string
    }>
  }
  financeHistory: Array<{
    id: string
    transactionId: string
    partner: string
    campaignId: string
    status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'
    amount: string
    receivedAt: string
  }>
  alerts: { signal: Signal; title: string; detail: string }[]
  actions: ExecutiveAction[]
  roadmap: {
    current: string
    next: string
    progress: number
    milestone: string
  }
  health: CompanyHealth[]
}
