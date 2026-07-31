import type { CockpitData, Metric, Signal } from '@/lib/ceo/types'
import { logout } from '@/app/admin/login/actions'
import styles from '@/app/admin/cockpit.module.css'

const signalLabels: Record<Signal, string> = {
  healthy: 'Saudável',
  attention: 'Atenção',
  critical: 'Crítico',
  neutral: 'Aguardando',
}

const financeStatusLabels = {
  pending: 'Em processamento',
  approved: 'Aprovada',
  paid: 'Paga',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
}

function StatusDot({ signal = 'neutral' }: { signal?: Signal }) {
  return <span className={`${styles.statusDot} ${styles[signal]}`} aria-label={signalLabels[signal]} />
}

function Icon({ name }: { name: 'pulse' | 'users' | 'search' | 'content' | 'funnel' | 'partner' | 'revenue' | 'alert' | 'roadmap' | 'health' }) {
  const paths = {
    pulse: <path d="M3 12h4l2.2-5 4.2 10 2.4-5H21" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    content: <><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    funnel: <path d="M3 4h18l-7 8v6l-4 2v-8z" />,
    partner: <><path d="M8 11h8M12 7v8" /><circle cx="12" cy="12" r="9" /></>,
    revenue: <><path d="M12 2v20M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    alert: <><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
    roadmap: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h3a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3" /></>,
    health: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" />,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function SectionHeading({ icon, title, eyebrow, aside }: { icon: Parameters<typeof Icon>[0]['name']; title: string; eyebrow?: string; aside?: React.ReactNode }) {
  return (
    <header className={styles.sectionHeading}>
      <div className={styles.sectionTitle}><span><Icon name={icon} /></span><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2></div></div>
      {aside}
    </header>
  )
}

function Metrics({ items, compact = false }: { items: Metric[]; compact?: boolean }) {
  return <div className={compact ? styles.compactMetrics : styles.metrics}>{items.map((metric) => (
    <div className={styles.metric} key={metric.label}>
      <div className={styles.metricLabel}>{metric.signal && <StatusDot signal={metric.signal} />}{metric.label}</div>
      <strong>{metric.value}</strong>
      {metric.detail && <span>{metric.detail}</span>}
    </div>
  ))}</div>
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`${styles.card} ${className}`}>{children}</section>
}

function percentageWidth(value: string) {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0
}

