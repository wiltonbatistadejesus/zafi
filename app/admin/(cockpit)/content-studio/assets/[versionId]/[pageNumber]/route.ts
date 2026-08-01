import { getAdminSession } from '@/lib/ceo/auth'
import { getArtworkInput } from '@/lib/content-studio/assets'
import { renderStudioArtwork } from '@/lib/content-studio/artwork'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { versionId: string; pageNumber: string } }) {
  const startedAt = Date.now()
  if (getAdminSession()?.role !== 'ceo') return new Response('Não autorizado', { status: 401 })
  const pageNumber = Number(params.pageNumber)
  if (!Number.isInteger(pageNumber) || pageNumber < 1) return new Response('Página inválida', { status: 400 })
  try {
    const input = await getArtworkInput(params.versionId, pageNumber)
    const png = await renderStudioArtwork(input)
    console.log(JSON.stringify({
      level: 'info',
      message: 'Content Studio artwork rendered',
      route: '/admin/content-studio/assets/[versionId]/[pageNumber]',
      requestId: request.headers.get('x-vercel-id'),
      versionId: params.versionId,
      pageNumber,
      durationMs: Date.now() - startedAt,
    }))
    return new Response(new Uint8Array(png), { headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="zafi-${input.content.slug}-v${input.version.version_number}-p${pageNumber}.png"`,
    } })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Content Studio artwork failed',
      route: '/admin/content-studio/assets/[versionId]/[pageNumber]',
      requestId: request.headers.get('x-vercel-id'),
      versionId: params.versionId,
      pageNumber,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }))
    return new Response(error instanceof Error ? error.message : 'Arte indisponível', { status: 404 })
  }
}
