export type MetaPlatform = 'facebook' | 'instagram' | 'audience_network' | 'messenger' | 'unknown'

export type MetaExecutiveSnapshot = {
  generated_at: string
  period: { from: string; to: string; start_date: string; end_date: string }
  connection: {
    status?: 'not_configured' | 'configured' | 'active' | 'degraded' | 'disconnected'
    ad_account_id?: string | null
    page_id?: string | null
    graph_api_version?: string | null
    last_sync_at?: string | null
    last_webhook_at?: string | null
    last_error_code?: string | null
    last_error_at?: string | null
  }
  last_sync: {
    status?: 'running' | 'succeeded' | 'partial' | 'failed' | 'not_configured'
    sync_kind?: string
    records_read?: number
    records_written?: number
    error_code?: string | null
    error_detail?: string | null
    started_at?: string
    finished_at?: string | null
  }
  metrics: {
    spend: number | string
    currency: string
    reach: number | null
    reach_quality: 'exact_range' | 'unavailable_for_range'
    impressions: number
    clicks: number
    inline_link_clicks: number
    reported_leads: number
    captured_leads: number
    ctr: number | null
    cpc: number | null
    cpm: number | null
    acquisition_cpl: number | null
  }
  platforms: Array<{
    platform: MetaPlatform
    spend: number | string
    impressions: number
    clicks: number
    inline_link_clicks: number
    reported_leads: number
  }>
  campaigns: Array<{
    meta_campaign_id: string | null
    name: string
    spend: number | string
    impressions: number
    clicks: number
    inline_link_clicks: number
    reported_leads: number
  }>
}

export type ActionpayIntegrationSnapshot = {
  source: {
    id?: string
    name?: string
    expected_domain?: string
    current_domain?: string | null
    validation_status?: 'pending_external_validation' | 'validated' | 'mismatch'
    validated_at?: string | null
    evidence_reference?: string | null
  }
  summary: {
    commercial_ready: number
    pending_confirmation: number
    blocked_commercial: number
    cpl: number
    cpa: number
  }
  campaigns: Array<{
    partner_id: string
    partner_name: string
    campaign_id: string
    campaign_name: string
    campaign_status: string
    commercial_status: string
    model: string | null
    remuneration_status: string | null
    amount: number | string | null
    percentage: number | string | null
    currency: string | null
    conversion_action: string | null
    link_https: boolean
    source_id_valid: boolean
    click_strategy: string | null
    integration_status: string | null
    last_validated_at: string | null
    evidence_reference: string | null
  }>
}

