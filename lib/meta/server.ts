import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { ActionpayIntegrationSnapshot, MetaExecutiveSnapshot, MetaPlatform } from './types'

type JsonRecord = Record<string, unknown>
type MetaListResponse = {
  data?: JsonRecord[]
  paging?: { cursors?: { after?: string } }
  error?: { message?: string; type?: string; code?: number; error_subcode?: number }
}

class MetaApiError extends Error {
  constructor(
    message: string,
    readonly code = 'META_API_ERROR',
    readonly status = 502,
  ) {
    super(message)
    this.name = 'MetaApiError'
  }
}

function requiredServerSecret() {
  const value = process.env.TELEMETRY_SERVER_SECRET?.trim()
  if (!value) throw new Error('TELEMETRY_SERVER_SECRET is not configured')
  return value
}

function metaConfig() {
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim() ?? ''
  const adAccountId = (process.env.META_AD_ACCOUNT_ID?.trim() ?? '').replace(/^act_/, '')
  const pageId = process.env.META_PAGE_ID?.trim() ?? ''
  const accessToken =
    process.env.META_SYSTEM_USER_ACCESS_TOKEN?.trim()
    || process.env.META_PAGE_ACCESS_TOKEN?.trim()
    || ''
  const leadAccessToken =
    process.env.META_PAGE_ACCESS_TOKEN?.trim()
    || process.env.META_SYSTEM_USER_ACCESS_TOKEN?.trim()
    || ''
  const missing: string[] = []
  if (!/^v\d+\.\d+$/.test(graphVersion)) missing.push('META_GRAPH_API_VERSION')
  if (!/^\d+$/.test(adAccountId)) missing.push('META_AD_ACCOUNT_ID')
  if (!accessToken) missing.push('META_SYSTEM_USER_ACCESS_TOKEN ou META_PAGE_ACCESS_TOKEN')
  return { graphVersion, adAccountId, pageId, accessToken, leadAccessToken, missing }
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function stringValue(value: unknown, max = 500) {
  return typeof value === 'string' ? value.slice(0, max) : null
}

function isoValue(value: unknown) {
  const raw = stringValue(value, 100)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function platformValue(value: unknown): MetaPlatform {
  return value === 'facebook' || value === 'instagram' || value === 'audience_network' || value === 'messenger'
    ? value
    : 'unknown'
}

function safeError(error: unknown) {
  if (error instanceof MetaApiError) return { code: error.code, detail: error.message.slice(0, 500) }
  if (error instanceof Error) return { code: error.name || 'ERROR', detail: error.message.slice(0, 500) }
  return { code: 'UNKNOWN_ERROR', detail: 'Falha não identificada.' }
}

async function graphPage(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<MetaListResponse> {
  if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(path)) {
    throw new MetaApiError('Caminho Graph API inválido.', 'INVALID_GRAPH_PATH', 500)
  }
  const config = metaConfig()
  if (!/^v\d+\.\d+$/.test(config.graphVersion)) {
    throw new MetaApiError('Versão da Graph API não configurada.', 'META_VERSION_MISSING', 503)
  }
  const url = new URL('https://graph.facebook.com/' + config.graphVersion + '/' + path)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store',
  })
  const json = await response.json().catch(() => ({})) as MetaListResponse
  if (!response.ok || json.error) {
    const code = json.error?.code ? 'META_' + json.error.code : 'META_HTTP_' + response.status
    throw new MetaApiError(
      (json.error?.message || 'A Meta recusou a solicitação.').slice(0, 500),
      code,
      response.status || 502,
    )
  }
  return json
}

async function graphList(path: string, params: Record<string, string>, token: string) {
  const records: JsonRecord[] = []
  let after = ''
  for (let page = 0; page < 100; page += 1) {
    const response = await graphPage(path, { ...params, limit: '500', ...(after ? { after } : {}) }, token)
    records.push(...(response.data ?? []))
    const next = response.paging?.cursors?.after
    if (!next || next === after) break
    after = next
  }
  return records
}

function sanitizedSnapshot(input: JsonRecord, allowed: string[]) {
  return Object.fromEntries(allowed.flatMap((key) => {
    const value = input[key]
    return value === undefined ? [] : [[key, value]]
  }))
}

