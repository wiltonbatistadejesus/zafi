import Image from 'next/image'
import Link from 'next/link'
import { logout } from '@/app/admin/login/actions'
import type { ExecutiveSnapshot, IntegrationStatus } from '@/lib/executive/types'
import styles from '@/app/executive/executive.module.css'

const integer = new Intl.NumberFormat('pt-BR')
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
const timestamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

const featureLabels: Record<string, string> = {
  page_view: 'Visita de página',
  diagnosis_started: 'Diagnóstico iniciado',
  diagnosis_completed: 'Diagnóstico concluído',
  signup_completed: 'Cadastro concluído',
  offer_viewed: 'Oferta visualizada',
  checkout_started: 'Checkout iniciado',
  purchase_completed: 'Compra concluída',
}

const sourceLabels: Record<string, string> = {
  organic: 'Orgânico',
  direct: 'Direto',
  social: 'Social',
  referral: 'Referral',
  meta: 'Meta',
  google: 'Google',
  origem_desconhecida: 'Origem desconhecida',
}

function valueNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function variation(current: number, previous: number, points = false) {
  if (points) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return { text: 'Dados insuficientes', tone: 'neutral' as const }
    const delta = current - previous
    return {
      text: (delta > 0 ? '+' : '') + delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' p.p.',
      tone: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'neutral' as const,
    }
  }
  if (previous === 0) {
    return current === 0 ? { text: 'Sem variação', tone: 'neutral' as const } : { text: 'Nova base', tone: 'up' as const }
  }
  const delta = ((current - previous) / previous) * 100
  return {
    text: (delta > 0 ? '+' : '') + delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%',
    tone: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'neutral' as const,
  }
}

function Metric({
  label,
  current,
  previous,
  format = 'number',
  unavailable = false,
}: {
  label: string
  current: number | string | null
  previous?: number | string | null
  format?: 'number' | 'money' | 'percent'
  unavailable?: boolean
}) {
  if (unavailable) {
    return <div className={styles.metric}><span>{label}</span><strong className={styles.unavailable}>Não conectado</strong><small>Fonte aguardando integração</small></div>
  }

  const currentNumber = valueNumber(current)
  const previousNumber = valueNumber(previous)
  const rendered = current === null
    ? 'Dados insuficientes'
    : format === 'money'
      ? money.format(currentNumber)
      : format === 'percent'
        ? currentNumber.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
        : integer.format(currentNumber)
  const change = previous === undefined || previous === null || current === null
    ? null
    : variation(currentNumber, previousNumber, format === 'percent')

  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{rendered}</strong>
      {change && <small className={styles[change.tone]}>{change.tone === 'up' ? '↑ ' : change.tone === 'down' ? '↓ ' : ''}{change.text}</small>}
    </div>
  )
}

function Section({
  eyebrow,
  title,
  children,
  className = '',
  aside,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
  className?: string
  aside?: React.ReactNode
}) {
  return (
    <section className={styles.section + ' ' + className}>
      <header className={styles.sectionHeader}>
        <div><p>{eyebrow}</p><h2>{title}</h2></div>
        {aside}
      </header>
      {children}
    </section>
  )
}

function statusLabel(status: IntegrationStatus) {
  if (status === 'working') return 'Integrado'
  if (status === 'incomplete') return 'Atenção'
  if (status === 'no_data') return 'Sem dados'
  return 'Não conectado'
}

function Trend({ data }: { data: ExecutiveSnapshot['trend'] }) {
  const width = 820
  const height = 180
  const padding = 18
  const max = Math.max(1, ...data.flatMap((item) => [item.visitors, item.diagnoses]))
  const path = (key: 'visitors' | 'diagnoses') => data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, data.length - 1)
    const y = height - padding - (item[key] / max) * (height - padding * 2)
    return (index === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }).join(' ')

  return (
    <div className={styles.trendWrap}>
      <div className={styles.trendLegend}><span><i className={styles.visitorLine} />Visitantes</span><span><i className={styles.diagnosisLine} />Diagnósticos</span></div>
      <svg viewBox={'0 0 ' + width + ' ' + height} role="img" aria-label="Evolução diária de visitantes e diagnósticos">
        <defs>
          <linearGradient id="executive-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1565ff" stopOpacity=".28" />
            <stop offset="100%" stopColor="#1565ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path('visitors') + ' L ' + (width - padding) + ' ' + (height - padding) + ' L ' + padding + ' ' + (height - padding) + ' Z'} fill="url(#executive-area)" />
        <path d={path('visitors')} fill="none" stroke="#4f83ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path('diagnoses')} fill="none" stroke="#72e8ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className={styles.trendDates}>{data.filter((_, index) => index === 0 || index === data.length - 1 || index === Math.floor(data.length / 2)).map((item) => <span key={item.day}>{date.format(new Date(item.day + 'T12:00:00-03:00'))}</span>)}</div>
    </div>
  )
}

