import 'server-only'

import type { PartnerId } from '@/lib/partners'

const AFFILIATE_LINKS: Partial<Record<PartnerId, string>> = {
  'acordo-certo': 'https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount',
  'super-sim': 'https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount',
  'financia-tudo': 'https://financiatudo.com.br/produtos/chave/cadc009df0f513e09ac0d9ec33f3bd5f74b70fd3',
  'juros-baixos': 'https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount',
  finanzero: 'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount',
  'consiga-mais': 'https://apretailer.com.br/click/6a3f408d2bfa813ab73f7f94/184986/359422/subaccount',
}

/** Preserva o link completo fornecido pela rede, sem reescrever seus parâmetros. */
export function getAffiliateLink(id: PartnerId): string | undefined {
  return AFFILIATE_LINKS[id]
}

