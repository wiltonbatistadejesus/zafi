import { NextRequest, NextResponse } from 'next/server'
import { recordProfileProgress } from '@/lib/profile/server'
import type { ProfileProgressRequest } from '@/lib/profile/schema'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProfileProgressRequest
    if (!UUID.test(body.visitorId) || !UUID.test(body.sessionId) || JSON.stringify(body).length > 16_000) {
      return NextResponse.json({ error: 'Invalid profile identity' }, { status: 400 })
    }

    if (body.stage === 'financial_context') {
      if (!Number.isFinite(body.totalDebt) || body.totalDebt < 0 || !Number.isInteger(body.debtCount) || body.debtCount < 1 ||
          !Array.isArray(body.debtTypes) || !Array.isArray(body.creditors)) {
        return NextResponse.json({ error: 'Invalid financial context' }, { status: 400 })
      }
    } else if (body.stage === 'identity_and_income') {
      if (body.fullName.trim().length < 2 || !EMAIL.test(body.email) || !Number.isFinite(body.monthlyIncome) || body.monthlyIncome < 0 ||
          typeof body.contactConsent !== 'boolean') {
        return NextResponse.json({ error: 'Invalid identity context' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid collection stage' }, { status: 400 })
    }

    const result = await recordProfileProgress(body)
    return NextResponse.json({ success: true, profileId: result.profile_id, stage: result.stage, persistedAt: result.persisted_at }, { status: 201 })
  } catch (error) {
    console.error('Smart profile persistence failed:', error)
    return NextResponse.json({ error: 'Profile pipeline unavailable' }, { status: 503 })
  }
}

