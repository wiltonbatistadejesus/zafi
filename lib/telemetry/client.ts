import type { AnalyticsConsent, TelemetryReceipt } from './types'

const VISITOR_KEY = 'zafi_visitor_id'
const SESSION_KEY = 'zafi_session_id'
const CONSENT_KEY = 'zafi_analytics_consent'
const STARTED_AT_KEY = 'zafi_analysis_started_at'
const CAMPAIGN_CONTEXT_KEY = 'zafi_campaign_context_v2'

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
  const campaignKeys = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'utm_id', 'utm_source_platform',
  ] as const
  const liveCampaign = Object.fromEntries(
    campaignKeys
      .map((key) => [key, params.get(key)?.slice(0, 200) ?? ''])
      .filter(([, value]) => Boolean(value))
  ) as Record<(typeof campaignKeys)[number], string>
  const attribution = {
    fbclid: params.get('fbclid')?.slice(0, 500) || '',
    meta_campaign_id: (params.get('meta_campaign_id') || params.get('campaign_id') || '').slice(0, 100),
    meta_adset_id: (params.get('meta_adset_id') || params.get('adset_id') || '').slice(0, 100),
    meta_ad_id: (params.get('meta_ad_id') || params.get('ad_id') || '').slice(0, 100),
    meta_form_id: (params.get('meta_form_id') || params.get('form_id') || '').slice(0, 100),
  }
  const referrer = document.referrer.slice(0, 1000)
  let referrerHost = ''
  if (referrer) {
    try { referrerHost = new URL(referrer).hostname.toLowerCase() } catch { referrerHost = '' }
  }

  const rawSource = (liveCampaign.utm_source || '').toLowerCase()
  const medium = (liveCampaign.utm_medium || '').toLowerCase()
  const explicitlyPaid = /(^|_)(paid|ads?|cpc|ppc)(_|$)/.test(medium)
  const explicitlyOrganic = /(^|_)(organic|organic_social|social_organic)(_|$)/.test(medium)
  let source = 'direct'
  if (/instagram/.test(rawSource)) source = explicitlyPaid ? 'instagram_ads' : explicitlyOrganic ? 'instagram_organic' : 'meta'
  else if (/facebook|^fb$/.test(rawSource)) source = explicitlyPaid ? 'facebook_ads' : explicitlyOrganic ? 'facebook_organic' : 'meta'
  else if (/meta/.test(rawSource)) source = explicitlyPaid ? 'meta_ads' : explicitlyOrganic ? 'meta_organic' : 'meta'
  else if (rawSource) source = rawSource
  else if (attribution.fbclid) source = 'meta'
  else if (referrerHost) {
    if (/instagram/.test(referrerHost)) source = 'instagram_organic'
    else if (/facebook|fb\.com/.test(referrerHost)) source = 'facebook_organic'
    else if (/google/.test(referrerHost)) source = 'google'
    else if (/bing|yahoo|duckduckgo/.test(referrerHost)) source = 'organic'
    else if (/linkedin|tiktok|youtube|x\.com|twitter/.test(referrerHost)) source = 'social'
    else if (referrerHost !== window.location.hostname) source = 'referral'
  }

  const live = {
    source,
    channel: source,
    campaign: liveCampaign,
    attribution,
    referrer,
    referrerHost,
    capturedAt: new Date().toISOString(),
  }
  const hasAttribution = Object.values(attribution).some(Boolean)
  if (Object.keys(liveCampaign).length || hasAttribution || source !== 'direct') {
    window.sessionStorage.setItem(CAMPAIGN_CONTEXT_KEY, JSON.stringify(live))
    return live
  }

  try {
    const stored = JSON.parse(window.sessionStorage.getItem(CAMPAIGN_CONTEXT_KEY) ?? 'null') as typeof live | null
    if (
      stored?.source
      && stored.campaign
      && typeof stored.campaign === 'object'
      && stored.attribution
      && typeof stored.attribution === 'object'
    ) return stored
  } catch {
    window.sessionStorage.removeItem(CAMPAIGN_CONTEXT_KEY)
  }

  return live
}

