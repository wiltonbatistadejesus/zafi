import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { getPartner, getPartnerByCampaignId, type PartnerDefinition } from '@/lib/partners'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SENSITIVE_KEYS = new Set(['token', 'secret', 'signature', 'secure', 'key', 'api_key', 'authorization'])

export type FlatPostbackPayload = Record<string, string>

export type NormalizedActionpayPostback = {
  transactionId: string
  originalClickId: string | null
  partner: PartnerDefinition | null
  campaignId: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  commission: number | null
  currency: string | null
  eventAt: string
  convertedAt: string | null
  idempotencyKey: string
}

export class PostbackValidationError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message)
    this.name = 'PostbackValidationError'
  }
}

function first(payload: FlatPostbackPayload, aliases: string[]) {
  for (const alias of aliases) {
    const value = payload[alias]?.trim()
    if (value) return value
  }
  return null
}

function normalizeWord(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function parseStatus(value: string | null): NormalizedActionpayPostback['status'] {
  if (!value) throw new PostbackValidationError('Status da conversão ausente.')
  const normalized = normalizeWord(value).replace(/[\s-]+/g, '_')
  if (['accepted', 'approved', 'approve', 'allowed', 'aceito', 'aprovado', 'paid', 'pago', 'sale', '1'].includes(normalized)) return 'approved'
  if (['created', 'pending', 'processing', 'in_processing', 'hold', 'em_processamento', '0'].includes(normalized)) return 'pending'
  if (['rejected', 'declined', 'denied', 'recusado', 'rejeitado', '2'].includes(normalized)) return 'rejected'
  if (['cancelled', 'canceled', 'cancelado', 'reversed', 'estornado', '3'].includes(normalized)) return 'cancelled'
  throw new PostbackValidationError(`Status de conversão não reconhecido: ${value.slice(0, 80)}`)
}

function parseMoney(value: string | null): number | null {
  if (!value) return null
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized)) throw new PostbackValidationError('Comissão inválida.')
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) throw new PostbackValidationError('Comissão fora do intervalo permitido.')
  return amount
}

function parseDate(value: string | null): string {
  if (!value) return new Date().toISOString()
  const numeric = Number(value)
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(value)
  if (Number.isNaN(date.getTime())) throw new PostbackValidationError('Data da conversão inválida.')
  return date.toISOString()
}

function canonicalIdempotencyKey(input: Omit<NormalizedActionpayPostback, 'idempotencyKey' | 'partner'>) {
  const canonical = [
    'actionpay', input.transactionId, input.status, input.commission ?? '', input.currency ?? '',
    input.originalClickId ?? '', input.campaignId ?? '', input.eventAt,
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex')
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function verifyActionpayAuthentication(options: {
  token: string | null
  signature: string | null
  rawBody: string
  secret: string
}) {
  if (!options.secret) return false
  if (options.token && safeEqual(options.token, options.secret)) return true
  if (!options.signature) return false
  const supplied = options.signature.replace(/^sha256=/i, '').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false
  const expected = createHmac('sha256', options.secret).update(options.rawBody).digest('hex')
  return safeEqual(supplied, expected)
}

export function parsePostbackBody(rawBody: string, contentType: string | null): FlatPostbackPayload {
  if (!rawBody) return {}
  if (rawBody.length > 32_768) throw new PostbackValidationError('Payload excede 32 KB.', 413)

  if (contentType?.includes('application/json')) {
    let parsed: unknown
    try { parsed = JSON.parse(rawBody) } catch { throw new PostbackValidationError('JSON inválido.', 400) }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new PostbackValidationError('Payload JSON inválido.', 400)
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key.toLowerCase(), value == null ? '' : String(value)]))
  }

  const params = new URLSearchParams(rawBody)
  return Object.fromEntries(Array.from(params.entries()).map(([key, value]) => [key.toLowerCase(), value]))
}

export function sanitizePostbackPayload(payload: FlatPostbackPayload): FlatPostbackPayload {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [
    key,
    SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value.slice(0, 4096),
  ]))
}

export function hashRawPayload(rawBody: string, queryString: string) {
  return createHash('sha256').update(`${queryString}\n${rawBody}`).digest('hex')
}

export function normalizeActionpayPostback(payload: FlatPostbackPayload): NormalizedActionpayPostback {
  const transactionId = first(payload, ['transaction_id', 'uniqueid', 'transaction', 'action_id', 'actionid', 'order_id', 'orderid', 'tid'])
  if (!transactionId || transactionId.length > 200) throw new PostbackValidationError('Identificador da transação ausente ou inválido.')

  const clickCandidate = first(payload, ['click_id', 'clickid', 'subaccount', 'subid', 'subid1', 'subit1'])
  const originalClickId = clickCandidate && UUID.test(clickCandidate) ? clickCandidate : null
  if (clickCandidate && !originalClickId) throw new PostbackValidationError('Identificador do clique inválido.')

  const campaignId = first(payload, ['campaign_id', 'campaignid', 'offer_id', 'offerid', 'offer', 'apid'])
  const explicitPartnerId = first(payload, ['partner_id', 'partnerid'])
  const partner = (campaignId ? getPartnerByCampaignId(campaignId) : undefined)
    ?? (explicitPartnerId ? getPartner(explicitPartnerId) : undefined)
    ?? null
  if (!originalClickId && !partner) throw new PostbackValidationError('Não foi possível identificar o clique, parceiro ou campanha.')

  const status = parseStatus(first(payload, ['status', 'event', 'action_status', 'actionstatus', 'state']))
  const commission = parseMoney(first(payload, ['commission', 'payment', 'payout', 'sum', 'amount']))
  const currencyValue = first(payload, ['currency', 'currency_code', 'currencycode'])
  const currency = currencyValue ? currencyValue.toUpperCase() : null
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new PostbackValidationError('Moeda inválida.')
  if (status === 'approved' && (commission === null || currency === null)) {
    throw new PostbackValidationError('Conversão aprovada exige comissão e moeda.')
  }

  const eventAt = parseDate(first(payload, ['event_at', 'event_date', 'action_date', 'created_at', 'date', 'timestamp']))
  const convertedAt = status === 'approved'
    ? parseDate(first(payload, ['converted_at', 'conversion_date', 'approved_at', 'action_date', 'date', 'timestamp']))
    : null

  const normalizedWithoutKey = {
    transactionId,
    originalClickId,
    campaignId: campaignId ?? partner?.campaignId ?? null,
    status,
    commission,
    currency,
    eventAt,
    convertedAt,
  }

  return {
    ...normalizedWithoutKey,
    partner,
    idempotencyKey: canonicalIdempotencyKey(normalizedWithoutKey),
  }
}
