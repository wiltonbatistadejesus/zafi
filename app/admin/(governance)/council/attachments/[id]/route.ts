import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/ceo/auth'
import { getExecutiveAttachment } from '@/lib/council/server'
import { signedCouncilFileUrl } from '@/lib/council/storage'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!getAdminSession()) return NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_SITE_URL || 'https://meuzafi.com.br'))
  const attachment = await getExecutiveAttachment(params.id)
  if (attachment.external_url) return NextResponse.redirect(attachment.external_url)
  if (!attachment.storage_path) {
    return new NextResponse(attachment.inline_content ?? '', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${attachment.file_name.replace(/[^a-zA-Z0-9._-]/g, '-')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  }
  return NextResponse.redirect(await signedCouncilFileUrl(attachment.storage_path))
}
