import { getAdminSession } from '@/lib/ceo/auth'
import { getApprovedExportContents, recordStudioExport } from '@/lib/content-studio/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase()
}

export async function GET(_request: Request, { params }: { params: { contentId: string } }) {
  const session = getAdminSession()
  if (!session || session.role !== 'ceo') return new Response('Não autorizado', { status: 401 })

  try {
    const [content] = await getApprovedExportContents([params.contentId])
    const version = content.current_version
    const fileName = `zafi_${content.network.slug}_${content.category.slug}_${safeName(content.slug)}_v${version.version_number}.txt`
    const body = [
      `ID: ${content.id}`,
      `Título: ${content.internal_title}`,
      `Tema: ${content.theme}`,
      `Objetivo: ${content.objective}`,
      `Rede: ${content.network.label}`,
      `Formato: ${content.format.label}`,
      `Categoria: ${content.category.label}`,
      `Versão aprovada: ${version.version_number}`,
      '',
      'TEXTO DA ARTE',
      version.art_text,
      '',
      'LEGENDA',
      version.caption,
      '',
      'CTA',
      version.cta,
      '',
      'HASHTAGS',
      version.hashtags.join(' '),
      '',
      'PÁGINAS',
      ...version.pages.map((page) => `${page.page_number}. ${page.art_text}`),
      '',
      'Aprovação humana registrada no Zafi Content Studio. Este arquivo não representa publicação automática.',
    ].join('\n')

    await recordStudioExport([content.id], fileName, {
      format: 'txt',
      content_id: content.id,
      version_id: version.id,
      network: content.network.slug,
    }, session)

    return new Response(`\uFEFF${body}`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha na exportação', { status: 422 })
  }
}
