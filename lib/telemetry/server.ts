import { getSupabaseClient } from '@/lib/supabase'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { ActionpayPhaseBSnapshot, AnalyticsConsent, AttributionCockpitSnapshot, CockpitSnapshot, EventIntelligenceSnapshot, Ga4IntegrationStatus, OperationalMonitorSnapshot, TelemetryEventType } from './types'
import type { NormalizedActionpayPostback, FlatPostbackPayload } from '@/lib/actionpay/postback'
import type { PartnerDefinition } from '@/lib/partners'

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

export async function recordAffiliateClick(input: {
  clickId: string
  telemetryEventId: string
  partner: PartnerDefinition
  sessionId: string
  visitorId: string
  sourcePage: string
  occurredAt: string
  recommendationRunId: string
  recommendationDecisionId: string
}) {
  const { data, error } = await getSupabaseClient().rpc('affiliate_record_click', {
    p_secret: secret(),
    p_click_id: input.clickId,
    p_telemetry_event_id: input.telemetryEventId,
    p_partner_id: input.partner.id,
    p_partner_name: input.partner.name,
    p_campaign_id: input.partner.campaignId,
    p_campaign_name: input.partner.campaignName,
    p_network: input.partner.network,
    p_session_id: input.sessionId,
    p_visitor_id: input.visitorId,
    p_source_page: input.sourcePage,
    p_occurred_at: input.occurredAt,
    p_recommendation_run_id: input.recommendationRunId,
    p_recommendation_decision_id: input.recommendationDecisionId,
  })
  if (error || !data) throw new Error(`Affiliate click persistence failed: ${error?.message ?? 'empty response'}`)
  return data as string
}

export async function recordActionpayPostback(input: {
  requestId: string
  normalized: NormalizedActionpayPostback
  payload: FlatPostbackPayload
  rawPayloadHash: string
}) {
  const { normalized } = input
  const { data, error } = await getSupabaseAdminClient().rpc('affiliate_record_conversion', {
    p_secret: secret(),
    p_request_id: input.requestId,
    p_network: 'actionpay',
    p_idempotency_key: normalized.idempotencyKey,
    p_transaction_id: normalized.transactionId,
    p_original_click_id: normalized.originalClickId,
    p_partner_id: normalized.partner?.id ?? null,
    p_partner_name: normalized.partner?.name ?? null,
    p_campaign_id: normalized.campaignId,
    p_campaign_name: normalized.partner?.campaignName ?? null,
    p_status: normalized.status,
    p_commission: normalized.commission,
    p_currency: normalized.currency,
    p_event_at: normalized.eventAt,
    p_converted_at: normalized.convertedAt,
    p_raw_payload: input.payload,
    p_raw_payload_hash: input.rawPayloadHash,
    p_schema_version: 1,
  })
  if (error || !data?.[0]) throw new Error(`Actionpay conversion persistence failed: ${error?.message ?? 'empty response'}`)
  return {
    conversionId: data[0].conversion_id as string,
    conversionEventId: data[0].conversion_event_id as string,
    duplicate: Boolean(data[0].duplicate),
    persistedAt: data[0].persisted_at as string,
  }
}

export async function recordActionpayPostbackRejection(input: {
  requestId: string
  httpStatus: number
  reason: string
  payload: FlatPostbackPayload
  rawPayloadHash: string
  transactionId?: string | null
  originalClickId?: string | null
  partnerId?: string | null
  campaignId?: string | null
}) {
  const { error } = await getSupabaseAdminClient().rpc('affiliate_record_postback_audit', {
    p_secret: secret(),
    p_request_id: input.requestId,
    p_network: 'actionpay',
    p_outcome: 'rejected',
    p_http_status: input.httpStatus,
    p_reason: input.reason,
    p_raw_payload: input.payload,
    p_raw_payload_hash: input.rawPayloadHash,
    p_idempotency_key: null,
    p_transaction_id: input.transactionId ?? null,
    p_original_click_id: input.originalClickId ?? null,
    p_partner_id: input.partnerId ?? null,
    p_campaign_id: input.campaignId ?? null,
  })
  if (error) throw new Error(`Actionpay rejection audit failed: ${error.message}`)
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
  status: 'accepted' | 'sent' | 'confirmed' | 'skipped_no_consent' | 'not_configured' | 'failed'
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

export async function getAttributionCockpitSnapshot(recentLimit = 20): Promise<AttributionCockpitSnapshot> {
  const { data, error } = await getSupabaseClient().rpc('recommendation_attribution_cockpit_snapshot', {
    p_secret: secret(),
    p_recent_limit: recentLimit,
  })
  if (error || !data) throw new Error(`Attribution cockpit snapshot failed: ${error?.message ?? 'empty response'}`)
  return data as AttributionCockpitSnapshot
}

export async function getActionpayPhaseBSnapshot(): Promise<ActionpayPhaseBSnapshot> {
  const { data, error } = await getSupabaseAdminClient().rpc('actionpay_phase_b_snapshot', {
    p_secret: secret(),
  })
  if (error || !data) throw new Error(`Actionpay phase B snapshot failed: ${error?.message ?? 'empty response'}`)
  return data as ActionpayPhaseBSnapshot
}
export async function getOperationalMonitorSnapshot(windowHours = 24): Promise<OperationalMonitorSnapshot> {
  const { data, error } = await getSupabaseClient().rpc('operational_monitor_latest', {
    p_secret: secret(),
    p_window_hours: windowHours,
  })
  if (error || !data) throw new Error(`Operational monitor snapshot failed: ${error?.message ?? 'empty response'}`)
  return data as OperationalMonitorSnapshot
}

export async function getEventIntelligenceSnapshot(input?: {
  from?: string
  to?: string
  channel?: string | null
  campaign?: string | null
  source?: string | null
  eventType?: string | null
}): Promise<EventIntelligenceSnapshot> {
  const { data, error } = await getSupabaseClient().rpc('telemetry_event_intelligence_snapshot', {
    p_secret: secret(),
    p_from: input?.from ?? null,
    p_to: input?.to ?? null,
    p_channel: input?.channel ?? null,
    p_campaign: input?.campaign ?? null,
    p_source: input?.source ?? null,
    p_event_type: input?.eventType ?? null,
  })
  if (error || !data) throw new Error(`Event intelligence snapshot failed: ${error?.message ?? 'empty response'}`)
  return data as EventIntelligenceSnapshot
}
export async function getGa4IntegrationStatus(windowHours = 24): Promise<Ga4IntegrationStatus> {
  const { data, error } = await getSupabaseClient().rpc('telemetry_ga4_integration_status', {
    p_secret: secret(),
    p_measurement_id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '',
    p_confirmation_window_hours: windowHours,
  })
  if (error || !data) throw new Error(`GA4 integration status failed: ${error?.message ?? 'empty response'}`)
  return data as Ga4IntegrationStatus
}

export async function recordGa4Confirmation(input: {
  eventId: string
  evidenceSource: 'realtime' | 'debugview'
  eventName: TelemetryEventType
  evidenceAt: string
  details?: Record<string, unknown>
}) {
  const { data, error } = await getSupabaseClient().rpc('telemetry_record_ga4_confirmation', {
    p_secret: secret(),
    p_event_id: input.eventId,
    p_evidence_source: input.evidenceSource,
    p_measurement_id: 'G-ZY4276HJZT',
    p_event_name: input.eventName,
    p_evidence_at: input.evidenceAt,
    p_details: input.details ?? {},
  })
  if (error || !data) throw new Error(`GA4 confirmation persistence failed: ${error?.message ?? 'empty response'}`)
  return data as string
}
