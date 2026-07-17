import type { Metadata } from 'next'
import TelemetryTestPanel from '@/components/ceo/TelemetryTestPanel'

export const metadata: Metadata = { title: 'Validação de Telemetria · Zafi', robots: { index: false, follow: false } }

export default function TelemetryTestPage() {
  return <TelemetryTestPanel />
}
