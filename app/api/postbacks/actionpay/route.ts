import { NextRequest, NextResponse } from 'next/server'
import {
  PostbackValidationError,
  hashRawPayload,
  normalizeActionpayPostback,
  parsePostbackBody,
  sanitizePostbackPayload,
  verifyActionpayAuthentication,
  type FlatPostbackPayload,
} from '@/lib/actionpay/postback'
import { recordActionpayPostback, recordActionpayPostbackRejection } from '@/lib/telemetry/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ROUTE = '/api/postbacks/actionpay'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function flatQuery(request: NextRequest): FlatPostbackPayload {
  return Object.fromEntries(Array.from(request.nextUrl.searchParams.entries()).map(([key, value]) => [key.toLowerCase(), value]))
}

function log(level: 'info' | 'error', data: Record<string, unknown>) {
  const output = JSON.stringify(data)
  if (level === 'error') console.error(output)
  else console.log(output)
}

async function handle(request: NextRequest) {
  const startedAt = Date.now()
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  const route = ROUTE
  if (process.env.ACTIONPAY_POSTBACK_ENABLED !== 'true') {
    log('info', { level: 'info', message: 'actionpay_postback_prepared_not_activated', route, requestId, ms: Date.now() - startedAt })
    return NextResponse.json({ ok: false, error: 'Postback not activated', requestId }, { status: 503 })
  }
  const rawBody = request.method === 'GET' ? '' : await request.text()
  const query = flatQuery(request)
  let body: FlatPostbackPayload = {}

  try {
    body = parsePostbackBody(rawBody, request.headers.get('content-type'))
  } catch (error) {
    const status = error instanceof PostbackValidationError ? error.status : 400
    log('error', { level: 'error', message: 'actionpay_postback_invalid_body', route, requestId, status, ms: Date.now() - startedAt })
    return NextResponse.json({ ok: false, error: 'Invalid postback body', requestId }, { status })
  }

  const payload = { ...query, ...body }
  const sanitizedPayload = sanitizePostbackPayload(payload)
  const rawPayloadHash = hashRawPayload(rawBody, request.nextUrl.searchParams.toString())
  const secret = process.env.ACTIONPAY_POSTBACK_SECRET?.trim() ?? ''
  if (!secret) {
    log('error', { level: 'error', message: 'actionpay_postback_not_configured', route, requestId, ms: Date.now() - startedAt })
    return NextResponse.json({ ok: false, error: 'Postback unavailable', requestId }, { status: 503 })
  }

  const token = request.headers.get('x-zafi-postback-token')
    ?? request.headers.get('x-actionpay-token')
    ?? query.token
    ?? body.token
    ?? null
  const signature = request.headers.get('x-zafi-signature')
    ?? request.headers.get('x-actionpay-signature')

  if (!verifyActionpayAuthentication({ token, signature, rawBody, secret })) {
    log('error', { level: 'error', message: 'actionpay_postback_unauthorized', route, requestId, rawPayloadHash, ms: Date.now() - startedAt })
    return NextResponse.json({ ok: false, error: 'Unauthorized', requestId }, { status: 401 })
  }

  log('info', { level: 'info', message: 'actionpay_postback_start', route, requestId, rawPayloadHash })

  try {
    const normalized = await normalizeActionpayPostback(payload)
    const persisted = await recordActionpayPostback({
      requestId,
      normalized,
      payload: sanitizedPayload,
      rawPayloadHash,
    })
    log('info', {
      level: 'info', message: persisted.duplicate ? 'actionpay_postback_duplicate' : 'actionpay_postback_done',
      route, requestId, transactionId: normalized.transactionId, conversionId: persisted.conversionId,
      conversionEventId: persisted.conversionEventId, partnerId: normalized.partner?.id ?? null,
      campaignId: normalized.campaignId, status: normalized.status, duplicate: persisted.duplicate,
      ms: Date.now() - startedAt,
    })
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Zafi-Postback-Status': persisted.duplicate ? 'duplicate' : 'accepted',
        'X-Zafi-Request-Id': requestId,
      },
    })
  } catch (error) {
    const validation = error instanceof PostbackValidationError
    const databaseValidation = error instanceof Error && /mismatch|could not be identified|invalid conversion|requires commission/i.test(error.message)
    const status = validation ? error.status : databaseValidation ? 422 : 503
    const reason = validation ? error.message : databaseValidation ? 'Postback não conciliado com os dados oficiais.' : 'Pipeline financeiro indisponível.'

    if (status < 500) {
      try {
        const rejectedClickId = payload.click_id ?? payload.clickid ?? payload.subaccount ?? null
        await recordActionpayPostbackRejection({
          requestId,
          httpStatus: status,
          reason,
          payload: sanitizedPayload,
          rawPayloadHash,
          transactionId: payload.transaction_id ?? payload.action_id ?? payload.tid ?? null,
          originalClickId: rejectedClickId && UUID.test(rejectedClickId) ? rejectedClickId : null,
          partnerId: payload.partner_id ?? null,
          campaignId: payload.campaign_id ?? payload.offer_id ?? payload.apid ?? null,
        })
      } catch (auditError) {
        log('error', {
          level: 'error', message: 'actionpay_postback_rejection_audit_failed', route, requestId,
          error: auditError instanceof Error ? auditError.message : String(auditError),
        })
      }
    }

    log('error', {
      level: 'error', message: 'actionpay_postback_failed', route, requestId, status, reason,
      error: error instanceof Error ? error.message : String(error), rawPayloadHash, ms: Date.now() - startedAt,
    })
    return NextResponse.json({ ok: false, error: reason, requestId }, { status })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
