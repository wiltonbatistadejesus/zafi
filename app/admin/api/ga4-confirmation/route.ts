import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CEO_COOKIE, verifyCeoSession } from '@/lib/ceo/auth'
import { recordGa4Confirmation } from '@/lib/telemetry/server'
import { TELEMETRY_EVENT_TYPES, type TelemetryEventType } from '@/lib/telemetry/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVIDENCE_SOURCES = new Set(['realtime', 'debugview'])

export async function POST(request: NextRequest) {
  if (!verifyCeoSession(cookies().get(CEO_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const eventName = String(body.eventName || '') as TelemetryEventType
    if (
      !UUID.test(String(body.eventId || ''))
      || !EVIDENCE_SOURCES.has(String(body.evidenceSource || ''))
      || !TELEMETRY_EVENT_TYPES.includes(eventName)
    ) {
      return NextResponse.json({ error: 'Invalid GA4 confirmation evidence' }, { status: 400 })
    }

    const confirmationId = await recordGa4Confirmation({
      eventId: String(body.eventId),
      evidenceSource: body.evidenceSource,
      eventName,
      evidenceAt: new Date(body.evidenceAt || Date.now()).toISOString(),
      details: { validation: 'visual_ga4_ui', environment: 'production' },
    })
    return NextResponse.json({ success: true, confirmationId }, { status: 201 })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', message: 'ga4_confirmation_failed', route: '/admin/api/ga4-confirmation',
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'GA4 confirmation unavailable' }, { status: 503 })
  }
}
