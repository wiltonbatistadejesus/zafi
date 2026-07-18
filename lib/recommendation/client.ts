import { getTelemetryIdentity } from '@/lib/telemetry/client'
import type { RecommendationImpressionReceipt, RecommendationResult } from './types'

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

export async function recordVisibleRecommendations(result: RecommendationResult, signal?: AbortSignal) {
  const identity = getTelemetryIdentity()
  const response = await fetch('/api/recommendations/impressions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal,
    body: JSON.stringify({
      ...identity,
      runId: result.runId,
      impressionId: crypto.randomUUID(),
      decisionIds: result.recommendations.map((item) => item.decisionId),
      sourcePage: `${window.location.pathname}${window.location.search}`.slice(0, 2048),
      occurredAt: new Date().toISOString(),
    }),
  })
  if (!response.ok) throw new Error(`Recommendation impressions returned ${response.status}`)
  return response.json() as Promise<RecommendationImpressionReceipt>
}
