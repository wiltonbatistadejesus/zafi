import type { CockpitData } from './types'

/**
 * Single read model for the CEO Cockpit.
 * Replace each placeholder section with its API adapter without changing the UI.
 */
export async function getCockpitData(): Promise<CockpitData> {
  return {
    generatedAt: new Date().toISOString(),
    mode: 'placeholder',
    northStar: {
      completed: '—',
      dayGoal: 'Definir após 7 dias',
      monthGoal: 'Definir após baseline',
      change: 'Evento ainda não instrumentado',
      progress: 0,
    },
    acquisition: [
      { label: 'Visitantes', value: '—', detail: 'GA4 conectado' },
      { label: 'Usuários novos', value: '—', detail: 'API pendente' },
      { label: 'Sessões', value: '—', detail: 'API pendente' },
    ],
    trafficSources: [
      { label: 'Orgânico', value: '—' },
      { label: 'Direto', value: '—' },
      { label: 'Social', value: '—' },
      { label: 'Referral', value: '—' },
    ],
    google: [
      { label: 'Impressões', value: '—', detail: 'Search Console conectado' },
      { label: 'Cliques', value: '—', detail: 'Aguardando API' },
      { label: 'CTR', value: '—', detail: 'Aguardando API' },
      { label: 'Posição média', value: '—', detail: 'Aguardando API' },
    ],
    queries: [
      { label: 'Consultas em crescimento', direction: 'up', detail: 'Disponível após sincronização' },
      { label: 'Consultas em queda', direction: 'down', detail: 'Disponível após sincronização' },
    ],
    content: {
      topPages: [
        { label: 'Top páginas', value: '—', detail: 'Sem ranking importado' },
        { label: 'Páginas crescendo', value: '—', detail: 'Sem comparação ainda' },
        { label: 'Páginas caindo', value: '—', detail: 'Sem comparação ainda' },
        { label: 'Sem impressões', value: '—', detail: 'Aguardando cobertura' },
      ],
      published: ['Hub ORÁCULO', 'Como limpar o nome', 'Como aumentar o score'],
    },
    funnel: [
      { label: 'Visitante', value: '—' },
      { label: 'Análise iniciada', value: '—', conversion: 'evento pendente' },
      { label: 'Análise concluída', value: '—', conversion: 'evento pendente' },
      { label: 'Clique parceiro', value: '—', conversion: 'rota pronta' },
      { label: 'Conversão', value: '—', conversion: 'postback pendente' },
      { label: 'Receita', value: '—', conversion: 'conciliação pendente' },
    ],
    partners: [
      { label: 'Cliques', value: '—', detail: 'Rota /go ativa' },
      { label: 'Conversões', value: '—', detail: 'Postback pendente' },
      { label: 'Receita', value: '—', detail: 'Conciliação pendente' },
      { label: 'EPC', value: '—', detail: 'Sem base suficiente' },
      { label: 'Top parceiro', value: 'FinanciaTudo', detail: 'Único parceiro ativo' },
    ],
    revenue: [
      { label: 'Hoje', value: '—' },
      { label: 'Semana', value: '—' },
      { label: 'Mês', value: '—' },
      { label: 'Total', value: '—' },
      { label: 'Por visitante', value: '—' },
      { label: 'Por análise', value: '—' },
    ],
    alerts: [
      { signal: 'critical', title: 'Funil sem eventos', detail: 'Análises iniciadas e concluídas ainda não chegam ao Cockpit.' },
      { signal: 'attention', title: 'Receita sem conciliação', detail: 'Conversões do parceiro ainda não possuem retorno automático.' },
      { signal: 'healthy', title: 'Medição de experiência ativa', detail: 'GA4 e Clarity carregam somente após consentimento.' },
      { signal: 'healthy', title: '32 URLs enviadas', detail: 'Sitemap processado pelo Google Search Console.' },
    ],
    actions: [
      { priority: 'critical', title: 'Instrumentar eventos do funil', reason: 'Torna a North Star e as taxas de conversão mensuráveis.', owner: 'Produto + Engenharia' },
      { priority: 'attention', title: 'Conectar APIs de aquisição e Google', reason: 'Centraliza GA4 e Search Console na visão executiva.', owner: 'Dados' },
      { priority: 'opportunity', title: 'Ativar retorno de receita do parceiro', reason: 'Fecha o ciclo entre clique, conversão e receita.', owner: 'Growth' },
    ],
    roadmap: {
      current: 'Sprint 6.1 · CEO Cockpit',
      next: 'Sprint 6.2 · Dados ao vivo',
      progress: 100,
      milestone: 'Fundação operacional entregue',
    },
    health: [
      { label: 'SEO', signal: 'healthy', detail: 'Base indexável' },
      { label: 'GEO', signal: 'healthy', detail: 'ORÁCULO estruturado' },
      { label: 'Analytics', signal: 'attention', detail: 'Integrações parciais' },
      { label: 'Monetização', signal: 'critical', detail: 'Receita não conciliada' },
      { label: 'Infraestrutura', signal: 'healthy', detail: 'Produção estável' },
      { label: 'Conteúdo', signal: 'attention', detail: 'Expansão controlada' },
    ],
  }
}
