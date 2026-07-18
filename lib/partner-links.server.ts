import 'server-only'

import type { PartnerDefinition } from '@/lib/partners'

/** Aplica somente a estratégia parametrizada no Atlas, preservando o link oficial completo. */
export function getTrackedAffiliateLink(partner: PartnerDefinition, clickId: string): string {
  if (partner.clickIdStrategy === 'replace_subaccount_segment') {
    return partner.destinationUrl.replace(/\/subaccount\/?$/, `/${encodeURIComponent(clickId)}`)
  }
  if (partner.clickIdStrategy === 'query_parameter') {
    const destination = new URL(partner.destinationUrl)
    destination.searchParams.set('click_id', clickId)
    return destination.toString()
  }
  return partner.destinationUrl
}
