import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const CEO_COOKIE = 'zafi_ceo_session'
const SESSION_SECONDS = 60 * 60 * 12
export type AdminRole = 'ceo' | 'council' | 'engineering'

export type AdminAccount = {
  email: string
  password: string
  name: string
  role: AdminRole
}

export type AdminSession = Omit<AdminAccount, 'password'>

function secureEqual(a: string, b: string) {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

function sessionSecret() {
  return process.env.CEO_SESSION_SECRET ?? ''
}

function accounts(): AdminAccount[] {
  const founderPassword = process.env.CEO_ADMIN_PASSWORD ?? ''
  const configuredAccounts: AdminAccount[] = [
    {
      email: process.env.CEO_ADMIN_EMAIL?.trim().toLowerCase() ?? '',
      password: process.env.CEO_ADMIN_PASSWORD ?? '',
      name: process.env.CEO_ADMIN_NAME?.trim() || 'CEO',
      role: 'ceo',
    },
    {
      email: process.env.COUNCIL_ADMIN_EMAIL?.trim().toLowerCase() ?? '',
      password: process.env.COUNCIL_ADMIN_PASSWORD || founderPassword,
      name: process.env.COUNCIL_ADMIN_NAME?.trim() || 'Conselho Estratégico',
      role: 'council',
    },
    {
      email: process.env.ENGINEERING_ADMIN_EMAIL?.trim().toLowerCase() ?? '',
      password: process.env.ENGINEERING_ADMIN_PASSWORD || founderPassword,
      name: process.env.ENGINEERING_ADMIN_NAME?.trim() || 'Engenharia',
      role: 'engineering',
    },
  ]
  return configuredAccounts.filter((account) => account.email && account.password)
}

export function isCeoAuthConfigured() {
  return accounts().some((account) => account.role === 'ceo') && sessionSecret().length >= 32
}

export function isAdminAuthConfigured() {
  return accounts().length > 0 && sessionSecret().length >= 32
}

export function validateCredentials(email: string, password: string) {
  return validateAdminCredentials(email, password)?.role === 'ceo'
}

export function validateAdminCredentials(email: string, password: string): AdminAccount | null {
  if (!isAdminAuthConfigured()) return null
  const normalized = email.trim().toLowerCase()
  return accounts().find((account) => secureEqual(normalized, account.email) && secureEqual(password, account.password)) ?? null
}

export function createAdminSession(account: AdminAccount) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const name = Buffer.from(account.name).toString('base64url')
  const payload = Buffer.from(`${account.email}|${account.role}|${name}|${expiresAt}`).toString('base64url')
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
  return { token: `${payload}.${signature}`, expiresAt: new Date(expiresAt * 1000) }
}

export function createCeoSession(email: string) {
  const account = accounts().find((candidate) => candidate.role === 'ceo' && secureEqual(candidate.email, email.trim().toLowerCase()))
  if (!account) throw new Error('CEO account is not configured')
  return createAdminSession(account)
}

export function getAdminSession(token = cookies().get(CEO_COOKIE)?.value): AdminSession | null {
  if (!token || !isAdminAuthConfigured()) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
  if (!secureEqual(signature, expected)) return null

  try {
    const parts = Buffer.from(payload, 'base64url').toString().split('|')
    if (parts.length === 2) {
      const [email, rawExpiry] = parts
      const account = accounts().find((candidate) => candidate.role === 'ceo' && secureEqual(candidate.email, email))
      return account && Number(rawExpiry) > Math.floor(Date.now() / 1000)
        ? { email: account.email, name: account.name, role: account.role }
        : null
    }

    const [email, role, encodedName, rawExpiry] = parts
    const account = accounts().find((candidate) => candidate.role === role && secureEqual(candidate.email, email))
    if (!account || Number(rawExpiry) <= Math.floor(Date.now() / 1000)) return null
    const name = Buffer.from(encodedName, 'base64url').toString()
    return { email: account.email, role: account.role, name: name || account.name }
  } catch {
    return null
  }
}

export function verifyCeoSession(token?: string) {
  return getAdminSession(token)?.role === 'ceo'
}

export function hasValidCeoSession() {
  return getAdminSession()?.role === 'ceo'
}

export function hasValidAdminSession(allowedRoles?: AdminRole[]) {
  const session = getAdminSession()
  return Boolean(session && (!allowedRoles || allowedRoles.includes(session.role)))
}
