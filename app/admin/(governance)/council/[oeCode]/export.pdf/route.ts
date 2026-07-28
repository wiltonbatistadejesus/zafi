import { getAdminSession } from '@/lib/ceo/auth'
import { buildExecutiveOrderPdf } from '@/lib/council/pdf'
import { getExecutiveOrder } from '@/lib/council/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeCode(value: string) {
  const code = decodeURIComponent(value).trim().toUpperCase()
  return /^OE-[A-Z0-9.-]+$/.test(code) ? code : null
}

export async function GET(_request: Request, { params }: { params: { oeCode: string } }) {
  const session = getAdminSession()
  if (!session) {
    return Response.json({ error: 'Autenticação necessária.' }, {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  const oeCode = safeCode(params.oeCode)
  if (!oeCode) {
    return Response.json({ error: 'Ordem Executiva inválida.' }, {
      status: 400,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  try {
    const order = await getExecutiveOrder(oeCode)
    const pdf = await buildExecutiveOrderPdf(order)
    const fileName = `Zafi-${oeCode}-v${order.current.version}.pdf`
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Council PDF export failed', {
      oeCode,
      message: error instanceof Error ? error.message : 'unknown error',
    })
    return Response.json({ error: 'Não foi possível gerar o PDF desta ordem.' }, {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
}
