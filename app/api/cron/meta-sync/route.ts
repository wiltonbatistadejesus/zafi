import { NextRequest, NextResponse } from 'next/server'
import { syncMeta } from '@/lib/meta/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function dateInSaoPaulo(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() ?? ''
  const supplied = request.headers.get('authorization') ?? ''
  if (!secret || supplied !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const now = new Date()
  const until = dateInSaoPaulo(now)
  const since = dateInSaoPaulo(new Date(now.getTime() - 7 * 86_400_000))
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    const result = await syncMeta({ since, until, requestId })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'meta_cron_sync_failed',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'Meta sync failed', requestId }, { status: 503 })
  }
}

