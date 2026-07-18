import { NextRequest, NextResponse } from 'next/server'
import { runRecommendation } from '@/lib/recommendation/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { visitorId?: string; sessionId?: string; pageRoute?: string }
    const pageRoute = body.pageRoute ?? '/'
    if (!body.visitorId || !body.sessionId || !UUID.test(body.visitorId) || !UUID.test(body.sessionId) ||
        !pageRoute.startsWith('/') || pageRoute.length > 500 || JSON.stringify(body).length > 2_000) {
      return NextResponse.json({ error: 'Invalid recommendation request' }, { status: 400 })
    }

    const result = await runRecommendation({ visitorId: body.visitorId, sessionId: body.sessionId, pageRoute })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    console.error('Recommendation pipeline failed:', error)
    if (/profile not found|session not recognized|financial context incomplete/.test(message)) {
      return NextResponse.json({ error: 'Recommendation context unavailable' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Recommendation engine unavailable' }, { status: 503 })
  }
}
