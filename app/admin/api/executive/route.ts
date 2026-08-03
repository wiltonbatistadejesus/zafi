import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { CEO_COOKIE, verifyCeoSession } from '@/lib/ceo/auth'
import { getExecutiveSnapshot, resolveExecutivePeriod } from '@/lib/executive/data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!verifyCeoSession(cookies().get(CEO_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const period = resolveExecutivePeriod({
    period: params.get('period') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  })

  try {
    const snapshot = await getExecutiveSnapshot(period)
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'executive_os_api_failed',
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'Executive snapshot unavailable' }, { status: 503 })
  }
}
