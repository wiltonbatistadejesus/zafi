'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/ceo/auth'
import {
  approveStudioContent,
  archiveStudioContent,
  createStudioRevision,
  getStudioContent,
  recordBulkAction,
  rejectAndRegenerateStudioContent,
} from '@/lib/content-studio/server'
import { regenerateContent, revisionPages } from '@/lib/content-studio/regenerate'

function requireCeo() {
  const session = getAdminSession()
  if (!session) redirect('/admin/login')
  if (session.role !== 'ceo') throw new Error('Somente o CEO pode revisar conteúdos')
  return session
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function selectedIds(formData: FormData) {
  return formData.getAll('contentId').map(String).filter(Boolean).slice(0, 100)
}

function refresh(contentId?: string) {
  revalidatePath('/admin/content-studio')
  if (contentId) revalidatePath(`/admin/content-studio/${contentId}`)
}

export async function approveContentAction(formData: FormData) {
  const session = requireCeo()
  const contentId = value(formData, 'contentId')
  await approveStudioContent(contentId, session)
  refresh(contentId)
  redirect(`/admin/content-studio/${contentId}?notice=approved`)
}

export async function rejectContentAction(formData: FormData) {
  const session = requireCeo()
  const contentId = value(formData, 'contentId')
  const reasonCode = value(formData, 'reasonCode')
  if (!reasonCode) throw new Error('O motivo da reprovação é obrigatório')
  const guidance = value(formData, 'guidance')
  const content = await getStudioContent(contentId)
  const revision = regenerateContent(content, reasonCode, guidance)
  await rejectAndRegenerateStudioContent({ contentId, reasonCode, guidance, ...revision, session })
  refresh(contentId)
  redirect(`/admin/content-studio/${contentId}?notice=regenerated`)
}

export async function reviseContentAction(formData: FormData) {
  const session = requireCeo()
  const contentId = value(formData, 'contentId')
  const content = await getStudioContent(contentId)
  const artText = value(formData, 'artText')
  const caption = value(formData, 'caption')
  const cta = value(formData, 'cta')
  const hashtags = value(formData, 'hashtags').split(/\s+/).filter((item) => item.startsWith('#')).slice(0, 20)
  await createStudioRevision({
    contentId,
    artText,
    caption,
    cta,
    hashtags,
    visualDirection: value(formData, 'visualDirection') || content.current_version.visual_direction,
    designVariant: value(formData, 'designVariant') || content.current_version.design_variant,
    pages: revisionPages(content, artText),
    changeSummary: value(formData, 'changeSummary') || 'Revisão manual criada pelo CEO.',
    session,
  })
  refresh(contentId)
  redirect(`/admin/content-studio/${contentId}?notice=revised`)
}

export async function archiveContentAction(formData: FormData) {
  const session = requireCeo()
  const contentId = value(formData, 'contentId')
  await archiveStudioContent(contentId, session)
  refresh(contentId)
  redirect('/admin/content-studio?notice=archived')
}

export async function bulkContentAction(formData: FormData) {
  const session = requireCeo()
  const action = value(formData, 'bulkAction') as 'approve' | 'reject' | 'archive'
  const ids = selectedIds(formData)
  if (!ids.length) redirect('/admin/content-studio?notice=bulk-empty')
  if (!['approve', 'reject', 'archive'].includes(action)) redirect('/admin/content-studio?notice=bulk-invalid-action')

  const reasonCode = value(formData, 'reasonCode')
  const guidance = value(formData, 'guidance')
  if (action === 'reject' && !reasonCode) redirect('/admin/content-studio?notice=bulk-reason-required')
  console.info('[content-studio] bulk action started', { action, selectedCount: ids.length })
  const outcomes: Array<{ contentId: string; versionId: string | null; outcome: string }> = []

  for (const contentId of ids) {
    const content = await getStudioContent(contentId)
    let outcomeVersionId = content.current_version_id
    if (action === 'approve') await approveStudioContent(contentId, session)
    if (action === 'archive') await archiveStudioContent(contentId, session)
    if (action === 'reject') {
      const revision = regenerateContent(content, reasonCode, guidance)
      outcomeVersionId = await rejectAndRegenerateStudioContent({ contentId, reasonCode, guidance, ...revision, session })
    }
    outcomes.push({ contentId, versionId: outcomeVersionId, outcome: 'completed' })
  }

  await recordBulkAction({ action, contentIds: ids, reasonCode, guidance, session, outcomes })
  console.info('[content-studio] bulk action completed', { action, selectedCount: ids.length })
  refresh()
  redirect(`/admin/content-studio?notice=bulk-${action}`)
}
