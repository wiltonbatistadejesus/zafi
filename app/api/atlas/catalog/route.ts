import { NextRequest, NextResponse } from 'next/server'
import { getAtlasCatalog } from '@/lib/atlas/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pageRoute = request.nextUrl.searchParams.get('page') || '/'
    if (!pageRoute.startsWith('/') || pageRoute.length > 500) {
      return NextResponse.json({ error: 'Invalid page route' }, { status: 400 })
    }
    const catalog = await getAtlasCatalog(pageRoute)
    return NextResponse.json(catalog, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch (error) {
    console.error('Atlas catalog failed:', error)
    return NextResponse.json({ error: 'Partner catalog unavailable' }, { status: 503 })
  }
}
