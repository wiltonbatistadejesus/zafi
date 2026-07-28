export type OE015PresenterSource =
  | 'real_human'
  | 'verified_digital_twin'
  | 'photo_avatar'

export type OE015BlindReview = {
  reviewers: number
  perceivedAsAi: number
  approvedByCeo: boolean
}

export type OE015ArtifactEvidence = {
  presenterSource: OE015PresenterSource
  hasNaturalEyeContact: boolean
  hasNaturalExpressions: boolean
  voiceSource: 'on_camera_human' | 'elevenlabs' | 'other_tts'
  voiceSampleRateHz: number
  voiceReviewedInPtBr: boolean
  sceneSources: Array<'video' | 'screen_capture' | 'still_image'>
  longestSceneMs: number
  captionsUseWordTimestamps: boolean
  realZafiInterfaceShown: boolean
  licensedAudio: boolean
  blindReview: OE015BlindReview
}

export type OE015GateResult = {
  approved: boolean
  blockers: string[]
}

/**
 * OE-015 publication gate.
 *
 * The gate accepts only evidence collected from the final rendered artifact.
 * A configuration flag or a provider capability can never satisfy a visual
 * requirement by itself.
 */
export function evaluateOE015Artifact(
  evidence: OE015ArtifactEvidence,
): OE015GateResult {
  const blockers: string[] = []

  if (evidence.presenterSource === 'photo_avatar') {
    blockers.push('static_photo_avatar_is_not_acceptable')
  }
  if (!evidence.hasNaturalEyeContact) blockers.push('natural_eye_contact_not_verified')
  if (!evidence.hasNaturalExpressions) blockers.push('natural_expressions_not_verified')
  if (evidence.voiceSource === 'other_tts') blockers.push('generic_tts_voice_not_acceptable')
  if (evidence.voiceSampleRateHz < 44100) blockers.push('voice_below_44_1khz')
  if (!evidence.voiceReviewedInPtBr) blockers.push('pt_br_voice_not_reviewed')
  if (evidence.sceneSources.includes('still_image')) blockers.push('still_image_scene_present')
  if (evidence.longestSceneMs > 3000) blockers.push('scene_longer_than_3_seconds')
  if (!evidence.captionsUseWordTimestamps) blockers.push('captions_not_word_synchronized')
  if (!evidence.realZafiInterfaceShown) blockers.push('real_zafi_interface_missing')
  if (!evidence.licensedAudio) blockers.push('audio_license_not_verified')

  const review = evidence.blindReview
  if (review.reviewers < 5) blockers.push('blind_review_requires_five_people')
  if (review.reviewers > 0 && review.perceivedAsAi / review.reviewers > 0.2) {
    blockers.push('more_than_twenty_percent_perceived_ai')
  }
  if (!review.approvedByCeo) blockers.push('ceo_approval_missing')

  return { approved: blockers.length === 0, blockers }
}

export const oe015Architecture = {
  version: 'oe015-v1',
  status: 'awaiting_human_presenter_or_premium_credentials',
  decision: {
    presenter: {
      primary: 'real_human',
      alternative: 'heygen_avatar_iv_after_blind_test',
      reason:
        'A real presenter is the only option that eliminates avatar artifacts for the acceptance test.',
    },
    voice: {
      primary: 'on_camera_human',
      alternative: 'elevenlabs_multilingual_v2_with_timestamps',
    },
    bRoll: {
      primary: 'licensed_real_footage_and_real_zafi_capture',
      alternative: 'runway_gen_4_5_for_non_human_transition_shots',
    },
    editing: {
      primary: 'remotion_or_ffmpeg_timeline_from_real_video_clips',
      captions: 'word_level_timestamps',
      rule: 'no_still_image_scene',
    },
  },
  legacyPipeline: {
    presenter: 'openai_generated_still_image',
    voice: 'windows_sapi_22_05khz_sped_up_1_35x',
    editing: 'sharp_static_frames_plus_ffmpeg_pan',
    captions: 'scene_level_text_baked_into_static_frames',
    verdict: 'rejected',
  },
} as const
