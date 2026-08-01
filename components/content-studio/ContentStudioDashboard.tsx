import Image from 'next/image'
import Link from 'next/link'
import { logout } from '@/app/admin/login/actions'
import { approveContentAction, bulkContentAction, rejectContentAction } from '@/app/admin/(cockpit)/content-studio/actions'
import type { StudioDashboard, StudioFilters } from '@/lib/content-studio/types'
import { REJECTION_REASONS, STATUS_LABELS } from '@/lib/content-studio/types'
import styles from '@/app/admin/content-studio.module.css'

const notices: Record<string, string> = {
  archived: 'Conteúdo arquivado com histórico preservado.',
  'bulk-approve': 'Conteúdos aprovados em lote.',
  'bulk-reject': 'Conteúdos reprovados e refeitos em novas versões.',
  'bulk-archive': 'Conteúdos arquivados em lote.',
}

function RejectionFields() {
  return <><label>Motivo<select name="reasonCode" required defaultValue=""><option value="" disabled>Selecione</option>{REJECTION_REASONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Orientação<textarea name="guidance" placeholder="Explique o que precisa mudar." maxLength={2000} /></label></>
}

export default function ContentStudioDashboard({ dashboard, filters, notice }: { dashboard: StudioDashboard; filters: StudioFilters; notice?: string }) {
  const updated = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(dashboard.generatedAt))
  const metrics = [
    ['Total', dashboard.metrics.total], ['Aguardando', dashboard.metrics.pending], ['Aprovados', dashboard.metrics.approved],
    ['Reprovados', dashboard.metrics.rejected], ['Em refação', dashboard.metrics.regenerating], ['Exportados', dashboard.metrics.exported],
    ['Últimos 7 dias', dashboard.metrics.last7Days], ['Últimos 30 dias', dashboard.metrics.last30Days],
  ]
  return <main className={styles.shell}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/admin/content-studio"><Image src="/brand/zafi-logo.svg" alt="Zafi" width={104} height={40} priority /><span>CONTENT STUDIO</span></Link>
      <nav><Link href="/admin">Cockpit</Link><Link href="/admin/council">Conselho</Link><strong>CEO · Produção</strong><form action={logout}><button type="submit">Sair</button></form></nav>
    </header>

    <section className={styles.hero}>
      <div><p>OE-016 · Mesa editorial privada</p><h1>Aprovar com clareza.<br /><em>Publicar só depois.</em></h1></div>
      <aside><span>30 peças iniciais</span><strong>0 publicações automáticas</strong><small>Banco Zafi · atualizado {updated}</small></aside>
    </section>
    {notice && notices[notice] && <div className={styles.notice}>{notices[notice]}</div>}

    <section className={styles.metrics} aria-label="Métricas do Content Studio">{metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>

    <section className={styles.controlDeck}>
      <form className={styles.filters} method="get">
        <label className={styles.search}>Buscar<input name="query" defaultValue={filters.query} placeholder="Título, tema, legenda..." /></label>
        <label>Status<select name="status" defaultValue={filters.status}><option value="">Todos</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Rede<select name="network" defaultValue={filters.network}><option value="">Todas</option>{dashboard.networks.map((item) => <option value={item.slug} key={item.id}>{item.label}</option>)}</select></label>
        <label>Categoria<select name="category" defaultValue={filters.category}><option value="">Todas</option>{dashboard.categories.map((item) => <option value={item.slug} key={item.id}>{item.label}</option>)}</select></label>
        <label>Formato<select name="format" defaultValue={filters.format}><option value="">Todos</option>{dashboard.formats.map((item) => <option value={item.slug} key={item.id}>{item.label}</option>)}</select></label>
        <label>Criação<select name="created" defaultValue={filters.created}><option value="">Todo período</option><option value="7d">7 dias</option><option value="30d">30 dias</option></select></label>
        <button type="submit">Aplicar</button><Link href="/admin/content-studio">Limpar</Link>
      </form>
    </section>

    <form id="bulk-content-action" action={bulkContentAction}>
      <section className={styles.bulkBar}>
        <div><strong>Ações em lote</strong><span>Selecione as peças na biblioteca.</span></div>
        <select name="bulkAction" defaultValue=""><option value="" disabled>Escolha uma ação</option><option value="approve">Aprovar</option><option value="reject">Reprovar e refazer</option><option value="archive">Arquivar</option></select>
        <select name="reasonCode" defaultValue=""><option value="">Motivo se reprovar</option>{REJECTION_REASONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        <input name="guidance" placeholder="Orientação opcional" />
        <div className={styles.bulkButtons}>
          <button type="submit">Executar</button>
          <button type="submit" formAction="/admin/content-studio/export" formMethod="post" className={styles.bulkExport}>Exportar aprovados</button>
        </div>
      </section>

    </form>

      <section className={styles.libraryHeader}><div><p>Biblioteca</p><h2>{dashboard.contents.length} conteúdo(s)</h2></div><span>A imagem é gerada da versão registrada; nada é publicado.</span></section>
      <section className={styles.gallery}>
        {dashboard.contents.map((content) => {
          const version = content.current_version
          const preview = `/admin/content-studio/assets/${version.id}/1`
          return <article className={styles.contentCard} key={content.id}>
            <label className={styles.selector}><input type="checkbox" name="contentId" value={content.id} form="bulk-content-action" /><span>Selecionar</span></label>
            <Link className={styles.preview} href={`/admin/content-studio/${content.id}`}><Image src={preview} alt={version.pages[0]?.alt_text ?? content.internal_title} width={content.format.width} height={content.format.height} unoptimized /></Link>
            <div className={styles.cardBody}>
              <div className={styles.meta}><span>{content.network.label}</span><span>{content.format.label}</span><b className={styles[content.status]}>{STATUS_LABELS[content.status]}</b></div>
              <h3>{content.internal_title}</h3><p>{content.theme}</p>
              <footer><span>v{version.version_number} · {version.pages.length} {version.pages.length === 1 ? 'arte' : 'páginas'}</span><Link href={`/admin/content-studio/${content.id}`}>Revisar →</Link></footer>
              <div className={styles.quickActions}>
                <form action={approveContentAction}><button name="contentId" value={content.id} disabled={content.status === 'archived'}>Aprovar</button></form>
                <details><summary>Reprovar</summary><form action={rejectContentAction} className={styles.rejectPopover}><input type="hidden" name="contentId" value={content.id} /><RejectionFields /><button>Reprovar e refazer</button></form></details>
                {content.approved_version_id && <form action="/admin/content-studio/export" method="post"><button name="contentId" value={content.id}>Exportar</button></form>}
              </div>
            </div>
          </article>
        })}
      </section>

    <section className={styles.distribution}>
      <div><p>Distribuição por rede</p>{dashboard.byNetwork.map((item) => <span key={item.label}><strong>{item.value}</strong>{item.label}</span>)}</div>
      <div><p>Categorias ativas</p>{dashboard.byCategory.map((item) => <span key={item.label}><strong>{item.value}</strong>{item.label}</span>)}</div>
    </section>
    <footer className={styles.footer}>ZAFI CONTENT STUDIO <span>Logo master · Inter · aprovação humana obrigatória</span></footer>
  </main>
}
