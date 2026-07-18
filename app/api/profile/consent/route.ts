import { NextRequest, NextResponse } from 'next/server'
import { recordProfileConsent } from '@/lib/profile/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PURPOSES = new Set(['analytics', 'relationship', 'personalization', 'partner_sharing'])
const STATUSES = new Set(['granted', 'denied', 'withdrawn'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!UUID.test(body.visitorId) || !UUID.test(body.sessionId) || !PURPOSES.has(body.purpose) ||
        !STATUSES.has(body.status) || typeof body.source !== 'string' || body.source.length < 1 || body.source.length > 120) {
      return NextResponse.json({ error: 'Invalid consent record' }, { status: 400 })
    }
    const result = await recordProfileConsent(body)
    return NextResponse.json({ success: true, profileId: result.profile_id, consentId: result.consent_id, persistedAt: result.persisted_at }, { status: 201 })
  } catch (error) {
    console.error('Consent persistence failed:', error)
    return NextResponse.json({ error: 'Consent pipeline unavailable' }, { status: 503 })
  }
}

