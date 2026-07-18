import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { CEO_COOKIE, verifyCeoSession } from '@/lib/ceo/auth'
import { getCockpitSnapshot, getGa4IntegrationStatus } from '@/lib/telemetry/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!verifyCeoSession(cookies().get(CEO_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [snapshot, ga4Integration] = await Promise.all([
      getCockpitSnapshot(50),
      getGa4IntegrationStatus(),
    ])
    return NextResponse.json({ ...snapshot, ga4_integration: ga4Integration }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', message: 'telemetry_admin_snapshot_failed', route: '/admin/api/telemetry',
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'Telemetry snapshot unavailable' }, { status: 503 })
  }
}
