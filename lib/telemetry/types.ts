export const TELEMETRY_EVENT_TYPES = [
  'page_view',
  'analysis_started',
  'analysis_completed',
  'partner_clicked',
  'affiliate_click',
] as const

export type TelemetryEventType = (typeof TELEMETRY_EVENT_TYPES)[number]
export type AnalyticsConsent = 'granted' | 'denied' | 'unknown'

export type TelemetryContext = {
  sessionId: string
  visitorId: string
  occurredAt: string
  sourcePage: string
  source: string
  consent: AnalyticsConsent
  device: Record<string, unknown>
  campaign?: Record<string, string>
}

export type TelemetryRequest = TelemetryContext & {
  type: Exclude<TelemetryEventType, 'partner_clicked' | 'affiliate_click'>
  payload?: Record<string, unknown>
  schemaVersion: number
}

export type TelemetryReceipt = {
  success: true
  eventId: string
  persistedAt: string
  ga4: {
    status: 'accepted' | 'sent' | 'confirmed' | 'skipped_no_consent' | 'not_configured' | 'failed'
    responseCode: number | null
  }
}

export type CockpitSnapshot = {
  generated_at: string
  today_start: string
  visitors: number
  new_visitors: number
  sessions: number
  analysis_started: number
  analysis_completed: number
  partner_clicked: number
  affiliate_click: number
  month_analysis_completed: number
  ga4_accepted: number
  ga4_failed: number
  ga4_integration?: Ga4IntegrationStatus
  conversions_today: number
  conversions_week: number
  conversions_month: number
  conversions_total: number
  sources: { source: string; value: number }[]
  partners: { partner_id: string; partner_name: string; value: number }[]
  pages: { page: string; value: number }[]
  conversion_partners: Array<{
    partner_id: string
    partner_name: string
    conversions: number
    revenue: number | string | null
    currency: string | null
  }>
  revenue_today: RevenueAmount[]
  revenue_week: RevenueAmount[]
  revenue_month: RevenueAmount[]
  revenue_total: RevenueAmount[]
  recent_conversions: AffiliateConversion[]
  recent_events: Array<{
    id: string
    event_type: TelemetryEventType
    session_id: string
    visitor_id: string
    source_page: string
    source: string
    consent: AnalyticsConsent
    payload: Record<string, unknown>
    schema_version: number
    occurred_at: string
    created_at: string
    ga4_status: string | null
    ga4_response_code: number | null
    ga4_attempted_at: string | null
  }>
}

export type RevenueAmount = { currency: string; value: number | string }

export type AttributionCockpitSnapshot = {
  generated_at: string
  impressions_today: number
  impressions_total: number
  clicks_today: number
  clicks_total: number
  conversions_today: number
  conversions_total: number
  affiliate_clicks_total: number
  affiliate_conversions_total: number
  unattributed_conversions_total: number
  created_count: number
  approved_count: number
  paid_count: number
  revenue_created: RevenueAmount[]
  revenue_approved: RevenueAmount[]
  revenue_paid: RevenueAmount[]
  top_decisions: Array<{
    decision_id: string
    run_id: string
    product_slug: string
    product_name: string
    partner_slug: string
    partner_name: string
    impressions: number
    clicks: number
    conversions: number
    currency: string | null
    revenue_approved: number | string
    revenue_paid: number | string
  }>
  recent_events: Array<{
    id: string
    event_type: 'impression' | 'click' | 'conversion'
    run_id: string
    decision_id: string
    source_id: string
    financial_state: 'none' | 'created' | 'approved' | 'paid' | 'reversed'
    amount: number | string | null
    currency: string | null
    occurred_at: string
    created_at: string
    product_slug: string
    product_name: string
    partner_slug: string
    partner_name: string
    transaction_id: string | null
  }>
}

export type OperationalMonitorSnapshot = {
  schema_version: number
  snapshot_id: string | null
  snapshot_key: string
  generated_at: string
  window_started_at: string
  window_ended_at: string
  window_hours: number
  overall_status: 'healthy' | 'attention' | 'critical' | 'neutral'
  health_score: number | string | null
  has_activity: boolean
  chain: Array<{
    key: 'profile' | 'engine' | 'impression' | 'click' | 'conversion' | 'revenue'
    label: string
    count: number
    status: 'healthy' | 'attention' | 'critical' | 'neutral'
    coverage: number | string | null
    detail: string
  }>
  quality: Array<{
    key: string
    label: string
    value: number | string | null
    numerator: number
    denominator: number
  }>
  diagnostics: Array<{
    code: string
    stage: string
    severity: 'attention' | 'critical'
    title: string
    detail: string
    count: number
  }>
  reconciliation: {
    total: number
    attributed: number
    reconciled: number
    unreconciled: number
    pending: number
    approved: number
    paid: number
    reversed: number
    stale_pending: number
    postbacks_accepted: number
    postbacks_duplicate: number
    postbacks_rejected: number
    revenue_created: RevenueAmount[]
    revenue_approved: RevenueAmount[]
    revenue_paid: RevenueAmount[]
    discrepancies: Array<{
      conversion_id: string
      transaction_id: string
      partner_name: string
      status: string
      expected_financial_state: string
      observed_financial_state: string | null
      issue_codes: string[]
      last_received_at: string
    }>
  }
  scheduler: {
    status: 'healthy' | 'failed' | 'stale' | 'not_started'
    frequency: 'every_5_minutes'
    last_run_at: string | null
    last_success_at: string | null
    last_failure_at: string | null
    last_error_code: string | null
    last_detail: string | null
  }
}

export type Ga4IntegrationStatus = {
  status: 'integrated' | 'attention' | 'not_integrated'
  official_measurement_id: string
  configured_measurement_id_matches: boolean
  window_hours: number
  technical_sent: number
  failed: number
  realtime_confirmed: number
  debugview_confirmed: number
  last_attempt_at: string | null
  last_confirmation_at: string | null
}

export type AffiliateConversion = {
  id: string
  transaction_id: string
  partner_id: string
  partner_name: string
  campaign_id: string
  campaign_name: string
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'
  commission: number | string | null
  currency: string | null
  original_click_id: string | null
  converted_at: string | null
  first_received_at: string
  last_received_at: string
  updated_at: string
}

export type EventIntelligenceSnapshot = {
  generated_at: string
  timezone: 'America/Sao_Paulo'
  period: { from: string; to: string }
  filters: { channel: string | null; campaign: string | null; source: string | null; event_type: string | null }
  visits_by_weekday: Array<{ weekday_number: number; weekday: string; value: number }>
  visits_by_hour: Array<{ hour: number; value: number }>
  conversions_revenue_by_time: Array<{
    local_date: string; hour: number; origin: string; campaign: string; channel: string; currency: string
    conversions: number; revenue_created: number | string; revenue_approved: number | string; revenue_paid: number | string
  }>
  origins: Array<{ origin: string; visitors: number; sessions: number; completions: number }>
  campaigns: Array<{
    campaign: string; channel: string; visitors: number; sessions: number
    analyses_started: number; analyses_completed: number; partner_clicks: number
  }>
  comparison: {
    current: { page_views: number; visitors: number; analysis_completed: number }
    previous: { page_views: number; visitors: number; analysis_completed: number }
  }
  recent_events: Array<{
    id: string; event_type: TelemetryEventType; date: string; time: string; timezone: string; weekday: string
    origin: string; campaign: string; channel: string; device: string; session_id: string; visitor_id: string
    source_page: string
    conversion: null | { id: string; transaction_id: string; status: string; commission: number | string | null; currency: string | null }
  }>
}