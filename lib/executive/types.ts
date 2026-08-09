import type { ActionpayIntegrationSnapshot, MetaExecutiveSnapshot } from '@/lib/meta/types'

export type ComparisonMetrics = {
  visitors: number
  sessions: number
  active_users: number
  diagnosis_started: number
  diagnosis_completed: number
  signups: number
  offers_viewed: number
  checkout_started: number
  purchases: number
  new_users: number
  visitor_signup_rate: number | null
  visitor_diagnosis_rate: number | null
  completion_rate: number | null
}

export type FinanceMetrics = {
  paid_customers: number
  cancellations: number
  revenue_created: number | string
  revenue_approved: number | string
  revenue_paid: number | string
  average_ticket: number | string
}

export type IntegrationStatus = 'working' | 'incomplete' | 'no_data' | 'not_connected'
export type AlertSignal = 'critical' | 'attention' | 'positive'

export type ExecutiveSnapshotRaw = {
  generated_at: string
  timezone: string
  period: { from: string; to: string; previous_from: string; previous_to: string; days: number }
  metrics: { current: ComparisonMetrics; previous: ComparisonMetrics }
  finance: {
    current: FinanceMetrics
    previous: FinanceMetrics
    month: number | string
    accumulated: number | string
    currency: string
  }
  marketing: {
    origins: Array<{ source: string; visitors: number; sessions: number; leads: number }>
    campaigns: Array<{ campaign: string; medium: string; visitors: number; leads: number }>
  }
  product: {
    content_generated: number
    top_features: Array<{ feature: string; uses: number }>
  }
  trend: Array<{ day: string; visitors: number; diagnoses: number; purchases: number; revenue: number | string }>
  monitor: {
    overall_status?: 'healthy' | 'attention' | 'critical' | 'neutral'
    health_score?: number | string | null
    diagnostics?: Array<{ code: string; count: number; severity: 'attention' | 'critical'; title: string; detail: string }>
    created_at?: string
  }
  engineering: {
    sprint: { code: string; title: string; status: string; completion: number; implementation_status?: string | null }
    blockers: number
  }
  ga4: { technical_sent: number; failed: number; confirmations: number }
  alert_rules: Array<{
    key: string
    label: string
    category: string
    threshold: number
    unit: string
    severity: AlertSignal
    config: Record<string, unknown>
  }>
}

export type GitHubHealth = {
  status: IntegrationStatus
  repository: string
  issuesOpen: number | null
  issuesClosed: number | null
  prsOpen: number | null
  prsMerged: number | null
  detail: string
}

export type DataHealthItem = { source: string; status: IntegrationStatus; detail: string }
export type ExecutiveAlert = { signal: AlertSignal; code: string; title: string; detail: string }

export type ExecutiveSnapshot = ExecutiveSnapshotRaw & {
  engineering: ExecutiveSnapshotRaw['engineering'] & {
    github: GitHubHealth
    criticalBugs: number
    overall: 'healthy' | 'attention' | 'critical'
  }
  meta: MetaExecutiveSnapshot
  actionpay: ActionpayIntegrationSnapshot
  alerts: ExecutiveAlert[]
  dataHealth: DataHealthItem[]
  integrations: { vercel: DataHealthItem }
}
