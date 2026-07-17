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
  'juros-baixos': { id: 'juros-baixos', name: 'Juros Baixos', campaignName: 'Juros Baixos — Empréstimo pessoal', network: 'actionpay', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation', note: 'Destino validado; meta e remuneração ainda dependem da tela oficial da campanha.' },
  finanzero: { id: 'finanzero', name: 'FinanZero', campaignName: 'FinanZero — Empréstimos', network: 'actionpay', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation' },
  'bom-pra-credito': { id: 'bom-pra-credito', name: 'Bom Pra Crédito', campaignName: 'Bom Pra Crédito — Actionpay ref. 185636', network: 'actionpay', active: true, pages: ['Resultado da análise (/)'], remunerationModel: 'pending_confirmation', note: 'Link oficial informado pelo afiliado em 17/07/2026; remuneração e meta seguem pendentes de confirmação.' },
  'consiga-mais': { id: 'consiga-mais', name: 'ConsigMais', campaignName: 'ConsigMais — FGTS', network: 'actionpay', active: false, pages: [], remunerationModel: 'pending_confirmation', note: 'Desativado: a campanha resolve para o anunciante correto, mas o destino retornou ERR_HTTP2_PROTOCOL_ERROR no teste controlado.' },
}

export function getPartner(id: string): PartnerDefinition | undefined {
  return PARTNERS[id as PartnerId]
}