function officialTimeContext(occurredAt: Date) {
  const timeZone = 'America/Sao_Paulo'
  const parts = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', {
    timeZone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(occurredAt).map((part) => [part.type, part.value]))
  return {
    timezone: timeZone,
    local_date: `${parts.year}-${parts.month}-${parts.day}`,
    local_time: `${parts.hour}:${parts.minute}:${parts.second}`,
    weekday: parts.weekday,
  }
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
  const occurredAt = new Date()
  const time = officialTimeContext(occurredAt)
  const response = await fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      type,
      ...identity,
      occurredAt: occurredAt.toISOString(),
      sourcePage: `${window.location.pathname}${window.location.search}`.slice(0, 2048),
      source: traffic.source,
      consent: getAnalyticsConsent(),
      device: {
        category: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: time.timezone,
      },
      campaign: traffic.campaign,
      payload: {
        ...payload,
        referrer: traffic.referrer,
        referrer_host: String(traffic.referrerHost || '').slice(0, 300),
        campaign: traffic.campaign,
        attribution: traffic.attribution,
        channel: traffic.channel,
        event_time: time,
      },
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

  const gaWindow = window as typeof window & {
    gtag?: (...args: unknown[]) => void
    __zafiGaLoaded?: boolean
  }
  const started = Date.now()
  while ((!gaWindow.gtag || !gaWindow.__zafiGaLoaded) && Date.now() - started < 8000) {
    await new Promise((resolve) => window.setTimeout(resolve, 50))
  }

  if (!gaWindow.gtag || !gaWindow.__zafiGaLoaded) {
    await auditGa4(eventId, 'not_configured', null, 'A tag GA4 não ficou disponível no navegador.')
    return { status: 'not_configured', responseCode: null }
  }

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? ''
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) {
    await auditGa4(eventId, 'not_configured', null, 'Measurement ID ausente ou inválido no bundle de produção.')
    return { status: 'not_configured', responseCode: null }
  }

  async function readGaField(field: 'client_id' | 'session_id') {
    return new Promise<string | null>((resolve) => {
      let settled = false
      const finish = (value: string | null) => { if (!settled) { settled = true; resolve(value) } }
      gaWindow.gtag?.('get', measurementId, field, (value: unknown) => finish(
        typeof value === 'string' || typeof value === 'number' ? String(value) : null
      ))
      window.setTimeout(() => finish(null), 800)
    })
  }

  const [clientId, gaSessionId] = await Promise.all([readGaField('client_id'), readGaField('session_id')])
  const clientIdValid = Boolean(clientId && /^\d+\.\d+$/.test(clientId))
  const gaSessionIdValid = Boolean(gaSessionId && /^\d+$/.test(gaSessionId))

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
      send_to: measurementId,
      event_id: eventId,
      zafi_session_id: getTelemetryIdentity().sessionId,
      debug_mode: new URLSearchParams(window.location.search).get('zafi_ga_debug') === '1',
      event_callback: () => finish(true),
      event_timeout: 1500,
    })
    window.setTimeout(() => finish(false), 1800)
  })

  const status = accepted ? 'sent' : 'failed'
  const identityDetail = `client_id ${clientIdValid ? 'válido' : 'não confirmado'}; session_id GA4 ${gaSessionIdValid ? 'válida' : 'não confirmada'}.`
  await auditGa4(eventId, status, null, accepted
    ? `Tag GA4 acionada; resposta HTTP não é observável pelo callback. ${identityDetail}`
    : `Timeout aguardando callback da tag GA4. ${identityDetail}`)
  return { status, responseCode: null }
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
  if (traffic.campaign.utm_medium) url.searchParams.set('medium', traffic.campaign.utm_medium)
  if (traffic.campaign.utm_content) url.searchParams.set('content', traffic.campaign.utm_content)
  if (traffic.attribution.fbclid) url.searchParams.set('fbclid', traffic.attribution.fbclid)
  if (traffic.attribution.meta_campaign_id) url.searchParams.set('meta_campaign_id', traffic.attribution.meta_campaign_id)
  if (traffic.attribution.meta_adset_id) url.searchParams.set('meta_adset_id', traffic.attribution.meta_adset_id)
  if (traffic.attribution.meta_ad_id) url.searchParams.set('meta_ad_id', traffic.attribution.meta_ad_id)
  if (traffic.attribution.meta_form_id) url.searchParams.set('meta_form_id', traffic.attribution.meta_form_id)
  if (new URLSearchParams(window.location.search).get('zafi_ga_debug') === '1') url.searchParams.set('debug', '1')
  return `${url.pathname}${url.search}`
}
