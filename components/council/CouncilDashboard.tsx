import Link from 'next/link'
import { logout } from '@/app/admin/login/actions'
import { createOrderAction } from '@/app/admin/(governance)/council/actions'
import type { AdminSession } from '@/lib/ceo/auth'
import type { CouncilDashboard as DashboardData, ExecutivePriority, ExecutiveStatus } from '@/lib/council/types'
import styles from '@/app/admin/council.module.css'

const statusLabels: Record<ExecutiveStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  in_progress: 'Em implementação',
  awaiting_council: 'Aguardando Conselho',
  awaiting_ceo: 'Aguardando CEO',
  adjustments_requested: 'Ajustes solicitados',
  reprioritized: 'Repriorizada',
  blocked: 'Bloqueada',
  approved: 'Aprovada',
  completed: 'Concluída',
  rejected: 'Rejeitada',
}

const priorityLabels: Record<ExecutivePriority, string> = {
  maximum: 'Máxima',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const roleLabels = { ceo: 'CEO', council: 'Conselho', engineering: 'Engenharia' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function metric(value: number | string | null, suffix = '') {
  return value === null ? 'Sem base' : `${Number(value).toLocaleString('pt-BR')}${suffix}`
}

function Header({ session }: { session: AdminSession }) {
  return (
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/admin/council"><span>zafi</span><i>CONSELHO</i></Link>
      <nav>
        <Link className={styles.activeNav} href="/admin/council">Ordens Executivas</Link>
        {session.role === 'ceo' && <Link href="/admin">CEO Cockpit</Link>}
        {session.role === 'ceo' && <Link href="/admin/content-factory">Content Factory</Link>}
      </nav>
      <div className={styles.identity}>
        <span>{roleLabels[session.role]}</span>
        <strong>{session.name}</strong>
        <form action={logout}><button type="submit">Sair</button></form>
      </div>
    </header>
  )
}

export default function CouncilDashboard({ dashboard, session }: { dashboard: DashboardData; session: AdminSession }) {
  const updated = formatDate(dashboard.generated_at)
  const canCreate = session.role === 'ceo' || session.role === 'council'
  const bottleneck = dashboard.metrics.bottlenecks[0]

  return (
    <main className={styles.shell}>
      <Header session={session} />
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>OE-009.1 · Sistema de governança</p>
          <h1>Decisões deixam<br />um rastro.</h1>
        </div>
        <div className={styles.heroNote}>
          <span className={styles.liveDot} /> Fonte única entre Estratégia, Engenharia e CEO
          <small>Atualizado em {updated}</small>
        </div>
      </section>

      <section className={styles.metricRail} aria-label="Indicadores do Conselho">
        <article><span>OEs abertas</span><strong>{metric(dashboard.metrics.open)}</strong><small>Exigem movimento</small></article>
        <article><span>Concluídas</span><strong>{metric(dashboard.metrics.completed)}</strong><small>Aprovadas ou encerradas</small></article>
        <article><span>Bloqueadas</span><strong>{metric(dashboard.metrics.blocked)}</strong><small>Com impedimento ativo</small></article>
        <article><span>Implementação média</span><strong>{metric(dashboard.metrics.average_implementation_days, 'd')}</strong><small>Da criação à entrega</small></article>
        <article><span>Aprovação média</span><strong>{metric(dashboard.metrics.average_approval_days, 'd')}</strong><small>Do parecer à decisão</small></article>
        <article className={styles.bottleneck}><span>Gargalo atual</span><strong>{bottleneck ? statusLabels[bottleneck.status] : 'Sem base'}</strong><small>{bottleneck ? `${bottleneck.count} OE(s)` : 'Aguardando histórico'}</small></article>
      </section>

      <section className={styles.board}>
        <header className={styles.sectionHeader}>
          <div><p>Registro mestre</p><h2>Ordens Executivas</h2></div>
          <span>{dashboard.orders.length} registro(s) · append-only</span>
        </header>

        {dashboard.orders.length ? (
          <div className={styles.orderTable}>
            <div className={styles.tableHead}><span>Ordem</span><span>Prioridade</span><span>Status</span><span>Engenharia</span><span>Versão</span><span>Atualizada</span></div>
            {dashboard.orders.map((order) => (
              <Link className={styles.orderRow} href={`/admin/council/${encodeURIComponent(order.oe_code)}`} key={order.order_id}>
                <span className={styles.orderIdentity}>
                  <b>{order.oe_code}</b>
                  <strong>{order.title}</strong>
                  <small>{order.description}</small>
                  <small>Autor: {order.author_name} · Aprovador: {order.approver_name ?? 'Aguardando CEO'}</small>
                </span>
                <span><i className={`${styles.priority} ${styles[order.priority]}`} />{priorityLabels[order.priority]}</span>
                <span><i className={`${styles.statusDot} ${styles[order.status]}`} />{statusLabels[order.status]}</span>
                <span className={styles.progressCell}><b>{order.completion_percentage}%</b><i><em style={{ width: `${order.completion_percentage}%` }} /></i></span>
                <span className={styles.mono}>v{order.version}</span>
                <span className={styles.dateCell}>{formatDate(order.revised_at)}<b>→</b></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}><strong>Nenhuma Ordem Executiva registrada</strong><span>A primeira OE inicia o ledger estratégico da Zafi.</span></div>
        )}
      </section>

      {canCreate && (
        <section className={styles.composer}>
          <header className={styles.sectionHeader}>
            <div><p>Nova entrada imutável</p><h2>Criar Ordem Executiva</h2></div>
            <span>Somente CEO ou Conselho</span>
          </header>
          <form action={createOrderAction} className={styles.createForm}>
            <label><span>ID único</span><input name="oeCode" placeholder="OE-010" pattern="OE-[0-9]{3,}(\.[0-9]+)?" required /></label>
            <label className={styles.titleField}><span>Título</span><input name="title" placeholder="Resultado que esta ordem deve produzir" minLength={3} maxLength={180} required /></label>
            <label><span>Prioridade</span><select name="priority" defaultValue="high"><option value="maximum">Máxima</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
            <label className={styles.descriptionField}><span>Descrição e critério estratégico</span><textarea name="description" placeholder="Contexto, objetivo, escopo e resultado esperado." minLength={10} maxLength={20000} required /></label>
            <button type="submit">Registrar OE <b>→</b></button>
          </form>
        </section>
      )}

      <footer className={styles.footer}><span>ZAFI / CONSELHO OS</span><p>Nada sobrescrito. Toda decisão explicável.</p><span>Produção · São Paulo</span></footer>
    </main>
  )
}
