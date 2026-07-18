import 'server-only'

import { getSupabaseClient } from '@/lib/supabase'

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
