import { ZAFI_BRAND } from '@/lib/brand/identity'

export type BrandEvidence = {
  masterAssetId: string | null
  logoPath: string | null
  logoAltered: boolean
  colors: string[]
  primaryFont: string | null
}

export function evaluateBrandIdentity(evidence: BrandEvidence) {
  const blockers: string[] = []
  const approvedColors = new Set(Object.values(ZAFI_BRAND.colors))

  if (evidence.masterAssetId !== ZAFI_BRAND.masterAssetId) {
    blockers.push('unapproved_brand_master')
  }
  if (![ZAFI_BRAND.logo.svg, ZAFI_BRAND.logo.png].includes(
    evidence.logoPath as typeof ZAFI_BRAND.logo.svg | typeof ZAFI_BRAND.logo.png,
  )) {
    blockers.push('unapproved_logo_path')
  }
  if (evidence.logoAltered) blockers.push('logo_was_altered')
  if (evidence.primaryFont !== ZAFI_BRAND.typography.primary) {
    blockers.push('unapproved_primary_font')
  }
  if (evidence.colors.some((color) => !approvedColors.has(color as never))) {
    blockers.push('color_outside_official_palette')
  }

  return {
    approved: blockers.length === 0,
    brandVersion: ZAFI_BRAND.version,
    masterAssetId: ZAFI_BRAND.masterAssetId,
    blockers,
  }
}
