import { createHash, createHmac, timingSafeEqual } from 'crypto'

const SECRET_KEYS = new Set([
  'token', 'secret', 'signature', 'secure', 'key', 'api_key', 'authorization',
  'x_actionpay_token', 'x_actionpay_signature',
])

const PERSONAL_KEYS = new Set([
  'name', 'full_name', 'fullname', 'first_name', 'last_name', 'nome', 'nome_completo',
  'email', 'e_mail', 'phone', 'telephone', 'mobile', 'telefone', 'celular',
  'cpf', 'cnpj', 'document', 'documento', 'address', 'endereco', 'cep',
  'password', 'senha', 'birth_date', 'date_of_birth', 'data_nascimento',
])

function constantTimeTextEqual(left: string, right: string) {
  const a = createHash('sha256').update(left).digest()
  const b = createHash('sha256').update(right).digest()
  return timingSafeEqual(a, b)
}

export function verifyActionpayAuthentication(options: {
  token: string | null
  signature: string | null
  rawBody: string
  secret: string
}) {
  if (!options.secret) return false
  if (options.token && constantTimeTextEqual(options.token, options.secret)) return true
  if (!options.signature) return false
  const supplied = options.signature.replace(/^sha256=/i, '').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false
  const expected = createHmac('sha256', options.secret).update(options.rawBody).digest('hex')
  return constantTimeTextEqual(supplied, expected)
}

export function sanitizeActionpayPayload(payload: Record<string, string>) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => {
    const normalizedKey = key.toLowerCase().trim()
    const sensitive = SECRET_KEYS.has(normalizedKey) || PERSONAL_KEYS.has(normalizedKey)
    return [key, sensitive ? '[REDACTED]' : value.slice(0, 4096)]
  }))
}

export function hashActionpayPayload(rawBody: string, queryString: string) {
  return createHash('sha256').update(`${queryString}\n${rawBody}`).digest('hex')
}

export function buildActionpayIdempotencyKey(input: {
  transactionId: string
  status: string
  commission: number | null
  currency: string | null
  originalClickId: string
  campaignId: string | null
}) {
  const canonical = [
    'actionpay-v2', input.transactionId, input.status, input.commission ?? '', input.currency ?? '',
    input.originalClickId, input.campaignId ?? '',
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex')
}