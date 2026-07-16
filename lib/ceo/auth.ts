import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const CEO_COOKIE = 'zafi_ceo_session'
const SESSION_SECONDS = 60 * 60 * 12

function secureEqual(a: string, b: string) {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

function config() {
  return {
    email: process.env.CEO_ADMIN_EMAIL?.trim().toLowerCase() ?? '',
    password: process.env.CEO_ADMIN_PASSWORD ?? '',
    secret: process.env.CEO_SESSION_SECRET ?? '',
  }
}

export function isCeoAuthConfigured() {
  const values = config()
  return Boolean(values.email && values.password && values.secret.length >= 32)
}

export function validateCredentials(email: string, password: string) {
  const expected = config()
  if (!isCeoAuthConfigured()) return false
  return secureEqual(email.trim().toLowerCase(), expected.email) && secureEqual(password, expected.password)
}

export function createCeoSession(email: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const payload = Buffer.from(`${email.trim().toLowerCase()}|${expiresAt}`).toString('base64url')
  const signature = createHmac('sha256', config().secret).update(payload).digest('base64url')
  return { token: `${payload}.${signature}`, expiresAt: new Date(expiresAt * 1000) }
}

export function verifyCeoSession(token?: string) {
  if (!token || !isCeoAuthConfigured()) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expected = createHmac('sha256', config().secret).update(payload).digest('base64url')
  if (!secureEqual(signature, expected)) return false

  try {
    const [email, rawExpiry] = Buffer.from(payload, 'base64url').toString().split('|')
    return secureEqual(email, config().email) && Number(rawExpiry) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export function hasValidCeoSession() {
  return verifyCeoSession(cookies().get(CEO_COOKIE)?.value)
}
