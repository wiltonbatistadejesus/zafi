export type PremiumAssetFormat = 'short_video' | 'carousel' | 'static_image'
export type PremiumNetwork = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin'

export interface BenchmarkReference {
  id: string
  title: string
  source: string
  url: string
  observedAt: string
  analysisStatus: 'selected' | 'analyzed' | 'rejected'
  transferablePrinciples: string[]
  forbiddenToCopy: string[]
}

export interface PremiumFormatVariant {
  format: PremiumAssetFormat
  status: 'planned' | 'draft' | 'qa_review' | 'pending_approval' | 'approved' | 'published'
  caption: string
  cta: string
  hashtags: string[]
  networks: PremiumNetwork[]
  assetId: string | null
}

export interface PremiumContentPackage {
  packageId: string
  oeCode: 'OE-013'
  themeId: string
  benchmarkReferences: BenchmarkReference[]
  benchmarkReportId: string | null
  creativeBriefId: string | null
  marketingDirectorDecision: 'pending' | 'approved' | 'changes_requested' | 'rejected'
  variants: PremiumFormatVariant[]
  brandMasterAssetId: string | null
  qaDecision: 'pending' | 'approved' | 'changes_requested' | 'rejected'
  complianceDecision: 'pending' | 'approved' | 'blocked'
  ceoDecision: 'pending' | 'approved' | 'changes_requested' | 'rejected'
}

export type PremiumPackageGate = {
  readyForProduction: boolean
  readyForPublication: boolean
  blockers: string[]
}

export function evaluatePremiumPackage(input: PremiumContentPackage): PremiumPackageGate {
  const blockers: string[] = []
  const analyzedReferences = input.benchmarkReferences.filter(
    (reference) => reference.analysisStatus === 'analyzed',
  )
  const expectedFormats: PremiumAssetFormat[] = ['short_video', 'carousel', 'static_image']

  if (input.benchmarkReferences.length < 3 || input.benchmarkReferences.length > 5) {
    blockers.push('benchmark_reference_count_must_be_between_3_and_5')
  }
  if (analyzedReferences.length < 3) blockers.push('at_least_3_benchmarks_must_be_analyzed')
  if (!input.benchmarkReportId) blockers.push('benchmark_report_missing')
  if (!input.creativeBriefId) blockers.push('creative_brief_missing')
  if (input.marketingDirectorDecision !== 'approved') {
    blockers.push('marketing_director_approval_missing')
  }
  if (!input.brandMasterAssetId) blockers.push('approved_brand_master_missing')

  for (const format of expectedFormats) {
    const variant = input.variants.find((candidate) => candidate.format === format)
    if (!variant) {
      blockers.push(`${format}_missing`)
      continue
    }
    if (!variant.caption.trim()) blockers.push(`${format}_caption_missing`)
    if (!variant.cta.trim()) blockers.push(`${format}_cta_missing`)
    if (variant.hashtags.length === 0) blockers.push(`${format}_hashtags_missing`)
    if (variant.networks.length === 0) blockers.push(`${format}_network_adaptation_missing`)
  }

  const productionBlockers = [...blockers]
  if (input.qaDecision !== 'approved') blockers.push('qa_approval_missing')
  if (input.complianceDecision !== 'approved') blockers.push('compliance_approval_missing')
  if (input.ceoDecision !== 'approved') blockers.push('ceo_approval_missing')
  if (input.variants.some((variant) => variant.status !== 'approved')) {
    blockers.push('all_formats_must_be_approved')
  }

  return {
    readyForProduction: productionBlockers.length === 0,
    readyForPublication: blockers.length === 0,
    blockers,
  }
}
