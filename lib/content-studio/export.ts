import 'server-only'

import JSZip from 'jszip'
import { getArtworkInput } from './assets'
import { renderStudioArtwork } from './artwork'
import type { StudioContentDetail } from './types'

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase()
}

export async function buildContentExport(contents: StudioContentDetail[]) {
  const zip = new JSZip()
  const report: string[] = ['conteudo;rede;formato;versao;paginas;status']
  const manifest: Array<Record<string, unknown>> = []

  for (const content of contents) {
    const version = content.current_version
    const folderName = `${content.network.label}/${String(content.internal_title).slice(0, 72)}-v${version.version_number}`
    const folder = zip.folder(folderName)
    if (!folder) throw new Error('Não foi possível criar a pasta de exportação')
    for (const page of version.pages) {
      const input = await getArtworkInput(version.id, page.page_number)
      const image = renderStudioArtwork(input)
      folder.file(`pagina-${String(page.page_number).padStart(2, '0')}.png`, Buffer.from(await image.arrayBuffer()))
    }
    folder.file('legenda.txt', `${version.caption}\n\n${version.cta}\n\n${version.hashtags.join(' ')}`)
    folder.file('metadados.json', JSON.stringify({
      id: content.id, titulo: content.internal_title, tema: content.theme, objetivo: content.objective,
      categoria: content.category.label, rede: content.network.label, formato: content.format.label,
      versao: version.version_number, status: content.status, aprovado_em: content.reviews.find((review) => review.decision === 'approved')?.created_at ?? null,
    }, null, 2))
    report.push([content.internal_title, content.network.label, content.format.label, version.version_number, version.pages.length, content.status].map((item) => `"${String(item).replace(/"/g, '""')}"`).join(';'))
    manifest.push({ content_id: content.id, version_id: version.id, pages: version.pages.length, network: content.network.slug, format: content.format.slug })
  }

  zip.file('relatorio-exportacao.csv', `\uFEFF${report.join('\n')}`)
  zip.file('LEIA-ME.txt', 'Pacote aprovado no Zafi Content Studio. Aprovação não representa publicação automática. Cada arte usa o logo master oficial da Zafi.')
  return { bytes: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }), manifest }
}
