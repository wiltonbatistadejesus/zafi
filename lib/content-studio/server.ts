import 'server-only'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { AdminSession } from '@/lib/ceo/auth'
import type {
  StudioContent,
  StudioContentDetail,
  StudioDashboard,
  StudioFilters,
  StudioFormat,
  StudioLookup,
  StudioPage,
  StudioVersion,
} from './types'

const CONTENT_SELECT = `
  id, slug, internal_title, theme, objective, status, current_version_number,
  current_version_id, approved_version_id, created_by, created_at, updated_at,
  category:content_studio_categories(id,slug,label),
  network:content_studio_networks(id,slug,label),
  format:content_studio_formats(id,slug,label,width,height),
  current_version:content_studio_content_versions!content_studio_contents_current_version_id_fkey(
    id,content_id,version_number,status,art_text,caption,cta,hashtags,sources,
    visual_direction,design_variant,author_name,author_type,based_on_version_id,change_summary,created_at,
    pages:content_studio_pages(id,content_id,version_id,page_number,art_text,alt_text,visual_direction)
  )
`

function one<T>(value: T | T[] | null | undefined): T {
  if (Array.isArray(value)) return value[0] as T
  if (!value) throw new Error('Content Studio relation is missing')
  return value
}

function normalizeVersion(raw: any): StudioVersion {
  return {
    ...raw,
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    pages: (raw.pages ?? []).slice().sort((a: StudioPage, b: StudioPage) => a.page_number - b.page_number),
  }
}

function normalizeContent(raw: any): StudioContent {
  return {
    ...raw,
    category: one<StudioLookup>(raw.category),
    network: one<StudioLookup>(raw.network),
    format: one<StudioFormat>(raw.format),
    current_version: normalizeVersion(one<StudioVersion>(raw.current_version)),
  }
}

export async function getStudioDashboard(filters: StudioFilters = {}): Promise<StudioDashboard> {
  const client = getSupabaseAdminClient()
  const [contentsResult, categoriesResult, networksResult, formatsResult] = await Promise.all([
    client.from('content_studio_contents').select(CONTENT_SELECT).order('created_at', { ascending: false }).limit(300),
    client.from('content_studio_categories').select('id,slug,label').eq('active', true).order('sort_order'),
    client.from('content_studio_networks').select('id,slug,label').eq('active', true).order('label'),
    client.from('content_studio_formats').select('id,slug,label,width,height').eq('active', true).order('label'),
  ])
  const error = contentsResult.error || categoriesResult.error || networksResult.error || formatsResult.error
  if (error) throw new Error(`Content Studio dashboard failed: ${error.message}`)

  const all = (contentsResult.data ?? []).map(normalizeContent)
  const now = Date.now()
  const day = 86_400_000
  const matches = all.filter((content) => {
    if (filters.status && content.status !== filters.status) return false
    if (filters.network && content.network.slug !== filters.network) return false
    if (filters.category && content.category.slug !== filters.category) return false
    if (filters.format && content.format.slug !== filters.format) return false
    if (filters.created === '7d' && now - new Date(content.created_at).getTime() > 7 * day) return false
    if (filters.created === '30d' && now - new Date(content.created_at).getTime() > 30 * day) return false
    if (filters.query) {
      const haystack = `${content.internal_title} ${content.theme} ${content.current_version.art_text} ${content.current_version.caption}`.toLocaleLowerCase('pt-BR')
      if (!haystack.includes(filters.query.toLocaleLowerCase('pt-BR'))) return false
    }
    return true
  })

  const count = (status: string) => all.filter((content) => content.status === status).length
  const byNetwork = (networksResult.data ?? []).map((network: any) => ({
    label: network.label,
    value: all.filter((content) => content.network.slug === network.slug).length,
  }))
  const byCategory = (categoriesResult.data ?? []).map((category: any) => ({
    label: category.label,
    value: all.filter((content) => content.category.slug === category.slug).length,
  })).filter((item: { value: number }) => item.value > 0)

  return {
    generatedAt: new Date().toISOString(),
    contents: matches,
    categories: (categoriesResult.data ?? []) as StudioLookup[],
    networks: (networksResult.data ?? []) as StudioLookup[],
    formats: (formatsResult.data ?? []) as StudioFormat[],
    metrics: {
      total: all.length,
      pending: count('pending_review'),
      approved: count('approved'),
      rejected: count('rejected'),
      regenerating: count('regenerating'),
      exported: count('exported'),
      last7Days: all.filter((content) => now - new Date(content.created_at).getTime() <= 7 * day).length,
      last30Days: all.filter((content) => now - new Date(content.created_at).getTime() <= 30 * day).length,
    },
    byNetwork,
    byCategory,
  }
}

export async function getStudioContent(id: string): Promise<StudioContentDetail> {
  const client = getSupabaseAdminClient()
  const contentResult = await client.from('content_studio_contents').select(CONTENT_SELECT).eq('id', id).single()
  if (contentResult.error || !contentResult.data) throw new Error(`Content not found: ${contentResult.error?.message ?? id}`)
  const [versionsResult, reviewsResult, auditResult] = await Promise.all([
    client.from('content_studio_content_versions').select('*,pages:content_studio_pages(*)').eq('content_id', id).order('version_number', { ascending: false }),
    client.from('content_studio_reviews').select('*').eq('content_id', id).order('created_at', { ascending: false }),
    client.from('content_studio_audit_events').select('*').eq('content_id', id).order('created_at', { ascending: false }).limit(100),
  ])
  const error = versionsResult.error || reviewsResult.error || auditResult.error
  if (error) throw new Error(`Content detail failed: ${error.message}`)
  return {
    ...normalizeContent(contentResult.data),
    versions: (versionsResult.data ?? []).map(normalizeVersion),
    reviews: reviewsResult.data ?? [],
    audit: auditResult.data ?? [],
  }
}