export default function Cockpit({ data }: { data: CockpitData }) {
  const updated = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(data.generatedAt))
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(data.generatedAt))

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>zafi</span><i>CEO</i></div>
        <div className={styles.topbarCenter}>
          <span className={styles.environment}><StatusDot signal="healthy" /> Produção</span>
          <span className={styles.sprint}>OE-005</span>
          <span className={styles.system}>Sistema operacional</span>
        </div>
        <div className={styles.topbarRight}>
          <div><strong>{today}</strong><span>Atualizado {updated}</span></div>
          <a className={styles.logout} href="/admin/council">Conselho</a>
          <a className={styles.logout} href="/admin/content-studio">Content Studio</a>
          <a className={styles.logout} href="/admin/telemetry">Validar dados</a>
          <form action={logout}><button className={styles.logout} type="submit" aria-label="Sair do Cockpit">Sair</button></form>
        </div>
      </header>

      <div className={styles.commandStrip}>
        <span className={styles.livePulse}><i /> Visão executiva</span>
        <p>Como está a empresa agora?</p>
        <span className={styles.dataMode}>{data.mode === 'live' ? 'Banco Zafi · atualização a cada 10s' : 'Dados indisponíveis'}</span>
      </div>

      <div className={styles.dashboard}>
        <Card className={styles.northStar}>
          <div className={styles.northTop}>
            <div><p className={styles.eyebrow}>North Star · hoje</p><h1>Análises concluídas</h1></div>
            <span className={styles.northIcon}><Icon name="pulse" /></span>
          </div>
          <div className={styles.northBody}>
            <strong className={styles.heroMetric}>{data.northStar.completed}</strong>
            <div className={styles.goalGrid}>
              <div><span>Meta do dia</span><strong>{data.northStar.dayGoal}</strong></div>
              <div><span>Meta do mês</span><strong>{data.northStar.monthGoal}</strong></div>
              <div><span>Variação</span><strong>{data.northStar.change}</strong></div>
            </div>
          </div>
          <div className={styles.progressTrack}><i style={{ width: `${data.northStar.progress}%` }} /></div>
          <p className={styles.dataHonesty}>Sem números estimados. Cada métrica de funil possui rastreabilidade até o evento de origem.</p>
        </Card>

        <Card className={styles.acquisition}>
          <SectionHeading icon="users" eyebrow="Aquisição" title="Quem está chegando" aside={<span className={styles.integrationBadge}><StatusDot signal="healthy" /> Banco Zafi ao vivo</span>} />
          <Metrics items={data.acquisition} />
          <div className={styles.sourceRow}>{data.trafficSources.map((source) => <div key={source.label}><span>{source.label}</span><strong>{source.value}</strong></div>)}</div>
        </Card>

        <Card className={styles.google}>
          <SectionHeading icon="search" eyebrow="Google" title="Presença e mensuração" aside={<span className={styles.integrationBadge} title={data.googleIntegration.detail}><StatusDot signal={data.googleIntegration.signal} /> GA4 {data.googleIntegration.label}</span>} />
          <Metrics items={data.google} compact />
          <div className={styles.queryList}>{data.queries.map((query) => <div key={query.label}><span className={query.direction === 'up' ? styles.arrowUp : styles.arrowDown}>{query.direction === 'up' ? '↗' : '↘'}</span><div><strong>{query.label}</strong><small>{query.detail}</small></div></div>)}</div>
        </Card>

        <Card className={styles.content}>
          <SectionHeading icon="content" eyebrow="Conteúdo" title="Ativos que trabalham pela Zafi" />
          <Metrics items={data.content.topPages} compact />
          <div className={styles.published}><span>Últimas publicadas</span>{data.content.published.map((page, index) => <div key={page}><i>{String(index + 1).padStart(2, '0')}</i><strong>{page}</strong><em>Publicada</em></div>)}</div>
        </Card>

        <Card className={styles.funnel}>
          <SectionHeading icon="funnel" eyebrow="Funil" title="Da atenção à receita" aside={<span className={styles.integrationBadge}><StatusDot signal="healthy" /> Eventos ao vivo</span>} />
          <div className={styles.funnelFlow}>{data.funnel.map((step, index) => <div className={styles.funnelStep} key={step.label}><div><span>{step.label}</span><strong>{step.value}</strong>{step.conversion && <small>{step.conversion}</small>}</div>{index < data.funnel.length - 1 && <b>→</b>}</div>)}</div>
        </Card>

        <Card className={styles.partners}>
          <SectionHeading icon="partner" eyebrow="Parceiros" title="Performance comercial" />
          <Metrics items={data.partners} compact />
        </Card>

        <Card className={styles.revenue}>
          <SectionHeading icon="revenue" eyebrow="Receita" title="Pulso financeiro" aside={<span className={styles.integrationBadge}><StatusDot signal="healthy" /> Banco financeiro</span>} />
          <Metrics items={data.revenue} compact />
        </Card>

        <Card className={styles.intelligence}>
          <SectionHeading icon="pulse" eyebrow="OE-014 · Inteligência de eventos" title="Quando, de onde e por que cada resultado aconteceu" aside={<span className={styles.integrationBadge}><StatusDot signal={data.eventIntelligence.available ? "healthy" : "attention"} /> {data.eventIntelligence.available ? data.eventIntelligence.timezone : "Migração pendente"}</span>} />
          <form className={styles.intelligenceFilters} method="get">
            <label>De<input type="date" name="from" defaultValue={data.eventIntelligence.filters.from} /></label>
            <label>Até<input type="date" name="to" defaultValue={data.eventIntelligence.filters.to} /></label>
            <label>Canal<input name="channel" defaultValue={data.eventIntelligence.filters.channel} placeholder="Todos" /></label>
            <label>Campanha<input name="campaign" defaultValue={data.eventIntelligence.filters.campaign} placeholder="Todas" /></label>
            <label>Origem<input name="source" defaultValue={data.eventIntelligence.filters.source} placeholder="Todas" /></label>
            <label>Evento<select name="event_type" defaultValue={data.eventIntelligence.filters.eventType}><option value="">Todos</option><option value="page_view">Visita</option><option value="analysis_started">Análise iniciada</option><option value="analysis_completed">Análise concluída</option><option value="partner_clicked">Clique parceiro</option><option value="affiliate_click">Clique afiliado</option></select></label>
            <button type="submit">Aplicar filtros</button>
          </form>
          <Metrics items={data.eventIntelligence.comparison} compact />
          <div className={styles.timePanels}>
            <div><h3>Visitas por dia da semana</h3><div className={styles.timeList}>{data.eventIntelligence.weekdays.length ? data.eventIntelligence.weekdays.map((item) => <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>) : <p>Sem visitas no período.</p>}</div></div>
            <div><h3>Visitas por horário</h3><div className={styles.timeList}>{data.eventIntelligence.hours.length ? data.eventIntelligence.hours.map((item) => <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>) : <p>Sem visitas no período.</p>}</div></div>
          </div>
          <div className={styles.intelligenceTables}>
            <div><h3>Origem das visitas</h3>{data.eventIntelligence.origins.length ? data.eventIntelligence.origins.map((item) => <div className={styles.intelligenceRow} key={item.origin}><strong>{item.origin}</strong><span>{item.visitors} visitantes</span><span>{item.sessions} sessões</span><span>{item.completions} conclusões</span></div>) : <p>Sem origem registrada no período.</p>}</div>
            <div><h3>Campanhas e canais</h3>{data.eventIntelligence.campaigns.length ? data.eventIntelligence.campaigns.map((item) => <div className={styles.intelligenceRow} key={`${item.campaign}:${item.channel}`}><strong>{item.campaign}</strong><span>{item.channel}</span><span>{item.visitors} visitantes</span><span>{item.analyses} conclusões/inícios</span><span>{item.clicks} cliques</span></div>) : <p>Sem campanha registrada no período.</p>}</div>
          </div>
          <div className={styles.eventAudit}><h3>Eventos auditáveis</h3>{data.eventIntelligence.recentEvents.length ? data.eventIntelligence.recentEvents.slice(0, 20).map((event) => <div className={styles.eventAuditRow} key={event.id}><span><strong>{event.event}</strong><small>{event.date} · {event.time} · {event.weekday}</small></span><span><strong>{event.origin}</strong><small>{event.channel} · {event.campaign}</small></span><span><strong>{event.device}</strong><small>Sessão {event.session.slice(0, 8)}</small></span><span><strong>{event.conversion}</strong></span></div>) : <div className={styles.ledgerEmpty}><strong>Nenhum evento no período</strong><span>Os filtros não retornaram atividade pública.</span></div>}</div>
        </Card>
        <Card className={styles.operations}>
          <SectionHeading icon="pulse" eyebrow="OE-005 · Integridade operacional" title="Saúde da cadeia" aside={<span className={styles.integrationBadge}><StatusDot signal={data.operations.status} /> {data.operations.statusLabel}</span>} />
          <div className={styles.operationsHero}>
            <div><span>Índice de saúde</span><strong>{data.operations.score}</strong><small>{data.operations.window}</small><small><StatusDot signal={data.operations.schedulerSignal} /> {data.operations.schedulerLabel}</small></div>
            <p>O monitor aponta onde a operação perdeu continuidade e mantém a evidência financeira separada da decisão do motor.</p>
          </div>
          <div className={styles.chainRail}>
            {data.operations.chain.map((stage, index) => <div className={styles.chainSegment} key={stage.key}>
              <div className={styles.chainNode}>
                <span><StatusDot signal={stage.status} />{stage.label}</span>
                <strong>{stage.count}</strong>
                <small>{stage.coverage}</small>
                <p>{stage.detail}</p>
              </div>
              {index < data.operations.chain.length - 1 && <b aria-hidden="true">→</b>}
            </div>)}
          </div>
          <div className={styles.operationsDetail}>
            <div className={styles.qualityPanel}>
              <h3>Indicadores de qualidade</h3>
              <div>{data.operations.quality.map((metric) => <div className={styles.qualityRow} key={metric.key}>
                <span><StatusDot signal={metric.signal} /><strong>{metric.label}</strong><small>{metric.numerator} / {metric.denominator}</small></span>
                <div><i style={{ width: `${percentageWidth(metric.value)}%` }} /></div><b>{metric.value}</b>
              </div>)}</div>
            </div>
            <div className={styles.diagnosticPanel}>
              <h3>Diagnóstico de falhas</h3>
              {data.operations.diagnostics.length ? <div>{data.operations.diagnostics.slice(0, 6).map((diagnostic) => <div className={styles.diagnosticRow} key={diagnostic.code}>
                <StatusDot signal={diagnostic.severity} /><span><strong>{diagnostic.title}</strong><small>{diagnostic.detail}</small></span><b>{diagnostic.count}</b>
              </div>)}</div> : <div className={styles.operationalEmpty}><StatusDot signal={data.operations.hasActivity ? 'healthy' : 'neutral'} /><strong>{data.operations.hasActivity ? 'Nenhuma ruptura detectada' : 'Aguardando atividade real'}</strong><span>{data.operations.hasActivity ? 'A cadeia não possui divergências na janela monitorada.' : 'O monitor está ativo e não classifica ausência de dados como sucesso.'}</span></div>}
            </div>
          </div>
          <div className={styles.reconciliationStrip}>
            <h3>Conciliação financeira</h3>
            <Metrics items={data.operations.reconciliation} compact />
          </div>
        </Card>

        <Card className={styles.attribution}>
          <SectionHeading icon="funnel" eyebrow="OE-004 · Atribuição" title="Da decisão ao resultado financeiro" aside={<span className={styles.integrationBadge}><StatusDot signal="healthy" /> Snapshots preservados</span>} />
          <Metrics items={data.attribution.summary} compact />
          <div className={styles.financeStages}>
            {data.attribution.finance.map((stage, index) => <div key={stage.label}>
              <i>0{index + 1}</i><span><small>{stage.label}</small><strong>{stage.value}</strong><em>{stage.detail}</em></span>
              {index < data.attribution.finance.length - 1 && <b>→</b>}
            </div>)}
          </div>
          {data.attribution.topDecisions.length ? (
            <div className={styles.attributionTable}>
              <div className={styles.attributionHead}><span>Decisão</span><span>Impressões</span><span>Cliques</span><span>Conversões</span><span>Aprovada</span><span>Paga</span></div>
              {data.attribution.topDecisions.map((decision) => <div className={styles.attributionRow} key={decision.id}>
                <span><strong>{decision.product}</strong><small>{decision.partner}</small></span>
                <span>{decision.impressions}</span><span>{decision.clicks}</span><span>{decision.conversions}</span>
                <span>{decision.approvedRevenue}</span><span>{decision.paidRevenue}</span>
              </div>)}
            </div>
          ) : <div className={styles.ledgerEmpty}><strong>Nenhuma atribuição real ainda</strong><span>A primeira análise após a OE-004 iniciará o histórico por decisão automaticamente.</span></div>}
        </Card>

        <Card className={styles.ledger}>
          <SectionHeading icon="revenue" eyebrow="Auditoria financeira" title="Histórico de conversões" aside={<span className={styles.integrationBadge}><StatusDot signal="healthy" /> Idempotente</span>} />
          {data.financeHistory.length ? (
            <div className={styles.ledgerTable}>
              <div className={styles.ledgerHead}><span>Transação</span><span>Parceiro</span><span>Status</span><span>Comissão</span><span>Recebida</span></div>
              {data.financeHistory.map((entry) => {
                const received = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(entry.receivedAt))
                return <div className={styles.ledgerRow} key={entry.id}>
                  <span><strong>{entry.transactionId}</strong><small>Campanha {entry.campaignId}</small></span>
                  <span>{entry.partner}</span>
                  <span><i className={styles[entry.status]} />{financeStatusLabels[entry.status]}</span>
                  <span>{entry.amount}</span>
                  <span>{received}</span>
                </div>
              })}
            </div>
          ) : <div className={styles.ledgerEmpty}><strong>Nenhum postback recebido</strong><span>A primeira conversão da Actionpay aparecerá aqui automaticamente, sem novo deploy.</span></div>}
        </Card>

        <Card className={styles.alerts}>
          <SectionHeading icon="alert" eyebrow="Radar" title="Alertas operacionais" />
          <div className={styles.alertList}>{data.alerts.map((alert) => <div key={alert.title} className={styles.alertItem}><StatusDot signal={alert.signal} /><div><strong>{alert.title}</strong><span>{alert.detail}</span></div></div>)}</div>
        </Card>

        <Card className={styles.actions}>
          <SectionHeading icon="pulse" eyebrow="Foco" title="As 3 ações do CEO" aside={<span className={styles.onlyThree}>Só o que move a empresa</span>} />
          <div className={styles.actionList}>{data.actions.map((action, index) => <div className={styles.actionItem} key={action.title}><span className={`${styles.priorityBar} ${styles[action.priority]}`} /><i>0{index + 1}</i><div><strong>{action.title}</strong><p>{action.reason}</p><small>{action.owner}</small></div><b>→</b></div>)}</div>
        </Card>

        <Card className={styles.roadmap}>
          <SectionHeading icon="roadmap" eyebrow="Roadmap" title="Onde estamos" />
          <div className={styles.roadmapCurrent}><span>Agora</span><strong>{data.roadmap.current}</strong><p>{data.roadmap.milestone}</p></div>
          <div className={styles.roadmapProgress}><div><span>Progresso</span><strong>{data.roadmap.progress}%</strong></div><div className={styles.progressTrack}><i style={{ width: `${data.roadmap.progress}%` }} /></div></div>
          <div className={styles.roadmapNext}><span>Próxima</span><strong>{data.roadmap.next}</strong></div>
        </Card>

        <Card className={styles.health}>
          <SectionHeading icon="health" eyebrow="Saúde da empresa" title="Fundamentos" />
          <div className={styles.healthGrid}>{data.health.map((item) => <div key={item.label}><StatusDot signal={item.signal} /><span><strong>{item.label}</strong><small>{item.detail}</small></span></div>)}</div>
        </Card>
      </div>
      <footer className={styles.footer}><span>zafi / CEO OS</span><p>Uma leitura. Três decisões. Um próximo movimento.</p><span>Produção · São Paulo</span></footer>
    </main>
  )
}
