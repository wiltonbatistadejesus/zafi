'use client'

import Script from 'next/script'
import { useCallback, useEffect, useState } from 'react'
import { trackTelemetryEvent } from '@/lib/telemetry/client'

const CONSENT_KEY = 'zafi_analytics_consent'
type Consent = 'granted' | 'denied' | null

export default function AnalyticsIntegrations() {
  const [consent, setConsent] = useState<Consent>(null)
  const [ready, setReady] = useState(false)
  const [isInternalPage, setIsInternalPage] = useState(false)
  const rawGaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? ''
  const rawClarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? ''
  const gaId = /^G-[A-Z0-9]+$/.test(rawGaId) ? rawGaId : ''
  const clarityId = /^[a-z0-9]+$/i.test(rawClarityId) ? rawClarityId : ''
  const hasAnalytics = Boolean(gaId || clarityId)

  const trackPageViewOnce = useCallback(() => {
    if (window.location.pathname.startsWith('/admin')) return
    const key = `zafi_page_view:${window.location.pathname}${window.location.search}`
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, 'pending')
    trackTelemetryEvent('page_view', { title: document.title })
      .then(() => window.sessionStorage.setItem(key, 'persisted'))
      .catch((error) => {
        window.sessionStorage.removeItem(key)
        console.error('Page view telemetry failed:', error)
      })
  }, [])

  useEffect(() => {
    const internalPage = window.location.pathname.startsWith('/admin')
    setIsInternalPage(internalPage)
    const stored = window.localStorage.getItem(CONSENT_KEY)
    if (stored === 'granted' || stored === 'denied') {
      setConsent(stored)
      if (!internalPage) trackPageViewOnce()
    }
    setReady(true)
  }, [trackPageViewOnce])

  function chooseConsent(value: Exclude<Consent, null>) {
    window.localStorage.setItem(CONSENT_KEY, value)
    setConsent(value)
    window.setTimeout(trackPageViewOnce, 0)
  }

  if (!hasAnalytics || isInternalPage) return null

  return (
    <>
      {consent === 'granted' && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="zafi-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {consent === 'granted' && clarityId && (
        <Script id="zafi-microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script','${clarityId}');`}
        </Script>
      )}

      {ready && consent === null && (
        <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" aria-label="Preferências de análise">
          <h2 className="text-base font-extrabold text-slate-950">Ajude a Zafi a melhorar</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Podemos usar Google Analytics e Microsoft Clarity para entender, de forma agregada, como o site é utilizado. Você pode recusar sem perder nenhuma funcionalidade.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => chooseConsent('granted')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
              Aceitar análise
            </button>
            <button type="button" onClick={() => chooseConsent('denied')} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Somente essenciais
            </button>
          </div>
        </aside>
      )}
    </>
  )
}
