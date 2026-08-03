-- Zafi Executive OS
-- Data layer over the existing telemetry and financial ledgers.

create table if not exists public.executive_alert_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique check (rule_key ~ '^[a-z0-9_]+$'),
  label text not null,
  category text not null check (category in ('growth','product','marketing','engineering','revenue','data_quality')),
  enabled boolean not null default true,
  threshold numeric,
  unit text not null check (unit in ('percent','percentage_points','count','hours')),
  severity text not null check (severity in ('attention','critical','positive')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.executive_metric_exclusions (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('telemetry_event','recommendation_run','affiliate_click','affiliate_conversion')),
  source_id uuid not null,
  reason text not null check (length(reason) between 5 and 500),
  excluded_by text not null,
  created_at timestamptz not null default now(),
  unique (source_kind,source_id)
);

insert into public.executive_alert_rules
  (rule_key,label,category,threshold,unit,severity,config)
values
  ('traffic_drop','Queda relevante de tráfego','growth',30,'percent','critical','{"minimum_previous":5}'),
  ('diagnosis_conversion_drop','Queda de conversão do diagnóstico','product',10,'percentage_points','critical','{"minimum_starts":5}'),
  ('checkout_error','Checkout com erro','revenue',1,'count','critical','{}'),
  ('event_silence','Ausência inesperada de eventos','data_quality',24,'hours','critical','{}'),
  ('error_increase','Aumento relevante de erros','engineering',50,'percent','critical','{}'),
  ('sprint_delayed','Sprint atrasada ou bloqueada','engineering',1,'count','attention','{}'),
  ('conversion_growth','Crescimento relevante de conversão','growth',10,'percent','positive','{"minimum_starts":5}'),
  ('revenue_growth','Crescimento relevante de receita','revenue',20,'percent','positive','{"minimum_previous":1}')
on conflict (rule_key) do nothing;

alter table public.executive_alert_rules enable row level security;
alter table public.executive_metric_exclusions enable row level security;
revoke all on table public.executive_alert_rules,public.executive_metric_exclusions from anon,authenticated;

create index if not exists executive_metric_exclusions_lookup_idx
  on public.executive_metric_exclusions(source_kind,source_id);