function leadActionCount(actions: unknown) {
  if (!Array.isArray(actions)) return 0
  const accepted = new Set([
    'lead',
    'onsite_conversion.lead_grouped',
    'onsite_conversion.lead',
    'offsite_conversion.fb_pixel_lead',
  ])
  return actions.reduce((total, item) => {
    if (!item || typeof item !== 'object') return total
    const action = item as JsonRecord
    return accepted.has(String(action.action_type ?? '')) ? total + numberValue(action.value) : total
  }, 0)
}

async function upsertCatalog(now: string) {
  const config = metaConfig()
  const supabase = getSupabaseAdminClient()
  const account = 'act_' + config.adAccountId
  const [campaigns, adSets, ads, forms] = await Promise.all([
    graphList(account + '/campaigns', {
      fields: 'id,name,objective,status,effective_status,start_time,stop_time',
    }, config.accessToken),
    graphList(account + '/adsets', {
      fields: 'id,name,campaign_id,status,effective_status,optimization_goal,billing_event,start_time,end_time',
    }, config.accessToken),
    graphList(account + '/ads', {
      fields: 'id,name,campaign_id,adset_id,status,effective_status,creative{id}',
    }, config.accessToken),
    config.pageId
      ? graphList(config.pageId + '/leadgen_forms', { fields: 'id,name,status,locale' }, config.leadAccessToken)
      : Promise.resolve([]),
  ])

  if (campaigns.length) {
    const { error } = await supabase.from('meta_campaigns').upsert(campaigns.map((item) => ({
      meta_campaign_id: String(item.id),
      name: stringValue(item.name, 300) || 'Campanha sem nome',
      objective: stringValue(item.objective, 100),
      status: stringValue(item.status, 100),
      effective_status: stringValue(item.effective_status, 100),
      starts_at: isoValue(item.start_time),
      ends_at: isoValue(item.stop_time),
      synced_at: now,
      source_snapshot: sanitizedSnapshot(item, ['id','objective','status','effective_status']),
    })), { onConflict: 'meta_campaign_id' })
    if (error) throw new Error('Falha ao persistir campanhas Meta: ' + error.message)
  }

  if (adSets.length) {
    const { error } = await supabase.from('meta_ad_sets').upsert(adSets.map((item) => ({
      meta_adset_id: String(item.id),
      meta_campaign_id: stringValue(item.campaign_id, 100),
      name: stringValue(item.name, 300) || 'Conjunto sem nome',
      status: stringValue(item.status, 100),
      effective_status: stringValue(item.effective_status, 100),
      optimization_goal: stringValue(item.optimization_goal, 100),
      billing_event: stringValue(item.billing_event, 100),
      starts_at: isoValue(item.start_time),
      ends_at: isoValue(item.end_time),
      synced_at: now,
      source_snapshot: sanitizedSnapshot(item, ['id','campaign_id','status','effective_status','optimization_goal','billing_event']),
    })), { onConflict: 'meta_adset_id' })
    if (error) throw new Error('Falha ao persistir conjuntos Meta: ' + error.message)
  }

  if (ads.length) {
    const { error } = await supabase.from('meta_ads').upsert(ads.map((item) => ({
      meta_ad_id: String(item.id),
      meta_campaign_id: stringValue(item.campaign_id, 100),
      meta_adset_id: stringValue(item.adset_id, 100),
      name: stringValue(item.name, 300) || 'Anúncio sem nome',
      status: stringValue(item.status, 100),
      effective_status: stringValue(item.effective_status, 100),
      creative_id: item.creative && typeof item.creative === 'object'
        ? stringValue((item.creative as JsonRecord).id, 100)
        : null,
      synced_at: now,
      source_snapshot: sanitizedSnapshot(item, ['id','campaign_id','adset_id','status','effective_status']),
    })), { onConflict: 'meta_ad_id' })
    if (error) throw new Error('Falha ao persistir anúncios Meta: ' + error.message)
  }

  if (forms.length) {
    const { error } = await supabase.from('meta_forms').upsert(forms.map((item) => ({
      meta_form_id: String(item.id),
      page_id: config.pageId,
      name: stringValue(item.name, 300) || 'Formulário sem nome',
      status: stringValue(item.status, 100),
      locale: stringValue(item.locale, 40),
      synced_at: now,
      source_snapshot: sanitizedSnapshot(item, ['id','status','locale']),
    })), { onConflict: 'meta_form_id' })
    if (error) throw new Error('Falha ao persistir formulários Meta: ' + error.message)
  }

  return campaigns.length + adSets.length + ads.length + forms.length
}

