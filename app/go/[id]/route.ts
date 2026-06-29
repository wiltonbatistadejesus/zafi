// -----------------------------------------------
// /go/[id] — Affiliate redirect + click tracking
// -----------------------------------------------
// Usage: <a href="/go/acordo-certo"> instead of the raw affiliate URL.
// Benefits:
//   • Hides ugly affiliate URLs
//   • Tracks every click server-side (Vercel logs + optional Supabase)
//   • Easy to update URLs in one place
// -----------------------------------------------
import { NextRequest, NextResponse } from 'next/server'

// ── Partner map ─────────────────────────────────
const PARTNERS: Record<string, string> = {
  'acordo-certo':    'https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount',
  'santander-acordo':'https://apretailer.com.br/click/6a3f408e2bfa813ab73f7f95/187700/359422/subaccount',
  'super-sim':       'https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount',
  'juros-baixos':    'https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount',
  'finanzero':       'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount',
  'bom-pra-credito': 'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount',
  'consiga-mais':    'https://apretailer.com.br/click/6a3f408d2bfa813ab73f7f94/184986/359422/subaccount',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const destination = PARTNERS[id]

  if (!destination) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ── Log the click (visible in Vercel Function Logs) ──
  const ref = request.headers.get('referer') ?? 'direct'
  const ua  = request.headers.get('user-agent') ?? ''
  console.log(JSON.stringify({
    event:   'affiliate_click',
    partner: id,
    ref,
    ua:      ua.slice(0, 120),
    ts:      new Date().toISOString(),
  }))

  // ── Optional: save to Supabase ───────────────────────
  // Uncomment and add SUPABASE_SERVICE_ROLE_KEY to env vars to enable:
  //
  // const { createClient } = await import('@supabase/supabase-js')
  // const supabase = createClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.SUPABASE_SERVICE_ROLE_KEY!
  // )
  // await supabase.from('affiliate_clicks').insert({ partner: id, ref, ts: new Date() })

  // Redirect to affiliate URL (301 = permanent, cached by browser)
  return NextResponse.redirect(destination, { status: 302 })
}
