import Link from 'next/link'
import CouncilPdfActions from '@/components/council/CouncilPdfActions'
import { logout } from '@/app/admin/login/actions'
import {
  attachmentAction,
  ceoDecisionAction,
  councilOpinionAction,
  engineeringReportAction,
} from '@/app/admin/(governance)/council/actions'
import type { AdminSession } from '@/lib/ceo/auth'
import type {
  AuditEvent,
  ExecutiveOrderDetail as OrderData,
  ExecutivePriority,
  ExecutiveStatus,
} from '@/lib/council/types'
import styles from '@/app/admin/council.module.css'

const statusLabels: Record<ExecutiveStatus, string> = {
  draft: 'Rascunho', open: 'Aberta', in_progress: 'Em implementação',
  awaiting_council: 'Aguardando Conselho', awaiting_ceo: 'Aguardando CEO',
  adjustments_requested: 'Ajustes solicitados', reprioritized: 'Repriorizada',
  blocked: 'Bloqueada', approved: 'Aprovada', completed: 'Concluída', rejected: 'Rejeitada',
}
const priorityLabels: Record<ExecutivePriority, string> = { maximum: 'Máxima', high: 'Alta', medium: 'Média', low: 'Baixa' }
const roleLabels = { ceo: 'CEO', council: 'Conselho', engineering: 'Engenharia' }
const eventLabels: Record<AuditEvent['event_type'], string> = {
  order_created: 'Ordem criada',
  order_revised: 'Ordem revisada',
  engineering_report_submitted: 'Relatório da Engenharia',
  council_opinion_submitted: 'Parecer do Conselho',
  ceo_decision_recorded: 'Decisão do CEO',
  attachment_registered: 'Evidência anexada',
}
const noticeLabels: Record<string, string> = {
  created: 'Ordem Executiva registrada no ledger.',
  engineering: 'Relatório da Engenharia registrado.',
  council: 'Parecer do Conselho registrado.',
  ceo: 'Decisão do CEO registrada.',
  attachment: 'Evidência armazenada e vinculada.',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.reportList}>
      <span>{title}</span>
      {items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <small>Nenhum item registrado.</small>}
    </div>
  )
}

function Header({ session }: { session: AdminSession }) {
  return (
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/admin/council"><span>zafi</span><i>CONSELHO</i></Link>
      <nav><Link className={styles.activeNav} href="/admin/council">Ordens Executivas</Link>{session.role === 'ceo' && <Link href="/admin">CEO Cockpit</Link>}</nav>
      <div className={styles.identity}><span>{roleLabels[session.role]}</span><strong>{session.name}</strong><form action={logout}><button type="submit">Sair</button></form></div>
    </header>
  )
}

function Stage({ label, complete, active }: { label: string; complete: boolean; active: boolean }) {
  return <div className={`${styles.stage} ${complete ? styles.stageComplete : ''} ${active ? styles.stageActive : ''}`}><i>{complete ? '✓' : ''}</i><span>{label}</span></div>
}

