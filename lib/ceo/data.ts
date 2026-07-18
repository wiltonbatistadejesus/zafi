import { getAttributionCockpitSnapshot, getCockpitSnapshot, getOperationalMonitorSnapshot } from '@/lib/telemetry/server'
import type { CockpitSnapshot, RevenueAmount } from '@/lib/telemetry/types'
import type { CockpitData, Metric, Signal } from './types'

const number = new Intl.NumberFormat('pt-BR')

function currency(value: number | string, code: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(Number(value))
}

function revenueLabel(values: RevenueAmount[]) {
  if (!values.length) return currency(0, 'BRL')
  return values.map((item) => currency(item.value, item.currency)).join(' · ')
}

function singleRevenueValue(values: RevenueAmount[]) {
  if (values.length !== 1) return null
  return { value: Number(values[0].value), currency: values[0].currency }
}

function percentage(value: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function coverage(value: number, total: number) {
  return total ? percentage(value, total) : 'Sem base'
}

function percentValue(value: number | string | null) {
  return value === null ? 'Sem base' : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function qualitySignal(value: number | string | null): Signal {
  if (value === null) return 'neutral'
  const numericValue = Number(value)
  if (numericValue >= 99) return 'healthy'
  if (numericValue >= 90) return 'attention'
  return 'critical'
}

function sourceValue(snapshot: CockpitSnapshot, source: string) {
  return snapshot.sources.find((item) => item.source.toLowerCase() === source)?.value ?? 0
}

function contentMetrics(snapshot: CockpitSnapshot): Metric[] {
  if (!snapshot.pages.length) return [{ label: 'Páginas com visitas hoje', value: '0', detail: 'Nenhum page_view persistido hoje' }]
  return snapshot.pages.slice(0, 4).map((item) => ({
    label: item.page,
    value: number.format(item.value),
    detail: 'Visitas persistidas hoje',
  }))
}

export async function getCockpitData(): Promise<CockpitData> {
  const [data, attribution, operational] = await Promise.all([
    getCockpitSnapshot(),
    getAttributionCockpitSnapshot(),
    getOperationalMonitorSnapshot(),
  ])
  const topPartner = data.partners[0]
  const topConversionPartner = data.conversion_partners[0]
  const ga4Healthy = data.ga4_failed === 0
  const todayRevenue = singleRevenueValue(data.revenue_today)
  const revenuePerVisitor = todayRevenue && data.visitors ? currency(todayRevenue.value / data.visitors, todayRevenue.currency) : currency(0, 'BRL')
  const revenuePerAnalysis = todayRevenue && data.analysis_completed ? currency(todayRevenue.value / data.analysis_completed, todayRevenue.currency) : currency(0, 'BRL')
  const epc = todayRevenue && data.partner_clicked ? currency(todayRevenue.value / data.partner_clicked, todayRevenue.currency) : currency(0, 'BRL')
  const clickCoverage = coverage(attribution.clicks_total, attribution.affiliate_clicks_total)
  const conversionCoverage = coverage(attribution.conversions_total, attribution.affiliate_conversions_total)
  const primaryDiagnostic = operational.diagnostics[0]
  const operationalHealthSignal = operational.overall_status === 'neutral' ? 'attention' : operational.overall_status
  const operationalStatusLabel = operational.overall_status === 'healthy' ? 'Cadeia saudável'
    : operational.overall_status === 'critical' ? 'Falha crítica detectada'
      : operational.overall_status === 'attention' ? 'Requer atenção' : 'Aguardando base'

  return {
    generatedAt: data.generated_at,
    mode: 'live',
    northStar: {
      completed: number.format(data.analysis_completed),
      dayGoal: 'Baseline em formação',
      monthGoal: number.format(data.month_analysis_completed),
      change: `${percentage(data.analysis_completed, data.analysis_started)} das iniciadas`,
      progress: data.analysis_started ? Math.min(100, Math.round((data.analysis_completed / data.analysis_started) * 100)) : 0,
    },
    acquisition: [
      { label: 'Visitantes', value: number.format(data.visitors), detail: 'IDs únicos com page_view hoje' },
      { label: 'Usuários novos', value: number.format(data.new_visitors), detail: 'Primeira visita persistida hoje' },
      { label: 'Sessões', value: number.format(data.sessions), detail: 'Sessões únicas hoje' },
    ],
    trafficSources: [
      { label: 'Orgânico', value: number.format(sourceValue(data, 'organic')) },
      { label: 'Direto', value: number.format(sourceValue(data, 'direct')) },
      { label: 'Social', value: number.format(sourceValue(data, 'social')) },
      { label: 'Referral', value: number.format(sourceValue(data, 'referral')) },
    ],
    google: [
      { label: 'Impressões', value: 'Não integrado', detail: 'Search Console não faz parte da telemetria desta sprint' },
      { label: 'Cliques de busca', value: 'Não integrado', detail: 'Sem fonte oficial conectada' },
      { label: 'CTR', value: 'Não integrado', detail: 'Sem fonte oficial conectada' },
      { label: 'Posição média', value: 'Não integrado', detail: 'Sem fonte oficial conectada' },
    ],
    queries: [
      { label: 'Consultas em crescimento', direction: 'up', detail: 'Não mensurado sem API do Search Console' },
      { label: 'Consultas em queda', direction: 'down', detail: 'Não mensurado sem API do Search Console' },
    ],
    content: {
      topPages: contentMetrics(data),
      published: ['Hub ORÁCULO', 'Como limpar o nome', 'Como aumentar o score'],
    },
    funnel: [
      { label: 'Visitante', value: number.format(data.visitors) },
      { label: 'Análise iniciada', value: number.format(data.analysis_started), conversion: percentage(data.analysis_started, data.visitors) },
      { label: 'Análise concluída', value: number.format(data.analysis_completed), conversion: percentage(data.analysis_completed, data.analysis_started) },
      { label: 'Clique parceiro', value: number.format(data.partner_clicked), conversion: percentage(data.partner_clicked, data.analysis_completed) },
      { label: 'Conversão', value: number.format(data.conversions_today), conversion: percentage(data.conversions_today, data.partner_clicked) },
      { label: 'Receita', value: revenueLabel(data.revenue_today), conversion: 'Conversões aprovadas ou pagas' },
    ],
    partners: [
      { label: 'Cliques', value: number.format(data.partner_clicked), detail: 'Eventos partner_clicked hoje' },
      { label: 'Conversões', value: number.format(data.conversions_today), detail: 'Conversões aprovadas ou pagas hoje' },
      { label: 'Receita', value: revenueLabel(data.revenue_today), detail: 'Comissão aprovada ou paga hoje' },
      { label: 'EPC', value: epc, detail: 'Receita aprovada ou paga ÷ cliques hoje' },
      { label: 'Top parceiro', value: topConversionPartner?.partner_name || topPartner?.partner_name || 'Sem atividade', detail: topConversionPartner ? `${number.format(topConversionPartner.conversions)} conversão(ões) aprovada(s)` : topPartner ? `${number.format(topPartner.value)} clique(s)` : 'Base oficial sem evento' },
    ],
    revenue: [
      { label: 'Hoje', value: revenueLabel(data.revenue_today) },
      { label: 'Semana', value: revenueLabel(data.revenue_week) },
      { label: 'Mês', value: revenueLabel(data.revenue_month) },
      { label: 'Total', value: revenueLabel(data.revenue_total) },
      { label: 'Por visitante', value: revenuePerVisitor },
      { label: 'Por análise', value: revenuePerAnalysis },
    ],
    operations: {
      status: operational.overall_status,
      hasActivity: operational.has_activity,
      statusLabel: operationalStatusLabel,
      score: operational.health_score === null ? 'Sem base' : `${Math.round(Number(operational.health_score))} / 100`,
      window: `Últimas ${operational.window_hours}h · snapshots a cada 5 min`,
      chain: operational.chain.map((stage) => ({
        key: stage.key,
        label: stage.label,
        count: number.format(stage.count),
        status: stage.status,
        coverage: percentValue(stage.coverage),
        detail: stage.detail,
      })),
      quality: operational.quality.map((metric) => ({
        key: metric.key,
        label: metric.label,
        value: percentValue(metric.value),
        numerator: number.format(metric.numerator),
        denominator: number.format(metric.denominator),
        signal: qualitySignal(metric.value),
      })),
      diagnostics: operational.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        severity: diagnostic.severity,
        title: diagnostic.title,
        detail: diagnostic.detail,
        count: number.format(diagnostic.count),
      })),
      reconciliation: [
        { label: 'Conciliadas', value: `${number.format(operational.reconciliation.reconciled)} / ${number.format(operational.reconciliation.total)}`, signal: operational.reconciliation.total === 0 ? 'neutral' : operational.reconciliation.unreconciled === 0 ? 'healthy' : 'critical', detail: 'Conversões com estado, valor, moeda e origem consistentes' },
        { label: 'Divergências', value: number.format(operational.reconciliation.unreconciled), signal: operational.reconciliation.total === 0 ? 'neutral' : operational.reconciliation.unreconciled === 0 ? 'healthy' : 'critical', detail: 'Registros que exigem investigação' },
        { label: 'Postbacks aceitos', value: number.format(operational.reconciliation.postbacks_accepted), detail: `${number.format(operational.reconciliation.postbacks_duplicate)} repetido(s) sem duplicar receita` },
        { label: 'Postbacks rejeitados', value: number.format(operational.reconciliation.postbacks_rejected), signal: operational.reconciliation.postbacks_rejected === 0 ? 'healthy' : 'attention', detail: 'Falharam na validação técnica ou de segurança' },
        { label: 'Pendentes antigas', value: number.format(operational.reconciliation.stale_pending), signal: operational.reconciliation.stale_pending === 0 ? 'healthy' : 'attention', detail: 'Aguardando atualização há mais de 7 dias' },
      ],
    },
    attribution: {
      summary: [
        { label: 'Impressões hoje', value: number.format(attribution.impressions_today), detail: 'Cards efetivamente liberados para exibição' },
        { label: 'Cliques atribuídos', value: number.format(attribution.clicks_today), detail: `${percentage(attribution.clicks_today, attribution.impressions_today)} das impressões de hoje` },
        { label: 'Conversões atribuídas', value: number.format(attribution.conversions_today), detail: 'Transações ligadas a uma decisão hoje' },
        { label: 'Cobertura de cliques', value: clickCoverage, signal: attribution.affiliate_clicks_total === 0 ? 'neutral' : attribution.affiliate_clicks_total === attribution.clicks_total ? 'healthy' : 'critical', detail: `${number.format(attribution.clicks_total)} de ${number.format(attribution.affiliate_clicks_total)} cliques` },
        { label: 'Cobertura de conversões', value: conversionCoverage, signal: attribution.affiliate_conversions_total === 0 ? 'neutral' : attribution.unattributed_conversions_total === 0 ? 'healthy' : 'attention', detail: `${number.format(attribution.unattributed_conversions_total)} sem atribuição causal` },
      ],
      finance: [
        { label: 'Receita criada', value: revenueLabel(attribution.revenue_created), detail: `${number.format(attribution.created_count)} transação(ões) criada(s)` },
        { label: 'Receita aprovada', value: revenueLabel(attribution.revenue_approved), detail: `${number.format(attribution.approved_count)} transação(ões) aprovada(s)` },
        { label: 'Receita paga', value: revenueLabel(attribution.revenue_paid), detail: `${number.format(attribution.paid_count)} transação(ões) paga(s)` },
      ],
      topDecisions: attribution.top_decisions.map((decision) => ({
        id: `${decision.decision_id}:${decision.currency ?? 'none'}`,
        product: decision.product_name,
        partner: decision.partner_name,
        impressions: number.format(decision.impressions),
        clicks: number.format(decision.clicks),
        conversions: number.format(decision.conversions),
        approvedRevenue: decision.currency ? currency(decision.revenue_approved, decision.currency) : 'Sem receita',
        paidRevenue: decision.currency ? currency(decision.revenue_paid, decision.currency) : 'Sem receita',
      })),
    },
    financeHistory: data.recent_conversions.slice(0, 8).map((conversion) => ({
      id: conversion.id,
      transactionId: conversion.transaction_id,
      partner: conversion.partner_name,
      campaignId: conversion.campaign_id,
      status: conversion.status,
      amount: conversion.commission !== null && conversion.currency
        ? currency(conversion.commission, conversion.currency)
        : 'Sem comissão aprovada',
      receivedAt: conversion.last_received_at,
    })),
    alerts: [
      ...operational.diagnostics.slice(0, 2).map((diagnostic) => ({ signal: diagnostic.severity as Signal, title: diagnostic.title, detail: `${number.format(diagnostic.count)} ocorrência(s). ${diagnostic.detail}` })),
      ...(data.ga4_failed > 0 ? [{ signal: 'critical' as const, title: 'Falha de entrega ao GA4', detail: `${number.format(data.ga4_failed)} entrega(s) falharam hoje.` }] : []),
      { signal: (ga4Healthy ? 'healthy' : 'attention') as Signal, title: 'Telemetria persistente ativa', detail: `${number.format(data.ga4_accepted)} evento(s) aceitos pelo GA4 hoje.` },
      { signal: (attribution.unattributed_conversions_total === 0 ? 'healthy' : 'attention') as Signal, title: 'Cobertura de atribuição', detail: `${conversionCoverage} das conversões conectadas ao Recommendation Engine.` },
    ].slice(0, 4),
    actions: [
      primaryDiagnostic
        ? { priority: primaryDiagnostic.severity === 'critical' ? 'critical' : 'attention', title: `Corrigir: ${primaryDiagnostic.title}`, reason: primaryDiagnostic.detail, owner: 'Engenharia' }
        : { priority: 'opportunity', title: 'Validar um ciclo completo', reason: 'Confirma a saúde de todas as seis etapas com atividade real.', owner: 'Growth + Engenharia' },
      { priority: 'attention', title: 'Revisar conciliação financeira', reason: `${number.format(operational.reconciliation.unreconciled)} registro(s) aguardam conciliação.`, owner: 'CEO + Financeiro' },
      { priority: 'opportunity', title: 'Acompanhar a qualidade por 7 dias', reason: 'Forma o baseline operacional sem alterar o motor.', owner: 'CEO + Engenharia' },
    ],
    roadmap: {
      current: 'OE-005 · Saúde operacional',
      next: 'Baseline de confiabilidade em produção',
      progress: operational.overall_status === 'healthy' ? 100 : operational.overall_status === 'critical' ? 70 : operational.overall_status === 'attention' ? 85 : 90,
      milestone: operational.has_activity ? `${operational.diagnostics.length} diagnóstico(s) ativo(s) na janela` : 'Monitor ativo; aguarda atividade real da cadeia',
    },
    health: [
      { label: 'SEO', signal: 'healthy', detail: 'Base indexável' },
      { label: 'GEO', signal: 'healthy', detail: 'ORÁCULO estruturado' },
      { label: 'Analytics', signal: !ga4Healthy ? 'critical' : operationalHealthSignal, detail: operationalStatusLabel },
      { label: 'Monetização', signal: operational.reconciliation.unreconciled > 0 ? 'critical' : operational.reconciliation.total > 0 ? 'healthy' : 'attention', detail: operational.reconciliation.total > 0 ? 'Conciliação monitorada' : 'Aguardando conversão' },
      { label: 'Infraestrutura', signal: operationalHealthSignal, detail: `Saúde ${operational.health_score === null ? 'sem base' : `${Math.round(Number(operational.health_score))}/100`}` },
      { label: 'Conteúdo', signal: 'attention', detail: 'Conversão agora rastreável' },
    ],
  }
}
