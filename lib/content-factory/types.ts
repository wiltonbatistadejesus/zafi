export type ContentFactoryStage =
  | 'theme'
  | 'research'
  | 'prioritization'
  | 'script'
  | 'video'
  | 'review'
  | 'pending_approval'
  | 'approved'
  | 'published'
  | 'measured'
  | 'learning'

export type ReviewDecision = 'approved' | 'changes_requested' | 'rejected'
export type VideoKind = 'institutional' | 'educational' | 'viral'
export type VideoJobStatus = 'queued' | 'generating' | 'ready' | 'failed' | 'cancelled'

export interface VideoScene {
  kicker: string
  title: string
  body: string
  durationMs: number
  treatment: 'ink' | 'blue' | 'light' | 'signal'
}

export interface VideoProviderRequest {
  assetId: string
  idempotencyKey: string
  title: string
  spokenText: string
  scenes: VideoScene[]
  aspectRatio: '9:16'
  language: 'pt-BR'
  avatar?: {
    avatarId?: string
    style?: 'normal' | 'circle' | 'closeUp'
    framing?: 'close' | 'medium'
  }
  voice?: {
    voiceId?: string
    speed?: number
    pitch?: number
  }
  background?: {
    type: 'color' | 'image' | 'video'
    value: string
  }
}

export interface VideoProviderJob {
  jobId: string
  providerId: string
  status: VideoJobStatus
  previewUrl: string | null
  downloadUrl: string | null
  estimatedCostBrl: number | null
  generationTimeMs: number | null
  createdAt: string
}

export interface VideoProvider {
  readonly id: string
  readonly label: string
  readonly capabilities?: {
    humanAvatar: boolean
    naturalVoice: boolean
    remoteCancel: boolean
    maxResolution: '720p' | '1080p' | '4k'
  }
  generate(request: VideoProviderRequest): Promise<VideoProviderJob>
  status(jobId: string): Promise<VideoProviderJob>
  preview(jobId: string): Promise<string | null>
  download(jobId: string): Promise<string | null>
  cancel(jobId: string): Promise<VideoProviderJob>
}

export interface ProfessionalVideoEvidence {
  humanAvatar: {
    present: boolean
    provider: string | null
    eyeContactReviewed: boolean
    naturalExpressionsReviewed: boolean
  }
  narration: {
    provider: string | null
    naturalnessScore: number
    ptBrReviewed: boolean
  }
  editing: {
    sceneDurationsMs: number[]
    bRollClips: number
    motionGraphics: number
    dynamicZooms: number
  }
  captions: {
    dynamic: boolean
    synchronized: boolean
    contrastReviewed: boolean
  }
  product: {
    realZafiInterfaceShown: boolean
  }
  audio: {
    musicPresent: boolean
    narrationLoudnessLufs: number | null
    musicLoudnessLufs: number | null
  }
  review: {
    qualityScore: number
    ceoDecision: 'pending' | 'approved' | 'changes_requested' | 'rejected'
  }
}

export interface QualityBreakdown {
  clarity: number
  retention: number
  branding: number
  cta: number
  spelling: number
  visual: number
  accessibility: number
}

export interface ContentFactoryPilot {
  id: string
  kind: VideoKind
  themeId: string
  title: string
  topic: string
  objective: string
  audience: string
  durationSeconds: number
  status: 'pending_approval'
  stage: ContentFactoryStage
  score: number
  selectedHook: string
  hooks: [string, string, string]
  spokenText: string
  selectedCta: string
  ctas: [string, string]
  caption: string
  description: string
  hashtags: string[]
  thumbnailText: string
  thumbnailUrls: [string, string, string]
  editStyles: [string, string]
  scenes: VideoScene[]
  direction: {
    emotion: string
    pace: string
    pauses: string
    framing: string
    expression: string
    voice: string
  }
  provider: {
    id: string
    label: string
    generationTimeMs: number
    estimatedCostBrl: number
  }
  quality: QualityBreakdown
  compliance: {
    status: 'approved'
    findings: string[]
    reviewedAt: string
  }
  trace: {
    researchId: string
    briefId: string
    scriptVersion: number
    assetVersion: number
  }
  deliverables?: {
    videoUrl: string
    carouselUrls: string[]
    staticImageUrl: string
    storyUrls: string[]
    publicationStatus: 'blocked_pending_ceo_approval' | 'approved' | 'published'
  }
}
