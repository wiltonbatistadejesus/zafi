'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getAdminSession, type AdminRole } from '@/lib/ceo/auth'
import {
  createExecutiveOrder,
  getExecutiveOrder,
  recordCeoDecision,
  registerExecutiveAttachment,
  submitCouncilOpinion,
  submitEngineeringReport,
} from '@/lib/council/server'
import { uploadCouncilFile } from '@/lib/council/storage'
import type { CeoDecisionType, CouncilVerdict, ExecutivePriority } from '@/lib/council/types'

function requireSession(roles: AdminRole[]) {
  const session = getAdminSession()
  if (!session) redirect('/admin/login')
  if (!roles.includes(session.role)) throw new Error('Seu perfil não pode executar esta ação')
  return session
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function lines(formData: FormData, key: string) {
  return text(formData, key).split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 200)
}

function oeCode(formData: FormData) {
  return text(formData, 'oeCode').toUpperCase()
}

function attachmentType(mime: string) {
  if (mime === 'application/pdf') return 'pdf' as const
  if (mime.startsWith('image/')) return 'image' as const
  if (mime.startsWith('video/')) return 'video' as const
  if (mime.startsWith('text/') || mime === 'application/json') return 'log' as const
  return 'document' as const
}

export async function createOrderAction(formData: FormData) {
  const session = requireSession(['ceo', 'council'])
  const code = oeCode(formData)
  await createExecutiveOrder({
    oeCode: code,
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    priority: text(formData, 'priority') as ExecutivePriority,
    session,
  })
  revalidatePath('/admin/council')
  redirect(`/admin/council/${encodeURIComponent(code)}?notice=created`)
}

export async function engineeringReportAction(formData: FormData) {
  const session = requireSession(['engineering'])
  const code = oeCode(formData)
  await submitEngineeringReport({
    oeCode: code,
    implementationStatus: text(formData, 'implementationStatus') as 'not_started' | 'in_progress' | 'blocked' | 'completed',
    completionPercentage: Number(text(formData, 'completionPercentage')),
    summary: text(formData, 'summary'),
    evidences: lines(formData, 'evidences'),
    changedFiles: lines(formData, 'changedFiles'),
    commits: lines(formData, 'commits'),
    tests: lines(formData, 'tests'),
    risks: lines(formData, 'risks'),
    pendingItems: lines(formData, 'pendingItems'),
    limitations: lines(formData, 'limitations'),
    acceptanceCriteria: lines(formData, 'acceptanceCriteria'),
    session,
  })
  revalidatePath('/admin/council')
  revalidatePath(`/admin/council/${code}`)
  redirect(`/admin/council/${encodeURIComponent(code)}?notice=engineering`)
}

export async function councilOpinionAction(formData: FormData) {
  const session = requireSession(['council'])
  const code = oeCode(formData)
  await submitCouncilOpinion({
    oeCode: code,
    verdict: text(formData, 'verdict') as CouncilVerdict,
    justification: text(formData, 'justification'),
    recommendations: lines(formData, 'recommendations'),
    nextActions: lines(formData, 'nextActions'),
    session,
  })
  revalidatePath('/admin/council')
  revalidatePath(`/admin/council/${code}`)
  redirect(`/admin/council/${encodeURIComponent(code)}?notice=council`)
}

export async function ceoDecisionAction(formData: FormData) {
  const session = requireSession(['ceo'])
  const code = oeCode(formData)
  await recordCeoDecision({
    oeCode: code,
    decision: text(formData, 'decision') as CeoDecisionType,
    justification: text(formData, 'justification'),
    priority: text(formData, 'priority') as ExecutivePriority,
    session,
  })
  revalidatePath('/admin/council')
  revalidatePath(`/admin/council/${code}`)
  redirect(`/admin/council/${encodeURIComponent(code)}?notice=ceo`)
}

export async function attachmentAction(formData: FormData) {
  const session = requireSession(['ceo', 'council', 'engineering'])
  const code = oeCode(formData)
  const order = await getExecutiveOrder(code)
  const mode = text(formData, 'mode')
  const file = formData.get('file')

  if (mode === 'file' && file instanceof File && file.size > 0) {
    const uploaded = await uploadCouncilFile(order.id, file)
    await registerExecutiveAttachment({
      oeCode: code,
      entityType: 'order',
      attachmentType: attachmentType(file.type),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath: uploaded.path,
      checksumSha256: uploaded.checksum,
      session,
    })
  } else if (mode === 'link') {
    const url = new URL(text(formData, 'externalUrl'))
    if (url.protocol !== 'https:') throw new Error('O anexo externo deve usar HTTPS')
    await registerExecutiveAttachment({
      oeCode: code,
      entityType: 'order',
      attachmentType: 'link',
      fileName: text(formData, 'label') || url.hostname,
      mimeType: 'text/uri-list',
      sizeBytes: 0,
      externalUrl: url.toString(),
      session,
    })
  } else if (mode === 'log') {
    const content = text(formData, 'inlineContent')
    await registerExecutiveAttachment({
      oeCode: code,
      entityType: 'order',
      attachmentType: 'log',
      fileName: text(formData, 'label') || 'log.txt',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      inlineContent: content,
      checksumSha256: null,
      session,
    })
  } else {
    throw new Error('Selecione um arquivo, link ou log válido')
  }

  revalidatePath(`/admin/council/${code}`)
  redirect(`/admin/council/${encodeURIComponent(code)}?notice=attachment`)
}
