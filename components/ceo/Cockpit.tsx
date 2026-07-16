import type { CockpitData, Metric, Signal } from '@/lib/ceo/types'
import { logout } from '@/app/admin/login/actions'
import styles from '@/app/admin/cockpit.module.css'

const signalLabels: Record<Signal, string> = {
  healthy: 'Saudável',
  attention: 'Atenção',
  critical: 'Crítico',
  neutral: 'Aguardando',
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

export default function Cockpit({ data }: { data: CockpitData }) {
  const updated = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(data.generatedAt))
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(data.generatedAt))

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>zafi</span><i>CEO</i></div>
        <div className={styles.topbarCenter}>
          <span className={styles.environment}><StatusDot signal="healthy" /> Produção</span>
          <span className={styles.sprint}>Sprint 6.1</span>
          <span className={styles.system}>Sistema operacional</span>
        </div>
        <div className={styles.topbarRight}>
          <div><strong>{today}</strong><span>Atualizado {updated}</span></div>
          <form action={logout}><button className={styles.logout} type="submit" aria-label="Sair do Cockpit">Sair</button></form>
        </div>
      </header>

      <div className={styles.commandStrip}>
        <span className={styles.livePulse}><i /> Visão executiva</span>
        <p>Como está a empresa agora?</p>
        <span className={styles.dataMode}>{data.mode === 'live' ? 'Dados ao vivo' : 'Estrutura pronta · integrações em andamento'}</span>
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
          <p className={styles.dataHonesty}>Sem números estimados. O Cockpit mostrará dados somente quando forem verificáveis.</p>
        </Card>

        <Card className={styles.acquisition}>
          <SectionHeading icon="users" eyebrow="Aquisição" title="Quem está chegando" aside={<span className={styles.integrationBadge}><StatusDot signal="healthy" /> GA4 ativo</span>} />
          <Metrics items={data.acquisition} />
          <div className={styles.sourceRow}>{data.trafficSources.map((source) => <div key={source.label}><span>{source.label}</span><strong>{source.value}</strong></div>)}</div>
        </Card>

        <Card className={styles.google}>
          <SectionHeading icon="search" eyebrow="Google" title="Presença na busca" aside={<span className={styles.integrationBadge}><StatusDot signal="healthy" /> Conectado</span>} />
          <Metrics items={data.google} compact />
          <div className={styles.queryList}>{data.queries.map((query) => <div key={query.label}><span className={query.direction === 'up' ? styles.arrowUp : styles.arrowDown}>{query.direction === 'up' ? '↗' : '↘'}</span><div><strong>{query.label}</strong><small>{query.detail}</small></div></div>)}</div>
        </Card>

        <Card className={styles.content}>
          <SectionHeading icon="content" eyebrow="Conteúdo" title="Ativos que trabalham pela Zafi" />
          <Metrics items={data.content.topPages} compact />
          <div className={styles.published}><span>Últimas publicadas</span>{data.content.published.map((page, index) => <div key={page}><i>{String(index + 1).padStart(2, '0')}</i><strong>{page}</strong><em>Publicada</em></div>)}</div>
        </Card>

        <Card className={styles.funnel}>
          <SectionHeading icon="funnel" eyebrow="Funil" title="Da atenção à receita" aside={<span className={styles.integrationBadge}><StatusDot signal="critical" /> Eventos pendentes</span>} />
          <div className={styles.funnelFlow}>{data.funnel.map((step, index) => <div className={styles.funnelStep} key={step.label}><div><span>{step.label}</span><strong>{step.value}</strong>{step.conversion && <small>{step.conversion}</small>}</div>{index < data.funnel.length - 1 && <b>→</b>}</div>)}</div>
        </Card>

        <Card className={styles.partners}>
          <SectionHeading icon="partner" eyebrow="Parceiros" title="Performance comercial" />
          <Metrics items={data.partners} compact />
        </Card>

        <Card className={styles.revenue}>
          <SectionHeading icon="revenue" eyebrow="Receita" title="Pulso financeiro" aside={<span className={styles.integrationBadge}><StatusDot signal="attention" /> Conciliação pendente</span>} />
          <Metrics items={data.revenue} compact />
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
