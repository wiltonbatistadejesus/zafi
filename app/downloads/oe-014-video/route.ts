import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    'public',
    'content-factory',
    'oe-014',
    'oe-014-primeira-campanha.mp4',
  )
  const file = await readFile(filePath)

  return new Response(file, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(file.byteLength),
      'Content-Disposition':
        'attachment; filename="zafi-oe-014-primeira-campanha.mp4"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
