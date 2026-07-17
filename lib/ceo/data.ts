import { getCockpitSnapshot } from '@/lib/telemetry/server'
import type { CockpitSnapshot } from '@/lib/telemetry/types'
import type { CockpitData, Metric, Signal } from './types'

const number = new Intl.NumberFormat('pt-BR')

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
  const ga4Healthy = data.ga4_failed === 0

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
      { label: 'Conversão', value: 'Não mensurado', conversion: 'Sem postback do parceiro' },
      { label: 'Receita', value: 'Não mensurado', conversion: 'Sem conciliação do parceiro' },
    ],
    partners: [
      { label: 'Cliques', value: number.format(data.partner_clicked), detail: 'Eventos partner_clicked hoje' },
      { label: 'Conversões', value: 'Não mensurado', detail: 'Sem postback do parceiro' },
      { label: 'Receita', value: 'Não mensurado', detail: 'Sem conciliação do parceiro' },
      { label: 'EPC', value: 'Não calculável', detail: 'Receita ainda não mensurada' },
      { label: 'Top parceiro', value: topPartner?.partner_name || 'Sem cliques hoje', detail: topPartner ? `${number.format(topPartner.value)} clique(s)` : 'Base oficial sem evento' },
    ],
    revenue: [
      { label: 'Hoje', value: 'Não mensurado' },
      { label: 'Semana', value: 'Não mensurado' },
      { label: 'Mês', value: 'Não mensurado' },
      { label: 'Total', value: 'Não mensurado' },
      { label: 'Por visitante', value: 'Não calculável' },
      { label: 'Por análise', value: 'Não calculável' },
    ],
    alerts: [
      ...(data.ga4_failed > 0 ? [{ signal: 'critical' as const, title: 'Falha de entrega ao GA4', detail: `${number.format(data.ga4_failed)} entrega(s) falharam hoje.` }] : []),
      { signal: (ga4Healthy ? 'healthy' : 'attention') as Signal, title: 'Telemetria persistente ativa', detail: `${number.format(data.ga4_accepted)} evento(s) aceitos pelo GA4 hoje.` },
      { signal: 'attention' as const, title: 'Receita sem conciliação', detail: 'Conversões e receita permanecem não mensuradas até existir postback.' },
      { signal: (data.partner_clicked > 0 ? 'healthy' : 'attention') as Signal, title: 'Rota /go auditável', detail: `${number.format(data.partner_clicked)} clique(s) de parceiro persistidos hoje.` },
    ].slice(0, 4),
    actions: [
      { priority: 'critical', title: 'Validar o fluxo operacional', reason: 'Confirma banco, GA4 e Cockpit na mesma sessão real.', owner: 'CEO + Engenharia' },
      { priority: 'attention', title: 'Obter postback dos parceiros', reason: 'Permite medir conversões e receita sem estimativas.', owner: 'Growth' },
      { priority: 'opportunity', title: 'Definir metas após o baseline', reason: 'Sete dias de dados reais permitirão metas responsáveis.', owner: 'Produto' },
    ],
    roadmap: {
      current: 'Sprint 6.2 · Telemetria da Zafi',
      next: 'Sprint 6.3 · Conciliação de parceiros',
      progress: 90,
      milestone: 'Cadeia banco → GA4 → Cockpit em validação operacional',
    },
    health: [
      { label: 'SEO', signal: 'healthy', detail: 'Base indexável' },
      { label: 'GEO', signal: 'healthy', detail: 'ORÁCULO estruturado' },
      { label: 'Analytics', signal: ga4Healthy ? 'healthy' : 'critical', detail: ga4Healthy ? 'Eventos auditáveis' : 'Entregas com falha' },
      { label: 'Monetização', signal: 'critical', detail: 'Sem postback de receita' },
      { label: 'Infraestrutura', signal: 'healthy', detail: 'Banco como fonte oficial' },
      { label: 'Conteúdo', signal: 'attention', detail: 'Conversão agora rastreável' },
    ],
  }
}
