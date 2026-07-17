import { NextRequest, NextResponse } from 'next/server'
import { recordEvent } from '@/lib/telemetry/server'
import type { AnalyticsConsent, TelemetryRequest } from '@/lib/telemetry/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED = new Set(['page_view', 'analysis_started', 'analysis_completed'])

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  console.log(JSON.stringify({ level: 'info', message: 'telemetry_start', route: '/api/telemetry', requestId }))

  try {
    const body = (await request.json()) as TelemetryRequest
    if (!ALLOWED.has(body.type) || !UUID.test(body.sessionId) || !UUID.test(body.visitorId)) {
      return NextResponse.json({ error: 'Invalid telemetry event' }, { status: 400 })
    }
    if (!['granted', 'denied', 'unknown'].includes(body.consent as AnalyticsConsent)) {
      return NextResponse.json({ error: 'Invalid consent state' }, { status: 400 })
    }
    if (!body.sourcePage || JSON.stringify(body).length > 24_000) {
      return NextResponse.json({ error: 'Invalid telemetry payload' }, { status: 413 })
    }

    const input = {
      type: body.type,
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      occurredAt: body.occurredAt,
      sourcePage: body.sourcePage.slice(0, 2048),
      source: body.source?.slice(0, 200) || 'direct',
      consent: body.consent,
      device: body.device ?? {},
      payload: { ...(body.payload ?? {}), campaign: body.campaign ?? {} },
      schemaVersion: body.schemaVersion || 1,
      requestId,
    }

    const persisted = await recordEvent(input)
    console.log(JSON.stringify({
      level: 'info', message: 'telemetry_done', route: '/api/telemetry', requestId,
      eventType: body.type, eventId: persisted.eventId, ms: Date.now() - startedAt,
    }))

    return NextResponse.json({ success: true, ...persisted }, { status: 201 })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', message: 'telemetry_failed', route: '/api/telemetry', requestId,
      error: error instanceof Error ? error.message : String(error), ms: Date.now() - startedAt,
    }))
    return NextResponse.json({ error: 'Telemetry pipeline unavailable' }, { status: 503 })
  }
}
