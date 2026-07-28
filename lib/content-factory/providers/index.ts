import type { VideoProvider } from '@/lib/content-factory/types'
import { HeyGenAvatarProvider } from './heygen'
import { LocalMotionProvider } from './local-motion'

const providers: Record<string, VideoProvider> = {
  'local-motion-v1': new LocalMotionProvider(),
  'heygen-avatar-v2': new HeyGenAvatarProvider(),
}

export function getVideoProvider(providerId: string): VideoProvider {
  const provider = providers[providerId]
  if (!provider) throw new Error(`video_provider_not_registered:${providerId}`)
  return provider
}

export function listVideoProviders() {
  return Object.values(providers).map(({ id, label }) => ({ id, label }))
}
