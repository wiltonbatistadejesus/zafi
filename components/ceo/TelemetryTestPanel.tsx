'use client'

import { useEffect, useState } from 'react'
import type { CockpitSnapshot } from '@/lib/telemetry/types'

const labels: Record<string, string> = {
  page_view: 'Visita',
  analysis_started: 'Análise iniciada',
  analysis_completed: 'Análise concluída',
  partner_clicked: 'Clique no parceiro',
  affiliate_click: 'Clique afiliado',
}

function statusLabel(status: string | null) {
  if (status === 'accepted' || status === 'sent') return 'Tag GA4 acionada; processamento pendente'
  if (status === 'confirmed') return 'Confirmado na interface do GA4'
  if (status === 'skipped_no_consent') return 'GA4 não enviado: sem consentimento'
  if (status === 'not_configured') return 'GA4 não configurado'
  if (status === 'failed') return 'Falha no GA4'
  return 'Entrega GA4 sem registro'
}

export default function TelemetryTestPanel() {
  const [data, setData] = useState<CockpitSnapshot | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const response = await fetch('/admin/api/telemetry', { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const next = await response.json()
        if (active) { setData(next); setError('') }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : String(caught))
      }
    }
    refresh()
    const timer = window.setInterval(refresh, 3_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-400">Zafi · Sprint 6.2</p><h1 className="mt-2 text-3xl font-black">Validação da telemetria</h1><p className="mt-2 text-sm text-slate-400">Atualização automática a cada 3 segundos · banco oficial da Zafi</p></div>
          <a href="/admin" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-900">Voltar ao Cockpit</a>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/60 p-4 text-sm text-red-200">Falha ao consultar: {error}</div>}
        {!data && !error && <p className="mt-8 text-slate-400">Consultando a fonte oficial…</p>}

        {data && <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Visitantes', data.visitors], ['Iniciadas', data.analysis_started], ['Concluídas', data.analysis_completed],
              ['Cliques', data.partner_clicked], ['GA4 enviados', data.ga4_integration?.technical_sent ?? data.ga4_accepted],
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><span className="text-xs text-slate-400">{label}</span><strong className="mt-2 block text-3xl">{value}</strong></div>)}
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="font-extrabold">Fluxo dos eventos</h2><p className="text-xs text-slate-400">Recebido → persistido → GA4 → Cockpit</p></div><span className="flex items-center gap-2 text-xs text-emerald-400"><i className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Ao vivo</span></header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Evento</th><th className="px-5 py-3">Recebido</th><th className="px-5 py-3">Persistido</th><th className="px-5 py-3">GA4</th><th className="px-5 py-3">Cockpit</th><th className="px-5 py-3">Origem</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {data.recent_events.map((event) => <tr key={event.id}>
                    <td className="px-5 py-4"><strong>{labels[event.event_type] || event.event_type}</strong><small className="mt-1 block font-mono text-[10px] text-slate-500">{event.id}</small></td>
                    <td className="px-5 py-4 text-emerald-400">✓ {new Date(event.occurred_at).toLocaleTimeString('pt-BR')}</td>
                    <td className="px-5 py-4 text-emerald-400">✓ {new Date(event.created_at).toLocaleTimeString('pt-BR')}</td>
                    <td className={`px-5 py-4 ${event.ga4_status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'}`}>{event.ga4_status === 'confirmed' ? '✓ ' : '• '}{statusLabel(event.ga4_status)}</td>
                    <td className="px-5 py-4 text-emerald-400">✓ Disponível</td>
                    <td className="max-w-[220px] truncate px-5 py-4 text-slate-400">{event.source_page}</td>
                  </tr>)}
                  {!data.recent_events.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Nenhum evento persistido ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>}
      </div>
    </main>
  )
}
