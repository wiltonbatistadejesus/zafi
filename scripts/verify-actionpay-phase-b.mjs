import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  buildActionpayIdempotencyKey,
  sanitizeActionpayPayload,
  verifyActionpayAuthentication,
} from '../lib/actionpay/security.ts'

const secret = 'phase-b-test-secret-32-bytes-minimum'
const body = JSON.stringify({ transaction_id: 'tx-1', status: 'accepted' })
const signature = createHmac('sha256', secret).update(body).digest('hex')

assert.equal(verifyActionpayAuthentication({ token: secret, signature: null, rawBody: body, secret }), true)
assert.equal(verifyActionpayAuthentication({ token: 'invalid', signature: null, rawBody: body, secret }), false)
assert.equal(verifyActionpayAuthentication({ token: null, signature: `sha256=${signature}`, rawBody: body, secret }), true)
assert.equal(verifyActionpayAuthentication({ token: null, signature: 'sha256=invalid', rawBody: body, secret }), false)

const sanitized = sanitizeActionpayPayload({
  token: secret,
  email: 'pessoa@example.com',
  cpf: '00000000000',
  phone: '11999999999',
  campaign_name: 'Acordo Certo',
})
assert.equal(sanitized.token, '[REDACTED]')
assert.equal(sanitized.email, '[REDACTED]')
assert.equal(sanitized.cpf, '[REDACTED]')
assert.equal(sanitized.phone, '[REDACTED]')
assert.equal(sanitized.campaign_name, 'Acordo Certo')

const base = {
  transactionId: 'tx-1',
  status: 'approved',
  commission: 2.8,
  currency: 'BRL',
  originalClickId: '11111111-1111-4111-8111-111111111111',
  campaignId: '187558',
}
const first = buildActionpayIdempotencyKey(base)
const replay = buildActionpayIdempotencyKey({ ...base })
const nextState = buildActionpayIdempotencyKey({ ...base, status: 'paid' })
assert.equal(first, replay)
assert.notEqual(first, nextState)
assert.match(first, /^[a-f0-9]{64}$/)

console.log(JSON.stringify({
  token_validation: 'passed',
  invalid_token_rejection: 'passed',
  hmac_validation: 'passed',
  pii_redaction: 'passed',
  idempotency_replay: 'passed',
  state_specific_key: 'passed',
}))