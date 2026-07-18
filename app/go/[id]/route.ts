import { NextRequest, NextResponse } from 'next/server'
import { getTrackedAffiliateLink } from '@/lib/partner-links.server'
import { getPartner, type PartnerDefinition } from '@/lib/partners'
import { recordAffiliateClick, recordPartnerClick } from '@/lib/telemetry/server'
import type { AnalyticsConsent } from '@/lib/telemetry/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const startedAt = Date.now()
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  let partner: PartnerDefinition | undefined
  try {
    partner = await getPartner(params.id)
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', message: 'atlas_partner_lookup_failed', route: '/go/[id]', requestId,
      partnerId: params.id, error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json({ error: 'Catálogo de parceiros temporariamente indisponível.' }, { status: 503 })
  }
  if (!partner) return NextResponse.redirect(new URL('/', request.url))

  const affiliateClickId = crypto.randomUUID()
  const destination = getTrackedAffiliateLink(partner, affiliateClickId)
  if (!partner.active) {
    return NextResponse.json({ error: 'Parceiro temporariamente indisponível.' }, { status: 410 })
  }

  const query = request.nextUrl.searchParams
  const sessionId = query.get('sid') ?? ''
  const visitorId = query.get('vid') ?? ''
  const consentValue = query.get('consent')
  const consent: AnalyticsConsent = consentValue === 'granted' || consentValue === 'denied' ? consentValue : 'unknown'

  if (!UUID.test(sessionId) || !UUID.test(visitorId)) {
    return NextResponse.json({ error: 'Contexto de telemetria ausente. Volte à Zafi e tente novamente.' }, { status: 400 })
  }

  const sourcePage = (query.get('page') || request.headers.get('referer') || '/').slice(0, 2048)
  const source = (query.get('source') || 'direct').slice(0, 200)
  const payload = {
    partner_id: partner.id,
    partner_name: partner.name,
    campaign_id: partner.campaignId,
    partner_campaign: partner.campaignName,
    affiliate_network: partner.network,
    affiliate_click_id: affiliateClickId,
    destination_url: destination,
    traffic_campaign: (query.get('campaign') || '').slice(0, 200),
  }
  const base = {
    sessionId,
    visitorId,
    occurredAt: new Date().toISOString(),
    sourcePage,
    source,
    consent,
    device: { user_agent: (request.headers.get('user-agent') || '').slice(0, 500) },
    payload,
    schemaVersion: 1,
    requestId,
  }

  console.log(JSON.stringify({ level: 'info', message: 'partner_click_start', route: '/go/[id]', requestId, partnerId: partner.id }))

  try {
    const persisted = await recordPartnerClick(base)
    await recordAffiliateClick({
      clickId: affiliateClickId,
      telemetryEventId: persisted.partnerEventId,
      partner,
      sessionId,
      visitorId,
      sourcePage,
      occurredAt: base.occurredAt,
    })
    console.log(JSON.stringify({
      level: 'info', message: 'partner_click_done', route: '/go/[id]', requestId,
      partnerId: partner.id, affiliateClickId, eventId: persisted.partnerEventId, ms: Date.now() - startedAt,
    }))

    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ''
    const browserContext = JSON.stringify({
      destination,
      measurementId,
      consent,
      sessionId,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerCampaign: partner.campaignName,
      affiliateNetwork: partner.network,
      debugMode: source === 'audit',
      partnerEventId: persisted.partnerEventId,
      affiliateEventId: persisted.affiliateEventId,
    }).replace(/</g, '\\u003c')

    const gaScript = consent === 'granted' && measurementId
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}"></script>`
      : ''
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redirecionando com segurança · Zafi</title>${gaScript}<style>body{margin:0;background:#07101f;color:#fff;font:16px system-ui;display:grid;min-height:100vh;place-items:center}.box{text-align:center;padding:28px}.dot{width:12px;height:12px;border-radius:50%;background:#3b82f6;margin:0 auto 18px;animation:p 1s infinite}@keyframes p{50%{opacity:.25}}p{color:#94a3b8}</style></head><body><main class="box"><div class="dot"></div><strong>Registramos sua escolha com segurança.</strong><p>Você será direcionado para ${partner.name}.</p></main><script>const ctx=${browserContext};let finished=false;async function audit(id,status,code,detail){try{await fetch('/api/telemetry/ga4-delivery',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({eventId:id,status:status,responseCode:code,detail:detail})})}catch{}}async function complete(status,code,detail){if(finished)return;finished=true;await Promise.all([audit(ctx.partnerEventId,status,code,detail),audit(ctx.affiliateEventId,status,code,detail)]);location.replace(ctx.destination)}if(ctx.consent!=='granted'){complete('skipped_no_consent',null,'Consentimento analítico não concedido.')}else if(!ctx.measurementId){complete('not_configured',null,'Measurement ID ausente.')}else{window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',ctx.measurementId,{send_page_view:false,anonymize_ip:true});let sent=0;const callback=()=>{sent+=1;if(sent===2)complete('accepted',204,'Callbacks de envio da tag GA4 executados.')} ;const common={zafi_session_id:ctx.sessionId,partner_id:ctx.partnerId,partner_name:ctx.partnerName,partner_campaign:ctx.partnerCampaign,affiliate_network:ctx.affiliateNetwork,engagement_time_msec:1,event_callback:callback,event_timeout:1500};if(ctx.debugMode)common.debug_mode=true;gtag('event','partner_clicked',common);gtag('event','affiliate_click',common);setTimeout(()=>complete('failed',null,'Timeout aguardando callbacks da tag GA4.'),1800)}</script></body></html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
      },
    })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error', message: 'partner_click_failed', route: '/go/[id]', requestId,
      partnerId: partner.id, error: error instanceof Error ? error.message : String(error), ms: Date.now() - startedAt,
    }))
    return NextResponse.json({
      error: 'Não foi possível registrar o clique com segurança. Nenhum redirecionamento foi realizado. Tente novamente.',
    }, { status: 503 })
  }
}
