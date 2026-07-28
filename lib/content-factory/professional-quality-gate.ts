import type { ProfessionalVideoEvidence } from '@/lib/content-factory/types'

export type ProfessionalQualityGateResult = {
  approvedForPublication: boolean
  blockers: string[]
  warnings: string[]
}

export function evaluateProfessionalVideo(
  evidence: ProfessionalVideoEvidence,
): ProfessionalQualityGateResult {
  const blockers: string[] = []
  const warnings: string[] = []
  const longestScene = Math.max(...evidence.editing.sceneDurationsMs, 0)

  if (!evidence.humanAvatar.present) blockers.push('human_avatar_missing')
  if (!evidence.humanAvatar.eyeContactReviewed) blockers.push('eye_contact_not_reviewed')
  if (!evidence.humanAvatar.naturalExpressionsReviewed) blockers.push('expressions_not_reviewed')
  if (evidence.narration.naturalnessScore < 90) blockers.push('narration_below_professional_threshold')
  if (!evidence.narration.ptBrReviewed) blockers.push('pt_br_voice_not_reviewed')
  if (longestScene > 3000) blockers.push('scene_longer_than_3_seconds')
  if (evidence.editing.bRollClips < 3) blockers.push('insufficient_b_roll')
  if (evidence.editing.motionGraphics < 2) blockers.push('insufficient_motion_graphics')
  if (evidence.editing.dynamicZooms < 2) blockers.push('insufficient_dynamic_zooms')
  if (!evidence.captions.dynamic || !evidence.captions.synchronized) {
    blockers.push('dynamic_captions_not_synchronized')
  }
  if (!evidence.captions.contrastReviewed) blockers.push('caption_contrast_not_reviewed')
  if (!evidence.product.realZafiInterfaceShown) blockers.push('real_zafi_interface_missing')
  if (!evidence.audio.musicPresent) blockers.push('music_track_missing')
  if (evidence.review.qualityScore < 90) blockers.push('quality_score_below_90')
  if (evidence.review.ceoDecision !== 'approved') blockers.push('ceo_approval_missing')

  if (
    evidence.audio.musicLoudnessLufs != null &&
    evidence.audio.narrationLoudnessLufs != null &&
    evidence.audio.musicLoudnessLufs > evidence.audio.narrationLoudnessLufs - 10
  ) {
    warnings.push('music_may_compete_with_narration')
  }

  return {
    approvedForPublication: blockers.length === 0,
    blockers,
    warnings,
  }
}
