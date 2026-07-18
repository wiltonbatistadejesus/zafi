export const PROFILE_POLICY_VERSION = '2026-07-oe002'

export type FieldPurpose =
  | 'personalização'
  | 'relacionamento'
  | 'monetização'
  | 'analytics'
  | 'conformidade'

export type ProfileBlock =
  | 'identidade'
  | 'consentimentos'
  | 'contexto_financeiro'
  | 'jornada'
  | 'perfil_inteligente'

export type ProfileFieldDefinition = {
  block: ProfileBlock
  purposes: FieldPurpose[]
  collected: 'progressive' | 'automatic' | 'future_calculated'
  description: string
}

/** Catálogo oficial: nenhum campo do Perfil Inteligente existe sem finalidade explícita. */
export const PROFILE_FIELD_CATALOG = {
  profileId: { block: 'identidade', purposes: ['conformidade'], collected: 'automatic', description: 'Chave interna para segregação e auditoria.' },
  visitorId: { block: 'identidade', purposes: ['analytics', 'conformidade'], collected: 'automatic', description: 'Vincula a jornada sem exigir login.' },
  sessionId: { block: 'jornada', purposes: ['analytics', 'conformidade'], collected: 'automatic', description: 'Agrupa eventos da mesma visita.' },
  profileStatus: { block: 'identidade', purposes: ['conformidade'], collected: 'automatic', description: 'Controla ciclo de vida, anonimização e exclusão futura.' },
  fullName: { block: 'identidade', purposes: ['personalização', 'relacionamento'], collected: 'progressive', description: 'Personaliza o plano e identifica o contato.' },
  email: { block: 'identidade', purposes: ['relacionamento'], collected: 'progressive', description: 'Permite continuidade da jornada.' },
  phone: { block: 'identidade', purposes: ['relacionamento'], collected: 'progressive', description: 'Canal futuro; não é solicitado nesta fase.' },
  locale: { block: 'identidade', purposes: ['personalização'], collected: 'automatic', description: 'Define idioma e formatos.' },
  analyticsConsent: { block: 'consentimentos', purposes: ['analytics', 'conformidade'], collected: 'progressive', description: 'Registra a escolha no banner analítico.' },
  relationshipConsent: { block: 'consentimentos', purposes: ['relacionamento', 'conformidade'], collected: 'progressive', description: 'Autoriza ou recusa contato comercial.' },
  consentPurpose: { block: 'consentimentos', purposes: ['conformidade'], collected: 'automatic', description: 'Separa cada autorização por finalidade.' },
  consentStatus: { block: 'consentimentos', purposes: ['conformidade'], collected: 'progressive', description: 'Registra concessão, recusa ou retirada.' },
  consentPolicyVersion: { block: 'consentimentos', purposes: ['conformidade'], collected: 'automatic', description: 'Prova qual aviso foi apresentado.' },
  consentSource: { block: 'consentimentos', purposes: ['conformidade'], collected: 'automatic', description: 'Identifica onde a decisão ocorreu.' },
  consentCapturedAt: { block: 'consentimentos', purposes: ['conformidade'], collected: 'automatic', description: 'Data a decisão para auditoria.' },
  supersedesConsentId: { block: 'consentimentos', purposes: ['conformidade'], collected: 'automatic', description: 'Preserva a cadeia de mudanças sem sobrescrita.' },
  totalDebt: { block: 'contexto_financeiro', purposes: ['personalização'], collected: 'progressive', description: 'Base do diagnóstico financeiro.' },
  monthlyIncome: { block: 'contexto_financeiro', purposes: ['personalização'], collected: 'progressive', description: 'Estima capacidade saudável de pagamento.' },
  debtCount: { block: 'contexto_financeiro', purposes: ['personalização', 'analytics'], collected: 'progressive', description: 'Dimensiona a complexidade do caso.' },
  debtTypes: { block: 'contexto_financeiro', purposes: ['personalização', 'monetização'], collected: 'progressive', description: 'Ajusta prioridades e aderência de soluções.' },
  creditors: { block: 'contexto_financeiro', purposes: ['personalização', 'monetização'], collected: 'progressive', description: 'Ajusta orientação e aderência de parceiros.' },
  estimatedMonths: { block: 'contexto_financeiro', purposes: ['personalização'], collected: 'automatic', description: 'Resume a simulação do plano de saída.' },
  journeyEvent: { block: 'jornada', purposes: ['analytics', 'personalização'], collected: 'automatic', description: 'Registra etapas reais geradas pelo sistema.' },
  journeySource: { block: 'jornada', purposes: ['analytics', 'conformidade'], collected: 'automatic', description: 'Mantém rastreabilidade até o evento original.' },
  journeyOccurredAt: { block: 'jornada', purposes: ['analytics', 'conformidade'], collected: 'automatic', description: 'Ordena a sequência real da jornada.' },
  journeyPage: { block: 'jornada', purposes: ['analytics', 'monetização'], collected: 'automatic', description: 'Relaciona conteúdo e origem a resultados.' },
  journeyMetadata: { block: 'jornada', purposes: ['analytics', 'monetização'], collected: 'automatic', description: 'Contexto mínimo do evento, sem identidade pessoal.' },
  scoreZafi: { block: 'perfil_inteligente', purposes: ['personalização'], collected: 'future_calculated', description: 'Atributo futuro; permanece nulo nesta fase.' },
  conversionProbability: { block: 'perfil_inteligente', purposes: ['monetização'], collected: 'future_calculated', description: 'Atributo futuro; permanece nulo nesta fase.' },
  interests: { block: 'perfil_inteligente', purposes: ['personalização'], collected: 'future_calculated', description: 'Atributo futuro; não é inferido nesta fase.' },
  calculationVersion: { block: 'perfil_inteligente', purposes: ['conformidade', 'analytics'], collected: 'future_calculated', description: 'Permitirá reproduzir e auditar um cálculo futuro.' },
  calculatedAt: { block: 'perfil_inteligente', purposes: ['conformidade'], collected: 'future_calculated', description: 'Dataria a produção de um atributo futuro.' },
  sourceSnapshotVersion: { block: 'perfil_inteligente', purposes: ['conformidade'], collected: 'future_calculated', description: 'Referenciará os fatos usados pelo cálculo futuro.' },
} as const satisfies Record<string, ProfileFieldDefinition>

export type ProfileProgressRequest =
  | {
      stage: 'financial_context'
      visitorId: string
      sessionId: string
      totalDebt: number
      debtCount: number
      debtTypes: string[]
      creditors: string[]
    }
  | {
      stage: 'identity_and_income'
      visitorId: string
      sessionId: string
      fullName: string
      email: string
      monthlyIncome: number
      estimatedMonths: number | null
      contactConsent: boolean
    }
