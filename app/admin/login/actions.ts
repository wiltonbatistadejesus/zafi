'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CEO_COOKIE, createCeoSession, isCeoAuthConfigured, validateCredentials } from '@/lib/ceo/auth'

export async function login(formData: FormData) {
  if (!isCeoAuthConfigured()) redirect('/admin/login?status=setup')

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!validateCredentials(email, password)) redirect('/admin/login?status=invalid')

  const session = createCeoSession(email)
  cookies().set(CEO_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    expires: session.expiresAt,
  })
  redirect('/admin')
}

export async function logout() {
  cookies().set(CEO_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/admin', maxAge: 0 })
  redirect('/admin/login')
}
