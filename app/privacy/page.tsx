// -----------------------------------------------
// Privacy Policy page (LGPD compliance)
// -----------------------------------------------
import type { Metadata } from 'next'
import Logo from '@/components/Logo'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade · Zafi',
  description: 'Entenda como a Zafi coleta, usa e protege seus dados pessoais conforme a LGPD.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#e9f0ff' }}>
      {/* Header */}
      <header className="bg-white border-b border-zafi-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <span className="text-zafi-secondary text-sm">Política de Privacidade</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-zafi-border p-8">
          <h1 className="text-2xl font-extrabold text-zafi-text mb-2">
            Política de Privacidade
          </h1>
          <p className="text-zafi-secondary text-sm mb-8">
            Última atualização: junho de 2025
          </p>

          <Section title="1. Quem somos">
            <p>
              A <strong>Zafi</strong> é uma plataforma digital gratuita de organização e planejamento financeiro para pessoas com dívidas. Operamos como facilitadores: ajudamos você a entender sua situação e conectamos você a parceiros de renegociação.
            </p>
          </Section>

          <Section title="2. Dados coletados">
            <p>Coletamos apenas os dados necessários para prestar o serviço:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zafi-secondary">
              <li><strong className="text-zafi-text">Nome</strong> — para personalizar sua experiência</li>
              <li><strong className="text-zafi-text">E-mail</strong> — para eventual contato e suporte</li>
              <li><strong className="text-zafi-text">Renda e valor de dívidas</strong> — usados localmente no navegador para as simulações; o resumo (total da dívida, estimativa de parcelas) é salvo para fins de análise interna</li>
            </ul>
            <p className="mt-2">
              <strong>Não coletamos</strong> dados bancários, CPF, senha ou qualquer informação sensível de identificação financeira.
            </p>
          </Section>

          <Section title="3. Como usamos seus dados">
            <ul className="list-disc list-inside space-y-1 text-zafi-secondary">
              <li>Personalizar o plano de saída de dívidas apresentado</li>
              <li>Medir o impacto do serviço (quantas pessoas foram ajudadas)</li>
              <li>Enviar comunicações relevantes sobre seu planejamento (apenas se você consentir)</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </Section>

          <Section title="4. Compartilhamento de dados">
            <p>
              <strong>Não vendemos seus dados.</strong> Podemos compartilhá-los apenas:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zafi-secondary">
              <li>Com parceiros de renegociação, <strong>somente se você clicar no botão de acesso</strong> ao parceiro e desde que você concorde</li>
              <li>Com prestadores de serviço técnico (ex: Supabase para armazenamento), sob contrato de confidencialidade</li>
              <li>Por exigência legal ou decisão judicial</li>
            </ul>
          </Section>

          <Section title="5. Base legal (LGPD — Lei 13.709/2018)">
            <p>
              Processamos seus dados com base em:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zafi-secondary">
              <li><strong className="text-zafi-text">Consentimento</strong> — ao preencher o formulário, você concorda com esta política</li>
              <li><strong className="text-zafi-text">Legítimo interesse</strong> — para melhoria do serviço e análise agregada</li>
            </ul>
          </Section>

          <Section title="6. Seus direitos">
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zafi-secondary">
              <li>Confirmar a existência de tratamento de seus dados</li>
              <li>Acessar seus dados</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, envie um e-mail para{' '}
              <a href="mailto:privacidade@zafi.app" className="text-zafi-blue underline">
                privacidade@zafi.app
              </a>
              . Respondemos em até 15 dias úteis.
            </p>
          </Section>

          <Section title="7. Retenção de dados">
            <p>
              Mantemos seus dados pelo prazo necessário para prestação do serviço ou cumprimento de obrigação legal — no máximo 5 anos. Após isso, são anonimizados ou excluídos.
            </p>
          </Section>

          <Section title="8. Segurança">
            <p>
              Utilizamos criptografia em trânsito (HTTPS) e em repouso. Nosso banco de dados (Supabase) é protegido por controles de acesso por linha (Row-Level Security). Apenas a equipe autorizada tem acesso aos dados brutos.
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>
              A Zafi usa apenas cookies essenciais de sessão. Não utilizamos cookies de rastreamento ou publicidade de terceiros.
            </p>
          </Section>

          <Section title="10. Contato">
            <p>
              Encarregado de Dados (DPO):{' '}
              <a href="mailto:privacidade@zafi.app" className="text-zafi-blue underline">
                privacidade@zafi.app
              </a>
            </p>
          </Section>
        </div>
      </main>

      {/* Back link */}
      <div className="text-center pb-8">
        <Link href="/" className="text-zafi-blue text-sm underline">
          ← Voltar para o início
        </Link>
      </div>
    </div>
  )
}

// ── Helper: section wrapper ────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-zafi-text mb-2 border-b border-zafi-border pb-1">
        {title}
      </h2>
      <div className="text-zafi-secondary text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
