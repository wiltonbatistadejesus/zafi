import { NextRequest, NextResponse } from 'next/server'
import { recordGa4Delivery } from '@/lib/telemetry/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATUSES = new Set(['accepted', 'sent', 'confirmed', 'skipped_no_consent', 'not_configured', 'failed'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!UUID.test(body.eventId || '') || !STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid GA4 delivery audit' }, { status: 400 })
    }
    await recordGa4Delivery(body.eventId, {
      status: body.status,
      responseCode: Number.isInteger(body.responseCode) ? body.responseCode : null,
      detail: String(body.detail || '').slice(0, 1000),
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', message: 'ga4_delivery_audit_failed', route: '/api/telemetry/ga4-delivery',
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'GA4 delivery audit unavailable' }, { status: 503 })
  }
}
