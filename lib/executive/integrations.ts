import 'server-only'
import type { DataHealthItem, ExecutiveSnapshotRaw, GitHubHealth } from './types'
import type { ActionpayIntegrationSnapshot, MetaExecutiveSnapshot } from '@/lib/meta/types'

function ga4Health(snapshot: ExecutiveSnapshotRaw): DataHealthItem {
  if (snapshot.ga4.confirmations > 0) {
    return {
      source: 'Google Analytics',
      status: 'working',
      detail: snapshot.ga4.confirmations + ' confirmação(ões) recente(s).',
    }
  }
  if (snapshot.ga4.technical_sent > 0 || snapshot.ga4.failed > 0) {
    return {
      source: 'Google Analytics',
      status: 'incomplete',
      detail: snapshot.ga4.technical_sent + ' envio(s) técnico(s), sem confirmação visual recente.',
    }
  }
  return {
    source: 'Google Analytics',
    status: 'no_data',
    detail: 'Integração configurada, sem eventos válidos no período.',
  }
}

export function getVercelHealth(): DataHealthItem {
  const environment = process.env.VERCEL_ENV
  if (!environment) {
    return {
      source: 'Vercel',
      status: 'not_connected',
      detail: 'Metadados do deploy não disponíveis neste ambiente.',
    }
  }
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  return {
    source: 'Vercel',
    status: 'working',
    detail: 'Ambiente ' + environment + (sha ? ' · commit ' + sha : '') + '.',
  }
}

export function buildIntegrationHealth(
  snapshot: ExecutiveSnapshotRaw,
  github: GitHubHealth,
  meta: MetaExecutiveSnapshot,
  actionpay: ActionpayIntegrationSnapshot,
  metaConfig: { configured: boolean; missing: string[]; webhookConfigured: boolean },
): DataHealthItem[] {
  const metaHealth: DataHealthItem = !metaConfig.configured
    ? {
        source: 'Meta Ads',
        status: 'not_connected',
        detail: 'Credenciais pendentes: ' + metaConfig.missing.join(', ') + '.',
      }
    : meta.connection.status === 'active' && meta.last_sync.status === 'succeeded'
      ? {
          source: 'Meta Ads',
          status: metaConfig.webhookConfigured ? 'working' : 'incomplete',
          detail: metaConfig.webhookConfigured
            ? 'Insights e Lead Ads conectados com sincronização auditável.'
            : 'Insights conectados; webhook de Lead Ads ainda incompleto.',
        }
      : {
          source: 'Meta Ads',
          status: 'incomplete',
          detail: 'Configuração presente, sem sincronização confirmada recentemente.',
        }

  const sourceValidated = actionpay.source.validation_status === 'validated'
  const actionpayHealth: DataHealthItem = {
    source: 'Pagamento · Actionpay',
    status: sourceValidated
      ? snapshot.metrics.current.purchases > 0 ? 'working' : 'no_data'
      : 'incomplete',
    detail: sourceValidated
      ? 'Fonte 359422 validada; postback e conciliação financeira preparados.'
      : 'Postback preparado; domínio da fonte 359422 ainda exige confirmação no painel Actionpay.',
  }
  return [
    { source: 'Supabase', status: 'working', detail: 'Fonte oficial dos indicadores internos.' },
    ga4Health(snapshot),
    { source: 'Search Console', status: 'not_connected', detail: 'Adaptador preparado; credencial de consulta ainda não conectada.' },
    { source: 'GitHub', status: github.status, detail: github.detail },
    getVercelHealth(),
    metaHealth,
    { source: 'Google Ads', status: 'not_connected', detail: 'Nenhuma integração configurada.' },
    actionpayHealth,

  ]
}
