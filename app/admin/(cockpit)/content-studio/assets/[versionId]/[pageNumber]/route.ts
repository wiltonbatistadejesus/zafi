import { getAdminSession } from '@/lib/ceo/auth'
import { getArtworkInput } from '@/lib/content-studio/assets'
import { renderStudioArtwork } from '@/lib/content-studio/artwork'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { versionId: string; pageNumber: string } }) {
  if (getAdminSession()?.role !== 'ceo') return new Response('Não autorizado', { status: 401 })
  const pageNumber = Number(params.pageNumber)
  if (!Number.isInteger(pageNumber) || pageNumber < 1) return new Response('Página inválida', { status: 400 })
  try {
    const input = await getArtworkInput(params.versionId, pageNumber)
    const response = renderStudioArtwork(input)
    response.headers.set('Cache-Control', 'private, max-age=300')
    response.headers.set('Content-Disposition', `inline; filename="zafi-${input.content.slug}-v${input.version.version_number}-p${pageNumber}.png"`)
    return response
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Arte indisponível', { status: 404 })
  }
}