export default function ExecutiveOS({ data, preset }: { data: ExecutiveSnapshot; preset: string }) {
  const current = data.metrics.current
  const previous = data.metrics.previous
  const finance = data.finance.current
  const previousFinance = data.finance.previous
  const github = data.engineering.github
  const scorecard = [
    { label: 'Visitantes', current: current.visitors, previous: previous.visitors, format: 'number' as const },
    { label: 'Diagnósticos', current: current.diagnosis_completed, previous: previous.diagnosis_completed, format: 'number' as const },
    { label: 'Conversão', current: current.visitor_diagnosis_rate, previous: previous.visitor_diagnosis_rate, format: 'percent' as const },
    { label: 'Clientes pagos', current: finance.paid_customers, previous: previousFinance.paid_customers, format: 'number' as const },
    { label: 'Receita', current: finance.revenue_approved, previous: previousFinance.revenue_approved, format: 'money' as const },
  ]

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/admin" className={styles.brand} aria-label="Voltar ao Cockpit Zafi">
          <span className={styles.logoTile}><Image src="/brand/zafi-logo.svg" alt="Zafi" width={78} height={28} priority /></span>
          <span><b>Executive OS</b><small>Reunião semanal</small></span>
        </Link>
        <nav aria-label="Navegação administrativa">
          <Link href="/admin">Cockpit</Link>
          <Link href="/admin/council">Conselho</Link>
          <Link href="/admin/content-studio">Content Studio</Link>
          <Link href="/admin/api/executive?period=7d">JSON</Link>
          <form action={logout}><button type="submit">Sair</button></form>
        </nav>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p>ZAFI — EXECUTIVE SCORECARD</p>
          <h1>Uma semana inteira.<br />Uma leitura decisiva.</h1>
          <span>Atualizado em {timestamp.format(new Date(data.generated_at))}. Dados internos vêm do banco oficial da Zafi.</span>
        </div>
        <form className={styles.periodForm} method="get">
          <label>Período
            <select name="period" defaultValue={preset}>
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label>De<input type="date" name="from" /></label>
          <label>Até<input type="date" name="to" /></label>
          <button type="submit">Atualizar</button>
        </form>
      </div>

      <section className={styles.scorecard} aria-label="Indicadores principais">
        {scorecard.map((item) => <Metric key={item.label} {...item} />)}
        <Metric label="MRR" current={null} unavailable />
        <div className={styles.sprintCard}>
          <span>Sprint</span>
          <strong><i className={styles[data.engineering.overall]} />{data.engineering.sprint.code}</strong>
          <small>{data.engineering.sprint.completion}% concluída</small>
        </div>
      </section>

      <section className={styles.pulse}>
        <header><div><p>Linha de pulso</p><h2>Evolução dos últimos 14 dias</h2></div><span>Atual × anterior</span></header>
        <Trend data={data.trend} />
      </section>

      <div className={styles.grid}>
        <Section eyebrow="01 · Growth" title="Crescimento" className={styles.wide}>
          <div className={styles.metricGrid}>
            <Metric label="Visitantes únicos" current={current.visitors} previous={previous.visitors} />
            <Metric label="Sessões" current={current.sessions} previous={previous.sessions} />
            <Metric label="Novos usuários" current={current.new_users} previous={previous.new_users} />
            <Metric label="Leads" current={current.signups} previous={previous.signups} />
            <Metric label="Visitante → cadastro" current={current.visitor_signup_rate} previous={previous.visitor_signup_rate} format="percent" />
            <Metric label="Visitante → diagnóstico" current={current.visitor_diagnosis_rate} previous={previous.visitor_diagnosis_rate} format="percent" />
            <Metric label="Receita" current={finance.revenue_approved} previous={previousFinance.revenue_approved} format="money" />
            <Metric label="MRR" current={null} unavailable />
            <Metric label="CAC" current={null} unavailable />
          </div>
        </Section>

        <Section eyebrow="02 · Produto" title="Uso real">
          <div className={styles.metricGrid}>
            <Metric label="Usuários ativos" current={current.active_users} previous={previous.active_users} />
            <Metric label="Diagnósticos iniciados" current={current.diagnosis_started} previous={previous.diagnosis_started} />
            <Metric label="Diagnósticos concluídos" current={current.diagnosis_completed} previous={previous.diagnosis_completed} />
            <Metric label="Taxa de conclusão" current={current.completion_rate} previous={previous.completion_rate} format="percent" />
            <Metric label="Conteúdos gerados" current={data.product.content_generated} />
            <Metric label="Erros encontrados" current={(data.monitor.diagnostics ?? []).reduce((sum, item) => sum + Number(item.count), 0)} />
          </div>
          <div className={styles.rankList}><h3>Funcionalidades mais utilizadas</h3>{data.product.top_features.length ? data.product.top_features.map((item, index) => <div key={item.feature}><i>{String(index + 1).padStart(2, '0')}</i><span>{featureLabels[item.feature] ?? item.feature}</span><strong>{integer.format(item.uses)}</strong></div>) : <p>Dados insuficientes no período.</p>}</div>
        </Section>

        <Section eyebrow="03 · Marketing" title="Origem e campanhas">
          <div className={styles.sourceGrid}>{['organic','direct','meta','google','social','referral'].map((source) => {
            const item = data.marketing.origins.find((origin) => origin.source === source)
            return <div key={source}><span>{sourceLabels[source]}</span><strong>{integer.format(item?.visitors ?? 0)}</strong><small>{integer.format(item?.leads ?? 0)} lead(s)</small></div>
          })}</div>
          <div className={styles.rankList}><h3>Campanhas ativas no período</h3>{data.marketing.campaigns.length ? data.marketing.campaigns.slice(0, 6).map((item, index) => <div key={item.campaign + item.medium}><i>{String(index + 1).padStart(2, '0')}</i><span>{item.campaign}<small>{item.medium}</small></span><strong>{integer.format(item.visitors)}</strong></div>) : <p>Nenhuma campanha atribuída no período.</p>}</div>
          <div className={styles.inlineNotice}>Custo por lead: <strong>Não conectado</strong></div>
        </Section>

        <Section eyebrow="04 · Engenharia" title="Entrega e bloqueios">
          <div className={styles.sprintSummary}>
            <div><span>Sprint atual</span><strong>{data.engineering.sprint.code}</strong><small>{data.engineering.sprint.title}</small></div>
            <b className={styles[data.engineering.overall]}>{data.engineering.overall === 'healthy' ? 'Dentro do planejado' : data.engineering.overall === 'attention' ? 'Atenção' : 'Atrasado / bloqueado'}</b>
          </div>
          <div className={styles.metricGrid}>
            <Metric label="Issues abertas" current={github.issuesOpen} unavailable={github.status === 'not_connected'} />
            <Metric label="Issues concluídas" current={github.issuesClosed} unavailable={github.status === 'not_connected'} />
            <Metric label="PRs abertas" current={github.prsOpen} unavailable={github.status === 'not_connected'} />
            <Metric label="PRs mergeadas" current={github.prsMerged} unavailable={github.status === 'not_connected'} />
            <Metric label="Bugs críticos" current={data.engineering.criticalBugs} />
            <Metric label="Bloqueios" current={data.engineering.blockers} />
          </div>
          <div className={styles.progress}><span style={{ width: data.engineering.sprint.completion + '%' }} /></div>
        </Section>

        <Section eyebrow="05 · Receita" title="Pulso financeiro" className={styles.wide}>
          <div className={styles.metricGrid}>
            <Metric label="Receita do período" current={finance.revenue_approved} previous={previousFinance.revenue_approved} format="money" />
            <Metric label="Receita do mês" current={data.finance.month} format="money" />
            <Metric label="MRR" current={null} unavailable />
            <Metric label="Novos clientes pagos" current={finance.paid_customers} previous={previousFinance.paid_customers} />
            <Metric label="Cancelamentos" current={finance.cancellations} previous={previousFinance.cancellations} />
            <Metric label="Ticket médio" current={finance.average_ticket} format="money" />
            <Metric label="Receita acumulada" current={data.finance.accumulated} format="money" />
            <Metric label="Receita criada" current={finance.revenue_created} format="money" />
            <Metric label="Receita paga" current={finance.revenue_paid} format="money" />
          </div>
        </Section>

        <Section eyebrow="Funil principal" title="Da visita à compra" className={styles.full}>
          <div className={styles.funnel}>{[
            ['Visitante', current.visitors],
            ['Início do diagnóstico', current.diagnosis_started],
            ['Diagnóstico concluído', current.diagnosis_completed],
            ['Lead / cadastro', current.signups],
            ['Oferta visualizada', current.offers_viewed],
            ['Checkout iniciado', null],
            ['Compra concluída', current.purchases],
          ].map(([label, value], index) => <div key={String(label)}><i>{String(index + 1).padStart(2, '0')}</i><span>{label}</span><strong>{value === null ? 'Não conectado' : integer.format(Number(value))}</strong></div>)}</div>
        </Section>

        <Section eyebrow="Radar executivo" title="Alertas automáticos">
          <div className={styles.alerts}>{data.alerts.length ? data.alerts.map((alert) => <article key={alert.code}><i className={styles[alert.signal]} /><div><strong>{alert.title}</strong><p>{alert.detail}</p></div></article>) : <div className={styles.empty}><strong>Nenhum alerta disparado</strong><span>As regras configuráveis não encontraram desvio relevante.</span></div>}</div>
        </Section>

        <Section eyebrow="Data Health" title="Confiança das fontes">
          <div className={styles.healthList}>{data.dataHealth.map((item) => <div key={item.source}><i className={styles[item.status]} /><span><strong>{item.source}</strong><small>{item.detail}</small></span><b>{statusLabel(item.status)}</b></div>)}</div>
        </Section>
      </div>

      <footer><span>Zafi Executive OS</span><p>Sem estimativas. Sem fontes ocultas. Sem números fictícios.</p><span>Produção · São Paulo</span></footer>
    </main>
  )
}
