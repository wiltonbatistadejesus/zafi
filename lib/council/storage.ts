import 'server-only'
import { createHash, randomUUID } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const BUCKET = 'strategic-council'
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'text/plain',
  'application/json',
  'text/csv',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function safeFileName(value: string) {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
  return safe.slice(-120) || 'evidence'
}

export async function uploadCouncilFile(orderId: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Tipo de arquivo não permitido')
  if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('O anexo deve ter no máximo 4 MB')

  const bytes = Buffer.from(await file.arrayBuffer())
  const checksum = createHash('sha256').update(bytes).digest('hex')
  const path = `${orderId}/${randomUUID()}-${safeFileName(file.name)}`
  const { error } = await getSupabaseAdminClient().storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(`Falha ao armazenar anexo: ${error.message}`)
  return { path, checksum }
}

export async function signedCouncilFileUrl(path: string) {
  const { data, error } = await getSupabaseAdminClient().storage.from(BUCKET).createSignedUrl(path, 300)
  if (error || !data?.signedUrl) throw new Error(`Falha ao abrir anexo: ${error?.message ?? 'URL ausente'}`)
  return data.signedUrl
}
