import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { CEO_COOKIE, verifyCeoSession } from '@/lib/ceo/auth'
import { syncMeta } from '@/lib/meta/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function validDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

export async function POST(request: NextRequest) {
  if (!verifyCeoSession(cookies().get(CEO_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as { since?: unknown; until?: unknown }
  const until = validDate(body.until) ?? new Date().toISOString().slice(0, 10)
  const since = validDate(body.since) ?? new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  if (since > until) return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    const result = await syncMeta({ since, until, requestId })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'meta_admin_sync_failed',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'Meta sync failed', requestId }, { status: 503 })
  }
}

