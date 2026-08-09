import { NextRequest, NextResponse } from 'next/server'
import { processMetaWebhook, verifyMetaWebhookSignature } from '@/lib/meta/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ?? ''
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  const rawBody = await request.text()
  if (rawBody.length > 256_000) {
    return NextResponse.json({ error: 'Payload too large', requestId }, { status: 413 })
  }
  if (!verifyMetaWebhookSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature', requestId }, { status: 401 })
  }
  try {
    const result = await processMetaWebhook(rawBody)
    return NextResponse.json({ ok: true, ...result, requestId }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'meta_webhook_failed',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'Webhook processing failed', requestId }, { status: 503 })
  }
}

