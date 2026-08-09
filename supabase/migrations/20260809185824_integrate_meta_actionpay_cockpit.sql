-- Integração Meta + Actionpay + CEO Cockpit
-- Mantém o banco Zafi como fonte oficial e não armazena tokens de terceiros.

create table if not exists public.affiliate_sources (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  external_source_id text not null,
  name text not null,
  expected_domain text not null,
  current_domain text,
  validation_status text not null default 'pending_external_validation'
    check (validation_status in ('pending_external_validation','validated','mismatch')),
  evidence_reference text,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, external_source_id)
);

insert into public.affiliate_sources
  (network,external_source_id,name,expected_domain,validation_status,evidence_reference)
values
  ('actionpay','359422','Zafi','https://meuzafi.com.br/','pending_external_validation',
   'Confirmação e atualização ainda dependem do painel oficial da Actionpay.')
on conflict (network,external_source_id) do update set
  name=excluded.name,
  expected_domain=excluded.expected_domain,
  updated_at=now();

alter table public.atlas_campaigns
  add column if not exists commercial_status text not null default 'pending_confirmation'
    check (commercial_status in ('pending_confirmation','commercial_ready','blocked_commercial')),
  add column if not exists conversion_action text,
  add column if not exists rules_and_restrictions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(rules_and_restrictions)='object'),
  add column if not exists evidence_reference text,
  add column if not exists evidence_checked_at timestamptz;

alter table public.atlas_remuneration
  add column if not exists conversion_action text;

alter table public.affiliate_clicks
  add column if not exists network_source_id text;

create or replace function private.affiliate_click_set_source_id()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.network='actionpay' and nullif(new.network_source_id,'') is null then
    new.network_source_id='359422';
  end if;
  return new;
end;
$$;

drop trigger if exists affiliate_click_set_source_id on public.affiliate_clicks;
create trigger affiliate_click_set_source_id
before insert on public.affiliate_clicks
for each row execute function private.affiliate_click_set_source_id();

alter table public.affiliate_conversions
  add column if not exists financial_state text generated always as (
    case status
      when 'pending' then 'created'
      when 'approved' then 'approved'
      when 'paid' then 'paid'
      else 'reversed'
    end
  ) stored;

alter table public.affiliate_conversion_events
  add column if not exists financial_state text generated always as (
    case status
      when 'pending' then 'created'
      when 'approved' then 'approved'
      when 'paid' then 'paid'
      else 'reversed'
    end
  ) stored;

alter table public.affiliate_conversions
  drop constraint if exists affiliate_conversions_financial_state_check;
alter table public.affiliate_conversions
  add constraint affiliate_conversions_financial_state_check
  check (financial_state in ('created','approved','paid','reversed'));

alter table public.affiliate_conversion_events
  drop constraint if exists affiliate_conversion_events_financial_state_check;
alter table public.affiliate_conversion_events
  add constraint affiliate_conversion_events_financial_state_check
  check (financial_state in ('created','approved','paid','reversed'));

create index if not exists affiliate_clicks_network_source_idx
  on public.affiliate_clicks(network,network_source_id,occurred_at desc);
create index if not exists affiliate_conversions_financial_state_idx
  on public.affiliate_conversions(financial_state,last_event_at desc);

create or replace view public.affiliate_conversion_financial_ledger
with (security_invoker=true)
as
select
  c.id,
  c.network,
  c.transaction_id,
  c.original_click_id,
  c.partner_id,
  c.partner_name,
  c.campaign_id,
  c.campaign_name,
  c.session_id,
  c.visitor_id,
  c.financial_state,
  r.model remuneration_model,
  r.conversion_action,
  c.commission,
  c.currency,
  min(e.event_at) filter(where e.financial_state='created') created_at,
  min(e.event_at) filter(where e.financial_state='approved') approved_at,
  min(e.event_at) filter(where e.financial_state='paid') paid_at,
  min(e.event_at) filter(where e.financial_state='reversed') reversed_at,
  c.first_received_at,
  c.last_received_at,
  c.recommendation_run_id,
  c.recommendation_decision_id
from public.affiliate_conversions c
left join public.affiliate_conversion_events e on e.conversion_id=c.id
left join public.atlas_campaigns ac on ac.network=c.network and ac.external_id=c.campaign_id
left join lateral (
  select ar.model,ar.conversion_action
  from public.atlas_remuneration ar
  where ar.campaign_id=ac.id
  order by coalesce(ar.confirmed_at,ar.created_at) desc
  limit 1
) r on true
group by c.id,r.model,r.conversion_action;

revoke all on table public.affiliate_sources from anon,authenticated;
revoke all on table public.affiliate_conversion_financial_ledger from anon,authenticated;
alter table public.affiliate_sources enable row level security;

