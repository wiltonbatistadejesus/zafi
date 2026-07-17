import { NextRequest, NextResponse } from 'next/server'
import { recordPartnerClick } from '@/lib/telemetry/server'
import type { AnalyticsConsent } from '@/lib/telemetry/types'

const PARTNERS: Record<string, { name: string; url: string }> = {
  'acordo-certo': { name: 'Acordo Certo', url: 'https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount' },
  'financia-tudo': { name: 'FinanciaTudo', url: 'https://financiatudo.com.br/produtos/chave/cadc009df0f513e09ac0d9ec33f3bd5f74b70fd3' },
  'super-sim': { name: 'SuperSim', url: 'https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount' },
  'juros-baixos': { name: 'Juros Baixos', url: 'https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount' },
  finanzero: { name: 'FinanZero', url: 'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount' },
  'bom-pra-credito': { name: 'Bom Pra Crédito', url: 'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount' },
  'consiga-mais': { name: 'ConsigMais', url: 'https://apretailer.com.br/click/6a3f408d2bfa813ab73f7f94/184986/359422/subaccount' },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const startedAt = Date.now()
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  const partner = PARTNERS[params.id]
  if (!partner) return NextResponse.redirect(new URL('/', request.url))

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
    partner_id: params.id,
    partner_name: partner.name,
    destination_url: partner.url,
    campaign: (query.get('campaign') || '').slice(0, 200),
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

  console.log(JSON.stringify({ level: 'info', message: 'partner_click_start', route: '/go/[id]', requestId, partnerId: params.id }))

  try {
    const persisted = await recordPartnerClick(base)
    console.log(JSON.stringify({
      level: 'info', message: 'partner_click_done', route: '/go/[id]', requestId,
      partnerId: params.id, eventId: persisted.partnerEventId, ms: Date.now() - startedAt,
    }))

    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ''
    const browserContext = JSON.stringify({
      destination: partner.url,
      measurementId,
      consent,
      sessionId,
      partnerId: params.id,
      partnerName: partner.name,
      partnerEventId: persisted.partnerEventId,
      affiliateEventId: persisted.affiliateEventId,
    }).replace(/</g, '\\u003c')

    const gaScript = consent === 'granted' && measurementId
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}"></script>`
      : ''
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redirecionando com segurança · Zafi</title>${gaScript}<style>body{margin:0;background:#07101f;color:#fff;font:16px system-ui;display:grid;min-height:100vh;place-items:center}.box{text-align:center;padding:28px}.dot{width:12px;height:12px;border-radius:50%;background:#3b82f6;margin:0 auto 18px;animation:p 1s infinite}@keyframes p{50%{opacity:.25}}p{color:#94a3b8}</style></head><body><main class="box"><div class="dot"></div><strong>Registramos sua escolha com segurança.</strong><p>Você será direcionado para ${partner.name}.</p></main><script>const ctx=${browserContext};let finished=false;async function audit(id,status,code,detail){try{await fetch('/api/telemetry/ga4-delivery',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({eventId:id,status:status,responseCode:code,detail:detail})})}catch{}}async function complete(status,code,detail){if(finished)return;finished=true;await Promise.all([audit(ctx.partnerEventId,status,code,detail),audit(ctx.affiliateEventId,status,code,detail)]);location.replace(ctx.destination)}if(ctx.consent!=='granted'){complete('skipped_no_consent',null,'Consentimento analítico não concedido.')}else if(!ctx.measurementId){complete('not_configured',null,'Measurement ID ausente.')}else{window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',ctx.measurementId,{send_page_view:false,anonymize_ip:true});let sent=0;const callback=()=>{sent+=1;if(sent===2)complete('accepted',204,'Callbacks de envio da tag GA4 executados.')} ;const common={session_id:ctx.sessionId,partner_id:ctx.partnerId,partner_name:ctx.partnerName,event_callback:callback,event_timeout:1500};gtag('event','partner_clicked',common);gtag('event','affiliate_click',common);setTimeout(()=>complete('failed',null,'Timeout aguardando callbacks da tag GA4.'),1800)}</script></body></html>`

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
      partnerId: params.id, error: error instanceof Error ? error.message : String(error), ms: Date.now() - startedAt,
    }))
    return NextResponse.json({
      error: 'Não foi possível registrar o clique com segurança. Nenhum redirecionamento foi realizado. Tente novamente.',
    }, { status: 503 })
  }
}
