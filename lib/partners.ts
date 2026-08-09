import 'server-only'

import { getSupabaseClient } from '@/lib/supabase'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export type PartnerDefinition = {
  id: string
  name: string
  campaignId: string
  campaignName: string
  network: 'actionpay' | 'direct' | 'other'
  active: boolean
  operationalStatus: 'healthy' | 'degraded' | 'disabled' | 'pending_validation'
  destinationUrl: string
  clickIdStrategy: 'replace_subaccount_segment' | 'query_parameter' | 'none'
  remunerationModel: 'pending_confirmation' | 'cpc' | 'cpl' | 'cpa' | 'revenue_share' | 'fixed'
  remunerationStatus: 'pending_confirmation' | 'confirmed' | 'expired'
  note?: string | null
}

export type PartnerTrafficEligibility = {
  allowed: boolean
  code: 'traffic_origin_allowed' | 'traffic_origin_blocked' | 'traffic_origin_not_allowed' | 'campaign_not_found'
  reason: string
  traffic?: { source: string; medium: string; originGroup: string }
  matchedRules?: Array<{ ruleId: string; key: string; effect: 'allow' | 'block'; reason: string }>
}

function secret() {
  const value = process.env.TELEMETRY_SERVER_SECRET
  if (!value) throw new Error('TELEMETRY_SERVER_SECRET is not configured')
  return value
}

async function resolvePartner(slug: string | null, campaignId: string | null) {
  const { data, error } = await getSupabaseClient().rpc('atlas_resolve_partner', {
    p_secret: secret(),
    p_slug: slug,
    p_campaign_id: campaignId,
  })
  if (error) throw new Error(`Atlas partner lookup failed: ${error.message}`)
  return data ? data as PartnerDefinition : undefined
}

export function getPartner(id: string) {
  return resolvePartner(id, null)
}

export function getPartnerByCampaignId(campaignId: string) {
  return resolvePartner(null, campaignId)
}
export async function checkPartnerTrafficEligibility(input: {
  campaignId: string
  sessionId: string
  visitorId: string
  source: string
  medium: string
}) {
  const { data, error } = await getSupabaseAdminClient().rpc('atlas_check_campaign_traffic', {
    p_secret: secret(),
    p_campaign_id: input.campaignId,
    p_session_id: input.sessionId,
    p_visitor_id: input.visitorId,
    p_source: input.source,
    p_medium: input.medium,
  })
  if (error || !data) throw new Error(`Atlas traffic policy unavailable: ${error?.message ?? 'empty response'}`)
  return data as PartnerTrafficEligibility
}
