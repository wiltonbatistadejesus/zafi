'use client'

import { useState } from 'react'
import styles from '@/app/admin/council.module.css'

export default function CouncilPdfActions({
  oeCode,
  version,
  title,
}: {
  oeCode: string
  version: number
  title: string
}) {
  const [status, setStatus] = useState('')
  const [sharing, setSharing] = useState(false)
  const href = `/admin/council/${encodeURIComponent(oeCode)}/export.pdf`
  const fileName = `Zafi-${oeCode}-v${version}.pdf`

  async function sharePdf() {
    setSharing(true)
    setStatus('')
    try {
      const response = await fetch(href, { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw new Error('pdf_unavailable')

      const file = new File([await response.blob()], fileName, { type: 'application/pdf' })
      const shareData = {
        title: `${oeCode} — ${title}`,
        text: `Ordem Executiva ${oeCode}, versão ${version}, do Conselho Estratégico Zafi.`,
        files: [file],
      }
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData)
        setStatus('PDF compartilhado.')
        return
      }

      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
      setStatus('PDF baixado. Compartilhe pelo seu aparelho.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('')
      } else {
        setStatus('Não foi possível preparar o PDF.')
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className={styles.pdfArea}>
      <span className={styles.pdfStamp} aria-hidden="true">PDF</span>
      <div className={styles.pdfCopy}>
        <strong>Documento auditável</strong>
        <small>{oeCode} · v{version}</small>
      </div>
      <a className={styles.pdfDownload} href={href}>Baixar PDF</a>
      <button className={styles.pdfShare} type="button" onClick={sharePdf} disabled={sharing}>
        {sharing ? 'Preparando…' : 'Compartilhar'}
      </button>
      {status && <span className={styles.pdfFeedback} role="status">{status}</span>}
    </div>
  )
}
