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
    status: 'accepted' | 'skipped_no_consent' | 'not_configured' | 'failed'
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
  sources: { source: string; value: number }[]
  partners: { partner_id: string; partner_name: string; value: number }[]
  pages: { page: string; value: number }[]
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