function insightRow(item: JsonRecord, kind: 'day' | 'range', accountId: string) {
  const dateStart = stringValue(item.date_start, 10)
  const dateStop = stringValue(item.date_stop, 10)
  if (!dateStart || !dateStop) return null
  const level = stringValue(item.ad_id, 100)
    ? 'ad'
    : stringValue(item.adset_id, 100)
      ? 'adset'
      : stringValue(item.campaign_id, 100)
        ? 'campaign'
        : 'account'
  const entityId = stringValue(item.ad_id, 100)
    || stringValue(item.adset_id, 100)
    || stringValue(item.campaign_id, 100)
    || accountId
  return {
    period_start: dateStart,
    period_end: dateStop,
    period_kind: kind,
    level,
    entity_id: entityId,
    meta_campaign_id: stringValue(item.campaign_id, 100),
    meta_adset_id: stringValue(item.adset_id, 100),
    meta_ad_id: stringValue(item.ad_id, 100),
    platform: platformValue(item.publisher_platform),
    currency: stringValue(item.account_currency, 3)?.toUpperCase() || null,
    spend: numberValue(item.spend),
    reach: nullableNumber(item.reach),
    impressions: numberValue(item.impressions),
    clicks: numberValue(item.clicks),
    inline_link_clicks: numberValue(item.inline_link_clicks),
    leads: leadActionCount(item.actions),
    ctr: nullableNumber(item.ctr),
    cpc: nullableNumber(item.cpc),
    cpm: nullableNumber(item.cpm),
    actions: Array.isArray(item.actions) ? item.actions : [],
    fetched_at: new Date().toISOString(),
  }
}

async function upsertInsights(since: string, until: string) {
  const config = metaConfig()
  const account = 'act_' + config.adAccountId
  const fields = [
    'account_currency','campaign_id','campaign_name','adset_id','adset_name','ad_id','ad_name',
    'spend','reach','impressions','clicks','inline_link_clicks','ctr','cpc','cpm','actions',
    'date_start','date_stop',
  ].join(',')
  const timeRange = JSON.stringify({ since, until })
  const [daily, exact] = await Promise.all([
    graphList(account + '/insights', {
      fields,
      level: 'ad',
      breakdowns: 'publisher_platform',
      time_range: timeRange,
      time_increment: '1',
    }, config.accessToken),
    graphList(account + '/insights', {
      fields: 'account_currency,spend,reach,impressions,clicks,inline_link_clicks,ctr,cpc,cpm,actions,date_start,date_stop',
      level: 'account',
      time_range: timeRange,
    }, config.accessToken),
  ])
  const rows = [
    ...daily.map((item) => insightRow(item, 'day', config.adAccountId)),
    ...exact.map((item) => insightRow(item, 'range', config.adAccountId)),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))
  if (rows.length) {
    const { error } = await getSupabaseAdminClient().from('meta_insights').upsert(rows, {
      onConflict: 'period_start,period_end,period_kind,level,entity_id,platform',
    })
    if (error) throw new Error('Falha ao persistir insights Meta: ' + error.message)
  }
  return rows.length
}

async function upsertConnection(status: 'not_configured' | 'configured' | 'active' | 'degraded', errorCode?: string) {
  const config = metaConfig()
  const now = new Date().toISOString()
  const { error } = await getSupabaseAdminClient().from('meta_connections').upsert({
    ad_account_id: config.adAccountId || null,
    page_id: config.pageId || null,
    graph_api_version: config.graphVersion || null,
    status,
    last_sync_at: status === 'active' ? now : null,
    last_error_code: errorCode || null,
    last_error_at: errorCode ? now : null,
    updated_at: now,
  }, { onConflict: 'ad_account_id,page_id' })
  if (error) throw new Error('Falha ao atualizar conexão Meta: ' + error.message)
}

