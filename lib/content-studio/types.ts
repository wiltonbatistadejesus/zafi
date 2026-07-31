export type ContentStudioStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'regenerating'
  | 'revised'
  | 'exported'
  | 'archived'

export type ContentNetwork = 'instagram' | 'facebook' | 'tiktok'
export type ContentFormat = 'static_post' | 'carousel' | 'story' | 'tiktok_image_sequence'

export type StudioLookup = { id: string; slug: string; label: string }

export type StudioFormat = StudioLookup & {
  width: number
  height: number
}

export type StudioPage = {
  id: string
  content_id: string
  version_id: string
  page_number: number
  art_text: string
  alt_text: string
  visual_direction: string
}

export type StudioVersion = {
  id: string
  content_id: string
  version_number: number
  status: ContentStudioStatus
  art_text: string
  caption: string
  cta: string
  hashtags: string[]
  sources: Array<{ title: string; publisher: string; url: string; consulted_at?: string }>
  visual_direction: string
  design_variant: string
  author_name: string
  author_type: 'agent' | 'human' | 'system'
  based_on_version_id: string | null
  change_summary: string | null
  created_at: string
  pages: StudioPage[]
}

export type StudioContent = {
  id: string
  slug: string
  internal_title: string
  theme: string
  objective: string
  status: ContentStudioStatus
  current_version_number: number
  current_version_id: string
  approved_version_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  category: StudioLookup
  network: StudioLookup
  format: StudioFormat
  current_version: StudioVersion
}

export type StudioReview = {
  id: string
  content_id: string
  version_id: string
  decision: 'approved' | 'rejected' | 'revision_requested'
  reason_code: string | null
  guidance: string | null
  actor_name: string
  actor_email: string
  actor_role: string
  created_at: string
}

export type StudioAuditEvent = {
  id: string
  content_id: string | null
  version_id: string | null
  event_type: string
  actor_name: string
  actor_role: string
  payload: Record<string, unknown>
  created_at: string
}

export type StudioContentDetail = StudioContent & {
  versions: StudioVersion[]
  reviews: StudioReview[]
  audit: StudioAuditEvent[]
}

export type StudioDashboard = {
  generatedAt: string
  contents: StudioContent[]
  categories: StudioLookup[]
  networks: StudioLookup[]
  formats: StudioFormat[]
  metrics: {
    total: number
    pending: number
    approved: number
    rejected: number
    regenerating: number
    exported: number
    last7Days: number
    last30Days: number
  }
  byNetwork: Array<{ label: string; value: number }>
  byCategory: Array<{ label: string; value: number }>
}

export type StudioFilters = {
  status?: string
  network?: string
  category?: string
  format?: string
  query?: string
  created?: string
}

export const STATUS_LABELS: Record<ContentStudioStatus, string> = {
  draft: 'Rascunho',
  pending_review: 'Aguardando aprovação',
  approved: 'Aprovado',
  rejected: 'Reprovado',
  regenerating: 'Em refação',
  revised: 'Revisado',
  exported: 'Exportado',
  archived: 'Arquivado',
}

export const REJECTION_REASONS = [
  ['image_off_brand', 'Imagem fora do padrão'],
  ['identity_incorrect', 'Identidade visual incorreta'],
  ['text_error', 'Texto com erro'],
  ['mission_misaligned', 'Mensagem desalinhada à missão'],
  ['repetitive', 'Conteúdo repetitivo'],
  ['low_quality', 'Baixa qualidade'],
  ['cta_inadequate', 'CTA inadequado'],
  ['dubious_information', 'Informação duvidosa'],
  ['compliance', 'Compliance'],
  ['other', 'Outro'],
] as const
