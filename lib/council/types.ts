import type { AdminRole } from '@/lib/ceo/auth'

export type ExecutivePriority = 'maximum' | 'high' | 'medium' | 'low'
export type ExecutiveStatus =
  | 'draft' | 'open' | 'in_progress' | 'awaiting_council' | 'awaiting_ceo'
  | 'adjustments_requested' | 'reprioritized' | 'blocked' | 'approved'
  | 'completed' | 'rejected'

export type ExecutiveOrderSummary = {
  order_id: string
  oe_code: string
  created_at: string
  version: number
  title: string
  description: string
  priority: ExecutivePriority
  status: ExecutiveStatus
  author_name: string
  author_email: string
  author_role: AdminRole
  revised_at: string
  completion_percentage: number
  engineering_updated_at: string | null
  latest_verdict: CouncilVerdict | null
  latest_decision: CeoDecisionType | null
  approver_name: string | null
  approver_email: string | null
}

export type CouncilDashboard = {
  generated_at: string
  metrics: {
    open: number
    completed: number
    blocked: number
    average_implementation_days: number | string | null
    average_approval_days: number | string | null
    bottlenecks: Array<{ status: ExecutiveStatus; count: number }>
  }
  orders: ExecutiveOrderSummary[]
}

export type OrderRevision = {
  id: string
  order_id: string
  version: number
  title: string
  description: string
  priority: ExecutivePriority
  status: ExecutiveStatus
  author_name: string
  author_email: string
  author_role: AdminRole
  change_reason: string
  created_at: string
}

export type EngineeringReport = {
  id: string
  order_id: string
  version: number
  implementation_status: 'not_started' | 'in_progress' | 'blocked' | 'completed'
  completion_percentage: number
  summary: string
  evidences: string[]
  changed_files: string[]
  commits: string[]
  tests: string[]
  risks: string[]
  pending_items: string[]
  limitations: string[]
  acceptance_criteria: string[]
  author_name: string
  author_email: string
  created_at: string
}

export type CouncilVerdict = 'approved' | 'approved_with_reservations' | 'rejected'
export type CouncilOpinion = {
  id: string
  order_id: string
  version: number
  verdict: CouncilVerdict
  justification: string
  recommendations: string[]
  next_actions: string[]
  author_name: string
  author_email: string
  created_at: string
}

export type CeoDecisionType = 'approve' | 'request_adjustments' | 'reprioritize'
export type CeoDecision = {
  id: string
  order_id: string
  version: number
  decision: CeoDecisionType
  justification: string
  decided_by_name: string
  decided_by_email: string
  created_at: string
}

export type OrderAttachment = {
  id: string
  order_id: string
  entity_type: 'order' | 'engineering_report' | 'council_opinion' | 'ceo_decision'
  entity_id: string | null
  attachment_type: 'pdf' | 'image' | 'video' | 'log' | 'document' | 'link'
  file_name: string
  mime_type: string
  size_bytes: number
  storage_path: string | null
  external_url: string | null
  inline_content: string | null
  checksum_sha256: string | null
  author_name: string
  author_email: string
  author_role: AdminRole
  created_at: string
}

export type AuditEvent = {
  id: string
  order_id: string
  event_type: 'order_created' | 'order_revised' | 'engineering_report_submitted' | 'council_opinion_submitted' | 'ceo_decision_recorded' | 'attachment_registered'
  actor_name: string
  actor_email: string
  actor_role: AdminRole
  entity_type: string
  entity_id: string
  payload: Record<string, unknown>
  created_at: string
}

export type ExecutiveOrderDetail = {
  generated_at: string
  id: string
  oe_code: string
  created_at: string
  current: OrderRevision
  revisions: OrderRevision[]
  engineering_reports: EngineeringReport[]
  council_opinions: CouncilOpinion[]
  ceo_decisions: CeoDecision[]
  attachments: OrderAttachment[]
  history: AuditEvent[]
}