create or replace view public.executive_funnel_event_stream
with (security_invoker=true)
as
with telemetry as (
  select
    e.id source_id,
    'telemetry_event'::text source_kind,
    p.id user_id,
    e.visitor_id anonymous_id,
    e.session_id,
    e.occurred_at event_at,
    case e.event_type
      when 'analysis_started' then 'diagnosis_started'
      when 'analysis_completed' then 'diagnosis_completed'
      else e.event_type
    end event_name,
    coalesce(nullif(e.source,''),'origem_desconhecida') source,
    coalesce(nullif(e.payload #>> '{campaign,utm_medium}',''),nullif(e.payload->>'channel',''),'unknown') medium,
    coalesce(nullif(e.payload #>> '{campaign,utm_campaign}',''),'sem_campanha') campaign,
    e.source_page landing_page,
    jsonb_build_object('schema_version',e.schema_version,'payload',e.payload,'device',e.device) metadata
  from public.telemetry_events e
  left join public.smart_profiles p on p.visitor_id=e.visitor_id
  where e.source_page not like '/admin%'
    and not exists (
      select 1 from public.executive_metric_exclusions x
      where x.source_kind='telemetry_event' and x.source_id=e.id
    )
), signups as (
  select
    i.profile_id source_id,
    'profile_identity'::text source_kind,
    i.profile_id user_id,
    p.visitor_id anonymous_id,
    p.current_session_id session_id,
    i.collected_at event_at,
    'signup_completed'::text event_name,
    coalesce(ctx.source,'origem_desconhecida') source,
    coalesce(ctx.medium,'unknown') medium,
    coalesce(ctx.campaign,'sem_campanha') campaign,
    coalesce(ctx.landing_page,'/') landing_page,
    jsonb_build_object('profile_schema',1,'identity_present',true) metadata
  from public.profile_identity i
  join public.smart_profiles p on p.id=i.profile_id
  left join lateral (
    select t.source,t.medium,t.campaign,t.landing_page
    from telemetry t
    where t.anonymous_id=p.visitor_id and t.event_at<=i.collected_at
    order by t.event_at desc limit 1
  ) ctx on true
), offers as (
  select
    a.id source_id,
    'recommendation_attribution'::text source_kind,
    r.profile_id user_id,
    r.visitor_id anonymous_id,
    r.session_id,
    a.occurred_at event_at,
    'offer_viewed'::text event_name,
    coalesce(ctx.source,'origem_desconhecida') source,
    coalesce(ctx.medium,'unknown') medium,
    coalesce(ctx.campaign,'sem_campanha') campaign,
    r.page_route landing_page,
    jsonb_build_object('run_id',a.run_id,'decision_id',a.decision_id,'snapshot',a.snapshot) metadata
  from public.recommendation_attribution_events a
  join public.recommendation_runs r on r.id=a.run_id
  left join lateral (
    select t.source,t.medium,t.campaign
    from telemetry t where t.session_id=r.session_id
    order by t.event_at desc limit 1
  ) ctx on true
  where a.event_type='impression'
    and not exists (
      select 1 from public.executive_metric_exclusions x
      where x.source_kind='recommendation_run' and x.source_id=r.id
    )
), purchases as (
  select
    c.id source_id,
    'affiliate_conversion'::text source_kind,
    r.profile_id user_id,
    c.visitor_id anonymous_id,
    c.session_id,
    coalesce(c.converted_at,c.first_received_at,c.created_at) event_at,
    'purchase_completed'::text event_name,
    coalesce(t.source,'origem_desconhecida') source,
    coalesce(nullif(t.payload #>> '{campaign,utm_medium}',''),nullif(t.payload->>'channel',''),'unknown') medium,
    coalesce(nullif(t.payload #>> '{campaign,utm_campaign}',''),'sem_campanha') campaign,
    coalesce(click.source_page,'/') landing_page,
    jsonb_build_object(
      'conversion_id',c.id,'transaction_id',c.transaction_id,
      'partner_id',c.partner_id,'campaign_id',c.campaign_id,
      'status',c.status,'commission',c.commission,'currency',c.currency
    ) metadata
  from public.affiliate_conversions c
  left join public.affiliate_clicks click on click.id=c.original_click_id
  left join public.telemetry_events t on t.id=click.telemetry_event_id
  left join public.recommendation_runs r on r.id=c.recommendation_run_id
  where not exists (
    select 1 from public.executive_metric_exclusions x
    where x.source_kind='affiliate_conversion' and x.source_id=c.id
  )
)
select * from telemetry
where event_name in ('page_view','diagnosis_started','diagnosis_completed','checkout_started')
union all select * from signups
union all select * from offers
union all select * from purchases;

revoke all on table public.executive_funnel_event_stream from anon,authenticated;

create or replace function public.executive_weekly_snapshot(
  p_secret text,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_timezone constant text := 'America/Sao_Paulo';
  v_to timestamptz := coalesce(p_to,now());
  v_from timestamptz := coalesce(p_from,coalesce(p_to,now())-interval '7 days');
  v_duration interval;
  v_previous_from timestamptz;
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid executive secret' using errcode='42501';
  end if;
  if v_from>=v_to or v_to-v_from>interval '366 days' then
    raise exception 'invalid executive period';
  end if;
  v_duration:=v_to-v_from;
  v_previous_from:=v_from-v_duration;

  with periods as (
    select 'current'::text bucket,v_from start_at,v_to end_at
    union all
    select 'previous',v_previous_from,v_from
  ), metrics as (
    select p.bucket,
      count(distinct e.anonymous_id) filter(where e.event_name='page_view') visitors,
      count(distinct e.session_id) filter(where e.event_name='page_view') sessions,
      count(distinct e.anonymous_id) active_users,
      count(*) filter(where e.event_name='diagnosis_started') diagnosis_started,
      count(*) filter(where e.event_name='diagnosis_completed') diagnosis_completed,
      count(distinct e.user_id) filter(where e.event_name='signup_completed') signups,
      count(*) filter(where e.event_name='offer_viewed') offers_viewed,
      count(*) filter(where e.event_name='checkout_started') checkout_started,
      count(*) filter(where e.event_name='purchase_completed') purchases
    from periods p
    left join public.executive_funnel_event_stream e
      on e.event_at>=p.start_at and e.event_at<p.end_at
    group by p.bucket
  ), first_seen as (
    select anonymous_id,min(event_at) first_at
    from public.executive_funnel_event_stream
    where event_name='page_view'
    group by anonymous_id
  ), metric_rows as (
    select m.*,
      count(f.*) filter(where f.first_at>=p.start_at and f.first_at<p.end_at) new_users,
      case when m.visitors>0 then round(100.0*m.signups/m.visitors,2) end visitor_signup_rate,
      case when m.visitors>0 then round(100.0*m.diagnosis_completed/m.visitors,2) end visitor_diagnosis_rate,
      case when m.diagnosis_started>0 then round(100.0*m.diagnosis_completed/m.diagnosis_started,2) end completion_rate
    from metrics m join periods p on p.bucket=m.bucket
    left join first_seen f on f.first_at>=p.start_at and f.first_at<p.end_at
    group by m.bucket,m.visitors,m.sessions,m.active_users,m.diagnosis_started,
      m.diagnosis_completed,m.signups,m.offers_viewed,m.checkout_started,m.purchases
  ), finance as (
    select p.bucket,
      count(*) filter(where c.status='paid') paid_customers,
      count(*) filter(where c.status='cancelled') cancellations,
      coalesce(sum(c.commission) filter(where c.status in ('pending','approved','paid')),0) revenue_created,
      coalesce(sum(c.commission) filter(where c.status in ('approved','paid')),0) revenue_approved,
      coalesce(sum(c.commission) filter(where c.status='paid'),0) revenue_paid,
      coalesce(avg(c.commission) filter(where c.status='paid'),0) average_ticket
    from periods p
    left join public.affiliate_conversions c
      on coalesce(c.converted_at,c.first_received_at,c.created_at)>=p.start_at
      and coalesce(c.converted_at,c.first_received_at,c.created_at)<p.end_at
      and not exists (
        select 1 from public.executive_metric_exclusions x
        where x.source_kind='affiliate_conversion' and x.source_id=c.id
      )
    group by p.bucket
  ), source_summary as (
    select
      case
        when lower(source) in ('facebook','instagram','meta') then 'meta'
        when lower(source)='google' then 'google'
        when lower(source) in ('tiktok','youtube','social') then 'social'
        when lower(source) in ('bing','organic') then 'organic'
        when lower(source)='direct' then 'direct'
        when lower(source)='referral' then 'referral'
        else lower(source)
      end source,
      count(distinct anonymous_id) visitors,
      count(distinct session_id) sessions,
      count(distinct user_id) filter(where event_name='signup_completed') leads
    from public.executive_funnel_event_stream
    where event_at>=v_from and event_at<v_to
      and event_name in ('page_view','signup_completed')
    group by 1
  ), campaign_summary as (
    select campaign,medium,count(distinct anonymous_id) visitors,
      count(distinct user_id) filter(where event_name='signup_completed') leads
    from public.executive_funnel_event_stream
    where event_at>=v_from and event_at<v_to and campaign<>'sem_campanha'
    group by campaign,medium
    order by visitors desc,campaign
  ), feature_summary as (
    select event_name feature,count(*) uses
    from public.executive_funnel_event_stream
    where event_at>=v_from and event_at<v_to
    group by event_name order by uses desc,feature limit 6
  ), daily_series as (
    select generate_series(
      date_trunc('day',timezone(v_timezone,v_to-interval '13 days')),
      date_trunc('day',timezone(v_timezone,v_to)),interval '1 day'
    )::date as metric_day
  ), trend as (
    select to_char(s.metric_day,'YYYY-MM-DD') as metric_day,
      count(distinct e.anonymous_id) filter(where e.event_name='page_view') visitors,
      count(*) filter(where e.event_name='diagnosis_completed') diagnoses,
      count(*) filter(where e.event_name='purchase_completed') purchases,
      coalesce(sum((e.metadata->>'commission')::numeric) filter(
        where e.event_name='purchase_completed'
          and e.metadata->>'status' in ('approved','paid')
      ),0) revenue
    from daily_series s
    left join public.executive_funnel_event_stream e
      on timezone(v_timezone,e.event_at)::date=s.metric_day
    group by s.metric_day order by s.metric_day
  ), latest_monitor as (
    select overall_status,health_score,diagnostics,created_at
    from public.operational_monitor_snapshots
    where created_at<v_to order by created_at desc limit 1
  ), latest_order_revisions as (
    select distinct on (r.order_id)
      r.order_id,r.title,r.status,r.created_at,o.oe_code
    from public.executive_order_revisions r
    join public.executive_orders o on o.id=r.order_id
    order by r.order_id,r.version desc
  ), current_sprint as (
    select r.*,coalesce(er.completion_percentage,0) completion_percentage,
      er.implementation_status
    from latest_order_revisions r
    left join lateral (
      select completion_percentage,implementation_status
      from public.executive_engineering_reports er
      where er.order_id=r.order_id order by er.version desc limit 1
    ) er on true
    where r.status not in ('completed','approved','rejected')
    order by r.created_at desc limit 1
  ), ga4_health as (
    select
      count(*) filter(where status in ('sent','confirmed')) technical_sent,
      count(*) filter(where status='failed') failed,
      (select count(*) from public.ga4_processing_confirmations
        where evidence_at>=v_from and evidence_at<v_to) confirmations
    from public.telemetry_deliveries
    where attempted_at>=v_from and attempted_at<v_to
  ), month_finance as (
    select coalesce(sum(commission) filter(where status in ('approved','paid')),0) revenue
    from public.affiliate_conversions
    where coalesce(converted_at,first_received_at,created_at)>=
      date_trunc('month',timezone(v_timezone,v_to)) at time zone v_timezone
      and coalesce(converted_at,first_received_at,created_at)<v_to
  ), total_finance as (
    select coalesce(sum(commission) filter(where status in ('approved','paid')),0) revenue
    from public.affiliate_conversions c
    where not exists (
      select 1 from public.executive_metric_exclusions x
      where x.source_kind='affiliate_conversion' and x.source_id=c.id
    )
  )
  select jsonb_build_object(
    'generated_at',now(),
    'timezone',v_timezone,
    'period',jsonb_build_object(
      'from',v_from,'to',v_to,'previous_from',v_previous_from,
      'previous_to',v_from,'days',greatest(1,ceil(extract(epoch from v_duration)/86400.0))
    ),
    'metrics',jsonb_build_object(
      'current',coalesce((select to_jsonb(m) - 'bucket' from metric_rows m where bucket='current'),'{}'::jsonb),
      'previous',coalesce((select to_jsonb(m) - 'bucket' from metric_rows m where bucket='previous'),'{}'::jsonb)
    ),
    'finance',jsonb_build_object(
      'current',coalesce((select to_jsonb(f) - 'bucket' from finance f where bucket='current'),'{}'::jsonb),
      'previous',coalesce((select to_jsonb(f) - 'bucket' from finance f where bucket='previous'),'{}'::jsonb),
      'month',(select revenue from month_finance),
      'accumulated',(select revenue from total_finance),
      'currency','BRL'
    ),
    'marketing',jsonb_build_object(
      'origins',coalesce((select jsonb_agg(to_jsonb(o) order by visitors desc,source) from source_summary o),'[]'::jsonb),
      'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by visitors desc,campaign) from campaign_summary c),'[]'::jsonb)
    ),
    'product',jsonb_build_object(
      'content_generated',(select count(*) from public.content_studio_contents where created_at>=v_from and created_at<v_to),
      'top_features',coalesce((select jsonb_agg(to_jsonb(f) order by uses desc,feature) from feature_summary f),'[]'::jsonb)
    ),
    'trend',coalesce((select jsonb_agg(to_jsonb(t) order by metric_day) from trend t),'[]'::jsonb),
    'monitor',coalesce((select to_jsonb(m) from latest_monitor m),'{}'::jsonb),
    'engineering',jsonb_build_object(
      'sprint',coalesce((select jsonb_build_object(
        'code',oe_code,'title',title,'status',status,
        'completion',completion_percentage,'implementation_status',implementation_status
      ) from current_sprint),'{"code":"Sem sprint ativa","title":"Nenhuma OE em execução","status":"not_connected","completion":0}'::jsonb),
      'blockers',(select count(*) from latest_order_revisions where status='blocked')
    ),
    'ga4',coalesce((select to_jsonb(g) from ga4_health g),'{}'::jsonb),
    'alert_rules',coalesce((select jsonb_agg(jsonb_build_object(
      'key',rule_key,'label',label,'category',category,'threshold',threshold,
      'unit',unit,'severity',severity,'config',config
    ) order by rule_key) from public.executive_alert_rules where enabled),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.executive_weekly_snapshot(text,timestamptz,timestamptz)
  from public,authenticated;
grant execute on function public.executive_weekly_snapshot(text,timestamptz,timestamptz)
  to anon;

comment on table public.executive_alert_rules is
  'Regras configuráveis do Executive OS; sem notificações externas nesta versão.';
comment on table public.executive_metric_exclusions is
  'Exclusões auditáveis de testes e auditorias dos indicadores executivos.';
comment on view public.executive_funnel_event_stream is
  'Funil canônico sem duplicar telemetria, perfis, impressões ou conversões existentes.';
comment on function public.executive_weekly_snapshot(text,timestamptz,timestamptz) is
  'Snapshot estruturado do Executive OS para período atual versus período anterior.';
