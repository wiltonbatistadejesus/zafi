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
  signal: Exclude<Signal, 'neutral'>
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
  google: Metric[]
  queries: { label: string; direction: 'up' | 'down'; detail: string }[]
  content: {
    topPages: Metric[]
    published: string[]
  }
  funnel: FunnelStep[]
  partners: Metric[]
  revenue: Metric[]
  attribution: {
    summary: Metric[]
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
