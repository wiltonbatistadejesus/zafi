import type {
  VideoProvider,
  VideoProviderJob,
  VideoProviderRequest,
  VideoJobStatus,
} from '@/lib/content-factory/types'

type HeyGenGenerateResponse = {
  code?: number
  data?: { video_id?: string }
  error?: { message?: string } | string | null
  message?: string
}

type HeyGenStatusResponse = {
  data?: {
    status?: 'pending' | 'waiting' | 'processing' | 'completed' | 'failed'
    video_url?: string
  }
}
type HeyGenRemoteStatus = NonNullable<HeyGenStatusResponse['data']>['status']

const jobs = new Map<string, VideoProviderJob>()

function apiKey() {
  const key = process.env.HEYGEN_API_KEY?.trim()
  if (!key) throw new Error('heygen_api_key_not_configured')
  return key
}

function configuredId(requestValue: string | undefined, environmentName: string) {
  const value = requestValue?.trim() || process.env[environmentName]?.trim()
  if (!value) throw new Error(`${environmentName.toLowerCase()}_not_configured`)
  return value
}

function mapStatus(status: HeyGenRemoteStatus): VideoJobStatus {
  if (status === 'completed') return 'ready'
  if (status === 'failed') return 'failed'
  if (status === 'processing') return 'generating'
  return 'queued'
}

export class HeyGenAvatarProvider implements VideoProvider {
  readonly id = 'heygen-avatar-v2'
  readonly label = 'HeyGen Avatar Video'
  readonly capabilities = {
    humanAvatar: true,
    naturalVoice: true,
    remoteCancel: false,
    maxResolution: '1080p' as const,
  }

  async generate(request: VideoProviderRequest): Promise<VideoProviderJob> {
    const existing = jobs.get(request.idempotencyKey)
    if (existing) return existing

    const avatarId = configuredId(request.avatar?.avatarId, 'HEYGEN_AVATAR_ID')
    const voiceId = configuredId(request.voice?.voiceId, 'HEYGEN_VOICE_ID')
    const startedAt = Date.now()
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey(),
      },
      body: JSON.stringify({
        title: request.title,
        caption: false,
        test: false,
        dimension: { width: 1080, height: 1920 },
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId,
            avatar_style: request.avatar?.style ?? 'normal',
          },
          voice: {
            type: 'text',
            input_text: request.spokenText,
            voice_id: voiceId,
            speed: request.voice?.speed ?? 1,
            pitch: request.voice?.pitch ?? 0,
          },
          background: request.background
            ? {
                type: request.background.type,
                ...(request.background.type === 'color'
                  ? { value: request.background.value }
                  : { url: request.background.value }),
              }
            : { type: 'color', value: '#0f172a' },
        }],
      }),
    })

    const result = await response.json() as HeyGenGenerateResponse
    const jobId = result.data?.video_id
    if (!response.ok || !jobId) {
      const detail = typeof result.error === 'string'
        ? result.error
        : result.error?.message || result.message || `http_${response.status}`
      throw new Error(`heygen_generate_failed:${detail}`)
    }

    const job: VideoProviderJob = {
      jobId,
      providerId: this.id,
      status: 'queued',
      previewUrl: null,
      downloadUrl: null,
      estimatedCostBrl: null,
      generationTimeMs: Date.now() - startedAt,
      createdAt: new Date().toISOString(),
    }
    jobs.set(request.idempotencyKey, job)
    jobs.set(jobId, job)
    return job
  }

  async status(jobId: string): Promise<VideoProviderJob> {
    const current = this.requireJob(jobId)
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`,
      { headers: { 'X-Api-Key': apiKey() } },
    )
    const result = await response.json() as HeyGenStatusResponse
    if (!response.ok || !result.data?.status) {
      throw new Error(`heygen_status_failed:http_${response.status}`)
    }

    const updated: VideoProviderJob = {
      ...current,
      status: mapStatus(result.data.status),
      previewUrl: result.data.video_url ?? current.previewUrl,
      downloadUrl: result.data.video_url ?? current.downloadUrl,
      generationTimeMs: Date.now() - new Date(current.createdAt).getTime(),
    }
    jobs.set(jobId, updated)
    return updated
  }

  async preview(jobId: string) {
    return (await this.status(jobId)).previewUrl
  }

  async download(jobId: string) {
    return (await this.status(jobId)).downloadUrl
  }

  async cancel(jobId: string) {
    const current = this.requireJob(jobId)
    const cancelled = { ...current, status: 'cancelled' as const }
    jobs.set(jobId, cancelled)
    return cancelled
  }

  private requireJob(jobId: string) {
    const job = jobs.get(jobId)
    if (!job) throw new Error(`video_job_not_found:${jobId}`)
    return job
  }
}
