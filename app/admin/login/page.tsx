import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { hasValidCeoSession, isCeoAuthConfigured } from '@/lib/ceo/auth'
import { login } from './actions'
import styles from '../cockpit.module.css'

export const metadata: Metadata = { title: 'Acesso executivo · Zafi', robots: { index: false, follow: false } }

export default function AdminLogin({ searchParams }: { searchParams: { status?: string } }) {
  if (hasValidCeoSession()) redirect('/admin')
  const setup = searchParams.status === 'setup' || !isCeoAuthConfigured()
  const invalid = searchParams.status === 'invalid'

  return (
    <main className={styles.loginShell}>
      <div className={styles.loginAtmosphere} />
      <section className={styles.loginCard}>
        <div className={styles.loginBrand}><span>zafi</span><i>CEO</i></div>
        <div className={styles.loginIntro}>
          <p className={styles.eyebrow}>Cockpit executivo</p>
          <h1>Decida com clareza.</h1>
          <p>Um único lugar para acompanhar crescimento, Google, conteúdo, receita e prioridades.</p>
        </div>

        {setup ? (
          <div className={styles.loginNotice} role="status">
            <strong>Acesso aguardando configuração</strong>
            <span>As credenciais seguras precisam ser ativadas no ambiente de produção.</span>
          </div>
        ) : (
          <form action={login} className={styles.loginForm}>
            <label>E-mail<input name="email" type="email" autoComplete="username" required autoFocus /></label>
            <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
            {invalid && <p className={styles.formError} role="alert">E-mail ou senha incorretos.</p>}
            <button type="submit">Entrar no Cockpit <span>→</span></button>
          </form>
        )}
        <p className={styles.loginSecurity}>Acesso restrito · Sessão protegida · 12 horas</p>
      </section>
    </main>
  )
}
