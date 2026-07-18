import 'server-only'

import { getSupabaseClient } from '@/lib/supabase'
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
  return data as RecommendationResult
}
