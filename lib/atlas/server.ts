import 'server-only'

import { getSupabaseClient } from '@/lib/supabase'
import type { AtlasCatalog } from './types'

function secret() {
  const value = process.env.TELEMETRY_SERVER_SECRET
  if (!value) throw new Error('TELEMETRY_SERVER_SECRET is not configured')
  return value
}

export async function getAtlasCatalog(pageRoute = '/'): Promise<AtlasCatalog> {
  const { data, error } = await getSupabaseClient().rpc('atlas_catalog_snapshot', {
    p_secret: secret(),
    p_page_route: pageRoute,
  })
  if (error || !data) throw new Error(`Atlas catalog unavailable: ${error?.message ?? 'empty response'}`)
  return data as AtlasCatalog
}