create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  business_account_id text,
  ad_account_id text,
  page_id text,
  instagram_account_id text,
  graph_api_version text,
  status text not null default 'not_configured'
    check (status in ('not_configured','configured','active','degraded','disconnected')),
  last_sync_at timestamptz,
  last_webhook_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (ad_account_id,page_id)
);

create table if not exists public.meta_campaigns (
  meta_campaign_id text primary key,
  name text not null,
  objective text,
  status text,
  effective_status text,
  starts_at timestamptz,
  ends_at timestamptz,
  synced_at timestamptz not null default now(),
  source_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(source_snapshot)='object')
);

create table if not exists public.meta_ad_sets (
  meta_adset_id text primary key,
  meta_campaign_id text references public.meta_campaigns(meta_campaign_id) on delete restrict,
  name text not null,
  status text,
  effective_status text,
  optimization_goal text,
  billing_event text,
  starts_at timestamptz,
  ends_at timestamptz,
  synced_at timestamptz not null default now(),
  source_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(source_snapshot)='object')
);

create table if not exists public.meta_ads (
  meta_ad_id text primary key,
  meta_campaign_id text references public.meta_campaigns(meta_campaign_id) on delete restrict,
  meta_adset_id text references public.meta_ad_sets(meta_adset_id) on delete restrict,
  name text not null,
  status text,
  effective_status text,
  creative_id text,
  synced_at timestamptz not null default now(),
  source_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(source_snapshot)='object')
);

create table if not exists public.meta_forms (
  meta_form_id text primary key,
  page_id text,
  name text not null,
  status text,
  locale text,
  synced_at timestamptz not null default now(),
  source_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(source_snapshot)='object')
);

create table if not exists public.meta_insights (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  period_kind text not null check(period_kind in ('day','range')),
  level text not null check(level in ('account','campaign','adset','ad')),
  entity_id text not null,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  platform text not null default 'unknown'
    check(platform in ('facebook','instagram','audience_network','messenger','unknown')),
  currency text check(currency is null or currency ~ '^[A-Z]{3}$'),
  spend numeric(16,4) not null default 0 check(spend>=0),
  reach bigint check(reach is null or reach>=0),
  impressions bigint not null default 0 check(impressions>=0),
  clicks bigint not null default 0 check(clicks>=0),
  inline_link_clicks bigint not null default 0 check(inline_link_clicks>=0),
  leads bigint not null default 0 check(leads>=0),
  ctr numeric(12,6),
  cpc numeric(16,6),
  cpm numeric(16,6),
  actions jsonb not null default '[]'::jsonb check(jsonb_typeof(actions)='array'),
  fetched_at timestamptz not null default now(),
  unique(period_start,period_end,period_kind,level,entity_id,platform),
  check(period_end>=period_start)
);

create table if not exists public.meta_leads (
  meta_lead_id text primary key,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  meta_form_id text,
  page_id text,
  platform text not null default 'unknown',
  captured_at timestamptz not null,
  field_data jsonb not null default '[]'::jsonb check(jsonb_typeof(field_data)='array'),
  consent_data jsonb not null default '[]'::jsonb check(jsonb_typeof(consent_data)='array'),
  journey_status text not null default 'captured'
    check(journey_status in ('captured','diagnosis_invited','diagnosis_started','diagnosis_completed','recommendation_viewed','partner_clicked','converted','archived')),
  profile_id uuid references public.smart_profiles(id) on delete set null,
  source_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(source_snapshot)='object'),
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  schema_version integer not null default 1 check(schema_version>0)
);

create table if not exists public.meta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payload_hash text not null unique,
  object_type text not null,
  field_name text not null,
  meta_lead_id text,
  page_id text,
  status text not null
    check(status in ('received','processed','duplicate','pending_credentials','rejected','failed')),
  reason text,
  payload jsonb not null default '{}'::jsonb check(jsonb_typeof(payload)='object'),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.meta_sync_runs (
  id uuid primary key default gen_random_uuid(),
  sync_kind text not null check(sync_kind in ('catalog','insights','forms','pending_leads','full')),
  period_start date,
  period_end date,
  status text not null check(status in ('running','succeeded','partial','failed','not_configured')),
  records_read integer not null default 0 check(records_read>=0),
  records_written integer not null default 0 check(records_written>=0),
  error_code text,
  error_detail text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  request_id text
);

create index if not exists meta_insights_period_platform_idx
  on public.meta_insights(period_start,period_end,platform,level);
create index if not exists meta_insights_campaign_period_idx
  on public.meta_insights(meta_campaign_id,period_start,period_end);
create index if not exists meta_leads_captured_platform_idx
  on public.meta_leads(captured_at desc,platform);
