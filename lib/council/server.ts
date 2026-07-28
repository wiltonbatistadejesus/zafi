import 'server-only'
import { getSupabaseClient } from '@/lib/supabase'
import type { AdminSession } from '@/lib/ceo/auth'
import type {
  CeoDecisionType,
  CouncilDashboard,
  CouncilVerdict,
  ExecutiveOrderDetail,
  ExecutivePriority,
  OrderAttachment,
} from './types'

function secret() {
  const value = process.env.COUNCIL_SERVER_SECRET || process.env.TELEMETRY_SERVER_SECRET
  if (!value) throw new Error('Strategic Council server secret is not configured')
  return value
}

async function rpc<T>(name: string, args: Record<string, unknown>) {
  const { data, error } = await getSupabaseClient().rpc(name, { p_secret: secret(), ...args })
  if (error || !data) throw new Error(`${name} failed: ${error?.message ?? 'empty response'}`)
  return data as T
}

function actor(session: AdminSession) {
  return {
    p_actor_name: session.name,
    p_actor_email: session.email,
    p_actor_role: session.role,
  }
}

export function getCouncilDashboard() {
  return rpc<CouncilDashboard>('executive_dashboard_snapshot', {})
}

export function getExecutiveOrder(oeCode: string) {
  return rpc<ExecutiveOrderDetail>('executive_order_snapshot', { p_oe_code: oeCode })
}

export function getExecutiveAttachment(id: string) {
  return rpc<OrderAttachment & { oe_code: string }>('executive_attachment_lookup', { p_attachment_id: id })
}

export function createExecutiveOrder(input: {
  oeCode: string
  title: string
  description: string
  priority: ExecutivePriority
  session: AdminSession
}) {
  return rpc<string>('executive_create_order', {
    p_oe_code: input.oeCode,
    p_title: input.title,
    p_description: input.description,
    p_priority: input.priority,
    ...actor(input.session),
  })
}

export function submitEngineeringReport(input: {
  oeCode: string
  implementationStatus: 'not_started' | 'in_progress' | 'blocked' | 'completed'
  completionPercentage: number
  summary: string
  evidences: string[]
  changedFiles: string[]
  commits: string[]
  tests: string[]
  risks: string[]
  pendingItems: string[]
  limitations: string[]
  acceptanceCriteria: string[]
  session: AdminSession
}) {
  return rpc<string>('executive_submit_engineering_report', {
    p_oe_code: input.oeCode,
    p_implementation_status: input.implementationStatus,
    p_completion_percentage: input.completionPercentage,
    p_summary: input.summary,
    p_evidences: input.evidences,
    p_changed_files: input.changedFiles,
    p_commits: input.commits,
    p_tests: input.tests,
    p_risks: input.risks,
    p_pending_items: input.pendingItems,
    p_limitations: input.limitations,
    p_acceptance_criteria: input.acceptanceCriteria,
    ...actor(input.session),
  })
}

export function submitCouncilOpinion(input: {
  oeCode: string
  verdict: CouncilVerdict
  justification: string
  recommendations: string[]
  nextActions: string[]
  session: AdminSession
}) {
  return rpc<string>('executive_submit_council_opinion', {
    p_oe_code: input.oeCode,
    p_verdict: input.verdict,
    p_justification: input.justification,
    p_recommendations: input.recommendations,
    p_next_actions: input.nextActions,
    ...actor(input.session),
  })
}

export function recordCeoDecision(input: {
  oeCode: string
  decision: CeoDecisionType
  justification: string
  priority: ExecutivePriority
  session: AdminSession
}) {
  return rpc<string>('executive_record_ceo_decision', {
    p_oe_code: input.oeCode,
    p_decision: input.decision,
    p_justification: input.justification,
    p_priority: input.priority,
    ...actor(input.session),
  })
}

export function registerExecutiveAttachment(input: {
  oeCode: string
  entityType: 'order' | 'engineering_report' | 'council_opinion' | 'ceo_decision'
  entityId?: string | null
  attachmentType: 'pdf' | 'image' | 'video' | 'log' | 'document' | 'link'
  fileName: string
  mimeType: string
  sizeBytes: number
  storagePath?: string | null
  externalUrl?: string | null
  inlineContent?: string | null
  checksumSha256?: string | null
  session: AdminSession
}) {
  return rpc<string>('executive_register_attachment', {
    p_oe_code: input.oeCode,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_attachment_type: input.attachmentType,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType,
    p_size_bytes: input.sizeBytes,
    p_storage_path: input.storagePath ?? null,
    p_external_url: input.externalUrl ?? null,
    p_inline_content: input.inlineContent ?? null,
    p_checksum_sha256: input.checksumSha256 ?? null,
    ...actor(input.session),
  })
}
