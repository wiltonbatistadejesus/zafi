import { getAttributionCockpitSnapshot, getCockpitSnapshot } from '@/lib/telemetry/server'
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
  const [data, attribution] = await Promise.all([
    getCockpitSnapshot(),
    getAttributionCockpitSnapshot(),
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
      ...(data.ga4_failed > 0 ? [{ signal: 'critical' as const, title: 'Falha de entrega ao GA4', detail: `${number.format(data.ga4_failed)} entrega(s) falharam hoje.` }] : []),
      { signal: (ga4Healthy ? 'healthy' : 'attention') as Signal, title: 'Telemetria persistente ativa', detail: `${number.format(data.ga4_accepted)} evento(s) aceitos pelo GA4 hoje.` },
      { signal: (attribution.unattributed_conversions_total === 0 ? 'healthy' : 'attention') as Signal, title: 'Cobertura de atribuição', detail: `${conversionCoverage} das conversões conectadas ao Recommendation Engine.` },
      { signal: 'healthy' as const, title: 'Ciclo financeiro auditável', detail: `${number.format(data.conversions_total)} conversão(ões) aprovada(s) ou paga(s) com histórico idempotente.` },
      { signal: (data.partner_clicked > 0 ? 'healthy' : 'attention') as Signal, title: 'Rota /go auditável', detail: `${number.format(data.partner_clicked)} clique(s) de parceiro persistidos hoje.` },
    ].slice(0, 4),
    actions: [
      { priority: 'critical', title: 'Validar o primeiro ciclo atribuído', reason: 'Confirma impressão → clique → conversão na mesma decisão.', owner: 'Growth + Engenharia' },
      { priority: 'attention', title: 'Confirmar evento de pagamento', reason: 'Separa receita aprovada de caixa efetivamente pago pela rede.', owner: 'CEO + Financeiro' },
      { priority: 'opportunity', title: 'Monitorar cobertura por 7 dias', reason: 'Forma um baseline confiável sem otimização automática.', owner: 'CEO + Engenharia' },
    ],
    roadmap: {
      current: 'OE-004 · Atribuição financeira',
      next: 'Validação causal em produção',
      progress: attribution.conversions_total > 0 ? 100 : 90,
      milestone: attribution.conversions_total > 0 ? 'Impressão → decisão → clique → receita' : 'Infraestrutura pronta; aguarda conversão real atribuída',
    },
    health: [
      { label: 'SEO', signal: 'healthy', detail: 'Base indexável' },
      { label: 'GEO', signal: 'healthy', detail: 'ORÁCULO estruturado' },
      { label: 'Analytics', signal: ga4Healthy ? 'healthy' : 'critical', detail: ga4Healthy ? 'Eventos auditáveis' : 'Entregas com falha' },
      { label: 'Monetização', signal: attribution.conversions_total > 0 ? 'healthy' : 'attention', detail: attribution.conversions_total > 0 ? 'Receita atribuída' : 'Aguardando conversão atribuída' },
      { label: 'Infraestrutura', signal: 'healthy', detail: 'Banco como fonte oficial' },
      { label: 'Conteúdo', signal: 'attention', detail: 'Conversão agora rastreável' },
    ],
  }
}
