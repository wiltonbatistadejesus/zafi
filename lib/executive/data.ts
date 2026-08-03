import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getGitHubHealth } from './github'
import { buildIntegrationHealth, getVercelHealth } from './integrations'
import type {
  AlertSignal,
  ExecutiveAlert,
  ExecutiveSnapshot,
  ExecutiveSnapshotRaw,
} from './types'

export type ExecutivePeriodPreset = 'today' | '7d' | '30d' | 'custom'
export type ExecutivePeriod = { preset: ExecutivePeriodPreset; from: string; to: string }

function serverSecret() {
  const value = process.env.TELEMETRY_SERVER_SECRET
  if (!value) throw new Error('TELEMETRY_SERVER_SECRET is not configured')
  return value
}

function dateInSaoPaulo(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

export function resolveExecutivePeriod(input: {
  period?: string
  from?: string
  to?: string
}): ExecutivePeriod {
  const now = new Date()
  const preset: ExecutivePeriodPreset =
    input.period === 'today' || input.period === '30d' || input.period === 'custom'
      ? input.period
      : '7d'

  if (preset === 'today') {
    return { preset, from: new Date(dateInSaoPaulo(now) + 'T00:00:00-03:00').toISOString(), to: now.toISOString() }
  }

  if (preset === 'custom') {
    const fromDate = validDate(input.from)
    const toDate = validDate(input.to)
    if (fromDate && toDate) {
      const from = new Date(fromDate + 'T00:00:00-03:00')
      const to = new Date(toDate + 'T23:59:59.999-03:00')
      if (from < to && to.getTime() - from.getTime() <= 366 * 86_400_000) {
        return { preset, from: from.toISOString(), to: to.toISOString() }
      }
    }
  }

  const days = preset === '30d' ? 30 : 7
  return {
    preset: preset === 'custom' ? '7d' : preset,
    from: new Date(now.getTime() - days * 86_400_000).toISOString(),
    to: now.toISOString(),
  }
}

function numeric(value: number | string | null | undefined) {
  const result = Number(value ?? 0)
  return Number.isFinite(result) ? result : 0
}

function percentChange(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? null : 0
}

function configNumber(config: Record<string, unknown>, key: string, fallback: number) {
  const value = Number(config[key])
  return Number.isFinite(value) ? value : fallback
}

function rule(snapshot: ExecutiveSnapshotRaw, key: string) {
  return snapshot.alert_rules.find((item) => item.key === key)
}

function buildAlerts(snapshot: ExecutiveSnapshotRaw): ExecutiveAlert[] {
  const current = snapshot.metrics.current
  const previous = snapshot.metrics.previous
  const alerts: ExecutiveAlert[] = []

  const trafficRule = rule(snapshot, 'traffic_drop')
  const trafficChange = percentChange(current.visitors, previous.visitors)
  if (
    trafficRule &&
    previous.visitors >= configNumber(trafficRule.config, 'minimum_previous', 5) &&
    trafficChange !== null &&
    trafficChange <= -trafficRule.threshold
  ) {
    alerts.push({
      signal: trafficRule.severity,
      code: trafficRule.key,
      title: trafficRule.label,
      detail: 'Visitantes: ' + current.visitors + ' agora contra ' + previous.visitors + ' no período anterior.',
    })
  }

  const conversionRule = rule(snapshot, 'diagnosis_conversion_drop')
  if (
    conversionRule &&
    current.completion_rate !== null &&
    previous.completion_rate !== null &&
    current.diagnosis_started >= configNumber(conversionRule.config, 'minimum_starts', 5) &&
    previous.completion_rate - current.completion_rate >= conversionRule.threshold
  ) {
    alerts.push({
      signal: conversionRule.severity,
      code: conversionRule.key,
      title: conversionRule.label,
      detail: 'A conclusão caiu de ' + previous.completion_rate + '% para ' + current.completion_rate + '%.',
    })
  }

  const silenceRule = rule(snapshot, 'event_silence')
  if (silenceRule && snapshot.period.days >= 1 && current.visitors === 0) {
    alerts.push({
      signal: silenceRule.severity,
      code: silenceRule.key,
      title: silenceRule.label,
      detail: 'Nenhuma visita pública válida foi registrada no período.',
    })
  }

  const sprintRule = rule(snapshot, 'sprint_delayed')
  if (sprintRule && (snapshot.engineering.blockers > 0 || snapshot.engineering.sprint.status === 'blocked')) {
    alerts.push({
      signal: sprintRule.severity,
      code: sprintRule.key,
      title: sprintRule.label,
      detail: snapshot.engineering.blockers + ' bloqueio(s) executivo(s) ativo(s).',
    })
  }

  const conversionGrowthRule = rule(snapshot, 'conversion_growth')
  const conversionGrowth = percentChange(current.completion_rate ?? 0, previous.completion_rate ?? 0)
  if (
    conversionGrowthRule &&
    current.diagnosis_started >= configNumber(conversionGrowthRule.config, 'minimum_starts', 5) &&
    conversionGrowth !== null &&
    conversionGrowth >= conversionGrowthRule.threshold
  ) {
    alerts.push({
      signal: conversionGrowthRule.severity,
      code: conversionGrowthRule.key,
      title: conversionGrowthRule.label,
      detail: 'A conclusão evoluiu para ' + current.completion_rate + '%.',
    })
  }

  const revenueRule = rule(snapshot, 'revenue_growth')
  const currentRevenue = numeric(snapshot.finance.current.revenue_approved)
  const previousRevenue = numeric(snapshot.finance.previous.revenue_approved)
  const revenueGrowth = percentChange(currentRevenue, previousRevenue)
  if (
    revenueRule &&
    previousRevenue >= configNumber(revenueRule.config, 'minimum_previous', 1) &&
    revenueGrowth !== null &&
    revenueGrowth >= revenueRule.threshold
  ) {
    alerts.push({
      signal: revenueRule.severity,
      code: revenueRule.key,
      title: revenueRule.label,
      detail: 'Receita aprovada cresceu ' + revenueGrowth.toFixed(1).replace('.', ',') + '%.',
    })
  }

  for (const diagnostic of snapshot.monitor.diagnostics ?? []) {
    alerts.push({
      signal: diagnostic.severity,
      code: diagnostic.code,
      title: diagnostic.title,
      detail: diagnostic.count + ' ocorrência(s). ' + diagnostic.detail,
    })
  }

  const order: Record<AlertSignal, number> = { critical: 1, attention: 2, positive: 3 }
  return alerts.sort((a, b) => order[a.signal] - order[b.signal]).slice(0, 8)
}

export async function getExecutiveSnapshot(period: ExecutivePeriod): Promise<ExecutiveSnapshot> {
  const { data, error } = await getSupabaseAdminClient().rpc('executive_weekly_snapshot', {
    p_secret: serverSecret(),
    p_from: period.from,
    p_to: period.to,
  })
  if (error || !data) throw new Error('Executive snapshot failed: ' + (error?.message ?? 'empty response'))

  type DatabaseTrendRow = ExecutiveSnapshotRaw['trend'][number] & { metric_day?: string }
  const received = data as Omit<ExecutiveSnapshotRaw, 'trend'> & { trend: DatabaseTrendRow[] }
  const raw: ExecutiveSnapshotRaw = {
    ...received,
    trend: (received.trend ?? []).map(({ metric_day, ...item }) => ({
      ...item,
      day: item.day || metric_day || '',
    })),
  }
  const github = await getGitHubHealth(raw.period.from, raw.period.to)
  const criticalBugs = (raw.monitor.diagnostics ?? [])
    .filter((item) => item.severity === 'critical')
    .reduce((total, item) => total + Number(item.count || 0), 0)
  const overall =
    raw.engineering.blockers > 0 || raw.engineering.sprint.status === 'blocked' || criticalBugs > 0
      ? 'critical'
      : raw.engineering.sprint.completion < 50
        ? 'attention'
        : 'healthy'

  const vercel = getVercelHealth()
  const dataHealth = buildIntegrationHealth(raw, github)

  return {
    ...raw,
    engineering: { ...raw.engineering, github, criticalBugs, overall },
    alerts: buildAlerts(raw),
    dataHealth,
    integrations: { vercel },
  }
}
