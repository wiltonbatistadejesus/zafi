'use client'

import Script from 'next/script'
import { useCallback, useEffect, useState } from 'react'
import { trackTelemetryEvent } from '@/lib/telemetry/client'
import { saveAnalyticsConsent } from '@/lib/profile/client'
import { PROFILE_POLICY_VERSION } from '@/lib/profile/schema'

const CONSENT_KEY = 'zafi_analytics_consent'
type Consent = 'granted' | 'denied' | null

export default function AnalyticsIntegrations() {
  const [consent, setConsent] = useState<Consent>(null)
  const [ready, setReady] = useState(false)
  const [isInternalPage, setIsInternalPage] = useState(false)
  const [gaInitialized, setGaInitialized] = useState(false)
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
      if (!internalPage) {
        const syncKey = `zafi_consent_synced:${PROFILE_POLICY_VERSION}:${stored}`
        if (!window.sessionStorage.getItem(syncKey)) {
          saveAnalyticsConsent(stored)
            .then(() => window.sessionStorage.setItem(syncKey, 'true'))
            .catch((error) => console.error('Consent sync failed:', error))
            .finally(trackPageViewOnce)
        } else {
          trackPageViewOnce()
        }
      }
    }
    setReady(true)
  }, [trackPageViewOnce])

  useEffect(() => {
    if (consent !== 'granted' || !gaId || isInternalPage) return
    const gaWindow = window as typeof window & {
      dataLayer?: unknown[]
      gtag?: (...args: unknown[]) => void
      __zafiGaLoaded?: boolean
    }
    gaWindow.dataLayer = gaWindow.dataLayer || []
    gaWindow.gtag = gaWindow.gtag || ((...args: unknown[]) => gaWindow.dataLayer?.push(args))
    gaWindow.__zafiGaLoaded = false
    gaWindow.gtag('js', new Date())
    gaWindow.gtag('config', gaId, { anonymize_ip: true })
    setGaInitialized(true)
  }, [consent, gaId, isInternalPage])

  function markGaLoaded() {
    const gaWindow = window as typeof window & { __zafiGaLoaded?: boolean }
    gaWindow.__zafiGaLoaded = true
  }

  async function chooseConsent(value: Exclude<Consent, null>) {
    window.localStorage.setItem(CONSENT_KEY, value)
    setConsent(value)
    try {
      await saveAnalyticsConsent(value)
      window.sessionStorage.setItem(`zafi_consent_synced:${PROFILE_POLICY_VERSION}:${value}`, 'true')
    } catch (error) {
      console.error('Consent persistence failed:', error)
    } finally {
      window.setTimeout(trackPageViewOnce, 0)
    }
  }

  if (!hasAnalytics || isInternalPage) return null

  return (
    <>
      {consent === 'granted' && gaId && gaInitialized && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="afterInteractive"
          onLoad={markGaLoaded}
          onReady={markGaLoaded}
        />
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
