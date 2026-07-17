import type { AnalyticsConsent, TelemetryReceipt } from './types'

const VISITOR_KEY = 'zafi_visitor_id'
const SESSION_KEY = 'zafi_session_id'
const CONSENT_KEY = 'zafi_analytics_consent'
const STARTED_AT_KEY = 'zafi_analysis_started_at'

function stableId(storage: Storage, key: string) {
  const existing = storage.getItem(key)
  if (existing) return existing
  const id = crypto.randomUUID()
  storage.setItem(key, id)
  return id
}

export function getTelemetryIdentity() {
  return {
    visitorId: stableId(window.localStorage, VISITOR_KEY),
    sessionId: stableId(window.sessionStorage, SESSION_KEY),
  }
}

export function getAnalyticsConsent(): AnalyticsConsent {
  const value = window.localStorage.getItem(CONSENT_KEY)
  return value === 'granted' || value === 'denied' ? value : 'unknown'
}

function trafficContext() {
  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get('utm_source')?.slice(0, 100) ?? ''
  const campaign = Object.fromEntries(
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .map((key) => [key, params.get(key)?.slice(0, 200) ?? ''])
      .filter(([, value]) => Boolean(value))
  )
  const referrer = document.referrer
  let source = 'direct'

  if (utmSource) source = utmSource
  else if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase()
      if (/google|bing|yahoo|duckduckgo/.test(host)) source = 'organic'
      else if (/facebook|instagram|linkedin|tiktok|youtube|x\.com|twitter/.test(host)) source = 'social'
      else if (host !== window.location.hostname) source = 'referral'
    } catch {
      source = 'referral'
    }
  }

  return { source, campaign, referrer: referrer.slice(0, 1000) }
}

export function markAnalysisStarted() {
  window.sessionStorage.setItem(STARTED_AT_KEY, new Date().toISOString())
}

export function getAnalysisDurationSeconds() {
  const value = window.sessionStorage.getItem(STARTED_AT_KEY)
  if (!value) return null
  const milliseconds = Date.now() - new Date(value).getTime()
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? Math.round(milliseconds / 1000) : null
}

export async function trackTelemetryEvent(
  type: 'page_view' | 'analysis_started' | 'analysis_completed',
  payload: Record<string, unknown> = {}
): Promise<TelemetryReceipt> {
  const identity = getTelemetryIdentity()
  const traffic = trafficContext()
  const response = await fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      type,
      ...identity,
      occurredAt: new Date().toISOString(),
      sourcePage: `${window.location.pathname}${window.location.search}`.slice(0, 2048),
      source: traffic.source,
      consent: getAnalyticsConsent(),
      device: {
        category: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
      campaign: traffic.campaign,
      payload: { ...payload, referrer: traffic.referrer, campaign: traffic.campaign },
      schemaVersion: 1,
    }),
  })

  if (!response.ok) throw new Error(`Telemetry persistence failed (${response.status})`)
  const persisted = await response.json() as Pick<TelemetryReceipt, 'eventId' | 'persistedAt'> & { success: true }
  const ga4 = await dispatchGa4(type, payload, persisted.eventId)
  return { ...persisted, ga4 }
}

async function dispatchGa4(type: string, payload: Record<string, unknown>, eventId: string): Promise<TelemetryReceipt['ga4']> {
  const consent = getAnalyticsConsent()
  if (consent !== 'granted') {
    await auditGa4(eventId, 'skipped_no_consent', null, 'Consentimento analítico não concedido.')
    return { status: 'skipped_no_consent', responseCode: null }
  }

  const gaWindow = window as typeof window & { gtag?: (...args: unknown[]) => void }
  const started = Date.now()
  while (!gaWindow.gtag && Date.now() - started < 3000) {
    await new Promise((resolve) => window.setTimeout(resolve, 50))
  }

  if (!gaWindow.gtag) {
    await auditGa4(eventId, 'not_configured', null, 'A tag GA4 não ficou disponível no navegador.')
    return { status: 'not_configured', responseCode: null }
  }

  const flatPayload = Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
      .slice(0, 20)
  )

  const accepted = await new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (value: boolean) => { if (!settled) { settled = true; resolve(value) } }
    gaWindow.gtag?.('event', type, {
      ...flatPayload,
      event_id: eventId,
      session_id: getTelemetryIdentity().sessionId,
      event_callback: () => finish(true),
      event_timeout: 1500,
    })
    window.setTimeout(() => finish(false), 1800)
  })

  const status = accepted ? 'accepted' : 'failed'
  await auditGa4(eventId, status, accepted ? 204 : null, accepted ? 'Callback de envio da tag GA4 executado.' : 'Timeout aguardando callback da tag GA4.')
  return { status, responseCode: accepted ? 204 : null }
}

async function auditGa4(eventId: string, status: TelemetryReceipt['ga4']['status'], responseCode: number | null, detail: string) {
  await fetch('/api/telemetry/ga4-delivery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ eventId, status, responseCode, detail }),
  })
}

export function buildPartnerTrackingUrl(path: string) {
  const identity = getTelemetryIdentity()
  const traffic = trafficContext()
  const url = new URL(path, window.location.origin)
  url.searchParams.set('sid', identity.sessionId)
  url.searchParams.set('vid', identity.visitorId)
  url.searchParams.set('consent', getAnalyticsConsent())
  url.searchParams.set('page', `${window.location.pathname}${window.location.search}`.slice(0, 1000))
  url.searchParams.set('source', traffic.source)
  const campaign = traffic.campaign.utm_campaign
  if (campaign) url.searchParams.set('campaign', campaign)
  return `${url.pathname}${url.search}`
}
