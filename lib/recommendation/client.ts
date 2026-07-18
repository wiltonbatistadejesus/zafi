import { getTelemetryIdentity } from '@/lib/telemetry/client'
import type { RecommendationResult } from './types'

export async function requestRecommendations(pageRoute = '/', signal?: AbortSignal) {
  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal,
    body: JSON.stringify({ ...getTelemetryIdentity(), pageRoute }),
  })
  if (!response.ok) throw new Error(`Recommendation engine returned ${response.status}`)
  return response.json() as Promise<RecommendationResult>
}
