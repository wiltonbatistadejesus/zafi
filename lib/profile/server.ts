import { getSupabaseClient } from '@/lib/supabase'
import { PROFILE_POLICY_VERSION, type ProfileProgressRequest } from './schema'

function secret() {
  const value = process.env.TELEMETRY_SERVER_SECRET
  if (!value) throw new Error('TELEMETRY_SERVER_SECRET is not configured')
  return value
}

export async function recordProfileProgress(input: ProfileProgressRequest) {
  const financial = input.stage === 'financial_context'
  const { data, error } = await getSupabaseClient().rpc('profile_record_progress', {
    p_secret: secret(),
    p_stage: input.stage,
    p_visitor_id: input.visitorId,
    p_session_id: input.sessionId,
    p_full_name: financial ? null : input.fullName,
    p_email: financial ? null : input.email,
    p_total_debt: financial ? input.totalDebt : null,
    p_monthly_income: financial ? null : input.monthlyIncome,
    p_debt_count: financial ? input.debtCount : null,
    p_debt_types: financial ? input.debtTypes : null,
    p_creditors: financial ? input.creditors : null,
    p_estimated_months: financial ? null : input.estimatedMonths,
    p_contact_consent: financial ? null : input.contactConsent ? 'granted' : 'denied',
    p_policy_version: PROFILE_POLICY_VERSION,
    p_source: financial ? 'debt_registration' : 'analysis_final_step',
  })
  if (error || !data?.[0]) throw new Error(`Profile persistence failed: ${error?.message ?? 'empty response'}`)
  return data[0] as { profile_id: string; stage: string; persisted_at: string }
}

export async function recordProfileConsent(input: {
  visitorId: string
  sessionId: string
  purpose: 'analytics' | 'relationship' | 'personalization' | 'partner_sharing'
  status: 'granted' | 'denied' | 'withdrawn'
  source: string
}) {
  const { data, error } = await getSupabaseClient().rpc('profile_record_consent', {
    p_secret: secret(),
    p_visitor_id: input.visitorId,
    p_session_id: input.sessionId,
    p_purpose: input.purpose,
    p_status: input.status,
    p_policy_version: PROFILE_POLICY_VERSION,
    p_source: input.source,
  })
  if (error || !data?.[0]) throw new Error(`Consent persistence failed: ${error?.message ?? 'empty response'}`)
  return data[0] as { profile_id: string; consent_id: string; persisted_at: string }
}