export async function syncMeta(input: { since: string; until: string; requestId: string }) {
  const config = metaConfig()
  const supabase = getSupabaseAdminClient()
  const startedAt = new Date().toISOString()
  const { data: run, error: runError } = await supabase.from('meta_sync_runs').insert({
    sync_kind: 'full',
    period_start: input.since,
    period_end: input.until,
    status: config.missing.length ? 'not_configured' : 'running',
    error_code: config.missing.length ? 'MISSING_CREDENTIALS' : null,
    error_detail: config.missing.length ? 'Ausentes: ' + config.missing.join(', ') : null,
    request_id: input.requestId.slice(0, 200),
    started_at: startedAt,
  }).select('id').single()
  if (runError) throw new Error('Falha ao iniciar auditoria da sincronização Meta: ' + runError.message)

  if (config.missing.length) {
    await upsertConnection('not_configured', 'MISSING_CREDENTIALS')
    return { ok: false, status: 'not_configured' as const, missing: config.missing, runId: run.id }
  }

  try {
    const now = new Date().toISOString()
    const [catalog, insights] = await Promise.all([
      upsertCatalog(now),
      upsertInsights(input.since, input.until),
    ])
    const total = catalog + insights
    await upsertConnection('active')
    await supabase.from('meta_sync_runs').update({
      status: 'succeeded',
      records_read: total,
      records_written: total,
      finished_at: new Date().toISOString(),
    }).eq('id', run.id)
    return { ok: true, status: 'succeeded' as const, records: total, runId: run.id }
  } catch (error) {
    const safe = safeError(error)
    await upsertConnection('degraded', safe.code)
    await supabase.from('meta_sync_runs').update({
      status: 'failed',
      error_code: safe.code,
      error_detail: safe.detail,
      finished_at: new Date().toISOString(),
    }).eq('id', run.id)
    throw error
  }
}

export function verifyMetaWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET?.trim() ?? ''
  if (!secret || !signature?.startsWith('sha256=')) return false
  const supplied = Buffer.from(signature.slice(7), 'hex')
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

async function fetchAndPersistLead(leadId: string, fallback: JsonRecord) {
  const config = metaConfig()
  if (!config.leadAccessToken || !/^v\d+\.\d+$/.test(config.graphVersion)) {
    return { processed: false, reason: 'pending_credentials' as const }
  }
  const response = await graphPage(leadId, {
    fields: 'id,created_time,ad_id,adset_id,campaign_id,form_id,field_data,is_organic,platform',
  }, config.leadAccessToken)
  const lead = response as unknown as JsonRecord
  const fields = Array.isArray(lead.field_data) ? lead.field_data : []
  const consents = fields.filter((item) => {
    if (!item || typeof item !== 'object') return false
    const name = String((item as JsonRecord).name ?? '').toLowerCase()
    return /consent|privacy|privacidade|termos|autoriz/.test(name)
  })
  const capturedAt = isoValue(lead.created_time)
    || isoValue(fallback.created_time)
    || new Date().toISOString()
  const { error } = await getSupabaseAdminClient().from('meta_leads').upsert({
    meta_lead_id: leadId,
    meta_campaign_id: stringValue(lead.campaign_id ?? fallback.campaign_id, 100),
    meta_adset_id: stringValue(lead.adset_id ?? fallback.adset_id, 100),
    meta_ad_id: stringValue(lead.ad_id ?? fallback.ad_id, 100),
    meta_form_id: stringValue(lead.form_id ?? fallback.form_id, 100),
    page_id: stringValue(fallback.page_id, 100),
    platform: platformValue(lead.platform ?? fallback.platform),
    captured_at: capturedAt,
    field_data: fields,
    consent_data: consents,
    journey_status: 'captured',
    source_snapshot: {
      is_organic: Boolean(lead.is_organic),
      platform: platformValue(lead.platform ?? fallback.platform),
      campaign_id: stringValue(lead.campaign_id ?? fallback.campaign_id, 100),
      adset_id: stringValue(lead.adset_id ?? fallback.adset_id, 100),
      ad_id: stringValue(lead.ad_id ?? fallback.ad_id, 100),
      form_id: stringValue(lead.form_id ?? fallback.form_id, 100),
    },
    last_received_at: new Date().toISOString(),
    schema_version: 1,
  }, { onConflict: 'meta_lead_id' })
  if (error) throw new Error('Falha ao persistir lead Meta: ' + error.message)
  return { processed: true, reason: null }
}

