import { getCockpitSnapshot } from '@/lib/telemetry/server'
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
  const data = await getCockpitSnapshot()
  const topPartner = data.partners[0]
  const topConversionPartner = data.conversion_partners[0]
  const ga4Healthy = data.ga4_failed === 0
  const todayRevenue = singleRevenueValue(data.revenue_today)
  const revenuePerVisitor = todayRevenue && data.visitors ? currency(todayRevenue.value / data.visitors, todayRevenue.currency) : currency(0, 'BRL')
  const revenuePerAnalysis = todayRevenue && data.analysis_completed ? currency(todayRevenue.value / data.analysis_completed, todayRevenue.currency) : currency(0, 'BRL')
  const epc = todayRevenue && data.partner_clicked ? currency(todayRevenue.value / data.partner_clicked, todayRevenue.currency) : currency(0, 'BRL')

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
      { label: 'Receita', value: revenueLabel(data.revenue_today), conversion: 'Conversões aprovadas' },
    ],
    partners: [
      { label: 'Cliques', value: number.format(data.partner_clicked), detail: 'Eventos partner_clicked hoje' },
      { label: 'Conversões', value: number.format(data.conversions_today), detail: 'Conversões aprovadas hoje' },
      { label: 'Receita', value: revenueLabel(data.revenue_today), detail: 'Comissão aprovada hoje' },
      { label: 'EPC', value: epc, detail: 'Receita aprovada ÷ cliques hoje' },
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
      { signal: 'healthy' as const, title: 'Ciclo financeiro auditável', detail: `${number.format(data.conversions_total)} conversão(ões) aprovada(s) com histórico idempotente.` },
      { signal: (data.partner_clicked > 0 ? 'healthy' : 'attention') as Signal, title: 'Rota /go auditável', detail: `${number.format(data.partner_clicked)} clique(s) de parceiro persistidos hoje.` },
    ].slice(0, 4),
    actions: [
      { priority: 'critical', title: 'Validar conversão real da Actionpay', reason: 'Fecha o aceite operacional com uma transação aprovada pela rede.', owner: 'Growth + Engenharia' },
      { priority: 'attention', title: 'Monitorar a telemetria por 7 dias', reason: 'Confirma estabilidade e forma um baseline confiável.', owner: 'CEO + Engenharia' },
      { priority: 'opportunity', title: 'Confirmar metas e comissões', reason: 'Documenta o contrato financeiro de cada campanha.', owner: 'CEO + Growth' },
    ],
    roadmap: {
      current: 'OE-001.1 · Ciclo financeiro',
      next: 'Validação financeira em produção',
      progress: data.conversions_total > 0 ? 100 : 90,
      milestone: data.conversions_total > 0 ? 'Conversão → banco → receita → Cockpit' : 'Infraestrutura pronta; aguarda postback real aprovado',
    },
    health: [
      { label: 'SEO', signal: 'healthy', detail: 'Base indexável' },
      { label: 'GEO', signal: 'healthy', detail: 'ORÁCULO estruturado' },
      { label: 'Analytics', signal: ga4Healthy ? 'healthy' : 'critical', detail: ga4Healthy ? 'Eventos auditáveis' : 'Entregas com falha' },
      { label: 'Monetização', signal: data.conversions_total > 0 ? 'healthy' : 'attention', detail: data.conversions_total > 0 ? 'Receita conciliada' : 'Aguardando conversão real' },
      { label: 'Infraestrutura', signal: 'healthy', detail: 'Banco como fonte oficial' },
      { label: 'Conteúdo', signal: 'attention', detail: 'Conversão agora rastreável' },
    ],
  }
}