export default function ExecutiveOrderDetail({
  order,
  session,
  notice,
  privateStorageConfigured,
}: {
  order: OrderData
  session: AdminSession
  notice?: string
  privateStorageConfigured: boolean
}) {
  const current = order.current
  const engineering = order.engineering_reports[0]
  const opinion = order.council_opinions[0]
  const decision = order.ceo_decisions[0]
  const decisionComplete = Boolean(decision)
  const opinionComplete = Boolean(opinion)
  const engineeringComplete = Boolean(engineering)

  return (
    <main className={styles.shell}>
      <Header session={session} />
      <div className={styles.detailWrap}>
        <div className={styles.detailToolbar}>
          <Link className={styles.backLink} href="/admin/council">← Todas as Ordens Executivas</Link>
          <CouncilPdfActions
            oeCode={order.oe_code}
            version={current.version}
            title={current.title}
          />
        </div>
        {notice && noticeLabels[notice] && <div className={styles.notice}><span className={styles.liveDot} />{noticeLabels[notice]}</div>}

        <section className={styles.orderHero}>
          <div className={styles.orderCode}><span>Ordem Executiva</span><strong>{order.oe_code}</strong><small>v{current.version} · criada em {formatDate(order.created_at)}</small></div>
          <div className={styles.orderHeadline}><p>{priorityLabels[current.priority]} prioridade</p><h1>{current.title}</h1><div><span><i className={`${styles.statusDot} ${styles[current.status]}`} />{statusLabels[current.status]}</span><span>Autor: {current.author_name}</span></div></div>
          <div className={styles.orderProgress}><strong>{engineering?.completion_percentage ?? 0}%</strong><span>implementado</span><i><em style={{ width: `${engineering?.completion_percentage ?? 0}%` }} /></i></div>
        </section>

        <section className={styles.workflow}>
          <Stage label="Ordem" complete active={!engineeringComplete} />
          <b>→</b>
          <Stage label="Engenharia" complete={engineeringComplete} active={engineeringComplete && !opinionComplete} />
          <b>→</b>
          <Stage label="Conselho" complete={opinionComplete} active={opinionComplete && !decisionComplete} />
          <b>→</b>
          <Stage label="CEO" complete={decisionComplete} active={false} />
        </section>

        <section className={styles.orderDescription}>
          <div><p>Mandato atual</p><h2>Descrição</h2></div>
          <p>{current.description}</p>
        </section>

        <div className={styles.reviewGrid}>
          <section className={styles.reviewCard}>
            <header><span>01</span><div><p>Entrega técnica</p><h2>Relatório da Engenharia</h2></div>{engineering && <b>v{engineering.version}</b>}</header>
            {engineering ? (
              <div className={styles.reportBody}>
                <div className={styles.reportLead}><span>{engineering.implementation_status.replaceAll('_', ' ')}</span><strong>{engineering.completion_percentage}%</strong><small>{formatDate(engineering.created_at)}</small></div>
                <p>{engineering.summary}</p>
                <div className={styles.reportLists}>
                  <List title="Evidências" items={engineering.evidences} />
                  <List title="Arquivos alterados" items={engineering.changed_files} />
                  <List title="Commits" items={engineering.commits} />
                  <List title="Testes" items={engineering.tests} />
                  <List title="Riscos" items={engineering.risks} />
                  <List title="Pendências" items={engineering.pending_items} />
                  <List title="Limitações" items={engineering.limitations} />
                  <List title="Critérios atendidos" items={engineering.acceptance_criteria} />
                </div>
              </div>
            ) : <div className={styles.emptyStage}><strong>Aguardando Engenharia</strong><span>O primeiro relatório abrirá a análise do Conselho.</span></div>}
          </section>

          <section className={styles.reviewCard}>
            <header><span>02</span><div><p>Leitura estratégica</p><h2>Parecer do Conselho</h2></div>{opinion && <b>v{opinion.version}</b>}</header>
            {opinion ? (
              <div className={styles.reportBody}>
                <div className={styles.verdict}>{opinion.verdict.replaceAll('_', ' ')}</div>
                <p>{opinion.justification}</p>
                <List title="Recomendações" items={opinion.recommendations} />
                <List title="Próximas ações" items={opinion.next_actions} />
                <small>Por {opinion.author_name} · {formatDate(opinion.created_at)}</small>
              </div>
            ) : <div className={styles.emptyStage}><strong>Aguardando parecer</strong><span>O Conselho responde após evidência suficiente da Engenharia.</span></div>}
          </section>

          <section className={styles.reviewCard}>
            <header><span>03</span><div><p>Direção final</p><h2>Decisão do CEO</h2></div>{decision && <b>v{decision.version}</b>}</header>
            {decision ? (
              <div className={styles.reportBody}>
                <div className={`${styles.verdict} ${styles.ceoVerdict}`}>{decision.decision.replaceAll('_', ' ')}</div>
                <p>{decision.justification}</p>
                <small>Por {decision.decided_by_name} · {formatDate(decision.created_at)}</small>
              </div>
            ) : <div className={styles.emptyStage}><strong>Aguardando decisão</strong><span>A decisão será liberada após o parecer estratégico.</span></div>}
          </section>
        </div>

        {session.role === 'engineering' && (
          <section className={styles.actionPanel}>
            <header><p>Responder à OE</p><h2>Novo relatório da Engenharia</h2><span>Uma nova versão será criada; a anterior permanece intacta.</span></header>
            <form action={engineeringReportAction} className={styles.formGrid}>
              <input type="hidden" name="oeCode" value={order.oe_code} />
              <label><span>Status</span><select name="implementationStatus" defaultValue="in_progress"><option value="not_started">Não iniciada</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueada</option><option value="completed">Concluída</option></select></label>
              <label><span>Percentual concluído</span><input name="completionPercentage" type="number" min="0" max="100" defaultValue={engineering?.completion_percentage ?? 0} required /></label>
              <label className={styles.fullField}><span>Resumo da implementação</span><textarea name="summary" minLength={10} required /></label>
              {[
                ['evidences', 'Evidências'], ['changedFiles', 'Arquivos alterados'], ['commits', 'Commits relacionados'],
                ['tests', 'Testes executados'], ['risks', 'Riscos'], ['pendingItems', 'Pendências'],
                ['limitations', 'Limitações'], ['acceptanceCriteria', 'Critérios de aceite atendidos'],
              ].map(([name, label]) => <label key={name}><span>{label} · um por linha</span><textarea name={name} /></label>)}
              <button type="submit">Registrar relatório <b>→</b></button>
            </form>
          </section>
        )}

        {session.role === 'council' && engineering?.implementation_status === 'completed' && (
          <section className={styles.actionPanel}>
            <header><p>Responder à Engenharia</p><h2>Emitir parecer estratégico</h2><span>O parecer será permanente e auditável.</span></header>
            <form action={councilOpinionAction} className={styles.formGrid}>
              <input type="hidden" name="oeCode" value={order.oe_code} />
              <label><span>Parecer</span><select name="verdict" defaultValue="approved"><option value="approved">Aprovado</option><option value="approved_with_reservations">Aprovado com ressalvas</option><option value="rejected">Rejeitado</option></select></label>
              <label className={styles.fullField}><span>Justificativa</span><textarea name="justification" minLength={10} required /></label>
              <label><span>Recomendações · uma por linha</span><textarea name="recommendations" /></label>
              <label><span>Próximas ações · uma por linha</span><textarea name="nextActions" /></label>
              <button type="submit">Registrar parecer <b>→</b></button>
            </form>
          </section>
        )}

        {session.role === 'council' && engineering?.implementation_status !== 'completed' && (
          <section className={styles.actionPanel}>
            <header>
              <p>Gate de governança</p>
              <h2>Parecer ainda bloqueado</h2>
              <span>A Engenharia precisa registrar uma entrega concluída antes da análise estratégica.</span>
            </header>
          </section>
        )}

        {session.role === 'ceo' && opinion && (
          <section className={styles.actionPanel}>
            <header><p>Direção executiva</p><h2>Registrar decisão do CEO</h2><span>Esta ação não apaga pareceres nem relatórios anteriores.</span></header>
            <form action={ceoDecisionAction} className={styles.formGrid}>
              <input type="hidden" name="oeCode" value={order.oe_code} />
              <label><span>Decisão</span><select name="decision" defaultValue="approve"><option value="approve">Aprovar</option><option value="request_adjustments">Solicitar ajustes</option><option value="reprioritize">Repriorizar</option></select></label>
              <label><span>Nova prioridade, se aplicável</span><select name="priority" defaultValue={current.priority}><option value="maximum">Máxima</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label>
              <label className={styles.fullField}><span>Justificativa</span><textarea name="justification" minLength={5} required /></label>
              <button type="submit">Registrar decisão <b>→</b></button>
            </form>
          </section>
        )}

        {session.role === 'ceo' && !opinion && (
          <section className={styles.actionPanel}>
            <header>
              <p>Gate de governança</p>
              <h2>Decisão ainda bloqueada</h2>
              <span>O CEO decide somente depois do relatório concluído e do parecer do Conselho.</span>
            </header>
          </section>
        )}

        <section className={styles.evidenceSection}>
          <header className={styles.sectionHeader}><div><p>Arquivo probatório</p><h2>Evidências e anexos</h2></div><span>Privado · URL temporária · sem sobrescrita</span></header>
          <div className={styles.attachmentGrid}>
            {order.attachments.map((attachment) => (
              <a href={`/admin/council/attachments/${attachment.id}`} target="_blank" rel="noreferrer" key={attachment.id}>
                <i>{attachment.attachment_type.toUpperCase()}</i><span><strong>{attachment.file_name}</strong><small>{attachment.author_name} · {formatDate(attachment.created_at)}</small></span><b>↗</b>
              </a>
            ))}
            {!order.attachments.length && <div className={styles.attachmentEmpty}>Nenhuma evidência anexada.</div>}
          </div>
          <form action={attachmentAction} className={styles.attachmentForm}>
            <input type="hidden" name="oeCode" value={order.oe_code} />
            <label>
              <span>Tipo de entrada</span>
              <select name="mode" defaultValue={privateStorageConfigured ? 'file' : 'link'}>
                {privateStorageConfigured && <option value="file">Arquivo privado</option>}
                <option value="link">Link HTTPS</option>
                <option value="log">Log em texto</option>
              </select>
            </label>
            {privateStorageConfigured ? (
              <label><span>Arquivo · até 4 MB</span><input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.webm,.txt,.json,.csv,.zip,.docx" /></label>
            ) : (
              <label><span>Arquivo privado</span><small>Disponível após configurar o cofre de anexos.</small></label>
            )}
            <label><span>Nome do link ou log</span><input name="label" placeholder="Evidência de validação" /></label>
            <label><span>Link HTTPS</span><input name="externalUrl" type="url" placeholder="https://..." /></label>
            <label className={styles.fullField}><span>Log em texto</span><textarea name="inlineContent" placeholder="Cole somente logs sem segredos ou dados pessoais." /></label>
            <button type="submit">Anexar evidência <b>→</b></button>
          </form>
        </section>

        <section className={styles.historySection}>
          <header className={styles.sectionHeader}><div><p>Ledger imutável</p><h2>Histórico completo</h2></div><span>{order.history.length} evento(s)</span></header>
          <div className={styles.timeline}>
            {order.history.map((event) => (
              <article key={event.id}>
                <i />
                <div><span>{eventLabels[event.event_type]}</span><strong>{event.actor_name}</strong><small>{roleLabels[event.actor_role]} · {formatDate(event.created_at)}</small></div>
                <code>{event.entity_id.slice(0, 8)}</code>
              </article>
            ))}
          </div>
        </section>
      </div>
      <footer className={styles.footer}><span>{order.oe_code} / LEDGER</span><p>Nada sobrescrito. Toda decisão explicável.</p><span>Produção · São Paulo</span></footer>
    </main>
  )
}
