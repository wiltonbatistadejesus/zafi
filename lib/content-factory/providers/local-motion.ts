import type {
  VideoProvider,
  VideoProviderJob,
  VideoProviderRequest,
} from '@/lib/content-factory/types'

const jobs = new Map<string, VideoProviderJob>()

export class LocalMotionProvider implements VideoProvider {
  readonly id = 'local-motion-v1'
  readonly label = 'Zafi Motion Preview'

  async generate(request: VideoProviderRequest): Promise<VideoProviderJob> {
    const existing = jobs.get(request.idempotencyKey)
    if (existing) return existing

    const job: VideoProviderJob = {
      jobId: request.idempotencyKey,
      providerId: this.id,
      status: 'ready',
      previewUrl: `/admin/content-factory?video=${encodeURIComponent(request.assetId)}`,
      downloadUrl: null,
      estimatedCostBrl: 0,
      generationTimeMs: 180,
      createdAt: new Date().toISOString(),
    }
    jobs.set(job.jobId, job)
    return job
  }

  async status(jobId: string) {
    return this.requireJob(jobId)
  }

  async preview(jobId: string) {
    return this.requireJob(jobId).previewUrl
  }

  async download(jobId: string) {
    return this.requireJob(jobId).downloadUrl
  }

  async cancel(jobId: string) {
    const job = this.requireJob(jobId)
    const cancelled = { ...job, status: 'cancelled' as const }
    jobs.set(jobId, cancelled)
    return cancelled
  }

  private requireJob(jobId: string) {
    const job = jobs.get(jobId)
    if (!job) throw new Error(`video_job_not_found:${jobId}`)
    return job
  }
}