export async function approveStudioContent(contentId: string, session: AdminSession) {
  const { data, error } = await getSupabaseAdminClient().rpc('content_studio_approve', {
    p_content_id: contentId,
    p_actor_name: session.name,
    p_actor_email: session.email,
    p_actor_role: session.role,
  })
  if (error) throw new Error(`Approval failed: ${error.message}`)
  return data as string
}

export async function createStudioRevision(input: {
  contentId: string
  artText: string
  caption: string
  cta: string
  hashtags: string[]
  visualDirection: string
  designVariant: string
  pages: Array<Pick<StudioPage, 'page_number' | 'art_text' | 'alt_text' | 'visual_direction'>>
  changeSummary: string
  session: AdminSession
}) {
  const { data, error } = await getSupabaseAdminClient().rpc('content_studio_create_revision', {
    p_content_id: input.contentId,
    p_art_text: input.artText,
    p_caption: input.caption,
    p_cta: input.cta,
    p_hashtags: input.hashtags,
    p_visual_direction: input.visualDirection,
    p_design_variant: input.designVariant,
    p_pages: input.pages,
    p_change_summary: input.changeSummary,
    p_actor_name: input.session.name,
    p_actor_email: input.session.email,
    p_actor_role: input.session.role,
  })
  if (error) throw new Error(`Revision failed: ${error.message}`)
  return data as string
}

export async function rejectAndRegenerateStudioContent(input: {
  contentId: string
  reasonCode: string
  guidance: string
  artText: string
  caption: string
  cta: string
  hashtags: string[]
  visualDirection: string
  designVariant: string
  pages: Array<Pick<StudioPage, 'page_number' | 'art_text' | 'alt_text' | 'visual_direction'>>
  session: AdminSession
}) {
  const { data, error } = await getSupabaseAdminClient().rpc('content_studio_reject_and_regenerate', {
    p_content_id: input.contentId,
    p_reason_code: input.reasonCode,
    p_guidance: input.guidance,
    p_art_text: input.artText,
    p_caption: input.caption,
    p_cta: input.cta,
    p_hashtags: input.hashtags,
    p_visual_direction: input.visualDirection,
    p_design_variant: input.designVariant,
    p_pages: input.pages,
    p_actor_name: input.session.name,
    p_actor_email: input.session.email,
    p_actor_role: input.session.role,
  })
  if (error) throw new Error(`Rejection/refactor failed: ${error.message}`)
  return data as string
}

export async function archiveStudioContent(contentId: string, session: AdminSession) {
  const { error } = await getSupabaseAdminClient().rpc('content_studio_archive', {
    p_content_id: contentId,
    p_actor_name: session.name,
    p_actor_email: session.email,
    p_actor_role: session.role,
  })
  if (error) throw new Error(`Archive failed: ${error.message}`)
}

export async function recordBulkAction(input: {
  action: 'approve' | 'reject' | 'export' | 'archive'
  contentIds: string[]
  reasonCode?: string
  guidance?: string
  session: AdminSession
  outcomes: Array<{ contentId: string; versionId: string | null; outcome: string }>
}) {
  const client = getSupabaseAdminClient()
  const { data, error } = await client.from('content_studio_bulk_actions').insert({
    action_type: input.action,
    reason_code: input.reasonCode || null,
    guidance: input.guidance || null,
    item_count: input.contentIds.length,
    actor_name: input.session.name,
    actor_email: input.session.email,
  }).select('id').single()
  if (error || !data) throw new Error(`Bulk action audit failed: ${error?.message ?? 'empty response'}`)
  const { error: itemError } = await client.from('content_studio_bulk_action_items').insert(input.outcomes.map((outcome) => ({
    bulk_action_id: data.id,
    content_id: outcome.contentId,
    version_id: outcome.versionId,
    outcome: outcome.outcome,
  })))
  if (itemError) throw new Error(`Bulk action item audit failed: ${itemError.message}`)
  return data.id as string
}

export async function recordStudioExport(contentIds: string[], fileName: string, manifest: Record<string, unknown>, session: AdminSession) {
  const { data, error } = await getSupabaseAdminClient().rpc('content_studio_record_export', {
    p_content_ids: contentIds,
    p_file_name: fileName,
    p_manifest: manifest,
    p_actor_name: session.name,
    p_actor_email: session.email,
    p_actor_role: session.role,
  })
  if (error) throw new Error(`Export audit failed: ${error.message}`)
  return data as string
}

export async function getApprovedExportContents(contentIds: string[]) {
  const details = await Promise.all(contentIds.map((id) => getStudioContent(id)))
  return details.map((content) => {
    const version = content.versions.find((candidate) => candidate.id === content.approved_version_id)
    if (!version) throw new Error(`Content ${content.internal_title} has no approved version`)
    return { ...content, current_version: version }
  })
}
