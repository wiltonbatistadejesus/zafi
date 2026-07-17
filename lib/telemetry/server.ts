import { getSupabaseClient } from '@/lib/supabase'
import type { AnalyticsConsent, CockpitSnapshot, TelemetryEventType } from './types'

type EventInput = {
  type: TelemetryEventType
  sessionId: string
  visitorId: string
  occurredAt: string
  sourcePage: string
  source: string
  consent: AnalyticsConsent
  device: Record<string, unknown>
  payload: Record<string, unknown>
  schemaVersion: number
  requestId?: string | null
}

function secret() {
  const value = process.env.TELEMETRY_SERVER_SECRET
  if (!value) throw new Error('TELEMETRY_SERVER_SECRET is not configured')
  return value
}

export async function recordEvent(input: EventInput) {
  const { data, error } = await getSupabaseClient().rpc('telemetry_record_event', {
    p_secret: secret(),
    p_event_type: input.type,
    p_session_id: input.sessionId,
    p_visitor_id: input.visitorId,
    p_occurred_at: input.occurredAt,
    p_source_page: input.sourcePage,
    p_source: input.source,
    p_consent: input.consent,
    p_device: input.device,
    p_payload: input.payload,
    p_schema_version: input.schemaVersion,
    p_request_id: input.requestId ?? null,
  })
  if (error || !data?.[0]) throw new Error(`Event persistence failed: ${error?.message ?? 'empty response'}`)
  return { eventId: data[0].event_id as string, persistedAt: data[0].persisted_at as string }
}

export async function recordPartnerClick(input: Omit<EventInput, 'type'>) {
  const { data, error } = await getSupabaseClient().rpc('telemetry_record_partner_click', {
    p_secret: secret(),
    p_session_id: input.sessionId,
    p_visitor_id: input.visitorId,
    p_occurred_at: input.occurredAt,
    p_source_page: input.sourcePage,
    p_source: input.source,
    p_consent: input.consent,
    p_device: input.device,
    p_payload: input.payload,
    p_schema_version: input.schemaVersion,
    p_request_id: input.requestId ?? null,
  })
  if (error || !data?.[0]) throw new Error(`Partner click persistence failed: ${error?.message ?? 'empty response'}`)
  return {
    partnerEventId: data[0].partner_event_id as string,
    affiliateEventId: data[0].affiliate_event_id as string,
    persistedAt: data[0].persisted_at as string,
  }
}

export async function recordGa4Delivery(eventId: string, result: Ga4Delivery) {
  const { error } = await getSupabaseClient().rpc('telemetry_record_delivery', {
    p_secret: secret(),
    p_event_id: eventId,
    p_provider: 'ga4',
    p_status: result.status,
    p_response_code: result.responseCode,
    p_detail: result.detail,
  })
  if (error) throw new Error(`GA4 delivery audit failed: ${error.message}`)
}

export type Ga4Delivery = {
  status: 'accepted' | 'skipped_no_consent' | 'not_configured' | 'failed'
  responseCode: number | null
  detail: string
}

export async function getCockpitSnapshot(recentLimit = 30): Promise<CockpitSnapshot> {
  const { data, error } = await getSupabaseClient().rpc('telemetry_cockpit_snapshot', {
    p_secret: secret(),
    p_recent_limit: recentLimit,
  })
  if (error || !data) throw new Error(`Cockpit snapshot failed: ${error?.message ?? 'empty response'}`)
  return data as CockpitSnapshot
}
