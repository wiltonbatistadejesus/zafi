'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CEO_COOKIE, createAdminSession, isAdminAuthConfigured, validateAdminCredentials } from '@/lib/ceo/auth'

export async function login(formData: FormData) {
  if (!isAdminAuthConfigured()) redirect('/admin/login?status=setup')

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const account = validateAdminCredentials(email, password)
  if (!account) redirect('/admin/login?status=invalid')

  const session = createAdminSession(account)
  cookies().set(CEO_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    expires: session.expiresAt,
  })
  redirect(account.role === 'ceo' ? '/admin' : '/admin/council')
}

export async function logout() {
  cookies().set(CEO_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/admin', maxAge: 0 })
  redirect('/admin/login')
}
