'use client'

import { getTelemetryIdentity } from '@/lib/telemetry/client'
import type { ProfileProgressRequest } from './schema'

type ProfileStageInput = ProfileProgressRequest extends infer Request
  ? Request extends ProfileProgressRequest
    ? Omit<Request, 'visitorId' | 'sessionId'>
    : never
  : never

async function post(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Profile API failed (${response.status})`)
  return response.json()
}

export function saveProfileStage(input: ProfileStageInput) {
  return post('/api/profile', { ...input, ...getTelemetryIdentity() })
}

export function saveAnalyticsConsent(status: 'granted' | 'denied') {
  return post('/api/profile/consent', {
    ...getTelemetryIdentity(),
    purpose: 'analytics',
    status,
    source: 'cookie_banner',
  })
}