create index if not exists meta_leads_campaign_captured_idx
  on public.meta_leads(meta_campaign_id,captured_at desc);
create index if not exists meta_webhook_status_received_idx
  on public.meta_webhook_events(status,received_at desc);
create index if not exists meta_sync_runs_started_idx
  on public.meta_sync_runs(started_at desc);

alter table public.meta_connections enable row level security;
alter table public.meta_campaigns enable row level security;
alter table public.meta_ad_sets enable row level security;
alter table public.meta_ads enable row level security;
alter table public.meta_forms enable row level security;
alter table public.meta_insights enable row level security;
alter table public.meta_leads enable row level security;
alter table public.meta_webhook_events enable row level security;
alter table public.meta_sync_runs enable row level security;

revoke all on table public.meta_connections,public.meta_campaigns,public.meta_ad_sets,
  public.meta_ads,public.meta_forms,public.meta_insights,public.meta_leads,
  public.meta_webhook_events,public.meta_sync_runs from anon,authenticated;

create or replace function public.meta_executive_snapshot(
  p_secret text,
  p_from timestamptz,
  p_to timestamptz,
  p_platform text default null,
  p_campaign_id text default null,
  p_ad_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_from timestamptz:=coalesce(p_from,now()-interval '7 days');
  v_to timestamptz:=coalesce(p_to,now());
  v_start date:=(v_from at time zone 'America/Sao_Paulo')::date;
  v_end date:=(v_to at time zone 'America/Sao_Paulo')::date;
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid meta snapshot secret' using errcode='42501';
  end if;
  if v_from>=v_to or v_to-v_from>interval '366 days' then
    raise exception 'invalid meta snapshot period';
  end if;
  if p_platform is not null and p_platform not in ('facebook','instagram','audience_network','messenger','unknown') then
    raise exception 'invalid meta platform';
  end if;

  with filtered_daily as (
    select * from public.meta_insights i
    where i.period_kind='day'
      and i.period_start between v_start and v_end
      and (p_platform is null or i.platform=p_platform)
      and (p_campaign_id is null or i.meta_campaign_id=p_campaign_id)
      and (p_ad_id is null or i.meta_ad_id=p_ad_id)
  ), exact_account as (
    select * from public.meta_insights i
    where i.period_kind='range' and i.level='account'
      and i.period_start=v_start and i.period_end=v_end
      and (p_platform is null or i.platform=p_platform)
    order by fetched_at desc limit 1
  ), totals as (
    select
      coalesce(sum(spend),0) spend,
      coalesce(sum(impressions),0)::bigint impressions,
      coalesce(sum(clicks),0)::bigint clicks,
      coalesce(sum(inline_link_clicks),0)::bigint inline_link_clicks,
      coalesce(sum(leads),0)::bigint reported_leads,
      max(currency) currency
    from filtered_daily
  ), lead_totals as (
    select count(*)::bigint leads
    from public.meta_leads l
    where l.captured_at>=v_from and l.captured_at<v_to
      and (p_platform is null or l.platform=p_platform)
      and (p_campaign_id is null or l.meta_campaign_id=p_campaign_id)
      and (p_ad_id is null or l.meta_ad_id=p_ad_id)
  ), platform_rows as (
    select platform,sum(spend) spend,sum(impressions)::bigint impressions,
      sum(clicks)::bigint clicks,sum(inline_link_clicks)::bigint inline_link_clicks,
      sum(leads)::bigint reported_leads
    from filtered_daily group by platform
  ), campaign_rows as (
    select i.meta_campaign_id,coalesce(c.name,i.meta_campaign_id,'Sem campanha') name,
      sum(i.spend) spend,sum(i.impressions)::bigint impressions,sum(i.clicks)::bigint clicks,
      sum(i.inline_link_clicks)::bigint inline_link_clicks,sum(i.leads)::bigint reported_leads
    from filtered_daily i left join public.meta_campaigns c on c.meta_campaign_id=i.meta_campaign_id
    group by i.meta_campaign_id,c.name
  ), connection as (
    select status,ad_account_id,page_id,graph_api_version,last_sync_at,last_webhook_at,last_error_code,last_error_at
    from public.meta_connections order by updated_at desc limit 1
  ), last_sync as (
    select status,sync_kind,records_read,records_written,error_code,error_detail,started_at,finished_at
    from public.meta_sync_runs order by started_at desc limit 1
  )
  select jsonb_build_object(
    'generated_at',now(),
    'period',jsonb_build_object('from',v_from,'to',v_to,'start_date',v_start,'end_date',v_end),
    'connection',coalesce((select to_jsonb(c) from connection c),'{}'::jsonb),
    'last_sync',coalesce((select to_jsonb(s) from last_sync s),'{}'::jsonb),
    'metrics',jsonb_build_object(
      'spend',t.spend,'currency',coalesce(t.currency,'BRL'),
      'reach',(select reach from exact_account),
      'reach_quality',case when exists(select 1 from exact_account) then 'exact_range' else 'unavailable_for_range' end,
      'impressions',t.impressions,'clicks',t.clicks,'inline_link_clicks',t.inline_link_clicks,
      'reported_leads',t.reported_leads,'captured_leads',l.leads,
      'ctr',case when t.impressions>0 then round(100.0*t.clicks/t.impressions,4) end,
      'cpc',case when t.clicks>0 then round(t.spend/t.clicks,4) end,
      'cpm',case when t.impressions>0 then round(1000.0*t.spend/t.impressions,4) end,
      'acquisition_cpl',case when l.leads>0 then round(t.spend/l.leads,4) end
    ),
    'platforms',coalesce((select jsonb_agg(to_jsonb(p) order by spend desc,platform) from platform_rows p),'[]'::jsonb),
    'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by spend desc,name) from campaign_rows c),'[]'::jsonb)
  ) into v_result
  from totals t cross join lead_totals l;

  return v_result;
end;
$$;

revoke all on function public.meta_executive_snapshot(text,timestamptz,timestamptz,text,text,text)
  from public,anon,authenticated;
grant execute on function public.meta_executive_snapshot(text,timestamptz,timestamptz,text,text,text)
  to service_role;

create or replace function public.actionpay_integration_snapshot(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid actionpay snapshot secret' using errcode='42501';
  end if;
  select jsonb_build_object(
    'source',coalesce((select jsonb_build_object(
      'id',external_source_id,'name',name,'expected_domain',expected_domain,
      'current_domain',current_domain,'validation_status',validation_status,
      'validated_at',validated_at,'evidence_reference',evidence_reference
    ) from public.affiliate_sources where network='actionpay' and external_source_id='359422'),'{}'::jsonb),
    'campaigns',coalesce((select jsonb_agg(jsonb_build_object(
      'partner_id',p.slug,'partner_name',p.name,'campaign_id',c.external_id,
      'campaign_name',c.name,'campaign_status',c.status,'commercial_status',c.commercial_status,
      'model',r.model,'remuneration_status',r.status,'amount',r.amount,
      'percentage',r.percentage,'currency',r.currency,
      'conversion_action',coalesce(r.conversion_action,c.conversion_action),
      'link_https',i.destination_url like 'https://%',
      'source_id_valid',i.destination_url like '%/359422/%',
      'click_strategy',i.click_id_strategy,'integration_status',i.status,
      'last_validated_at',greatest(c.last_validated_at,i.last_validated_at,r.confirmed_at),
      'evidence_reference',coalesce(c.evidence_reference,r.source_reference)
    ) order by p.name,c.external_id)
    from public.atlas_partners p
    join public.atlas_campaigns c on c.partner_id=p.id and c.network='actionpay'
    left join public.atlas_integrations i on i.campaign_id=c.id and i.integration_type='redirect'
    left join lateral (
      select * from public.atlas_remuneration ar where ar.campaign_id=c.id
      order by coalesce(ar.confirmed_at,ar.created_at) desc limit 1
    ) r on true),'[]'::jsonb),
    'summary',jsonb_build_object(
      'commercial_ready',(select count(*) from public.atlas_campaigns where network='actionpay' and commercial_status='commercial_ready'),
      'pending_confirmation',(select count(*) from public.atlas_campaigns where network='actionpay' and commercial_status='pending_confirmation'),
      'blocked_commercial',(select count(*) from public.atlas_campaigns where network='actionpay' and commercial_status='blocked_commercial'),
      'cpl',(select count(*) from public.atlas_remuneration r join public.atlas_campaigns c on c.id=r.campaign_id where c.network='actionpay' and r.model='cpl' and r.status='confirmed'),
      'cpa',(select count(*) from public.atlas_remuneration r join public.atlas_campaigns c on c.id=r.campaign_id where c.network='actionpay' and r.model='cpa' and r.status='confirmed')
    )
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.actionpay_integration_snapshot(text) from public,anon,authenticated;
grant execute on function public.actionpay_integration_snapshot(text) to service_role;

comment on table public.meta_leads is
  'Leads Meta privados, deduplicados por meta_lead_id; acesso somente por backend privilegiado.';
comment on table public.meta_insights is
  'Snapshots auditáveis da Marketing API; alcance somente é exibido quando existe recorte exato do período.';
comment on table public.affiliate_sources is
  'Registro auditável da fonte afiliada; validação externa nunca é presumida.';
comment on view public.affiliate_conversion_financial_ledger is
  'Visão oficial de receita criada, aprovada, paga ou revertida, preservando o status bruto da rede.';

