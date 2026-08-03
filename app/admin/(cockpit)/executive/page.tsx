import type { Metadata } from 'next'
import Link from 'next/link'
import ExecutiveOS from '@/components/executive/ExecutiveOS'
import { getExecutiveSnapshot, resolveExecutivePeriod } from '@/lib/executive/data'
import styles from '@/app/executive/executive.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Executive OS · Zafi',
  description: 'Scorecard executivo privado da Zafi.',
  robots: { index: false, follow: false },
}

type SearchParams = Record<string, string | string[] | undefined>
const one = (value: string | string[] | undefined) => typeof value === 'string' ? value.slice(0, 40) : undefined

export default async function ExecutivePage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const period = resolveExecutivePeriod({
    period: one(searchParams.period),
    from: one(searchParams.from),
    to: one(searchParams.to),
  })

  try {
    const data = await getExecutiveSnapshot(period)
    return <ExecutiveOS data={data} preset={period.preset} />
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'executive_os_snapshot_failed',
      error: error instanceof Error ? error.message : String(error),
    }))
    return (
      <main className={styles.shell}>
        <section className={styles.unavailablePage}>
          <p>ZAFI — EXECUTIVE OS</p>
          <h1>Os dados executivos estão temporariamente indisponíveis.</h1>
          <span>Nenhum número parcial ou fictício foi exibido. Tente novamente em alguns instantes.</span>
          <div><Link href="/executive">Tentar novamente</Link><Link href="/admin">Voltar ao Cockpit</Link></div>
        </section>
      </main>
    )
  }
}
