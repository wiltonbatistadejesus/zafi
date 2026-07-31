import 'server-only'

import { readFile } from 'fs/promises'
import path from 'path'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { StudioContent, StudioFormat, StudioLookup, StudioPage, StudioVersion } from './types'

export async function officialLogoDataUri() {
  const bytes = await readFile(path.join(process.cwd(), 'public', 'brand', 'zafi-logo.png'))
  return `data:image/png;base64,${bytes.toString('base64')}`
}

export async function getArtworkInput(versionId: string, pageNumber: number) {
  const client = getSupabaseAdminClient()
  const { data: version, error } = await client.from('content_studio_content_versions').select(`
    id,content_id,version_number,status,art_text,caption,cta,hashtags,sources,visual_direction,
    design_variant,author_name,author_type,based_on_version_id,change_summary,created_at,
    content:content_studio_contents(
      id,slug,internal_title,theme,objective,status,current_version_number,current_version_id,
      approved_version_id,created_by,created_at,updated_at,
      category:content_studio_categories(id,slug,label),
      network:content_studio_networks(id,slug,label),
      format:content_studio_formats(id,slug,label,width,height)
    ),
    pages:content_studio_pages(id,content_id,version_id,page_number,art_text,alt_text,visual_direction)
  `).eq('id', versionId).single()
  if (error || !version) throw new Error(`Arte não encontrada: ${error?.message ?? versionId}`)

  const contentRaw = Array.isArray(version.content) ? version.content[0] : version.content
  if (!contentRaw) throw new Error('Conteúdo da arte não encontrado')
  const category = (Array.isArray(contentRaw.category) ? contentRaw.category[0] : contentRaw.category) as StudioLookup
  const network = (Array.isArray(contentRaw.network) ? contentRaw.network[0] : contentRaw.network) as StudioLookup
  const format = (Array.isArray(contentRaw.format) ? contentRaw.format[0] : contentRaw.format) as StudioFormat
  const pages = ((version.pages ?? []) as StudioPage[]).sort((a, b) => a.page_number - b.page_number)
  const page = pages.find((candidate) => candidate.page_number === pageNumber)
  if (!page) throw new Error('Página da arte não encontrada')
  const normalizedVersion = { ...version, pages } as unknown as StudioVersion
  const content = { ...contentRaw, category, network, format, current_version: normalizedVersion } as unknown as StudioContent
  return { content, version: normalizedVersion, page, logoDataUri: await officialLogoDataUri() }
}
