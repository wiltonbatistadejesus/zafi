import { getAdminSession } from '@/lib/ceo/auth'
import { buildContentExport } from '@/lib/content-studio/export'
import { getApprovedExportContents, recordBulkAction, recordStudioExport } from '@/lib/content-studio/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = getAdminSession()
  if (!session || session.role !== 'ceo') return new Response('Não autorizado', { status: 401 })
  const formData = await request.formData()
  const contentIds = formData.getAll('contentId').map(String).filter(Boolean).slice(0, 100)
  if (!contentIds.length) return new Response('Selecione ao menos um conteúdo aprovado', { status: 400 })
  try {
    const contents = await getApprovedExportContents(contentIds)
    const { bytes, manifest } = await buildContentExport(contents)
    const stamp = new Date().toISOString().slice(0, 10)
    const fileName = `zafi-content-studio-${stamp}.zip`
    await recordStudioExport(contentIds, fileName, { items: manifest }, session)
    if (contentIds.length > 1) await recordBulkAction({
      action: 'export', contentIds, session,
      outcomes: contents.map((content) => ({ contentId: content.id, versionId: content.current_version.id, outcome: 'completed' })),
    })
    return new Response(Uint8Array.from(bytes).buffer, {
      headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha na exportação', { status: 422 })
  }
}
