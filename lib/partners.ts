export type PartnerId =
  | 'acordo-certo'
  | 'super-sim'
  | 'financia-tudo'
  | 'juros-baixos'
  | 'finanzero'
  | 'bom-pra-credito'
  | 'consiga-mais'

export type PartnerDefinition = {
  id: PartnerId
  name: string
  campaignName: string
  network: 'actionpay' | 'direct'
  active: boolean
  pages: string[]
  remunerationModel: 'pending_confirmation'
  note?: string
}

export const PARTNERS: Record<PartnerId, PartnerDefinition> = {
  'acordo-certo': { id: 'acordo-certo', name: 'Acordo Certo', campaignName: 'Actionpay ref. 187558 — nome oficial pendente', network: 'actionpay', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation', note: 'A vitrine pública possui mais de uma campanha Acordo Certo.' },
  'super-sim': { id: 'super-sim', name: 'SuperSim', campaignName: 'SuperSim — Empréstimo Pessoal', network: 'actionpay', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation' },
  'financia-tudo': { id: 'financia-tudo', name: 'FinanciaTudo', campaignName: 'Produtos FinanciaTudo — link direto', network: 'direct', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation' },
  'juros-baixos': { id: 'juros-baixos', name: 'Juros Baixos', campaignName: 'Actionpay ref. 179945 — nome oficial pendente', network: 'actionpay', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation', note: 'A vitrine pública possui mais de uma campanha Juros Baixos.' },
  finanzero: { id: 'finanzero', name: 'FinanZero', campaignName: 'FinanZero — Empréstimos', network: 'actionpay', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation' },
  'bom-pra-credito': { id: 'bom-pra-credito', name: 'Bom Pra Crédito', campaignName: 'Não validada — link duplicado da FinanZero', network: 'actionpay', active: false, pages: [], remunerationModel: 'pending_confirmation', note: 'Desativado preventivamente até a Actionpay fornecer o link oficial.' },
  'consiga-mais': { id: 'consiga-mais', name: 'ConsigMais', campaignName: 'Actionpay ref. 184986 — nome oficial pendente', network: 'actionpay', active: true, pages: [], remunerationModel: 'pending_confirmation', note: 'Rota cadastrada, mas o parceiro não aparece atualmente na interface.' },
}

export function getPartner(id: string): PartnerDefinition | undefined {
  return PARTNERS[id as PartnerId]
}

