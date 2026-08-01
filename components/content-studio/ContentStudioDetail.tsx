import Image from 'next/image'
import Link from 'next/link'
import { approveContentAction, archiveContentAction, rejectContentAction, reviseContentAction } from '@/app/admin/(cockpit)/content-studio/actions'
import type { StudioContentDetail } from '@/lib/content-studio/types'
import { REJECTION_REASONS, STATUS_LABELS } from '@/lib/content-studio/types'
import CopyButton from './CopyButton'
import styles from '@/app/admin/content-studio.module.css'

const noticeLabels: Record<string, string> = {
  approved: 'Versão aprovada pelo CEO. Ela está liberada para exportação, não para publicação automática.',
  regenerated: 'A versão anterior foi reprovada e uma nova versão foi criada para revisão.',
  revised: 'Nova versão registrada. O histórico anterior foi preservado.',
}

function date(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}

export default function ContentStudioDetail({ content, notice }: { content: StudioContentDetail; notice?: string }) {
  const version = content.current_version
  const previousVersion = content.versions.find((item) => item.version_number === version.version_number - 1)
  const currentIsApproved = content.approved_version_id === version.id
  const fullCaption = `${version.caption}\n\n${version.cta}\n\n${version.hashtags.join(' ')}`
  return <main className={styles.shell}>
    <header className={styles.detailTopbar}>
      <Link href="/admin/content-studio">← Biblioteca</Link><div><Image src="/brand/zafi-logo.svg" alt="Zafi" width={92} height={35} /><span>CONTENT STUDIO</span></div><strong>Revisão CEO</strong>
    </header>
    {notice && noticeLabels[notice] && <div className={styles.notice}>{noticeLabels[notice]}</div>}

    <section className={styles.detailHero}>
      <div><p>{content.category.label} · {content.network.label}</p><h1>{content.internal_title}</h1><span>{content.objective}</span></div>
      <aside><b className={styles[content.status]}>{STATUS_LABELS[content.status]}</b><strong>v{version.version_number}</strong><small>Criado por {version.author_name}</small></aside>
    </section>

    <section className={styles.reviewLayout}>
      <div className={styles.artworkWall}>
        <header><p>Preview final</p><span>{content.format.width} × {content.format.height}px · logo master</span></header>
        <div className={styles.artworkGrid}>{version.pages.map((page) => <figure key={page.id}><Image src={`/admin/content-studio/assets/${version.id}/${page.page_number}`} alt={page.alt_text} width={content.format.width} height={content.format.height} unoptimized /><figcaption>Página {String(page.page_number).padStart(2, '0')} {currentIsApproved ? <a href={`/admin/content-studio/assets/${version.id}/${page.page_number}`} download>Baixar PNG</a> : <span>Preview protegido</span>}</figcaption></figure>)}</div>
      </div>

      <aside className={styles.approvalRail}>
        <section><p>Decisão</p><form action={approveContentAction}><input type="hidden" name="contentId" value={content.id} /><button className={styles.approveButton} disabled={content.status === 'archived'}>Aprovar versão v{version.version_number}</button></form>
          <details><summary>Reprovar e refazer</summary><form action={rejectContentAction}><input type="hidden" name="contentId" value={content.id} /><label>Motivo<select name="reasonCode" required defaultValue=""><option value="" disabled>Selecione</option>{REJECTION_REASONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Orientação ao agente<textarea name="guidance" required placeholder="O que precisa mudar?" /></label><button className={styles.rejectButton}>Registrar reprovação</button></form></details>
          {content.approved_version_id ? <><form action="/admin/content-studio/export" method="post"><input type="hidden" name="contentId" value={content.id} /><button className={styles.exportButton}>Exportar pacote aprovado</button></form><a className={styles.textDownload} href={`/admin/content-studio/text/${content.id}`}>Baixar TXT aprovado</a></> : <small>A exportação será liberada após aprovação.</small>}
        </section>
        <section className={styles.guardrail}><strong>Gate humano ativo</strong><p>Este Studio não possui credenciais de redes sociais nem ação de publicação.</p></section>
      </aside>
    </section>

    <section className={styles.copyDeck}>
      <article><header><p>Texto da arte</p><CopyButton value={version.art_text} /></header><strong>{version.art_text}</strong></article>
      <article><header><p>Legenda</p><CopyButton value={version.caption} /></header><span>{version.caption}</span></article>
      <article><header><p>CTA oficial</p><CopyButton value={version.cta} /></header><strong>{version.cta}</strong></article>
      <article><header><p>Hashtags</p><CopyButton value={version.hashtags.join(' ')} /></header><span>{version.hashtags.join(' ')}</span></article>
      <CopyButton value={fullCaption} label="Copiar publicação completa" />
    </section>

    <section className={styles.rulesPanel}>
      <article><p>Regras editoriais aplicadas</p><ul><li>Identidade oficial zafi-logo-master-v1 e paleta aprovada.</li><li>Tom acolhedor, simples, educativo e não julgador.</li><li>Sem promessa de crédito, desconto, score ou resultado financeiro.</li><li>Aprovação humana obrigatória antes da exportação.</li></ul></article>
      <article><p>Fontes registradas</p>{version.sources.length ? <ul>{version.sources.map((source) => <li key={`${source.url}-${source.title}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span>{source.publisher}{source.consulted_at ? ` · consulta em ${source.consulted_at}` : ''}</span></li>)}</ul> : <span>Conteúdo educativo sem dado legal, econômico ou estatístico externo.</span>}</article>
    </section>

    {previousVersion && <section className={styles.comparisonPanel}>
      <header><p>Comparação de versões</p><h2>O que mudou da v{previousVersion.version_number} para a v{version.version_number}</h2></header>
      <div className={styles.versionCompare}>
        <article><div><b>Anterior · v{previousVersion.version_number}</b><span>{STATUS_LABELS[previousVersion.status]}</span></div>{previousVersion.pages[0] && <Image src={`/admin/content-studio/assets/${previousVersion.id}/${previousVersion.pages[0].page_number}`} alt={previousVersion.pages[0].alt_text} width={content.format.width} height={content.format.height} unoptimized />}<p>{previousVersion.art_text}</p><small>{previousVersion.change_summary ?? 'Versão anterior preservada.'}</small></article>
        <article><div><b>Atual · v{version.version_number}</b><span>{STATUS_LABELS[version.status]}</span></div>{version.pages[0] && <Image src={`/admin/content-studio/assets/${version.id}/${version.pages[0].page_number}`} alt={version.pages[0].alt_text} width={content.format.width} height={content.format.height} unoptimized />}<p>{version.art_text}</p><small>{version.change_summary ?? 'Versão atual.'}</small></article>
      </div>
    </section>}

    <section className={styles.editorPanel}>
      <header><p>Editar sem sobrescrever</p><h2>Criar nova versão</h2></header>
      <form action={reviseContentAction}><input type="hidden" name="contentId" value={content.id} />
        <label>Texto principal<input name="artText" defaultValue={version.art_text} required maxLength={240} /></label>
        <label className={styles.wide}>Legenda<textarea name="caption" defaultValue={version.caption} required maxLength={3000} /></label>
        <label className={styles.wide}>CTA<input name="cta" defaultValue={version.cta} required maxLength={300} /></label>
        <label className={styles.wide}>Hashtags<input name="hashtags" defaultValue={version.hashtags.join(' ')} /></label>
        <label>Direção visual<textarea name="visualDirection" defaultValue={version.visual_direction} required /></label>
        <label>Variante<select name="designVariant" defaultValue={version.design_variant}><option value="ledger">Ledger</option><option value="split">Split</option><option value="grid">Grid</option><option value="path">Path</option><option value="signal">Signal</option><option value="calm">Calm</option></select></label>
        <label className={styles.wide}>Resumo da mudança<input name="changeSummary" placeholder="Por que esta versão foi criada?" required /></label>
        <button>Criar nova versão</button>
      </form>
    </section>

    <section className={styles.historyGrid}>
      <article><header><p>Versões</p><h2>{content.versions.length} registro(s)</h2></header>{content.versions.map((item) => <div className={styles.historyRow} key={item.id}><b>v{item.version_number}</b><span>{STATUS_LABELS[item.status]}<small>{item.change_summary ?? 'Versão inicial'}</small></span><time>{date(item.created_at)}</time></div>)}</article>
      <article><header><p>Pareceres</p><h2>{content.reviews.length} decisão(ões)</h2></header>{content.reviews.length ? content.reviews.map((review) => <div className={styles.historyRow} key={review.id}><b>{review.decision === 'approved' ? '✓' : '×'}</b><span>{review.decision}<small>{review.reason_code ?? 'Sem ressalvas'} {review.guidance}</small></span><time>{date(review.created_at)}</time></div>) : <p className={styles.emptyText}>Ainda não há decisão humana.</p>}</article>
      <article><header><p>Auditoria</p><h2>Eventos imutáveis</h2></header>{content.audit.map((event) => <div className={styles.historyRow} key={event.id}><b>·</b><span>{event.event_type}<small>{event.actor_name} · {event.actor_role}</small></span><time>{date(event.created_at)}</time></div>)}</article>
    </section>

    <section className={styles.dangerZone}><div><strong>Arquivar conteúdo</strong><p>Remove da operação sem apagar versões, pareceres ou auditoria.</p></div><form action={archiveContentAction}><input type="hidden" name="contentId" value={content.id} /><button>Arquivar</button></form></section>
  </main>
}
