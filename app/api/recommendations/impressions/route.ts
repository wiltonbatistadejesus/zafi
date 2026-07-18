import { NextRequest, NextResponse } from 'next/server'
import { recordRecommendationImpressions } from '@/lib/recommendation/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      runId?: string
      impressionId?: string
      decisionIds?: string[]
      visitorId?: string
      sessionId?: string
      sourcePage?: string
      occurredAt?: string
    }
    const decisionIds = Array.isArray(body.decisionIds) ? Array.from(new Set(body.decisionIds)) : []
    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : null
    if (!body.runId || !body.impressionId || !body.visitorId || !body.sessionId ||
        !UUID.test(body.runId) || !UUID.test(body.impressionId) || !UUID.test(body.visitorId) || !UUID.test(body.sessionId) ||
        decisionIds.length === 0 || decisionIds.length > 100 || decisionIds.some((id) => !UUID.test(id)) ||
        !body.sourcePage || body.sourcePage.length > 2048 || !occurredAt || Number.isNaN(occurredAt.getTime()) ||
        JSON.stringify(body).length > 20_000) {
      return NextResponse.json({ error: 'Invalid recommendation impression' }, { status: 400 })
    }

    const receipt = await recordRecommendationImpressions({
      runId: body.runId,
      impressionId: body.impressionId,
      decisionIds,
      visitorId: body.visitorId,
      sessionId: body.sessionId,
      sourcePage: body.sourcePage,
      occurredAt: occurredAt.toISOString(),
    })
    return NextResponse.json(receipt, {
      status: receipt.duplicate ? 200 : 201,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/context mismatch|decision mismatch|not found/.test(message)) {
      return NextResponse.json({ error: 'Recommendation attribution mismatch' }, { status: 409 })
    }
    console.error('Recommendation impression pipeline failed:', error)
    return NextResponse.json({ error: 'Recommendation attribution unavailable' }, { status: 503 })
  }
}
