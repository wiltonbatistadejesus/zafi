import 'server-only'

import { getSupabaseClient } from '@/lib/supabase'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { RecommendationResult } from './types'

function secret() {
  const value = process.env.TELEMETRY_SERVER_SECRET
  if (!value) throw new Error('TELEMETRY_SERVER_SECRET is not configured')
  return value
}

export async function runRecommendation(input: { visitorId: string; sessionId: string; pageRoute: string }) {
  const { data, error } = await getSupabaseClient().rpc('recommendation_run', {
    p_secret: secret(),
    p_visitor_id: input.visitorId,
    p_session_id: input.sessionId,
    p_page_route: input.pageRoute,
  })
  if (error || !data) throw new Error(`Recommendation engine failed: ${error?.message ?? 'empty response'}`)

  const base = data as RecommendationResult
  const { data: governed, error: governanceError } = await getSupabaseAdminClient().rpc('recommendation_apply_traffic_policy', {
    p_secret: secret(),
    p_run_id: base.runId,
  })
  if (governanceError || !governed) {
    throw new Error(`Recommendation traffic policy failed: ${governanceError?.message ?? 'empty response'}`)
  }
  return governed as RecommendationResult
}

export async function recordRecommendationImpressions(input: {
  runId: string
  impressionId: string
  decisionIds: string[]
  visitorId: string
  sessionId: string
  sourcePage: string
  occurredAt: string
}) {
  const { data, error } = await getSupabaseClient().rpc('recommendation_record_impressions', {
    p_secret: secret(),
    p_run_id: input.runId,
    p_impression_id: input.impressionId,
    p_decision_ids: input.decisionIds,
    p_visitor_id: input.visitorId,
    p_session_id: input.sessionId,
    p_source_page: input.sourcePage,
    p_occurred_at: input.occurredAt,
  })
  if (error || !data) throw new Error(`Recommendation impression persistence failed: ${error?.message ?? 'empty response'}`)
  return data
}