export async function processMetaWebhook(rawBody: string) {
  const body = JSON.parse(rawBody) as JsonRecord
  const objectType = stringValue(body.object, 100) || 'unknown'
  const entries = Array.isArray(body.entry) ? body.entry : []
  const supabase = getSupabaseAdminClient()
  let processed = 0
  let pending = 0
  let duplicates = 0

  for (const entryValue of entries) {
    if (!entryValue || typeof entryValue !== 'object') continue
    const entry = entryValue as JsonRecord
    const changes = Array.isArray(entry.changes) ? entry.changes : []
    for (const changeValue of changes) {
      if (!changeValue || typeof changeValue !== 'object') continue
      const change = changeValue as JsonRecord
      if (change.field !== 'leadgen' || !change.value || typeof change.value !== 'object') continue
      const value = change.value as JsonRecord
      const leadId = stringValue(value.leadgen_id, 200)
      if (!leadId) continue
      const canonical = JSON.stringify({ objectType, entryId: entry.id, change: value })
      const payloadHash = createHash('sha256').update(canonical).digest('hex')
      const { data: event, error: eventError } = await supabase.from('meta_webhook_events').insert({
        payload_hash: payloadHash,
        object_type: objectType,
        field_name: 'leadgen',
        meta_lead_id: leadId,
        page_id: stringValue(value.page_id ?? entry.id, 100),
        status: 'received',
        payload: {
          leadgen_id: leadId,
          page_id: stringValue(value.page_id ?? entry.id, 100),
          form_id: stringValue(value.form_id, 100),
          ad_id: stringValue(value.ad_id, 100),
          created_time: value.created_time ?? null,
        },
      }).select('id').single()

      if (eventError?.code === '23505') {
        duplicates += 1
        continue
      }
      if (eventError || !event) throw new Error('Falha ao auditar webhook Meta: ' + (eventError?.message ?? 'empty response'))

      try {
        const result = await fetchAndPersistLead(leadId, {
          ...value,
          page_id: value.page_id ?? entry.id,
        })
        const status = result.processed ? 'processed' : 'pending_credentials'
        await supabase.from('meta_webhook_events').update({
          status,
          reason: result.reason,
          processed_at: result.processed ? new Date().toISOString() : null,
        }).eq('id', event.id)
        if (result.processed) processed += 1
        else pending += 1
      } catch (error) {
        const safe = safeError(error)
        await supabase.from('meta_webhook_events').update({
          status: 'failed',
          reason: safe.code + ': ' + safe.detail,
        }).eq('id', event.id)
      }
    }
  }

  await supabase.from('meta_connections').update({
    last_webhook_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).not('id', 'is', null)
  return { processed, pending, duplicates }
}

export async function getMetaExecutiveSnapshot(input: {
  from: string
  to: string
  platform?: string | null
  campaignId?: string | null
  adId?: string | null
}) {
  const { data, error } = await getSupabaseAdminClient().rpc('meta_executive_snapshot', {
    p_secret: requiredServerSecret(),
    p_from: input.from,
    p_to: input.to,
    p_platform: input.platform ?? null,
    p_campaign_id: input.campaignId ?? null,
    p_ad_id: input.adId ?? null,
  })
  if (error || !data) throw new Error('Meta executive snapshot failed: ' + (error?.message ?? 'empty response'))
  return data as MetaExecutiveSnapshot
}

export async function getActionpayIntegrationSnapshot() {
  const { data, error } = await getSupabaseAdminClient().rpc('actionpay_integration_snapshot', {
    p_secret: requiredServerSecret(),
  })
  if (error || !data) throw new Error('Actionpay integration snapshot failed: ' + (error?.message ?? 'empty response'))
  return data as ActionpayIntegrationSnapshot
}

export function metaConfigurationStatus() {
  const config = metaConfig()
  return {
    configured: config.missing.length === 0,
    missing: config.missing,
    webhookConfigured: Boolean(
      process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()
      && process.env.META_APP_SECRET?.trim()
      && config.leadAccessToken,
    ),
  }
}

